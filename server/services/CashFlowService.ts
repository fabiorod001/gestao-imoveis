import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { db } from "../db";
import { transactions, properties, cashFlowSettings, accounts } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, or, isNull } from "drizzle-orm";
import { format, startOfDay, endOfDay, addDays, differenceInDays } from "date-fns";

/**
 * Service for cash flow operations and analysis
 */
export class CashFlowService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Get daily cash flow data for a period
   */
  async getDailyCashFlow(userId: string, startDate: string, endDate: string): Promise<any> {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const days = differenceInDays(end, start) + 1;

    // Get all transactions in the period
    const transactionsData = await db
      .select({
        date: transactions.date,
        type: transactions.type,
        amount: transactions.amount,
        category: transactions.category,
        description: transactions.description
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, format(start, 'yyyy-MM-dd')),
        lte(transactions.date, format(end, 'yyyy-MM-dd'))
      ))
      .orderBy(asc(transactions.date));

    // Get initial balance from accounts
    const accountsData = await db
      .select({
        balance: sql<number>`SUM(${accounts.balance})`
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const initialBalance = accountsData[0]?.balance || 0;

    // Calculate balance before the start date
    const previousTransactions = await db
      .select({
        type: transactions.type,
        totalAmount: sql<number>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        sql`${transactions.date} < ${format(start, 'yyyy-MM-dd')}`
      ))
      .groupBy(transactions.type);

    let startingBalance = initialBalance;
    previousTransactions.forEach(row => {
      if (row.type === 'revenue') {
        startingBalance += Number(row.totalAmount);
      } else if (row.type === 'expense') {
        startingBalance -= Number(row.totalAmount);
      }
    });

    // Create daily cash flow
    const dailyFlow = [];
    let runningBalance = startingBalance;
    let currentDate = new Date(start);

    for (let i = 0; i < days; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayTransactions = transactionsData.filter(t => t.date === dateStr);
      
      let dayRevenue = 0;
      let dayExpenses = 0;
      const dayDetails = [];

      dayTransactions.forEach(t => {
        if (t.type === 'revenue') {
          dayRevenue += t.amount;
        } else if (t.type === 'expense') {
          dayExpenses += t.amount;
        }
        dayDetails.push({
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description
        });
      });

      const netFlow = dayRevenue - dayExpenses;
      runningBalance += netFlow;

      dailyFlow.push({
        date: dateStr,
        revenue: dayRevenue,
        expenses: dayExpenses,
        netFlow,
        balance: runningBalance,
        transactions: dayDetails
      });

      currentDate = addDays(currentDate, 1);
    }

    return {
      startDate,
      endDate,
      startingBalance,
      endingBalance: runningBalance,
      dailyFlow,
      summary: {
        totalRevenue: dailyFlow.reduce((sum, day) => sum + day.revenue, 0),
        totalExpenses: dailyFlow.reduce((sum, day) => sum + day.expenses, 0),
        netCashFlow: dailyFlow.reduce((sum, day) => sum + day.netFlow, 0),
        averageDailyFlow: dailyFlow.reduce((sum, day) => sum + day.netFlow, 0) / days,
        daysWithPositiveFlow: dailyFlow.filter(day => day.netFlow > 0).length,
        daysWithNegativeFlow: dailyFlow.filter(day => day.netFlow < 0).length
      }
    };
  }

  /**
   * Get cash flow statistics
   */
  async getCashFlowStats(userId: string, period?: { startDate: string; endDate: string }): Promise<any> {
    const conditions = [eq(transactions.userId, userId)];
    
    if (period) {
      conditions.push(
        gte(transactions.date, period.startDate),
        lte(transactions.date, period.endDate)
      );
    }

    // Get revenue and expense totals
    const totals = await db
      .select({
        type: transactions.type,
        totalAmount: sql<number>`SUM(${transactions.amount})`,
        count: sql<number>`COUNT(*)`
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.type);

    const revenue = totals.find(t => t.type === 'revenue') || { totalAmount: 0, count: 0 };
    const expenses = totals.find(t => t.type === 'expense') || { totalAmount: 0, count: 0 };

    // Get category breakdown
    const categoryBreakdown = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        amount: sql<number>`SUM(${transactions.amount})`,
        count: sql<number>`COUNT(*)`
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.type, transactions.category)
      .orderBy(desc(sql`SUM(${transactions.amount})`));

    // Get monthly trends
    const monthlyTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'MM/YYYY')`,
        type: transactions.type,
        amount: sql<number>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`, transactions.type)
      .orderBy(sql`MIN(${transactions.date})`);

    // Process monthly trends
    const trendsByMonth = new Map();
    monthlyTrends.forEach(row => {
      if (!trendsByMonth.has(row.month)) {
        trendsByMonth.set(row.month, { revenue: 0, expenses: 0 });
      }
      const monthData = trendsByMonth.get(row.month);
      if (row.type === 'revenue') {
        monthData.revenue = Number(row.amount);
      } else if (row.type === 'expense') {
        monthData.expenses = Number(row.amount);
      }
    });

    const trends = Array.from(trendsByMonth.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
      netFlow: data.revenue - data.expenses,
      margin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0
    }));

    return {
      period,
      totals: {
        revenue: Number(revenue.totalAmount),
        expenses: Number(expenses.totalAmount),
        netFlow: Number(revenue.totalAmount) - Number(expenses.totalAmount),
        revenueCount: Number(revenue.count),
        expenseCount: Number(expenses.count)
      },
      ratios: {
        expenseToRevenueRatio: Number(revenue.totalAmount) > 0 
          ? (Number(expenses.totalAmount) / Number(revenue.totalAmount)) * 100 
          : 0,
        profitMargin: Number(revenue.totalAmount) > 0
          ? ((Number(revenue.totalAmount) - Number(expenses.totalAmount)) / Number(revenue.totalAmount)) * 100
          : 0
      },
      categoryBreakdown: categoryBreakdown.map(cat => ({
        type: cat.type,
        category: cat.category,
        amount: Number(cat.amount),
        count: Number(cat.count),
        percentage: cat.type === 'revenue' 
          ? Number(revenue.totalAmount) > 0 ? (Number(cat.amount) / Number(revenue.totalAmount)) * 100 : 0
          : Number(expenses.totalAmount) > 0 ? (Number(cat.amount) / Number(expenses.totalAmount)) * 100 : 0
      })),
      monthlyTrends: trends,
      averages: {
        monthlyRevenue: trends.length > 0 
          ? trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length 
          : 0,
        monthlyExpenses: trends.length > 0
          ? trends.reduce((sum, t) => sum + t.expenses, 0) / trends.length
          : 0,
        monthlyNetFlow: trends.length > 0
          ? trends.reduce((sum, t) => sum + t.netFlow, 0) / trends.length
          : 0
      }
    };
  }

  /**
   * Project future cash flow based on historical data
   */
  async projectCashFlow(userId: string, months: number = 3): Promise<any> {
    // Get historical data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const historicalData = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        avgAmount: sql<number>`AVG(${transactions.amount})`,
        frequency: sql<number>`COUNT(*) / 6.0` // Average per month
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, format(sixMonthsAgo, 'yyyy-MM-dd'))
      ))
      .groupBy(transactions.type, transactions.category);

    // Calculate current balance
    const currentBalance = await this.getCurrentBalance(userId);

    // Project future months
    const projections = [];
    let projectedBalance = currentBalance;
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const projectionDate = new Date(today);
      projectionDate.setMonth(projectionDate.getMonth() + i);
      
      let monthRevenue = 0;
      let monthExpenses = 0;
      const categoryDetails = [];

      historicalData.forEach(data => {
        const monthlyAmount = Number(data.avgAmount) * Number(data.frequency);
        
        if (data.type === 'revenue') {
          monthRevenue += monthlyAmount;
        } else if (data.type === 'expense') {
          monthExpenses += monthlyAmount;
        }

        categoryDetails.push({
          type: data.type,
          category: data.category,
          projectedAmount: monthlyAmount
        });
      });

      const netFlow = monthRevenue - monthExpenses;
      projectedBalance += netFlow;

      projections.push({
        month: format(projectionDate, 'MM/yyyy'),
        projectedRevenue: monthRevenue,
        projectedExpenses: monthExpenses,
        projectedNetFlow: netFlow,
        projectedBalance,
        categoryBreakdown: categoryDetails
      });
    }

    return {
      currentBalance,
      projectionMonths: months,
      projections,
      summary: {
        totalProjectedRevenue: projections.reduce((sum, p) => sum + p.projectedRevenue, 0),
        totalProjectedExpenses: projections.reduce((sum, p) => sum + p.projectedExpenses, 0),
        totalProjectedNetFlow: projections.reduce((sum, p) => sum + p.projectedNetFlow, 0),
        finalProjectedBalance: projectedBalance
      },
      assumptions: "Projeção baseada na média dos últimos 6 meses"
    };
  }

  /**
   * Get current balance for a user
   */
  private async getCurrentBalance(userId: string): Promise<number> {
    // Get all transactions up to today
    const totals = await db
      .select({
        type: transactions.type,
        totalAmount: sql<number>`SUM(${transactions.amount})`
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        lte(transactions.date, format(new Date(), 'yyyy-MM-dd'))
      ))
      .groupBy(transactions.type);

    let balance = 0;
    totals.forEach(row => {
      if (row.type === 'revenue') {
        balance += Number(row.totalAmount);
      } else if (row.type === 'expense') {
        balance -= Number(row.totalAmount);
      }
    });

    return balance;
  }

  /**
   * Analyze cash flow health
   */
  async analyzeCashFlowHealth(userId: string): Promise<any> {
    const stats = await this.getCashFlowStats(userId);
    const currentBalance = await this.getCurrentBalance(userId);
    
    // Calculate health indicators
    const healthScore = this.calculateHealthScore(stats, currentBalance);
    const warnings = this.identifyWarnings(stats, currentBalance);
    const recommendations = this.generateRecommendations(stats, currentBalance);

    return {
      currentBalance,
      healthScore,
      healthStatus: this.getHealthStatus(healthScore),
      indicators: {
        liquidityRatio: currentBalance > 0 && stats.totals.expenses > 0 
          ? currentBalance / (stats.totals.expenses / 12) 
          : 0, // Months of expenses covered
        burnRate: stats.averages.monthlyExpenses,
        runwayMonths: currentBalance > 0 && stats.averages.monthlyNetFlow < 0
          ? currentBalance / Math.abs(stats.averages.monthlyNetFlow)
          : null,
        profitMargin: stats.ratios.profitMargin,
        expenseRatio: stats.ratios.expenseToRevenueRatio
      },
      warnings,
      recommendations,
      trends: {
        revenueGrowth: this.calculateGrowthRate(stats.monthlyTrends, 'revenue'),
        expenseGrowth: this.calculateGrowthRate(stats.monthlyTrends, 'expenses'),
        netFlowTrend: this.calculateTrend(stats.monthlyTrends)
      }
    };
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(stats: any, balance: number): number {
    let score = 50; // Base score

    // Positive factors
    if (balance > 0) score += 10;
    if (stats.ratios.profitMargin > 20) score += 15;
    if (stats.ratios.profitMargin > 10) score += 10;
    if (stats.ratios.expenseToRevenueRatio < 70) score += 10;
    if (stats.averages.monthlyNetFlow > 0) score += 15;

    // Negative factors
    if (balance < 0) score -= 20;
    if (stats.ratios.profitMargin < 0) score -= 15;
    if (stats.ratios.expenseToRevenueRatio > 90) score -= 10;
    if (stats.averages.monthlyNetFlow < 0) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get health status description
   */
  private getHealthStatus(score: number): string {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    if (score >= 20) return 'Preocupante';
    return 'Crítico';
  }

  /**
   * Identify financial warnings
   */
  private identifyWarnings(stats: any, balance: number): string[] {
    const warnings = [];

    if (balance < 0) {
      warnings.push('Saldo negativo - atenção imediata necessária');
    }
    if (stats.ratios.profitMargin < 5 && stats.ratios.profitMargin >= 0) {
      warnings.push('Margem de lucro muito baixa');
    }
    if (stats.ratios.profitMargin < 0) {
      warnings.push('Operação com prejuízo');
    }
    if (stats.ratios.expenseToRevenueRatio > 90) {
      warnings.push('Despesas muito altas em relação à receita');
    }
    if (stats.averages.monthlyNetFlow < 0) {
      warnings.push('Fluxo de caixa médio negativo');
    }

    return warnings;
  }

  /**
   * Generate financial recommendations
   */
  private generateRecommendations(stats: any, balance: number): string[] {
    const recommendations = [];

    if (stats.ratios.expenseToRevenueRatio > 80) {
      recommendations.push('Revisar e otimizar despesas operacionais');
    }
    if (stats.ratios.profitMargin < 10) {
      recommendations.push('Considerar aumentar preços ou buscar novas fontes de receita');
    }
    if (balance < stats.averages.monthlyExpenses * 3) {
      recommendations.push('Criar reserva de emergência (3-6 meses de despesas)');
    }
    
    // Category-specific recommendations
    const expenseCategories = stats.categoryBreakdown.filter(c => c.type === 'expense');
    const highestExpense = expenseCategories[0];
    if (highestExpense && highestExpense.percentage > 30) {
      recommendations.push(`Analisar despesas de ${highestExpense.category} (${highestExpense.percentage.toFixed(1)}% do total)`);
    }

    return recommendations;
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(trends: any[], metric: string): number {
    if (trends.length < 2) return 0;
    
    const first = trends[0][metric];
    const last = trends[trends.length - 1][metric];
    
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(trends: any[]): 'improving' | 'declining' | 'stable' {
    if (trends.length < 3) return 'stable';
    
    const recentTrends = trends.slice(-3);
    const avgRecent = recentTrends.reduce((sum, t) => sum + t.netFlow, 0) / 3;
    const avgPrevious = trends.slice(-6, -3).reduce((sum, t) => sum + t.netFlow, 0) / 3;
    
    const change = avgRecent - avgPrevious;
    if (Math.abs(change) < avgPrevious * 0.1) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }
}