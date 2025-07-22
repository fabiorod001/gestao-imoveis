import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { ArrowLeft, Filter, Download, FileSpreadsheet, FileText, Info } from 'lucide-react';
import { useLocation } from 'wouter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';

interface ExpenseDetail {
  id: number;
  subcategory: string;
  month: string;
  total: number;
}

const GeneralExpensesDetailPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['jul. de 2026', 'jun. de 2026', 'mai. de 2026', 'abr. de 2026', 'mar. de 2026']);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(['Tarifas Bancárias', 'Contador', 'Aluguel Escritório', 'Telefone/Internet Empresarial', 'Seguros Gerais']);

  const monthOptions = [
    'jul. de 2026', 'jun. de 2026', 'mai. de 2026', 'abr. de 2026', 'mar. de 2026',
    'fev. de 2026', 'jan. de 2026', 'dez. de 2025', 'nov. de 2025', 'out. de 2025'
  ];

  const subcategoryOptions = [
    'Tarifas Bancárias',
    'Contador', 
    'Aluguel Escritório',
    'Telefone/Internet Empresarial',
    'Seguros Gerais'
  ];

  // Mock data - in real app this would come from API
  const expenseData: ExpenseDetail[] = [
    // No data to show empty state
  ];

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const toggleSubcategory = (subcategory: string) => {
    setSelectedSubcategories(prev => 
      prev.includes(subcategory) 
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const clearAllFilters = () => {
    setSelectedMonths([]);
    setSelectedSubcategories([]);
  };

  const exportToExcel = () => {
    // Export functionality
    console.log('Exporting to Excel...');
  };

  const exportToPDF = () => {
    // Export functionality
    console.log('Exporting to PDF...');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/expenses')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes: Despesas Gerais</h1>
            <p className="text-muted-foreground mt-1">
              Custos da empresa não vinculados a propriedades específicas (transações sem property). Exemplos: tarifas bancárias, contador, aluguel do escritório, etc.
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

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Despesas Gerais:</strong> Esta categoria inclui apenas custos da empresa que não estão vinculados a propriedades específicas (transações sem property). Exemplos: tarifas bancárias, contador, aluguel do escritório, etc.
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filtros Avançados</span>
                  <Badge variant="secondary">{selectedMonths.length + selectedSubcategories.length}</Badge>
                </div>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Months Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Meses</h4>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setSelectedMonths(monthOptions)}
                      className="h-auto p-0"
                    >
                      Selecionar todos
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {monthOptions.map(month => (
                      <div key={month} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month}`}
                          checked={selectedMonths.includes(month)}
                          onCheckedChange={() => toggleMonth(month)}
                        />
                        <label htmlFor={`month-${month}`} className="text-sm cursor-pointer">
                          {month}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedMonths.length} subcategorias | Total
                  </div>
                </div>

                {/* Subcategories Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Subcategorias</h4>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setSelectedSubcategories(subcategoryOptions)}
                      className="h-auto p-0"
                    >
                      Selecionar todos
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {subcategoryOptions.map(subcategory => (
                      <div key={subcategory} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subcategory-${subcategory}`}
                          checked={selectedSubcategories.includes(subcategory)}
                          onCheckedChange={() => toggleSubcategory(subcategory)}
                        />
                        <label htmlFor={`subcategory-${subcategory}`} className="text-sm cursor-pointer">
                          {subcategory}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSubcategories.length} subcategorias | Total
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllFilters}
                >
                  Limpar todos os filtros
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas Gerais - Custos da Empresa por Subcategoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Subcategoria</th>
                  <th className="text-center p-3 font-medium">07/2025</th>
                  <th className="text-center p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {expenseData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-8 text-muted-foreground">
                      Nenhuma despesa encontrada para os filtros selecionados
                    </td>
                  </tr>
                ) : (
                  expenseData.map((expense, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{expense.subcategory}</td>
                      <td className="text-center p-3 text-red-600">
                        -{expense.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-center p-3 font-medium text-red-600">
                        -{expense.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="font-bold bg-gray-100">
                  <td className="p-3">TOTAL</td>
                  <td className="text-center p-3 text-red-600">-</td>
                  <td className="text-center p-3 text-red-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralExpensesDetailPage;