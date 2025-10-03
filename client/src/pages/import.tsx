import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Table, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Import() {
  const [, setLocation] = useLocation();

  const importOptions = [
    { 
      id: 'airbnb', 
      icon: FileText, 
      title: 'Importar Airbnb', 
      description: 'CSV do Airbnb',
      path: '/import/airbnb'
    },
    { 
      id: 'cleaning', 
      icon: Table, 
      title: 'Importar Limpeza', 
      description: 'Planilha de limpeza',
      path: '/import/cleaning'
    },
    { 
      id: 'excel', 
      icon: Upload, 
      title: 'Importar Excel', 
      description: 'Qualquer planilha',
      path: '/import/excel'
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-sm text-muted-foreground">Escolha o tipo de importação</p>
      </div>

      <div className="space-y-3">
        {importOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setLocation(option.path)}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-muted/50">
        <p className="text-sm text-center">
          💡 <strong>Dica:</strong> Prepare seus arquivos antes de importar
        </p>
      </Card>
    </div>
  );
}
