import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3, TrendingUp, Building2, Calendar, FileText, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PivotTableData {
  propertyName: string;
  revenue: number;
  expenses: number;
  netResult: number;
  profitPercentage: number;
  purchasePrice: number;
}

interface MonthlyData {
  month: number;
  revenue: number;
  expenses: number;
}

interface PropertyDistribution {
  status: string;
  count: string | number;
}

interface IPCAData {
  month: string;
  property: string;
  originalValue: number;
  correctedValue: number;
  ipcaRate: number;
}

interface PeriodComparison {
  propertyId: number;
  propertyName: string;
  month: string;
  year: string;
  type: string;
  category: string;
  amount: string;
  description: string;
}

interface MonthDetail {
  date: string;
  description: string;
  type: string;
  value: number;
  property: string;
  category?: string;
}

export default function Analytics() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(`${currentMonthNum.toString().padStart(2, '0')}/${currentYear}`);
  
  // Buscar imóveis para filtros
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['/api/properties'],
  });

  // Buscar meses disponíveis
  const { data: availableMonths = [] } = useQuery<string[]>({
    queryKey: ['/api/analytics/available-months'],
  });

  // Tab 1: Pivot Table (needs month and year params)
  const currentMonth = new Date().getMonth() + 1;
  const [pivotMonth, setPivotMonth] = useState(currentMonth);
  const [pivotYear, setPivotYear] = useState(currentYear);
  
  const { data: pivotData, isLoading: pivotLoading } = useQuery<PivotTableData[]>({
    queryKey: ['/api/analytics/pivot-table', pivotMonth, pivotYear],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/analytics/pivot-table?month=${pivotMonth}&year=${pivotYear}`);
      return res.json();
    },
  });

  // Tab 2: Monthly Analysis
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyData[]>({
    queryKey: ['/api/analytics/monthly', selectedYear],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/analytics/monthly/${selectedYear}`);
      return res.json();
    },
    enabled: !!selectedYear,
  });

  // Tab 3: IPCA Correction
  const { data: ipcaData, isLoading: ipcaLoading } = useQuery<IPCAData[]>({
    queryKey: ['/api/analytics/pivot-with-ipca'],
  });

  // Tab 4: Property Distribution
  const { data: distributionData, isLoading: distributionLoading } = useQuery<PropertyDistribution[]>({
    queryKey: ['/api/analytics/property-distribution'],
  });

  // Tab 5: Period Comparison
  const { data: periodData, isLoading: periodLoading } = useQuery<PeriodComparison[]>({
    queryKey: ['/api/analytics/transactions-by-periods'],
  });

  // Tab 6: Month Detail
  const { data: monthDetailData, isLoading: monthDetailLoading } = useQuery<MonthDetail[]>({
    queryKey: ['/api/analytics/single-month-detailed', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/analytics/single-month-detailed?month=${selectedMonth}`);
      return res.json();
    },
    enabled: !!selectedMonth,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExport = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há dados para exportar",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Exportar",
      description: `Funcionalidade de exportar ${filename} será implementada em breve`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900" data-testid="text-analytics-title">
          Análises Avançadas
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Relatórios detalhados e análises financeiras
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="pivot" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="pivot" className="text-xs md:text-sm py-2" data-testid="tab-pivot">
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Pivot Table</span>
            <span className="md:hidden">Pivot</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs md:text-sm py-2" data-testid="tab-monthly">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Mensal</span>
            <span className="md:hidden">Mês</span>
          </TabsTrigger>
          <TabsTrigger value="ipca" className="text-xs md:text-sm py-2" data-testid="tab-ipca">
            <Percent className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">IPCA</span>
            <span className="md:hidden">IPCA</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs md:text-sm py-2" data-testid="tab-distribution">
            <Building2 className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Imóveis</span>
            <span className="md:hidden">Dist</span>
          </TabsTrigger>
          <TabsTrigger value="periods" className="text-xs md:text-sm py-2" data-testid="tab-periods">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Períodos</span>
            <span className="md:hidden">Per</span>
          </TabsTrigger>
          <TabsTrigger value="detail" className="text-xs md:text-sm py-2" data-testid="tab-detail">
            <FileText className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Detalhe</span>
            <span className="md:hidden">Det</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pivot Table */}
        <TabsContent value="pivot" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between mb-4">
                <div>
                  <CardTitle data-testid="text-pivot-title">Tabela Pivot</CardTitle>
                  <CardDescription>Análise cruzada de receitas e despesas por mês e imóvel</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport(pivotData || [], 'pivot-table.csv')}
                  data-testid="button-export-pivot"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">Mês:</label>
                  <select 
                    value={pivotMonth}
                    onChange={(e) => setPivotMonth(Number(e.target.value))}
                    className="border rounded px-3 py-1 text-sm bg-background"
                    data-testid="select-pivot-month"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>
                        {new Date(2025, m - 1).toLocaleDateString('pt-BR', {month: 'long'})}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">Ano:</label>
                  <select 
                    value={pivotYear}
                    onChange={(e) => setPivotYear(Number(e.target.value))}
                    className="border rounded px-3 py-1 text-sm bg-background"
                    data-testid="select-pivot-year"
                  >
                    {Array.from({length: 5}, (_, i) => currentYear - 2 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pivotLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !pivotData || pivotData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-pivot-empty">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dado disponível para tabela pivot</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead className="text-right">Receitas</TableHead>
                        <TableHead className="text-right">Despesas</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pivotData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-pivot-${idx}`}>
                          <TableCell>{new Date(pivotYear, pivotMonth - 1).toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})}</TableCell>
                          <TableCell>{row.propertyName}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(row.expenses)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.netResult)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Monthly Analysis */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle data-testid="text-monthly-title">Análise Mensal</CardTitle>
                  <CardDescription>Consolidado mensal de receitas e despesas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32" data-testid="select-year">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport(monthlyData || [], `monthly-${selectedYear}.csv`)}
                    data-testid="button-export-monthly"
                  >
                    <Download className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Exportar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !monthlyData || monthlyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-monthly-empty">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dado disponível para {selectedYear}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead className="text-right">Receitas</TableHead>
                        <TableHead className="text-right">Despesas</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-right">Imóveis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-monthly-${idx}`}>
                          <TableCell>{new Date(2025, row.month - 1).toLocaleDateString('pt-BR', {month: 'short'})}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(row.expenses)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.revenue - row.expenses)}
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: IPCA Correction */}
        <TabsContent value="ipca" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-ipca-title">Correção IPCA</CardTitle>
                <CardDescription>Valores corrigidos pela inflação (IPCA)</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport(ipcaData || [], 'ipca-correction.csv')}
                data-testid="button-export-ipca"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {ipcaLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !ipcaData || ipcaData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-ipca-empty">
                  <Percent className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dado disponível para correção IPCA</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Valor Corrigido</TableHead>
                        <TableHead className="text-right">IPCA %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipcaData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-ipca-${idx}`}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{row.property}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.originalValue)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {formatCurrency(row.correctedValue)}
                          </TableCell>
                          <TableCell className="text-right">{row.ipcaRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Property Distribution */}
        <TabsContent value="distribution" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-distribution-title">Distribuição por Imóvel</CardTitle>
                <CardDescription>Performance financeira de cada propriedade</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport(distributionData || [], 'property-distribution.csv')}
                data-testid="button-export-distribution"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {distributionLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !distributionData || distributionData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-distribution-empty">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dado disponível para distribuição por imóvel</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imóvel</TableHead>
                        <TableHead className="text-right">Receitas</TableHead>
                        <TableHead className="text-right">Despesas</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-right">% Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributionData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-distribution-${idx}`}>
                          <TableCell className="font-medium">{row.status}</TableCell>
                          <TableCell className="text-right" colSpan={4}>{row.count} imóveis</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Period Comparison */}
        <TabsContent value="periods" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-periods-title">Comparação de Períodos</CardTitle>
                <CardDescription>Evolução financeira entre diferentes períodos</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport(periodData || [], 'period-comparison.csv')}
                data-testid="button-export-periods"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {periodLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !periodData || periodData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-periods-empty">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dado disponível para comparação de períodos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-period-${idx}`}>
                          <TableCell className="font-medium">{row.month}/{row.year}</TableCell>
                          <TableCell>{row.propertyName}</TableCell>
                          <TableCell className="text-xs truncate max-w-[200px]">{row.description}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              row.type === 'revenue' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {formatCurrency(parseFloat(row.amount))}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Month Detail */}
        <TabsContent value="detail" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle data-testid="text-detail-title">Detalhe do Mês</CardTitle>
                  <CardDescription>Transações detalhadas do mês selecionado</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40" data-testid="select-month">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport(monthDetailData || [], `detail-${selectedMonth}.csv`)}
                    disabled={!selectedMonth}
                    data-testid="button-export-detail"
                  >
                    <Download className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Exportar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedMonth ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-detail-select">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Selecione um mês para ver os detalhes</p>
                </div>
              ) : monthDetailLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !monthDetailData || monthDetailData.length === 0 ? (
                <div className="text-center py-12 text-gray-500" data-testid="text-detail-empty">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhuma transação encontrada para {selectedMonth}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Imóvel</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthDetailData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-detail-${idx}`}>
                          <TableCell className="text-xs md:text-sm">{row.date}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{row.description}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className={`px-2 py-1 rounded text-xs ${
                              row.type === 'revenue' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {row.type === 'revenue' ? 'Receita' : 'Despesa'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{row.property}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            row.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(row.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
