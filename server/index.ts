import dotenv from "dotenv-safe";

dotenv.config({
  allowEmptyValues: true,
  example: "./.env.example",
});

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  errorHandler, 
  sanitizeInput, 
  requestTimeout,
  validateContentType 
} from "./middleware/errorHandler";
import {
  apiCacheControl,
  connectionOptimization,
  cacheMiddleware
} from "./middleware/performance";

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5000', 
    'https://quiet-pudding-f152f9.netlify.app',
    'https://gestao-imoveis-pi.vercel.app'
  ],
  credentials: true
}));

app.use(compression({
  level: 9,
  threshold: 0,
  filter: (req, res) => {
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(connectionOptimization);
app.use(apiCacheControl);
app.use(requestTimeout(60));

app.use((req, res, next) => {
  if (req.path.includes('/ocr') || 
      req.path.includes('/upload') || 
      req.path.includes('/import') ||
      req.method === 'GET' || 
      req.method === 'DELETE' || 
      req.method === 'HEAD') {
    return next();
  }
  return validateContentType("application/json")(req, res, next);
});

app.use(express.json({ 
  limit: "50mb",
  strict: true
}));
app.use(express.urlencoded({ 
  limit: "50mb", 
  extended: true,
  parameterLimit: 10000
}));

app.use(sanitizeInput);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  app.use(errorHandler);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
