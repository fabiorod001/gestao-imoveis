import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
  summary?: {
    properties: number;
    revenues: number;
    expenses: number;
    years: string[];
  };
}

export default function HistoricalDataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("consolidated");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (formData: { file: File; format: string }) => {
      const data = new FormData();
      data.append('excel', formData.file);
      data.append('format', formData.format);
      
      const response = await fetch('/api/import/historical', {
        method: 'POST',
        body: data,
      });
      
      if (!response.ok) {
        throw new Error(`Erro na importação: ${response.statusText}`);
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success) {
        toast({
          title: "Importação histórica concluída",
          description: `${result.importedCount} registros importados com sucesso`,
        });
        
        // Invalidar cache para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly'] });
      } else {
        toast({
          title: "Erro na importação histórica",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo .xlsx",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = () => {
    if (file && selectedFormat) {
      importMutation.mutate({ file, format: selectedFormat });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Importação de Dados Históricos
        </CardTitle>
        <CardDescription>
          Importe todos os dados históricos de receitas e despesas da sua planilha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="format-select">Formato da Planilha</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato da sua planilha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidated">
                  Formato Consolidado (dados nas células específicas que você mencionou)
                </SelectItem>
                <SelectItem value="monthly_sheets">
                  Abas por Ano (2022, 2023, 2024, 2025)
                </SelectItem>
                <SelectItem value="property_sheets">
                  Abas por Imóvel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="historical-file">Arquivo Excel (.xlsx)</Label>
            <Input
              id="historical-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={importMutation.isPending}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        {selectedFormat === "consolidated" && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
              Formato Consolidado Detectado
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p><strong>Células de Consolidação:</strong> C6 até C10</p>
              <p><strong>Dados Individuais:</strong> C39, C56, C73, C90, C107, C124, C141, C158, C175, C192</p>
              <p><strong>Anos Suportados:</strong> 2022, 2023, 2024, 2025</p>
            </div>
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Como funciona a importação:</h4>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>1. <strong>Criação de Imóveis:</strong> O sistema identificará e criará os imóveis automaticamente</p>
            <p>2. <strong>Detecção de Períodos:</strong> Importará dados de todos os anos disponíveis (2022-2025)</p>
            <p>3. <strong>Categorização Automática:</strong> Classificará receitas e despesas por categoria</p>
            <p>4. <strong>Vinculação:</strong> Associará cada transação ao imóvel correspondente</p>
            <p>5. <strong>Validação:</strong> Verificará inconsistências e duplicatas</p>
          </div>
        </div>

        {importMutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Processando dados históricos...</span>
            </div>
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Esta operação pode levar alguns minutos devido ao volume de dados históricos
            </p>
          </div>
        )}

        {importResult && (
          <div className={`p-4 rounded-lg border ${
            importResult.success 
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {importResult.success ? "Importação Concluída" : "Erro na Importação"}
              </span>
            </div>
            
            <p className="text-sm mb-3">{importResult.message}</p>
            
            {importResult.summary && (
              <div className="bg-white dark:bg-gray-900 p-3 rounded border">
                <h5 className="font-medium mb-2">Resumo da Importação:</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Imóveis: {importResult.summary.properties}</div>
                  <div>Receitas: {importResult.summary.revenues}</div>
                  <div>Despesas: {importResult.summary.expenses}</div>
                  <div>Anos: {importResult.summary.years.join(', ')}</div>
                </div>
              </div>
            )}
            
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium">Avisos encontrados:</p>
                <ul className="text-sm list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 20).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResult.errors.length > 20 && (
                    <li className="font-medium">...e mais {importResult.errors.length - 20} avisos</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleImport}
          disabled={!file || !selectedFormat || importMutation.isPending}
          className="w-full"
          size="lg"
        >
          {importMutation.isPending ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Importando Dados Históricos...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Importar Dados Históricos
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}