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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {expenseTypes.map((expenseType) => {
            const Icon = expenseType.icon;
            return (
              <Button
                key={expenseType.type}
                variant="outline"
                className={`h-auto min-h-[110px] p-3 text-left flex flex-col items-start justify-between ${expenseType.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
                onClick={() => onSelect(expenseType.type)}
              >
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <h3 className="font-semibold text-xs">
                      {expenseType.title}
                    </h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    {expenseType.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}