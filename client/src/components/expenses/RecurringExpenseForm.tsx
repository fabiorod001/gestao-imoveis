import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Wifi, Receipt, Calendar, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import type { ExpenseType } from "./AdvancedExpenseManager";
import { z } from "zod";

const recurringExpenseSchema = z.object({
  propertyId: z.string().min(1, "Selecione uma propriedade"),
  amount: z.string().min(1, "Valor é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  installments: z.string().min(1, "Número de parcelas é obrigatório"),
});

type FormData = z.infer<typeof recurringExpenseSchema>;

interface RecurringExpenseFormProps {
  expenseType: ExpenseType;
  onComplete: (expense: any) => void;
  onCancel: () => void;
}

const expenseTypeConfig = {
  internet: {
    title: 'TV / Internet',
    icon: Wifi,
    category: 'internet',
    defaultInstallments: '12',
    placeholderDescription: 'Ex: Plano Internet + TV',
  },
  iptu: {
    title: 'IPTU',
    icon: Receipt,
    category: 'iptu',
    defaultInstallments: '10',
    placeholderDescription: 'Ex: IPTU 2025',
  },
};

export default function RecurringExpenseForm({ 
  expenseType, 
  onComplete, 
  onCancel 
}: RecurringExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);
  
  const config = expenseTypeConfig[expenseType as keyof typeof expenseTypeConfig] || expenseTypeConfig.internet;
  const Icon = config.icon;

  const form = useForm<FormData>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: {
      propertyId: "",
      amount: "",
      startDate: new Date().toISOString().split('T')[0],
      description: "",
      installments: config.defaultInstallments,
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const createMutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      const results = await Promise.all(
        transactions.map(transaction => 
          apiRequest('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(transaction),
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({
        title: "Sucesso",
        description: `${config.title} cadastrada com ${form.watch('installments')} parcelas`,
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

  const generateInstallments = (data: FormData) => {
    const selectedProperty = properties.find(p => p.id.toString() === data.propertyId);
    const startDate = new Date(data.startDate);
    const amount = parseFloat(data.amount);
    const installmentCount = parseInt(data.installments);
    
    const transactions = [];
    
    for (let i = 0; i < installmentCount; i++) {
      const installmentDate = new Date(startDate);
      
      if (expenseType === 'iptu') {
        // IPTU: Fevereiro a Novembro (pula dezembro e janeiro)
        installmentDate.setMonth(1 + i); // Fevereiro = 1
      } else {
        // Internet/TV: Mensal consecutivo
        installmentDate.setMonth(startDate.getMonth() + i);
      }
      
      const installmentNumber = i + 1;
      const description = `${data.description} - ${installmentNumber}/${installmentCount} - ${selectedProperty?.name}`;
      
      transactions.push({
        propertyId: parseInt(data.propertyId),
        type: 'expense',
        category: config.category,
        description,
        amount: amount.toString(), // Convert to string
        date: installmentDate.toISOString().split('T')[0],
        currency: 'BRL',
        metadata: {
          recurringExpense: true,
          installmentNumber,
          totalInstallments: installmentCount,
          originalStartDate: data.startDate,
          originalDescription: data.description,
        }
      });
    }
    
    return transactions;
  };

  const onSubmit = async (data: FormData) => {
    const transactions = generateInstallments(data);
    const selectedProperty = properties.find(p => p.id.toString() === data.propertyId);
    
    try {
      await createMutation.mutateAsync(transactions);
      
      onComplete({
        type: config.title,
        propertyName: selectedProperty?.name,
        monthlyAmount: parseFloat(data.amount),
        totalAmount: parseFloat(data.amount) * parseInt(data.installments),
        installments: parseInt(data.installments),
        startDate: data.startDate,
        description: data.description,
      });
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  // Preview das parcelas
  const previewInstallments = () => {
    if (!form.watch('startDate') || !form.watch('installments') || !form.watch('amount')) {
      return [];
    }
    
    const startDate = new Date(form.watch('startDate'));
    const installmentCount = parseInt(form.watch('installments'));
    const amount = parseFloat(form.watch('amount'));
    
    const installments = [];
    
    for (let i = 0; i < Math.min(installmentCount, 6); i++) { // Mostra apenas as primeiras 6
      const installmentDate = new Date(startDate);
      
      if (expenseType === 'iptu') {
        installmentDate.setMonth(1 + i); // Fevereiro a Novembro
      } else {
        installmentDate.setMonth(startDate.getMonth() + i);
      }
      
      installments.push({
        number: i + 1,
        date: installmentDate.toLocaleDateString('pt-BR'),
        amount,
      });
    }
    
    return installments;
  };

  const installmentPreview = previewInstallments();
  const totalAmount = parseFloat(form.watch('amount') || '0') * parseInt(form.watch('installments') || '0');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {config.title} - Cadastro Recorrente
        </CardTitle>
        <p className="text-muted-foreground">
          {expenseType === 'iptu' 
            ? 'Cadastre as 10 parcelas do IPTU (fevereiro a novembro)' 
            : 'Cadastre múltiplas parcelas mensais consecutivas'
          }
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
                    <FormLabel>Valor por Parcela (R$)</FormLabel>
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

            {/* Date and Installments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {expenseType === 'iptu' ? 'Ano de Referência' : 'Data de Início'}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseType === 'iptu' ? (
                          <SelectItem value="10">10 parcelas (IPTU)</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="12">12 meses</SelectItem>
                            <SelectItem value="24">24 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="3">3 meses</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold">
                  R$ {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description */}
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

            {/* Preview */}
            {installmentPreview.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  <h4 className="font-medium">Preview das Parcelas</h4>
                  <Badge variant="secondary">
                    {installmentPreview.length} de {form.watch('installments')}
                  </Badge>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid gap-2">
                    {installmentPreview.map(installment => (
                      <div key={installment.number} className="flex justify-between text-sm">
                        <span>
                          Parcela {installment.number} - {installment.date}
                        </span>
                        <span className="font-medium">
                          R$ {installment.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {parseInt(form.watch('installments') || '0') > 6 && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        ... e mais {parseInt(form.watch('installments')) - 6} parcelas
                      </div>
                    )}
                  </div>
                </div>
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
                {createMutation.isPending ? "Criando Parcelas..." : `Criar ${form.watch('installments')} Parcelas`}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}