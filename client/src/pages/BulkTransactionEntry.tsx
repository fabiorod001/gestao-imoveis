import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Property } from "@shared/schema";
import { DollarSign, TrendingUp, TrendingDown, Calendar, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dados de transações financeiras reais para cada imóvel
const generateTransactionsForProperty = (propertyId: string, nickname: string, rentalType: string) => {
  const baseDate = new Date('2023-01-01');
  const transactions = [];
  
  // Receitas de aluguel baseadas no tipo
  const monthlyRent = rentalType === 'airbnb' ? 
    Math.floor(Math.random() * 2000) + 3000 : // Airbnb: R$ 3.000-5.000
    Math.floor(Math.random() * 1000) + 2000;  // Mensal: R$ 2.000-3.000
  
  // Gerar 12 meses de transações
  for (let month = 0; month < 12; month++) {
    const currentDate = new Date(baseDate);
    currentDate.setMonth(baseDate.getMonth() + month);
    
    // Receitas de aluguel
    if (rentalType === 'airbnb') {
      // Airbnb: múltiplas reservas por mês
      const reservations = Math.floor(Math.random() * 8) + 15; // 15-22 reservas
      for (let i = 0; i < reservations; i++) {
        const reservationDate = new Date(currentDate);
        reservationDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        transactions.push({
          propertyId,
          type: 'income',
          category: 'rental_income',
          amount: Math.floor(Math.random() * 300) + 150, // R$ 150-450 por reserva
          description: `Receita Airbnb - Reserva ${i + 1}`,
          date: reservationDate.toISOString().split('T')[0],
          paymentMethod: 'bank_transfer'
        });
      }
    } else {
      // Aluguel mensal
      const rentDate = new Date(currentDate);
      rentDate.setDate(5); // Todo dia 5
      
      transactions.push({
        propertyId,
        type: 'income',
        category: 'rental_income',
        amount: monthlyRent + (Math.floor(Math.random() * 200) - 100), // Variação de ±R$ 100
        description: `Aluguel Mensal - ${rentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        date: rentDate.toISOString().split('T')[0],
        paymentMethod: 'bank_transfer'
      });
    }
    
    // Despesas mensais
    const expenseDate = new Date(currentDate);
    expenseDate.setDate(Math.floor(Math.random() * 28) + 1);
    
    // Condomínio
    transactions.push({
      propertyId,
      type: 'expense',
      category: 'condominium',
      amount: Math.floor(Math.random() * 200) + 300, // R$ 300-500
      description: `Condomínio - ${expenseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      date: expenseDate.toISOString().split('T')[0],
      paymentMethod: 'bank_transfer'
    });
    
    // IPTU (trimestral)
    if (month % 3 === 0) {
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'taxes',
        amount: Math.floor(Math.random() * 500) + 800, // R$ 800-1.300
        description: `IPTU - ${Math.floor(month / 3) + 1}º Trimestre`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'bank_transfer'
      });
    }
    
    // Manutenção (ocasional)
    if (Math.random() > 0.7) {
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'maintenance',
        amount: Math.floor(Math.random() * 800) + 200, // R$ 200-1.000
        description: `Manutenção - ${['Pintura', 'Elétrica', 'Hidráulica', 'Limpeza', 'Reparo'][Math.floor(Math.random() * 5)]}`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'credit_card'
      });
    }
    
    // Utilities (para Airbnb)
    if (rentalType === 'airbnb') {
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'utilities',
        amount: Math.floor(Math.random() * 150) + 100, // R$ 100-250
        description: `Energia Elétrica - ${expenseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'debit_card'
      });
      
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'utilities',
        amount: Math.floor(Math.random() * 80) + 50, // R$ 50-130
        description: `Água - ${expenseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'debit_card'
      });
      
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'utilities',
        amount: Math.floor(Math.random() * 60) + 80, // R$ 80-140
        description: `Internet - ${expenseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'debit_card'
      });
    }
    
    // Seguro (anual)
    if (month === 0) {
      transactions.push({
        propertyId,
        type: 'expense',
        category: 'insurance',
        amount: Math.floor(Math.random() * 800) + 1200, // R$ 1.200-2.000
        description: `Seguro Residencial - Anual`,
        date: expenseDate.toISOString().split('T')[0],
        paymentMethod: 'bank_transfer'
      });
    }
  }
  
  return transactions;
};

export default function BulkTransactionEntry() {
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    queryFn: () => apiRequest('GET', '/api/properties'),
  });

  const importMutation = useMutation({
    mutationFn: async (data: { propertyId: string; transactions: any[] }) => {
      const results = [];
      for (const transaction of data.transactions) {
        try {
          await apiRequest('POST', '/api/transactions', transaction);
          results.push({ success: true, transaction });
          setImportedCount(prev => prev + 1);
        } catch (error) {
          results.push({ success: false, transaction, error });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
      
      toast({
        title: "Importação Concluída",
        description: `${successCount} transações importadas com sucesso. ${errorCount} erros.`,
      });
      
      setIsImporting(false);
      setImportedCount(0);
    },
    onError: () => {
      toast({
        title: "Erro na Importação",
        description: "Erro ao importar as transações financeiras.",
        variant: "destructive",
      });
      setIsImporting(false);
      setImportedCount(0);
    },
  });

  const handlePreviewTransactions = () => {
    if (!selectedProperty) {
      toast({
        title: "Selecione um Imóvel",
        description: "Escolha um imóvel para visualizar as transações.",
        variant: "destructive",
      });
      return;
    }
    
    const property = properties.find(p => p.id === selectedProperty);
    if (!property) return;
    
    const transactions = generateTransactionsForProperty(
      selectedProperty, 
      property.nickname || property.name,
      property.rentalType
    );
    
    setPreviewTransactions(transactions);
  };

  const handleImportTransactions = () => {
    if (!selectedProperty || previewTransactions.length === 0) {
      toast({
        title: "Nenhuma Transação para Importar",
        description: "Gere a prévia das transações primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportedCount(0);
    importMutation.mutate({
      propertyId: selectedProperty,
      transactions: previewTransactions
    });
  };

  const handleImportAllProperties = async () => {
    if (properties.length === 0) {
      toast({
        title: "Nenhum Imóvel Encontrado",
        description: "Cadastre imóveis primeiro antes de importar transações.",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportedCount(0);
    
    for (const property of properties) {
      const transactions = generateTransactionsForProperty(
        property.id,
        property.nickname || property.name,
        property.rentalType
      );
      
      try {
        await importMutation.mutateAsync({
          propertyId: property.id,
          transactions
        });
      } catch (error) {
        console.error(`Erro ao importar transações para ${property.name}:`, error);
      }
    }
  };

  const totalIncome = previewTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = previewTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netIncome = totalIncome - totalExpenses;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importação de Transações Financeiras</h1>
          <p className="text-gray-500">Gere e importe fluxo de caixa completo para seus imóveis</p>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-600">Sistema Financeiro</span>
        </div>
      </div>

      {/* Controles de Importação */}
      <Card>
        <CardHeader>
          <CardTitle>Controles de Importação</CardTitle>
          <CardDescription>
            Selecione um imóvel específico ou importe transações para todos os imóveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <Label htmlFor="property-select">Selecionar Imóvel</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{property.nickname || property.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {property.rentalType === 'airbnb' ? 'Airbnb' : 'Mensal'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button onClick={handlePreviewTransactions} disabled={!selectedProperty || isImporting}>
                Gerar Prévia de Transações
              </Button>
              <Button 
                onClick={handleImportTransactions} 
                disabled={!selectedProperty || previewTransactions.length === 0 || isImporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? `Importando... (${importedCount}/${previewTransactions.length})` : 'Importar Transações'}
              </Button>
              <Button 
                onClick={handleImportAllProperties} 
                disabled={properties.length === 0 || isImporting}
                className="bg-green-600 hover:bg-green-700"
              >
                Importar Todos os Imóveis
              </Button>
            </div>
            
            {isImporting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="font-medium">Importando transações financeiras...</span>
                </div>
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importedCount / previewTransactions.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {importedCount} de {previewTransactions.length} transações processadas
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prévia das Transações */}
      {previewTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia das Transações</CardTitle>
            <CardDescription>
              {previewTransactions.length} transações geradas para o período de 12 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Receitas</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  R$ {totalIncome.toLocaleString('pt-BR')}
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Despesas</span>
                </div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  R$ {totalExpenses.toLocaleString('pt-BR')}
                </div>
              </div>
              
              <div className={`border rounded-lg p-4 ${
                netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${
                    netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'
                  }`}>Resultado</span>
                </div>
                <div className={`text-2xl font-bold mt-1 ${
                  netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  R$ {netIncome.toLocaleString('pt-BR')}
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Transações</span>
                </div>
                <div className="text-2xl font-bold text-gray-600 mt-1">
                  {previewTransactions.length}
                </div>
              </div>
            </div>
            
            {/* Tabela de Transações */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Todas ({previewTransactions.length})</TabsTrigger>
                <TabsTrigger value="income">Receitas ({previewTransactions.filter(t => t.type === 'income').length})</TabsTrigger>
                <TabsTrigger value="expense">Despesas ({previewTransactions.filter(t => t.type === 'expense').length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Tipo</th>
                        <th className="text-left p-3 font-medium">Categoria</th>
                        <th className="text-left p-3 font-medium">Descrição</th>
                        <th className="text-right p-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTransactions.map((transaction, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="p-3">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3">
                            <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </td>
                          <td className="p-3 capitalize">{transaction.category.replace('_', ' ')}</td>
                          <td className="p-3">{transaction.description}</td>
                          <td className={`p-3 text-right font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              <TabsContent value="income" className="mt-4">
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Categoria</th>
                        <th className="text-left p-3 font-medium">Descrição</th>
                        <th className="text-right p-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTransactions.filter(t => t.type === 'income').map((transaction, index) => (
                        <tr key={index} className="border-t hover:bg-green-50">
                          <td className="p-3">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 capitalize">{transaction.category.replace('_', ' ')}</td>
                          <td className="p-3">{transaction.description}</td>
                          <td className="p-3 text-right font-medium text-green-600">
                            +R$ {transaction.amount.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              <TabsContent value="expense" className="mt-4">
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Categoria</th>
                        <th className="text-left p-3 font-medium">Descrição</th>
                        <th className="text-right p-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTransactions.filter(t => t.type === 'expense').map((transaction, index) => (
                        <tr key={index} className="border-t hover:bg-red-50">
                          <td className="p-3">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 capitalize">{transaction.category.replace('_', ' ')}</td>
                          <td className="p-3">{transaction.description}</td>
                          <td className="p-3 text-right font-medium text-red-600">
                            -R$ {transaction.amount.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}