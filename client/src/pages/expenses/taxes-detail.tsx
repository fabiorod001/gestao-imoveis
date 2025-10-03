import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function TaxesDetail() {
  const [, setLocation] = useLocation();

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['/api/expenses/taxes'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions?category=taxes&limit=50`);
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const total = taxes.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Impostos</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
        <Button size="icon" onClick={() => setLocation('/expenses/taxes/new')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-3">
        {taxes.map((tax: any) => (
          <Card key={tax.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{tax.description || 'Imposto'}</p>
                <p className="text-sm text-muted-foreground">{tax.propertyName}</p>
              </div>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(tax.amount)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
