import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";

const currencies = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

export default function Conversion() {
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('BRL');
  const [toCurrency, setToCurrency] = useState('USD');

  const { data: exchangeRate, isLoading, refetch } = useQuery({
    queryKey: [`/api/exchange-rates/${fromCurrency}/${toCurrency}`],
    enabled: fromCurrency !== toCurrency,
  });

  const convertedAmount = exchangeRate && amount 
    ? (parseFloat(amount) * parseFloat(exchangeRate.rate)).toFixed(2)
    : '0.00';

  const fromCurrencyInfo = currencies.find(c => c.code === fromCurrency);
  const toCurrencyInfo = currencies.find(c => c.code === toCurrency);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversão de Moedas</h1>
        <p className="text-gray-500">Conversão automática com cotações do Banco Central</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversor de Moedas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Valor</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Digite o valor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">De</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Para</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={handleSwapCurrencies}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {fromCurrency !== toCurrency && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taxa de câmbio:</span>
                  <div className="flex items-center space-x-2">
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    ) : (
                      <>
                        <span className="font-medium">
                          1 {fromCurrency} = {exchangeRate?.rate || '0.0000'} {toCurrency}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => refetch()}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg text-gray-600">
                    {fromCurrencyInfo?.symbol} {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-2xl font-bold text-primary-600 mt-2">
                    {toCurrencyInfo?.symbol} {parseFloat(convertedAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {exchangeRate && (
                  <div className="text-xs text-gray-500 text-center">
                    Cotação de {new Date(exchangeRate.date).toLocaleDateString('pt-BR')} • Fonte: {exchangeRate.source}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Informações da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <strong>Fonte:</strong> Banco Central do Brasil
              </div>
              <div className="text-sm text-gray-600">
                <strong>Atualização:</strong> Automática diariamente
              </div>
              <div className="text-sm text-gray-600">
                <strong>Precisão:</strong> Cotações oficiais em tempo real
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Como funciona?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Cotações atualizadas automaticamente</li>
                  <li>• Dados do Banco Central do Brasil</li>
                  <li>• Cache inteligente para performance</li>
                  <li>• Conversão precisa para múltiplas moedas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
