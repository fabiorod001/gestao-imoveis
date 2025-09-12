import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Building2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Property } from "@shared/schema";

// Form validation schema
const formSchema = z.object({
  totalAmount: z.string()
    .min(1, "Valor é obrigatório")
    .refine((val) => {
      const numericValue = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      return !isNaN(numericValue) && numericValue > 0;
    }, "Valor deve ser maior que zero"),
  date: z.date({
    required_error: "Data de pagamento é obrigatória",
  }),
  description: z.string().min(1, "Descrição é obrigatória").max(1000),
  selectedPropertyIds: z.array(z.number()).min(1, "Selecione pelo menos um imóvel"),
  notes: z.string().max(5000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PreviewItem {
  property: Property;
  amount: number;
}

export default function MauricioExpenseForm() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Filter only active properties
  const activeProperties = properties.filter(p => p.status === 'active');

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalAmount: "",
      date: new Date(),
      description: "Gestão Maurício",
      selectedPropertyIds: [],
      notes: "",
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        totalAmount: parseFloat(data.totalAmount.replace(/\./g, '').replace(',', '.')),
        date: format(data.date, 'yyyy-MM-dd'),
        description: data.description,
        selectedPropertyIds: data.selectedPropertyIds,
        supplier: "Maurício",
        notes: data.notes,
      };
      
      return apiRequest('/api/expenses/mauricio', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: "Sucesso!",
        description: "Despesa de gestão Maurício criada com sucesso.",
      });
      
      // Reset form
      form.reset();
      setPreview([]);
      setShowPreview(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar despesa",
        description: error.message || "Ocorreu um erro ao criar a despesa.",
        variant: "destructive",
      });
    },
  });

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Handle amount input formatting
  const handleAmountChange = (value: string) => {
    // Remove all non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d,]/g, '');
    form.setValue('totalAmount', cleaned);
  };

  // Calculate preview
  const calculatePreview = () => {
    const values = form.getValues();
    const totalAmount = parseFloat(values.totalAmount.replace(/\./g, '').replace(',', '.'));
    const selectedProps = values.selectedPropertyIds;
    
    if (isNaN(totalAmount) || totalAmount <= 0 || selectedProps.length === 0) {
      toast({
        title: "Atenção",
        description: "Preencha o valor total e selecione pelo menos um imóvel.",
        variant: "destructive",
      });
      return;
    }
    
    const amountPerProperty = totalAmount / selectedProps.length;
    
    const previewData: PreviewItem[] = selectedProps.map(propId => {
      const property = activeProperties.find(p => p.id === propId)!;
      return {
        property,
        amount: amountPerProperty,
      };
    });
    
    setPreview(previewData);
    setShowPreview(true);
  };

  // Handle form submission
  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesa de Gestão - Maurício</CardTitle>
        <CardDescription>
          Registre o pagamento mensal da gestão Maurício com divisão igual entre os imóveis selecionados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Total Amount */}
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        {...field}
                        data-testid="input-mauricio-amount"
                        placeholder="0,00"
                        className="pl-10"
                        onChange={(e) => handleAmountChange(e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Valor total a ser pago para Maurício (sem limites)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Pagamento</FormLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-mauricio-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setDateOpen(false);
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data em que o pagamento foi ou será realizado
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-mauricio-description"
                      placeholder="Ex: Gestão Maurício - Mês 01/2024"
                    />
                  </FormControl>
                  <FormDescription>
                    Descrição para identificar este pagamento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes (optional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      data-testid="textarea-mauricio-notes"
                      placeholder="Observações adicionais..."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Selection */}
            <FormField
              control={form.control}
              name="selectedPropertyIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imóveis para Rateio</FormLabel>
                  <FormDescription>
                    Selecione os imóveis que dividirão igualmente este custo
                  </FormDescription>
                  <div className="space-y-2 border rounded-lg p-4">
                    {activeProperties.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Nenhum imóvel ativo</AlertTitle>
                        <AlertDescription>
                          Cadastre e ative imóveis antes de criar despesas.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      activeProperties.map((property) => (
                        <div key={property.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`property-${property.id}`}
                            data-testid={`checkbox-property-${property.id}`}
                            checked={field.value?.includes(property.id)}
                            onCheckedChange={(checked) => {
                              const updatedValue = checked
                                ? [...(field.value || []), property.id]
                                : field.value?.filter((id) => id !== property.id) || [];
                              field.onChange(updatedValue);
                            }}
                          />
                          <label
                            htmlFor={`property-${property.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {property.name}
                              {property.nickname && (
                                <span className="text-muted-foreground text-xs">
                                  ({property.nickname})
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview Button */}
            <Button
              type="button"
              variant="outline"
              onClick={calculatePreview}
              className="w-full"
              data-testid="button-mauricio-preview"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calcular Divisão
            </Button>

            {/* Preview */}
            {showPreview && preview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prévia da Divisão</CardTitle>
                  <CardDescription>
                    Valor igual para cada imóvel selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {preview.map((item) => (
                      <div key={item.property.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.property.name}</span>
                        </div>
                        <Badge variant="secondary" data-testid={`badge-amount-${item.property.id}`}>
                          {formatCurrency(item.amount)}
                        </Badge>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span data-testid="text-total-amount">
                        {formatCurrency(preview.reduce((sum, item) => sum + item.amount, 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
              data-testid="button-mauricio-submit"
            >
              {createMutation.isPending ? "Criando..." : "Criar Despesa Maurício"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}