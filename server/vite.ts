import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
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
    hmr: { 
      server,
      clientPort: process.env.PORT ? parseInt(process.env.PORT) : 5000,
    },
    // Allow all hosts for LAN access in development
    allowedHosts: process.env.NODE_ENV === 'production' 
      ? (['localhost', '.local'] as string[])
      : (true as const), // Allow all hosts in development for LAN access
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

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
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
