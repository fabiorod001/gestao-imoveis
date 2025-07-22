import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, ArrowLeft, Calendar, Edit2, Plus, FileText, List } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';
import { DetailedCleaningForm } from '@/components/expenses/DetailedCleaningForm';

export default function CleaningExpensesPage() {
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed' | 'list'>('simple');
  const [entryMode, setEntryMode] = useState<'simple' | 'detailed'>('simple');

  // Query to fetch cleaning expenses
  const { data: cleaningExpenses = [] } = useQuery({
    queryKey: ['/api/transactions', 'cleaning'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Filter only cleaning category expenses
      return data.filter((t: any) => t.type === 'expense' && t.category === 'cleaning');
    }
  });

  // Group expenses by property and month
  const groupedExpenses = cleaningExpenses.reduce((acc: any, expense: any) => {
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
              <Sparkles className="h-8 w-8 text-indigo-600" />
              Limpezas
            </h1>
            <p className="text-gray-600">
              Gerencie serviços de limpeza e manutenção das propriedades
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
            variant={activeTab === 'simple' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('simple')}
            className="mr-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Entrada Simples
          </Button>
          <Button
            variant={activeTab === 'detailed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('detailed')}
            className="mr-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Entrada Detalhada
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('list')}
          >
            <List className="h-4 w-4 mr-2" />
            Limpezas Cadastradas ({cleaningExpenses.length})
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          {/* Simple Entry Tab */}
          <TabsContent value="simple">
            <DistributedExpenseForm 
              expenseType="Limpeza" 
              title="Cadastro Simples de Limpeza"
              description="Registre despesas com limpeza de forma simplificada"
            />
          </TabsContent>

          {/* Detailed Entry Tab */}
          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro Detalhado de Limpezas</CardTitle>
                <CardDescription>
                  Registre o pagamento consolidado e os detalhes de cada limpeza individual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DetailedCleaningForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Limpezas Cadastradas</CardTitle>
                <CardDescription>
                  Visualize e edite os serviços de limpeza já cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cleaningExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma limpeza cadastrada ainda.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedExpenses).map(([propertyName, expenses]: [string, any]) => (
                      <div key={propertyName}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-indigo-500" />
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