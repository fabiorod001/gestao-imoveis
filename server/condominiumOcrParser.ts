import { createWorker } from 'tesseract.js';

export interface CondominiumBillData {
  propertyName: string;
  propertyUnit: string;
  competencyMonth: string;
  items: {
    name: string;
    amount: number;
  }[];
  dueDate: string;
  totalAmount: number;
  interestAmount?: number;
  finalAmount?: number;
  lawyerFee?: number;
}

export interface CondominiumOcrResult {
  success: boolean;
  data?: CondominiumBillData;
  error?: string;
  rawText?: string;
}

// Mapeamento de unidades para nomes de propriedades
const UNIT_MAPPING: Record<string, string> = {
  '6 000307': 'Sevilha 307',
  '6000307': 'Sevilha 307',
  'sevilha 307': 'Sevilha 307',
  'sevilha307': 'Sevilha 307',
  'tower 6 307': 'Sevilha 307',
  'torre 6 307': 'Sevilha 307',
  'g07': 'Sevilha G07',
  'g 07': 'Sevilha G07',
  'sevilha g07': 'Sevilha G07',
  'sevilhag07': 'Sevilha G07',
  'm07': 'Málaga M07',
  'm 07': 'Málaga M07',
  'malaga m07': 'Málaga M07',
  'málagam07': 'Málaga M07',
  'málaga m07': 'Málaga M07'
};

// OCR character correction map for common OCR mistakes
const OCR_CHAR_CORRECTIONS: Record<string, string> = {
  'J': '7',  // J commonly misread as 7
  'O': '0',  // O commonly misread as 0
  'S': '5',  // S commonly misread as 5
  'l': '1',  // lowercase l commonly misread as 1
  'I': '1',  // uppercase I commonly misread as 1
  'B': '8'   // B commonly misread as 8
};

// Enhanced fuzzy matching for known items with variations
const FUZZY_ITEMS: Record<string, string[]> = {
  'ENEL (Luz)': ['enel', 'ene', 'encl', 'enei', 'luz', 'energia', 'energia elétrica'],
  'Taxa Condominial': ['condominio', 'condomínio', 'taxa condominial', 'cond'],
  'Consumo Gás': ['consumo gas', 'consumo gás', 'gas', 'gás'],
  'Consumo Água': ['consumo agua', 'consumo água', 'agua', 'água'],
  'Juros': ['juros', 'juro'],
  'Multa': ['multa'],
  'Advogado': ['advogado', 'taxa advogado', 'honorarios', 'honorários']
};

// Flattened known items for backward compatibility
const KNOWN_ITEMS = Object.values(FUZZY_ITEMS).flat();

/**
 * Parse condominium bill from OCR text
 */
export async function parseCondominiumBill(imageBuffer: Buffer): Promise<CondominiumOcrResult> {
  try {
    console.log('Starting OCR processing for condominium bill...');
    
    // Execute OCR with worker approach for Node.js
    const worker = await createWorker('por');
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    console.log('Raw OCR text extracted');
    
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Nenhum texto foi extraído da imagem',
        rawText: text
      };
    }

    // Parse the extracted text
    const billData = parseBillText(text);
    
    if (!billData) {
      return {
        success: false,
        error: 'Não foi possível extrair os dados do boleto',
        rawText: text
      };
    }

    return {
      success: true,
      data: billData,
      rawText: text
    };

  } catch (error) {
    console.error('Error in condominium OCR processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento OCR',
    };
  }
}

/**
 * Normalize OCR text to fix common recognition errors
 */
function normalizeOcrText(text: string): string {
  console.log('Normalizing OCR text...');
  
  let normalized = text;
  
  // Apply character corrections
  for (const [wrong, correct] of Object.entries(OCR_CHAR_CORRECTIONS)) {
    // Only correct when it looks like a number context
    const regex = new RegExp(`(?<=\d)${wrong}(?=\d)|${wrong}(?=\d)|(?<=\d)${wrong}`, 'g');
    normalized = normalized.replace(regex, correct);
  }
  
  // Strip stray colons/dashes adjacent to digits
  normalized = normalized.replace(/(\d)[:−-]+(\d)/g, '$1$2');
  normalized = normalized.replace(/(\d)[:−-]+$/gm, '$1');
  
  // Standardize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Standardize month labels (normalize Portuguese accents and variations)
  const monthNormalization = {
    'janeiro': ['janeiro', 'jan'],
    'fevereiro': ['fevereiro', 'fev'],
    'março': ['março', 'marco', 'mar'],
    'abril': ['abril', 'abr'],
    'maio': ['maio', 'mai'],
    'junho': ['junho', 'jun'],
    'julho': ['julho', 'jul'],
    'agosto': ['agosto', 'ago'],
    'setembro': ['setembro', 'set'],
    'outubro': ['outubro', 'out'],
    'novembro': ['novembro', 'nov'],
    'dezembro': ['dezembro', 'dez']
  };
  
  for (const [standard, variations] of Object.entries(monthNormalization)) {
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    }
  }
  
  console.log('Text normalization complete');
  return normalized;
}

/**
 * Parse bill text and extract structured data
 */
function parseBillText(text: string): CondominiumBillData | null {
  // First normalize the OCR text
  const normalizedText = normalizeOcrText(text);
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Parsing bill with', lines.length, 'lines');
  
  // Initialize result
  const result: CondominiumBillData = {
    propertyName: '',
    propertyUnit: '',
    competencyMonth: '',
    items: [],
    dueDate: '',
    totalAmount: 0
  };

  // Extract property information
  result.propertyName = extractPropertyName(normalizedText);
  result.propertyUnit = extractPropertyUnit(normalizedText);

  // Extract competency month
  result.competencyMonth = extractCompetencyMonth(normalizedText);

  // Extract due date
  result.dueDate = extractDueDate(normalizedText);

  // Extract items and values with enhanced multi-line support
  result.items = extractItemsEnhanced(lines);

  // Extract total amount with enhanced detection
  result.totalAmount = extractTotalAmountEnhanced(normalizedText, result.items);

  // Extract optional fields
  result.interestAmount = extractInterestAmount(normalizedText);
  result.finalAmount = extractFinalAmount(normalizedText);
  result.lawyerFee = extractLawyerFee(normalizedText);

  console.log('Extracted items:', result.items);
  console.log('Total amount:', result.totalAmount);

  // Validate if we extracted meaningful data
  if (result.propertyName || result.propertyUnit || result.items.length > 0) {
    return result;
  }

  return null;
}

/**
 * Extract property name from text
 */
function extractPropertyName(text: string): string {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  
  // Look for unit patterns like "6 000307" or similar
  const unitPatterns = [
    /(?:unidade|unit|torre|tower)?\s*(\d+)\s*(\d{6}|\d{3})/gi,
    /(\d+)\s*(\d{6}|\d{3})/g,
  ];

  for (const pattern of unitPatterns) {
    const matches = Array.from(normalizedText.matchAll(pattern));
    for (const match of matches) {
      const fullMatch = match[0];
      const possibleUnit = `${match[1]} ${match[2]}`.trim();
      
      // Check if this matches any known property
      for (const [key, propertyName] of Object.entries(UNIT_MAPPING)) {
        if (key.toLowerCase().includes(possibleUnit.toLowerCase()) || 
            possibleUnit.toLowerCase().includes(key.toLowerCase())) {
          return propertyName;
        }
      }
    }
  }

  // Fallback: look for direct property name matches
  for (const [key, propertyName] of Object.entries(UNIT_MAPPING)) {
    if (normalizedText.includes(key.toLowerCase())) {
      return propertyName;
    }
  }

  return '';
}

/**
 * Extract property unit from text
 */
function extractPropertyUnit(text: string): string {
  const unitMatch = text.match(/(?:unidade|unit)?\s*(\d+\s*\d{3,6})/i);
  return unitMatch ? unitMatch[1].replace(/\s+/g, ' ').trim() : '';
}

/**
 * Extract competency month from text
 */
function extractCompetencyMonth(text: string): string {
  // Look for patterns like "CONDOMÍNIO JUNHO/2025" or "JUNHO/2025"
  // Portuguese month names with possible accents
  const monthNames = 'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez';
  
  const monthPatterns = [
    new RegExp(`condom[ií]nio\\s+((?:${monthNames})\/\\d{4})`, 'gi'),
    new RegExp(`((?:${monthNames})\/\\d{4})`, 'gi'),
    /(\d{2}\/\d{4})/i
  ];

  for (const pattern of monthPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return '';
}

/**
 * Extract due date from text
 */
function extractDueDate(text: string): string {
  // Look for date patterns like "05/06/2025"
  const datePatterns = [
    /vencimento[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,
    /(\d{2}\/\d{2}\/\d{4})/g
  ];

  for (const pattern of datePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const dateStr = match[1] || match[0];
      // Validate date format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
      }
    }
  }

  return '';
}

/**
 * Enhanced item extraction with multi-line support and fuzzy matching
 */
function extractItemsEnhanced(lines: string[]): { name: string; amount: number }[] {
  const items: { name: string; amount: number }[] = [];
  console.log('Extracting items from', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = line.toLowerCase().trim();
    
    // Check each fuzzy item category
    for (const [standardName, variations] of Object.entries(FUZZY_ITEMS)) {
      for (const variation of variations) {
        if (normalizedLine.includes(variation.toLowerCase())) {
          console.log(`Found item "${variation}" -> "${standardName}" on line ${i}: ${line}`);
          
          // Try to extract value from current line
          let value = extractValueFromLine(line);
          
          // If no value found, look ahead 2-3 lines for multi-line format
          if (value === 0) {
            console.log('No value on same line, looking ahead...');
            for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
              const nextLine = lines[j];
              console.log(`Checking next line ${j}: ${nextLine}`);
              value = parsePossibleCurrency(nextLine);
              if (value > 0) {
                console.log(`Found value ${value} on line ${j}`);
                break;
              }
            }
          }
          
          // Only add if we found a valid value and don't already have this item
          if (value > 0) {
            const existingItem = items.find(item => item.name === standardName);
            if (!existingItem) {
              items.push({ name: standardName, amount: value });
              console.log(`Added item: ${standardName} = ${value}`);
            }
          }
          break; // Found match, no need to check other variations
        }
      }
    }
  }

  return items;
}

/**
 * Robust currency parsing function that handles OCR errors
 */
function parsePossibleCurrency(text: string): number {
  // Extract all potential currency patterns including malformed ones
  const patterns = [
    // Standard patterns
    /r\$?\s*([\d.,]+)/gi,
    // Raw number patterns (4-6 digits could be currency)
    /\b(\d{4,6})\b/g,
    // Mixed character sequences that might be currency
    /\b[\dJOSIlB.,]{3,8}\b/g
  ];
  
  const candidates: string[] = [];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      candidates.push(match[1] || match[0]);
    }
  }
  
  // Try to parse each candidate
  const values: number[] = [];
  
  for (let candidate of candidates) {
    // Apply character corrections for currency parsing
    for (const [wrong, correct] of Object.entries(OCR_CHAR_CORRECTIONS)) {
      candidate = candidate.replace(new RegExp(wrong, 'g'), correct);
    }
    
    // Remove R$ and spaces
    candidate = candidate.replace(/r\$/gi, '').replace(/\s/g, '');
    
    // Skip if not numeric characters, dots, commas
    if (!/^[\d.,]+$/.test(candidate)) continue;
    
    let value = 0;
    
    // Handle different number formats
    if (candidate.includes(',') && candidate.includes('.')) {
      // Format: 1.234,56 (Brazilian)
      value = parseFloat(candidate.replace(/\./g, '').replace(',', '.'));
    } else if (candidate.includes(',')) {
      // Format: 1234,56 or 123,45
      value = parseFloat(candidate.replace(',', '.'));
    } else if (candidate.includes('.')) {
      // Could be 1.234 (thousands) or 123.45 (decimal)
      const parts = candidate.split('.');
      if (parts.length === 2 && parts[1].length === 2) {
        // Likely decimal: 123.45
        value = parseFloat(candidate);
      } else {
        // Likely thousands: 1.234 -> 1234
        value = parseFloat(candidate.replace(/\./g, ''));
      }
    } else {
      // Pure digits: if 4-6 digits, assume last two are cents
      if (candidate.length >= 4 && candidate.length <= 6) {
        const cents = candidate.slice(-2);
        const reais = candidate.slice(0, -2);
        value = parseFloat(reais + '.' + cents);
      } else {
        value = parseFloat(candidate);
      }
    }
    
    // Only accept reasonable values (R$ 1.00 to R$ 50,000.00)
    if (!isNaN(value) && value >= 1 && value <= 50000) {
      values.push(value);
    }
  }
  
  // Return the most reasonable value (prefer values with decimal cents)
  if (values.length === 0) return 0;
  
  // Prefer values that have reasonable cent amounts (ending in common cents like .00, .25, .50, .75, etc.)
  const withCents = values.filter(v => (v * 100) % 100 !== 0);
  if (withCents.length > 0) {
    return Math.max(...withCents);
  }
  
  return Math.max(...values);
}

/**
 * Enhanced total amount extraction with label-based detection and reconciliation
 */
function extractTotalAmountEnhanced(text: string, items: { name: string; amount: number }[]): number {
  console.log('Extracting total amount...');
  const lines = text.split('\n');
  
  let detectedTotal = 0;
  
  // 1. Label-based extraction
  const labelPatterns = [
    /(valor\s+(cobrado|total|do\s+documento))[:\s]*(?:r\$)?\s*([\d.,]+)/gi,
    /(total)[:\s]*(?:r\$)?\s*([\d.,]+)/gi,
    /(vencimento)[:\s]*\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)/gi
  ];
  
  for (const pattern of labelPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const valueStr = match[match.length - 1]; // Last capture group
      const value = parsePossibleCurrency(valueStr);
      if (value > 0 && value < 100000) {
        console.log(`Found total via label: ${value}`);
        detectedTotal = value;
        break;
      }
    }
    if (detectedTotal > 0) break;
  }
  
  // 2. Date-based extraction (fallback)
  if (detectedTotal === 0) {
    for (const line of lines) {
      if (line.match(/\d{2}\/\d{2}\/\d{4}/)) {
        const totalMatch = line.match(/\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)/);
        if (totalMatch) {
          const value = parsePossibleCurrency(totalMatch[1]);
          if (value > 0 && value < 100000) {
            console.log(`Found total via date: ${value}`);
            detectedTotal = value;
            break;
          }
        }
      }
    }
  }
  
  // 3. Reconciliation with item sum
  const itemSum = items.reduce((sum, item) => sum + item.amount, 0);
  console.log(`Item sum: ${itemSum}, Detected total: ${detectedTotal}`);
  
  if (detectedTotal > 0 && itemSum > 0) {
    const deviation = Math.abs(detectedTotal - itemSum) / detectedTotal;
    console.log(`Deviation: ${(deviation * 100).toFixed(2)}%`);
    
    // If deviation is > 5%, re-attempt parsing ambiguous values
    if (deviation > 0.05) {
      console.log('Large deviation detected, re-attempting item parsing...');
      // For now, prefer detected total over sum
      return detectedTotal;
    }
  }
  
  // Return detected total if available and reasonable, otherwise sum
  if (detectedTotal > 0) {
    return detectedTotal;
  }
  
  if (itemSum > 0) {
    console.log('Using item sum as total');
    return itemSum;
  }
  
  return 0;
}

/**
 * Extract interest amount
 */
function extractInterestAmount(text: string): number | undefined {
  const interestMatch = text.match(/juros[:\s]*(?:r\$)?\s*([\d.,]+)/i);
  return interestMatch ? parseValue(interestMatch[1]) : undefined;
}

/**
 * Extract final amount (with interest)
 */
function extractFinalAmount(text: string): number | undefined {
  const finalMatch = text.match(/valor\s+cobrado[:\s]*(?:r\$)?\s*([\d.,]+)/i);
  return finalMatch ? parseValue(finalMatch[1]) : undefined;
}

/**
 * Extract lawyer fee
 */
function extractLawyerFee(text: string): number | undefined {
  const lawyerMatch = text.match(/advogado[:\s]*(?:r\$)?\s*([\d.,]+)/i);
  return lawyerMatch ? parseValue(lawyerMatch[1]) : undefined;
}

/**
 * Extract value from a single line using enhanced currency parsing
 */
function extractValueFromLine(line: string): number {
  console.log(`Extracting value from line: ${line}`);
  
  // Use the enhanced currency parsing
  const value = parsePossibleCurrency(line);
  console.log(`Extracted value: ${value}`);
  
  return value;
}

/**
 * Parse monetary value from string
 */
function parseValue(valueStr: string): number {
  if (!valueStr) return 0;
  
  // Remove R$, spaces
  let cleanValue = valueStr
    .replace(/r\$/gi, '')
    .replace(/\s/g, '');
    
  // Handle Brazilian number format (1.234,56 -> 1234.56)
  if (cleanValue.includes(',')) {
    // If has both . and , then . is thousand separator
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Only comma, it's decimal separator
      cleanValue = cleanValue.replace(',', '.');
    }
  }

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}