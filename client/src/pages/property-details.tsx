import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pen } from "lucide-react";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
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

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setLocation("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Button onClick={() => setLocation(`/properties/${propertyId}/edit`)}>
            <Pen className="h-4 w-4 mr-2" />
            Editar Propriedade
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h1 className="text-3xl font-bold">{property.name}</h1>

          {/* Informações Básicas */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Informações Básicas
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Apelido:</span>
                <p className="text-gray-600">{property.nickname || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Nome Airbnb:</span>
                <p className="text-gray-600">{property.airbnbName || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <p className="text-gray-600">{property.status}</p>
              </div>
              <div>
                <span className="font-medium">Tipo:</span>
                <p className="text-gray-600">{property.type}</p>
              </div>
              <div>
                <span className="font-medium">Tipo de Aluguel:</span>
                <p className="text-gray-600">{property.rentalType || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Matrícula:</span>
                <p className="text-gray-600">
                  {property.registrationNumber || "-"}
                </p>
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Endereço
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <span className="font-medium">Logradouro:</span>
                <p className="text-gray-600">{property.street || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Número:</span>
                <p className="text-gray-600">{property.number || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Torre:</span>
                <p className="text-gray-600">{property.tower || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Unidade:</span>
                <p className="text-gray-600">{property.unit || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Bairro:</span>
                <p className="text-gray-600">{property.neighborhood || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Cidade:</span>
                <p className="text-gray-600">{property.city || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Estado:</span>
                <p className="text-gray-600">{property.state || "-"}</p>
              </div>
              <div>
                <span className="font-medium">CEP:</span>
                <p className="text-gray-600">{property.zipCode || "-"}</p>
              </div>
              <div>
                <span className="font-medium">Condomínio:</span>
                <p className="text-gray-600">
                  {property.condominiumName || "-"}
                </p>
              </div>
              <div>
                <span className="font-medium">Código IPTU:</span>
                <p className="text-gray-600">{property.iptuCode || "-"}</p>
              </div>
            </div>
          </section>

          {/* Características */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Características
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Quartos:</span>
                <p className="text-gray-600">{property.bedrooms || 0}</p>
              </div>
              <div>
                <span className="font-medium">Banheiros:</span>
                <p className="text-gray-600">{property.bathrooms || 0}</p>
              </div>
              <div>
                <span className="font-medium">Área:</span>
                <p className="text-gray-600">
                  {property.area ? `${property.area} m²` : "-"}
                </p>
              </div>
            </div>
          </section>

          {/* Valores de Compra */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Valores de Compra
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Valor de Compra:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.purchasePrice)}
                </p>
              </div>
              <div>
                <span className="font-medium">Data da Compra:</span>
                <p className="text-gray-600">
                  {formatDate(property.purchaseDate)}
                </p>
              </div>
              <div>
                <span className="font-medium">Comissão:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.commissionValue)}
                </p>
              </div>
              <div>
                <span className="font-medium">Taxas e Registro:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.taxesAndRegistration)}
                </p>
              </div>
              <div>
                <span className="font-medium">Reforma e Decoração:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.renovationAndDecoration)}
                </p>
              </div>
              <div>
                <span className="font-medium">Outros Valores:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.otherInitialValues)}
                </p>
              </div>
            </div>
          </section>

          {/* Financiamento */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Financiamento
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Valor Financiado:</span>
                <p className="text-gray-600">
                  {formatCurrency(property.financingAmount)}
                </p>
              </div>
              <div>
                <span className="font-medium">Quitado:</span>
                <p className="text-gray-600">
                  {property.isFullyPaid ? "Sim" : "Não"}
                </p>
              </div>
            </div>
          </section>

          {/* Valor de Mercado */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              Valor de Mercado
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Valor Estimado:</span>
                <p className="text-gray-600 text-lg font-semibold">
                  {formatCurrency(property.marketValue)}
                </p>
              </div>
              <div>
                <span className="font-medium">Data da Avaliação:</span>
                <p className="text-gray-600">
                  {formatDate(property.marketValueDate)}
                </p>
              </div>
            </div>
          </section>

          {/* Descrição */}
          {property.description && (
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700">
                Descrição
              </h2>
              <p className="text-gray-600">{property.description}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
