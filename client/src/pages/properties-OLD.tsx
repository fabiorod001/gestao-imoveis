import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProperties } from "@/lib/api";

export default function Properties() {
  const { data: properties, isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Carregando imóveis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar imóveis: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Imóveis</h1>
          <p className="text-gray-600">Gerencie todos os seus imóveis</p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Imóvel
          </Button>
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum imóvel cadastrado</h3>
            <p className="text-gray-600 mb-4">Comece adicionando seu primeiro imóvel</p>
            <Link href="/properties/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Imóvel
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property: any) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{property.name}</h3>
                      {property.nickname && (
                        <p className="text-sm text-gray-600">{property.nickname}</p>
                      )}
                    </div>
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium capitalize">{property.status}</span>
                    </div>
                    
                    {property.purchase_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valor de compra:</span>
                        <span className="font-medium">
                          {property.currency} {property.purchase_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    
                    {property.market_value && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valor de mercado:</span>
                        <span className="font-medium">
                          R$ {property.market_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
