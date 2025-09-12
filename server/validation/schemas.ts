import { z } from "zod";
import {
  cpfCnpjSchema,
  phoneSchema,
  emailSchema,
  pixKeySchema,
  dateSchema,
  moneySchema,
  idSchema,
  idsArraySchema,
  propertyStatusSchema,
  propertyTypeSchema,
  rentalTypeSchema,
  transactionTypeSchema,
  revenueCategorySchema,
  expenseCategorySchema,
  paymentMethodSchema,
  currencySchema,
} from "../utils/validators";

/**
 * ====================================
 * MARCO ZERO SCHEMAS
 * ====================================
 */

export const accountBalanceSchema = z.object({
  accountId: idSchema,
  accountName: z.string().min(1, "Nome da conta é obrigatório"),
  balance: moneySchema,
});

export const setMarcoZeroSchema = z.object({
  marcoDate: dateSchema,
  accountBalances: z.array(accountBalanceSchema).min(1, "Pelo menos uma conta deve ter saldo"),
  notes: z.string().max(1000).optional(),
});

export const createReconciliationAdjustmentSchema = z.object({
  marcoZeroId: idSchema.optional(),
  accountId: idSchema.optional(),
  adjustmentDate: dateSchema,
  amount: moneySchema,
  type: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória").max(500),
  bankReference: z.string().max(100).optional(),
});

/**
 * ====================================
 * PROPERTY SCHEMAS
 * ====================================
 */

export const createPropertySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  nickname: z.string().max(255).optional(),
  airbnbName: z.string().max(255).optional(),
  registrationNumber: z.string().max(100).optional(),
  iptuCode: z.string().max(100).optional(),
  
  // Address fields
  condominiumName: z.string().max(255).optional(),
  street: z.string().max(255).optional(),
  number: z.string().max(20).optional(),
  tower: z.string().max(50).optional(),
  unit: z.string().max(50).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  country: z.string().max(100).default("Brasil"),
  zipCode: z.string().max(10).optional(),
  
  // Property details
  type: propertyTypeSchema,
  status: propertyStatusSchema,
  rentalType: rentalTypeSchema.optional(),
  
  // Financial information
  purchasePrice: moneySchema.optional(),
  commissionValue: moneySchema.optional(),
  taxesAndRegistration: moneySchema.optional(),
  renovationAndDecoration: moneySchema.optional(),
  otherInitialValues: moneySchema.optional(),
  
  purchaseDate: dateSchema.optional(),
  marketValue: moneySchema.optional(),
  marketValueDate: dateSchema.optional(),
  
  isFullyPaid: z.boolean().default(false),
  financingAmount: moneySchema.optional(),
  
  currency: currencySchema,
  description: z.string().max(5000).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  area: z.number().positive().max(99999).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

/**
 * ====================================
 * TRANSACTION SCHEMAS
 * ====================================
 */

export const createTransactionSchema = z.object({
  propertyId: idSchema.optional(),
  type: transactionTypeSchema,
  category: z.string().min(1, "Categoria é obrigatória").max(100),
  description: z.string().max(1000).optional(),
  amount: moneySchema,
  currency: currencySchema,
  date: dateSchema,
  
  // Accommodation dates for Airbnb/Booking
  accommodationStartDate: dateSchema.optional(),
  accommodationEndDate: dateSchema.optional(),
  
  // Recurring transaction fields
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  recurringEndDate: dateSchema.optional(),
  
  // Payment details
  payerName: z.string().max(255).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  notes: z.string().max(5000).optional(),
  
  // Supplier information
  supplier: z.string().max(255).optional(),
  cpfCnpj: cpfCnpjSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  pixKey: pixKeySchema.optional(),
  
  // Account reference
  accountId: idSchema.optional(),
  
  // Composite transaction
  parentTransactionId: idSchema.optional(),
  isCompositeParent: z.boolean().default(false),
  isHistorical: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.isRecurring && !data.recurringPeriod) {
      return false;
    }
    return true;
  },
  {
    message: "Período de recorrência é obrigatório para transações recorrentes",
    path: ["recurringPeriod"],
  }
).refine(
  (data) => {
    if (data.accommodationStartDate && data.accommodationEndDate) {
      return new Date(data.accommodationStartDate) <= new Date(data.accommodationEndDate);
    }
    return true;
  },
  {
    message: "Data de início da hospedagem deve ser anterior à data de fim",
    path: ["accommodationStartDate"],
  }
);

// Para update, criamos o schema sem os refines obrigatórios
export const updateTransactionSchema = z.object({
  propertyId: idSchema.optional(),
  type: transactionTypeSchema.optional(),
  category: z.string().min(1, "Categoria é obrigatória").max(100).optional(),
  description: z.string().max(1000).optional(),
  amount: moneySchema.optional(),
  currency: currencySchema.optional(),
  date: dateSchema.optional(),
  
  // Accommodation dates for Airbnb/Booking
  accommodationStartDate: dateSchema.optional(),
  accommodationEndDate: dateSchema.optional(),
  
  // Recurring transaction fields
  isRecurring: z.boolean().optional(),
  recurringPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  recurringEndDate: dateSchema.optional(),
  
  // Payment details
  payerName: z.string().max(255).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  notes: z.string().max(5000).optional(),
  
  // Supplier information
  supplier: z.string().max(255).optional(),
  cpfCnpj: cpfCnpjSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  pixKey: pixKeySchema.optional(),
  
  // Account reference
  accountId: idSchema.optional(),
  
  // Composite transaction
  parentTransactionId: idSchema.optional(),
  isCompositeParent: z.boolean().optional(),
  isHistorical: z.boolean().optional(),
}).partial();

/**
 * ====================================
 * COMPOSITE EXPENSE SCHEMAS
 * ====================================
 */

export const createCompositeExpenseSchema = z.object({
  propertyId: idSchema,
  date: dateSchema,
  totalAmount: moneySchema,
  description: z.string().min(1).max(1000),
  components: z.array(
    z.object({
      name: z.string().min(1).max(255),
      amount: moneySchema,
      category: expenseCategorySchema,
    })
  ).min(1, "Deve haver pelo menos um componente"),
  notes: z.string().max(5000).optional(),
}).refine(
  (data) => {
    const componentSum = data.components.reduce((sum, comp) => sum + comp.amount, 0);
    return Math.abs(componentSum - data.totalAmount) < 0.01; // Tolerância para arredondamento
  },
  {
    message: "A soma dos componentes deve ser igual ao valor total",
    path: ["totalAmount"],
  }
);

/**
 * ====================================
 * MAURÍCIO EXPENSE SCHEMAS  
 * ====================================
 */

export const createMauricioExpenseSchema = z.object({
  totalAmount: moneySchema.refine((val) => val > 0, "Valor deve ser positivo"),
  date: dateSchema,
  description: z.string().min(1, "Descrição é obrigatória").max(1000),
  selectedPropertyIds: z.array(idSchema).min(1, "Selecione pelo menos um imóvel"),
  supplier: z.string().default("Maurício"),
  notes: z.string().max(5000).optional(),
});

/**
 * ====================================
 * MANAGEMENT EXPENSE SCHEMAS
 * ====================================
 */

export const createManagementExpenseSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  properties: z.array(
    z.object({
      propertyId: idSchema,
      managementFee: moneySchema,
      extraFees: moneySchema.optional(),
      deductions: moneySchema.optional(),
      description: z.string().max(1000).optional(),
    })
  ).min(1, "Deve selecionar pelo menos um imóvel"),
  paymentDate: dateSchema,
  notes: z.string().max(5000).optional(),
});

export const updateManagementExpenseSchema = createManagementExpenseSchema.partial();

/**
 * ====================================
 * DISTRIBUTED EXPENSE SCHEMAS
 * ====================================
 */

export const createDistributedExpenseSchema = z.object({
  propertyIds: z.array(idSchema).min(1, "Deve selecionar pelo menos um imóvel"),
  category: expenseCategorySchema,
  description: z.string().min(1).max(1000),
  totalAmount: moneySchema,
  date: dateSchema,
  distributionMethod: z.enum(["equal", "proportional", "custom"]),
  customAmounts: z.record(z.string(), moneySchema).optional(),
  notes: z.string().max(5000).optional(),
}).refine(
  (data) => {
    if (data.distributionMethod === "custom" && !data.customAmounts) {
      return false;
    }
    return true;
  },
  {
    message: "Valores customizados são obrigatórios para distribuição personalizada",
    path: ["customAmounts"],
  }
);

/**
 * ====================================
 * CLEANING EXPENSE SCHEMAS
 * ====================================
 */

export const createCleaningBatchSchema = z.object({
  totalAmount: moneySchema,
  paymentDate: dateSchema,
  supplier: z.string().min(1).max(255),
  cpfCnpj: cpfCnpjSchema.optional(),
  phone: phoneSchema.optional(),
  pixKey: pixKeySchema.optional(),
  notes: z.string().max(5000).optional(),
  cleanings: z.array(
    z.object({
      propertyId: idSchema,
      checkInDate: dateSchema,
      checkOutDate: dateSchema,
      guestName: z.string().max(255).optional(),
      amount: moneySchema,
      notes: z.string().max(1000).optional(),
    })
  ).min(1, "Deve adicionar pelo menos uma limpeza"),
}).refine(
  (data) => {
    const cleaningSum = data.cleanings.reduce((sum, clean) => sum + clean.amount, 0);
    return Math.abs(cleaningSum - data.totalAmount) < 0.01;
  },
  {
    message: "A soma das limpezas deve ser igual ao valor total",
    path: ["totalAmount"],
  }
);

/**
 * ====================================
 * TAX SCHEMAS
 * ====================================
 */

export const createTaxPaymentSchema = z.object({
  propertyId: idSchema,
  taxType: z.enum(["IPTU", "IRPF", "ITR", "ITBI", "Other"]),
  description: z.string().min(1).max(1000),
  amount: moneySchema,
  dueDate: dateSchema,
  paymentDate: dateSchema.optional(),
  isPaid: z.boolean().default(false),
  installmentNumber: z.number().int().min(1).max(12).optional(),
  totalInstallments: z.number().int().min(1).max(12).optional(),
  referenceYear: z.number().int().min(2020).max(2100),
  notes: z.string().max(5000).optional(),
});

export const updateTaxPaymentSchema = createTaxPaymentSchema.partial();

/**
 * ====================================
 * IMPORT SCHEMAS
 * ====================================
 */

export const importAirbnbCSVSchema = z.object({
  propertyMapping: z.record(z.string(), idSchema),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  skipDuplicates: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

export const importExcelSchema = z.object({
  sheetName: z.string().optional(),
  headerRow: z.number().int().min(1).default(1),
  startRow: z.number().int().min(2).default(2),
  columnMapping: z.record(z.string(), z.string()),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  skipDuplicates: z.boolean().default(true),
});

/**
 * ====================================
 * ANALYTICS/QUERY SCHEMAS
 * ====================================
 */

export const analyticsQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  propertyIds: z.array(idSchema).optional(),
  transactionTypes: z.array(transactionTypeSchema).optional(),
  categories: z.array(z.string()).optional(),
  groupBy: z.enum(["property", "category", "month", "type"]).optional(),
  includeProjections: z.boolean().default(false),
});

export const monthlyAnalyticsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  propertyIds: z.array(idSchema).optional(),
});

export const pivotTableQuerySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  propertyIds: z.array(idSchema).optional(),
  showDetails: z.boolean().default(false),
});

/**
 * ====================================
 * CASH FLOW SCHEMAS
 * ====================================
 */

export const cashFlowQuerySchema = z.object({
  period: z.string().optional(), // '1d', '2d', '3d', '4d', '5d', '1m', '2m'
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountIds: z.array(idSchema).optional(),
  propertyIds: z.array(idSchema).optional(),
  includeProjections: z.boolean().default(false),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

export const cashFlowSettingsSchema = z.object({
  showHistoricalTransactions: z.boolean().default(false),
  defaultAccountId: idSchema.optional(),
  alertThreshold: moneySchema.optional(),
  projectionMonths: z.number().int().min(1).max(24).default(3),
});

/**
 * ====================================
 * ACCOUNT SCHEMAS
 * ====================================
 */

export const createAccountSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório").max(255),
  type: z.enum(["checking", "investment"]),
  bankName: z.string().max(255).optional(),
  accountNumber: z.string().max(50).optional(),
  agency: z.string().max(20).optional(),
  initialBalance: moneySchema.default(0),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateAccountSchema = createAccountSchema.partial();

/**
 * ====================================
 * EXPENSE COMPONENT SCHEMAS
 * ====================================
 */

export const createExpenseComponentSchema = z.object({
  propertyId: idSchema,
  name: z.string().min(1).max(255),
  category: expenseCategorySchema,
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateExpenseComponentSchema = createExpenseComponentSchema.partial();

/**
 * ====================================
 * REPORT SCHEMAS
 * ====================================
 */

export const generateReportSchema = z.object({
  reportType: z.enum(["financial", "tax", "occupancy", "maintenance", "custom"]),
  startDate: dateSchema,
  endDate: dateSchema,
  propertyIds: z.array(idSchema).optional(),
  format: z.enum(["pdf", "excel", "json"]).default("pdf"),
  includeCharts: z.boolean().default(true),
  includeDetails: z.boolean().default(true),
  customOptions: z.record(z.string(), z.any()).optional(),
});

/**
 * ====================================
 * CLEANUP/MAINTENANCE SCHEMAS
 * ====================================
 */

export const cleanupTransactionsSchema = z.object({
  propertyIds: z.array(idSchema).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  transactionTypes: z.array(transactionTypeSchema).optional(),
  removeDuplicates: z.boolean().default(true),
  removeOrphaned: z.boolean().default(true),
  dryRun: z.boolean().default(true),
});

/**
 * ====================================
 * COMPANY EXPENSE SCHEMA
 * ====================================
 */

export const createCompanyExpenseSchema = z.object({
  category: expenseCategorySchema,
  description: z.string().min(1).max(1000),
  amount: moneySchema,
  date: dateSchema,
  supplier: z.string().max(255).optional(),
  cpfCnpj: cpfCnpjSchema.optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  accountId: idSchema.optional(),
});

/**
 * ====================================
 * VALIDATION HELPERS
 * ====================================
 */

/**
 * Helper para validar período de datas não muito longo
 */
export function validateDateRange(startDate: string, endDate: string, maxDays: number = 365) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays > maxDays) {
    throw new Error(`Período não pode exceder ${maxDays} dias`);
  }
  
  return true;
}

/**
 * Helper para validar que data não está muito no futuro
 */
export function validateNotTooFarInFuture(date: string, maxMonths: number = 12) {
  const inputDate = new Date(date);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + maxMonths);
  
  if (inputDate > maxDate) {
    throw new Error(`Data não pode estar mais de ${maxMonths} meses no futuro`);
  }
  
  return true;
}