import { createWorker, Worker } from 'tesseract.js';

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // tesseract.js v6 API - criar worker sem parâmetros
      this.worker = await createWorker();
      
      // Carregar e inicializar idioma português
      await this.worker.load();
      await this.worker.loadLanguage('por');
      await this.worker.initialize('por');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR:', error);
      throw new Error('Failed to initialize OCR service');
    }
  }

  async processImage(imageFile: File): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const { data } = await this.worker.recognize(imageFile);
      return data.text;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error('Failed to process image');
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
let ocrService: OCRService | null = null;

export function getOCRService(): OCRService {
  if (!ocrService) {
    ocrService = new OCRService();
  }
  return ocrService;
}

/**
 * Process OCR text to extract cleaning data
 */
export function parseCleaningText(text: string): {
  cleanings: Array<{
    propertyName: string;
    amount: number;
  }>;
  totalAmount: number;
  hasAdvance: boolean;
  advanceAmount?: number;
} {
  const lines = text.split('\n').filter(line => line.trim());
  const cleanings: Array<{ propertyName: string; amount: number }> = [];
  
  let totalAmount = 0;
  let hasAdvance = false;
  let advanceAmount: number | undefined;

  // Detect advance payment keywords
  const advanceKeywords = ['DESCONTO', 'ANTECIPAÇÃO', 'ADIANTAMENTO', 'ANTECIPACAO'];
  hasAdvance = lines.some(line => 
    advanceKeywords.some(keyword => line.toUpperCase().includes(keyword))
  );

  // Process each line
  for (const line of lines) {
    // Skip header/footer lines
    if (line.match(/^(DATA|TOTAL|DESCONTO|ANTECIPA)/i)) {
      continue;
    }

    // Try different patterns to extract property and amount
    // Pattern 1: PropertyName R$ 000.00
    // Pattern 2: PropertyName 000.00
    // Pattern 3: PropertyName 000,00
    let match = line.match(/^(.+?)\s+R?\$?\s*([\d.,]+)$/);
    
    if (!match) {
      // Try pattern with amount at beginning
      match = line.match(/^R?\$?\s*([\d.,]+)\s+(.+)$/);
      if (match) {
        // Swap property and amount
        match = [match[0], match[2], match[1]];
      }
    }

    if (match) {
      const propertyName = match[1].trim();
      const amountStr = match[2].replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && amount > 0) {
        cleanings.push({ propertyName, amount });
        totalAmount += amount;
      }
    }
  }

  // Check for advance payment amount
  if (hasAdvance) {
    const advanceLine = lines.find(line => 
      advanceKeywords.some(keyword => line.toUpperCase().includes(keyword))
    );
    
    if (advanceLine) {
      const match = advanceLine.match(/R?\$?\s*([\d.,]+)/);
      if (match) {
        const amountStr = match[1].replace(/\./g, '').replace(',', '.');
        advanceAmount = parseFloat(amountStr);
      }
    }
  }

  return {
    cleanings,
    totalAmount,
    hasAdvance,
    advanceAmount,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Normalize property name for matching
 */
export function normalizePropertyName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, "") // Remove special characters
    .trim();
}