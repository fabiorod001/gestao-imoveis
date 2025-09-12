/**
 * Pagination utilities for API responses
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from request query
 */
export function parsePaginationParams(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const offset = query.offset ? parseInt(query.offset) : (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page = 1, limit = 50 } = params;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Apply pagination to array
 */
export function paginateArray<T>(
  array: T[],
  params: PaginationParams
): { items: T[]; total: number } {
  const { offset = 0, limit = 50 } = params;
  
  return {
    items: array.slice(offset, offset + limit),
    total: array.length,
  };
}

/**
 * SQL pagination helper
 */
export function getSQLPagination(params: PaginationParams) {
  const { limit = 50, offset = 0 } = params;
  
  return {
    limit,
    offset,
  };
}

/**
 * Performance hint for pagination
 */
export function getPaginationHint(total: number, limit: number): string {
  if (total > 1000 && limit > 50) {
    return 'Consider using a smaller page size for better performance';
  }
  if (total > 10000) {
    return 'Large dataset detected. Consider adding filters to narrow results';
  }
  return '';
}