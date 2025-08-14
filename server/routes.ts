import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// For now, use Replit auth while we prepare the migration
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertTransactionSchema, type Property, cashFlowSettings, transactions as transactions, taxPayments, cleaningServiceDetails as cleaningServiceDetails, properties } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import { db } from "./db";
import { eq, and, gte, lte, lt, asc, desc, sql, inArray, or } from "drizzle-orm";
import { parseAirbnbCSV, mapListingToProperty } from "./csvParser";
import { format } from "date-fns";


// Helper function to clean numeric, date and text fields
function cleanPropertyData(data: any) {
  return {
    ...data,
    // Keep decimal fields as strings (for Drizzle decimal type compatibility)
    purchasePrice: data.purchasePrice === '' || data.purchasePrice === undefined ? null : data.purchasePrice,
    commissionValue: data.commissionValue === '' || data.commissionValue === undefined ? null : data.commissionValue,
    taxesAndRegistration: data.taxesAndRegistration === '' || data.taxesAndRegistration === undefined ? null : data.taxesAndRegistration,
    renovationAndDecoration: data.renovationAndDecoration === '' || data.renovationAndDecoration === undefined ? null : data.renovationAndDecoration,
    otherInitialValues: data.otherInitialValues === '' || data.otherInitialValues === undefined ? null : data.otherInitialValues,
    area: data.area === '' || data.area === undefined ? null : data.area,
    marketValue: data.marketValue === '' || data.marketValue === undefined ? null : data.marketValue,
    // Convert integer fields from string to number
    bedrooms: (!data.bedrooms || data.bedrooms === '') ? null : (typeof data.bedrooms === 'string' ? parseInt(data.bedrooms) : data.bedrooms),
    bathrooms: (!data.bathrooms || data.bathrooms === '') ? null : (typeof data.bathrooms === 'string' ? parseInt(data.bathrooms) : data.bathrooms),
    // Clean date fields - convert empty strings to null
    purchaseDate: data.purchaseDate === '' || data.purchaseDate === undefined ? null : data.purchaseDate,
    marketValueDate: data.marketValueDate === '' || data.marketValueDate === undefined ? null : data.marketValueDate,
    // Clean address fields - convert empty strings to null
    condominiumName: data.condominiumName === '' || data.condominiumName === undefined ? null : data.condominiumName,
    street: data.street === '' || data.street === undefined ? null : data.street,
    number: data.number === '' || data.number === undefined ? null : data.number,
    tower: data.tower === '' || data.tower === undefined ? null : data.tower,
    unit: data.unit === '' || data.unit === undefined ? null : data.unit,
    neighborhood: data.neighborhood === '' || data.neighborhood === undefined ? null : data.neighborhood,
    city: data.city === '' || data.city === undefined ? null : data.city,
    state: data.state === '' || data.state === undefined ? null : data.state,
    country: data.country === '' || data.country === undefined ? null : data.country,
    zipCode: data.zipCode === '' || data.zipCode === undefined ? null : data.zipCode,
    registration: data.registration === '' || data.registration === undefined ? null : data.registration,
    iptuCode: data.iptuCode === '' || data.iptuCode === undefined ? null : data.iptuCode,
    // Financing fields
    isFullyPaid: data.isFullyPaid === undefined ? false : data.isFullyPaid,
    financingAmount: data.financingAmount === '' || data.financingAmount === undefined ? null : data.financingAmount,
  };
}

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

// Helper function to build Airbnb property mapping
async function buildAirbnbPropertyMapping(userId: string): Promise<Record<string, string>> {
  // Get existing properties to build dynamic mapping
  const existingProps = await storage.getProperties(userId);
  
  // Build dynamic Airbnb property mapping based on airbnb_name field
  const dynamicMapping: Record<string, string> = {};
  for (const prop of existingProps) {
    if (prop.airbnbName && prop.airbnbName.trim()) {
      // Use the property's nickname if available, otherwise use the name
      const targetName = prop.nickname && prop.nickname.trim() ? prop.nickname : prop.name;
      dynamicMapping[prop.airbnbName] = targetName;
    }
  }
  
  // Add any manual mappings that might not have airbnb_name set
  const manualMappings: Record<string, string> = {
    "1 Suíte + Quintal privativo": "Sevilha G07",
    "1 Suíte Wonderful Einstein Morumbi": "Sevilha 307", 
    "2 Quartos + Quintal Privativo": "Málaga M07",
    "2 quartos, maravilhoso, na Avenida Berrini": "MaxHaus Berrini",
    "Sesimbra SeaView Studio 502: Sol, Luxo e Mar": "Sesimbra ap 505- Portugal",
    "Studio Premium - Haddock Lobo.": "Next Haddock Lobo",
    "Studio Premium - Haddock Lobo": "Next Haddock Lobo",
    "Studio Premium - Thera by Yoo": "Thera by Yoo",
    "Wonderful EINSTEIN Morumbi": "IGNORE",
    "Ganhos não relacionados a anúncios Créditos, resoluções e outros tipos de renda": "OTHER_INCOME"
  };
  
  // Merge manual mappings (they override automatic ones if there's a conflict)
  return { ...dynamicMapping, ...manualMappings };
}

// Helper function to build property ID map considering all name fields
async function buildPropertyIdMap(userId: string): Promise<Map<string, number>> {
  const existingProps = await storage.getProperties(userId);
  const propertyMap = new Map<string, number>();
  
  for (const prop of existingProps) {
    // Map by original name
    propertyMap.set(prop.name, prop.id);
    
    // Map by nickname if exists
    if (prop.nickname && prop.nickname.trim()) {
      propertyMap.set(prop.nickname, prop.id);
    }
    
    // Map by Airbnb name if exists  
    if (prop.airbnbName && prop.airbnbName.trim()) {
      propertyMap.set(prop.airbnbName, prop.id);
    }
  }
  
  return propertyMap;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
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

  // Property routes
  app.get('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const properties = await storage.getProperties(userId);
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
      const property = await storage.getProperty(propertyId, userId);
      
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
      const cleanedData = cleanPropertyData(req.body);
      const validatedData = insertPropertySchema.parse(cleanedData);
      
      const property = await storage.createProperty({
        ...validatedData,
        userId,
      });
      
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.put('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      
      console.log("Received data for update:", JSON.stringify(req.body, null, 2));
      
      const cleanedData = cleanPropertyData(req.body);
      
      console.log("Cleaned data:", JSON.stringify(cleanedData, null, 2));
      
      const validatedData = insertPropertySchema.partial().parse(cleanedData);
      
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      
      const property = await storage.updateProperty(propertyId, validatedData, userId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      console.log("Updated property:", JSON.stringify(property, null, 2));
      
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete('/api/properties/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      
      const deleted = await storage.deleteProperty(propertyId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Property analytics route
  app.get('/api/properties/:id/return-rate/:month/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      
      // Get property
      const property = await storage.getProperty(propertyId, userId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Calculate total acquisition cost
      const totalAcquisitionCost = storage.calculateTotalAcquisitionCost(property);
      
      // Get monthly transactions for the property
      const allTransactions = await storage.getTransactionsByProperty(propertyId, userId);
      
      // Filter transactions for the specific month/year
      const monthlyTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() === year;
      });
      
      // Calculate monthly revenue and expenses
      const monthlyRevenue = monthlyTransactions
        .filter(t => t.type === 'revenue')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const netMonthlyIncome = monthlyRevenue - monthlyExpenses;
      
      // Calculate monthly return rate as percentage
      let monthlyReturnRate = 0;
      if (totalAcquisitionCost > 0) {
        monthlyReturnRate = (netMonthlyIncome / totalAcquisitionCost) * 100;
      }
      
      res.json({
        propertyId,
        propertyName: property.nickname || property.name,
        month,
        year,
        totalAcquisitionCost,
        monthlyRevenue,
        monthlyExpenses,
        netMonthlyIncome,
        monthlyReturnRate,
        formattedReturnRate: `${monthlyReturnRate >= 0 ? '' : '-'}${Math.abs(monthlyReturnRate).toFixed(2)}%`
      });
    } catch (error) {
      console.error("Error calculating return rate:", error);
      res.status(500).json({ message: "Failed to calculate return rate" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const type = req.query.type as string | undefined;
      
      // Get transactions based on type filter if provided
      let transactions;
      if (type) {
        transactions = await storage.getTransactionsByType(userId, type, limit);
      } else {
        transactions = await storage.getTransactions(userId, limit);
      }
      
      // Include property names in transactions
      const enrichedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.propertyId) {
            const property = await storage.getProperty(transaction.propertyId, userId);
            return {
              ...transaction,
              propertyName: property?.name || 'Unknown Property'
            };
          }
          return transaction;
        })
      );
      
      res.json(enrichedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/property/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.propertyId);
      const transactions = await storage.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching property transactions:", error);
      res.status(500).json({ message: "Failed to fetch property transactions" });
    }
  });

  // Alternative route pattern for property transactions
  app.get('/api/properties/:id/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const propertyId = parseInt(req.params.id);
      const transactions = await storage.getTransactionsByProperty(propertyId, userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching property transactions:", error);
      res.status(500).json({ message: "Failed to fetch property transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertTransactionSchema.parse(req.body);
      
      const transaction = await storage.createTransaction({
        ...validatedData,
        userId,
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      
      const transaction = await storage.updateTransaction(transactionId, validatedData, userId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const transactionId = parseInt(req.params.id);
      
      const deleted = await storage.deleteTransaction(transactionId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Optimized endpoint for expense dashboard
  app.get('/api/expenses/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get only expense transactions with properties joined
      // Exclude parent transactions (isCompositeParent = true) from dashboard
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
          sql`${transactions.propertyId} IS NOT NULL` // Exclude parent transactions (they have propertyId = null)
        ))
        .orderBy(desc(transactions.date));
      
      res.json(expenseData);
    } catch (error) {
      console.error('Error fetching expense dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch expense data' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      
      const summary = await storage.getFinancialSummary(
        userId,
        startDate as string,
        endDate as string
      );
      
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
      
      const monthlyData = await storage.getMonthlyData(userId, year);
      res.json(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ message: "Failed to fetch monthly data" });
    }
  });

  app.get('/api/analytics/property-distribution', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const distribution = await storage.getPropertyStatusDistribution(userId);
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching property distribution:", error);
      res.status(500).json({ message: "Failed to fetch property distribution" });
    }
  });

  app.get('/api/analytics/pivot-table', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const currentDate = new Date();
      const month = parseInt(req.query.month as string) || (currentDate.getMonth() + 1);
      const year = parseInt(req.query.year as string) || currentDate.getFullYear();
      
      const data = await storage.getPivotTableData(userId, month, year);
      res.json(data);
    } catch (error) {
      console.error("Error fetching pivot table data:", error);
      res.status(500).json({ message: "Failed to fetch pivot table data" });
    }
  });

  app.get('/api/analytics/transactions-by-periods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const months = req.query.months ? (req.query.months as string).split(',') : [];
      const propertyIds = req.query.propertyIds ? (req.query.propertyIds as string).split(',').map(Number) : undefined;
      const transactionTypes = req.query.transactionTypes ? (req.query.transactionTypes as string).split(',') : undefined;
      const categories = req.query.categories ? (req.query.categories as string).split(',') : undefined;
      
      const data = await storage.getTransactionsByPeriods(userId, months, propertyIds, transactionTypes, categories);
      res.json(data);
    } catch (error) {
      console.error("Error fetching transactions by periods:", error);
      res.status(500).json({ message: "Failed to fetch transactions data" });
    }
  });;

  // Historical Data Import Route
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
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      let importedCount = 0;
      const errors: string[] = [];
      const summary = {
        properties: 0,
        revenues: 0,
        expenses: 0,
        years: [] as string[]
      };

      // Property names from user's list
      const PROPERTY_NAMES = [
        "Sevilha 307", "Sevilha G07", "Málaga M07", "MaxHaus 43R", "Salas Brasal",
        "Next Haddock Lobo ap 33", "Sesimbra ap 505- Portugal", "Thera by You",
        "Casa Ibirapuera torre 3 ap 1411", "Living Full Faria Lima setor 1 res 1808"
      ];

      // Create properties first if they don't exist
      const existingProperties = await storage.getProperties(userId);
      const existingPropertyNames = new Set(existingProperties.map(p => p.name));
      
      for (const propertyName of PROPERTY_NAMES) {
        if (!existingPropertyNames.has(propertyName)) {
          try {
            const propertyInput = {
              userId,
              name: propertyName,
              address: "Endereço a ser preenchido",
              type: "apartment" as const,
              status: "active" as const,
              rentalValue: 0,
              currency: propertyName.includes("Portugal") ? "EUR" : "BRL",
            };

            const validatedData = insertPropertySchema.extend({ userId: z.string() }).parse(propertyInput);
            await storage.createProperty(validatedData);
            summary.properties++;
          } catch (error) {
            errors.push(`Erro ao criar imóvel ${propertyName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }

      // Get updated properties list
      const allProperties = await storage.getProperties(userId);
      const propertyMap = new Map(allProperties.map(p => [p.name.toLowerCase(), p.id]));

      // Process sheets by year (2022, 2023, 2024, 2025)
      const years = ['2022', '2023', '2024', '2025'];
      
      for (const year of years) {
        if (workbook.SheetNames.includes(year)) {
          summary.years.push(year);
          const sheet = workbook.Sheets[year];
          
          // For consolidated format, look for data in specific cells
          if (format === 'consolidated') {
            // Process each property's data
            const dataCells = ['C39', 'C56', 'C73', 'C90', 'C107', 'C124', 'C141', 'C158', 'C175', 'C192'];
            
            for (let i = 0; i < PROPERTY_NAMES.length && i < dataCells.length; i++) {
              const propertyName = PROPERTY_NAMES[i];
              const propertyId = propertyMap.get(propertyName.toLowerCase());
              
              if (!propertyId) {
                errors.push(`Imóvel ${propertyName} não encontrado`);
                continue;
              }

              // Extract monthly data around the specified cell
              const baseCell = dataCells[i];
              const baseCellRef = XLSX.utils.decode_cell(baseCell);
              
              // Try to extract monthly revenue and expense data
              for (let month = 1; month <= 12; month++) {
                try {
                  // Look for revenue data (assuming it's in rows below the base cell)
                  const revenueCell = XLSX.utils.encode_cell({ r: baseCellRef.r + month, c: baseCellRef.c });
                  const expenseCell = XLSX.utils.encode_cell({ r: baseCellRef.r + month, c: baseCellRef.c + 1 });
                  
                  const revenueValue = sheet[revenueCell]?.v;
                  const expenseValue = sheet[expenseCell]?.v;
                  
                  if (revenueValue && typeof revenueValue === 'number' && revenueValue > 0) {
                    const transactionInput = {
                      userId,
                      propertyId,
                      type: "revenue" as const,
                      category: "rent" as const,
                      description: `Receita ${propertyName} - ${month.toString().padStart(2, '0')}/${year}`,
                      amount: revenueValue.toString(),
                      date: `${year}-${month.toString().padStart(2, '0')}-15`,
                      currency: propertyName.includes("Portugal") ? "EUR" : "BRL",
                    };

                    const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
                    await storage.createTransaction(validatedData);
                    summary.revenues++;
                    importedCount++;
                  }

                  if (expenseValue && typeof expenseValue === 'number' && expenseValue > 0) {
                    const transactionInput = {
                      userId,
                      propertyId,
                      type: "expense" as const,
                      category: "maintenance" as const,
                      description: `Despesa ${propertyName} - ${month.toString().padStart(2, '0')}/${year}`,
                      amount: expenseValue.toString(),
                      date: `${year}-${month.toString().padStart(2, '0')}-15`,
                      currency: propertyName.includes("Portugal") ? "EUR" : "BRL",
                    };

                    const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
                    await storage.createTransaction(validatedData);
                    summary.expenses++;
                    importedCount++;
                  }
                } catch (error) {
                  // Skip invalid data
                }
              }
            }
          }
        }
      }

      res.json({
        success: true,
        message: `Importação histórica concluída com sucesso`,
        importedCount,
        summary,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined
      });

    } catch (error) {
      console.error('Error importing historical data:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  });

  // Excel Import Route
  app.post('/api/import/excel', isAuthenticated, upload.single('excel'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
      }

      const userId = getUserId(req);
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      let importedCount = 0;
      const errors: string[] = [];

      // Process Properties sheet
      if (workbook.SheetNames.includes('Imoveis')) {
        const propertySheet = workbook.Sheets['Imoveis'];
        const propertyData = XLSX.utils.sheet_to_json(propertySheet);
        
        for (let i = 0; i < propertyData.length; i++) {
          try {
            const row = propertyData[i] as any;
            
            const propertyInput = {
              userId,
              name: row.nome || row.name || `Imóvel ${i + 1}`,
              address: row.endereco || row.address || '',
              type: row.tipo || row.type || 'apartment',
              status: row.status || 'active',
              rentalValue: parseFloat(row.valor_aluguel || row.rental_value || '0'),
              currency: row.moeda || row.currency || 'BRL',
            };

            // Validate with schema (extend to include userId)
            const validatedData = insertPropertySchema.extend({ userId: z.string() }).parse(propertyInput);
            await storage.createProperty(validatedData);
            importedCount++;
          } catch (error) {
            errors.push(`Linha ${i + 2} (Imóveis): ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }

      // Process Transactions sheet
      if (workbook.SheetNames.includes('Transacoes')) {
        const transactionSheet = workbook.Sheets['Transacoes'];
        const transactionData = XLSX.utils.sheet_to_json(transactionSheet);
        
        // Get user's properties to match by name
        const userProperties = await storage.getProperties(userId);
        const propertyMap = new Map(userProperties.map(p => [p.name.toLowerCase(), p.id]));
        
        for (let i = 0; i < transactionData.length; i++) {
          try {
            const row = transactionData[i] as any;
            
            // Find property by name
            const propertyName = (row.imovel_nome || row.property_name || '').toLowerCase();
            const propertyId = propertyMap.get(propertyName);
            
            if (!propertyId) {
              errors.push(`Linha ${i + 2} (Transações): Imóvel "${row.imovel_nome || row.property_name}" não encontrado`);
              continue;
            }

            const transactionInput = {
              userId,
              propertyId,
              type: row.tipo || row.type || 'revenue',
              category: row.categoria || row.category || 'rent',
              description: row.descricao || row.description || '',
              amount: parseFloat(row.valor || row.amount || '0'),
              date: row.data || row.date || new Date().toISOString().split('T')[0],
              currency: row.moeda || row.currency || 'BRL',
            };

            // Validate with schema (extend to include userId)
            const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
            await storage.createTransaction(validatedData);
            importedCount++;
          } catch (error) {
            errors.push(`Linha ${i + 2} (Transações): ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }

      res.json({
        success: true,
        message: `Importação concluída com sucesso`,
        importedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit errors shown
      });

    } catch (error) {
      console.error('Error importing Excel:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  });

  // Simple Format Import Route (One sheet per property)
  app.post('/api/import/simple-format', upload.single('file'), isAuthenticated, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
      }

      const userId = getUserId(req);
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      let importedCount = 0;
      let revenues = 0;
      let expenses = 0;
      const errors: string[] = [];
      const processedYears = new Set<string>();

      // Property names mapping
      const propertyNames = [
        "Sevilha 307", "Sevilha G07", "Málaga M07", "Living Faro", "Living Colina",
        "Living Full Faria Lima setor 1 res 1808", "Living Full Faria Lima setor 2 res 1009",
        "Living Dona Benta 63-2", "Living Dona Benta 41-2", "Rua Luis Coelho"
      ];

      // Process each sheet (assuming each sheet is a property)
      for (const sheetName of sheetNames) {
        try {
          // Check if sheet name matches any of our properties
          const matchedProperty = propertyNames.find(prop => 
            prop.toLowerCase().includes(sheetName.toLowerCase()) || 
            sheetName.toLowerCase().includes(prop.toLowerCase())
          );

          if (!matchedProperty) {
            errors.push(`Aba "${sheetName}" não corresponde a nenhum imóvel conhecido`);
            continue;
          }

          // Create or get property
          let property;
          const existingProperties = await storage.getProperties(userId);
          const existingProperty = existingProperties.find(p => p.name === matchedProperty);
          
          if (existingProperty) {
            property = existingProperty;
          } else {
            // Determine currency based on property location
            const currency = matchedProperty.toLowerCase().includes('living') ? 'BRL' : 'EUR';
            property = await storage.createProperty({
              userId,
              name: matchedProperty,
              address: matchedProperty,
              type: 'apartment',
              status: 'active',
              rentalType: 'monthly',
              currency: currency
            });
          }

          // Read sheet data
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Define column mapping (A=0, B=1, C=2, etc.)
          const columnMapping = {
            date: 0,           // A: Data
            rentRevenue: 1,    // B: Receita – Aluguel
            otherRevenue: 2,   // C: Receita - Outras receitas
            totalRevenue: 3,   // D: Receita - Receita Total
            taxes: 4,          // E: Despesa – Impostos
            management: 5,     // F: Despesa - Gestão (Maurício)
            condo: 6,          // G: Despesa – Condomínio
            condoFee: 7,       // H: Taxa Condominial
            electricity: 8,    // I: Despesa – Luz
            gasWater: 9,       // J: Despesa - Gás e Água
            commission: 10,    // K: Despesa – Comissões
            iptu: 11,          // L: Despesa – Iptu
            financing: 12,     // M: Despesa – Financiamento
            maintenance: 13,   // N: Despesa - Conserto/Manutenção
            internet: 14,      // O: Despesa - TV / Internet
            cleaning: 15,      // P: Despesa – Limpeza
            totalExpenses: 16  // Q: Despesa - Total Despesas
          };

          // Process each row (starting from row 2 to skip headers)
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 2) continue;

            const dateStr = row[columnMapping.date]?.toString()?.trim();
            if (!dateStr) continue;

            // Parse date - accept various formats
            let transactionDate: Date;
            let monthYear = '';
            
            if (dateStr.match(/^\d{4}-\d{2}$/)) {
              // Format: 2025-01
              transactionDate = new Date(dateStr + '-01');
              monthYear = dateStr;
              processedYears.add(dateStr.substring(0, 4));
            } else if (dateStr.match(/^\d{2}\/\d{4}$/)) {
              // Format: 01/2025
              const [month, year] = dateStr.split('/');
              transactionDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
              monthYear = `${year}-${month.padStart(2, '0')}`;
              processedYears.add(year);
            } else if (dateStr.toLowerCase().includes('janeiro') || dateStr.toLowerCase().includes('jan')) {
              // Handle month names - assume 2025 for now
              const monthNames = {
                'janeiro': '01', 'jan': '01',
                'fevereiro': '02', 'fev': '02',
                'março': '03', 'mar': '03',
                'abril': '04', 'abr': '04',
                'maio': '05', 'mai': '05',
                'junho': '06', 'jun': '06',
                'julho': '07', 'jul': '07',
                'agosto': '08', 'ago': '08',
                'setembro': '09', 'set': '09',
                'outubro': '10', 'out': '10',
                'novembro': '11', 'nov': '11',
                'dezembro': '12', 'dez': '12'
              };
              
              const monthName = Object.keys(monthNames).find(name => 
                dateStr.toLowerCase().includes(name)
              );
              
              if (monthName) {
                const monthNum = monthNames[monthName as keyof typeof monthNames];
                transactionDate = new Date(`2025-${monthNum}-01`);
                monthYear = `2025-${monthNum}`;
                processedYears.add('2025');
              } else {
                errors.push(`Data inválida na aba "${sheetName}": ${dateStr}`);
                continue;
              }
            } else {
              errors.push(`Data inválida na aba "${sheetName}": ${dateStr}`);
              continue;
            }

            // Process revenue columns
            const revenuePairs = [
              { col: columnMapping.rentRevenue, category: 'rent', description: 'Aluguel' },
              { col: columnMapping.otherRevenue, category: 'other', description: 'Outras receitas' }
            ];

            for (const { col, category, description } of revenuePairs) {
              const value = parseFloat(row[col]?.toString()?.replace(/[^\d.-]/g, '') || '0');
              if (value > 0) {
                await storage.createTransaction({
                  userId,
                  propertyId: property.id,
                  type: 'revenue',
                  category,
                  description: `${description} - ${monthYear}`,
                  amount: value.toString(),
                  currency: property.currency || 'EUR',
                  date: transactionDate.toISOString().split('T')[0]
                });
                revenues++;
                importedCount++;
              }
            }

            // Process expense columns
            const expensePairs = [
              { col: columnMapping.taxes, category: 'taxes', description: 'Impostos' },
              { col: columnMapping.management, category: 'other', description: 'Gestão (Maurício)' },
              { col: columnMapping.condo, category: 'maintenance', description: 'Condomínio' },
              { col: columnMapping.condoFee, category: 'maintenance', description: 'Taxa Condominial' },
              { col: columnMapping.electricity, category: 'utilities', description: 'Luz' },
              { col: columnMapping.gasWater, category: 'utilities', description: 'Gás e Água' },
              { col: columnMapping.commission, category: 'other', description: 'Comissões' },
              { col: columnMapping.iptu, category: 'taxes', description: 'IPTU' },
              { col: columnMapping.financing, category: 'other', description: 'Financiamento' },
              { col: columnMapping.maintenance, category: 'maintenance', description: 'Conserto/Manutenção' },
              { col: columnMapping.internet, category: 'utilities', description: 'TV / Internet' },
              { col: columnMapping.cleaning, category: 'maintenance', description: 'Limpeza' }
            ];

            for (const { col, category, description } of expensePairs) {
              const value = parseFloat(row[col]?.toString()?.replace(/[^\d.-]/g, '') || '0');
              if (value > 0) {
                await storage.createTransaction({
                  userId,
                  propertyId: property.id,
                  type: 'expense',
                  category,
                  description: `${description} - ${monthYear}`,
                  amount: value.toString(),
                  currency: property.currency || 'EUR',
                  date: transactionDate.toISOString().split('T')[0]
                });
                expenses++;
                importedCount++;
              }
            }
          }

        } catch (error) {
          console.error(`Error processing sheet ${sheetName}:`, error);
          errors.push(`Erro ao processar aba "${sheetName}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }

      res.json({
        success: true,
        message: `Importação concluída: ${importedCount} transações processadas`,
        importedCount,
        summary: {
          properties: propertyNames.length,
          revenues,
          expenses,
          years: Array.from(processedYears).sort()
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('Error in simple format import:', error);
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  });

  // Horizontal Format Import Route (Specific format for Sevilha properties)
  app.post('/api/import/horizontal-format', upload.single('file'), isAuthenticated, async (req: any, res) => {
    console.log('Horizontal format import request received');
    
    // Ensure we send JSON response regardless of what happens
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('File received:', req.file ? 'yes' : 'no');
      console.log('User:', req.user ? 'authenticated' : 'not authenticated');
      
      if (!req.user || !getUserId(req)) {
        console.log('Authentication failed - no user or claims');
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
      }

      console.log('File details:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const userId = getUserId(req);
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      let importedCount = 0;
      let revenues = 0;
      let expenses = 0;
      const errors: string[] = [];
      const processedYears = new Set<string>();

      // Property names mapping for all user properties
      const propertyNames = [
        "Sevilha 307", 
        "Sevilha G07", 
        "Málaga M07", 
        "MaxHaus 43R", 
        "Salas Brasal", 
        "Next Haddock Lobo ap 33", 
        "Thera by You", 
        "Casa Ibirapuera torre 3 ap 1411", 
        "Living Full Faria Lima setor 1"
      ];

      // Process each sheet (each sheet represents a property)
      for (const sheetName of sheetNames) {
        try {
          // Check if sheet name matches any of our properties
          const matchedProperty = propertyNames.find(prop => {
            const propLower = prop.toLowerCase().trim();
            const sheetLower = sheetName.toLowerCase().trim();
            return propLower.includes(sheetLower) || sheetLower.includes(propLower);
          });

          if (!matchedProperty) {
            errors.push(`Aba "${sheetName}" não corresponde a nenhuma propriedade conhecida`);
            continue;
          }

          // Create or get property
          let property;
          try {
            const existingProperties = await storage.getProperties(userId);
            property = existingProperties.find(p => p.name === matchedProperty);
            
            if (!property) {
              // Create the property
              const propertyInput = {
                userId,
                name: matchedProperty,
                address: `Endereço ${matchedProperty}`,
                type: "apartment" as const,
                status: "active" as const,
                rentalType: "monthly" as const,
                rentalAmount: "0",
                currency: "EUR"
              };
              
              const validatedProperty = insertPropertySchema.extend({ userId: z.string() }).parse(propertyInput);
              property = await storage.createProperty(validatedProperty);
            }
          } catch (error) {
            errors.push(`Erro ao criar/encontrar imóvel ${matchedProperty}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            continue;
          }

          const sheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          
          // Process horizontal format: each row is a month
          // Skip header row (row 0)
          for (let row = 1; row <= range.e.r; row++) {
            try {
              // Column A: Data
              const dateCell = XLSX.utils.encode_cell({ r: row, c: 0 });
              const dateValue = sheet[dateCell]?.v;
              
              if (!dateValue) continue;
              
              // Parse date
              let transactionDate: Date;
              if (typeof dateValue === 'number') {
                // Excel date number
                transactionDate = new Date((dateValue - 25569) * 86400 * 1000);
              } else if (typeof dateValue === 'string') {
                transactionDate = new Date(dateValue);
              } else {
                continue;
              }
              
              if (isNaN(transactionDate.getTime())) continue;
              
              const year = transactionDate.getFullYear();
              const month = transactionDate.getMonth() + 1;
              processedYears.add(year.toString());
              
              // Column B: Receita - Aluguel
              const rentCell = XLSX.utils.encode_cell({ r: row, c: 1 });
              const rentValue = sheet[rentCell]?.v;
              
              if (rentValue && typeof rentValue === 'number' && rentValue > 0) {
                const transactionInput = {
                  userId,
                  propertyId: property.id,
                  type: "revenue" as const,
                  category: "rent" as const,
                  description: `Aluguel ${matchedProperty} - ${month.toString().padStart(2, '0')}/${year}`,
                  amount: rentValue.toString(),
                  date: transactionDate.toISOString().split('T')[0],
                  currency: "EUR",
                };

                const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
                await storage.createTransaction(validatedData);
                revenues++;
                importedCount++;
              }
              
              // Column C: Receita - Outras receitas
              const otherRevenueCell = XLSX.utils.encode_cell({ r: row, c: 2 });
              const otherRevenueValue = sheet[otherRevenueCell]?.v;
              
              if (otherRevenueValue && typeof otherRevenueValue === 'number' && otherRevenueValue > 0) {
                const transactionInput = {
                  userId,
                  propertyId: property.id,
                  type: "revenue" as const,
                  category: "other" as const,
                  description: `Outras receitas ${matchedProperty} - ${month.toString().padStart(2, '0')}/${year}`,
                  amount: otherRevenueValue.toString(),
                  date: transactionDate.toISOString().split('T')[0],
                  currency: "EUR",
                };

                const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
                await storage.createTransaction(validatedData);
                revenues++;
                importedCount++;
              }
              
              // Process expenses (columns E to P)
              const expenseCategories = [
                { col: 4, category: 'taxes', name: 'Impostos' },
                { col: 5, category: 'management', name: 'Gestão (Maurício)' },
                { col: 6, category: 'maintenance', name: 'Condomínio' },
                { col: 7, category: 'utilities', name: 'Taxa Condominial' },
                { col: 8, category: 'utilities', name: 'Luz' },
                { col: 9, category: 'utilities', name: 'Gás e Água' },
                { col: 10, category: 'management', name: 'Comissões' },
                { col: 11, category: 'taxes', name: 'IPTU' },
                { col: 12, category: 'financing', name: 'Financiamento' },
                { col: 13, category: 'maintenance', name: 'Conserto/Manutenção' },
                { col: 14, category: 'utilities', name: 'TV / Internet' },
                { col: 15, category: 'maintenance', name: 'Limpeza' }
              ];
              
              for (const expenseCategory of expenseCategories) {
                const expenseCell = XLSX.utils.encode_cell({ r: row, c: expenseCategory.col });
                const expenseValue = sheet[expenseCell]?.v;
                
                if (expenseValue && typeof expenseValue === 'number' && expenseValue > 0) {
                  const transactionInput = {
                    userId,
                    propertyId: property.id,
                    type: "expense" as const,
                    category: expenseCategory.category as any,
                    description: `${expenseCategory.name} ${matchedProperty} - ${month.toString().padStart(2, '0')}/${year}`,
                    amount: expenseValue.toString(),
                    date: transactionDate.toISOString().split('T')[0],
                    currency: "EUR",
                  };

                  const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionInput);
                  await storage.createTransaction(validatedData);
                  expenses++;
                  importedCount++;
                }
              }
              
            } catch (error) {
              console.error(`Error processing row ${row} in sheet ${sheetName}:`, error);
              errors.push(`Erro na linha ${row + 1} da aba "${sheetName}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          }
        } catch (error) {
          console.error(`Error processing sheet ${sheetName}:`, error);
          errors.push(`Erro ao processar aba "${sheetName}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }

      res.json({
        success: true,
        message: `Importação concluída: ${importedCount} transações processadas`,
        importedCount,
        summary: {
          properties: sheetNames.length,
          revenues,
          expenses,
          years: Array.from(processedYears)
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('Error in horizontal format import:', error);
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  });

  // Airbnb CSV Analysis Route (preview before import)
  app.post('/api/import/airbnb-csv/analyze', isAuthenticated, uploadCSV.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Handle pending reservations analysis (FormData request with type=pending)
      if (req.body.type === 'pending' && req.file) {
        console.log('🔮 Processando análise de reservas futuras via FormData');
        
        const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          return res.status(400).json({ success: false, message: "Arquivo CSV vazio ou inválido" });
        }

        // Robust CSV parsing function that handles quoted fields
        function parseCSVLine(line: string): string[] {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          result.push(current.trim());
          return result;
        }

        const headers = parseCSVLine(lines[0]);
        console.log('🔮 Headers encontrados:', headers);

        // Use the centralized Airbnb property mapping
        const AIRBNB_PROPERTY_MAPPING = await buildAirbnbPropertyMapping(userId);

        const properties = new Set<string>();
        const periods = new Set<string>();
        let totalRevenue = 0;
        let reservationCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = parseCSVLine(line);
          if (values.length < headers.length) continue;

          const row: Record<string, string> = {};
          headers.forEach((header: string, index: number) => {
            row[header] = values[index] || '';
          });

          const tipo = row['Tipo'];
          const anuncio = row['Anúncio'];
          const dataInicio = row['Data de início'] || row['Data'];
          const valor = parseFloat(row['Valor']?.replace(',', '.') || '0');
          const ganhosBrutos = parseFloat(row['Valor']?.replace(',', '.') || '0');

          console.log(`🔮 Linha ${i}: ${tipo} - ${anuncio} - Data: ${dataInicio} - Valor: R$ ${valor} | Ganhos: R$ ${ganhosBrutos}`);

          if (tipo === 'Reserva' && anuncio && valor > 0) {
            const mappedPropertyName = AIRBNB_PROPERTY_MAPPING[anuncio];
            if (mappedPropertyName) {
              properties.add(mappedPropertyName);
              totalRevenue += valor;
              reservationCount++;
              
              if (dataInicio) {
                const [month, day, year] = dataInicio.split('/');
                periods.add(`${month.padStart(2, '0')}/${year}`);
              }
            } else {
              console.log(`⚠️ Propriedade "${anuncio}" não mapeada`);
            }
          }
        }

        console.log(`🔮 Resumo: ${reservationCount} reservas, R$ ${totalRevenue}, ${properties.size} propriedades`);

        const responseData = {
          success: true,
          analysis: {
            properties: Array.from(properties),
            periods: Array.from(periods).sort(),
            summary: {
              reservationCount,
              totalRevenue,
              propertyCount: properties.size,
              periodCount: periods.size
            }
          }
        };
        
        console.log('🔮 ENVIANDO RESPOSTA DE ANÁLISE:', JSON.stringify(responseData, null, 2));
        return res.json(responseData);
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Nenhum arquivo enviado" });
      }

      // Airbnb property name mapping
      const AIRBNB_PROPERTY_MAPPING: Record<string, string> = {
        "1 Suíte + Quintal privativo": "Sevilha G07",
        "1 Suíte Wonderful Einstein Morumbi": "Sevilha 307", 
        "2 Quartos + Quintal Privativo": "Málaga M07",
        "2 quartos, maravilhoso, na Avenida Berrini": "MaxHaus 43R",
        "Sesimbra SeaView Studio 502: Sol, Luxo e Mar": "Sesimbra ap 505- Portugal",
        "Studio Premium - Haddock Lobo.": "Next Haddock Lobo ap 33",
        "Wonderful EINSTEIN Morumbi": "IGNORE",
        "Ganhos não relacionados a anúncios Créditos, resoluções e outros tipos de renda": "OTHER_INCOME"
      };

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remove BOM
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      
      if (lines.length <= 1) {
        return res.status(400).json({ success: false, message: "Arquivo CSV vazio ou inválido" });
      }

      // Parse CSV header - handle quoted fields properly
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      
      // Analyze the CSV to identify date ranges and properties
      const dateRanges = new Set<string>();
      const propertiesInFile = new Set<string>();
      const allDates: Date[] = [];
      let reservationCount = 0;
      let totalRevenue = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length < headers.length) continue;
        
        const row: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          row[header] = values[index] || '';
        });
        
        const tipo = row['Tipo'];
        const dataPagamento = row['Data']; // Data do pagamento/transação
        
        // Analyze payouts (actual amounts received)
        if (tipo === 'Payout' && dataPagamento) {
          // Due to CSV formatting issues, the payout value might be in different columns
          // Try to find the numeric value in the row (should be after BRL currency indicator)
          const rowValues = Object.values(row);
          let actualPayoutValue = 0;
          
          // Look for the first positive numeric value after we see "BRL"
          let foundBRL = false;
          for (const value of rowValues) {
            if (typeof value === 'string') {
              if (value.includes('BRL')) {
                foundBRL = true;
              } else if (foundBRL) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                  actualPayoutValue = numValue;
                  break;
                }
              }
            }
          }
          
          if (actualPayoutValue > 0) {
            totalRevenue += actualPayoutValue;
            
            // Extract month-year from payment date
            const [month, day, year] = dataPagamento.split('/');
            if (month && day && year) {
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              allDates.push(date);
              dateRanges.add(`${year}-${month.padStart(2, '0')}`);
            }
          }
        }
        
        // Count unique reservations for statistics
        const anuncio = row['Anúncio'];
        const ganhosBrutos = parseFloat(row['Valor'] || '0');
        if (tipo === 'Reserva' && anuncio && ganhosBrutos > 0) {
          const mappedPropertyName = AIRBNB_PROPERTY_MAPPING[anuncio];
          if (mappedPropertyName && mappedPropertyName !== 'IGNORE' && mappedPropertyName !== 'OTHER_INCOME') {
            propertiesInFile.add(mappedPropertyName);
            reservationCount++;
          }
        }
      }
      
      // Find date range
      let startDate = null;
      let endDate = null;
      if (allDates.length > 0) {
        allDates.sort((a, b) => a.getTime() - b.getTime());
        startDate = allDates[0];
        endDate = allDates[allDates.length - 1];
      }

      res.json({
        success: true,
        analysis: {
          properties: Array.from(propertiesInFile),
          periods: Array.from(dateRanges),
          dateRange: {
            start: startDate?.toISOString() || null,
            end: endDate?.toISOString() || null
          },
          summary: {
            reservationCount,
            totalRevenue,
            propertyCount: propertiesInFile.size,
            periodCount: dateRanges.size
          }
        },
        fileBuffer: req.file.buffer.toString('base64') // Store for later processing
      });

    } catch (error) {
      console.error("Erro durante análise do Airbnb:", error);
      res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  });

  // Unified Airbnb CSV Import Route (handles both historical and future reservations)
  app.post('/api/import/airbnb-csv', isAuthenticated, (req: any, res, next) => {
    uploadCSV.single('file')(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Arquivo não encontrado" });
      }

      // Check if this is a future reservations import
      const isFutureImport = req.body.importType === 'future';
      console.log(`🔄 Iniciando importação Airbnb CSV - Tipo: ${isFutureImport ? 'Reservas Futuras' : 'Dados Históricos'}`);

      // Build dynamic Airbnb property name mapping
      const AIRBNB_PROPERTY_MAPPING = await buildAirbnbPropertyMapping(userId);
      console.log('📊 Mapeamento dinâmico carregado (linha 1650):', Object.keys(AIRBNB_PROPERTY_MAPPING).length, 'mapeamentos');

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remove BOM
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      
      if (lines.length <= 1) {
        return res.status(400).json({ success: false, message: "Arquivo CSV vazio ou inválido" });
      }

      // Parse CSV header - handle quoted fields properly
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      console.log('Headers:', headers);
      console.log('Total lines:', lines.length);
      
      // Log available columns for debugging
      console.log('🔍 Colunas disponíveis:', headers.map((h, i) => `${i}: "${h}"`).join(', '));
      
      // Also log first few data rows for debugging
      console.log('🔍 Primeiras linhas de dados:');
      for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
        const sampleRow = parseCSVLine(lines[i]);
        console.log(`   Linha ${i}:`, sampleRow.slice(0, 5).join(' | '));
      }
      
      // Log analysis of all payout values
      console.log('🔍 Análise de todos os payouts no CSV:');
      let totalPayouts = 0;
      let payoutCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length > 2 && row[2] === 'Payout') {
          const date = row[0];
          // Para payouts, o valor está SEMPRE na coluna "Pago" (index 14)
          let value = parseFloat(row[14]) || 0;
          
          if (date && value > 0) {
            totalPayouts += value;
            payoutCount++;
            console.log(`   Payout ${payoutCount}: ${date} -> R$ ${value}`);
          }
        }
      }
      
      console.log(`🎯 TOTAL PAYOUTS: R$ ${totalPayouts.toFixed(2)} (${payoutCount} payouts)`);
      
      // STEP 1: Identify all payouts in the new CSV file
      console.log('🔍 STEP 1: Identificando payouts no novo CSV...');
      const newPayouts = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        
        if (row.length >= 14 && row[2] === 'Payout') {
          const date = row[0];
          const amount = parseFloat(row[14]) || 0;
          
          if (date && amount > 0) {
            const [month, day, year] = date.split('/');
            const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            newPayouts.push({
              date: transactionDate.toISOString().split('T')[0],
              amount: amount,
              csvLine: i
            });
          }
        }
      }
      
      console.log(`🔍 Encontrados ${newPayouts.length} payouts no novo CSV:`);
      newPayouts.forEach(payout => {
        console.log(`   ${payout.date}: R$ ${payout.amount.toFixed(2)}`);
      });
      
      // STEP 2: Detectar intervalo de datas do relatório e remover TODAS as transações Airbnb neste período
      console.log('🔍 STEP 2: Detectando intervalo de datas do relatório...');
      
      // Calcular data inicial e final do relatório
      const allPayoutDates = newPayouts.map(p => new Date(p.date));
      allPayoutDates.sort((a, b) => a.getTime() - b.getTime());
      
      const startDate = allPayoutDates[0];
      const endDate = allPayoutDates[allPayoutDates.length - 1];
      
      console.log(`📅 INTERVALO DETECTADO: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);
      
      // Buscar TODAS as transações Airbnb no intervalo de datas
      const allTransactions = await storage.getTransactions(userId);
      const airbnbTransactionsInRange = allTransactions.filter(t => {
        if (!t.description.includes('Airbnb')) return false;
        
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      console.log(`🔍 Encontradas ${airbnbTransactionsInRange.length} transações Airbnb no intervalo para remoção`);
      
      // STEP 3: Remover TODAS as transações Airbnb no período do relatório
      console.log('🔍 STEP 3: Removendo TODAS as transações Airbnb no período...');
      let deletedCount = 0;
      
      for (const existingTransaction of airbnbTransactionsInRange) {
        console.log(`🧹 Removendo: ${existingTransaction.id} - ${existingTransaction.description} - R$ ${existingTransaction.amount} - ${new Date(existingTransaction.date).toLocaleDateString('pt-BR')}`);
        const deleted = await storage.deleteTransaction(existingTransaction.id, userId);
        if (deleted) deletedCount++;
      }
      
      console.log(`🧹 Removidas ${deletedCount} transações Airbnb no período de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);
      
      // STEP 4: Process new payouts sequentially - only those identified in STEP 1
      console.log('🔍 STEP 4: Processando novos payouts de forma sequencial...');
      let importedCount = 0;
      const errors: string[] = [];
      
      // Process only the new payouts identified in step 1
      console.log(`🔍 Processando ${newPayouts.length} novos payouts...`);
      
      for (const newPayout of newPayouts) {
        const i = newPayout.csvLine;
        const row = parseCSVLine(lines[i]);
        
        console.log(`🔍 Processando payout sequencial: ${newPayout.date} -> R$ ${newPayout.amount.toFixed(2)}`);
        
        const date = row[0];
        const payoutAmount = newPayout.amount;
        
        // Parse date - CSV format is MM/DD/YYYY
        const [month, day, year] = date.split('/');
        const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        console.log(`🗓️  Data processada: ${date} -> ${transactionDate.toISOString().split('T')[0]}`);
        
        // Find all reservations between this payout and the next one
        // The Airbnb CSV format shows reservations right after their corresponding payout
        const reservationsForPayout = [];
        console.log(`🔍 Procurando reservas após linha ${i} para payout de ${date}`);
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextRow = parseCSVLine(lines[j]);
          
          // Stop if we hit another payout or end of relevant data
          if (nextRow.length >= 3 && nextRow[2] === 'Payout') {
            console.log(`🛑 Parou na linha ${j}: encontrou próximo payout`);
            break;
          }
          
          // Check if this is a reservation (any date) or adjustment
          if (nextRow.length >= 10 && (nextRow[2] === 'Reserva' || nextRow[2] === 'Ajuste' || nextRow[2] === 'Ajuste de Resolução')) {
            console.log(`📝 Linha ${j}: Tipo="${nextRow[2]}", Data="${nextRow[0]}", Anúncio="${nextRow[9]}", Valor="${nextRow[13]}"`);
            
            // For reservations and adjustments, the date in column 0 is the payout date
            // We should process it if it matches the current payout date
            if (nextRow[0] === date) {
              const anuncio = nextRow[9];
              const mappedPropertyName = AIRBNB_PROPERTY_MAPPING[anuncio];
              console.log(`   → Anúncio "${anuncio}" mapeado para "${mappedPropertyName}"`);
              
              if (mappedPropertyName && mappedPropertyName !== 'IGNORE' && mappedPropertyName !== 'OTHER_INCOME') {
                const value = parseFloat(nextRow[13]) || 0;
                // Only add if value is not zero (skip adjustments with no value)
                if (value !== 0) {
                  console.log(`   ✓ Adicionando reserva: ${mappedPropertyName} = R$ ${value}`);
                  reservationsForPayout.push({
                    propertyName: mappedPropertyName,
                    anuncio: anuncio,
                    value: value
                  });
                } else {
                  console.log(`   ✗ Valor zero, ignorando`);
                }
              } else {
                console.log(`   ✗ Propriedade ignorada ou não mapeada`);
              }
            } else {
              console.log(`   ✗ Data não corresponde ao payout (${nextRow[0]} != ${date})`);
            }
          }
        }
        
        console.log(`📊 Payout ${date}: ${reservationsForPayout.length} reservas encontradas`);
        
        if (reservationsForPayout.length === 0) {
          console.log(`⚠️  Nenhuma reserva encontrada para payout de ${date}`);
          continue;
        }
        
        // Calculate the total value of all reservations for this payout
        const totalReservationValue = reservationsForPayout.reduce((sum, r) => sum + r.value, 0);
        console.log(`📊 Total reservas: R$ ${totalReservationValue.toFixed(2)}, Payout: R$ ${payoutAmount.toFixed(2)}`);
        
        // Distribute the payout proportionally among the reservations
        for (const reservation of reservationsForPayout) {
          const proportion = totalReservationValue > 0 ? reservation.value / totalReservationValue : 1 / reservationsForPayout.length;
          const distributedAmount = payoutAmount * proportion;
          
          console.log(`📊 ${reservation.propertyName}: R$ ${reservation.value.toFixed(2)} (${(proportion * 100).toFixed(1)}%) = R$ ${distributedAmount.toFixed(2)}`);
          
          // Find property in database using the property map that considers all name fields
          const propertyMap = await buildPropertyIdMap(userId);
          const propertyId = propertyMap.get(reservation.propertyName);
          
          if (!propertyId) {
            errors.push(`Propriedade não encontrada: ${reservation.propertyName}`);
            console.log(`❌ Propriedade não encontrada no mapa: ${reservation.propertyName}`);
            continue;
          }
          
          const property = await storage.getProperty(propertyId, userId);
          
          if (!property) {
            errors.push(`Propriedade ID ${propertyId} não encontrada no banco`);
            continue;
          }
          
          // Create transaction for this property
          const transactionData = {
            userId,
            propertyId: property.id,
            type: 'revenue' as const,
            category: 'rent',
            description: `Airbnb - Payout (${reservation.anuncio})`,
            amount: distributedAmount.toString(),
            date: transactionDate.toISOString().split('T')[0],
            currency: 'BRL'
          };
          
          try {
            console.log(`🔄 Salvando transação sequencial:`, JSON.stringify(transactionData, null, 2));
            const savedTransaction = await storage.createTransaction(transactionData);
            console.log(`✅ Transação salva com ID: ${savedTransaction.id}`);
            importedCount++;
            console.log(`✅ Importado sequencialmente: ${reservation.propertyName} - ${date} - R$ ${distributedAmount.toFixed(2)}`);
          } catch (error) {
            console.error(`❌ Erro ao criar transação: ${error}`);
            errors.push(`Erro ao criar transação para ${reservation.propertyName}: ${error}`);
          }
        }

      }
      
      console.log(`✅ Importação concluída: ${importedCount} transações importadas`);
      
      // STEP 5: Final validation - compare imported values with CSV report
      console.log('🔍 STEP 5: Validação final - comparando valores importados com relatório CSV...');
      
      // Get all current Airbnb transactions after import
      const currentTransactions = await storage.getTransactions(userId);
      const currentAirbnbTransactions = currentTransactions.filter(t => t.description.includes('Airbnb'));
      
      // Group current transactions by property and date
      const currentByProperty = new Map();
      currentAirbnbTransactions.forEach(t => {
        const propertyName = t.propertyId;
        const dateKey = t.date instanceof Date ? t.date.toISOString().split('T')[0] : 
                        typeof t.date === 'string' ? t.date : 
                        new Date(t.date).toISOString().split('T')[0];
        
        if (!currentByProperty.has(propertyName)) {
          currentByProperty.set(propertyName, new Map());
        }
        
        if (!currentByProperty.get(propertyName).has(dateKey)) {
          currentByProperty.get(propertyName).set(dateKey, 0);
        }
        
        currentByProperty.get(propertyName).set(dateKey, 
          currentByProperty.get(propertyName).get(dateKey) + parseFloat(t.amount));
      });
      
      // Get property names for comparison
      const allProperties = await storage.getProperties(userId);
      const propertyIdToName = new Map();
      allProperties.forEach(p => propertyIdToName.set(p.id, p.name));
      
      // Compare each payout with imported values
      const discrepancies = [];
      
      for (const newPayout of newPayouts) {
        const csvDate = newPayout.date;
        const csvAmount = newPayout.amount;
        
        // Calculate total imported for this date across all properties
        let totalImportedForDate = 0;
        const propertiesForDate = [];
        
        for (const [propertyId, dateMap] of currentByProperty) {
          const amountForDate = dateMap.get(csvDate) || 0;
          if (amountForDate > 0) {
            totalImportedForDate += amountForDate;
            propertiesForDate.push({
              propertyName: propertyIdToName.get(propertyId),
              amount: amountForDate
            });
          }
        }
        
        // Check for discrepancies
        const difference = Math.abs(csvAmount - totalImportedForDate);
        const tolerance = 0.01; // 1 centavo de tolerância
        
        if (difference > tolerance) {
          console.log(`❌ DISCREPÂNCIA ENCONTRADA para ${csvDate}:`);
          console.log(`   CSV: R$ ${csvAmount.toFixed(2)}`);
          console.log(`   Importado: R$ ${totalImportedForDate.toFixed(2)}`);
          console.log(`   Diferença: R$ ${difference.toFixed(2)}`);
          
          discrepancies.push({
            date: csvDate,
            csvAmount: csvAmount,
            importedAmount: totalImportedForDate,
            difference: difference,
            properties: propertiesForDate
          });
        } else {
          console.log(`✅ VALORES CORRETOS para ${csvDate}: R$ ${csvAmount.toFixed(2)}`);
        }
      }
      
      if (errors.length > 0) {
        console.log('⚠️ Erros encontrados:', errors);
      }
      
      // Return results with discrepancies for user review
      const response = {
        success: true,
        message: `Importação concluída com sucesso! ${importedCount} transações importadas.`,
        importedCount,
        errors: errors.length > 0 ? errors : undefined,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        validationSummary: {
          totalPayoutsValidated: newPayouts.length,
          correctPayouts: newPayouts.length - discrepancies.length,
          discrepantPayouts: discrepancies.length
        }
      };
      
      if (discrepancies.length > 0) {
        console.log(`⚠️ ENCONTRADAS ${discrepancies.length} DISCREPÂNCIAS - usuário será consultado`);
        response.message += ` ATENÇÃO: ${discrepancies.length} discrepâncias encontradas - revise os valores.`;
      }
      
      res.json(response);

    } catch (error) {
      console.error("Erro durante importação do Airbnb:", error);
      res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  });

  // Unified Airbnb Import Route - Handles both historical and future reservations
  app.post('/api/import/airbnb-pending', uploadCSV.single('file'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Arquivo não encontrado" });
      }

      console.log('🔮 Iniciando importação de reservas futuras');

      // Airbnb property name mapping
      const AIRBNB_PROPERTY_MAPPING: Record<string, string> = {
        "1 Suíte + Quintal privativo": "Sevilha G07",
        "1 Suíte Wonderful Einstein Morumbi": "Sevilha 307", 
        "2 Quartos + Quintal Privativo": "Málaga M07",
        "2 quartos, maravilhoso, na Avenida Berrini": "MaxHaus 43R",
        "Sesimbra SeaView Studio 502: Sol, Luxo e Mar": "Sesimbra ap 505- Portugal",
        "Studio Premium - Haddock Lobo.": "Next Haddock Lobo ap 33",
        "Wonderful EINSTEIN Morumbi": "IGNORE",
        "Ganhos não relacionados a anúncios Créditos, resoluções e outros tipos de renda": "OTHER_INCOME"
      };

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      
      if (lines.length <= 1) {
        return res.status(400).json({ success: false, message: "Arquivo CSV vazio ou inválido" });
      }

      // Parse CSV header
      function parseCSVLineImport(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLineImport(lines[0]);
      console.log('🔮 Headers:', headers);

      // STEP 1: Identify all future reservations in the new CSV file
      console.log('🔍 STEP 1: Identificando reservas futuras no novo CSV...');
      const newReservations = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLineImport(line);
        if (values.length < headers.length) continue;

        const row: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          row[header] = values[index] || '';
        });

        const tipo = row['Tipo'];
        const anuncio = row['Anúncio'];
        const dataReserva = row['Data'];
        
        // Use "Valor" column for correct values (column 12 in CSV) - R$ 53.202,63
        const valorRaw = row['Valor'] || '0';
        const valor = parseFloat(valorRaw.replace(/[^\d.,]/g, '').replace(',', '.'));

        // Only process reservations with valid data
        if (tipo === 'Reserva' && anuncio && dataReserva && valor > 0) {
          const mappedPropertyName = AIRBNB_PROPERTY_MAPPING[anuncio];
          
          if (mappedPropertyName && mappedPropertyName !== 'IGNORE' && mappedPropertyName !== 'OTHER_INCOME') {
            // Use check-in date from "Data de início" (column 4)
            const dataInicioRaw = row['Data de início'];
            let checkInDate: Date;
            
            if (dataInicioRaw) {
              // Parse check-in date in MM/DD/YYYY format
              const [monthIn, dayIn, yearIn] = dataInicioRaw.split('/');
              checkInDate = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn));
            } else {
              // Fallback to reservation date if check-in date is not available
              const [monthRes, dayRes, yearRes] = dataReserva.split('/');
              checkInDate = new Date(parseInt(yearRes), parseInt(monthRes) - 1, parseInt(dayRes));
            }
            
            // Only include if it's truly a future reservation based on check-in date
            if (checkInDate > new Date()) {
              newReservations.push({
                propertyName: mappedPropertyName,
                date: checkInDate.toISOString().split('T')[0],
                amount: valor,
                anuncio: anuncio,
                confirmationCode: row['Código de Confirmação'],
                csvLine: i
              });
            }
          }
        }
      }
      
      console.log(`🔍 Encontradas ${newReservations.length} reservas futuras no novo CSV:`);
      newReservations.forEach(reservation => {
        console.log(`   ${reservation.propertyName} - ${reservation.date}: R$ ${reservation.amount.toFixed(2)}`);
      });
      
      // STEP 2: Compare with existing future reservations and remove conflicting ones
      console.log('🔍 STEP 2: Comparando com reservas futuras existentes...');
      const allTransactions = await storage.getTransactions(userId);
      const existingFutureReservations = allTransactions.filter(t => t.description.includes('Reserva futura'));
      
      console.log(`🔍 Encontradas ${existingFutureReservations.length} reservas futuras existentes`);
      
      // Group existing reservations by property and date
      const existingByPropertyAndDate = new Map();
      existingFutureReservations.forEach(t => {
        const dateStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : 
                        typeof t.date === 'string' ? t.date : 
                        new Date(t.date).toISOString().split('T')[0];
        const key = `${t.propertyId}-${dateStr}`;
        if (!existingByPropertyAndDate.has(key)) {
          existingByPropertyAndDate.set(key, []);
        }
        existingByPropertyAndDate.get(key).push(t);
      });
      
      // STEP 3: Remove existing reservations that conflict with new data
      console.log('🔍 STEP 3: Removendo reservas futuras conflitantes...');
      let deletedCount = 0;
      
      // Get all properties for property name to ID mapping
      const allProperties = await storage.getProperties(userId);
      const propertyNameToId = new Map();
      allProperties.forEach(p => propertyNameToId.set(p.name, p.id));
      
      for (const newReservation of newReservations) {
        const propertyId = propertyNameToId.get(newReservation.propertyName);
        if (!propertyId) continue;
        
        const key = `${propertyId}-${newReservation.date}`;
        const existingForKey = existingByPropertyAndDate.get(key) || [];
        
        if (existingForKey.length > 0) {
          console.log(`🧹 Removendo ${existingForKey.length} reservas futuras existentes para ${newReservation.propertyName} - ${newReservation.date}:`);
          
          for (const existingTransaction of existingForKey) {
            console.log(`   🧹 Removendo: ${existingTransaction.id} - ${existingTransaction.description} - R$ ${existingTransaction.amount}`);
            const deleted = await storage.deleteTransaction(existingTransaction.id, userId);
            if (deleted) deletedCount++;
          }
        }
      }
      
      console.log(`🧹 Removidas ${deletedCount} reservas futuras conflitantes`);
      
      // STEP 4: Process new reservations sequentially
      console.log('🔍 STEP 4: Processando novas reservas futuras de forma sequencial...');
      let importedCount = 0;
      const errors: string[] = [];
      const summary = {
        properties: new Set<string>(),
        revenues: 0,
        reservations: 0
      };
      
      for (const newReservation of newReservations) {
        const property = allProperties.find(p => p.name === newReservation.propertyName);
        
        if (!property) {
          errors.push(`Propriedade não encontrada: ${newReservation.propertyName}`);
          continue;
        }
        
        const transactionData = {
          userId,
          propertyId: property.id,
          type: 'revenue' as const,
          category: 'rent',
          description: `Airbnb - Reserva futura (${newReservation.confirmationCode})`,
          amount: newReservation.amount.toString(),
          date: newReservation.date,
          currency: 'BRL'
        };

        try {
          const validatedData = insertTransactionSchema.extend({ userId: z.string() }).parse(transactionData);
          await storage.createTransaction(validatedData);
          
          summary.properties.add(property.name);
          summary.revenues += newReservation.amount;
          summary.reservations++;
          
          importedCount++;
          console.log(`✅ Reserva futura importada: ${newReservation.propertyName} - ${newReservation.date} - R$ ${newReservation.amount.toFixed(2)}`);
        } catch (error) {
          console.error(`❌ Erro ao criar reserva futura: ${error}`);
          errors.push(`Erro ao criar reserva futura para ${newReservation.propertyName}: ${error}`);
        }
      }
      
      console.log(`✅ Importação de reservas futuras concluída: ${importedCount} reservas importadas`);
      
      // STEP 5: Final validation - compare imported values with CSV report
      console.log('🔍 STEP 5: Validação final - comparando valores importados com relatório CSV...');
      
      // Get all current future reservations after import
      const currentTransactions = await storage.getTransactions(userId);
      const currentFutureReservations = currentTransactions.filter(t => t.description.includes('Reserva futura'));
      
      // Group current future reservations by property and date
      const currentByProperty = new Map();
      currentFutureReservations.forEach(t => {
        const propertyName = t.propertyId;
        const dateKey = t.date instanceof Date ? t.date.toISOString().split('T')[0] : 
                        typeof t.date === 'string' ? t.date : 
                        new Date(t.date).toISOString().split('T')[0];
        
        if (!currentByProperty.has(propertyName)) {
          currentByProperty.set(propertyName, new Map());
        }
        
        if (!currentByProperty.get(propertyName).has(dateKey)) {
          currentByProperty.get(propertyName).set(dateKey, 0);
        }
        
        currentByProperty.get(propertyName).set(dateKey, 
          currentByProperty.get(propertyName).get(dateKey) + parseFloat(t.amount));
      });
      
      // Get property names for comparison
      const propertyIdToName = new Map();
      allProperties.forEach(p => propertyIdToName.set(p.id, p.name));
      
      // Compare each new reservation with imported values
      const discrepancies = [];
      
      for (const newReservation of newReservations) {
        const csvDate = newReservation.date;
        const csvAmount = newReservation.amount;
        const propertyId = propertyNameToId.get(newReservation.propertyName);
        
        if (!propertyId) continue;
        
        // Check imported amount for this property and date
        const importedAmount = currentByProperty.get(propertyId)?.get(csvDate) || 0;
        
        // Check for discrepancies
        const difference = Math.abs(csvAmount - importedAmount);
        const tolerance = 0.01; // 1 centavo de tolerância
        
        if (difference > tolerance) {
          console.log(`❌ DISCREPÂNCIA ENCONTRADA para ${newReservation.propertyName} - ${csvDate}:`);
          console.log(`   CSV: R$ ${csvAmount.toFixed(2)}`);
          console.log(`   Importado: R$ ${importedAmount.toFixed(2)}`);
          console.log(`   Diferença: R$ ${difference.toFixed(2)}`);
          
          discrepancies.push({
            propertyName: newReservation.propertyName,
            date: csvDate,
            csvAmount: csvAmount,
            importedAmount: importedAmount,
            difference: difference
          });
        } else {
          console.log(`✅ VALORES CORRETOS para ${newReservation.propertyName} - ${csvDate}: R$ ${csvAmount.toFixed(2)}`);
        }
      }
      
      if (errors.length > 0) {
        console.log('⚠️ Erros encontrados:', errors);
      }
      
      // Return results with discrepancies for user review
      const response = {
        success: true,
        message: `Importação de reservas futuras concluída com sucesso! ${importedCount} reservas importadas.`,
        importedCount,
        summary: {
          properties: Array.from(summary.properties).length,
          totalRevenue: summary.revenues,
          reservations: summary.reservations,
          deletedConflicts: deletedCount
        },
        errors: errors.length > 0 ? errors : undefined,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        validationSummary: {
          totalReservationsValidated: newReservations.length,
          correctReservations: newReservations.length - discrepancies.length,
          discrepantReservations: discrepancies.length
        }
      };
      
      if (discrepancies.length > 0) {
        console.log(`⚠️ ENCONTRADAS ${discrepancies.length} DISCREPÂNCIAS - usuário será consultado`);
        response.message += ` ATENÇÃO: ${discrepancies.length} discrepâncias encontradas - revise os valores.`;
      }
      
      res.json(response);

    } catch (error) {
      console.error("Erro durante importação de reservas futuras:", error);
      res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  });

  // Airbnb Future Reservations Analysis - Using robust CSV parser
  app.post('/api/import/airbnb-pending/analyze', uploadCSV.single('file'), isAuthenticated, async (req: any, res) => {
    console.log('🔍 ANÁLISE DE RESERVAS FUTURAS - SISTEMA ROBUSTO');
    
    try {
      const userId = getUserId(req);
      
      if (!req.file) {
        console.log('❌ Nenhum arquivo enviado');
        return res.status(400).json({ success: false, message: "Arquivo não encontrado" });
      }

      console.log('📁 Arquivo:', req.file.originalname, 'Tamanho:', req.file.size);

      // Parse CSV using robust parser
      const csvContent = req.file.buffer.toString('utf-8');
      const parseResult = parseAirbnbCSV(csvContent);
      
      if (!parseResult.success) {
        console.log('❌ Erro ao processar CSV:', parseResult.error);
        return res.status(400).json({ 
          success: false, 
          message: parseResult.error || 'Erro ao processar arquivo CSV' 
        });
      }

      console.log(`📊 Formato detectado: ${parseResult.format}`);
      console.log(`📊 Total de linhas processadas: ${parseResult.rows.length}`);

      // Filter only future reservations
      const futureReservations = parseResult.rows.filter(row => row.isFutureReservation);
      console.log(`🔮 Reservas futuras encontradas: ${futureReservations.length}`);

      // Map listings to properties and prepare response
      const mappedReservations = [];
      const unmappedListings = new Set<string>();
      
      for (const reservation of futureReservations) {
        const propertyName = mapListingToProperty(reservation.listing);
        
        if (propertyName) {
          mappedReservations.push({
            data: reservation.date,
            dataInicio: reservation.checkIn,
            dataTermino: reservation.checkOut,
            noites: reservation.nights,
            hospede: reservation.guest,
            anuncio: reservation.listing,
            codigo: reservation.confirmationCode,
            valor: reservation.amount,
            moeda: reservation.currency,
            propertyName: propertyName
          });
        } else {
          unmappedListings.add(reservation.listing);
        }
      }

      // Log unmapped listings
      if (unmappedListings.size > 0) {
        console.log('⚠️ Anúncios não mapeados:', Array.from(unmappedListings));
      }

      // Group by property
      const propertiesFound = [...new Set(mappedReservations.map(r => r.propertyName))];
      const periods = [...new Set(mappedReservations.map(r => {
        // Parse MM/DD/YYYY format correctly
        const [month, day, year] = r.dataInicio.split('/');
        return `${month.padStart(2, '0')}/${year}`;
      }))];

      // Calculate totals
      const totalRevenue = mappedReservations.reduce((sum, r) => sum + r.valor, 0);

      const analysis = {
        properties: propertiesFound,
        periods: periods.sort(),
        dateRange: parseResult.dateRange,
        summary: {
          reservationCount: mappedReservations.length,
          totalRevenue: totalRevenue,
          propertyCount: propertiesFound.length,
          periodCount: periods.length,
          unmappedListings: Array.from(unmappedListings)
        }
      };

      console.log('📊 Análise concluída:', JSON.stringify(analysis, null, 2));

      res.json({ success: true, analysis });
    } catch (error) {
      console.error('❌ Erro na análise de reservas futuras:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

  // Continue with existing routes after this point
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Data Cleanup Route
  app.delete('/api/cleanup/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get current counts before deletion
      const currentTransactions = await storage.getTransactions(userId);
      const currentProperties = await storage.getProperties(userId);
      
      // Delete all transactions for this user
      let deletedCount = 0;
      for (const transaction of currentTransactions) {
        const deleted = await storage.deleteTransaction(transaction.id, userId);
        if (deleted) deletedCount++;
      }

      res.json({
        success: true,
        message: `Limpeza concluída com sucesso`,
        deletedTransactions: deletedCount,
        keptProperties: currentProperties.length
      });

    } catch (error) {
      console.error('Error cleaning up transactions:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  });

  // Import pending Airbnb reservations (future revenue forecasting)
  app.post('/api/import/airbnb-pending', isAuthenticated, uploadCSV.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Nenhum arquivo enviado" });
      }
      
      console.log('🔮 Iniciando importação de reservas futuras');
      
      const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ success: false, message: "Arquivo CSV vazio ou inválido" });
      }

      // Robust CSV parsing function that handles quoted fields
      function parseCSVLineImport(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      }

      // Parse CSV headers
      const headers = parseCSVLineImport(lines[0]);
      console.log('🔮 Headers:', headers);

      // Use the centralized mapping functions
      const AIRBNB_PROPERTY_MAPPING = await buildAirbnbPropertyMapping(userId);
      console.log('🔮 Airbnb property mapping:', AIRBNB_PROPERTY_MAPPING);
      
      const propertyMap = await buildPropertyIdMap(userId);
      console.log('🔮 Property ID mapping created:', Array.from(propertyMap.entries()));

      let importedCount = 0;
      let totalPlannedRevenue = 0;
      const importedProperties = new Set<string>();
      const futureMonths = new Set<string>();
      const errors: string[] = [];

      // Remove existing future transactions (check-in date >= today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allTransactions = await storage.getTransactions(userId);
      let cleanedFuture = 0;
      
      for (const transaction of allTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate >= today && transaction.description?.includes('Airbnb')) {
          await storage.deleteTransaction(transaction.id, userId);
          cleanedFuture++;
        }
      }
      console.log(`🔮 Removidas ${cleanedFuture} reservas futuras antigas`);

      // Process each reservation line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLineImport(line);
          const row: Record<string, string> = {};
          headers.forEach((header: string, index: number) => {
            row[header] = values[index] || '';
          });

          const tipo = row['Tipo'];
          const anuncio = row['Anúncio'];
          const dataInicio = row['Data de início'];
          const valor = parseFloat(row['Valor']?.replace(',', '.') || '0');

          if (tipo !== 'Reserva' || !anuncio || valor <= 0) continue;

          const propertyName = AIRBNB_PROPERTY_MAPPING[anuncio];
          if (!propertyName) {
            console.log(`⚠️ Propriedade "${anuncio}" não mapeada`);
            continue;
          }

          const propertyId = propertyMap.get(propertyName);
          if (!propertyId) {
            errors.push(`Propriedade "${propertyName}" não encontrada no sistema`);
            continue;
          }

          // Parse check-in date
          const [month, day, year] = dataInicio.split('/');
          const checkInDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          // Only import future reservations
          if (checkInDate >= today) {
            await storage.createTransaction({
              userId,
              propertyId,
              type: 'revenue',
              category: 'Rent',
              amount: valor.toString(),
              description: `Airbnb - Reserva futura (${row['Código de Confirmação']})`,
              date: checkInDate.toISOString().split('T')[0],
              currency: 'BRL'
            });

            importedCount++;
            totalPlannedRevenue += valor;
            importedProperties.add(propertyName);
            futureMonths.add(`${String(checkInDate.getMonth() + 1).padStart(2, '0')}/${checkInDate.getFullYear()}`);
            
            console.log(`✅ Importada reserva: ${propertyName} - ${checkInDate.toLocaleDateString()} - R$ ${valor}`);
          }

        } catch (error) {
          errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      res.json({
        success: true,
        message: `Importação de reservas futuras concluída! ${importedCount} reservas importadas em ${importedProperties.size} propriedades. Total previsto: R$ ${totalPlannedRevenue.toFixed(2)}`,
        importedCount,
        summary: {
          properties: importedProperties.size,
          reservations: importedCount,
          totalPlannedRevenue,
          futureMonths: Array.from(futureMonths).sort()
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('🔮 Erro na importação de reservas futuras:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao processar o arquivo. Verifique o formato e tente novamente." 
      });
    }
  });

  // IPCA calculation endpoint
  app.get('/api/ipca/calculate', isAuthenticated, async (req, res) => {
    try {
      const { initialValue, purchaseDate } = req.query;
      
      if (!initialValue || !purchaseDate) {
        return res.status(400).json({ 
          success: false, 
          message: "Valor inicial e data de compra são obrigatórios" 
        });
      }

      const value = parseFloat(initialValue as string);
      if (isNaN(value)) {
        return res.status(400).json({ 
          success: false, 
          message: "Valor inicial inválido" 
        });
      }

      // Calculate current previous month
      const now = new Date();
      const prevMonth = now.getMonth(); // getMonth() returns 0-11, so current month -1 is previous month
      const year = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = prevMonth === 0 ? 12 : prevMonth;
      const referenceMonth = `${month.toString().padStart(2, '0')}/${year}`;

      // Format dates for IBGE API (YYYYMM format)
      const purchase = new Date(purchaseDate as string);
      const startPeriod = `${purchase.getFullYear()}${(purchase.getMonth() + 1).toString().padStart(2, '0')}`;
      const endPeriod = `${year}${month.toString().padStart(2, '0')}`;

      // IBGE IPCA API - Aggregated data ID 1737, Variable 63 (monthly variation)
      const apiUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${startPeriod}-${endPeriod}/variaveis/63?localidades=N1%5Ball%5D`;

      console.log('🎯 Fetching IPCA data from:', apiUrl);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data || !data[0] || !data[0].resultados || !data[0].resultados[0]) {
        return res.status(500).json({ 
          success: false, 
          message: "Dados do IPCA não disponíveis" 
        });
      }

      const series = data[0].resultados[0].series[0].serie;
      let accumulatedFactor = 1;
      let monthCount = 0;

      // Calculate accumulated IPCA from purchase date to current previous month
      Object.entries(series).forEach(([period, ipcaValue]: [string, any]) => {
        if (ipcaValue && !isNaN(parseFloat(ipcaValue))) {
          const monthlyRate = parseFloat(ipcaValue) / 100; // Convert percentage to decimal
          accumulatedFactor *= (1 + monthlyRate);
          monthCount++;
        }
      });

      const correctedValue = value * accumulatedFactor;

      console.log(`📊 IPCA Calculation: ${value.toLocaleString('pt-BR')} -> ${correctedValue.toLocaleString('pt-BR')} (${monthCount} months, ${((accumulatedFactor - 1) * 100).toFixed(2)}%)`);

      res.json({
        success: true,
        data: {
          correctedValue,
          correctionFactor: accumulatedFactor,
          referenceMonth,
          monthCount,
          correctionPercentage: ((accumulatedFactor - 1) * 100).toFixed(2)
        }
      });

    } catch (error) {
      console.error('🔥 Error calculating IPCA:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao calcular correção IPCA" 
      });
    }
  });

  // Enhanced analytics endpoint with IPCA-corrected profit margins
  app.get('/api/analytics/pivot-with-ipca', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { months, propertyIds, transactionTypes } = req.query;
      
      console.log('🔍 IPCA API called with:', { months, propertyIds, transactionTypes, userId });

      // Parse months array
      const monthsArray = typeof months === 'string' ? months.split(',') : [];
      console.log('📅 Parsed months:', monthsArray);
      
      // Get properties first to calculate IPCA corrections
      const userProperties = await storage.getProperties(userId);
      console.log('🏠 User properties:', userProperties.length, 'properties found');
      
      // Get transaction data for the specified periods
      const transactions = await storage.getTransactionsByPeriods(
        userId,
        monthsArray,
        propertyIds ? (typeof propertyIds === 'string' ? propertyIds.split(',').map(Number) : []) : undefined,
        transactionTypes ? (typeof transactionTypes === 'string' ? transactionTypes.split(',') : []) : undefined
      );
      console.log('💰 Transactions found:', transactions.length);

      // Group transactions by property
      const propertyData = new Map();
      
      periodTransactions.forEach(transaction => {
        if (!propertyData.has(transaction.propertyId)) {
          propertyData.set(transaction.propertyId, {
            propertyId: transaction.propertyId,
            propertyName: transaction.propertyName,
            revenue: 0,
            expenses: 0
          });
        }
        
        const data = propertyData.get(transaction.propertyId);
        if (transaction.type === 'revenue') {
          data.revenue += transaction.amount;
        } else if (transaction.type === 'expense') {
          data.expenses += transaction.amount;
        }
      });
      
      console.log('📊 Property data map:', Array.from(propertyData.values()));

      // Calculate IPCA-corrected profit margins for each property
      const results = await Promise.all(
        Array.from(propertyData.values()).map(async (data) => {
          const property = userProperties.find(p => p.id === data.propertyId);
          
          if (!property) {
            return {
              propertyName: data.propertyName,
              revenue: data.revenue,
              expenses: data.expenses,
              netResult: data.revenue - data.expenses,
              originalAcquisitionCost: 0,
              ipcaCorrectedAcquisitionCost: 0,
              profitMarginOriginal: 0,
              profitMarginIPCA: 0,
              ipcaCorrection: 0
            };
          }

          const originalCost = storage.calculateTotalAcquisitionCost(property);
          const ipcaCorrectedCost = await storage.calculateIPCACorrectedAcquisitionCost(property);
          const netResult = data.revenue - data.expenses;
          
          const profitMarginOriginal = originalCost > 0 ? (netResult / originalCost) * 100 : 0;
          const profitMarginIPCA = ipcaCorrectedCost > 0 ? (netResult / ipcaCorrectedCost) * 100 : 0;
          const ipcaCorrection = originalCost > 0 ? ((ipcaCorrectedCost - originalCost) / originalCost) * 100 : 0;

          console.log(`📊 ${data.propertyName}: Original ${originalCost.toLocaleString('pt-BR')} -> IPCA ${ipcaCorrectedCost.toLocaleString('pt-BR')} (${ipcaCorrection.toFixed(2)}%)`);

          return {
            propertyName: data.propertyName,
            revenue: data.revenue,
            expenses: data.expenses,
            netResult,
            originalAcquisitionCost: originalCost,
            ipcaCorrectedAcquisitionCost: ipcaCorrectedCost,
            profitMarginOriginal,
            profitMarginIPCA,
            ipcaCorrection
          };
        })
      );

      res.json(results);

    } catch (error) {
      console.error('🔥 Error in pivot-with-ipca:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao calcular dados de margem com correção IPCA" 
      });
    }
  });

  // New endpoint for single-month detailed view with Real vs Pending breakdown
  app.get('/api/analytics/single-month-detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { month, propertyIds, transactionTypes } = req.query;
      
      console.log('🔍 Single month detailed API called with:', {
        month,
        propertyIds,
        transactionTypes,
        userId
      });
      
      if (!month) {
        return res.status(400).json({ error: 'Month parameter is required' });
      }
      
      // Get user properties
      const userProperties = await storage.getProperties(userId);
      
      // Use the same method as the working pivot API
      const monthTransactions = await storage.getTransactionsByPeriods(
        userId,
        [month], // format: ["MM/YYYY"]
        propertyIds ? propertyIds.split(',').map((id: string) => parseInt(id)) : undefined,
        transactionTypes ? transactionTypes.split(',') : undefined
      );
      
      console.log(`💰 Found ${monthTransactions.length} transactions for ${month}`);
      
      // Debug: Show sample transactions
      if (monthTransactions.length > 0) {
        console.log('🔍 Sample transactions:', monthTransactions.slice(0, 3).map(t => ({
          propertyName: t.propertyName,
          type: t.type,
          amount: t.amount,
          amountType: typeof t.amount,
          amountParsed: parseFloat(t.amount),
          description: t.description,
          hasDescription: !!t.description
        })));
      }
      
      // Group by property
      const propertyDataMap = new Map<string, {
        propertyId: number;
        propertyName: string;
        realRevenue: number;
        pendingRevenue: number;
        realExpenses: number;
        pendingExpenses: number;
      }>();
      
      // Process transactions (getTransactionsByPeriods returns simplified data)
      monthTransactions.forEach(transaction => {
        const key = transaction.propertyName;
        
        if (!propertyDataMap.has(key)) {
          propertyDataMap.set(key, {
            propertyId: transaction.propertyId,
            propertyName: transaction.propertyName,
            realRevenue: 0,
            pendingRevenue: 0,
            realExpenses: 0,
            pendingExpenses: 0
          });
        }
        
        const propertyData = propertyDataMap.get(key)!;
        const amount = parseFloat(transaction.amount);
        
        // Debug amount conversion
        if (isNaN(amount)) {
          console.log(`⚠️ NaN detected for ${transaction.propertyName}: ${transaction.amount} (type: ${typeof transaction.amount})`);
        }
        
        // Determine if it's pending (future reservation) or real based on description
        const isPending = (transaction.description && transaction.description.includes('Reserva futura')) || false;
        
        if (transaction.type === 'revenue') {
          if (isPending) {
            propertyData.pendingRevenue += amount;
          } else {
            propertyData.realRevenue += amount;
          }
        } else if (transaction.type === 'expense') {
          if (isPending) {
            propertyData.pendingExpenses += amount;
          } else {
            propertyData.realExpenses += amount;
          }
        }
      });
      
      console.log('📊 Property data processed:', Array.from(propertyDataMap.values()));
      
      // Calculate IPCA corrected values and margins
      const results = [];
      
      console.log('🔍 Starting calculation for', propertyDataMap.size, 'properties');
      
      for (const [propertyName, data] of propertyDataMap) {
        const property = userProperties.find(p => 
          p.name === propertyName || 
          (p.nickname && p.nickname === propertyName)
        );
        
        if (!property) {
          console.log(`⚠️ Property not found: ${propertyName}`);
          continue;
        }
        
        // Calculate totals
        const realResult = data.realRevenue - data.realExpenses;
        const pendingResult = data.pendingRevenue - data.pendingExpenses;
        const totalResult = realResult + pendingResult;
        
        // Calculate acquisition costs for margin calculation
        const originalAcquisitionCost = storage.calculateTotalAcquisitionCost(property);
        const ipcaCorrectedAcquisitionCost = await storage.calculateIPCACorrectedAcquisitionCost(property);
        
        // Calculate margin using total result
        const profitMarginIPCA = ipcaCorrectedAcquisitionCost > 0 ? (totalResult / ipcaCorrectedAcquisitionCost) * 100 : 0;
        
        console.log(`📊 ${propertyName}: Real ${realResult.toFixed(2)} + Pending ${pendingResult.toFixed(2)} = Total ${totalResult.toFixed(2)}, Margin ${profitMarginIPCA.toFixed(2)}%`);
        
        const resultItem = {
          propertyName,
          realResult,
          pendingResult,
          totalResult,
          profitMarginIPCA,
          ipcaCorrectedAcquisitionCost
        };
        
        console.log(`✅ Adding result for ${propertyName}:`, JSON.stringify(resultItem, null, 2));
        results.push(resultItem);
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error in single-month-detailed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Management expense endpoint
  app.post('/api/expenses/management', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { totalAmount, paymentDate, description, supplier, cpfCnpj, distribution } = req.body;
      
      if (!totalAmount || !paymentDate || !supplier || !distribution || distribution.length === 0) {
        return res.status(400).json({ message: "Dados obrigatórios faltando" });
      }
      
      // Parse total amount
      const parsedTotalAmount = typeof totalAmount === 'string' 
        ? parseFloat(totalAmount.replace(/\./g, '').replace(',', '.'))
        : totalAmount;

      // Create the main transaction (parent) without propertyId
      const mainTransaction = await db.insert(transactions).values({
        userId,
        propertyId: null, // This is a consolidated payment
        type: 'expense',
        category: 'management',
        amount: parsedTotalAmount,
        description: description || `Gestão - ${supplier}`,
        date: new Date(paymentDate),
        supplier,
        cpfCnpj: cpfCnpj || null,
        isCompositeParent: true,
        notes: `Pagamento consolidado de gestão para ${distribution.length} propriedades`
      }).returning();

      const parentId = mainTransaction[0].id;
      
      // Create child transactions for each property
      const transactions = [];
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
          parentTransactionId: parentId,
          notes: `Parte do pagamento consolidado de ${format(new Date(paymentDate), 'dd/MM/yyyy')}`
        }).returning();
        
        transactions.push(childTransaction[0]);
      }
      
      res.json({ 
        success: true, 
        mainTransaction: mainTransaction[0],
        transactions,
        message: 'Despesa de gestão cadastrada com sucesso!' 
      });
    } catch (error) {
      console.error("Error creating management expense:", error);
      res.status(500).json({ message: "Failed to create management expense" });
    }
  });

  // Expense components management
  app.get('/api/properties/:id/expense-components', isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const userId = getUserId(req);
      
      const components = await storage.getExpenseComponents(propertyId, userId);
      res.json(components);
    } catch (error) {
      console.error('Error fetching expense components:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/properties/:id/expense-components', isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const userId = getUserId(req);
      const { components } = req.body;
      
      const result = await storage.saveExpenseComponents(propertyId, userId, components);
      res.json(result);
    } catch (error) {
      console.error('Error saving expense components:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Composite expense creation
  app.post('/api/transactions/composite', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      const {
        propertyId,
        description,
        date,
        supplier,
        cpfCnpj,
        totalAmount,
        components
      } = req.body;

      const result = await storage.createCompositeExpense({
        userId,
        propertyId,
        description,
        date,
        supplier,
        cpfCnpj,
        totalAmount,
        components
      });

      res.json(result);
    } catch (error) {
      console.error('Error creating composite expense:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Template management for similar properties (Condomínio Andalus)
  app.post('/api/properties/:id/copy-expense-template', isAuthenticated, async (req, res) => {
    try {
      const sourcePropertyId = parseInt(req.params.id);
      const { targetPropertyIds } = req.body;
      const userId = getUserId(req);
      
      const result = await storage.copyExpenseTemplate(sourcePropertyId, targetPropertyIds, userId);
      res.json(result);
    } catch (error) {
      console.error('Error copying expense template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Helper function to format relative date - show actual dates in DD MMM format
  const formatRelativeDate = (current: Date, today: Date, period: string): string => {
    const isToday = current.toDateString() === today.toDateString();
    
    // Always show HOJE for today, regardless of period
    if (isToday) {
      return 'HOJE';
    }
    
    // For monthly periods, show day of month
    if (period === 'current_month' || period === '2_months' || period === '1m' || period === '2m') {
      return current.getDate().toString();
    }
    
    // For all other periods, show actual date in DD MMM format
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const day = current.getDate().toString().padStart(2, '0');
    const month = months[current.getMonth()];
    
    return `${day} ${month}`;
  };

  // Helper function to calculate date range - NEW PERIODS as requested
  const calculateDateRange = (period: string, today: Date) => {
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    switch (period) {
      case 'default':
        // Padrão: D-1 to D+5 (7 days total)
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() + 5);
        break;
      case '1d':
        // 1 day: Only today
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case '2d':
        // 2 days: Today + 1 day
        startDate = new Date(today);
        endDate.setDate(today.getDate() + 1);
        break;
      case '3d':
        // 3 days: Today + 2 days
        startDate = new Date(today);
        endDate.setDate(today.getDate() + 2);
        break;
      case '4d':
        // 4 days: Today + 3 days
        startDate = new Date(today);
        endDate.setDate(today.getDate() + 3);
        break;
      case '5d':
        // 5 days: Today + 4 days
        startDate = new Date(today);
        endDate.setDate(today.getDate() + 4);
        break;
      case '1m':
      case 'current_month':
        // 1 month: Current month from day 1 to last day
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
        break;
      case '2m':
      case '2_months':
        // 2 Months: Day 1 of current month to last day of next month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Last day of next month
        break;
      case '2w':
        // 2 sem: D-1 to D+12 (14 days total)
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() + 12);
        break;
      default:
        // Default to Padrão if period not recognized
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() + 5);
        break;
    }
    
    return { startDate, endDate };
  };

  // Cash Flow endpoints
  app.get('/api/analytics/cash-flow', isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { period = 'default' } = req.query;
    
    try {
      // Get or create cash flow settings
      let [settings] = await db.select().from(cashFlowSettings).where(eq(cashFlowSettings.userId, userId));
      if (!settings) {
        [settings] = await db.insert(cashFlowSettings).values({
          userId,
          initialBalance: '0',
          initialDate: '2025-01-01'
        }).returning();
      }
      
      // Calculate date range based on period
      const today = new Date();
      const { startDate, endDate } = calculateDateRange(period as string, today);
      
      // Calculate balance up to start of period
      let balanceAtStart = parseFloat(settings.initialBalance);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      if (startDateStr > settings.initialDate) {
        const transactionsBeforeStart = await db.select({
          amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
          type: transactions.type,
          isCompositeParent: transactions.isCompositeParent,
        }).from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              gte(transactions.date, settings.initialDate),
              lt(transactions.date, startDateStr)
            )
          );
        
        transactionsBeforeStart.forEach(transaction => {
          // Skip parent transactions in balance calculation
          if (transaction.isCompositeParent) {
            return;
          }
          const amount = Math.abs(transaction.amount);
          if (transaction.type === 'revenue') {
            balanceAtStart += amount;
          } else {
            balanceAtStart -= amount;
          }
        });
      }
      
      // Get all transactions in the date range
      const periodTransactions = await db.select({
        date: sql<string>`${transactions.date}`,
        amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
        type: transactions.type,
        description: transactions.description,
        isCompositeParent: transactions.isCompositeParent
      }).from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, startDate.toISOString().split('T')[0]),
            lte(transactions.date, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(asc(transactions.date));
      
      // Process daily cash flow
      const dailyData: { [key: string]: { revenue: number; expenses: number; } } = {};
      
      periodTransactions.forEach(transaction => {
        // Skip parent transactions in cash flow
        if (transaction.isCompositeParent) {
          return;
        }
        const date = transaction.date;
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, expenses: 0 };
        }
        
        const amount = Math.abs(transaction.amount);
        if (transaction.type === 'revenue') {
          dailyData[date].revenue += amount;
        } else {
          dailyData[date].expenses += amount;
        }
      });
      
      // Generate daily cash flow data
      const cashFlowData = [];
      let runningBalance = balanceAtStart;
      
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayData = dailyData[dateStr] || { revenue: 0, expenses: 0 };
        
        // Calculate daily balance
        const dailyRevenue = dayData.revenue;
        const dailyExpenses = dayData.expenses;
        runningBalance += dailyRevenue - dailyExpenses;
        
        // Format display date
        const isToday = dateStr === today.toISOString().split('T')[0];
        const displayDate = formatRelativeDate(current, today, period as string);
        
        cashFlowData.push({
          date: dateStr,
          displayDate,
          revenue: dailyRevenue,
          expenses: dailyExpenses,
          balance: runningBalance,
          isToday
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      res.json(cashFlowData);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      res.status(500).json({ error: 'Failed to fetch cash flow data' });
    }
  });

  app.get('/api/analytics/cash-flow-stats', isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { period = '2w' } = req.query;
    
    try {
      // Get or create cash flow settings
      let [settings] = await db.select().from(cashFlowSettings).where(eq(cashFlowSettings.userId, userId));
      if (!settings) {
        [settings] = await db.insert(cashFlowSettings).values({
          userId,
          initialBalance: '0',
          initialDate: '2025-01-01'
        }).returning();
      }
      
      // Calculate date range based on period
      const today = new Date();
      const { startDate, endDate } = calculateDateRange(period as string, today);
      
      // Calculate balance up to start of period
      let balanceAtStart = parseFloat(settings.initialBalance);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      if (startDateStr > settings.initialDate) {
        const transactionsBeforeStart = await db.select({
          amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
          type: transactions.type,
          isCompositeParent: transactions.isCompositeParent,
        }).from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              gte(transactions.date, settings.initialDate),
              lt(transactions.date, startDateStr)
            )
          );
        
        transactionsBeforeStart.forEach(transaction => {
          // Skip parent transactions in balance calculation
          if (transaction.isCompositeParent) {
            return;
          }
          const amount = Math.abs(transaction.amount);
          if (transaction.type === 'revenue') {
            balanceAtStart += amount;
          } else {
            balanceAtStart -= amount;
          }
        });
      }
      
      // Get all transactions in the date range
      const periodTransactions = await db.select({
        date: sql<string>`${transactions.date}`,
        amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
        type: transactions.type,
        description: transactions.description,
        isCompositeParent: transactions.isCompositeParent
      }).from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, startDate.toISOString().split('T')[0]),
            lte(transactions.date, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(asc(transactions.date));
      
      // Process daily cash flow
      const dailyData: { [key: string]: { revenue: number; expenses: number; } } = {};
      
      periodTransactions.forEach(transaction => {
        // Skip parent transactions in cash flow
        if (transaction.isCompositeParent) {
          return;
        }
        const date = transaction.date;
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, expenses: 0 };
        }
        
        const amount = Math.abs(transaction.amount);
        if (transaction.type === 'revenue') {
          dailyData[date].revenue += amount;
        } else {
          dailyData[date].expenses += amount;
        }
      });
      
      // Generate daily cash flow data
      const cashFlowData = [];
      let runningBalance = balanceAtStart;
      
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayData = dailyData[dateStr] || { revenue: 0, expenses: 0 };
        
        // Calculate daily balance
        const dailyRevenue = dayData.revenue;
        const dailyExpenses = dayData.expenses;
        runningBalance += dailyRevenue - dailyExpenses;
        
        // Format display date
        const isToday = dateStr === today.toISOString().split('T')[0];
        const displayDate = formatRelativeDate(current, today);
        
        cashFlowData.push({
          date: dateStr,
          displayDate,
          revenue: dailyRevenue,
          expenses: dailyExpenses,
          balance: runningBalance,
          isToday
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      if (!Array.isArray(cashFlowData) || cashFlowData.length === 0) {
        return res.json({
          currentBalance: 0,
          highestBalance: 0,
          lowestBalance: 0,
          highestDate: '',
          lowestDate: '',
          totalRevenue: 0,
          totalExpenses: 0
        });
      }
      
      // Calculate statistics
      const balances = cashFlowData.map((d: any) => d.balance);
      const highestBalance = Math.max(...balances);
      const lowestBalance = Math.min(...balances);
      
      const highestIndex = balances.indexOf(highestBalance);
      const lowestIndex = balances.indexOf(lowestBalance);
      
      const totalRevenue = cashFlowData.reduce((sum: number, d: any) => sum + d.revenue, 0);
      const totalExpenses = cashFlowData.reduce((sum: number, d: any) => sum + d.expenses, 0);
      
      const todayData = cashFlowData.find((d: any) => d.isToday);
      const currentBalance = todayData ? todayData.balance : balances[balances.length - 1];
      
      res.json({
        currentBalance,
        highestBalance,
        lowestBalance,
        highestDate: cashFlowData[highestIndex].displayDate,
        lowestDate: cashFlowData[lowestIndex].displayDate,
        totalRevenue,
        totalExpenses
      });
    } catch (error) {
      console.error('Error fetching cash flow stats:', error);
      res.status(500).json({ error: 'Failed to fetch cash flow statistics' });
    }
  });

  // Generic expense distribution routes
  app.post("/api/expenses/distributed", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { 
        expenseType, 
        description,
        amount, 
        paymentDate, 
        selectedPropertyIds,
        competencyMonth 
      } = req.body;

      // Validate required fields
      if (!expenseType || !amount || !paymentDate || !selectedPropertyIds?.length) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando" 
        });
      }

      // Parse amount
      const parsedAmount = typeof amount === 'string' 
        ? parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        : amount;

      // Get properties for distribution
      const properties = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.userId, userId),
            or(...selectedPropertyIds.map((id: number) => eq(properties.id, id)))
          )
        );

      if (properties.length === 0) {
        return res.status(404).json({ error: "Propriedades não encontradas" });
      }

      // Calculate 30-day period for revenue calculation
      const paymentDateObj = new Date(paymentDate);
      const endDate = new Date(paymentDateObj);
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29);

      // Get revenues for each property in the period
      const revenuePromises = properties.map(async (property) => {
        const revenues = await db
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.propertyId, property.id),
              eq(transactions.type, 'revenue'),
              gte(transactions.date, startDate.toISOString().split('T')[0]),
              lte(transactions.date, endDate.toISOString().split('T')[0])
            )
          );
        
        return {
          propertyId: property.id,
          propertyName: property.name,
          revenue: Number(revenues[0]?.total || 0)
        };
      });

      const propertyRevenues = await Promise.all(revenuePromises);
      const totalRevenue = propertyRevenues.reduce((sum, p) => sum + p.revenue, 0);

      // If no revenue, distribute equally
      const hasRevenue = totalRevenue > 0;
      
      // Create transactions for each property
      const transactionPromises = propertyRevenues.map(async (propRevenue) => {
        const proportion = hasRevenue 
          ? propRevenue.revenue / totalRevenue 
          : 1 / properties.length;
        
        const distributedAmount = parsedAmount * proportion;

        if (distributedAmount > 0) {
          const fullDescription = description 
            ? `${expenseType} - ${description}${competencyMonth ? ` (${competencyMonth})` : ''}`
            : `${expenseType}${competencyMonth ? ` (${competencyMonth})` : ''}`;

          const categoryMap: Record<string, string> = {
            'Gestão - Maurício': 'management',
            'cleaning': 'cleaning',
            'maintenance': 'maintenance'
          };

          return await db.insert(transactions).values({
            propertyId: propRevenue.propertyId,
            type: 'expense',
            category: categoryMap[expenseType] || 'other',
            description: fullDescription,
            amount: distributedAmount,
            date: paymentDate,
            userId,
          }).returning();
        }
        return null;
      });

      const transactions = (await Promise.all(transactionPromises)).filter(Boolean);

      res.json({ 
        success: true, 
        transactions,
        distribution: propertyRevenues.map(p => ({
          ...p,
          amount: hasRevenue 
            ? parsedAmount * (p.revenue / totalRevenue)
            : parsedAmount / properties.length,
          percentage: hasRevenue 
            ? (p.revenue / totalRevenue * 100).toFixed(2) + '%'
            : (100 / properties.length).toFixed(2) + '%'
        }))
      });
    } catch (error) {
      console.error("Error creating distributed expense:", error);
      res.status(500).json({ error: "Erro ao processar despesa" });
    }
  });

  // Company expenses endpoint (not property-related)
  app.post("/api/expenses/company", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { 
        description,
        amount, 
        paymentDate, 
        category,
        supplier,
        notes 
      } = req.body;

      // Validate required fields
      if (!description || !amount || !paymentDate || !category) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando" 
        });
      }

      // Parse amount
      const parsedAmount = typeof amount === 'string' 
        ? parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        : amount;

      // Map category to expense category
      const categoryMap: { [key: string]: string } = {
        'bank_fees': 'bank_fees',
        'accounting': 'accounting',
        'office_rent': 'office_rent',
        'general': 'other',
        'fixed_costs': 'other',
        'variable_costs': 'other'
      };

      const mappedCategory = categoryMap[category] || 'other';

      // Create transaction for company expense (no propertyId)
      const transaction = await db.insert(transactions).values({
        userId,
        propertyId: null, // Company expense, not linked to any property
        type: 'expense',
        category: mappedCategory,
        amount: parsedAmount,
        description: `[Empresa] ${description}`,
        date: new Date(paymentDate),
        supplier,
        notes
      }).returning();

      res.json({ 
        success: true, 
        transaction: transaction[0],
        message: "Despesa da empresa cadastrada com sucesso"
      });
    } catch (error) {
      console.error("Error creating company expense:", error);
      res.status(500).json({ error: "Erro ao processar despesa da empresa" });
    }
  });

  // Cleaning expenses batch endpoint
  app.post("/api/expenses/cleaning-batch", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { paymentDate, items } = req.body;

      if (!paymentDate || !items || items.length === 0) {
        return res.status(400).json({ error: "Dados obrigatórios faltando" });
      }

      const transactions = [];
      let totalAmount = 0;

      // Create individual transactions for each property
      for (const item of items) {
        const amount = item.total;
        totalAmount += amount;

        const transaction = await db.insert(transactions).values({
          userId,
          propertyId: item.propertyId,
          type: 'expense',
          category: 'cleaning',
          amount: amount,
          description: `Limpeza - ${item.quantity} unidade${item.quantity > 1 ? 's' : ''} x R$ ${item.unitValue.toFixed(2).replace('.', ',')}`,
          date: new Date(paymentDate),
          supplier: 'Serviço de Limpeza',
          notes: `Pagamento de ${item.quantity} limpeza${item.quantity > 1 ? 's' : ''} no valor unitário de R$ ${item.unitValue.toFixed(2).replace('.', ',')}`
        }).returning();
        
        transactions.push(transaction[0]);
      }

      res.json({ 
        success: true, 
        transactions,
        totalAmount,
        message: `Despesas de limpeza cadastradas para ${items.length} propriedade${items.length > 1 ? 's' : ''}`
      });
    } catch (error) {
      console.error("Error creating cleaning expenses:", error);
      res.status(500).json({ error: "Erro ao processar despesas de limpeza" });
    }
  });



  app.post("/api/expenses/distributed/preview", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { amount, paymentDate, selectedPropertyIds } = req.body;

      if (!amount || !paymentDate || !selectedPropertyIds?.length) {
        return res.status(400).json({ error: "Dados incompletos para prévia" });
      }

      const parsedAmount = typeof amount === 'string' 
        ? parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        : amount;

      // Get properties
      const properties = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.userId, userId),
            or(...selectedPropertyIds.map((id: number) => eq(properties.id, id)))
          )
        );

      // Calculate period
      const paymentDateObj = new Date(paymentDate);
      const endDate = new Date(paymentDateObj);
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29);

      // Get revenues
      const revenuePromises = properties.map(async (property) => {
        const revenues = await db
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.propertyId, property.id),
              eq(transactions.type, 'revenue'),
              gte(transactions.date, startDate.toISOString().split('T')[0]),
              lte(transactions.date, endDate.toISOString().split('T')[0])
            )
          );
        
        return {
          propertyId: property.id,
          propertyName: property.name,
          revenue: Number(revenues[0]?.total || 0)
        };
      });

      const propertyRevenues = await Promise.all(revenuePromises);
      const totalRevenue = propertyRevenues.reduce((sum, p) => sum + p.revenue, 0);
      const hasRevenue = totalRevenue > 0;

      const preview = propertyRevenues.map(p => ({
        propertyName: p.propertyName,
        revenue: p.revenue,
        amount: hasRevenue 
          ? parsedAmount * (p.revenue / totalRevenue)
          : parsedAmount / properties.length,
        percentage: hasRevenue 
          ? (p.revenue / totalRevenue * 100).toFixed(2) + '%'
          : (100 / properties.length).toFixed(2) + '%'
      }));

      res.json({
        success: true,
        preview,
        period: {
          start: startDate.toLocaleDateString('pt-BR'),
          end: endDate.toLocaleDateString('pt-BR')
        },
        totalAmount: parsedAmount,
        distributionMethod: hasRevenue ? 'Proporcional à receita' : 'Distribuição igual'
      });
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ error: "Erro ao gerar prévia" });
    }
  });

  // Tax payment routes
  app.post('/api/taxes/simple', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { taxType, amount, competencyMonth, selectedPropertyIds, paymentDate } = req.body;
      
      // Simple validation
      if (!taxType || !amount || !competencyMonth || !selectedPropertyIds || selectedPropertyIds.length === 0 || !paymentDate) {
        return res.status(400).json({ success: false, message: "Dados incompletos" });
      }

      // Create tax payment record
      const [month, year] = competencyMonth.split('/');
      const competencyStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const competencyEnd = new Date(parseInt(year), parseInt(month), 0);
      
      // Convert amount from centavos to reais
      const taxAmount = typeof amount === 'string' ? parseFloat(amount) / 100 : amount;
      
      const taxPayment = await db.insert(taxPayments).values({
        userId,
        taxType,
        totalAmount: taxAmount.toString(),
        paymentDate: paymentDate,
        competencyPeriodStart: competencyStart.toISOString().split('T')[0],
        competencyPeriodEnd: competencyEnd.toISOString().split('T')[0],
        selectedPropertyIds: JSON.stringify(selectedPropertyIds),
        isInstallment: false,
        notes: `Imposto ${taxType} - Competência ${competencyMonth}`
      }).returning();

      // Get gross revenue for selected properties in competency period
      const transactions = await db.select({
        propertyId: transactions.propertyId,
        amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
        type: transactions.type
      }).from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            or(...selectedPropertyIds.map(id => eq(transactions.propertyId, id))),
            eq(transactions.type, 'revenue'),
            gte(transactions.date, competencyStart.toISOString().split('T')[0]),
            lte(transactions.date, competencyEnd.toISOString().split('T')[0])
          )
        );
      
      // Calculate total revenue by property
      const propertyRevenues = new Map<number, number>();
      periodTransactions.forEach(transaction => {
        const current = propertyRevenues.get(transaction.propertyId) || 0;
        propertyRevenues.set(transaction.propertyId, current + transaction.amount);
      });
      
      const totalRevenue = Array.from(propertyRevenues.values()).reduce((sum, amount) => sum + amount, 0);
      
      // Create distributed transactions for each property
      for (const propertyId of selectedPropertyIds) {
        const propertyRevenue = propertyRevenues.get(propertyId) || 0;
        const proportion = totalRevenue > 0 ? propertyRevenue / totalRevenue : 1 / selectedPropertyIds.length;
        const propertyTaxAmount = taxAmount * proportion;
        
        if (propertyTaxAmount > 0) {
          await storage.createTransaction({
            userId,
            propertyId,
            type: 'expense',
            category: 'taxes',
            amount: propertyTaxAmount.toString(),
            description: `${taxType} - ${competencyMonth} (${(proportion * 100).toFixed(1)}% do total)`,
            date: paymentDate,
            currency: 'BRL'
          });
        }
      }

      res.json({ success: true, taxPayment: taxPayment[0] });
    } catch (error) {
      console.error("Error creating tax payment:", error);
      res.status(500).json({ success: false, message: "Erro ao cadastrar imposto" });
    }
  });

  app.post('/api/taxes/preview', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { taxType, competencyMonth, amount, paymentDate, selectedPropertyIds } = req.body;
      
      // Parse competency month (format: MM/YYYY)
      const [month, year] = competencyMonth.split('/');
      const competencyStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const competencyEnd = new Date(parseInt(year), parseInt(month), 0);
      
      // Get gross revenue for selected properties in competency period
      const transactions = await db.select({
        propertyId: transactions.propertyId,
        amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
        type: transactions.type
      }).from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            or(...selectedPropertyIds.map(id => eq(transactions.propertyId, id))),
            eq(transactions.type, 'revenue'),
            gte(transactions.date, competencyStart.toISOString().split('T')[0]),
            lte(transactions.date, competencyEnd.toISOString().split('T')[0])
          )
        );
      
      // Calculate total revenue by property
      const propertyRevenues = new Map<number, number>();
      periodTransactions.forEach(transaction => {
        const current = propertyRevenues.get(transaction.propertyId) || 0;
        propertyRevenues.set(transaction.propertyId, current + transaction.amount);
      });
      
      const totalRevenue = Array.from(propertyRevenues.values()).reduce((sum, amount) => sum + amount, 0);
      
      // Get property names
      const properties = await storage.getProperties(userId);
      const propertyMap = new Map(properties.map(p => [p.id, p.name]));
      
      // Calculate proportional allocation
      const breakdown = [];
      const totalTaxAmount = parseFloat(amount) / 100; // Convert from centavos to reais
      
      selectedPropertyIds.forEach((propertyId: number) => {
        const propertyRevenue = propertyRevenues.get(propertyId) || 0;
        const proportion = totalRevenue > 0 ? propertyRevenue / totalRevenue : 1 / selectedPropertyIds.length;
        const allocatedAmount = totalTaxAmount * proportion;
        
        breakdown.push({
          propertyId,
          propertyName: propertyMap.get(propertyId) || 'Unknown',
          revenue: propertyRevenue,
          proportion,
          taxes: [{
            taxType: taxType,
            amount: allocatedAmount
          }]
        });
      });
      
      res.json({
        success: true,
        competencyPeriod: {
          start: competencyStart.toISOString().split('T')[0],
          end: competencyEnd.toISOString().split('T')[0]
        },
        totalRevenue,
        breakdown
      });
      
    } catch (error) {
      console.error('Error in tax preview:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao calcular prévia dos impostos' 
      });
    }
  });

  app.post('/api/taxes/payments', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { 
        taxType, 
        competencyMonth, 
        amount, 
        paymentDate, 
        selectedPropertyIds,
        enableInstallment
      } = req.body;
      
      // Parse competency month (format: MM/YYYY)
      const [month, year] = competencyMonth.split('/');
      const competencyStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const competencyEnd = new Date(parseInt(year), parseInt(month), 0);
      
      // Get gross revenue for selected properties in competency period
      const transactions = await db.select({
        propertyId: transactions.propertyId,
        amount: sql<number>`CAST(${transactions.amount} AS DECIMAL)`,
        type: transactions.type
      }).from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            or(...selectedPropertyIds.map(id => eq(transactions.propertyId, id))),
            eq(transactions.type, 'revenue'),
            gte(transactions.date, competencyStart.toISOString().split('T')[0]),
            lte(transactions.date, competencyEnd.toISOString().split('T')[0])
          )
        );
      
      // Calculate total revenue by property
      const propertyRevenues = new Map<number, number>();
      periodTransactions.forEach(transaction => {
        const current = propertyRevenues.get(transaction.propertyId) || 0;
        propertyRevenues.set(transaction.propertyId, current + transaction.amount);
      });
      
      const totalRevenue = Array.from(propertyRevenues.values()).reduce((sum, amount) => sum + amount, 0);
      
      const totalTaxAmount = parseFloat(amount) / 100; // Convert from centavos to reais
      
      if (enableInstallment && (taxType === 'CSLL' || taxType === 'IRPJ')) {
        // Create 3 installments
        const baseAmount = totalTaxAmount / 3;
        const installmentAmount2 = baseAmount + (totalTaxAmount * 0.01); // 1/3 + 1%
        const installmentAmount3 = baseAmount + (totalTaxAmount * 0.01); // 1/3 + 1%
        
        // Store main tax record
        const [mainTaxRecord] = await db.insert(taxPayments).values({
          userId,
          taxType,
          totalAmount: totalTaxAmount.toString(),
          paymentDate,
          competencyPeriodStart: competencyStart.toISOString().split('T')[0],
          competencyPeriodEnd: competencyEnd.toISOString().split('T')[0],
          selectedPropertyIds: JSON.stringify(selectedPropertyIds),
          isInstallment: true
        }).returning();
        
        // Create installment records and distributed transactions
        const installmentAmounts = [baseAmount, installmentAmount2, installmentAmount3];
        
        for (let i = 0; i < 3; i++) {
          const installmentDate = new Date(paymentDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          
          await db.insert(taxPayments).values({
            userId,
            taxType,
            totalAmount: installmentAmounts[i].toString(),
            paymentDate: installmentDate.toISOString().split('T')[0],
            competencyPeriodStart: competencyStart.toISOString().split('T')[0],
            competencyPeriodEnd: competencyEnd.toISOString().split('T')[0],
            selectedPropertyIds: JSON.stringify(selectedPropertyIds),
            isInstallment: true,
            installmentNumber: i + 1,
            parentTaxPaymentId: mainTaxRecord.id
          });
          
          // Create distributed transactions for each property
          for (const propertyId of selectedPropertyIds) {
            const propertyRevenue = propertyRevenues.get(propertyId) || 0;
            const proportion = totalRevenue > 0 ? propertyRevenue / totalRevenue : 1 / selectedPropertyIds.length;
            const propertyTaxAmount = installmentAmounts[i] * proportion;
            
            if (propertyTaxAmount > 0) {
              await storage.createTransaction({
                userId,
                propertyId,
                type: 'expense',
                category: 'taxes',
                amount: propertyTaxAmount.toString(),
                description: `${taxType} - Parcela ${i + 1}/3 (${(proportion * 100).toFixed(1)}% do total)`,
                date: installmentDate.toISOString().split('T')[0],
                currency: 'BRL'
              });
            }
          }
        }
        
      } else {
        // Single payment
        await db.insert(taxPayments).values({
          userId,
          taxType,
          totalAmount: totalTaxAmount.toString(),
          paymentDate,
          competencyPeriodStart: competencyStart.toISOString().split('T')[0],
          competencyPeriodEnd: competencyEnd.toISOString().split('T')[0],
          selectedPropertyIds: JSON.stringify(selectedPropertyIds),
          isInstallment: false
        });
        
        // Create distributed transactions for each property
        for (const propertyId of selectedPropertyIds) {
          const propertyRevenue = propertyRevenues.get(propertyId) || 0;
          const proportion = totalRevenue > 0 ? propertyRevenue / totalRevenue : 1 / selectedPropertyIds.length;
          const propertyTaxAmount = totalTaxAmount * proportion;
          
          if (propertyTaxAmount > 0) {
            await storage.createTransaction({
              userId,
              propertyId,
              type: 'expense',
              category: 'taxes',
              amount: propertyTaxAmount.toString(),
              description: `${taxType} - ${competencyMonth} (${(proportion * 100).toFixed(1)}% do total)`,
              date: paymentDate,
              currency: 'BRL'
            });
          }
        }
      }
      
      res.json({
        success: true,
        message: 'Impostos cadastrados e rateados com sucesso!'
      });
      
    } catch (error) {
      console.error('Error processing tax payments:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar pagamentos de impostos' 
      });
    }
  });

  // Create detailed cleaning expense with individual service records
  app.post("/api/expenses/cleaning-detailed", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { 
        paymentDate,
        supplier,
        cpfCnpj,
        phone,
        email,
        pixKey,
        totalAmount,
        details
      } = req.body;

      // Validate required fields
      if (!paymentDate || !supplier || !totalAmount || !details || details.length === 0) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando" 
        });
      }

      // Parse total amount
      const parsedTotalAmount = typeof totalAmount === 'string' 
        ? parseFloat(totalAmount.replace(/\./g, '').replace(',', '.'))
        : totalAmount;

      if (isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
        return res.status(400).json({ 
          error: "Valor total inválido" 
        });
      }

      // Calculate sum of details
      const detailsSum = details.reduce((sum: number, detail: any) => {
        const amount = typeof detail.amount === 'string' 
          ? parseFloat(detail.amount.replace(/\./g, '').replace(',', '.'))
          : detail.amount;
        return sum + amount;
      }, 0);

      // Validate that details sum matches total (with tolerance)
      const tolerance = 0.01;
      if (Math.abs(detailsSum - parsedTotalAmount) > tolerance) {
        return res.status(400).json({ 
          error: `Soma dos detalhes (R$ ${detailsSum.toFixed(2)}) não corresponde ao valor total (R$ ${parsedTotalAmount.toFixed(2)})` 
        });
      }

      // Create the main transaction
      const mainTransaction = await db.insert(transactions).values({
        userId,
        propertyId: null, // This is a consolidated payment
        type: 'expense',
        category: 'cleaning',
        amount: parsedTotalAmount,
        description: `Pagamento de limpezas - ${supplier}`,
        date: new Date(paymentDate),
        supplier,
        cpfCnpj: cpfCnpj || null,
        phone: phone || null,
        email: email || null,
        pixKey: pixKey || null,
        isCompositeParent: true,
        notes: `Pagamento consolidado de ${details.length} limpezas`
      }).returning();

      const parentId = mainTransaction[0].id;

      // Create individual cleaning detail records
      const detailRecords = [];
      for (const detail of details) {
        const amount = typeof detail.amount === 'string' 
          ? parseFloat(detail.amount.replace(/\./g, '').replace(',', '.'))
          : detail.amount;

        // Insert into cleaning_service_details table
        const detailRecord = await db.insert(cleaningServiceDetails).values({
          transactionId: parentId,
          propertyId: detail.propertyId,
          serviceDate: new Date(detail.serviceDate),
          amount: amount,
          notes: detail.notes || null
        }).returning();

        detailRecords.push(detailRecord[0]);

        // Also create a child transaction for each property
        await db.insert(transactions).values({
          userId,
          propertyId: detail.propertyId,
          type: 'expense',
          category: 'cleaning',
          amount: amount,
          description: `Limpeza - ${format(new Date(detail.serviceDate), 'dd/MM/yyyy')}`,
          date: new Date(detail.serviceDate),
          supplier,
          parentTransactionId: parentId,
          notes: `Parte do pagamento consolidado de ${format(new Date(paymentDate), 'dd/MM/yyyy')}`
        });
      }

      res.json({ 
        success: true, 
        transaction: mainTransaction[0],
        details: detailRecords,
        message: `Limpezas cadastradas com sucesso`
      });
    } catch (error) {
      console.error("Error creating detailed cleaning expense:", error);
      res.status(500).json({ error: "Erro ao processar despesas de limpeza" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
