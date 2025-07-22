import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Briefcase, Calendar, DollarSign, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';

const companyExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  paymentDate: z.string().min(1, 'Data de pagamento é obrigatória'),
  category: z.enum(['bank_fees', 'accounting', 'office_rent', 'general', 'fixed_costs', 'variable_costs'], {
    required_error: 'Selecione uma categoria',
  }),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type CompanyExpenseFormData = z.infer<typeof companyExpenseSchema>;

function CompanyExpenseForm() {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CompanyExpenseFormData>({
    resolver: zodResolver(companyExpenseSchema),
    defaultValues: {
      description: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      category: undefined,
      supplier: '',
      notes: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CompanyExpenseFormData) => {
      const response = await apiRequest('/api/expenses/company', 'POST', {
        ...data,
        amount: parseFloat(data.amount.replace(/\./g, '').replace(',', '.')),
      });
      return response.json();
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'Despesa da empresa cadastrada com sucesso!' });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setTimeout(() => setNotification(null), 10000);
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.message || "Erro ao cadastrar despesa." });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const onSubmit = async (data: CompanyExpenseFormData) => {
    await submitMutation.mutateAsync(data);
  };

  const categoryOptions = [
    { value: 'bank_fees', label: 'Tarifas Bancárias' },
    { value: 'accounting', label: 'Contador' },
    { value: 'office_rent', label: 'Aluguel do Escritório' },
    { value: 'general', label: 'Despesas Gerais' },
    { value: 'fixed_costs', label: 'Custos Fixos' },
    { value: 'variable_costs', label: 'Custos Variáveis' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Despesas da Empresa
        </CardTitle>
        <CardDescription>
          Registre despesas gerais da empresa não relacionadas a imóveis específicos
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Despesa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mensalidade do contador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="1.500"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value) {
                            const formattedValue = (parseInt(value) / 100).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).replace(',', '.');
                            field.onChange(formattedValue);
                          } else {
                            field.onChange('');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Date and Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Pagamento
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do fornecedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre esta despesa"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Adicione detalhes que possam ser úteis para referência futura
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button with Notification */}
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {submitMutation.isPending ? 'Cadastrando...' : 'Cadastrar Despesa da Empresa'}
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

export default function OtherExpensesPage() {
  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[600px]">
          <TabsTrigger value="company" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Despesas da Empresa
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Building className="h-4 w-4" />
            Despesas com Rateio por Imóveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyExpenseForm />
        </TabsContent>

        <TabsContent value="properties">
          <DistributedExpenseForm 
            expenseType="Outras Despesas" 
            title="Outras Despesas com Rateio"
            description="Registre despesas diversas que devem ser rateadas entre os imóveis"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}