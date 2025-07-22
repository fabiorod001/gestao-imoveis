import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, ArrowLeft, Calendar, Edit2, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';

export default function CondominiumExpensesPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');

  // Query to fetch condominium expenses
  const { data: condominiumExpenses = [] } = useQuery({
    queryKey: ['/api/transactions', 'maintenance'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Filter only maintenance category expenses (condominium)
      return data.filter((t: any) => t.type === 'expense' && t.category === 'maintenance');
    }
  });

  // Group expenses by property and month
  const groupedExpenses = condominiumExpenses.reduce((acc: any, expense: any) => {
    const propertyName = expense.property?.name || 'Sem propriedade';
    if (!acc[propertyName]) {
      acc[propertyName] = [];
    }
    acc[propertyName].push(expense);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              Condomínios
            </h1>
            <p className="text-gray-600">
              Gerencie taxas condominiais e despesas relacionadas
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
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('new')}
            className="mr-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Condomínio
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('list')}
          >
            Condomínios Cadastrados ({condominiumExpenses.length})
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          {/* New Condominium Tab */}
          <TabsContent value="new">
            <DistributedExpenseForm 
              expenseType="Condomínio" 
              title="Cadastro de Taxa Condominial"
              description="Registre taxas de condomínio e despesas relacionadas"
            />
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Condomínios Cadastrados</CardTitle>
                <CardDescription>
                  Visualize e edite as taxas condominiais já cadastradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {condominiumExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma taxa condominial cadastrada ainda.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedExpenses).map(([propertyName, expenses]: [string, any]) => (
                      <div key={propertyName}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-500" />
                          {propertyName}
                        </h3>
                        <div className="space-y-2">
                          {expenses.sort((a: any, b: any) => 
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                          ).map((expense: any) => (
                            <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{expense.description}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(expense.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                    {expense.supplier && <span>• {expense.supplier}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-red-600">
                                    R$ {Math.abs(expense.amount).toLocaleString('pt-BR', { 
                                      minimumFractionDigits: 2, 
                                      maximumFractionDigits: 2 
                                    })}
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
                    ))}
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