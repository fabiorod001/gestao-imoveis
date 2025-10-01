import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccounts, getMarcoZero, saveMarcoZero } from "@/lib/api";
import { useState, useEffect } from "react";
import { Calendar, Save } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [marcoDate, setMarcoDate] = useState("2025-10-01");
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  });

  const { data: marcoZero } = useQuery({
    queryKey: ['marco-zero'],
    queryFn: getMarcoZero,
  });

  // Atualizar quando os dados carregarem
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const balances: Record<string, number> = {};
      accounts.forEach((acc: any) => {
        balances[acc.id] = acc.current_balance;
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
    mutationFn: saveMarcoZero,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marco-zero'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      alert('Marco Zero salvo com sucesso!');
    }
  });

  const handleSave = () => {
    const totalBalance = (accountBalances[1] || 0) + (accountBalances[2] || 0);

    saveMutation.mutate({
      marco_date: marcoDate,
      account_balances: accountBalances,
      total_balance: totalBalance
    });
  };

  if (loadingAccounts) {
    return <div className="p-8">Carregando...</div>;
  }

  const fluxoCaixa = (accountBalances[1] || 0) + (accountBalances[2] || 0);

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
              
              {accounts?.map((account: any) => (
                <div key={account.id} className="grid grid-cols-2 gap-4 items-center">
                  <Label>{account.name}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={accountBalances[account.id] || 0}
                    onChange={(e) => setAccountBalances({
                      ...accountBalances,
                      [account.id]: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Fluxo de Caixa Total:</span>
                <span className={fluxoCaixa < 0 ? 'text-red-600' : 'text-green-600'}>
                  R$ {fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                (Soma: Conta Principal + Conta Secundária)
              </p>
            </div>

            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Marco Zero'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
