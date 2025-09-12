import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { formatZodErrors } from "./validation";

/**
 * Tipos de erro customizados da aplicação
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number, isOperational = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado(a)`, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
    this.name = "ConflictError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
    this.name = "BadRequestError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Erro interno do servidor", details?: any) {
    super(message, 500, false, details);
    this.name = "InternalServerError";
  }
}

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  details?: any;
  stack?: string;
  requestId?: string;
}

/**
 * Gera ID único para rastreamento de requisições
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logger de erros centralizado
 */
function logError(error: any, req: Request, requestId: string) {
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    userId: (req as any).user?.id || (req as any).session?.user?.id,
    error: {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
      stack: error.stack,
      details: error.details,
    },
  };

  // Em produção, enviar para serviço de logging (ex: Sentry, CloudWatch)
  if (process.env.NODE_ENV === "production") {
    console.error("[ERROR]", JSON.stringify(errorLog));
  } else {
    console.error("[ERROR]", errorLog);
  }
}

/**
 * Sanitiza mensagens de erro para produção
 */
function sanitizeErrorMessage(error: any, isDevelopment: boolean): string {
  // Em desenvolvimento, mostrar mensagem completa
  if (isDevelopment) {
    return error.message;
  }

  // Em produção, esconder detalhes técnicos de erros não operacionais
  if (!error.isOperational) {
    return "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.";
  }

  return error.message;
}

/**
 * Error handler global do Express
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = generateRequestId();
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Log do erro
  logError(error, req, requestId);

  // Resposta padrão
  let statusCode = error.statusCode || 500;
  let response: ErrorResponse = {
    success: false,
    message: sanitizeErrorMessage(error, isDevelopment),
    requestId,
  };

  // Tratamento específico por tipo de erro
  if (error instanceof ZodError) {
    statusCode = 400;
    response.message = "Erro de validação nos dados enviados";
    response.errors = formatZodErrors(error);
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    response.errors = error.errors;
  } else if (error.name === "CastError") {
    statusCode = 400;
    response.message = "Formato de dados inválido";
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    response.message = "Token inválido";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    response.message = "Token expirado";
  } else if (error.code === "ENOENT") {
    statusCode = 404;
    response.message = "Arquivo ou recurso não encontrado";
  } else if (error.code === "EACCES") {
    statusCode = 403;
    response.message = "Permissão negada";
  } else if (error.code === "ETIMEDOUT") {
    statusCode = 504;
    response.message = "Tempo de resposta excedido";
  } else if (error.code === "ENOTFOUND") {
    statusCode = 503;
    response.message = "Serviço temporariamente indisponível";
  }

  // Adicionar detalhes adicionais se disponível
  if (error.details && isDevelopment) {
    response.details = error.details;
  }

  // Adicionar stack trace em desenvolvimento
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  // Enviar resposta
  res.status(statusCode).json(response);
}

/**
 * Middleware para capturar erros assíncronos
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para timeout de requisições
 */
export function requestTimeout(seconds: number = 30) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      const error = new AppError(
        `Requisição excedeu o tempo limite de ${seconds} segundos`,
        504,
        true
      );
      next(error);
    }, seconds * 1000);

    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Middleware para rate limiting simples
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMinutes: number = 1
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || req.ip;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    if (!requestCounts.has(userId)) {
      requestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    const userRequests = requestCounts.get(userId)!;
    
    if (now > userRequests.resetTime) {
      userRequests.count = 1;
      userRequests.resetTime = now + windowMs;
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const error = new AppError(
        `Limite de requisições excedido. Tente novamente em ${Math.ceil(
          (userRequests.resetTime - now) / 1000
        )} segundos`,
        429,
        true
      );
      return next(error);
    }

    userRequests.count++;
    next();
  };
}

/**
 * Middleware para validar Content-Type
 */
export function validateContentType(expectedType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "DELETE" || req.method === "HEAD") {
      return next();
    }

    const contentType = req.get("Content-Type");
    if (!contentType || !contentType.includes(expectedType)) {
      const error = new BadRequestError(
        `Content-Type inválido. Esperado: ${expectedType}`,
        { received: contentType }
      );
      return next(error);
    }
    next();
  };
}

/**
 * Middleware para sanitizar entrada de dados
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Função helper para sanitizar strings
  const sanitizeString = (str: any): any => {
    if (typeof str !== "string") return str;
    
    // Remove caracteres de controle e null bytes
    return str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();
  };

  // Função recursiva para sanitizar objetos
  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitizar body, query e params
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query) as any;
  if (req.params) req.params = sanitizeObject(req.params) as any;

  next();
}