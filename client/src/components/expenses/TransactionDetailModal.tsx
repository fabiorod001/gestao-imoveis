import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Edit2, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Transaction {
  id: number;
  description: string;
  date: string;
  amount: number;
  category: string;
  propertyId?: number;
  propertyName?: string;
  supplier?: string;
  cpfCnpj?: string;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
  showPropertyColumn?: boolean;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  title,
  transactions,
  showPropertyColumn = true
}: TransactionDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    description: string;
    amount: string;
    date: string;
    supplier?: string;
    cpfCnpj?: string;
    category: string;
  }>({
    description: '',
    amount: '',
    date: '',
    supplier: '',
    cpfCnpj: '',
    category: ''
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const response = await fetch(`/api/transactions/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/maintenance-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/condominium-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/taxes-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/utilities-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/management-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/cleaning-detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/financing-detail'] });
      
      toast({
        title: "Transação atualizada",
        description: "Os dados foram atualizados com sucesso.",
      });
      setEditingId(null);
      
      // If category changed, close the modal to refresh the view
      const transaction = transactions.find(t => t.id === variables.id);
      if (transaction && variables.updates.category && transaction.category !== variables.updates.category) {
        onClose();
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a transação.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete transaction');
      }
      // Only try to parse JSON if response has content
      if (response.status !== 204) {
        return response.json();
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/management-detail'] });
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso.",
      });
      // Close the modal after successful deletion
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditValues({
      description: transaction.description || '',
      amount: Math.abs(transaction.amount).toString(),
      date: transaction.date || '',
      supplier: transaction.supplier || '',
      cpfCnpj: transaction.cpfCnpj || '',
      category: transaction.category || ''
    });
  };

  const handleSave = () => {
    if (!editingId) return;

    const amount = parseFloat(editValues.amount.replace(/\./g, '').replace(',', '.')) || 0;
    const transaction = transactions.find(t => t.id === editingId);
    if (!transaction) return;

    const updates: any = {
      description: editValues.description,
      amount: (transaction.category === 'revenue' ? amount : -amount).toString(),
      date: editValues.date,
      category: editValues.category
    };

    if (editValues.supplier) updates.supplier = editValues.supplier;
    if (editValues.cpfCnpj) updates.cpfCnpj = editValues.cpfCnpj;

    updateMutation.mutate({ id: editingId, updates });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatNumber = (num: number): string => {
    return Math.abs(num).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (date: string): string => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editingId === transaction.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={editValues.description}
                        onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Valor</Label>
                        <Input
                          value={editValues.amount}
                          onChange={(e) => setEditValues({...editValues, amount: e.target.value})}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={editValues.date}
                          onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Fornecedor</Label>
                        <Input
                          value={editValues.supplier}
                          onChange={(e) => setEditValues({...editValues, supplier: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>CPF/CNPJ</Label>
                        <Input
                          value={editValues.cpfCnpj}
                          onChange={(e) => setEditValues({...editValues, cpfCnpj: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={editValues.category}
                        onValueChange={(value) => setEditValues({...editValues, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="condominium">Condomínio</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="taxes">Impostos</SelectItem>
                          <SelectItem value="utilities">Utilidades</SelectItem>
                          <SelectItem value="management">Gestão</SelectItem>
                          <SelectItem value="cleaning">Limpeza</SelectItem>
                          <SelectItem value="financing">Financiamento</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.description}</span>
                        {showPropertyColumn && transaction.propertyName && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.propertyName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {formatNumber(transaction.amount)}
                        </span>
                      </div>
                      {(transaction.supplier || transaction.cpfCnpj) && (
                        <div className="text-sm text-gray-600 mt-1">
                          {transaction.supplier && <span>Fornecedor: {transaction.supplier}</span>}
                          {transaction.supplier && transaction.cpfCnpj && <span> • </span>}
                          {transaction.cpfCnpj && <span>CPF/CNPJ: {transaction.cpfCnpj}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="font-semibold text-lg">
              R$ {formatNumber(totalAmount)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}