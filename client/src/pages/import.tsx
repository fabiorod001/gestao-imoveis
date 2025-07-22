import Layout from "@/components/layout/Layout";
import ExcelImport from "@/components/import/ExcelImport";
import QuickPropertySetup from "@/components/import/QuickPropertySetup";
import HistoricalDataImport from "@/components/import/HistoricalDataImport";
import DataTransformationGuide from "@/components/import/DataTransformationGuide";
import DataCleanup from "@/components/import/DataCleanup";
import SimpleFormatImport from "@/components/import/SimpleFormatImport";
import HorizontalFormatImport from "@/components/import/HorizontalFormatImport";
import AirbnbImport from "@/components/import/AirbnbImport";

import QuickExpenseSetup from "@/components/import/QuickExpenseSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function Import() {
  // Load properties for expense setup
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    select: (data: any[]) => data.map(p => ({ id: p.id, name: p.name }))
  });
  const downloadTemplate = () => {
    // Create a sample Excel template for users to follow
    const templateData = {
      Imoveis: [
        {
          nome: "Apartamento Centro",
          endereco: "Rua das Flores, 123 - Centro",
          tipo: "apartment",
          status: "active",
          valor_aluguel: 1500,
          moeda: "BRL"
        },
        {
          nome: "Casa Jardim",
          endereco: "Av. das Palmeiras, 456 - Jardim",
          tipo: "house",
          status: "active",
          valor_aluguel: 2500,
          moeda: "BRL"
        }
      ],
      Transacoes: [
        {
          imovel_nome: "Apartamento Centro",
          tipo: "revenue",
          categoria: "rent",
          descricao: "Aluguel Janeiro 2025",
          valor: 1500,
          data: "2025-01-15",
          moeda: "BRL"
        },
        {
          imovel_nome: "Casa Jardim",
          tipo: "expense",
          categoria: "maintenance",
          descricao: "Reparo encanamento",
          valor: 300,
          data: "2025-01-20",
          moeda: "BRL"
        }
      ]
    };

    // This would ideally create and download an Excel file
    // For now, we'll show the user the expected format
    console.log("Template data:", templateData);
    alert("Template em desenvolvimento. Use o formato mostrado na interface como referência.");
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importar Dados</h1>
            <p className="text-muted-foreground">
              Carregue seus dados de imóveis e transações via planilha Excel
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Template
          </Button>
        </div>

        <div className="space-y-8">
          {/* Importação Unificada do Airbnb - HISTÓRICO E FUTURO */}
          <AirbnbImport />
          
          {/* Formato Horizontal - ESPECÍFICO para Sevilha */}
          <HorizontalFormatImport />
          
          {/* Importação Histórica - Destaque Principal */}
          <HistoricalDataImport />
          
          {/* Formato Simples - RECOMENDADO para novos uploads */}
          <SimpleFormatImport />
          
          {/* Guia de Transformação */}
          <DataTransformationGuide />
          
          {/* Outras opções */}
          <div className="grid gap-8 md:grid-cols-2">
            <QuickPropertySetup />
            <ExcelImport />
          </div>
          
          {/* Configuração de Despesas */}
          <div className="grid gap-8">
            <QuickExpenseSetup properties={properties} />
          </div>
          
          {/* Limpeza de Dados */}
          <DataCleanup />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Instruções de Uso
              </CardTitle>
              <CardDescription>
                Como preparar sua planilha para importação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Estrutura da Planilha</h4>
                <p className="text-sm text-muted-foreground">
                  Sua planilha deve ter duas abas: <strong>"Imoveis"</strong> e <strong>"Transacoes"</strong>
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Aba "Imoveis"</h4>
                <div className="bg-muted/50 p-3 rounded text-sm">
                  <p><strong>Colunas obrigatórias:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>nome - Nome do imóvel</li>
                    <li>endereco - Endereço completo</li>
                    <li>tipo - apartment, house, ou commercial</li>
                    <li>status - active, inactive, decoration, financing</li>
                    <li>valor_aluguel - Valor do aluguel (número)</li>
                    <li>moeda - BRL, EUR, USD</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Aba "Transacoes"</h4>
                <div className="bg-muted/50 p-3 rounded text-sm">
                  <p><strong>Colunas obrigatórias:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>imovel_nome - Nome exato do imóvel</li>
                    <li>tipo - revenue ou expense</li>
                    <li>categoria - rent, deposit, maintenance, etc.</li>
                    <li>descricao - Descrição da transação</li>
                    <li>valor - Valor (número positivo)</li>
                    <li>data - Data no formato AAAA-MM-DD</li>
                    <li>moeda - BRL, EUR, USD</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">4. Dicas Importantes</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• O nome do imóvel nas transações deve ser idêntico ao da aba Imoveis</li>
                  <li>• Use pontos para casas decimais (ex: 1500.50)</li>
                  <li>• Datas devem estar no formato AAAA-MM-DD</li>
                  <li>• Arquivo máximo: 10MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}