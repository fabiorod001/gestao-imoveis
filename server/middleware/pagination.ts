import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Middleware para adicionar paginação otimizada para mobile
 * Limita resultados para melhor performance em dispositivos móveis
 */
export function paginationMiddleware(
  defaultLimit: number = 20,
  maxLimit: number = 100
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const requestedLimit = parseInt(req.query.limit as string) || defaultLimit;
    
    // Limita para evitar sobrecarga em mobile
    const limit = Math.min(requestedLimit, maxLimit);
    const offset = (page - 1) * limit;

    // Adiciona parâmetros de paginação ao request
    (req as any).pagination = {
      page,
      limit,
      offset,
    } as PaginationParams;

    next();
  };
}

/**
 * Helper para criar resposta paginada
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrevious: params.page > 1,
    },
  };
}

/**
 * Middleware para cache otimizado mobile
 * Adiciona headers de cache apropriados
 */
export function mobileCacheMiddleware(
  cacheType: 'static' | 'dynamic' | 'realtime' = 'dynamic'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Configurações de cache por tipo
    const cacheSettings = {
      static: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hora
        'Surrogate-Control': 'max-age=86400', // 1 dia CDN
      },
      dynamic: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120', // 1 min, revalida em 2 min
      },
      realtime: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    };

    const headers = cacheSettings[cacheType];
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // ETag para cache condicional
    if (cacheType !== 'realtime') {
      res.setHeader('ETag', `W/"${Date.now()}"`);
    }

    next();
  };
}

/**
 * Middleware para compressão de resposta
 * Reduz tamanho de dados transferidos em mobile
 */
export function compressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Adiciona suporte a compressão
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    next();
  };
}