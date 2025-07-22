import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import type { ExpenseType } from "./AdvancedExpenseManager";

interface ExpenseTypeOption {
  type: ExpenseType;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

interface ExpenseTypeSelectorProps {
  expenseTypes: ExpenseTypeOption[];
  onSelect: (type: ExpenseType) => void;
}

export default function ExpenseTypeSelector({ expenseTypes, onSelect }: ExpenseTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Selecione o Tipo de Despesa</CardTitle>
        <p className="text-muted-foreground">
          Escolha o tipo de despesa que deseja cadastrar. Após cadastrar, você poderá voltar e escolher outro tipo.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenseTypes.map((expenseType) => {
            const Icon = expenseType.icon;
            return (
              <Button
                key={expenseType.type}
                variant="outline"
                className={`h-auto p-6 text-left flex-col items-start space-y-3 ${expenseType.color} transition-all duration-200 hover:scale-105`}
                onClick={() => onSelect(expenseType.type)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{expenseType.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {expenseType.description}
                </p>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}