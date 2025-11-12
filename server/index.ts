// Load environment variables from .env file (for production)
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file - try multiple paths
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.production'),
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../.env.production'),
];

// Try each path - dotenv will only load if file exists
for (const envPath of envPaths) {
  const result = config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Loaded environment from: ${envPath}`);
    break;
  }
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000 (or PORT from env)
  // this serves both the API and the client.
  // Listening on 0.0.0.0 to allow LAN access
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    log(`Server listening on http://${host}:${port}`);
    log(`Local: http://localhost:${port}`);
    if (host === "0.0.0.0") {
      log(`LAN: http://<your-ip>:${port}`);
      log(`Note: Use your server's IP address to access from other devices on the network`);
    }
  });
})();
