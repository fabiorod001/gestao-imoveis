import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface DayForecast {
  date: string;
  displayDate: string;
  revenue: number;
  expenses: number;
  balance: number;
  isToday: boolean;
}

interface AccountBalance {
  id: number;
  name: string;
  currentBalance: number;
}

export default function CashFlow() {
  const [, setLocation] = useLocation();

  // Buscar saldo consolidado + próximos 3 dias
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/cash-flow/summary'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/cash-flow/summary`);
      return res.json();
    },
  });

  // Buscar contas principais (top 2)
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts/main'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/accounts?main=true&limit=2`);
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
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
    
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = data?.forecast?.[0];
  const nextDays = data?.forecast?.slice(1, 4) || [];
  const totalBalance = data?.totalBalance || 0;

  return (
    <div className="space-y-6">
      {/* Header com atualização */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Saldo consolidado
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Saldo HOJE - Destaque principal */}
      <Card className="bg-primary text-primary-foreground">
        <div className="p-6 space-y-2">
          <p className="text-sm opacity-90">Saldo Hoje</p>
          <p className="text-4xl font-bold">
            {formatCurrency(totalBalance)}
          </p>
          {today && (
            <div className="flex items-center gap-4 text-sm pt-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{formatCurrency(today.revenue)}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                <span>{formatCurrency(today.expenses)}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Próximos 3 dias */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Próximos Dias</h2>
        {nextDays.map((day: DayForecast) => (
          <Card 
            key={day.date}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setLocation('/cash-flow-detail?date=' + day.date)}
          >
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <p className="font-medium">{formatDate(day.date)}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="text-green-600">
                    +{formatCurrency(day.revenue)}
                  </span>
                  <span className="text-red-600">
                    -{formatCurrency(day.expenses)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {formatCurrency(day.balance)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Contas Principais */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Contas Principais</h2>
        {accounts.map((account: AccountBalance) => (
          <Card 
            key={account.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setLocation('/accounts/' + account.id)}
          >
            <div className="p-4 flex items-center justify-between">
              <p className="font-medium">{account.name}</p>
              <p className="text-lg font-semibold">
                {formatCurrency(account.currentBalance)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button 
          variant="outline" 
          className="h-auto py-4"
          onClick={() => setLocation('/revenues')}
        >
          <div className="flex flex-col items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">Ver Receitas</span>
          </div>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4"
          onClick={() => setLocation('/expenses')}
        >
          <div className="flex flex-col items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm">Ver Despesas</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
