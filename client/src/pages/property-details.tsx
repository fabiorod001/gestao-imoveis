import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Building2, MapPin, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Carregando detalhes do imóvel...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">
          {error ? `Erro: ${error.message}` : 'Imóvel não encontrado'}
        </div>
        <Link href="/properties">
          <Button>Voltar para lista</Button>
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/properties">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{property.name}</h1>
            {property.nickname && (
              <p className="text-xl text-gray-600">{property.nickname}</p>
            )}
          </div>
          <Building2 className="h-12 w-12 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium capitalize">{property.type || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">{property.status || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo de locação:</span>
              <span className="font-medium capitalize">{property.rental_type || '-'}</span>
            </div>
            {property.airbnb_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Nome Airbnb:</span>
                <span className="font-medium text-sm">{property.airbnb_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {property.street && <div>{property.street}, {property.number}</div>}
            {property.unit && <div>Unidade: {property.unit}</div>}
            {property.neighborhood && <div>{property.neighborhood}</div>}
            {property.city && <div>{property.city} - {property.state}</div>}
            {property.zip_code && <div>CEP: {property.zip_code}</div>}
            {property.country && <div>{property.country}</div>}
            {!property.street && <div className="text-gray-500">Endereço não cadastrado</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Valores de Aquisição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {property.purchase_price && (
              <div className="flex justify-between">
                <span className="text-gray-600">Preço de compra:</span>
                <span className="font-medium">{formatCurrency(property.purchase_price)}</span>
              </div>
            )}
            {property.purchase_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Data de compra:</span>
                <span className="font-medium">{formatDate(property.purchase_date)}</span>
              </div>
            )}
            {!property.purchase_price && <div className="text-gray-500">Valores não cadastrados</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Valor de Mercado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {property.market_value && (
              <div className="flex justify-between">
                <span className="text-gray-600">Valor estimado:</span>
                <span className="font-medium text-green-600">
                  R$ {formatCurrency(property.market_value)}
                </span>
              </div>
            )}
            {property.market_value_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Data da avaliação:</span>
                <span className="font-medium">{formatDate(property.market_value_date)}</span>
              </div>
            )}
            {!property.market_value && (
              <div className="text-gray-500">Valor de mercado não cadastrado</div>
            )}
          </CardContent>
        </Card>
      </div>

      {property.description && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{property.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}