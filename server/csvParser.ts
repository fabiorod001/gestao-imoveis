// Robust CSV parser for Airbnb files with automatic format detection
import { parse } from 'csv-parse/sync';

export interface AirbnbRow {
  date: string;
  type: string;
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guest: string;
  listing: string;
  amount: number;
  paidAmount?: number;
  currency: string;
  isPayout?: boolean;
  isReservation?: boolean;
  isFutureReservation?: boolean;
}

export interface ParseResult {
  success: boolean;
  rows: AirbnbRow[];
  format: 'pending' | 'historical';
  dateRange: { start: Date | null; end: Date | null };
  error?: string;
  headers?: string[];
}

// Map column names to our internal names
const COLUMN_MAPPINGS = {
  'Data': 'date',
  'Tipo': 'type',
  'Código de Confirmação': 'confirmationCode',
  'Data de início': 'checkIn',
  'Data de término': 'checkOut',
  'Noites': 'nights',
  'Hóspede': 'guest',
  'Anúncio': 'listing',
  'Valor': 'amount',
  'Pago': 'paidAmount',
  'Moeda': 'currency',
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Try MM/DD/YYYY format (Airbnb standard)
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [_, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

function parseAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') return 0;
  
  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[R$\s]/g, '');
  
  // Handle Brazilian format (1.234,56) vs US format (1,234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If comma comes after dot, it's Brazilian format
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Brazilian format: remove dots and replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: just remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only commas, assume decimal separator
    cleaned = cleaned.replace(',', '.');
  }
  
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

export function parseAirbnbCSV(content: string): ParseResult {
  try {
    // Remove BOM if present
    const cleanContent = content.replace(/^\ufeff/, '');
    
    // Parse CSV
    const records = parse(cleanContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    
    if (!records || records.length === 0) {
      return {
        success: false,
        rows: [],
        format: 'pending',
        dateRange: { start: null, end: null },
        error: 'Arquivo CSV vazio ou inválido',
      };
    }
    
    // Get headers from first record
    const headers = Object.keys(records[0] as Record<string, string>);
    
    // Detect format based on columns
    const hasPaidColumn = headers.some(h => h === 'Pago');
    const format: 'pending' | 'historical' = hasPaidColumn ? 'historical' : 'pending';
    
    console.log(`Detected format: ${format}, Headers: ${headers.length}`, headers);
    
    // Process rows
    const rows: AirbnbRow[] = [];
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    
    for (const record of records) {
      const type = record['Tipo'] || '';
      
      // Skip non-reservation, non-payout, and non-adjustment rows
      if (type !== 'Reserva' && type !== 'Payout' && type !== 'Ajuste' && type !== 'Ajuste de Resolução') {
        continue;
      }
      
      // Parse dates
      const checkInDate = parseDate(record['Data de início'] || '');
      const checkOutDate = parseDate(record['Data de término'] || '');
      const mainDate = parseDate(record['Data'] || '');
      
      // Update date range
      if (checkInDate) {
        if (!minDate || checkInDate < minDate) minDate = checkInDate;
        if (!maxDate || checkInDate > maxDate) maxDate = checkInDate;
      }
      
      // Determine if it's a future reservation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFutureReservation = checkInDate && checkInDate > today;
      
      // Normalize type for consistent processing
      let normalizedType = 'unknown';
      if (type === 'Payout') normalizedType = 'payout';
      else if (type === 'Reserva') normalizedType = 'reservation';
      else if (type === 'Ajuste' || type === 'Ajuste de Resolução') normalizedType = 'adjustment';
      
      const row: AirbnbRow = {
        date: record['Data'] || '',
        type: normalizedType,
        confirmationCode: record['Código de Confirmação'] || '',
        checkIn: record['Data de início'] || '',
        checkOut: record['Data de término'] || '',
        nights: parseInt(record['Noites'] || '0'),
        guest: record['Hóspede'] || '',
        listing: record['Anúncio'] || '',
        amount: parseAmount(record['Valor'] || '0'),
        currency: record['Moeda'] || 'BRL',
        isPayout: type === 'Payout',
        isReservation: type === 'Reserva' || type === 'Ajuste' || type === 'Ajuste de Resolução',
        isFutureReservation: isFutureReservation,
      };
      
      // For historical format, include paid amount
      if (format === 'historical' && record['Pago']) {
        row.paidAmount = parseAmount(record['Pago']);
      }
      
      rows.push(row);
    }
    
    return {
      success: true,
      rows: rows,
      format: format,
      dateRange: { start: minDate, end: maxDate },
      headers: headers,
    };
    
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return {
      success: false,
      rows: [],
      format: 'pending',
      dateRange: { start: null, end: null },
      error: `Erro ao processar CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Property name mappings
export const PROPERTY_MAPPINGS: Record<string, string> = {
  '1 Suíte + Quintal privativo': 'Sevilha G07',
  '1 Suíte Wonderful Einstein Morumbi': 'Sevilha 307',
  '2 Quartos + Quintal Privativo': 'Málaga M07',
  '2 quartos, maravilhoso, na Avenida Berrini': 'MaxHaus Berrini',
  'Studio Premium - Haddock Lobo': 'Haddock',
  'Studio Premium - Haddock Lobo.': 'Haddock',
  'Studio Premium - Thera by Yoo': 'THERA',
};

export function mapListingToProperty(listing: string): string | null {
  return PROPERTY_MAPPINGS[listing] || null;
}