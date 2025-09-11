/**
 * Sistema de Manipulação Monetária para BRL (Real Brasileiro)
 * Garante precisão total em cálculos financeiros
 * 
 * Características:
 * - Armazenamento interno em centavos (inteiros)
 * - Formatação BRL: R$ 1.234,56
 * - Arredondamento brasileiro: >= 0,50 arredonda para cima
 * - Suporte para valores grandes
 */

export class Money {
  private readonly cents: number;

  /**
   * Cria uma instância de Money
   * @param cents - Valor em centavos (inteiro)
   */
  private constructor(cents: number) {
    // Garante que sempre seja um inteiro
    this.cents = Math.round(cents);
  }

  /**
   * Getter para acessar o valor em centavos
   */
  get getCents(): number {
    return this.cents;
  }

  /**
   * Cria Money a partir de centavos
   */
  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  /**
   * Cria Money a partir de valor decimal (reais)
   */
  static fromDecimal(value: number | string): Money {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      throw new Error(`Valor inválido: ${value}`);
    }
    // Multiplica por 100 e arredonda para evitar problemas de ponto flutuante
    return new Money(Math.round(numValue * 100));
  }

  /**
   * Cria Money a partir de string BRL formatada
   * Aceita formatos: "1.234,56", "1234,56", "R$ 1.234,56"
   */
  static fromBRL(value: string): Money {
    // Remove R$, espaços e outros caracteres não numéricos exceto vírgula e ponto
    let cleaned = value.replace(/[R$\s]/g, '');
    
    // Se tem vírgula e ponto, remove os pontos (separadores de milhar)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '');
    }
    
    // Converte vírgula para ponto para parseFloat
    cleaned = cleaned.replace(',', '.');
    
    const numValue = parseFloat(cleaned);
    if (isNaN(numValue)) {
      throw new Error(`Formato BRL inválido: ${value}`);
    }
    
    return Money.fromDecimal(numValue);
  }

  /**
   * Cria Money com valor zero
   */
  static zero(): Money {
    return new Money(0);
  }

  /**
   * Retorna o valor em centavos
   */
  toCents(): number {
    return this.cents;
  }

  /**
   * Retorna o valor em reais (decimal)
   */
  toDecimal(): number {
    return this.cents / 100;
  }

  /**
   * Retorna o valor como string decimal para banco de dados
   */
  toDecimalString(): string {
    return (this.cents / 100).toFixed(2);
  }

  /**
   * Formata para exibição em BRL
   * @param includeSymbol - Se deve incluir o símbolo R$
   */
  toBRL(includeSymbol: boolean = true): string {
    const value = Math.abs(this.cents) / 100;
    
    // Formata com 2 casas decimais
    const formatted = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const sign = this.cents < 0 ? '-' : '';
    const symbol = includeSymbol ? 'R$ ' : '';
    
    return `${sign}${symbol}${formatted}`;
  }

  /**
   * Formata para exibição simples (sem símbolo)
   */
  format(): string {
    return this.toBRL(false);
  }

  /**
   * Adiciona outro valor Money
   */
  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  /**
   * Adiciona um valor decimal
   */
  addDecimal(value: number): Money {
    return this.add(Money.fromDecimal(value));
  }

  /**
   * Subtrai outro valor Money
   */
  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  /**
   * Subtrai um valor decimal
   */
  subtractDecimal(value: number): Money {
    return this.subtract(Money.fromDecimal(value));
  }

  /**
   * Multiplica por um fator
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor));
  }

  /**
   * Divide por um divisor
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Divisão por zero');
    }
    return new Money(Math.round(this.cents / divisor));
  }

  /**
   * Calcula percentual
   * @param percentage - Percentual (ex: 10 para 10%)
   */
  percentage(percentage: number): Money {
    return this.multiply(percentage / 100);
  }

  /**
   * Distribui o valor proporcionalmente
   * @param ratios - Array de proporções
   * @returns Array de Money distribuído, garantindo que a soma seja exata
   */
  distribute(ratios: number[]): Money[] {
    const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (total === 0) {
      throw new Error('Soma das proporções não pode ser zero');
    }

    const results: Money[] = [];
    let distributed = 0;

    // Distribui para todos exceto o último
    for (let i = 0; i < ratios.length - 1; i++) {
      const amount = Math.round(this.cents * ratios[i] / total);
      results.push(new Money(amount));
      distributed += amount;
    }

    // O último recebe o restante para garantir soma exata
    results.push(new Money(this.cents - distributed));

    return results;
  }

  /**
   * Distribui igualmente entre N partes
   * @param parts - Número de partes
   * @returns Array de Money distribuído, garantindo que a soma seja exata
   */
  split(parts: number): Money[] {
    if (parts <= 0) {
      throw new Error('Número de partes deve ser maior que zero');
    }

    const ratios = Array(parts).fill(1);
    return this.distribute(ratios);
  }

  /**
   * Arredonda para o real mais próximo (regra brasileira)
   * >= 0,50 arredonda para cima
   */
  round(): Money {
    const reais = Math.floor(this.cents / 100);
    const centavos = this.cents % 100;
    
    if (centavos >= 50) {
      return new Money((reais + 1) * 100);
    } else {
      return new Money(reais * 100);
    }
  }

  /**
   * Retorna o valor absoluto
   */
  abs(): Money {
    return new Money(Math.abs(this.cents));
  }

  /**
   * Inverte o sinal
   */
  negate(): Money {
    return new Money(-this.cents);
  }

  /**
   * Verifica se é zero
   */
  isZero(): boolean {
    return this.cents === 0;
  }

  /**
   * Verifica se é positivo
   */
  isPositive(): boolean {
    return this.cents > 0;
  }

  /**
   * Verifica se é negativo
   */
  isNegative(): boolean {
    return this.cents < 0;
  }

  /**
   * Verifica se é igual a outro Money
   */
  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /**
   * Verifica se é maior que outro Money
   */
  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  /**
   * Verifica se é maior ou igual a outro Money
   */
  isGreaterThanOrEqual(other: Money): boolean {
    return this.cents >= other.cents;
  }

  /**
   * Verifica se é menor que outro Money
   */
  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  /**
   * Verifica se é menor ou igual a outro Money
   */
  isLessThanOrEqual(other: Money): boolean {
    return this.cents <= other.cents;
  }

  /**
   * Retorna o mínimo entre dois valores
   */
  min(other: Money): Money {
    return this.isLessThan(other) ? this : other;
  }

  /**
   * Retorna o máximo entre dois valores
   */
  max(other: Money): Money {
    return this.isGreaterThan(other) ? this : other;
  }

  /**
   * Clona o objeto Money
   */
  clone(): Money {
    return new Money(this.cents);
  }

  /**
   * Converte para JSON
   */
  toJSON(): { cents: number; formatted: string } {
    return {
      cents: this.cents,
      formatted: this.toBRL()
    };
  }

  /**
   * Cria Money a partir de JSON
   */
  static fromJSON(json: { cents: number } | number): Money {
    if (typeof json === 'number') {
      return new Money(json);
    }
    return new Money(json.cents);
  }
}

/**
 * Funções auxiliares para trabalhar com arrays de Money
 */
export class MoneyUtils {
  /**
   * Soma um array de valores Money
   */
  static sum(values: Money[]): Money {
    return values.reduce((total, value) => total.add(value), Money.zero());
  }

  /**
   * Calcula a média de valores Money
   */
  static average(values: Money[]): Money {
    if (values.length === 0) {
      return Money.zero();
    }
    return MoneyUtils.sum(values).divide(values.length);
  }

  /**
   * Encontra o valor mínimo
   */
  static min(values: Money[]): Money | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((min, value) => min.min(value));
  }

  /**
   * Encontra o valor máximo
   */
  static max(values: Money[]): Money | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((max, value) => max.max(value));
  }

  /**
   * Ordena valores Money (crescente)
   */
  static sort(values: Money[], descending: boolean = false): Money[] {
    const sorted = [...values].sort((a, b) => a.getCents - b.getCents);
    return descending ? sorted.reverse() : sorted;
  }

  /**
   * Agrupa valores por categoria e soma
   */
  static groupAndSum<T>(
    items: T[],
    keyFn: (item: T) => string,
    valueFn: (item: T) => Money
  ): Map<string, Money> {
    const groups = new Map<string, Money>();
    
    for (const item of items) {
      const key = keyFn(item);
      const value = valueFn(item);
      const current = groups.get(key) || Money.zero();
      groups.set(key, current.add(value));
    }
    
    return groups;
  }
}

/**
 * Validador de valores monetários
 */
export class MoneyValidator {
  /**
   * Valida se uma string é um valor BRL válido
   */
  static isValidBRL(value: string): boolean {
    try {
      Money.fromBRL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida se um valor está dentro de um intervalo
   */
  static isInRange(value: Money, min: Money, max: Money): boolean {
    return value.isGreaterThanOrEqual(min) && value.isLessThanOrEqual(max);
  }

  /**
   * Valida se um valor é positivo e não zero
   */
  static isPositiveNonZero(value: Money): boolean {
    return value.isPositive();
  }

  /**
   * Limpa e normaliza uma string de valor monetário
   */
  static normalize(value: string): string {
    try {
      return Money.fromBRL(value).toBRL(false);
    } catch {
      return '';
    }
  }
}

// Exporta uma instância zero para conveniência
export const MONEY_ZERO = Money.zero();

// Exporta tipos úteis
export type MoneyValue = Money | number | string;

/**
 * Converte qualquer valor para Money
 */
export function toMoney(value: MoneyValue): Money {
  if (value instanceof Money) {
    return value;
  }
  if (typeof value === 'number') {
    return Money.fromDecimal(value);
  }
  if (typeof value === 'string') {
    // Tenta primeiro como BRL, depois como decimal
    try {
      return Money.fromBRL(value);
    } catch {
      return Money.fromDecimal(value);
    }
  }
  throw new Error(`Não foi possível converter ${value} para Money`);
}