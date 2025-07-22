import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataTransformationGuide() {
  const downloadTemplate = () => {
    // This would create a downloadable template
    alert("Template de conversão em desenvolvimento. Use as instruções abaixo para transformar sua planilha.");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Guia de Transformação de Dados
        </CardTitle>
        <CardDescription>
          Como converter sua planilha atual para o formato que o sistema consegue importar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Formato Atual</TabsTrigger>
            <TabsTrigger value="transform">Como Transformar</TabsTrigger>
            <TabsTrigger value="target">Formato Final</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                Sua Planilha Atual (Entendimento)
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p><strong>Estrutura:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tabela consolidada nas células C6-C10</li>
                  <li>Dados individuais nas células: C39, C56, C73, C90, C107, C124, C141, C158, C175, C192</li>
                  <li>Abas por ano: 2022, 2023, 2024, 2025</li>
                  <li>10 imóveis com dados mensais de receitas e despesas</li>
                </ul>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="border rounded p-3">
                <strong>Imóveis Identificados:</strong>
                <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                  <div>• Sevilha 307</div>
                  <div>• Sevilha G07</div>
                  <div>• Málaga M0</div>
                  <div>• MaxHaus 43R</div>
                  <div>• Salas Brasal</div>
                  <div>• Next Haddock Lobo ap 33</div>
                  <div>• Sesimbra ap 505- Portugal</div>
                  <div>• Thera by You</div>
                  <div>• Casa Ibirapuera torre 3 ap 1411</div>
                  <div>• Living Full Faria Lima setor 1 res 1808</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transform" className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium mb-2 text-yellow-900 dark:text-yellow-100">
                Opções de Transformação
              </h4>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-3">
                <div>
                  <strong>Opção 1: Usar sua planilha atual (RECOMENDADO)</strong>
                  <p>O sistema já está configurado para ler sua planilha no formato atual! Apenas certifique-se de que:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>As abas estão nomeadas como: 2022, 2023, 2024, 2025</li>
                    <li>Os dados estão nas células específicas mencionadas</li>
                    <li>Use a importação histórica (primeira opção na página)</li>
                  </ul>
                </div>

                <div>
                  <strong>Opção 2: Criar planilha simplificada</strong>
                  <p>Se preferir, pode criar uma nova planilha com abas:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>Aba "Imoveis":</strong> nome, endereco, tipo, status, valor_aluguel, moeda</li>
                    <li><strong>Aba "Transacoes":</strong> imovel_nome, tipo, categoria, descricao, valor, data, moeda</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">
                Passos para Transformação Manual (se necessário)
              </h4>
              <ol className="text-sm text-green-700 dark:text-green-300 list-decimal list-inside space-y-1">
                <li>Abra uma nova planilha Excel</li>
                <li>Crie aba "Imoveis" com os nomes dos 10 imóveis</li>
                <li>Crie aba "Transacoes" e para cada mês/ano extraia:</li>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Nome do imóvel</li>
                  <li>Tipo: "revenue" ou "expense"</li>
                  <li>Valor numérico</li>
                  <li>Data: AAAA-MM-DD</li>
                  <li>Moeda: BRL ou EUR</li>
                </ul>
                <li>Salve como .xlsx</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="target" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Exemplo do Formato Final:</h4>
              
              <div className="space-y-4">
                <div>
                  <strong className="text-sm">Aba "Imoveis":</strong>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs border border-gray-300">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="border p-1">nome</th>
                          <th className="border p-1">endereco</th>
                          <th className="border p-1">tipo</th>
                          <th className="border p-1">status</th>
                          <th className="border p-1">valor_aluguel</th>
                          <th className="border p-1">moeda</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-1">Sevilha 307</td>
                          <td className="border p-1">Endereço do imóvel</td>
                          <td className="border p-1">apartment</td>
                          <td className="border p-1">active</td>
                          <td className="border p-1">1500</td>
                          <td className="border p-1">BRL</td>
                        </tr>
                        <tr>
                          <td className="border p-1">Sesimbra ap 505- Portugal</td>
                          <td className="border p-1">Endereço em Portugal</td>
                          <td className="border p-1">apartment</td>
                          <td className="border p-1">active</td>
                          <td className="border p-1">800</td>
                          <td className="border p-1">EUR</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <strong className="text-sm">Aba "Transacoes":</strong>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs border border-gray-300">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="border p-1">imovel_nome</th>
                          <th className="border p-1">tipo</th>
                          <th className="border p-1">categoria</th>
                          <th className="border p-1">descricao</th>
                          <th className="border p-1">valor</th>
                          <th className="border p-1">data</th>
                          <th className="border p-1">moeda</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-1">Sevilha 307</td>
                          <td className="border p-1">revenue</td>
                          <td className="border p-1">rent</td>
                          <td className="border p-1">Aluguel Janeiro 2024</td>
                          <td className="border p-1">1500</td>
                          <td className="border p-1">2024-01-15</td>
                          <td className="border p-1">BRL</td>
                        </tr>
                        <tr>
                          <td className="border p-1">Sevilha 307</td>
                          <td className="border p-1">expense</td>
                          <td className="border p-1">maintenance</td>
                          <td className="border p-1">Reparo hidráulico</td>
                          <td className="border p-1">200</td>
                          <td className="border p-1">2024-01-20</td>
                          <td className="border p-1">BRL</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Baixar Template de Exemplo
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}