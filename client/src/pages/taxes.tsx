import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TaxPaymentForm from '@/components/taxes/TaxPaymentForm';
import { TaxImportDialog } from '@/components/taxes/TaxImportDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingUp, Building2, DollarSign, ArrowLeft, Calendar, Edit2, Upload, FileSpreadsheet } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TaxesPage() {
  const [selectedTab, setSelectedTab] = useState<'new' | 'list'>('new');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Query to fetch tax expenses
  const { data: taxExpenses = [] } = useQuery({
    queryKey: ['/api/transactions', 'taxes'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Filter only tax expenses
      return data.filter((t: any) => t.type === 'expense' && t.category === 'taxes');
    }
  });

  // Group tax expenses by date
  const groupedTaxes = taxExpenses.reduce((acc: any, transaction: any) => {
    const dateKey = transaction.date;
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        transactions: [],
        totalAmount: 0,
        types: new Set()
      };
    }
    acc[dateKey].transactions.push(transaction);
    acc[dateKey].totalAmount += Math.abs(transaction.amount);
    
    // Extract tax type from description
    const description = transaction.description || '';
    if (description.includes('PIS')) acc[dateKey].types.add('PIS');
    if (description.includes('COFINS')) acc[dateKey].types.add('COFINS');
    if (description.includes('CSLL')) acc[dateKey].types.add('CSLL');
    if (description.includes('IRPJ')) acc[dateKey].types.add('IRPJ');
    
    return acc;
  }, {});

  const taxGroups = Object.values(groupedTaxes).sort((a: any, b: any) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="h-8 w-8 text-blue-600" />
              Gestão de Impostos
            </h1>
            <p className="text-gray-600">
              Sistema completo para cadastro e rateio de impostos
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Link href="/expenses/taxes-detail">
              <Button variant="outline" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Tabela Detalhada
              </Button>
            </Link>
            <Link href="/expenses">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>

        {/* Tax Import Dialog */}
        <TaxImportDialog 
          open={importDialogOpen} 
          onOpenChange={setImportDialogOpen} 
        />

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
          <Button
            variant={selectedTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('new')}
            className="mr-1"
          >
            Novo Imposto
          </Button>
          <Button
            variant={selectedTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('list')}
          >
            Impostos Cadastrados ({taxGroups.length})
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          {/* New Tax Tab */}
          <TabsContent value="new" className="space-y-6">
            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Rateio Proporcional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Impostos distribuídos automaticamente entre propriedades baseado na receita bruta do período de competência
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    Multi-Propriedade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Selecione quais propriedades participarão do rateio para cada declaração de imposto
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    Parcelamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Opções de parcelamento para CSLL e IRPJ com cálculo automático dos acréscimos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Form */}
            <Card>
              <CardHeader>
                <CardTitle>Cadastro de Impostos</CardTitle>
                <CardDescription>
                  Cadastre PIS, COFINS, CSLL ou IRPJ com rateio automático entre propriedades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaxPaymentForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Impostos Cadastrados</CardTitle>
                <CardDescription>
                  Visualize e edite os impostos já cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {taxGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum imposto cadastrado ainda.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taxGroups.map((group: any) => (
                      <div key={group.date} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {format(new Date(group.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              R$ {group.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Tax Types */}
                        <div className="flex gap-2 mb-2">
                          {Array.from(group.types).map((type: any) => (
                            <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {type}
                            </span>
                          ))}
                        </div>

                        <div className="text-sm text-gray-600">
                          <p className="mb-1">Distribuído entre {group.transactions.length} propriedades:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {group.transactions.map((t: any) => (
                              <div key={t.id} className="flex justify-between">
                                <span>{t.property?.name || 'Propriedade'}</span>
                                <span className="text-gray-700">
                                  R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
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