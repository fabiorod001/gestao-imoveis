import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">RentManager</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Sistema completo de gestão financeira para múltiplos imóveis de aluguel com dashboard analítico e controle de acesso granular
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4"
            onClick={() => window.location.href = '/api/login'}
          >
            Começar Agora
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Controle Financeiro</CardTitle>
              <CardDescription>
                Gerencie receitas e despesas de todos os seus imóveis em um só lugar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Dashboard Analítico</CardTitle>
              <CardDescription>
                Visualizações e relatórios detalhados para tomada de decisões estratégicas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <CardTitle>Conversão de Moedas</CardTitle>
              <CardDescription>
                Integração automática com cotações do Banco Central para múltiplas moedas
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Funcionalidades Principais</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Gestão Completa de Imóveis</h3>
              <p className="text-gray-600">Cadastre até 100+ propriedades com status detalhados</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Receitas Automáticas</h3>
              <p className="text-gray-600">Integração com Airbnb para receitas de curto prazo</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Controle de Despesas</h3>
              <p className="text-gray-600">Condomínio, limpeza, manutenções e impostos</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Relatórios Customizáveis</h3>
              <p className="text-gray-600">Exportação para Excel/PDF com filtros avançados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
