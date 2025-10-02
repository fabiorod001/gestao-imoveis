import { useLocation } from "wouter";
import PropertyEditForm from "@/components/properties/PropertyEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewProperty() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/properties");
  };

  const handleBack = () => {
    setLocation("/properties");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Imóveis
          </Button>
          <h1 className="text-3xl font-bold">Novo Imóvel</h1>
        </div>
        <PropertyEditForm
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}