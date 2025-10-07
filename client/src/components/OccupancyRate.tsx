import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface OccupancyRateProps {
  rate: number;
  properties: number;
}

export default function OccupancyRate({ rate, properties }: OccupancyRateProps) {
  const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">Taxa de Ocupação</p>
          <p className={`text-3xl font-bold ${color}`}>{rate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {properties} {properties === 1 ? 'imóvel' : 'imóveis'}
          </p>
        </div>
        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
      </div>
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            rate >= 80 ? 'bg-green-600' : rate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
          }`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </Card>
  );
}
