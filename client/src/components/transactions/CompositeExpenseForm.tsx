import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ExpenseComponent {
  id?: number;
  name: string;
  category: string;
  amount: string;
  isActive: boolean;
}

interface CompositeExpenseFormProps {
  propertyId: number;
  onSuccess?: () => void;
}

const PREDEFINED_COMPONENTS = [
  { name: 'Taxa Condominial', category: 'utilities' },
  { name: 'Água', category: 'utilities' },
  { name: 'Energia', category: 'utilities' },
  { name: 'Gás', category: 'utilities' },
  { name: 'Taxa de Garagem', category: 'maintenance' },
  { name: 'Taxa de Limpeza', category: 'maintenance' },
  { name: 'Taxa de Segurança', category: 'maintenance' },
  { name: 'Fundo de Reserva', category: 'maintenance' },
];

export default function CompositeExpenseForm({ propertyId, onSuccess }: CompositeExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showComponentSetup, setShowComponentSetup] = useState(false);
  
  const [expenseData, setExpenseData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    cpfCnpj: ''
  });
  
  const [components, setComponents] = useState<ExpenseComponent[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ExpenseComponent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load property expense components
  const { data: propertyComponents = [] } = useQuery({
    queryKey: [`/api/properties/${propertyId}/expense-components`],
    enabled: showForm || showComponentSetup,
  });

  // Initialize components from property data
  useEffect(() => {
    if (!showForm && !showComponentSetup) {
      // Clear when closed
      setComponents([]);
      setAvailableComponents([]);
      setIsInitialized(false);
      return;
    }
    
    // Only initialize once when dialog opens
    if (isInitialized) return;
    
    if (!propertyComponents) return;
    
    // Initialize components when opening the dialog
    if (propertyComponents.length > 0) {
      setAvailableComponents(propertyComponents);
      if (showForm) {
        const activeComponents = propertyComponents
          .filter((c: any) => c.isActive)
          .map((c: any) => ({
            ...c,
            amount: ''
          }));
        setComponents(activeComponents);
      }
    } else {
      // Use predefined components if none exist
      const defaultComponents = PREDEFINED_COMPONENTS.map(comp => ({
        ...comp,
        amount: '',
        isActive: true
      }));
      setAvailableComponents(defaultComponents);
      if (showForm) {
        setComponents(defaultComponents);
      }
    }
    
    setIsInitialized(true);
  }, [showForm, showComponentSetup, propertyComponents, isInitialized]);

  const saveComponentsMutation = useMutation({
    mutationFn: async (componentList: ExpenseComponent[]) => {
      const response = await apiRequest(
        `/api/properties/${propertyId}/expense-components`,
        'POST',
        { components: componentList }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Componentes salvos com sucesso!" });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/expense-components`] });
      setShowComponentSetup(false);
    }
  });

  const createCompositeExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        '/api/transactions/composite',
        'POST',
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Despesa composta criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/transactions`] });
      setShowForm(false);
      resetForm();
      onSuccess?.();
    }
  });

  const resetForm = () => {
    setExpenseData({
      description: '',
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      cpfCnpj: ''
    });
    // Don't reset components here as it can cause infinite loops
    // Components will be reset when the form is closed and reopened
  };

  const addNewComponent = () => {
    setAvailableComponents(prev => [...prev, {
      name: '',
      category: 'utilities',
      amount: '',
      isActive: true
    }]);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    setComponents(prev => prev.map((comp, i) => 
      i === index ? { ...comp, [field]: value } : comp
    ));
  };

  const updateAvailableComponent = (index: number, field: string, value: any) => {
    setAvailableComponents(prev => prev.map((comp, i) => 
      i === index ? { ...comp, [field]: value } : comp
    ));
  };

  const removeAvailableComponent = (index: number) => {
    setAvailableComponents(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const filledComponents = components.filter(comp => comp.amount && parseFloat(comp.amount) > 0);
    
    if (filledComponents.length === 0) {
      toast({ 
        title: "Erro", 
        description: "Adicione pelo menos um componente com valor",
        variant: "destructive" 
      });
      return;
    }

    const totalAmount = filledComponents.reduce((sum, comp) => sum + parseFloat(comp.amount), 0);

    createCompositeExpenseMutation.mutate({
      propertyId,
      description: expenseData.description || `Condomínio - ${new Date(expenseData.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      date: expenseData.date,
      supplier: expenseData.supplier,
      cpfCnpj: expenseData.cpfCnpj,
      totalAmount,
      components: filledComponents
    });
  };

  return (
    <>
      {/* Main Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild>
          <Button className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Despesa Composta (Condomínio)
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Despesa Composta - Condomínio
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComponentSetup(true)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Configurar
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="composite-description">Descrição</Label>
                <Input
                  id="composite-description"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Condomínio junho 2025"
                />
              </div>
              <div>
                <Label htmlFor="composite-date">Data</Label>
                <Input
                  id="composite-date"
                  type="date"
                  value={expenseData.date}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="composite-supplier">Fornecedor</Label>
                <Input
                  id="composite-supplier"
                  value={expenseData.supplier}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Nome do condomínio"
                />
              </div>
              <div>
                <Label htmlFor="composite-cpf">CNPJ</Label>
                <Input
                  id="composite-cpf"
                  value={expenseData.cpfCnpj}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            {/* Components */}
            <div>
              <Label className="text-base font-semibold">Componentes da Despesa</Label>
              <div className="space-y-3 mt-2">
                {components.map((component, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{component.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({component.category})</span>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={component.amount}
                        onChange={(e) => updateComponent(index, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total:</span>
                  <span>
                    R$ {components
                      .reduce((sum, comp) => sum + (parseFloat(comp.amount) || 0), 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createCompositeExpenseMutation.isPending}
              >
                {createCompositeExpenseMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Component Setup Dialog */}
      <Dialog open={showComponentSetup} onOpenChange={setShowComponentSetup}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Componentes da Despesa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configure quais componentes aparecem no formulário de despesas compostas para esta propriedade.
            </p>
            
            <div className="space-y-3">
              {availableComponents.map((component, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome do componente"
                      value={component.name}
                      onChange={(e) => updateAvailableComponent(index, 'name', e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border rounded text-sm"
                      value={component.category}
                      onChange={(e) => updateAvailableComponent(index, 'category', e.target.value)}
                    >
                      <option value="utilities">Utilidades</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="taxes">Taxas</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAvailableComponent(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button variant="outline" onClick={addNewComponent} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Componente
            </Button>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowComponentSetup(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => saveComponentsMutation.mutate(availableComponents)}
                disabled={saveComponentsMutation.isPending}
              >
                {saveComponentsMutation.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}