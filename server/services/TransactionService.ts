import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import type { Transaction, InsertTransaction } from "@shared/schema";
import { insertTransactionSchema, transactions, properties } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { Money, ServerMoneyUtils, MoneyUtils } from "../utils/money";

/**
 * Service for managing transaction-related operations with precise Money handling
 */
export class TransactionService extends BaseService {
  private taxService: any; // Will be injected to avoid circular dependency

  constructor(storage: IStorage) {
    super(storage);
  }

  // Set the tax service instance (to avoid circular dependency)
  setTaxService(taxService: any): void {
    this.taxService = taxService;
  }

  /**
   * Get all transactions for a user with enriched property names - OPTIMIZED
   */
  async getTransactions(userId: string, type?: string, limit?: number): Promise<any[]> {
    // Use a single optimized query with JOIN to avoid N+1 problem
    const query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        propertyId: transactions.propertyId,
        type: transactions.type,
        category: transactions.category,
        amount: transactions.amount,
        date: transactions.date,
        description: transactions.description,
        referenceCode: transactions.referenceCode,
        paymentMethod: transactions.paymentMethod,
        notes: transactions.notes,
        tags: transactions.tags,
        isRecurring: transactions.isRecurring,
        recurringFrequency: transactions.recurringFrequency,
        supplier: transactions.supplier,
        propertyName: properties.name,
        isBeforeMarco: transactions.isBeforeMarco,
        isHistorical: transactions.isHistorical,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(
        and(
          eq(transactions.userId, userId),
          type ? eq(transactions.type, type) : sql`true`
        )
      )
      .orderBy(desc(transactions.date))
      .limit(limit || 1000);

    const results = await query;
    
    // Enrich with formatted amounts
    return results.map(transaction => {
      const amountMoney = ServerMoneyUtils.fromDecimal(transaction.amount);
      return {
        ...transaction,
        amountMoney,
        amountFormatted: amountMoney.toBRL(),
        amountValue: amountMoney.toDecimal(),
        propertyName: transaction.propertyName || 'Unknown Property'
      };
    });
  }

  /**
   * Get transactions for a specific property
   */
  async getTransactionsByProperty(propertyId: number, userId: string): Promise<Transaction[]> {
    const transactions = await this.storage.getTransactionsByProperty(propertyId, userId);
    
    // Enrich with Money formatting
    return transactions.map(transaction => {
      const amountMoney = ServerMoneyUtils.fromDecimal(transaction.amount);
      return {
        ...transaction,
        amountFormatted: amountMoney.toBRL(),
        amountValue: amountMoney.toDecimal()
      } as any;
    });
  }

  /**
   * Create a new transaction with Money precision
   */
  async createTransaction(userId: string, data: any): Promise<Transaction> {
    try {
      console.log("Creating transaction with data:", JSON.stringify(data, null, 2));
      
      // Parse amount using Money for precision
      const amount = ServerMoneyUtils.parseUserInput(data.amount);
      
      // Parse and validate the data
      const transactionData = {
        ...data,
        userId,
        amount: amount.toDecimal(), // Store as decimal
        date: data.date ? new Date(data.date) : new Date(),
        accommodationStartDate: data.accommodationStartDate ? new Date(data.accommodationStartDate) : undefined,
        accommodationEndDate: data.accommodationEndDate ? new Date(data.accommodationEndDate) : undefined,
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : undefined,
      };
      
      const validatedData = insertTransactionSchema.parse(transactionData);
      const created = await this.storage.createTransaction(validatedData);
      
      // If it's a revenue transaction, recalculate tax projections
      if (created.type === 'revenue' && this.taxService && !created.isHistorical) {
        try {
          const monthStr = format(new Date(created.date), 'yyyy-MM');
          await this.taxService.recalculateProjectionsForMonth(userId, monthStr);
          console.log(`Tax projections recalculated for ${monthStr} after revenue transaction`);
        } catch (error) {
          console.error('Failed to recalculate tax projections:', error);
          // Don't fail the transaction creation if tax recalculation fails
        }
      }
      
      // Return with formatted amount
      const createdAmount = ServerMoneyUtils.fromDecimal(created.amount);
      return {
        ...created,
        amountFormatted: createdAmount.toBRL(),
        amountValue: createdAmount.toDecimal()
      } as any;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing transaction with Money precision
   */
  async updateTransaction(id: number, userId: string, data: any): Promise<Transaction | undefined> {
    try {
      // Parse amount using Money if provided
      let transactionData: any = { ...data };
      
      if (data.amount !== undefined) {
        const amount = ServerMoneyUtils.parseUserInput(data.amount);
        transactionData.amount = amount.toDecimal();
      }
      
      // Parse dates
      if (data.date) transactionData.date = new Date(data.date);
      if (data.accommodationStartDate) transactionData.accommodationStartDate = new Date(data.accommodationStartDate);
      if (data.accommodationEndDate) transactionData.accommodationEndDate = new Date(data.accommodationEndDate);
      if (data.recurringEndDate) transactionData.recurringEndDate = new Date(data.recurringEndDate);
      
      const validatedData = insertTransactionSchema.partial().parse(transactionData);
      const updated = await this.storage.updateTransaction(id, validatedData, userId);
      
      if (updated) {
        // If it's a revenue transaction, recalculate tax projections
        if (updated.type === 'revenue' && this.taxService && !updated.isHistorical) {
          try {
            const monthStr = format(new Date(updated.date), 'yyyy-MM');
            await this.taxService.recalculateProjectionsForMonth(userId, monthStr);
            console.log(`Tax projections recalculated for ${monthStr} after revenue update`);
          } catch (error) {
            console.error('Failed to recalculate tax projections:', error);
            // Don't fail the transaction update if tax recalculation fails
          }
        }
        
        const updatedAmount = ServerMoneyUtils.fromDecimal(updated.amount);
        return {
          ...updated,
          amountFormatted: updatedAmount.toBRL(),
          amountValue: updatedAmount.toDecimal()
        } as any;
      }
      
      return updated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: number, userId: string): Promise<boolean> {
    return await this.storage.deleteTransaction(id, userId);
  }

  /**
   * Get expense dashboard data with Money formatting
   */
  async getExpenseDashboardData(userId: string): Promise<any[]> {
    const expenseData = await db
      .select({
        id: transactions.id,
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        date: transactions.date,
        amount: transactions.amount,
        type: transactions.type,
        category: transactions.category,
        description: transactions.description,
        supplier: transactions.supplier,
        cpfCnpj: transactions.cpfCnpj,
        parentTransactionId: transactions.parentTransactionId,
        isCompositeParent: transactions.isCompositeParent
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        sql`${transactions.propertyId} IS NOT NULL` // Exclude parent transactions
      ))
      .orderBy(desc(transactions.date));
    
    // Format amounts using Money
    return expenseData.map(expense => {
      const amountMoney = ServerMoneyUtils.fromDecimal(expense.amount);
      return {
        ...expense,
        amountMoney,
        amountFormatted: amountMoney.toBRL(),
        amountValue: amountMoney.toDecimal()
      };
    });
  }

  /**
   * Create a composite expense with parent and child transactions using Money
   */
  async createCompositeExpense(data: {
    userId: string;
    propertyId: number;
    description: string;
    date: string;
    supplier?: string;
    cpfCnpj?: string;
    totalAmount: number | string;
    components: any[];
  }): Promise<any> {
    // Parse total amount using Money
    const totalAmount = ServerMoneyUtils.parseUserInput(data.totalAmount);
    
    // Parse component amounts
    const componentsWithMoney = data.components.map(comp => ({
      ...comp,
      amountMoney: ServerMoneyUtils.parseUserInput(comp.amount)
    }));
    
    // Validate that components sum to total
    const componentSum = MoneyUtils.sum(componentsWithMoney.map(c => c.amountMoney));
    if (!componentSum.equals(totalAmount)) {
      throw new Error(`Soma dos componentes (${componentSum.toBRL()}) não é igual ao total (${totalAmount.toBRL()})`);
    }
    
    const result = await this.storage.createCompositeExpense({
      ...data,
      totalAmount: totalAmount.toDecimal(),
      components: componentsWithMoney.map(comp => ({
        ...comp,
        amount: comp.amountMoney.toDecimal()
      }))
    });
    
    return {
      ...result,
      totalAmountFormatted: totalAmount.toBRL()
    };
  }

  /**
   * Create management expense with Money precision
   */
  async createManagementExpense(userId: string, data: {
    totalAmount: number | string;
    paymentDate: string;
    description?: string;
    supplier: string;
    cpfCnpj?: string;
    distribution: Array<{
      propertyId: number;
      amount: number | string;
      percentage: number;
    }>;
  }): Promise<any> {
    if (!data.totalAmount || !data.paymentDate || !data.supplier || !data.distribution || data.distribution.length === 0) {
      throw new Error("Dados obrigatórios faltando");
    }
    
    // Parse total amount using Money
    const totalAmount = ServerMoneyUtils.parseUserInput(data.totalAmount);

    // Create the main transaction (parent) without propertyId
    const mainTransaction = await db.insert(transactions).values({
      userId,
      propertyId: null, // This is a consolidated payment
      type: 'expense',
      category: 'management',
      amount: totalAmount.toDecimal(),
      description: data.description || `Gestão - ${data.supplier}`,
      date: new Date(data.paymentDate),
      supplier: data.supplier,
      cpfCnpj: data.cpfCnpj || null,
      isCompositeParent: true,
      notes: `Pagamento consolidado de gestão para ${data.distribution.length} propriedades`
    }).returning();

    const parentId = mainTransaction[0].id;
    
    // Create child transactions for each property with Money precision
    const childTransactions = [];
    for (const item of data.distribution) {
      const itemAmount = ServerMoneyUtils.parseUserInput(item.amount);
      
      const childTransaction = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'management',
        amount: itemAmount.toDecimal(),
        description: `${data.description || `Gestão - ${data.supplier}`} - ${item.percentage.toFixed(1)}%`,
        date: new Date(data.paymentDate),
        supplier: data.supplier,
        cpfCnpj: data.cpfCnpj || null,
        parentTransactionId: parentId,
        notes: `Parte do pagamento consolidado de ${format(new Date(data.paymentDate), 'dd/MM/yyyy')}`
      }).returning();
      
      childTransactions.push({
        ...childTransaction[0],
        amountFormatted: itemAmount.toBRL()
      });
    }
    
    return { 
      success: true, 
      mainTransaction: {
        ...mainTransaction[0],
        amountFormatted: totalAmount.toBRL()
      },
      transactions: childTransactions,
      message: 'Despesa de gestão cadastrada com sucesso!' 
    };
  }

  /**
   * Get management expense details for editing with Money formatting
   */
  async getManagementExpense(id: number, userId: string): Promise<any> {
    // Get the parent transaction
    const parentTransaction = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        eq(transactions.isCompositeParent, true)
      ))
      .limit(1);
    
    if (parentTransaction.length === 0) {
      throw new Error("Transaction not found");
    }
    
    // Get child transactions
    const childTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.parentTransactionId, id));
    
    // Use Money for calculations
    const parentAmount = ServerMoneyUtils.fromDecimal(parentTransaction[0].amount).abs();
    
    // Calculate distribution with Money precision
    const distribution = childTransactions.map(child => {
      const childAmount = ServerMoneyUtils.fromDecimal(child.amount).abs();
      const percentage = parentAmount.isZero() ? 0 : (childAmount.toDecimal() / parentAmount.toDecimal()) * 100;
      
      return {
        propertyId: child.propertyId,
        amount: childAmount.toDecimal(),
        amountFormatted: childAmount.toBRL(),
        percentage
      };
    });
    
    return {
      id: parentTransaction[0].id,
      totalAmount: parentAmount.toDecimal(),
      totalAmountFormatted: parentAmount.toBRL(),
      paymentDate: parentTransaction[0].date,
      description: parentTransaction[0].description,
      supplier: parentTransaction[0].supplier,
      cpfCnpj: parentTransaction[0].cpfCnpj,
      distribution
    };
  }

  /**
   * Update management expense with Money precision
   */
  async updateManagementExpense(id: number, userId: string, data: any): Promise<any> {
    const { totalAmount, paymentDate, description, supplier, cpfCnpj, distribution } = data;
    
    if (!totalAmount || !paymentDate || !supplier || !distribution || distribution.length === 0) {
      throw new Error("Dados obrigatórios faltando");
    }
    
    // Parse total amount using Money
    const totalAmountMoney = ServerMoneyUtils.parseUserInput(totalAmount);

    // Delete existing child transactions
    await db.delete(transactions)
      .where(eq(transactions.parentTransactionId, id));

    // Update parent transaction
    await db.update(transactions)
      .set({
        amount: totalAmountMoney.toDecimal(),
        description: description || `Gestão - ${supplier}`,
        date: new Date(paymentDate),
        supplier,
        cpfCnpj: cpfCnpj || null,
        notes: `Pagamento consolidado de gestão para ${distribution.length} propriedades`
      })
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));

    // Create new child transactions with Money precision
    const childTransactions = [];
    for (const item of distribution) {
      const itemAmount = ServerMoneyUtils.parseUserInput(item.amount);
      
      const childTransaction = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'management',
        amount: itemAmount.toDecimal(),
        description: `${description || `Gestão - ${supplier}`} - ${item.percentage.toFixed(1)}%`,
        date: new Date(paymentDate),
        supplier,
        cpfCnpj: cpfCnpj || null,
        parentTransactionId: id,
        notes: `Parte do pagamento consolidado de ${format(new Date(paymentDate), 'dd/MM/yyyy')}`
      }).returning();
      
      childTransactions.push({
        ...childTransaction[0],
        amountFormatted: itemAmount.toBRL()
      });
    }
    
    return { 
      success: true, 
      transactions: childTransactions,
      totalAmountFormatted: totalAmountMoney.toBRL(),
      message: 'Despesa de gestão atualizada com sucesso!' 
    };
  }

  /**
   * Create distributed expense with Money precision
   */
  async createDistributedExpense(userId: string, data: any): Promise<any> {
    const { totalAmount, description, supplier, cpfCnpj, date, distribution } = data;
    
    // Parse total amount using Money
    const totalAmountMoney = ServerMoneyUtils.parseUserInput(totalAmount);
    
    // Create parent transaction
    const [parentTransaction] = await db.insert(transactions).values({
      userId,
      propertyId: null,
      type: 'expense',
      category: 'distributed',
      description: description || 'Despesa distribuída',
      amount: totalAmountMoney.toDecimal(),
      date: new Date(date),
      supplier,
      cpfCnpj,
      isCompositeParent: true,
      notes: `Distribuído proporcionalmente entre ${distribution.length} propriedades`
    }).returning();
    
    // Create child transactions with Money precision
    const childTransactions = [];
    for (const item of distribution) {
      const itemAmount = ServerMoneyUtils.parseUserInput(item.amount);
      
      const [child] = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'distributed',
        description: `${description || 'Despesa distribuída'} (${item.percentage.toFixed(1)}%)`,
        amount: itemAmount.toDecimal(),
        date: new Date(date),
        supplier,
        cpfCnpj,
        parentTransactionId: parentTransaction.id,
        notes: `${item.percentage.toFixed(1)}% do total`
      }).returning();
      
      childTransactions.push({
        ...child,
        amountFormatted: itemAmount.toBRL()
      });
    }
    
    return {
      success: true,
      parentTransaction: {
        ...parentTransaction,
        amountFormatted: totalAmountMoney.toBRL()
      },
      childTransactions,
      message: 'Despesa distribuída criada com sucesso!'
    };
  }

  /**
   * Generate preview for distributed expense with Money precision
   */
  async generateDistributedExpensePreview(userId: string, data: any): Promise<any> {
    const { totalAmount, referenceMonth, selectedPropertyIds } = data;
    
    if (!totalAmount || !referenceMonth || !selectedPropertyIds?.length) {
      throw new Error('Campos obrigatórios não preenchidos');
    }
    
    // Parse total amount using Money
    const totalAmountMoney = ServerMoneyUtils.parseUserInput(totalAmount);
    
    const [year, month] = referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get revenue for selected properties in reference month
    const revenueData = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        totalRevenue: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` // Changed to string for Money conversion
      })
      .from(transactions)
      .innerJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        sql`${transactions.propertyId} IN (${selectedPropertyIds.join(',')})`,
        sql`${transactions.date} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${transactions.date} <= ${endDate.toISOString().split('T')[0]}`
      ))
      .groupBy(transactions.propertyId, properties.name);
    
    // Calculate using Money for precision
    const revenueMoneyList = revenueData.map(prop => ({
      ...prop,
      revenueMoney: ServerMoneyUtils.fromDecimal(prop.totalRevenue)
    }));
    
    const totalRevenue = MoneyUtils.sum(revenueMoneyList.map(p => p.revenueMoney));
    
    // Calculate distribution with Money precision
    const distribution = revenueMoneyList.map(prop => {
      const percentage = totalRevenue.isZero() ? 0 : (prop.revenueMoney.toDecimal() / totalRevenue.toDecimal()) * 100;
      const amount = totalRevenue.isZero() ? Money.zero() : totalAmountMoney.multiply(percentage / 100);
      
      return {
        propertyId: prop.propertyId,
        propertyName: prop.propertyName,
        revenue: prop.revenueMoney.toDecimal(),
        revenueFormatted: prop.revenueMoney.toBRL(),
        percentage,
        amount: amount.toDecimal(),
        amountFormatted: amount.toBRL()
      };
    });
    
    return {
      totalAmount: totalAmountMoney.toDecimal(),
      totalAmountFormatted: totalAmountMoney.toBRL(),
      referenceMonth,
      distribution,
      totalRevenue: totalRevenue.toDecimal(),
      totalRevenueFormatted: totalRevenue.toBRL()
    };
  }

  /**
   * Create company-level expense with Money precision
   */
  async createCompanyExpense(userId: string, data: any): Promise<Transaction> {
    // Parse amount using Money
    const amount = ServerMoneyUtils.parseUserInput(data.amount);
    
    const transactionData = {
      userId,
      propertyId: null, // Company expenses don't have a property
      type: 'expense',
      category: data.category || 'company',
      description: data.description,
      amount: amount.toDecimal(),
      date: new Date(data.date),
      supplier: data.supplier,
      cpfCnpj: data.cpfCnpj,
      notes: data.notes
    };
    
    const validatedData = insertTransactionSchema.parse(transactionData);
    const created = await this.storage.createTransaction(validatedData);
    
    // Return with formatted amount
    const createdAmount = ServerMoneyUtils.fromDecimal(created.amount);
    return {
      ...created,
      amountFormatted: createdAmount.toBRL(),
      amountValue: createdAmount.toDecimal()
    } as any;
  }

  /**
   * Create batch cleaning expenses with Money precision
   */
  async createCleaningBatch(userId: string, data: any): Promise<any> {
    const { expenses } = data;
    const results = [];
    const errors = [];
    
    for (const expense of expenses) {
      try {
        // Parse amount using Money
        const amount = ServerMoneyUtils.parseUserInput(expense.amount);
        
        const transaction = await this.createTransaction(userId, {
          propertyId: expense.propertyId,
          type: 'expense',
          category: 'cleaning',
          description: expense.description || 'Limpeza',
          amount: amount.toDecimalString(),
          date: expense.date,
          supplier: expense.supplier || 'Serviço de Limpeza',
          notes: expense.notes
        });
        results.push(transaction);
      } catch (error) {
        errors.push({
          expense,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Calculate total using Money
    const totalAmount = MoneyUtils.sum(results.map(r => ServerMoneyUtils.fromDecimal(r.amount)));
    
    return {
      success: errors.length === 0,
      created: results.length,
      totalAmount: totalAmount.toDecimal(),
      totalAmountFormatted: totalAmount.toBRL(),
      errors,
      transactions: results
    };
  }

  /**
   * Cleanup transactions for debugging
   */
  async cleanupTransactions(userId: string, propertyIds?: number[]): Promise<any> {
    const conditions = [eq(transactions.userId, userId)];
    
    if (propertyIds && propertyIds.length > 0) {
      conditions.push(sql`${transactions.propertyId} IN (${propertyIds.join(',')})`);
    }
    
    // Delete transactions with the specified conditions
    await db.delete(transactions).where(and(...conditions));
    
    return { success: true, message: 'Transactions cleaned up successfully' };
  }
}