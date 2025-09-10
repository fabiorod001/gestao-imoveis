import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Filter, Download, ChevronDown, X, TrendingUp, TrendingDown, Check, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileText, Plus, Edit } from "lucide-react";
import EditExpenseDialog from "@/components/expenses/EditExpenseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdvancedExpenseManager from "@/components/expenses/AdvancedExpenseManager";

interface Property {
  id: number;
  name: string;
  status: string;
}

interface Transaction {
  id: number;
  propertyId: number | null;
  propertyName?: string | null;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  supplier?: string | null;
  cpfCnpj?: string | null;
}

interface PivotRow {
  category: string;
  monthlyData: { [monthKey: string]: number };
  total: number;
  monthlyAverage: number;
}

interface PivotTableData {
  rows: PivotRow[];
  monthHeaders: string[];
  columnTotals: { [monthKey: string]: number };
  grandTotal: number;
}

const EXPENSE_CATEGORIES = [
  'taxes',
  'maintenance', 
  'condominium',
  'financing',
  'cleaning',
  'management',
  'other'
];

// Order for display in the table
const CATEGORY_ORDER = [
  'Impostos',
  'Manutenção', 
  'Condomínio',
  'Financiamento',
  'Limpezas',
  'Gestão - Maurício',
  'Despesas Gerais'
];

const EXPENSE_CATEGORY_LABELS: { [key: string]: string } = {
  'taxes': 'Impostos',
  'maintenance': 'Manutenção',
  'condominium': 'Condomínio',
  'financing': 'Financiamento',
  'cleaning': 'Limpezas',
  'management': 'Gestão - Maurício',
  'other': 'Despesas Gerais'
};

export default function ExpensesPage() {
  // Memoized current month to prevent re-renders
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }, []);
  
  const defaultMonths = useMemo(() => [currentMonth], [currentMonth]);
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>(defaultMonths);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState<string[]>(EXPENSE_CATEGORIES);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'consolidated' | 'detailed'>('consolidated');
  
  // Navigation hook
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  
  // Edit expense state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Handle category click navigation
  const handleCategoryClick = (categoryName: string) => {
    // Map category display name back to internal category and route
    const categoryMapping: { [key: string]: { key: string; route: string } } = {
      'Impostos': { key: 'taxes', route: '/expenses/taxes-detail' },
      'Manutenção': { key: 'maintenance', route: '/expenses/maintenance-detail' },
      'Condomínio': { key: 'condominium', route: '/expenses/condominium-detail' },
      'Financiamento': { key: 'financing', route: '/expenses/financing-detail' },
      'Limpezas': { key: 'cleaning', route: '/expenses/cleaning-detail' },
      'Gestão - Maurício': { key: 'management', route: '/expenses/management-detail' },
      'Despesas Gerais': { key: 'other', route: '/expenses/other-detail' }
    };
    
    const categoryInfo = categoryMapping[categoryName];
    if (!categoryInfo) return;
    
    // Navigate to specific category detail page with preset filters:
    // - Current month only
    // - All properties selected
    // - Only the specific category
    // currentMonth is now memoized above
    const allPropertyIds = allProperties.map(p => p.id);
    
    const params = new URLSearchParams({
      months: currentMonth,
      properties: allPropertyIds.join(','),
      category: categoryInfo.key
    });
    
    setLocation(`${categoryInfo.route}?${params.toString()}`);
  };

  // Fetch all properties for filters
  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    }
  });

  // Fetch expense transactions - optimized endpoint - FIXED TO PREVENT INFINITE LOOP
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['/api/expenses/dashboard', 'expenses-page'],
    queryFn: async () => {
      const res = await fetch('/api/expenses/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer cache
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnMount: false, // Don't refetch on mount
    refetchOnReconnect: false,
    enabled: true, // Only run once initially
    retry: 1 // Only retry once if it fails
  });

  // Handle expense completion from AdvancedExpenseManager
  const handleExpenseComplete = () => {
    setIsAddingExpense(false);
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  };

  // Generate month options (future 12 months + current + past 24 months, ordered newest first)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    // Future 12 months (newest first)
    for (let i = 12; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ key: monthKey, label: monthName });
    }
    
    // Past 24 months (newest first - current month down to oldest)
    for (let i = 0; i <= 23; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ key: monthKey, label: monthName });
    }
    
    return options;
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);



  // Generate pivot table data
  const generatePivotData = (): PivotTableData => {
    // Filter expenses based on selected filters
    const filteredExpenses = expenses.filter((expense: Transaction) => {
      const expenseDate = new Date(expense.date);
      const monthKey = `${String(expenseDate.getMonth() + 1).padStart(2, '0')}/${expenseDate.getFullYear()}`;
      
      // Month filter
      if (!selectedMonths.includes(monthKey)) {
        return false;
      }
      
      // Property filter
      if (selectedProperties.length > 0 && expense.propertyId && !selectedProperties.includes(expense.propertyId)) {
        return false;
      }
      
      // Expense type filter
      // Map utilities to other for compatibility
      const mappedCategory = expense.category === 'utilities' ? 'other' : (expense.category || 'other');
      if (!selectedExpenseTypes.includes(mappedCategory)) {
        return false;
      }
      
      return true;
    });

    // Get unique months from filtered data (sorted)
    const monthsSet = new Set<string>();
    filteredExpenses.forEach((expense: Transaction) => {
      const expenseDate = new Date(expense.date);
      const monthKey = `${String(expenseDate.getMonth() + 1).padStart(2, '0')}/${expenseDate.getFullYear()}`;
      monthsSet.add(monthKey);
    });
    
    // Sort months chronologically
    const sortedMonths = Array.from(monthsSet).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });

    // Initialize pivot data structure
    const pivotData: { [category: string]: { [monthKey: string]: number } } = {};
    const columnTotals: { [monthKey: string]: number } = {};
    
    // Initialize all categories in selected expense types
    selectedExpenseTypes.forEach(cat => {
      pivotData[cat] = {};
      sortedMonths.forEach(month => {
        pivotData[cat][month] = 0;
      });
    });
    
    // Initialize column totals
    sortedMonths.forEach(month => {
      columnTotals[month] = 0;
    });

    // Populate data
    filteredExpenses.forEach((expense: Transaction) => {
      const expenseDate = new Date(expense.date);
      const monthKey = `${String(expenseDate.getMonth() + 1).padStart(2, '0')}/${expenseDate.getFullYear()}`;
      // Map utilities to other for compatibility
      const category = expense.category === 'utilities' ? 'other' : (expense.category || 'other');
      
      if (pivotData[category]) {
        pivotData[category][monthKey] = (pivotData[category][monthKey] || 0) + Math.abs(expense.amount);
        columnTotals[monthKey] = (columnTotals[monthKey] || 0) + Math.abs(expense.amount);
      }
    });

    // Convert to rows format
    const rows: PivotRow[] = Object.entries(pivotData).map(([category, monthlyData]) => {
      const total = Object.values(monthlyData).reduce((sum, val) => sum + val, 0);
      const monthlyAverage = sortedMonths.length > 0 ? total / sortedMonths.length : 0;
      
      return {
        category: EXPENSE_CATEGORY_LABELS[category] || category,
        monthlyData,
        total,
        monthlyAverage
      };
    }); // Show all categories, even with zero values

    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

    return {
      rows,
      monthHeaders: sortedMonths,
      columnTotals,
      grandTotal
    };
  };

  const pivotData = useMemo(() => generatePivotData(), [expenses, selectedMonths, selectedProperties, selectedExpenseTypes]);

  // Sorting logic
  const sortData = (data: PivotRow[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortConfig.key === 'category') {
        aVal = a.category;
        bVal = b.category;
      } else if (sortConfig.key === 'total') {
        aVal = a.total;
        bVal = b.total;
      } else if (sortConfig.key === 'monthlyAverage') {
        aVal = a.monthlyAverage;
        bVal = b.monthlyAverage;
      } else if (sortConfig.key.startsWith('month-')) {
        const monthKey = sortConfig.key.replace('month-', '');
        aVal = a.monthlyData[monthKey] || 0;
        bVal = b.monthlyData[monthKey] || 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Sort data by category order if no other sort is applied - MEMOIZED
  const sortedData = useMemo(() => {
    const sortedByCategory = pivotData.rows.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.category);
      const indexB = CATEGORY_ORDER.indexOf(b.category);
      return indexA - indexB;
    });
    
    return sortData(sortedByCategory);
  }, [pivotData.rows, sortConfig]);

  // Column resizing
  const handleMouseDown = (column: string) => (e: React.MouseEvent) => {
    setIsResizing(column);
    const startX = e.clientX;
    const startWidth = columnWidths[column] || 150;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      setColumnWidths(prev => ({
        ...prev,
        [column]: Math.max(50, startWidth + diff)
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Export functions
  const exportToExcel = () => {
    if (viewMode === 'detailed') {
      // Export detailed transactions
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Data', 'Propriedade', 'Categoria', 'Descrição', 'Fornecedor', 'Valor'],
        ...expenses.map((expense: Transaction) => [
          new Date(expense.date).toLocaleDateString('pt-BR'),
          expense.propertyName || '-',
          EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
          expense.description,
          expense.supplier || '-',
          -Math.abs(expense.amount)
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Despesas Detalhadas');
      XLSX.writeFile(wb, `despesas_detalhadas_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
    
    // Export consolidated view (existing code)
    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Header row
    const headers = ['Categoria', ...pivotData.monthHeaders, 'Total'];
    if (selectedMonths.length > 1) {
      headers.push('Média Mensal');
    }
    wsData.push(headers);

    // Data rows
    sortedData.forEach(row => {
      const rowData = [
        row.category,
        ...pivotData.monthHeaders.map(month => row.monthlyData[month] || 0),
        row.total
      ];
      if (selectedMonths.length > 1) {
        rowData.push(row.monthlyAverage);
      }
      wsData.push(rowData);
    });

    // Total row
    const totalRow = [
      'Total',
      ...pivotData.monthHeaders.map(month => pivotData.columnTotals[month] || 0),
      pivotData.grandTotal
    ];
    if (selectedMonths.length > 1) {
      totalRow.push(pivotData.grandTotal / selectedMonths.length);
    }
    wsData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
    XLSX.writeFile(wb, 'despesas_pivot.xlsx');
  };

  const exportToPDF = () => {
    if (viewMode === 'detailed') {
      // Export detailed transactions
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(16);
      doc.text('Despesas Detalhadas', 14, 20);
      doc.setFontSize(10);
      doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
      
      const tableData = expenses.map((expense: Transaction) => [
        new Date(expense.date).toLocaleDateString('pt-BR'),
        expense.propertyName || '-',
        EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
        expense.description,
        expense.supplier || '-',
        `-R$ ${Math.abs(expense.amount).toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`
      ]);
      
      autoTable(doc, {
        head: [['Data', 'Propriedade', 'Categoria', 'Descrição', 'Fornecedor', 'Valor']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
        didDrawCell: (data) => {
          if (data.column.index === 5 && data.section === 'body') {
            doc.setTextColor(255, 0, 0);
          }
        },
        willDrawCell: (data) => {
          if (data.column.index !== 5 || data.section !== 'body') {
            doc.setTextColor(0, 0, 0);
          }
        }
      });
      
      doc.save(`despesas_detalhadas_${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }
    
    // Export consolidated view (existing code)
    const doc = new jsPDF('landscape');
    
    const headers = [['Categoria', ...pivotData.monthHeaders, 'Total']];
    if (selectedMonths.length > 1) {
      headers[0].push('Média Mensal');
    }

    const data = sortedData.map(row => {
      const rowData = [
        row.category,
        ...pivotData.monthHeaders.map(month => `R$ ${(row.monthlyData[month] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`),
        `R$ ${row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ];
      if (selectedMonths.length > 1) {
        rowData.push(`R$ ${row.monthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      }
      return rowData;
    });

    // Add total row
    const totalRow = [
      'Total',
      ...pivotData.monthHeaders.map(month => `R$ ${(pivotData.columnTotals[month] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`),
      `R$ ${pivotData.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ];
    if (selectedMonths.length > 1) {
      totalRow.push(`R$ ${(pivotData.grandTotal / selectedMonths.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
    data.push(totalRow);

    doc.text('Tabela Dinâmica de Despesas', 14, 15);
    
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 100, 100] }
    });

    doc.save('despesas_pivot.pdf');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground">Tabela dinâmica de despesas por categoria</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-muted rounded-md p-1">
            <Button
              variant={viewMode === 'consolidated' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('consolidated')}
              className="rounded-r-none"
            >
              Consolidado
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('detailed')}
              className="rounded-l-none"
            >
              Detalhado
            </Button>
          </div>
          <Button 
            onClick={() => setIsAddingExpense(!isAddingExpense)} 
            variant={isAddingExpense ? "secondary" : "default"} 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAddingExpense ? 'Fechar Formulário' : 'Nova Despesa'}
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Advanced Expense Manager - MOVED TO TOP */}
      {isAddingExpense && (
        <div className="mb-6">
          <AdvancedExpenseManager />
        </div>
      )}

      {/* Tabela Dinâmica de Despesas foi REMOVIDA conforme solicitado */}

      {/* Detailed View - Individual Transactions */}
      {viewMode === 'detailed' && (
        <Card>
          <CardHeader>
            <CardTitle>Transações Detalhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Data</th>
                    <th className="text-left p-2 font-medium">Propriedade</th>
                    <th className="text-left p-2 font-medium">Categoria</th>
                    <th className="text-left p-2 font-medium">Descrição</th>
                    <th className="text-left p-2 font-medium">Fornecedor</th>
                    <th className="text-right p-2 font-medium">Valor</th>
                    <th className="text-center p-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: Transaction) => {
                    const expenseDate = new Date(expense.date);
                    const formattedDate = expenseDate.toLocaleDateString('pt-BR');
                    
                    return (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formattedDate}</td>
                        <td className="p-2">{expense.propertyName || '-'}</td>
                        <td className="p-2">{EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}</td>
                        <td className="p-2">{expense.description}</td>
                        <td className="p-2">{expense.supplier || '-'}</td>
                        <td className="text-right p-2">
                          <button
                            className="text-red-600 hover:text-red-800 hover:underline transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Clicou no valor da despesa:', expense);
                              setEditingTransaction(expense);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            -{Math.abs(expense.amount).toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </button>
                        </td>
                        <td className="text-center p-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransaction(expense);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-100">
                    <td colSpan={5} className="p-2">Total</td>
                    <td className="text-right p-2 text-red-600">
                      -{expenses.reduce((sum: number, expense: Transaction) => 
                        sum + Math.abs(expense.amount), 0
                      ).toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        transaction={editingTransaction}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}