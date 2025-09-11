import { z } from "zod";

/**
 * ====================================
 * REGEX PATTERNS
 * ====================================
 */

// CPF: 000.000.000-00 ou 00000000000
const CPF_REGEX = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

// CNPJ: 00.000.000/0000-00 ou 00000000000000
const CNPJ_REGEX = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})$/;

// Telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000 ou 00000000000
const PHONE_REGEX = /^(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})$/;

// CEP: 00000-000 ou 00000000
const CEP_REGEX = /^(\d{5}-?\d{3})$/;

// Email
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Data no formato YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Data e hora no formato ISO 8601
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

// Chave PIX (email, telefone, CPF/CNPJ ou chave aleatória)
const PIX_KEY_REGEX = /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})|(\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;

/**
 * ====================================
 * FUNÇÕES DE VALIDAÇÃO
 * ====================================
 */

/**
 * Valida CPF brasileiro
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF[9])) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF[10])) return false;

  return true;
}

/**
 * Valida CNPJ brasileiro
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, "");

  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCNPJ[12])) return false;

  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCNPJ[13])) return false;

  return true;
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata CNPJ para exibição
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

/**
 * Formata CEP para exibição
 */
export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, "");
  return clean.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/**
 * ====================================
 * SCHEMAS ZOD REUTILIZÁVEIS
 * ====================================
 */

/**
 * Schema para CPF
 */
export const cpfSchema = z
  .string()
  .min(11, "CPF deve ter 11 dígitos")
  .refine((val) => CPF_REGEX.test(val), "Formato de CPF inválido")
  .refine((val) => validateCPF(val), "CPF inválido");

/**
 * Schema para CNPJ
 */
export const cnpjSchema = z
  .string()
  .min(14, "CNPJ deve ter 14 dígitos")
  .refine((val) => CNPJ_REGEX.test(val), "Formato de CNPJ inválido")
  .refine((val) => validateCNPJ(val), "CNPJ inválido");

/**
 * Schema para CPF ou CNPJ
 */
export const cpfCnpjSchema = z
  .string()
  .refine(
    (val) => CPF_REGEX.test(val) || CNPJ_REGEX.test(val),
    "Formato de CPF/CNPJ inválido"
  )
  .refine(
    (val) => {
      const clean = val.replace(/\D/g, "");
      if (clean.length === 11) return validateCPF(val);
      if (clean.length === 14) return validateCNPJ(val);
      return false;
    },
    "CPF/CNPJ inválido"
  );

/**
 * Schema para telefone brasileiro
 */
export const phoneSchema = z
  .string()
  .refine((val) => PHONE_REGEX.test(val), "Formato de telefone inválido");

/**
 * Schema para CEP
 */
export const cepSchema = z
  .string()
  .refine((val) => CEP_REGEX.test(val), "Formato de CEP inválido");

/**
 * Schema para email
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .max(255, "Email muito longo");

/**
 * Schema para chave PIX
 */
export const pixKeySchema = z
  .string()
  .refine((val) => PIX_KEY_REGEX.test(val), "Chave PIX inválida");

/**
 * Schema para data (YYYY-MM-DD)
 */
export const dateSchema = z
  .string()
  .refine((val) => DATE_REGEX.test(val), "Data deve estar no formato YYYY-MM-DD")
  .refine((val) => !isNaN(Date.parse(val)), "Data inválida");

/**
 * Schema para data/hora ISO 8601
 */
export const datetimeSchema = z
  .string()
  .refine((val) => DATETIME_REGEX.test(val), "Data/hora deve estar no formato ISO 8601")
  .refine((val) => !isNaN(Date.parse(val)), "Data/hora inválida");

/**
 * Schema para valor monetário
 */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (typeof val === "string") {
      // Remove R$, espaços e troca vírgula por ponto
      const clean = val.replace(/[R$\s]/g, "").replace(",", ".");
      return parseFloat(clean);
    }
    return val;
  })
  .refine((val) => !isNaN(val), "Valor monetário inválido")
  .refine((val) => val >= 0, "Valor não pode ser negativo")
  .refine((val) => val <= 999999999.99, "Valor muito alto");

/**
 * Schema para porcentagem (0-100)
 */
export const percentageSchema = z
  .number()
  .min(0, "Porcentagem não pode ser negativa")
  .max(100, "Porcentagem não pode ser maior que 100");

/**
 * Schema para ano
 */
export const yearSchema = z
  .number()
  .int("Ano deve ser um número inteiro")
  .min(1900, "Ano inválido")
  .max(2100, "Ano inválido");

/**
 * Schema para mês (1-12)
 */
export const monthSchema = z
  .number()
  .int("Mês deve ser um número inteiro")
  .min(1, "Mês deve ser entre 1 e 12")
  .max(12, "Mês deve ser entre 1 e 12");

/**
 * Schema para período de datas
 */
export const dateRangeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: "Data inicial deve ser anterior ou igual à data final",
      path: ["startDate"],
    }
  );

/**
 * Schema para paginação
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schema para busca com filtros
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(255).optional(),
  ...paginationSchema.shape,
});

/**
 * Schema para ID numérico
 */
export const idSchema = z.coerce
  .number()
  .int("ID deve ser um número inteiro")
  .positive("ID deve ser positivo");

/**
 * Schema para array de IDs
 */
export const idsArraySchema = z
  .array(idSchema)
  .min(1, "Deve fornecer pelo menos um ID");

/**
 * Schema para moeda
 */
export const currencySchema = z
  .enum(["BRL", "USD", "EUR"])
  .default("BRL");

/**
 * Schema para status de imóvel
 */
export const propertyStatusSchema = z.enum([
  "active",
  "inactive",
  "decoration",
  "financing",
]);

/**
 * Schema para tipo de imóvel
 */
export const propertyTypeSchema = z.enum([
  "apartment",
  "house",
  "commercial",
  "land",
  "other",
]);

/**
 * Schema para tipo de aluguel
 */
export const rentalTypeSchema = z.enum([
  "monthly",
  "airbnb",
  "commercial",
  "seasonal",
]);

/**
 * Schema para tipo de transação
 */
export const transactionTypeSchema = z.enum(["revenue", "expense"]);

/**
 * Schema para categoria de receita
 */
export const revenueCategorySchema = z.enum([
  "Airbnb",
  "Booking",
  "Recorrente",
  "Venda",
  "Outros",
]);

/**
 * Schema para categoria de despesa
 */
export const expenseCategorySchema = z.enum([
  "Condomínio",
  "IPTU",
  "Água",
  "Energia",
  "Internet",
  "Gás",
  "Seguro",
  "Manutenção",
  "Limpeza",
  "Gestão",
  "Financiamento",
  "Outros",
]);

/**
 * Schema para método de pagamento
 */
export const paymentMethodSchema = z.enum([
  "pix",
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "boleto",
  "other",
]);

/**
 * ====================================
 * FUNÇÕES HELPER
 * ====================================
 */

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida se uma data está no futuro
 */
export function isFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Valida se uma data está no passado
 */
export function isPastDate(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Valida se uma data está dentro de um intervalo
 */
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return dateObj >= start && dateObj <= end;
}

/**
 * Limpa string removendo caracteres especiais
 */
export function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove caracteres de controle
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove scripts
    .replace(/<[^>]+>/g, ""); // Remove tags HTML
}

/**
 * Trunca string com reticências
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Valida força de senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Senha deve ter pelo menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Senha deve conter pelo menos um caractere especial");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}