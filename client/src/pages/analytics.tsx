import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DateRangeFilter from "@/components/DateRangeFilter";
import RevenueChart from "@/components/charts/RevenueChart";
import ExpenseChart from "@/components/charts/ExpenseChart";
import CategoryBreakdown from "@/components/charts/CategoryBreakdown";
import PropertyComparison from "@/components/charts/PropertyComparison";
import CashFlowTrend from "@/components/charts/CashFlowTrend";
import LoadingState from "@/components/LoadingState";

export default function Analytics() {
  const [period, setPeriod] = useState('12m');

  const { data: revenueData = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ['/api/analytics/revenue', period],
    queryFn: async () => {
      // Mock data - substituir por API real
      return Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
        value: Math.random() * 10000 + 5000,
      }));
    },
  });

  const { data: expenseData = [], isLoading: loadingExpense } = useQuery({
    queryKey: ['/api/analytics/expense', period],
    queryFn: async () => {
      return Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
        value: Math.random() * 5000 + 2000,
      }));
    },
  });

  const { data: categoryData = [] } = useQuery({
    queryKey: ['/api/analytics/categories'],
    queryFn: async () => {
      return [
        { name: 'Condomínio', value: 5000 },
        { name: 'Limpeza', value: 2000 },
        { name: 'Manutenção', value: 3000 },
        { name: 'Impostos', value: 4000 },
      ];
    },
  });

  const { data: propertyData = [] } = useQuery({
    queryKey: ['/api/analytics/properties'],
    queryFn: async () => {
      return [
        { name: 'Imóvel A', roi: 8.5 },
        { name: 'Imóvel B', roi: 6.2 },
        { name: 'Imóvel C', roi: 9.8 },
      ];
    },
  });

  const cashFlowData = revenueData.map((item, index) => ({
    month: item.month,
    revenue: item.value,
    expense: expenseData[index]?.value || 0,
  }));

  if (loadingRevenue || loadingExpense) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={revenueData} />
        <ExpenseChart data={expenseData} />
        <CashFlowTrend data={cashFlowData} />
        <CategoryBreakdown data={categoryData} />
        <PropertyComparison data={propertyData} />
      </div>
    </div>
  );
}
