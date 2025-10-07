import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from "@/components/ui/card";

interface CashFlowTrendProps {
  data: Array<{ month: string; revenue: number; expense: number }>;
}

export default function CashFlowTrend({ data }: CashFlowTrendProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Fluxo de Caixa Mensal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ fontSize: '14px' }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stackId="1"
            stroke="#10b981" 
            fill="#10b981"
            fillOpacity={0.6}
            name="Receitas"
          />
          <Area 
            type="monotone" 
            dataKey="expense" 
            stackId="2"
            stroke="#ef4444" 
            fill="#ef4444"
            fillOpacity={0.6}
            name="Despesas"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
