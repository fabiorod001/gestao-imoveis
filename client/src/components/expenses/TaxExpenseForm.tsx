import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, AlertCircle, Building, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { z } from "zod";
import ConsolidatedExpenseTable from './ConsolidatedExpenseTable';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  totalRevenue: number;
  percentage: number;
  allocatedAmount: number;
}

export default function TaxExpenseForm({ onComplete, onCancel }: TaxExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proRataCalculation, setProRataCalculation] = useState<PropertyRevenue[]>([]);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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
  });

  const taxType = form.watch('taxType');
  const selectedProperties = form.watch('selectedProperties');
  const competencyMonth = form.watch('competencyMonth');
  const isPisCofins = taxType === 'PIS' || taxType === 'COFINS';

  // Calcular PIS/COFINS automaticamente
  useEffect(() => {
    if (isPisCofins && competencyMonth && selectedProperties.length > 0) {
      calculatePisCofins();
    }
  }, [taxType, competencyMonth, selectedProperties, isPisCofins]);

  const calculatePisCofins = async () => {
    if (!isPisCofins || !competencyMonth || selectedProperties.length === 0) return;

    setIsCalculating(true);
    try {
      const response = await fetch('/api/taxes/calculate-pis-cofins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxType,
          competencyMonth,
          selectedPropertyIds: selectedProperties.map(id => parseInt(id)),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCalculatedAmount(data.calculatedAmount);
        form.setValue('totalAmount', data.calculatedAmount.toFixed(2));
        setProRataCalculation(data.propertyBreakdown.map((item: any) => ({
          propertyId: item.propertyId,
          propertyName: item.propertyName,
          totalRevenue: item.revenue,
          percentage: item.percentage,
          allocatedAmount: item.taxAmount,
        })));
      }
    } catch (error) {
      console.error('Error calculating PIS/COFINS:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Buscar receitas do mês de competência para cálculo pro-rata (CSLL/IRPJ)
  const { data: revenueData = [] } = useQuery({
    queryKey: ['/api/analytics/monthly-revenue', competencyMonth],
    enabled: !!competencyMonth && !isPisCofins,
    queryFn: async () => {
      const month = competencyMonth;
      if (!month) return [];
      
      const [year, monthNum] = month.split('-');
      const response = await apiRequest(`/api/analytics/monthly-revenue?month=${monthNum}&year=${year}`);
      return response;
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

  // Calcular rateio pro-rata quando dados mudarem (para CSLL/IRPJ)
  useEffect(() => {
    if (isPisCofins) return; // PIS/COFINS já calculado automaticamente
    
    const selectedProps = selectedProperties;
    const totalAmount = parseFloat(form.watch('totalAmount')) || 0;
    
    if (selectedProps.length > 0 && totalAmount > 0 && Array.isArray(revenueData) && revenueData.length > 0) {
      const selectedRevenueData = revenueData.filter((rev: any) => 
        selectedProps.includes(rev.propertyId.toString())
      );
      
      const totalSelectedRevenue = selectedRevenueData.reduce((sum: number, rev: any) => 
        sum + (rev.totalRevenue || 0), 0
      );

      if (totalSelectedRevenue > 0) {
        const calculation = selectedRevenueData.map((rev: any) => {
          const percentage = (rev.totalRevenue / totalSelectedRevenue) * 100;
          const allocatedAmount = (rev.totalRevenue / totalSelectedRevenue) * totalAmount;
          
          return {
            propertyId: rev.propertyId,
            propertyName: rev.propertyName,
            totalRevenue: rev.totalRevenue,
            percentage,
            allocatedAmount,
          };
        });

        setProRataCalculation(calculation);
      }
    } else {
      setProRataCalculation([]);
    }
  }, [selectedProperties, form.watch('totalAmount'), revenueData, isPisCofins]);

  const onSubmit = async (data: FormData) => {
    if (proRataCalculation.length === 0) {
      toast({
        title: "Erro",
        description: "Não foi possível calcular o rateio. Verifique os dados.",
        variant: "destructive",
      });
      return;
    }

    // Criar transações para cada propriedade
    const transactions = proRataCalculation.map(calc => ({
      propertyId: calc.propertyId,
      type: 'expense',
      category: 'taxes',
      subcategory: data.taxType.toLowerCase(),
      description: `${data.taxType} ${data.competencyMonth} - ${calc.propertyName} (${calc.percentage.toFixed(2)}%)`,
      amount: calc.allocatedAmount.toString(), // Convert to string
      date: data.paymentDate,
      currency: 'BRL',
      metadata: {
        taxType: data.taxType,
        competencyMonth: data.competencyMonth,
        totalAmount: parseFloat(data.totalAmount),
        revenueBase: calc.totalRevenue,
        percentage: calc.percentage,
        proRataCalculation: true,
      }
    }));

    try {
      await createMutation.mutateAsync(transactions);
      
      onComplete({
        type: `Impostos - ${data.taxType}`,
        totalAmount: parseFloat(data.totalAmount),
        propertiesCount: transactions.length,
        competencyMonth: data.competencyMonth,
        paymentDate: data.paymentDate,
        calculation: proRataCalculation,
      });
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  const monthOptions: { value: string; label: string }[] = [];
  const currentDate = new Date();
  for (let i = 1; i <= 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const value = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const labelShort = i === 1 ? 'Mês Anterior' : label;
    monthOptions.push({ value, label: labelShort });
  }

  const totalCalculated = proRataCalculation.reduce((sum, calc) => sum + calc.allocatedAmount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cadastro de Impostos (Pro-Rata)
          </CardTitle>
          <p className="text-muted-foreground">
            {isPisCofins 
              ? 'PIS e COFINS são calculados automaticamente com base nas receitas do mês anterior (Lucro Presumido)'
              : 'Os valores serão distribuídos proporcionalmente baseado no faturamento do mês de competência.'}
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
                        <SelectItem value="PIS">PIS (0,65%)</SelectItem>
                        <SelectItem value="COFINS">COFINS (3,00%)</SelectItem>
                        <SelectItem value="CSLL">CSLL</SelectItem>
                        <SelectItem value="IRPJ">IRPJ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Valor Total da Guia (R$)</FormLabel>
                {isPisCofins ? (
                  <div className="space-y-2">
                    {isCalculating ? (
                      <div className="h-10 flex items-center px-3 bg-gray-50 rounded-md border">
                        <span className="text-sm text-gray-600">Calculando...</span>
                      </div>
                    ) : calculatedAmount !== null ? (
                      <div className="h-10 flex items-center px-3 bg-blue-50 rounded-md border border-blue-200">
                        <span className="text-sm font-medium text-blue-900">
                          R$ {calculatedAmount.toFixed(2)}
                        </span>
                        <span className="text-xs text-blue-700 ml-2">
                          ({taxType === 'PIS' ? '0,65%' : '3,00%'} sobre as receitas)
                        </span>
                      </div>
                    ) : (
                      <div className="h-10 flex items-center px-3 bg-gray-50 rounded-md border">
                        <span className="text-sm text-gray-600">Selecione o mês e propriedades</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1.500,00"
                          {...field}
                        />
                      </FormControl>
                    )}
                  />
                )}
                <FormMessage />
              </FormItem>

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
                  <FormLabel>
                    Mês de Competência {isPisCofins && '(fato gerador)'}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês de competência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPisCofins && (
                    <FormDescription>
                      Receitas deste mês geram o imposto para pagamento no mês seguinte (Lucro Presumido)
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Selection */}
            <div className="space-y-4">
              <FormLabel>Propriedades para Rateio</FormLabel>
              {isPisCofins && (
                <FormDescription>
                  O rateio será feito proporcionalmente às receitas (incluindo pendentes) de cada propriedade
                </FormDescription>
              )}
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

            {/* Info Alert for PIS/COFINS */}
            {isPisCofins && calculatedAmount !== null && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lucro Presumido - Cálculo Automático</strong>
                  <br />
                  Alíquota: {taxType === 'PIS' ? '0,65%' : '3,00%'}
                  <br />
                  Inclui receitas realizadas e pendentes/futuras do mês de competência
                </AlertDescription>
              </Alert>
            )}

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
                            Receita: R$ {calc.totalRevenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">R$ {calc.allocatedAmount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {calc.percentage.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>Total Distribuído:</span>
                    <span>R$ {totalCalculated.toFixed(2)}</span>
                  </div>
                </div>

                {Math.abs(totalCalculated - parseFloat(form.watch('totalAmount') || '0')) > 0.01 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Diferença de R$ {Math.abs(totalCalculated - parseFloat(form.watch('totalAmount') || '0')).toFixed(2)} 
                      devido a arredondamentos
                    </span>
                  </div>
                )}
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
}