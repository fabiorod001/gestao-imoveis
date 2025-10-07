import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function Onboarding() {
  const [show, setShow] = useState(!localStorage.getItem('onboardingCompleted'));
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo ao RentManager!",
      description: "Gerencie seus imóveis de forma simples e eficiente.",
    },
    {
      title: "Navegação Mobile",
      description: "Use os ícones na parte inferior para navegar entre seções.",
    },
    {
      title: "Dashboard Gerencial",
      description: "Acompanhe gráficos e KPIs em tempo real.",
    },
  ];

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleComplete}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{steps[step].title}</h2>
          <p className="text-muted-foreground">{steps[step].description}</p>

          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${
                  i === step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Próximo
              </Button>
            ) : (
              <Button onClick={handleComplete} className="flex-1">
                Começar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
