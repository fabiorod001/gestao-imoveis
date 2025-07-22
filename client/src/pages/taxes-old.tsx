import TaxPaymentForm from '@/components/taxes/TaxPaymentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, TrendingUp, Building2, DollarSign } from 'lucide-react';

export default function TaxesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Gestão de Impostos
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Sistema completo para cadastro e rateio de impostos (PIS, COFINS, CSLL, IRPJ) 
            com distribuição proporcional baseada no faturamento bruto das propriedades
          </p>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Rateio Proporcional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Impostos distribuídos automaticamente entre propriedades baseado na receita bruta do período de competência
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-600" />
                Multi-Propriedade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Selecione quais propriedades participarão do rateio para cada declaração de imposto
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Parcelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                CSLL e IRPJ podem ser parcelados em 3x (1/3 + 1/3+1% + 1/3+1%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tax Payment Form */}
        <TaxPaymentForm />

        {/* Instructions */}
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm text-amber-800">
              Como Funciona o Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-700">
              <div>
                <h4 className="font-semibold mb-2">Período de Competência</h4>
                <p>
                  O sistema calcula automaticamente o período de competência como o mês anterior à data de pagamento. 
                  Ex: Pagamento em 20/07/2025 → Competência: 01/06/2025 a 30/06/2025
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Rateio Proporcional</h4>
                <p>
                  Cada propriedade recebe um percentual do imposto proporcional à sua receita bruta no período de competência.
                  Ex: 40% da receita = 40% do imposto
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Parcelamento</h4>
                <p>
                  CSLL e IRPJ podem ser parcelados em 3 vezes, com juros de 1% nas duas últimas parcelas.
                  As parcelas são lançadas automaticamente nos meses subsequentes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Lançamento Automático</h4>
                <p>
                  Após o cadastro, os impostos são automaticamente lançados como despesas na categoria "Impostos" 
                  de cada propriedade participante.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}