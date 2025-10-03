import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Building2, DollarSign } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['/api/analytics/summary'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/summary`);
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-24 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  const kpis = [
    { 
      label: 'Saldo Total', 
      value: summary?.totalBalance || 0, 
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    { 
      label: 'Receitas (mês)', 
      value: summary?.monthRevenue || 0, 
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    { 
      label: 'Despesas (mês)', 
      value: summary?.monthExpenses || 0, 
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-100'
    },
    { 
      label: 'Imóveis Ativos', 
      value: summary?.activeProperties || 0, 
      icon: Building2,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      isCount: true
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do negócio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">
                    {kpi.isCount ? kpi.value : formatCurrency(kpi.value)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Resultado do Mês</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receitas</span>
            <span className="font-medium text-green-600">
              {formatCurrency(summary?.monthRevenue || 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas</span>
            <span className="font-medium text-red-600">
              -{formatCurrency(summary?.monthExpenses || 0)}
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="font-semibold">Lucro Líquido</span>
            <span className={`font-bold ${
              (summary?.monthRevenue || 0) - (summary?.monthExpenses || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency((summary?.monthRevenue || 0) - (summary?.monthExpenses || 0))}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
