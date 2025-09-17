import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TestTube } from 'lucide-react';
import { useLocation } from 'wouter';
import CondominiumOcrUploader from '@/components/condominium/CondominiumOcrUploader';

export default function CondominiumOcrTestPage() {
  const [, setLocation] = useLocation();
  const [showUploader, setShowUploader] = useState(true);

  const handleSuccess = (data: any) => {
    console.log('OCR Success:', data);
    setShowUploader(false);
  };

  const handleCancel = () => {
    setShowUploader(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/expenses')}
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TestTube className="h-8 w-8 text-blue-600" />
                Teste OCR - Boletos de Condomínio
              </h1>
              <p className="text-gray-600 mt-1">
                Teste de reconhecimento automático de dados em boletos de condomínio
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instruções de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>Campos que o sistema tentará identificar:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Nome do Imóvel:</strong> Ex: "6 000307" → "Sevilha 307"</li>
                <li><strong>Competência:</strong> Ex: "CONDOMÍNIO JUNHO/2025"</li>
                <li><strong>Itens detalhados:</strong></li>
                <ul className="list-disc list-inside ml-6 space-y-1">
                  <li>Taxa Condomínial: R$ 568,99</li>
                  <li>ENEL (Luz): R$ 63,24</li>
                  <li>Consumo Gás: R$ 119,75</li>
                  <li>Consumo Água: R$ 78,05</li>
                </ul>
                <li><strong>Data de Vencimento:</strong> Ex: "05/06/2025"</li>
                <li><strong>Valor Total:</strong> Soma automática dos itens</li>
                <li><strong>Campos opcionais:</strong> Juros, Advogado, Valor Cobrado</li>
              </ul>
              <p className="mt-3 text-blue-600">
                <strong>Dica:</strong> Você pode editar qualquer campo após o processamento OCR
              </p>
            </div>
          </CardContent>
        </Card>

        {/* OCR Component */}
        {showUploader && (
          <CondominiumOcrUploader 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}

        {/* Success State */}
        {!showUploader && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="space-y-4">
                <div className="text-green-600 text-lg font-medium">
                  ✅ Dados extraídos e salvos com sucesso!
                </div>
                <p className="text-gray-600">
                  A despesa de condomínio foi processada e adicionada ao sistema.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => setShowUploader(true)}
                    data-testid="button-test-another"
                  >
                    Testar Outro Boleto
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/expenses')}
                    data-testid="button-go-to-expenses"
                  >
                    Ver Despesas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}