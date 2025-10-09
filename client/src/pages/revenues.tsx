import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Plus,
  Calendar,
  Building2,
  Filter,
  Table as TableIcon,
  Grid,
} from "lucide-react";
import { SiAirbnb } from "react-icons/si";
import { useState } from "react";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import { NewRevenueDialog } from "@/components/NewRevenueDialog";

export default function Revenues() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions", { type: "revenue" }],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/transactions?type=revenue`
      );
      return res.json();
    },
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getSourceIcon = (category: string) => {
    if (category?.toLowerCase().includes("airbnb"))
      return <SiAirbnb className="h-4 w-4 text-[#FF5A5F]" />;
    if (category?.toLowerCase().includes("booking"))
      return <Building2 className="h-4 w-4 text-[#003580]" />;
    return null;
  };

  const getSourceColor = (category: string) => {
    if (category?.toLowerCase().includes("airbnb"))
      return "bg-red-50 text-red-700 border-red-200";
    if (category?.toLowerCase().includes("booking"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t: any) => {
    if (selectedProperty !== "all" && t.propertyId?.toString() !== selectedProperty)
      return false;
    if (selectedSource !== "all" && t.category !== selectedSource) return false;
    return true;
  });

  const total = filteredTransactions.reduce(
    (sum: number, t: any) => sum + Number(t.amount || 0),
    0
  );

  // Get unique sources
  const sources = Array.from(
    new Set(transactions.map((t: any) => t.category).filter(Boolean))
  );

  // Summary by property
  const byProperty = properties.map((prop: any) => {
    const propTransactions = filteredTransactions.filter(
      (t: any) => t.propertyId === prop.id
    );
    const propTotal = propTransactions.reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );
    return { property: prop.name, total: propTotal, count: propTransactions.length };
  }).filter((p: any) => p.total > 0);

  // Summary by source
  const bySource = sources.map((source: string) => {
    const sourceTransactions = filteredTransactions.filter(
      (t: any) => t.category === source
    );
    const sourceTotal = sourceTransactions.reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );
    return { source, total: sourceTotal, count: sourceTransactions.length };
  });

  const handleCardClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-20 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receitas</h1>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(total)}
          </p>
        </div>
        <NewRevenueDialog />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger data-testid="filter-property">
                <SelectValue placeholder="Todas as propriedades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {properties.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger data-testid="filter-source">
                <SelectValue placeholder="Todas as fontes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                {sources.map((source: string) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("cards")}
              data-testid="view-cards"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
              data-testid="view-table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {(byProperty.length > 0 || bySource.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Property */}
          {byProperty.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                Por Propriedade
              </h3>
              <div className="space-y-2">
                {byProperty.slice(0, 3).map((item: any) => (
                  <div
                    key={item.property}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="truncate flex-1">{item.property}</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By Source */}
          {bySource.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                Por Fonte
              </h3>
              <div className="space-y-2">
                {bySource.map((item: any) => (
                  <div
                    key={item.source}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getSourceIcon(item.source)}
                      <span>{item.source}</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && filteredTransactions.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Propriedade</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction: any) => (
                <TableRow
                  key={transaction.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleCardClick(transaction)}
                  data-testid={`row-transaction-${transaction.id}`}
                >
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{transaction.propertyName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSourceIcon(transaction.category)}
                      <span className="text-sm">{transaction.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.description || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-3">
          {filteredTransactions.map((transaction: any) => (
            <Card
              key={transaction.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleCardClick(transaction)}
              data-testid={`card-transaction-${transaction.id}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {transaction.description || "Receita"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDateShort(transaction.date)}</span>
                      {transaction.propertyName && (
                        <>
                          <Building2 className="h-3.5 w-3.5 ml-1" />
                          <span className="truncate">{transaction.propertyName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-green-600 whitespace-nowrap">
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>

                {transaction.category && (
                  <Badge variant="outline" className={getSourceColor(transaction.category)}>
                    <div className="flex items-center gap-1.5">
                      {getSourceIcon(transaction.category)}
                      <span>{transaction.category}</span>
                    </div>
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredTransactions.length === 0 && (
        <Card className="p-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma receita encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {selectedProperty !== "all" || selectedSource !== "all"
              ? "Tente ajustar os filtros"
              : "Adicione uma receita para começar"}
          </p>
        </Card>
      )}

      {/* Edit Dialog */}
      {selectedTransaction && (
        <EditTransactionDialog
          transaction={selectedTransaction}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
