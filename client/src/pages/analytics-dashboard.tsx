import { useState } from "react";
import { useLocation } from "wouter";
import DateRangeFilter from "@/components/DateRangeFilter";
import MonthComparison from "@/components/MonthComparison";
import OccupancyRate from "@/components/OccupancyRate";
import AverageROI from "@/components/AverageROI";
import VacancyRate from "@/components/VacancyRate";
import RevenueChart from "@/components/charts/RevenueChart";
import ExpenseChart from "@/components/charts/ExpenseChart";
import CashFlowTrend from "@/components/charts/CashFlowTrend";

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('12m');
  const [, setLocation] = useLocation();

  // Mock data - substituir por API real
  const currentRevenue = 25000;
  const previousRevenue = 22000;
  const currentExpense = 12000;
  const previousExpense = 13000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Gerencial</h1>
        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPIs de comparação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MonthComparison 
          label="Receita Mensal"
          current={currentRevenue}
          previous={previousRevenue}
        />
        <MonthComparison 
          label="Despesa Mensal"
          current={currentExpense}
          previous={previousExpense}
        />
        <OccupancyRate rate={85.5} properties={12} />
        <AverageROI roi={8.5} previousMonth={7.8} />
      </div>

      {/* Vacância */}
      <VacancyRate days={45} properties={3} />

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer" onClick={() => setLocation('/analytics')}>
          <RevenueChart data={[]} />
        </div>
        <div className="cursor-pointer" onClick={() => setLocation('/analytics')}>
          <ExpenseChart data={[]} />
        </div>
      </div>

      <div className="cursor-pointer" onClick={() => setLocation('/analytics')}>
        <CashFlowTrend data={[]} />
      </div>
    </div>
  );
}
