import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
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
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const clientRoot = path.resolve(projectRoot, "client");
  const viteConfigPath = path.resolve(projectRoot, "vite.config.ts");
  
  const serverOptions = {
    middlewareMode: true,
    // CRITICAL: Pass the HTTP server so Vite can handle WebSocket upgrades for HMR
    // This allows Vite to intercept the upgrade at the server level, not Express middleware level
    hmr: {
      server: server,
    },
    // Allow all hosts for LAN access in development
    allowedHosts: process.env.NODE_ENV === 'production' 
      ? (['localhost', '.local'] as string[])
      : (true as const), // Allow all hosts in development for LAN access
  };

  // Use Vite's native config loading - simpler approach like tax-suite
  const vite = await createViteServer({
    configFile: viteConfigPath,
    root: clientRoot, // Override root to client directory
    server: serverOptions,
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);
  
  // Catch-all route for frontend - only handle non-API routes
  app.use("*", async (req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
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
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible paths for the public directory
  const possiblePaths = [
    path.resolve(import.meta.dirname, "public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "dist", "public"),
    "/var/www/react.ants.ge/public",
  ];

  let distPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      distPath = possiblePath;
      log(`Using static directory: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    log(`⚠️  Static directory not found. Tried: ${possiblePaths.join(", ")}`);
    log(`⚠️  Assuming nginx is serving static files. API routes will still work.`);
    // Don't throw error - nginx might be serving static files
    // Just add a catch-all for API routes that don't exist
    app.use("*", (_req, res, next) => {
      // Only handle non-API routes
      if (!_req.path.startsWith("/api")) {
        res.status(404).json({ message: "Not found" });
      } else {
        next();
      }
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
