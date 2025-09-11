import { Money, MoneyFormatter, toMoney, type MoneyValue } from "@/lib/money";

/**
 * Componente auxiliar para exibir valores monetários
 */
interface MoneyDisplayProps {
  value: MoneyValue;
  showSymbol?: boolean;
  colored?: boolean;
  compact?: boolean;
  className?: string;
}

export function MoneyDisplay({ 
  value, 
  showSymbol = true, 
  colored = false,
  compact = false,
  className = ''
}: MoneyDisplayProps) {
  const money = toMoney(value);
  
  if (colored) {
    const formatted = MoneyFormatter.formatColored(value);
    return (
      <span className={`${formatted.className} ${className}`}>
        {formatted.text}
      </span>
    );
  }
  
  if (compact) {
    return (
      <span className={className}>
        {MoneyFormatter.formatCompact(value)}
      </span>
    );
  }
  
  return (
    <span className={className}>
      {showSymbol ? money.toBRL(true) : money.toBRL(false)}
    </span>
  );
}