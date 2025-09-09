import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, ArrowLeft, Calendar, Edit2, Plus, FileText, List, Upload, AlertCircle, CheckCircle, X, FileSpreadsheet } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';
import { DetailedCleaningForm } from '@/components/expenses/DetailedCleaningForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface CleaningEntry {
  date: string;
  unit: string;
  value: number;
  propertyId: string | null;
  propertyName: string;
  matched: boolean;
  selected?: boolean;
}

interface ParsedPdfData {
  period: { start: string; end: string };
  entries: CleaningEntry[];
  total: number;
  errors: string[];
  unmatchedCount: number;
}

export default function CleaningExpensesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'new' | 'import' | 'list'>('new');
  const [newExpenseMode, setNewExpenseMode] = useState<'simple' | 'detailed'>('simple');
  
  // PDF Import State
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPdfData | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [supplier, setSupplier] = useState("Serviço de Limpeza");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

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

  // Parse PDF mutation
  const parsePdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/cleaning/parse-pdf", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar PDF");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setParsedData(data);
      // Pre-select all matched entries
      const matchedIndices = data.entries
        .map((entry: CleaningEntry, index: number) => entry.matched ? index : null)
        .filter((index: number | null) => index !== null) as number[];
      setSelectedEntries(new Set(matchedIndices));
      
      if (data.unmatchedCount > 0) {
        toast({
          title: "Atenção",
          description: `${data.unmatchedCount} propriedade(s) não foram reconhecidas. Verifique antes de importar.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Import expenses mutation
  const importMutation = useMutation({
    mutationFn: async (data: { entries: CleaningEntry[]; supplier: string; paymentDate: string }) => {
      return apiRequest("/api/cleaning/import-pdf", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Importação concluída",
        description: data.message,
        variant: "default",
      });
      // Reset state
      setFile(null);
      setParsedData(null);
      setSelectedEntries(new Set());
      // Invalidate expenses queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
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

  // PDF Import handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setParsedData(null);
      setSelectedEntries(new Set());
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
    }
  };

  const handleParse = () => {
    if (file) {
      parsePdfMutation.mutate(file);
    }
  };

  const toggleEntry = (index: number) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEntries(newSelected);
  };

  const toggleAll = () => {
    if (selectedEntries.size === parsedData?.entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(parsedData?.entries.map((_, i) => i)));
    }
  };

  const handleImport = () => {
    if (!parsedData) return;
    
    const entriesToImport = parsedData.entries.filter((_, index) => selectedEntries.has(index));
    
    if (entriesToImport.length === 0) {
      toast({
        title: "Nenhuma entrada selecionada",
        description: "Selecione ao menos uma entrada para importar",
        variant: "destructive",
      });
      return;
    }
    
    importMutation.mutate({
      entries: entriesToImport,
      supplier,
      paymentDate,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('new')}
            className="mr-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa de Limpeza
          </Button>
          <Button
            variant={activeTab === 'import' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('import')}
            className="mr-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importação de Tabela
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
          {/* New Expense Tab */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Nova Despesa de Limpeza</CardTitle>
                <CardDescription>
                  Escolha o tipo de cadastro para registrar as despesas de limpeza
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sub-tabs for Simple vs Detailed */}
                <Tabs value={newExpenseMode} onValueChange={(value: any) => setNewExpenseMode(value)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="simple">Cadastro Simples</TabsTrigger>
                    <TabsTrigger value="detailed">Cadastro Detalhado</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="simple">
                    <DistributedExpenseForm 
                      expenseType="Limpeza" 
                      title="Cadastro Simples de Limpeza"
                      description="Registre despesas com limpeza de forma simplificada"
                    />
                  </TabsContent>
                  
                  <TabsContent value="detailed">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Cadastro Detalhado de Limpezas</h3>
                        <p className="text-sm text-muted-foreground">
                          Registre o pagamento consolidado e os detalhes de cada limpeza individual
                        </p>
                      </div>
                      <DetailedCleaningForm />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <div className="space-y-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Importação de Tabela PDF</CardTitle>
                  <CardDescription>
                    Importe automaticamente despesas de limpeza a partir de PDFs com tabelas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {file && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {file.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          onClick={() => {
                            setFile(null);
                            setParsedData(null);
                            setSelectedEntries(new Set());
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleParse}
                    disabled={!file || parsePdfMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {parsePdfMutation.isPending ? "Processando..." : "Processar PDF"}
                  </Button>
                </CardContent>
              </Card>

              {/* Parsed Data Preview */}
              {parsedData && (
                <>
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo do PDF</CardTitle>
                      {parsedData.period.start && parsedData.period.end && (
                        <CardDescription>
                          Período: {format(new Date(parsedData.period.start), "dd/MM/yyyy")} a{" "}
                          {format(new Date(parsedData.period.end), "dd/MM/yyyy")}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total de Entradas</p>
                          <p className="text-2xl font-bold">{parsedData.entries.length}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Valor Total</p>
                          <p className="text-2xl font-bold">{formatCurrency(parsedData.total)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Propriedades Reconhecidas</p>
                          <p className="text-2xl font-bold">
                            {parsedData.entries.length - parsedData.unmatchedCount} / {parsedData.entries.length}
                          </p>
                        </div>
                      </div>
                      
                      {parsedData.errors.length > 0 && (
                        <Alert className="mt-4" variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              {parsedData.errors.map((error, i) => (
                                <div key={i}>{error}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Import Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações de Importação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="supplier">Fornecedor</Label>
                          <Input
                            id="supplier"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            placeholder="Nome do fornecedor"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentDate">Data de Pagamento</Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Entries Table */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Despesas Identificadas</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleAll}
                        >
                          {selectedEntries.size === parsedData.entries.length
                            ? "Desmarcar Todas"
                            : "Selecionar Todas"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedEntries.size === parsedData.entries.length}
                                  onCheckedChange={() => toggleAll()}
                                />
                              </TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Unidade (PDF)</TableHead>
                              <TableHead>Propriedade (Sistema)</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-24">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedData.entries.map((entry, index) => (
                              <TableRow
                                key={index}
                                className={!entry.matched ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedEntries.has(index)}
                                    onCheckedChange={() => toggleEntry(index)}
                                    disabled={!entry.matched}
                                  />
                                </TableCell>
                                <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                <TableCell>{entry.unit}</TableCell>
                                <TableCell>
                                  {entry.matched ? (
                                    <span className="text-green-600 dark:text-green-400">
                                      {entry.propertyName}
                                    </span>
                                  ) : (
                                    <span className="text-yellow-600 dark:text-yellow-400">
                                      Não reconhecida
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(entry.value)}</TableCell>
                                <TableCell>
                                  {entry.matched ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {selectedEntries.size} de {parsedData.entries.length} entradas selecionadas
                        </div>
                        <Button
                          onClick={handleImport}
                          disabled={selectedEntries.size === 0 || importMutation.isPending}
                        >
                          {importMutation.isPending
                            ? "Importando..."
                            : `Importar ${selectedEntries.size} Despesa(s)`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
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