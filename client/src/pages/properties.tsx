import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, MapPin, DollarSign } from "lucide-react";

interface Property {
  id: number;
  name: string;
  nickname: string;
  type: string;
  status: string;
  city: string;
  state: string;
  marketValue: string;
}

export default function Properties() {
  const [, setLocation] = useLocation();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/properties`);
      return res.json();
    },
  });

  const formatCurrency = (value: string | number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-32 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com botão adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? 'imóvel' : 'imóveis'}
          </p>
        </div>
        <Button onClick={() => setLocation('/properties/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Lista de imóveis como cards */}
      <div className="space-y-3">
        {properties.map((property: Property) => (
          <Card
            key={property.id}
            className="cursor-pointer hover:bg-accent transition-colors active:scale-[0.98]"
            onClick={() => setLocation(`/properties/${property.id}`)}
          >
            <div className="p-4 space-y-3">
              {/* Título e status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {property.name}
                  </h3>
                  {property.nickname && property.nickname !== property.name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {property.nickname}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(property.status)}`}>
                  {getStatusLabel(property.status)}
                </span>
              </div>

              {/* Localização */}
              {(property.city || property.state) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{property.city}{property.city && property.state && ', '}{property.state}</span>
                </div>
              )}

              {/* Valor */}
              {property.marketValue && (
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(property.marketValue)}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {properties.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum imóvel cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione seu primeiro imóvel para começar
          </p>
          <Button onClick={() => setLocation('/properties/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Imóvel
          </Button>
        </Card>
      )}
    </div>
  );
}
