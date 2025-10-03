import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, Calendar, Building2 } from "lucide-react";
import { useState } from "react";

export default function Revenues() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("current-month");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions', { type: 'revenue', period }],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transactions?type=revenue&period=${period}`
      );
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="h-20 animate-pulse bg-gray-100" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receitas</h1>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/transactions/new?type=revenue')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction: any) => (
          <Card
            key={transaction.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setLocation(`/transactions/${transaction.id}`)}
          >
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{transaction.description || 'Receita'}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(transaction.date)}</span>
                  {transaction.propertyName && (
                    <>
                      <Building2 className="h-3.5 w-3.5 ml-1" />
                      <span className="truncate">{transaction.propertyName}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-lg font-semibold text-green-600 whitespace-nowrap">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {transactions.length === 0 && (
        <Card className="p-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma receita encontrada</h3>
          <p className="text-sm text-muted-foreground">Adicione uma receita para começar</p>
        </Card>
      )}
    </div>
  );
}
