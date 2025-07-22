import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// CORE TABLES
// ============================================================================

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Properties table - Expanded with all required fields
export const properties = sqliteTable('properties', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  // Basic identification
  nickname: text('nickname').notNull(), // Used throughout the system
  officialName: text('official_name'), // Official development name
  
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
  propertyRegistration: text('property_registration'),
  iptuRegistration: text('iptu_registration'),
  
  // Acquisition values
  purchaseValue: real('purchase_value').notNull().default(0),
  commissionValue: real('commission_value').notNull().default(0),
  taxesValue: real('taxes_value').notNull().default(0),
  renovationValue: real('renovation_value').notNull().default(0),
  otherValues: real('other_values').notNull().default(0),
  totalAcquisitionValue: real('total_acquisition_value').notNull().default(0), // Auto-calculated
  acquisitionDate: integer('acquisition_date', { mode: 'timestamp' }).notNull(),
  
  // IPCA updated value (auto-calculated)
  ipcaUpdatedValue: real('ipca_updated_value').notNull().default(0),
  lastIpcaUpdate: integer('last_ipca_update', { mode: 'timestamp' }),
  
  // Property type and status
  propertyType: text('property_type').notNull().default('residential'), // residential, commercial, etc.
  status: text('status').notNull().default('active'), // active, construction, renovation, sold
  
  // Condominium structure type (for expense breakdown)
  condominiumStructure: text('condominium_structure').notNull().default('standard'), // sevilha, maxhaus, thera, haddock, standard
  
  // Airbnb integration
  airbnbPropertyId: text('airbnb_property_id'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Transactions table - Unified for all income and expenses
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  propertyId: text('property_id').references(() => properties.id),
  
  // Transaction basics
  type: text('type').notNull(), // 'income' or 'expense'
  category: text('category').notNull(), // 'airbnb', 'rental', 'condominium', 'management', etc.
  subcategory: text('subcategory'), // For detailed breakdown
  
  // Financial data
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('BRL'),
  exchangeRate: real('exchange_rate').default(1),
  
  // Dates
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(), // Cash flow date
  competenceDate: integer('competence_date', { mode: 'timestamp' }), // Competence date (for taxes)
  
  // Description and details
  description: text('description').notNull(),
  notes: text('notes'),
  
  // Source tracking
  source: text('source').notNull().default('manual'), // 'manual', 'airbnb_actual', 'airbnb_pending', 'csv_import'
  externalId: text('external_id'), // For Airbnb integration
  
  // Supplier/Client info (for expenses)
  supplierName: text('supplier_name'),
  supplierDocument: text('supplier_document'), // CPF/CNPJ
  supplierType: text('supplier_type'), // 'individual' or 'company'
  
  // Recurring transactions
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurringParentId: text('recurring_parent_id'),
  recurringEndDate: integer('recurring_end_date', { mode: 'timestamp' }),
  
  // Pro-rata distribution
  isProRata: integer('is_pro_rata', { mode: 'boolean' }).default(false),
  proRataGroupId: text('pro_rata_group_id'),
  originalAmount: real('original_amount'), // Original amount before pro-rata
  proRataPercentage: real('pro_rata_percentage'), // Percentage of original amount
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Expense components for detailed breakdown (condominium, etc.)
export const expenseComponents = sqliteTable('expense_components', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  
  componentType: text('component_type').notNull(), // 'condominium_fee', 'electricity', 'gas', 'water', etc.
  amount: real('amount').notNull(),
  description: text('description'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Pro-rata distribution groups
export const proRataGroups = sqliteTable('pro_rata_groups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  groupType: text('group_type').notNull(), // 'management', 'taxes', 'cleaning', etc.
  totalAmount: real('total_amount').notNull(),
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Pro-rata distribution details
export const proRataDistributions = sqliteTable('pro_rata_distributions', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => proRataGroups.id),
  propertyId: text('property_id').notNull().references(() => properties.id),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  
  percentage: real('percentage').notNull(),
  amount: real('amount').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Cash flow settings
export const cashFlowSettings = sqliteTable('cash_flow_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  initialBalance: real('initial_balance').notNull().default(0),
  initialBalanceDate: integer('initial_balance_date', { mode: 'timestamp' }).notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Exchange rates for currency conversion
export const exchangeRates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey(),
  
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  source: text('source').notNull().default('bcb'), // Banco Central do Brasil
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// IPCA rates for inflation adjustment
export const ipcaRates = sqliteTable('ipca_rates', {
  id: text('id').primaryKey(),
  
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  rate: real('rate').notNull(), // Monthly rate
  accumulatedRate: real('accumulated_rate').notNull(), // Accumulated from base date
  source: text('source').notNull().default('ibge'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Airbnb import logs
export const airbnbImports = sqliteTable('airbnb_imports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  importType: text('import_type').notNull(), // 'actual' or 'pending'
  fileName: text('file_name'),
  recordsImported: integer('records_imported').notNull(),
  dateRange: text('date_range'), // JSON string with start/end dates
  
  status: text('status').notNull().default('completed'), // 'completed', 'failed', 'processing'
  errorMessage: text('error_message'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Cleaning service details
export const cleaningServices = sqliteTable('cleaning_services', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  
  serviceDate: integer('service_date', { mode: 'timestamp' }).notNull(),
  paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
  
  totalAmount: real('total_amount').notNull(),
  notes: text('notes'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Cleaning service items (per property)
export const cleaningServiceItems = sqliteTable('cleaning_service_items', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => cleaningServices.id),
  propertyId: text('property_id').notNull().references(() => properties.id),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalAmount: real('total_amount').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  transactions: many(transactions),
  cashFlowSettings: many(cashFlowSettings),
  proRataGroups: many(proRataGroups),
  airbnbImports: many(airbnbImports),
  cleaningServices: many(cleaningServices),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  proRataDistributions: many(proRataDistributions),
  cleaningServiceItems: many(cleaningServiceItems),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [transactions.propertyId],
    references: [properties.id],
  }),
  expenseComponents: many(expenseComponents),
  proRataDistribution: one(proRataDistributions),
  cleaningServiceItem: one(cleaningServiceItems),
}));

export const expenseComponentsRelations = relations(expenseComponents, ({ one }) => ({
  transaction: one(transactions, {
    fields: [expenseComponents.transactionId],
    references: [transactions.id],
  }),
}));

export const proRataGroupsRelations = relations(proRataGroups, ({ one, many }) => ({
  user: one(users, {
    fields: [proRataGroups.userId],
    references: [users.id],
  }),
  distributions: many(proRataDistributions),
}));

export const proRataDistributionsRelations = relations(proRataDistributions, ({ one }) => ({
  group: one(proRataGroups, {
    fields: [proRataDistributions.groupId],
    references: [proRataGroups.id],
  }),
  property: one(properties, {
    fields: [proRataDistributions.propertyId],
    references: [properties.id],
  }),
  transaction: one(transactions, {
    fields: [proRataDistributions.transactionId],
    references: [transactions.id],
  }),
}));

export const cleaningServicesRelations = relations(cleaningServices, ({ one, many }) => ({
  user: one(users, {
    fields: [cleaningServices.userId],
    references: [users.id],
  }),
  items: many(cleaningServiceItems),
}));

export const cleaningServiceItemsRelations = relations(cleaningServiceItems, ({ one }) => ({
  service: one(cleaningServices, {
    fields: [cleaningServiceItems.serviceId],
    references: [cleaningServices.id],
  }),
  property: one(properties, {
    fields: [cleaningServiceItems.propertyId],
    references: [properties.id],
  }),
  transaction: one(transactions, {
    fields: [cleaningServiceItems.transactionId],
    references: [transactions.id],
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
