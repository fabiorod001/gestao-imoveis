import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

// Adicionar tipagem para session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export function getSession() {
  // Validate SESSION_SECRET exists and is secure
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error('SECURITY WARNING: SESSION_SECRET is missing or too short (minimum 32 characters)');
    throw new Error('SESSION_SECRET must be configured and at least 32 characters long');
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Note: Authentication is now required for protected routes
  // Users must explicitly login through /api/auth/login
  // No automatic session creation for security
}

export function getUserId(req: any): string {
  // For local development, use a consistent dev user
  // In production, this should require proper authentication
  if (process.env.NODE_ENV === 'development' && !req.session?.userId) {
    // Create a dev session for local development only
    req.session.userId = 'dev-user-local';
    return 'dev-user-local';
  }
  
  if (!req.session?.userId) {
    throw new Error('User not authenticated');
  }
  
  return req.session.userId;
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // In development, allow automatic dev user
  if (process.env.NODE_ENV === 'development' && !req.session?.userId) {
    req.session.userId = 'dev-user-local';
  }
  
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
};