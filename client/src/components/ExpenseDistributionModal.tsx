import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import { Calculator, Plus, X } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  selected: boolean;
  quantity: number;
  unitValue: number;
  total: number;
}

interface ExpenseDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: any) => void;
  expenseType?: string;
}

const ExpenseDistributionModal: React.FC<ExpenseDistributionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseType = 'limpeza'
}) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalValue, setTotalValue] = useState('1500.00');
  const [supplier, setSupplier] = useState('Maurício');
  const [cpfCnpj, setCpfCnpj] = useState('000.000.000-00');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<Property[]>([
    { id: '1', name: 'MaxHaus 43R', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '2', name: 'Thera by You', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '3', name: 'Seimbra ap 505- Portugal', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '4', name: 'Next Haddock Lobo ap 33', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '5', name: 'Salas Brasil', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '6', name: 'Málaga M07', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '7', name: 'Sevilha G07', selected: false, quantity: 0, unitValue: 0, total: 0 },
    { id: '8', name: 'Sevilha 307', selected: false, quantity: 0, unitValue: 0, total: 0 }
  ]);
  const { toast } = useToast();

  const calculateDistribution = () => {
    const selectedProperties = properties.filter(p => p.selected);
    if (selectedProperties.length === 0) return;

    const total = parseFloat(totalValue) || 0;
    const valuePerProperty = total / selectedProperties.length;

    setProperties(prev => prev.map(property => {
      if (property.selected) {
        return {
          ...property,
          quantity: 1,
          unitValue: valuePerProperty,
          total: valuePerProperty
        };
      }
      return property;
    }));

    toast({
      title: "Distribuição calculada",
      description: `Valor distribuído igualmente entre ${selectedProperties.length} propriedades.`,
    });
  };

  const togglePropertySelection = (propertyId: string) => {
    setProperties(prev => prev.map(property => 
      property.id === propertyId 
        ? { ...property, selected: !property.selected, quantity: 0, unitValue: 0, total: 0 }
        : property
    ));
  };

  const updatePropertyValue = (propertyId: string, field: 'quantity' | 'unitValue', value: number) => {
    setProperties(prev => prev.map(property => {
      if (property.id === propertyId) {
        const updated = { ...property, [field]: value };
        updated.total = updated.quantity * updated.unitValue;
        return updated;
      }
      return property;
    }));
  };

  const getTotalDistributed = () => {
    return properties.reduce((sum, property) => sum + property.total, 0);
  };

  const getSelectedPropertiesCount = () => {
    return properties.filter(p => p.selected).length;
  };

  const handleSave = () => {
    const selectedProperties = properties.filter(p => p.selected && p.total > 0);
    
    if (selectedProperties.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma propriedade e defina os valores.",
        variant: "destructive"
      });
      return;
    }

    const expenseData = {
      paymentDate,
      totalValue: parseFloat(totalValue),
      supplier,
      cpfCnpj,
      description,
      expenseType,
      properties: selectedProperties,
      totalDistributed: getTotalDistributed()
    };

    onSave(expenseData);
    onClose();
    
    toast({
      title: "Despesa cadastrada",
      description: `Despesa de ${expenseType} distribuída entre ${selectedProperties.length} propriedades.`,
    });
  };

  const getExpenseTitle = () => {
    switch (expenseType) {
      case 'limpeza': return 'Cadastrar Despesas de Limpeza';
      case 'gestao': return 'Cadastrar Despesa de Gestão';
      default: return 'Cadastrar Despesa';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {getExpenseTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Pagamento</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00"
              />
              <span className="text-xs text-muted-foreground">Opcional</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição adicional (opcional)"
            />
          </div>

          {/* Seleção e Distribuição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecione as propriedades e defina os percentuais (opcional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Se você não definir percentuais, o valor será dividido igualmente. Se a soma for menor que 100%, o restante será distribuído proporcionalmente.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    onClick={calculateDistribution}
                    disabled={getSelectedPropertiesCount() === 0}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    Calcular Distribuição
                  </Button>
                  <Badge variant="outline">
                    {getSelectedPropertiesCount()} propriedades selecionadas
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Propriedade</div>
                    <div className="col-span-2 text-center">Quant.</div>
                    <div className="col-span-2 text-center">Valor Unit.</div>
                    <div className="col-span-3 text-center">Total</div>
                  </div>
                  
                  {properties.map((property) => (
                    <div key={property.id} className="grid grid-cols-12 gap-2 items-center py-2 border-b">
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={property.selected}
                          onChange={() => togglePropertySelection(property.id)}
                          className="rounded"
                        />
                      </div>
                      <div className="col-span-4">
                        <span className="text-sm">{property.name}</span>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={property.quantity}
                          onChange={(e) => updatePropertyValue(property.id, 'quantity', parseFloat(e.target.value) || 0)}
                          disabled={!property.selected}
                          className="text-center text-sm"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={property.unitValue.toFixed(2)}
                          onChange={(e) => updatePropertyValue(property.id, 'unitValue', parseFloat(e.target.value) || 0)}
                          disabled={!property.selected}
                          className="text-center text-sm"
                          min="0"
                        />
                      </div>
                      <div className="col-span-3 text-center">
                        <span className={`text-sm font-medium ${
                          property.total > 0 ? 'text-green-600' : 'text-muted-foreground'
                        }`}>
                          R$ {property.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Total Geral: 
                    <span className={`ml-2 ${
                      Math.abs(getTotalDistributed() - parseFloat(totalValue)) < 0.01 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      R$ {getTotalDistributed().toFixed(2)}
                    </span>
                  </div>
                  {Math.abs(getTotalDistributed() - parseFloat(totalValue)) >= 0.01 && (
                    <Badge variant="destructive">
                      Diferença: R$ {(parseFloat(totalValue) - getTotalDistributed()).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDistributionModal;