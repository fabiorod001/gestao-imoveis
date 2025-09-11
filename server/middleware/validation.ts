import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";

/**
 * Classe customizada de erro de validação
 */
export class ValidationError extends Error {
  public statusCode: number;
  public errors: any[];
  public isOperational: boolean;

  constructor(message: string, errors: any[] = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Formata erros do Zod em mensagens amigáveis em português
 */
export function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => {
    const field = err.path.join(".");
    let message = "";

    switch (err.code) {
      case "invalid_type":
        message = `Campo "${field}" deve ser do tipo ${translateType(err.expected)}.`;
        break;
      case "invalid_string":
        if (err.validation === "email") {
          message = `Campo "${field}" deve ser um email válido.`;
        } else if (err.validation === "url") {
          message = `Campo "${field}" deve ser uma URL válida.`;
        } else if (err.validation === "uuid") {
          message = `Campo "${field}" deve ser um UUID válido.`;
        } else if (err.validation === "datetime") {
          message = `Campo "${field}" deve ser uma data/hora válida.`;
        } else if (err.validation === "regex") {
          message = `Campo "${field}" possui formato inválido.`;
        } else {
          message = `Campo "${field}" é inválido.`;
        }
        break;
      case "too_small":
        if (err.type === "string") {
          message = `Campo "${field}" deve ter no mínimo ${err.minimum} caracteres.`;
        } else if (err.type === "number") {
          message = `Campo "${field}" deve ser maior ou igual a ${err.minimum}.`;
        } else if (err.type === "array") {
          message = `Campo "${field}" deve ter no mínimo ${err.minimum} items.`;
        } else if (err.type === "date") {
          message = `Campo "${field}" deve ser posterior a ${err.minimum}.`;
        }
        break;
      case "too_big":
        if (err.type === "string") {
          message = `Campo "${field}" deve ter no máximo ${err.maximum} caracteres.`;
        } else if (err.type === "number") {
          message = `Campo "${field}" deve ser menor ou igual a ${err.maximum}.`;
        } else if (err.type === "array") {
          message = `Campo "${field}" deve ter no máximo ${err.maximum} items.`;
        } else if (err.type === "date") {
          message = `Campo "${field}" deve ser anterior a ${err.maximum}.`;
        }
        break;
      case "invalid_enum_value":
        message = `Campo "${field}" deve ser um dos valores: ${err.options?.join(", ")}.`;
        break;
      case "invalid_date":
        message = `Campo "${field}" deve ser uma data válida.`;
        break;
      case "custom":
        message = err.message || `Campo "${field}" é inválido.`;
        break;
      default:
        message = err.message || `Campo "${field}" é inválido.`;
    }

    return { field, message };
  });
}

/**
 * Traduz tipos do Zod para português
 */
function translateType(type: string): string {
  const types: Record<string, string> = {
    string: "texto",
    number: "número",
    boolean: "booleano",
    date: "data",
    object: "objeto",
    array: "lista",
    null: "nulo",
    undefined: "indefinido",
    bigint: "número grande",
    symbol: "símbolo",
  };
  return types[type] || type;
}

/**
 * Middleware de validação genérico
 * @param schema - Schema Zod para validação
 * @param source - Onde buscar os dados (body, query, params)
 */
export function validate(
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      
      // Log para debugging em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        console.log(`[Validation] ${req.method} ${req.path} - Source: ${source}`, data);
      }

      // Valida os dados
      const validated = await schema.parseAsync(data);
      
      // Substitui os dados originais pelos dados validados
      req[source] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        // Log de erro de validação
        console.error(`[Validation Error] ${req.method} ${req.path}:`, formattedErrors);
        
        return res.status(400).json({
          success: false,
          message: "Erro de validação nos dados enviados",
          errors: formattedErrors,
        });
      }
      
      // Erro não esperado
      console.error(`[Validation] Unexpected error:`, error);
      next(error);
    }
  };
}

/**
 * Middleware para validar múltiplas fontes de dados
 */
export function validateMultiple(validations: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: { field: string; message: string }[] = [];

      // Valida body se fornecido
      if (validations.body) {
        try {
          req.body = await validations.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // Valida query se fornecido
      if (validations.query) {
        try {
          req.query = await validations.query.parseAsync(req.query) as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // Valida params se fornecido
      if (validations.params) {
        try {
          req.params = await validations.params.parseAsync(req.params) as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodErrors(error));
          }
        }
      }

      // Se houver erros, retorna todos
      if (errors.length > 0) {
        console.error(`[Validation Error] ${req.method} ${req.path}:`, errors);
        return res.status(400).json({
          success: false,
          message: "Erro de validação nos dados enviados",
          errors,
        });
      }

      next();
    } catch (error) {
      console.error(`[Validation] Unexpected error:`, error);
      next(error);
    }
  };
}

/**
 * Helper para criar validador de ID numérico
 */
export const idSchema = z.coerce.number().int().positive("ID deve ser um número positivo");

/**
 * Helper para criar validador de paginação
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Helper para criar validador de período de datas
 */
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: "Data inicial deve ser anterior ou igual à data final",
    path: ["startDate"],
  }
);