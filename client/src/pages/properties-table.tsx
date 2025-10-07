import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Property {
  id: number;
  name: string;
  city?: string;
  state?: string;
  status: string;
  marketValue?: number;
}

export default function PropertiesTable() {
  const [, setLocation] = useLocation();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/properties`);
      return res.json();
    },
  });

  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "city",
      header: "Cidade",
    },
    {
      accessorKey: "state",
      header: "Estado",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const colors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          financing: 'bg-blue-100 text-blue-800',
          decoration: 'bg-yellow-100 text-yellow-800',
          inactive: 'bg-gray-100 text-gray-800',
        };
        const labels: Record<string, string> = {
          active: 'Ativo',
          financing: 'Financiamento',
          decoration: 'Reforma',
          inactive: 'Inativo',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.inactive}`}>
            {labels[status] || status}
          </span>
        );
      },
    },
    {
      accessorKey: "marketValue",
      header: "Valor de Mercado",
      cell: ({ row }) => {
        const value = row.getValue("marketValue") as number;
        if (!value) return '-';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      },
    },
  ];

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Imóveis (Tabela)</h1>
        <Button onClick={() => setLocation('/properties/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={properties}
        searchPlaceholder="Buscar imóveis..."
      />
    </div>
  );
}
