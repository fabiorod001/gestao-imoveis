import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ManagementExpenseForm from "@/components/expenses/ManagementExpenseForm";
import { useEffect, useState } from "react";

export default function ManagementPage() {
  const [location] = useLocation();
  const [editData, setEditData] = useState<any>(null);
  
  useEffect(() => {
    // Parse URL parameters for edit mode
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const editId = searchParams.get('editId');
    const date = searchParams.get('date');
    const amount = searchParams.get('amount');
    const properties = searchParams.get('properties');
    
    if (editId) {
      setEditData({
        editId: parseInt(editId),
        date,
        amount,
        properties: properties ? properties.split(',').map(id => parseInt(id)) : []
      });
    }
  }, [location]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {editData ? 'Editar Despesa de Gestão' : 'Gestão - Maurício'}
          </h1>
        </div>

        <ManagementExpenseForm editData={editData} />
      </div>
    </div>
  );
}