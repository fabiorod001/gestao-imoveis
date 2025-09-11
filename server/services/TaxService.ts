import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { TransactionService } from "./TransactionService";
import { db } from "../db";
import { transactions, properties, taxPayments } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";

/**
 * Service for tax calculation and payment operations
 */
export class TaxService extends BaseService {
  private transactionService: TransactionService;

  constructor(storage: IStorage) {
    super(storage);
    this.transactionService = new TransactionService(storage);
  }

  /**
   * Record simple tax payment
   */
  async recordSimpleTaxPayment(userId: string, data: {
    amount: number | string;
    date: string;
    description?: string;
    type: string;
  }): Promise<any> {
    const parsedAmount = typeof data.amount === 'string' 
      ? parseFloat(data.amount.replace(/\./g, '').replace(',', '.'))
      : data.amount;

    const transaction = await this.transactionService.createTransaction(userId, {
      propertyId: null, // Company-level tax
      type: 'expense',
      category: 'taxes',
      description: data.description || `Pagamento de ${data.type}`,
      amount: parsedAmount,
      date: data.date,
      supplier: 'Receita Federal',
      notes: `Imposto: ${data.type}`
    });

    return {
      success: true,
      transaction,
      message: 'Pagamento de imposto registrado com sucesso'
    };
  }

  /**
   * Generate tax payment preview based on revenue
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
        totalRevenue: sql<number>`SUM(${transactions.amount})`
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

    const totalRevenue = revenueData.reduce((sum, prop) => sum + Number(prop.totalRevenue), 0);
    const taxAmount = totalRevenue * (data.rate / 100);

    const distribution = revenueData.map(prop => ({
      propertyId: prop.propertyId,
      propertyName: prop.propertyName,
      revenue: Number(prop.totalRevenue),
      taxAmount: Number(prop.totalRevenue) * (data.rate / 100)
    }));

    return {
      referenceMonth: data.referenceMonth,
      taxType: data.taxType,
      rate: data.rate,
      totalRevenue,
      taxAmount,
      distribution
    };
  }

  /**
   * Calculate PIS/COFINS based on revenue
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
        revenue: sql<number>`SUM(${transactions.amount})`
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

    const totalRevenue = revenueData.reduce((sum, prop) => sum + Number(prop.revenue), 0);
    const pisAmount = totalRevenue * (pisRate / 100);
    const cofinsAmount = totalRevenue * (cofinsRate / 100);
    const totalTax = pisAmount + cofinsAmount;

    return {
      referenceMonth: data.referenceMonth,
      regime,
      totalRevenue,
      pisRate,
      cofinsRate,
      pisAmount,
      cofinsAmount,
      totalTax,
      propertyDetails: revenueData.map(prop => ({
        propertyName: prop.propertyName,
        revenue: Number(prop.revenue),
        pis: Number(prop.revenue) * (pisRate / 100),
        cofins: Number(prop.revenue) * (cofinsRate / 100),
        total: Number(prop.revenue) * ((pisRate + cofinsRate) / 100)
      }))
    };
  }

  /**
   * Record tax payment with installments support
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
    const parsedTotalAmount = typeof data.totalAmount === 'string' 
      ? parseFloat(data.totalAmount.replace(/\./g, '').replace(',', '.'))
      : data.totalAmount;

    const installments = data.installments || 1;
    const installmentAmount = parsedTotalAmount / installments;
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
        amount: installmentAmount.toString(),
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
          amount: installmentAmount,
          date: format(dueDate, 'yyyy-MM-dd'),
          supplier: 'Receita Federal',
          notes: `Imposto referente a ${data.referenceMonth}`
        });
      }
    }

    // If there's property distribution, create child transactions
    if (data.propertyDistribution && data.propertyDistribution.length > 0) {
      for (const dist of data.propertyDistribution) {
        await this.transactionService.createTransaction(userId, {
          propertyId: dist.propertyId,
          type: 'expense',
          category: 'taxes',
          description: `${data.taxType} - Ref: ${data.referenceMonth}`,
          amount: dist.amount,
          date: data.firstDueDate,
          supplier: 'Receita Federal',
          notes: `Parte proporcional do imposto`
        });
      }
    }

    return {
      success: true,
      payments: createdPayments,
      message: installments > 1 
        ? `Parcelamento de ${data.taxType} criado com sucesso (${installments}x)`
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

    return payments;
  }

  /**
   * Mark tax payment as paid
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
      // Create expense transaction for the payment
      await this.transactionService.createTransaction(userId, {
        propertyId: null,
        type: 'expense',
        category: 'taxes',
        description: `${payment.taxType} - Parcela ${payment.installmentNumber}/${payment.totalInstallments}`,
        amount: parseFloat(payment.amount),
        date: payment.paymentDate!,
        supplier: 'Receita Federal',
        notes: `Referência: ${payment.referenceMonth}`
      });
    }

    return {
      success: true,
      payment,
      message: 'Pagamento de imposto confirmado'
    };
  }

  /**
   * Calculate tax summary for a period
   */
  async getTaxSummary(userId: string, year: number): Promise<any> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Get all tax expenses for the year
    const taxExpenses = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'MM/YYYY')`,
        amount: sql<number>`SUM(${transactions.amount})`
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
        revenue: sql<number>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`);

    const totalTaxPaid = taxExpenses.reduce((sum, row) => sum + Number(row.amount), 0);
    const totalRevenue = revenueData.reduce((sum, row) => sum + Number(row.revenue), 0);
    const effectiveRate = totalRevenue > 0 ? (totalTaxPaid / totalRevenue) * 100 : 0;

    return {
      year,
      totalTaxPaid,
      totalRevenue,
      effectiveRate,
      monthlyBreakdown: taxExpenses.map(row => ({
        month: row.month,
        amount: Number(row.amount)
      })),
      averageMonthlyTax: taxExpenses.length > 0 ? totalTaxPaid / taxExpenses.length : 0
    };
  }
}