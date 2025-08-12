import { pgTable, text, integer, real, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// CORE TABLES
// ============================================================================

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Properties table - Expanded with all required fields
export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  // Basic identification
  nickname: text('nickname').notNull(), // Used throughout the system
  name: text('name').notNull(), // Main name field for compatibility
  
  // Address structure
  condominiumName: text('condominium_name'),
  street: text('street'),
  number: text('number'),
  tower: text('tower'),
  unit: text('unit'),
  neighborhood: text('neighborhood'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  zipCode: text('zip_code'),
  
  // Legal documents
  registration: text('registration'),
  iptuCode: text('iptu_code'),
  
  // Acquisition values
  purchasePrice: decimal('purchase_price').default('0'),
  commissionValue: decimal('commission_value').default('0'),
  taxesAndRegistration: decimal('taxes_and_registration').default('0'),
  renovationAndDecoration: decimal('renovation_and_decoration').default('0'),
  otherInitialValues: decimal('other_initial_values').default('0'),
  
  // Property details
  area: decimal('area'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  marketValue: decimal('market_value'),
  
  // Dates
  purchaseDate: timestamp('purchase_date'),
  marketValueDate: timestamp('market_value_date'),
  
  // Property type and status
  status: text('status').notNull().default('active'), // active, construction, renovation, sold
  
  // Financing
  isFullyPaid: boolean('is_fully_paid').default(true),
  financingAmount: decimal('financing_amount'),
  
  // Airbnb integration
  airbnbPropertyId: text('airbnb_property_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transactions table - Unified for all income and expenses
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  propertyId: text('property_id').references(() => properties.id),
  
  // Transaction basics
  type: text('type').notNull(), // 'income' or 'expense'
  category: text('category').notNull(), // 'airbnb', 'rental', 'condominium', 'management', etc.
  subcategory: text('subcategory'), // For detailed breakdown
  
  // Financial data
  amount: decimal('amount').notNull(),
  currency: text('currency').notNull().default('BRL'),
  exchangeRate: decimal('exchange_rate').default('1'),
  
  // Dates
  date: timestamp('date').notNull(), // Cash flow date - main date field for compatibility
  transactionDate: timestamp('transaction_date').notNull(), // Cash flow date
  competenceDate: timestamp('competence_date'), // Competence date (for taxes)
  
  // Description and details
  description: text('description').notNull(),
  notes: text('notes'),
  
  // Source tracking
  source: text('source').notNull().default('manual'), // 'manual', 'airbnb_actual', 'airbnb_pending', 'csv_import'
  externalId: text('external_id'), // For Airbnb integration
  
  // Supplier/Client info (for expenses) - compatibility names
  supplier: text('supplier'),
  supplierName: text('supplier_name'),
  cpfCnpj: text('cpf_cnpj'),
  supplierDocument: text('supplier_document'), // CPF/CNPJ
  supplierType: text('supplier_type'), // 'individual' or 'company'
  
  // Composite transactions
  parentTransactionId: text('parent_transaction_id'),
  isCompositeParent: boolean('is_composite_parent').default(false),
  
  // Recurring transactions
  isRecurring: boolean('is_recurring').default(false),
  recurringParentId: text('recurring_parent_id'),
  recurringEndDate: timestamp('recurring_end_date'),
  
  // Pro-rata distribution
  isProRata: boolean('is_pro_rata').default(false),
  proRataGroupId: text('pro_rata_group_id'),
  originalAmount: decimal('original_amount'), // Original amount before pro-rata
  proRataPercentage: decimal('pro_rata_percentage'), // Percentage of original amount
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Cash flow settings
export const cashFlowSettings = pgTable('cash_flow_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  initialBalance: decimal('initial_balance').notNull().default('0'),
  initialBalanceDate: timestamp('initial_balance_date').notNull(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tax payments table
export const taxPayments = pgTable('tax_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  taxType: text('tax_type').notNull(), // 'pis', 'cofins', 'csll', 'irpj', 'iptu'
  referenceMonth: integer('reference_month').notNull(),
  referenceYear: integer('reference_year').notNull(),
  
  totalAmount: decimal('total_amount').notNull(),
  installments: integer('installments').notNull().default(1),
  status: text('status').notNull().default('pending'), // 'pending', 'paid', 'partial'
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Cleaning service details
export const cleaningServiceDetails = pgTable('cleaning_service_details', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  serviceDate: timestamp('service_date').notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  
  totalAmount: decimal('total_amount').notNull(),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  transactions: many(transactions),
  cashFlowSettings: many(cashFlowSettings),
  taxPayments: many(taxPayments),
  cleaningServiceDetails: many(cleaningServiceDetails),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [transactions.propertyId],
    references: [properties.id],
  }),
}));

export const cashFlowSettingsRelations = relations(cashFlowSettings, ({ one }) => ({
  user: one(users, {
    fields: [cashFlowSettings.userId],
    references: [users.id],
  }),
}));

export const taxPaymentsRelations = relations(taxPayments, ({ one }) => ({
  user: one(users, {
    fields: [taxPayments.userId],
    references: [users.id],
  }),
}));

export const cleaningServiceDetailsRelations = relations(cleaningServiceDetails, ({ one }) => ({
  user: one(users, {
    fields: [cleaningServiceDetails.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PropertySchema = z.object({
  id: z.string(),
  userId: z.string(),
  nickname: z.string().min(1),
  officialName: z.string().optional(),
  condominiumName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  tower: z.string().optional(),
  unit: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  propertyRegistration: z.string().optional(),
  iptuRegistration: z.string().optional(),
  purchaseValue: z.number().min(0),
  commissionValue: z.number().min(0),
  taxesValue: z.number().min(0),
  renovationValue: z.number().min(0),
  otherValues: z.number().min(0),
  totalAcquisitionValue: z.number().min(0),
  acquisitionDate: z.date(),
  ipcaUpdatedValue: z.number().min(0),
  lastIpcaUpdate: z.date().optional(),
  propertyType: z.string(),
  status: z.enum(['active', 'construction', 'renovation', 'sold']),
  condominiumStructure: z.enum(['sevilha', 'maxhaus', 'thera', 'haddock', 'standard']),
  airbnbPropertyId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  propertyId: z.string().optional(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('BRL'),
  exchangeRate: z.number().default(1),
  transactionDate: z.date(),
  competenceDate: z.date().optional(),
  description: z.string().min(1),
  notes: z.string().optional(),
  source: z.enum(['manual', 'airbnb_actual', 'airbnb_pending', 'csv_import']),
  externalId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierDocument: z.string().optional(),
  supplierType: z.enum(['individual', 'company']).optional(),
  isRecurring: z.boolean().default(false),
  recurringParentId: z.string().optional(),
  recurringEndDate: z.date().optional(),
  isProRata: z.boolean().default(false),
  proRataGroupId: z.string().optional(),
  originalAmount: z.number().optional(),
  proRataPercentage: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ExpenseComponentSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  componentType: z.string().min(1),
  amount: z.number(),
  description: z.string().optional(),
  createdAt: z.date(),
});

export const ProRataGroupSchema = z.object({
  id: z.string(),
  userId: z.string(),
  groupType: z.string().min(1),
  totalAmount: z.number(),
  transactionDate: z.date(),
  description: z.string().min(1),
  createdAt: z.date(),
});

export const ProRataDistributionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  propertyId: z.string(),
  transactionId: z.string(),
  percentage: z.number().min(0).max(100),
  amount: z.number(),
  createdAt: z.date(),
});

export const CashFlowSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  initialBalance: z.number(),
  initialBalanceDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CleaningServiceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceDate: z.date(),
  paymentDate: z.date(),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  createdAt: z.date(),
});

export const CleaningServiceItemSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  propertyId: z.string(),
  transactionId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalAmount: z.number().min(0),
  createdAt: z.date(),
});

// ============================================================================
// TYPES
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type ExpenseComponent = z.infer<typeof ExpenseComponentSchema>;
export type ProRataGroup = z.infer<typeof ProRataGroupSchema>;
export type ProRataDistribution = z.infer<typeof ProRataDistributionSchema>;
export type CashFlowSettings = z.infer<typeof CashFlowSettingsSchema>;
export type CleaningService = z.infer<typeof CleaningServiceSchema>;
export type CleaningServiceItem = z.infer<typeof CleaningServiceItemSchema>;

// Expense categories by property type
export const EXPENSE_CATEGORIES = {
  sevilha: {
    condominium: ['taxa_condominial', 'enel', 'gas', 'agua', 'extra1', 'extra2'],
    general: ['impostos', 'gestao', 'luz', 'gas_agua', 'comissoes', 'iptu', 'financiamento', 'manutencao', 'tv_internet', 'limpeza']
  },
  maxhaus: {
    condominium: ['taxa_condominial', 'benfeitorias', 'estacionamento', 'extra1', 'extra2'],
    general: ['impostos', 'gestao', 'luz', 'gas_agua', 'comissoes', 'iptu', 'financiamento', 'manutencao', 'tv_internet', 'limpeza']
  },
  thera: {
    condominium: ['taxa_condominial', 'fundo_reserva', 'agua', 'gas', 'energia', 'extra1', 'extra2'],
    general: ['impostos', 'gestao', 'luz', 'gas_agua', 'comissoes', 'iptu', 'financiamento', 'manutencao', 'tv_internet', 'limpeza']
  },
  haddock: {
    condominium: ['taxa_condominial', 'energia', 'fundo_reserva', 'internet', 'gas', 'agua', 'extra1', 'extra2'],
    general: ['impostos', 'gestao', 'luz', 'gas_agua', 'comissoes', 'iptu', 'financiamento', 'manutencao', 'tv_internet', 'limpeza']
  },
  standard: {
    condominium: ['taxa_condominial', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5'],
    general: ['impostos', 'gestao', 'luz', 'gas_agua', 'comissoes', 'iptu', 'financiamento', 'manutencao', 'tv_internet', 'limpeza']
  }
} as const;

export const TAX_TYPES = ['pis', 'cofins', 'csll', 'irpj', 'iptu'] as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
export type TaxType = typeof TAX_TYPES[number];

// ============================================================================
// INSERT/SELECT SCHEMAS - Manual Zod schemas for API validation
// ============================================================================

// Insert schemas for creating records
export const insertPropertySchema = z.object({
  userId: z.string(),
  nickname: z.string().min(1),
  name: z.string().min(1),
  condominiumName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  tower: z.string().optional(),
  unit: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  registration: z.string().optional(),
  iptuCode: z.string().optional(),
  purchasePrice: z.string().optional(),
  commissionValue: z.string().optional(),
  taxesAndRegistration: z.string().optional(),
  renovationAndDecoration: z.string().optional(),
  otherInitialValues: z.string().optional(),
  area: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  marketValue: z.string().optional(),
  purchaseDate: z.date().optional(),
  marketValueDate: z.date().optional(),
  status: z.enum(['active', 'construction', 'renovation', 'sold']).default('active'),
  isFullyPaid: z.boolean().default(true),
  financingAmount: z.string().optional(),
  airbnbPropertyId: z.string().optional(),
});

export const insertTransactionSchema = z.object({
  userId: z.string(),
  propertyId: z.string().optional(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  amount: z.string(),
  currency: z.string().default('BRL'),
  exchangeRate: z.string().default('1'),
  date: z.date(),
  transactionDate: z.date(),
  competenceDate: z.date().optional(),
  description: z.string().min(1),
  notes: z.string().optional(),
  source: z.string().default('manual'),
  externalId: z.string().optional(),
  supplier: z.string().optional(),
  supplierName: z.string().optional(),
  cpfCnpj: z.string().optional(),
  supplierDocument: z.string().optional(),
  supplierType: z.string().optional(),
  parentTransactionId: z.string().optional(),
  isCompositeParent: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringParentId: z.string().optional(),
  recurringEndDate: z.date().optional(),
  isProRata: z.boolean().default(false),
  proRataGroupId: z.string().optional(),
  originalAmount: z.string().optional(),
  proRataPercentage: z.string().optional(),
});

// TypeScript types for the actual database types
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type SelectProperty = typeof properties.$inferSelect;
export type SelectTransaction = typeof transactions.$inferSelect;
export type SelectUser = typeof users.$inferSelect;
export type SelectCashFlowSettings = typeof cashFlowSettings.$inferSelect;
export type SelectTaxPayment = typeof taxPayments.$inferSelect;
export type SelectCleaningServiceDetails = typeof cleaningServiceDetails.$inferSelect;
