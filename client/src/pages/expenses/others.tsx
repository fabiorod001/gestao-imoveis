import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Briefcase, Calendar, DollarSign, FileText, CheckCircle2, AlertCircle, X, ArrowLeft, Edit2, List } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const categoryMap: Record<string, string> = {
  'bank_fees': 'Tarifas Bancárias',
  'accounting': 'Contador',
  'office_rent': 'Aluguel do Escritório',
  'general': 'Despesas Gerais',
  'fixed_costs': 'Custos Fixos',
  'variable_costs': 'Custos Variáveis'
};

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

  const handleSubmit = form.handleSubmit((data) => {
    submitMutation.mutate(data);
  });

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>Cadastro de Despesa da Empresa</CardTitle>
        <CardDescription>
          Registre despesas gerais da empresa sem vínculo com propriedades específicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mensalidade software de gestão" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          { value: 'bank_fees', label: 'Tarifas Bancárias' },
                          { value: 'accounting', label: 'Contador' },
                          { value: 'office_rent', label: 'Aluguel do Escritório' },
                          { value: 'general', label: 'Despesas Gerais' },
                          { value: 'fixed_costs', label: 'Custos Fixos' },
                          { value: 'variable_costs', label: 'Custos Variáveis' },
                        ].map(option => (
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
  const [activeTab, setActiveTab] = useState<'company' | 'properties' | 'list'>('company');

  // Query to fetch other expenses
  const { data: otherExpenses = [] } = useQuery({
    queryKey: ['/api/transactions', 'other'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Filter only other category expenses
      return data.filter((t: any) => t.type === 'expense' && t.category === 'other');
    }
  });

  // Separate company expenses (no propertyId) from distributed expenses
  const companyExpenses = otherExpenses.filter((e: any) => !e.propertyId);
  const distributedExpenses = otherExpenses.filter((e: any) => e.propertyId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-gray-600" />
              Outras Despesas
            </h1>
            <p className="text-gray-600">
              Gerencie despesas da empresa e despesas rateadas entre propriedades
            </p>
          </div>
          <Link href="/expenses">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
          <Button
            variant={activeTab === 'company' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('company')}
            className="mr-1"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Despesas da Empresa
          </Button>
          <Button
            variant={activeTab === 'properties' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('properties')}
            className="mr-1"
          >
            <Building className="h-4 w-4 mr-2" />
            Despesas com Rateio
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('list')}
          >
            <List className="h-4 w-4 mr-2" />
            Despesas Cadastradas ({otherExpenses.length})
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
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

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Outras Despesas Cadastradas</CardTitle>
                <CardDescription>
                  Visualize e edite outras despesas já cadastradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {otherExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma despesa cadastrada ainda.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Company Expenses Section */}
                    {companyExpenses.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Briefcase className="h-5 w-5" />
                          Despesas da Empresa
                        </h3>
                        <div className="space-y-2">
                          {companyExpenses.map((expense: any) => (
                            <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{expense.description}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                      {categoryMap[expense.subcategory] || expense.subcategory || 'Geral'}
                                    </span>
                                    <span>
                                      {format(new Date(expense.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                    {expense.supplier && <span>• {expense.supplier}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-red-600">
                                    R$ {Math.abs(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <Button variant="ghost" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Distributed Expenses Section */}
                    {distributedExpenses.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Despesas com Rateio
                        </h3>
                        <div className="space-y-2">
                          {distributedExpenses.map((expense: any) => (
                            <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{expense.description}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                    <span className="text-blue-600 font-medium">
                                      {expense.property?.name}
                                    </span>
                                    <span>
                                      {format(new Date(expense.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-red-600">
                                    R$ {Math.abs(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <Button variant="ghost" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}