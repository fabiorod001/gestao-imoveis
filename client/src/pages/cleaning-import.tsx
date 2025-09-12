import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Upload, 
  Loader2, 
  Check, 
  X, 
  AlertCircle,
  FileImage,
  DollarSign,
  Calendar,
  Home,
  Edit2,
  Save,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getOCRService, parseCleaningText, formatCurrency, normalizePropertyName } from '@/lib/ocr';
import type { Property, CleaningBatch } from '@shared/schema';

interface CleaningItem {
  propertyName: string;
  propertyId?: number;
  amount: number;
  matched: boolean;
  needsConfirmation: boolean;
}

interface PropertyMapping {
  variation: string;
  propertyId: number;
  propertyName: string;
}

export default function CleaningImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [cleanings, setCleanings] = useState<CleaningItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [hasAdvance, setHasAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number | undefined>();
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<PropertyMapping | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Fetch properties for matching
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch cleaning batches
  const { data: batches = [] } = useQuery<CleaningBatch[]>({
    queryKey: ['/api/cleaning/batches'],
  });

  // Process OCR text mutation
  const processOcrMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('/api/cleaning/ocr', {
        method: 'POST',
        body: JSON.stringify({ ocrText: text }),
      });
    },
    onSuccess: (data) => {
      setCleanings(data.cleanings);
      setTotalAmount(data.totalAmount);
      setHasAdvance(data.hasAdvance);
      setAdvanceAmount(data.advanceAmount);
      
      toast({
        title: 'Texto processado',
        description: `${data.cleanings.length} limpezas identificadas`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao processar texto',
        variant: 'destructive',
      });
    },
  });

  // Match cleanings to properties mutation
  const matchCleaningsMutation = useMutation({
    mutationFn: async (items: CleaningItem[]) => {
      return apiRequest('/api/cleaning/match', {
        method: 'POST',
        body: JSON.stringify({ cleanings: items }),
      });
    },
    onSuccess: (data) => {
      setCleanings(data.cleanings);
      
      const needsConfirmation = data.cleanings.some((c: CleaningItem) => c.needsConfirmation);
      if (needsConfirmation) {
        toast({
          title: 'Confirmação necessária',
          description: 'Alguns imóveis precisam de confirmação',
        });
      } else {
        toast({
          title: 'Correspondência concluída',
          description: 'Todos os imóveis foram identificados',
        });
      }
    },
  });

  // Learn property mapping mutation
  const learnMappingMutation = useMutation({
    mutationFn: async (mapping: PropertyMapping) => {
      return apiRequest('/api/cleaning/mapping', {
        method: 'POST',
        body: JSON.stringify({
          variation: mapping.variation,
          propertyId: mapping.propertyId,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Mapeamento salvo',
        description: 'O sistema aprendeu esta variação',
      });
    },
  });

  // Import cleaning batch mutation
  const importBatchMutation = useMutation({
    mutationFn: async () => {
      const cleaningData = cleanings.map(c => ({
        propertyId: c.propertyId!,
        propertyName: c.propertyName,
        amount: c.amount,
      }));

      return apiRequest('/api/cleaning/import', {
        method: 'POST',
        body: JSON.stringify({
          cleanings: cleaningData,
          paymentDate,
          description: description || `Limpezas - ${format(new Date(paymentDate), 'dd/MM/yyyy', { locale: ptBR })}`,
          advanceAmount: hasAdvance ? advanceAmount : undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/cash-flow'] });
      
      toast({
        title: 'Importação concluída',
        description: 'Lote de limpezas importado com sucesso',
      });

      // Reset form
      setCleanings([]);
      setOcrText('');
      setTotalAmount(0);
      setHasAdvance(false);
      setAdvanceAmount(undefined);
      setDescription('');
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao importar lote',
        variant: 'destructive',
      });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      return apiRequest(`/api/cleaning/batch/${batchId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/cash-flow'] });
      
      toast({
        title: 'Lote excluído',
        description: 'Lote de limpezas removido com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir lote',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setOcrProcessing(true);
    
    try {
      const ocrService = getOCRService();
      const text = await ocrService.processImage(file);
      setOcrText(text);

      // Parse the text
      const parsed = parseCleaningText(text);
      const items: CleaningItem[] = parsed.cleanings.map(c => ({
        ...c,
        matched: false,
        needsConfirmation: false,
      }));

      setCleanings(items);
      setTotalAmount(parsed.totalAmount);
      setHasAdvance(parsed.hasAdvance);
      setAdvanceAmount(parsed.advanceAmount);

      // Try to match properties
      if (items.length > 0) {
        matchCleaningsMutation.mutate(items);
      }

      toast({
        title: 'OCR concluído',
        description: `${items.length} limpezas extraídas`,
      });
    } catch (error) {
      console.error('OCR failed:', error);
      toast({
        title: 'Erro no OCR',
        description: 'Falha ao processar imagem',
        variant: 'destructive',
      });
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleManualMatch = (index: number, propertyId: number) => {
    const updatedCleanings = [...cleanings];
    const property = properties.find(p => p.id === propertyId);
    
    if (property) {
      updatedCleanings[index] = {
        ...updatedCleanings[index],
        propertyId,
        matched: true,
        needsConfirmation: false,
      };
      
      setCleanings(updatedCleanings);

      // Learn this mapping
      const mapping: PropertyMapping = {
        variation: normalizePropertyName(updatedCleanings[index].propertyName),
        propertyId,
        propertyName: property.name,
      };
      
      learnMappingMutation.mutate(mapping);
    }
  };

  const handleConfirmMapping = () => {
    if (currentMapping) {
      handleManualMatch(
        cleanings.findIndex(c => normalizePropertyName(c.propertyName) === currentMapping.variation),
        currentMapping.propertyId
      );
      setShowConfirmDialog(false);
      setCurrentMapping(null);
    }
  };

  const handleEditAmount = (index: number) => {
    setEditingIndex(index);
    setEditAmount(cleanings[index].amount.toString());
  };

  const handleSaveAmount = () => {
    if (editingIndex !== null) {
      const updatedCleanings = [...cleanings];
      updatedCleanings[editingIndex].amount = parseFloat(editAmount) || 0;
      setCleanings(updatedCleanings);
      
      // Recalculate total
      const newTotal = updatedCleanings.reduce((sum, c) => sum + c.amount, 0);
      setTotalAmount(newTotal);
      
      setEditingIndex(null);
      setEditAmount('');
    }
  };

  const handleImport = () => {
    // Check if all cleanings are matched
    const allMatched = cleanings.every(c => c.matched && c.propertyId);
    
    if (!allMatched) {
      toast({
        title: 'Atenção',
        description: 'Todos os imóveis devem ser identificados antes de importar',
        variant: 'destructive',
      });
      return;
    }

    importBatchMutation.mutate();
  };

  const canImport = cleanings.length > 0 && cleanings.every(c => c.matched && c.propertyId);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Importar Limpezas</h1>
        <p className="text-muted-foreground">
          Tire uma foto ou faça upload do recibo de limpeza
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Capturar Recibo</CardTitle>
          <CardDescription>
            Use a câmera do celular ou faça upload de uma imagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrProcessing}
              className="flex-1"
              data-testid="button-camera"
            >
              {ocrProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Usar Câmera
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute('capture', 'environment');
                }
              }}
              disabled={ocrProcessing}
              className="flex-1"
              data-testid="button-upload"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload Arquivo
            </Button>
          </div>

          {ocrText && (
            <Alert className="mt-4">
              <FileImage className="h-4 w-4" />
              <AlertDescription>
                Texto extraído com sucesso. Revise os dados abaixo.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cleanings Table */}
      {cleanings.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Limpezas Identificadas</CardTitle>
            <CardDescription>
              Confirme os imóveis e valores antes de importar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Texto Original</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cleanings.map((cleaning, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {cleaning.propertyName}
                      </TableCell>
                      <TableCell>
                        {cleaning.matched ? (
                          <Select
                            value={cleaning.propertyId?.toString()}
                            onValueChange={(value) => handleManualMatch(index, parseInt(value))}
                          >
                            <SelectTrigger data-testid={`select-property-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map(property => (
                                <SelectItem 
                                  key={property.id} 
                                  value={property.id.toString()}
                                >
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            onValueChange={(value) => handleManualMatch(index, parseInt(value))}
                          >
                            <SelectTrigger data-testid={`select-property-${index}`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map(property => (
                                <SelectItem 
                                  key={property.id} 
                                  value={property.id.toString()}
                                >
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingIndex === index ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-amount-${index}`}
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveAmount}
                              data-testid={`button-save-amount-${index}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {formatCurrency(cleaning.amount)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAmount(index)}
                              data-testid={`button-edit-amount-${index}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cleaning.matched ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : cleaning.needsConfirmation ? (
                          <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = cleanings.filter((_, i) => i !== index);
                            setCleanings(updated);
                            setTotalAmount(updated.reduce((sum, c) => sum + c.amount, 0));
                          }}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total das Limpezas:</span>
                <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
              </div>

              {hasAdvance && (
                <div className="flex justify-between items-center">
                  <Label htmlFor="advance">Adiantamento:</Label>
                  <Input
                    id="advance"
                    type="number"
                    value={advanceAmount || ''}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || undefined)}
                    className="w-32 text-right"
                    placeholder="0"
                    data-testid="input-advance"
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="font-semibold">Valor a Pagar:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(totalAmount - (advanceAmount || 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentDate">Data de Pagamento:</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    data-testid="input-payment-date"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição (opcional):</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Limpezas quinzenais"
                    data-testid="input-description"
                  />
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleImport}
                disabled={!canImport || importBatchMutation.isPending}
                data-testid="button-import"
              >
                {importBatchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Importar Lote
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Batches */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lotes Anteriores</CardTitle>
            <CardDescription>
              Histórico de importações de limpeza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {batch.description || `Lote #${batch.id}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="inline-block h-3 w-3 mr-1" />
                      {format(new Date(batch.paymentDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(batch.totalAmount)}</div>
                      {batch.hasAdvancePayment && (
                        <div className="text-sm text-muted-foreground">
                          Adiantamento: {formatCurrency(batch.advanceAmount || 0)}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBatchMutation.mutate(batch.id)}
                      disabled={deleteBatchMutation.isPending}
                      data-testid={`button-delete-batch-${batch.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Correspondência</DialogTitle>
            <DialogDescription>
              O sistema identificou uma possível correspondência. Por favor, confirme:
            </DialogDescription>
          </DialogHeader>
          {currentMapping && (
            <div className="space-y-4">
              <div>
                <Label>Texto Original:</Label>
                <div className="font-mono p-2 bg-muted rounded">
                  {currentMapping.variation}
                </div>
              </div>
              <div>
                <Label>Imóvel Sugerido:</Label>
                <div className="font-medium p-2 bg-muted rounded">
                  <Home className="inline-block h-4 w-4 mr-2" />
                  {currentMapping.propertyName}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setCurrentMapping(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmMapping}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}