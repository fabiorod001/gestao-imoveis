import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Property } from "@shared/schema";
import ConsolidatedExpenseTable from "./ConsolidatedExpenseTable";

const formSchema = z.object({
  totalAmount: z.string()
    .min(1, "Valor é obrigatório")
    .refine((val) => {
      const numericValue = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      return !isNaN(numericValue) && numericValue > 0;
    }, "Valor deve ser maior que zero"),
  paymentDate: z.date({
    required_error: "Data de pagamento é obrigatória",
  }),
  description: z.string().optional(),
  supplier: z.string().min(1, "Fornecedor é obrigatório"),
  cpfCnpj: z.string().optional(),
  selectedProperties: z.array(z.number()).min(1, "Selecione pelo menos uma propriedade"),
  propertyPercentages: z.record(z.string().optional())
});

type FormData = z.infer<typeof formSchema>;

interface ManagementPreview {
  property: Property;
  percentage: number;
  amount: number;
}

interface ManagementExpenseFormProps {
  editData?: {
    editId: number;
    date: string;
    amount: string;
    properties: number[];
  };
}

export default function ManagementExpenseForm({ editData }: ManagementExpenseFormProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<ManagementPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalAmount: "",
      paymentDate: new Date(),
      description: "",
      supplier: "Maurício",
      cpfCnpj: "",
      selectedProperties: [],
      propertyPercentages: {}
    }
  });

  // Load edit data when provided
  React.useEffect(() => {
    if (editData && properties.length > 0) {
      form.setValue('totalAmount', editData.amount);
      form.setValue('paymentDate', new Date(editData.date));
      form.setValue('selectedProperties', editData.properties);
      
      // Calculate equal distribution for properties
      const equalPercent = 100 / editData.properties.length;
      const percentages: Record<string, string> = {};
      editData.properties.forEach(propId => {
        percentages[propId.toString()] = equalPercent.toFixed(2).replace('.', ',');
      });
      form.setValue('propertyPercentages', percentages);
    }
  }, [editData, properties, form]);

  const selectedProperties = form.watch("selectedProperties");
  const propertyPercentages = form.watch("propertyPercentages");

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    const numberValue = parseInt(numericValue);
    const formatted = (numberValue / 100).toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+,)/g, '$1.');
    
    return formatted;
  };

  const calculateDistribution = () => {
    const totalAmount = parseFloat(form.getValues("totalAmount").replace(/\./g, '').replace(',', '.'));
    const selectedProps = form.getValues("selectedProperties");
    const percentages = form.getValues("propertyPercentages");
    
    if (!totalAmount || selectedProps.length === 0) return;

    // Calcular percentuais
    let totalPercentage = 0;
    const propertyPercents: Record<number, number> = {};
    
    selectedProps.forEach(propId => {
      const inputPercent = percentages[propId.toString()];
      if (inputPercent) {
        const percent = parseFloat(inputPercent.replace(',', '.'));
        if (!isNaN(percent)) {
          propertyPercents[propId] = percent;
          totalPercentage += percent;
        }
      }
    });

    // Se não há percentuais definidos ou se o total é 0, distribuir igualmente
    if (totalPercentage === 0) {
      const equalPercent = 100 / selectedProps.length;
      selectedProps.forEach(propId => {
        propertyPercents[propId] = equalPercent;
      });
      totalPercentage = 100;
    }
    // Se o total é menor que 100%, distribuir o restante igualmente
    else if (totalPercentage < 100) {
      const remaining = 100 - totalPercentage;
      const remainingPerProperty = remaining / selectedProps.length;
      selectedProps.forEach(propId => {
        propertyPercents[propId] = (propertyPercents[propId] || 0) + remainingPerProperty;
      });
    }
    // Se o total é maior que 100%, normalizar
    else if (totalPercentage > 100) {
      const factor = 100 / totalPercentage;
      selectedProps.forEach(propId => {
        if (propertyPercents[propId]) {
          propertyPercents[propId] = propertyPercents[propId] * factor;
        }
      });
    }

    // Calcular valores
    const previewData: ManagementPreview[] = selectedProps.map(propId => {
      const property = properties.find(p => p.id === propId)!;
      const percentage = propertyPercents[propId];
      const amount = (totalAmount * percentage) / 100;
      
      return {
        property,
        percentage,
        amount
      };
    });

    setPreview(previewData);
    setShowPreview(true);
  };

  const createManagementMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const totalAmount = parseFloat(data.totalAmount.replace(/\./g, '').replace(',', '.'));
      
      // Calcular distribuição final
      const distribution = preview.map(item => ({
        propertyId: item.property.id,
        amount: item.amount,
        percentage: item.percentage
      }));

      // If we're editing, use PUT method
      if (editData) {
        return apiRequest(`/api/expenses/management/${editData.editId}`, 'PUT', {
          totalAmount,
          paymentDate: data.paymentDate.toISOString(),
          description: data.description || `Gestão (${data.supplier})`,
          supplier: data.supplier,
          cpfCnpj: data.cpfCnpj,
          distribution
        });
      }
      
      // Otherwise, create new
      return apiRequest('/api/expenses/management', 'POST', {
        totalAmount,
        paymentDate: data.paymentDate.toISOString(),
        description: data.description || `Gestão (${data.supplier})`,
        supplier: data.supplier,
        cpfCnpj: data.cpfCnpj,
        distribution
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: editData ? "Despesa de gestão atualizada" : "Despesa de gestão cadastrada",
        description: editData 
          ? "A despesa foi atualizada com sucesso."
          : "A despesa foi distribuída entre as propriedades selecionadas.",
      });
      form.reset();
      setShowPreview(false);
      setPreview([]);
      // Trigger table update
      setDataUpdateTrigger(prev => prev + 1);
      
      // If editing, redirect back to expenses page
      if (editData) {
        window.location.href = '/expenses';
      }
    },
    onError: (error) => {
      toast({
        title: editData ? "Erro ao atualizar despesa" : "Erro ao cadastrar despesa",
        description: "Não foi possível processar a despesa. Tente novamente.",
        variant: "destructive",
      });
      console.error('Error processing management expense:', error);
    },
  });

  const onSubmit = (data: FormData) => {
    if (showPreview) {
      createManagementMutation.mutate(data);
    } else {
      calculateDistribution();
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editData ? 'Editar Despesa de Gestão' : 'Cadastrar Despesa de Gestão'}</CardTitle>
              <CardDescription>
                Insira o valor total e selecione as propriedades para rateio proporcional ou com percentuais customizados
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1.500,00"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione a data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setPaymentDateOpen(false);
                          }}
                          locale={ptBR}
                          disabled={(date) => date < new Date("2020-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do gestor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpfCnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição adicional (opcional)" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Selecione as propriedades e defina os percentuais (opcional)</h4>
              <p className="text-sm text-muted-foreground">
                Se você não definir percentuais, o valor será dividido igualmente. 
                Se a soma for menor que 100%, o restante será distribuído proporcionalmente.
              </p>
              
              <div className="space-y-2">
                {activeProperties.map((property) => (
                  <div key={property.id} className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name="selectedProperties"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(property.id)}
                              onCheckedChange={(checked) => {
                                const updated = checked
                                  ? [...field.value, property.id]
                                  : field.value?.filter((id) => id !== property.id);
                                field.onChange(updated);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="flex-1 font-normal cursor-pointer">
                            {property.name}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    {selectedProperties.includes(property.id) && (
                      <FormField
                        control={form.control}
                        name={`propertyPercentages.${property.id}`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormControl>
                              <Input
                                placeholder="%"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9,]/g, '');
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {showPreview && preview.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Prévia da Distribuição</h4>
                  <div className="space-y-2">
                    {preview.map((item) => (
                      <div key={item.property.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{item.property.name}</span>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{item.percentage.toFixed(2)}%</Badge>
                          <span className="text-sm font-medium">
                            R$ {item.amount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center font-medium">
                      <span>Total</span>
                      <span>R$ {form.getValues("totalAmount")}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          {!showPreview && (
            <Button type="submit" className="flex-1">
              Calcular Distribuição
            </Button>
          )}
          {showPreview && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createManagementMutation.isPending}
              >
                {createManagementMutation.isPending ? "Cadastrando..." : "Confirmar Cadastro"}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
    
    {/* Consolidated table view */}
    <ConsolidatedExpenseTable 
      category="management" 
      onDataUpdate={() => dataUpdateTrigger} 
    />
    </>
  );
}