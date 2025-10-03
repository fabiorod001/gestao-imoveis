import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Plus, Calendar, Building2, Tag } from "lucide-react";

export default function Expenses() {
  const [, setLocation] = useLocation();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions', { type: 'expense' }],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transactions?type=expense&limit=50`
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      condominium: 'bg-blue-100 text-blue-800',
      cleaning: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      taxes: 'bg-red-100 text-red-800',
      management: 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="h-20 animate-pulse bg-gray-100" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despesas</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/transactions/new?type=expense')}>
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
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-medium flex-1 truncate">{transaction.description || 'Despesa'}</p>
                <p className="text-lg font-semibold text-red-600 whitespace-nowrap">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(transaction.date)}</span>
                {transaction.category && (
                  <>
                    <Tag className="h-3.5 w-3.5 ml-1" />
                    <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(transaction.category)}`}>
                      {transaction.category}
                    </span>
                  </>
                )}
                {transaction.propertyName && (
                  <>
                    <Building2 className="h-3.5 w-3.5 ml-1" />
                    <span className="truncate">{transaction.propertyName}</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {transactions.length === 0 && (
        <Card className="p-12 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma despesa encontrada</h3>
          <p className="text-sm text-muted-foreground">Adicione uma despesa para começar</p>
        </Card>
      )}
    </div>
  );
}
