import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import type { 
  CleaningService as CleaningServiceType, 
  CleaningBatch,
  InsertCleaningService,
  InsertCleaningBatch,
  PropertyNameMapping,
  Property
} from "@shared/schema";

/**
 * Service for managing cleaning services and batches
 */
export class CleaningService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Import a batch of cleaning services
   */
  async importCleaningBatch(
    userId: string,
    cleanings: {
      propertyId: number;
      executionDate: string;
      amount: number;
    }[],
    paymentDate: string,
    description?: string,
    advanceAmount?: number
  ): Promise<{ batch: CleaningBatch; services: CleaningServiceType[] }> {
    try {
      // Calculate total amount
      const totalAmount = cleanings.reduce((sum, c) => sum + Number(c.amount), 0);
      
      // Create the batch
      const batch = await this.storage.createCleaningBatch({
        userId,
        paymentDate,
        totalAmount: totalAmount.toString(),
        description: description || `Limpeza - ${new Date(paymentDate).toLocaleDateString('pt-BR')}`,
        hasAdvancePayment: !!advanceAmount && advanceAmount > 0,
        advanceAmount: advanceAmount ? advanceAmount.toString() : null,
      });

      // Create individual cleaning services
      const services = await this.storage.createCleaningServices(
        cleanings.map(cleaning => ({
          userId,
          propertyId: cleaning.propertyId,
          executionDate: cleaning.executionDate,
          amount: cleaning.amount.toString(),
          batchId: batch.id,
        }))
      );

      return { batch, services };
    } catch (error) {
      console.error("Error importing cleaning batch:", error);
      throw new Error("Failed to import cleaning batch");
    }
  }

  /**
   * Get cleanings for a specific property
   */
  async getCleaningsByProperty(
    userId: string,
    propertyId: number,
    startDate?: string,
    endDate?: string
  ): Promise<CleaningServiceType[]> {
    return await this.storage.getCleaningServices(userId, {
      propertyId,
      startDate,
      endDate,
    });
  }

  /**
   * Get all cleaning batches for a user
   */
  async getCleaningBatches(userId: string): Promise<CleaningBatch[]> {
    return await this.storage.getCleaningBatches(userId);
  }

  /**
   * Get cleaning batch with its services
   */
  async getCleaningBatchWithServices(
    userId: string,
    batchId: number
  ): Promise<{ batch: CleaningBatch | undefined; services: CleaningServiceType[] }> {
    const batch = await this.storage.getCleaningBatch(batchId, userId);
    const services = batch
      ? await this.storage.getCleaningServices(userId, { batchId })
      : [];
    
    return { batch, services };
  }

  /**
   * Delete a cleaning batch and all its services
   */
  async deleteCleaningBatch(userId: string, batchId: number): Promise<boolean> {
    return await this.storage.deleteCleaningBatch(batchId, userId);
  }

  /**
   * Normalize property name for matching
   */
  normalizePropertyName(name: string): string {
    return name
      .toUpperCase()
      .normalize("NFD") // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, "") // Remove special characters
      .trim();
  }

  /**
   * Learn a new property name variation
   */
  async learnPropertyMapping(
    userId: string,
    variation: string,
    propertyId: number
  ): Promise<PropertyNameMapping> {
    // Check if mapping already exists
    const existingMappings = await this.storage.getPropertyNameMappings(userId, propertyId);
    const normalizedVariation = variation.toUpperCase();
    
    const exists = existingMappings.find(m => m.variation === normalizedVariation);
    if (exists) {
      return exists;
    }

    // Create new mapping
    return await this.storage.createPropertyNameMapping({
      userId,
      propertyId,
      variation: normalizedVariation,
    });
  }

  /**
   * Find property by name variation
   */
  async findPropertyByName(userId: string, name: string): Promise<Property | undefined> {
    return await this.storage.findPropertyByVariation(userId, name);
  }

  /**
   * Process OCR text and extract cleaning data
   */
  async processOCRText(userId: string, ocrText: string): Promise<{
    cleanings: {
      propertyName: string;
      property?: Property;
      amount: number;
      date?: string;
    }[];
    totalAmount: number;
    hasAdvance: boolean;
    advanceAmount?: number;
  }> {
    const lines = ocrText.split('\n').filter(line => line.trim());
    const cleanings: {
      propertyName: string;
      property?: Property;
      amount: number;
      date?: string;
    }[] = [];
    
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

      // Extract property name and amount
      const match = line.match(/^(.+?)\s+R?\$?\s*([\d.,]+)$/);
      if (match) {
        const propertyName = match[1].trim();
        const amountStr = match[2].replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount) && amount > 0) {
          // Try to find matching property
          const property = await this.findPropertyByName(userId, propertyName);
          
          cleanings.push({
            propertyName,
            property,
            amount,
          });
          
          totalAmount += amount;
        }
      }
    }

    // Check for advance payment amount
    if (hasAdvance) {
      // Look for a line with advance amount
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
   * Match cleanings to properties with user confirmation
   */
  async matchCleaningsToProperties(
    userId: string,
    cleanings: {
      propertyName: string;
      amount: number;
      propertyId?: number;
    }[]
  ): Promise<{
    matched: {
      propertyId: number;
      propertyName: string;
      amount: number;
    }[];
    unmatched: {
      propertyName: string;
      amount: number;
      suggestions?: Property[];
    }[];
  }> {
    const matched: {
      propertyId: number;
      propertyName: string;
      amount: number;
    }[] = [];
    
    const unmatched: {
      propertyName: string;
      amount: number;
      suggestions?: Property[];
    }[] = [];

    const allProperties = await this.storage.getProperties(userId);

    for (const cleaning of cleanings) {
      if (cleaning.propertyId) {
        // Already matched
        matched.push({
          propertyId: cleaning.propertyId,
          propertyName: cleaning.propertyName,
          amount: cleaning.amount,
        });
      } else {
        // Try to find property
        const property = await this.findPropertyByName(userId, cleaning.propertyName);
        
        if (property) {
          matched.push({
            propertyId: property.id,
            propertyName: cleaning.propertyName,
            amount: cleaning.amount,
          });
        } else {
          // Find suggestions based on partial match
          const normalized = this.normalizePropertyName(cleaning.propertyName);
          const suggestions = allProperties.filter(p => {
            const pNorm = this.normalizePropertyName(p.name || '');
            return pNorm.includes(normalized) || normalized.includes(pNorm);
          });
          
          unmatched.push({
            propertyName: cleaning.propertyName,
            amount: cleaning.amount,
            suggestions: suggestions.slice(0, 3), // Top 3 suggestions
          });
        }
      }
    }

    return { matched, unmatched };
  }
}