import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Wrench } from "lucide-react";

interface TransactionWithPropertyName {
  id: number;
  type: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  propertyName?: string;
}

export default function RecentTransactions() {
  const { data: transactions = [], isLoading } = useQuery<TransactionWithPropertyName[]>({
    queryKey: ['/api/transactions', { limit: 10 }],
  });

  const getTransactionIcon = (type: string, category: string) => {
    if (type === 'revenue') return TrendingUp;
    if (category === 'maintenance') return Wrench;
    return TrendingDown;
  };

  const getTransactionColor = (type: string, category: string) => {
    if (type === 'revenue') return 'text-green-600 bg-green-100';
    if (category === 'maintenance') return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getTransactionLabel = (type: string, category: string) => {
    if (type === 'revenue') return 'Receita';
    if (category === 'maintenance') return 'Manutenção';
    return 'Despesa';
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Transações Recentes
          </CardTitle>
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma transação registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imóvel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const Icon = getTransactionIcon(transaction.type, transaction.category);
                  const colorClass = getTransactionColor(transaction.type, transaction.category);
                  const label = getTransactionLabel(transaction.type, transaction.category);
                  const amount = Number(transaction.amount);
                  
                  return (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.propertyName || 'Geral'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`inline-flex items-center ${colorClass}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'revenue' ? '+' : '-'} R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  );
}
