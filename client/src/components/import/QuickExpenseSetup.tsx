import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Predefined expense components for each property type
const PROPERTY_TEMPLATES = {
  'Condomínio Andalus': {
    description: 'Template para apartamentos no Condomínio Andalus (Málaga M07, Sevilha G07, Sevilha 307)',
    components: [
      { name: 'Taxa Condominial', category: 'utilities' },
      { name: 'Fundo de Reserva', category: 'maintenance' },
      { name: 'Taxa de Administração', category: 'management' },
      { name: 'Seguro Condomínio', category: 'insurance' },
      { name: 'Limpeza Áreas Comuns', category: 'maintenance' },
      { name: 'Portaria 24h', category: 'maintenance' },
      { name: 'Manutenção Elevadores', category: 'maintenance' },
      { name: 'Jardinagem', category: 'maintenance' },
      { name: 'Água Áreas Comuns', category: 'utilities' },
      { name: 'Energia Áreas Comuns', category: 'utilities' }
    ]
  },
  'MaxHaus 43R': {
    description: 'Template para MaxHaus 43R',
    components: [
      { name: 'Condomínio', category: 'utilities' },
      { name: 'IPTU', category: 'taxes' },
      { name: 'Taxa de Administração', category: 'management' },
      { name: 'Seguro Residencial', category: 'insurance' },
      { name: 'Internet/Wi-Fi', category: 'utilities' }
    ]
  },
  'Living Full': {
    description: 'Template para Living Full Faria Lima',
    components: [
      { name: 'Taxa Condominial', category: 'utilities' },
      { name: 'IPTU', category: 'taxes' },
      { name: 'Taxa de Administração', category: 'management' },
      { name: 'Água', category: 'utilities' },
      { name: 'Energia Elétrica', category: 'utilities' },
      { name: 'Gás', category: 'utilities' }
    ]
  }
};

// Mapping of properties to templates
const PROPERTY_TEMPLATE_MAPPING = {
  'Málaga M07': 'Condomínio Andalus',
  'Sevilha G07': 'Condomínio Andalus',
  'Sevilha 307': 'Condomínio Andalus',
  'MaxHaus 43R': 'MaxHaus 43R',
  'Living Full Faria Lima setor 1': 'Living Full'
};

interface QuickExpenseSetupProps {
  properties: Array<{
    id: number;
    name: string;
  }>;
}

export default function QuickExpenseSetup({ properties }: QuickExpenseSetupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [setupProgress, setSetupProgress] = useState<Record<number, 'pending' | 'success' | 'error'>>({});

  const setupExpensesMutation = useMutation({
    mutationFn: async (data: { propertyId: number; templateName: string }) => {
      const template = PROPERTY_TEMPLATES[data.templateName as keyof typeof PROPERTY_TEMPLATES];
      return apiRequest({
        endpoint: `/api/properties/${data.propertyId}/expense-components`,
        method: 'POST',
        body: { components: template.components }
      });
    },
    onSuccess: (_, variables) => {
      setSetupProgress(prev => ({ ...prev, [variables.propertyId]: 'success' }));
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${variables.propertyId}/expense-components`] });
    },
    onError: (_, variables) => {
      setSetupProgress(prev => ({ ...prev, [variables.propertyId]: 'error' }));
    }
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (data: { sourcePropertyId: number; targetPropertyIds: number[] }) => {
      return apiRequest({
        endpoint: `/api/properties/${data.sourcePropertyId}/copy-expense-template`,
        method: 'POST',
        body: { targetPropertyIds: data.targetPropertyIds }
      });
    },
    onSuccess: (result) => {
      toast({ 
        title: "Template copiado com sucesso!", 
        description: result.message 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    }
  });

  const handleSetupProperty = async (propertyId: number, propertyName: string) => {
    const templateName = PROPERTY_TEMPLATE_MAPPING[propertyName as keyof typeof PROPERTY_TEMPLATE_MAPPING];
    
    if (!templateName) {
      toast({
        title: "Template não encontrado",
        description: `Nenhum template configurado para ${propertyName}`,
        variant: "destructive"
      });
      return;
    }

    setSetupProgress(prev => ({ ...prev, [propertyId]: 'pending' }));
    await setupExpensesMutation.mutateAsync({ propertyId, templateName });
  };

  const handleCopyAndalusTemplate = async () => {
    // Find Málaga M07 as source
    const malagaProperty = properties.find(p => p.name === 'Málaga M07');
    if (!malagaProperty) {
      toast({
        title: "Erro",
        description: "Propriedade Málaga M07 não encontrada",
        variant: "destructive"
      });
      return;
    }

    // Find target properties (Sevilha G07 and Sevilha 307)
    const targetProperties = properties.filter(p => 
      p.name === 'Sevilha G07' || p.name === 'Sevilha 307'
    );

    if (targetProperties.length === 0) {
      toast({
        title: "Erro",
        description: "Propriedades do Condomínio Andalus não encontradas",
        variant: "destructive"
      });
      return;
    }

    await copyTemplateMutation.mutateAsync({
      sourcePropertyId: malagaProperty.id,
      targetPropertyIds: targetProperties.map(p => p.id)
    });
  };

  const getPropertiesByTemplate = (templateName: string) => {
    return properties.filter(p => 
      PROPERTY_TEMPLATE_MAPPING[p.name as keyof typeof PROPERTY_TEMPLATE_MAPPING] === templateName
    );
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Configuração Rápida de Despesas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração de Componentes de Despesas por Propriedade</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Configure automaticamente os componentes de despesas para cada propriedade com base em templates pré-definidos.
          </p>

          {/* Condomínio Andalus Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-blue-700">🏢 Condomínio Andalus</CardTitle>
              <p className="text-sm text-gray-600">
                Template compartilhado para os 3 apartamentos no mesmo condomínio
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getPropertiesByTemplate('Condomínio Andalus').map(property => (
                  <div key={property.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{property.name}</span>
                      {setupProgress[property.id] === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSetupProperty(property.id, property.name)}
                      disabled={setupExpensesMutation.isPending || setupProgress[property.id] === 'pending'}
                    >
                      {setupProgress[property.id] === 'pending' ? 'Configurando...' : 'Configurar Despesas'}
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <h4 className="font-medium mb-2">Componentes do Template:</h4>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TEMPLATES['Condomínio Andalus'].components.map((comp, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {comp.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={handleCopyAndalusTemplate}
                  disabled={copyTemplateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copyTemplateMutation.isPending 
                    ? 'Copiando template...' 
                    : 'Copiar template do Málaga M07 para Sevilha G07 e Sevilha 307'
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Other Properties */}
          {Object.entries(PROPERTY_TEMPLATES)
            .filter(([templateName]) => templateName !== 'Condomínio Andalus')
            .map(([templateName, template]) => (
              <Card key={templateName}>
                <CardHeader>
                  <CardTitle className="text-lg">{templateName}</CardTitle>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPropertiesByTemplate(templateName).map(property => (
                      <div key={property.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{property.name}</span>
                          {setupProgress[property.id] === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleSetupProperty(property.id, property.name)}
                          disabled={setupExpensesMutation.isPending || setupProgress[property.id] === 'pending'}
                        >
                          {setupProgress[property.id] === 'pending' ? 'Configurando...' : 'Configurar Despesas'}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Componentes do Template:</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.components.map((comp, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {comp.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

          <div className="flex justify-end">
            <Button onClick={() => setShowDialog(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}