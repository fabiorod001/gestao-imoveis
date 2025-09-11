/**
 * Server-side Money utilities for database operations
 * Extensions to the shared Money class for backend-specific needs
 */

import { Money, MoneyUtils, MoneyValidator, MoneyValue, toMoney } from '@shared/utils/money';
import { Decimal } from 'decimal.js';

// Re-export all shared Money utilities
export { Money, MoneyUtils, MoneyValidator, MONEY_ZERO, toMoney };
export type { MoneyValue };

/**
 * Server-specific Money utilities for database operations
 */
export class ServerMoneyUtils {
  /**
   * Converte Money para Decimal do Drizzle
   */
  static toDecimal(money: Money): string {
    return money.toDecimalString();
  }

  /**
   * Converte Decimal do banco para Money
   */
  static fromDecimal(value: string | number | null | undefined): Money {
    if (value === null || value === undefined) {
      return Money.zero();
    }
    
    // Se for string, tenta converter direto
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return Money.zero();
      }
      return Money.fromDecimal(numValue);
    }
    
    return Money.fromDecimal(value);
  }

  /**
   * Converte array de valores do banco para Money
   */
  static fromDecimalArray(values: (string | number | null | undefined)[]): Money[] {
    return values.map(v => ServerMoneyUtils.fromDecimal(v));
  }

  /**
   * Converte Money para formato de banco de dados (centavos como BIGINT)
   */
  static toDatabaseCents(money: Money): number {
    return money.toCents();
  }

  /**
   * Converte centavos do banco para Money
   */
  static fromDatabaseCents(cents: number | null | undefined): Money {
    if (cents === null || cents === undefined) {
      return Money.zero();
    }
    return Money.fromCents(cents);
  }

  /**
   * Valida e converte string de entrada do usuário para Money
   * Aceita formatos: "1234.56", "1234,56", "1.234,56", "R$ 1.234,56"
   */
  static parseUserInput(input: string | number | undefined | null): Money {
    if (input === null || input === undefined || input === '') {
      return Money.zero();
    }

    // Se for número, converte direto
    if (typeof input === 'number') {
      return Money.fromDecimal(input);
    }

    // Remove espaços extras
    const trimmed = input.trim();
    
    // Se estiver vazio após trim
    if (trimmed === '') {
      return Money.zero();
    }

    // Tenta converter como BRL primeiro (formato brasileiro)
    try {
      return Money.fromBRL(trimmed);
    } catch {
      // Se falhar, tenta como decimal (formato americano)
      try {
        return Money.fromDecimal(trimmed);
      } catch {
        throw new Error(`Valor monetário inválido: ${input}`);
      }
    }
  }

  /**
   * Valida se um valor está dentro dos limites aceitáveis
   */
  static validateAmount(money: Money, options?: {
    min?: Money;
    max?: Money;
    allowNegative?: boolean;
    allowZero?: boolean;
  }): { valid: boolean; error?: string } {
    const opts = {
      min: Money.fromCents(-999999999999), // -R$ 9.999.999.999,99
      max: Money.fromCents(999999999999),  // R$ 9.999.999.999,99
      allowNegative: false,
      allowZero: false,
      ...options
    };

    if (!opts.allowZero && money.isZero()) {
      return { valid: false, error: 'Valor não pode ser zero' };
    }

    if (!opts.allowNegative && money.isNegative()) {
      return { valid: false, error: 'Valor não pode ser negativo' };
    }

    if (money.isLessThan(opts.min)) {
      return { valid: false, error: `Valor mínimo é ${opts.min.toBRL()}` };
    }

    if (money.isGreaterThan(opts.max)) {
      return { valid: false, error: `Valor máximo é ${opts.max.toBRL()}` };
    }

    return { valid: true };
  }

  /**
   * Calcula distribuição proporcional garantindo soma exata
   * Útil para rateio de despesas entre propriedades
   */
  static distributeProportionally(
    total: Money,
    weights: { id: string | number; weight: number }[]
  ): Map<string | number, Money> {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    if (totalWeight === 0) {
      throw new Error('Soma dos pesos não pode ser zero');
    }

    const distribution = new Map<string | number, Money>();
    let distributed = Money.zero();

    // Distribui para todos exceto o último
    for (let i = 0; i < weights.length - 1; i++) {
      const amount = total.multiply(weights[i].weight / totalWeight);
      distribution.set(weights[i].id, amount);
      distributed = distributed.add(amount);
    }

    // O último recebe o restante para garantir soma exata
    if (weights.length > 0) {
      const lastWeight = weights[weights.length - 1];
      distribution.set(lastWeight.id, total.subtract(distributed));
    }

    return distribution;
  }

  /**
   * Calcula impostos com precisão
   */
  static calculateTax(base: Money, rate: number): {
    base: Money;
    rate: number;
    tax: Money;
    total: Money;
  } {
    const tax = base.multiply(rate / 100);
    return {
      base,
      rate,
      tax,
      total: base.add(tax)
    };
  }

  /**
   * Calcula múltiplos impostos
   */
  static calculateMultipleTaxes(
    base: Money,
    taxes: { name: string; rate: number }[]
  ): {
    base: Money;
    taxes: Array<{ name: string; rate: number; amount: Money }>;
    totalTax: Money;
    totalWithTax: Money;
  } {
    const taxDetails = taxes.map(tax => ({
      name: tax.name,
      rate: tax.rate,
      amount: base.multiply(tax.rate / 100)
    }));

    const totalTax = MoneyUtils.sum(taxDetails.map(t => t.amount));

    return {
      base,
      taxes: taxDetails,
      totalTax,
      totalWithTax: base.add(totalTax)
    };
  }

  /**
   * Formata Money para resposta da API
   */
  static toApiResponse(money: Money): {
    cents: number;
    decimal: number;
    formatted: string;
    formattedShort: string;
  } {
    return {
      cents: money.toCents(),
      decimal: money.toDecimal(),
      formatted: money.toBRL(true),  // Com símbolo R$
      formattedShort: money.toBRL(false) // Sem símbolo
    };
  }

  /**
   * Converte objeto com valores monetários para API
   */
  static convertObjectToApi<T extends Record<string, any>>(
    obj: T,
    moneyFields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of moneyFields) {
      const value = obj[field];
      if (value instanceof Money) {
        (result as any)[field] = ServerMoneyUtils.toApiResponse(value);
      } else if (typeof value === 'number' || typeof value === 'string') {
        (result as any)[field] = ServerMoneyUtils.toApiResponse(
          ServerMoneyUtils.parseUserInput(value)
        );
      }
    }
    
    return result;
  }

  /**
   * Agrupa e soma transações por categoria
   */
  static aggregateTransactions(
    transactions: Array<{ category: string; amount: Money | number | string }>
  ): Map<string, Money> {
    const aggregated = new Map<string, Money>();
    
    for (const transaction of transactions) {
      const amount = transaction.amount instanceof Money 
        ? transaction.amount 
        : ServerMoneyUtils.parseUserInput(transaction.amount);
      
      const current = aggregated.get(transaction.category) || Money.zero();
      aggregated.set(transaction.category, current.add(amount));
    }
    
    return aggregated;
  }

  /**
   * Calcula estatísticas de valores monetários
   */
  static calculateStats(values: Money[]): {
    count: number;
    sum: Money;
    average: Money;
    min: Money | undefined;
    max: Money | undefined;
    median: Money | undefined;
  } {
    if (values.length === 0) {
      return {
        count: 0,
        sum: Money.zero(),
        average: Money.zero(),
        min: undefined,
        max: undefined,
        median: undefined
      };
    }

    const sorted = MoneyUtils.sort(values);
    const median = values.length % 2 === 0
      ? sorted[Math.floor(values.length / 2) - 1]
          .add(sorted[Math.floor(values.length / 2)])
          .divide(2)
      : sorted[Math.floor(values.length / 2)];

    return {
      count: values.length,
      sum: MoneyUtils.sum(values),
      average: MoneyUtils.average(values),
      min: MoneyUtils.min(values),
      max: MoneyUtils.max(values),
      median
    };
  }
}

/**
 * Middleware de validação para valores monetários em requisições
 */
export function validateMoneyFields(fields: string[]) {
  return (req: any, res: any, next: any) => {
    try {
      for (const field of fields) {
        const value = req.body[field];
        if (value !== undefined && value !== null && value !== '') {
          // Converte e valida
          const money = ServerMoneyUtils.parseUserInput(value);
          const validation = ServerMoneyUtils.validateAmount(money);
          
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              message: `Campo ${field}: ${validation.error}`
            });
          }
          
          // Substitui o valor no body pelo Money object
          req.body[field] = money;
        }
      }
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao validar valores monetários'
      });
    }
  };
}