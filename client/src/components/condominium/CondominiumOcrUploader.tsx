import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileImage, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Save,
  Edit2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CondominiumBillData {
  propertyName: string;
  propertyUnit: string;
  competencyMonth: string;
  items: {
    name: string;
    amount: number;
  }[];
  dueDate: string;
  totalAmount: number;
  interestAmount?: number;
  finalAmount?: number;
  lawyerFee?: number;
}

interface OcrResult {
  success: boolean;
  data?: CondominiumBillData;
  error?: string;
  rawText?: string;
}

interface Props {
  onSuccess?: (data: CondominiumBillData) => void;
  onCancel?: () => void;
}

export default function CondominiumOcrUploader({ onSuccess, onCancel }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [editableData, setEditableData] = useState<CondominiumBillData | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Process OCR
  const processMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/condominium/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar imagem');
      }
      
      return response.json();
    },
    onSuccess: (result: OcrResult) => {
      setOcrResult(result);
      if (result.success && result.data) {
        setEditableData({ ...result.data });
        toast({
          title: "OCR Concluído",
          description: `Dados extraídos para ${result.data.propertyName || 'propriedade'}`,
        });
      } else {
        toast({
          title: "Erro no OCR",
          description: result.error || "Não foi possível extrair os dados",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Save data
  const saveMutation = useMutation({
    mutationFn: async (data: CondominiumBillData) => {
      // Create expense transaction
      const transactionData = {
        type: 'expense' as const,
        category: 'condominium' as const,
        description: `Condomínio - ${data.competencyMonth}`,
        amount: data.totalAmount.toString(),
        date: convertDateToISO(data.dueDate),
        supplier: 'Administradora Condomínio',
        notes: `Competência: ${data.competencyMonth}\nItens:\n${data.items.map(item => `- ${item.name}: R$ ${item.amount.toFixed(2)}`).join('\n')}`,
        isComposite: true,
        propertyName: data.propertyName
      };

      return apiRequest('/api/expenses/distributed', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Despesa de condomínio salva com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      onSuccess?.(editableData!);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsProcessing(true);
      setOcrResult(null);
      setEditableData(null);
      processMutation.mutate(file);
    }
  }, [processMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const convertDateToISO = (dateStr: string): string => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const updateItemAmount = (index: number, newAmount: string) => {
    if (!editableData) return;
    
    const amount = parseFloat(newAmount) || 0;
    const newItems = [...editableData.items];
    newItems[index].amount = amount;
    
    const newTotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    
    setEditableData({
      ...editableData,
      items: newItems,
      totalAmount: newTotal
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Upload de Boleto de Condomínio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
              `}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p>Processando OCR...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p>Arraste uma imagem do boleto ou clique para selecionar</p>
                  <p className="text-sm text-gray-500">JPG, PNG, WEBP até 10MB</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ocrResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado do OCR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ocrResult.success && editableData ? (
              <div className="space-y-4">
                {/* Property Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyName">Propriedade</Label>
                    <Input
                      id="propertyName"
                      value={editableData.propertyName}
                      onChange={(e) => setEditableData({
                        ...editableData,
                        propertyName: e.target.value
                      })}
                      data-testid="input-property-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="competencyMonth">Competência</Label>
                    <Input
                      id="competencyMonth"
                      value={editableData.competencyMonth}
                      onChange={(e) => setEditableData({
                        ...editableData,
                        competencyMonth: e.target.value
                      })}
                      data-testid="input-competency-month"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    value={editableData.dueDate}
                    onChange={(e) => setEditableData({
                      ...editableData,
                      dueDate: e.target.value
                    })}
                    data-testid="input-due-date"
                  />
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <Label>Itens do Condomínio</Label>
                  <div className="space-y-2 mt-2">
                    {editableData.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...editableData.items];
                            newItems[index].name = e.target.value;
                            setEditableData({ ...editableData, items: newItems });
                          }}
                          className="flex-1"
                          data-testid={`input-item-name-${index}`}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateItemAmount(index, e.target.value)}
                          className="w-32"
                          data-testid={`input-item-amount-${index}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = editableData.items.filter((_, i) => i !== index);
                            setEditableData({ ...editableData, items: newItems });
                          }}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Total: {formatCurrency(editableData.totalAmount)}
                  </Badge>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveMutation.mutate(editableData)}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-condominium"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Despesa
                  </Button>
                  
                  <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
                    Cancelar
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowRawText(!showRawText)}
                    data-testid="button-toggle-raw-text"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showRawText ? 'Ocultar' : 'Ver'} Texto OCR
                  </Button>
                </div>

                {/* Raw text */}
                {showRawText && ocrResult.rawText && (
                  <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap">{ocrResult.rawText}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Falha no processamento OCR</p>
                <p className="text-gray-600">{ocrResult.error}</p>
                
                {ocrResult.rawText && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowRawText(!showRawText)}
                      data-testid="button-toggle-raw-text-error"
                    >
                      {showRawText ? 'Ocultar' : 'Ver'} Texto Extraído
                    </Button>
                    
                    {showRawText && (
                      <div className="mt-2 p-4 bg-gray-50 rounded text-sm text-left">
                        <pre className="whitespace-pre-wrap">{ocrResult.rawText}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}