import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import TaxPaymentForm from '@/components/taxes/TaxPaymentForm';
import { TaxImportDialog } from '@/components/taxes/TaxImportDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, TrendingUp, Building2, DollarSign, ArrowLeft, Calendar, Edit2, Upload, FileSpreadsheet, Check, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function TaxesPage() {
  const [selectedTab, setSelectedTab] = useState<'new' | 'list' | 'projections'>('new');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Query to fetch tax expenses
  const { data: taxExpenses = [] } = useQuery({
    queryKey: ['/api/transactions', { type: 'expense', category: 'taxes' }],
  });

  // Group tax expenses by date
  const groupedTaxes = Array.isArray(taxExpenses) ? taxExpenses.reduce((acc: any, transaction: any) => {
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
  }, {}) : {};

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
        <div className="bg-white rounded-lg shadow-sm p-1 inline-flex flex-wrap gap-1">
          <Button
            variant={selectedTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('new')}
            data-testid="tab-new"
          >
            Novo Imposto
          </Button>
          <Button
            variant={selectedTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('list')}
            data-testid="tab-list"
          >
            Pagamentos ({taxGroups.length})
          </Button>
          <Button
            variant={selectedTab === 'projections' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('projections')}
            data-testid="tab-projections"
          >
            Projeções
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

          {/* Projections Tab */}
          <TabsContent value="projections" className="space-y-6">
            <ProjectionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Projections Tab Component
function ProjectionsTab() {
  const { toast } = useToast();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [referenceMonth, setReferenceMonth] = useState(currentMonth);

  // Query for projections
  const { data: projectionsData, isLoading } = useQuery({
    queryKey: ['/api/taxes/projections'],
  });
  
  const projections = Array.isArray(projectionsData) ? projectionsData : [];

  // Calculate projections mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/taxes/calculate', {
        method: 'POST',
        body: JSON.stringify({ referenceMonth }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/projections'] });
      toast({
        title: "Projeções calculadas",
        description: data.message || `${data.projections?.length || 0} projeções criadas`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao calcular",
        description: error.message || "Não foi possível calcular as projeções",
        variant: "destructive",
      });
    },
  });

  // Recalculate all projections
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/taxes/recalculate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/projections'] });
      toast({
        title: "Recalculado com sucesso",
        description: "Todas as projeções foram atualizadas",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao recalcular",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Confirm projection mutation
  const confirmMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/taxes/projections/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/projections'] });
      toast({
        title: "Projeção confirmada",
        description: "Transação criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete projection (using PATCH to mark as cancelled)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/taxes/projections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/projections'] });
      toast({
        title: "Projeção removida",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Projeções de Impostos
              </CardTitle>
              <CardDescription>
                Projeções automáticas baseadas nas receitas dos últimos 3 meses
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">Mês:</label>
                <input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="border rounded px-3 py-1 text-sm bg-background"
                  data-testid="input-reference-month"
                />
              </div>
              <Button
                onClick={() => calculateMutation.mutate()}
                disabled={calculateMutation.isPending}
                data-testid="button-calculate"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculateMutation.isPending ? 'Calculando...' : 'Calcular Projeções'}
              </Button>
              <Button
                variant="outline"
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending || projections.length === 0}
                data-testid="button-recalculate"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                Recalcular Tudo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Projections List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : projections.length === 0 ? (
            <div className="text-center py-12" data-testid="text-projections-empty">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">Nenhuma projeção encontrada</p>
              <Button onClick={() => calculateMutation.mutate()} data-testid="button-calculate-empty">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Projeções
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projections.map((projection: any) => (
                <div
                  key={projection.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`projection-${projection.id}`}
                >
                  <div className="flex-1 mb-3 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {format(new Date(projection.referenceMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
                      </h3>
                      <Badge variant={projection.taxType === 'PIS' ? 'default' : projection.taxType === 'COFINS' ? 'secondary' : 'outline'}>
                        {projection.taxType}
                      </Badge>
                      <Badge variant={projection.status === 'confirmed' ? 'default' : 'secondary'}>
                        {projection.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(parseFloat(projection.totalAmount || 0))}
                    </p>
                    {projection.notes && (
                      <p className="text-sm text-gray-500 mt-1">{projection.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {projection.status !== 'confirmed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmMutation.mutate(projection.id)}
                          disabled={confirmMutation.isPending}
                          data-testid={`button-confirm-${projection.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(projection.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${projection.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}