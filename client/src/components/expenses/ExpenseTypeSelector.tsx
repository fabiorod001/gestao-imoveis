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
                className={`h-auto min-h-[120px] p-4 text-left flex flex-col items-start justify-start gap-3 overflow-hidden ${expenseType.color} transition-all duration-200 hover:scale-105`}
                onClick={() => onSelect(expenseType.type)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{expenseType.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 w-full">
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