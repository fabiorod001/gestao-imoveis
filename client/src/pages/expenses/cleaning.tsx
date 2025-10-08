import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, ArrowLeft, Calendar, Edit2, Plus, FileText, List, Upload, AlertCircle, CheckCircle, X, FileSpreadsheet, Trash2, Eye, ScanLine } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributedExpenseForm from '@/components/expenses/DistributedExpenseForm';
import { DetailedCleaningForm } from '@/components/expenses/DetailedCleaningForm';
import CleaningOCRUpload from '@/components/expenses/CleaningOCRUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [activeTab, setActiveTab] = useState<'new' | 'import' | 'ocr' | 'list'>('new');
  const [newExpenseMode, setNewExpenseMode] = useState<'simple' | 'detailed'>('simple');
  
  // PDF Import State
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPdfData | null>(null);
  const [supplier, setSupplier] = useState("Serviço de Limpeza");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Advanced Features State
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<number | null>(null);

  // Query to fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Query to fetch cleaning batches or property cleanings
  const { data: cleaningData = [], isLoading: isLoadingCleanings } = useQuery({
    queryKey: selectedProperty ? ['/api/cleaning/property', selectedProperty] : ['/api/cleaning/batches'],
    queryFn: async () => {
      const url = selectedProperty 
        ? `${import.meta.env.VITE_API_URL || ""}/api/cleaning/property/${selectedProperty}`
        : `${import.meta.env.VITE_API_URL || ""}/api/cleaning/batches`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch cleanings');
      return res.json();
    },
  });

  // Query to fetch batch details
  const { data: batchDetails } = useQuery({
    queryKey: ['/api/cleaning/batch', selectedBatchId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/cleaning/batch/${selectedBatchId}`);
      if (!res.ok) throw new Error('Failed to fetch batch details');
      return res.json();
    },
    enabled: !!selectedBatchId,
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
      
      if (data.unmatchedCount > 0) {
        toast({
          title: "Atenção",
          description: `${data.unmatchedCount} propriedade(s) não foram reconhecidas.`,
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
      const response = await apiRequest("/api/cleaning/import-pdf", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importação concluída",
        description: data.message || "Despesas importadas com sucesso",
        variant: "default",
      });
      // Reset state
      setFile(null);
      setParsedData(null);
      // Invalidate expenses queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/property'] });
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/cleaning/batch/${batchId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete batch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/property'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batch'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      toast({
        title: "Lote deletado",
        description: "Lote de limpezas removido com sucesso",
      });
      setBatchToDelete(null);
      setSelectedBatchId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar lote",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // PDF Import handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setParsedData(null);
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


  const handleImport = () => {
    if (!parsedData) return;
    
    // Importa apenas as entradas reconhecidas (matched)
    const entriesToImport = parsedData.entries.filter(entry => entry.matched);
    
    if (entriesToImport.length === 0) {
      toast({
        title: "Nenhuma propriedade reconhecida",
        description: "Verifique o mapeamento das propriedades",
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
        <div className="bg-white rounded-lg shadow-sm p-1 inline-flex flex-wrap gap-1">
          <Button
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa de Limpeza
          </Button>
          <Button
            variant={activeTab === 'import' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('import')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importação de Tabela
          </Button>
          <Button
            variant={activeTab === 'ocr' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('ocr')}
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Upload OCR
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('list')}
          >
            <List className="h-4 w-4 mr-2" />
            Histórico de Limpezas
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total de Entradas</p>
                          <p className="text-2xl font-bold">{parsedData.entries.length}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Valor Total</p>
                          <p className="text-2xl font-bold">{formatCurrency(parsedData.total)}</p>
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
                      <CardTitle>Despesas Identificadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
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
                      
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={handleImport}
                          disabled={parsedData.entries.filter(e => e.matched).length === 0 || importMutation.isPending}
                        >
                          {importMutation.isPending
                            ? "Importando..."
                            : `Importar ${parsedData.entries.filter(e => e.matched).length} Despesa(s)`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* OCR Upload Tab */}
          <TabsContent value="ocr">
            <Card>
              <CardHeader>
                <CardTitle>📸 Upload OCR - Processamento de Imagens</CardTitle>
                <CardDescription>
                  Faça upload de um screenshot da tabela de fechamento de limpeza (JPG ou PNG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CleaningOCRUpload />
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab - Advanced Features */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Histórico de Limpezas</CardTitle>
                    <CardDescription>
                      Visualize lotes de importação e filtre por propriedade
                    </CardDescription>
                  </div>
                  
                  {/* Property Filter Dropdown */}
                  <div className="w-full sm:w-64">
                    <Select
                      value={selectedProperty || "all"}
                      onValueChange={(value) => setSelectedProperty(value === "all" ? null : value)}
                    >
                      <SelectTrigger data-testid="select-property-filter">
                        <SelectValue placeholder="Filtrar por imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Imóveis</SelectItem>
                        {(properties as any[]).map((property: any) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCleanings ? (
                  <div className="text-center py-8 text-gray-500">
                    Carregando...
                  </div>
                ) : cleaningData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma limpeza encontrada.
                  </div>
                ) : selectedProperty ? (
                  // Property-specific view (individual cleanings)
                  <div className="space-y-3">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Propriedade</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Lote</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cleaningData.map((cleaning: any) => (
                            <TableRow key={cleaning.id}>
                              <TableCell>
                                {cleaning.executionDate 
                                  ? format(new Date(cleaning.executionDate), "dd/MM/yyyy")
                                  : '-'}
                              </TableCell>
                              <TableCell>{cleaning.propertyName || `Imóvel #${cleaning.propertyId}`}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(cleaning.amount) || 0)}
                              </TableCell>
                              <TableCell>
                                {cleaning.batchId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedBatchId(cleaning.batchId)}
                                    data-testid={`button-view-batch-${cleaning.batchId}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Lote #{cleaning.batchId}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {cleaningData.map((cleaning: any) => (
                        <Card key={cleaning.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{cleaning.propertyName || `Imóvel #${cleaning.propertyId}`}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cleaning.executionDate 
                                    ? format(new Date(cleaning.executionDate), "dd/MM/yyyy")
                                    : '-'}
                                </p>
                              </div>
                              <p className="font-semibold">{formatCurrency(Number(cleaning.amount) || 0)}</p>
                            </div>
                            {cleaning.batchId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setSelectedBatchId(cleaning.batchId)}
                                data-testid={`button-view-batch-${cleaning.batchId}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Lote #{cleaning.batchId}
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Batch view (all batches)
                  <div className="space-y-3">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lote</TableHead>
                            <TableHead>Data de Importação</TableHead>
                            <TableHead>Limpezas</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-20">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cleaningData.map((batch: any) => (
                            <TableRow 
                              key={batch.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedBatchId(batch.id)}
                              data-testid={`row-batch-${batch.id}`}
                            >
                              <TableCell className="font-medium">Lote #{batch.id}</TableCell>
                              <TableCell>
                                {batch.createdAt 
                                  ? format(new Date(batch.createdAt), "dd/MM/yyyy 'às' HH:mm")
                                  : batch.paymentDate
                                  ? format(new Date(batch.paymentDate), "dd/MM/yyyy")
                                  : '-'}
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(Number(batch.totalAmount) || 0)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBatchId(batch.id);
                                  }}
                                  data-testid={`button-view-batch-${batch.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {cleaningData.map((batch: any) => (
                        <Card 
                          key={batch.id} 
                          className="p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedBatchId(batch.id)}
                          data-testid={`card-batch-${batch.id}`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">Lote #{batch.id}</p>
                                <p className="text-sm text-muted-foreground">
                                  {batch.createdAt 
                                    ? format(new Date(batch.createdAt), "dd/MM/yyyy HH:mm")
                                    : batch.paymentDate
                                    ? format(new Date(batch.paymentDate), "dd/MM/yyyy")
                                    : '-'}
                                </p>
                              </div>
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {batch.description || 'Lote de limpezas'}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(Number(batch.totalAmount) || 0)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Batch Detail Modal */}
        <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Lote #{selectedBatchId}</DialogTitle>
              <DialogDescription>
                Informações sobre o lote de importação e limpezas incluídas
              </DialogDescription>
            </DialogHeader>

            {batchDetails ? (
              <div className="space-y-6">
                {/* Batch Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Importação</p>
                    <p className="font-semibold">
                      {batchDetails.batch?.createdAt 
                        ? format(new Date(batchDetails.batch.createdAt), "dd/MM/yyyy 'às' HH:mm")
                        : batchDetails.batch?.paymentDate
                        ? format(new Date(batchDetails.batch.paymentDate), "dd/MM/yyyy")
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Limpezas</p>
                    <p className="font-semibold">{batchDetails.services?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="font-semibold">
                      {formatCurrency(
                        batchDetails.services?.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) || 0
                      )}
                    </p>
                  </div>
                </div>

                {/* Cleanings List */}
                <div>
                  <h4 className="font-semibold mb-3">Limpezas do Lote</h4>
                  
                  {/* Desktop Table */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Propriedade</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchDetails.services?.map((service: any) => (
                          <TableRow key={service.id}>
                            <TableCell>{service.propertyName || `Imóvel #${service.propertyId}`}</TableCell>
                            <TableCell>
                              {service.executionDate ? format(new Date(service.executionDate), "dd/MM/yyyy") : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(service.amount) || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2">
                    {batchDetails.services?.map((service: any) => (
                      <Card key={service.id} className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{service.propertyName || `Imóvel #${service.propertyId}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.executionDate ? format(new Date(service.executionDate), "dd/MM/yyyy") : '-'}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(Number(service.amount) || 0)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Carregando detalhes...
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedBatchId) {
                    setBatchToDelete(selectedBatchId);
                  }
                }}
                disabled={deleteBatchMutation.isPending}
                data-testid="button-delete-batch"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Lote
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedBatchId(null)}
                data-testid="button-close-batch-modal"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o lote #{batchToDelete}? 
                {batchDetails?.services && (
                  <span className="font-semibold">
                    {" "}Isso removerá {batchDetails.services.length} limpeza(s).
                  </span>
                )}
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (batchToDelete) {
                    deleteBatchMutation.mutate(batchToDelete);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteBatchMutation.isPending ? "Deletando..." : "Deletar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}