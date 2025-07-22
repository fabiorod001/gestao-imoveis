import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface CashFlowData {
  date: string;
  displayDate: string;
  revenue: number;
  expenses: number;
  balance: number;
  savings?: number;
  isToday?: boolean;
}

interface CashFlowStats {
  currentBalance: number;
  highestBalance: number;
  lowestBalance: number;
  highestDate: string;
  lowestDate: string;
  totalRevenue: number;
  totalExpenses: number;
}

export default function CashFlowChart() {
  const [viewPeriod, setViewPeriod] = useState<'default' | '2w' | 'current_month' | '2_months'>('default');
  
  // Fetch cash flow data
  const { data: cashFlowData = [], isLoading } = useQuery<CashFlowData[]>({
    queryKey: [`/api/analytics/cash-flow?period=${viewPeriod}`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch cash flow statistics
  const { data: stats } = useQuery<CashFlowStats>({
    queryKey: [`/api/analytics/cash-flow-stats?period=${viewPeriod}`],
    refetchInterval: 30000,
  });

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const formatTooltipValue = (value: number, name: string) => {
    const formattedValue = formatValue(value);
    const color = value >= 0 ? '#10b981' : '#ef4444';
    const prefix = value >= 0 ? '' : '-';
    
    return [
      <span style={{ color }}>{prefix}{formattedValue}</span>,
      name === 'revenue' ? 'Receitas' : 
      name === 'expenses' ? 'Despesas' : 
      name === 'balance' ? 'Saldo' : 'Poupança'
    ];
  };

  // Custom label component for showing values on peaks and valleys
  const CustomLabel = (props: any) => {
    const { x, y, value, index, dataKey } = props;
    
    // Only show labels for balance line at specific points
    if (dataKey !== 'balance') return null;
    
    const isToday = cashFlowData[index]?.isToday;
    const isHighest = stats && value === stats.highestBalance;
    const isLowest = stats && value === stats.lowestBalance;
    
    // Show label for today, highest, and lowest points
    if (!isToday && !isHighest && !isLowest) return null;
    
    const formattedValue = formatValue(value);
    const displayValue = value >= 0 ? formattedValue : `-${formattedValue}`;
    
    return (
      <g>
        <text
          x={x}
          y={y - 10}
          textAnchor="middle"
          className={`text-sm font-bold ${
            isToday ? 'fill-blue-600' : 
            isHighest ? 'fill-green-600' : 
            'fill-red-600'
          }`}
        >
          {displayValue}
        </text>
        {/* Small dot for emphasis */}
        <circle
          cx={x}
          cy={y}
          r="4"
          className={`${
            isToday ? 'fill-blue-600' : 
            isHighest ? 'fill-green-600' : 
            'fill-red-600'
          }`}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const [value, name] = formatTooltipValue(entry.value, entry.dataKey);
            return (
              <div key={`tooltip-${index}`} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span key={`value-${index}`}>{value}</span>
                <span key={`name-${index}`}>{name}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Linha vertical do "hoje"
  const TodayLine = ({ chartData }: { chartData: CashFlowData[] }) => {
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = chartData.findIndex(d => d.date === today);
    
    if (todayIndex === -1) return null;
    
    return (
      <g>
        <line
          x1={`${(todayIndex / (chartData.length - 1)) * 100}%`}
          y1="0"
          x2={`${(todayIndex / (chartData.length - 1)) * 100}%`}
          y2="100%"
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <text
          x={`${(todayIndex / (chartData.length - 1)) * 100}%`}
          y="15"
          textAnchor="middle"
          fill="#ef4444"
          fontSize="12"
          fontWeight="bold"
        >
          HOJE
        </text>
      </g>
    );
  };

  const todayData = cashFlowData.find(d => d.isToday);
  const currentBalance = todayData?.balance || 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fluxo de Caixa
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex gap-1">
              {[
                { key: 'default', label: 'Padrão' },
                { key: '2w', label: '2 sem' },
                { key: 'current_month', label: 'Mês corrente' },
                { key: '2_months', label: '2 Meses' },
              ].map(period => (
                <Button
                  key={period.key}
                  variant={viewPeriod === period.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewPeriod(period.key as any)}
                  className="h-8 px-3 text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Current stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Calendar className="w-3 h-3 mr-1" />
              Hoje
            </Badge>
            <span className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentBalance >= 0 ? '' : '-'}R$ {formatValue(currentBalance)}
            </span>
          </div>
          
          {stats && (
            <>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Pico: R$ {formatValue(stats.highestBalance)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">
                  Vale: {stats.lowestBalance >= 0 ? '' : '-'}R$ {formatValue(stats.lowestBalance)}
                </span>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Daily Balance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-1 font-medium text-gray-600">Datas</td>
                {cashFlowData.map((day, index) => (
                  <td 
                    key={index} 
                    className={`py-2 px-1 text-center ${
                      day.isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/20 font-bold' 
                        : ''
                    }`}
                  >
                    {day.displayDate}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-1 font-medium text-gray-600">Saldos</td>
                {cashFlowData.map((day, index) => (
                  <td 
                    key={index} 
                    className={`py-2 px-1 text-center ${
                      day.isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/20 font-bold' 
                        : ''
                    } ${
                      day.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {day.balance >= 0 ? '' : '-'}{formatValue(day.balance)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => {
                  if (value === 0) return '0';
                  return value >= 0 ? formatValue(value) : `-${formatValue(value)}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line for zero */}
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
              
              {/* Today vertical line with balance value */}
              {(() => {
                const todayData = cashFlowData.find(d => d.displayDate === 'HOJE');
                if (!todayData) return null;
                
                return (
                  <ReferenceLine 
                    x="HOJE" 
                    stroke="#6b7280" 
                    strokeWidth={1}
                    label={{ 
                      value: formatValue(todayData.balance), 
                      position: "insideTopRight", 
                      fill: todayData.balance >= 0 ? "#2563eb" : "#dc2626", 
                      fontSize: 12, 
                      fontWeight: "bold" 
                    }}
                  />
                );
              })()}

              
              {/* Revenue line (thin, green) */}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
              
              {/* Expenses line (thin, red) */}
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
              
              {/* Balance line (thick, blue) */}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6' }}
              >
                <LabelList content={<CustomLabel />} />
              </Line>
              
              {/* Savings line (thin, purple) - when implemented */}
              {cashFlowData.some(d => d.savings !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#8b5cf6' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>Despesas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-blue-500" />
            <span>Saldo</span>
          </div>
          {cashFlowData.some(d => d.savings !== undefined) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-500" />
              <span>Poupança</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}