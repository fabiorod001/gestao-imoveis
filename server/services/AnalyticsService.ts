import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { PropertyService } from "./PropertyService";
import { db } from "../db";
import { transactions, properties, cashFlowSettings, accounts } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, or, isNull } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, addDays, differenceInDays } from "date-fns";

/**
 * Service for analytics and reporting operations
 */
export class AnalyticsService extends BaseService {
  private propertyService: PropertyService;

  constructor(storage: IStorage) {
    super(storage);
    this.propertyService = new PropertyService(storage);
  }

  /**
   * Get financial summary for a date range
   */
  async getFinancialSummary(userId: string, startDate?: string, endDate?: string): Promise<any> {
    return await this.storage.getFinancialSummary(userId, startDate, endDate);
  }

  /**
   * Get monthly financial data for a year
   */
  async getMonthlyData(userId: string, year: number): Promise<any> {
    return await this.storage.getMonthlyData(userId, year);
  }

  /**
   * Get property status distribution
   */
  async getPropertyStatusDistribution(userId: string): Promise<any> {
    return await this.storage.getPropertyStatusDistribution(userId);
  }

  /**
   * Get pivot table data for a specific month
   */
  async getPivotTableData(userId: string, month: number, year: number): Promise<any> {
    return await this.storage.getPivotTableData(userId, month, year);
  }

  /**
   * Get transactions by periods with advanced filtering
   */
  async getTransactionsByPeriods(
    userId: string,
    months: string[],
    propertyIds?: number[],
    transactionTypes?: string[],
    categories?: string[]
  ): Promise<any> {
    return await this.storage.getTransactionsByPeriods(
      userId,
      months,
      propertyIds,
      transactionTypes,
      categories
    );
  }

  /**
   * Get available months from transaction data
   */
  async getAvailableMonths(userId: string): Promise<string[]> {
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'MM/YYYY')`
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`)
      .orderBy(sql`MIN(${transactions.date}) DESC`);

    return result.map(r => r.month);
  }

  /**
   * Calculate profit margins with IPCA correction
   */
  async calculateProfitWithIPCA(userId: string, months: string[], propertyIds?: number[]): Promise<any[]> {
    const userProperties = await this.storage.getProperties(userId);
    
    // Get transaction data for the specified periods
    const transactionData = await this.storage.getTransactionsByPeriods(
      userId,
      months,
      propertyIds,
      undefined,
      undefined
    );

    // Group transactions by property
    const propertyData = new Map();
    
    transactionData.forEach(transaction => {
      if (!propertyData.has(transaction.propertyId)) {
        propertyData.set(transaction.propertyId, {
          propertyId: transaction.propertyId,
          propertyName: transaction.propertyName,
          revenue: 0,
          expenses: 0
        });
      }
      
      const data = propertyData.get(transaction.propertyId);
      if (transaction.type === 'revenue') {
        data.revenue += transaction.amount;
      } else if (transaction.type === 'expense') {
        data.expenses += transaction.amount;
      }
    });

    // Calculate IPCA-corrected profit margins for each property
    const results = await Promise.all(
      Array.from(propertyData.values()).map(async (data) => {
        const property = userProperties.find(p => p.id === data.propertyId);
        
        if (!property) {
          return {
            propertyName: data.propertyName,
            revenue: data.revenue,
            expenses: data.expenses,
            netResult: data.revenue - data.expenses,
            originalAcquisitionCost: 0,
            ipcaCorrectedAcquisitionCost: 0,
            profitMarginOriginal: 0,
            profitMarginIPCA: 0,
            ipcaCorrection: 0
          };
        }

        const originalCost = this.storage.calculateTotalAcquisitionCost(property);
        const ipcaCorrectedCost = await this.storage.calculateIPCACorrectedAcquisitionCost(property);
        const netResult = data.revenue - data.expenses;
        
        const profitMarginOriginal = originalCost > 0 ? (netResult / originalCost) * 100 : 0;
        const profitMarginIPCA = ipcaCorrectedCost > 0 ? (netResult / ipcaCorrectedCost) * 100 : 0;
        const ipcaCorrection = ipcaCorrectedCost - originalCost;

        return {
          propertyName: data.propertyName,
          revenue: data.revenue,
          expenses: data.expenses,
          netResult,
          originalAcquisitionCost: originalCost,
          ipcaCorrectedAcquisitionCost: ipcaCorrectedCost,
          profitMarginOriginal,
          profitMarginIPCA,
          ipcaCorrection
        };
      })
    );

    return results;
  }

  /**
   * Get detailed single month analysis
   */
  async getSingleMonthDetailed(userId: string, month: string): Promise<any[]> {
    const [monthNum, yearNum] = month.split('/').map(Number);
    const startDate = format(new Date(yearNum, monthNum - 1, 1), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(yearNum, monthNum - 1)), 'yyyy-MM-dd');

    const userProperties = await this.storage.getProperties(userId);

    // Get all transactions for the month
    const monthTransactions = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        type: transactions.type,
        amount: sql<number>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        sql`${transactions.propertyId} IS NOT NULL`
      ))
      .groupBy(transactions.propertyId, properties.name, transactions.type);

    // Group by property
    const propertyData = new Map();
    
    monthTransactions.forEach(row => {
      if (!propertyData.has(row.propertyId)) {
        propertyData.set(row.propertyId, {
          propertyId: row.propertyId,
          propertyName: row.propertyName,
          revenue: 0,
          expenses: 0
        });
      }
      
      const data = propertyData.get(row.propertyId);
      if (row.type === 'revenue') {
        data.revenue = Number(row.amount);
      } else if (row.type === 'expense') {
        data.expenses = Number(row.amount);
      }
    });

    // Add properties with no transactions
    userProperties.forEach(property => {
      if (!propertyData.has(property.id)) {
        propertyData.set(property.id, {
          propertyId: property.id,
          propertyName: property.name,
          revenue: 0,
          expenses: 0
        });
      }
    });

    // Calculate results
    const results = [];
    for (const [propertyId, data] of propertyData) {
      const property = userProperties.find(p => p.id === propertyId);
      
      if (!property) continue;

      const originalCost = this.storage.calculateTotalAcquisitionCost(property);
      const ipcaCorrectedCost = await this.storage.calculateIPCACorrectedAcquisitionCost(property);
      const netResult = data.revenue - data.expenses;
      
      const profitMarginOriginal = originalCost > 0 ? (netResult / originalCost) * 100 : 0;
      const profitMarginIPCA = ipcaCorrectedCost > 0 ? (netResult / ipcaCorrectedCost) * 100 : 0;

      results.push({
        propertyName: data.propertyName,
        revenue: data.revenue,
        expenses: data.expenses,
        netResult,
        profitPercentage: data.revenue > 0 ? (netResult / data.revenue) * 100 : 0,
        originalAcquisitionCost: originalCost,
        profitMarginOriginal,
        profitMarginIPCA,
        ipcaCorrectedAcquisitionCost: ipcaCorrectedCost
      });
    }

    return results;
  }

  /**
   * Calculate IPCA correction for a value
   */
  async calculateIPCA(fromDate: string, toDate: string, value: number): Promise<{
    originalValue: number;
    correctedValue: number;
    correctionFactor: number;
    percentageIncrease: number;
  }> {
    // IPCA accumulation calculation
    // This is a simplified version - in production, you'd fetch real IPCA data
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const monthsDiff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    
    // Average monthly IPCA of 0.4% (approximate)
    const monthlyRate = 0.004;
    const correctionFactor = Math.pow(1 + monthlyRate, monthsDiff);
    const correctedValue = value * correctionFactor;
    const percentageIncrease = (correctionFactor - 1) * 100;

    return {
      originalValue: value,
      correctedValue,
      correctionFactor,
      percentageIncrease
    };
  }
}