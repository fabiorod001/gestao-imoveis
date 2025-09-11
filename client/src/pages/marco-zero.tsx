import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Target, Plus, Save, Trash2, AlertCircle, CheckCircle, History, RefreshCw, TrendingUp, DollarSign, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountBalance {
  accountId: number;
  accountName: string;
  balance: string;
}

interface MarcoZero {
  id: number;
  marcoDate: string;
  accountBalances: AccountBalance[];
  totalBalance: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface ReconciliationAdjustment {
  id: number;
  adjustmentDate: string;
  amount: string;
  type: string;
  description: string;
  bankReference?: string;
  accountId?: number;
}

export default function MarcoZeroPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados
  const [marcoDate, setMarcoDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([
    { accountId: 1, accountName: 'Conta Principal', balance: '' },
    { accountId: 2, accountName: 'Conta Secundária', balance: '' },
    { accountId: 3, accountName: 'Investimentos', balance: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({
    adjustmentDate: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'bank_fee',
    description: '',
    bankReference: '',
    accountId: 1,
  });

  // Queries
  const { data: activeMarco, isLoading: loadingMarco } = useQuery({
    queryKey: ['/api/marco-zero/active'],
  });

  const { data: marcoHistory } = useQuery({
    queryKey: ['/api/marco-zero/history'],
  });

  const { data: reconciliations } = useQuery({
    queryKey: ['/api/reconciliation'],
  });

  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Mutations
  const setMarcoZeroMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/marco-zero', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marco-zero/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marco-zero/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/cash-flow'] });
      
      toast({
        title: '✅ Marco Zero Definido',
        description: 'O ponto de partida financeiro foi estabelecido com sucesso',
      });

      // Limpar formulário
      setAccountBalances(accountBalances.map(ab => ({ ...ab, balance: '' })));
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao definir Marco Zero',
        variant: 'destructive',
      });
    },
  });

  const createReconciliationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/reconciliation', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/cash-flow'] });
      
      toast({
        title: 'Ajuste Criado',
        description: 'Ajuste de reconciliação adicionado com sucesso',
      });

      setShowReconciliationDialog(false);
      setReconciliationData({
        adjustmentDate: new Date().toISOString().split('T')[0],
        amount: '',
        type: 'bank_fee',
        description: '',
        bankReference: '',
        accountId: 1,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar ajuste',
        variant: 'destructive',
      });
    },
  });

  const deleteReconciliationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/reconciliation/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/cash-flow'] });
      
      toast({
        title: 'Ajuste Removido',
        description: 'Ajuste de reconciliação removido com sucesso',
      });
    },
  });

  // Atualizar balanços quando houver contas
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setAccountBalances(
        accounts.map((acc: any) => ({
          accountId: acc.id,
          accountName: acc.name,
          balance: '',
        }))
      );
    }
  }, [accounts]);

  // Atualizar valores do marco ativo
  useEffect(() => {
    if (activeMarco) {
      setMarcoDate(activeMarco.marcoDate);
      if (activeMarco.accountBalances) {
        setAccountBalances(activeMarco.accountBalances);
      }
      if (activeMarco.notes) {
        setNotes(activeMarco.notes);
      }
    }
  }, [activeMarco]);

  // Funções auxiliares
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formattedValue;
  };

  const updateAccountBalance = (index: number, value: string) => {
    const newBalances = [...accountBalances];
    newBalances[index].balance = formatCurrency(value);
    setAccountBalances(newBalances);
  };

  const calculateTotal = () => {
    const total = accountBalances.reduce((sum, acc) => {
      const value = parseFloat(acc.balance.replace(/\./g, '').replace(',', '.')) || 0;
      return sum + value;
    }, 0);
    return total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleSetMarcoZero = () => {
    // Validar que pelo menos uma conta tem valor
    const hasValue = accountBalances.some(acc => acc.balance && acc.balance !== '0,00');
    if (!hasValue) {
      toast({
        title: 'Erro',
        description: 'Preencha pelo menos uma conta com valor',
        variant: 'destructive',
      });
      return;
    }

    // Preparar dados para envio
    const data = {
      marcoDate,
      accountBalances: accountBalances
        .filter(acc => acc.balance && acc.balance !== '0,00')
        .map(acc => ({
          ...acc,
          balance: acc.balance.replace(/\./g, '').replace(',', '.'),
        })),
      notes,
      updateAccounts: true, // Atualizar saldos das contas
    };

    setMarcoZeroMutation.mutate(data);
  };

  const handleCreateReconciliation = () => {
    if (!reconciliationData.amount || !reconciliationData.description) {
      toast({
        title: 'Erro',
        description: 'Preencha o valor e a descrição do ajuste',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      ...reconciliationData,
      marcoZeroId: activeMarco?.id,
      amount: reconciliationData.amount.replace(/\./g, '').replace(',', '.'),
    };

    createReconciliationMutation.mutate(data);
  };

  if (loadingMarco) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Marco Zero
          </h1>
          <p className="text-muted-foreground">
            Defina o ponto de partida financeiro real do sistema
          </p>
        </div>
      </div>

      {activeMarco && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Marco Zero ativo definido em {format(new Date(activeMarco.marcoDate), 'dd/MM/yyyy', { locale: ptBR })} 
            com saldo total de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(activeMarco.totalBalance))}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="define" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="define">Definir Marco</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="help">Ajuda</TabsTrigger>
        </TabsList>

        <TabsContent value="define" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Definir Novo Marco Zero
              </CardTitle>
              <CardDescription>
                Estabeleça o ponto de partida com os saldos reais de suas contas. 
                Transações anteriores a esta data serão consideradas históricas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data do Marco Zero */}
              <div className="space-y-2">
                <Label htmlFor="marcoDate">Data do Marco Zero</Label>
                <div className="relative max-w-xs">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="marcoDate"
                    type="date"
                    value={marcoDate}
                    onChange={(e) => setMarcoDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Todas as transações antes desta data serão marcadas como históricas
                </p>
              </div>

              {/* Saldos das Contas */}
              <div className="space-y-4">
                <Label>Saldos das Contas</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  {accountBalances.map((account, index) => (
                    <div key={account.accountId} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {account.accountName.includes('Investimento') ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="font-medium">{account.accountName}</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            R$
                          </span>
                          <Input
                            type="text"
                            value={account.balance}
                            onChange={(e) => updateAccountBalance(index, e.target.value)}
                            placeholder="0,00"
                            className="pl-10 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="font-semibold">Total do Marco:</span>
                  <span className="text-xl font-bold text-primary">{calculateTotal()}</span>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Saldos verificados com extratos bancários de 01/09/2025"
                  rows={3}
                />
              </div>

              {/* Botão de Salvar */}
              <Button 
                onClick={handleSetMarcoZero}
                disabled={setMarcoZeroMutation.isPending}
                className="w-full"
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                {setMarcoZeroMutation.isPending ? 'Definindo...' : 'Definir Marco Zero'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes de Reconciliação</CardTitle>
              <CardDescription>
                Corrija diferenças entre o sistema e extratos bancários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setShowReconciliationDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Ajuste
              </Button>

              {reconciliations && reconciliations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliations.map((adj: ReconciliationAdjustment) => (
                      <TableRow key={adj.id}>
                        <TableCell>
                          {format(new Date(adj.adjustmentDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="capitalize">{adj.type}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(parseFloat(adj.amount))}
                        </TableCell>
                        <TableCell>{adj.description}</TableCell>
                        <TableCell>{adj.bankReference || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReconciliationMutation.mutate(adj.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum ajuste de reconciliação cadastrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Marcos
              </CardTitle>
              <CardDescription>
                Visualize todos os marcos zero definidos anteriormente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marcoHistory && marcoHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Marco</TableHead>
                      <TableHead>Total Definido</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marcoHistory.map((marco: MarcoZero) => (
                      <TableRow key={marco.id}>
                        <TableCell>
                          {format(new Date(marco.marcoDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(parseFloat(marco.totalBalance))}
                        </TableCell>
                        <TableCell>{marco.notes || '-'}</TableCell>
                        <TableCell>
                          {marco.isActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(marco.createdAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum marco zero definido ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Como funciona o Marco Zero?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  O que é o Marco Zero?
                </h3>
                <p className="text-sm text-muted-foreground">
                  O Marco Zero é um ponto de partida financeiro real para seu sistema. 
                  Ele define uma data e os saldos exatos de suas contas naquele momento, 
                  servindo como base para todo o fluxo de caixa futuro.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Como as transações são tratadas?</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>
                    <strong>Transações ANTES do marco:</strong> São consideradas históricas e 
                    não afetam o saldo do fluxo de caixa
                  </li>
                  <li>
                    <strong>Transações DEPOIS do marco:</strong> Afetam normalmente o fluxo 
                    de caixa e saldos futuros
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">O que são Ajustes de Reconciliação?</h3>
                <p className="text-sm text-muted-foreground">
                  São correções para diferenças entre o sistema e seus extratos bancários. 
                  Por exemplo: taxas bancárias não registradas, juros, ou erros de lançamento.
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Ao definir um novo Marco Zero, o marco anterior 
                  é desativado automaticamente. Apenas um marco pode estar ativo por vez.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Reconciliação */}
      <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Ajuste de Reconciliação</DialogTitle>
            <DialogDescription>
              Adicione um ajuste para corrigir diferenças entre o sistema e extratos bancários
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data do Ajuste</Label>
              <Input
                type="date"
                value={reconciliationData.adjustmentDate}
                onChange={(e) => setReconciliationData({
                  ...reconciliationData,
                  adjustmentDate: e.target.value,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select
                value={reconciliationData.type}
                onValueChange={(value) => setReconciliationData({
                  ...reconciliationData,
                  type: value,
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_fee">Taxa Bancária</SelectItem>
                  <SelectItem value="interest">Juros</SelectItem>
                  <SelectItem value="correction">Correção de Lançamento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (use - para valores negativos)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <Input
                  type="text"
                  value={reconciliationData.amount}
                  onChange={(e) => setReconciliationData({
                    ...reconciliationData,
                    amount: formatCurrency(e.target.value),
                  })}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={reconciliationData.description}
                onChange={(e) => setReconciliationData({
                  ...reconciliationData,
                  description: e.target.value,
                })}
                placeholder="Ex: Taxa de manutenção de conta"
              />
            </div>

            <div className="space-y-2">
              <Label>Referência Bancária (opcional)</Label>
              <Input
                value={reconciliationData.bankReference}
                onChange={(e) => setReconciliationData({
                  ...reconciliationData,
                  bankReference: e.target.value,
                })}
                placeholder="Ex: DOC 123456"
              />
            </div>

            {accounts && accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select
                  value={reconciliationData.accountId.toString()}
                  onValueChange={(value) => setReconciliationData({
                    ...reconciliationData,
                    accountId: parseInt(value),
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconciliationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateReconciliation}>
              Criar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}