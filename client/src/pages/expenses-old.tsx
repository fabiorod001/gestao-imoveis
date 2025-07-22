import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  Building2, 
  Users, 
  Sparkles, 
  FileText,
  ChevronRight,
  Home,
  TrendingUp,
  ClipboardList,
  Receipt,
  GripVertical,
  Table,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const initialCategories = [
  {
    id: 'taxes',
    name: 'Impostos',
    description: 'PIS, COFINS, CSLL e IRPJ',
    icon: Calculator,
    color: 'from-purple-500 to-purple-600',
    link: '/taxes'
  },
  {
    id: 'condominium',
    name: 'Condomínios',
    description: 'Taxas condominiais e despesas relacionadas',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
    link: '/expenses/condominium'
  },
  {
    id: 'management',
    name: 'Gestão - Maurício',
    description: 'Taxas de administração e gestão',
    icon: Users,
    color: 'from-green-500 to-green-600',
    link: '/expenses/management'
  },
  {
    id: 'cleaning',
    name: 'Limpezas',
    description: 'Serviços de limpeza e manutenção',
    icon: Sparkles,
    color: 'from-indigo-500 to-indigo-600',
    link: '/expenses/cleaning'
  },
  {
    id: 'others',
    name: 'Outras Despesas',
    description: 'Despesas diversas e extraordinárias',
    icon: FileText,
    color: 'from-gray-500 to-gray-600',
    link: '/expenses/others'
  }
];

export default function ExpensesPage() {
  const [expenseCategories, setExpenseCategories] = useState(initialCategories);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900">Central de Despesas</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Despesas (Mês)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 45.320,00</div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias Ativas</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                Impostos, Condomínios e mais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Últimos Lançamentos</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">
                Nos últimos 7 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category List - Minimalist Style */}
        <Card>
          <CardHeader>
            <CardTitle>Categorias de Despesas</CardTitle>
            <CardDescription>
              Selecione uma categoria para gerenciar as despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {expenseCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={() => setDraggedItem(category.id)}
                    onDragEnd={() => setDraggedItem(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem && draggedItem !== category.id) {
                        const draggedIndex = expenseCategories.findIndex(c => c.id === draggedItem);
                        const targetIndex = index;
                        const newCategories = [...expenseCategories];
                        const [removed] = newCategories.splice(draggedIndex, 1);
                        newCategories.splice(targetIndex, 0, removed);
                        setExpenseCategories(newCategories);
                      }
                    }}
                    className={`${draggedItem === category.id ? 'opacity-50' : ''}`}
                  >
                    <Link href={category.link}>
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${category.color} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">{category.description}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as funcionalidades mais utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/taxes">
                <Button variant="outline" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Cadastrar Impostos
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" disabled>
                <Building2 className="h-4 w-4" />
                Lançar Condomínio
              </Button>
              <Link href="/expenses/management">
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Registrar Taxa de Gestão
                </Button>
              </Link>
              <Link href="/expenses/cleaning">
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Adicionar Limpeza
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}