import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CashFlowData {
  date: string;
  displayDate: string;
  revenue: number;
  expenses: number;
  netFlow: number;
  balance: number;
  isToday: boolean;
}

interface CashFlowStats {
  currentBalance: number;
  projectedBalance7Days: number;
  totalRevenue7Days: number;
  totalExpenses7Days: number;
}

export default function CashFlowPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3d');
  const [showEntradas, setShowEntradas] = useState(false);
  const [showSaidas, setShowSaidas] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch cash flow data
  const { data: cashFlowData = [], isLoading: isLoadingCashFlow } = useQuery({
    queryKey: ['/api/analytics/cash-flow', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: selectedPeriod
      });
      const response = await fetch(`/api/analytics/cash-flow?${params}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch cash flow statistics
  const { data: cashFlowStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/analytics/cash-flow-stats', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: selectedPeriod
      });
      const response = await fetch(`/api/analytics/cash-flow-stats?${params}`);
      return response.json();
    }
  });

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return 'R$ 0,00';
    }
    
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(absValue);
    
    // For negative values, place the minus sign between R$ and the number
    if (isNegative) {
      return formatted.replace('R$', 'R$ -');
    }
    return formatted;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const chartData = useMemo(() => {
    // Define number of days to show based on period - same logic as table
    let daysToShow = 5; // Default
    if (selectedPeriod === '1d') daysToShow = 1;
    if (selectedPeriod === '2d') daysToShow = 2;
    if (selectedPeriod === '3d') daysToShow = 3;
    if (selectedPeriod === '4d') daysToShow = 4;
    if (selectedPeriod === '5d') daysToShow = 5;
    if (selectedPeriod === '1m') daysToShow = 30;
    if (selectedPeriod === '2m') daysToShow = 60;
    
    // Find today and make sure it's always the first day shown
    const todayIndex = cashFlowData.findIndex((d: CashFlowData) => d.isToday);
    const startIndex = todayIndex >= 0 ? todayIndex : 0;
    const displayData = cashFlowData.slice(startIndex, startIndex + daysToShow);
    
    return displayData.map((item: CashFlowData) => ({
      ...item,
      shortDate: formatDate(item.date)
    }));
  }, [cashFlowData, selectedPeriod]);

  const todayData = useMemo(() => {
    return cashFlowData.find((item: CashFlowData) => item.isToday);
  }, [cashFlowData]);

  if (isLoadingCashFlow || isLoadingStats) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fluxo de Caixa</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Acompanhe seu saldo diário e projeções financeiras
        </p>
      </div>

      {/* Today's Balance - Highlighted */}
      {todayData && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-6 h-6" />
                  <span className="text-lg font-medium opacity-90">Saldo Hoje</span>
                </div>
                <div className={`text-3xl font-bold ${todayData.balance < 0 ? 'text-red-300' : ''}`}>
                  {formatCurrency(todayData.balance)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75 mb-1">Movimentação do Dia</div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-green-200 text-sm">Entradas</div>
                    <div className="font-semibold">{formatCurrency(todayData.revenue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-200 text-sm">Saídas</div>
                    <div className="font-semibold">{formatCurrency(Math.abs(todayData.expenses))}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-200 text-sm">Resultado</div>
                    <div className={`font-semibold ${todayData.netFlow >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {formatCurrency(todayData.revenue - Math.abs(todayData.expenses))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Buttons */}
      <div className="flex justify-center items-center space-x-4 mb-6">
        {/* Data Type Filter - Additive System */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setShowEntradas(!showEntradas)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showEntradas
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setShowSaidas(!showSaidas)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showSaidas
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Saídas
          </button>
        </div>

        {/* Period Selection Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 dia</SelectItem>
              <SelectItem value="2d">2 dias</SelectItem>
              <SelectItem value="3d">3 dias</SelectItem>
              <SelectItem value="4d">4 dias</SelectItem>
              <SelectItem value="5d">5 dias</SelectItem>
              <SelectItem value="1m">1 mês</SelectItem>
              <SelectItem value="2m">2 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cash Flow Table - Horizontal Format */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Evolução do Saldo Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold w-24">Período</th>
                  {(() => {
                    // Define number of days to show based on period
                    let daysToShow = 5; // Default
                    if (selectedPeriod === '1d') daysToShow = 1;
                    if (selectedPeriod === '2d') daysToShow = 2;
                    if (selectedPeriod === '3d') daysToShow = 3;
                    if (selectedPeriod === '4d') daysToShow = 4;
                    if (selectedPeriod === '5d') daysToShow = 5;
                    if (selectedPeriod === '1m') daysToShow = 30;
                    if (selectedPeriod === '2m') daysToShow = 60;
                    
                    // Find today and make sure it's always the first day shown
                    const todayIndex = cashFlowData.findIndex((d: CashFlowData) => d.isToday);
                    const startIndex = todayIndex >= 0 ? todayIndex : 0;
                    const displayData = cashFlowData.slice(startIndex, startIndex + daysToShow);
                    
                    return displayData.map((item: CashFlowData, index: number) => {
                      // Format date as "28 Jul"
                      const date = new Date(item.date);
                      const formattedDate = date.toLocaleDateString('pt-BR', { 
                        day: 'numeric', 
                        month: 'short' 
                      });
                      
                      return (
                        <th 
                          key={item.date} 
                          className={`text-center font-semibold ${
                            item.isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                          } ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-2 text-xs' : 'py-3 px-4'}`}
                        >
                          <div className={`font-bold ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'text-xs' : 'text-sm'}`}>
                            {item.isToday ? 'HOJE' : formattedDate}
                          </div>
                        </th>
                      );
                    });
                  })()}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Define number of days to show based on period
                  let daysToShow = 5; // Default
                  if (selectedPeriod === '1d') daysToShow = 1;
                  if (selectedPeriod === '2d') daysToShow = 2;
                  if (selectedPeriod === '3d') daysToShow = 3;
                  if (selectedPeriod === '4d') daysToShow = 4;
                  if (selectedPeriod === '5d') daysToShow = 5;
                  if (selectedPeriod === '1m') daysToShow = 30;
                  if (selectedPeriod === '2m') daysToShow = 60;
                  
                  // Find today and make sure it's always the first day shown
                  const todayIndex = cashFlowData.findIndex((d: CashFlowData) => d.isToday);
                  const startIndex = todayIndex >= 0 ? todayIndex : 0;
                  const displayData = cashFlowData.slice(startIndex, startIndex + daysToShow);
                  
                  // Additive system: always show saldo, add others if selected
                  const rowsToShow = [];
                  
                  // Always show entradas if button is active
                  if (showEntradas) {
                    rowsToShow.push(
                      <tr key="entradas" className="border-b">
                        <td className={`font-semibold text-green-600 ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-2 text-sm' : 'py-3 px-4'}`}>Entradas</td>
                        {displayData.map((item: CashFlowData) => (
                          <td 
                            key={`revenue-${item.date}`} 
                            className={`text-center text-green-600 font-medium ${
                              item.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            } ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-1 text-xs' : 'py-3 px-4'}`}
                          >
                            {selectedPeriod === '1m' || selectedPeriod === '2m' ? 
                              `R$ ${(item.revenue / 1000).toFixed(0)}k` : 
                              formatCurrency(item.revenue)
                            }
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  
                  // Always show saidas if button is active
                  if (showSaidas) {
                    rowsToShow.push(
                      <tr key="saidas" className="border-b">
                        <td className={`font-semibold text-red-600 ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-2 text-sm' : 'py-3 px-4'}`}>Saídas</td>
                        {displayData.map((item: CashFlowData) => (
                          <td 
                            key={`expenses-${item.date}`} 
                            className={`text-center text-red-600 font-medium ${
                              item.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            } ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-1 text-xs' : 'py-3 px-4'}`}
                          >
                            {selectedPeriod === '1m' || selectedPeriod === '2m' ? 
                              `R$ ${(Math.abs(item.expenses) / 1000).toFixed(0)}k` : 
                              formatCurrency(Math.abs(item.expenses))
                            }
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  
                  // Always show saldo as the main row
                  rowsToShow.push(
                    <tr key="saldo" className="bg-gray-50 dark:bg-gray-800">
                      <td className={`font-bold text-gray-900 dark:text-gray-100 ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-2 text-base' : 'py-4 px-4 text-lg'}`}>Saldo</td>
                      {displayData.map((item: CashFlowData) => {
                        const isNegative = item.balance < 0;
                        return (
                          <td 
                            key={`balance-${item.date}`} 
                            className={`text-center font-bold ${
                              item.isToday 
                                ? isNegative 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700' 
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700'
                                : isNegative
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-gray-100'
                            } ${selectedPeriod === '1m' || selectedPeriod === '2m' ? 'py-2 px-1 text-sm' : 'py-4 px-4 text-lg'}`}
                          >
                            {selectedPeriod === '1m' || selectedPeriod === '2m' ? 
                              `R$ ${isNegative ? '-' : ''}${(Math.abs(item.balance) / 1000).toFixed(0)}k` : 
                              formatCurrency(item.balance)
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                  
                  return rowsToShow;
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Gráfico de Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortDate" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={(props) => {
                    const value = props.payload.balance;
                    const fill = value < 0 ? '#dc2626' : '#2563eb';
                    return <circle cx={props.cx} cy={props.cy} r={4} fill={fill} strokeWidth={2} stroke={fill} />;
                  }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}