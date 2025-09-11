import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { db } from "../db";
import { marcoZero, reconciliationAdjustments, transactions, accounts } from "@shared/schema";
import type { MarcoZero, InsertMarcoZero, ReconciliationAdjustment, InsertReconciliationAdjustment } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { format } from "date-fns";
import { Money, ServerMoneyUtils } from "../utils/money";

interface AccountBalance {
  accountId: number;
  accountName: string;
  balance: string;
}

/**
 * Service for managing Marco Zero and reconciliation adjustments
 */
export class MarcoZeroService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Set a new Marco Zero, deactivating any existing active marco
   */
  async setMarcoZero(userId: string, marcoDate: string, accountBalances: AccountBalance[], notes?: string): Promise<MarcoZero> {
    try {
      // Deactivate any existing active marco
      await db
        .update(marcoZero)
        .set({ 
          isActive: false,
          deactivatedAt: new Date()
        })
        .where(and(
          eq(marcoZero.userId, userId),
          eq(marcoZero.isActive, true)
        ));

      // Calculate total balance using Money for precision
      let totalBalance = Money.zero();
      const processedBalances = accountBalances.map(ab => {
        const balanceMoney = ServerMoneyUtils.parseUserInput(ab.balance);
        totalBalance = totalBalance.add(balanceMoney);
        return {
          ...ab,
          balance: balanceMoney.toDecimal()
        };
      });

      // Create new marco zero
      const result = await db
        .insert(marcoZero)
        .values({
          userId,
          marcoDate,
          accountBalances: processedBalances,
          totalBalance: totalBalance.toDecimal() as any,
          notes: notes || null,
          isActive: true
        })
        .returning();
      
      const [newMarco] = result as MarcoZero[];

      // Mark transactions before marco date as is_before_marco
      await this.markTransactionsBeforeMarco(userId, marcoDate);

      return newMarco;
    } catch (error) {
      console.error("Error setting Marco Zero:", error);
      throw error;
    }
  }

  /**
   * Get the active Marco Zero for a user
   */
  async getActiveMarco(userId: string): Promise<MarcoZero | null> {
    try {
      const [active] = await db
        .select()
        .from(marcoZero)
        .where(and(
          eq(marcoZero.userId, userId),
          eq(marcoZero.isActive, true)
        ))
        .limit(1);

      return active || null;
    } catch (error) {
      console.error("Error getting active Marco Zero:", error);
      return null;
    }
  }

  /**
   * Get Marco Zero history for a user
   */
  async getMarcoHistory(userId: string): Promise<MarcoZero[]> {
    try {
      const history = await db
        .select()
        .from(marcoZero)
        .where(eq(marcoZero.userId, userId))
        .orderBy(desc(marcoZero.createdAt));

      return history;
    } catch (error) {
      console.error("Error getting Marco Zero history:", error);
      return [];
    }
  }

  /**
   * Create a reconciliation adjustment
   */
  async createReconciliationAdjustment(
    userId: string,
    adjustmentData: {
      marcoZeroId?: number;
      accountId?: number;
      adjustmentDate: string;
      amount: string;
      type: string;
      description: string;
      bankReference?: string;
    }
  ): Promise<ReconciliationAdjustment> {
    try {
      // Parse amount using Money
      const amountMoney = ServerMoneyUtils.parseUserInput(adjustmentData.amount);

      const result = await db
        .insert(reconciliationAdjustments)
        .values({
          userId,
          marcoZeroId: adjustmentData.marcoZeroId || null,
          accountId: adjustmentData.accountId || null,
          adjustmentDate: adjustmentData.adjustmentDate,
          amount: amountMoney.toDecimal() as any,
          type: adjustmentData.type,
          description: adjustmentData.description,
          bankReference: adjustmentData.bankReference || null
        })
        .returning();
      
      const [adjustment] = result as ReconciliationAdjustment[];

      return adjustment;
    } catch (error) {
      console.error("Error creating reconciliation adjustment:", error);
      throw error;
    }
  }

  /**
   * Get reconciliation adjustments for a user
   */
  async getReconciliationAdjustments(userId: string, marcoZeroId?: number): Promise<ReconciliationAdjustment[]> {
    try {
      let conditions = [eq(reconciliationAdjustments.userId, userId)];

      if (marcoZeroId) {
        conditions.push(eq(reconciliationAdjustments.marcoZeroId, marcoZeroId));
      }

      const adjustments = await db
        .select()
        .from(reconciliationAdjustments)
        .where(and(...conditions))
        .orderBy(desc(reconciliationAdjustments.adjustmentDate));
      return adjustments;
    } catch (error) {
      console.error("Error getting reconciliation adjustments:", error);
      return [];
    }
  }

  /**
   * Calculate balance from Marco Zero for a specific date
   */
  async calculateBalanceFromMarco(userId: string, targetDate: string): Promise<Money> {
    try {
      const activeMarco = await this.getActiveMarco(userId);
      
      if (!activeMarco) {
        // No marco zero, use account balances
        const accountsData = await db
          .select({
            balance: sql<string>`SUM(${accounts.currentBalance})`
          })
          .from(accounts)
          .where(eq(accounts.userId, userId));

        return ServerMoneyUtils.fromDecimal(accountsData[0]?.balance || "0");
      }

      // Start with marco zero total balance
      let balance = ServerMoneyUtils.fromDecimal(activeMarco.totalBalance);

      // Add transactions after marco date up to target date
      const transactionsData = await db
        .select({
          type: transactions.type,
          amount: transactions.amount
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          gte(transactions.date, activeMarco.marcoDate),
          lte(transactions.date, targetDate),
          eq(transactions.isBeforeMarco, false),
          eq(transactions.isHistorical, false)
        ));

      // Apply transactions
      transactionsData.forEach(t => {
        const amount = ServerMoneyUtils.fromDecimal(t.amount);
        if (t.type === 'revenue') {
          balance = balance.add(amount);
        } else if (t.type === 'expense') {
          balance = balance.subtract(amount);
        }
      });

      // Apply reconciliation adjustments up to target date
      const adjustments = await db
        .select({
          amount: reconciliationAdjustments.amount
        })
        .from(reconciliationAdjustments)
        .where(and(
          eq(reconciliationAdjustments.userId, userId),
          eq(reconciliationAdjustments.marcoZeroId, activeMarco.id),
          lte(reconciliationAdjustments.adjustmentDate, targetDate)
        ));

      adjustments.forEach(adj => {
        const amount = ServerMoneyUtils.fromDecimal(adj.amount);
        balance = balance.add(amount); // Adjustments can be positive or negative
      });

      return balance;
    } catch (error) {
      console.error("Error calculating balance from Marco Zero:", error);
      throw error;
    }
  }

  /**
   * Mark transactions before marco date
   */
  private async markTransactionsBeforeMarco(userId: string, marcoDate: string): Promise<void> {
    try {
      // Mark transactions before marco as is_before_marco = true
      await db
        .update(transactions)
        .set({ isBeforeMarco: true })
        .where(and(
          eq(transactions.userId, userId),
          sql`${transactions.date} < ${marcoDate}`
        ));

      // Mark transactions after marco as is_before_marco = false
      await db
        .update(transactions)
        .set({ isBeforeMarco: false })
        .where(and(
          eq(transactions.userId, userId),
          sql`${transactions.date} >= ${marcoDate}`
        ));
    } catch (error) {
      console.error("Error marking transactions before Marco Zero:", error);
      throw error;
    }
  }

  /**
   * Delete a reconciliation adjustment
   */
  async deleteReconciliationAdjustment(id: number, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(reconciliationAdjustments)
        .where(and(
          eq(reconciliationAdjustments.id, id),
          eq(reconciliationAdjustments.userId, userId)
        ));

      return true;
    } catch (error) {
      console.error("Error deleting reconciliation adjustment:", error);
      return false;
    }
  }

  /**
   * Update accounts with marco zero balances
   */
  async updateAccountsWithMarcoBalances(userId: string, accountBalances: AccountBalance[]): Promise<void> {
    try {
      // Update each account's initial balance
      for (const ab of accountBalances) {
        const balanceMoney = ServerMoneyUtils.parseUserInput(ab.balance);
        
        await db
          .update(accounts)
          .set({
            initialBalance: balanceMoney.toDecimal() as any,
            currentBalance: balanceMoney.toDecimal() as any,
            updatedAt: new Date()
          })
          .where(and(
            eq(accounts.id, ab.accountId),
            eq(accounts.userId, userId)
          ));
      }
    } catch (error) {
      console.error("Error updating accounts with Marco Zero balances:", error);
      throw error;
    }
  }
}