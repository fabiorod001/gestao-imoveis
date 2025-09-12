import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, ArrowLeft, Calendar, Filter, User, Building2, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction, Property } from "@shared/schema";

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface IndividualPayment {
  id: number;
  date: string;
  amount: number;
  description: string;
  propertyCount: number;
  notes?: string;
}

interface PropertyBreakdown {
  propertyId: number;
  propertyName: string;
  totalAmount: number;
  paymentCount: number;
}

export default function MauricioExpensesPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    monthOptions.find(m => m.isCurrentMonth)?.key || '09/2025'
  ]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  
  // Fetch all properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  // Fetch all transactions
  const { data: allTransactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions']
  });

  // Process Maurício expenses
  const processedData = useMemo(() => {
    const individualPayments: IndividualPayment[] = [];
    const propertyBreakdownMap = new Map<number, PropertyBreakdown>();
    let totalAmount = 0;

    // Filter for Maurício expenses in selected months
    const mauricioTransactions = allTransactions.filter(t => 
      (t.category === 'Maurício' || t.category === 'management') &&
      t.type === 'expense'
    );

    // Process transactions
    mauricioTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!selectedMonths.includes(monthKey)) return;
      
      // Check if this is a parent transaction (individual payment)
      const isParent = transaction.parentTransactionId === null && 
                      mauricioTransactions.some(t => t.parentTransactionId === transaction.id);
      const isStandalone = transaction.parentTransactionId === null && 
                          !mauricioTransactions.some(t => t.parentTransactionId === transaction.id);
      
      if (isParent || isStandalone) {
        // Count child transactions to get property count
        const childTransactions = mauricioTransactions.filter(t => 
          t.parentTransactionId === transaction.id
        );
        
        // Filter by selected properties if any are selected
        if (selectedProperties.length > 0) {
          const hasSelectedProperty = childTransactions.some(child => 
            child.propertyId && selectedProperties.includes(child.propertyId)
          );
          if (!hasSelectedProperty && !(isStandalone && transaction.propertyId && selectedProperties.includes(transaction.propertyId))) {
            return;
          }
        }
        
        individualPayments.push({
          id: transaction.id,
          date: transaction.date,
          amount: Math.abs(parseFloat(transaction.amount.toString())),
          description: transaction.description || 'Pagamento Maurício',
          propertyCount: childTransactions.length || 1,
          notes: transaction.notes
        });
        
        totalAmount += Math.abs(parseFloat(transaction.amount.toString()));
      }
      
      // Process child transactions for property breakdown
      if (transaction.parentTransactionId !== null && transaction.propertyId) {
        // Check if parent is in selected months
        const parent = mauricioTransactions.find(t => t.id === transaction.parentTransactionId);
        if (!parent) return;
        
        const parentDate = new Date(parent.date);
        const parentMonthKey = `${String(parentDate.getMonth() + 1).padStart(2, '0')}/${parentDate.getFullYear()}`;
        if (!selectedMonths.includes(parentMonthKey)) return;
        
        // Filter by selected properties if any are selected
        if (selectedProperties.length > 0 && !selectedProperties.includes(transaction.propertyId)) {
          return;
        }
        
        const property = properties.find(p => p.id === transaction.propertyId);
        if (!property) return;
        
        if (!propertyBreakdownMap.has(transaction.propertyId)) {
          propertyBreakdownMap.set(transaction.propertyId, {
            propertyId: transaction.propertyId,
            propertyName: property.name,
            totalAmount: 0,
            paymentCount: 0
          });
        }
        
        const breakdown = propertyBreakdownMap.get(transaction.propertyId)!;
        breakdown.totalAmount += Math.abs(parseFloat(transaction.amount.toString()));
        breakdown.paymentCount += 1;
      }
    });

    // Sort individual payments by date (newest first)
    individualPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Convert property breakdown map to array and sort by name
    const propertyBreakdown = Array.from(propertyBreakdownMap.values())
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

    return {
      individualPayments,
      propertyBreakdown,
      totalAmount
    };
  }, [allTransactions, selectedMonths, selectedProperties, properties]);

  // Handle month selection
  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  // Handle property selection
  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(p => p !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAllProperties = () => {
    if (selectedProperties.length === activeProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(activeProperties.map(p => p.id));
    }
  };

  // Format selected months for display
  const selectedMonthsDisplay = selectedMonths
    .map(key => monthOptions.find(m => m.key === key)?.label || key)
    .join(', ');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/expenses">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Despesas - Gestão Maurício</h1>
              <p className="text-sm text-muted-foreground">
                Visualize os pagamentos e distribuição por imóvel
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              data-testid="button-toggle-filters"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                <Badge variant="secondary">
                  {selectedMonths.length} {selectedMonths.length === 1 ? 'mês' : 'meses'}
                </Badge>
                {selectedProperties.length > 0 && (
                  <Badge variant="secondary">
                    {selectedProperties.length} {selectedProperties.length === 1 ? 'imóvel' : 'imóveis'}
                  </Badge>
                )}
              </div>
              {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {monthOptions.slice(-12).map(month => (
                    <Button
                      key={month.key}
                      variant={selectedMonths.includes(month.key) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMonthToggle(month.key)}
                      data-testid={`button-month-${month.key}`}
                      className="text-xs"
                    >
                      {month.key}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Imóveis</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllProperties}
                    data-testid="button-select-all-properties"
                  >
                    {selectedProperties.length === activeProperties.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeProperties.map(property => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`property-${property.id}`}
                        checked={selectedProperties.length === 0 || selectedProperties.includes(property.id)}
                        onCheckedChange={() => handlePropertyToggle(property.id)}
                        data-testid={`checkbox-property-${property.id}`}
                      />
                      <label
                        htmlFor={`property-${property.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {property.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold" data-testid="text-total-amount">
                {formatCurrency(processedData.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Número de Pagamentos</p>
              <p className="text-2xl font-bold" data-testid="text-payment-count">
                {processedData.individualPayments.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período Selecionado</p>
              <p className="text-sm font-medium" data-testid="text-period">
                {selectedMonthsDisplay || 'Nenhum período selecionado'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Pagamentos Individuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedData.individualPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento encontrado no período selecionado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Imóveis</TableHead>
                    {processedData.individualPayments.some(p => p.notes) && (
                      <TableHead>Observações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.individualPayments.map(payment => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">
                        {format(new Date(payment.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {payment.propertyCount} {payment.propertyCount === 1 ? 'imóvel' : 'imóveis'}
                        </Badge>
                      </TableCell>
                      {processedData.individualPayments.some(p => p.notes) && (
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.notes || '-'}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell>{formatCurrency(processedData.totalAmount)}</TableCell>
                    <TableCell colSpan={processedData.individualPayments.some(p => p.notes) ? 3 : 2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Distribuição por Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedData.propertyBreakdown.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma distribuição encontrada no período selecionado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imóvel</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Qtd. Pagamentos</TableHead>
                    <TableHead className="text-right">Média por Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.propertyBreakdown.map(property => (
                    <TableRow key={property.propertyId} data-testid={`row-property-${property.propertyId}`}>
                      <TableCell className="font-medium">{property.propertyName}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(property.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {property.paymentCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(property.totalAmount / property.paymentCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(processedData.propertyBreakdown.reduce((sum, p) => sum + p.totalAmount, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {processedData.propertyBreakdown.reduce((sum, p) => sum + p.paymentCount, 0)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}