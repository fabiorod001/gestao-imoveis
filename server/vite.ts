import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { ViteDevServer } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const require = createRequire(import.meta.url);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Use require() for CJS loading, then convert to ESM
  let vite: any;
  let react: any;
  
  try {
    // Try require first (bypasses tsx ESM interception)
    const vitePath = require.resolve("vite");
    const reactPath = require.resolve("@vitejs/plugin-react");
    vite = await import(vitePath);
    react = await import(reactPath);
  } catch {
    // Fallback to direct import
    vite = await import("vite");
    react = await import("@vitejs/plugin-react");
  }
  
  if (!vite.createServer) {
    throw new Error("Vite createServer not available - tsx may be interfering with ESM imports");
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const viteServer: ViteDevServer = await vite.createServer({
    plugins: [react.default()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "..", "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "..", "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "..", "dist/public"),
      emptyOutDir: true,
    },
    configFile: false,
    server: {
      ...serverOptions,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    appType: "custom",
  });

  app.use(viteServer.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  app.use(express.static(distPath));
  // Only serve index.html for non-API routes
  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next(); // Let API routes through
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
