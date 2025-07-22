import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, successResponse } from '../middleware/errorHandler';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard overview
router.get('/overview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { period = '30' } = z.object({
    period: z.enum(['7', '30', '90', '365']).optional()
  }).parse(req.query);

  const userId = req.user!.id;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(period));
  const startDate = daysAgo.toISOString().split('T')[0];

  // Get properties count and value
  const propertiesStats = db.prepare(`
    SELECT 
      COUNT(*) as totalProperties,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as activeProperties,
      SUM(currentValue) as totalValue,
      SUM(monthlyRent) as totalMonthlyRent
    FROM properties 
    WHERE userId = ?
  `).get(userId) as any;

  // Get transactions summary for the period
  const transactionsStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END) as totalExpenses,
      COUNT(CASE WHEN t.category = 'income' THEN 1 END) as incomeTransactions,
      COUNT(CASE WHEN t.category = 'expense' THEN 1 END) as expenseTransactions
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE p.userId = ? AND t.date >= ?
  `).get(userId, startDate) as any;

  // Get recent transactions
  const recentTransactions = db.prepare(`
    SELECT 
      t.id, t.description, t.amount, t.category, t.date, t.status,
      p.name as propertyName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE p.userId = ?
    ORDER BY t.createdAt DESC
    LIMIT 5
  `).all(userId);

  // Calculate metrics
  const netIncome = (transactionsStats.totalIncome || 0) - (transactionsStats.totalExpenses || 0);
  const totalValue = propertiesStats.totalValue || 0;
  const roi = totalValue > 0 ? ((netIncome / totalValue) * 100) : 0;

  successResponse(res, {
    properties: {
      total: propertiesStats.totalProperties || 0,
      active: propertiesStats.activeProperties || 0,
      totalValue: totalValue,
      totalMonthlyRent: propertiesStats.totalMonthlyRent || 0
    },
    transactions: {
      totalIncome: transactionsStats.totalIncome || 0,
      totalExpenses: transactionsStats.totalExpenses || 0,
      netIncome,
      incomeTransactions: transactionsStats.incomeTransactions || 0,
      expenseTransactions: transactionsStats.expenseTransactions || 0
    },
    metrics: {
      roi: parseFloat(roi.toFixed(2)),
      period: parseInt(period)
    },
    recentTransactions
  });
}));

// Get cash flow data
router.get('/cash-flow', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { months = '12' } = z.object({
    months: z.enum(['6', '12', '24']).optional()
  }).parse(req.query);

  const userId = req.user!.id;
  const monthsBack = parseInt(months);

  // Get monthly cash flow data
  const cashFlowData = db.prepare(`
    SELECT 
      strftime('%Y-%m', t.date) as month,
      SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) as income,
      SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END) as expenses
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE p.userId = ? 
      AND t.date >= date('now', '-${monthsBack} months')
    GROUP BY strftime('%Y-%m', t.date)
    ORDER BY month ASC
  `).all(userId);

  // Fill missing months with zero values
  const result = [];
  const now = new Date();
  
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    
    const existingData = cashFlowData.find(item => item.month === monthKey);
    
    result.push({
      month: monthKey,
      income: existingData?.income || 0,
      expenses: existingData?.expenses || 0,
      net: (existingData?.income || 0) - (existingData?.expenses || 0)
    });
  }

  successResponse(res, result);
}));

// Get property performance
router.get('/property-performance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const propertyPerformance = db.prepare(`
    SELECT 
      p.id,
      p.name,
      p.type,
      p.currentValue,
      p.monthlyRent,
      SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END) as totalExpenses,
      COUNT(t.id) as transactionCount
    FROM properties p
    LEFT JOIN transactions t ON p.id = t.propertyId
    WHERE p.userId = ?
    GROUP BY p.id, p.name, p.type, p.currentValue, p.monthlyRent
    ORDER BY (SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) - 
              SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END)) DESC
  `).all(userId);

  const enrichedData = propertyPerformance.map(property => {
    const netIncome = (property.totalIncome || 0) - (property.totalExpenses || 0);
    const roi = property.currentValue > 0 ? ((netIncome / property.currentValue) * 100) : 0;
    const occupancyRate = property.monthlyRent > 0 ? 
      Math.min(((property.totalIncome || 0) / (property.monthlyRent * 12)) * 100, 100) : 0;

    return {
      ...property,
      netIncome,
      roi: parseFloat(roi.toFixed(2)),
      occupancyRate: parseFloat(occupancyRate.toFixed(2))
    };
  });

  successResponse(res, enrichedData);
}));

// Get expense breakdown
router.get('/expenses-breakdown', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { period = '30' } = z.object({
    period: z.enum(['7', '30', '90', '365']).optional()
  }).parse(req.query);

  const userId = req.user!.id;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(period));
  const startDate = daysAgo.toISOString().split('T')[0];

  // Get expense breakdown by category (using description patterns)
  const expenseBreakdown = db.prepare(`
    SELECT 
      CASE 
        WHEN LOWER(t.description) LIKE '%manutencao%' OR LOWER(t.description) LIKE '%reparo%' THEN 'Manutenção'
        WHEN LOWER(t.description) LIKE '%iptu%' OR LOWER(t.description) LIKE '%imposto%' THEN 'Impostos'
        WHEN LOWER(t.description) LIKE '%condominio%' THEN 'Condomínio'
        WHEN LOWER(t.description) LIKE '%seguro%' THEN 'Seguro'
        WHEN LOWER(t.description) LIKE '%administracao%' OR LOWER(t.description) LIKE '%gestao%' THEN 'Administração'
        WHEN LOWER(t.description) LIKE '%limpeza%' THEN 'Limpeza'
        ELSE 'Outros'
      END as category,
      SUM(t.amount) as total,
      COUNT(*) as count
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE p.userId = ? 
      AND t.category = 'expense'
      AND t.date >= ?
    GROUP BY 
      CASE 
        WHEN LOWER(t.description) LIKE '%manutencao%' OR LOWER(t.description) LIKE '%reparo%' THEN 'Manutenção'
        WHEN LOWER(t.description) LIKE '%iptu%' OR LOWER(t.description) LIKE '%imposto%' THEN 'Impostos'
        WHEN LOWER(t.description) LIKE '%condominio%' THEN 'Condomínio'
        WHEN LOWER(t.description) LIKE '%seguro%' THEN 'Seguro'
        WHEN LOWER(t.description) LIKE '%administracao%' OR LOWER(t.description) LIKE '%gestao%' THEN 'Administração'
        WHEN LOWER(t.description) LIKE '%limpeza%' THEN 'Limpeza'
        ELSE 'Outros'
      END
    ORDER BY total DESC
  `).all(userId, startDate);

  const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.total, 0);
  
  const enrichedBreakdown = expenseBreakdown.map(item => ({
    ...item,
    percentage: totalExpenses > 0 ? parseFloat(((item.total / totalExpenses) * 100).toFixed(2)) : 0
  }));

  successResponse(res, {
    breakdown: enrichedBreakdown,
    totalExpenses,
    period: parseInt(period)
  });
}));

// Get portfolio summary
router.get('/portfolio', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get portfolio distribution by property type
  const typeDistribution = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(currentValue) as totalValue,
      SUM(monthlyRent) as totalRent
    FROM properties 
    WHERE userId = ?
    GROUP BY type
    ORDER BY totalValue DESC
  `).all(userId);

  // Get total portfolio value
  const portfolioTotal = db.prepare(`
    SELECT 
      SUM(currentValue) as totalValue,
      SUM(monthlyRent) as totalMonthlyRent,
      COUNT(*) as totalProperties
    FROM properties 
    WHERE userId = ?
  `).get(userId) as any;

  // Calculate percentages
  const totalValue = portfolioTotal.totalValue || 0;
  const enrichedDistribution = typeDistribution.map(item => ({
    ...item,
    valuePercentage: totalValue > 0 ? parseFloat(((item.totalValue / totalValue) * 100).toFixed(2)) : 0
  }));

  // Get recent property additions
  const recentProperties = db.prepare(`
    SELECT id, name, type, currentValue, createdAt
    FROM properties 
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT 3
  `).all(userId);

  successResponse(res, {
    distribution: enrichedDistribution,
    totals: {
      value: totalValue,
      monthlyRent: portfolioTotal.totalMonthlyRent || 0,
      properties: portfolioTotal.totalProperties || 0
    },
    recentProperties
  });
}));

export default router;