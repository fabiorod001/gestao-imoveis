import { Request, Response, NextFunction } from "express";

/**
 * Cache control middleware for API responses
 * Adds appropriate cache headers based on route patterns
 */
export function apiCacheControl(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  
  // Static data endpoints - cache for longer
  if (path.includes('/api/properties') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
    res.setHeader('Vary', 'Authorization');
  }
  // User data - cache briefly
  else if (path.includes('/api/auth/user') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
    res.setHeader('Vary', 'Authorization');
  }
  // Analytics/dashboard - cache briefly
  else if (path.includes('/api/analytics') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=30'); // 30 seconds
    res.setHeader('Vary', 'Authorization');
  }
  // Transactions - cache briefly
  else if (path.includes('/api/transactions') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=10'); // 10 seconds
    res.setHeader('Vary', 'Authorization');
  }
  // Default - no cache for mutations
  else if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Cache-Control', 'no-store');
  }
  
  // ETag support is handled by Express's built-in etag middleware
  // which generates proper content-based ETags
  
  next();
}

/**
 * Simple in-memory cache for expensive queries
 * Stores results for a short period to avoid redundant database hits
 */
class QueryCache {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttlSeconds: number = 60) {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Invalidate entries matching pattern
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

/**
 * Middleware to cache API responses
 */
export function cacheMiddleware(ttlSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key based on URL and user
    const userId = (req as any).user?.id || 'anonymous';
    const cacheKey = `${userId}:${req.originalUrl}`;
    
    // Check cache
    const cached = queryCache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache the response
    res.json = function(data: any) {
      // Cache the response
      queryCache.set(cacheKey, data, ttlSeconds);
      res.setHeader('X-Cache', 'MISS');
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Database query optimization utilities
 */
export const dbOptimizations = {
  // Batch loading helper
  async batchLoad<T>(
    ids: number[],
    loader: (ids: number[]) => Promise<T[]>,
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await loader(batch);
      results.push(...batchResults);
    }
    
    return results;
  },
  
  // Query result pagination helper
  paginate(query: any, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return {
      ...query,
      limit,
      offset
    };
  },
  
  // Select only needed fields
  selectFields(query: any, fields: string[]) {
    return {
      ...query,
      select: fields.reduce((acc, field) => ({
        ...acc,
        [field]: true
      }), {})
    };
  }
};

/**
 * Connection pooling and keep-alive headers
 */
export function connectionOptimization(req: Request, res: Response, next: NextFunction) {
  // Enable keep-alive with timeout matching server.keepAliveTimeout (65 seconds)
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=65, max=1000');
  
  next();
}