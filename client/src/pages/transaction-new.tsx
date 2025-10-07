import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function TransactionNew() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLocation('/expenses');
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => setLocation('/expenses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Transação</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input placeholder="Ex: Condomínio Jan/2024" />
          </div>
          
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input type="number" placeholder="0,00" />
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
