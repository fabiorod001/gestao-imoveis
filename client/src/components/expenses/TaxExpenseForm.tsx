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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, AlertCircle, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { z } from "zod";
import ConsolidatedExpenseTable from './ConsolidatedExpenseTable';

const taxFormSchema = z.object({
  taxType: z.enum(['PIS', 'COFINS', 'CSLL', 'IRPJ']),
  totalAmount: z.string().min(1, "Valor total é obrigatório"),
  paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
  // Campos mensais (PIS/COFINS)
  competencyMonth: z.string().optional(),
  // Campos trimestrais (CSLL/IRPJ)
  competencyQuarter: z.string().optional(),
  cota1: z.string().optional(),
  cota2: z.string().optional(),
  cota3: z.string().optional(),
  selectedProperties: z.array(z.string()).min(1, "Selecione pelo menos uma propriedade"),
  description: z.string().optional(),
}).refine(data => {
  // Validação condicional baseada no tipo de imposto
  const isMonthly = ['PIS', 'COFINS'].includes(data.taxType);
  const isQuarterly = ['CSLL', 'IRPJ'].includes(data.taxType);
  
  if (isMonthly && !data.competencyMonth) {
    return false;
  }
  
  if (isQuarterly && (!data.competencyQuarter || (!data.cota1 && !data.cota2 && !data.cota3))) {
    return false;
  }
  
  return true;
}, {
  message: "Preencha os campos de competência corretos para o tipo de imposto",
  path: ["competencyMonth"]
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

  const form = useForm<FormData>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: {
      taxType: 'PIS',
      totalAmount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      competencyMonth: "",
      competencyQuarter: "",
      cota1: "",
      cota2: "",
      cota3: "",
      selectedProperties: [],
      description: "",
    },
  });

  // Detectar se é imposto mensal ou trimestral
  const taxType = form.watch('taxType');
  const isMonthlyTax = ['PIS', 'COFINS'].includes(taxType);
  const isQuarterlyTax = ['CSLL', 'IRPJ'].includes(taxType);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    }
  });

  // Buscar receitas do mês/trimestre de competência para cálculo pro-rata
  const competencyPeriod = isMonthlyTax ? form.watch('competencyMonth') : form.watch('competencyQuarter');
  const { data: revenueData = [] } = useQuery({
    queryKey: ['period-revenue', competencyPeriod, taxType],
    enabled: !!competencyPeriod,
    queryFn: async () => {
      if (!competencyPeriod) return [];
      
      if (isMonthlyTax) {
        // Para impostos mensais (PIS/COFINS)
        const [year, monthNum] = competencyPeriod.split('-');
        const response = await fetch(`/api/analytics/monthly-revenue?month=${monthNum}&year=${year}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } else {
        // Para impostos trimestrais (CSLL/IRPJ)
        const [year, quarter] = competencyPeriod.split('-Q');
        const response = await fetch(`/api/analytics/quarterly-revenue?quarter=${quarter}&year=${year}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      }
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

  // Calcular rateio pro-rata quando dados mudarem
  useEffect(() => {
    const selectedProps = form.watch('selectedProperties');
    let totalAmount = 0;
    
    // Para impostos trimestrais, calcular total das cotas
    if (isQuarterlyTax) {
      const cota1 = parseFloat(form.watch('cota1')) || 0;
      const cota2 = parseFloat(form.watch('cota2')) || 0;
      const cota3 = parseFloat(form.watch('cota3')) || 0;
      totalAmount = cota1 + cota2 + cota3;
      
      // Atualizar o campo totalAmount automaticamente
      form.setValue('totalAmount', totalAmount.toString());
    } else {
      // Para impostos mensais, usar o valor digitado
      totalAmount = parseFloat(form.watch('totalAmount')) || 0;
    }
    
    if (selectedProps.length > 0 && totalAmount > 0 && revenueData.length > 0) {
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
  }, [
    form.watch('selectedProperties'), 
    form.watch('totalAmount'), 
    form.watch('cota1'), 
    form.watch('cota2'), 
    form.watch('cota3'),
    revenueData, 
    isQuarterlyTax
  ]);

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
    const competencyPeriod = isMonthlyTax ? data.competencyMonth : data.competencyQuarter;
    const periodLabel = isMonthlyTax ? data.competencyMonth : data.competencyQuarter;
    
    // Para impostos trimestrais, criar uma transação por cota (se preenchida)
    const cotasData = isQuarterlyTax ? [
      { label: 'Cota 1', value: parseFloat(data.cota1 || '0') },
      { label: 'Cota 2', value: parseFloat(data.cota2 || '0') },
      { label: 'Cota 3', value: parseFloat(data.cota3 || '0') }
    ].filter(cota => cota.value > 0) : [];
    
    const transactions = [];
    
    if (isQuarterlyTax && cotasData.length > 0) {
      // Para impostos trimestrais - criar transações separadas por cota
      for (const cota of cotasData) {
        for (const calc of proRataCalculation) {
          const cotaAmount = (cota.value / parseFloat(data.totalAmount)) * calc.allocatedAmount;
          transactions.push({
            propertyId: calc.propertyId,
            type: 'expense',
            category: 'taxes',
            subcategory: data.taxType.toLowerCase(),
            description: `${data.taxType} ${periodLabel} ${cota.label} - ${calc.propertyName} (${calc.percentage.toFixed(2)}%)`,
            amount: cotaAmount.toString(),
            date: data.paymentDate,
            currency: 'BRL',
            metadata: {
              taxType: data.taxType,
              competencyPeriod: competencyPeriod,
              cota: cota.label,
              cotaValue: cota.value,
              totalAmount: parseFloat(data.totalAmount),
              revenueBase: calc.totalRevenue,
              percentage: calc.percentage,
              proRataCalculation: true,
              isQuarterly: true
            }
          });
        }
      }
    } else {
      // Para impostos mensais - comportamento atual
      transactions.push(...proRataCalculation.map(calc => ({
        propertyId: calc.propertyId,
        type: 'expense',
        category: 'taxes',
        subcategory: data.taxType.toLowerCase(),
        description: `${data.taxType} ${periodLabel} - ${calc.propertyName} (${calc.percentage.toFixed(2)}%)`,
        amount: calc.allocatedAmount.toString(),
        date: data.paymentDate,
        currency: 'BRL',
        metadata: {
          taxType: data.taxType,
          competencyPeriod: competencyPeriod,
          totalAmount: parseFloat(data.totalAmount),
          revenueBase: calc.totalRevenue,
          percentage: calc.percentage,
          proRataCalculation: true,
          isQuarterly: false
        }
      })));
    }

    try {
      await createMutation.mutateAsync(transactions);
      
      onComplete({
        type: `Impostos - ${data.taxType}`,
        totalAmount: parseFloat(data.totalAmount),
        propertiesCount: proRataCalculation.length,
        transactionCount: transactions.length,
        competencyPeriod: competencyPeriod,
        paymentDate: data.paymentDate,
        calculation: proRataCalculation,
        cotas: isQuarterlyTax ? cotasData : undefined,
      });
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  // Generate month options: 3 future months, current month (bold), 3 past months
  const generateMonthOptions = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const options = [];

    // 3 future months (in reverse order - farthest first)
    for (let i = 3; i >= 1; i--) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      const month = futureDate.getMonth();
      const year = futureDate.getFullYear();
      options.push({
        value: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: `${months[month]} ${year}`
      });
    }

    // Current month (bold)
    options.push({
      value: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      label: `${months[currentMonth]} ${currentYear}`,
      isCurrent: true
    });

    // 3 past months
    for (let i = 1; i <= 3; i++) {
      const pastDate = new Date(currentYear, currentMonth - i, 1);
      const month = pastDate.getMonth();
      const year = pastDate.getFullYear();
      options.push({
        value: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: `${months[month]} ${year}`
      });
    }

    return options;
  };

  // Generate quarter options for quarterly taxes (CSLL/IRPJ)
  const generateQuarterOptions = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    const options = [];

    // Add current year quarters
    for (let q = 1; q <= 4; q++) {
      options.push({
        value: `${currentYear}-Q${q}`,
        label: `${q}° Trimestre ${currentYear}`,
        isCurrent: q === currentQuarter
      });
    }

    // Add previous year quarters
    for (let q = 4; q >= 1; q--) {
      options.push({
        value: `${currentYear - 1}-Q${q}`,
        label: `${q}° Trimestre ${currentYear - 1}`
      });
    }

    return options.sort((a, b) => b.value.localeCompare(a.value));
  };

  const monthOptions = generateMonthOptions();

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
                    <FormLabel>
                      {isQuarterlyTax ? 'Valor Total da Guia (R$) - Calculado Automaticamente' : 'Valor Total da Guia (R$)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={isQuarterlyTax ? 'Será calculado automaticamente' : '1.500,00'}
                        disabled={isQuarterlyTax}
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

            {/* Campos de Competência - Condicionais baseados no tipo de imposto */}
            {isMonthlyTax && (
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
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.isCurrent ? "font-bold" : ""}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isQuarterlyTax && (
              <>
                {/* Trimestre de Competência */}
                <FormField
                  control={form.control}
                  name="competencyQuarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trimestre de Competência (base para cálculo)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o trimestre de competência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {generateQuarterOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className={option.isCurrent ? "font-bold" : ""}>
                                {option.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cotas Trimestrais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cota1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cota 1 (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cota2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cota 2 (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cota3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cota 3 (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

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