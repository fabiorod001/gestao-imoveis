import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Building } from "lucide-react";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeProperties: number;
  totalProperties: number;
}

export default function MetricsCards() {
  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: ['/api/analytics/summary'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">Sem dados</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const occupancyRate = summary.totalProperties > 0 
    ? (summary.activeProperties / summary.totalProperties) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Receita Total */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Receita Total</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                €{(summary.totalRevenue / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center mt-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                Receitas acumuladas
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Despesas Totais */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Despesas Totais</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                €{(summary.totalExpenses / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center mt-2">
                <TrendingDown className="w-3 h-3 mr-1" />
                Gastos controlados
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lucro Líquido */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Lucro Líquido</p>
              <p className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-red-600'}`}>
                €{(summary.netProfit / 1000).toFixed(0)}k
              </p>
              <p className={`text-xs flex items-center mt-2 ${summary.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                <Wallet className="w-3 h-3 mr-1" />
                {summary.netProfit >= 0 ? 'Resultado positivo' : 'Prejuízo acumulado'}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Imóveis Ativos */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Imóveis Ativos</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                {summary.activeProperties}/{summary.totalProperties}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center mt-2">
                <Building className="w-3 h-3 mr-1" />
                {occupancyRate.toFixed(0)}% ocupação
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
