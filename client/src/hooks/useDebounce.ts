import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores, otimizado para performance mobile
 * Evita chamadas excessivas durante digitação
 * @param value - Valor a ser debounced
 * @param delay - Delay em milliseconds (padrão 300ms para mobile)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Atualiza o valor após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timeout se o valor mudar antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debounce de callbacks, otimizado para mobile
 * @param callback - Função a ser debounced
 * @param delay - Delay em milliseconds (padrão 300ms)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpa timeout ao desmontar
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}

/**
 * Hook para debounce de pesquisa, com indicador de loading
 */
export function useSearchDebounce(
  initialValue: string = '',
  delay: number = 300
): {
  value: string;
  debouncedValue: string;
  setValue: (value: string) => void;
  isDebouncing: boolean;
} {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);
  const isDebouncing = value !== debouncedValue;

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing,
  };
}