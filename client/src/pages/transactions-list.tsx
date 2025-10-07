import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  propertyName?: string;
}

export default function TransactionsList() {
  const [, setLocation] = useLocation();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions?limit=100`);
      return res.json();
    },
  });

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => {
        return new Date(row.getValue("date")).toLocaleDateString('pt-BR');
      },
    },
    {
      accessorKey: "description",
      header: "Descrição",
    },
    {
      accessorKey: "propertyName",
      header: "Imóvel",
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {type === 'revenue' ? 'Receita' : 'Despesa'}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(amount);
      },
    },
  ];

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Todas as Transações</h1>
        <Button onClick={() => setLocation('/transactions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={transactions}
        searchPlaceholder="Buscar transações..."
      />
    </div>
  );
}
