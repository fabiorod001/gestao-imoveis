import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function PropertyForm() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLocation('/properties');
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => setLocation('/properties')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Imóvel</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input placeholder="Ex: Apto 301 - Vila Mariana" />
          </div>
          
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input placeholder="São Paulo" />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Input placeholder="SP" maxLength={2} />
          </div>

          <div className="space-y-2">
            <Label>Valor de Mercado</Label>
            <Input type="number" placeholder="0,00" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
