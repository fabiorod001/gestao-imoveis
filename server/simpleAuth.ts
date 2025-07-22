import { NextFunction, Request, Response } from "express";

// Simple authentication middleware for local development
export function setupSimpleAuth(app: any) {
  // Add a simple user to session
  app.use((req: any, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      req.session.user = {
        id: "local-user",
        username: "admin",
        name: "Local Admin"
      };
    }
    next();
  });
}

export function isAuthenticatedSimple(req: Request, res: Response, next: NextFunction) {
  if ((req as any).session?.user) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

export function getUserSimple(req: Request) {
  return (req as any).session?.user || null;
}