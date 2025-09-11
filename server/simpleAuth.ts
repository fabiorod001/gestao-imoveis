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
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
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
  
  // Simple middleware to create a session for local development
  app.use((req, res, next) => {
    if (!req.session.userId) {
      req.session.userId = 'local-user';
    }
    next();
  });
}

export function getUserId(req: any): string {
  return req.session?.userId || 'local-user';
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
};