import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const INITIAL_PROPERTIES = [
  "Sevilha 307",
  "Sevilha G07", 
  "Málaga M0",
  "MaxHaus 43R",
  "Salas Brasal",
  "Next Haddock Lobo ap 33",
  "Sesimbra ap 505- Portugal",
  "Thera by You",
  "Casa Ibirapuera torre 3 ap 1411",
  "Living Full Faria Lima setor 1 res 1808"
];

export default function QuickPropertySetup() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const { toast } = useToast();

  const createPropertiesMutation = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      setCreatedCount(0);
      
      const results = [];
      for (let i = 0; i < INITIAL_PROPERTIES.length; i++) {
        const propertyName = INITIAL_PROPERTIES[i];
        
        try {
          const response = await apiRequest("/api/properties", "POST", {
            name: propertyName,
            address: "Endereço a ser preenchido",
            type: "apartment", 
            status: "active",
            rentalValue: 0,
            currency: propertyName.includes("Portugal") ? "EUR" : "BRL",
          });
          
          results.push({ success: true, name: propertyName });
          setCreatedCount(i + 1);
        } catch (error) {
          console.error(`Erro ao criar ${propertyName}:`, error);
          results.push({ 
            success: false, 
            name: propertyName, 
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast({
          title: "Imóveis criados",
          description: `${successCount} imóveis criados com sucesso${errorCount > 0 ? ` (${errorCount} erros)` : ''}`,
        });
        
        // Invalidar cache para atualizar a lista
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
      }
      
      if (errorCount > 0) {
        const errorProperties = results.filter(r => !r.success).map(r => r.name);
        toast({
          title: "Alguns erros ocorreram",
          description: `Erro ao criar: ${errorProperties.join(', ')}`,
          variant: "destructive",
        });
      }
      
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Erro na criação",
        description: error.message,
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Configuração Rápida - 10 Imóveis
        </CardTitle>
        <CardDescription>
          Criar os imóveis iniciais com base na sua planilha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Imóveis a serem criados:</h4>
          <div className="grid gap-2 text-sm">
            {INITIAL_PROPERTIES.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                {isCreating && index < createdCount ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : isCreating && index === createdCount ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <div className="h-4 w-4 rounded border border-muted-foreground/30" />
                )}
                <span className={isCreating && index < createdCount ? "text-green-600" : ""}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isCreating && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium">
                Criando imóveis... ({createdCount}/{INITIAL_PROPERTIES.length})
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Este processo pode levar alguns segundos
            </p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Importante:
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Os imóveis serão criados com dados básicos</li>
            <li>• Você pode editar cada imóvel depois na página "Imóveis"</li>
            <li>• Endereços, valores e detalhes devem ser preenchidos manualmente</li>
            <li>• Imóvel em Portugal será configurado com moeda EUR</li>
          </ul>
        </div>

        <Button 
          onClick={() => createPropertiesMutation.mutate()}
          disabled={isCreating}
          className="w-full"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando Imóveis... ({createdCount}/{INITIAL_PROPERTIES.length})
            </>
          ) : (
            <>
              <Building className="mr-2 h-4 w-4" />
              Criar 10 Imóveis Iniciais
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}