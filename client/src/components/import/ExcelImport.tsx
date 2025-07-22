import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

export default function ExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('excel', file);
      
      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
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
          title: "Importação concluída",
          description: `${result.importedCount} registros importados com sucesso`,
        });
        // Invalidar cache para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
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
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Dados do Excel
        </CardTitle>
        <CardDescription>
          Carregue sua planilha Excel (.xlsx) com dados de imóveis e transações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="excel-file">Arquivo Excel (.xlsx)</Label>
          <Input
            id="excel-file"
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

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Formato esperado da planilha:</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><strong>Aba "Imoveis":</strong> nome, endereco, tipo, status, valor_aluguel, moeda</p>
            <p><strong>Aba "Transacoes":</strong> imovel_nome, tipo, categoria, descricao, valor, data, moeda</p>
          </div>
        </div>

        {importMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Processando arquivo...</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
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
                {importResult.success ? "Sucesso" : "Erro"}
              </span>
            </div>
            <p className="text-sm">{importResult.message}</p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Erros encontrados:</p>
                <ul className="text-sm list-disc list-inside mt-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleImport}
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
      </CardContent>
    </Card>
  );
}