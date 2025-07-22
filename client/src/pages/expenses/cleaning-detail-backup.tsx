import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Edit2, Check, X, FileSpreadsheet, FileText, Filter, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TransactionDetailModal from '@/components/expenses/TransactionDetailModal';
import type { Property } from '@/types';

const MANAGEMENT_SUBCATEGORIES = [
  'Gestão (Maurício)', 'Comissões', 'Administração Imobiliária', 
  'Consultoria', 'Assessoria Jurídica', 'Outros Gestão'
];

interface Transaction {
  id: number;
  description: string;
  date: string;
  amount: number;
  category: string;
  propertyId: number;
  propertyName: string;
  supplier?: string;
}

interface ManagementDetailRow {
  propertyName: string;
  monthlyData: { [monthKey: string]: { amount: number; transactions: Transaction[] } };
  total: number;
}

interface ManagementDetailData {
  rows: ManagementDetailRow[];
  monthHeaders: string[];
  columnTotals: { [monthKey: string]: number };
  grandTotal: number;
  propertyRows: { propertyId: number; propertyName: string; monthlyAmounts: { [monthKey: string]: number }; total: number }[];
}

export default function ManagementDetailPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current month as default
  const getCurrentMonth = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  const [selectedMonths, setSelectedMonths] = useState<string[]>([getCurrentMonth()]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc'; } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailModalTransactions, setDetailModalTransactions] = useState<Transaction[]>([]);
  
  // View mode toggle - default to consolidated
  const [viewMode, setViewMode] = useState<'consolidated' | 'detailed'>('consolidated');

  // Force refetch on mount to get fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions?type=expense'] });
  }, [queryClient]);

  // Fetch all transactions including parent transactions for management expenses
  const { data: dashboardTransactions = [], isLoading: isLoadingDashboard } = useQuery<Transaction[]>({
    queryKey: ['/api/expenses/dashboard'],
  });
  
  // Fetch all transactions to get parent transactions too
  const { data: allTransactionsData = [], isLoading: isLoadingAll } = useQuery<any[]>({
    queryKey: ['/api/transactions?type=expense'],
  });
  
  // Combine and filter for management transactions
  const allTransactions = React.useMemo(() => {
    const combinedMap = new Map();
    
    // Add dashboard transactions (child transactions with propertyId)
    dashboardTransactions.forEach(t => {
      if (t.category === 'management') {
        combinedMap.set(t.id, t);
      }
    });
    
    // Add parent transactions from all transactions
    allTransactionsData.forEach(t => {
      if (t.category === 'management' && !combinedMap.has(t.id)) {
        combinedMap.set(t.id, t);
      }
    });
    
    return Array.from(combinedMap.values());
  }, [dashboardTransactions, allTransactionsData]);

  const { data: allProperties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const isLoading = isLoadingDashboard || isLoadingAll || isLoadingProperties;

  // Apply URL filters when component mounts and data is loaded
  useEffect(() => {
    if (!filtersInitialized && allProperties.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Apply months filter from URL only if provided, otherwise keep current month
      const monthsParam = urlParams.get('months');
      if (monthsParam) {
        setSelectedMonths(monthsParam.split(','));
      }
      
      // Apply properties filter from URL (all properties if specified)
      const propertiesParam = urlParams.get('properties');
      if (propertiesParam) {
        const propertyIds = propertiesParam.split(',').map(Number).filter(id => !isNaN(id));
        setSelectedProperties(propertyIds);
      } else {
        // Default to all properties if no specific ones selected
        setSelectedProperties(allProperties.map(p => p.id));
      }
      
      setFiltersInitialized(true);
    }
  }, [allProperties, filtersInitialized]);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; amount: number }) => {
      const response = await fetch(`/api/transactions/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: data.amount }),
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({ title: "Transação atualizada", description: "O valor foi atualizado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a transação.", variant: "destructive" });
    },
  });

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 12; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ key: monthKey, label: monthName });
    }
    
    for (let i = 0; i <= 23; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ key: monthKey, label: monthName });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Filter transactions based on selected filters
  const filteredTransactions = allTransactions.filter((transaction: any) => {
    if (transaction.category !== 'management') return false;
    
    // Include both old format (no parent/child) and new format (only children)
    if (transaction.parentTransactionId === undefined || transaction.parentTransactionId === null) {
      // For old format, check if it has children - if yes, skip it (it's a parent)
      const hasChildren = allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
      if (hasChildren) return false;
    } else if (transaction.parentTransactionId === null) {
      return false; // Skip parent transactions in new format
    }
    
    const date = new Date(transaction.date);
    const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    
    if (!selectedMonths.includes(monthKey)) return false;
    if (selectedProperties.length > 0 && !selectedProperties.includes(transaction.propertyId)) return false;
    
    return true;
  });

  const generateManagementDetailData = (): ManagementDetailData => {
    const detailData: Record<string, Record<string, { amount: number; transactions: Transaction[] }>> = {};
    
    // Get management transactions - both old format (no parent/child) and new format (only children)
    const managementTransactions = allTransactions.filter((transaction: any) => {
      if (transaction.category !== 'management') return false;
      
      // For old transactions without parent/child structure
      if (transaction.parentTransactionId === undefined || transaction.parentTransactionId === null) {
        // Check if this transaction has any children - if yes, skip it (it's a parent)
        const hasChildren = allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
        return !hasChildren;
      }
      
      // For new transactions with parent/child structure, only include children
      return transaction.parentTransactionId !== null;
    });

    managementTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!selectedMonths.includes(monthKey)) return;
      if (selectedProperties.length > 0 && !selectedProperties.includes(transaction.propertyId)) return;
      
      const propertyName = allProperties.find(p => p.id === transaction.propertyId)?.name || 'Unknown';
      
      if (!detailData[propertyName]) detailData[propertyName] = {};
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
        propertyName,
        supplier: transaction.supplier,
        cpfCnpj: transaction.cpfCnpj,
        parentTransactionId: transaction.parentTransactionId
      });
    });

    const rows: ManagementDetailRow[] = [];
    const monthHeaders = selectedMonths.sort();
    const columnTotals: { [monthKey: string]: number } = {};
    
    monthHeaders.forEach(month => { columnTotals[month] = 0; });
    
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
      
      if (total > 0) {
        rows.push({ propertyName, monthlyData, total });
      }
    });

    const grandTotal = Object.values(columnTotals).reduce((sum, val) => sum + val, 0);

    // Generate propertyRows for consolidated view (properties as columns)
    const propertyRows = rows.map(row => ({
      propertyId: allProperties.find(p => p.name === row.propertyName)?.id || 0,
      propertyName: row.propertyName,
      monthlyAmounts: Object.entries(row.monthlyData).reduce((acc, [month, data]) => {
        acc[month] = data.amount;
        return acc;
      }, {} as { [monthKey: string]: number }),
      total: row.total
    }));

    return { rows, monthHeaders, columnTotals, grandTotal, propertyRows };
  };

  const managementDetailData = generateManagementDetailData();

  // Generate consolidated data for management expenses
  const generateConsolidatedData = () => {
    const consolidatedData: ConsolidatedData[] = [];
    
    // Get management transactions
    const managementTransactions = allTransactions.filter((transaction: any) => {
      if (transaction.category !== 'management') return false;
      
      // Include all management transactions
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!selectedMonths.includes(monthKey)) return false;
      if (selectedProperties.length > 0 && transaction.propertyId && !selectedProperties.includes(transaction.propertyId)) return false;
      
      return true;
    });

    // Group by month
    const monthlyData: Record<string, { total: number; count: number }> = {};
    
    managementTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0 };
      }
      
      monthlyData[monthKey].total += Math.abs(parseFloat(transaction.amount.toString()));
      monthlyData[monthKey].count += 1;
    });

    // Convert to array and sort
    Object.entries(monthlyData).forEach(([month, data]) => {
      consolidatedData.push({
        month,
        total: data.total,
        count: data.count
      });
    });

    // Sort by month
    consolidatedData.sort((a, b) => {
      const [monthA, yearA] = a.month.split('/').map(Number);
      const [monthB, yearB] = b.month.split('/').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });

    return consolidatedData;
  };

  const consolidatedData = generateConsolidatedData();

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = [...managementDetailData.rows].sort((a, b) => {
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
      aValue = a.total / managementDetailData.monthHeaders.length;
      bValue = b.total / managementDetailData.monthHeaders.length;
    } else {
      aValue = a.monthlyData[key]?.amount || 0;
      bValue = b.monthlyData[key]?.amount || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev => 
      prev.includes(monthKey) ? prev.filter(m => m !== monthKey) : [...prev, monthKey]
    );
  };

  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) ? prev.filter(p => p !== propertyId) : [...prev, propertyId]
    );
  };



  const clearAllFilters = () => {
    setSelectedMonths([getCurrentMonth()]);
    setSelectedProperties([]);
  };

  const handleCellClick = (propertyName: string, monthKey: string) => {
    const cellKey = `${propertyName}-${monthKey}`;
    const monthData = managementDetailData.rows.find(r => r.propertyName === propertyName)?.monthlyData[monthKey];
    
    if (monthData && monthData.transactions.length > 0) {
      setEditingCell(cellKey);
      setEditValue(monthData.amount.toString());
    }
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    const [propertyName, monthKey] = editingCell.split('-');
    const monthData = managementDetailData.rows.find(r => r.propertyName === propertyName)?.monthlyData[monthKey];
    
    if (monthData && monthData.transactions.length > 0) {
      const newAmount = parseFloat(editValue) || 0;
      const transaction = monthData.transactions[0];
      
      updateMutation.mutate({
        id: transaction.id,
        amount: -Math.abs(newAmount)
      });
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const formatNumber = (num: number): string => {
    if (num === 0) return '';
    return Math.abs(num).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedMonths.length !== 1 || selectedMonths[0] !== '01/2022') count++;
    if (selectedProperties.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Propriedade', ...managementDetailData.monthHeaders];
    
    if (managementDetailData.monthHeaders.length > 1) {
      headers.push(`Média Mensal (÷${managementDetailData.monthHeaders.length})`);
    }
    
    headers.push('Total');
    const data = [headers];
    
    sortedRows.forEach(row => {
      const rowData = [
        row.propertyName,
        ...managementDetailData.monthHeaders.map(month => {
          const monthData = row.monthlyData[month];
          return monthData ? -monthData.amount : 0;
        })
      ];
      
      if (managementDetailData.monthHeaders.length > 1) {
        rowData.push(-row.total / managementDetailData.monthHeaders.length);
      }
      
      rowData.push(-row.total);
      data.push(rowData);
    });
    
    const totalsRow = ['TOTAL', ...managementDetailData.monthHeaders.map(month => -managementDetailData.columnTotals[month])];
    
    if (managementDetailData.monthHeaders.length > 1) {
      totalsRow.push(-managementDetailData.grandTotal / managementDetailData.monthHeaders.length);
    }
    
    totalsRow.push(-managementDetailData.grandTotal);
    data.push(totalsRow);
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    const colWidths = [{ wch: 20 }];
    managementDetailData.monthHeaders.forEach(() => colWidths.push({ wch: 12 }));
    
    if (managementDetailData.monthHeaders.length > 1) {
      colWidths.push({ wch: 15 });
    }
    
    colWidths.push({ wch: 12 });
    ws['!cols'] = colWidths;
    
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = 1; col <= range.e.c; col++) {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number' && cell.v < 0) {
          cell.s = { font: { color: { rgb: 'FF0000' } }, numFmt: '#,##0' };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Gestão');
    
    const fileName = `Gestao_detalhes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({ title: "Exportação concluída", description: `Arquivo ${fileName} foi baixado com sucesso.` });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Gestão - Detalhes por Propriedade', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    
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
    
    const headers = ['Propriedade', ...managementDetailData.monthHeaders];
    
    if (managementDetailData.monthHeaders.length > 1) {
      headers.push('Média Mensal');
    }
    
    headers.push('Total');
    
    const data = sortedRows.map(row => {
      const rowData = [
        row.propertyName,
        ...managementDetailData.monthHeaders.map(month => {
          const monthData = row.monthlyData[month];
          return monthData ? formatNumber(monthData.amount) : '';
        })
      ];
      
      if (managementDetailData.monthHeaders.length > 1) {
        rowData.push(formatNumber(row.total / managementDetailData.monthHeaders.length));
      }
      
      rowData.push(formatNumber(row.total));
      return rowData;
    });
    
    const totalsRow = ['TOTAL', ...managementDetailData.monthHeaders.map(month => formatNumber(managementDetailData.columnTotals[month]))];
    
    if (managementDetailData.monthHeaders.length > 1) {
      totalsRow.push(formatNumber(managementDetailData.grandTotal / managementDetailData.monthHeaders.length));
    }
    
    totalsRow.push(formatNumber(managementDetailData.grandTotal));
    data.push(totalsRow);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      didParseCell: function (data) {
        if (data.row.index >= 0 && data.column.index > 0) {
          const cellText = data.cell.text[0];
          if (cellText && (cellText.includes('-') || parseFloat(cellText.replace(/[^\d.-]/g, '')) < 0)) {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      }
    });
    
    const fileName = `Gestao_detalhes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({ title: "Exportação concluída", description: `Arquivo ${fileName} foi baixado com sucesso.` });
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
          <Button variant="outline" onClick={() => setLocation('/expenses')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalhes: Gestão - Maurício</h1>
            <p className="text-muted-foreground">Clique nas células para editar os valores</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md shadow-sm">
            <Button 
              onClick={() => setViewMode('consolidated')} 
              variant={viewMode === 'consolidated' ? 'default' : 'outline'}
              className="rounded-r-none"
              size="sm"
            >
              Consolidado
            </Button>
            <Button 
              onClick={() => setViewMode('detailed')} 
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              className="rounded-l-none"
              size="sm"
            >
              Detalhado
            </Button>
          </div>
          <Button onClick={() => setLocation('/expenses/management')} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa de Gestão
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

      <Card>
        <CardContent className="p-4">
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                  )}
                </div>
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
                        <label htmlFor={`month-${month.key}`} className="text-sm cursor-pointer flex-1">
                          {month.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

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
                        <label htmlFor={`property-${property.id}`} className="text-sm cursor-pointer flex-1">
                          {property.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>


              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Limpar Filtros
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {managementDetailData.rows.length} propriedades | Total: {formatNumber(managementDetailData.grandTotal)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Consolidated View Table - Payment totals by date */}
      {viewMode === 'consolidated' && managementDetailData && (
        <Card>
          <CardHeader>
            <CardTitle>Visão Consolidada - Valores Totais por Data de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-medium" style={{ minWidth: '120px' }}>Mês</th>
                    {/* Generate date columns dynamically based on actual payment dates */}
                    {(() => {
                      // Get all unique payment dates for the selected months
                      const paymentDates = new Set<string>();
                      allTransactions.forEach((transaction: any) => {
                        if (transaction.category === 'management') {
                          // Only count parent or standalone transactions
                          const isParent = transaction.parentTransactionId === null && 
                                         allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                          const isStandalone = transaction.parentTransactionId === null && 
                                             !allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                          
                          if (isParent || isStandalone) {
                            const date = new Date(transaction.date);
                            const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                            if (selectedMonths.includes(monthKey)) {
                              const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                              paymentDates.add(dayKey);
                            }
                          }
                        }
                      });
                      const sortedDates = Array.from(paymentDates).sort((a, b) => {
                        const [dayA, monthA] = a.split('/').map(Number);
                        const [dayB, monthB] = b.split('/').map(Number);
                        if (monthA !== monthB) return monthA - monthB;
                        return dayA - dayB;
                      });
                      return sortedDates.map(date => (
                        <th key={date} className="border border-gray-200 p-3 text-center font-medium" style={{ minWidth: '100px' }}>
                          {date}
                        </th>
                      ));
                    })()}
                    <th className="border border-gray-200 p-3 text-center font-medium" style={{ minWidth: '120px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {managementDetailData.monthHeaders.map((month, index) => {
                    // Calculate totals by payment date for this month
                    const dateAmounts: Record<string, number> = {};
                    let monthTotal = 0;
                    
                    // Debug: count management transactions for this month
                    const monthManagementTransactions = allTransactions.filter((t: any) => 
                      t.category === 'management' && 
                      `${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}/${new Date(t.date).getFullYear()}` === month
                    );
                    console.log(`Month ${month} has ${monthManagementTransactions.length} management transactions`);
                    
                    // Show parent transactions for debugging
                    const parentTransactions = monthManagementTransactions.filter((t: any) => 
                      t.parentTransactionId === null && allTransactions.some((child: any) => child.parentTransactionId === t.id)
                    );
                    const standaloneTransactions = monthManagementTransactions.filter((t: any) => 
                      t.parentTransactionId === null && !allTransactions.some((child: any) => child.parentTransactionId === t.id)
                    );
                    console.log(`Parent transactions:`, parentTransactions.map((t: any) => ({ 
                      id: t.id, 
                      date: t.date, 
                      amount: t.amount,
                      description: t.description 
                    })));
                    console.log(`Standalone transactions:`, standaloneTransactions.map((t: any) => ({ 
                      id: t.id, 
                      date: t.date, 
                      amount: t.amount,
                      description: t.description 
                    })));
                    
                    allTransactions.forEach((transaction: any) => {
                      if (transaction.category === 'management') {
                        const date = new Date(transaction.date);
                        const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        if (monthKey === month) {
                          const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                          
                          // Check if this is a parent transaction (has null parent_transaction_id and has children)
                          const isParent = transaction.parentTransactionId === null && 
                                         allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                          
                          if (isParent) {
                            // This is a parent transaction, use its amount (which represents the total)
                            console.log(`Adding parent transaction ${transaction.id} with amount ${transaction.amount} to date ${dayKey}`);
                            if (!dateAmounts[dayKey]) dateAmounts[dayKey] = 0;
                            dateAmounts[dayKey] += Math.abs(parseFloat(transaction.amount.toString()));
                            monthTotal += Math.abs(parseFloat(transaction.amount.toString()));
                          } else if (transaction.parentTransactionId === null) {
                            // Standalone transaction (no parent, no children)
                            console.log(`Adding standalone transaction ${transaction.id} with amount ${transaction.amount} to date ${dayKey}`);
                            if (!dateAmounts[dayKey]) dateAmounts[dayKey] = 0;
                            dateAmounts[dayKey] += Math.abs(parseFloat(transaction.amount.toString()));
                            monthTotal += Math.abs(parseFloat(transaction.amount.toString()));
                          }
                          // Skip child transactions as they are part of the parent's total
                        }
                      }
                    });
                    
                    console.log(`Month ${month} dateAmounts:`, dateAmounts);
                    
                    return (
                      <tr key={month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                        <td className="border border-gray-200 p-3 font-medium">{month}</td>
                        {(() => {
                          // Get all unique payment dates again for consistent columns
                          const paymentDates = new Set<string>();
                          allTransactions.forEach((transaction: any) => {
                            if (transaction.category === 'management') {
                              // Only count parent or standalone transactions
                              const isParent = transaction.parentTransactionId === null && 
                                             allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                              const isStandalone = transaction.parentTransactionId === null && 
                                                 !allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                              
                              if (isParent || isStandalone) {
                                const date = new Date(transaction.date);
                                const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                                if (selectedMonths.includes(monthKey)) {
                                  const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                                  paymentDates.add(dayKey);
                                }
                              }
                            }
                          });
                          const sortedDates = Array.from(paymentDates).sort((a, b) => {
                            const [dayA, monthA] = a.split('/').map(Number);
                            const [dayB, monthB] = b.split('/').map(Number);
                            if (monthA !== monthB) return monthA - monthB;
                            return dayA - dayB;
                          });
                          return sortedDates.map(date => (
                            <td key={date} className="border border-gray-200 p-3 text-center">
                              {dateAmounts[date] > 0 ? (
                                <button
                                  className="text-red-600 hover:text-red-800 hover:underline transition-colors"
                                  onClick={() => {
                                    // Get all transactions for this specific date in this month
                                    const dateTransactions = allTransactions.filter((t: any) => {
                                      if (t.category !== 'management') return false;
                                      const tDate = new Date(t.date);
                                      const tMonthKey = `${String(tDate.getMonth() + 1).padStart(2, '0')}/${tDate.getFullYear()}`;
                                      const tDayKey = `${String(tDate.getDate()).padStart(2, '0')}/${String(tDate.getMonth() + 1).padStart(2, '0')}`;
                                      
                                      // Include parent and standalone transactions for this date
                                      const isParent = t.parentTransactionId === null && 
                                                     allTransactions.some((child: any) => child.parentTransactionId === t.id);
                                      const isStandalone = t.parentTransactionId === null && 
                                                         !allTransactions.some((child: any) => child.parentTransactionId === t.id);
                                      
                                      return tMonthKey === month && tDayKey === date && (isParent || isStandalone);
                                    });
                                    
                                    setDetailModalTitle(`Gestão - Pagamentos em ${date}`);
                                    setDetailModalTransactions(dateTransactions);
                                    setDetailModalOpen(true);
                                  }}
                                >
                                  {formatNumber(dateAmounts[date])}
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          ));
                        })()}
                        <td className="border border-gray-200 p-3 text-center">
                          <span className="text-red-600 font-semibold">{formatNumber(monthTotal)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-200 p-3">TOTAL</td>
                    {(() => {
                      // Calculate grand totals for each date column
                      const grandDateTotals: Record<string, number> = {};
                      allTransactions.forEach((transaction: any) => {
                        if (transaction.category === 'management') {
                          const date = new Date(transaction.date);
                          const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                          if (selectedMonths.includes(monthKey)) {
                            const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                            
                            // Check if this is a parent transaction (has null parent_transaction_id and has children)
                            const isParent = transaction.parentTransactionId === null && 
                                           allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                            
                            if (isParent) {
                              // This is a parent transaction, use its amount (which represents the total)
                              if (!grandDateTotals[dayKey]) grandDateTotals[dayKey] = 0;
                              grandDateTotals[dayKey] += Math.abs(parseFloat(transaction.amount.toString()));
                            } else if (transaction.parentTransactionId === null) {
                              // Standalone transaction (no parent, no children)
                              if (!grandDateTotals[dayKey]) grandDateTotals[dayKey] = 0;
                              grandDateTotals[dayKey] += Math.abs(parseFloat(transaction.amount.toString()));
                            }
                          }
                        }
                      });
                      
                      const paymentDates = new Set<string>();
                      allTransactions.forEach((transaction: any) => {
                        if (transaction.category === 'management') {
                          // Only count parent or standalone transactions
                          const isParent = transaction.parentTransactionId === null && 
                                         allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                          const isStandalone = transaction.parentTransactionId === null && 
                                             !allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                          
                          if (isParent || isStandalone) {
                            const date = new Date(transaction.date);
                            const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                            if (selectedMonths.includes(monthKey)) {
                              const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                              paymentDates.add(dayKey);
                            }
                          }
                        }
                      });
                      const sortedDates = Array.from(paymentDates).sort((a, b) => {
                        const [dayA, monthA] = a.split('/').map(Number);
                        const [dayB, monthB] = b.split('/').map(Number);
                        if (monthA !== monthB) return monthA - monthB;
                        return dayA - dayB;
                      });
                      return sortedDates.map(date => (
                        <td key={date} className="border border-gray-200 p-3 text-center">
                          <span className="text-red-600 font-bold">
                            {formatNumber(grandDateTotals[date] || 0)}
                          </span>
                        </td>
                      ));
                    })()}
                    <td className="border border-gray-200 p-3 text-center">
                      <span className="text-red-600 font-bold">
                        {formatNumber((() => {
                          // Calculate the real grand total from all parent and standalone transactions
                          let realGrandTotal = 0;
                          allTransactions.forEach((transaction: any) => {
                            if (transaction.category === 'management') {
                              const date = new Date(transaction.date);
                              const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                              if (selectedMonths.includes(monthKey)) {
                                // Check if this is a parent transaction
                                const isParent = transaction.parentTransactionId === null && 
                                               allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                                // Check if this is a standalone transaction (no parent, no children)
                                const isStandalone = transaction.parentTransactionId === null && 
                                                   !allTransactions.some((t: any) => t.parentTransactionId === transaction.id);
                                
                                if (isParent || isStandalone) {
                                  realGrandTotal += Math.abs(parseFloat(transaction.amount.toString()));
                                }
                              }
                            }
                          });
                          return realGrandTotal;
                        })())}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed View Table */}
      {viewMode === 'detailed' && (
        <Card>
          <CardHeader>
            <CardTitle>Gestão - Maurício - Por Propriedade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-medium">
                    <button onClick={() => handleSort('propertyName')} className="flex items-center gap-2 hover:text-blue-600">
                      Propriedade
                      {sortConfig?.key === 'propertyName' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  {managementDetailData.monthHeaders.map(month => (
                    <th key={month} className="border border-gray-200 p-3 text-center font-medium">
                      <button onClick={() => handleSort(month)} className="flex items-center gap-2 hover:text-blue-600 mx-auto">
                        {month}
                        {sortConfig?.key === month && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                  ))}
                  {managementDetailData.monthHeaders.length > 1 && (
                    <th className="border border-gray-200 p-3 text-center font-medium bg-blue-50">
                      <button onClick={() => handleSort('average')} className="flex items-center gap-2 hover:text-blue-600 mx-auto">
                        Média Mensal (÷{managementDetailData.monthHeaders.length})
                        {sortConfig?.key === 'average' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                  )}
                  <th className="border border-gray-200 p-3 text-center font-medium">
                    <button onClick={() => handleSort('total')} className="flex items-center gap-2 hover:text-blue-600 mx-auto">
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
                  <tr key={row.propertyName} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="border border-gray-200 p-3 font-medium">
                      <button
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                        onClick={() => {
                          const allTransactions: Transaction[] = [];
                          Object.entries(row.monthlyData).forEach(([month, data]) => {
                            if (data.transactions) {
                              allTransactions.push(...data.transactions);
                            }
                          });
                          setDetailModalTitle(`Gestão - ${row.propertyName}`);
                          setDetailModalTransactions(allTransactions);
                          setDetailModalOpen(true);
                        }}
                      >
                        {row.propertyName}
                      </button>
                    </td>
                    {managementDetailData.monthHeaders.map(month => {
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
                              <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="p-1">
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="p-1">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                              onClick={() => {
                                if (monthData && monthData.transactions.length > 0) {
                                  // Group transactions by payment date for management expenses
                                  const groupedTransactions = monthData.transactions.reduce((acc: any, trans: any) => {
                                    const dateKey = new Date(trans.date).toLocaleDateString('pt-BR');
                                    if (!acc[dateKey]) {
                                      acc[dateKey] = {
                                        date: dateKey,
                                        totalAmount: 0,
                                        transactions: []
                                      };
                                    }
                                    acc[dateKey].totalAmount += Math.abs(parseFloat(trans.amount.toString()));
                                    acc[dateKey].transactions.push(trans);
                                    return acc;
                                  }, {});

                                  // Pass real transactions to modal, not formatted ones
                                  setDetailModalTitle(`Gestão - ${row.propertyName} - ${month}`);
                                  setDetailModalTransactions(monthData.transactions);
                                  setDetailModalOpen(true);
                                }
                              }}
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
                    {managementDetailData.monthHeaders.length > 1 && (
                      <td className="border border-gray-200 p-3 text-center font-semibold bg-blue-50">
                        <span className="text-red-600">
                          {formatNumber(row.total / managementDetailData.monthHeaders.length)}
                        </span>
                      </td>
                    )}
                    <td className="border border-gray-200 p-3 text-center font-semibold">
                      <span className="text-red-600">{formatNumber(row.total)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-200 p-3">TOTAL</td>
                  {managementDetailData.monthHeaders.map(month => (
                    <td key={month} className="border border-gray-200 p-3 text-center">
                      <span className="text-red-600 font-bold">
                        {formatNumber(managementDetailData.columnTotals[month])}
                      </span>
                    </td>
                  ))}
                  {managementDetailData.monthHeaders.length > 1 && (
                    <td className="border border-gray-200 p-3 text-center bg-blue-50">
                      <span className="text-red-600 font-bold">
                        {formatNumber(managementDetailData.grandTotal / managementDetailData.monthHeaders.length)}
                      </span>
                    </td>
                  )}
                  <td className="border border-gray-200 p-3 text-center">
                    <span className="text-red-600 font-bold">{formatNumber(managementDetailData.grandTotal)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detailModalTitle}
        transactions={detailModalTransactions}
        showPropertyColumn={false}
      />
    </div>
  );
}