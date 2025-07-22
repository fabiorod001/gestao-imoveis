"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, TrendingUp, TrendingDown, DollarSign, Calendar, Plus } from "lucide-react";

// Mock data - será substituído pela integração com o banco de dados
const mockData = {
  properties: [
    {
      id: 1,
      name: "Apartamento Copacabana",
      type: "apartment",
      address: "Rua Barata Ribeiro, 123 - Copacabana, RJ",
      acquisitionValue: 850000,
      currentValue: 920000,
      monthlyRevenue: 4500,
      monthlyExpenses: 1200,
      occupancyRate: 85,
      status: "occupied"
    },
    {
      id: 2,
      name: "Casa Barra da Tijuca",
      type: "house",
      address: "Av. das Américas, 456 - Barra da Tijuca, RJ",
      acquisitionValue: 1200000,
      currentValue: 1350000,
      monthlyRevenue: 6800,
      monthlyExpenses: 1800,
      occupancyRate: 92,
      status: "occupied"
    },
    {
      id: 3,
      name: "Loft Ipanema",
      type: "apartment",
      address: "Rua Visconde de Pirajá, 789 - Ipanema, RJ",
      acquisitionValue: 650000,
      currentValue: 720000,
      monthlyRevenue: 3200,
      monthlyExpenses: 950,
      occupancyRate: 78,
      status: "vacant"
    }
  ],
  cashFlow: {
    totalRevenue: 14500,
    totalExpenses: 3950,
    netIncome: 10550,
    projectedAnnual: 126600
  },
  recentTransactions: [
    {
      id: 1,
      type: "income",
      description: "Aluguel Apartamento Copacabana",
      amount: 4500,
      date: "2024-01-15",
      property: "Apartamento Copacabana"
    },
    {
      id: 2,
      type: "expense",
      description: "Condomínio Casa Barra",
      amount: 800,
      date: "2024-01-10",
      property: "Casa Barra da Tijuca"
    },
    {
      id: 3,
      type: "income",
      description: "Aluguel Casa Barra",
      amount: 6800,
      date: "2024-01-05",
      property: "Casa Barra da Tijuca"
    }
  ]
};

function PropertyCard({ property }: { property: any }) {
  const netIncome = property.monthlyRevenue - property.monthlyExpenses;
  const roi = ((netIncome * 12) / property.acquisitionValue) * 100;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{property.name}</CardTitle>
          <Badge variant={property.status === 'occupied' ? 'success' : 'warning'}>
            {property.status === 'occupied' ? 'Ocupado' : 'Vago'}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {property.address}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Receita Mensal</p>
            <p className="font-semibold text-green-600">{formatCurrency(property.monthlyRevenue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Despesas Mensais</p>
            <p className="font-semibold text-red-600">{formatCurrency(property.monthlyExpenses)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lucro Líquido</p>
            <p className="font-semibold">{formatCurrency(netIncome)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ROI Anual</p>
            <p className="font-semibold">{roi.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Taxa Ocupação</p>
            <p className="font-semibold">{property.occupancyRate}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Valor Atual</p>
            <p className="font-semibold">{formatCurrency(property.currentValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashFlowCard() {
  const { cashFlow } = mockData;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(cashFlow.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">Mensal</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(cashFlow.totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">Mensal</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(cashFlow.netIncome)}
          </div>
          <p className="text-xs text-muted-foreground">Mensal</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projeção Anual</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(cashFlow.projectedAnnual)}
          </div>
          <p className="text-xs text-muted-foreground">Estimativa</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentTransactions() {
  const { recentTransactions } = mockData;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>
          Últimas movimentações financeiras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between border-b pb-2">
              <div className="flex-1">
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.property} • {formatDate(transaction.date)}
                </p>
              </div>
              <div className={`font-semibold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu portfólio imobiliário
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Imóvel
        </Button>
      </div>
      
      {/* Cash Flow Cards */}
      <CashFlowCard />
      
      {/* Main Content */}
      <Tabs defaultValue="properties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="properties">Imóveis</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="properties" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockData.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <RecentTransactions />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>
                Análises detalhadas do seu portfólio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidade em desenvolvimento...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}