import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { TransactionService } from "./TransactionService";
import { db } from "../db";
import { transactions, properties, taxPayments } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format } from "date-fns";
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
}