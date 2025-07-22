import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

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

export default function HorizontalFormatImport() {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('/api/import/horizontal-format', 'POST', formData);
      
      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('Received HTML instead of JSON:', htmlText);
        throw new Error('Servidor retornou uma página de erro. Verifique se você está logado e tente novamente.');
      }
      
      return await response.json() as ImportResult;
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success) {
        toast({
          title: "Importação concluída!",
          description: `${result.importedCount} transações processadas com sucesso.`,
        });
        
        // Invalidate cache to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly'] });
      } else {
        toast({
          title: "Erro na importação",
          description: result.message || "Houve um problema durante a importação.",
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <Card className="border-2 border-primary-200 bg-primary-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary-700">
          <FileSpreadsheet className="h-5 w-5" />
          Formato Horizontal - Todas as Propriedades
        </CardTitle>
        <CardDescription>
          Importe dados de todas as propriedades com formato horizontal específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Formato da Planilha</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Estrutura horizontal:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Linha 1:</strong> Cabeçalhos das colunas</li>
              <li><strong>Linha 2+:</strong> Dados mensais (uma linha por mês)</li>
              <li><strong>Abas suportadas:</strong> Sevilha 307, Sevilha G07, Málaga M0, Maxhaus 43R, Salas Brasal, Next Haddock Lobo ap 33, Thera by You, Casa Ibirapuera torre 3 ap 1411, Living Full Faria Lima setor 1</li>
            </ul>
            
            <div className="mt-3">
              <p><strong>Colunas esperadas:</strong></p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <strong>A:</strong> Data<br/>
                  <strong>B:</strong> Receita – Aluguel<br/>
                  <strong>C:</strong> Receita - Outras receitas<br/>
                  <strong>D:</strong> Receita - Receita Total<br/>
                  <strong>E:</strong> Despesa – Impostos<br/>
                  <strong>F:</strong> Despesa - Gestão (Maurício)<br/>
                  <strong>G:</strong> Despesa – Condomínio<br/>
                  <strong>H:</strong> Taxa Condominial
                </div>
                <div>
                  <strong>I:</strong> Despesa – Luz<br/>
                  <strong>J:</strong> Despesa - Gás e Água<br/>
                  <strong>K:</strong> Despesa – Comissões<br/>
                  <strong>L:</strong> Despesa – IPTU<br/>
                  <strong>M:</strong> Despesa – Financiamento<br/>
                  <strong>N:</strong> Despesa - Conserto/Manutenção<br/>
                  <strong>O:</strong> Despesa - TV / Internet<br/>
                  <strong>P:</strong> Despesa – Limpeza
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="horizontal-file">Selecionar arquivo Excel (.xlsx)</Label>
            <Input
              id="horizontal-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
              className="mt-1"
            />
          </div>

          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Processando arquivo...</span>
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.message}
                  </p>
                  
                  {importResult.success && importResult.summary && (
                    <div className="mt-2 text-sm text-green-700">
                      <p>Resumo da importação:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>{importResult.summary.properties} propriedade(s) processada(s)</li>
                        <li>{importResult.summary.revenues} receita(s) importada(s)</li>
                        <li>{importResult.summary.expenses} despesa(s) importada(s)</li>
                        <li>Anos: {importResult.summary.years.join(', ')}</li>
                      </ul>
                    </div>
                  )}
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-amber-800">Avisos:</p>
                      <ul className="text-sm text-amber-700 list-disc list-inside ml-2">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Certifique-se de que os nomes das abas correspondam exatamente às propriedades listadas acima</p>
          <p>• As datas devem estar na coluna A em formato de data reconhecível</p>
          <p>• Valores numéricos devem usar ponto como separador decimal</p>
          <p>• Moeda será automaticamente definida como EUR</p>
          <p>• Você pode incluir quantas propriedades quiser em um único arquivo</p>
        </div>
      </CardContent>
    </Card>
  );
}