import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, FileText, Upload, Download, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

interface TaxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxImportDialog({ open, onOpenChange }: TaxImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'excel' | 'csv'>('excel');
  const [importResult, setImportResult] = useState<any>(null);

  // Excel import mutation
  const excelImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/taxes/import/excel', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Falha ao importar arquivo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        toast({
          title: 'Importação concluída!',
          description: `${data.imported} impostos importados com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/taxes/import/csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Falha ao importar arquivo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        toast({
          title: 'Importação concluída!',
          description: `${data.imported} impostos importados com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls') {
        setImportType('excel');
      } else if (extension === 'csv') {
        setImportType('csv');
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    
    if (importType === 'excel') {
      excelImportMutation.mutate(selectedFile);
    } else {
      csvImportMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const downloadTemplate = (type: 'excel' | 'csv') => {
    const headers = ['Tipo', 'Competencia', 'Valor', 'Data Pagamento', 'Imovel'];
    
    if (type === 'excel') {
      // Create Excel template
      const ws = [
        headers,
        ['PIS', '07/2025', '1234.56', '25/08/2025', 'Sevilha 307'],
        ['COFINS', '07/2025', '5678.90', '25/08/2025', 'Málaga M07'],
      ];
      
      const csvContent = ws.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_impostos.csv';
      a.click();
    } else {
      // Create CSV template
      const csvContent = [
        headers.join(','),
        'PIS,07/2025,1234.56,25/08/2025,Sevilha 307',
        'COFINS,07/2025,5678.90,25/08/2025,Málaga M07',
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_impostos.csv';
      a.click();
    }
  };

  const isLoading = excelImportMutation.isPending || csvImportMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Impostos</DialogTitle>
          <DialogDescription>
            Importe dados de impostos a partir de arquivos Excel ou CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importType} onValueChange={(v: any) => setImportType(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Formato Excel</CardTitle>
                <CardDescription>
                  Arquivo .xlsx ou .xls com colunas: Tipo, Competência, Valor, Data Pagamento, Imóvel (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('excel')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar Template
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Formato CSV</CardTitle>
                <CardDescription>
                  Arquivo .csv com colunas: Tipo, Competência, Valor, DataPagamento, Imóvel (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('csv')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar Template
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Selecionar Arquivo</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          {/* Import Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Tipos aceitos: PIS, COFINS, CSLL, IRPJ, IPTU</li>
                <li>Competência: formato MM/YYYY (ex: 07/2025)</li>
                <li>Valor: use ponto ou vírgula como separador decimal</li>
                <li>Data: formato DD/MM/YYYY</li>
                <li>Imóvel: nome deve corresponder aos cadastrados</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Import Result */}
          {importResult && (
            <div className="space-y-4">
              {importResult.success ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importação concluída com sucesso!</strong>
                    <ul className="list-disc list-inside mt-2">
                      <li>{importResult.imported} registros importados</li>
                      <li>Total: {importResult.summary?.totalAmountFormatted}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erros na importação:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {importResult.errors?.slice(0, 5).map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResult.errors?.length > 5 && (
                        <li>... e mais {importResult.errors.length - 5} erros</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary by type */}
              {importResult.summary?.byType && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(importResult.summary.byType).map(([type, amount]) => (
                    <Badge key={type} variant="secondary">
                      {type}: {amount as string}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>Importando...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}