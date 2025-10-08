import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pen, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params?.id;
  
  // Month selector for return rate
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/properties/${propertyId}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar imóvel");
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Return rate query
  const { data: returnRate, isLoading: isLoadingReturnRate } = useQuery({
    queryKey: ['/api/properties', propertyId, 'return-rate', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/properties/${propertyId}/return-rate/${month}/${year}`
      );
      if (!res.ok) throw new Error('Failed to fetch return rate');
      return res.json();
    },
    enabled: !!propertyId && !!selectedMonth,
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

  // Generate last 12 months for selector
  const getLast12Months = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return months;
  };

  // Return rate color coding
  const getReturnRateColor = (rate: number) => {
    if (rate > 0.5) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excelente', progress: 'bg-green-500' };
    if (rate >= 0.1) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Bom', progress: 'bg-yellow-500' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Atenção', progress: 'bg-red-500' };
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

          {/* Taxa de Retorno */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-700">
                Taxa de Retorno
              </h2>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]" data-testid="select-month-return-rate">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {getLast12Months().map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingReturnRate ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">Carregando...</div>
                </CardContent>
              </Card>
            ) : returnRate && returnRate.returnRate !== null ? (
              <Card className={getReturnRateColor(returnRate.returnRate).bg}>
                <CardHeader>
                  <CardTitle className="text-center">
                    <div className={`text-4xl font-bold ${getReturnRateColor(returnRate.returnRate).color}`} data-testid="text-return-rate-value">
                      {returnRate.returnRate.toFixed(2)}% ao mês
                    </div>
                    <div className="text-sm text-gray-600 mt-2" data-testid="text-return-rate-formula">
                      ({formatCurrency(returnRate.netProfit)} / {formatCurrency(returnRate.propertyValue)})
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Performance:</span>
                      <span className={`text-sm font-semibold ${getReturnRateColor(returnRate.returnRate).color}`} data-testid="text-return-rate-label">
                        {getReturnRateColor(returnRate.returnRate).label}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(returnRate.returnRate * 20, 100)} 
                      className="h-2"
                      data-testid="progress-return-rate"
                    />
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-xs text-gray-500">Receita</div>
                        <div className="text-sm font-semibold text-green-600" data-testid="text-monthly-revenue">
                          {formatCurrency(returnRate.monthlyRevenue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Despesas</div>
                        <div className="text-sm font-semibold text-red-600" data-testid="text-monthly-expenses">
                          {formatCurrency(returnRate.monthlyExpenses)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Lucro Líquido</div>
                        <div className="text-sm font-semibold text-blue-600" data-testid="text-net-profit">
                          {formatCurrency(returnRate.netProfit)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500" data-testid="text-no-data">
                    Sem dados para este mês
                  </div>
                </CardContent>
              </Card>
            )}
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
