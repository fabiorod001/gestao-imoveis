import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabase";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      return data;
    },
    enabled: !!propertyId,
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (!property) return <div className="p-8">Imóvel não encontrado</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{property.name}</h1>
      
      <div className="space-y-4">
        <p><strong>Nickname:</strong> {property.nickname || '-'}</p>
        <p><strong>Status:</strong> {property.status}</p>
        <p><strong>Tipo:</strong> {property.type}</p>
        <p><strong>Airbnb:</strong> {property.airbnb_name || '-'}</p>
        
        {property.purchase_price && (
          <p><strong>Compra:</strong> {property.purchase_price.toLocaleString('pt-BR')}</p>
        )}
        
        {property.market_value && (
          <p><strong>Mercado:</strong> R$ {property.market_value.toLocaleString('pt-BR')}</p>
        )}
        
        <a href="/properties" className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          ← Voltar
        </a>
      </div>
    </div>
  );
}