import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertCircle, CheckCircle2, Building, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Property } from '@shared/schema';

interface DistributedExpenseFormProps {
  expenseType: 'Gestão - Maurício' | 'Limpezas' | string;
  title: string;
  description: string;
}

const distributedExpenseSchema = z.object({
  description: z.string().optional(),
  competencyMonth: z.string().optional(),
  amount: z.string().min(1, 'Valor é obrigatório'),
  paymentDate: z.string().min(1, 'Data de pagamento é obrigatória'),
  selectedPropertyIds: z.array(z.number()).min(1, 'Selecione pelo menos uma propriedade'),
  isHistorical: z.boolean().optional(),
});

type DistributedExpenseFormData = z.infer<typeof distributedExpenseSchema>;

export default function DistributedExpenseForm({ expenseType, title, description }: DistributedExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);
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

  const form = useForm<DistributedExpenseFormData>({
    resolver: zodResolver(distributedExpenseSchema),
    defaultValues: {
      description: '',
      competencyMonth: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      selectedPropertyIds: [],
      isHistorical: false,
    },
  });

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Preview calculation mutation
  const previewMutation = useMutation({
    mutationFn: async (data: DistributedExpenseFormData) => {
      const response = await apiRequest('/api/expenses/distributed/preview', 'POST', data);
      return response.json();
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: DistributedExpenseFormData) => {
      const response = await apiRequest('/api/expenses/distributed', 'POST', {
        ...data,
        expenseType,
        isHistorical: data.isHistorical || false
      });
      return response.json();
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: `${expenseType} cadastrada com sucesso!` });
      form.reset();
      setPreviewData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      setDataUpdateTrigger(prev => prev + 1);
      setTimeout(() => setNotification(null), 10000);
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.message || "Erro ao cadastrar despesa." });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const onSubmit = async (data: DistributedExpenseFormData) => {
    setIsSubmitting(true);
    await submitMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  const handlePreview = async () => {
    const data = form.getValues();
    
    if (!data.amount || !data.paymentDate || data.selectedPropertyIds.length === 0) {
      setNotification({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const result = await previewMutation.mutateAsync(data);
      setPreviewData(result);
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao gerar prévia.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Description (Optional) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione detalhes sobre esta despesa..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Informações adicionais sobre a despesa
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Competency Month (Optional) */}
            <FormField
              control={form.control}
              name="competencyMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Competência (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês de referência" />
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
                  <FormDescription>
                    Mês de referência para esta despesa
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Payment Date Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formattedValue = (parseInt(value) / 100).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          field.onChange(formattedValue);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor total a ser rateado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="date"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Data em que a despesa será paga
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Historical Transaction Checkbox */}
            <FormField
              control={form.control}
              name="isHistorical"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Lançamento Histórico
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Property Selection */}
            <FormField
              control={form.control}
              name="selectedPropertyIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Selecionar Propriedades</FormLabel>
                    <FormDescription>
                      Escolha as propriedades que devem ratear esta despesa
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {properties.map((property) => (
                      <FormField
                        key={property.id}
                        control={form.control}
                        name="selectedPropertyIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={property.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(property.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, property.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== property.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {property.name}
                                </FormLabel>
                                {property.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {property.type === 'apartment' ? 'Apartamento' : 
                                     property.type === 'house' ? 'Casa' : 
                                     property.type === 'commercial' ? 'Comercial' : 
                                     property.type}
                                  </Badge>
                                )}
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview Section */}
            {previewData && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Prévia do Rateio</CardTitle>
                  <CardDescription>
                    Período: {previewData.period?.start} a {previewData.period?.end}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Método: {previewData.distributionMethod}
                    </p>
                    {previewData.preview?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{item.propertyName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.percentage}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 font-bold">
                      <span>Total</span>
                      <span>
                        R$ {previewData.totalAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons with Notification */}
            <div className="space-y-3">
              <div className="flex gap-4 justify-end">
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
                  disabled={isSubmitting || submitMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {isSubmitting || submitMutation.isPending 
                    ? 'Cadastrando...' 
                    : `Cadastrar ${expenseType}`}
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