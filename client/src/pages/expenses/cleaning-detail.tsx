import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Edit2, Check, X, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Transaction, Property } from "@shared/schema";
import { DistributedExpenseForm } from "@/components/expenses/DistributedExpenseForm";
import TransactionDetailModal from "@/components/expenses/TransactionDetailModal";
import CleaningExpenseForm from "@/components/expenses/CleaningExpenseForm";
import type { CleaningDetailData } from "@/types";

// Generate month options for the last 24 months and next 12 months
function generateMonthOptions() {
  const options = [];
  const today = new Date();
  
  // Start from 24 months ago
  for (let i = -24; i <= 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const key = `${month}/${year}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const isCurrentMonth = i === 0;
    options.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), isCurrentMonth });
  }
  
  return options;
}

const monthOptions = generateMonthOptions();

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Helper function to generate consolidated data by payment date
function generateConsolidatedData(
  allTransactions: Transaction[], 
  selectedMonths: string[],
  selectedProperties: number[]
): {
  monthlyData: Record<string, Record<string, number>>;
  dateTotals: Record<string, number>;
  sortedDates: string[];
} {
  const monthlyData: Record<string, Record<string, number>> = {};
  const dateTotals: Record<string, number> = {};
  const allDates = new Set<string>();

  // Process all cleaning transactions
  allTransactions.forEach(transaction => {
    if (transaction.category === 'cleaning') {
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (selectedMonths.includes(monthKey)) {
        // Filter by selected properties if any are selected
        if (selectedProperties.length > 0 && transaction.propertyId && !selectedProperties.includes(transaction.propertyId)) {
          return;
        }
        const dayKey = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        allDates.add(dayKey);
        
        // Check if this is a parent transaction
        const isParent = transaction.parentTransactionId === null && 
                       allTransactions.some(t => t.parentTransactionId === transaction.id);
        const isStandalone = transaction.parentTransactionId === null && 
                           !allTransactions.some(t => t.parentTransactionId === transaction.id);
        
        if (isParent || isStandalone) {
          if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
          if (!monthlyData[monthKey][dayKey]) monthlyData[monthKey][dayKey] = 0;
          
          const amount = Math.abs(parseFloat(transaction.amount.toString()));
          monthlyData[monthKey][dayKey] += amount;
          
          if (!dateTotals[dayKey]) dateTotals[dayKey] = 0;
          dateTotals[dayKey] += amount;
        }
      }
    }
  });

  // Sort dates
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const [dayA, monthA] = a.split('/').map(Number);
    const [dayB, monthB] = b.split('/').map(Number);
    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  });

  return { monthlyData, dateTotals, sortedDates };
}

export default function CleaningDetailPage() {
  const { toast } = useToast();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    monthOptions.find(m => m.isCurrentMonth)?.key || '07/2025'
  ]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showDistributedForm, setShowDistributedForm] = useState(false);
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState("");
  const [detailModalTransactions, setDetailModalTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<'consolidated' | 'detailed'>('consolidated');
  
  // Editing states
  const [editingCell, setEditingCell] = useState<{ property: string; month: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch all properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  const allProperties = properties.filter(p => p.status === 'active');

  // Fetch all transactions (not just dashboard)
  const { data: allTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch dashboard data for cleaning expenses
  const { data: cleaningData } = useQuery<CleaningDetailData>({
    queryKey: ['/api/expenses/dashboard', {
      category: 'cleaning',
      months: selectedMonths,
      properties: selectedProperties // Always send the array, even if empty
    }],
  });

  const cleaningDetailData = useMemo(() => {
    if (!cleaningData) {
      return {
        rows: [],
        monthHeaders: [],
        columnTotals: {},
        grandTotal: 0
      };
    }
    
    // If no properties are selected, return empty data
    if (selectedProperties.length === 0) {
      return {
        rows: [],
        monthHeaders: selectedMonths.sort(),
        columnTotals: {},
        grandTotal: 0
      };
    }
    
    // Filter the data to only include selected properties
    const filteredRows = cleaningData.rows.filter(row => {
      const property = allProperties.find(p => p.name === row.propertyName);
      return property && selectedProperties.includes(property.id);
    });
    
    // Recalculate totals with filtered data
    const columnTotals: { [key: string]: number } = {};
    let grandTotal = 0;
    
    selectedMonths.forEach(month => {
      columnTotals[month] = 0;
    });
    
    filteredRows.forEach(row => {
      row.monthlyAmounts.forEach(monthData => {
        if (columnTotals[monthData.month] !== undefined) {
          columnTotals[monthData.month] += monthData.amount;
        }
      });
      grandTotal += row.total;
    });
    
    return {
      rows: filteredRows,
      monthHeaders: cleaningData.monthHeaders,
      columnTotals,
      grandTotal
    };
  }, [cleaningData, selectedProperties, allProperties, selectedMonths]);

  // Generate consolidated data
  const consolidatedData = useMemo(() => {
    return generateConsolidatedData(allTransactions, selectedMonths, selectedProperties);
  }, [allTransactions, selectedMonths, selectedProperties]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ transactionId, amount }: { transactionId: string; amount: number }) => {
      return apiRequest(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        body: { amount }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Sucesso",
        description: "Valor atualizado com sucesso",
      });
      setEditingCell(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar valor",
        variant: "destructive",
      });
    }
  });

  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthKey)) {
        return prev.filter(m => m !== monthKey);
      } else {
        return [...prev, monthKey];
      }
    });
  };

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(p => p !== propertyId);
      } else {
        return [...prev, propertyId];
      }
    });
  };

  const clearAllFilters = () => {
    const currentMonth = monthOptions.find(m => m.isCurrentMonth)?.key || '07/2025';
    setSelectedMonths([currentMonth]);
    setSelectedProperties([]);
  };

  const activeFilterCount = 
    (selectedMonths.length !== 1 || selectedMonths[0] !== (monthOptions.find(m => m.isCurrentMonth)?.key || '07/2025') ? 1 : 0) +
    (selectedProperties.length > 0 ? 1 : 0);

  const handleCellClick = (propertyName: string, month: string) => {
    if (!cleaningDetailData) return;
    
    const row = cleaningDetailData.rows.find(r => r.propertyName === propertyName);
    if (!row) return;
    
    const monthData = row.monthlyAmounts.find(m => m.month === month);
    if (!monthData || monthData.transactions.length === 0) return;
    
    // Show transaction details in modal
    setDetailModalTitle(`Limpeza - ${propertyName} - ${month}`);
    setDetailModalTransactions(monthData.transactions);
    setDetailModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingCell || !cleaningDetailData) return;
    
    const value = parseFloat(editValue.replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(value)) return;
    
    const row = cleaningDetailData.rows.find(r => r.propertyName === editingCell.property);
    if (!row) return;
    
    const monthData = row.monthlyAmounts.find(m => m.month === editingCell.month);
    if (!monthData || monthData.transactions.length === 0) return;
    
    // For now, update the first transaction
    const transaction = monthData.transactions[0];
    updateMutation.mutate({ transactionId: transaction.id, amount: Math.abs(value) });
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Limpeza - Análise Detalhada</h1>
        <Button onClick={() => setShowCleaningForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa de Limpeza
        </Button>
      </div>

      {/* View Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'consolidated' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('consolidated')}
              >
                Consolidado
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                Detalhado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount} {activeFilterCount === 1 ? 'ativo' : 'ativos'}
                    </Badge>
                  )}
                </span>
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
                  {cleaningDetailData?.rows?.length || 0} propriedades | Total: {formatNumber(cleaningDetailData?.grandTotal || 0)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Consolidated View */}
      {viewMode === 'consolidated' && (
        <Card>
          <CardHeader>
            <CardTitle>Visão Consolidada - Valores Totais por Data de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-medium">
                      Mês
                    </th>
                    {consolidatedData.sortedDates.map(date => (
                      <th key={date} className="border border-gray-200 p-3 text-center font-medium">
                        {date}
                      </th>
                    ))}
                    <th className="border border-gray-200 p-3 text-center font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMonths.map((month, index) => {
                    const monthData = consolidatedData.monthlyData[month] || {};
                    const monthTotal = Object.values(monthData).reduce((sum, val) => sum + val, 0);
                    
                    return (
                      <tr key={month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                        <td className="border border-gray-200 p-3 font-medium">{month}</td>
                        {consolidatedData.sortedDates.map(date => (
                          <td key={date} className="border border-gray-200 p-3 text-center">
                            {monthData[date] > 0 ? (
                              <button
                                className="text-red-600 hover:text-red-800 hover:underline transition-colors"
                                onClick={() => {
                                  // Get all transactions for this specific date in this month
                                  const dateTransactions = allTransactions.filter(t => {
                                    if (t.category !== 'cleaning') return false;
                                    const tDate = new Date(t.date);
                                    const tMonthKey = `${String(tDate.getMonth() + 1).padStart(2, '0')}/${tDate.getFullYear()}`;
                                    const tDayKey = `${String(tDate.getDate()).padStart(2, '0')}/${String(tDate.getMonth() + 1).padStart(2, '0')}`;
                                    
                                    // Include parent and standalone transactions for this date
                                    const isParent = t.parentTransactionId === null && 
                                                   allTransactions.some(child => child.parentTransactionId === t.id);
                                    const isStandalone = t.parentTransactionId === null && 
                                                       !allTransactions.some(child => child.parentTransactionId === t.id);
                                    
                                    return tMonthKey === month && tDayKey === date && (isParent || isStandalone);
                                  });
                                  
                                  setDetailModalTitle(`Limpeza - Pagamentos em ${date}`);
                                  setDetailModalTransactions(dateTransactions);
                                  setDetailModalOpen(true);
                                }}
                              >
                                {formatNumber(monthData[date])}
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                        <td className="border border-gray-200 p-3 text-center font-semibold">
                          <span className="text-red-600">{formatNumber(monthTotal)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-200 p-3">TOTAL</td>
                    {consolidatedData.sortedDates.map(date => (
                      <td key={date} className="border border-gray-200 p-3 text-center">
                        <span className="text-red-600 font-bold">
                          {formatNumber(consolidatedData.dateTotals[date] || 0)}
                        </span>
                      </td>
                    ))}
                    <td className="border border-gray-200 p-3 text-center">
                      <span className="text-red-600 font-bold">
                        {formatNumber(Object.values(consolidatedData.dateTotals).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <Card>
          <CardHeader>
            <CardTitle>Limpeza - Por Propriedade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-medium" style={{ minWidth: '200px' }}>
                      Propriedade
                    </th>
                    {cleaningDetailData?.monthHeaders?.map(month => (
                      <th key={month} className="border border-gray-200 p-3 text-center font-medium" style={{ minWidth: '100px' }}>
                        {month}
                      </th>
                    ))}
                    {cleaningDetailData?.monthHeaders?.length > 1 && (
                      <th className="border border-gray-200 p-3 text-center font-medium bg-blue-50" style={{ minWidth: '120px' }}>
                        Média Mensal
                        <div className="text-xs text-gray-500 font-normal">(÷ {cleaningDetailData.monthHeaders.length} meses)</div>
                      </th>
                    )}
                    <th className="border border-gray-200 p-3 text-center font-medium" style={{ minWidth: '120px' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningDetailData?.rows?.map((row, index) => (
                    <tr key={row.propertyId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                      <td className="border border-gray-200 p-3 font-medium">{row.propertyName}</td>
                      {cleaningDetailData?.monthHeaders?.map(month => {
                        const monthData = row.monthlyAmounts.find(m => m.month === month);
                        const isEditing = editingCell?.property === row.propertyName && editingCell?.month === month;
                        
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
                      {cleaningDetailData?.monthHeaders?.length > 1 && (
                        <td className="border border-gray-200 p-3 text-center font-semibold bg-blue-50">
                          <span className="text-red-600">
                            {formatNumber(row.total / cleaningDetailData.monthHeaders.length)}
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
                    {cleaningDetailData?.monthHeaders?.map(month => (
                      <td key={month} className="border border-gray-200 p-3 text-center">
                        <span className="text-red-600 font-bold">
                          {formatNumber(cleaningDetailData?.columnTotals?.[month] || 0)}
                        </span>
                      </td>
                    ))}
                    {cleaningDetailData?.monthHeaders?.length > 1 && (
                      <td className="border border-gray-200 p-3 text-center bg-blue-50">
                        <span className="text-red-600 font-bold">
                          {formatNumber((cleaningDetailData?.grandTotal || 0) / cleaningDetailData.monthHeaders.length)}
                        </span>
                      </td>
                    )}
                    <td className="border border-gray-200 p-3 text-center">
                      <span className="text-red-600 font-bold">{formatNumber(cleaningDetailData?.grandTotal || 0)}</span>
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

      {/* Cleaning Expense Form */}
      <CleaningExpenseForm
        open={showCleaningForm}
        onOpenChange={setShowCleaningForm}
      />
    </div>
  );
}
