import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { TransactionService } from "./TransactionService";
import { db } from "../db";
import { 
  transactions, 
  properties, 
  taxPayments, 
  taxSettings, 
  taxProjections,
  type TaxSettings,
  type TaxProjection
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, isNull, or } from "drizzle-orm";
import { format, addMonths, lastDayOfMonth, startOfMonth, endOfMonth } from "date-fns";
import { z } from "zod";
import { Money, ServerMoneyUtils, MoneyUtils } from "../utils/money";

/**
 * Service for tax calculation and payment operations with precise Money handling
 */
export class TaxService extends BaseService {
  private transactionService: TransactionService;

  constructor(storage: IStorage) {
    super(storage);
    this.transactionService = new TransactionService(storage);
  }

  /**
   * Record simple tax payment with Money precision
   */
  async recordSimpleTaxPayment(userId: string, data: {
    amount: number | string;
    date: string;
    description?: string;
    type: string;
  }): Promise<any> {
    // Use Money for precise amount handling
    const amount = ServerMoneyUtils.parseUserInput(data.amount);

    const transaction = await this.transactionService.createTransaction(userId, {
      propertyId: null, // Company-level tax
      type: 'expense',
      category: 'taxes',
      description: data.description || `Pagamento de ${data.type}`,
      amount: amount.toDecimalString(), // Convert Money to string for transaction service
      date: data.date,
      supplier: 'Receita Federal',
      notes: `Imposto: ${data.type}`
    });

    return {
      success: true,
      transaction,
      message: 'Pagamento de imposto registrado com sucesso',
      formattedAmount: amount.toBRL()
    };
  }

  /**
   * Generate tax payment preview based on revenue with Money precision
   */
  async generateTaxPreview(userId: string, data: {
    referenceMonth: string;
    propertyIds?: number[];
    taxType: string;
    rate: number;
  }): Promise<any> {
    const [year, month] = data.referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get revenue for the reference month
    const revenueData = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        totalRevenue: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, format(startDate, 'yyyy-MM-dd')),
        lte(transactions.date, format(endDate, 'yyyy-MM-dd')),
        data.propertyIds && data.propertyIds.length > 0 
          ? sql`${transactions.propertyId} IN (${data.propertyIds.join(',')})` 
          : sql`1=1`
      ))
      .groupBy(transactions.propertyId, properties.name);

    // Calculate using Money for precision
    const revenueMoneyList = revenueData.map(prop => ({
      ...prop,
      revenueMoney: ServerMoneyUtils.fromDecimal(prop.totalRevenue)
    }));

    const totalRevenue = MoneyUtils.sum(revenueMoneyList.map(p => p.revenueMoney));
    const taxAmount = totalRevenue.percentage(data.rate);

    const distribution = revenueMoneyList.map(prop => {
      const propTax = prop.revenueMoney.percentage(data.rate);
      return {
        propertyId: prop.propertyId,
        propertyName: prop.propertyName,
        revenue: prop.revenueMoney.toDecimal(),
        revenueFormatted: prop.revenueMoney.toBRL(),
        taxAmount: propTax.toDecimal(),
        taxFormatted: propTax.toBRL()
      };
    });

    return {
      referenceMonth: data.referenceMonth,
      taxType: data.taxType,
      rate: data.rate,
      totalRevenue: totalRevenue.toDecimal(),
      totalRevenueFormatted: totalRevenue.toBRL(),
      taxAmount: taxAmount.toDecimal(),
      taxAmountFormatted: taxAmount.toBRL(),
      distribution
    };
  }

  /**
   * Calculate PIS/COFINS based on revenue with Money precision
   */
  async calculatePisCofins(userId: string, data: {
    referenceMonth: string;
    propertyIds?: number[];
    regime?: 'cumulative' | 'non-cumulative';
  }): Promise<any> {
    const regime = data.regime || 'cumulative';
    
    // Tax rates for cumulative regime
    const pisRate = regime === 'cumulative' ? 0.65 : 1.65;
    const cofinsRate = regime === 'cumulative' ? 3.0 : 7.6;
    
    const [year, month] = data.referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get revenue for the month
    const revenueData = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        revenue: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, format(startDate, 'yyyy-MM-dd')),
        lte(transactions.date, format(endDate, 'yyyy-MM-dd')),
        data.propertyIds && data.propertyIds.length > 0 
          ? sql`${transactions.propertyId} IN (${data.propertyIds.join(',')})` 
          : sql`1=1`
      ))
      .groupBy(transactions.propertyId, properties.name);

    // Calculate using Money for precision
    const revenueMoneyList = revenueData.map(prop => ({
      ...prop,
      revenueMoney: ServerMoneyUtils.fromDecimal(prop.revenue)
    }));

    const totalRevenue = MoneyUtils.sum(revenueMoneyList.map(p => p.revenueMoney));
    const pisAmount = totalRevenue.percentage(pisRate);
    const cofinsAmount = totalRevenue.percentage(cofinsRate);
    const totalTax = pisAmount.add(cofinsAmount);

    return {
      referenceMonth: data.referenceMonth,
      regime,
      totalRevenue: totalRevenue.toDecimal(),
      totalRevenueFormatted: totalRevenue.toBRL(),
      pisRate,
      cofinsRate,
      pisAmount: pisAmount.toDecimal(),
      pisAmountFormatted: pisAmount.toBRL(),
      cofinsAmount: cofinsAmount.toDecimal(),
      cofinsAmountFormatted: cofinsAmount.toBRL(),
      totalTax: totalTax.toDecimal(),
      totalTaxFormatted: totalTax.toBRL(),
      propertyDetails: revenueMoneyList.map(prop => {
        const propPis = prop.revenueMoney.percentage(pisRate);
        const propCofins = prop.revenueMoney.percentage(cofinsRate);
        const propTotal = propPis.add(propCofins);
        
        return {
          propertyName: prop.propertyName,
          revenue: prop.revenueMoney.toDecimal(),
          revenueFormatted: prop.revenueMoney.toBRL(),
          pis: propPis.toDecimal(),
          pisFormatted: propPis.toBRL(),
          cofins: propCofins.toDecimal(),
          cofinsFormatted: propCofins.toBRL(),
          total: propTotal.toDecimal(),
          totalFormatted: propTotal.toBRL()
        };
      })
    };
  }

  /**
   * Record tax payment with installments support using Money precision
   */
  async recordTaxPayment(userId: string, data: {
    taxType: string;
    referenceMonth: string;
    totalAmount: number | string;
    installments?: number;
    firstDueDate: string;
    propertyDistribution?: Array<{
      propertyId: number;
      amount: number;
    }>;
  }): Promise<any> {
    // Use Money for precise amount handling
    const totalAmount = ServerMoneyUtils.parseUserInput(data.totalAmount);
    const installments = data.installments || 1;
    
    // Split the total amount equally among installments
    const installmentAmounts = totalAmount.split(installments);
    const createdPayments = [];

    // Create tax payment records
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(data.firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const payment = await db.insert(taxPayments).values({
        userId,
        taxType: data.taxType,
        referenceMonth: data.referenceMonth,
        installmentNumber: i + 1,
        totalInstallments: installments,
        amount: installmentAmounts[i].toDecimalString(),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        paid: false,
        notes: `Parcela ${i + 1}/${installments}`
      }).returning();

      createdPayments.push(payment[0]);

      // Create expense transaction if it's a single payment
      if (installments === 1) {
        await this.transactionService.createTransaction(userId, {
          propertyId: null,
          type: 'expense',
          category: 'taxes',
          description: `${data.taxType} - Ref: ${data.referenceMonth}`,
          amount: installmentAmounts[i].toDecimalString(),
          date: format(dueDate, 'yyyy-MM-dd'),
          supplier: 'Receita Federal',
          notes: `Imposto referente a ${data.referenceMonth}`
        });
      }
    }

    // If there's property distribution, create child transactions with Money precision
    if (data.propertyDistribution && data.propertyDistribution.length > 0) {
      for (const dist of data.propertyDistribution) {
        const distAmount = ServerMoneyUtils.parseUserInput(dist.amount);
        await this.transactionService.createTransaction(userId, {
          propertyId: dist.propertyId,
          type: 'expense',
          category: 'taxes',
          description: `${data.taxType} - Ref: ${data.referenceMonth}`,
          amount: distAmount.toDecimalString(),
          date: data.firstDueDate,
          supplier: 'Receita Federal',
          notes: `Parte proporcional do imposto`
        });
      }
    }

    return {
      success: true,
      payments: createdPayments,
      totalAmountFormatted: totalAmount.toBRL(),
      message: installments > 1 
        ? `Parcelamento de ${data.taxType} criado com sucesso (${installments}x de ${installmentAmounts[0].toBRL()})`
        : `Pagamento de ${data.taxType} registrado com sucesso`
    };
  }

  /**
   * Get tax payments for a user
   */
  async getTaxPayments(userId: string, filters?: {
    taxType?: string;
    referenceMonth?: string;
    paid?: boolean;
  }): Promise<any[]> {
    const conditions = [eq(taxPayments.userId, userId)];

    if (filters?.taxType) {
      conditions.push(eq(taxPayments.taxType, filters.taxType));
    }
    if (filters?.referenceMonth) {
      conditions.push(eq(taxPayments.referenceMonth, filters.referenceMonth));
    }
    if (filters?.paid !== undefined) {
      conditions.push(eq(taxPayments.paid, filters.paid));
    }

    const payments = await db
      .select()
      .from(taxPayments)
      .where(and(...conditions))
      .orderBy(taxPayments.dueDate);

    // Format amounts using Money
    return payments.map(payment => ({
      ...payment,
      amountMoney: ServerMoneyUtils.fromDecimal(payment.amount),
      amountFormatted: ServerMoneyUtils.fromDecimal(payment.amount).toBRL()
    }));
  }

  /**
   * Mark tax payment as paid with Money precision
   */
  async markTaxPaymentAsPaid(userId: string, paymentId: number): Promise<any> {
    const [payment] = await db
      .update(taxPayments)
      .set({
        paid: true,
        paymentDate: format(new Date(), 'yyyy-MM-dd')
      })
      .where(and(
        eq(taxPayments.id, paymentId),
        eq(taxPayments.userId, userId)
      ))
      .returning();

    if (payment) {
      // Use Money for amount handling
      const amount = ServerMoneyUtils.fromDecimal(payment.amount);
      
      // Create expense transaction for the payment
      await this.transactionService.createTransaction(userId, {
        propertyId: null,
        type: 'expense',
        category: 'taxes',
        description: `${payment.taxType} - Parcela ${payment.installmentNumber}/${payment.totalInstallments}`,
        amount: amount.toDecimalString(),
        date: payment.paymentDate!,
        supplier: 'Receita Federal',
        notes: `Referência: ${payment.referenceMonth}`
      });
    }

    return {
      success: true,
      payment: {
        ...payment,
        amountFormatted: ServerMoneyUtils.fromDecimal(payment.amount).toBRL()
      },
      message: 'Pagamento de imposto confirmado'
    };
  }

  /**
   * Calculate tax summary for a period with Money precision
   */
  async getTaxSummary(userId: string, year: number): Promise<any> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Get all tax expenses for the year
    const taxExpenses = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'MM/YYYY')`,
        amount: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        eq(transactions.category, 'taxes'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`)
      .orderBy(sql`MIN(${transactions.date})`);

    // Get revenue for tax calculation base
    const revenueData = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'MM/YYYY')`,
        revenue: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`);

    // Calculate using Money for precision
    const taxMoneyList = taxExpenses.map(row => ServerMoneyUtils.fromDecimal(row.amount));
    const revenueMoneyList = revenueData.map(row => ServerMoneyUtils.fromDecimal(row.revenue));
    
    const totalTaxPaid = MoneyUtils.sum(taxMoneyList);
    const totalRevenue = MoneyUtils.sum(revenueMoneyList);
    
    const effectiveRate = totalRevenue.isZero() 
      ? 0 
      : (totalTaxPaid.toDecimal() / totalRevenue.toDecimal()) * 100;

    const averageMonthlyTax = taxMoneyList.length > 0 
      ? totalTaxPaid.divide(taxMoneyList.length)
      : Money.zero();

    return {
      year,
      totalTaxPaid: totalTaxPaid.toDecimal(),
      totalTaxPaidFormatted: totalTaxPaid.toBRL(),
      totalRevenue: totalRevenue.toDecimal(),
      totalRevenueFormatted: totalRevenue.toBRL(),
      effectiveRate,
      effectiveRateFormatted: `${effectiveRate.toFixed(2)}%`,
      monthlyBreakdown: taxExpenses.map((row, index) => {
        const amount = taxMoneyList[index];
        return {
          month: row.month,
          amount: amount.toDecimal(),
          amountFormatted: amount.toBRL()
        };
      }),
      averageMonthlyTax: averageMonthlyTax.toDecimal(),
      averageMonthlyTaxFormatted: averageMonthlyTax.toBRL()
    };
  }

  /**
   * Calculate distributed tax based on property revenue
   */
  async calculateDistributedTax(userId: string, data: {
    taxType: string;
    totalAmount: number | string;
    referenceMonth: string;
    propertyIds: number[];
  }): Promise<any> {
    const totalAmount = ServerMoneyUtils.parseUserInput(data.totalAmount);
    const [year, month] = data.referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get revenue for each property
    const revenueData = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        revenue: sql<string>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, format(startDate, 'yyyy-MM-dd')),
        lte(transactions.date, format(endDate, 'yyyy-MM-dd')),
        sql`${transactions.propertyId} IN (${data.propertyIds.join(',')})`
      ))
      .groupBy(transactions.propertyId, properties.name);

    // Convert to Money and calculate distribution
    const weights = revenueData.map(prop => ({
      id: prop.propertyId!,
      weight: ServerMoneyUtils.fromDecimal(prop.revenue).toDecimal()
    }));

    const distribution = ServerMoneyUtils.distributeProportionally(totalAmount, weights);

    return {
      taxType: data.taxType,
      totalAmount: totalAmount.toDecimal(),
      totalAmountFormatted: totalAmount.toBRL(),
      referenceMonth: data.referenceMonth,
      distribution: Array.from(distribution.entries()).map(([propertyId, amount]) => {
        const prop = revenueData.find(p => p.propertyId === propertyId);
        return {
          propertyId,
          propertyName: prop?.propertyName || 'Unknown',
          amount: amount.toDecimal(),
          amountFormatted: amount.toBRL(),
          percentage: (amount.toDecimal() / totalAmount.toDecimal()) * 100
        };
      })
    };
  }

  /**
   * Initialize default tax settings for a user
   */
  async initializeTaxSettings(userId: string): Promise<void> {
    // Check if settings already exist
    const existing = await db
      .select()
      .from(taxSettings)
      .where(and(
        eq(taxSettings.userId, userId),
        isNull(taxSettings.endDate)
      ))
      .limit(1);

    if (existing.length > 0) return;

    // Default settings for Lucro Presumido regime
    const defaultSettings = [
      {
        userId,
        taxType: 'PIS',
        rate: '0.65',
        paymentFrequency: 'monthly',
        dueDay: 25,
        effectiveDate: '2025-01-01'
      },
      {
        userId,
        taxType: 'COFINS',
        rate: '3.00',
        paymentFrequency: 'monthly',
        dueDay: 25,
        effectiveDate: '2025-01-01'
      },
      {
        userId,
        taxType: 'IRPJ',
        rate: '15.00',
        baseRate: '32.00', // 32% of revenue for Lucro Presumido
        additionalRate: '10.00',
        additionalThreshold: '20000.00',
        paymentFrequency: 'quarterly',
        dueDay: 31, // Last business day
        installmentAllowed: true,
        installmentThreshold: '2000.00',
        installmentCount: 3,
        effectiveDate: '2025-01-01'
      },
      {
        userId,
        taxType: 'CSLL',
        rate: '9.00',
        baseRate: '32.00', // 32% of revenue for Lucro Presumido
        paymentFrequency: 'quarterly',
        dueDay: 31, // Last business day
        installmentAllowed: true,
        installmentThreshold: '2000.00',
        installmentCount: 3,
        effectiveDate: '2025-01-01'
      }
    ];

    await db.insert(taxSettings).values(defaultSettings);
  }

  /**
   * Get active tax settings for a user
   */
  async getTaxSettings(userId: string, taxType?: string, referenceDate?: string): Promise<TaxSettings[]> {
    const date = referenceDate || format(new Date(), 'yyyy-MM-dd');
    
    const conditions = [
      eq(taxSettings.userId, userId),
      lte(taxSettings.effectiveDate, date),
      or(isNull(taxSettings.endDate), gte(taxSettings.endDate, date))
    ];

    if (taxType) {
      conditions.push(eq(taxSettings.taxType, taxType));
    }

    return await db
      .select()
      .from(taxSettings)
      .where(and(...conditions))
      .orderBy(desc(taxSettings.effectiveDate));
  }

  /**
   * Update tax settings (creates new record with effective date)
   */
  async updateTaxSettings(userId: string, taxType: string, newSettings: Partial<TaxSettings>): Promise<TaxSettings> {
    // End the current setting
    const current = await db
      .update(taxSettings)
      .set({ endDate: format(new Date(), 'yyyy-MM-dd') })
      .where(and(
        eq(taxSettings.userId, userId),
        eq(taxSettings.taxType, taxType),
        isNull(taxSettings.endDate)
      ));

    // Create new setting
    const [newSetting] = await db
      .insert(taxSettings)
      .values({
        ...newSettings,
        userId,
        taxType,
        effectiveDate: format(new Date(), 'yyyy-MM-dd')
      })
      .returning();

    return newSetting;
  }

  /**
   * Calculate tax projections for a given month
   */
  async calculateTaxProjections(userId: string, referenceMonth: string, selectedPropertyIds?: number[]): Promise<TaxProjection[]> {
    const [year, month] = referenceMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);

    // Initialize settings if needed
    await this.initializeTaxSettings(userId);

    // Get active tax settings
    const settings = await this.getTaxSettings(userId, undefined, format(startDate, 'yyyy-MM-dd'));

    // Get revenue for the month
    const revenueQuery = db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        revenue: sql<string>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, format(startDate, 'yyyy-MM-dd')),
        lte(transactions.date, format(endDate, 'yyyy-MM-dd')),
        selectedPropertyIds && selectedPropertyIds.length > 0
          ? sql`${transactions.propertyId} IN (${selectedPropertyIds.join(',')})`
          : sql`1=1`
      ))
      .groupBy(transactions.propertyId, properties.name);

    const revenueData = await revenueQuery;

    // Calculate total revenue and distribution
    const propertyRevenues = revenueData.map(prop => ({
      propertyId: prop.propertyId!,
      propertyName: prop.propertyName!,
      revenue: ServerMoneyUtils.fromDecimal(prop.revenue)
    }));

    const totalRevenue = MoneyUtils.sum(propertyRevenues.map(p => p.revenue));

    // Skip if no revenue
    if (totalRevenue.isZero()) {
      return [];
    }

    const projections: TaxProjection[] = [];

    // Calculate each tax
    for (const setting of settings) {
      let taxAmount = Money.zero();
      let additionalAmount = Money.zero();
      let dueDate: Date;

      // Calculate due date based on payment frequency
      if (setting.paymentFrequency === 'monthly') {
        // Monthly taxes due on the 25th of the following month
        dueDate = new Date(year, month, setting.dueDay || 25);
      } else {
        // Quarterly taxes - determine quarter and due date
        const quarter = Math.floor((month - 1) / 3) + 1;
        const lastMonthOfQuarter = quarter * 3;
        
        // Due on last business day of month following the quarter
        dueDate = lastDayOfMonth(new Date(year, lastMonthOfQuarter));
        
        // Only calculate if this is the last month of the quarter
        if (month % 3 !== 0) continue;
      }

      // Calculate tax amount based on type
      switch (setting.taxType) {
        case 'PIS':
        case 'COFINS':
          // Direct percentage of revenue
          taxAmount = totalRevenue.percentage(parseFloat(setting.rate));
          break;

        case 'IRPJ':
        case 'CSLL':
          // Percentage of presumed profit (32% of revenue)
          const presumedProfit = totalRevenue.percentage(parseFloat(setting.baseRate || '32'));
          taxAmount = presumedProfit.percentage(parseFloat(setting.rate));

          // Additional IRPJ for amounts over threshold
          if (setting.taxType === 'IRPJ' && setting.additionalThreshold) {
            const monthlyRevenue = totalRevenue;
            const threshold = ServerMoneyUtils.fromDecimal(setting.additionalThreshold);
            
            if (monthlyRevenue.toDecimal() > threshold.toDecimal()) {
              const excess = monthlyRevenue.subtract(threshold);
              const excessProfit = excess.percentage(parseFloat(setting.baseRate || '32'));
              additionalAmount = excessProfit.percentage(parseFloat(setting.additionalRate || '10'));
            }
          }
          break;
      }

      const totalAmount = taxAmount.add(additionalAmount);

      // Skip if amount is zero
      if (totalAmount.isZero()) continue;

      // Check for installments
      if (setting.installmentAllowed && 
          setting.installmentThreshold && 
          totalAmount.toDecimal() > parseFloat(setting.installmentThreshold)) {
        
        const installmentCount = setting.installmentCount || 3;
        const baseAmount = totalAmount.divide(installmentCount);
        
        // Create parent projection
        const [parentProjection] = await db
          .insert(taxProjections)
          .values({
            userId,
            taxType: setting.taxType,
            referenceMonth: format(startDate, 'yyyy-MM-dd'),
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            baseAmount: totalRevenue.toDecimalString(),
            taxAmount: taxAmount.toDecimalString(),
            additionalAmount: additionalAmount?.toDecimalString(),
            totalAmount: totalAmount.toDecimalString(),
            status: 'projected',
            propertyDistribution: JSON.stringify(propertyRevenues.map(p => ({
              propertyId: p.propertyId,
              propertyName: p.propertyName,
              revenue: p.revenue.toDecimal(),
              taxAmount: totalAmount.multiply(p.revenue.toDecimal() / totalRevenue.toDecimal()).toDecimal()
            }))),
            selectedPropertyIds: JSON.stringify(selectedPropertyIds || [])
          })
          .returning();

        // Create installments
        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = addMonths(dueDate, i);
          let installmentAmount = baseAmount;
          
          // Add 1% interest for 2nd and 3rd installments
          if (i > 0) {
            installmentAmount = installmentAmount.multiply(1.01);
          }

          await db.insert(taxProjections).values({
            userId,
            taxType: setting.taxType,
            referenceMonth: format(startDate, 'yyyy-MM-dd'),
            dueDate: format(installmentDate, 'yyyy-MM-dd'),
            baseAmount: totalRevenue.toDecimalString(),
            taxAmount: installmentAmount.toDecimalString(),
            totalAmount: installmentAmount.toDecimalString(),
            status: 'projected',
            isInstallment: true,
            installmentNumber: i + 1,
            parentProjectionId: parentProjection.id,
            notes: `Parcela ${i + 1}/${installmentCount}`
          });
        }

        projections.push(parentProjection);
      } else {
        // Single payment
        const [projection] = await db
          .insert(taxProjections)
          .values({
            userId,
            taxType: setting.taxType,
            referenceMonth: format(startDate, 'yyyy-MM-dd'),
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            baseAmount: totalRevenue.toDecimalString(),
            taxAmount: taxAmount.toDecimalString(),
            additionalAmount: additionalAmount?.toDecimalString(),
            totalAmount: totalAmount.toDecimalString(),
            status: 'projected',
            propertyDistribution: JSON.stringify(propertyRevenues.map(p => ({
              propertyId: p.propertyId,
              propertyName: p.propertyName,
              revenue: p.revenue.toDecimal(),
              taxAmount: totalAmount.multiply(p.revenue.toDecimal() / totalRevenue.toDecimal()).toDecimal()
            }))),
            selectedPropertyIds: JSON.stringify(selectedPropertyIds || [])
          })
          .returning();

        projections.push(projection);
      }
    }

    return projections;
  }

  /**
   * Get tax projections for a period
   */
  async getTaxProjections(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    taxType?: string;
    status?: string;
  }): Promise<TaxProjection[]> {
    const conditions = [eq(taxProjections.userId, userId)];

    if (filters?.startDate) {
      conditions.push(gte(taxProjections.dueDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(taxProjections.dueDate, filters.endDate));
    }
    if (filters?.taxType) {
      conditions.push(eq(taxProjections.taxType, filters.taxType));
    }
    if (filters?.status) {
      conditions.push(eq(taxProjections.status, filters.status));
    }

    return await db
      .select()
      .from(taxProjections)
      .where(and(...conditions))
      .orderBy(taxProjections.dueDate, taxProjections.taxType);
  }

  /**
   * Update tax projection (manual override)
   */
  async updateTaxProjection(userId: string, projectionId: number, updates: {
    totalAmount?: number | string;
    notes?: string;
  }): Promise<TaxProjection> {
    const projection = await db
      .select()
      .from(taxProjections)
      .where(and(
        eq(taxProjections.id, projectionId),
        eq(taxProjections.userId, userId)
      ))
      .limit(1);

    if (!projection.length) {
      throw new Error('Projection not found');
    }

    const originalAmount = projection[0].totalAmount;
    const newAmount = updates.totalAmount 
      ? ServerMoneyUtils.parseUserInput(updates.totalAmount).toDecimalString()
      : originalAmount;

    const [updated] = await db
      .update(taxProjections)
      .set({
        totalAmount: newAmount,
        manualOverride: true,
        originalAmount: originalAmount,
        notes: updates.notes || projection[0].notes,
        updatedAt: new Date()
      })
      .where(and(
        eq(taxProjections.id, projectionId),
        eq(taxProjections.userId, userId)
      ))
      .returning();

    return updated;
  }

  /**
   * Confirm tax projection and create transaction
   */
  async confirmTaxProjection(userId: string, projectionId: number): Promise<{
    projection: TaxProjection;
    transaction: any;
  }> {
    const [projection] = await db
      .select()
      .from(taxProjections)
      .where(and(
        eq(taxProjections.id, projectionId),
        eq(taxProjections.userId, userId)
      ));

    if (!projection) {
      throw new Error('Projection not found');
    }

    // Create transaction for the tax payment
    const transaction = await this.transactionService.createTransaction(userId, {
      propertyId: null, // Company-level expense
      type: 'expense',
      category: 'taxes',
      description: `${projection.taxType} - Ref: ${format(new Date(projection.referenceMonth), 'MM/yyyy')}`,
      amount: projection.totalAmount,
      date: projection.dueDate,
      supplier: 'Receita Federal',
      notes: projection.notes || `Imposto ${projection.taxType} confirmado`
    });

    // Update projection status
    const [updatedProjection] = await db
      .update(taxProjections)
      .set({
        status: 'confirmed',
        transactionId: transaction.id,
        updatedAt: new Date()
      })
      .where(eq(taxProjections.id, projectionId))
      .returning();

    return {
      projection: updatedProjection,
      transaction
    };
  }

  /**
   * Recalculate projections when revenue changes
   */
  async recalculateProjectionsForMonth(userId: string, month: string): Promise<void> {
    // Delete existing projections that haven't been confirmed or manually edited
    await db
      .delete(taxProjections)
      .where(and(
        eq(taxProjections.userId, userId),
        eq(taxProjections.referenceMonth, month),
        eq(taxProjections.status, 'projected'),
        eq(taxProjections.manualOverride, false)
      ));

    // Recalculate projections
    await this.calculateTaxProjections(userId, month);
  }

  /**
   * Project taxes to cash flow
   */
  async projectTaxesToCashFlow(userId: string, startDate: string, endDate: string): Promise<any[]> {
    const projections = await this.getTaxProjections(userId, {
      startDate,
      endDate,
      status: 'projected'
    });

    const cashFlowEntries = [];

    for (const projection of projections) {
      const amount = ServerMoneyUtils.fromDecimal(projection.totalAmount);
      
      cashFlowEntries.push({
        date: projection.dueDate,
        type: 'expense',
        category: 'taxes',
        subcategory: projection.taxType,
        description: `${projection.taxType} - Ref: ${format(new Date(projection.referenceMonth), 'MM/yyyy')}`,
        amount: amount.toDecimal(),
        amountFormatted: amount.toBRL(),
        isProjected: true,
        projectionId: projection.id,
        notes: projection.isInstallment 
          ? `Parcela ${projection.installmentNumber}` 
          : undefined
      });
    }

    return cashFlowEntries;
  }

  /**
   * Generate tax report for a period
   */
  async generateTaxReport(userId: string, year: number): Promise<any> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Get all projections for the year
    const projections = await this.getTaxProjections(userId, {
      startDate,
      endDate
    });

    // Group by tax type and status
    const summary: Record<string, any> = {};

    for (const projection of projections) {
      if (!summary[projection.taxType]) {
        summary[projection.taxType] = {
          projected: Money.zero(),
          confirmed: Money.zero(),
          paid: Money.zero(),
          total: Money.zero()
        };
      }

      const amount = ServerMoneyUtils.fromDecimal(projection.totalAmount);
      summary[projection.taxType][projection.status] = 
        summary[projection.taxType][projection.status].add(amount);
      summary[projection.taxType].total = 
        summary[projection.taxType].total.add(amount);
    }

    // Format for output
    const formattedSummary = Object.entries(summary).map(([taxType, amounts]) => ({
      taxType,
      projected: amounts.projected.toDecimal(),
      projectedFormatted: amounts.projected.toBRL(),
      confirmed: amounts.confirmed.toDecimal(),
      confirmedFormatted: amounts.confirmed.toBRL(),
      paid: amounts.paid.toDecimal(),
      paidFormatted: amounts.paid.toBRL(),
      total: amounts.total.toDecimal(),
      totalFormatted: amounts.total.toBRL()
    }));

    const totalAmounts = {
      projected: MoneyUtils.sum(Object.values(summary).map((s: any) => s.projected)),
      confirmed: MoneyUtils.sum(Object.values(summary).map((s: any) => s.confirmed)),
      paid: MoneyUtils.sum(Object.values(summary).map((s: any) => s.paid)),
      total: MoneyUtils.sum(Object.values(summary).map((s: any) => s.total))
    };

    return {
      year,
      summary: formattedSummary,
      totals: {
        projected: totalAmounts.projected.toDecimal(),
        projectedFormatted: totalAmounts.projected.toBRL(),
        confirmed: totalAmounts.confirmed.toDecimal(),
        confirmedFormatted: totalAmounts.confirmed.toBRL(),
        paid: totalAmounts.paid.toDecimal(),
        paidFormatted: totalAmounts.paid.toBRL(),
        total: totalAmounts.total.toDecimal(),
        totalFormatted: totalAmounts.total.toBRL()
      },
      monthlyDetail: await this.getMonthlyTaxDetail(userId, year)
    };
  }

  /**
   * Get monthly tax detail
   */
  private async getMonthlyTaxDetail(userId: string, year: number): Promise<any[]> {
    const months = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = endOfMonth(startDate);
      
      const projections = await this.getTaxProjections(userId, {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      });

      if (projections.length > 0) {
        const monthData: Record<string, Money> = {};
        
        for (const projection of projections) {
          if (!monthData[projection.taxType]) {
            monthData[projection.taxType] = Money.zero();
          }
          monthData[projection.taxType] = monthData[projection.taxType]
            .add(ServerMoneyUtils.fromDecimal(projection.totalAmount));
        }

        months.push({
          month: format(startDate, 'MM/yyyy'),
          ...Object.fromEntries(
            Object.entries(monthData).map(([tax, amount]) => [
              tax.toLowerCase(),
              {
                amount: amount.toDecimal(),
                formatted: amount.toBRL()
              }
            ])
          )
        });
      }
    }

    return months;
  }
}