import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Ensure NODE_ENV is set; default to development
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }
  
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`Starting server in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode...`);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use((req, res, next) => {
    // Only log significant requests to avoid cluttering
    if (!req.url.includes('/assets/') && !req.url.includes('.css')) {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const contentType = res.get('Content-Type') || 'unknown';
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${contentType}, ${duration}ms)`);
      });
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // Catch-all for undefined API routes
  app.all("/api/*", (req, res) => {
    console.warn(`API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.error("DIST directory not found! Have you run 'npm run build'?");
      app.get("*", (req, res) => {
        res.status(500).send("Application not built. Please run 'npm run build' first.");
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Development App URL: ${process.env.VITE_APP_URL || "http://localhost:3000"}`);
  });
}

startServer();
