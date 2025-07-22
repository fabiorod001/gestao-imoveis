import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Euro, Calendar, Building, TrendingUp, TrendingDown, Plus, Edit, Receipt, CreditCard, Clock, Pencil, FileText } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CompositeExpenseForm from "@/components/transactions/CompositeExpenseForm";
import type { Property, Transaction } from "@shared/schema";

interface PropertyDetailsParams {
  id: string;
}

interface TransactionForm {
  type: 'revenue' | 'expense';
  category: string;
  description: string;
  supplier?: string;
  cpfCnpj?: string;
  amount: string;
  date: string;
  installments?: number;
  installmentValues?: number[];
}

// Categories mapping
const REVENUE_CATEGORIES = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'future_rent', label: 'Aluguel Previsto' },
  { value: 'other', label: 'Outras Receitas' },
  { value: 'future_other', label: 'Outras Receitas Previstas' }
];

const EXPENSE_CATEGORIES = [
  { value: 'taxes', label: 'Impostos' },
  { value: 'management', label: 'Gestão (Maurício)' },
  { value: 'condo_fee', label: 'Condomínio' },
  { value: 'condo_tax', label: 'Taxa Condominial' },
  { value: 'electricity', label: 'Luz' },
  { value: 'gas', label: 'Gás' },
  { value: 'water', label: 'Água' },
  { value: 'commission', label: 'Comissões' },
  { value: 'iptu', label: 'IPTU' },
  { value: 'financing', label: 'Financiamento' },
  { value: 'maintenance', label: 'Conserto/Manutenção' },
  { value: 'internet_tv', label: 'TV/Internet' },
  { value: 'cleaning', label: 'Limpeza' },
  { value: 'new_category', label: '+ Nova Categoria' }
];

export default function PropertyDetails() {
  const { id } = useParams<PropertyDetailsParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPropertyEdit, setShowPropertyEdit] = useState(false);
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionForm>({
    type: 'revenue',
    category: '',
    description: '',
    supplier: '',
    cpfCnpj: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    installments: 1,
    installmentValues: []
  });
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    type: '',
    status: '',
    rentalType: '',
    purchasePrice: '',
    purchaseDate: ''
  });

  // Queries
  const { data: property, isLoading: propertyLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
  });

  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/properties/${id}/transactions`],
  });

  // Filter transactions by selected month/year
  const monthlyTransactions = allTransactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() + 1 === selectedMonth && 
           transactionDate.getFullYear() === selectedYear;
  });

  const monthlyRevenues = monthlyTransactions.filter(t => t.type === 'revenue');
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense');
  
  // Separate confirmed (past/current) and predicted (future) revenues
  const today = new Date();
  
  const confirmedRevenues = monthlyRevenues.filter(t => {
    const transactionDate = new Date(t.date);
    // Check if it's a future Airbnb reservation based on description
    const isAirbnbFuture = t.description && t.description.includes('Reserva futura');
    
    // If it's specifically an Airbnb future reservation, it's predicted regardless of date
    if (isAirbnbFuture) {
      return false; // This should go to predicted
    }
    
    // Otherwise use date comparison
    return transactionDate <= today;
  });
  
  const predictedRevenues = monthlyRevenues.filter(t => {
    const transactionDate = new Date(t.date);
    const isAirbnbFuture = t.description && t.description.includes('Reserva futura');
    
    // If it's specifically an Airbnb future reservation, it's predicted regardless of date
    if (isAirbnbFuture) {
      return true;
    }
    
    return transactionDate > today;
  });
  
  const totalConfirmedRevenue = confirmedRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPredictedRevenue = predictedRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalMonthlyRevenue = totalConfirmedRevenue + totalPredictedRevenue;
  // Calculate expenses correctly - some may already be negative in DB
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const monthlyNetResult = totalMonthlyRevenue - totalMonthlyExpenses;

  // Mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/transactions", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}/transactions`] });
      toast({ title: "Transação criada com sucesso!" });
      resetTransactionForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao criar transação", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, data }: { transactionId: number, data: any }) => {
      const response = await apiRequest(`/api/transactions/${transactionId}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}/transactions`] });
      setEditingTransaction(null);
      toast({ title: "Transação atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao atualizar transação", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/properties/${id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}`] });
      toast({ title: "Propriedade atualizada com sucesso!" });
      setShowPropertyEdit(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao atualizar propriedade", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Helper functions
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'revenue',
      category: '',
      description: '',
      supplier: '',
      cpfCnpj: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      installments: 1,
      installmentValues: []
    });
    setShowRevenueForm(false);
    setShowExpenseForm(false);
  };

  const handleTransactionSubmit = async () => {
    if (!transactionForm.category || !transactionForm.amount || !transactionForm.description) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Preencha categoria, descrição e valor",
        variant: "destructive" 
      });
      return;
    }

    const baseAmount = parseFloat(transactionForm.amount);
    const installments = transactionForm.installments || 1;

    // Create transactions for each installment
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(transactionForm.date);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      
      const installmentAmount = transactionForm.installmentValues?.[i] || (baseAmount / installments);
      
      await createTransactionMutation.mutateAsync({
        propertyId: parseInt(id!),
        type: transactionForm.type,
        category: transactionForm.category,
        description: `${transactionForm.description}${installments > 1 ? ` (${i + 1}/${installments})` : ''}`,
        amount: installmentAmount.toString(),
        date: installmentDate.toISOString().split('T')[0],
        supplier: transactionForm.supplier || null,
        cpfCnpj: transactionForm.cpfCnpj || null
      });
    }
  };

  const calculateInstallmentValues = () => {
    const total = parseFloat(transactionForm.amount) || 0;
    const installments = transactionForm.installments || 1;
    const baseValue = total / installments;
    
    setTransactionForm(prev => ({
      ...prev,
      installmentValues: Array(installments).fill(baseValue)
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryLabel = (category: string, type: string) => {
    const categories = type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
    return categories.find(c => c.value === category)?.label || category;
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Propriedade não encontrada</h2>
            <Link href="/dashboard">
              <Button className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{property.name}</h1>
              <p className="text-slate-600 dark:text-slate-400 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {property.address}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/property/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar Propriedade
              </Button>
            </Link>
            <Dialog open={showPropertyEdit} onOpenChange={setShowPropertyEdit}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => {
                  setPropertyForm({
                    name: property.name,
                    address: property.address || '',
                    type: property.type,
                    status: property.status,
                    rentalType: property.rentalType || '',
                    purchasePrice: property.purchasePrice?.toString() || '',
                    purchaseDate: property.purchaseDate || ''
                  });
                }} className="hidden">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Propriedade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Propriedade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input 
                      id="name"
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input 
                      id="address"
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={propertyForm.type} onValueChange={(value) => setPropertyForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartamento</SelectItem>
                          <SelectItem value="house">Casa</SelectItem>
                          <SelectItem value="commercial">Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={propertyForm.status} onValueChange={(value) => setPropertyForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="decoration">Decoração</SelectItem>
                          <SelectItem value="financing">Financiamento</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPropertyEdit(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => updatePropertyMutation.mutate(propertyForm)}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge className="bg-blue-100 text-blue-800 border-0 shadow-sm">
              {property.status}
            </Badge>
          </div>
        </div>

        {/* Month/Year Selector */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Dashboard Financeiro</span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDetailedHistory(true)}
                  className="h-8 text-xs"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Histórico Detalhado
                </Button>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2025, i).toLocaleDateString('pt-BR', { month: 'short' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2022, 2023, 2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Revenues Section */}
              <div>
                <h3 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Receitas do Mês
                </h3>
                <div className="space-y-3">
                  {/* Confirmed Revenues */}
                  <div>
                    <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Receitas Confirmadas</h4>
                    <div className="space-y-1">
                      {confirmedRevenues.length === 0 ? (
                        <p className="text-gray-500 text-xs py-1">Nenhuma receita confirmada</p>
                      ) : (
                        confirmedRevenues.map((transaction) => (
                          <div key={transaction.id} className="flex justify-between items-center py-1 px-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate">{transaction.description}</span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({getCategoryLabel(transaction.category, 'revenue')})
                              </span>
                            </div>
                            <span className="font-semibold text-green-600 dark:text-green-400 text-sm ml-2">
                              {formatCurrency(Number(transaction.amount))}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between items-center py-1 px-2 bg-green-100 dark:bg-green-800/30 rounded font-medium text-sm">
                        <span>Subtotal Confirmadas</span>
                        <span className="text-green-700 dark:text-green-300">
                          {formatCurrency(totalConfirmedRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Predicted Revenues */}
                  <div>
                    <h4 className="text-sm font-medium text-green-500 dark:text-green-300 mb-1">Receitas Previstas</h4>
                    <div className="space-y-1">
                      {predictedRevenues.length === 0 ? (
                        <p className="text-gray-500 text-xs py-1">Nenhuma receita prevista</p>
                      ) : (
                        predictedRevenues.map((transaction) => (
                          <div key={transaction.id} className="flex justify-between items-center py-1 px-2 bg-green-100 dark:bg-green-800/20 rounded text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate">{transaction.description}</span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({getCategoryLabel(transaction.category, 'revenue')})
                              </span>
                            </div>
                            <span className="font-semibold text-green-500 dark:text-green-300 text-sm ml-2">
                              {formatCurrency(Number(transaction.amount))}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between items-center py-1 px-2 bg-green-200 dark:bg-green-700/30 rounded font-medium text-sm">
                        <span>Subtotal Previstas</span>
                        <span className="text-green-600 dark:text-green-200">
                          {formatCurrency(totalPredictedRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Revenues */}
                  <div className="flex justify-between items-center py-2 px-3 bg-green-200 dark:bg-green-700/40 rounded font-semibold">
                    <span>Total de Receitas</span>
                    <span className="text-green-800 dark:text-green-200">
                      {formatCurrency(totalMonthlyRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="text-base font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Despesas do Mês
                </h3>
                <div className="space-y-1">
                  {monthlyExpenses.length === 0 ? (
                    <p className="text-gray-500 text-xs py-1">Nenhuma despesa registrada</p>
                  ) : (
                    monthlyExpenses.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center py-1 px-2 bg-red-50 dark:bg-red-900/20 rounded text-sm group hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate">{transaction.description}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({getCategoryLabel(transaction.category, 'expense')})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold text-red-600 dark:text-red-400 text-sm cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 px-2 py-1 rounded transition-colors"
                            onClick={() => setEditingTransaction(transaction)}
                            title="Clique para editar"
                          >
                            -{formatCurrency(Math.abs(Number(transaction.amount)))}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={() => setEditingTransaction(transaction)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between items-center py-2 px-3 bg-red-100 dark:bg-red-800/30 rounded font-semibold">
                    <span>Total de Despesas</span>
                    <span className="text-red-700 dark:text-red-300">
                      {formatCurrency(totalMonthlyExpenses)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Monthly Result */}
              <div className={`p-3 rounded font-bold ${
                monthlyNetResult >= 0 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span>Resultado do Mês</span>
                  <span>{formatCurrency(monthlyNetResult)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Form */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 dark:text-green-300 flex items-center text-base">
                <Receipt className="w-4 h-4 mr-2" />
                Adicionar Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Dialog open={showRevenueForm} onOpenChange={setShowRevenueForm}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-green-600 hover:bg-green-700 h-9 text-sm" onClick={() => {
                    setTransactionForm(prev => ({ ...prev, type: 'revenue' }));
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Receita
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Receita</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="revenue-category">Categoria</Label>
                      <Select 
                        value={transactionForm.category} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {REVENUE_CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="revenue-description">Descrição</Label>
                      <Input 
                        id="revenue-description"
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ex: Aluguel junho 2025"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="revenue-amount">Valor (R$)</Label>
                        <Input 
                          id="revenue-amount"
                          type="number"
                          step="0.01"
                          value={transactionForm.amount}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="revenue-date">Data</Label>
                        <Input 
                          id="revenue-date"
                          type="date"
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={resetTransactionForm}>
                        Cancelar
                      </Button>
                      <Button onClick={handleTransactionSubmit} disabled={createTransactionMutation.isPending}>
                        {createTransactionMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Expense Form */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-700 dark:text-red-300 flex items-center text-base">
                <CreditCard className="w-4 h-4 mr-2" />
                Adicionar Despesa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-red-600 hover:bg-red-700 h-9 text-sm" onClick={() => {
                      setTransactionForm(prev => ({ ...prev, type: 'expense' }));
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Despesa
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Adicionar Despesa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                      <Label htmlFor="expense-category">Categoria</Label>
                      <Select 
                        value={transactionForm.category} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expense-description">Descrição</Label>
                      <Input 
                        id="expense-description"
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ex: Condomínio junho 2025"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense-supplier">Fornecedor</Label>
                      <Input 
                        id="expense-supplier"
                        value={transactionForm.supplier}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, supplier: e.target.value }))}
                        placeholder="Nome do fornecedor"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense-cpf">CPF/CNPJ</Label>
                      <Input 
                        id="expense-cpf"
                        value={transactionForm.cpfCnpj}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expense-amount">Valor Total (R$)</Label>
                        <Input 
                          id="expense-amount"
                          type="number"
                          step="0.01"
                          value={transactionForm.amount}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expense-date">Data</Label>
                        <Input 
                          id="expense-date"
                          type="date"
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="installments">Número de Parcelas</Label>
                      <Input 
                        id="installments"
                        type="number"
                        min="1"
                        max="60"
                        value={transactionForm.installments}
                        onChange={(e) => {
                          setTransactionForm(prev => ({ ...prev, installments: parseInt(e.target.value) || 1 }));
                        }}
                        onBlur={calculateInstallmentValues}
                      />
                    </div>
                    {transactionForm.installments && transactionForm.installments > 1 && transactionForm.installmentValues && (
                      <div>
                        <Label>Valores das Parcelas</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {transactionForm.installmentValues.map((value, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className="text-sm w-16">{index + 1}ª:</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={value}
                                onChange={(e) => {
                                  const newValues = [...transactionForm.installmentValues!];
                                  newValues[index] = parseFloat(e.target.value) || 0;
                                  setTransactionForm(prev => ({ ...prev, installmentValues: newValues }));
                                }}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={resetTransactionForm}>
                        Cancelar
                      </Button>
                      <Button onClick={handleTransactionSubmit} disabled={createTransactionMutation.isPending}>
                        {createTransactionMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <CompositeExpenseForm 
                propertyId={parseInt(id)} 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}/transactions`] });
                }} 
              />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal de Edição Rápida de Transação */}
        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar Transação
              </DialogTitle>
            </DialogHeader>
            {editingTransaction && (
              <div className="space-y-4">
                {/* Informações de Identificação */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Tipo:</span> 
                      <Badge variant={editingTransaction.type === 'revenue' ? 'default' : 'destructive'} className="ml-2">
                        {editingTransaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Categoria:</span> 
                      <span className="ml-2">{getCategoryLabel(editingTransaction.category, editingTransaction.type)}</span>
                    </div>
                    {editingTransaction.supplier && (
                      <div>
                        <span className="font-medium">Fornecedor:</span> 
                        <span className="ml-2">{editingTransaction.supplier}</span>
                      </div>
                    )}
                    {editingTransaction.cpfCnpj && (
                      <div>
                        <span className="font-medium">CPF/CNPJ:</span> 
                        <span className="ml-2">{editingTransaction.cpfCnpj}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campos Editáveis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Descrição</Label>
                    <Input 
                      value={editingTransaction.description}
                      onChange={(e) => setEditingTransaction(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição da transação"
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editingTransaction.amount}
                      onChange={(e) => setEditingTransaction(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input 
                      type="date"
                      value={editingTransaction.date}
                      onChange={(e) => setEditingTransaction(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Input 
                      value={editingTransaction.supplier || ''}
                      onChange={(e) => setEditingTransaction(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input 
                      value={editingTransaction.cpfCnpj || ''}
                      onChange={(e) => setEditingTransaction(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select 
                      value={editingTransaction.category} 
                      onValueChange={(value) => setEditingTransaction(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {editingTransaction.type === 'revenue' ? (
                          <>
                            <SelectItem value="rent">Aluguel</SelectItem>
                            <SelectItem value="deposit">Caução</SelectItem>
                            <SelectItem value="late_fee">Multa por Atraso</SelectItem>
                            <SelectItem value="other">Outras Receitas</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="maintenance">Manutenção</SelectItem>
                            <SelectItem value="utilities">Utilidades</SelectItem>
                            <SelectItem value="taxes">Impostos</SelectItem>
                            <SelectItem value="insurance">Seguro</SelectItem>
                            <SelectItem value="management">Administração</SelectItem>
                            <SelectItem value="financing">Financiamento</SelectItem>
                            <SelectItem value="other">Outras Despesas</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditingTransaction(null)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => {
                      const updateData = {
                        description: editingTransaction.description,
                        amount: parseFloat(editingTransaction.amount),
                        date: editingTransaction.date,
                        category: editingTransaction.category
                      };
                      
                      // Adicionar campos opcionais apenas se tiverem valor
                      if (editingTransaction.supplier && editingTransaction.supplier.trim()) {
                        updateData.supplier = editingTransaction.supplier.trim();
                      }
                      
                      if (editingTransaction.cpfCnpj && editingTransaction.cpfCnpj.trim()) {
                        updateData.cpfCnpj = editingTransaction.cpfCnpj.trim();
                      }
                      
                      updateTransactionMutation.mutate({
                        transactionId: editingTransaction.id,
                        data: updateData
                      });
                    }}
                    disabled={updateTransactionMutation.isPending}
                  >
                    {updateTransactionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Histórico Detalhado */}
        <Dialog open={showDetailedHistory} onOpenChange={setShowDetailedHistory}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico Detalhado - {property?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {[5, 4, 3, 2, 1, 0].map(monthOffset => {
                const targetDate = new Date();
                targetDate.setMonth(targetDate.getMonth() - monthOffset);
                const month = targetDate.getMonth() + 1;
                const year = targetDate.getFullYear();
                
                const monthTransactions = allTransactions.filter(t => {
                  const transactionDate = new Date(t.date);
                  return transactionDate.getMonth() + 1 === month && 
                         transactionDate.getFullYear() === year;
                });

                const monthRevenues = monthTransactions.filter(t => t.type === 'revenue');
                const monthExpenses = monthTransactions.filter(t => t.type === 'expense');
                const totalRevenue = monthRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
                const totalExpenses = monthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
                const netResult = totalRevenue - totalExpenses;

                return (
                  <div key={`${month}-${year}`} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">
                      {targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    
                    {monthTransactions.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhuma transação neste mês</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Receitas */}
                        <div>
                          <h4 className="font-medium text-green-700 mb-2">Receitas</h4>
                          {monthRevenues.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nenhuma receita</p>
                          ) : (
                            <div className="space-y-1">
                              {monthRevenues.map(transaction => (
                                <div key={transaction.id} className="p-3 bg-green-50 rounded border-l-4 border-green-400 hover:bg-green-100 transition-colors cursor-pointer"
                                     onClick={() => setEditingTransaction(transaction)}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-green-800 truncate">{transaction.description}</p>
                                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-green-600">
                                        <span className="px-2 py-1 bg-green-200 rounded">
                                          {getCategoryLabel(transaction.category, 'revenue')}
                                        </span>
                                        {transaction.supplier && (
                                          <span className="px-2 py-1 bg-green-200 rounded">
                                            {transaction.supplier}
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-green-200 rounded">
                                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-700 font-semibold">
                                        {formatCurrency(Number(transaction.amount))}
                                      </span>
                                      <Pencil className="w-3 h-3 text-green-600 opacity-50" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between items-center p-2 bg-green-100 rounded font-medium text-sm">
                                <span>Total de Receitas</span>
                                <span className="text-green-700">{formatCurrency(totalRevenue)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Despesas */}
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">Despesas</h4>
                          {monthExpenses.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nenhuma despesa</p>
                          ) : (
                            <div className="space-y-1">
                              {monthExpenses.map(transaction => (
                                <div key={transaction.id} className="p-3 bg-red-50 rounded border-l-4 border-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                                     onClick={() => setEditingTransaction(transaction)}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-red-800 truncate">{transaction.description}</p>
                                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-red-600">
                                        <span className="px-2 py-1 bg-red-200 rounded">
                                          {getCategoryLabel(transaction.category, 'expense')}
                                        </span>
                                        {transaction.supplier && (
                                          <span className="px-2 py-1 bg-red-200 rounded">
                                            {transaction.supplier}
                                          </span>
                                        )}
                                        {transaction.cpfCnpj && (
                                          <span className="px-2 py-1 bg-red-200 rounded">
                                            {transaction.cpfCnpj}
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-red-200 rounded">
                                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-700 font-semibold">
                                        -{formatCurrency(Number(transaction.amount))}
                                      </span>
                                      <Pencil className="w-3 h-3 text-red-600 opacity-50" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between items-center p-2 bg-red-100 rounded font-medium text-sm">
                                <span>Total de Despesas</span>
                                <span className="text-red-700">-{formatCurrency(totalExpenses)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Resultado Mensal */}
                    <div className={`mt-3 p-3 rounded font-semibold ${
                      netResult >= 0 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span>Resultado do Mês</span>
                        <span>{formatCurrency(netResult)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}