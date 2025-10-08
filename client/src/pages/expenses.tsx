import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Briefcase, 
  Sparkles, 
  Receipt, 
  Wrench, 
  FolderOpen,
  ChevronRight 
} from "lucide-react";

const categories = [
  {
    id: 'condominium',
    name: 'Condomínios',
    icon: Building2,
    path: '/expenses/condominium',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'management',
    name: 'Gestão - Maurício',
    icon: Briefcase,
    path: '/expenses/mauricio',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    iconColor: 'text-purple-600'
  },
  {
    id: 'cleaning',
    name: 'Limpeza',
    icon: Sparkles,
    path: '/expenses/cleaning',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    iconColor: 'text-green-600'
  },
  {
    id: 'taxes',
    name: 'Impostos',
    icon: Receipt,
    path: '/taxes',
    color: 'bg-red-50 hover:bg-red-100 border-red-200',
    iconColor: 'text-red-600'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: Wrench,
    path: '/expenses/utilities-detail',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    iconColor: 'text-orange-600'
  },
  {
    id: 'others',
    name: 'Administrativas',
    icon: FolderOpen,
    path: '/expenses/others',
    color: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    iconColor: 'text-gray-600'
  },
];

export default function Expenses() {
  const [, setLocation] = useLocation();

  const { data: expensesSummary, isLoading } = useQuery({
    queryKey: ['/api/expenses/summary'],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/expenses/summary`
      );
      if (!res.ok) return { total: 0, byCategory: {} };
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const total = expensesSummary?.total || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3,4].map(i => <Card key={i} className="h-20 animate-pulse bg-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despesas</h1>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Category Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const categoryTotal = expensesSummary?.byCategory?.[category.id] || 0;
          
          return (
            <Card 
              key={category.id}
              className={`cursor-pointer transition-all border-2 ${category.color}`}
              onClick={() => setLocation(category.path)}
              data-testid={`button-category-${category.id}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white`}>
                      <Icon className={`h-6 w-6 ${category.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {formatCurrency(categoryTotal)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <p className="text-sm text-blue-800">
            💡 Clique em uma categoria para ver detalhes e gerenciar despesas
          </p>
        </div>
      </Card>
    </div>
  );
}
