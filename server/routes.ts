import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { ServiceFactory } from "./services";
import { z } from "zod";
import { cacheMiddleware } from "./middleware/performance";
import multer from "multer";
import * as fs from "fs";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";

// Import validation middleware and error handlers
import { validate, validateMultiple } from "./middleware/validation";
import { 
  AppError, 
  NotFoundError, 
  BadRequestError,
  asyncHandler 
} from "./middleware/errorHandler";

// Import validation schemas
import {
  createPropertySchema,
  updatePropertySchema,
  createTransactionSchema,
  updateTransactionSchema,
  createCompositeExpenseSchema,
  createManagementExpenseSchema,
  updateManagementExpenseSchema,
  createDistributedExpenseSchema,
  createMauricioExpenseSchema,
  createCleaningBatchSchema,
  createTaxPaymentSchema,
  updateTaxPaymentSchema,
  importAirbnbCSVSchema,
  importExcelSchema,
  analyticsQuerySchema,
  monthlyAnalyticsSchema,
  pivotTableQuerySchema,
  cashFlowSettingsSchema,
  createAccountSchema,
  updateAccountSchema,
  createExpenseComponentSchema,
  updateExpenseComponentSchema,
  generateReportSchema,
  cleanupTransactionsSchema,
  createCompanyExpenseSchema,
  setMarcoZeroSchema,
  createReconciliationAdjustmentSchema,
} from "./validation/schemas";

// Import utility validators
import { idSchema } from "./utils/validators";

// Initialize service factory
const serviceFactory = new ServiceFactory(storage);

// Get service instances
const propertyService = serviceFactory.getPropertyService();
const transactionService = serviceFactory.getTransactionService();
const importService = serviceFactory.getImportService();
const analyticsService = serviceFactory.getAnalyticsService();
const taxService = serviceFactory.getTaxService();
const cashFlowService = serviceFactory.getCashFlowService();
const marcoZeroService = serviceFactory.getMarcoZeroService();
const cleaningService = serviceFactory.getCleaningService();

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

// Configure multer for image file uploads (OCR processing)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/bmp', 
      'image/webp',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos (jpg, png, gif, bmp, webp, tiff)'));
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
  if (req.session?.userId) {
    return req.session.userId;
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
  app.get('/api/auth/user', async (req: any, res: Response) => {
    // Return consistent dev user in development mode for simplicity
    const userId = process.env.NODE_ENV === 'development' ? 'dev-user' : req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    return res.json({
      id: userId,
      email: 'dev@example.com',
      name: 'Dev User',
      firstName: 'Dev',
      lastName: 'User'
    });
  });

  // ==================== PROPERTY ROUTES ====================
  app.get('/api/properties', isAuthenticated, cacheMiddleware(300), async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const properties = await propertyService.getProperties(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get('/api/properties/:id', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const propertyId = req.params.id;
      const property = await propertyService.getProperty(propertyId, userId);
      
      if (!property) {
        throw new NotFoundError("Imóvel");
      }
      
      res.json(property);
    })
  );

  app.post('/api/properties', 
    isAuthenticated,
    validate(createPropertySchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const property = await propertyService.createProperty(userId, req.body);
      res.status(201).json(property);
    })
  );

  app.put('/api/properties/:id', 
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ id: idSchema }),
      body: updatePropertySchema 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const propertyId = req.params.id;
      const property = await propertyService.updateProperty(propertyId, userId, req.body);
      
      if (!property) {
        throw new NotFoundError("Imóvel");
      }
      
      res.json(property);
    })
  );

  app.delete('/api/properties/:id', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const propertyId = req.params.id;
      const deleted = await propertyService.deleteProperty(propertyId, userId);
      
      if (!deleted) {
        throw new NotFoundError("Imóvel");
      }
      
      res.status(204).send();
    })
  );

  // Property return rate calculation
  app.get('/api/properties/:id/return-rate/:month/:year', isAuthenticated, async (req: any, res: Response) => {
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
  app.get('/api/properties/:id/expense-components', isAuthenticated, async (req: any, res: Response) => {
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

  app.post('/api/properties/:id/expense-components', isAuthenticated, async (req: any, res: Response) => {
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
  app.post('/api/properties/:id/copy-expense-template', isAuthenticated, async (req: any, res: Response) => {
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
  app.get('/api/transactions', 
    isAuthenticated,
    validateMultiple({ 
      query: z.object({
        limit: z.coerce.number().int().positive().optional(),
        type: z.enum(["revenue", "expense"]).optional(),
        includeChildren: z.coerce.boolean().optional()
      })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { limit, type, includeChildren } = req.query;
      const transactions = await transactionService.getTransactions(userId, type, limit, includeChildren);
      res.json(transactions);
    })
  );

  // Get description suggestions for a category (smart suggestions)
  app.get('/api/transactions/suggestions/:category',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const category = req.params.category;
      const suggestions = await transactionService.getDescriptionSuggestions(userId, category);
      res.json(suggestions);
    })
  );

  app.get('/api/transactions/property/:propertyId', 
    isAuthenticated,
    validateMultiple({ params: z.object({ propertyId: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const propertyId = req.params.propertyId;
      const transactions = await transactionService.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    })
  );

  app.get('/api/properties/:id/transactions', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const propertyId = req.params.id;
      const transactions = await transactionService.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    })
  );

  app.post('/api/transactions', 
    isAuthenticated,
    validate(createTransactionSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transaction = await transactionService.createTransaction(userId, req.body);
      res.status(201).json(transaction);
    })
  );

  app.put('/api/transactions/:id', 
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ id: idSchema }),
      body: updateTransactionSchema 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transactionId = req.params.id;
      const transaction = await transactionService.updateTransaction(transactionId, userId, req.body);
      
      if (!transaction) {
        throw new NotFoundError("Transação");
      }
      
      res.json(transaction);
    })
  );

  app.delete('/api/transactions/:id', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transactionId = req.params.id;
      const deleted = await transactionService.deleteTransaction(transactionId, userId);
      
      if (!deleted) {
        throw new NotFoundError("Transação");
      }
      
      res.status(204).send();
    })
  );

  // Composite transaction
  app.post('/api/transactions/composite', 
    isAuthenticated,
    validate(createCompositeExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await transactionService.createCompositeExpense({ ...req.body, userId });
      res.json(result);
    })
  );

  // Cleanup transactions
  app.delete('/api/cleanup/transactions', 
    isAuthenticated,
    validate(cleanupTransactionsSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { propertyIds } = req.body;
      const result = await transactionService.cleanupTransactions(userId, propertyIds);
      res.json(result);
    })
  );

  // ==================== EXPENSE ROUTES ====================
  app.get('/api/expenses/dashboard', 
    isAuthenticated, 
    cacheMiddleware(60), // Cache for 60 seconds to improve performance
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req);
        
        // Parse query parameters for pagination and filtering
        const { 
          limit = 100, 
          offset = 0, 
          startDate, 
          endDate, 
          propertyId 
        } = req.query;

        const options = {
          limit: parseInt(limit as string) || 100,
          offset: parseInt(offset as string) || 0,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          propertyId: propertyId ? parseInt(propertyId as string) : undefined,
        };

        // Call the optimized service method with pagination
        const result = await transactionService.getExpenseDashboardData(userId, options);
        
        // Add cache headers for better client-side caching
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('Vary', 'Authorization');
        
        res.json(result);
      } catch (error) {
        console.error('Error fetching expense dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch expense data' });
      }
    }
  );

  // Management expenses
  app.get('/api/expenses/management/:id', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transactionId = req.params.id;
      const expense = await transactionService.getManagementExpense(transactionId, userId);
      if (!expense) {
        throw new NotFoundError("Despesa de gestão");
      }
      res.json(expense);
    })
  );

  app.post('/api/expenses/management', 
    isAuthenticated,
    validate(createManagementExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await transactionService.createManagementExpense(userId, req.body);
      res.json(result);
    })
  );

  app.put('/api/expenses/management/:id', 
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ id: idSchema }),
      body: updateManagementExpenseSchema 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transactionId = req.params.id;
      const result = await transactionService.updateManagementExpense(transactionId, userId, req.body);
      res.json(result);
    })
  );

  // Distributed expenses
  app.post('/api/expenses/distributed', 
    isAuthenticated,
    validate(createDistributedExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await transactionService.createDistributedExpense(userId, req.body);
      res.json(result);
    })
  );

  app.post('/api/expenses/distributed/preview', 
    isAuthenticated,
    validate(createDistributedExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const preview = await transactionService.generateDistributedExpensePreview(userId, req.body);
      res.json(preview);
    })
  );

  // Company expenses
  app.post('/api/expenses/company', 
    isAuthenticated,
    validate(createCompanyExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const transaction = await transactionService.createCompanyExpense(userId, req.body);
      res.json(transaction);
    })
  );

  // Cleaning expenses
  app.post('/api/expenses/cleaning-batch', 
    isAuthenticated,
    validate(createCleaningBatchSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await transactionService.createCleaningBatch(userId, req.body);
      res.json(result);
    })
  );
  
  // Maurício expense with equal distribution
  app.post('/api/expenses/mauricio', 
    isAuthenticated,
    validate(createMauricioExpenseSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await transactionService.createMauricioExpense(userId, req.body);
      res.status(201).json(result);
    })
  );

  app.post('/api/expenses/cleaning-detailed', isAuthenticated, async (req: any, res: Response) => {
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
  app.get('/api/analytics/summary', 
    isAuthenticated,
    validateMultiple({ 
      query: z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional()
      })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      const summary = await analyticsService.getFinancialSummary(userId, startDate, endDate);
      res.json(summary);
    })
  );

  app.get('/api/analytics/monthly/:year', 
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ 
        year: z.coerce.number().int().min(2020).max(2100) 
      }) 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const year = req.params.year;
      const monthlyData = await analyticsService.getMonthlyData(userId, year);
      res.json(monthlyData);
    })
  );

  app.get('/api/analytics/property-distribution', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const distribution = await analyticsService.getPropertyStatusDistribution(userId);
      res.json(distribution);
    })
  );

  app.get('/api/analytics/pivot-table', 
    isAuthenticated,
    validateMultiple({ 
      query: pivotTableQuerySchema
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { month, year } = req.query;
      const pivotData = await analyticsService.getPivotTableData(userId, month, year);
      res.json(pivotData);
    })
  );

  app.get('/api/analytics/transactions-by-periods', isAuthenticated, async (req: any, res: Response) => {
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

  app.get('/api/analytics/available-months', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const months = await analyticsService.getAvailableMonths(userId);
      res.json(months);
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ message: "Failed to fetch available months" });
    }
  });

  app.get('/api/analytics/pivot-with-ipca', isAuthenticated, async (req: any, res: Response) => {
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

  app.get('/api/analytics/single-month-detailed', isAuthenticated, async (req: any, res: Response) => {
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
  app.get('/api/ipca/calculate', async (req: any, res: Response) => {
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
  app.get('/api/analytics/cash-flow', 
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req);
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        
        let startDate: string;
        let endDate: string;
        
        if (period) {
          // Convert period to date range
          const today = new Date();
          let daysToShow = 5; // Default
          
          if (period === '1d') daysToShow = 1;
          else if (period === '2d') daysToShow = 2;
          else if (period === '3d') daysToShow = 3;
          else if (period === '4d') daysToShow = 4;
          else if (period === '5d') daysToShow = 5;
          else if (period === '1m') daysToShow = 30;
          else if (period === '2m') daysToShow = 60;
          
          startDate = format(today, 'yyyy-MM-dd');
          endDate = format(addDays(today, daysToShow - 1), 'yyyy-MM-dd');
        } else if (queryStartDate && queryEndDate) {
          startDate = queryStartDate as string;
          endDate = queryEndDate as string;
        } else {
          // Default to 5 days from today
          const today = new Date();
          startDate = format(today, 'yyyy-MM-dd');
          endDate = format(addDays(today, 4), 'yyyy-MM-dd');
        }
        
        const cashFlow = await cashFlowService.getDailyCashFlow(userId, startDate, endDate);
        res.json(cashFlow);
      } catch (error) {
        console.error('Error fetching cash flow:', error);
        res.status(500).json({ message: 'Failed to fetch cash flow' });
      }
    }
  );

  app.get('/api/analytics/cash-flow-stats', 
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req);
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        
        let startDate: string | undefined;
        let endDate: string | undefined;
        
        if (period) {
          // Convert period to date range
          const today = new Date();
          let daysToShow = 5; // Default
          
          if (period === '1d') daysToShow = 1;
          else if (period === '2d') daysToShow = 2;
          else if (period === '3d') daysToShow = 3;
          else if (period === '4d') daysToShow = 4;
          else if (period === '5d') daysToShow = 5;
          else if (period === '1m') daysToShow = 30;
          else if (period === '2m') daysToShow = 60;
          
          startDate = format(today, 'yyyy-MM-dd');
          endDate = format(addDays(today, daysToShow - 1), 'yyyy-MM-dd');
        } else if (queryStartDate && queryEndDate) {
          startDate = queryStartDate as string;
          endDate = queryEndDate as string;
        }
        
        const periodParam = startDate && endDate ? { startDate, endDate } : undefined;
        const stats = await cashFlowService.getCashFlowStats(userId, periodParam);
        res.json(stats);
      } catch (error) {
        console.error('Error fetching cash flow stats:', error);
        res.status(500).json({ message: 'Failed to fetch cash flow stats' });
      }
    }
  );

  app.get('/api/analytics/cash-flow-projection', 
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req);
        const months = parseInt(req.query.months as string) || 3;
        // Validar range manualmente
        const validMonths = Math.min(Math.max(months, 1), 24);
        const projection = await cashFlowService.projectCashFlow(userId, validMonths);
        res.json(projection);
      } catch (error) {
        console.error('Error fetching cash flow projection:', error);
        res.status(500).json({ message: 'Failed to fetch cash flow projection' });
      }
    }
  );

  app.get('/api/analytics/cash-flow-health', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const health = await cashFlowService.analyzeCashFlowHealth(userId);
      res.json(health);
    } catch (error) {
      console.error('Error analyzing cash flow health:', error);
      res.status(500).json({ error: 'Failed to analyze cash flow health' });
    }
  });

  // ==================== CLEANING SERVICE ROUTES ====================
  
  // Import cleaning batch
  app.post('/api/cleaning/import', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const { cleanings, paymentDate, description, advanceAmount } = req.body;
      
      const result = await cleaningService.importCleaningBatch(
        userId,
        cleanings,
        paymentDate,
        description,
        advanceAmount
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error importing cleaning batch:', error);
      res.status(500).json({ error: 'Failed to import cleaning batch' });
    }
  });
  
  // Process OCR text
  app.post('/api/cleaning/ocr', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const { ocrText } = req.body;
      
      const result = await cleaningService.processOCRText(userId, ocrText);
      res.json(result);
    } catch (error) {
      console.error('Error processing OCR text:', error);
      res.status(500).json({ error: 'Failed to process OCR text' });
    }
  });
  
  // Match cleanings to properties
  app.post('/api/cleaning/match', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const { cleanings } = req.body;
      
      const result = await cleaningService.matchCleaningsToProperties(userId, cleanings);
      res.json(result);
    } catch (error) {
      console.error('Error matching cleanings:', error);
      res.status(500).json({ error: 'Failed to match cleanings to properties' });
    }
  });
  
  // Learn property mapping
  app.post('/api/cleaning/mapping', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const { variation, propertyId } = req.body;
      
      const result = await cleaningService.learnPropertyMapping(userId, variation, propertyId);
      res.json(result);
    } catch (error) {
      console.error('Error learning property mapping:', error);
      res.status(500).json({ error: 'Failed to learn property mapping' });
    }
  });
  
  // Get cleanings for a property
  app.get('/api/cleaning/property/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const { startDate, endDate } = req.query;
      
      const cleanings = await cleaningService.getCleaningsByProperty(
        userId,
        propertyId,
        startDate as string,
        endDate as string
      );
      
      res.json(cleanings);
    } catch (error) {
      console.error('Error fetching property cleanings:', error);
      res.status(500).json({ error: 'Failed to fetch property cleanings' });
    }
  });
  
  // Get all cleaning batches
  app.get('/api/cleaning/batches', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const batches = await cleaningService.getCleaningBatches(userId);
      res.json(batches);
    } catch (error) {
      console.error('Error fetching cleaning batches:', error);
      res.status(500).json({ error: 'Failed to fetch cleaning batches' });
    }
  });
  
  // Get cleaning batch with services
  app.get('/api/cleaning/batch/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const batchId = parseInt(req.params.id);
      
      const result = await cleaningService.getCleaningBatchWithServices(userId, batchId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching cleaning batch:', error);
      res.status(500).json({ error: 'Failed to fetch cleaning batch' });
    }
  });
  
  // Delete cleaning batch
  app.delete('/api/cleaning/batch/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const batchId = parseInt(req.params.id);
      
      const success = await cleaningService.deleteCleaningBatch(userId, batchId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Batch not found' });
      }
    } catch (error) {
      console.error('Error deleting cleaning batch:', error);
      res.status(500).json({ error: 'Failed to delete cleaning batch' });
    }
  });

  // Parse cleaning PDF
  app.post('/api/cleaning/parse-pdf', 
    isAuthenticated, 
    uploadPDF.single('file'), 
    async (req: any, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Import the parser function
        const { parseCleaningPdf } = await import('./cleaningPdfParser');
        
        // Parse the PDF
        const parsedData = await parseCleaningPdf(req.file.buffer);
        
        // Get user's properties to match against
        const userId = getUserId(req);
        const properties = await propertyService.getProperties(userId);
        
        // Match entries with properties and update the propertyId field
        const entriesWithPropertyIds = parsedData.entries.map(entry => {
          // Find matching property by name
          const matchingProperty = properties.find(p => 
            p.name?.toLowerCase() === entry.propertyName.toLowerCase()
          );
          
          if (matchingProperty) {
            return {
              ...entry,
              propertyId: matchingProperty.id.toString(),
              matched: true
            };
          }
          
          return entry;
        });
        
        // Update parsed data with the enhanced entries
        const responseData = {
          ...parsedData,
          entries: entriesWithPropertyIds
        };
        
        res.json(responseData);
      } catch (error) {
        console.error('Error parsing PDF:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to parse PDF' 
        });
      }
    }
  );

  // Import cleaning expenses from parsed PDF
  app.post('/api/cleaning/import-pdf',
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req);
        const { entries, supplier, paymentDate } = req.body;
        
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
          return res.status(400).json({ error: 'No entries to import' });
        }
        
        // Filter only matched entries
        const matchedEntries = entries.filter((e: any) => e.matched && e.propertyId);
        
        if (matchedEntries.length === 0) {
          return res.status(400).json({ error: 'No matched properties to import' });
        }
        
        // Create cleaning batch with the matched entries
        const cleanings = matchedEntries.map((entry: any) => ({
          propertyId: parseInt(entry.propertyId),
          executionDate: entry.date,
          amount: entry.value
        }));
        
        const result = await cleaningService.importCleaningBatch(
          userId,
          cleanings,
          paymentDate,
          supplier || 'Serviço de Limpeza'
        );
        
        res.json({
          success: true,
          message: `${matchedEntries.length} limpezas importadas com sucesso`,
          batch: result.batch,
          services: result.services
        });
      } catch (error) {
        console.error('Error importing cleaning expenses:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to import cleaning expenses' 
        });
      }
    }
  );

  // ==================== TAX ROUTES ====================
  app.post('/api/taxes/simple', 
    isAuthenticated,
    validate(createTaxPaymentSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await taxService.recordSimpleTaxPayment(userId, req.body);
      res.json(result);
    })
  );

  app.post('/api/taxes/preview', 
    isAuthenticated,
    validate(createTaxPaymentSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const preview = await taxService.generateTaxPreview(userId, req.body);
      res.json(preview);
    })
  );

  app.post('/api/taxes/calculate-pis-cofins', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const calculation = await taxService.calculatePisCofins(userId, req.body);
      res.json(calculation);
    } catch (error) {
      console.error("Error calculating PIS/COFINS:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to calculate PIS/COFINS" });
    }
  });

  // Tax import from Excel
  app.post('/api/taxes/import/excel', 
    isAuthenticated,
    upload.single('file'),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      const fileBuffer = await fs.promises.readFile(req.file.path);
      const result = await taxService.importTaxesFromExcel(userId, fileBuffer);
      
      // Clean up uploaded file
      await fs.promises.unlink(req.file.path);
      
      res.json(result);
    })
  );

  // Tax import from CSV
  app.post('/api/taxes/import/csv',
    isAuthenticated,
    uploadCSV.single('file'),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      const csvContent = req.file.buffer.toString('utf-8');
      const result = await taxService.importTaxesFromCSV(userId, csvContent);
      
      res.json(result);
    })
  );

  app.post('/api/taxes/payments', 
    isAuthenticated,
    validate(createTaxPaymentSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const result = await taxService.recordTaxPayment(userId, req.body);
      res.json(result);
    })
  );

  app.get('/api/taxes/payments', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req);
      const payments = await taxService.getTaxPayments(userId, req.query);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching tax payments:", error);
      res.status(500).json({ message: "Failed to fetch tax payments" });
    }
  });

  app.put('/api/taxes/payments/:id/pay', 
    isAuthenticated,
    validateMultiple({ params: z.object({ id: idSchema }) }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const paymentId = req.params.id;
      const result = await taxService.markTaxPaymentAsPaid(userId, paymentId);
      res.json(result);
    })
  );

  app.get('/api/taxes/summary/:year', 
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ 
        year: z.coerce.number().int().min(2020).max(2100) 
      }) 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const year = req.params.year;
      const summary = await taxService.getTaxSummary(userId, year);
      res.json(summary);
    })
  );

  // ==================== ADVANCED TAX SYSTEM ROUTES ====================
  
  // Initialize tax settings for user
  app.post('/api/taxes/initialize', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      await taxService.initializeTaxSettings(userId);
      res.json({ success: true, message: 'Tax settings initialized' });
    })
  );

  // Get tax settings
  app.get('/api/taxes/settings', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { taxType, effectiveDate } = req.query;
      const settings = await taxService.getTaxSettings(
        userId, 
        taxType as string | undefined,
        effectiveDate as string | undefined
      );
      res.json(settings);
    })
  );

  // Update tax settings
  app.put('/api/taxes/settings/:taxType', 
    isAuthenticated,
    validateMultiple({
      params: z.object({ taxType: z.string() }),
      body: z.object({
        rate: z.string().optional(),
        baseRate: z.string().optional(),
        additionalRate: z.string().optional(),
        additionalThreshold: z.string().optional(),
        paymentFrequency: z.enum(['monthly', 'quarterly']).optional(),
        dueDay: z.number().optional(),
        installmentAllowed: z.boolean().optional(),
        installmentThreshold: z.string().optional(),
        installmentCount: z.number().optional()
      })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { taxType } = req.params;
      const settings = await taxService.updateTaxSettings(userId, taxType, req.body);
      res.json(settings);
    })
  );

  // Calculate tax projections for a month
  app.post('/api/taxes/calculate', 
    isAuthenticated,
    validate(z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      propertyIds: z.array(z.number()).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { referenceMonth, propertyIds } = req.body;
      const projections = await taxService.calculateTaxProjections(userId, referenceMonth, propertyIds);
      res.json({
        success: true,
        message: `Projeções de impostos calculadas para ${referenceMonth}`,
        projections
      });
    })
  );

  // Get tax projections
  app.get('/api/taxes/projections', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { startDate, endDate, taxType, status } = req.query;
      const projections = await taxService.getTaxProjections(userId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        taxType: taxType as string | undefined,
        status: status as string | undefined
      });
      res.json(projections);
    })
  );

  // Update tax projection (manual override)
  app.patch('/api/taxes/projections/:id', 
    isAuthenticated,
    validateMultiple({
      params: z.object({ id: idSchema }),
      body: z.object({
        totalAmount: z.union([z.string(), z.number()]).optional(),
        notes: z.string().optional()
      })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const projectionId = req.params.id;
      const projection = await taxService.updateTaxProjection(userId, projectionId, req.body);
      res.json({
        success: true,
        message: 'Projeção atualizada com sucesso',
        projection
      });
    })
  );

  // Confirm tax projection and create transaction
  app.post('/api/taxes/projections/:id/confirm', 
    isAuthenticated,
    validateMultiple({
      params: z.object({ id: idSchema })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const projectionId = req.params.id;
      const result = await taxService.confirmTaxProjection(userId, projectionId);
      res.json({
        success: true,
        message: 'Projeção confirmada e transação criada',
        ...result
      });
    })
  );

  // Recalculate projections for a month
  app.post('/api/taxes/recalculate', 
    isAuthenticated,
    validate(z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/)
    })),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { referenceMonth } = req.body;
      await taxService.recalculateProjectionsForMonth(userId, referenceMonth);
      res.json({
        success: true,
        message: `Projeções recalculadas para ${referenceMonth}`
      });
    })
  );

  // Get tax projections for cash flow
  app.get('/api/taxes/cash-flow-projections', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }
      
      const projections = await taxService.projectTaxesToCashFlow(
        userId, 
        startDate as string, 
        endDate as string
      );
      res.json(projections);
    })
  );

  // Generate tax report
  app.get('/api/taxes/report/:year', 
    isAuthenticated,
    validateMultiple({
      params: z.object({ 
        year: z.coerce.number().int().min(2020).max(2100) 
      })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const year = req.params.year;
      const report = await taxService.generateTaxReport(userId, year);
      res.json(report);
    })
  );

  // ==================== ENHANCED TAX MANAGEMENT ROUTES ====================
  
  // Get taxes by period with filters
  app.get('/api/taxes/period',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { startDate, endDate, propertyIds, taxTypes } = req.query;
      
      const result = await taxService.getTaxesByPeriod(userId, {
        startDate: startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        propertyIds: propertyIds ? propertyIds.split(',').map(Number) : undefined,
        taxTypes: taxTypes ? taxTypes.split(',') : undefined
      });
      
      res.json(result);
    })
  );

  // Get property tax distribution
  app.get('/api/taxes/distribution',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { startDate, endDate, taxTypes } = req.query;
      
      const result = await taxService.getPropertyTaxDistribution(userId, {
        startDate: startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        taxTypes: taxTypes ? taxTypes.split(',') : undefined
      });
      
      res.json(result);
    })
  );

  // Get monthly tax comparison
  app.get('/api/taxes/monthly-comparison/:year',
    isAuthenticated,
    validateMultiple({ 
      params: z.object({ 
        year: z.coerce.number().int().min(2020).max(2100) 
      }) 
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const result = await taxService.getMonthlyComparison(userId, year);
      res.json(result);
    })
  );

  // Calculate enhanced tax projections
  app.post('/api/taxes/projections-enhanced',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { months, baseOnLastMonths, seasonalAdjustment } = req.body;
      
      const result = await taxService.calculateTaxProjectionsEnhanced(userId, {
        months: months || 3,
        baseOnLastMonths: baseOnLastMonths || 3,
        seasonalAdjustment: seasonalAdjustment || false
      });
      
      res.json(result);
    })
  );

  // ==================== IMPORT ROUTES ====================
  app.post('/api/import/historical', isAuthenticated, upload.single('excel'), async (req: any, res: Response) => {
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
  app.post('/api/import/airbnb-csv/analyze', isAuthenticated, uploadCSV.single('file'), async (req: any, res: Response) => {
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

  app.post('/api/import/airbnb-csv', isAuthenticated, uploadCSV.single('file'), async (req: any, res: Response) => {
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

  app.post('/api/import/airbnb-pending', isAuthenticated, async (req: any, res: Response) => {
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
  app.post('/api/cleaning/parse-pdf', uploadPDF.single('file'), async (req: any, res: Response) => {
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

  app.post('/api/cleaning/import-pdf', isAuthenticated, async (req: any, res: Response) => {
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

  // ==================== MARCO ZERO ROUTES ====================
  
  // Get active Marco Zero
  app.get('/api/marco-zero/active', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const activeMarco = await marcoZeroService.getActiveMarco(userId);
      res.json(activeMarco);
    })
  );

  // Get Marco Zero history
  app.get('/api/marco-zero/history', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const history = await marcoZeroService.getMarcoHistory(userId);
      res.json(history);
    })
  );

  // Set Marco Zero
  app.post('/api/marco-zero', 
    isAuthenticated,
    validate(setMarcoZeroSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const { marcoDate, accountBalances, notes } = req.body;
      
      const newMarco = await marcoZeroService.setMarcoZero(
        userId, 
        marcoDate, 
        accountBalances, 
        notes
      );
      
      // Update accounts with marco balances if specified
      if (req.body.updateAccounts) {
        await marcoZeroService.updateAccountsWithMarcoBalances(userId, accountBalances);
      }
      
      res.json({
        success: true,
        message: 'Marco Zero definido com sucesso',
        marco: newMarco
      });
    })
  );

  // Get reconciliation adjustments
  app.get('/api/reconciliation', 
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const marcoZeroId = req.query.marcoZeroId ? parseInt(req.query.marcoZeroId as string) : undefined;
      const adjustments = await marcoZeroService.getReconciliationAdjustments(userId, marcoZeroId);
      res.json(adjustments);
    })
  );

  // Create reconciliation adjustment
  app.post('/api/reconciliation', 
    isAuthenticated,
    validate(createReconciliationAdjustmentSchema),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const adjustment = await marcoZeroService.createReconciliationAdjustment(userId, req.body);
      res.json({
        success: true,
        message: 'Ajuste de reconciliação criado com sucesso',
        adjustment
      });
    })
  );

  // Delete reconciliation adjustment
  app.delete('/api/reconciliation/:id', 
    isAuthenticated,
    validateMultiple({
      params: z.object({ id: idSchema })
    }),
    asyncHandler(async (req: any, res: Response) => {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const success = await marcoZeroService.deleteReconciliationAdjustment(id, userId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Ajuste de reconciliação removido com sucesso'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Ajuste não encontrado'
        });
      }
    })
  );

  // ==================== CONDOMINIUM OCR ROUTES ====================
  
  // Process condominium bill OCR
  app.post('/api/condominium/ocr',
    isAuthenticated,
    uploadImage.single('image'),
    asyncHandler(async (req: any, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'Nenhuma imagem foi enviada'
          });
        }

        // Import the OCR parser
        const { parseCondominiumBill } = await import('./condominiumOcrParser');
        
        // Process the image with OCR
        const result = await parseCondominiumBill(req.file.buffer);
        
        res.json(result);
      } catch (error) {
        console.error('Error in condominium OCR:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Erro no processamento OCR'
        });
      }
    })
  );

  return createServer(app);
}