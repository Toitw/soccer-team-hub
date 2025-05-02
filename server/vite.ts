import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

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
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Use Vite's middlewares first - this includes static file serving and HMR
  app.use(vite.middlewares);
  
  // This catch-all route will serve the React application
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes and health check routes
    if (url.startsWith('/api') || 
        url === '/health-check' || 
        url === '/health') {
      return next();
    }
    
    log(`Serving client app for URL: ${url}`);

    try {
      log(`Serving client app for URL: ${url}`);
      
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files but exclude critical API paths
  app.use(express.static(distPath));

  // Special case for root path to ensure health checks work
  // This is needed because the catch-all below would otherwise intercept all requests
  app.get('/', (req, res, next) => {
    // If there's already a handler for this (our health check handler),
    // the static middleware will be skipped, so we need to call next()
    next();
  });

  // Fall through to index.html for client-side routing, but skip API and health check routes
  app.use("*", (req, res, next) => {
    const path = req.originalUrl;
    
    // Skip API routes and health check routes
    if (path.startsWith('/api') || 
        path === '/health' || 
        path === '/health-check') {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
