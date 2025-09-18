import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  date,
  boolean,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Accounts table for multiple bank accounts and investments
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(), // Nome da conta (Principal, Secundária, Investimentos, etc)
  type: varchar("type").notNull(), // checking (conta corrente), investment (investimentos)
  bankName: varchar("bank_name"), // Nome do banco
  accountNumber: varchar("account_number"), // Número da conta
  agency: varchar("agency"), // Agência
  initialBalance: decimal("initial_balance", { precision: 12, scale: 2 }).default("0"), // Saldo inicial (marco zero)
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0"), // Saldo atual calculado
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // Conta padrão para transações
  displayOrder: integer("display_order").default(0), // Ordem de exibição
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Basic identification
  name: varchar("name").notNull(), // Apelido (nome que aparece na aplicação)
  nickname: varchar("nickname"), // Nome do empreendimento (nome completo oficial)
  airbnbName: varchar("airbnb_name"), // Nome no Airbnb (para sincronização automática)
  registrationNumber: varchar("registration_number"), // Matrícula
  iptuCode: varchar("iptu_code"), // Código IPTU
  
  // Address information - detailed breakdown
  condominiumName: varchar("condominium_name"), // Nome do Condomínio
  street: varchar("street"), // Logradouro
  number: varchar("number"), // Número
  tower: varchar("tower"), // Torre
  unit: varchar("unit"), // Unidade
  neighborhood: varchar("neighborhood"), // Bairro
  city: varchar("city"), // Cidade
  state: varchar("state"), // Estado
  country: varchar("country"), // País
  zipCode: varchar("zip_code"), // CEP
  
  // Legacy address field (for backward compatibility)
  address: text("address"),
  
  // Property details
  type: varchar("type").notNull(), // apartment, house, commercial
  status: varchar("status").notNull(), // active, decoration, financing, inactive
  rentalType: varchar("rental_type"), // monthly, airbnb, commercial
  
  // Acquisition costs breakdown
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }), // Valor de compra
  commissionValue: decimal("commission_value", { precision: 12, scale: 2 }), // Valor de comissão
  taxesAndRegistration: decimal("taxes_and_registration", { precision: 12, scale: 2 }), // Valor taxas e registros
  renovationAndDecoration: decimal("renovation_and_decoration", { precision: 12, scale: 2 }), // Valor de reformas e decoração
  otherInitialValues: decimal("other_initial_values", { precision: 12, scale: 2 }), // Outros valores iniciais
  
  // Dates and additional info
  purchaseDate: date("purchase_date"),
  marketValue: decimal("market_value", { precision: 12, scale: 2 }), // Valor atualizado de mercado
  marketValueDate: date("market_value_date"), // Data de avaliação de mercado
  
  // Financing information
  isFullyPaid: boolean("is_fully_paid").default(false), // Se o imóvel está quitado
  financingAmount: decimal("financing_amount", { precision: 12, scale: 2 }), // Valor do financiamento pendente
  
  currency: varchar("currency").default("BRL"),
  description: text("description"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: decimal("area", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions table (revenues and expenses)
export const transactions: PgTableWithColumns<any> = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  type: varchar("type").notNull(), // revenue, expense
  category: varchar("category").notNull(), // Airbnb, Booking, Recorrente, Outros (for revenues)
  description: text("description"), // Now optional
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("BRL"),
  date: date("date").notNull(), // Data de recebimento (payout) - usado no fluxo de caixa
  // New fields for accommodation dates
  accommodationStartDate: date("accommodation_start_date"), // Data início da hospedagem
  accommodationEndDate: date("accommodation_end_date"), // Data fim da hospedagem
  isRecurring: boolean("is_recurring").default(false),
  recurringPeriod: varchar("recurring_period"), // monthly, quarterly, yearly
  recurringEndDate: date("recurring_end_date"),
  payerName: varchar("payer_name"),
  paymentMethod: varchar("payment_method"),
  notes: text("notes"),
  // Composite expense support
  parentTransactionId: integer("parent_transaction_id").references(() => transactions.id),
  isCompositeParent: boolean("is_composite_parent").default(false),
  supplier: varchar("supplier"), // Nome do fornecedor
  cpfCnpj: varchar("cpf_cnpj"), // CPF/CNPJ do fornecedor
  phone: varchar("phone"), // Telefone do fornecedor
  email: varchar("email"), // Email do fornecedor
  pixKey: varchar("pix_key"), // Chave PIX do fornecedor
  // Flag for historical transactions
  isHistorical: boolean("is_historical").default(false), // Transações históricas não afetam fluxo de caixa
  // Marco Zero support
  isBeforeMarco: boolean("is_before_marco").default(false), // Transações antes do marco zero
  // Account reference for multiple accounts support  
  accountId: integer("account_id").references(() => accounts.id), // Conta associada (Principal, Secundária, etc)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for expense dashboard queries - optimized for filtering expenses by user and type
  index("idx_transactions_user_type_property").on(table.userId, table.type, table.propertyId),
  // Index for date ordering (common in most queries)
  index("idx_transactions_date").on(table.date),
  // Index for property-specific queries
  index("idx_transactions_property").on(table.propertyId),
  // Index for parent transaction queries (composite expenses)
  index("idx_transactions_parent").on(table.parentTransactionId),
]);

// Composite expense components table
export const expenseComponents = pgTable("expense_components", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  name: varchar("name").notNull(), // Nome do componente (ex: "Taxa Condominial", "Água", "Energia")
  category: varchar("category").notNull(), // utilities, maintenance, etc.
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cash flow settings
export const cashFlowSettings = pgTable("cash_flow_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  initialBalance: decimal("initial_balance", { precision: 12, scale: 2 }).default("0"),
  initialDate: date("initial_date").default("2025-01-01"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax payments table - for PIS, COFINS, CSLL, IRPJ  
export const taxPayments: PgTableWithColumns<any> = pgTable("tax_payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taxType: varchar("tax_type").notNull(), // PIS, COFINS, CSLL, IRPJ
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  competencyPeriodStart: date("competency_period_start").notNull(), // Início do período de competência
  competencyPeriodEnd: date("competency_period_end").notNull(), // Fim do período de competência
  selectedPropertyIds: jsonb("selected_property_ids").notNull(), // Array de IDs das propriedades selecionadas
  isInstallment: boolean("is_installment").default(false), // Para CSLL e IRPJ - se é parcelado
  installmentNumber: integer("installment_number"), // 1, 2, 3 (para pagamentos parcelados)
  parentTaxPaymentId: integer("parent_tax_payment_id").references(() => taxPayments.id), // Referência ao pagamento principal
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cleaning services table - for individual cleaning records
export const cleaningServices = pgTable("cleaning_services", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  executionDate: date("execution_date").notNull(), // Data de execução da limpeza
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Valor da limpeza
  batchId: integer("batch_id").references(() => cleaningBatches.id), // Agrupa limpezas em lote de pagamento
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cleaning batches table - groups cleanings for payment
export const cleaningBatches = pgTable("cleaning_batches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymentDate: date("payment_date").notNull(), // Data de pagamento do lote
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(), // Valor total do lote
  description: text("description"),
  hasAdvancePayment: boolean("has_advance_payment").default(false), // Se teve adiantamento
  advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }), // Valor do adiantamento
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property name mappings table - for learning property name variations
export const propertyNameMappings = pgTable("property_name_mappings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  variation: varchar("variation").notNull(), // Variação encontrada (ex: "HADDOK LOBO")
  createdAt: timestamp("created_at").defaultNow(),
});

// Cleaning service details table - for individual cleaning records (legacy table)
export const cleaningServiceDetails = pgTable("cleaning_service_details", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id), // Reference to parent cleaning transaction
  propertyId: integer("property_id").notNull().references(() => properties.id),
  serviceDate: date("service_date").notNull(), // Data da limpeza
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax settings table - configurações de alíquotas com histórico
export const taxSettings = pgTable("tax_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taxType: varchar("tax_type").notNull(), // PIS, COFINS, IRPJ, CSLL
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(), // Alíquota em porcentagem
  baseRate: decimal("base_rate", { precision: 5, scale: 2 }), // Base de cálculo para lucro presumido (32% para IRPJ/CSLL)
  additionalRate: decimal("additional_rate", { precision: 5, scale: 2 }), // Adicional IRPJ (10% sobre excedente)
  additionalThreshold: decimal("additional_threshold", { precision: 12, scale: 2 }), // Limite para adicional (R$ 20.000/mês)
  paymentFrequency: varchar("payment_frequency").notNull(), // monthly, quarterly
  dueDay: integer("due_day"), // Dia do vencimento (25 para PIS/COFINS, último dia útil para IRPJ/CSLL)
  installmentAllowed: boolean("installment_allowed").default(false), // Se permite parcelamento
  installmentThreshold: decimal("installment_threshold", { precision: 12, scale: 2 }), // Valor mínimo para parcelamento (R$ 2.000)
  installmentCount: integer("installment_count"), // Número de parcelas (3 para IRPJ/CSLL)
  effectiveDate: date("effective_date").notNull(), // Data de vigência da alíquota
  endDate: date("end_date"), // Data fim da vigência (null = vigente)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marco Zero table - pontos de partida financeiros
export const marcoZero = pgTable("marco_zero", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  marcoDate: date("marco_date").notNull(), // Data do marco zero
  isActive: boolean("is_active").default(true), // Apenas um marco pode estar ativo
  
  // Saldos por conta no momento do marco
  accountBalances: jsonb("account_balances").notNull(), // Array de {accountId, accountName, balance}
  totalBalance: decimal("total_balance", { precision: 12, scale: 2 }).notNull(), // Soma total dos saldos
  
  notes: text("notes"),
  deactivatedAt: timestamp("deactivated_at"), // Quando foi substituído por outro marco
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reconciliation Adjustments table - ajustes de reconciliação bancária
export const reconciliationAdjustments = pgTable("reconciliation_adjustments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  marcoZeroId: integer("marco_zero_id").references(() => marcoZero.id), // Marco relacionado
  accountId: integer("account_id").references(() => accounts.id), // Conta afetada
  
  adjustmentDate: date("adjustment_date").notNull(), // Data do ajuste
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Valor do ajuste (positivo ou negativo)
  type: varchar("type").notNull(), // bank_fee, correction, etc.
  description: text("description").notNull(), // Descrição do ajuste
  
  // Referência bancária
  bankReference: varchar("bank_reference"), // Número do documento bancário
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax projections table - projeções calculadas automaticamente
export const taxProjections = pgTable("tax_projections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taxType: varchar("tax_type").notNull(), // PIS, COFINS, IRPJ, CSLL
  referenceMonth: date("reference_month").notNull(), // Mês de competência (receitas)
  dueDate: date("due_date").notNull(), // Data de vencimento
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }).notNull(), // Base de cálculo (receitas do mês)
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(), // Valor do imposto
  additionalAmount: decimal("additional_amount", { precision: 12, scale: 2 }), // Adicional IRPJ
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(), // Total a pagar
  status: varchar("status").notNull().default("projected"), // projected, confirmed, paid
  manualOverride: boolean("manual_override").default(false), // Se foi editado manualmente
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }), // Valor original antes da edição manual
  
  // Controle de parcelamento
  isInstallment: boolean("is_installment").default(false),
  installmentNumber: integer("installment_number"), // 1, 2, 3
  parentProjectionId: integer("parent_projection_id"),
  
  // Rateio por propriedade
  propertyDistribution: jsonb("property_distribution"), // Array com {propertyId, propertyName, revenue, taxAmount}
  selectedPropertyIds: jsonb("selected_property_ids"), // IDs das propriedades selecionadas
  
  // Integração com transações
  transactionId: integer("transaction_id").references(() => transactions.id), // Transaction criada quando confirmado
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  transactions: many(transactions),
  accounts: many(accounts),
  marcoZeros: many(marcoZero),
  reconciliationAdjustments: many(reconciliationAdjustments),
  cleaningServices: many(cleaningServices),
  cleaningBatches: many(cleaningBatches),
  propertyNameMappings: many(propertyNameMappings),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  cleaningServices: many(cleaningServices),
  propertyNameMappings: many(propertyNameMappings),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
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
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const taxPaymentsRelations = relations(taxPayments, ({ one }) => ({
  user: one(users, {
    fields: [taxPayments.userId],
    references: [users.id],
  }),
  parentTaxPayment: one(taxPayments, {
    fields: [taxPayments.parentTaxPaymentId],
    references: [taxPayments.id],
  }),
}));

export const taxSettingsRelations = relations(taxSettings, ({ one }) => ({
  user: one(users, {
    fields: [taxSettings.userId],
    references: [users.id],
  }),
}));

export const taxProjectionsRelations = relations(taxProjections, ({ one }) => ({
  user: one(users, {
    fields: [taxProjections.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [taxProjections.transactionId],
    references: [transactions.id],
  }),
  parentProjection: one(taxProjections, {
    fields: [taxProjections.parentProjectionId],
    references: [taxProjections.id],
  }),
}));

export const marcoZeroRelations = relations(marcoZero, ({ one, many }) => ({
  user: one(users, {
    fields: [marcoZero.userId],
    references: [users.id],
  }),
  reconciliationAdjustments: many(reconciliationAdjustments),
}));

export const reconciliationAdjustmentsRelations = relations(reconciliationAdjustments, ({ one }) => ({
  user: one(users, {
    fields: [reconciliationAdjustments.userId],
    references: [users.id],
  }),
  marcoZero: one(marcoZero, {
    fields: [reconciliationAdjustments.marcoZeroId],
    references: [marcoZero.id],
  }),
  account: one(accounts, {
    fields: [reconciliationAdjustments.accountId],
    references: [accounts.id],
  }),
}));

export const cleaningServicesRelations = relations(cleaningServices, ({ one }) => ({
  user: one(users, {
    fields: [cleaningServices.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [cleaningServices.propertyId],
    references: [properties.id],
  }),
  batch: one(cleaningBatches, {
    fields: [cleaningServices.batchId],
    references: [cleaningBatches.id],
  }),
}));

export const cleaningBatchesRelations = relations(cleaningBatches, ({ one, many }) => ({
  user: one(users, {
    fields: [cleaningBatches.userId],
    references: [users.id],
  }),
  cleaningServices: many(cleaningServices),
}));

export const propertyNameMappingsRelations = relations(propertyNameMappings, ({ one }) => ({
  user: one(users, {
    fields: [propertyNameMappings.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [propertyNameMappings.propertyId],
    references: [properties.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertAccount = typeof accounts.$inferInsert;
export type Account = typeof accounts.$inferSelect;

export type InsertProperty = typeof properties.$inferInsert;
export type Property = typeof properties.$inferSelect;

export type InsertTransaction = typeof transactions.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;

export type InsertTaxPayment = typeof taxPayments.$inferInsert;
export type TaxPayment = typeof taxPayments.$inferSelect;

export type InsertTaxSettings = typeof taxSettings.$inferInsert;
export type TaxSettings = typeof taxSettings.$inferSelect;

export type InsertTaxProjection = typeof taxProjections.$inferInsert;
export type TaxProjection = typeof taxProjections.$inferSelect;

export type InsertMarcoZero = typeof marcoZero.$inferInsert;
export type MarcoZero = typeof marcoZero.$inferSelect;

export type InsertReconciliationAdjustment = typeof reconciliationAdjustments.$inferInsert;
export type ReconciliationAdjustment = typeof reconciliationAdjustments.$inferSelect;

export type InsertCleaningService = typeof cleaningServices.$inferInsert;
export type CleaningService = typeof cleaningServices.$inferSelect;

export type InsertCleaningBatch = typeof cleaningBatches.$inferInsert;
export type CleaningBatch = typeof cleaningBatches.$inferSelect;

export type InsertPropertyNameMapping = typeof propertyNameMappings.$inferInsert;
export type PropertyNameMapping = typeof propertyNameMappings.$inferSelect;

// Schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxPaymentSchema = createInsertSchema(taxPayments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxSettingsSchema = createInsertSchema(taxSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxProjectionSchema = createInsertSchema(taxProjections).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarcoZeroSchema = createInsertSchema(marcoZero).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReconciliationAdjustmentSchema = createInsertSchema(reconciliationAdjustments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningServiceSchema = createInsertSchema(cleaningServices).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningBatchSchema = createInsertSchema(cleaningBatches).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyNameMappingSchema = createInsertSchema(propertyNameMappings).omit({
  id: true,
  userId: true,
  createdAt: true,
});
