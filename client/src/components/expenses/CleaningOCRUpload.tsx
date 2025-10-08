import { useState } from 'react';
import { Upload, FileImage, Loader2, CheckCircle, XCircle, Calendar, Building2, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getOCRService } from '@/lib/ocr';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Property {
  id: number;
  name: string;
}

interface ExtractedCleaning {
  date: string;
  unit: string;
  value: number;
  propertyId: number | null;
  propertyName: string;
  matched: boolean;
}

interface OCRResult {
  text: string;
  entries: ExtractedCleaning[];
  period: { start: string; end: string };
  total: number;
  errors: string[];
  unmatchedCount: number;
}

// Mapeamento expandido: DE/PARA com 100+ variações de unidades
// IMPORTANTE: Todas as chaves estão PRÉ-NORMALIZADAS (uppercase, sem acentos, sem caracteres especiais)
// Formato: 'VARIACAO_NORMALIZADA': 'Nome Oficial da Propriedade'
const UNIT_MAPPING: Record<string, string> = {
  // MaxHaus 43R - variações de escrita e OCR (15 aliases)
  'MAXHAUS': 'MaxHaus 43R',
  'MAX HAUS': 'MaxHaus 43R',
  'MAXHOUS': 'MaxHaus 43R',
  'MAX HOUS': 'MaxHaus 43R',
  'MAXHOUSS': 'MaxHaus 43R',
  'MAXHAUS 43R': 'MaxHaus 43R',
  'MAXHAUS 43': 'MaxHaus 43R',
  'MAXHAUS43R': 'MaxHaus 43R',
  'MAXHAUS43': 'MaxHaus 43R',
  'MAX HAUS 43R': 'MaxHaus 43R',
  'MAX HAUS 43': 'MaxHaus 43R',
  'MAX HAUS 43 R': 'MaxHaus 43R',
  '43R': 'MaxHaus 43R',
  '43 R': 'MaxHaus 43R',
  'MAXHAUS43 R': 'MaxHaus 43R',
  
  // Sevilha G07 - variações G07 e OCR (16 aliases)
  'SEVILHA G07': 'Sevilha G07',
  'SEVILHAG07': 'Sevilha G07',
  'SEVILHA G 07': 'Sevilha G07',
  'SEVILHA G 0 7': 'Sevilha G07',
  'G07': 'Sevilha G07',
  'G 07': 'Sevilha G07',
  'G 0 7': 'Sevilha G07',
  'TORRE G 07': 'Sevilha G07',
  'TORRE G07': 'Sevilha G07',
  'SEVILHA TORRE G07': 'Sevilha G07',
  'SEV G07': 'Sevilha G07',
  'SEVG07': 'Sevilha G07',
  'SEVILHA G': 'Sevilha G07',
  'SEVILHAG': 'Sevilha G07',
  'SEV G 07': 'Sevilha G07',
  'SEVILHA TG07': 'Sevilha G07',
  
  // Sevilha 307 - variações 307 e torre (15 aliases)
  'SEVILHA 307': 'Sevilha 307',
  'SEVILHA307': 'Sevilha 307',
  'SEVILHA 3 07': 'Sevilha 307',
  'SEVILHA 3 0 7': 'Sevilha 307',
  '307': 'Sevilha 307',
  '3 07': 'Sevilha 307',
  '3 0 7': 'Sevilha 307',
  'TORRE 6 307': 'Sevilha 307',
  'TORRE 6307': 'Sevilha 307',
  '6 000307': 'Sevilha 307',
  '6000307': 'Sevilha 307',
  'SEVILHA TORRE 307': 'Sevilha 307',
  'SEV 307': 'Sevilha 307',
  'SEV307': 'Sevilha 307',
  'TORRE6 307': 'Sevilha 307',
  
  // Next Haddock Lobo - erros comuns OCR (20 aliases)
  'HADDOCK LOBO': 'Next Haddock Lobo',
  'HADDOCK': 'Next Haddock Lobo',
  'HADDOK LOBO': 'Next Haddock Lobo',
  'HADOCK LOBO': 'Next Haddock Lobo',
  'HADOK LOBO': 'Next Haddock Lobo',
  'HADDOCKLOBO': 'Next Haddock Lobo',
  'HADDOKLOBO': 'Next Haddock Lobo',
  'HADOCKLOBO': 'Next Haddock Lobo',
  'HADOKLOBO': 'Next Haddock Lobo',
  'NEXT HADDOCK': 'Next Haddock Lobo',
  'NEXT HADDOCK LOBO': 'Next Haddock Lobo',
  'NEXT HADDOK': 'Next Haddock Lobo',
  'NEXT HADOCK': 'Next Haddock Lobo',
  'NEXT HADOK': 'Next Haddock Lobo',
  'HADDOK': 'Next Haddock Lobo',
  'HADOCK': 'Next Haddock Lobo',
  'HADOK': 'Next Haddock Lobo',
  'HADDOC LOBO': 'Next Haddock Lobo',
  'HADOC LOBO': 'Next Haddock Lobo',
  'NEXTHADDOCK': 'Next Haddock Lobo',
  
  // Málaga M07 - com/sem acento normalizado (15 aliases)
  'MALAGA M07': 'Málaga M07',
  'MALAGAM07': 'Málaga M07',
  'MALAGAM 07': 'Málaga M07',
  'MALAGA M 07': 'Málaga M07',
  'MALAGA M 0 7': 'Málaga M07',
  'MALAGA': 'Málaga M07',
  'M07': 'Málaga M07',
  'M 07': 'Málaga M07',
  'M 0 7': 'Málaga M07',
  'MALAGA M': 'Málaga M07',
  'MALAGAM': 'Málaga M07',
  'MAL M07': 'Málaga M07',
  'MAL M 07': 'Málaga M07',
  'MALM07': 'Málaga M07',
  'MALA M07': 'Málaga M07',
  
  // Thera by Yoo - variações (16 aliases)
  'THERA': 'Thera by Yoo',
  'THERA BY YOO': 'Thera by Yoo',
  'THERA BY': 'Thera by Yoo',
  'THERA YOO': 'Thera by Yoo',
  'THERABYYOO': 'Thera by Yoo',
  'THERABY': 'Thera by Yoo',
  'THERAYOO': 'Thera by Yoo',
  'THERA B YOO': 'Thera by Yoo',
  'THERA B Y': 'Thera by Yoo',
  'THERABY YOO': 'Thera by Yoo',
  'THER A': 'Thera by Yoo',
  'THERA Y00': 'Thera by Yoo',
  'THERA BY Y00': 'Thera by Yoo',
  'THERA YO': 'Thera by Yoo',
  'THE RA': 'Thera by Yoo',
  'THERA B': 'Thera by Yoo',
  
  // Living Full Faria Lima - variações (15 aliases)
  'LIVING': 'Living Full Faria Lima',
  'LIVING FULL': 'Living Full Faria Lima',
  'LIVING FULL FARIA LIMA': 'Living Full Faria Lima',
  'LIVINGFULL': 'Living Full Faria Lima',
  'LIVING FARIA LIMA': 'Living Full Faria Lima',
  'LIVING FL': 'Living Full Faria Lima',
  'LIVING FARIALIMA': 'Living Full Faria Lima',
  'FARIA LIMA': 'Living Full Faria Lima',
  'FARIALIMA': 'Living Full Faria Lima',
  'LIVING F LIMA': 'Living Full Faria Lima',
  'LIVING FULL FL': 'Living Full Faria Lima',
  'LIV FULL': 'Living Full Faria Lima',
  'LIV FARIA LIMA': 'Living Full Faria Lima',
  'LIVINGFL': 'Living Full Faria Lima',
  'FL': 'Living Full Faria Lima',
  
  // Casa Ibirapuera - variações (16 aliases)
  'CASA IBIRAPUERA': 'Casa Ibirapuera',
  'CASAIBIRAPUERA': 'Casa Ibirapuera',
  'IBIRAPUERA': 'Casa Ibirapuera',
  'CASA IBR': 'Casa Ibirapuera',
  'CASAIBR': 'Casa Ibirapuera',
  'IBR': 'Casa Ibirapuera',
  'CASA IBIRAP': 'Casa Ibirapuera',
  'CASAIBIRAP': 'Casa Ibirapuera',
  'IBIRAP': 'Casa Ibirapuera',
  'C IBIRAPUERA': 'Casa Ibirapuera',
  'CIBIRAPUERA': 'Casa Ibirapuera',
  'CASA I': 'Casa Ibirapuera',
  'CASA IBIR': 'Casa Ibirapuera',
  'IBIRAP CASA': 'Casa Ibirapuera',
  'CASA IBIRA': 'Casa Ibirapuera',
  'IBIRA': 'Casa Ibirapuera',
  
  // Salas Brasal - variações (16 aliases)
  'SALAS BRASAL': 'Salas Brasal',
  'SALASBRASAL': 'Salas Brasal',
  'SALA BRASAL': 'Salas Brasal',
  'SALABRASAL': 'Salas Brasal',
  'BRASAL': 'Salas Brasal',
  'SALAS BR': 'Salas Brasal',
  'SALASBR': 'Salas Brasal',
  'S BRASAL': 'Salas Brasal',
  'SBRASAL': 'Salas Brasal',
  'BRASAL SALAS': 'Salas Brasal',
  'SALA BR': 'Salas Brasal',
  'SALABR': 'Salas Brasal',
  'BRASAL S': 'Salas Brasal',
  'BRASALS': 'Salas Brasal',
  'SALAS BRASIL': 'Salas Brasal',
  'BRASSAL': 'Salas Brasal',
  
  // Sesimbra Portugal - variações (16 aliases)
  'SESIMBRA': 'Sesimbra ap 505- Portugal',
  'SESIMBRA 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA AP 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA PORTUGAL': 'Sesimbra ap 505- Portugal',
  'SESIMBRA PT': 'Sesimbra ap 505- Portugal',
  '505': 'Sesimbra ap 505- Portugal',
  'AP 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA A 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA P': 'Sesimbra ap 505- Portugal',
  'SESIMBRA 5 05': 'Sesimbra ap 505- Portugal',
  'SESIMBRA5': 'Sesimbra ap 505- Portugal',
  'SESIMBRA AP505': 'Sesimbra ap 505- Portugal',
  'SES 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA 50 5': 'Sesimbra ap 505- Portugal',
  'SESIMBRA APT 505': 'Sesimbra ap 505- Portugal',
  'SESIMBRA APT': 'Sesimbra ap 505- Portugal',
};

function normalizeString(str: string): string {
  return str
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnitName(unit: string): string {
  const normalized = normalizeString(unit);
  return UNIT_MAPPING[normalized] || unit;
}

function parseCleaningOCRText(text: string, properties: Property[]): OCRResult {
  const lines = text.split('\n').filter(line => line.trim());
  const entries: ExtractedCleaning[] = [];
  const errors: string[] = [];
  let total = 0;
  let period = { start: '', end: '' };
  
  // Extract period from header
  const headerLine = lines.find(line => line.includes('FECHAMENTO'));
  if (headerLine) {
    const periodMatch = headerLine.match(/(\d{2}\/\d{2}\/\d{4})\s*[ÀàA]\s*(\d{2}\/\d{2}\/\d{4})/);
    if (periodMatch) {
      period = {
        start: periodMatch[1].split('/').reverse().join('-'),
        end: periodMatch[2].split('/').reverse().join('-')
      };
    }
  }
  
  // Process each line looking for: DATE | UNIT | VALUE
  for (const line of lines) {
    // Skip headers and footers
    if (line.match(/^(DATA|UNIDADE|VALOR|TOTAL|CONTROLE|FECHAMENTO)/i)) {
      continue;
    }
    
    // Try to match: DD/MM/YYYY UNIT_NAME VALUE
    const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)$/);
    
    if (match) {
      const [, dateStr, unitStr, valueStr] = match;
      
      // Parse date
      const [day, month, year] = dateStr.split('/');
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Parse value
      const value = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
      
      // Normalize unit name
      const normalizedUnit = normalizeUnitName(unitStr.trim());
      
      // Find matching property (normalizar ambos os lados)
      const property = properties.find(p => 
        normalizeString(p.name) === normalizeString(normalizedUnit) ||
        p.name === normalizedUnit
      );
      
      entries.push({
        date,
        unit: unitStr.trim(),
        value,
        propertyId: property?.id || null,
        propertyName: normalizedUnit,
        matched: !!property
      });
      
      total += value;
      
      if (!property) {
        errors.push(`Propriedade não encontrada: ${unitStr} (normalizada: ${normalizedUnit})`);
      }
    }
  }
  
  return {
    text,
    entries,
    period,
    total,
    errors,
    unmatchedCount: entries.filter(e => !e.matched).length
  };
}

export default function CleaningOCRUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('Sr. Fábio');
  const { toast } = useToast();
  
  // Fetch properties
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });
  
  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/cleaning/batches', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batches'] });
      toast({
        title: 'Sucesso!',
        description: 'Lote de limpeza criado com sucesso',
      });
      setFile(null);
      setOcrResult(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar lote',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file type - apenas imagens (JPG/PNG)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: 'Arquivo inválido',
          description: 'Use apenas JPG ou PNG (screenshots)',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
      setOcrResult(null);
    }
  };
  
  const processImage = async () => {
    if (!file) return;
    
    // Aguardar propriedades carregarem
    if (isLoadingProperties) {
      toast({
        title: 'Aguarde',
        description: 'Carregando propriedades...',
      });
      return;
    }
    
    setProcessing(true);
    
    try {
      const ocrService = getOCRService();
      
      // Initialize OCR
      await ocrService.initialize();
      
      // Process image
      const text = await ocrService.processImage(file);
      
      // Parse cleaning data
      const result = parseCleaningOCRText(text, properties);
      
      setOcrResult(result);
      
      if (result.entries.length === 0) {
        toast({
          title: 'Nenhuma despesa encontrada',
          description: 'Não foi possível extrair dados de limpeza da imagem',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'OCR concluído!',
          description: `${result.entries.length} despesas identificadas`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro no OCR',
        description: error.message || 'Erro ao processar imagem',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };
  
  const confirmAndCreate = async () => {
    if (!ocrResult) return;
    
    // Validações
    if (!paymentDate) {
      toast({
        title: 'Data de pagamento obrigatória',
        description: 'Selecione a data de pagamento do lote',
        variant: 'destructive',
      });
      return;
    }
    
    if (!supplier || supplier.trim() === '') {
      toast({
        title: 'Fornecedor obrigatório',
        description: 'Informe o nome do prestador de serviço',
        variant: 'destructive',
      });
      return;
    }
    
    const matchedEntries = ocrResult.entries.filter(e => e.matched && e.propertyId);
    
    if (matchedEntries.length === 0) {
      toast({
        title: 'Nenhuma propriedade reconhecida',
        description: 'Não há despesas com propriedades válidas para criar',
        variant: 'destructive',
      });
      return;
    }
    
    // Calcular total apenas das entradas matched
    const matchedTotal = matchedEntries.reduce((sum, e) => sum + e.value, 0);
    
    // Prepare batch data with user-selected payment date
    const batchData = {
      paymentDate: paymentDate, // Data escolhida pelo usuário (para fluxo de caixa)
      totalAmount: matchedTotal, // Total apenas das entradas reconhecidas
      description: `Lote de limpeza - ${supplier}`,
      propertyCleanings: matchedEntries.map(e => ({
        propertyId: e.propertyId,
        amount: e.value,
        executionDate: e.date // Data da tabela (para gestão gerencial)
      }))
    };
    
    createBatchMutation.mutate(batchData);
  };
  
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📸 Upload de Imagem OCR</h3>
            <p className="text-sm text-gray-600">
              Faça upload de um screenshot (JPG/PNG) da tabela de fechamento de limpeza
            </p>
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                data-testid="input-ocr-file"
              />
            </div>
            
            <Button
              onClick={processImage}
              disabled={!file || processing || isLoadingProperties}
              data-testid="button-process-ocr"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileImage className="mr-2 h-4 w-4" />
                  Processar
                </>
              )}
            </Button>
          </div>
          
          {file && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                Arquivo selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
      
      {/* Payment Configuration */}
      {ocrResult && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold mb-4">💰 Configuração de Pagamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-date">Data de Pagamento (Fluxo de Caixa)</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                data-testid="input-payment-date"
              />
              <p className="text-xs text-gray-600 mt-1">
                Esta data será usada no fluxo de caixa
              </p>
            </div>
            
            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nome do prestador de serviço"
                data-testid="input-supplier"
              />
              <p className="text-xs text-gray-600 mt-1">
                Nome do responsável pelas limpezas
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Results Section */}
      {ocrResult && (
        <>
          {/* Summary */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📊 Resultado do OCR</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Período</p>
                    <p className="font-semibold">
                      {ocrResult.period.start || 'N/A'} a {ocrResult.period.end || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Despesas encontradas</p>
                    <p className="font-semibold">{ocrResult.entries.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(ocrResult.total)}
                    </p>
                  </div>
                </div>
              </div>
              
              {ocrResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">Avisos ({ocrResult.unmatchedCount}):</p>
                      {ocrResult.errors.slice(0, 3).map((error, i) => (
                        <p key={i} className="text-sm">• {error}</p>
                      ))}
                      {ocrResult.errors.length > 3 && (
                        <p className="text-sm">... e mais {ocrResult.errors.length - 3}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
          
          {/* Entries Table */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📋 Despesas Identificadas</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data Execução</th>
                      <th className="text-left p-2">Unidade (OCR)</th>
                      <th className="text-left p-2">Propriedade</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocrResult.entries.map((entry, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 font-mono text-sm">{entry.unit}</td>
                        <td className="p-2">
                          {entry.matched ? (
                            <span className="text-green-700">{entry.propertyName}</span>
                          ) : (
                            <span className="text-red-600">{entry.propertyName}</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(entry.value)}
                        </td>
                        <td className="p-2 text-center">
                          {entry.matched ? (
                            <CheckCircle className="h-4 w-4 text-green-600 inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="p-2">TOTAL</td>
                      <td className="p-2 text-right">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(ocrResult.total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOcrResult(null);
                    setFile(null);
                  }}
                  data-testid="button-cancel-ocr"
                >
                  Cancelar
                </Button>
                
                <Button
                  onClick={confirmAndCreate}
                  disabled={
                    ocrResult.entries.filter(e => e.matched).length === 0 ||
                    createBatchMutation.isPending
                  }
                  data-testid="button-confirm-ocr"
                >
                  {createBatchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar e Criar ({ocrResult.entries.filter(e => e.matched).length} despesas)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
