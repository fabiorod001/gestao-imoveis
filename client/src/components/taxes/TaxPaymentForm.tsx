import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Calculator, Building, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
// import { useToast } from '@/hooks/use-toast';
import type { Property } from '@shared/schema';

const taxPaymentSchema = z.object({
  taxType: z.enum(['PIS', 'COFINS', 'CSLL', 'IRPJ'], {
    required_error: 'Selecione o tipo de imposto',
  }),
  competencyMonth: z.string().min(1, 'Selecione o mês de competência'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  paymentDate: z.string().min(1, 'Data de pagamento é obrigatória'),
  selectedPropertyIds: z.array(z.number()).min(1, 'Selecione pelo menos uma propriedade'),
  enableInstallment: z.boolean().default(false),
});

type TaxPaymentFormData = z.infer<typeof taxPaymentSchema>;

export default function TaxPaymentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate competency months (last 12 months)
  const generateCompetencyMonths = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = date.toLocaleDateString('pt-BR', { 
        month: '2-digit', 
        year: 'numeric' 
      });
      const monthName = date.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
      months.push({ value: monthYear, label: monthName });
    }
    
    return months;
  };

  const competencyMonths = generateCompetencyMonths();

  const form = useForm<TaxPaymentFormData>({
    resolver: zodResolver(taxPaymentSchema),
    defaultValues: {
      taxType: undefined,
      competencyMonth: '',
      amount: '',
      paymentDate: '',
      selectedPropertyIds: [],
      enableInstallment: false,
    },
  });

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Preview calculation mutation
  const previewMutation = useMutation({
    mutationFn: async (data: TaxPaymentFormData) => {
      const response = await apiRequest('/api/taxes/preview', 'POST', data);
      return response.json();
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: TaxPaymentFormData) => {
      const response = await apiRequest('/api/taxes/simple', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'Impostos cadastrados com sucesso!' });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      // Clear notification after 10 seconds for success
      setTimeout(() => setNotification(null), 10000);
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.message || "Erro ao cadastrar impostos." });
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const onSubmit = async (data: TaxPaymentFormData) => {
    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async () => {
    const data = form.getValues();
    
    if (!data.taxType || !data.amount || !data.paymentDate || data.selectedPropertyIds.length === 0) {
      setNotification({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    previewMutation.mutate(data);
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formattedValue;
  };

  const handleCurrencyInput = (value: string, onChange: (value: string) => void) => {
    const numericValue = value.replace(/\D/g, '');
    onChange(numericValue);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Cadastro de Impostos
        </CardTitle>
        <CardDescription>
          Cadastre PIS, COFINS, CSLL e IRPJ com rateio automático por propriedade
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Tax Type and Competency Month */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Imposto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField
                control={form.control}
                name="competencyMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Competência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês de competência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {competencyMonths.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount and Payment Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Imposto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        value={field.value ? formatCurrency(field.value) : ''}
                        onChange={(e) => handleCurrencyInput(e.target.value, field.onChange)}
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
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Installment Option (only for CSLL and IRPJ) */}
            {(form.watch('taxType') === 'CSLL' || form.watch('taxType') === 'IRPJ') && (
              <FormField
                control={form.control}
                name="enableInstallment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Parcelamento em 3x
                      </FormLabel>
                      <FormDescription>
                        Dividir em 3 parcelas: 1/3 (sem juros) + 1/3 (1% juros) + 1/3 (1% juros)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Property Selection */}
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
                    Selecione as propriedades que participarão do rateio proporcional
                  </FormDescription>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

            {/* Preview Results */}
            {previewMutation.data && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Preview do Rateio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {previewMutation.data.breakdown?.map((item: any) => (
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons with Notification */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                >
                  {previewMutation.isPending ? 'Calculando...' : 'Prévia do Rateio'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processando...' : 'Cadastrar Impostos'}
                </Button>
              </div>
              
              {/* Notification near button */}
              {notification && (
                <div className={`p-3 rounded-md flex items-center gap-2 transition-all duration-300 ${
                  notification.type === 'success' 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {notification.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">{notification.message}</span>
                  <button
                    onClick={() => setNotification(null)}
                    className="ml-auto text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}