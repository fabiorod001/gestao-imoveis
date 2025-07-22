import { useParams, useLocation } from "wouter";
import PropertyEditForm from "@/components/properties/PropertyEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EditProperty() {
  const { id } = useParams() as { id: string };
  const [, setLocation] = useLocation();
  const propertyId = parseInt(id);

  const handleSuccess = () => {
    // Redirect immediately after successful update
    setLocation(`/property/${id}`);
  };

  const handleBack = () => {
    setLocation(`/property/${id}`);
  };

  if (!propertyId || isNaN(propertyId)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Propriedade não encontrada</h1>
          <p className="text-gray-600 mt-2">ID da propriedade inválido.</p>
          <Button onClick={() => setLocation("/properties")} className="mt-4">
            Voltar para Propriedades
          </Button>
        </div>
      </div>
    );
  }

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
            Voltar para Detalhes
          </Button>
        </div>
        
        <PropertyEditForm 
          propertyId={propertyId} 
          onSuccess={handleSuccess} 
        />
      </div>
    </div>
  );
}