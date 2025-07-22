import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Building, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Download,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

// Dados mockup para a tabela dinâmica principal
const mockupData = [
  {
    imovel: "Apartamento Centro - 101",
    tipo: "Airbnb",
    receita: 4500,
    despesas: 1200,
    lucro: 3300,
    ocupacao: 85,
    status: "Ativo"
  },
  {
    imovel: "Casa Praia - Villa Mar",
    tipo: "Aluguel Mensal",
    receita: 3200,
    despesas: 800,
    lucro: 2400,
    ocupacao: 100,
    status: "Ativo"
  },
  {
    imovel: "Apartamento Zona Sul - 205",
    tipo: "Airbnb",
    receita: 3800,
    despesas: 950,
    lucro: 2850,
    ocupacao: 78,
    status: "Ativo"
  },
  {
    imovel: "Studio Downtown",
    tipo: "Airbnb",
    receita: 2800,
    despesas: 700,
    lucro: 2100,
    ocupacao: 92,
    status: "Ativo"
  },
  {
    imovel: "Cobertura Luxury",
    tipo: "Aluguel Mensal",
    receita: 5500,
    despesas: 1100,
    lucro: 4400,
    ocupacao: 100,
    status: "Ativo"
  },
  {
    imovel: "Apartamento Reformando",
    tipo: "Reforma",
    receita: 0,
    despesas: 2500,
    lucro: -2500,
    ocupacao: 0,
    status: "Reforma"
  }
];

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
  const filteredData = mockupData
    .filter(item => {
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false;
      if (filterTipo !== 'todos' && item.tipo !== filterTipo) return false;
      if (searchTerm && !item.imovel.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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

  // Calcular totais
  const totals = filteredData.reduce((acc, item) => ({
    receita: acc.receita + item.receita,
    despesas: acc.despesas + item.despesas,
    lucro: acc.lucro + item.lucro
  }), { receita: 0, despesas: 0, lucro: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Principal
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Visão geral dos imóveis • {new Date().toLocaleDateString('pt-BR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total de Imóveis</p>
                <p className="text-2xl font-bold text-gray-900">{mockupData.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <Badge variant="outline" className="text-green-600 border-green-600">Mês Atual</Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                R$ {totals.receita.toLocaleString('pt-BR')}
              </CardTitle>
              <p className="text-sm text-gray-600">Receita Total</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <TrendingDown className="w-6 h-6 text-red-600" />
                <Badge variant="outline" className="text-red-600 border-red-600">Mês Atual</Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                R$ {totals.despesas.toLocaleString('pt-BR')}
              </CardTitle>
              <p className="text-sm text-gray-600">Despesas Totais</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Building className="w-6 h-6 text-blue-600" />
                <Badge variant="outline" className={`${totals.lucro >= 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}>
                  {totals.lucro >= 0 ? '+' : ''}{((totals.lucro / totals.receita) * 100).toFixed(1)}%
                </Badge>
              </div>
              <CardTitle className={`text-2xl font-bold ${totals.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {totals.lucro.toLocaleString('pt-BR')}
              </CardTitle>
              <p className="text-sm text-gray-600">Lucro Líquido</p>
            </CardHeader>
          </Card>
        </div>

        {/* Tabela Dinâmica Principal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tabela Dinâmica - Gestão de Imóveis</CardTitle>
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
                  placeholder="Buscar imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Reforma">Reforma</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="Airbnb">Airbnb</SelectItem>
                  <SelectItem value="Aluguel Mensal">Aluguel Mensal</SelectItem>
                  <SelectItem value="Reforma">Reforma</SelectItem>
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
                    <th 
                      className="text-left p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('tipo')}
                    >
                      <div className="flex items-center">
                        Tipo
                        {sortConfig?.key === 'tipo' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'tipo' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('receita')}
                    >
                      <div className="flex items-center justify-end">
                        Receita
                        {sortConfig?.key === 'receita' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'receita' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('despesas')}
                    >
                      <div className="flex items-center justify-end">
                        Despesas
                        {sortConfig?.key === 'despesas' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'despesas' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('lucro')}
                    >
                      <div className="flex items-center justify-end">
                        Lucro
                        {sortConfig?.key === 'lucro' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'lucro' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th 
                      className="text-center p-3 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('ocupacao')}
                    >
                      <div className="flex items-center justify-center">
                        Ocupação
                        {sortConfig?.key === 'ocupacao' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                        )}
                        {sortConfig?.key !== 'ocupacao' && <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />}
                      </div>
                    </th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="p-3 font-medium">{item.imovel}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          item.tipo === 'Airbnb' ? 'border-blue-500 text-blue-700' :
                          item.tipo === 'Aluguel Mensal' ? 'border-green-500 text-green-700' :
                          'border-orange-500 text-orange-700'
                        }>
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-green-600 font-medium">
                        R$ {item.receita.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        R$ {item.despesas.toLocaleString('pt-BR')}
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        item.lucro >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        R$ {item.lucro.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className={`w-12 h-2 rounded-full mr-2 ${
                            item.ocupacao >= 90 ? 'bg-green-500' :
                            item.ocupacao >= 70 ? 'bg-yellow-500' :
                            item.ocupacao > 0 ? 'bg-orange-500' : 'bg-gray-300'
                          }`} style={{ width: `${Math.max(item.ocupacao * 0.6, 12)}px` }} />
                          <span className="text-sm font-medium">{item.ocupacao}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={
                          item.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Linha de totais */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="p-3" colSpan={2}>TOTAL</td>
                    <td className="p-3 text-right text-green-600">
                      R$ {totals.receita.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      R$ {totals.despesas.toLocaleString('pt-BR')}
                    </td>
                    <td className={`p-3 text-right ${
                      totals.lucro >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {totals.lucro.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-center">
                      {Math.round(filteredData.reduce((acc, item) => acc + item.ocupacao, 0) / filteredData.length)}%
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Manutenção:</span>
                  <span className="font-medium">R$ 7.200</span>
                </div>
                <div className="flex justify-between">
                  <span>Condomínio:</span>
                  <span className="font-medium">R$ 11.720</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <Badge variant="outline" className="text-blue-600 border-blue-600">58.2%</Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">R$ 26.360</CardTitle>
              <CardDescription>Lucro Líquido (Últimos 30 dias)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Margem de Lucro:</span>
                  <span className="font-medium text-blue-600">58.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>ROI Mensal:</span>
                  <span className="font-medium text-blue-600">3.1%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Chart */}
        <CashFlowChart />
        
        {/* Advanced Pivot Table */}
        <AdvancedPivotTable />
      </div>
    </div>
  );
}
