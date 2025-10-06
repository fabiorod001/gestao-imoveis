import { Card } from "@/components/ui/card";
import { MapPin, DollarSign } from "lucide-react";

interface PropertyCardProps {
  name: string;
  nickname?: string;
  city?: string;
  state?: string;
  marketValue?: number;
  status: string;
  onClick?: () => void;
}

export default function PropertyCard({ 
  name, 
  nickname, 
  city, 
  state, 
  marketValue,
  status,
  onClick 
}: PropertyCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      financing: 'bg-blue-100 text-blue-800',
      decoration: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Ativo',
      financing: 'Financiamento',
      decoration: 'Reforma',
      inactive: 'Inativo',
    };
    return labels[status] || status;
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{name}</h3>
            {nickname && nickname !== name && (
              <p className="text-sm text-muted-foreground truncate">{nickname}</p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
          </span>
        </div>

        {(city || state) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{city}{city && state && ', '}{state}</span>
          </div>
        )}

        {marketValue && (
          <div className="flex items-center gap-1.5 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatCurrency(marketValue)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
