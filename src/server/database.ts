import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../shared/schema';
import path from 'path';
import fs from 'fs';

// Database path
const dbPath = path.join(process.cwd(), 'data', 'gestao-imoveis.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database
export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create tables if they don't exist
    await createTables();
    
    // Seed initial data
    await seedInitialData();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  // Users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Properties table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT NOT NULL,
      acquisition_date TEXT NOT NULL,
      acquisition_value REAL NOT NULL,
      current_value REAL NOT NULL,
      ipca_updated_value REAL,
      area REAL,
      bedrooms INTEGER,
      bathrooms INTEGER,
      parking_spots INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'vacant',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      property_id TEXT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      recurring_end_date TEXT,
      pro_rata_group_id TEXT,
      supplier_id TEXT,
      tax_type TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
    )
  `);

  // Suppliers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Airbnb imports table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS airbnb_imports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      import_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_records INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);

  // IPCA rates table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ipca_rates (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      rate REAL NOT NULL,
      accumulated_rate REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    )
  `);

  // Cash flow settings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cash_flow_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      default_currency TEXT NOT NULL DEFAULT 'BRL',
      projection_months INTEGER NOT NULL DEFAULT 12,
      auto_ipca_update INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Tables created successfully');
}

async function seedInitialData() {
  // Check if we already have users
  const existingUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (existingUsers.count === 0) {
    // Create default user
    const defaultUserId = 'user_' + Date.now();
    sqlite.prepare(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(
      defaultUserId,
      'Administrador',
      'admin@gestao-imoveis.com',
      '$2b$10$dummy.hash.for.demo' // In production, use proper bcrypt hash
    );

    // Create default cash flow settings
    sqlite.prepare(`
      INSERT INTO cash_flow_settings (id, user_id, default_currency, projection_months)
      VALUES (?, ?, ?, ?)
    `).run(
      'settings_' + Date.now(),
      defaultUserId,
      'BRL',
      12
    );

    console.log('✅ Initial data seeded');
  }

  // Seed IPCA data for recent years
  await seedIPCAData();
}

async function seedIPCAData() {
  const ipcaData = [
    // 2023 data
    { year: 2023, month: 1, rate: 0.53, accumulated: 0.53 },
    { year: 2023, month: 2, rate: 0.84, accumulated: 1.38 },
    { year: 2023, month: 3, rate: 0.71, accumulated: 2.10 },
    { year: 2023, month: 4, rate: 0.61, accumulated: 2.72 },
    { year: 2023, month: 5, rate: 0.23, accumulated: 2.96 },
    { year: 2023, month: 6, rate: 0.12, accumulated: 3.08 },
    { year: 2023, month: 7, rate: 0.12, accumulated: 3.21 },
    { year: 2023, month: 8, rate: 0.23, accumulated: 3.45 },
    { year: 2023, month: 9, rate: 0.26, accumulated: 3.72 },
    { year: 2023, month: 10, rate: 0.24, accumulated: 3.97 },
    { year: 2023, month: 11, rate: 0.28, accumulated: 4.26 },
    { year: 2023, month: 12, rate: 0.56, accumulated: 4.85 },
    // 2024 data
    { year: 2024, month: 1, rate: 0.42, accumulated: 0.42 },
    { year: 2024, month: 2, rate: 0.83, accumulated: 1.26 },
    { year: 2024, month: 3, rate: 0.16, accumulated: 1.42 },
    { year: 2024, month: 4, rate: 0.38, accumulated: 1.81 },
    { year: 2024, month: 5, rate: 0.46, accumulated: 2.28 },
    { year: 2024, month: 6, rate: 0.21, accumulated: 2.50 },
    { year: 2024, month: 7, rate: 0.38, accumulated: 2.89 },
    { year: 2024, month: 8, rate: 0.02, accumulated: 2.91 },
    { year: 2024, month: 9, rate: 0.44, accumulated: 3.36 },
    { year: 2024, month: 10, rate: 0.56, accumulated: 3.95 },
    { year: 2024, month: 11, rate: 0.39, accumulated: 4.36 },
    { year: 2024, month: 12, rate: 0.52, accumulated: 4.91 }
  ];

  const insertIPCA = sqlite.prepare(`
    INSERT OR IGNORE INTO ipca_rates (id, year, month, rate, accumulated_rate)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const data of ipcaData) {
    insertIPCA.run(
      `ipca_${data.year}_${data.month}`,
      data.year,
      data.month,
      data.rate,
      data.accumulated
    );
  }

  console.log('✅ IPCA data seeded');
}

// Utility functions
export function getUserById(userId: string) {
  return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

export function getPropertiesByUser(userId: string) {
  return sqlite.prepare('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function getTransactionsByProperty(propertyId: string) {
  return sqlite.prepare('SELECT * FROM transactions WHERE property_id = ? ORDER BY date DESC').all(propertyId);
}

export function getTransactionsByDateRange(userId: string, startDate: string, endDate: string) {
  return sqlite.prepare(`
    SELECT t.*, p.name as property_name 
    FROM transactions t 
    LEFT JOIN properties p ON t.property_id = p.id 
    WHERE t.user_id = ? AND t.date BETWEEN ? AND ? 
    ORDER BY t.date DESC
  `).all(userId, startDate, endDate);
}

export { sqlite };