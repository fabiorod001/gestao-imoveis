/**
 * Client-side Money utilities for React components
 * Formatação, máscaras e validação para interface do usuário
 */

import { Money, MoneyUtils, MoneyValidator, MoneyValue, toMoney, MONEY_ZERO } from '@shared/utils/money';

// Re-export all shared Money utilities
export { Money, MoneyUtils, MoneyValidator, MONEY_ZERO, toMoney };
export type { MoneyValue };

/**
 * Hook para usar Money em componentes React
 */
export function useMoney(initialValue: MoneyValue = 0) {
  const [value, setValue] = useState(() => toMoney(initialValue));

  const updateValue = useCallback((newValue: MoneyValue) => {
    setValue(toMoney(newValue));
  }, []);

  return [value, updateValue] as const;
}

/**
 * Formatador de valores monetários para exibição
 */
export class MoneyFormatter {
  /**
   * Formata para exibição completa com símbolo
   */
  static format(value: MoneyValue): string {
    return toMoney(value).toBRL(true);
  }

  /**
   * Formata sem símbolo
   */
  static formatShort(value: MoneyValue): string {
    return toMoney(value).toBRL(false);
  }

  /**
   * Formata para input (sempre sem símbolo)
   */
  static formatForInput(value: MoneyValue): string {
    const money = toMoney(value);
    if (money.isZero()) return '';
    return money.toBRL(false);
  }

  /**
   * Formata com cor baseado no valor (positivo/negativo)
   */
  static formatColored(value: MoneyValue): {
    text: string;
    className: string;
    color: string;
  } {
    const money = toMoney(value);
    const text = money.toBRL(true);
    
    if (money.isNegative()) {
      return {
        text,
        className: 'text-red-600',
        color: 'red'
      };
    } else if (money.isPositive()) {
      return {
        text,
        className: 'text-green-600',
        color: 'green'
      };
    } else {
      return {
        text,
        className: 'text-gray-600',
        color: 'gray'
      };
    }
  }

  /**
   * Formata de forma compacta para valores grandes
   * Ex: R$ 1.234.567,89 -> R$ 1,23M
   */
  static formatCompact(value: MoneyValue): string {
    const money = toMoney(value);
    const absValue = money.abs().toDecimal();
    
    let suffix = '';
    let divisor = 1;
    
    if (absValue >= 1000000000) {
      suffix = 'B';
      divisor = 1000000000;
    } else if (absValue >= 1000000) {
      suffix = 'M';
      divisor = 1000000;
    } else if (absValue >= 1000) {
      suffix = 'K';
      divisor = 1000;
    }
    
    if (divisor > 1) {
      const compactValue = absValue / divisor;
      const formatted = compactValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
      const sign = money.isNegative() ? '-' : '';
      return `${sign}R$ ${formatted}${suffix}`;
    }
    
    return money.toBRL(true);
  }
}

/**
 * Parser de input do usuário
 */
export class MoneyInputParser {
  /**
   * Aplica máscara BRL ao digitar
   * @param input - Valor do input
   * @param previousValue - Valor anterior (para detectar backspace)
   */
  static applyMask(input: string, previousValue?: string): string {
    // Remove tudo exceto números
    let numbers = input.replace(/\D/g, '');
    
    // Se não tem números, retorna vazio
    if (!numbers) return '';
    
    // Converte para número e divide por 100 (centavos)
    const value = parseInt(numbers, 10) / 100;
    
    // Formata como BRL sem símbolo
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Remove máscara e retorna valor numérico
   */
  static unmask(input: string): number {
    if (!input) return 0;
    
    // Remove pontos e substitui vírgula por ponto
    const cleaned = input.replace(/\./g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    
    return isNaN(value) ? 0 : value;
  }

  /**
   * Valida input do usuário
   */
  static validate(input: string): {
    valid: boolean;
    error?: string;
    money?: Money;
  } {
    if (!input || input.trim() === '') {
      return { valid: true, money: Money.zero() };
    }

    try {
      const money = Money.fromBRL(input);
      
      // Valida limites
      const maxValue = Money.fromDecimal(999999999.99); // R$ 999.999.999,99
      if (money.isGreaterThan(maxValue)) {
        return {
          valid: false,
          error: 'Valor máximo excedido'
        };
      }
      
      if (money.isNegative()) {
        return {
          valid: false,
          error: 'Valor não pode ser negativo'
        };
      }
      
      return { valid: true, money };
    } catch {
      return {
        valid: false,
        error: 'Formato inválido. Use: 1.234,56'
      };
    }
  }

  /**
   * Formata enquanto o usuário digita (on change)
   */
  static formatOnChange(event: React.ChangeEvent<HTMLInputElement>): {
    formatted: string;
    raw: number;
    money: Money;
  } {
    const input = event.target.value;
    const formatted = MoneyInputParser.applyMask(input);
    const raw = MoneyInputParser.unmask(formatted);
    const money = Money.fromDecimal(raw);
    
    return { formatted, raw, money };
  }
}

// MoneyDisplay component moved to MoneyDisplay.tsx for JSX support

/**
 * Utilitários para cálculos comuns em interfaces
 */
export class UIMoneyCalculations {
  /**
   * Calcula totais de uma lista
   */
  static calculateTotals<T>(
    items: T[],
    getValue: (item: T) => MoneyValue
  ): {
    count: number;
    total: Money;
    average: Money;
    formatted: string;
  } {
    const values = items.map(item => toMoney(getValue(item)));
    const total = MoneyUtils.sum(values);
    const average = values.length > 0 ? total.divide(values.length) : Money.zero();
    
    return {
      count: items.length,
      total,
      average,
      formatted: total.toBRL(true)
    };
  }

  /**
   * Calcula percentual de um valor em relação ao total
   */
  static calculatePercentage(value: MoneyValue, total: MoneyValue): {
    percentage: number;
    formatted: string;
    display: string;
  } {
    const valueMoney = toMoney(value);
    const totalMoney = toMoney(total);
    
    if (totalMoney.isZero()) {
      return {
        percentage: 0,
        formatted: '0%',
        display: '0%'
      };
    }
    
    const percentage = (valueMoney.toDecimal() / totalMoney.toDecimal()) * 100;
    
    return {
      percentage,
      formatted: `${percentage.toFixed(2)}%`,
      display: `${Math.round(percentage)}%`
    };
  }

  /**
   * Calcula distribuição proporcional para UI
   */
  static distributeAmount(
    total: MoneyValue,
    recipients: Array<{ id: string; name: string; weight?: number }>
  ): Array<{
    id: string;
    name: string;
    amount: Money;
    percentage: number;
    formatted: string;
  }> {
    const totalMoney = toMoney(total);
    const weights = recipients.map(r => r.weight || 1);
    const distributions = totalMoney.distribute(weights);
    
    return recipients.map((recipient, index) => {
      const amount = distributions[index];
      const percentage = (amount.toDecimal() / totalMoney.toDecimal()) * 100;
      
      return {
        id: recipient.id,
        name: recipient.name,
        amount,
        percentage,
        formatted: amount.toBRL(true)
      };
    });
  }
}

/**
 * Validadores para formulários
 */
export const MoneyValidators = {
  required: (value: string) => {
    const validation = MoneyInputParser.validate(value);
    if (!validation.valid) return validation.error;
    if (validation.money?.isZero()) return 'Valor é obrigatório';
    return undefined;
  },
  
  min: (minValue: MoneyValue) => (value: string) => {
    const validation = MoneyInputParser.validate(value);
    if (!validation.valid) return validation.error;
    
    const min = toMoney(minValue);
    if (validation.money && validation.money.isLessThan(min)) {
      return `Valor mínimo é ${min.toBRL()}`;
    }
    return undefined;
  },
  
  max: (maxValue: MoneyValue) => (value: string) => {
    const validation = MoneyInputParser.validate(value);
    if (!validation.valid) return validation.error;
    
    const max = toMoney(maxValue);
    if (validation.money && validation.money.isGreaterThan(max)) {
      return `Valor máximo é ${max.toBRL()}`;
    }
    return undefined;
  },
  
  positive: (value: string) => {
    const validation = MoneyInputParser.validate(value);
    if (!validation.valid) return validation.error;
    
    if (validation.money && !validation.money.isPositive() && !validation.money.isZero()) {
      return 'Valor deve ser positivo';
    }
    return undefined;
  }
};

// Importações necessárias (adicionar no topo do arquivo real)
import { useState, useCallback } from 'react';

/**
 * Hook para input monetário com máscara
 */
export function useMoneyInput(initialValue: MoneyValue = 0) {
  const [displayValue, setDisplayValue] = useState(() => {
    const money = toMoney(initialValue);
    return money.isZero() ? '' : money.toBRL(false);
  });
  
  const [money, setMoney] = useState(() => toMoney(initialValue));
  const [error, setError] = useState<string | undefined>();

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const result = MoneyInputParser.formatOnChange(event);
    setDisplayValue(result.formatted);
    setMoney(result.money);
    
    // Valida
    const validation = MoneyInputParser.validate(result.formatted);
    setError(validation.error);
  }, []);

  const handleBlur = useCallback(() => {
    // Formata ao sair do campo
    if (displayValue && !error) {
      setDisplayValue(money.toBRL(false));
    }
  }, [displayValue, money, error]);

  const setValue = useCallback((value: MoneyValue) => {
    const newMoney = toMoney(value);
    setMoney(newMoney);
    setDisplayValue(newMoney.isZero() ? '' : newMoney.toBRL(false));
    setError(undefined);
  }, []);

  return {
    displayValue,
    money,
    error,
    handleChange,
    handleBlur,
    setValue,
    isValid: !error,
    rawValue: money.toDecimal()
  };
}