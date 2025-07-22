import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const cleaningDetailSchema = z.object({
  serviceDate: z.date(),
  propertyId: z.number(),
  amount: z.string().min(1, "Valor é obrigatório"),
});

const cleaningFormSchema = z.object({
  paymentDate: z.date(),
  supplier: z.string().min(1, "Fornecedor é obrigatório"),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  pixKey: z.string().optional(),
  totalAmount: z.string().min(1, "Valor total é obrigatório"),
  details: z.array(cleaningDetailSchema).min(1, "Adicione pelo menos uma limpeza"),
});

type CleaningFormData = z.infer<typeof cleaningFormSchema>;
type CleaningDetail = z.infer<typeof cleaningDetailSchema>;

export function DetailedCleaningForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cleaningDetails, setCleaningDetails] = useState<CleaningDetail[]>([]);
  const [currentDetail, setCurrentDetail] = useState<Partial<CleaningDetail>>({});
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);
  const [serviceDateOpen, setServiceDateOpen] = useState(false);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);

  const form = useForm<CleaningFormData>({
    resolver: zodResolver(cleaningFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      supplier: "",
      cpfCnpj: "",
      phone: "",
      email: "",
      pixKey: "",
      totalAmount: "",
      details: [],
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const activeProperties = properties.filter((p: any) => p.status === "active");

  const createCleaningMutation = useMutation({
    mutationFn: async (data: CleaningFormData) => {
      const formattedData = {
        paymentDate: format(data.paymentDate, "yyyy-MM-dd"),
        supplier: data.supplier,
        cpfCnpj: data.cpfCnpj || null,
        phone: data.phone || null,
        email: data.email || null,
        pixKey: data.pixKey || null,
        totalAmount: parseFloat(data.totalAmount.replace(/\./g, "").replace(",", ".")),
        details: data.details.map(detail => ({
          serviceDate: format(detail.serviceDate, "yyyy-MM-dd"),
          propertyId: detail.propertyId,
          amount: parseFloat(detail.amount.replace(/\./g, "").replace(",", ".")),
        })),
      };

      return apiRequest("/api/expenses/cleaning-detailed", {
        method: "POST",
        body: JSON.stringify(formattedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/dashboard"] });
      toast({
        title: "Limpezas cadastradas",
        description: "As limpezas foram cadastradas com sucesso.",
      });
      form.reset();
      setCleaningDetails([]);
      setDataUpdateTrigger(prev => prev + 1);
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar limpezas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCleaningDetail = useCallback(() => {
    if (!currentDetail.serviceDate || !currentDetail.propertyId || !currentDetail.amount) {
      toast({
        title: "Preencha todos os campos",
        description: "Data, propriedade e valor são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const newDetail: CleaningDetail = {
      serviceDate: currentDetail.serviceDate,
      propertyId: currentDetail.propertyId,
      amount: currentDetail.amount,
    };

    setCleaningDetails([...cleaningDetails, newDetail]);
    setCurrentDetail({});
  }, [currentDetail, cleaningDetails, toast]);

  const removeCleaningDetail = useCallback((index: number) => {
    setCleaningDetails(cleaningDetails.filter((_, i) => i !== index));
  }, [cleaningDetails]);

  const calculateTotal = useCallback(() => {
    return cleaningDetails.reduce((sum, detail) => {
      const amount = parseFloat(detail.amount.replace(/\./g, "").replace(",", ".")) || 0;
      return sum + amount;
    }, 0);
  }, [cleaningDetails]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const onSubmit = (data: CleaningFormData) => {
    data.details = cleaningDetails;
    
    const total = calculateTotal();
    const informedTotal = parseFloat(data.totalAmount.replace(/\./g, "").replace(",", "."));
    
    if (Math.abs(total - informedTotal) > 0.01) {
      toast({
        title: "Valores não conferem",
        description: `Total das limpezas (R$ ${formatCurrency((total * 100).toString())}) diferente do valor informado (R$ ${data.totalAmount})`,
        variant: "destructive",
      });
      return;
    }
    
    createCleaningMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Pagamento</CardTitle>
            <CardDescription>
              Dados do pagamento consolidado que será lançado no fluxo de caixa
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="3.950,00"
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
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa ou pessoa" {...field} />
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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pixKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave PIX</FormLabel>
                  <FormControl>
                    <Input placeholder="CPF, e-mail ou telefone" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhamento das Limpezas</CardTitle>
            <CardDescription>
              Adicione cada limpeza realizada com sua data e propriedade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Popover open={serviceDateOpen} onOpenChange={setServiceDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {currentDetail.serviceDate 
                      ? format(currentDetail.serviceDate, "dd/MM/yyyy") 
                      : "Data da limpeza"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={currentDetail.serviceDate}
                    onSelect={(date) => {
                      setCurrentDetail({ ...currentDetail, serviceDate: date });
                      setServiceDateOpen(false);
                    }}
                    locale={ptBR}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={currentDetail.propertyId?.toString()}
                onValueChange={(value) => 
                  setCurrentDetail({ ...currentDetail, propertyId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {activeProperties.map((property: any) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Valor"
                value={currentDetail.amount || ""}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setCurrentDetail({ ...currentDetail, amount: formatted });
                }}
              />

              <Button type="button" onClick={addCleaningDetail}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {cleaningDetails.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                    <div>Data</div>
                    <div>Propriedade</div>
                    <div>Valor</div>
                    <div></div>
                  </div>
                  {cleaningDetails.map((detail, index) => {
                    const property = activeProperties.find((p: any) => p.id === detail.propertyId);
                    return (
                      <div key={index} className="grid grid-cols-4 items-center">
                        <div className="text-sm">
                          {format(detail.serviceDate, "dd/MM/yyyy")}
                        </div>
                        <div className="text-sm">{property?.name}</div>
                        <div className="text-sm">R$ {detail.amount}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCleaningDetail(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="grid grid-cols-4 font-medium">
                    <div></div>
                    <div>Total:</div>
                    <div>R$ {formatCurrency((calculateTotal() * 100).toString())}</div>
                    <div></div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={createCleaningMutation.isPending || cleaningDetails.length === 0}
        >
          {createCleaningMutation.isPending ? "Cadastrando..." : "Cadastrar Limpezas"}
        </Button>
      </form>
    </Form>
  );
}