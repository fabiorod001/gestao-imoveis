import { z } from 'zod';

// User schemas
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password_hash: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

// Property schemas
export const PropertySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['apartment', 'house', 'commercial', 'land', 'other']),
  address: z.string().min(1, 'Endereço é obrigatório'),
  acquisition_date: z.string(),
  acquisition_value: z.number().positive('Valor deve ser positivo'),
  current_value: z.number().positive('Valor deve ser positivo'),
  ipca_updated_value: z.number().optional(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parking_spots: z.number().int().min(0).optional(),
  description: z.string().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance']).default('vacant'),
  created_at: z.string(),
  updated_at: z.string()
});

export const CreatePropertySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['apartment', 'house', 'commercial', 'land', 'other']),
  address: z.string().min(1, 'Endereço é obrigatório'),
  acquisition_date: z.string(),
  acquisition_value: z.number().positive('Valor deve ser positivo'),
  current_value: z.number().positive('Valor deve ser positivo'),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parking_spots: z.number().int().min(0).optional(),
  description: z.string().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance']).default('vacant')
});

export const UpdatePropertySchema = CreatePropertySchema.partial();

// Transaction schemas
export const TransactionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  property_id: z.string().optional(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  subcategory: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.string(),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  recurring_end_date: z.string().optional(),
  pro_rata_group_id: z.string().optional(),
  supplier_id: z.string().optional(),
  tax_type: z.enum(['none', 'irpf', 'irpj', 'iss', 'other']).optional(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const CreateTransactionSchema = z.object({
  property_id: z.string().optional(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  subcategory: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.string(),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  recurring_end_date: z.string().optional(),
  pro_rata_group_id: z.string().optional(),
  supplier_id: z.string().optional(),
  tax_type: z.enum(['none', 'irpf', 'irpj', 'iss', 'other']).optional(),
  notes: z.string().optional()
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial();

// Supplier schemas
export const SupplierSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional()
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

// Airbnb import schemas
export const AirbnbImportSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  property_id: z.string(),
  file_name: z.string(),
  import_type: z.enum(['actual', 'pending']),
  start_date: z.string(),
  end_date: z.string(),
  total_records: z.number().int().min(0),
  total_amount: z.number(),
  status: z.enum(['processing', 'completed', 'failed']).default('processing'),
  created_at: z.string()
});

export const CreateAirbnbImportSchema = z.object({
  property_id: z.string(),
  file_name: z.string(),
  import_type: z.enum(['actual', 'pending']),
  csv_data: z.string() // Base64 encoded CSV data
});

// IPCA schemas
export const IPCASchema = z.object({
  id: z.string(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  rate: z.number(),
  accumulated_rate: z.number(),
  created_at: z.string()
});

// Cash flow settings schemas
export const CashFlowSettingsSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  default_currency: z.string().default('BRL'),
  projection_months: z.number().int().min(1).max(60).default(12),
  auto_ipca_update: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string()
});

export const UpdateCashFlowSettingsSchema = z.object({
  default_currency: z.string().optional(),
  projection_months: z.number().int().min(1).max(60).optional(),
  auto_ipca_update: z.boolean().optional()
});

// Dashboard schemas
export const DashboardStatsSchema = z.object({
  total_properties: z.number(),
  total_revenue: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  occupancy_rate: z.number(),
  projected_annual: z.number()
});

export const PropertyPerformanceSchema = z.object({
  property_id: z.string(),
  property_name: z.string(),
  monthly_revenue: z.number(),
  monthly_expenses: z.number(),
  net_income: z.number(),
  roi: z.number(),
  occupancy_rate: z.number()
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number()
  }),
  error: z.string().optional()
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

export const DateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export const TransactionFilterSchema = z.object({
  property_id: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;

export type Property = z.infer<typeof PropertySchema>;
export type CreateProperty = z.infer<typeof CreatePropertySchema>;
export type UpdateProperty = z.infer<typeof UpdatePropertySchema>;

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;

export type Supplier = z.infer<typeof SupplierSchema>;
export type CreateSupplier = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplier = z.infer<typeof UpdateSupplierSchema>;

export type AirbnbImport = z.infer<typeof AirbnbImportSchema>;
export type CreateAirbnbImport = z.infer<typeof CreateAirbnbImportSchema>;

export type IPCA = z.infer<typeof IPCASchema>;
export type CashFlowSettings = z.infer<typeof CashFlowSettingsSchema>;
export type UpdateCashFlowSettings = z.infer<typeof UpdateCashFlowSettingsSchema>;

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type PropertyPerformance = z.infer<typeof PropertyPerformanceSchema>;

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

export type Pagination = z.infer<typeof PaginationSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;

// Constants
export const PROPERTY_TYPES = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
  other: 'Outro'
} as const;

export const TRANSACTION_CATEGORIES = {
  income: {
    rent: 'Aluguel',
    airbnb: 'Airbnb',
    sale: 'Venda',
    other: 'Outros'
  },
  expense: {
    condominium: 'Condomínio',
    iptu: 'IPTU',
    maintenance: 'Manutenção',
    cleaning: 'Limpeza',
    utilities: 'Utilidades',
    insurance: 'Seguro',
    management: 'Gestão Maurício',
    other: 'Outros'
  }
} as const;

export const TRANSACTION_STATUS = {
  pending: 'Pendente',
  completed: 'Concluído',
  cancelled: 'Cancelado'
} as const;

export const PROPERTY_STATUS = {
  vacant: 'Vago',
  occupied: 'Ocupado',
  maintenance: 'Manutenção'
} as const;