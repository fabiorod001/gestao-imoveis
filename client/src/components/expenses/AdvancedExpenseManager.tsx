import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Calculator, 
  FileText, 
  Lightbulb, 
  Droplets, 
  Wifi, 
  Wrench, 
  CreditCard,
  Receipt,
  Trash2,
  ArrowLeft,
  Plus
} from "lucide-react";
import ExpenseTypeSelector from "./ExpenseTypeSelector";
import CondominiumExpenseForm from "./CondominiumExpenseForm";
import TaxPaymentForm from "../taxes/TaxPaymentForm";
import ManagementExpenseForm from "./ManagementExpenseForm";
import SingleExpenseForm from "./SingleExpenseForm";
import RecurringExpenseForm from "./RecurringExpenseForm";

export type ExpenseType = 
  | 'condominium'
  | 'taxes'
  | 'management'
  | 'utilities'
  | 'maintenance'
  | 'financing'
  | 'iptu'
  | 'internet'
  | 'cleaning'
  | 'commissions'
  | 'other';

export interface PropertyExpenseStructure {
  propertyId: number;
  propertyName: string;
  condominiumFields: {
    name: string;
    placeholder: string;
  }[];
}

// Estruturas específicas por propriedade
const getPropertyExpenseStructure = (propertyName: string): PropertyExpenseStructure['condominiumFields'] => {
  const structures: Record<string, PropertyExpenseStructure['condominiumFields']> = {
    'Sevilha 307': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'energia', placeholder: 'Energia' },
      { name: 'gas', placeholder: 'Gás' },
      { name: 'agua', placeholder: 'Água' },
      { name: 'extra4', placeholder: 'Item 4' },
      { name: 'extra5', placeholder: 'Item 5' }
    ],
    'Sevilha G07': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'energia', placeholder: 'Energia' },
      { name: 'gas', placeholder: 'Gás' },
      { name: 'agua', placeholder: 'Água' },
      { name: 'extra4', placeholder: 'Item 4' },
      { name: 'extra5', placeholder: 'Item 5' }
    ],
    'Málaga M07': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'energia', placeholder: 'Energia' },
      { name: 'gas', placeholder: 'Gás' },
      { name: 'agua', placeholder: 'Água' },
      { name: 'extra4', placeholder: 'Item 4' },
      { name: 'extra5', placeholder: 'Item 5' }
    ],
    'MaxHaus 43R': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'benfeitorias', placeholder: 'Benfeitorias' },
      { name: 'estacionamento', placeholder: 'Estacionamento' },
      { name: 'extra3', placeholder: 'Item 3' },
      { name: 'extra4', placeholder: 'Item 4' },
      { name: 'extra5', placeholder: 'Item 5' }
    ],
    'Thera by You': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'fundoReserva', placeholder: 'Fundo de reserva' },
      { name: 'agua', placeholder: 'Água' },
      { name: 'gas', placeholder: 'Gás' },
      { name: 'energia', placeholder: 'Energia' },
      { name: 'extra5', placeholder: 'Item 5' },
      { name: 'extra6', placeholder: 'Item 6' }
    ],
    'Next Haddock Lobo ap 33': [
      { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
      { name: 'energia', placeholder: 'Energia' },
      { name: 'fundoReserva', placeholder: 'Fundo de Reserva' },
      { name: 'internet', placeholder: 'Internet' },
      { name: 'gas', placeholder: 'Gás' },
      { name: 'agua', placeholder: 'Água' },
      { name: 'extra6', placeholder: 'Item 6' }
    ]
  };

  return structures[propertyName] || [
    { name: 'taxaCondominal', placeholder: 'Taxa Condomínial' },
    { name: 'extra1', placeholder: 'Item 1' },
    { name: 'extra2', placeholder: 'Item 2' },
    { name: 'extra3', placeholder: 'Item 3' },
    { name: 'extra4', placeholder: 'Item 4' },
    { name: 'extra5', placeholder: 'Item 5' }
  ];
};

export default function AdvancedExpenseManager() {
  const [currentStep, setCurrentStep] = useState<'type-selection' | 'form'>('type-selection');
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [sessionExpenses, setSessionExpenses] = useState<any[]>([]);

  const expenseTypes = [
    {
      type: 'condominium' as ExpenseType,
      title: 'Condomínio',
      description: 'Taxas condominiais e despesas por propriedade',
      icon: Building2,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      type: 'taxes' as ExpenseType,
      title: 'Impostos',
      description: 'PIS, COFINS, CSLL, IRPJ e IPTU com rateio',
      icon: Calculator,
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      type: 'management' as ExpenseType,
      title: 'Gestão - Maurício',
      description: 'Taxas de gestão divididas entre imóveis',
      icon: FileText,
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      type: 'maintenance' as ExpenseType,
      title: 'Manutenção',
      description: 'Reparos e manutenções com fornecedores',
      icon: Wrench,
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      type: 'financing' as ExpenseType,
      title: 'Financiamento',
      description: 'Parcelas de financiamento de imóveis',
      icon: CreditCard,
      color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    },
    {
      type: 'cleaning' as ExpenseType,
      title: 'Limpezas',
      description: 'Serviços de limpeza dos imóveis',
      icon: Droplets,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      type: 'other' as ExpenseType,
      title: 'Despesas Gerais',
      description: 'Luz, gás, água, TV, internet e outras',
      icon: Lightbulb,
      color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
    }
  ];

  const handleExpenseTypeSelect = (type: ExpenseType) => {
    // Se selecionar limpezas, redireciona para a página específica
    if (type === 'cleaning') {
      window.location.href = '/expenses/cleaning';
      return;
    }
    setSelectedExpenseType(type);
    setCurrentStep('form');
  };

  const handleBack = () => {
    setCurrentStep('type-selection');
    setSelectedExpenseType(null);
  };

  const handleExpenseComplete = (expense: any) => {
    setSessionExpenses(prev => [...prev, expense]);
    // Volta para seleção de tipo para continuar cadastrando
    setCurrentStep('type-selection');
    setSelectedExpenseType(null);
  };

  const renderForm = () => {
    if (!selectedExpenseType) return null;

    switch (selectedExpenseType) {
      case 'condominium':
        return (
          <CondominiumExpenseForm
            onComplete={handleExpenseComplete}
            onCancel={handleBack}
            getPropertyStructure={getPropertyExpenseStructure}
          />
        );
      case 'taxes':
        return (
          <TaxPaymentForm />
        );
      case 'management':
        return (
          <ManagementExpenseForm
            onComplete={handleExpenseComplete}
            onCancel={handleBack}
          />
        );
      case 'utilities':
      case 'financing':
      case 'cleaning':
      case 'commissions':
      case 'other':
        return (
          <SingleExpenseForm
            expenseType={selectedExpenseType}
            onComplete={handleExpenseComplete}
            onCancel={handleBack}
          />
        );
      case 'internet':
      case 'iptu':
        return (
          <RecurringExpenseForm
            expenseType={selectedExpenseType}
            onComplete={handleExpenseComplete}
            onCancel={handleBack}
          />
        );
      case 'maintenance':
        return (
          <SingleExpenseForm
            expenseType={selectedExpenseType}
            includeSupplier={true}
            onComplete={handleExpenseComplete}
            onCancel={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Summary */}
      {sessionExpenses.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-800">
              Despesas Cadastradas Nesta Sessão ({sessionExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sessionExpenses.map((expense, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {expense.type} - {expense.propertyName} - R$ {expense.totalAmount?.toFixed(2)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {currentStep === 'type-selection' ? (
        <ExpenseTypeSelector
          expenseTypes={expenseTypes}
          onSelect={handleExpenseTypeSelect}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-xl font-semibold">
              Cadastrar {expenseTypes.find(t => t.type === selectedExpenseType)?.title}
            </h2>
          </div>
          {renderForm()}
        </div>
      )}
    </div>
  );
}