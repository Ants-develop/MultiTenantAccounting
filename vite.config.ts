import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { componentTagger } from "lovable-tagger";

export default defineConfig(async ({ mode }) => {
  // Get backend port from environment variable, default to 5000
  const backendPort = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  return {
    server: {
      host: "::",
      port: 81,
      proxy: {
        "/api": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
    envPrefix: ['VITE_', 'SUPABASE_'], // Allow SUPABASE_ prefix for unified env vars
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
      : []),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  };
});
