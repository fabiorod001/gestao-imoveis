import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { useLocation } from "wouter";

export default function MaintenanceDetail() {
  const [, setLocation] = useLocation();

  const { data: items = [] } = useQuery({
    queryKey: ['/api/expenses/maintenance'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions?category=maintenance&limit=50`);
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const total = items.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/expenses/maintenance/new')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item: any) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between">
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">{item.propertyName}</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(item.amount)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
