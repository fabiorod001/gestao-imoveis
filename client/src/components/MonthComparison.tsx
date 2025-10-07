import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MonthComparisonProps {
  label: string;
  current: number;
  previous: number;
  isCurrency?: boolean;
}

export default function MonthComparison({ label, current, previous, isCurrency = true }: MonthComparisonProps) {
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  const formatValue = (value: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toFixed(2);
  };

  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold">{formatValue(current)}</p>
        {!isNeutral && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          </div>
        )}
        {isNeutral && (
          <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <Minus className="h-4 w-4" />
            <span>0%</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Anterior: {formatValue(previous)}
      </p>
    </Card>
  );
}
