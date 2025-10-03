import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function CleaningDetail() {
  const [, setLocation] = useLocation();

  const { data: cleanings = [], isLoading } = useQuery({
    queryKey: ['/api/expenses/cleaning'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions?category=cleaning&limit=50`);
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const total = cleanings.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Limpezas</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/expenses/cleaning/new')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-3">
        {cleanings.map((cleaning: any) => (
          <Card key={cleaning.id} className="p-4 cursor-pointer hover:bg-accent" onClick={() => setLocation(`/transactions/${cleaning.id}`)}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{cleaning.propertyName || 'Limpeza'}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(cleaning.date)}</span>
                </div>
              </div>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(cleaning.amount)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
