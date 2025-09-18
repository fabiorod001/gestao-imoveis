import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Home, Calendar, History, Clock } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
  summary?: {
    properties: number;
    revenues: number;
    expenses: number;
    occupiedNights: number;
    reservations: number;
    averageDailyRate: number;
    cleanedTransactions?: number;
    analyzedPeriods?: string[];
    analyzedProperties?: string[];
  };
}

interface AnalysisResult {
  success?: boolean;
  properties?: string[];
  periods?: string[];
  totalRevenue?: number;
  reservationCount?: number;
  payoutCount?: number;
  adjustmentCount?: number;
  unmappedListings?: string[];
  dateRange?: {
    start: string | null;
    end: string | null;
  };
  summary?: {
    reservationCount: number;
    totalRevenue: number;
    propertyCount: number;
    periodCount?: number;
  };
  analysis?: {
    properties: string[];
    periods: string[];
    dateRange: {
      start: string;
      end: string;
    };
    summary: {
      reservationCount: number;
      totalRevenue: number;
      propertyCount: number;
      periodCount: number;
    };
  };
  fileBuffer?: string;
}

export default function AirbnbImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [importType, setImportType] = useState<'historical' | 'future'>('historical');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use different endpoints based on import type
      const endpoint = importType === 'future' 
        ? '/api/import/airbnb-pending/analyze' 
        : '/api/import/airbnb-csv/analyze';
      
      const response = await apiRequest(endpoint, 'POST', formData);
      return await response.json() as AnalysisResult;
    },
    onSuccess: (data) => {
      console.log('Analysis result:', data);
      setAnalysisResult(data);
      
      // Show unmapped listings if any
      if (data && data.unmappedListings && data.unmappedListings.length > 0) {
        console.warn('Propriedades não mapeadas:', data.unmappedListings);
        toast({
          title: "Aviso: Propriedades não mapeadas",
          description: `${data.unmappedListings.length} propriedade(s) do Airbnb não foram reconhecidas: ${data.unmappedListings.join(', ')}`,
          variant: "destructive",
        });
      }
      
      // Only show confirmation if we have mapped properties
      if (data && data.properties && data.properties.length > 0) {
        setShowConfirmation(true);
      } else if (data && data.unmappedListings && data.unmappedListings.length > 0) {
        // Show unmapped properties in a more visible way
        toast({
          title: "Nenhuma propriedade reconhecida",
          description: `Adicione o mapeamento para: ${data.unmappedListings.join(', ')}`,
          variant: "destructive",
        });
      } else {
        setShowConfirmation(true); // Still show if there's data
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar o arquivo. Verifique se é um CSV do Airbnb válido.",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use different endpoints based on import type  
      const endpoint = importType === 'future' 
        ? '/api/import/airbnb-pending' 
        : '/api/import/airbnb-csv';
      
      const response = await apiRequest(endpoint, 'POST', formData);
      return await response.json() as ImportResult;
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success) {
        toast({
          title: "Importação do Airbnb concluída!",
          description: `${result.importedCount} reservas processadas com sucesso.`,
        });
        
        // Clear states after successful import
        setSelectedFile(null);
        setAnalysisResult(null);
        setShowConfirmation(false);
        
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Invalidate cache to refresh all data
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/pivot-table'] });
      } else {
        toast({
          title: "Erro na importação",
          description: result.message || "Houve um problema durante a importação.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      setAnalysisResult(null);
      setShowConfirmation(false);
    }
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      analyzeMutation.mutate(selectedFile);
    }
  };

  const handleConfirmImport = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
      setShowConfirmation(false);
    }
  };

  const handleCancelImport = () => {
    setShowConfirmation(false);
    setAnalysisResult(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {importType === 'future' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <History className="w-5 h-5" />
            )}
            Importação Unificada do Airbnb
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sistema Unificado:</strong> {importType === 'future' ? 
                'Processa reservas futuras para previsão de receitas. Remove apenas reservas futuras existentes antes de importar.' : 
                'Analisa automaticamente payouts históricos do Airbnb. Remove apenas dados do período sendo importado.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label htmlFor="import-type" className="block text-sm font-medium mb-2">
                Tipo de Importação
              </label>
              <Select value={importType} onValueChange={(value: 'historical' | 'future') => setImportType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      <span>Dados Históricos (Payouts)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="future">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Reservas Futuras (Previsão)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="csv-upload" className="block text-sm font-medium mb-2">
                Selecione o arquivo CSV do Airbnb
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 
                  file:mr-4 file:py-2 file:px-4 
                  file:rounded-md file:border-0 
                  file:text-sm file:font-semibold 
                  file:bg-blue-50 file:text-blue-700 
                  hover:file:bg-blue-100
                  border border-gray-300 rounded-md"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <Badge variant="outline">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analisando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Analisar Arquivo
                </>
              )}
            </Button>

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Progress value={45} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Processando reservas e calculando métricas...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapeamento de Propriedades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Mapeamento de Propriedades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Nome no Airbnb</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>• "1 Suíte + Quintal privativo"</div>
                  <div>• "1 Suíte Wonderful Einstein Morumbi"</div>
                  <div>• "2 Quartos + Quintal Privativo"</div>
                  <div>• "2 quartos, maravilhoso, na Avenida Berrini"</div>
                  <div>• "Studio Premium - Haddock Lobo."</div>
                  <div>• "Sesimbra SeaView Studio 502..."</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Nome no Sistema</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>→ Sevilha G07</div>
                  <div>→ Sevilha 307</div>
                  <div>→ Málaga M0</div>
                  <div>→ Maxhaus 43R</div>
                  <div>→ Next Haddock Lobo ap 33</div>
                  <div>→ Sesimbra ap 505- Portugal</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={importResult.success ? "default" : "destructive"}>
              <AlertDescription>
                {importResult.message}
              </AlertDescription>
            </Alert>

            {importResult.success && importResult.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Reservas</span>
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {importResult.summary.reservations}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Receita Total</span>
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {formatCurrency(importResult.summary.revenues)}
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Noites Ocupadas</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900">
                    {importResult.summary.occupiedNights}
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Valor Médio da Diária</span>
                  </div>
                  <div className="text-lg font-bold text-orange-900">
                    {formatCurrency(importResult.summary.averageDailyRate)}
                  </div>
                  <div className="text-xs text-orange-700 mt-1">
                    Baseado em {importResult.summary.occupiedNights} noites ocupadas
                  </div>
                </div>
              </div>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-800">Erros encontrados:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && analysisResult?.analysis && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="w-5 h-5" />
              Confirmação de Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Análise do arquivo concluída:</strong> O sistema identificou os seguintes dados para importação.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Período dos Pagamentos:</h4>
                <p className="text-sm bg-white p-2 rounded border">
                  <strong>De:</strong> {analysisResult.analysis.dateRange.start ? 
                    new Date(analysisResult.analysis.dateRange.start).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'N/A'}<br />
                  <strong>Até:</strong> {analysisResult.analysis.dateRange.end ? 
                    new Date(analysisResult.analysis.dateRange.end).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'N/A'}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Resumo:</h4>
                <div className="text-sm bg-white p-2 rounded border space-y-1">
                  <p><strong>{analysisResult.analysis.summary.reservationCount}</strong> reservas</p>
                  <p><strong>{analysisResult.analysis.summary.propertyCount}</strong> propriedades</p>
                  <p><strong>{formatCurrency(analysisResult.analysis.summary.totalRevenue)}</strong> em receitas</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Propriedades Identificadas:</h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.analysis.properties.map((property, index) => (
                  <Badge key={index} variant="secondary">
                    {property}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Períodos Identificados:</h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.analysis.periods.map((period, index) => (
                  <Badge key={index} variant="outline">
                    {period}
                  </Badge>
                ))}
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Como funciona a importação:</strong>
                <ul className="mt-2 ml-4 list-disc">
                  <li>Todas as receitas do Airbnb nas datas do relatório serão substituídas pelos novos valores</li>
                  <li>Receitas de outras fontes (aluguéis manuais, etc.) serão preservadas</li>
                  <li>Isso garante que você sempre tenha os valores mais atualizados do Airbnb</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleConfirmImport}
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sim, Importar Dados
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCancelImport}
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                Não, Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}