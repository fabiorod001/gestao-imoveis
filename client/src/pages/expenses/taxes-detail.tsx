import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit2, 
  Save, 
  X, 
  Check, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  DollarSign,
  Percent,
  Calculator,
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TransactionDetailModal from '@/components/expenses/TransactionDetailModal';
import { SimpleTaxForm } from '@/components/taxes/SimpleTaxForm';
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Property {
  id: number;
  name: string;
  userId: string;
  address?: string;
  type: string;
  status: string;
  rentalType?: string;
}

// Brazilian tax types with rates
const TAX_TYPES = [
  { id: 'PIS', name: 'PIS', rate: 1.65, color: 'blue' },
  { id: 'COFINS', name: 'COFINS', rate: 7.6, color: 'green' },
  { id: 'CSLL', name: 'CSLL', rate: 2.88, color: 'purple' }, // 9% on 32% profit
  { id: 'IRPJ', name: 'IRPJ', rate: 4.8, color: 'orange' }, // 15% on 32% profit
  { id: 'IPTU', name: 'IPTU', rate: 0, color: 'red' } // Municipal tax, varies
];

interface Transaction {
  id: number;
  description: string;
  date: string;
  amount: number;
  category: string;
  propertyId: number;
  propertyName: string;
  taxType?: string;
  parentTransactionId?: number;
  notes?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// Generate month options for filters
function generateMonthOptions() {
  const options = [];
  const today = new Date();
  
  // Past 24 months and future 3 months
  for (let i = -24; i <= 3; i++) {
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

export default function TaxesDetailPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Current year from URL or default to current
  const currentYear = new URLSearchParams(window.location.search).get('year') || new Date().getFullYear().toString();

  // Filter states
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    monthOptions.find(m => m.isCurrentMonth)?.key || '09/2025'
  ]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [selectedTaxTypes, setSelectedTaxTypes] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [showProjections, setShowProjections] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailModalTransactions, setDetailModalTransactions] = useState<Transaction[]>([]);
  
  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  // Calculate date range based on selected months
  const dateRange = useMemo(() => {
    if (selectedMonths.length === 0) {
      return {
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      };
    }
    
    // Parse month/year and find min/max
    const dates = selectedMonths.map(m => {
      const [month, year] = m.split('/').map(Number);
      return new Date(year, month - 1, 1);
    });
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      startDate: format(startOfMonth(minDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(maxDate), 'yyyy-MM-dd')
    };
  }, [selectedMonths]);

  // Fetch tax data for selected period
  const { data: taxData, isLoading: isLoadingTaxes, refetch: refetchTaxes } = useQuery({
    queryKey: ['/api/taxes/period', dateRange, selectedProperties, selectedTaxTypes],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedProperties.length > 0 && { propertyIds: selectedProperties.join(',') }),
        ...(selectedTaxTypes.length > 0 && { taxTypes: selectedTaxTypes.join(',') })
      });
      
      const response = await fetch(`/api/taxes/period?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tax data');
      return response.json();
    },
    enabled: !!dateRange.startDate
  });

  // Fetch property tax distribution
  const { data: distributionData } = useQuery({
    queryKey: ['/api/taxes/distribution', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await fetch(`/api/taxes/distribution?${params}`);
      if (!response.ok) throw new Error('Failed to fetch distribution data');
      return response.json();
    },
    enabled: !!dateRange.startDate
  });

  // Fetch monthly comparison
  const { data: monthlyComparison } = useQuery({
    queryKey: ['/api/taxes/monthly-comparison', currentYear],
    queryFn: async () => {
      const response = await fetch(`/api/taxes/monthly-comparison/${currentYear}`);
      if (!response.ok) throw new Error('Failed to fetch monthly comparison');
      return response.json();
    }
  });

  // Fetch tax projections
  const { data: projections, refetch: refetchProjections } = useQuery({
    queryKey: ['/api/taxes/projections-enhanced'],
    queryFn: async () => {
      const response = await fetch('/api/taxes/projections-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          months: 3,
          baseOnLastMonths: 3,
          seasonalAdjustment: true
        })
      });
      if (!response.ok) throw new Error('Failed to fetch projections');
      return response.json();
    },
    enabled: showProjections
  });

  // Show transaction details
  const showTransactionDetails = (taxType: string, month: string) => {
    const transactions = taxData?.transactions?.filter((tx: any) => {
      const txDate = new Date(tx.date);
      const txMonth = `${String(txDate.getMonth() + 1).padStart(2, '0')}/${txDate.getFullYear()}`;
      return tx.taxType === taxType && txMonth === month;
    }) || [];
    
    setDetailModalTitle(`${taxType} - ${month}`);
    setDetailModalTransactions(transactions);
    setDetailModalOpen(true);
  };

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = taxData?.summary?.map((item: any) => ({
      'Tipo de Imposto': item.taxType,
      'Quantidade': item.count,
      'Total': formatCurrency(item.total)
    })) || [];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');
    
    // Transactions sheet
    const transactionsData = taxData?.transactions?.map((tx: any) => ({
      'Data': format(new Date(tx.date), 'dd/MM/yyyy'),
      'Tipo': tx.taxType,
      'Descrição': tx.description,
      'Imóvel': tx.propertyName || 'Empresa',
      'Valor': formatCurrency(tx.amount)
    })) || [];
    
    const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(wb, transactionsSheet, 'Transações');
    
    // Distribution sheet
    if (distributionData?.distribution) {
      const distData = distributionData.distribution.map((item: any) => ({
        'Imóvel': item.propertyName,
        'Receita': formatCurrency(item.revenue),
        '% do Total': formatPercentage(item.percentageOfTotal),
        'Imposto Proporcional': formatCurrency(item.taxAmount)
      }));
      
      const distSheet = XLSX.utils.json_to_sheet(distData);
      XLSX.utils.book_append_sheet(wb, distSheet, 'Distribuição');
    }
    
    // Monthly comparison sheet
    if (monthlyComparison?.months) {
      const monthData = monthlyComparison.months.map((month: any) => ({
        'Mês': month.monthName,
        'Receita': formatCurrency(month.revenue),
        'Impostos': formatCurrency(month.taxes),
        'Alíquota': formatPercentage(month.taxRate)
      }));
      
      const monthSheet = XLSX.utils.json_to_sheet(monthData);
      XLSX.utils.book_append_sheet(wb, monthSheet, 'Comparativo Mensal');
    }
    
    XLSX.writeFile(wb, `impostos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: "Exportação concluída",
      description: "Os dados foram exportados para Excel com sucesso.",
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Relatório de Impostos', 14, 22);
    
    // Period
    doc.setFontSize(12);
    doc.text(`Período: ${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} a ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`, 14, 32);
    
    // Summary table
    const summaryRows = taxData?.summary?.map((item: any) => [
      item.taxType,
      item.count.toString(),
      formatCurrency(item.total)
    ]) || [];
    
    autoTable(doc, {
      head: [['Tipo de Imposto', 'Quantidade', 'Total']],
      body: summaryRows,
      startY: 40
    });
    
    // Add total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`Total Geral: ${taxData?.formattedGrandTotal || 'R$ 0,00'}`, 14, finalY);
    
    doc.save(`impostos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "PDF gerado",
      description: "O relatório foi exportado em PDF com sucesso.",
    });
  };

  const isLoading = isLoadingTaxes;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation('/expenses')}
              data-testid="button-back-expenses"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Detalhamento de Impostos</h1>
              <p className="text-muted-foreground">
                Gestão completa de impostos e tributos
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => {
                refetchTaxes();
                refetchProjections();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              onClick={() => setShowTaxForm(true)}
              data-testid="button-add-tax"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Imposto
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <CardTitle className="text-base">Filtros</CardTitle>
                    {(selectedMonths.length > 0 || selectedProperties.length > 0 || selectedTaxTypes.length > 0) && (
                      <Badge variant="secondary">
                        {selectedMonths.length + selectedProperties.length + selectedTaxTypes.length} ativos
                      </Badge>
                    )}
                  </div>
                  {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Month Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meses</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {monthOptions.slice(-15).map((month) => (
                      <div key={month.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={month.key}
                          checked={selectedMonths.includes(month.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMonths([...selectedMonths, month.key]);
                            } else {
                              setSelectedMonths(selectedMonths.filter(m => m !== month.key));
                            }
                          }}
                          data-testid={`checkbox-month-${month.key}`}
                        />
                        <label
                          htmlFor={month.key}
                          className={cn(
                            "text-sm cursor-pointer",
                            month.isCurrentMonth && "font-bold text-primary"
                          )}
                        >
                          {month.label.slice(0, 3)}/{month.key.split('/')[1]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Imóveis</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {activeProperties.map((property) => (
                      <div key={property.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prop-${property.id}`}
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties([...selectedProperties, property.id]);
                            } else {
                              setSelectedProperties(selectedProperties.filter(p => p !== property.id));
                            }
                          }}
                          data-testid={`checkbox-property-${property.id}`}
                        />
                        <label
                          htmlFor={`prop-${property.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {property.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipos de Imposto</label>
                  <div className="flex flex-wrap gap-2">
                    {TAX_TYPES.map((tax) => (
                      <div key={tax.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tax-${tax.id}`}
                          checked={selectedTaxTypes.includes(tax.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTaxTypes([...selectedTaxTypes, tax.id]);
                            } else {
                              setSelectedTaxTypes(selectedTaxTypes.filter(t => t !== tax.id));
                            }
                          }}
                          data-testid={`checkbox-tax-${tax.id}`}
                        />
                        <label
                          htmlFor={`tax-${tax.id}`}
                          className="text-sm cursor-pointer"
                        >
                          <Badge variant="outline" className={`border-${tax.color}-500`}>
                            {tax.name} {tax.rate > 0 && `(${tax.rate}%)`}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMonths([monthOptions.find(m => m.isCurrentMonth)?.key || '09/2025']);
                      setSelectedProperties([]);
                      setSelectedTaxTypes([]);
                    }}
                    data-testid="button-clear-filters"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {TAX_TYPES.map((tax) => {
          const taxSummary = taxData?.summary?.find((s: any) => s.taxType === tax.id);
          return (
            <Card key={tax.id} data-testid={`card-tax-${tax.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{tax.name}</span>
                  {tax.rate > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {tax.rate}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {taxSummary?.formattedTotal || 'R$ 0,00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxSummary?.count || 0} lançamentos
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Total Summary */}
      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total de Impostos no Período</span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToExcel}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToPDF}
                data-testid="button-export-pdf"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-3xl font-bold text-primary">
                {taxData?.formattedGrandTotal || 'R$ 0,00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita no Período</p>
              <p className="text-2xl font-semibold">
                {distributionData?.formattedTotalRevenue || 'R$ 0,00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alíquota Efetiva</p>
              <p className="text-2xl font-semibold">
                {distributionData?.totalRevenue > 0 
                  ? formatPercentage((taxData?.grandTotal || 0) / distributionData.totalRevenue * 100)
                  : '0,00%'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breakdown" data-testid="tab-breakdown">
            Detalhamento
          </TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">
            Distribuição
          </TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">
            Comparativo Mensal
          </TabsTrigger>
          <TabsTrigger value="projections" data-testid="tab-projections">
            Projeções
          </TabsTrigger>
        </TabsList>

        {/* Tax Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Impostos</CardTitle>
              <CardDescription>
                Todos os pagamentos de impostos no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : taxData?.transactions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhum imposto encontrado no período selecionado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Descrição</th>
                        <th className="text-left p-2">Imóvel</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-center p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxData?.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            {format(new Date(tx.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {tx.taxType}
                            </Badge>
                          </td>
                          <td className="p-2">{tx.description}</td>
                          <td className="p-2">{tx.propertyName || 'Empresa'}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const txDate = new Date(tx.date);
                                const txMonth = `${String(txDate.getMonth() + 1).padStart(2, '0')}/${txDate.getFullYear()}`;
                                showTransactionDetails(tx.taxType, txMonth);
                              }}
                              data-testid={`button-details-${tx.id}`}
                            >
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-muted/30">
                        <td colSpan={4} className="p-2">TOTAL</td>
                        <td className="p-2 text-right">
                          {taxData?.formattedGrandTotal || 'R$ 0,00'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Imóvel</CardTitle>
              <CardDescription>
                Como os impostos são distribuídos baseado na receita de cada imóvel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributionData?.distribution?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhuma distribuição disponível para o período</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Imóvel</th>
                        <th className="text-right p-2">Receita Bruta</th>
                        <th className="text-right p-2">% do Total</th>
                        <th className="text-right p-2">Imposto Proporcional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionData?.distribution?.map((item: any) => (
                        <tr key={item.propertyId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{item.propertyName}</td>
                          <td className="p-2 text-right">{item.formattedRevenue}</td>
                          <td className="p-2 text-right">
                            <Badge variant="secondary">
                              {formatPercentage(item.percentageOfTotal)}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-medium">
                            {item.formattedTaxAmount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-muted/30">
                        <td className="p-2">TOTAL</td>
                        <td className="p-2 text-right">
                          {distributionData?.formattedTotalRevenue || 'R$ 0,00'}
                        </td>
                        <td className="p-2 text-right">100,00%</td>
                        <td className="p-2 text-right">
                          {distributionData?.formattedTotalTax || 'R$ 0,00'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo Mensal - {currentYear}</CardTitle>
              <CardDescription>
                Evolução mensal de receitas e impostos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyComparison?.months?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhum dado disponível para comparação</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Receita Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {monthlyComparison?.totals?.formattedRevenue || 'R$ 0,00'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Média: {monthlyComparison?.averages?.formattedRevenue || 'R$ 0,00'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Impostos Totais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {monthlyComparison?.totals?.formattedTaxes || 'R$ 0,00'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Média: {monthlyComparison?.averages?.formattedTaxes || 'R$ 0,00'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Alíquota Efetiva</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {formatPercentage(monthlyComparison?.totals?.effectiveRate || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Mês</th>
                          <th className="text-right p-2">Receita</th>
                          <th className="text-right p-2">Impostos</th>
                          <th className="text-right p-2">Alíquota</th>
                          <th className="text-center p-2">Tendência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyComparison?.months?.map((month: any, index: number) => {
                          const prevMonth = monthlyComparison.months[index - 1];
                          const trend = prevMonth 
                            ? month.taxes > prevMonth.taxes ? 'up' : 'down'
                            : 'neutral';
                          
                          return (
                            <tr key={month.month} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{month.monthName}</td>
                              <td className="p-2 text-right">{month.formattedRevenue}</td>
                              <td className="p-2 text-right">{month.formattedTaxes}</td>
                              <td className="p-2 text-right">
                                <Badge variant="secondary">
                                  {formatPercentage(month.taxRate)}
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500 inline" />}
                                {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500 inline" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projections Tab */}
        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Projeções de Impostos</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowProjections(true);
                    refetchProjections();
                  }}
                  data-testid="button-calculate-projections"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Recalcular
                </Button>
              </CardTitle>
              <CardDescription>
                Projeção para os próximos 3 meses baseada no histórico
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showProjections ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <Button 
                    onClick={() => setShowProjections(true)}
                    data-testid="button-show-projections"
                  >
                    Calcular Projeções
                  </Button>
                </div>
              ) : projections?.projections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Dados insuficientes para gerar projeções</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Receita Projetada (3 meses)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {projections?.totals?.formattedRevenue || 'R$ 0,00'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Impostos Projetados (3 meses)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-red-600">
                          {projections?.totals?.formattedTax || 'R$ 0,00'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Alíquota efetiva: {formatPercentage(projections?.totals?.effectiveRate || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {projections?.projections?.map((month: any) => (
                      <Card key={month.month}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {month.monthName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Receita Projetada</p>
                              <p className="text-xl font-semibold">{month.formattedRevenue}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Impostos Projetados</p>
                              <p className="text-xl font-semibold text-red-600">{month.formattedTax}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Detalhamento por Imposto:</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              {month.taxes?.map((tax: any) => (
                                <div key={tax.taxType} className="text-sm">
                                  <span className="font-medium">{tax.taxType}:</span>{' '}
                                  <span>{tax.formattedAmount}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {month.propertyDistribution?.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Distribuição por Imóvel:</p>
                              <div className="space-y-1">
                                {month.propertyDistribution.map((prop: any) => (
                                  <div key={prop.propertyId} className="flex justify-between text-sm">
                                    <span>{prop.propertyName}</span>
                                    <span className="text-muted-foreground">
                                      {prop.formattedRevenue}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {projections?.parameters && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                          <strong>Parâmetros da Projeção:</strong> Baseado nos últimos {projections.parameters.basedOnLastMonths} meses,
                          {projections.parameters.seasonalAdjustment ? ' com ajuste sazonal' : ' sem ajuste sazonal'}.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tax Form Dialog */}
      <Dialog open={showTaxForm} onOpenChange={setShowTaxForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento de Imposto</DialogTitle>
          </DialogHeader>
          <SimpleTaxForm
            onSuccess={() => {
              setShowTaxForm(false);
              queryClient.invalidateQueries({ queryKey: ['/api/taxes'] });
              toast({
                title: "Imposto registrado",
                description: "O pagamento foi registrado com sucesso.",
              });
            }}
            onCancel={() => setShowTaxForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailModalTitle}
        transactions={detailModalTransactions}
      />
    </div>
  );
}