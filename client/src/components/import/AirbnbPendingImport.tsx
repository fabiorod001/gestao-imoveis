import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, TrendingUp, Building2, FileUp, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
  summary?: {
    properties: number;
    reservations: number;
    totalPlannedRevenue: number;
    futureMonths: string[];
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function AirbnbPendingImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('🔮 Enviando arquivo para análise de RESERVAS FUTURAS');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'pending');
      
      const response = await fetch('/api/import/airbnb-csv/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔮 Resultado da análise de reservas futuras:', result);
      return result;
    },
    onSuccess: (data: any) => {
      setAnalysisResult(data);
      if (data.success && data.analysis) {
        setShowConfirmation(true);
        toast({
          title: "Arquivo analisado!",
          description: `${data.analysis.summary.reservationCount} reservas encontradas`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise",
        description: "Erro ao analisar o arquivo",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('🔮 Enviando arquivo para IMPORTAÇÃO de reservas futuras');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'pending');
      
      const response = await fetch('/api/import/airbnb-pending', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔮 Resultado da importação de reservas futuras:', result);
      return result;
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      
      if (data.success) {
        toast({
          title: "Reservas futuras importadas!",
          description: data.message,
        });
        
        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      } else {
        toast({
          title: "Erro na importação",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Erro ao processar o arquivo. Verifique o formato e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
      setAnalysisResult(null);
      setShowConfirmation(false);
    }
  };

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(file);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            🔮 RESERVAS FUTURAS - Previsão de Fluxo de Caixa
          </CardTitle>
          <CardDescription>
            ⚠️ ATENÇÃO: Este é para RESERVAS FUTURAS (não pagamentos históricos).
            Use o relatório de "Reservas" do Airbnb filtrado para datas futuras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pending-file">Arquivo CSV de Reservas Futuras</Label>
            <Input
              id="pending-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato esperado:</strong> Use o relatório "Reservas" do Airbnb filtrado para datas futuras.
              O sistema importará apenas reservas com datas de pagamento futuras para previsão de receitas.
            </AlertDescription>
          </Alert>

          {!showConfirmation ? (
            <Button 
              onClick={() => file && analysisMutation.mutate(file)} 
              disabled={!file || analysisMutation.isPending}
              className="w-full"
            >
              {analysisMutation.isPending ? (
                <>
                  <FileUp className="mr-2 h-4 w-4 animate-spin" />
                  Analisando arquivo...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Analisar Arquivo de Reservas Futuras
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleImport} 
                disabled={!file || importMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {importMutation.isPending ? (
                  <>
                    <FileUp className="mr-2 h-4 w-4 animate-spin" />
                    Importando reservas futuras...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar e Importar Reservas Futuras
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  setShowConfirmation(false);
                  setAnalysisResult(null);
                  setFile(null);
                }}
                variant="outline"
                className="w-full"
              >
                Cancelar e Selecionar Outro Arquivo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {analysisResult && analysisResult.success && analysisResult.analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Análise do Arquivo - Reservas Futuras
            </CardTitle>
            <CardDescription>
              Confirme os dados antes de importar as reservas futuras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <CalendarDays className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {analysisResult.analysis.summary.reservationCount}
                </div>
                <div className="text-sm text-blue-700">Reservas</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(analysisResult.analysis.summary.totalRevenue)}
                </div>
                <div className="text-sm text-green-700">Total Previsto</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Building2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">
                  {analysisResult.analysis.summary.propertyCount}
                </div>
                <div className="text-sm text-purple-700">Propriedades</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <CalendarDays className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-900">
                  {analysisResult.analysis.summary.periodCount}
                </div>
                <div className="text-sm text-orange-700">Períodos</div>
              </div>
            </div>

            {analysisResult.analysis.properties && (
              <div>
                <h4 className="font-medium mb-2">Propriedades encontradas:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.properties.map((property: string) => (
                    <Badge key={property} variant="secondary">
                      {property}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.analysis.periods && (
              <div>
                <h4 className="font-medium mb-2">Períodos encontrados:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.periods.map((period: string) => (
                    <Badge key={period} variant="outline">
                      {period}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => {
                  setAnalysisResult(null);
                  setFile(null);
                }}
                variant="outline"
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                onClick={() => importMutation.mutate(file!)}
                disabled={importMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar e Importar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
                {importResult.message}
              </AlertDescription>
            </Alert>

            {importResult.success && importResult.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <CalendarDays className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">
                    {importResult.summary.reservations}
                  </div>
                  <div className="text-sm text-blue-700">Reservas Futuras</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(importResult.summary.totalPlannedRevenue)}
                  </div>
                  <div className="text-sm text-green-700">Receita Prevista</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Building2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900">
                    {importResult.summary.properties}
                  </div>
                  <div className="text-sm text-purple-700">Propriedades</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <CalendarDays className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-900">
                    {importResult.summary.futureMonths.length}
                  </div>
                  <div className="text-sm text-orange-700">Meses Futuros</div>
                </div>
              </div>
            )}

            {importResult.summary?.futureMonths && importResult.summary.futureMonths.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Períodos com Reservas:</h4>
                <div className="flex flex-wrap gap-2">
                  {importResult.summary.futureMonths.map(month => (
                    <Badge key={month} variant="secondary">
                      {month}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2">Erros encontrados:</h4>
                <div className="space-y-1">
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1.</strong> No Airbnb, vá em "Reservas" e aplique filtros para datas futuras</p>
            <p><strong>2.</strong> Exporte o relatório como CSV</p>
            <p><strong>3.</strong> Faça upload do arquivo aqui</p>
            <p><strong>4.</strong> O sistema importará apenas reservas com datas de pagamento futuras</p>
            <p><strong>5.</strong> Use essas informações para prever seu fluxo de caixa</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}