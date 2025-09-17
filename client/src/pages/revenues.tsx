import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp } from "lucide-react";
import TransactionForm from "@/components/transactions/TransactionForm";
import type { Transaction, Property } from "@shared/schema";

export default function Revenues() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', { type: 'revenue', limit: 100 }],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const revenues = transactions; // Already filtered by API
  const totalRevenue = revenues.reduce((sum, t) => sum + Number(t.amount), 0);

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Total de Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-gray-500 mt-1">{revenues.length} receitas registradas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
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
                  {revenues.map((revenue) => {
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
