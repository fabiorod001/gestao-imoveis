import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calculator, TrendingUp, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function IpcaCalculator() {
  const { toast } = useToast();
  const [initialValue, setInitialValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calculate, setCalculate] = useState(false);

  const { data: result, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/ipca/calculate', initialValue, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/ipca/calculate?value=${initialValue}&startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error('Failed to calculate IPCA');
      return res.json();
    },
    enabled: calculate && !!initialValue && !!startDate && !!endDate,
    onError: (err) => {
      toast({
        title: "Erro ao calcular IPCA",
        description: err instanceof Error ? err.message : "Erro desconhecido ao calcular correção",
        variant: "destructive",
      });
    },
  });

  const handleCalculate = () => {
    if (initialValue && startDate && endDate) {
      setCalculate(true);
      refetch();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/settings">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Calculator className="mr-3 h-6 w-6 text-blue-600" />
              Calculadora de Correção IPCA
            </CardTitle>
            <CardDescription>
              Calcule a correção monetária de valores pelo Índice de Preços ao Consumidor Amplo (IPCA)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial-value">Valor Inicial (R$)</Label>
                <Input
                  id="initial-value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  data-testid="input-initial-value"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial (Mês/Ano)</Label>
                <Input
                  id="start-date"
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data Final (Mês/Ano)</Label>
                <Input
                  id="end-date"
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={!initialValue || !startDate || !endDate || isLoading}
              className="w-full"
              data-testid="button-calculate"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isLoading ? "Calculando..." : "Calcular Correção"}
            </Button>

            {/* Error Display */}
            {error && calculate && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">
                  {error instanceof Error ? error.message : "Erro ao calcular IPCA. Verifique os dados e tente novamente."}
                </p>
              </div>
            )}

            {/* Results */}
            {result && calculate && (
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-lg font-semibold">Resultado</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">Valor Inicial</div>
                      <div className="text-2xl font-bold text-gray-700" data-testid="text-initial-result">
                        {formatCurrency(Number(initialValue))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">Valor Corrigido</div>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-corrected-value">
                        {formatCurrency(result.correctedValue || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">IPCA Acumulado</div>
                    <div className="text-xl font-semibold text-blue-600" data-testid="text-ipca-rate">
                      {result.ipcaRate ? `${(result.ipcaRate * 100).toFixed(2)}%` : "-"}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Período</div>
                    <div className="text-xl font-semibold text-purple-600" data-testid="text-period-months">
                      {result.months || 0} {result.months === 1 ? "mês" : "meses"}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Diferença</div>
                  <div className="text-xl font-bold text-yellow-700" data-testid="text-difference">
                    {formatCurrency((result.correctedValue || 0) - Number(initialValue))}
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Sobre o IPCA</h4>
              <p className="text-sm text-blue-800">
                O IPCA (Índice Nacional de Preços ao Consumidor Amplo) é calculado pelo IBGE e 
                representa a inflação oficial do Brasil. Use esta calculadora para corrigir valores 
                de contratos, aluguéis, salários e outros valores monetários ao longo do tempo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
