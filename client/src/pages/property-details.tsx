import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/properties/${propertyId}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar imóvel");
      return response.json();
    },
    enabled: !!propertyId,
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (error) return <div className="p-8">Erro ao carregar imóvel</div>;
  if (!property) return <div className="p-8">Imóvel não encontrado</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{property.name}</h1>

      <div className="space-y-4">
        <p>
          <strong>Nickname:</strong> {property.nickname || "-"}
        </p>
        <p>
          <strong>Status:</strong> {property.status}
        </p>
        <p>
          <strong>Tipo:</strong> {property.type}
        </p>
        <p>
          <strong>Airbnb:</strong> {property.airbnbName || "-"}
        </p>

        {property.purchasePrice && (
          <p>
            <strong>Compra:</strong> R${" "}
            {property.purchasePrice.toLocaleString("pt-BR")}
          </p>
        )}

        {property.marketValue && (
          <p>
            <strong>Mercado:</strong> R${" "}
            {property.marketValue.toLocaleString("pt-BR")}
          </p>
        )}

        <a
          href="/properties"
          className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          ← Voltar
        </a>
      </div>
    </div>
  );
}
