import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Upload, CheckCircle, Calendar } from "lucide-react";
import TransactionForm from "@/components/transactions/TransactionForm";
import AirbnbImport from "@/components/import/AirbnbImport";
import type { Transaction, Property } from "@shared/schema";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Revenues() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAirbnbOpen, setIsAirbnbOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedProperty, setSelectedProperty] = useState('all');

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', { type: 'revenue', limit: 100 }],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Filtrar por período
  const getDateRange = () => {
    const today = new Date();
    switch(selectedPeriod) {
      case 'previous':
        return { 
          start: startOfMonth(subMonths(today, 1)), 
          end: endOfMonth(subMonths(today, 1))
        };
      case 'current':
        return { 
          start: startOfMonth(today), 
          end: endOfMonth(today)
        };
      case 'next':
        return { 
          start: startOfMonth(addMonths(today, 1)), 
          end: endOfMonth(addMonths(today, 1))
        };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };
  
  const { start, end } = getDateRange();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filtrar transações
  let filteredRevenues = transactions;
  
  // Filtrar por período
  filteredRevenues = filteredRevenues.filter(t => {
    const date = new Date(t.date);
    return date >= start && date <= end;
  });
  
  // Filtrar por propriedade
  if (selectedProperty !== 'all') {
    filteredRevenues = filteredRevenues.filter(t => t.propertyId === parseInt(selectedProperty));
  }
  
  // Separar Airbnb Actual e Pending
  const airbnbRevenues = filteredRevenues.filter(r => r.category === 'airbnb');
  const actualRevenues = airbnbRevenues.filter(r => new Date(r.date) <= today);
  const pendingRevenues = airbnbRevenues.filter(r => new Date(r.date) > today);
  
  // Calcular totais
  const totalActual = actualRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPending = pendingRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalMonth = totalActual + totalPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
          <p className="text-gray-500">Gerencie todas as receitas dos seus imóveis</p>
        </div>

        <div className="flex gap-2">
          {/* Botão Upload CSV Airbnb */}
          <Dialog open={isAirbnbOpen} onOpenChange={setIsAirbnbOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV Airbnb
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Dados do Airbnb</DialogTitle>
              </DialogHeader>
              <AirbnbImport />
            </DialogContent>
          </Dialog>

          {/* Botão Nova Receita */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nova Receita</DialogTitle>
              </DialogHeader>
              <TransactionForm 
                type="revenue" 
                onSuccess={() => setIsFormOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous">Mês Anterior</SelectItem>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="next">Próximo Mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Imóvel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela Dinâmica com Actual, Pending e Total */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Período - {format(start, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Tipo</th>
                <th className="text-right py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">Actual (recebido até hoje)</td>
                <td className="text-right font-semibold text-blue-600">
                  R$ {totalActual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="py-2">Pending (a receber)</td>
                <td className="text-right font-semibold text-amber-600">
                  R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="border-t font-bold">
                <td className="py-2">Total do Mês</td>
                <td className="text-right text-green-600">
                  R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRevenues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma receita registrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Recebimento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imóvel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período Hospedagem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRevenues.map((revenue: any) => {
                    const property = properties.find(p => p.id === revenue.propertyId);
                    const categoryLabels: Record<string, string> = {
                      'airbnb': 'Airbnb',
                      'booking': 'Booking',
                      'recorrente': 'Recorrente',
                      'outros': 'Outros',
                      // Legacy categories
                      'rent': 'Aluguel',
                      'deposit': 'Depósito',
                      'late_fee': 'Taxa de Atraso',
                      'other': 'Outros'
                    };
                    
                    return (
                      <tr key={revenue.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(revenue.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {categoryLabels[revenue.category] || revenue.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {property?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {revenue.accommodationStartDate && revenue.accommodationEndDate ? (
                            <>
                              {new Date(revenue.accommodationStartDate).toLocaleDateString('pt-BR')} - {' '}
                              {new Date(revenue.accommodationEndDate).toLocaleDateString('pt-BR')}
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {revenue.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                          R$ {Number(revenue.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
