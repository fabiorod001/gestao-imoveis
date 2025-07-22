import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Property } from "@/types";
import {
  Dialog as PropertyDialog,
  DialogContent as PropertyDialogContent,
  DialogHeader as PropertyDialogHeader,
  DialogTitle as PropertyDialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConsolidatedExpenseTable from './ConsolidatedExpenseTable';

const cleaningFormSchema = z.object({
  paymentDate: z.date({
    required_error: "Data de pagamento é obrigatória",
  }),
  properties: z.array(z.object({
    propertyId: z.number(),
    propertyName: z.string(),
    quantity: z.number().nullable(),
    unitValue: z.number().nullable(),
    total: z.number()
  })).refine(
    (properties) => properties.some(p => p.quantity && p.unitValue && p.total > 0),
    { message: "Pelo menos uma propriedade deve ter limpezas cadastradas" }
  )
});

type CleaningFormData = z.infer<typeof cleaningFormSchema>;

interface CleaningExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CleaningExpenseForm({ open, onOpenChange }: CleaningExpenseFormProps) {
  const { toast } = useToast();
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [propertyData, setPropertyData] = useState<{
    [key: number]: { quantity: string; unitValue: string; total: number }
  }>({});
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);

  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  const form = useForm<CleaningFormData>({
    resolver: zodResolver(cleaningFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      properties: []
    }
  });

  // Initialize with active properties when dialog opens
  useEffect(() => {
    if (open && allProperties.length > 0) {
      const activePropertyIds = allProperties
        .filter(p => p.status === 'active')
        .map(p => p.id);
      setSelectedProperties(activePropertyIds);
      
      // Initialize property data
      const initialData: typeof propertyData = {};
      activePropertyIds.forEach(id => {
        initialData[id] = { quantity: '', unitValue: '', total: 0 };
      });
      setPropertyData(initialData);
    }
  }, [open, allProperties]);

  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties(prev => {
      const newSelection = prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId];
      
      // Update property data
      if (!prev.includes(propertyId)) {
        setPropertyData(current => ({
          ...current,
          [propertyId]: { quantity: '', unitValue: '', total: 0 }
        }));
      }
      
      return newSelection;
    });
  };

  const handleQuantityChange = (propertyId: number, value: string) => {
    const quantity = value === '' ? '' : value;
    setPropertyData(current => {
      const unitValue = current[propertyId]?.unitValue || '';
      const numQuantity = parseFloat(quantity) || 0;
      const numUnitValue = parseFloat(unitValue.replace(/\./g, '').replace(',', '.')) || 0;
      const total = numQuantity * numUnitValue;
      
      return {
        ...current,
        [propertyId]: {
          ...current[propertyId],
          quantity,
          total
        }
      };
    });
  };

  const handleUnitValueChange = (propertyId: number, value: string) => {
    // Allow only numbers, dots and commas
    const sanitized = value.replace(/[^\d.,]/g, '');
    
    setPropertyData(current => {
      const quantity = current[propertyId]?.quantity || '';
      const numQuantity = parseFloat(quantity) || 0;
      const numUnitValue = parseFloat(sanitized.replace(/\./g, '').replace(',', '.')) || 0;
      const total = numQuantity * numUnitValue;
      
      return {
        ...current,
        [propertyId]: {
          ...current[propertyId],
          unitValue: sanitized,
          total
        }
      };
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const calculateGrandTotal = () => {
    return Object.values(propertyData).reduce((sum, data) => sum + data.total, 0);
  };

  const createMutation = useMutation({
    mutationFn: async (data: CleaningFormData) => {
      const response = await fetch('/api/expenses/cleaning-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: data.paymentDate,
          items: data.properties
            .filter(p => p.quantity && p.unitValue && p.total > 0)
            .map(p => ({
              propertyId: p.propertyId,
              quantity: p.quantity,
              unitValue: p.unitValue,
              total: p.total
            }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar despesas de limpeza');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({
        title: "Sucesso",
        description: "Despesas de limpeza cadastradas com sucesso",
      });
      onOpenChange(false);
      form.reset();
      
      // Reset property data
      const initialData: typeof propertyData = {};
      selectedProperties.forEach(id => {
        initialData[id] = { quantity: '', unitValue: '', total: 0 };
      });
      setPropertyData(initialData);
      setDataUpdateTrigger(prev => prev + 1);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: CleaningFormData) => {
    // Prepare properties data
    const properties = selectedProperties.map(propertyId => {
      const property = allProperties.find(p => p.id === propertyId);
      const data = propertyData[propertyId];
      return {
        propertyId,
        propertyName: property?.name || '',
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unitValue: data.unitValue ? parseFloat(data.unitValue.replace(/\./g, '').replace(',', '.')) : null,
        total: data.total
      };
    });

    createMutation.mutate({
      ...data,
      properties
    });
  };

  const selectedPropertiesList = allProperties.filter(p => selectedProperties.includes(p.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="cleaning-dialog-description">
          <DialogHeader>
            <DialogTitle>Cadastrar Despesas de Limpeza</DialogTitle>
            <p id="cleaning-dialog-description" className="sr-only">
              Formulário para cadastrar despesas de limpeza por propriedade
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-end gap-4">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Data de Pagamento</FormLabel>
                      <FormControl>
                        <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setPaymentDateOpen(false);
                              }}
                              locale={ptBR}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPropertySelector(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Imóveis
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="grid grid-cols-[2fr,1fr,1.5fr,1.5fr] gap-2 mb-2 px-1 font-medium text-sm">
                  <div>Propriedade</div>
                  <div className="text-center">Quant.</div>
                  <div className="text-right">Valor Unit.</div>
                  <div className="text-right">Total</div>
                </div>

                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-2">
                    {selectedPropertiesList.map(property => (
                      <div key={property.id} className="grid grid-cols-[2fr,1fr,1.5fr,1.5fr] gap-2 items-center">
                        <div className="text-sm font-medium truncate">{property.name}</div>
                        
                        <Input
                          type="number"
                          placeholder="0"
                          value={propertyData[property.id]?.quantity || ''}
                          onChange={(e) => handleQuantityChange(property.id, e.target.value)}
                          className="text-center"
                          min="0"
                          step="1"
                        />
                        
                        <Input
                          placeholder="0,00"
                          value={propertyData[property.id]?.unitValue || ''}
                          onChange={(e) => handleUnitValueChange(property.id, e.target.value)}
                          className="text-right"
                        />
                        
                        <div className="text-right font-medium">
                          {formatCurrency(propertyData[property.id]?.total || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">Total Geral:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || calculateGrandTotal() === 0}
                  >
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PropertyDialog open={showPropertySelector} onOpenChange={setShowPropertySelector}>
        <PropertyDialogContent aria-describedby="property-dialog-description">
          <PropertyDialogHeader>
            <PropertyDialogTitle>Selecionar Propriedades</PropertyDialogTitle>
            <p id="property-dialog-description" className="sr-only">
              Selecione as propriedades para incluir no cadastro de limpeza
            </p>
          </PropertyDialogHeader>
          
          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-2">
              {allProperties.map(property => (
                <div key={property.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    id={`property-${property.id}`}
                    checked={selectedProperties.includes(property.id)}
                    onCheckedChange={() => handlePropertyToggle(property.id)}
                  />
                  <label
                    htmlFor={`property-${property.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium">{property.name}</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      property.status === 'active' ? 'bg-green-100 text-green-800' :
                      property.status === 'decoration' ? 'bg-yellow-100 text-yellow-800' :
                      property.status === 'financing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status === 'active' ? 'Ativo' :
                       property.status === 'decoration' ? 'Decoração' :
                       property.status === 'financing' ? 'Financiamento' :
                       'Inativo'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowPropertySelector(false)}>
              Confirmar
            </Button>
          </div>
        </PropertyDialogContent>
      </PropertyDialog>

      {/* Tabela Consolidada de Despesas */}
      <ConsolidatedExpenseTable refreshTrigger={dataUpdateTrigger} />
    </>
  );
}