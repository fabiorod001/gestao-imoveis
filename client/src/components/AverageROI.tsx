import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface AverageROIProps {
  roi: number;
  previousMonth: number;
}

export default function AverageROI({ roi, previousMonth }: AverageROIProps) {
  const diff = roi - previousMonth;
  const isPositive = diff >= 0;
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">ROI Médio</p>
          <p className="text-3xl font-bold text-blue-600">{roi.toFixed(2)}%</p>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(diff).toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        </div>
        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </Card>
  );
}
