import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import type { Property, InsertProperty } from "@shared/schema";
import { insertPropertySchema } from "@shared/schema";
import { z } from "zod";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { db } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { transactions, properties } from "@shared/schema";

/**
 * Service for managing property-related operations
 */
export class PropertyService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Clean property data before saving
   */
  private cleanPropertyData(data: any) {
    return {
      ...data,
      // Keep decimal fields as strings (for Drizzle decimal type compatibility)
      purchasePrice: data.purchasePrice === '' || data.purchasePrice === undefined ? null : data.purchasePrice,
      commissionValue: data.commissionValue === '' || data.commissionValue === undefined ? null : data.commissionValue,
      taxesAndRegistration: data.taxesAndRegistration === '' || data.taxesAndRegistration === undefined ? null : data.taxesAndRegistration,
      renovationAndDecoration: data.renovationAndDecoration === '' || data.renovationAndDecoration === undefined ? null : data.renovationAndDecoration,
      otherInitialValues: data.otherInitialValues === '' || data.otherInitialValues === undefined ? null : data.otherInitialValues,
      area: data.area === '' || data.area === undefined ? null : data.area,
      marketValue: data.marketValue === '' || data.marketValue === undefined ? null : data.marketValue,
      // Convert integer fields from string to number
      bedrooms: (!data.bedrooms || data.bedrooms === '') ? null : (typeof data.bedrooms === 'string' ? parseInt(data.bedrooms) : data.bedrooms),
      bathrooms: (!data.bathrooms || data.bathrooms === '') ? null : (typeof data.bathrooms === 'string' ? parseInt(data.bathrooms) : data.bathrooms),
      // Clean date fields - convert empty strings to null
      purchaseDate: data.purchaseDate === '' || data.purchaseDate === undefined ? null : data.purchaseDate,
      marketValueDate: data.marketValueDate === '' || data.marketValueDate === undefined ? null : data.marketValueDate,
      // Clean address fields - convert empty strings to null
      condominiumName: data.condominiumName === '' || data.condominiumName === undefined ? null : data.condominiumName,
      street: data.street === '' || data.street === undefined ? null : data.street,
      number: data.number === '' || data.number === undefined ? null : data.number,
      tower: data.tower === '' || data.tower === undefined ? null : data.tower,
      unit: data.unit === '' || data.unit === undefined ? null : data.unit,
      neighborhood: data.neighborhood === '' || data.neighborhood === undefined ? null : data.neighborhood,
      city: data.city === '' || data.city === undefined ? null : data.city,
      state: data.state === '' || data.state === undefined ? null : data.state,
      country: data.country === '' || data.country === undefined ? null : data.country,
      zipCode: data.zipCode === '' || data.zipCode === undefined ? null : data.zipCode,
      registration: data.registration === '' || data.registration === undefined ? null : data.registration,
      iptuCode: data.iptuCode === '' || data.iptuCode === undefined ? null : data.iptuCode,
      // Financing fields
      isFullyPaid: data.isFullyPaid === undefined ? false : data.isFullyPaid,
      financingAmount: data.financingAmount === '' || data.financingAmount === undefined ? null : data.financingAmount,
    };
  }

  /**
   * Get all properties for a user
   */
  async getProperties(userId: string): Promise<Property[]> {
    console.log('[PropertyService] getProperties called with userId:', userId);
    const result = await this.storage.getProperties(userId);
    console.log('[PropertyService] getProperties returned:', result.length, 'properties');
    return result;
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: number, userId: string): Promise<Property | undefined> {
    return await this.storage.getProperty(id, userId);
  }

  /**
   * Create a new property
   */
  async createProperty(userId: string, data: any): Promise<Property> {
    try {
      const cleanedData = this.cleanPropertyData(data);
      const validatedData = insertPropertySchema.parse(cleanedData);
      
      return await this.storage.createProperty({
        ...validatedData,
        userId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(id: number, userId: string, data: any): Promise<Property | undefined> {
    try {
      const cleanedData = this.cleanPropertyData(data);
      const validatedData = insertPropertySchema.partial().parse(cleanedData);
      
      return await this.storage.updateProperty(id, validatedData, userId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: number, userId: string): Promise<boolean> {
    return await this.storage.deleteProperty(id, userId);
  }

  /**
   * Calculate property return rate for a specific month/year
   */
  async calculateReturnRate(propertyId: number, userId: string, month: number, year: number): Promise<{
    propertyId: number;
    propertyName: string;
    month: number;
    year: number;
    acquisitionCost: number;
    revenue: number;
    expenses: number;
    netResult: number;
    returnRate: number;
    ipcaCorrectedAcquisitionCost: number;
    returnRateIPCA: number;
  }> {
    try {
      // Get property
      const property = await this.storage.getProperty(propertyId, userId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Calculate date range for the month
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      // Get transactions for the month
      const monthTransactions = await db
        .select({
          type: transactions.type,
          amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
        })
        .from(transactions)
        .where(and(
          eq(transactions.propertyId, propertyId),
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        ))
        .groupBy(transactions.type);

      // Calculate revenue and expenses
      const revenue = Number(monthTransactions.find(t => t.type === 'revenue')?.amount || 0);
      const expenses = Number(monthTransactions.find(t => t.type === 'expense')?.amount || 0);
      const netResult = revenue - expenses;

      // Calculate acquisition costs
      const acquisitionCost = this.storage.calculateTotalAcquisitionCost(property);
      const ipcaCorrectedAcquisitionCost = await this.storage.calculateIPCACorrectedAcquisitionCost(property);

      // Calculate return rates
      const returnRate = acquisitionCost > 0 ? (netResult / acquisitionCost) * 100 : 0;
      const returnRateIPCA = ipcaCorrectedAcquisitionCost > 0 ? (netResult / ipcaCorrectedAcquisitionCost) * 100 : 0;

      return {
        propertyId: property.id,
        propertyName: property.name,
        month,
        year,
        acquisitionCost,
        revenue,
        expenses,
        netResult,
        returnRate,
        ipcaCorrectedAcquisitionCost,
        returnRateIPCA
      };
    } catch (error) {
      this.handleError(error, 'PropertyService.calculateReturnRate');
    }
  }

  /**
   * Build Airbnb property mapping for import
   */
  async buildAirbnbPropertyMapping(userId: string): Promise<Record<string, string>> {
    const existingProps = await this.storage.getProperties(userId);
    
    // Build dynamic Airbnb property mapping based on airbnb_name field
    const dynamicMapping: Record<string, string> = {};
    for (const prop of existingProps) {
      if (prop.airbnbName && prop.airbnbName.trim()) {
        // Use the property's nickname if available, otherwise use the name
        const targetName = prop.nickname && prop.nickname.trim() ? prop.nickname : prop.name;
        dynamicMapping[prop.airbnbName] = targetName;
      }
    }
    
    // Add any manual mappings that might not have airbnb_name set
    const manualMappings: Record<string, string> = {
      "1 Suíte + Quintal privativo": "Sevilha G07",
      "1 Suíte Wonderful Einstein Morumbi": "Sevilha 307", 
      "2 Quartos + Quintal Privativo": "Málaga M07",
      "2 quartos, maravilhoso, na Avenida Berrini": "MaxHaus Berrini",
      "Sesimbra SeaView Studio 502: Sol, Luxo e Mar": "Sesimbra ap 505- Portugal",
      "Studio Premium - Haddock Lobo.": "Next Haddock Lobo",
      "Studio Premium - Haddock Lobo": "Next Haddock Lobo",
      "Studio Premium - Thera by Yoo": "Thera by Yoo",
      "Wonderful EINSTEIN Morumbi": "IGNORE",
      "Ganhos não relacionados a anúncios Créditos, resoluções e outros tipos de renda": "OTHER_INCOME"
    };
    
    // Merge manual mappings (they override automatic ones if there's a conflict)
    return { ...dynamicMapping, ...manualMappings };
  }

  /**
   * Build property ID map considering all name fields
   */
  async buildPropertyIdMap(userId: string): Promise<Map<string, number>> {
    const existingProps = await this.storage.getProperties(userId);
    const propertyMap = new Map<string, number>();
    
    for (const prop of existingProps) {
      // Map by original name
      propertyMap.set(prop.name, prop.id);
      
      // Map by nickname if exists
      if (prop.nickname && prop.nickname.trim()) {
        propertyMap.set(prop.nickname, prop.id);
      }
      
      // Map by Airbnb name if exists  
      if (prop.airbnbName && prop.airbnbName.trim()) {
        propertyMap.set(prop.airbnbName, prop.id);
      }
    }
    
    return propertyMap;
  }

  /**
   * Get or create property by name
   */
  async getOrCreateProperty(userId: string, propertyName: string, additionalData?: Partial<InsertProperty>): Promise<Property> {
    const existingProperties = await this.storage.getProperties(userId);
    const existing = existingProperties.find(p => 
      p.name === propertyName || 
      p.nickname === propertyName || 
      p.airbnbName === propertyName
    );

    if (existing) {
      return existing;
    }

    // Create new property
    const propertyData = {
      userId,
      name: propertyName,
      type: "apartment" as const,
      status: "active" as const,
      ...additionalData
    };

    const validatedData = insertPropertySchema.extend({ userId: z.string() }).parse(propertyData);
    return await this.storage.createProperty(validatedData);
  }

  /**
   * Copy expense template from one property to others
   */
  async copyExpenseTemplate(sourcePropertyId: number, targetPropertyIds: number[], userId: string): Promise<any> {
    return await this.storage.copyExpenseTemplate(sourcePropertyId, targetPropertyIds, userId);
  }

  /**
   * Get expense components for a property
   */
  async getExpenseComponents(propertyId: number, userId: string): Promise<any[]> {
    return await this.storage.getExpenseComponents(propertyId, userId);
  }

  /**
   * Save expense components for a property
   */
  async saveExpenseComponents(propertyId: number, userId: string, components: any[]): Promise<any> {
    return await this.storage.saveExpenseComponents(propertyId, userId, components);
  }
}