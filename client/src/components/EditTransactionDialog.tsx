import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

interface Property {
  id: number;
  name: string;
  status: string;
}

interface Transaction {
  id: number;
  propertyId: number;
  propertyName?: string;
  type: 'revenue' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  supplier?: string;
  cpfCnpj?: string;
  metadata?: any;
}

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  propertyId: z.number().min(1, 'Selecione uma propriedade'),
  type: z.enum(['revenue', 'expense']),
  category: z.string().min(1, 'Selecione uma categoria'),
  amount: z.string().min(1, 'Informe o valor'),
  date: z.date(),
  description: z.string().min(1, 'Informe a descrição'),
  supplier: z.string().optional(),
  cpfCnpj: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Revenue categories
const REVENUE_CATEGORIES = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking', label: 'Booking' },
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'outros', label: 'Outros' },
];

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'management', label: 'Gestão' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'utilities', label: 'Utilidades' },
  { value: 'taxes', label: 'Impostos' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'condo_fee', label: 'Condomínio' },
  { value: 'iptu', label: 'IPTU' },
  { value: 'other', label: 'Outras' },
];

export default function EditTransactionDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: EditTransactionDialogProps) {
  const { toast } = useToast();
  const [dateOpen, setDateOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: 0,
      type: 'expense',
      category: '',
      amount: '',
      date: new Date(),
      description: '',
      supplier: '',
      cpfCnpj: '',
    },
  });

  // Load transaction data when dialog opens
  useEffect(() => {
    if (transaction && open) {
      console.log('Loading transaction for editing:', transaction);
      
      // Format the amount properly
      const formattedAmount = Math.abs(transaction.amount).toFixed(2).replace('.', ',');
      
      form.reset({
        propertyId: transaction.propertyId,
        type: transaction.type,
        category: transaction.category || '',
        amount: formattedAmount,
        date: new Date(transaction.date),
        description: transaction.description || '',
        supplier: transaction.supplier || '',
        cpfCnpj: transaction.cpfCnpj || '',
      });
    }
  }, [transaction, open, form]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    const numberValue = parseInt(numericValue);
    const formatted = (numberValue / 100).toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+,)/g, '$1.');
    
    return formatted;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const amount = data.amount.replace(/\./g, '').replace(',', '.');
      
      return apiRequest(`/api/transactions/${transaction?.id}`, 'PUT', {
        propertyId: data.propertyId,
        type: data.type,
        category: data.category,
        amount: amount,
        date: data.date.toISOString(),
        description: data.description,
        supplier: data.supplier || '',
        cpfCnpj: data.cpfCnpj || '',
        currency: 'BRL',
      });
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: transaction?.type === 'revenue' ? "Receita atualizada" : "Despesa atualizada",
        description: "Os dados foram atualizados com sucesso.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
      console.error('Error updating transaction:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/transactions/${transaction?.id}`, 'DELETE');
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: "Registro excluído",
        description: "O registro foi excluído com sucesso.",
      });
      setShowDeleteDialog(false);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro. Tente novamente.",
        variant: "destructive",
      });
      console.error('Error deleting transaction:', error);
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Submitting form data:', data);
    updateMutation.mutate(data);
  };

  // Get categories based on transaction type
  const categories = form.watch('type') === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
  
  // Determine if we're editing revenue or expense
  const isRevenue = transaction?.type === 'revenue';
  const dialogTitle = isRevenue ? 'Editar Receita' : 'Dashboard Financeiro';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{dialogTitle}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Atualizado em {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">dev@example.com</span>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Sair
              </Button>
            </div>
          </div>
          
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">
              {isRevenue ? 'Editar receita individual por propriedade.' : 'Editar despesa individual por propriedade.'}
            </h3>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Propriedade</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a propriedade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem
                              key={property.id}
                              value={property.id.toString()}
                            >
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
                      <FormLabel className="text-sm font-semibold">Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0,00"
                          className="h-10"
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
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Data</FormLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal h-10"
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
                              setDateOpen(false);
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Descrição</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={isRevenue ? "Ex: Aluguel mensal" : "Ex: Reparo torneira da cozinha"}
                          className="h-10"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isRevenue && (
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Fornecedor</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome do fornecedor" 
                            className="h-10"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">CPF/CNPJ</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000.000.000-00" 
                            className="h-10"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-sm font-semibold">Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between items-center pt-6 border-t">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteMutation.isPending}
                    className="px-6"
                  >
                    Eliminar entrada
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}