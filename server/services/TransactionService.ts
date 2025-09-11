import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import type { Transaction, InsertTransaction } from "@shared/schema";
import { insertTransactionSchema, transactions, properties } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import { format } from "date-fns";

/**
 * Service for managing transaction-related operations
 */
export class TransactionService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Get all transactions for a user with enriched property names
   */
  async getTransactions(userId: string, type?: string, limit?: number): Promise<any[]> {
    let transactions;
    
    if (type) {
      transactions = await this.storage.getTransactionsByType(userId, type, limit);
    } else {
      transactions = await this.storage.getTransactions(userId, limit);
    }
    
    // Include property names in transactions
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.propertyId) {
          const property = await this.storage.getProperty(transaction.propertyId, userId);
          return {
            ...transaction,
            propertyName: property?.name || 'Unknown Property'
          };
        }
        return transaction;
      })
    );
    
    return enrichedTransactions;
  }

  /**
   * Get transactions for a specific property
   */
  async getTransactionsByProperty(propertyId: number, userId: string): Promise<Transaction[]> {
    return await this.storage.getTransactionsByProperty(propertyId, userId);
  }

  /**
   * Create a new transaction
   */
  async createTransaction(userId: string, data: any): Promise<Transaction> {
    try {
      console.log("Creating transaction with data:", JSON.stringify(data, null, 2));
      
      // Parse and validate the data
      const transactionData = {
        ...data,
        userId,
        amount: typeof data.amount === 'string' 
          ? parseFloat(data.amount.replace(/\./g, '').replace(',', '.'))
          : data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        accommodationStartDate: data.accommodationStartDate ? new Date(data.accommodationStartDate) : undefined,
        accommodationEndDate: data.accommodationEndDate ? new Date(data.accommodationEndDate) : undefined,
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : undefined,
      };
      
      const validatedData = insertTransactionSchema.parse(transactionData);
      return await this.storage.createTransaction(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(id: number, userId: string, data: any): Promise<Transaction | undefined> {
    try {
      const transactionData = {
        ...data,
        amount: typeof data.amount === 'string' 
          ? parseFloat(data.amount.replace(/\./g, '').replace(',', '.'))
          : data.amount,
        date: data.date ? new Date(data.date) : undefined,
        accommodationStartDate: data.accommodationStartDate ? new Date(data.accommodationStartDate) : undefined,
        accommodationEndDate: data.accommodationEndDate ? new Date(data.accommodationEndDate) : undefined,
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : undefined,
      };
      
      const validatedData = insertTransactionSchema.partial().parse(transactionData);
      return await this.storage.updateTransaction(id, validatedData, userId);
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
   * Get expense dashboard data - optimized query
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
    
    return expenseData;
  }

  /**
   * Create a composite expense with parent and child transactions
   */
  async createCompositeExpense(data: {
    userId: string;
    propertyId: number;
    description: string;
    date: string;
    supplier?: string;
    cpfCnpj?: string;
    totalAmount: number;
    components: any[];
  }): Promise<any> {
    return await this.storage.createCompositeExpense(data);
  }

  /**
   * Create management expense (distributed expense)
   */
  async createManagementExpense(userId: string, data: {
    totalAmount: number | string;
    paymentDate: string;
    description?: string;
    supplier: string;
    cpfCnpj?: string;
    distribution: Array<{
      propertyId: number;
      amount: number;
      percentage: number;
    }>;
  }): Promise<any> {
    if (!data.totalAmount || !data.paymentDate || !data.supplier || !data.distribution || data.distribution.length === 0) {
      throw new Error("Dados obrigatórios faltando");
    }
    
    // Parse total amount
    const parsedTotalAmount = typeof data.totalAmount === 'string' 
      ? parseFloat(data.totalAmount.replace(/\./g, '').replace(',', '.'))
      : data.totalAmount;

    // Create the main transaction (parent) without propertyId
    const mainTransaction = await db.insert(transactions).values({
      userId,
      propertyId: null, // This is a consolidated payment
      type: 'expense',
      category: 'management',
      amount: parsedTotalAmount,
      description: data.description || `Gestão - ${data.supplier}`,
      date: new Date(data.paymentDate),
      supplier: data.supplier,
      cpfCnpj: data.cpfCnpj || null,
      isCompositeParent: true,
      notes: `Pagamento consolidado de gestão para ${data.distribution.length} propriedades`
    }).returning();

    const parentId = mainTransaction[0].id;
    
    // Create child transactions for each property
    const childTransactions = [];
    for (const item of data.distribution) {
      const childTransaction = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'management',
        amount: item.amount,
        description: `${data.description || `Gestão - ${data.supplier}`} - ${item.percentage.toFixed(1)}%`,
        date: new Date(data.paymentDate),
        supplier: data.supplier,
        cpfCnpj: data.cpfCnpj || null,
        parentTransactionId: parentId,
        notes: `Parte do pagamento consolidado de ${format(new Date(data.paymentDate), 'dd/MM/yyyy')}`
      }).returning();
      
      childTransactions.push(childTransaction[0]);
    }
    
    return { 
      success: true, 
      mainTransaction: mainTransaction[0],
      transactions: childTransactions,
      message: 'Despesa de gestão cadastrada com sucesso!' 
    };
  }

  /**
   * Get management expense details for editing
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
    
    // Calculate distribution
    const distribution = childTransactions.map(child => ({
      propertyId: child.propertyId,
      amount: Math.abs(child.amount),
      percentage: (Math.abs(child.amount) / Math.abs(parentTransaction[0].amount)) * 100
    }));
    
    return {
      id: parentTransaction[0].id,
      totalAmount: Math.abs(parentTransaction[0].amount),
      paymentDate: parentTransaction[0].date,
      description: parentTransaction[0].description,
      supplier: parentTransaction[0].supplier,
      cpfCnpj: parentTransaction[0].cpfCnpj,
      distribution
    };
  }

  /**
   * Update management expense
   */
  async updateManagementExpense(id: number, userId: string, data: any): Promise<any> {
    const { totalAmount, paymentDate, description, supplier, cpfCnpj, distribution } = data;
    
    if (!totalAmount || !paymentDate || !supplier || !distribution || distribution.length === 0) {
      throw new Error("Dados obrigatórios faltando");
    }
    
    // Parse total amount
    const parsedTotalAmount = typeof totalAmount === 'string' 
      ? parseFloat(totalAmount.replace(/\./g, '').replace(',', '.'))
      : totalAmount;

    // Delete existing child transactions
    await db.delete(transactions)
      .where(eq(transactions.parentTransactionId, id));

    // Update parent transaction
    await db.update(transactions)
      .set({
        amount: parsedTotalAmount,
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

    // Create new child transactions
    const childTransactions = [];
    for (const item of distribution) {
      const childTransaction = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'management',
        amount: item.amount,
        description: `${description || `Gestão - ${supplier}`} - ${item.percentage.toFixed(1)}%`,
        date: new Date(paymentDate),
        supplier,
        cpfCnpj: cpfCnpj || null,
        parentTransactionId: id,
        notes: `Parte do pagamento consolidado de ${format(new Date(paymentDate), 'dd/MM/yyyy')}`
      }).returning();
      
      childTransactions.push(childTransaction[0]);
    }
    
    return { 
      success: true, 
      transactions: childTransactions,
      message: 'Despesa de gestão atualizada com sucesso!' 
    };
  }

  /**
   * Create distributed expense based on property revenue
   */
  async createDistributedExpense(userId: string, data: any): Promise<any> {
    const { totalAmount, description, supplier, cpfCnpj, date, distribution } = data;
    
    // Create parent transaction
    const [parentTransaction] = await db.insert(transactions).values({
      userId,
      propertyId: null,
      type: 'expense',
      category: 'distributed',
      description: description || 'Despesa distribuída',
      amount: totalAmount,
      date: new Date(date),
      supplier,
      cpfCnpj,
      isCompositeParent: true,
      notes: `Distribuído proporcionalmente entre ${distribution.length} propriedades`
    }).returning();
    
    // Create child transactions
    const childTransactions = [];
    for (const item of distribution) {
      const [child] = await db.insert(transactions).values({
        userId,
        propertyId: item.propertyId,
        type: 'expense',
        category: 'distributed',
        description: `${description || 'Despesa distribuída'} (${item.percentage.toFixed(1)}%)`,
        amount: item.amount,
        date: new Date(date),
        supplier,
        cpfCnpj,
        parentTransactionId: parentTransaction.id,
        notes: `${item.percentage.toFixed(1)}% do total`
      }).returning();
      
      childTransactions.push(child);
    }
    
    return {
      success: true,
      parentTransaction,
      childTransactions,
      message: 'Despesa distribuída criada com sucesso!'
    };
  }

  /**
   * Generate preview for distributed expense
   */
  async generateDistributedExpensePreview(userId: string, data: any): Promise<any> {
    const { totalAmount, referenceMonth, selectedPropertyIds } = data;
    
    if (!totalAmount || !referenceMonth || !selectedPropertyIds?.length) {
      throw new Error('Campos obrigatórios não preenchidos');
    }
    
    const [year, month] = referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get revenue for selected properties in reference month
    const revenueData = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: properties.name,
        totalRevenue: sql<number>`SUM(${transactions.amount})`
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
    
    const totalRevenue = revenueData.reduce((sum, prop) => sum + Number(prop.totalRevenue), 0);
    
    const distribution = revenueData.map(prop => ({
      propertyId: prop.propertyId,
      propertyName: prop.propertyName,
      revenue: Number(prop.totalRevenue),
      percentage: totalRevenue > 0 ? (Number(prop.totalRevenue) / totalRevenue) * 100 : 0,
      amount: totalRevenue > 0 ? (Number(prop.totalRevenue) / totalRevenue) * totalAmount : 0
    }));
    
    return {
      totalAmount,
      referenceMonth,
      distribution,
      totalRevenue
    };
  }

  /**
   * Create company-level expense
   */
  async createCompanyExpense(userId: string, data: any): Promise<Transaction> {
    const transactionData = {
      userId,
      propertyId: null, // Company expenses don't have a property
      type: 'expense',
      category: data.category || 'company',
      description: data.description,
      amount: typeof data.amount === 'string' 
        ? parseFloat(data.amount.replace(/\./g, '').replace(',', '.'))
        : data.amount,
      date: new Date(data.date),
      supplier: data.supplier,
      cpfCnpj: data.cpfCnpj,
      notes: data.notes
    };
    
    const validatedData = insertTransactionSchema.parse(transactionData);
    return await this.storage.createTransaction(validatedData);
  }

  /**
   * Create batch cleaning expenses
   */
  async createCleaningBatch(userId: string, data: any): Promise<any> {
    const { expenses } = data;
    const results = [];
    const errors = [];
    
    for (const expense of expenses) {
      try {
        const transaction = await this.createTransaction(userId, {
          propertyId: expense.propertyId,
          type: 'expense',
          category: 'cleaning',
          description: expense.description || 'Limpeza',
          amount: expense.amount,
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
    
    return {
      success: errors.length === 0,
      created: results.length,
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