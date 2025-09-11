import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Save, 
  Calculator, 
  TrendingUp, 
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TaxSetting {
  id: string;
  name: string;
  type: string;
  rate: number;
  baseCalculation: 'revenue' | 'presumed_profit';
  presumedProfitRate?: number;
  frequency: 'monthly' | 'quarterly';
  dueDay: number;
  minimumForInstallment: number;
  installmentInterest: number;
  effectiveDate: string;
  isActive: boolean;
}

interface TaxPreviewItem {
  name: string;
  amount: number;
  dueDate: string;
}

export default function TaxSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado local
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TaxSetting>>({});
  const [newTaxDialogOpen, setNewTaxDialogOpen] = useState(false);
  const [previewRevenue, setPreviewRevenue] = useState('50000');
  const [futureChanges, setFutureChanges] = useState<TaxSetting[]>([]);
  
  // Dados padrão de impostos (será substituído pela API)
  const defaultTaxes: TaxSetting[] = [
    {
      id: '1',
      name: 'PIS',
      type: 'pis',
      rate: 0.65,
      baseCalculation: 'revenue',
      frequency: 'monthly',
      dueDay: 25,
      minimumForInstallment: 100,
      installmentInterest: 1.5,
      effectiveDate: '2024-01-01',
      isActive: true,
    },
    {
      id: '2',
      name: 'COFINS',
      type: 'cofins',
      rate: 3,
      baseCalculation: 'revenue',
      frequency: 'monthly',
      dueDay: 25,
      minimumForInstallment: 100,
      installmentInterest: 1.5,
      effectiveDate: '2024-01-01',
      isActive: true,
    },
    {
      id: '3',
      name: 'IRPJ',
      type: 'irpj',
      rate: 15,
      baseCalculation: 'presumed_profit',
      presumedProfitRate: 32,
      frequency: 'quarterly',
      dueDay: 31,
      minimumForInstallment: 1000,
      installmentInterest: 1.5,
      effectiveDate: '2024-01-01',
      isActive: true,
    },
    {
      id: '4',
      name: 'CSLL',
      type: 'csll',
      rate: 9,
      baseCalculation: 'presumed_profit',
      presumedProfitRate: 32,
      frequency: 'quarterly',
      dueDay: 31,
      minimumForInstallment: 1000,
      installmentInterest: 1.5,
      effectiveDate: '2024-01-01',
      isActive: true,
    },
  ];

  // Query para buscar configurações de impostos
  const { data: taxSettings = defaultTaxes, isLoading } = useQuery({
    queryKey: ['/api/taxes/settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/taxes/settings', 'GET');
        return response || defaultTaxes;
      } catch {
        return defaultTaxes;
      }
    },
  });

  // Mutation para salvar configurações
  const saveTaxMutation = useMutation({
    mutationFn: async (tax: TaxSetting) => {
      return apiRequest(`/api/taxes/settings/${tax.type}`, 'PUT', tax);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/settings'] });
      toast({
        title: 'Sucesso',
        description: 'Configuração de imposto salva',
      });
      setEditingTax(null);
      setEditForm({});
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar configuração',
        variant: 'destructive',
      });
    },
  });

  // Mutation para criar novo imposto
  const createTaxMutation = useMutation({
    mutationFn: async (tax: Partial<TaxSetting>) => {
      return apiRequest('/api/taxes/settings', 'POST', tax);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/settings'] });
      toast({
        title: 'Sucesso',
        description: 'Novo imposto criado',
      });
      setNewTaxDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar imposto',
        variant: 'destructive',
      });
    },
  });

  // Mutation para deletar imposto
  const deleteTaxMutation = useMutation({
    mutationFn: async (taxId: string) => {
      return apiRequest(`/api/taxes/settings/${taxId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/taxes/settings'] });
      toast({
        title: 'Sucesso',
        description: 'Imposto removido',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover imposto',
        variant: 'destructive',
      });
    },
  });

  // Calcular preview de impostos
  const calculateTaxPreview = (): TaxPreviewItem[] => {
    const revenue = parseFloat(previewRevenue.replace(/\D/g, '')) / 100;
    const preview: TaxPreviewItem[] = [];
    const currentDate = new Date();
    
    taxSettings.forEach((tax) => {
      if (!tax.isActive) return;
      
      let taxAmount = 0;
      let baseAmount = revenue;
      
      if (tax.baseCalculation === 'presumed_profit' && tax.presumedProfitRate) {
        baseAmount = revenue * (tax.presumedProfitRate / 100);
      }
      
      taxAmount = baseAmount * (tax.rate / 100);
      
      // Calcular data de vencimento
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, tax.dueDay);
      
      preview.push({
        name: tax.name,
        amount: taxAmount,
        dueDate: format(dueDate, 'dd/MM/yyyy'),
      });
    });
    
    return preview;
  };

  // Formatar valor monetário
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Formatar input de valor
  const handleMoneyInput = (value: string): string => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formattedValue;
  };

  // Iniciar edição
  const startEdit = (tax: TaxSetting) => {
    setEditingTax(tax.id);
    setEditForm(tax);
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingTax(null);
    setEditForm({});
  };

  // Salvar edição
  const saveEdit = () => {
    if (editForm && editingTax) {
      saveTaxMutation.mutate(editForm as TaxSetting);
    }
  };

  // Toggle ativo/inativo
  const toggleActive = (tax: TaxSetting) => {
    saveTaxMutation.mutate({
      ...tax,
      isActive: !tax.isActive,
    });
  };

  const preview = calculateTaxPreview();
  const totalTaxes = preview.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuração de Impostos</h1>
        <p className="text-muted-foreground">
          Gerencie as alíquotas e configurações dos impostos
        </p>
      </div>

      {/* Impostos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Impostos Configurados
            </span>
            <Dialog open={newTaxDialogOpen} onOpenChange={setNewTaxDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Imposto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Imposto</DialogTitle>
                  <DialogDescription>
                    Configure um novo tipo de imposto para o sistema
                  </DialogDescription>
                </DialogHeader>
                <NewTaxForm 
                  onSubmit={(data) => createTaxMutation.mutate(data)}
                  onCancel={() => setNewTaxDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Configure as alíquotas e parâmetros de cada imposto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imposto</TableHead>
                  <TableHead>Alíquota</TableHead>
                  <TableHead>Base de Cálculo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxSettings.map((tax) => (
                  <TableRow key={tax.id}>
                    {editingTax === tax.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.rate || ''}
                            onChange={(e) => setEditForm({ ...editForm, rate: parseFloat(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editForm.baseCalculation}
                            onValueChange={(value: 'revenue' | 'presumed_profit') => 
                              setEditForm({ ...editForm, baseCalculation: value })
                            }
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="revenue">Faturamento</SelectItem>
                              <SelectItem value="presumed_profit">Lucro Presumido</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={editForm.dueDay || ''}
                            onChange={(e) => setEditForm({ ...editForm, dueDay: parseInt(e.target.value) })}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editForm.effectiveDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, effectiveDate: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editForm.isActive}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEdit}
                              disabled={saveTaxMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{tax.name}</TableCell>
                        <TableCell>{tax.rate}%</TableCell>
                        <TableCell>
                          {tax.baseCalculation === 'revenue' ? 'Faturamento' : 
                           `${tax.presumedProfitRate}% do Faturamento`}
                        </TableCell>
                        <TableCell>Dia {tax.dueDay}</TableCell>
                        <TableCell>
                          {format(new Date(tax.effectiveDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tax.isActive ? 'default' : 'secondary'}>
                            {tax.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(tax)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleActive(tax)}
                            >
                              <Switch className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTaxMutation.mutate(tax.id)}
                              disabled={deleteTaxMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview de Cálculo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Preview de Cálculo
          </CardTitle>
          <CardDescription>
            Veja como os impostos serão calculados com base no faturamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Faturamento Exemplo</Label>
            <Input
              placeholder="0,00"
              value={previewRevenue}
              onChange={(e) => setPreviewRevenue(handleMoneyInput(e.target.value))}
              className="max-w-xs"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Impostos Calculados:</h4>
            <div className="space-y-2">
              {preview.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      (venc. {item.dueDate})
                    </span>
                  </div>
                  <span className="font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 font-bold">
              <span>Total Mensal</span>
              <span className="font-mono text-lg">{formatCurrency(totalTaxes)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mudanças Futuras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mudanças Futuras Agendadas
          </CardTitle>
          <CardDescription>
            Alterações de alíquotas programadas para entrar em vigor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {futureChanges.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imposto</TableHead>
                    <TableHead>Nova Alíquota</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {futureChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium">{change.name}</TableCell>
                      <TableCell>{change.rate}%</TableCell>
                      <TableCell>
                        {format(new Date(change.effectiveDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFutureChanges(futureChanges.filter(c => c.id !== change.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma mudança futura agendada
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Use as datas de vigência ao editar impostos para agendar mudanças
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nota sobre Reforma Tributária */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Reforma Tributária 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A partir de 01/01/2026, PIS e COFINS serão substituídos pela CBS (Contribuição sobre Bens e Serviços) 
            com alíquota prevista de 8%. Configure a mudança com antecedência usando a data de vigência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de formulário para novo imposto
function NewTaxForm({ onSubmit, onCancel }: { 
  onSubmit: (data: Partial<TaxSetting>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<TaxSetting>>({
    name: '',
    type: '',
    rate: 0,
    baseCalculation: 'revenue',
    frequency: 'monthly',
    dueDay: 25,
    minimumForInstallment: 100,
    installmentInterest: 1.5,
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Imposto</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo/Código</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rate">Alíquota (%)</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseCalculation">Base de Cálculo</Label>
          <Select
            value={formData.baseCalculation}
            onValueChange={(value: 'revenue' | 'presumed_profit') => 
              setFormData({ ...formData, baseCalculation: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Faturamento</SelectItem>
              <SelectItem value="presumed_profit">Lucro Presumido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.baseCalculation === 'presumed_profit' && (
        <div className="space-y-2">
          <Label htmlFor="presumedProfitRate">Taxa de Lucro Presumido (%)</Label>
          <Input
            id="presumedProfitRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.presumedProfitRate || 32}
            onChange={(e) => setFormData({ ...formData, presumedProfitRate: parseFloat(e.target.value) })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequência</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value: 'monthly' | 'quarterly') => 
              setFormData({ ...formData, frequency: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDay">Dia de Vencimento</Label>
          <Input
            id="dueDay"
            type="number"
            min="1"
            max="31"
            value={formData.dueDay}
            onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minimumForInstallment">Valor Mínimo para Parcelamento</Label>
          <Input
            id="minimumForInstallment"
            type="number"
            step="0.01"
            min="0"
            value={formData.minimumForInstallment}
            onChange={(e) => setFormData({ ...formData, minimumForInstallment: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="installmentInterest">Juros do Parcelamento (%)</Label>
          <Input
            id="installmentInterest"
            type="number"
            step="0.01"
            min="0"
            value={formData.installmentInterest}
            onChange={(e) => setFormData({ ...formData, installmentInterest: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="effectiveDate">Data de Vigência</Label>
        <Input
          id="effectiveDate"
          type="date"
          value={formData.effectiveDate}
          onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Ativar imposto imediatamente</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Criar Imposto
        </Button>
      </DialogFooter>
    </form>
  );
}