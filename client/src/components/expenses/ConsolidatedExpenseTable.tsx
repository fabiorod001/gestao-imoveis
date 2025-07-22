import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, FileText, Calculator, Lightbulb, Wrench, Home, Sparkles, CreditCard, Receipt } from 'lucide-react';

interface Transaction {
  id: number;
  propertyId: number;
  propertyName: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  currency: string;
  supplier?: string;
  cpfCnpj?: string;
  metadata?: any;
}

interface Property {
  id: number;
  name: string;
}

interface ConsolidatedExpenseTableProps {
  category: string;
  currentMonth?: string;
  onDataUpdate?: () => void;
}

const categoryConfig = {
  condominium: {
    title: 'Condomínio',
    icon: Building2,
    detailRoute: '/expenses/condominium',
    color: 'text-blue-600',
  },
  management: {
    title: 'Gestão Maurício',
    icon: FileText,
    detailRoute: '/expenses/management',
    color: 'text-green-600',
  },
  taxes: {
    title: 'Impostos',
    icon: Calculator,
    detailRoute: '/expenses/taxes',
    color: 'text-red-600',
  },
  utilities: {
    title: 'Luz, Gás e Água',
    icon: Lightbulb,
    detailRoute: '/expenses/utilities',
    color: 'text-yellow-600',
  },
  maintenance: {
    title: 'Manutenção',
    icon: Wrench,
    detailRoute: '/expenses/maintenance',
    color: 'text-orange-600',
  },
  cleaning: {
    title: 'Limpeza',
    icon: Sparkles,
    detailRoute: '/expenses/cleaning',
    color: 'text-purple-600',
  },
  financing: {
    title: 'Financiamento',
    icon: CreditCard,
    detailRoute: '/expenses/financing',
    color: 'text-gray-600',
  },
  iptu: {
    title: 'IPTU',
    icon: Receipt,
    detailRoute: '/expenses/financing',
    color: 'text-indigo-600',
  },
};

export default function ConsolidatedExpenseTable({ 
  category, 
  currentMonth,
  onDataUpdate 
}: ConsolidatedExpenseTableProps) {
  const [, setLocation] = useLocation();
  const [monthKey, setMonthKey] = useState<string>('');

  // Set current month
  useEffect(() => {
    if (currentMonth) {
      setMonthKey(currentMonth);
    } else {
      const now = new Date();
      const key = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      setMonthKey(key);
    }
  }, [currentMonth]);

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch transactions
  const { data: allTransactions = [], isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/expenses/dashboard'],
  });

  // Listen for data updates
  useEffect(() => {
    if (onDataUpdate) {
      refetch();
    }
  }, [onDataUpdate, refetch]);

  // Filter transactions for current month and category
  const filteredTransactions = allTransactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (t.category !== category) return false;
    
    const transactionMonth = t.date.substring(5, 7) + '/' + t.date.substring(0, 4);
    return transactionMonth === monthKey;
  });

  // For management expenses, group by unique payment (parent transactions only)
  let dateGroups: Record<string, { date: string; total: number; transactionCount: number }> = {};
  
  if (category === 'management') {
    // Group management expenses by date and parent transaction
    const parentTransactions = new Map<string, { date: string; amount: number }>();
    
    filteredTransactions.forEach(transaction => {
      const dateKey = format(new Date(transaction.date), 'dd/MM');
      const parentId = transaction.metadata?.parentTransactionId;
      
      // If this is a child transaction (has parentTransactionId), skip it
      if (parentId) return;
      
      // Check if this transaction has children (is a parent)
      const hasChildren = filteredTransactions.some(t => 
        t.metadata?.parentTransactionId === transaction.id
      );
      
      if (hasChildren) {
        // This is a parent transaction, use its total
        const childrenTotal = filteredTransactions
          .filter(t => t.metadata?.parentTransactionId === transaction.id)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        parentTransactions.set(`${dateKey}-${transaction.id}`, {
          date: dateKey,
          amount: childrenTotal
        });
      } else if (!transaction.metadata?.parentTransactionId) {
        // Standalone transaction
        parentTransactions.set(`${dateKey}-${transaction.id}`, {
          date: dateKey,
          amount: Math.abs(transaction.amount)
        });
      }
    });
    
    // Group by date
    parentTransactions.forEach((value) => {
      if (!dateGroups[value.date]) {
        dateGroups[value.date] = {
          date: value.date,
          total: 0,
          transactionCount: 0
        };
      }
      dateGroups[value.date].total += value.amount;
      dateGroups[value.date].transactionCount += 1;
    });
  } else {
    // For other categories, simple grouping by date
    dateGroups = filteredTransactions.reduce((acc, transaction) => {
      const dateKey = format(new Date(transaction.date), 'dd/MM');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          total: 0,
          transactionCount: 0
        };
      }
      acc[dateKey].total += Math.abs(transaction.amount);
      acc[dateKey].transactionCount += 1;
      return acc;
    }, {} as Record<string, { date: string; total: number; transactionCount: number }>);
  }

  // Sort by date
  const sortedDates = Object.values(dateGroups).sort((a, b) => {
    const [dayA, monthA] = a.date.split('/').map(Number);
    const [dayB, monthB] = b.date.split('/').map(Number);
    return dayA - dayB;
  });

  // Calculate grand total
  const grandTotal = sortedDates.reduce((sum, item) => sum + item.total, 0);

  const config = categoryConfig[category as keyof typeof categoryConfig] || {
    title: category,
    icon: FileText,
    detailRoute: '/expenses',
    color: 'text-gray-600',
  };

  const Icon = config.icon;

  const handleCategoryClick = () => {
    // Navigate to detail page with current month filter
    setLocation(`${config.detailRoute}?months=${monthKey}`);
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show table if no data
  if (sortedDates.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Despesas Consolidadas - {monthKey}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium cursor-pointer hover:underline" onClick={handleCategoryClick}>
                  <div className={`flex items-center gap-2 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                    {config.title}
                  </div>
                </TableHead>
                {sortedDates.map((dateGroup) => (
                  <TableHead key={dateGroup.date} className="text-center font-medium">
                    {dateGroup.date}
                  </TableHead>
                ))}
                <TableHead className="text-center font-medium">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell />
                {sortedDates.map((dateGroup) => (
                  <TableCell key={dateGroup.date} className="text-center">
                    <span className="text-red-600 font-medium">
                      {dateGroup.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <span className="text-red-600 font-medium">
                    {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}