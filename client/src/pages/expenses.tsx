import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Plus,
  Download,
  TrendingDown,
  Calendar,
  Building,
  Edit3
} from 'lucide-react';

// Dados mockup para despesas do mês corrente (julho)
const mockupExpenses = [
  {
    id: 1,
    categoria: "Manutenção",
    imovel: "Apartamento Centro - 101",
    valor: 450,
    data: "2024-07-15",
    descricao: "Reparo ar condicionado",
    status: "Pago"
  },
  {
    id: 2,
    categoria: "Limpeza",
    imovel: "Casa Praia - Villa Mar",
    valor: 200,
    data: "2024-07-10",
    descricao: "Limpeza pós checkout",
    status: "Pago"
  },
  {
    id: 3,
    categoria: "Manutenção",
    imovel: "Apartamento Zona Sul - 205",
    valor: 320,
    data: "2024-07-20",
    descricao: "Troca de fechadura",
    status: "Pendente"
  },
  {
    id: 4,
    categoria: "Condomínio",
    imovel: "Apartamento Centro - 101",
    valor: 380,
    data: "2024-07-05",
    descricao: "Taxa condominial julho",
    status: "Pago"
  },
  {
    id: 5,
    categoria: "Condomínio",
    imovel: "Apartamento Zona Sul - 205",
    valor: 420,
    data: "2024-07-05",
    descricao: "Taxa condominial julho",
    status: "Pago"
  },
  {
    id: 6,
    categoria: "Limpeza",
    imovel: "Studio Downtown",
    valor: 150,
    data: "2024-07-18",
    descricao: "Limpeza semanal",
    status: "Pago"
  },
  {
    id: 7,
    categoria: "Reforma",
    imovel: "Apartamento Reformando",
    valor: 2500,
    data: "2024-07-01",
    descricao: "Material de construção",
    status: "Pago"
  },
  {
    id: 8,
    categoria: "Utilities",
    imovel: "Cobertura Luxury",
    valor: 280,
    data: "2024-07-12",
    descricao: "Conta de luz",
    status: "Pago"
  },
  {
    id: 9,
    categoria: "Manutenção",
    imovel: "Casa Praia - Villa Mar",
    valor: 180,
    data: "2024-07-25",
    descricao: "Jardinagem",
    status: "Pendente"
  },
  {
    id: 10,
    categoria: "Limpeza",
    imovel: "Cobertura Luxury",
    valor: 300,
    data: "2024-07-22",
    descricao: "Limpeza profunda",
    status: "Pago"
  }
];

// Lista de imóveis para filtro
const imoveis = [
  "Apartamento Centro - 101",
  "Casa Praia - Villa Mar",
  "Apartamento Zona Sul - 205",
  "Studio Downtown",
  "Cobertura Luxury",
  "Apartamento Reformando"
];

// Lista de categorias para filtro
const categorias = [
  "Manutenção",
  "Limpeza",
  "Condomínio",
  "Reforma",
  "Utilities"
];

// Lista de meses para filtro
const meses = [
  { value: "2024-07", label: "Julho 2024" },
  { value: "2024-06", label: "Junho 2024" },
  { value: "2024-05", label: "Maio 2024" },
  { value: "2024-04", label: "Abril 2024" },
  { value: "2024-03", label: "Março 2024" }
];

export default function Expenses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [filterImovel, setFilterImovel] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [filterMes, setFilterMes] = useState<string>('2024-07');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewExpenseForm, setShowNewExpenseForm] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Função de ordenação
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrar e ordenar dados
  const filteredData = mockupExpenses
    .filter(item => {
      if (filterImovel !== 'todos' && item.imovel !== filterImovel) return false;
      if (filterCategoria !== 'todos' && item.categoria !== filterCategoria) return false;
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false;
      if (filterMes !== 'todos' && !item.data.startsWith(filterMes)) return false;
      if (searchTerm && !item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const aVal = a[sortConfig.key as keyof typeof a];
      const bVal = b[sortConfig.key as keyof typeof b];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  // Agrupar despesas por categoria para o resumo
  const expensesByCategory = filteredData.reduce((acc, expense) => {
    if (!acc[expense.categoria]) {
      acc[expense.categoria] = 0;
    }
    acc[expense.categoria] += expense.valor;
    return acc;
  }, {} as Record<string, number>);

  // Calcular total
  const totalExpenses = filteredData.reduce((acc, item) => acc + item.valor, 0);

  // Função para editar valor inline
  const handleEditValue = (id: number, newValue: string) => {
    const numValue = parseFloat(newValue.replace(',', '.'));
    if (!isNaN(numValue)) {
      // Aqui você atualizaria o valor no backend
      toast({
        title: "Valor atualizado",
        description: `Despesa atualizada para R$ ${numValue.toLocaleString('pt-BR')}`,
      });
    }
    setEditingExpense(null);
    setEditValue('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestão de Despesas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Controle financeiro • {meses.find(m => m.value === filterMes)?.label || 'Julho 2024'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowNewExpenseForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Despesa
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo por Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(expensesByCategory).map(([categoria, valor]) => (
            <Card key={categoria} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setFilterCategoria(categoria)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    {Math.round((valor / totalExpenses) * 100)}%
                  </Badge>
                </div>
                <CardTitle className="text-lg text-red-600">
                  R$ {valor.toLocaleString('pt-BR')}
                </CardTitle>
                <p className="text-sm text-gray-600">{categoria}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Total Geral */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingDown className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <CardTitle className="text-2xl font-bold text-red-600">
                    R$ {totalExpenses.toLocaleString('pt-BR')}
                  </CardTitle>
                  <p className="text-sm text-red-700">Total de Despesas - {meses.find(m => m.value === filterMes)?.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-600">Número de Despesas</p>
                <p className="text-xl font-bold text-red-600">{filteredData.length}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabela Dinâmica de Despesas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tabela Dinâmica - Despesas Detalhadas</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Meses</SelectItem>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterImovel} onValueChange={setFilterImovel}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Imóveis</SelectItem>
                  {imoveis.map(imovel => (
                    <SelectItem key={imovel} value={imovel}>{imovel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Categorias</SelectItem>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th 
                      className="text-left p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('data')}
                    >
                      <div className="flex items-center">
                        Data
                        {sortConfig?.key === 'data' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'data' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('categoria')}
                    >
                      <div className="flex items-center">
                        Categoria
                        {sortConfig?.key === 'categoria' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'categoria' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('imovel')}
                    >
                      <div className="flex items-center">
                        Imóvel
                        {sortConfig?.key === 'imovel' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'imovel' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium">Descrição</th>
                    <th 
                      className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('valor')}
                    >
                      <div className="flex items-center justify-end">
                        Valor
                        {sortConfig?.key === 'valor' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'valor' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {new Date(item.data).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => setFilterCategoria(item.categoria)}
                        >
                          {item.categoria}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm">{item.imovel}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{item.descricao}</td>
                      <td className="p-3 text-right">
                        {editingExpense === item.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleEditValue(item.id, editValue)}
                              onKeyPress={(e) => e.key === 'Enter' && handleEditValue(item.id, editValue)}
                              className="w-24 text-right"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="text-red-600 font-medium cursor-pointer hover:bg-red-50 px-2 py-1 rounded"
                            onClick={() => {
                              setEditingExpense(item.id);
                              setEditValue(item.valor.toString());
                            }}
                          >
                            R$ {item.valor.toLocaleString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={
                          item.status === 'Pago' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Linha de total */}
                  <tr className="border-t-2 border-gray-300 bg-red-50 font-bold">
                    <td className="p-3" colSpan={4}>TOTAL</td>
                    <td className="p-3 text-right text-red-600">
                      R$ {totalExpenses.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-center">
                      {filteredData.filter(item => item.status === 'Pago').length} / {filteredData.length}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal/Form para Nova Despesa - Placeholder */}
        {showNewExpenseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Nova Despesa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">Formulário de cadastro de nova despesa será implementado aqui.</p>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowNewExpenseForm(false)}>
                      Cancelar
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700">
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
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
          <Button 
            onClick={() => handleOpenDistributionModal('limpeza')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Despesa de Limpeza
          </Button>
          <Button 
            onClick={() => handleOpenDistributionModal('gestao')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Despesa de Gestão
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

      {/* Consolidated View - Pivot Table */}
      {viewMode === 'consolidated' && (
        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tabela Dinâmica de Despesas</CardTitle>
            <div className="flex items-center gap-2">
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
                        <td className="text-right p-2 text-red-600">
                          -{Math.abs(expense.amount).toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
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
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Expense Manager - AFTER THE TABLE */}
      {isAddingExpense && (
        <div className="mt-6">
          <AdvancedExpenseManager 
            onComplete={handleExpenseComplete}
            onCancel={() => setIsAddingExpense(false)}
          />
        </div>
      )}

      {/* Expense Distribution Modal */}
      <ExpenseDistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        onSave={handleSaveDistribution}
        expenseType={selectedExpenseType}
      />
    </div>
  );
}