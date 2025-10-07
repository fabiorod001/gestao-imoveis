import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/DataTable";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { type ColumnDef } from "@tanstack/react-table";

interface DataTableWithExportProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  filename?: string;
}

export default function DataTableWithExport<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  filename = 'export',
}: DataTableWithExportProps<TData, TValue>) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => exportToCSV(data, filename)}
        >
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => exportToExcel(data, filename)}
        >
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={data}
        searchPlaceholder={searchPlaceholder}
      />
    </div>
  );
}
