import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CleanupResult {
  success: boolean;
  message: string;
  deletedTransactions: number;
  keptProperties: number;
}

export default function DataCleanup() {
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const { toast } = useToast();

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/cleanup/transactions", "DELETE");
      return await response.json() as CleanupResult;
    },
    onSuccess: (result) => {
      setCleanupResult(result);
      if (result.success) {
        toast({
          title: "Limpeza concluída",
          description: `${result.deletedTransactions} transações removidas. ${result.keptProperties} imóveis mantidos.`,
        });
        
        // Invalidar cache para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly'] });
      } else {
        toast({
          title: "Erro na limpeza",
          description: result.message,
          variant: "destructive",
        });
      }
      setConfirmCleanup(false);
    },
    onError: (error) => {
      toast({
        title: "Erro na limpeza",
        description: error.message,
        variant: "destructive",
      });
      setConfirmCleanup(false);
    },
  });

  const handleCleanup = () => {
    if (confirmCleanup) {
      cleanupMutation.mutate();
    } else {
      setConfirmCleanup(true);
    }
  };

  const handleCancel = () => {
    setConfirmCleanup(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Limpeza de Dados Financeiros
        </CardTitle>
        <CardDescription>
          Remove todas as transações financeiras mantendo os imóveis cadastrados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!confirmCleanup && !cleanupResult && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta operação irá remover <strong>todas as transações financeiras</strong> (receitas e despesas) 
                do sistema, mas manterá todos os imóveis cadastrados intactos.
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">O que será removido:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Todas as receitas (aluguéis, depósitos, etc.)</li>
                <li>• Todas as despesas (manutenção, impostos, etc.)</li>
                <li>• Dados históricos de transações</li>
                <li>• Métricas financeiras calculadas</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">O que será mantido:</h4>
              <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                <li>• Todos os imóveis cadastrados</li>
                <li>• Informações dos imóveis (endereços, tipos, status)</li>
                <li>• Configurações de moeda por imóvel</li>
                <li>• Sua conta de usuário</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Caso de uso ideal:</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Use esta funcionalidade quando a importação não funcionou como esperado e você 
                quer tentar novamente com um formato de dados diferente, sem precisar recriar 
                todos os imóveis.
              </p>
            </div>

            <Button 
              onClick={handleCleanup}
              variant="destructive"
              className="w-full"
              disabled={cleanupMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Dados Financeiros
            </Button>
          </>
        )}

        {confirmCleanup && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>CONFIRMAÇÃO NECESSÁRIA:</strong><br />
                Você tem certeza que deseja remover TODAS as transações financeiras? 
                Esta ação não pode ser desfeita.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                onClick={handleCleanup}
                variant="destructive"
                disabled={cleanupMutation.isPending}
                className="flex-1"
              >
                {cleanupMutation.isPending ? (
                  <>
                    <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                    Removendo...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sim, Remover Tudo
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={cleanupMutation.isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {cleanupResult && (
          <div className={`p-4 rounded-lg border ${
            cleanupResult.success 
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {cleanupResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {cleanupResult.success ? "Limpeza Concluída" : "Erro na Limpeza"}
              </span>
            </div>
            
            <p className="text-sm mb-2">{cleanupResult.message}</p>
            
            {cleanupResult.success && (
              <div className="bg-white dark:bg-gray-900 p-3 rounded border text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>Transações removidas: <strong>{cleanupResult.deletedTransactions}</strong></div>
                  <div>Imóveis mantidos: <strong>{cleanupResult.keptProperties}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {cleanupResult?.success && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Próximos passos:</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
              <li>Prepare sua planilha em um formato mais simples</li>
              <li>Use a importação histórica ou importação Excel padrão</li>
              <li>Teste com uma pequena amostra primeiro</li>
              <li>Se necessário, repita o processo de limpeza</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}