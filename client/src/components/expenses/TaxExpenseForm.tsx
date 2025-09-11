import { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, AlertCircle, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryOptions } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";
import type { Property } from "@shared/schema";
import { z } from "zod";
import ConsolidatedExpenseTable from './ConsolidatedExpenseTable';
import { Money, MoneyFormatter, MoneyInputParser, useMoneyInput } from "@/lib/money";

const taxFormSchema = z.object({
  taxType: z.enum(['PIS', 'COFINS', 'CSLL', 'IRPJ']),
  totalAmount: z.string().min(1, "Valor total é obrigatório"),
  paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
  competencyMonth: z.string().min(1, "Mês de competência é obrigatório"),
  selectedProperties: z.array(z.string()).min(1, "Selecione pelo menos uma propriedade"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof taxFormSchema>;

interface TaxExpenseFormProps {
  onComplete: (expense: any) => void;
  onCancel: () => void;
}

interface PropertyRevenue {
  propertyId: number;
  propertyName: string;
  totalRevenue: Money;
  percentage: number;
  allocatedAmount: Money;
}

const TaxExpenseForm = memo(function TaxExpenseForm({ onComplete, onCancel }: TaxExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proRataCalculation, setProRataCalculation] = useState<PropertyRevenue[]>([]);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: {
      taxType: 'PIS',
      totalAmount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      competencyMonth: "",
      selectedProperties: [],
      description: "",
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    ...queryOptions.stable, // Cache estável para propriedades
  });
  
  // Debounce para o valor total (evita recalcular a cada tecla)
  const debouncedTotalAmount = useDebounce(form.watch('totalAmount'), 300);
  const debouncedSelectedProperties = useDebounce(form.watch('selectedProperties'), 300);

  // Buscar receitas do mês de competência para cálculo pro-rata
  const { data: revenueData = [] } = useQuery({
    queryKey: ['/api/analytics/monthly-revenue', form.watch('competencyMonth')],
    enabled: !!form.watch('competencyMonth'),
    queryFn: async () => {
      const month = form.watch('competencyMonth');
      if (!month) return [];
      
      const [monthStr, year] = month.split('/');
      const response = await apiRequest(`/api/analytics/monthly-revenue?month=${monthStr}&year=${year}`, 'GET');
      return response.json ? await response.json() : response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      // Criar múltiplas transações (uma para cada propriedade)
      const results = await Promise.all(
        transactions.map(transaction => 
          apiRequest('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(transaction),
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({
        title: "Sucesso",
        description: "Impostos cadastrados com rateio pro-rata",
      });
      form.reset();
      setProRataCalculation([]);
      setDataUpdateTrigger(prev => prev + 1);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar impostos",
        variant: "destructive",
      });
    },
  });

  // Calcular rateio pro-rata quando dados mudarem usando Money para precisão
  useEffect(() => {
    const selectedProps = form.watch('selectedProperties');
    const totalAmountStr = form.watch('totalAmount');
    
    // Parse o valor total usando Money
    let totalAmount: Money;
    try {
      totalAmount = totalAmountStr ? Money.fromBRL(totalAmountStr.replace('.', ',')) : Money.zero();
    } catch {
      totalAmount = Money.zero();
    }
    
    if (selectedProps.length > 0 && !totalAmount.isZero() && Array.isArray(revenueData) && revenueData.length > 0) {
      const selectedRevenueData = revenueData.filter((rev: any) => 
        selectedProps.includes(rev.propertyId.toString())
      );
      
      // Converter receitas para Money e calcular total
      const revenuesWithMoney = selectedRevenueData.map((rev: any) => ({
        ...rev,
        revenueMoney: Money.fromDecimal(rev.totalRevenue || 0)
      }));
      
      const totalSelectedRevenue = revenuesWithMoney.reduce((sum: Money, rev: any) => 
        sum.add(rev.revenueMoney), Money.zero()
      );

      if (!totalSelectedRevenue.isZero()) {
        const calculation = revenuesWithMoney.map((rev: any) => {
          const percentage = (rev.revenueMoney.toDecimal() / totalSelectedRevenue.toDecimal()) * 100;
          const allocatedAmount = totalAmount.multiply(percentage / 100);
          
          return {
            propertyId: rev.propertyId,
            propertyName: rev.propertyName,
            totalRevenue: rev.revenueMoney,
            percentage,
            allocatedAmount,
          };
        });

        setProRataCalculation(calculation);
      }
    } else {
      setProRataCalculation([]);
    }
  }, [form.watch('selectedProperties'), form.watch('totalAmount'), revenueData]);

  const onSubmit = async (data: FormData) => {
    if (proRataCalculation.length === 0) {
      toast({
        title: "Erro",
        description: "Não foi possível calcular o rateio. Verifique os dados.",
        variant: "destructive",
      });
      return;
    }

    // Criar transações para cada propriedade usando Money para precisão
    const transactions = proRataCalculation.map(calc => ({
      propertyId: calc.propertyId,
      type: 'expense',
      category: 'taxes',
      subcategory: data.taxType.toLowerCase(),
      description: `${data.taxType} ${data.competencyMonth} - ${calc.propertyName} (${calc.percentage.toFixed(2)}%)`,
      amount: calc.allocatedAmount.toBRL(false), // Formato sem símbolo R$
      date: data.paymentDate,
      currency: 'BRL',
      metadata: {
        taxType: data.taxType,
        competencyMonth: data.competencyMonth,
        totalAmount: Money.fromBRL(data.totalAmount.replace('.', ',')).toDecimal(),
        revenueBase: calc.totalRevenue.toDecimal(),
        percentage: calc.percentage,
        proRataCalculation: true,
      }
    }));

    try {
      await createMutation.mutateAsync(transactions);
      
      const totalAmount = Money.fromBRL(data.totalAmount.replace('.', ','));
      
      onComplete({
        type: `Impostos - ${data.taxType}`,
        totalAmount: totalAmount.toDecimal(),
        totalAmountFormatted: totalAmount.toBRL(),
        propertiesCount: transactions.length,
        competencyMonth: data.competencyMonth,
        paymentDate: data.paymentDate,
        calculation: proRataCalculation.map(calc => ({
          ...calc,
          totalRevenue: calc.totalRevenue.toDecimal(),
          allocatedAmount: calc.allocatedAmount.toDecimal(),
          totalRevenueFormatted: calc.totalRevenue.toBRL(),
          allocatedAmountFormatted: calc.allocatedAmount.toBRL(),
        })),
      });
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  // Gerar opções de mês: 3 meses atrás + atual + 3 meses à frente
  const monthOptions: { value: string; label: string; isCurrent?: boolean }[] = [];
  const currentDate = new Date();
  
  // 3 meses atrás
  for (let i = 3; i >= 1; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const value = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }
  
  // Mês atual
  const currentValue = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const currentLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  monthOptions.push({ value: currentValue, label: `${currentLabel} (atual)`, isCurrent: true });
  
  // 3 meses à frente
  for (let i = 1; i <= 3; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const value = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  // Calcular total usando Money para precisão
  const totalCalculated = proRataCalculation.reduce((sum, calc) => sum.add(calc.allocatedAmount), Money.zero());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cadastro de Impostos (Pro-Rata)
          </CardTitle>
          <p className="text-muted-foreground">
            Os valores serão distribuídos proporcionalmente baseado no faturamento do mês de competência.
          </p>
        </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tax Type and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Imposto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PIS">PIS</SelectItem>
                        <SelectItem value="COFINS">COFINS</SelectItem>
                        <SelectItem value="CSLL">CSLL</SelectItem>
                        <SelectItem value="IRPJ">IRPJ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total da Guia (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1.500,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Competency Month */}
            <FormField
              control={form.control}
              name="competencyMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Competência (base para cálculo)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês de competência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className={option.isCurrent ? "font-bold" : ""}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Selection */}
            <div className="space-y-4">
              <FormLabel>Propriedades para Rateio</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {properties.map(property => (
                  <FormField
                    key={property.id}
                    control={form.control}
                    name="selectedProperties"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(property.id.toString())}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, property.id.toString()])
                                : field.onChange(field.value?.filter((value) => value !== property.id.toString()))
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            {property.name}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </div>

            {/* Pro-Rata Calculation Display */}
            {proRataCalculation.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  <h4 className="font-medium">Cálculo Pro-Rata</h4>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {proRataCalculation.map(calc => (
                    <div key={calc.propertyId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4" />
                        <div>
                          <span className="font-medium">{calc.propertyName}</span>
                          <div className="text-xs text-muted-foreground">
                            Receita: {calc.totalRevenue.toBRL()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{calc.allocatedAmount.toBRL()}</div>
                        <div className="text-xs text-muted-foreground">
                          {calc.percentage.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>Total Distribuído:</span>
                    <span>{totalCalculated.toBRL()}</span>
                  </div>
                </div>

                {(() => {
                  const inputAmount = form.watch('totalAmount');
                  if (!inputAmount) return null;
                  
                  try {
                    const expectedTotal = Money.fromBRL(inputAmount.replace('.', ','));
                    const difference = expectedTotal.subtract(totalCalculated).abs();
                    
                    if (difference.toDecimal() > 0.01) {
                      return (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">
                            Diferença de {difference.toBRL()} devido a arredondamentos
                          </span>
                        </div>
                      );
                    }
                  } catch {
                    return null;
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={proRataCalculation.length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? "Salvando..." : "Cadastrar Impostos"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    
    {/* Consolidated table view */}
    <ConsolidatedExpenseTable 
      category="taxes" 
      onDataUpdate={() => dataUpdateTrigger} 
    />
    </>
  );
});

export default TaxExpenseForm;