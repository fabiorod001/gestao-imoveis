import dotenv from "dotenv-safe";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
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

// Load and validate environment variables
dotenv.config({
  allowEmptyValues: true,
  example: "./.env.example",
});

const app = express();

// Disable x-powered-by header for security and smaller response size
app.disable('x-powered-by');

// Enable trust proxy for proper client IP detection when behind a proxy
// Use 1 to trust only the first hop for better security
app.set('trust proxy', 1);

// Enable compression for all responses with aggressive settings
app.use(compression({
  level: 9, // Maximum compression level
  threshold: 0, // Compress everything, even small responses
  filter: (req, res) => {
    // Don't compress server-sent events
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    // Use default filter function
    return compression.filter(req, res);
  }
}));

// Performance optimizations
app.use(connectionOptimization); // Connection keep-alive optimization
app.use(apiCacheControl); // API cache control headers
// Note: cacheMiddleware is applied selectively in routes.ts for specific endpoints

// Security and optimization middlewares
app.use(requestTimeout(60)); // 60 second timeout for requests
app.use(validateContentType("application/json")); // Validate content-type

// Optimized JSON parsing with reasonable limits
app.use(express.json({ 
  limit: "50mb", // Reduced from 200mb for better performance
  strict: true // Only accept arrays and objects
}));
app.use(express.urlencoded({ 
  limit: "50mb", 
  extended: true,
  parameterLimit: 10000 // Prevent DoS with too many parameters
}));

// Sanitize all input data
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

  // Use the professional error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configure keep-alive for better connection reuse
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // Should be > keepAliveTimeout
  
  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
