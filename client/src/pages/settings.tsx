import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Calendar, Save, AlertTriangle, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [marcoDate, setMarcoDate] = useState("2025-10-01");
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  const { data: accounts, isLoading: loadingAccounts } = useQuery<any[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: marcoZero } = useQuery<any>({
    queryKey: ['/api/marco-zero/active'],
  });

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const balances: Record<string, number> = {};
      accounts.forEach((acc: any) => {
        balances[acc.id] = parseFloat(acc.currentBalance) || 0;
      });
      setAccountBalances(balances);
    }
  }, [accounts]);

  useEffect(() => {
    if (marcoZero) {
      setMarcoDate(marcoZero.marco_date);
      setAccountBalances(marcoZero.account_balances);
    }
  }, [marcoZero]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/marco-zero', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marco-zero/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({ title: 'Marco Zero salvo com sucesso!' });
    }
  });

  // Transaction cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/cleanup/transactions', {
        method: 'DELETE',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Limpeza concluída",
        description: `${data.removed || 0} transações duplicadas removidas`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      setShowCleanupDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erro na limpeza",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const totalBalance = Object.values(accountBalances).reduce((sum, val) => sum + val, 0);

    saveMutation.mutate({
      marco_date: marcoDate,
      account_balances: accountBalances,
      total_balance: totalBalance
    });
  };

  if (loadingAccounts) {
    return <div className="p-8">Carregando...</div>;
  }

  const fluxoCaixa = Object.values(accountBalances).reduce((sum, val) => sum + val, 0);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Configurações</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Marco Zero - Ponto de Partida Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="marcoDate">Data do Marco Zero</Label>
              <Input
                id="marcoDate"
                type="date"
                value={marcoDate}
                onChange={(e) => setMarcoDate(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Saldos das Contas</h3>
              
              {accounts?.map((account: any) => {
                const value = accountBalances[account.id] || 0;
                const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const isNegative = value < 0;
                
                return (
                  <div key={account.id} className="grid grid-cols-2 gap-4 items-center">
                    <Label>{account.name}</Label>
                    <Input
                      type="text"
                      value={formatted}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d,-]/g, '').replace(',', '.');
                        const numValue = parseFloat(cleaned) || 0;
                        setAccountBalances({
                          ...accountBalances,
                          [account.id]: numValue
                        });
                      }}
                      className={isNegative ? 'text-red-600 font-semibold' : ''}
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Fluxo de Caixa Total:</span>
                <span className={fluxoCaixa < 0 ? 'text-red-600' : 'text-green-600'}>
                  R$ {fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                (Soma de todas as contas)
              </p>
            </div>

            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Marco Zero'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Administrative Tools */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-700">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Ferramentas Administrativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Limpar Transações Duplicadas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Remove transações duplicadas do banco de dados
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowCleanupDialog(true)}
              data-testid="button-cleanup-transactions"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Executar Limpeza
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Calculadora IPCA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Calcule correção monetária pelo IPCA
            </p>
            <Link href="/utilities/ipca">
              <Button variant="outline" data-testid="button-ipca-calculator">
                <Calculator className="h-4 w-4 mr-2" />
                Abrir Calculadora
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-yellow-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Atenção: Esta ação não pode ser desfeita
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transações duplicadas serão permanentemente removidas do banco de dados.
              <br />
              <br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-cleanup">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cleanupMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-cleanup"
            >
              {cleanupMutation.isPending ? "Limpando..." : "Confirmar Limpeza"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
