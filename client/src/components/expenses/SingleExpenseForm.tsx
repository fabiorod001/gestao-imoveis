import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lightbulb, Wrench, CreditCard, Trash2, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import type { ExpenseType } from "./AdvancedExpenseManager";
import { z } from "zod";

const singleExpenseSchema = z.object({
  propertyId: z.string().min(1, "Selecione uma propriedade"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  supplier: z.string().optional(),
  cpfCnpj: z.string().optional(),
  isHistorical: z.boolean().optional(),
});

type FormData = z.infer<typeof singleExpenseSchema>;

interface SingleExpenseFormProps {
  expenseType: ExpenseType;
  includeSupplier?: boolean;
  onComplete: (expense: any) => void;
  onCancel: () => void;
}

const expenseTypeConfig = {
  utilities: {
    title: 'Utilidades (Luz, Gás, Água)',
    icon: Lightbulb,
    category: 'utilities',
    placeholderDescription: 'Ex: Conta de luz - Junho/2025',
  },
  maintenance: {
    title: 'Conserto/Manutenção',
    icon: Wrench,
    category: 'maintenance',
    placeholderDescription: 'Ex: Reparo torneira da cozinha',
  },
  financing: {
    title: 'Financiamento',
    icon: CreditCard,
    category: 'financing',
    placeholderDescription: 'Ex: Parcela financiamento - Junho/2025',
  },
  cleaning: {
    title: 'Limpeza',
    icon: Trash2,
    category: 'cleaning',
    placeholderDescription: 'Ex: Limpeza mensal - Junho/2025',
  },
  commissions: {
    title: 'Comissões',
    icon: CreditCard,
    category: 'commissions',
    placeholderDescription: 'Ex: Comissão venda',
  },
  balance_adjustment: {
    title: 'Ajuste de Saldo',
    icon: Landmark,
    category: 'balance_adjustment',
    placeholderDescription: 'Ex: Marco Zero - Setembro 2025',
  },
};

export default function SingleExpenseForm({ 
  expenseType, 
  includeSupplier = false, 
  onComplete, 
  onCancel 
}: SingleExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);
  
  const config = expenseTypeConfig[expenseType] || expenseTypeConfig.utilities;
  const Icon = config.icon;

  const form = useForm<FormData>({
    resolver: zodResolver(singleExpenseSchema),
    defaultValues: {
      propertyId: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      supplier: "",
      cpfCnpj: "",
      isHistorical: false,
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/transactions', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({
        title: "Sucesso",
        description: `${config.title} cadastrada com sucesso`,
      });
      setDataUpdateTrigger(prev => prev + 1);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: `Erro ao cadastrar ${config.title.toLowerCase()}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    const selectedProperty = properties.find(p => p.id.toString() === data.propertyId);
    
    const transactionData = {
      propertyId: parseInt(data.propertyId),
      isHistorical: data.isHistorical || false,
      type: 'expense',
      category: config.category,
      description: data.description,
      amount: data.amount, // Keep as string, backend expects string
      date: data.date,
      currency: 'BRL',
      supplier: includeSupplier ? data.supplier : undefined,
      cpfCnpj: includeSupplier ? data.cpfCnpj : undefined,
    };

    try {
      await createMutation.mutateAsync(transactionData);
      
      onComplete({
        type: config.title,
        propertyName: selectedProperty?.name,
        amount: parseFloat(data.amount),
        date: data.date,
        description: data.description,
      });
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {config.title}
        </CardTitle>
        <p className="text-muted-foreground">
          Cadastre despesas individuais por propriedade.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriedade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a propriedade" />
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

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={config.placeholderDescription}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Historical Transaction Checkbox - Always show for Ajuste de Saldo */}
            {(expenseType === 'balance_adjustment' || includeSupplier) && (
              <FormField
                control={form.control}
                name="isHistorical"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-yellow-50 border-yellow-200">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Lançamento Histórico
                      </FormLabel>
                      <p className="text-xs text-gray-600">
                        {expenseType === 'balance_adjustment' 
                          ? 'Marque para criar um marco zero que não afeta o fluxo de caixa' 
                          : 'Marque se esta transação é histórica e não deve afetar o fluxo de caixa'}
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Supplier Info (if needed) */}
            {includeSupplier && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do fornecedor"
                          {...field} 
                        />
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
                        <Input 
                          placeholder="000.000.000-00"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}