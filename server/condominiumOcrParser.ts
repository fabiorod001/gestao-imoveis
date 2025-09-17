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

// Itens conhecidos de condomínio
const KNOWN_ITEMS = [
  'condominio',
  'taxa condominial',
  'condomínio',
  'enel',
  'luz',
  'energia',
  'energia elétrica',
  'consumo gas',
  'consumo gás',
  'gas',
  'gás',
  'consumo agua',
  'consumo água',
  'agua',
  'água',
  'juros',
  'multa',
  'advogado',
  'taxa advogado',
  'honorarios',
  'honorários'
];

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
 * Parse bill text and extract structured data
 */
function parseBillText(text: string): CondominiumBillData | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
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
  result.propertyName = extractPropertyName(text);
  result.propertyUnit = extractPropertyUnit(text);

  // Extract competency month
  result.competencyMonth = extractCompetencyMonth(text);

  // Extract due date
  result.dueDate = extractDueDate(text);

  // Extract items and values
  result.items = extractItems(text);

  // Extract total amount
  result.totalAmount = extractTotalAmount(text);

  // Extract optional fields
  result.interestAmount = extractInterestAmount(text);
  result.finalAmount = extractFinalAmount(text);
  result.lawyerFee = extractLawyerFee(text);

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
    const matches = normalizedText.matchAll(pattern);
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
    const matches = text.matchAll(pattern);
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
 * Extract items and their values
 */
function extractItems(text: string): { name: string; amount: number }[] {
  const items: { name: string; amount: number }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const normalizedLine = line.toLowerCase().trim();
    
    // Look for known items
    for (const knownItem of KNOWN_ITEMS) {
      if (normalizedLine.includes(knownItem)) {
        // Extract value from the line
        const value = extractValueFromLine(line);
        if (value > 0) {
          let itemName = knownItem;
          
          // Map to standard names
          if (knownItem.includes('condominio') || knownItem.includes('taxa condominial')) {
            itemName = 'Taxa Condominial';
          } else if (knownItem.includes('enel') || knownItem.includes('luz') || knownItem.includes('energia')) {
            itemName = 'ENEL (Luz)';
          } else if (knownItem.includes('gas') || knownItem.includes('gás')) {
            itemName = 'Consumo Gás';
          } else if (knownItem.includes('agua') || knownItem.includes('água')) {
            itemName = 'Consumo Água';
          } else if (knownItem.includes('juros')) {
            itemName = 'Juros';
          } else if (knownItem.includes('advogado')) {
            itemName = 'Advogado';
          }

          // Check if we already have this item
          const existingItem = items.find(item => item.name === itemName);
          if (!existingItem) {
            items.push({ name: itemName, amount: value });
          }
        }
      }
    }
  }

  return items;
}

/**
 * Extract total amount
 */
function extractTotalAmount(text: string): number {
  // Look for total patterns
  const totalPatterns = [
    /valor\s+(?:do\s+)?documento[:\s]*(?:r\$)?\s*([\d.,]+)/gi,
    /total[:\s]*(?:r\$)?\s*([\d.,]+)/gi,
    /(?:r\$)?\s*([\d.,]+)/g
  ];

  const amounts: number[] = [];
  
  for (const pattern of totalPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const value = parseValue(match[1]);
      if (value > 0) {
        amounts.push(value);
      }
    }
  }

  // Return the largest amount found (likely the total)
  return amounts.length > 0 ? Math.max(...amounts) : 0;
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
 * Extract value from a single line
 */
function extractValueFromLine(line: string): number {
  // Look for monetary values in the line
  const valueMatches = line.match(/(?:r\$)?\s*([\d.,]+)/gi);
  
  if (valueMatches) {
    const values = valueMatches.map(match => parseValue(match));
    return Math.max(...values.filter(v => v > 0));
  }

  return 0;
}

/**
 * Parse monetary value from string
 */
function parseValue(valueStr: string): number {
  if (!valueStr) return 0;
  
  // Remove R$, spaces, and convert comma to dot
  const cleanValue = valueStr
    .replace(/r\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}