import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function Reports() {
  const [, setLocation] = useLocation();

  const reportTypes = [
    { id: 'monthly', icon: Calendar, title: 'Relatório Mensal', description: 'Receitas e despesas do mês' },
    { id: 'annual', icon: TrendingUp, title: 'Relatório Anual', description: 'Resumo do ano' },
    { id: 'property', icon: FileText, title: 'Por Imóvel', description: 'Análise individual' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="space-y-3">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setLocation(`/reports/${report.id}`)}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
                <Download className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          Selecione um tipo de relatório para gerar
        </p>
      </Card>
    </div>
  );
}
