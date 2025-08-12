import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Home, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Upload,
  Download,
  Key,
  Link2,
  FileText,
  Clock,
  Users,
  DollarSign
} from 'lucide-react';
import { useLocation } from 'wouter';

interface SyncResult {
  success: boolean;
  totalFound?: number;
  imported?: number;
  skipped?: number;
  errors?: string[];
  requiresLogin?: boolean;
  fallbackToCsv?: boolean;
  message?: string;
}

export default function AirbnbSync() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hasSession, setHasSession] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setCheckingSession(true);
      const response = await apiRequest('/api/airbnb/check-session', 'GET');
      const data = await response.json();
      setHasSession(data.hasSession);
    } catch (error) {
      console.error('Error checking session:', error);
      setHasSession(false);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await apiRequest('/api/airbnb/sync', 'POST');
      const result: SyncResult = await response.json();
      
      setLastSyncResult(result);
      
      if (result.success) {
        toast({
          title: 'Sincronização concluída!',
          description: `${result.imported} transações importadas, ${result.skipped} ignoradas`,
        });
      } else if (result.requiresLogin) {
        toast({
          title: 'Login necessário',
          description: result.message,
          variant: 'destructive',
        });
        setHasSession(false);
      } else if (result.fallbackToCsv) {
        toast({
          title: 'Use importação CSV',
          description: result.message,
        });
      } else {
        toast({
          title: 'Erro na sincronização',
          description: result.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao sincronizar com o Airbnb',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      await checkSession();
    }
  };

  const InstructionsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Como configurar a sincronização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h3 className="font-semibold">Passo 1: Faça login no Airbnb</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
            <li>Abra o <a href="https://www.airbnb.com/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Airbnb</a> em uma nova aba</li>
            <li>Faça login com sua conta de anfitrião</li>
            <li>Complete a verificação em duas etapas se solicitado</li>
            <li>Navegue até a página de <a href="https://www.airbnb.com/hosting/earnings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ganhos</a></li>
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Passo 2: Copie os dados de sessão</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
            <li>Pressione F12 para abrir o DevTools</li>
            <li>Vá para a aba "Network" (Rede)</li>
            <li>Recarregue a página (F5)</li>
            <li>Clique em qualquer requisição para "www.airbnb.com"</li>
            <li>Na aba "Headers", copie o valor de "Cookie"</li>
            <li>Procure e copie também o valor de "X-Csrf-Token" (se estiver vazio, pule este passo)</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Passo 3: Salve a sessão aqui</h3>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por motivos de segurança, não salvamos suas credenciais do Airbnb. 
              Apenas mantemos uma sessão temporária que expira em 7 dias.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );

  const SessionForm = () => {
    const [cookies, setCookies] = useState('');
    const [csrfToken, setCsrfToken] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSaveSession = async () => {
      if (!cookies) {
        toast({
          title: 'Campo obrigatório',
          description: 'Por favor, preencha os cookies',
          variant: 'destructive',
        });
        return;
      }

      try {
        setSaving(true);
        const response = await apiRequest('/api/airbnb/save-session', 'POST', {
          cookies,
          csrfToken,
        });
        
        if (response.ok) {
          toast({
            title: 'Sessão salva!',
            description: 'Agora você pode sincronizar os dados do Airbnb',
          });
          setCookies('');
          setCsrfToken('');
          await checkSession();
        } else {
          throw new Error('Failed to save session');
        }
      } catch (error) {
        console.error('Error saving session:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao salvar sessão',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Salvar sessão do Airbnb
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cookies" className="text-sm font-medium">
              Cookies (valor do header Cookie)
            </label>
            <textarea
              id="cookies"
              className="w-full min-h-[100px] p-3 border rounded-md text-sm font-mono"
              placeholder="Exemplo: bev=...; jitney_client_session_id=..."
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="csrf" className="text-sm font-medium">
              CSRF Token (opcional - deixe vazio se não encontrar)
            </label>
            <input
              id="csrf"
              type="text"
              className="w-full p-3 border rounded-md text-sm font-mono"
              placeholder="Deixe vazio se o valor estiver em branco"
              value={csrfToken}
              onChange={(e) => setCsrfToken(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Se o X-Csrf-Token aparecer vazio no DevTools, pode deixar este campo em branco
            </p>
          </div>

          <Button 
            onClick={handleSaveSession}
            disabled={saving || !cookies}
            className="w-full"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Salvar Sessão
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const SyncStatus = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Status da Sincronização
          </span>
          <Badge variant={hasSession ? 'default' : 'secondary'}>
            {hasSession ? 'Conectado' : 'Desconectado'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSession ? (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Sessão ativa. Você pode sincronizar os dados do Airbnb.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma sessão ativa. Configure a sessão na aba "Configuração" primeiro.
            </AlertDescription>
          </Alert>
        )}

        {lastSyncResult && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2">Último resultado:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {lastSyncResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>
                  Status: {lastSyncResult.success ? 'Sucesso' : 'Falha'}
                </span>
              </div>
              
              {lastSyncResult.totalFound !== undefined && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span>Total encontrado: {lastSyncResult.totalFound}</span>
                </div>
              )}
              
              {lastSyncResult.imported !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Importadas: {lastSyncResult.imported}</span>
                </div>
              )}
              
              {lastSyncResult.skipped !== undefined && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span>Ignoradas: {lastSyncResult.skipped}</span>
                </div>
              )}
              
              {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-red-600">Erros:</p>
                  <ul className="list-disc list-inside ml-2">
                    {lastSyncResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-red-600">{error}</li>
                    ))}
                    {lastSyncResult.errors.length > 5 && (
                      <li className="text-gray-600">
                        ... e mais {lastSyncResult.errors.length - 5} erros
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CsvFallback = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Método Alternativo: Importação CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se a sincronização automática não funcionar, você sempre pode usar a importação manual de CSV.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <h3 className="font-semibold">Como exportar do Airbnb:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
            <li>Acesse seus <a href="https://www.airbnb.com/hosting/earnings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ganhos no Airbnb</a></li>
            <li>Clique em "Histórico de transações"</li>
            <li>Selecione o período desejado</li>
            <li>Clique em "Exportar CSV"</li>
            <li>Baixe o arquivo</li>
          </ol>
        </div>

        <Button
          onClick={() => setLocation('/import/airbnb')}
          variant="outline"
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Ir para Importação Manual
        </Button>
      </CardContent>
    </Card>
  );

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Home className="w-8 h-8" />
              Sincronização Airbnb
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Importe automaticamente todos os dados financeiros do Airbnb
            </p>
          </div>
          
          <Button
            onClick={() => setLocation('/import/airbnb')}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importação Manual
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">Sincronização</TabsTrigger>
            <TabsTrigger value="setup">Configuração</TabsTrigger>
            <TabsTrigger value="help">Ajuda</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <SyncStatus />
            <CsvFallback />
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <SessionForm />
            <InstructionsCard />
          </TabsContent>

          <TabsContent value="help" className="space-y-4">
            <InstructionsCard />
            <CsvFallback />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}