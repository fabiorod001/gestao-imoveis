import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Filter, Download, ChevronDown, X, TrendingUp, TrendingDown, Check, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface Property {
  id: number;
  name: string;
  status: string;
}

interface TransactionData {
  propertyId: number;
  propertyName: string;
  month: number;
  year: number;
  type: string;
  category: string;
  amount: number;
}

interface PivotRow {
  propertyName: string;
  monthlyData: { [monthKey: string]: number };
  total: number;
  monthlyAverage: number;
  realAmount?: number; // For single-month view
  pendingAmount?: number; // For single-month view
}

interface IPCAMarginData {
  propertyName: string;
  revenue: number;
  expenses: number;
  netResult: number;
  originalAcquisitionCost: number;
  ipcaCorrectedAcquisitionCost: number;
  profitMarginOriginal: number;
  profitMarginIPCA: number;
  ipcaCorrection: number;
}

interface PivotTableData {
  rows: PivotRow[];
  monthHeaders: string[];
  columnTotals: { [monthKey: string]: number };
  grandTotal: number;
}

const TRANSACTION_CATEGORIES = {
  revenue: ['rent', 'other', 'Rent'],
  expense: ['maintenance', 'utilities', 'taxes', 'management', 'financing']
};

export default function AdvancedPivotTable() {
  // Function to get current month in MM/YYYY format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };
  
  // Always default to current month
  const currentMonth = getCurrentMonth(); // "07/2025"
  const defaultMonths = [currentMonth];
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>(defaultMonths);
  
  // Debug logs
  console.log('AdvancedPivotTable initialized with selectedMonths:', defaultMonths, 'currentMonth:', currentMonth);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['revenue', 'expense']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [showIPCAMargins, setShowIPCAMargins] = useState(false);
  
  // Navigation hook
  const [, setLocation] = useLocation();

  // Function to navigate to property details
  const navigateToProperty = (propertyName: string) => {
    const property = allProperties.find(p => p.name === propertyName);
    if (property) {
      setLocation(`/property/${property.id}`);
    }
  };

  // Fetch all properties for filters
  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch available months from database - ALL months with any transaction
  const { data: availableMonths = [], refetch: refetchMonths } = useQuery<{ key: string; label: string }[]>({
    queryKey: ['/api/analytics/available-months'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/available-months');
      if (!response.ok) throw new Error('Failed to fetch available months');
      const data = await response.json();
      console.log(`API returned ${data.length} months with transactions`);
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Generate month options (all months from database + future 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    const uniqueMonths = new Set<string>();
    
    // Add future 12 months (newest first)
    for (let i = 12; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      if (!uniqueMonths.has(monthKey)) {
        options.push({ key: monthKey, label: monthName });
        uniqueMonths.add(monthKey);
      }
    }
    
    // Add current month
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentKey = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
    const currentName = currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    if (!uniqueMonths.has(currentKey)) {
      options.push({ key: currentKey, label: currentName });
      uniqueMonths.add(currentKey);
    }
    
    // Add all months from database (already sorted newest first from API)
    availableMonths.forEach(month => {
      if (!uniqueMonths.has(month.key)) {
        options.push(month);
        uniqueMonths.add(month.key);
      }
    });
    
    // Debug: log how many months we have
    console.log(`Generated ${options.length} month options: ${availableMonths.length} from API + future months`);
    
    // Sort options by year and month (newest first)
    options.sort((a, b) => {
      const [monthA, yearA] = a.key.split('/');
      const [monthB, yearB] = b.key.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateB.getTime() - dateA.getTime();
    });
    
    return options;
  };

  const monthOptions = generateMonthOptions();
  
  // Log para verificar se todos os meses estão disponíveis
  useEffect(() => {
    if (availableMonths.length > 0) {
      console.log(`✅ Filtro de meses: ${monthOptions.length} meses disponíveis no total`);
      console.log(`   - ${availableMonths.length} meses com transações do banco`);
      console.log(`   - Primeiro mês:`, monthOptions[monthOptions.length - 1]);
      console.log(`   - Último mês:`, monthOptions[0]);
    }
  }, [availableMonths, monthOptions.length]);



  // Fetch transaction data based on filters
  const { data: transactionData = [], isLoading } = useQuery<TransactionData[]>({
    queryKey: ['/api/analytics/transactions-by-periods', selectedMonths, selectedProperties, selectedTransactionTypes, selectedCategories],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMonths.length > 0) params.append('months', selectedMonths.join(','));
      // Only filter by properties if some are specifically selected
      if (selectedProperties.length > 0) params.append('propertyIds', selectedProperties.join(','));
      if (selectedTransactionTypes.length > 0) params.append('transactionTypes', selectedTransactionTypes.join(','));
      
      // Don't send special categories to server - handle filtering in frontend
      const serverCategories = selectedCategories.filter(cat => 
        !['aluguel_simples', 'outras_receitas', 'aluguel_total'].includes(cat)
      );
      if (serverCategories.length > 0) params.append('categories', serverCategories.join(','));
      
      console.log('Query parameters:', {
        months: selectedMonths,
        properties: selectedProperties,
        types: selectedTransactionTypes,
        categories: selectedCategories,
        serverCategories,
        url: `/api/analytics/transactions-by-periods?${params}`
      });
      
      const response = await fetch(`/api/analytics/transactions-by-periods?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transaction data');
      const data = await response.json();
      console.log('Received transaction data:', data);
      return data;
    },
    enabled: selectedMonths.length > 0,
  });

  // Fetch IPCA margin data when toggle is enabled OR when single month is selected (for % Margem calculation)
  const { data: ipcaMarginData = [], isLoading: isLoadingIPCA } = useQuery<IPCAMarginData[]>({
    queryKey: ['/api/analytics/pivot-with-ipca', selectedMonths, selectedProperties, selectedTransactionTypes],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMonths.length > 0) params.append('months', selectedMonths.join(','));
      if (selectedProperties.length > 0) params.append('propertyIds', selectedProperties.join(','));
      if (selectedTransactionTypes.length > 0) params.append('transactionTypes', selectedTransactionTypes.join(','));
      
      const response = await fetch(`/api/analytics/pivot-with-ipca?${params}`);
      if (!response.ok) throw new Error('Failed to fetch IPCA margin data');
      return await response.json();
    },
    enabled: (showIPCAMargins || selectedMonths.length === 1) && selectedMonths.length > 0,
  });

  // Fetch single-month detailed data for Real vs Pending breakdown
  // Only fetch when single month is selected AND it's the current month
  const { data: singleMonthData = [], isLoading: isLoadingSingleMonth } = useQuery<{
    propertyName: string;
    realResult: number;
    pendingResult: number;
    totalResult: number;
    profitMarginIPCA: number;
    ipcaCorrectedAcquisitionCost: number;
  }[]>({
    queryKey: ['/api/analytics/single-month-detailed', selectedMonths, selectedProperties, selectedTransactionTypes],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMonths.length > 0) params.append('month', selectedMonths[0]);
      if (selectedProperties.length > 0) params.append('propertyIds', selectedProperties.join(','));
      if (selectedTransactionTypes.length > 0) params.append('transactionTypes', selectedTransactionTypes.join(','));
      
      const response = await fetch(`/api/analytics/single-month-detailed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch single month detailed data');
      return await response.json();
    },
    enabled: selectedMonths.length === 1 && selectedMonths.length > 0 && selectedMonths[0] === currentMonth,
  });

  // Process data into pivot table structure
  const processPivotData = (): PivotTableData => {
    const propertyMap = new Map<string, { [monthKey: string]: number }>();
    // Sort months chronologically (MM/YYYY format)
    const monthHeaders = selectedMonths.sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      
      // First compare years
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      // Then compare months
      return monthA - monthB;
    });
    const columnTotals: { [monthKey: string]: number } = {};
    
    // Initialize column totals
    monthHeaders.forEach(monthKey => {
      columnTotals[monthKey] = 0;
    });

    console.log('Processing pivot data with:', {
      transactionCount: transactionData.length,
      selectedMonths,
      selectedProperties,
      firstFewTransactions: transactionData.slice(0, 3)
    });

    // Process transaction data
    transactionData.forEach(transaction => {
      const monthKey = `${String(transaction.month).padStart(2, '0')}/${transaction.year}`;
      
      // Filter by selected properties if any are selected
      if (selectedProperties.length > 0 && !selectedProperties.includes(transaction.propertyId)) {
        return; // Skip this transaction if property not selected
      }
      
      // Handle special category filtering for simplified revenue categories
      if (selectedCategories.length > 0) {
        const shouldInclude = selectedCategories.some(selectedCat => {
          if (selectedCat === 'aluguel_simples') {
            return transaction.category === 'rent' || transaction.category === 'Rent';
          }
          if (selectedCat === 'outras_receitas') {
            return transaction.category === 'other';
          }
          if (selectedCat === 'aluguel_total') {
            return transaction.category === 'rent' || transaction.category === 'Rent' || transaction.category === 'other';
          }
          return transaction.category === selectedCat;
        });
        
        if (!shouldInclude) {
          return; // Skip this transaction if category not selected
        }
      }
      
      if (!propertyMap.has(transaction.propertyName)) {
        propertyMap.set(transaction.propertyName, {});
        monthHeaders.forEach(month => {
          propertyMap.get(transaction.propertyName)![month] = 0;
        });
      }
      
      if (monthHeaders.includes(monthKey)) {
        const currentAmount = propertyMap.get(transaction.propertyName)![monthKey] || 0;
        let transactionAmount = Number(transaction.amount) || 0;
        
        // Make expenses negative
        if (transaction.type === 'expense') {
          transactionAmount = -transactionAmount;
        }
        
        // Round to 2 decimal places to avoid floating point errors
        const newAmount = Math.round((currentAmount + transactionAmount) * 100) / 100;
        propertyMap.get(transaction.propertyName)![monthKey] = newAmount;
        columnTotals[monthKey] = Math.round(((columnTotals[monthKey] || 0) + transactionAmount) * 100) / 100;
      }
    });

    // Convert to rows
    const numberOfMonths = selectedMonths.length;
    const rows: PivotRow[] = Array.from(propertyMap.entries()).map(([propertyName, monthlyData]) => {
      const total = Object.values(monthlyData).reduce((sum, amount) => {
        const numAmount = Number(amount) || 0;
        return sum + numAmount;
      }, 0);
      // Round to 2 decimal places to avoid floating point errors
      const roundedTotal = Math.round(total * 100) / 100;
      const monthlyAverage = numberOfMonths > 0 ? Math.round((roundedTotal / numberOfMonths) * 100) / 100 : 0;
      
      return {
        propertyName,
        monthlyData,
        total: roundedTotal,
        monthlyAverage
      };
    });

    // Apply sorting
    if (sortConfig) {
      rows.sort((a, b) => {
        let aValue: any, bValue: any;
        
        if (sortConfig.key === 'propertyName') {
          aValue = a.propertyName;
          bValue = b.propertyName;
          // For text, use locale comparison
          if (sortConfig.direction === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        } else if (sortConfig.key === 'total') {
          aValue = a.total;
          bValue = b.total;
        } else if (sortConfig.key === 'monthlyAverage') {
          aValue = a.monthlyAverage;
          bValue = b.monthlyAverage;
        } else if (monthHeaders.includes(sortConfig.key)) {
          // Sorting by specific month
          aValue = a.monthlyData[sortConfig.key] || 0;
          bValue = b.monthlyData[sortConfig.key] || 0;
        }
        
        // For numeric values
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          if (sortConfig.direction === 'asc') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        }
        
        return 0;
      });
    } else {
      // Default sorting by property name
      rows.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
    }

    console.log('Final pivot data:', {
      propertyMapSize: propertyMap.size,
      rowsCount: rows.length,
      rows: rows.map(r => ({ name: r.propertyName, total: r.total })),
      columnTotals
    });

    const grandTotal = Object.values(columnTotals).reduce((sum, amount) => {
      const numAmount = Number(amount) || 0;
      return sum + numAmount;
    }, 0);
    
    // Round the grand total to 2 decimal places
    const roundedGrandTotal = Math.round(grandTotal * 100) / 100;

    return {
      rows,
      monthHeaders,
      columnTotals,
      grandTotal: roundedGrandTotal
    };
  };

  const pivotData = processPivotData();

  // Filter management functions
  const toggleMonth = (monthKey: string) => {
    setSelectedMonths(prev => {
      const newMonths = prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey];
      
      // Sort chronologically
      return newMonths.sort((a, b) => {
        const [monthA, yearA] = a.split('/').map(Number);
        const [monthB, yearB] = b.split('/').map(Number);
        
        if (yearA !== yearB) {
          return yearA - yearB;
        }
        return monthA - monthB;
      });
    });
  };

  const toggleProperty = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(p => p !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleTransactionType = (type: string) => {
    setSelectedTransactionTypes(prev => {
      if (prev.includes(type)) {
        const newTypes = prev.filter(t => t !== type);
        // Never allow empty selection - if removing the last type, add the other one
        return newTypes.length === 0 ? (type === 'revenue' ? ['expense'] : ['revenue']) : newTypes;
      } else {
        return [...prev, type];
      }
    });
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSelectedMonths([currentMonth]); // Always reset to current month
    setSelectedProperties([]);
    setSelectedTransactionTypes(['revenue', 'expense']);
    setSelectedCategories([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getValueStyle = (amount: number) => {
    return amount < 0 ? 'text-red-600 font-semibold' : '';
  };

  // Column resizing functions
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(columnKey);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || 150;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (e.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
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
  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Análise Multidimensional');

    // Add headers
    let headers = ['Propriedade'];
    
    if (selectedMonths.length === 1 && selectedMonths[0] === currentMonth) {
      // Single month view for current month: show 5 columns
      headers = ['Propriedade', 'Resultado do Mês (Real)', 'Resultado do Mês (Previsto)', 'Resultado do Mês (Total)', '% Margem'];
    } else {
      // Multiple months or non-current month: show normal columns
      headers = ['Propriedade', ...pivotData.monthHeaders, 'Total'];
      if (selectedMonths.length > 1) {
        headers.push('Média Mensal');
      }
    }
    
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E5E5' }
    };

    // Add data rows
    pivotData.rows.forEach(row => {
      let rowData: any[] = [];
      
      if (selectedMonths.length === 1 && selectedMonths[0] === currentMonth) {
        // Single month view for current month: show 5 columns
        const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
        rowData = [
          row.propertyName,
          singleMonthProperty ? singleMonthProperty.realResult : 0,
          singleMonthProperty ? singleMonthProperty.pendingResult : 0,
          singleMonthProperty ? singleMonthProperty.totalResult : 0,
          singleMonthProperty && singleMonthProperty.ipcaCorrectedAcquisitionCost > 0 ? 
            `${singleMonthProperty.profitMarginIPCA.toFixed(2)}%` : '-'
        ];
      } else {
        // Multiple months or non-current month: show normal columns
        rowData = [
          row.propertyName,
          ...pivotData.monthHeaders.map(month => row.monthlyData[month] || 0),
          row.total
        ];
        
        if (selectedMonths.length > 1) {
          rowData.push(row.monthlyAverage);
        }
      }
      
      const excelRow = worksheet.addRow(rowData);
      
      // Apply red color to negative values
      excelRow.eachCell((cell, colNumber) => {
        if (colNumber > 1 && typeof cell.value === 'number' && cell.value < 0) {
          cell.font = { color: { argb: 'FFFF0000' }, bold: true };
        }
      });
    });

    // Add totals row
    let totalsData: any[] = [];
    
    if (selectedMonths.length === 1 && selectedMonths[0] === currentMonth) {
      // Single month view for current month: show 5 columns totals
      const totalReal = singleMonthData.reduce((sum, item) => sum + item.realResult, 0);
      const totalPending = singleMonthData.reduce((sum, item) => sum + item.pendingResult, 0);
      const totalResult = singleMonthData.reduce((sum, item) => sum + item.totalResult, 0);
      
      // Calculate weighted average margin
      let totalIPCAValue = 0;
      let weightedMarginSum = 0;
      
      singleMonthData.forEach(item => {
        if (item.ipcaCorrectedAcquisitionCost > 0 && item.totalResult !== 0) {
          totalIPCAValue += item.ipcaCorrectedAcquisitionCost;
          weightedMarginSum += item.totalResult;
        }
      });
      
      const averageMargin = totalIPCAValue === 0 ? 0 : (weightedMarginSum / totalIPCAValue) * 100;
      
      totalsData = [
        'TOTAL',
        totalReal,
        totalPending,
        totalResult,
        totalIPCAValue === 0 ? '-' : `${averageMargin.toFixed(2)}%`
      ];
    } else {
      // Multiple months or non-current month: show normal totals
      totalsData = [
        'TOTAL',
        ...pivotData.monthHeaders.map(month => pivotData.columnTotals[month] || 0),
        pivotData.grandTotal
      ];
      
      if (selectedMonths.length > 1) {
        totalsData.push(pivotData.grandTotal / selectedMonths.length);
      }
    }
    
    const totalsRow = worksheet.addRow(totalsData);
    totalsRow.font = { bold: true };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column) {
        let maxLength = 0;
        column.eachCell?.(cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10;
          if (cellLength > maxLength) maxLength = cellLength;
        });
        column.width = Math.min(maxLength + 2, 30);
      }
    });

    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-multidimensional-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    // Add title
    doc.setFontSize(16);
    doc.text('Análise Multidimensional - Tabela Dinâmica', 20, 20);
    
    // Add export date
    doc.setFontSize(10);
    doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

    // Prepare table data
    const headers = ['Propriedade', ...pivotData.monthHeaders, 'Total'];
    if (selectedMonths.length > 1) {
      headers.push('Média Mensal');
    }

    const tableData = pivotData.rows.map(row => {
      const rowData = [
        row.propertyName,
        ...pivotData.monthHeaders.map(month => 
          formatCurrency(row.monthlyData[month] || 0)
        ),
        formatCurrency(row.total)
      ];
      
      if (selectedMonths.length > 1) {
        rowData.push(formatCurrency(row.monthlyAverage));
      }
      
      return rowData;
    });

    // Add totals row
    const totalsData = [
      'TOTAL',
      ...pivotData.monthHeaders.map(month => 
        formatCurrency(pivotData.columnTotals[month] || 0)
      ),
      formatCurrency(pivotData.grandTotal)
    ];
    
    if (selectedMonths.length > 1) {
      totalsData.push(formatCurrency(pivotData.grandTotal / selectedMonths.length));
    }
    
    tableData.push(totalsData);

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      didParseCell: (data) => {
        // Color negative values red
        if (data.row.index < tableData.length - 1 && data.column.index > 0) {
          const cellText = data.cell.text[0];
          if (cellText && cellText.includes('-')) {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Style totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Save the PDF
    doc.save(`analise-multidimensional-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const getDataTypeDescription = () => {
    if (selectedTransactionTypes.length === 1) {
      if (selectedTransactionTypes.includes('revenue')) return 'Receitas';
      if (selectedTransactionTypes.includes('expense')) return 'Despesas';
    }
    if (selectedCategories.length > 0) {
      return `${selectedCategories.map(cat => getCategoryDisplayName(cat)).join(', ')}`;
    }
    return 'Receitas + Despesas';
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      'rent': 'Aluguel',
      'Rent': 'Aluguel', 
      'other': 'Outras Receitas',
      'maintenance': 'Manutenção',
      'utilities': 'Utilidades',
      'taxes': 'Impostos',
      'management': 'Gestão',
      'financing': 'Financiamento',
      // Special simplified categories for revenue
      'aluguel_simples': 'Aluguel',
      'outras_receitas': 'Outras Receitas',
      'aluguel_total': 'Aluguel Total (Aluguel + Outras Receitas)'
    };
    return categoryNames[category] || category;
  };

  const getFilteredCategories = () => {
    if (selectedTransactionTypes.includes('revenue') && !selectedTransactionTypes.includes('expense')) {
      // For revenue only, offer simplified categories
      return ['aluguel_simples', 'outras_receitas', 'aluguel_total'];
    }
    
    const categories: string[] = [];
    selectedTransactionTypes.forEach(type => {
      if (type === 'revenue' || type === 'expense') {
        categories.push(...TRANSACTION_CATEGORIES[type]);
      }
    });
    return categories;
  };

  return (
    <div className="space-y-6">
      {/* Filter Buttons - Cash Flow Style */}
      <div className="flex justify-center items-center space-x-4 mb-6">
        {/* Data Type Filter - Additive System */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => toggleTransactionType('revenue')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTransactionTypes.includes('revenue')
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => toggleTransactionType('expense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTransactionTypes.includes('expense')
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Despesas
          </button>
        </div>

        {/* Filters Button - Dropdown Style */}
        <div className="flex items-center space-x-2">
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Clear Filters */}
        {(selectedMonths.length > 1 || selectedProperties.length > 0 || selectedCategories.length > 0 || 
          !(selectedTransactionTypes.includes('revenue') && selectedTransactionTypes.includes('expense'))) && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {selectedMonths.length > 0 && (
          <Badge variant="secondary">
            {selectedMonths.length} mês{selectedMonths.length > 1 ? 'es' : ''}
          </Badge>
        )}
        {selectedProperties.length > 0 && (
          <Badge variant="secondary">
            {selectedProperties.length} propriedade{selectedProperties.length > 1 ? 's' : ''}
          </Badge>
        )}
        {selectedCategories.length > 0 && (
          <Badge variant="secondary">
            {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Collapsible Filters Panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros Avançados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Month Selection */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Períodos
                </h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedMonths.length === 0 
                        ? "Selecionar meses..." 
                        : `${selectedMonths.length} mês${selectedMonths.length > 1 ? 'es' : ''} selecionado${selectedMonths.length > 1 ? 's' : ''}`}
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar mês..." />
                      <CommandEmpty>Nenhum mês encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-96 overflow-auto">
                        {monthOptions.map(({ key, label }) => (
                          <CommandItem
                            key={key}
                            onSelect={() => toggleMonth(key)}
                            className="flex items-center space-x-2"
                          >
                            <Check
                              className={`h-4 w-4 ${
                                selectedMonths.includes(key) ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>{label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Property Selection */}
              <div>
                <h4 className="font-medium mb-3">Propriedades</h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedProperties.length === 0 
                        ? "Todas as propriedades" 
                        : selectedProperties.length === allProperties.length 
                          ? "Todas as propriedades"
                          : `${selectedProperties.length} propriedade${selectedProperties.length > 1 ? 's' : ''} selecionada${selectedProperties.length > 1 ? 's' : ''}`}
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar propriedade..." />
                      <CommandEmpty>Nenhuma propriedade encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-96 overflow-auto">
                        {allProperties.map(property => (
                          <CommandItem
                            key={property.id}
                            onSelect={() => toggleProperty(property.id)}
                            className="flex items-center space-x-2"
                          >
                            <Check
                              className={`h-4 w-4 ${
                                selectedProperties.includes(property.id) ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>{property.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Transaction Type Selection */}
              <div>
                <h4 className="font-medium mb-3">Tipo de Transação</h4>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="revenue"
                      checked={selectedTransactionTypes.includes('revenue')}
                      onCheckedChange={() => toggleTransactionType('revenue')}
                    />
                    <label htmlFor="revenue" className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Receitas
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expense"
                      checked={selectedTransactionTypes.includes('expense')}
                      onCheckedChange={() => toggleTransactionType('expense')}
                    />
                    <label htmlFor="expense" className="text-sm font-medium flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Despesas
                    </label>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              {selectedTransactionTypes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Categorias Específicas</h4>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedCategories.length === 0 
                          ? "Todas as categorias" 
                          : `${selectedCategories.length} categoria${selectedCategories.length > 1 ? 's' : ''} selecionada${selectedCategories.length > 1 ? 's' : ''}`}
                        <ChevronDown className="ml-auto h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-96 overflow-auto">
                          {getFilteredCategories().map(category => (
                            <CommandItem
                              key={category}
                              onSelect={() => toggleCategory(category)}
                              className="flex items-center space-x-2"
                            >
                              <Check
                                className={`h-4 w-4 ${
                                  selectedCategories.includes(category) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span>{getCategoryDisplayName(category)}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Pivot Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Análise Multidimensional</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando dados...</div>
          ) : pivotData.rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado para os filtros selecionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                {/* Header */}
                <thead>
                  <tr className="bg-muted">
                    <th 
                      className="border border-gray-200 p-3 text-left font-semibold cursor-pointer hover:bg-gray-100 relative"
                      style={{ width: columnWidths['propertyName'] || 200 }}
                      onClick={() => handleSort('propertyName')}
                    >
                      <div className="flex items-center">
                        Propriedade
                        {getSortIcon('propertyName')}
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={(e) => handleMouseDown('propertyName', e)}
                      />
                    </th>
                    {selectedMonths.length === 1 && selectedMonths[0] === currentMonth ? (
                      // Single month view: show 5 columns layout ONLY for current month
                      <>
                        <th 
                          className="border border-gray-200 p-3 text-right font-semibold bg-blue-50 cursor-pointer hover:bg-blue-100 relative"
                          style={{ width: columnWidths['realResult'] || 150 }}
                          onClick={() => handleSort('realResult')}
                        >
                          <div className="flex items-center justify-end">
                            <div>
                              <div>Resultado do Mês</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                (Real)
                              </div>
                            </div>
                            {getSortIcon('realResult')}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown('realResult', e)}
                          />
                        </th>
                        <th 
                          className="border border-gray-200 p-3 text-right font-semibold bg-yellow-50 cursor-pointer hover:bg-yellow-100 relative"
                          style={{ width: columnWidths['pendingResult'] || 150 }}
                          onClick={() => handleSort('pendingResult')}
                        >
                          <div className="flex items-center justify-end">
                            <div>
                              <div>Resultado do Mês</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                (Previsto)
                              </div>
                            </div>
                            {getSortIcon('pendingResult')}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown('pendingResult', e)}
                          />
                        </th>
                        <th 
                          className="border border-gray-200 p-3 text-right font-semibold bg-gray-100 cursor-pointer hover:bg-gray-200 relative"
                          style={{ width: columnWidths['totalResult'] || 150 }}
                          onClick={() => handleSort('totalResult')}
                        >
                          <div className="flex items-center justify-end">
                            <div>
                              <div>Resultado do Mês</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                (Total)
                              </div>
                            </div>
                            {getSortIcon('totalResult')}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown('totalResult', e)}
                          />
                        </th>
                        <th 
                          className="border border-gray-200 p-3 text-right font-semibold bg-green-50 cursor-pointer hover:bg-green-100 relative"
                          style={{ width: columnWidths['marginPercent'] || 150 }}
                          onClick={() => handleSort('marginPercent')}
                        >
                          <div className="flex items-center justify-end">
                            <div>
                              <div>% Margem</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                Total ÷ Valor IPCA
                              </div>
                            </div>
                            {getSortIcon('marginPercent')}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown('marginPercent', e)}
                          />
                        </th>
                      </>
                    ) : (
                      // Multiple months view: show monthly columns and total
                      <>
                        {pivotData.monthHeaders.map(monthKey => {
                          const [month, year] = monthKey.split('/');
                          const date = new Date(parseInt(year), parseInt(month) - 1);
                          const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                          return (
                            <th 
                              key={monthKey} 
                              className="border border-gray-200 p-3 text-right font-semibold cursor-pointer hover:bg-gray-100 relative"
                              style={{ width: columnWidths[monthKey] || 150 }}
                              onClick={() => handleSort(monthKey)}
                            >
                              <div className="flex items-center justify-end">
                                <div>
                                  <div>{monthName}</div>
                                  <div className="text-xs font-normal text-muted-foreground">
                                    {getDataTypeDescription()}
                                  </div>
                                </div>
                                {getSortIcon(monthKey)}
                              </div>
                              <div
                                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                                onMouseDown={(e) => handleMouseDown(monthKey, e)}
                              />
                            </th>
                          );
                        })}
                        <th 
                          className="border border-gray-200 p-3 text-right font-semibold bg-gray-100 cursor-pointer hover:bg-gray-200 relative"
                          style={{ width: columnWidths['total'] || 150 }}
                          onClick={() => handleSort('total')}
                        >
                          <div className="flex items-center justify-end">
                            <div>
                              <div>Total</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                {getDataTypeDescription()}
                              </div>
                            </div>
                            {getSortIcon('total')}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown('total', e)}
                          />
                        </th>
                      </>
                    )}
                    {selectedMonths.length > 1 && (
                      <th 
                        className="border border-gray-200 p-3 text-right font-semibold bg-blue-50 cursor-pointer hover:bg-blue-100 relative"
                        style={{ width: columnWidths['monthlyAverage'] || 150 }}
                        onClick={() => handleSort('monthlyAverage')}
                      >
                        <div className="flex items-center justify-end">
                          <div>
                            <div>Média Mensal</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              ÷ {selectedMonths.length} meses
                            </div>
                          </div>
                          {getSortIcon('monthlyAverage')}
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleMouseDown('monthlyAverage', e)}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                
                {/* Body */}
                <tbody>
                  {pivotData.rows.map((row, index) => (
                    <tr key={row.propertyName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 p-3 font-medium">
                        <button
                          onClick={() => navigateToProperty(row.propertyName)}
                          className="text-left w-full hover:text-blue-600 hover:underline transition-colors cursor-pointer focus:outline-none focus:text-blue-600"
                          title={`Ver detalhes de ${row.propertyName}`}
                        >
                          {row.propertyName}
                        </button>
                      </td>
                      {selectedMonths.length === 1 && selectedMonths[0] === currentMonth ? (
                        // Single month view: show 5 columns ONLY for current month
                        <>
                          <td className={`border border-gray-200 p-3 text-right font-semibold bg-blue-50 ${getValueStyle((() => {
                            const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                            return singleMonthProperty ? singleMonthProperty.realResult : 0;
                          })())}`}>
                            {formatCurrency((() => {
                              const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                              return singleMonthProperty ? singleMonthProperty.realResult : 0;
                            })())}
                          </td>
                          <td className={`border border-gray-200 p-3 text-right font-semibold bg-yellow-50 ${getValueStyle((() => {
                            const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                            return singleMonthProperty ? singleMonthProperty.pendingResult : 0;
                          })())}`}>
                            {formatCurrency((() => {
                              const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                              return singleMonthProperty ? singleMonthProperty.pendingResult : 0;
                            })())}
                          </td>
                          <td className={`border border-gray-200 p-3 text-right font-semibold bg-gray-50 ${getValueStyle((() => {
                            const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                            return singleMonthProperty ? singleMonthProperty.totalResult : 0;
                          })())}`}>
                            {formatCurrency((() => {
                              const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                              return singleMonthProperty ? singleMonthProperty.totalResult : 0;
                            })())}
                          </td>
                          <td className="border border-gray-200 p-3 text-right font-semibold bg-green-50">
                            {(() => {
                              const singleMonthProperty = singleMonthData.find(item => item.propertyName === row.propertyName);
                              
                              if (!singleMonthProperty || singleMonthProperty.ipcaCorrectedAcquisitionCost === 0) {
                                return <span className="text-gray-400">-</span>;
                              }
                              
                              return (
                                <span className={getValueStyle(singleMonthProperty.profitMarginIPCA)}>
                                  {singleMonthProperty.profitMarginIPCA.toFixed(2)}%
                                </span>
                              );
                            })()}
                          </td>
                        </>
                      ) : (
                        // Multiple months view: show monthly columns, total, and average
                        <>
                          {pivotData.monthHeaders.map(monthKey => (
                            <td key={monthKey} className={`border border-gray-200 p-3 text-right ${getValueStyle(row.monthlyData[monthKey] || 0)}`}>
                              {row.monthlyData[monthKey] && row.monthlyData[monthKey] !== 0 ? formatCurrency(row.monthlyData[monthKey]) : '-'}
                            </td>
                          ))}
                          <td className={`border border-gray-200 p-3 text-right font-semibold bg-gray-50 ${getValueStyle(row.total)}`}>
                            {formatCurrency(row.total)}
                          </td>
                          {selectedMonths.length > 1 && (
                            <td className={`border border-gray-200 p-3 text-right font-semibold bg-blue-50 ${getValueStyle(row.monthlyAverage)}`}>
                              {formatCurrency(row.monthlyAverage)}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border border-gray-200 p-3">
                      TOTAL
                    </td>
                    {selectedMonths.length === 1 && selectedMonths[0] === currentMonth ? (
                      // Single month view: show 5 columns totals ONLY for current month
                      <>
                        <td className={`border border-gray-200 p-3 text-right bg-blue-100 ${getValueStyle((() => {
                          const totalReal = singleMonthData.reduce((sum, item) => sum + item.realResult, 0);
                          return totalReal;
                        })())}`}>
                          {formatCurrency(singleMonthData.reduce((sum, item) => sum + item.realResult, 0))}
                        </td>
                        <td className={`border border-gray-200 p-3 text-right bg-yellow-100 ${getValueStyle((() => {
                          const totalPending = singleMonthData.reduce((sum, item) => sum + item.pendingResult, 0);
                          return totalPending;
                        })())}`}>
                          {formatCurrency(singleMonthData.reduce((sum, item) => sum + item.pendingResult, 0))}
                        </td>
                        <td className={`border border-gray-200 p-3 text-right bg-gray-200 ${getValueStyle((() => {
                          const totalResult = singleMonthData.reduce((sum, item) => sum + item.totalResult, 0);
                          return totalResult;
                        })())}`}>
                          {formatCurrency(singleMonthData.reduce((sum, item) => sum + item.totalResult, 0))}
                        </td>
                        <td className="border border-gray-200 p-3 text-right bg-green-100 font-semibold">
                          {(() => {
                            // Calculate weighted average margin
                            let totalIPCAValue = 0;
                            let weightedMarginSum = 0;
                            
                            singleMonthData.forEach(item => {
                              if (item.ipcaCorrectedAcquisitionCost > 0 && item.totalResult !== 0) {
                                totalIPCAValue += item.ipcaCorrectedAcquisitionCost;
                                weightedMarginSum += item.totalResult;
                              }
                            });
                            
                            if (totalIPCAValue === 0) {
                              return <span className="text-gray-400">-</span>;
                            }
                            
                            const averageMargin = (weightedMarginSum / totalIPCAValue) * 100;
                            return (
                              <span className={getValueStyle(averageMargin)}>
                                {averageMargin.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </td>
                      </>
                    ) : (
                      // Multiple months view: show monthly totals, grand total, and average
                      <>
                        {pivotData.monthHeaders.map(monthKey => (
                          <td key={monthKey} className={`border border-gray-200 p-3 text-right ${getValueStyle(pivotData.columnTotals[monthKey])}`}>
                            {formatCurrency(pivotData.columnTotals[monthKey])}
                          </td>
                        ))}
                        <td className={`border border-gray-200 p-3 text-right bg-gray-200 ${getValueStyle(pivotData.grandTotal)}`}>
                          {formatCurrency(pivotData.grandTotal)}
                        </td>
                        {selectedMonths.length > 1 && (
                          <td className={`border border-gray-200 p-3 text-right bg-blue-100 ${getValueStyle(pivotData.grandTotal / selectedMonths.length)}`}>
                            {formatCurrency(pivotData.grandTotal / selectedMonths.length)}
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IPCA Margin Analysis Table */}
      {showIPCAMargins && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Análise de Margens com Correção IPCA
            </CardTitle>
            <p className="text-sm text-gray-600">
              Comparação entre margens calculadas com valor de aquisição original vs. valor corrigido pelo IPCA
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingIPCA ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-lg">Calculando correções IPCA...</div>
              </div>
            ) : ipcaMarginData.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-lg text-gray-500">Nenhum dado encontrado para os filtros selecionados</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 p-3 text-left">Propriedade</th>
                      <th className="border border-gray-200 p-3 text-right">Receitas</th>
                      <th className="border border-gray-200 p-3 text-right">Despesas</th>
                      <th className="border border-gray-200 p-3 text-right">Resultado</th>
                      <th className="border border-gray-200 p-3 text-right">Valor Original</th>
                      <th className="border border-gray-200 p-3 text-right">Valor IPCA</th>
                      <th className="border border-gray-200 p-3 text-right">Correção %</th>
                      <th className="border border-gray-200 p-3 text-right">Margem Original</th>
                      <th className="border border-gray-200 p-3 text-right bg-green-50">Margem IPCA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipcaMarginData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3 font-medium">
                          {item.propertyName}
                        </td>
                        <td className="border border-gray-200 p-3 text-right text-green-600">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="border border-gray-200 p-3 text-right text-red-600">
                          {formatCurrency(-item.expenses)}
                        </td>
                        <td className={`border border-gray-200 p-3 text-right ${getValueStyle(item.netResult)}`}>
                          {formatCurrency(item.netResult)}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          {formatCurrency(item.originalAcquisitionCost)}
                        </td>
                        <td className="border border-gray-200 p-3 text-right">
                          {formatCurrency(item.ipcaCorrectedAcquisitionCost)}
                        </td>
                        <td className="border border-gray-200 p-3 text-right text-blue-600">
                          +{item.ipcaCorrection.toFixed(2)}%
                        </td>
                        <td className={`border border-gray-200 p-3 text-right ${getValueStyle(item.profitMarginOriginal)}`}>
                          {item.profitMarginOriginal.toFixed(2)}%
                        </td>
                        <td className={`border border-gray-200 p-3 text-right bg-green-50 font-bold ${getValueStyle(item.profitMarginIPCA)}`}>
                          {item.profitMarginIPCA.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}