import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function SimpleFormatImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', 'simple_per_property');

      const response = await apiRequest("/api/import/simple-format", "POST", formData);
      return await response.json() as ImportResult;
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success) {
        toast({
          title: "Importação concluída",
          description: `${result.importedCount} registros importados com sucesso`,
        });
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      } else {
        toast({
          title: "Erro na importação",
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
      setImportResult({
        success: false,
        message: error.message
      });
    },
  });

  const handleUpload = () => {
    if (!file) return;
    importMutation.mutate(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Formato Simples (Uma Aba por Imóvel)
        </CardTitle>
        <CardDescription>
          Importa Excel com uma aba para cada imóvel. Formato mais confiável e recomendado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!importResult && (
          <>
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">✓ Estrutura Atualizada (Formato Horizontal)</h4>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <p><strong>Cada aba representa um imóvel com estrutura horizontal:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Nome da aba: Exatamente como "Sevilha 307", "Sevilha G07", etc.</li>
                  <li><strong>Linha 1:</strong> Cabeçalhos das colunas</li>
                  <li><strong>Linha 2+:</strong> Dados de cada mês (Janeiro 2025, Fevereiro 2025, etc.)</li>
                  <li><strong>Colunas:</strong> A=Data, B=Aluguel, C=Outras Receitas, D=Total Receitas, E=Impostos, F=Gestão, G=Condomínio, etc.</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Estrutura Completa das Colunas:</h4>
              <div className="bg-white dark:bg-gray-900 p-3 rounded border font-mono text-xs">
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 font-semibold border-b pb-1">
                    <div>A: Data</div>
                    <div>B: Receita-Aluguel</div>
                    <div>C: Receita-Outras</div>
                    <div>D: Receita-Total</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-semibold border-b pb-1">
                    <div>E: Impostos</div>
                    <div>F: Gestão</div>
                    <div>G: Condomínio</div>
                    <div>H: Taxa Cond.</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-semibold border-b pb-1">
                    <div>I: Luz</div>
                    <div>J: Gás/Água</div>
                    <div>K: Comissões</div>
                    <div>L: IPTU</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-semibold">
                    <div>M: Financiamento</div>
                    <div>N: Manutenção</div>
                    <div>O: Internet/TV</div>
                    <div>P: Limpeza</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium mb-2 text-yellow-900 dark:text-yellow-100">Exemplo Aba "Sevilha 307":</h4>
              <div className="bg-white dark:bg-gray-900 p-3 rounded border font-mono text-xs overflow-x-auto">
                <div className="min-w-max space-y-1">
                  <div className="grid grid-cols-6 gap-2 font-semibold border-b pb-1">
                    <div>A: Data</div>
                    <div>B: Aluguel</div>
                    <div>C: Outras</div>
                    <div>E: Impostos</div>
                    <div>G: Condomínio</div>
                    <div>I: Luz</div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <div>Janeiro 2025</div>
                    <div>800</div>
                    <div>0</div>
                    <div>50</div>
                    <div>120</div>
                    <div>80</div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <div>Fevereiro 2025</div>
                    <div>800</div>
                    <div>0</div>
                    <div>50</div>
                    <div>120</div>
                    <div>85</div>
                  </div>
                  <div className="text-center text-muted-foreground">... (e assim por diante)</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="simple-file">Selecionar arquivo Excel (.xlsx)</Label>
              <Input
                id="simple-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </div>

            <Button 
              onClick={handleUpload}
              disabled={!file || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Dados
                </>
              )}
            </Button>
          </>
        )}

        {importResult && (
          <div className={`p-4 rounded-lg border ${
            importResult.success 
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {importResult.success ? "Importação Concluída" : "Erro na Importação"}
              </span>
            </div>
            
            <p className="text-sm mb-2">{importResult.message}</p>
            
            {importResult.success && importResult.summary && (
              <div className="bg-white dark:bg-gray-900 p-3 rounded border text-sm">
                <h5 className="font-medium mb-2">Resumo da Importação:</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>Imóveis: <strong>{importResult.summary.properties}</strong></div>
                  <div>Receitas: <strong>{importResult.summary.revenues}</strong></div>
                  <div>Despesas: <strong>{importResult.summary.expenses}</strong></div>
                  <div>Registros: <strong>{importResult.importedCount}</strong></div>
                </div>
                {importResult.summary.years.length > 0 && (
                  <div className="mt-2">
                    Anos processados: <strong>{importResult.summary.years.join(', ')}</strong>
                  </div>
                )}
              </div>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900 rounded text-sm">
                <h5 className="font-medium mb-1">Avisos:</h5>
                <ul className="text-xs space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={() => {
                setImportResult(null);
                setFile(null);
              }}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Fazer Nova Importação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}