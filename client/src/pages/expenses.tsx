import { useState, useEffect } from "react";
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

const EXPENSE_CATEGORY_LABELS = {
  'taxes': 'Impostos',
  'maintenance': 'Manutenção',
  'condominium': 'Condomínio',
  'financing': 'Financiamento',
  'cleaning': 'Limpezas',
  'management': 'Gestão - Maurício',
  'other': 'Despesas Gerais'
};

export default function ExpensesPage() {
  // Function to get current month in MM/YYYY format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };
  
  // Always default to current month
  const currentMonth = getCurrentMonth(); // "07/2025"
  const defaultMonths = [currentMonth];
  
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
    const currentMonth = getCurrentMonth();
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

  // Fetch expense transactions - optimized endpoint
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['/api/expenses/dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/expenses/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    }
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

  const monthOptions = generateMonthOptions();



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

  const pivotData = generatePivotData();

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

  // Sort data by category order if no other sort is applied
  const sortedByCategory = pivotData.rows.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.category);
    const indexB = CATEGORY_ORDER.indexOf(b.category);
    return indexA - indexB;
  });
  
  const sortedData = sortData(sortedByCategory);

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
          <AdvancedExpenseManager 
            onComplete={handleExpenseComplete}
            onCancel={() => setIsAddingExpense(false)}
          />
        </div>
      )}

      {/* Consolidated View - Pivot Table */}
      {viewMode === 'consolidated' && (
        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tabela Dinâmica de Despesas</CardTitle>
            <div className="flex items-center gap-2">
              {/* Quick Period Selection Buttons */}
              <div className="flex gap-1">
                <Button
                  variant={selectedMonths.length === 1 && selectedMonths[0] === getCurrentMonth() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMonths([getCurrentMonth()])}
                  className="h-8 px-3 text-xs"
                >
                  Mês Atual
                </Button>
                <Button
                  variant={selectedMonths.length === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Select last 3 months
                    const months = [];
                    const now = new Date();
                    for (let i = 0; i < 3; i++) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      months.push(`${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
                    }
                    setSelectedMonths(months);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  3 meses
                </Button>
                <Button
                  variant={selectedMonths.length === 5 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Select last 5 months
                    const months = [];
                    const now = new Date();
                    for (let i = 0; i < 5; i++) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      months.push(`${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
                    }
                    setSelectedMonths(months);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  5 meses
                </Button>
                <Button
                  variant={selectedMonths.length === 12 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Select last 12 months
                    const months = [];
                    const now = new Date();
                    for (let i = 0; i < 12; i++) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      months.push(`${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
                    }
                    setSelectedMonths(months);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  12 meses
                </Button>
              </div>
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>
          {isFiltersOpen && (
            <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Month Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meses</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <Calendar className="h-4 w-4 mr-2" />
                        {selectedMonths.length === 1 ? monthOptions.find(m => m.key === selectedMonths[0])?.label : `${selectedMonths.length} meses`}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar mês..." />
                        <CommandEmpty>Nenhum mês encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {monthOptions.map(option => (
                            <CommandItem
                              key={option.key}
                              onSelect={() => {
                                setSelectedMonths(prev => 
                                  prev.includes(option.key) 
                                    ? prev.filter(m => m !== option.key)
                                    : [...prev, option.key]
                                );
                              }}
                            >
                              <Check className={`h-4 w-4 mr-2 ${selectedMonths.includes(option.key) ? 'opacity-100' : 'opacity-0'}`} />
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Property Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Propriedades</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedProperties.length === 0 ? 'Todas' : `${selectedProperties.length} selecionadas`}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar propriedade..." />
                        <CommandEmpty>Nenhuma propriedade encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {allProperties.map(property => (
                            <CommandItem
                              key={property.id}
                              onSelect={() => {
                                setSelectedProperties(prev => 
                                  prev.includes(property.id) 
                                    ? prev.filter(id => id !== property.id)
                                    : [...prev, property.id]
                                );
                              }}
                            >
                              <Check className={`h-4 w-4 mr-2 ${selectedProperties.includes(property.id) ? 'opacity-100' : 'opacity-0'}`} />
                              {property.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Expense Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categorias</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedExpenseTypes.length === EXPENSE_CATEGORIES.length ? 'Todas' : `${selectedExpenseTypes.length} selecionadas`}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {EXPENSE_CATEGORIES.map(category => (
                            <CommandItem
                              key={category}
                              onSelect={() => {
                                setSelectedExpenseTypes(prev => 
                                  prev.includes(category) 
                                    ? prev.filter(c => c !== category)
                                    : [...prev, category]
                                );
                              }}
                            >
                              <Check className={`h-4 w-4 mr-2 ${selectedExpenseTypes.includes(category) ? 'opacity-100' : 'opacity-0'}`} />
                              {EXPENSE_CATEGORY_LABELS[category]}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMonths(defaultMonths);
                    setSelectedProperties([]);
                    setSelectedExpenseTypes(EXPENSE_CATEGORIES);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left p-2 font-medium relative cursor-pointer hover:bg-gray-50"
                    onClick={() => setSortConfig(prev => ({
                      key: 'category',
                      direction: prev?.key === 'category' && prev.direction === 'asc' ? 'desc' : 'asc'
                    }))}
                    style={{ width: columnWidths['category'] || 150 }}
                  >
                    <div className="flex items-center justify-between">
                      Categoria
                      {sortConfig?.key === 'category' && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                      onMouseDown={handleMouseDown('category')}
                    />
                  </th>
                  {pivotData.monthHeaders.map(month => (
                    <th 
                      key={month}
                      className="text-right p-2 font-medium relative cursor-pointer hover:bg-gray-50"
                      onClick={() => setSortConfig(prev => ({
                        key: `month-${month}`,
                        direction: prev?.key === `month-${month}` && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                      style={{ width: columnWidths[`month-${month}`] || 120 }}
                    >
                      <div className="flex items-center justify-end">
                        {monthOptions.find(m => m.key === month)?.label || month}
                        {sortConfig?.key === `month-${month}` && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={handleMouseDown(`month-${month}`)}
                      />
                    </th>
                  ))}
                  <th 
                    className="text-right p-2 font-medium relative cursor-pointer hover:bg-gray-50"
                    onClick={() => setSortConfig(prev => ({
                      key: 'total',
                      direction: prev?.key === 'total' && prev.direction === 'asc' ? 'desc' : 'asc'
                    }))}
                    style={{ width: columnWidths['total'] || 120 }}
                  >
                    <div className="flex items-center justify-end">
                      Total
                      {sortConfig?.key === 'total' && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                      onMouseDown={handleMouseDown('total')}
                    />
                  </th>
                  {selectedMonths.length > 1 && (
                    <th 
                      className="text-right p-2 font-medium relative cursor-pointer hover:bg-gray-50 bg-blue-50"
                      onClick={() => setSortConfig(prev => ({
                        key: 'monthlyAverage',
                        direction: prev?.key === 'monthlyAverage' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                      style={{ width: columnWidths['monthlyAverage'] || 150 }}
                    >
                      <div className="flex items-center justify-end">
                        Média Mensal
                        <span className="text-xs text-gray-500 ml-1">(÷ {selectedMonths.length})</span>
                        {sortConfig?.key === 'monthlyAverage' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={handleMouseDown('monthlyAverage')}
                      />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCategoryClick(row.category)}
                  >
                    <td className="p-2 font-medium">{row.category}</td>
                    {pivotData.monthHeaders.map(month => (
                      <td key={month} className="text-right p-2 text-red-600">
                        {row.monthlyData[month] > 0 ? `-${row.monthlyData[month].toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    ))}
                    <td className="text-right p-2 font-medium text-red-600">
                      -{row.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    {selectedMonths.length > 1 && (
                      <td className="text-right p-2 font-medium text-red-600 bg-blue-50">
                        -{row.monthlyAverage.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="p-2">Total</td>
                  {pivotData.monthHeaders.map(month => (
                    <td key={month} className="text-right p-2 text-red-600">
                      -{(pivotData.columnTotals[month] || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                  ))}
                  <td className="text-right p-2 text-red-600">
                    -{pivotData.grandTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </td>
                  {selectedMonths.length > 1 && (
                    <td className="text-right p-2 text-red-600 bg-blue-50">
                      -{(pivotData.grandTotal / selectedMonths.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

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