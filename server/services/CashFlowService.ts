import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { db } from "../db";
import { transactions, properties, cashFlowSettings, accounts } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, or, isNull } from "drizzle-orm";
import { format, startOfDay, endOfDay, addDays, differenceInDays } from "date-fns";
import { Money, ServerMoneyUtils, MoneyUtils } from "../utils/money";

/**
 * Service for cash flow operations and analysis with precise Money handling
 */
export class CashFlowService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Get daily cash flow data for a period with Money precision
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
        balance: sql<string>`SUM(${accounts.balance})` // Changed to string for Money conversion
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const initialBalance = ServerMoneyUtils.fromDecimal(accountsData[0]?.balance);

    // Calculate balance before the start date
    const previousTransactions = await db
      .select({
        type: transactions.type,
        totalAmount: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        sql`${transactions.date} < ${format(start, 'yyyy-MM-dd')}`
      ))
      .groupBy(transactions.type);

    // Calculate starting balance using Money
    let startingBalance = initialBalance;
    previousTransactions.forEach(row => {
      const amount = ServerMoneyUtils.fromDecimal(row.totalAmount);
      if (row.type === 'revenue') {
        startingBalance = startingBalance.add(amount);
      } else if (row.type === 'expense') {
        startingBalance = startingBalance.subtract(amount);
      }
    });

    // Create daily cash flow with Money precision
    const dailyFlow = [];
    let runningBalance = startingBalance;
    let currentDate = new Date(start);

    for (let i = 0; i < days; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayTransactions = transactionsData.filter(t => t.date === dateStr);
      
      let dayRevenue = Money.zero();
      let dayExpenses = Money.zero();
      const dayDetails = [];

      dayTransactions.forEach(t => {
        const amount = ServerMoneyUtils.fromDecimal(t.amount);
        if (t.type === 'revenue') {
          dayRevenue = dayRevenue.add(amount);
        } else if (t.type === 'expense') {
          dayExpenses = dayExpenses.add(amount);
        }
        dayDetails.push({
          type: t.type,
          amount: amount.toDecimal(),
          amountFormatted: amount.toBRL(),
          category: t.category,
          description: t.description
        });
      });

      const netFlow = dayRevenue.subtract(dayExpenses);
      runningBalance = runningBalance.add(netFlow);

      dailyFlow.push({
        date: dateStr,
        revenue: dayRevenue.toDecimal(),
        revenueFormatted: dayRevenue.toBRL(),
        expenses: dayExpenses.toDecimal(),
        expensesFormatted: dayExpenses.toBRL(),
        netFlow: netFlow.toDecimal(),
        netFlowFormatted: netFlow.toBRL(),
        balance: runningBalance.toDecimal(),
        balanceFormatted: runningBalance.toBRL(),
        transactions: dayDetails
      });

      currentDate = addDays(currentDate, 1);
    }

    // Calculate summary using Money
    const totalRevenue = MoneyUtils.sum(dailyFlow.map(d => Money.fromDecimal(d.revenue)));
    const totalExpenses = MoneyUtils.sum(dailyFlow.map(d => Money.fromDecimal(d.expenses)));
    const netCashFlow = totalRevenue.subtract(totalExpenses);
    const averageDailyFlow = netCashFlow.divide(days);

    return {
      startDate,
      endDate,
      startingBalance: startingBalance.toDecimal(),
      startingBalanceFormatted: startingBalance.toBRL(),
      endingBalance: runningBalance.toDecimal(),
      endingBalanceFormatted: runningBalance.toBRL(),
      dailyFlow,
      summary: {
        totalRevenue: totalRevenue.toDecimal(),
        totalRevenueFormatted: totalRevenue.toBRL(),
        totalExpenses: totalExpenses.toDecimal(),
        totalExpensesFormatted: totalExpenses.toBRL(),
        netCashFlow: netCashFlow.toDecimal(),
        netCashFlowFormatted: netCashFlow.toBRL(),
        averageDailyFlow: averageDailyFlow.toDecimal(),
        averageDailyFlowFormatted: averageDailyFlow.toBRL(),
        daysWithPositiveFlow: dailyFlow.filter(day => day.netFlow > 0).length,
        daysWithNegativeFlow: dailyFlow.filter(day => day.netFlow < 0).length
      }
    };
  }

  /**
   * Get cash flow statistics with Money precision
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
        totalAmount: sql<string>`SUM(${transactions.amount})`, // Changed to string for Money conversion
        count: sql<number>`COUNT(*)`
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.type);

    const revenue = totals.find(t => t.type === 'revenue');
    const expenses = totals.find(t => t.type === 'expense');
    
    // Use Money for calculations
    const revenueMoney = revenue ? ServerMoneyUtils.fromDecimal(revenue.totalAmount) : Money.zero();
    const expensesMoney = expenses ? ServerMoneyUtils.fromDecimal(expenses.totalAmount) : Money.zero();
    const netFlowMoney = revenueMoney.subtract(expensesMoney);

    // Get category breakdown
    const categoryBreakdown = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        amount: sql<string>`SUM(${transactions.amount})`, // Changed to string for Money conversion
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
        amount: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'MM/YYYY')`, transactions.type)
      .orderBy(sql`MIN(${transactions.date})`);

    // Process monthly trends with Money
    const trendsByMonth = new Map();
    monthlyTrends.forEach(row => {
      const amount = ServerMoneyUtils.fromDecimal(row.amount);
      if (!trendsByMonth.has(row.month)) {
        trendsByMonth.set(row.month, { revenue: Money.zero(), expenses: Money.zero() });
      }
      const monthData = trendsByMonth.get(row.month);
      if (row.type === 'revenue') {
        monthData.revenue = amount;
      } else if (row.type === 'expense') {
        monthData.expenses = amount;
      }
    });

    const trends = Array.from(trendsByMonth.entries()).map(([month, data]) => {
      const netFlow = data.revenue.subtract(data.expenses);
      const margin = data.revenue.isZero() ? 0 : (netFlow.toDecimal() / data.revenue.toDecimal()) * 100;
      
      return {
        month,
        revenue: data.revenue.toDecimal(),
        revenueFormatted: data.revenue.toBRL(),
        expenses: data.expenses.toDecimal(),
        expensesFormatted: data.expenses.toBRL(),
        netFlow: netFlow.toDecimal(),
        netFlowFormatted: netFlow.toBRL(),
        margin
      };
    });

    // Calculate averages with Money
    const monthlyRevenueAvg = trends.length > 0
      ? MoneyUtils.average(trends.map(t => Money.fromDecimal(t.revenue)))
      : Money.zero();
    const monthlyExpensesAvg = trends.length > 0
      ? MoneyUtils.average(trends.map(t => Money.fromDecimal(t.expenses)))
      : Money.zero();
    const monthlyNetFlowAvg = monthlyRevenueAvg.subtract(monthlyExpensesAvg);

    return {
      period,
      totals: {
        revenue: revenueMoney.toDecimal(),
        revenueFormatted: revenueMoney.toBRL(),
        expenses: expensesMoney.toDecimal(),
        expensesFormatted: expensesMoney.toBRL(),
        netFlow: netFlowMoney.toDecimal(),
        netFlowFormatted: netFlowMoney.toBRL(),
        revenueCount: Number(revenue?.count || 0),
        expenseCount: Number(expenses?.count || 0)
      },
      ratios: {
        expenseToRevenueRatio: revenueMoney.isZero() 
          ? 0 
          : (expensesMoney.toDecimal() / revenueMoney.toDecimal()) * 100,
        profitMargin: revenueMoney.isZero()
          ? 0
          : (netFlowMoney.toDecimal() / revenueMoney.toDecimal()) * 100
      },
      categoryBreakdown: categoryBreakdown.map(cat => {
        const catAmount = ServerMoneyUtils.fromDecimal(cat.amount);
        const totalForType = cat.type === 'revenue' ? revenueMoney : expensesMoney;
        const percentage = totalForType.isZero() ? 0 : (catAmount.toDecimal() / totalForType.toDecimal()) * 100;
        
        return {
          type: cat.type,
          category: cat.category,
          amount: catAmount.toDecimal(),
          amountFormatted: catAmount.toBRL(),
          count: Number(cat.count),
          percentage
        };
      }),
      monthlyTrends: trends,
      averages: {
        monthlyRevenue: monthlyRevenueAvg.toDecimal(),
        monthlyRevenueFormatted: monthlyRevenueAvg.toBRL(),
        monthlyExpenses: monthlyExpensesAvg.toDecimal(),
        monthlyExpensesFormatted: monthlyExpensesAvg.toBRL(),
        monthlyNetFlow: monthlyNetFlowAvg.toDecimal(),
        monthlyNetFlowFormatted: monthlyNetFlowAvg.toBRL()
      }
    };
  }

  /**
   * Project future cash flow based on historical data with Money precision
   */
  async projectCashFlow(userId: string, months: number = 3): Promise<any> {
    // Get historical data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const historicalData = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        avgAmount: sql<string>`AVG(${transactions.amount})`, // Changed to string for Money conversion
        frequency: sql<number>`COUNT(*) / 6.0` // Average per month
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, format(sixMonthsAgo, 'yyyy-MM-dd'))
      ))
      .groupBy(transactions.type, transactions.category);

    // Calculate current balance with Money
    const currentBalance = await this.getCurrentBalance(userId);

    // Project future months with Money precision
    const projections = [];
    let projectedBalance = currentBalance;
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const projectionDate = new Date(today);
      projectionDate.setMonth(projectionDate.getMonth() + i);
      
      let monthRevenue = Money.zero();
      let monthExpenses = Money.zero();
      const categoryDetails = [];

      historicalData.forEach(data => {
        const avgAmount = ServerMoneyUtils.fromDecimal(data.avgAmount);
        const monthlyAmount = avgAmount.multiply(Number(data.frequency));
        
        if (data.type === 'revenue') {
          monthRevenue = monthRevenue.add(monthlyAmount);
        } else if (data.type === 'expense') {
          monthExpenses = monthExpenses.add(monthlyAmount);
        }

        categoryDetails.push({
          type: data.type,
          category: data.category,
          projectedAmount: monthlyAmount.toDecimal(),
          projectedAmountFormatted: monthlyAmount.toBRL()
        });
      });

      const netFlow = monthRevenue.subtract(monthExpenses);
      projectedBalance = projectedBalance.add(netFlow);

      projections.push({
        month: format(projectionDate, 'MM/yyyy'),
        projectedRevenue: monthRevenue.toDecimal(),
        projectedRevenueFormatted: monthRevenue.toBRL(),
        projectedExpenses: monthExpenses.toDecimal(),
        projectedExpensesFormatted: monthExpenses.toBRL(),
        projectedNetFlow: netFlow.toDecimal(),
        projectedNetFlowFormatted: netFlow.toBRL(),
        projectedBalance: projectedBalance.toDecimal(),
        projectedBalanceFormatted: projectedBalance.toBRL(),
        categoryBreakdown: categoryDetails
      });
    }

    // Calculate summary with Money
    const totalProjectedRevenue = MoneyUtils.sum(projections.map(p => Money.fromDecimal(p.projectedRevenue)));
    const totalProjectedExpenses = MoneyUtils.sum(projections.map(p => Money.fromDecimal(p.projectedExpenses)));
    const totalProjectedNetFlow = totalProjectedRevenue.subtract(totalProjectedExpenses);

    return {
      currentBalance: currentBalance.toDecimal(),
      currentBalanceFormatted: currentBalance.toBRL(),
      projectionMonths: months,
      projections,
      summary: {
        totalProjectedRevenue: totalProjectedRevenue.toDecimal(),
        totalProjectedRevenueFormatted: totalProjectedRevenue.toBRL(),
        totalProjectedExpenses: totalProjectedExpenses.toDecimal(),
        totalProjectedExpensesFormatted: totalProjectedExpenses.toBRL(),
        totalProjectedNetFlow: totalProjectedNetFlow.toDecimal(),
        totalProjectedNetFlowFormatted: totalProjectedNetFlow.toBRL(),
        finalProjectedBalance: projectedBalance.toDecimal(),
        finalProjectedBalanceFormatted: projectedBalance.toBRL()
      },
      assumptions: "Projeção baseada na média dos últimos 6 meses"
    };
  }

  /**
   * Get current balance for a user with Money precision
   */
  private async getCurrentBalance(userId: string): Promise<Money> {
    // Get all transactions up to today
    const totals = await db
      .select({
        type: transactions.type,
        totalAmount: sql<string>`SUM(${transactions.amount})` // Changed to string for Money conversion
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        lte(transactions.date, format(new Date(), 'yyyy-MM-dd'))
      ))
      .groupBy(transactions.type);

    let balance = Money.zero();
    totals.forEach(row => {
      const amount = ServerMoneyUtils.fromDecimal(row.totalAmount);
      if (row.type === 'revenue') {
        balance = balance.add(amount);
      } else if (row.type === 'expense') {
        balance = balance.subtract(amount);
      }
    });

    return balance;
  }

  /**
   * Analyze cash flow health with Money precision
   */
  async analyzeCashFlowHealth(userId: string): Promise<any> {
    const stats = await this.getCashFlowStats(userId);
    const currentBalance = await this.getCurrentBalance(userId);
    
    // Calculate health indicators with Money
    const healthScore = this.calculateHealthScore(stats, currentBalance);
    const warnings = this.identifyWarnings(stats, currentBalance);
    const recommendations = this.generateRecommendations(stats, currentBalance);

    // Calculate liquidity ratio with Money
    const monthlyExpenses = Money.fromDecimal(stats.averages.monthlyExpenses);
    const liquidityRatio = currentBalance.isPositive() && monthlyExpenses.isPositive()
      ? currentBalance.toDecimal() / monthlyExpenses.toDecimal()
      : 0;

    // Calculate runway months with Money
    const monthlyNetFlow = Money.fromDecimal(stats.averages.monthlyNetFlow);
    const runwayMonths = currentBalance.isPositive() && monthlyNetFlow.isNegative()
      ? currentBalance.toDecimal() / Math.abs(monthlyNetFlow.toDecimal())
      : null;

    return {
      currentBalance: currentBalance.toDecimal(),
      currentBalanceFormatted: currentBalance.toBRL(),
      healthScore,
      healthStatus: this.getHealthStatus(healthScore),
      indicators: {
        liquidityRatio, // Months of expenses covered
        burnRate: monthlyExpenses.toDecimal(),
        burnRateFormatted: monthlyExpenses.toBRL(),
        runwayMonths,
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
   * Calculate health score (0-100) with Money precision
   */
  private calculateHealthScore(stats: any, balance: Money): number {
    let score = 50; // Base score

    // Positive factors
    if (balance.isPositive()) score += 10;
    if (stats.ratios.profitMargin > 20) score += 15;
    if (stats.ratios.profitMargin > 10) score += 10;
    if (stats.ratios.expenseToRevenueRatio < 70) score += 10;
    if (stats.averages.monthlyNetFlow > 0) score += 15;

    // Negative factors
    if (balance.isNegative()) score -= 20;
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
   * Identify financial warnings with Money precision
   */
  private identifyWarnings(stats: any, balance: Money): string[] {
    const warnings = [];

    if (balance.isNegative()) {
      warnings.push(`Saldo negativo: ${balance.toBRL()} - atenção imediata necessária`);
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
   * Generate financial recommendations with Money precision
   */
  private generateRecommendations(stats: any, balance: Money): string[] {
    const recommendations = [];

    if (stats.ratios.expenseToRevenueRatio > 80) {
      recommendations.push('Revisar e otimizar despesas operacionais');
    }
    if (stats.ratios.profitMargin < 10) {
      recommendations.push('Considerar aumentar preços ou buscar novas fontes de receita');
    }
    
    const monthlyExpenses = Money.fromDecimal(stats.averages.monthlyExpenses);
    const emergencyReserve = monthlyExpenses.multiply(3);
    
    if (balance.isLessThan(emergencyReserve)) {
      recommendations.push(`Criar reserva de emergência (3-6 meses de despesas = ${emergencyReserve.toBRL()})`);
    }
    
    // Category-specific recommendations
    const expenseCategories = stats.categoryBreakdown.filter(c => c.type === 'expense');
    const highestExpense = expenseCategories[0];
    if (highestExpense && highestExpense.percentage > 30) {
      recommendations.push(`Analisar despesas de ${highestExpense.category} (${highestExpense.percentage.toFixed(1)}% do total = ${highestExpense.amountFormatted})`);
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