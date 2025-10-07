import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface VacancyRateProps {
  days: number;
  properties: number;
}

export default function VacancyRate({ days, properties }: VacancyRateProps) {
  const avgDays = properties > 0 ? (days / properties).toFixed(0) : 0;
  const color = days === 0 ? 'text-green-600' : days < 30 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">Vacância</p>
          <p className={`text-3xl font-bold ${color}`}>{days}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {avgDays} dias em média por imóvel
          </p>
        </div>
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
          days === 0 ? 'bg-green-100' : days < 30 ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <AlertCircle className={`h-6 w-6 ${
            days === 0 ? 'text-green-600' : days < 30 ? 'text-yellow-600' : 'text-red-600'
          }`} />
        </div>
      </div>
    </Card>
  );
}
