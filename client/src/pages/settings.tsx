import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Save, Trash2, Landmark, DollarSign, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'wouter';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'investment';
  value: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [marcoZeroDate, setMarcoZeroDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Estado inicial com contas padrão
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'Conta Principal', type: 'checking', value: '' },
    { id: '2', name: 'Conta Secundária', type: 'checking', value: '' },
    { id: '3', name: 'Investimentos', type: 'investment', value: '' },
  ]);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'checking' | 'investment'>('checking');

  // Adicionar nova conta
  const addAccount = () => {
    if (!newAccountName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome da conta',
        variant: 'destructive',
      });
      return;
    }

    const newAccount: Account = {
      id: Date.now().toString(),
      name: newAccountName,
      type: newAccountType,
      value: '',
    };

    setAccounts([...accounts, newAccount]);
    setNewAccountName('');
    toast({
      title: 'Sucesso',
      description: 'Conta adicionada',
    });
  };

  // Remover conta
  const removeAccount = (id: string) => {
    // Não permite remover as contas padrão
    if (['1', '2', '3'].includes(id)) {
      toast({
        title: 'Erro',
        description: 'Não é possível remover contas padrão',
        variant: 'destructive',
      });
      return;
    }
    
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  // Atualizar valor da conta
  const updateAccountValue = (id: string, value: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, value } : acc
    ));
  };

  // Formatar valor monetário
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formattedValue;
  };

  // Salvar Marco Zero
  const saveMarcoZeroMutation = useMutation({
    mutationFn: async () => {
      // Validar que pelo menos uma conta tem valor
      const hasValue = accounts.some(acc => acc.value && acc.value !== '0,00');
      if (!hasValue) {
        throw new Error('Preencha pelo menos uma conta com valor');
      }

      // Criar transações de ajuste para cada conta com valor
      const adjustments = accounts
        .filter(acc => acc.value && acc.value !== '0,00')
        .map(acc => ({
          type: 'expense',
          category: 'balance_adjustment',
          description: `Marco Zero - ${acc.name}`,
          amount: acc.value.replace(',', '.'),
          date: marcoZeroDate,
          isHistorical: true,
          accountName: acc.name,
          accountType: acc.type,
        }));

      // Enviar todas as transações
      for (const adjustment of adjustments) {
        await apiRequest('/api/transactions', 'POST', adjustment);
      }

      return adjustments;
    },
    onSuccess: (adjustments) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: 'Marco Zero Criado!',
        description: `${adjustments.length} ajuste(s) de saldo criado(s) com sucesso`,
      });

      // Limpar valores
      setAccounts(accounts.map(acc => ({ ...acc, value: '' })));
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar marco zero',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {/* Link para Configuração de Impostos */}
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/settings/taxes')}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configuração de Impostos
            </span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Configure alíquotas, datas de vencimento e parâmetros dos impostos. Prepare-se para a reforma tributária 2026.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Marco Zero Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Marco Zero - Ajuste de Saldo
          </CardTitle>
          <CardDescription>
            Configure o saldo inicial de suas contas. Estes lançamentos serão marcados como históricos e não afetarão o fluxo de caixa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data do Marco Zero */}
          <div className="space-y-2">
            <Label htmlFor="marcoZeroDate">Data do Marco Zero</Label>
            <div className="relative max-w-xs">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="marcoZeroDate"
                type="date"
                value={marcoZeroDate}
                onChange={(e) => setMarcoZeroDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Contas */}
          <div className="space-y-4">
            <Label>Saldos das Contas</Label>
            
            {/* Contas Correntes */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Contas Correntes
              </h4>
              {accounts.filter(acc => acc.type === 'checking').map((account) => (
                <div key={account.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`account-${account.id}`} className="text-sm">
                      {account.name}
                    </Label>
                    <Input
                      id={`account-${account.id}`}
                      placeholder="0,00"
                      value={account.value}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        updateAccountValue(account.id, formatted);
                      }}
                      className="mt-1"
                    />
                  </div>
                  {!['1', '2', '3'].includes(account.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccount(account.id)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Investimentos */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investimentos
              </h4>
              {accounts.filter(acc => acc.type === 'investment').map((account) => (
                <div key={account.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`account-${account.id}`} className="text-sm">
                      {account.name}
                    </Label>
                    <Input
                      id={`account-${account.id}`}
                      placeholder="0,00"
                      value={account.value}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        updateAccountValue(account.id, formatted);
                      }}
                      className="mt-1"
                    />
                  </div>
                  {!['1', '2', '3'].includes(account.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccount(account.id)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar Nova Conta */}
          <div className="border-t pt-4">
            <Label>Adicionar Nova Conta</Label>
            <div className="flex items-end gap-3 mt-2">
              <div className="flex-1">
                <Input
                  placeholder="Nome da conta"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value as 'checking' | 'investment')}
                className="px-3 py-2 border rounded-md"
              >
                <option value="checking">Conta Corrente</option>
                <option value="investment">Investimento</option>
              </select>
              <Button onClick={addAccount} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={() => saveMarcoZeroMutation.mutate()}
              disabled={saveMarcoZeroMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveMarcoZeroMutation.isPending ? 'Salvando...' : 'Salvar Marco Zero'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outras Configurações podem ser adicionadas aqui */}
      <Card>
        <CardHeader>
          <CardTitle>Outras Configurações</CardTitle>
          <CardDescription>
            Configurações adicionais do sistema serão adicionadas aqui
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </CardContent>
      </Card>
    </div>
  );
}