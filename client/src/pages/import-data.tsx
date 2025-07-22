import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { Download, Upload, FileText, Home, ArrowRight } from 'lucide-react';

interface PropertyMapping {
  airbnbName: string;
  systemName: string;
  mapped: boolean;
}

const ImportDataPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('airbnb-payouts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>([
    { airbnbName: '1 Suite - Quintal privativo', systemName: 'Sevilha G07', mapped: true },
    { airbnbName: '1 Suite Wonderful Einstem Mourão', systemName: 'Sevilha 307', mapped: true },
    { airbnbName: '2 Quartos - Quintal Privativo', systemName: 'Málaga M07', mapped: true },
    { airbnbName: '2 quartos, maravilhoso, na Avenida Berna', systemName: 'MaxHaus 43R', mapped: true },
    { airbnbName: 'Studio Premium - Haddock Lobo', systemName: 'Next Haddock Lobo ap 33', mapped: true },
    { airbnbName: 'Seimbra Seaview Studio M07...', systemName: 'Seimbra ap 505- Portugal', mapped: true }
  ]);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    // Simular download do template
    toast({
      title: "Template baixado",
      description: "O template Excel foi baixado com sucesso.",
    });
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Simular processamento do arquivo
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Arquivo analisado",
        description: "O arquivo foi processado com sucesso. Verifique o mapeamento das propriedades.",
      });
    }, 2000);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    
    // Simular importação
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Importação concluída",
        description: "Os dados foram importados com sucesso para o sistema.",
      });
    }, 3000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Dados</h1>
          <p className="text-muted-foreground mt-2">
            Carregue seus dados de imóveis e transações via planilha Excel
          </p>
        </div>
        <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Baixar Template
        </Button>
      </div>

      {/* Importação Unificada do Airbnb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Importação Unificada do Airbnb
          </CardTitle>
          <CardDescription>
            Sistema Unificado: Analisa automaticamente payouts históricos do Airbnb. Remove apenas dados do período sendo importado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Importação</Label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airbnb-payouts">Dados Históricos (Payouts)</SelectItem>
                <SelectItem value="airbnb-reservations">Reservas</SelectItem>
                <SelectItem value="general-expenses">Despesas Gerais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Selecione o arquivo CSV do Airbnb</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button 
                onClick={handleAnalyzeFile} 
                disabled={!selectedFile || isProcessing}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {isProcessing ? 'Analisando...' : 'Analisar Arquivo'}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapeamento de Propriedades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Mapeamento de Propriedades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Nome no Airbnb</h4>
              </div>
              <div>
                <h4 className="font-medium mb-2">Nome no Sistema</h4>
              </div>
            </div>
            
            {propertyMappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{mapping.airbnbName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{mapping.systemName}</span>
                  {mapping.mapped && (
                    <Badge variant="secondary" className="ml-2">Mapeado</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleImport} 
              disabled={isProcessing || !selectedFile}
              className="w-full flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Importando...' : 'Importar Dados'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportDataPage;