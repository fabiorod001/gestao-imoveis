import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit2, Save, X, Check, FileSpreadsheet, FileText, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: number;
  description: string;
  date: string;
  amount: number;
  category: string;
  propertyId: number;
  propertyName: string;
}

interface CategoryDetailRow {
  propertyName: string;
  monthlyData: { [monthKey: string]: { amount: number; transactions: Transaction[] } };
  total: number;
}

interface CategoryDetailData {
  rows: CategoryDetailRow[];
  monthHeaders: string[];
  columnTotals: { [monthKey: string]: number };
  grandTotal: number;
}

const CATEGORY_LABELS = {
  'taxes': 'Impostos',
  'maintenance': 'Manutenção',
  'management': 'Gestão',
  'utilities': 'Utilidades',
  'condominium': 'Condomínio',
  'financing': 'Financiamento'
};

// Subcategorias específicas para cada categoria principal
const SUBCATEGORY_OPTIONS = {
  'taxes': ['IPTU', 'ITBI', 'Taxa de Incêndio', 'Taxa de Lixo', 'Imposto de Renda', 'Outros Impostos'],
  'maintenance': ['Pintura', 'Encanamento', 'Elétrica', 'Ar Condicionado', 'Móveis', 'Eletrodomésticos', 'Limpeza Pós-Obra', 'Outros Reparos'],
  'management': ['Comissões', 'Gestão - Maurício', 'Corretagem', 'Administração', 'Outros'],
  'utilities': ['Energia Elétrica', 'Água', 'Gás', 'Internet/TV', 'Telefone', 'Outros'],
  'condominium': ['Taxa Condominial', 'Fundo de Reserva', 'Obras Extraordinárias', 'Multas', 'Outros'],
  'financing': ['Financiamento', 'Juros', 'Seguros', 'Taxas Bancárias', 'Outros']
};

export default function CategoryDetailPage() {
  const { category } = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const initialMonths = urlParams.get('months')?.split(',') || ['07/2025'];
  const initialProperties = urlParams.get('properties')?.split(',').map(Number) || [];

  // Filter states
  const [selectedMonths, setSelectedMonths] = useState<string[]>(initialMonths);
  const [selectedProperties, setSelectedProperties] = useState<number[]>(initialProperties);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Editing state
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch all properties
  const { data: allProperties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Fetch all transactions
  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    select: (data: any[]) => data.filter(t => t.type === 'expense')
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso!"
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar transação: " + error.message,
        variant: "destructive"
      });
    }
  });

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

  // Generate category detail data
  const generateCategoryDetailData = (): CategoryDetailData => {
    const detailData: Record<string, Record<string, { amount: number; transactions: Transaction[] }>> = {};
    
    // Filter transactions by category with smart mapping
    const categoryTransactions = allTransactions.filter((transaction: any) => {
      let effectiveCategory = transaction.category;
      
      // Apply same smart mapping as main expenses page
      if (transaction.category === 'utilities' && 
          transaction.description && 
          transaction.description.toLowerCase().includes('condomin')) {
        effectiveCategory = 'condominium';
      }
      
      return effectiveCategory === category;
    });

    categoryTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      // Filter by selected months
      if (!selectedMonths.includes(monthKey)) return;
      
      // Filter by selected properties
      if (selectedProperties.length > 0 && !selectedProperties.includes(transaction.propertyId)) return;
      
      // Filter by selected subcategories
      if (selectedSubcategories.length > 0) {
        const matchesSubcategory = selectedSubcategories.some(subcat => 
          transaction.description.toLowerCase().includes(subcat.toLowerCase()) ||
          transaction.description.toLowerCase().includes(subcat.toLowerCase().replace(' - ', ' '))
        );
        if (!matchesSubcategory) return;
      }
      
      const propertyName = allProperties.find(p => p.id === transaction.propertyId)?.name || 'Unknown';
      
      if (!detailData[propertyName]) {
        detailData[propertyName] = {};
      }
      
      if (!detailData[propertyName][monthKey]) {
        detailData[propertyName][monthKey] = { amount: 0, transactions: [] };
      }
      
      detailData[propertyName][monthKey].amount += Math.abs(parseFloat(transaction.amount.toString()));
      detailData[propertyName][monthKey].transactions.push({
        id: transaction.id,
        description: transaction.description,
        date: transaction.date,
        amount: transaction.amount,
        category: transaction.category,
        propertyId: transaction.propertyId,
        propertyName
      });
    });

    // Convert to array format
    const rows: CategoryDetailRow[] = [];
    const monthHeaders = selectedMonths.sort();
    const columnTotals: { [monthKey: string]: number } = {};
    
    // Initialize column totals
    monthHeaders.forEach(month => {
      columnTotals[month] = 0;
    });
    
    Object.keys(detailData).forEach(propertyName => {
      const monthlyData = detailData[propertyName];
      let total = 0;
      
      monthHeaders.forEach(month => {
        const monthData = monthlyData[month];
        if (monthData) {
          total += monthData.amount;
          columnTotals[month] += monthData.amount;
        }
      });
      
      if (total > 0) { // Only include properties with expenses
        rows.push({
          propertyName,
          monthlyData,
          total
        });
      }
    });

    const grandTotal = Object.values(columnTotals).reduce((sum, val) => sum + val, 0);

    return {
      rows,
      monthHeaders,
      columnTotals,
      grandTotal
    };
  };

  const categoryDetailData = generateCategoryDetailData();

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = [...categoryDetailData.rows].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    let aValue: number | string;
    let bValue: number | string;

    if (key === 'propertyName') {
      aValue = a.propertyName;
      bValue = b.propertyName;
    } else if (key === 'total') {
      aValue = a.total;
      bValue = b.total;
    } else if (key === 'average') {
      aValue = a.total / categoryDetailData.monthHeaders.length;
      bValue = b.total / categoryDetailData.monthHeaders.length;
    } else {
      // It's a month column
      aValue = a.monthlyData[key]?.amount || 0;
      bValue = b.monthlyData[key]?.amount || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }

    return direction === 'asc' 
      ? (aValue as number) - (bValue as number) 
      : (bValue as number) - (aValue as number);
  });

  // Handle filter changes
  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(p => p !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories(prev => 
      prev.includes(subcategory) 
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const clearAllFilters = () => {
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    setSelectedMonths([currentMonth]);
    setSelectedProperties([]);
    setSelectedSubcategories([]);
  };

  // Handle cell edit
  const handleCellClick = (propertyName: string, monthKey: string) => {
    const cellKey = `${propertyName}-${monthKey}`;
    const monthData = categoryDetailData.rows.find(r => r.propertyName === propertyName)?.monthlyData[monthKey];
    
    if (monthData && monthData.transactions.length > 0) {
      setEditingCell(cellKey);
      setEditValue(monthData.amount.toString());
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    const [propertyName, monthKey] = editingCell.split('-');
    const newAmount = parseFloat(editValue.replace(/[^\d,-]/g, '').replace(',', '.'));
    
    if (isNaN(newAmount)) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive"
      });
      return;
    }
    
    const monthData = categoryDetailData.rows.find(r => r.propertyName === propertyName)?.monthlyData[monthKey];
    
    if (monthData && monthData.transactions.length > 0) {
      // For simplicity, update the first transaction in the month
      const transaction = monthData.transactions[0];
      const adjustedAmount = transaction.amount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);
      
      await updateTransactionMutation.mutateAsync({
        id: transaction.id,
        amount: adjustedAmount
      });
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Format number
  const formatNumber = (num: number): string => {
    if (num === 0) return '';
    return Math.abs(num).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedMonths.length !== 1 || selectedMonths[0] !== '07/2025') count++;
    if (selectedProperties.length > 0) count++;
    if (selectedSubcategories.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Create header row
    const headers = ['Propriedade', ...categoryDetailData.monthHeaders];
    
    // Add monthly average column if multiple months selected
    if (categoryDetailData.monthHeaders.length > 1) {
      headers.push(`Média Mensal (÷${categoryDetailData.monthHeaders.length})`);
    }
    
    headers.push('Total');
    const data = [headers];
    
    // Add data rows
    sortedRows.forEach(row => {
      const rowData = [
        row.propertyName,
        ...categoryDetailData.monthHeaders.map(month => {
          const monthData = row.monthlyData[month];
          return monthData ? -monthData.amount : 0;
        })
      ];
      
      // Add monthly average if multiple months
      if (categoryDetailData.monthHeaders.length > 1) {
        rowData.push(-row.total / categoryDetailData.monthHeaders.length);
      }
      
      rowData.push(-row.total);
      data.push(rowData);
    });
    
    // Add totals row
    const totalsRow = [
      'TOTAL',
      ...categoryDetailData.monthHeaders.map(month => -categoryDetailData.columnTotals[month])
    ];
    
    if (categoryDetailData.monthHeaders.length > 1) {
      totalsRow.push(-categoryDetailData.grandTotal / categoryDetailData.monthHeaders.length);
    }
    
    totalsRow.push(-categoryDetailData.grandTotal);
    data.push(totalsRow);
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Style the worksheet
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Set column widths
    const colWidths = [{ wch: 20 }]; // Property name
    categoryDetailData.monthHeaders.forEach(() => colWidths.push({ wch: 12 })); // Month columns
    
    if (categoryDetailData.monthHeaders.length > 1) {
      colWidths.push({ wch: 15 }); // Monthly average column
    }
    
    colWidths.push({ wch: 12 }); // Total column
    ws['!cols'] = colWidths;
    
    // Apply styles to negative values (red text)
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = 1; col <= range.e.c; col++) {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number' && cell.v < 0) {
          cell.s = {
            font: { color: { rgb: 'FF0000' } },
            numFmt: '#,##0'
          };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, CATEGORY_LABELS[category] || category);
    
    const fileName = `${CATEGORY_LABELS[category] || category}_detalhes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Exportação concluída",
      description: `Arquivo ${fileName} foi baixado com sucesso.`,
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(16);
    doc.text(`${CATEGORY_LABELS[category] || category} - Detalhes por Propriedade`, 20, 20);
    
    // Add export date
    doc.setFontSize(10);
    doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    
    // Add filter information
    let yPosition = 40;
    if (activeFilterCount > 0) {
      const filterInfo = [];
      if (selectedMonths.length > 0) filterInfo.push(`Meses: ${selectedMonths.join(', ')}`);
      if (selectedProperties.length > 0) {
        const propertyNames = selectedProperties.map(id => allProperties.find(p => p.id === id)?.name).join(', ');
        filterInfo.push(`Propriedades: ${propertyNames}`);
      }
      if (selectedSubcategories.length > 0) filterInfo.push(`Subcategorias: ${selectedSubcategories.join(', ')}`);
      
      doc.setFontSize(8);
      filterInfo.forEach(info => {
        doc.text(info, 20, yPosition);
        yPosition += 8;
      });
      yPosition += 5;
    }
    
    // Prepare table data
    const headers = ['Propriedade', ...categoryDetailData.monthHeaders];
    
    if (categoryDetailData.monthHeaders.length > 1) {
      headers.push('Média Mensal');
    }
    
    headers.push('Total');
    
    const data = sortedRows.map(row => {
      const rowData = [
        row.propertyName,
        ...categoryDetailData.monthHeaders.map(month => {
          const monthData = row.monthlyData[month];
          return monthData ? formatNumber(monthData.amount) : '';
        })
      ];
      
      if (categoryDetailData.monthHeaders.length > 1) {
        rowData.push(formatNumber(row.total / categoryDetailData.monthHeaders.length));
      }
      
      rowData.push(formatNumber(row.total));
      return rowData;
    });
    
    // Add totals row
    const totalsRow = [
      'TOTAL',
      ...categoryDetailData.monthHeaders.map(month => formatNumber(categoryDetailData.columnTotals[month]))
    ];
    
    if (categoryDetailData.monthHeaders.length > 1) {
      totalsRow.push(formatNumber(categoryDetailData.grandTotal / categoryDetailData.monthHeaders.length));
    }
    
    totalsRow.push(formatNumber(categoryDetailData.grandTotal));
    data.push(totalsRow);
    
    // Create table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: yPosition,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      didParseCell: function (data) {
        if (data.row.index >= 0 && data.column.index > 0) {
          const cellText = data.cell.text[0];
          if (cellText && (cellText.includes('-') || parseFloat(cellText.replace(/[^\d.-]/g, '')) < 0)) {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      }
    });
    
    const fileName = `${CATEGORY_LABELS[category] || category}_detalhes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Exportação concluída",
      description: `Arquivo ${fileName} foi baixado com sucesso.`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/expenses')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Detalhes: {CATEGORY_LABELS[category] || category}
            </h1>
            <p className="text-muted-foreground">
              Clique nas células para editar os valores
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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

      {/* Advanced Filters Panel */}
      <Card>
        <CardContent className="p-4">
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Month Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meses</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white">
                    {monthOptions.map(month => (
                      <div key={month.key} className="flex items-center space-x-2 p-1">
                        <Checkbox
                          id={`month-${month.key}`}
                          checked={selectedMonths.includes(month.key)}
                          onCheckedChange={() => handleMonthToggle(month.key)}
                        />
                        <label
                          htmlFor={`month-${month.key}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {month.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Propriedades</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white">
                    {allProperties.map(property => (
                      <div key={property.id} className="flex items-center space-x-2 p-1">
                        <Checkbox
                          id={`property-${property.id}`}
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={() => handlePropertyToggle(property.id)}
                        />
                        <label
                          htmlFor={`property-${property.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {property.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subcategory Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subcategorias</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white">
                    {SUBCATEGORY_OPTIONS[category]?.map(subcategory => (
                      <div key={subcategory} className="flex items-center space-x-2 p-1">
                        <Checkbox
                          id={`subcat-${subcategory}`}
                          checked={selectedSubcategories.includes(subcategory)}
                          onCheckedChange={() => handleSubcategoryToggle(subcategory)}
                        />
                        <label
                          htmlFor={`subcat-${subcategory}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {subcategory}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Limpar Filtros
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {categoryDetailData.rows.length} propriedades | Total: {formatNumber(categoryDetailData.grandTotal)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {CATEGORY_LABELS[category] || category} - Por Propriedade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-medium">
                    <button 
                      onClick={() => handleSort('propertyName')}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Propriedade
                      {sortConfig?.key === 'propertyName' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  {categoryDetailData.monthHeaders.map(month => (
                    <th key={month} className="border border-gray-200 p-3 text-center font-medium">
                      <button 
                        onClick={() => handleSort(month)}
                        className="flex items-center gap-2 hover:text-blue-600 mx-auto"
                      >
                        {month}
                        {sortConfig?.key === month && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                  ))}
                  {categoryDetailData.monthHeaders.length > 1 && (
                    <th className="border border-gray-200 p-3 text-center font-medium bg-blue-50">
                      <button 
                        onClick={() => handleSort('average')}
                        className="flex items-center gap-2 hover:text-blue-600 mx-auto"
                      >
                        Média Mensal (÷{categoryDetailData.monthHeaders.length})
                        {sortConfig?.key === 'average' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                  )}
                  <th className="border border-gray-200 p-3 text-center font-medium">
                    <button 
                      onClick={() => handleSort('total')}
                      className="flex items-center gap-2 hover:text-blue-600 mx-auto"
                    >
                      Total
                      {sortConfig?.key === 'total' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr 
                    key={row.propertyName}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                  >
                    <td className="border border-gray-200 p-3 font-medium">
                      {row.propertyName}
                    </td>
                    {categoryDetailData.monthHeaders.map(month => {
                      const cellKey = `${row.propertyName}-${month}`;
                      const monthData = row.monthlyData[month];
                      const isEditing = editingCell === cellKey;
                      
                      return (
                        <td key={month} className="border border-gray-200 p-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 text-center"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                                className="p-1"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="p-1"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                              onClick={() => handleCellClick(row.propertyName, month)}
                            >
                              <span className="text-red-600 font-medium">
                                {monthData ? formatNumber(monthData.amount) : ''}
                              </span>
                              {monthData && monthData.transactions.length > 0 && (
                                <Edit2 className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {categoryDetailData.monthHeaders.length > 1 && (
                      <td className="border border-gray-200 p-3 text-center font-semibold bg-blue-50">
                        <span className="text-red-600">
                          {formatNumber(row.total / categoryDetailData.monthHeaders.length)}
                        </span>
                      </td>
                    )}
                    <td className="border border-gray-200 p-3 text-center font-semibold">
                      <span className="text-red-600">
                        {formatNumber(row.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-200 p-3">TOTAL</td>
                  {categoryDetailData.monthHeaders.map(month => (
                    <td key={month} className="border border-gray-200 p-3 text-center">
                      <span className="text-red-600 font-bold">
                        {formatNumber(categoryDetailData.columnTotals[month])}
                      </span>
                    </td>
                  ))}
                  {categoryDetailData.monthHeaders.length > 1 && (
                    <td className="border border-gray-200 p-3 text-center bg-blue-50">
                      <span className="text-red-600 font-bold">
                        {formatNumber(categoryDetailData.grandTotal / categoryDetailData.monthHeaders.length)}
                      </span>
                    </td>
                  )}
                  <td className="border border-gray-200 p-3 text-center">
                    <span className="text-red-600 font-bold">
                      {formatNumber(categoryDetailData.grandTotal)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}