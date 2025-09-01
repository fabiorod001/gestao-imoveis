import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

const formSchema = z.object({
  propertyId: z.number(),
  category: z.string().min(1, "Categoria é obrigatória"),
  amount: z.string()
    .min(1, "Valor é obrigatório")
    .refine((val) => {
      const numericValue = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      return !isNaN(numericValue) && numericValue > 0;
    }, "Valor deve ser maior que zero"),
  date: z.date({
    required_error: "Data é obrigatória",
  }),
  description: z.string().min(1, "Descrição é obrigatória"),
  supplier: z.string().optional(),
  cpfCnpj: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditExpenseDialogProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditExpenseDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: EditExpenseDialogProps) {
  const { toast } = useToast();
  const [dateOpen, setDateOpen] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: transaction?.propertyId || 0,
      category: transaction?.category || '',
      amount: '',
      date: new Date(),
      description: transaction?.description || '',
      supplier: transaction?.supplier || '',
      cpfCnpj: transaction?.cpfCnpj || '',
    },
  });

  // Load transaction data when dialog opens
  useEffect(() => {
    if (transaction && open) {
      form.reset({
        propertyId: transaction.propertyId,
        category: transaction.category,
        amount: Math.abs(transaction.amount).toFixed(2).replace('.', ','),
        date: new Date(transaction.date),
        description: transaction.description,
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
      
      return apiRequest(`/api/transactions/${transaction.id}`, 'PUT', {
        propertyId: data.propertyId,
        type: 'expense',
        category: data.category,
        amount: amount, // Send as string
        date: data.date.toISOString(),
        description: data.description,
        supplier: data.supplier || '',
        cpfCnpj: data.cpfCnpj || '',
        currency: 'BRL',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Despesa atualizada",
        description: "A despesa foi atualizada com sucesso.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a despesa. Tente novamente.",
        variant: "destructive",
      });
      console.error('Error updating expense:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/transactions/${transaction.id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Despesa excluída",
        description: "A despesa foi excluída com sucesso.",
      });
      setShowDeleteDialog(false);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a despesa. Tente novamente.",
        variant: "destructive",
      });
      console.error('Error deleting expense:', error);
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  // Expense categories
  const expenseCategories = [
    { value: 'condominium', label: 'Condomínio' },
    { value: 'management', label: 'Gestão' },
    { value: 'taxes', label: 'Impostos' },
    { value: 'utilities', label: 'Luz, Gás e Água' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'cleaning', label: 'Limpeza' },
    { value: 'financing', label: 'Financiamento' },
    { value: 'iptu', label: 'IPTU' },
    { value: 'other', label: 'Outras' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Dashboard Financeiro</DialogTitle>
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
          <h3 className="text-lg font-semibold mb-4">Editar despesa individual por propriedade.</h3>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        {properties.map((property: any) => (
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
                        placeholder="Ex: Reparo torneira da cozinha" 
                        className="h-10"
                        {...field} 
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
                      {expenseCategories.map((cat) => (
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
                {updateMutation.isPending ? "Salvando..." : "Cadastrar"}
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
            Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
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