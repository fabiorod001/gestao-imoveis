import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Building, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
interface Property {
  id: number;
  name: string;
  userId: string;
  address?: string;
  type: string;
  status: string;
  rentalType?: string;
  purchasePrice?: number;
  purchaseDate?: string;
}

const simpleTaxFormSchema = z.object({
  taxType: z.enum(['PIS', 'COFINS', 'CSLL', 'IRPJ'], {
    required_error: 'Selecione o tipo de imposto',
  }),
  competencyMonth: z.string().min(1, 'Selecione o período de competência'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  paymentDate: z.date({
    required_error: 'Data de pagamento é obrigatória',
  }),
  selectedPropertyIds: z.array(z.number()).min(1, 'Selecione pelo menos uma propriedade'),
  // Cotas para CSLL e IRPJ
  cota1: z.boolean().default(false),
  cota2: z.boolean().default(false),
  cota3: z.boolean().default(false),
});

type SimpleTaxFormValues = z.infer<typeof simpleTaxFormSchema>;

interface SimpleTaxFormProps {
  onSuccess?: () => void;
}

export function SimpleTaxForm({ onSuccess }: SimpleTaxFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Get current month and quarter for default values
  const getCurrentPeriod = () => {
    const today = new Date();
    const currentMonth = format(today, 'MM/yyyy');
    const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
    const currentYear = today.getFullYear();
    const currentQuarterValue = `Q${currentQuarter}/${currentYear}`;
    return { currentMonth, currentQuarterValue };
  };

  const { currentMonth, currentQuarterValue } = getCurrentPeriod();

  const form = useForm<SimpleTaxFormValues>({
    resolver: zodResolver(simpleTaxFormSchema),
    defaultValues: {
      taxType: 'PIS',
      competencyMonth: currentMonth, // Default to current month
      amount: '',
      selectedPropertyIds: [],
      cota1: false,
      cota2: false,
      cota3: false,
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: SimpleTaxFormValues) => {
      // Convert the formatted amount string to a number in centavos
      const amountInReais = parseFloat(data.amount.replace(/\./g, '').replace(',', '.'));
      const amountInCentavos = Math.round(amountInReais * 100);
      
      const response = await fetch('/api/taxes/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: amountInCentavos.toString(),
          paymentDate: data.paymentDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Falha ao gerar preview');
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreview(true);
    },
    onError: () => {
      toast({
        title: 'Erro ao gerar preview',
        description: 'Não foi possível calcular o rateio',
        variant: 'destructive',
      });
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: SimpleTaxFormValues) => {
      // Convert the formatted amount string to a number in centavos
      const amountInReais = parseFloat(data.amount.replace(/\./g, '').replace(',', '.'));
      const amountInCentavos = Math.round(amountInReais * 100);
      
      const response = await fetch('/api/taxes/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: amountInCentavos.toString(),
          paymentDate: data.paymentDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Falha ao cadastrar impostos');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Impostos cadastrados com sucesso!',
        description: 'O rateio foi realizado e as transações foram criadas.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      form.reset();
      setShowPreview(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: 'Erro ao cadastrar impostos',
        description: 'Não foi possível salvar os dados',
        variant: 'destructive',
      });
    },
  });

  // Generate last 12 months options (future to past, current in bold)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentMonth = format(today, 'MM/yyyy');
    
    // Add future months (next 3 months)
    for (let i = 3; i >= 1; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = format(date, 'MM/yyyy');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label, isCurrent: false });
    }
    
    // Add current month
    const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentValue = format(currentDate, 'MM/yyyy');
    const currentLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR });
    options.push({ value: currentValue, label: currentLabel, isCurrent: true });
    
    // Add past months (last 8 months)
    for (let i = 1; i <= 8; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = format(date, 'MM/yyyy');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label, isCurrent: false });
    }
    
    return options;
  };

  // Generate quarter options (future to past, current in bold)
  const getQuarterOptions = () => {
    const options = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    // Add future quarters (next 3 quarters)
    for (let i = 3; i >= 1; i--) {
      let quarter = currentQuarter + i;
      let year = currentYear;
      
      // Adjust year and quarter for overflow
      while (quarter > 3) {
        quarter -= 4;
        year++;
      }
      
      const quarterNumber = quarter + 1; // Convert 0-3 to 1-4
      const value = `Q${quarterNumber}/${year}`;
      const label = `${quarterNumber}º Trim. ${year}`;
      options.push({ value, label, isCurrent: false });
    }
    
    // Add current quarter
    const currentQuarterNumber = currentQuarter + 1;
    const currentValue = `Q${currentQuarterNumber}/${currentYear}`;
    const currentLabel = `${currentQuarterNumber}º Trim. ${currentYear}`;
    options.push({ value: currentValue, label: currentLabel, isCurrent: true });
    
    // Add past quarters (last 3 quarters)
    for (let i = 1; i <= 3; i++) {
      let quarter = currentQuarter - i;
      let year = currentYear;
      
      // Adjust year and quarter for underflow
      while (quarter < 0) {
        quarter += 4;
        year--;
      }
      
      const quarterNumber = quarter + 1; // Convert 0-3 to 1-4
      const value = `Q${quarterNumber}/${year}`;
      const label = `${quarterNumber}º Trim. ${year}`;
      options.push({ value, label, isCurrent: false });
    }
    
    return options;
  };

  const taxType = form.watch('taxType');
  const isQuarterlyTax = taxType === 'CSLL' || taxType === 'IRPJ';
  
  // Update competency period when tax type changes
  useEffect(() => {
    if (isQuarterlyTax) {
      form.setValue('competencyMonth', currentQuarterValue);
    } else {
      form.setValue('competencyMonth', currentMonth);
    }
  }, [isQuarterlyTax, currentMonth, currentQuarterValue, form]);

  function onSubmit(values: SimpleTaxFormValues) {
    if (showPreview) {
      submitMutation.mutate(values);
    } else {
      previewMutation.mutate(values);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tax Type Selection - Always First */}
        <FormField
          control={form.control}
          name="taxType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Imposto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de imposto" />
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

        {/* Competency Period - Second */}
        <FormField
          control={form.control}
          name="competencyMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isQuarterlyTax ? 'Trimestre de Competência' : 'Mês de Competência'}
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={isQuarterlyTax 
                        ? "Selecione o trimestre de competência" 
                        : "Selecione o mês de competência"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(isQuarterlyTax ? getQuarterOptions() : getMonthOptions()).map((option) => (
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
              <FormDescription>
                {isQuarterlyTax 
                  ? 'Trimestre ao qual o imposto se refere'
                  : 'Mês ao qual o imposto se refere'
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quota Options - Third (only for CSLL and IRPJ) */}
        {isQuarterlyTax && (
          <div className="space-y-2">
            <FormLabel>Cotas de Pagamento</FormLabel>
            <div className="rounded-md border p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cota1"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        Cota 1
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cota2"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        Cota 2
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cota3"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        Cota 3
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormDescription>
              Selecione as cotas que deseja pagar. Cada cota criará uma despesa separada.
            </FormDescription>
          </div>
        )}

        {/* Amount - Fourth */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Total (R$)</FormLabel>
              <FormControl>
                <Input
                  placeholder="1.234,56"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formattedValue = (Number(value) / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    field.onChange(formattedValue);
                  }}
                />
              </FormControl>
              <FormDescription>
                Valor total do imposto a ser pago
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Date - Fifth */}
        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Pagamento</FormLabel>
              <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setPaymentDateOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                      const twoYearsFromNow = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
                      return date < oneYearAgo || date > twoYearsFromNow;
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Data em que o imposto será pago
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Property Selection - Last */}
        <FormField
          control={form.control}
          name="selectedPropertyIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Propriedades para Rateio
              </FormLabel>
              <FormDescription>
                Selecione as propriedades que participarão do rateio proporcional baseado na receita
              </FormDescription>
              <FormControl>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border rounded-md">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`property-${property.id}`}
                        checked={field.value.includes(property.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, property.id]);
                          } else {
                            field.onChange(field.value.filter(id => id !== property.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`property-${property.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {property.name}
                      </label>
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Info Cards */}
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Como funciona o rateio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                O sistema distribuirá o valor do imposto proporcionalmente entre as propriedades selecionadas, 
                baseado na receita bruta de cada uma no mês de competência.
              </p>
            </CardContent>
          </Card>

          {/* Preview Results */}
          {showPreview && previewData && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Preview do Rateio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {previewData.breakdown?.map((item: any) => (
                      <div key={item.propertyName} className="flex justify-between items-center">
                        <span className="font-medium">{item.propertyName}</span>
                        <div className="flex gap-2">
                          {item.taxes.map((tax: any) => (
                            <Badge key={tax.taxType} variant="secondary">
                              {tax.taxType}: R$ {tax.amount.toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>R$ {previewData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Installment Information */}
              {previewData.isQuarterlyTax && previewData.paymentInfo && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      Informações de Parcelamento (Lucro Presumido)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {previewData.paymentInfo.canInstall ? (
                        <div className="space-y-2">
                          <p className="text-sm text-blue-800 font-medium">
                            ✅ Parcelamento automático habilitado: {previewData.paymentInfo.automaticInstallments} parcelas
                          </p>
                          {previewData.installments && (
                            <div className="space-y-1">
                              {previewData.installments.map((installment: any) => (
                                <div key={installment.installmentNumber} className="flex justify-between text-sm">
                                  <span>Parcela {installment.installmentNumber}:</span>
                                  <span className="font-medium">
                                    R$ {installment.amount.toFixed(2)}
                                    {installment.interest > 0 && (
                                      <span className="text-blue-600 ml-1">
                                        (base: R$ {installment.baseAmount.toFixed(2)} + juros: R$ {installment.interest.toFixed(2)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700">
                            💡 Valor inferior a R$ {previewData.paymentInfo.minimumForInstallment?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm font-medium text-gray-800">
                            Pagamento único obrigatório (não é possível parcelar)
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-gray-600 border-t pt-2">
                        <p>• Valor mínimo para parcelamento: R$ 2.000,00</p>
                        <p>• Máximo: 3 parcelas com juros de 1% ao mês (2ª e 3ª parcelas)</p>
                        <p>• Valor mínimo por parcela: R$ 1.000,00</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          {showPreview && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setPreviewData(null);
              }}
            >
              Voltar
            </Button>
          )}
          <Button
            type="submit"
            className={showPreview ? 'bg-green-600 hover:bg-green-700' : ''}
            disabled={previewMutation.isPending || submitMutation.isPending}
          >
            {previewMutation.isPending || submitMutation.isPending ? (
              'Processando...'
            ) : showPreview ? (
              'Confirmar e Cadastrar'
            ) : (
              'Gerar Preview'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}