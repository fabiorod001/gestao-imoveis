import { Card } from "@/components/ui/card";
import { Calendar, Building2 } from "lucide-react";

interface TransactionCardProps {
  description: string;
  amount: number;
  date: string;
  propertyName?: string;
  type: 'revenue' | 'expense';
  onClick?: () => void;
}

export default function TransactionCard({ 
  description, 
  amount, 
  date, 
  propertyName, 
  type,
  onClick 
}: TransactionCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(date)}</span>
            {propertyName && (
              <>
                <Building2 className="h-3.5 w-3.5 ml-1" />
                <span className="truncate">{propertyName}</span>
              </>
            )}
          </div>
        </div>
        <p className={`text-lg font-semibold whitespace-nowrap ${
          type === 'revenue' ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(amount)}
        </p>
      </div>
    </Card>
  );
}
