import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPropertySchema, type Property } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";
import AddressForm from "./AddressForm";

// Utility functions for Brazilian currency formatting
const formatToBrazilianCurrency = (value: string | number): string => {
  if (!value || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseBrazilianCurrency = (value: string): string => {
  if (!value) return '';
  // Remove todos os pontos e substitui vírgula por ponto para conversão
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  return isNaN(numValue) ? '' : numValue.toString();
};

// IPCA correction utilities
const getCurrentPreviousMonth = (): { month: number, year: number, formatted: string } => {
  const now = new Date();
  const prevMonth = now.getMonth(); // getMonth() returns 0-11, so current month -1 is previous month
  const year = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = prevMonth === 0 ? 12 : prevMonth;
  
  return {
    month,
    year,
    formatted: `${month.toString().padStart(2, '0')}/${year}`
  };
};

const calculateIPCACorrection = async (initialValue: number, purchaseDateStr: string): Promise<{ correctedValue: number, correctionFactor: number, referenceMonth: string } | null> => {
  if (!initialValue || !purchaseDateStr) return null;
  
  try {
    // Use backend API to avoid CORS issues
    const response = await fetch(`/api/ipca/calculate?initialValue=${initialValue}&purchaseDate=${purchaseDateStr}`);
    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('IPCA API error:', result.message);
      return null;
    }
    
    return {
      correctedValue: result.data.correctedValue,
      correctionFactor: result.data.correctionFactor,
      referenceMonth: result.data.referenceMonth
    };
  } catch (error) {
    console.error('Error calculating IPCA correction:', error);
    return null;
  }
};

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  nickname: z.string().optional(),
  address: z.string().optional(),
  type: z.string().min(1, "Tipo é obrigatório"),
  status: z.string().min(1, "Status é obrigatório"),
  rentalType: z.string().optional(),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  commissionValue: z.string().optional(),
  taxesAndRegistration: z.string().optional(),
  renovationAndDecoration: z.string().optional(),
  otherInitialValues: z.string().optional(),
  area: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  // New address fields
  condominiumName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  tower: z.string().optional(),
  unit: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  // New market value fields
  marketValue: z.string().optional(),
  marketValueDate: z.string().optional(),
  // New identification fields
  registrationNumber: z.string().optional(),
  iptuCode: z.string().optional(),
  airbnbName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PropertyEditFormProps {
  propertyId: number;
  onSuccess?: () => void;
}

export default function PropertyEditForm({ propertyId, onSuccess }: PropertyEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for IPCA correction
  const [ipcaCorrection, setIpcaCorrection] = React.useState<{
    correctedValue: number;
    correctionFactor: number;
    referenceMonth: string;
  } | null>(null);
  const [isCalculatingIPCA, setIsCalculatingIPCA] = React.useState(false);

  // Fetch property data
  const { data: property, isLoading } = useQuery({
    queryKey: ['/api/properties', propertyId],
    queryFn: async () => {
      const response = await apiRequest(`/api/properties/${propertyId}`, 'GET');
      return await response.json() as Property;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nickname: '',
      address: '',
      type: '',
      status: 'inactive',
      rentalType: '',
      purchasePrice: '',
      commissionValue: '',
      taxesAndRegistration: '',
      renovationAndDecoration: '',
      otherInitialValues: '',
      area: '',
      bedrooms: '',
      bathrooms: '',
      purchaseDate: '',
      description: '',
      // New address fields
      condominiumName: '',
      street: '',
      number: '',
      tower: '',
      unit: '',
      neighborhood: '',
      city: '',
      state: '',
      country: 'Brasil',
      zipCode: '',
      // New market value fields
      marketValue: '',
      marketValueDate: '',
      // New identification fields  
      registrationNumber: '',
      iptuCode: '',
      airbnbName: '',
    },
  });

  // Update form when property data loads
  React.useEffect(() => {
    if (property) {
      form.reset({
        name: property.name || '',
        nickname: property.nickname || '',
        address: property.address || '',
        type: property.type || '',
        status: property.status || 'inactive',
        rentalType: property.rentalType || '',
        purchasePrice: formatToBrazilianCurrency(property.purchasePrice || ''),
        commissionValue: formatToBrazilianCurrency(property.commissionValue || ''),
        taxesAndRegistration: formatToBrazilianCurrency(property.taxesAndRegistration || ''),
        renovationAndDecoration: formatToBrazilianCurrency(property.renovationAndDecoration || ''),
        otherInitialValues: formatToBrazilianCurrency(property.otherInitialValues || ''),
        area: property.area?.toString() || '',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        purchaseDate: property.purchaseDate || '',
        description: property.description || '',
        // New address fields
        condominiumName: property.condominiumName || '',
        street: property.street || '',
        number: property.number || '',
        tower: property.tower || '',
        unit: property.unit || '',
        neighborhood: property.neighborhood || '',
        city: property.city || '',
        state: property.state || '',
        country: property.country || 'Brasil',
        zipCode: property.zipCode || '',
        // New market value fields
        marketValue: formatToBrazilianCurrency(property.marketValue || ''),
        marketValueDate: property.marketValueDate || '',
        // New identification fields
        registrationNumber: property.registrationNumber || '',
        iptuCode: property.iptuCode || '',
        airbnbName: property.airbnbName || '',
      });
    }
  }, [property, form]);

  // Effect to calculate IPCA correction when values or purchase date change
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only trigger recalculation for relevant fields (not market value fields)
      if (name && ['purchasePrice', 'commissionValue', 'taxesAndRegistration', 'renovationAndDecoration', 'otherInitialValues', 'purchaseDate'].includes(name)) {
        calculateIPCA();
      }
    });

    const calculateIPCA = async () => {
      const purchaseDate = form.getValues('purchaseDate');
      
      if (!purchaseDate) {
        setIpcaCorrection(null);
        return;
      }

      const purchasePrice = parseBrazilianCurrency(form.getValues('purchasePrice') || '0');
      const commissionValue = parseBrazilianCurrency(form.getValues('commissionValue') || '0');
      const taxesAndRegistration = parseBrazilianCurrency(form.getValues('taxesAndRegistration') || '0');
      const renovationAndDecoration = parseBrazilianCurrency(form.getValues('renovationAndDecoration') || '0');
      const otherInitialValues = parseBrazilianCurrency(form.getValues('otherInitialValues') || '0');

      const total = [purchasePrice, commissionValue, taxesAndRegistration, renovationAndDecoration, otherInitialValues]
        .reduce((sum, value) => {
          const floatValue = parseFloat(value);
          return sum + (isNaN(floatValue) ? 0 : floatValue);
        }, 0);

      if (total === 0) {
        setIpcaCorrection(null);
        return;
      }

      setIsCalculatingIPCA(true);
      try {
        const result = await calculateIPCACorrection(total, purchaseDate);
        if (result) {
          setIpcaCorrection({
            correctedValue: result.correctedValue,
            correctionFactor: result.correctionFactor,
            referenceMonth: result.referenceMonth
          });
        } else {
          setIpcaCorrection(null);
        }
      } catch (error) {
        console.error('Error calculating IPCA:', error);
        setIpcaCorrection(null);
      } finally {
        setIsCalculatingIPCA(false);
      }
    };

    // Initial calculation
    calculateIPCA();

    return () => subscription.unsubscribe();
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest(`/api/properties/${propertyId}`, 'PUT', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Propriedade atualizada!",
        description: "Os dados da propriedade foram atualizados com sucesso.",
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId] });
      
      // Call onSuccess callback immediately
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 100);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Convert Brazilian formatted values back to American format for API
    const processedData = {
      ...data,
      purchasePrice: parseBrazilianCurrency(data.purchasePrice || ''),
      commissionValue: parseBrazilianCurrency(data.commissionValue || ''),
      taxesAndRegistration: parseBrazilianCurrency(data.taxesAndRegistration || ''),
      renovationAndDecoration: parseBrazilianCurrency(data.renovationAndDecoration || ''),
      otherInitialValues: parseBrazilianCurrency(data.otherInitialValues || ''),
      marketValue: parseBrazilianCurrency(data.marketValue || ''),
      // Convert area field - it might have comma as decimal separator
      area: data.area ? data.area.replace(',', '.') : '',
      // Date fields remain as strings
      purchaseDate: data.purchaseDate || undefined,
      marketValueDate: data.marketValueDate || undefined,
    };
    
    updateMutation.mutate(processedData);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Editar Propriedade
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Atualize as informações da propriedade {property?.nickname || property?.name}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apelido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome que aparece no dashboard e relatórios" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Empreendimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome oficial completo" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 123.456" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="iptuCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código IPTU</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 012.345.678-9" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="airbnbName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome no Airbnb</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Cozy Apt in Faria Lima - Nome exato do anúncio no Airbnb" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nome exato do anúncio no Airbnb (para sincronização automática)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Classificação */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Classificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Propriedade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="apartment">Apartamento</SelectItem>
                        <SelectItem value="house">Casa</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="decoration">Em reforma</SelectItem>
                        <SelectItem value="financing">Financiamento</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rentalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Locação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de locação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Endereço Completo - Novo Componente */}
          <AddressForm form={form} />

          {/* Detalhes da Propriedade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Detalhes da Propriedade</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área (m²)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 75.50" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartos</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 2" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banheiros</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 1" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Valor de Aquisição */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Valor de Aquisição (Reais Brasileiros)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Compra</FormLabel>
                    <FormControl>
                      <Input placeholder="850.000,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="commissionValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Comissão</FormLabel>
                    <FormControl>
                      <Input placeholder="25.500,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taxesAndRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxas e Registros</FormLabel>
                    <FormControl>
                      <Input placeholder="15.000,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Financing fields */}
              <div className="col-span-full">
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="isFullyPaid"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            id="isFullyPaid"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={field.value || false}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        </FormControl>
                        <FormLabel htmlFor="isFullyPaid" className="!mt-0 cursor-pointer">
                          Quitado
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  {!form.watch("isFullyPaid") && (
                    <FormField
                      control={form.control}
                      name="financingAmount"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Valor Financiamento</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="220.000,00" 
                              {...field} 
                              value={field.value || ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="renovationAndDecoration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reformas e Decoração</FormLabel>
                    <FormControl>
                      <Input placeholder="50.000,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="otherInitialValues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outros Valores Iniciais</FormLabel>
                    <FormControl>
                      <Input placeholder="5.000,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Campos calculados automaticamente - Valores de Aquisição */}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Valor Total Original */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Valor Total de Aquisição
                    </label>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      R$ {(() => {
                        const values = form.watch(['purchasePrice', 'commissionValue', 'taxesAndRegistration', 'renovationAndDecoration', 'otherInitialValues']);
                        const total = values.reduce((sum, value) => {
                          const numValue = parseBrazilianCurrency(value || '0');
                          const floatValue = parseFloat(numValue);
                          return sum + (isNaN(floatValue) ? 0 : floatValue);
                        }, 0);
                        return total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Soma automática de todos os valores de aquisição
                    </p>
                  </div>

                  {/* Valor Corrigido pelo IPCA */}
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <label className="text-sm font-medium text-green-900 dark:text-green-100">
                      {ipcaCorrection ? `Valor total atualizado IPCA - ${ipcaCorrection.referenceMonth}` : 'Valor total atualizado IPCA'}
                    </label>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                      {isCalculatingIPCA ? (
                        <span className="text-lg">Calculando...</span>
                      ) : ipcaCorrection ? (
                        `R$ ${ipcaCorrection.correctedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-lg text-gray-500">Informe a data de compra</span>
                      )}
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {ipcaCorrection ? (
                        `Correção IPCA: ${((ipcaCorrection.correctionFactor - 1) * 100).toFixed(2)}%`
                      ) : (
                        'Correção automática pelo IPCA oficial IBGE'
                      )}
                    </p>
                  </div>

                </div>
              </div>

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Mercado</FormLabel>
                    <FormControl>
                      <Input placeholder="1.200.000,00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketValueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Na data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Observações</h3>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a propriedade..." 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}