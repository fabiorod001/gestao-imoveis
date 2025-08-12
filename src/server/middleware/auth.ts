import { Request, Response, NextFunction } from 'express';

// Placeholder auth middleware - in development mode, allow all requests
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    // In development, mock user
    (req as any).user = {
      id: 'dev-user',
      email: 'dev@example.com'
    };
    next();
  } else {
    // In production, check for auth token
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // TODO: Implement actual token validation
    next();
  }
}