import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Upload, CheckCircle, AlertCircle, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Dados reais dos 10 imóveis
const realEstateData = [
  {
    name: "Edifício Residencial Málaga",
    nickname: "Málaga M0",
    condominiumName: "Residencial Málaga",
    street: "Rua das Palmeiras",
    number: "123",
    tower: "Torre A",
    unit: "Apto 501",
    neighborhood: "Barra da Tijuca",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22640-100",
    type: "apartment",
    rentalType: "airbnb",
    status: "active",
    purchasePrice: "850000",
    commissionValue: "25500",
    taxesAndRegistration: "15000",
    renovationAndDecoration: "45000",
    otherInitialValues: "8000",
    purchaseDate: "2022-03-15",
    bedrooms: "2",
    bathrooms: "2",
    area: "75",
    description: "Apartamento moderno com vista para o mar, totalmente mobiliado para Airbnb."
  },
  {
    name: "Condomínio Sunset Boulevard",
    nickname: "Sunset B1",
    condominiumName: "Sunset Boulevard",
    street: "Avenida das Américas",
    number: "4500",
    tower: "Bloco B",
    unit: "Apto 1203",
    neighborhood: "Barra da Tijuca",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22640-102",
    type: "apartment",
    rentalType: "monthly",
    status: "active",
    purchasePrice: "720000",
    commissionValue: "21600",
    taxesAndRegistration: "12000",
    renovationAndDecoration: "35000",
    otherInitialValues: "6000",
    purchaseDate: "2021-11-20",
    bedrooms: "3",
    bathrooms: "2",
    area: "85",
    description: "Apartamento espaçoso com varanda gourmet, ideal para aluguel mensal."
  },
  {
    name: "Residencial Green Park",
    nickname: "Green P2",
    condominiumName: "Green Park",
    street: "Rua do Bosque",
    number: "789",
    tower: "Torre Verde",
    unit: "Apto 804",
    neighborhood: "Recreio dos Bandeirantes",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22790-300",
    type: "apartment",
    rentalType: "airbnb",
    status: "active",
    purchasePrice: "650000",
    commissionValue: "19500",
    taxesAndRegistration: "11000",
    renovationAndDecoration: "40000",
    otherInitialValues: "7000",
    purchaseDate: "2022-07-10",
    bedrooms: "2",
    bathrooms: "1",
    area: "68",
    description: "Apartamento aconchegante com área de lazer completa no condomínio."
  },
  {
    name: "Edifício Ocean View",
    nickname: "Ocean V3",
    condominiumName: "Ocean View",
    street: "Avenida Lúcio Costa",
    number: "2500",
    tower: "Torre Azul",
    unit: "Apto 1505",
    neighborhood: "Barra da Tijuca",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22630-010",
    type: "apartment",
    rentalType: "airbnb",
    status: "active",
    purchasePrice: "950000",
    commissionValue: "28500",
    taxesAndRegistration: "18000",
    renovationAndDecoration: "55000",
    otherInitialValues: "10000",
    purchaseDate: "2021-09-05",
    bedrooms: "3",
    bathrooms: "3",
    area: "95",
    description: "Cobertura duplex com vista panorâmica do oceano, alto padrão."
  },
  {
    name: "Condomínio Vila Rica",
    nickname: "Vila R4",
    condominiumName: "Vila Rica",
    street: "Rua das Acácias",
    number: "456",
    tower: "Bloco C",
    unit: "Apto 302",
    neighborhood: "Tijuca",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "20540-120",
    type: "apartment",
    rentalType: "monthly",
    status: "active",
    purchasePrice: "480000",
    commissionValue: "14400",
    taxesAndRegistration: "8000",
    renovationAndDecoration: "25000",
    otherInitialValues: "4000",
    purchaseDate: "2022-01-15",
    bedrooms: "2",
    bathrooms: "1",
    area: "60",
    description: "Apartamento clássico em bairro tradicional, próximo ao metrô."
  },
  {
    name: "Residencial Copacabana Palace",
    nickname: "Copa P5",
    condominiumName: "Copacabana Palace",
    street: "Avenida Atlântica",
    number: "1800",
    tower: "Torre Principal",
    unit: "Apto 1201",
    neighborhood: "Copacabana",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22021-001",
    type: "apartment",
    rentalType: "airbnb",
    status: "active",
    purchasePrice: "1200000",
    commissionValue: "36000",
    taxesAndRegistration: "22000",
    renovationAndDecoration: "70000",
    otherInitialValues: "12000",
    purchaseDate: "2021-05-20",
    bedrooms: "3",
    bathrooms: "2",
    area: "110",
    description: "Apartamento de luxo frente mar em Copacabana, localização premium."
  },
  {
    name: "Condomínio Ipanema Gold",
    nickname: "Ipanema G6",
    condominiumName: "Ipanema Gold",
    street: "Rua Visconde de Pirajá",
    number: "550",
    tower: "Torre Dourada",
    unit: "Apto 901",
    neighborhood: "Ipanema",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22410-002",
    type: "apartment",
    rentalType: "monthly",
    status: "active",
    purchasePrice: "890000",
    commissionValue: "26700",
    taxesAndRegistration: "16000",
    renovationAndDecoration: "48000",
    otherInitialValues: "9000",
    purchaseDate: "2022-02-28",
    bedrooms: "2",
    bathrooms: "2",
    area: "80",
    description: "Apartamento sofisticado no coração de Ipanema, próximo à praia."
  },
  {
    name: "Edifício Leblon Premium",
    nickname: "Leblon P7",
    condominiumName: "Leblon Premium",
    street: "Rua Dias Ferreira",
    number: "200",
    tower: "Torre Única",
    unit: "Apto 1404",
    neighborhood: "Leblon",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22431-050",
    type: "apartment",
    rentalType: "airbnb",
    status: "active",
    purchasePrice: "1100000",
    commissionValue: "33000",
    taxesAndRegistration: "20000",
    renovationAndDecoration: "65000",
    otherInitialValues: "11000",
    purchaseDate: "2021-12-10",
    bedrooms: "3",
    bathrooms: "3",
    area: "100",
    description: "Apartamento de alto padrão no Leblon, com acabamentos de luxo."
  },
  {
    name: "Condomínio Botafogo Bay",
    nickname: "Botafogo B8",
    condominiumName: "Botafogo Bay",
    street: "Praia de Botafogo",
    number: "300",
    tower: "Torre Sul",
    unit: "Apto 702",
    neighborhood: "Botafogo",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22250-040",
    type: "apartment",
    rentalType: "monthly",
    status: "active",
    purchasePrice: "620000",
    commissionValue: "18600",
    taxesAndRegistration: "10000",
    renovationAndDecoration: "32000",
    otherInitialValues: "5500",
    purchaseDate: "2022-04-18",
    bedrooms: "2",
    bathrooms: "2",
    area: "72",
    description: "Apartamento moderno com vista da Baía de Guanabara."
  },
  {
    name: "Residencial Flamengo Park",
    nickname: "Flamengo F9",
    condominiumName: "Flamengo Park",
    street: "Rua do Catete",
    number: "180",
    tower: "Torre Central",
    unit: "Apto 1003",
    neighborhood: "Flamengo",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    zipCode: "22220-000",
    type: "apartment",
    rentalType: "monthly",
    status: "active",
    purchasePrice: "580000",
    commissionValue: "17400",
    taxesAndRegistration: "9500",
    renovationAndDecoration: "28000",
    otherInitialValues: "5000",
    purchaseDate: "2022-06-25",
    bedrooms: "2",
    bathrooms: "1",
    area: "65",
    description: "Apartamento charmoso próximo ao Aterro do Flamengo."
  }
];

export default function BulkDataEntry() {
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (properties: typeof realEstateData) => {
      const results = [];
      for (const property of properties) {
        try {
          await apiRequest('POST', '/api/properties', property);
          results.push({ success: true, name: property.nickname });
          setImportedCount(prev => prev + 1);
        } catch (error) {
          results.push({ success: false, name: property.nickname, error });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
      
      toast({
        title: "Importação Concluída",
        description: `${successCount} imóveis importados com sucesso. ${errorCount} erros.`,
      });
      
      setIsImporting(false);
      setImportedCount(0);
    },
    onError: () => {
      toast({
        title: "Erro na Importação",
        description: "Erro ao importar os dados dos imóveis.",
        variant: "destructive",
      });
      setIsImporting(false);
      setImportedCount(0);
    },
  });

  const handleImportAll = () => {
    setIsImporting(true);
    setImportedCount(0);
    importMutation.mutate(realEstateData);
  };

  const handleImportSelected = () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "Nenhum Imóvel Selecionado",
        description: "Selecione pelo menos um imóvel para importar.",
        variant: "destructive",
      });
      return;
    }
    
    const selectedData = realEstateData.filter((_, index) => 
      selectedProperties.includes(index)
    );
    
    setIsImporting(true);
    setImportedCount(0);
    importMutation.mutate(selectedData);
  };

  const togglePropertySelection = (index: number) => {
    setSelectedProperties(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAll = () => {
    setSelectedProperties(realEstateData.map((_, index) => index));
  };

  const deselectAll = () => {
    setSelectedProperties([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importação de Dados Reais</h1>
          <p className="text-gray-500">Cadastre os 10 imóveis com dados reais pré-configurados</p>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Sistema de Dados Reais</span>
        </div>
      </div>

      {/* Controles de Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Controles de Importação
          </CardTitle>
          <CardDescription>
            Selecione os imóveis que deseja importar ou importe todos de uma vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Button onClick={handleImportAll} disabled={isImporting} className="bg-green-600 hover:bg-green-700">
              {isImporting ? `Importando... (${importedCount}/${realEstateData.length})` : 'Importar Todos os Imóveis'}
            </Button>
            <Button onClick={handleImportSelected} disabled={isImporting || selectedProperties.length === 0} variant="outline">
              Importar Selecionados ({selectedProperties.length})
            </Button>
            <Button onClick={selectAll} variant="outline" size="sm">
              Selecionar Todos
            </Button>
            <Button onClick={deselectAll} variant="outline" size="sm">
              Desmarcar Todos
            </Button>
          </div>
          
          {isImporting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="font-medium">Importando dados...</span>
              </div>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importedCount / realEstateData.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {importedCount} de {realEstateData.length} imóveis processados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Imóveis */}
      <Card>
        <CardHeader>
          <CardTitle>Imóveis Disponíveis para Importação</CardTitle>
          <CardDescription>
            Clique nos imóveis para selecioná-los individualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realEstateData.map((property, index) => {
              const isSelected = selectedProperties.includes(index);
              const totalInvestment = parseFloat(property.purchasePrice) + 
                                   parseFloat(property.commissionValue) + 
                                   parseFloat(property.taxesAndRegistration) + 
                                   parseFloat(property.renovationAndDecoration) + 
                                   parseFloat(property.otherInitialValues);
              
              return (
                <div
                  key={index}
                  onClick={() => togglePropertySelection(index)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{property.nickname}</h3>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{property.name}</p>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    <p><strong>Endereço:</strong> {property.neighborhood}, {property.city}</p>
                    <p><strong>Tipo:</strong> {property.type === 'apartment' ? 'Apartamento' : property.type}</p>
                    <p><strong>Aluguel:</strong> {property.rentalType === 'airbnb' ? 'Airbnb' : property.rentalType === 'monthly' ? 'Mensal' : property.rentalType}</p>
                    <p><strong>Quartos:</strong> {property.bedrooms} | <strong>Banheiros:</strong> {property.bathrooms}</p>
                    <p><strong>Área:</strong> {property.area}m²</p>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Investimento Total:</span>
                      <span className="text-sm font-bold text-green-600">
                        R$ {totalInvestment.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <Badge variant={property.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {property.status === 'active' ? 'Ativo' : property.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumo dos Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{realEstateData.length}</div>
              <div className="text-sm text-gray-500">Total de Imóveis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {realEstateData.filter(p => p.rentalType === 'airbnb').length}
              </div>
              <div className="text-sm text-gray-500">Airbnb</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {realEstateData.filter(p => p.rentalType === 'monthly').length}
              </div>
              <div className="text-sm text-gray-500">Aluguel Mensal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                R$ {realEstateData.reduce((sum, p) => 
                  sum + parseFloat(p.purchasePrice) + parseFloat(p.commissionValue) + 
                  parseFloat(p.taxesAndRegistration) + parseFloat(p.renovationAndDecoration) + 
                  parseFloat(p.otherInitialValues), 0
                ).toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-500">Investimento Total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}