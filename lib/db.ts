import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../shared/schema';
import path from 'path';
import fs from 'fs';

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'gestao-imoveis.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Migration function
export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Initialize database with default data
export async function initializeDatabase() {
  try {
    // Check if database is already initialized
    const existingUsers = await db.select().from(schema.users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log('🔄 Initializing database with default data...');
      
      // Create default user (you can modify this)
      const defaultUser = {
        id: 'default-user-id',
        email: 'admin@gestao-imoveis.com',
        name: 'Administrador',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(schema.users).values(defaultUser);
      
      // Create default cash flow settings
      const defaultCashFlowSettings = {
        id: 'default-cash-flow',
        userId: defaultUser.id,
        initialBalance: 0,
        initialBalanceDate: new Date('2025-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(schema.cashFlowSettings).values(defaultCashFlowSettings);
      
      console.log('✅ Database initialized with default data');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Utility functions for common operations
export const dbUtils = {
  // Get user by ID
  async getUserById(id: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  },
  
  // Get all properties for a user
  async getPropertiesByUserId(userId: string) {
    return await db.select().from(schema.properties).where(eq(schema.properties.userId, userId));
  },
  
  // Get transactions for a property
  async getTransactionsByPropertyId(propertyId: string) {
    return await db.select().from(schema.transactions).where(eq(schema.transactions.propertyId, propertyId));
  },
  
  // Get transactions by date range
  async getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date) {
    return await db.select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          gte(schema.transactions.transactionDate, startDate),
          lte(schema.transactions.transactionDate, endDate)
        )
      )
      .orderBy(desc(schema.transactions.transactionDate));
  },
  
  // Calculate cash flow for a specific date
  async calculateCashFlowForDate(userId: string, date: Date) {
    // Get initial balance
    const [cashFlowSettings] = await db.select()
      .from(schema.cashFlowSettings)
      .where(eq(schema.cashFlowSettings.userId, userId));
    
    if (!cashFlowSettings) {
      throw new Error('Cash flow settings not found');
    }
    
    // Get all transactions up to the specified date
    const transactions = await db.select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          lte(schema.transactions.transactionDate, date)
        )
      );
    
    // Calculate balance
    let balance = cashFlowSettings.initialBalance;
    
    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
    }
    
    return balance;
  },
  
  // Get property performance data
  async getPropertyPerformance(propertyId: string, startDate: Date, endDate: Date) {
    const transactions = await db.select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.propertyId, propertyId),
          gte(schema.transactions.transactionDate, startDate),
          lte(schema.transactions.transactionDate, endDate)
        )
      );
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    }
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  },
};

// Import required operators
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// Export database instance and schema
export { schema };
export default db;