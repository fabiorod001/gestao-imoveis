import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;

  constructor(message: string = 'Conflito de dados') {
    super(message);
    this.name = 'ConflictError';
  }
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: validationErrors
    });
  }

  // Handle SQLite constraint errors
  if (error.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      success: false,
      error: 'Dados já existem no sistema'
    });
  }

  if (error.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({
      success: false,
      error: 'Referência inválida nos dados'
    });
  }

  // Handle operational errors
  if (error.isOperational) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }

  // Handle programming errors
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor'
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
}

// Async error wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Success response helper
export function successResponse(
  res: Response,
  data?: any,
  message?: string,
  statusCode: number = 200
) {
  res.status(statusCode).json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  });
}

// Paginated response helper
export function paginatedResponse(
  res: Response,
  data: any[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
) {
  const pages = Math.ceil(pagination.total / pagination.limit);
  
  res.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      pages
    },
    ...(message && { message })
  });
}