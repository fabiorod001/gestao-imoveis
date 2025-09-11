import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ServiceFactory } from "./services";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";

// Initialize service factory
const serviceFactory = new ServiceFactory(storage);

// Get service instances
const propertyService = serviceFactory.getPropertyService();
const transactionService = serviceFactory.getTransactionService();
const importService = serviceFactory.getImportService();
const analyticsService = serviceFactory.getAnalyticsService();
const taxService = serviceFactory.getTaxService();
const cashFlowService = serviceFactory.getCashFlowService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp/');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .xlsx são permitidos'));
    }
  },
});

// Configure multer for CSV file uploads (Airbnb import)
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .csv são permitidos'));
    }
  },
});

// Configure multer for PDF file uploads (Cleaning import)
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .pdf são permitidos'));
    }
  },
});

// Helper function to get userId from request
function getUserId(req: any): string {
  // For Replit auth
  if (req.user) {
    return req.user.claims?.sub || req.user.sub || req.user.userId;
  }
  // For simple auth
  if (req.session?.user) {
    return req.session.user.id;
  }
  throw new Error("No user found in request");
}

/**
 * Register all routes with Express app
 * Routes are now thin controllers that only handle validation and call services
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ==================== AUTH ROUTES ====================
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==================== PROPERTY ROUTES ====================
  app.get('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const properties = await propertyService.getProperties(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const property = await propertyService.getProperty(propertyId, userId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const property = await propertyService.createProperty(userId, req.body);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create property" });
    }
  });

  app.put('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const property = await propertyService.updateProperty(propertyId, userId, req.body);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update property" });
    }
  });

  app.delete('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const deleted = await propertyService.deleteProperty(propertyId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Property return rate calculation
  app.get('/api/properties/:id/return-rate/:month/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      
      const result = await propertyService.calculateReturnRate(propertyId, userId, month, year);
      res.json(result);
    } catch (error) {
      console.error("Error calculating return rate:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to calculate return rate" });
    }
  });

  // Property expense components
  app.get('/api/properties/:id/expense-components', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const components = await propertyService.getExpenseComponents(propertyId, userId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching expense components:", error);
      res.status(500).json({ message: "Failed to fetch expense components" });
    }
  });

  app.post('/api/properties/:id/expense-components', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const result = await propertyService.saveExpenseComponents(propertyId, userId, req.body.components);
      res.json(result);
    } catch (error) {
      console.error("Error saving expense components:", error);
      res.status(500).json({ message: "Failed to save expense components" });
    }
  });

  // Copy expense template
  app.post('/api/properties/:id/copy-expense-template', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const sourcePropertyId = parseInt(req.params.id);
      const { targetPropertyIds } = req.body;
      
      const result = await propertyService.copyExpenseTemplate(sourcePropertyId, targetPropertyIds, userId);
      res.json(result);
    } catch (error) {
      console.error("Error copying expense template:", error);
      res.status(500).json({ message: "Failed to copy expense template" });
    }
  });

  // ==================== TRANSACTION ROUTES ====================
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const type = req.query.type as string | undefined;
      
      const transactions = await transactionService.getTransactions(userId, type, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/property/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.propertyId);
      const transactions = await transactionService.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching property transactions:", error);
      res.status(500).json({ message: "Failed to fetch property transactions" });
    }
  });

  app.get('/api/properties/:id/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const transactions = await transactionService.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching property transactions:", error);
      res.status(500).json({ message: "Failed to fetch property transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transaction = await transactionService.createTransaction(userId, req.body);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create transaction" });
    }
  });

  app.put('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      const transaction = await transactionService.updateTransaction(transactionId, userId, req.body);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      const deleted = await transactionService.deleteTransaction(transactionId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Composite transaction
  app.post('/api/transactions/composite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await transactionService.createCompositeExpense({ ...req.body, userId });
      res.json(result);
    } catch (error) {
      console.error("Error creating composite expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create composite expense" });
    }
  });

  // Cleanup transactions
  app.delete('/api/cleanup/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyIds = req.body.propertyIds;
      const result = await transactionService.cleanupTransactions(userId, propertyIds);
      res.json(result);
    } catch (error) {
      console.error("Error cleaning up transactions:", error);
      res.status(500).json({ message: "Failed to cleanup transactions" });
    }
  });

  // ==================== EXPENSE ROUTES ====================
  app.get('/api/expenses/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const expenseData = await transactionService.getExpenseDashboardData(userId);
      res.json(expenseData);
    } catch (error) {
      console.error('Error fetching expense dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch expense data' });
    }
  });

  // Management expenses
  app.get('/api/expenses/management/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      const expense = await transactionService.getManagementExpense(transactionId, userId);
      res.json(expense);
    } catch (error) {
      console.error("Error fetching management expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch management expense" });
    }
  });

  app.post('/api/expenses/management', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await transactionService.createManagementExpense(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating management expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create management expense" });
    }
  });

  app.put('/api/expenses/management/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      const result = await transactionService.updateManagementExpense(transactionId, userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating management expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update management expense" });
    }
  });

  // Distributed expenses
  app.post('/api/expenses/distributed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await transactionService.createDistributedExpense(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating distributed expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create distributed expense" });
    }
  });

  app.post('/api/expenses/distributed/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const preview = await transactionService.generateDistributedExpensePreview(userId, req.body);
      res.json(preview);
    } catch (error) {
      console.error("Error generating distributed expense preview:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate preview" });
    }
  });

  // Company expenses
  app.post('/api/expenses/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transaction = await transactionService.createCompanyExpense(userId, req.body);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating company expense:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create company expense" });
    }
  });

  // Cleaning expenses
  app.post('/api/expenses/cleaning-batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await transactionService.createCleaningBatch(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating cleaning batch:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create cleaning batch" });
    }
  });

  app.post('/api/expenses/cleaning-detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await importService.importDetailedCleaningExpenses(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating detailed cleaning expenses:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create cleaning expenses" });
    }
  });

  // ==================== ANALYTICS ROUTES ====================
  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      const summary = await analyticsService.getFinancialSummary(userId, startDate as string, endDate as string);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/analytics/monthly/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const monthlyData = await analyticsService.getMonthlyData(userId, year);
      res.json(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ message: "Failed to fetch monthly data" });
    }
  });

  app.get('/api/analytics/property-distribution', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const distribution = await analyticsService.getPropertyStatusDistribution(userId);
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching property distribution:", error);
      res.status(500).json({ message: "Failed to fetch property distribution" });
    }
  });

  app.get('/api/analytics/pivot-table', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { month, year } = req.query;
      const pivotData = await analyticsService.getPivotTableData(userId, parseInt(month as string), parseInt(year as string));
      res.json(pivotData);
    } catch (error) {
      console.error("Error fetching pivot table data:", error);
      res.status(500).json({ message: "Failed to fetch pivot table data" });
    }
  });

  app.get('/api/analytics/transactions-by-periods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { months, propertyIds, transactionTypes, categories } = req.query;
      
      const monthsArray = months ? (typeof months === 'string' ? months.split(',') : months as string[]) : [];
      const propertyIdsArray = propertyIds ? (typeof propertyIds === 'string' ? propertyIds.split(',').map(Number) : propertyIds as number[]) : undefined;
      const typesArray = transactionTypes ? (typeof transactionTypes === 'string' ? transactionTypes.split(',') : transactionTypes as string[]) : undefined;
      const categoriesArray = categories ? (typeof categories === 'string' ? categories.split(',') : categories as string[]) : undefined;
      
      const transactions = await analyticsService.getTransactionsByPeriods(userId, monthsArray, propertyIdsArray, typesArray, categoriesArray);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions by periods:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/analytics/available-months', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const months = await analyticsService.getAvailableMonths(userId);
      res.json(months);
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ message: "Failed to fetch available months" });
    }
  });

  app.get('/api/analytics/pivot-with-ipca', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { months, propertyIds } = req.query;
      
      const monthsArray = months ? (typeof months === 'string' ? months.split(',') : months as string[]) : [];
      const propertyIdsArray = propertyIds ? (typeof propertyIds === 'string' ? propertyIds.split(',').map(Number) : propertyIds as number[]) : undefined;
      
      const results = await analyticsService.calculateProfitWithIPCA(userId, monthsArray, propertyIdsArray);
      res.json(results);
    } catch (error) {
      console.error('Error in pivot-with-ipca:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/analytics/single-month-detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { month } = req.query;
      
      if (!month) {
        return res.status(400).json({ error: 'Month parameter is required' });
      }
      
      const results = await analyticsService.getSingleMonthDetailed(userId, month as string);
      res.json(results);
    } catch (error) {
      console.error('Error in single-month-detailed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // IPCA calculation
  app.get('/api/ipca/calculate', async (req: any, res) => {
    try {
      const { fromDate, toDate, value } = req.query;
      
      if (!fromDate || !toDate || !value) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await analyticsService.calculateIPCA(fromDate as string, toDate as string, parseFloat(value as string));
      res.json(result);
    } catch (error) {
      console.error('Error calculating IPCA:', error);
      res.status(500).json({ error: 'Failed to calculate IPCA' });
    }
  });

  // ==================== CASH FLOW ROUTES ====================
  app.get('/api/analytics/cash-flow', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
      
      const cashFlow = await cashFlowService.getDailyCashFlow(userId, startDate as string, endDate as string);
      res.json(cashFlow);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      res.status(500).json({ error: 'Failed to fetch cash flow' });
    }
  });

  app.get('/api/analytics/cash-flow-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      
      const period = startDate && endDate ? { startDate: startDate as string, endDate: endDate as string } : undefined;
      const stats = await cashFlowService.getCashFlowStats(userId, period);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching cash flow stats:', error);
      res.status(500).json({ error: 'Failed to fetch cash flow stats' });
    }
  });

  app.get('/api/analytics/cash-flow-projection', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const months = req.query.months ? parseInt(req.query.months as string) : 3;
      
      const projection = await cashFlowService.projectCashFlow(userId, months);
      res.json(projection);
    } catch (error) {
      console.error('Error projecting cash flow:', error);
      res.status(500).json({ error: 'Failed to project cash flow' });
    }
  });

  app.get('/api/analytics/cash-flow-health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const health = await cashFlowService.analyzeCashFlowHealth(userId);
      res.json(health);
    } catch (error) {
      console.error('Error analyzing cash flow health:', error);
      res.status(500).json({ error: 'Failed to analyze cash flow health' });
    }
  });

  // ==================== TAX ROUTES ====================
  app.post('/api/taxes/simple', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await taxService.recordSimpleTaxPayment(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error recording tax payment:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to record tax payment" });
    }
  });

  app.post('/api/taxes/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const preview = await taxService.generateTaxPreview(userId, req.body);
      res.json(preview);
    } catch (error) {
      console.error("Error generating tax preview:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate tax preview" });
    }
  });

  app.post('/api/taxes/calculate-pis-cofins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const calculation = await taxService.calculatePisCofins(userId, req.body);
      res.json(calculation);
    } catch (error) {
      console.error("Error calculating PIS/COFINS:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to calculate PIS/COFINS" });
    }
  });

  app.post('/api/taxes/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await taxService.recordTaxPayment(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error recording tax payment:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to record tax payment" });
    }
  });

  app.get('/api/taxes/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const payments = await taxService.getTaxPayments(userId, req.query);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching tax payments:", error);
      res.status(500).json({ message: "Failed to fetch tax payments" });
    }
  });

  app.put('/api/taxes/payments/:id/pay', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const paymentId = parseInt(req.params.id);
      const result = await taxService.markTaxPaymentAsPaid(userId, paymentId);
      res.json(result);
    } catch (error) {
      console.error("Error marking tax payment as paid:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to mark payment as paid" });
    }
  });

  app.get('/api/taxes/summary/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const summary = await taxService.getTaxSummary(userId, year);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching tax summary:", error);
      res.status(500).json({ message: "Failed to fetch tax summary" });
    }
  });

  // ==================== IMPORT ROUTES ====================
  app.post('/api/import/historical', isAuthenticated, upload.single('excel'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
      }

      const userId = getUserId(req);
      const format = req.body.format || 'consolidated';
      const fileBuffer = fs.readFileSync(req.file.path);
      
      const result = await importService.importHistoricalData(userId, fileBuffer, format);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json(result);
    } catch (error) {
      console.error("Error importing historical data:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to import historical data" 
      });
    }
  });

  // Airbnb CSV import routes
  app.post('/api/import/airbnb-csv/analyze', isAuthenticated, uploadCSV.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const csvContent = req.file!.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const analysis = await importService.analyzeAirbnbCSV(userId, csvContent, req.body.type);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing Airbnb CSV:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to analyze CSV" 
      });
    }
  });

  app.post('/api/import/airbnb-csv', isAuthenticated, uploadCSV.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const csvContent = req.file!.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const result = await importService.importAirbnbCSV(userId, csvContent);
      res.json(result);
    } catch (error) {
      console.error("Error importing Airbnb CSV:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to import CSV" 
      });
    }
  });

  app.post('/api/import/airbnb-pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await importService.importPendingReservations(userId, req.body.reservations);
      res.json(result);
    } catch (error) {
      console.error("Error importing pending reservations:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to import reservations" 
      });
    }
  });

  // Cleaning PDF import routes
  app.post('/api/cleaning/parse-pdf', uploadPDF.single('file'), async (req: any, res) => {
    try {
      const pdfBuffer = req.file!.buffer;
      const result = await importService.parseCleaningPDF(pdfBuffer);
      res.json(result);
    } catch (error) {
      console.error("Error parsing cleaning PDF:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to parse PDF" 
      });
    }
  });

  app.post('/api/cleaning/import-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { entries, period } = req.body;
      const result = await importService.importCleaningExpenses(userId, entries, period);
      res.json(result);
    } catch (error) {
      console.error("Error importing cleaning expenses:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to import cleaning expenses" 
      });
    }
  });

  return createServer(app);
}