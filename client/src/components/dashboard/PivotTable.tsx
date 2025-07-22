import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Filter, Download, ChevronDown, Home, TrendingUp, TrendingDown, X } from "lucide-react";

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

interface PivotCell {
  propertyName: string;
  monthlyData: { [key: string]: number }; // key format: "MM/YYYY"
  total: number;
}

export default function PivotTable() {
  const currentDate = new Date();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([`${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['revenue', 'expense']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch all properties for filters
  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: pivotData = [], isLoading } = useQuery<PivotTableData[]>({
    queryKey: ['/api/analytics/pivot-table', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/pivot-table?month=${selectedMonth}&year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch pivot data');
      return response.json();
    },
  });

  // Filter pivot data based on selections
  const filteredPivotData = pivotData.filter(row => {
    // Filter by selected properties
    if (selectedProperties.length > 0 && !selectedProperties.includes(row.propertyName)) {
      return false;
    }
    return true;
  }).map(row => {
    // Modify data based on revenue/expense filters
    let revenue = row.revenue;
    let expenses = row.expenses;
    
    if (showRevenueOnly) {
      expenses = 0;
    }
    if (showExpensesOnly) {
      revenue = 0;
    }
    
    const netResult = revenue - expenses;
    const profitPercentage = row.purchasePrice > 0 ? (netResult / row.purchasePrice) * 100 : 0;
    
    return {
      ...row,
      revenue,
      expenses,
      netResult,
      profitPercentage,
    };
  });

  // Handle property selection
  const handlePropertyToggle = (propertyName: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyName)
        ? prev.filter(p => p !== propertyName)
        : [...prev, propertyName]
    );
  };

  const handleSelectAllProperties = () => {
    if (selectedProperties.length === allProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(allProperties.map(p => p.name));
    }
  };

  // Calculate totals
  const totals = filteredPivotData.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      expenses: acc.expenses + row.expenses,
      netResult: acc.netResult + row.netResult,
    }),
    { revenue: 0, expenses: 0, netResult: 0 }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Controles da Tabela Dinâmica
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros Avançados
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Controls */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Período:</span>
            </div>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </Badge>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent className="space-y-4 pt-4 border-t">
              {/* Property Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span className="text-sm font-medium">Propriedades:</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllProperties}
                  >
                    {selectedProperties.length === allProperties.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {allProperties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`property-${property.id}`}
                        checked={selectedProperties.length === 0 || selectedProperties.includes(property.name)}
                        onCheckedChange={() => handlePropertyToggle(property.name)}
                      />
                      <label
                        htmlFor={`property-${property.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {property.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Type Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Tipo de Transação:</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="revenue-only"
                      checked={showRevenueOnly}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setShowRevenueOnly(true);
                          setShowExpensesOnly(false);
                        } else {
                          setShowRevenueOnly(false);
                        }
                      }}
                    />
                    <label htmlFor="revenue-only" className="text-sm cursor-pointer">
                      Apenas Receitas
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expenses-only"
                      checked={showExpensesOnly}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setShowExpensesOnly(true);
                          setShowRevenueOnly(false);
                        } else {
                          setShowExpensesOnly(false);
                        }
                      }}
                    />
                    <label htmlFor="expenses-only" className="text-sm cursor-pointer">
                      Apenas Despesas
                    </label>
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {(selectedProperties.length > 0 || showRevenueOnly || showExpensesOnly) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Filtros Ativos:</span>
                  {selectedProperties.length > 0 && (
                    <Badge variant="secondary">
                      {selectedProperties.length} propriedade(s)
                    </Badge>
                  )}
                  {showRevenueOnly && (
                    <Badge variant="secondary">Apenas Receitas</Badge>
                  )}
                  {showExpensesOnly && (
                    <Badge variant="secondary">Apenas Despesas</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProperties([]);
                      setShowRevenueOnly(false);
                      setShowExpensesOnly(false);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Pivot Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro por Propriedade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold bg-gray-50">Propriedade</th>
                  <th className="text-right p-3 font-semibold bg-gray-50">Faturamento</th>
                  <th className="text-right p-3 font-semibold bg-gray-50">Despesas</th>
                  <th className="text-right p-3 font-semibold bg-gray-50">Resultado Líquido</th>
                  <th className="text-right p-3 font-semibold bg-gray-50">% Lucro</th>
                </tr>
              </thead>
              <tbody>
                {filteredPivotData.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium">{row.propertyName}</td>
                    <td className="p-3 text-right text-green-600 font-medium">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="p-3 text-right text-red-600 font-medium">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td className={`p-3 text-right font-medium ${
                      row.netResult >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(row.netResult)}
                    </td>
                    <td className={`p-3 text-right font-medium ${
                      row.profitPercentage >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(row.profitPercentage)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="p-3 font-bold">TOTAIS</td>
                  <td className="p-3 text-right text-green-700">
                    {formatCurrency(totals.revenue)}
                  </td>
                  <td className="p-3 text-right text-red-700">
                    {formatCurrency(totals.expenses)}
                  </td>
                  <td className={`p-3 text-right ${
                    totals.netResult >= 0 ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(totals.netResult)}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}