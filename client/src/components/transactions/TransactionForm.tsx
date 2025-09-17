import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type Property } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema específico para o formulário com validações personalizadas
const formSchema = z.object({
  type: z.enum(['revenue', 'expense']),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  amount: z.string().min(1, "Valor é obrigatório"),
  currency: z.literal('BRL'),
  date: z.string().min(1, "Data é obrigatória"),
  propertyId: z.string().optional(),
  // Campos para receitas
  accommodationStartDate: z.string().optional(),
  accommodationEndDate: z.string().optional(),
  payerName: z.string().optional(),
  // Campos para despesas
  supplier: z.string().optional(),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Campos comuns
  paymentMethod: z.string().optional(),
  pixKey: z.string().optional(),
  isRecurring: z.boolean(),
  recurringPeriod: z.string().optional(),
  recurringEndDate: z.string().optional(),
  notes: z.string().optional(),
  // Flag para lançamentos históricos
  isHistorical: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface TransactionFormProps {
  type: 'revenue' | 'expense';
  onSuccess?: () => void;
}

const revenueCategories = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking', label: 'Booking' },
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'outros', label: 'Outros' },
];

const expenseCategories = [
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'cleaning', label: 'Limpeza' },
  { value: 'utilities', label: 'Utilidades' },
  { value: 'taxes', label: 'IPTU' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'management', label: 'Gestão' },
  { value: 'financing', label: 'Financiamento' },
  { value: 'decoration', label: 'Decoração' },
  { value: 'balance_adjustment', label: 'Ajuste de Saldo' },
  { value: 'other', label: 'Outros' },
];

const paymentMethods = [
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
];

const recurringPeriods = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

// Smart Description Input Component  
function SmartDescriptionInput({ value, onChange, category, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  category: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Fetch suggestions for current category
  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['/api/transactions/suggestions', category],
    enabled: !!category && category !== "",
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue);
    onChange(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="resize-none pr-8"
            rows={2}
          />
          {suggestions.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-gray-100"
              onClick={() => setOpen(!open)}
            >
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar sugestões..." />
          <CommandList>
            <CommandEmpty>Nenhuma sugestão encontrada.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      inputValue === suggestion ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function TransactionForm({ type, onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type,
      category: '',
      description: '',
      amount: '',
      currency: 'BRL',
      date: new Date().toISOString().split('T')[0],
      accommodationStartDate: '',
      accommodationEndDate: '',
      isRecurring: false,
      recurringPeriod: '',
      recurringEndDate: '',
      payerName: '',
      paymentMethod: '',
      propertyId: '',
      notes: '',
      supplier: '',
      cpfCnpj: '',
      phone: '',
      email: '',
      pixKey: '',
      isHistorical: false,
    },
  });

  const isRecurring = form.watch('isRecurring');
  const categories = type === 'revenue' ? revenueCategories : expenseCategories;

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Form data before processing:', data);
      
      const payload = {
        ...data,
        amount: data.amount, // Mantendo como string, que é o esperado pelo schema
        propertyId: data.propertyId ? parseInt(data.propertyId) : null,
        description: data.description || null,
        accommodationStartDate: data.accommodationStartDate || null,
        accommodationEndDate: data.accommodationEndDate || null,
        recurringPeriod: data.isRecurring ? data.recurringPeriod : null,
        recurringEndDate: data.isRecurring && data.recurringEndDate ? data.recurringEndDate : null,
        payerName: data.payerName || null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        supplier: data.supplier || null,
        cpfCnpj: data.cpfCnpj || null,
        phone: data.phone || null,
        email: data.email || null,
        pixKey: data.pixKey || null,
      };
      
      console.log('Payload to be sent:', payload);
      
      await apiRequest('/api/transactions', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly'] });
      toast({
        title: "Sucesso",
        description: `${type === 'revenue' ? 'Receita' : 'Despesa'} registrada com sucesso`,
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error details:', error);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Erro ao registrar ${type === 'revenue' ? 'receita' : 'despesa'}: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imóvel (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o imóvel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Descrição (Opcional) 
                {form.watch('category') && (
                  <span className="text-xs text-gray-500 ml-1">
                    - Escolha ou digite uma nova
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <SmartDescriptionInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  category={form.watch('category') || ""}
                  placeholder={`Descreva a ${type === 'revenue' ? 'receita' : 'despesa'} (opcional)...`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Linha 1: Valor, Data de Recebimento e Método de Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da Hospedagem (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Recebimento {type === 'revenue' && '(Payout)'}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Linha 2: Datas de hospedagem lado a lado (apenas para receitas) */}
        {type === 'revenue' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accommodationStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início da Hospedagem</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accommodationEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim da Hospedagem</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Campos de Fornecedor para despesas */}
        {type === 'expense' && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do fornecedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="fornecedor@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Campo condicional da Chave PIX */}
        {form.watch('paymentMethod') === 'pix' && (
          <FormField
            control={form.control}
            name="pixKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave PIX</FormLabel>
                <FormControl>
                  <Input placeholder="Digite a chave PIX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {type === 'revenue' && (
          <FormField
            control={form.control}
            name="payerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Pagador</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da pessoa ou empresa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="isRecurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Transação Recorrente</FormLabel>
                  <div className="text-sm text-gray-500">
                    Esta {type === 'revenue' ? 'receita' : 'despesa'} se repete periodicamente
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurringPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período de Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recurringPeriods.map(period => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurringEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Final (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais..."
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo para lançamento histórico */}
        <FormField
          control={form.control}
          name="isHistorical"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Lançamento Histórico</FormLabel>
                <div className="text-sm text-gray-500">
                  Marque esta opção se este lançamento é histórico e não deve afetar o fluxo de caixa atual
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : `Salvar ${type === 'revenue' ? 'Receita' : 'Despesa'}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}
