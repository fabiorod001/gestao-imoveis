import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
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
      <Link href="/properties">
        <Button>← Voltar</Button>
      </Link>
      
      <h1 className="text-3xl font-bold mt-6 mb-4">{property.name}</h1>
      
      <div className="space-y-2">
        <p><strong>Nickname:</strong> {property.nickname || '-'}</p>
        <p><strong>Status:</strong> {property.status}</p>
        <p><strong>Tipo:</strong> {property.type}</p>
        <p><strong>Airbnb:</strong> {property.airbnb_name || '-'}</p>
        <p><strong>Compra:</strong> {property.purchase_price?.toLocaleString('pt-BR') || '-'}</p>
        <p><strong>Mercado:</strong> {property.market_value?.toLocaleString('pt-BR') || '-'}</p>
      </div>
    </div>
  );
}
