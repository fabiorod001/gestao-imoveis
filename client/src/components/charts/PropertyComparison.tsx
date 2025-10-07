import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from "@/components/ui/card";

interface PropertyComparisonProps {
  data: Array<{ name: string; roi: number }>;
}

export default function PropertyComparison({ data }: PropertyComparisonProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">ROI por Imóvel</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            tickFormatter={(value) => `${value}%`}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={150}
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            formatter={(value: number) => `${value.toFixed(2)}%`}
            contentStyle={{ fontSize: '14px' }}
          />
          <Bar 
            dataKey="roi" 
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
