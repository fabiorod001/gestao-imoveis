import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building } from "lucide-react";
import { useLocation } from "wouter";

export default function CondominiumDetail() {
  const [, setLocation] = useLocation();

  const { data: items = [] } = useQuery({
    queryKey: ['/api/expenses/condominium'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions?category=condominium&limit=50`);
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
          <h1 className="text-2xl font-bold">Condomínio</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/expenses/condominium/new')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item: any) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.propertyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
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
