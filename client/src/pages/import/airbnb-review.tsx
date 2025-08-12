import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useLocation, useRoute } from 'wouter';
import { cn } from '@/lib/utils';

interface DiscrepancyDetail {
  date: string;
  property: string;
  csvAmount: number;
  existingAmount: number;
  difference: number;
  action?: 'keep_csv' | 'keep_existing' | 'merge';
}

interface ReviewData {
  discrepancies: DiscrepancyDetail[];
  newTransactions: number;
  updatedTransactions: number;
  totalRevenue: number;
  period: {
    start: string;
    end: string;
  };
}

export default function AirbnbReviewPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/import/airbnb-review/:sessionId');
  const sessionId = params?.sessionId;
  
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});
  const [selectAll, setSelectAll] = useState<'csv' | 'existing' | null>(null);

  // Fetch review data
  const { data: reviewData, isLoading } = useQuery({
    queryKey: [`/api/import/airbnb-review/${sessionId}`],
    enabled: !!sessionId,
  });

  // Process import with selected actions
  const confirmMutation = useMutation({
    mutationFn: async (actions: Record<string, string>) => {
      const response = await fetch(`/api/import/airbnb-confirm/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions })
      });
      
      if (!response.ok) {
        throw new Error('Failed to confirm import');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      navigate('/import?success=airbnb');
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleSelectAll = (action: 'csv' | 'existing') => {
    if (!reviewData?.discrepancies) return;
    
    const newActions: Record<string, string> = {};
    reviewData.discrepancies.forEach((disc, index) => {
      newActions[`${disc.date}_${disc.property}`] = action === 'csv' ? 'keep_csv' : 'keep_existing';
    });
    
    setSelectedActions(newActions);
    setSelectAll(action);
  };

  const handleIndividualAction = (key: string, action: string) => {
    setSelectedActions(prev => ({
      ...prev,
      [key]: action
    }));
    setSelectAll(null);
  };

  const handleConfirm = () => {
    confirmMutation.mutate(selectedActions);
  };

  const handleCancel = () => {
    navigate('/import');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sessão de revisão não encontrada ou expirada.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/import')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Importação
        </Button>
      </div>
    );
  }

  const allActionsSelected = reviewData.discrepancies.every(
    (disc) => selectedActions[`${disc.date}_${disc.property}`]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revisão de Importação Airbnb</h1>
          <p className="text-muted-foreground mt-2">
            Revise as discrepâncias encontradas e escolha qual valor manter
          </p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(reviewData.period.start)} - {formatDate(reviewData.period.end)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Discrepâncias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {reviewData.discrepancies.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novas Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reviewData.newTransactions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(reviewData.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discrepâncias Encontradas</CardTitle>
              <CardDescription>
                Foram encontrados valores diferentes entre o CSV e o banco de dados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll('csv')}
                className={cn(selectAll === 'csv' && 'bg-blue-50 border-blue-500')}
              >
                Usar todos do CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll('existing')}
                className={cn(selectAll === 'existing' && 'bg-green-50 border-green-500')}
              >
                Manter todos existentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviewData.discrepancies.map((disc, index) => {
              const key = `${disc.date}_${disc.property}`;
              const selected = selectedActions[key];
              
              return (
                <div 
                  key={index}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{disc.property}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(disc.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {disc.difference > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={cn(
                        "font-medium",
                        disc.difference > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(Math.abs(disc.difference))}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all",
                        selected === 'keep_csv' 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleIndividualAction(key, 'keep_csv')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-600">Valor do CSV (Novo)</span>
                        {selected === 'keep_csv' && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="text-lg font-bold">{formatCurrency(disc.csvAmount)}</div>
                    </div>

                    <div 
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all",
                        selected === 'keep_existing' 
                          ? "border-green-500 bg-green-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleIndividualAction(key, 'keep_existing')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-600">Valor Existente</span>
                        {selected === 'keep_existing' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-lg font-bold">{formatCurrency(disc.existingAmount)}</div>
                    </div>

                    <div 
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all",
                        selected === 'merge' 
                          ? "border-purple-500 bg-purple-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleIndividualAction(key, 'merge')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-purple-600">Somar Valores</span>
                        {selected === 'merge' && (
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(disc.csvAmount + disc.existingAmount)}
                      </div>
                    </div>
                  </div>

                  {!selected && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Selecione uma opção para esta discrepância
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="text-sm text-muted-foreground">
          {allActionsSelected ? (
            <span className="text-green-600 font-medium">
              ✓ Todas as discrepâncias foram resolvidas
            </span>
          ) : (
            <span className="text-amber-600">
              Resolva todas as discrepâncias antes de continuar
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={confirmMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!allActionsSelected || confirmMutation.isPending}
          >
            {confirmMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Importação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}