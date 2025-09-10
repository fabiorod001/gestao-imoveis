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
export const transactions: any = pgTable("transactions", {
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
  // Account reference for multiple accounts support  
  accountId: integer("account_id").references(() => accounts.id), // Conta associada (Principal, Secundária, etc)
  isAutoTax: boolean("is_auto_tax").default(false), // Se é imposto calculado automaticamente
  competencyPeriod: varchar("competency_period"), // Período de competência (MM/YYYY ou Q1/YYYY)
  basedOnRevenue: decimal("based_on_revenue", { precision: 12, scale: 2 }), // Receita base para cálculo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Tax payments table - for PIS, COFINS, CSLL, IRPJ (simple registry)
export const taxPayments = pgTable("tax_payments", {
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
  parentTaxPaymentId: integer("parent_tax_payment_id"), // Will add reference later
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }), // Base amount without interest
  interestAmount: decimal("interest_amount", { precision: 12, scale: 2 }), // Interest amount (1% for 2nd and 3rd installments)
  isAutoCalculated: boolean("is_auto_calculated").default(false), // Se foi calculado automaticamente
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cleaning service details table - for individual cleaning records
export const cleaningServiceDetails = pgTable("cleaning_service_details", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id), // Reference to parent cleaning transaction
  propertyId: integer("property_id").notNull().references(() => properties.id),
  serviceDate: date("service_date").notNull(), // Data da limpeza
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  transactions: many(transactions),
  accounts: many(accounts),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
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
