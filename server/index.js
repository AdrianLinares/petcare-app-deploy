/**
 * PetCare Standalone Express Server
 *
 * REEMPLAZA a Netlify Dev/Netlify Functions.
 * Envuelve cada handler serverless (auth.ts, pets.ts, etc.) en rutas Express,
 * traduciendo el request/response de Express al formato HandlerEvent/HandlerResponse
 * que las funciones esperan.
 *
 * Sirve los estáticos del frontend (frontend/dist) y hace SPA fallback.
 *
 * Uso:
 *   node server/index.js
 *   # o via pnpm: pnpm start
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ──────────────────────────────────────────────
// Path helpers (ESM __dirname)
// ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ──────────────────────────────────────────────
// Environment
// ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = path.resolve(ROOT, process.env.STATIC_DIR || 'frontend/dist');
const NODE_ENV = process.env.NODE_ENV || 'production';

// ──────────────────────────────────────────────
// Dynamic handler loader
// ──────────────────────────────────────────────
const HANDLERS_DIR = path.resolve(ROOT, 'netlify/functions');

/**
 * buildHandlerEvent — Construye un objeto compatible con @netlify/functions HandlerEvent
 * a partir del request de Express.
 */
function buildHandlerEvent(req, normalizedPath) {
  return {
    httpMethod: req.method,
    path: normalizedPath,
    headers: { ...req.headers },
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    queryStringParameters: { ...req.query },
    multiValueQueryStringParameters: Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [
        k,
        Array.isArray(v) ? v : [v],
      ])
    ),
  };
}

/**
 * buildHandlerResponse — Traduce HandlerResponse a respuesta Express.
 */
function sendHandlerResponse(res, handlerResponse) {
  const { statusCode, headers, body } = handlerResponse;
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.status(statusCode);
  if (body) {
    try {
      const parsed = JSON.parse(body);
      res.json(parsed);
    } catch {
      res.send(body);
    }
  } else {
    res.end();
  }
}

/**
 * loadAndRunHandler — Carga el módulo .ts del handler y lo ejecuta.
 * Usa import() dinámico. tsx/node --experimental-strip-types
 * resuelve los .ts en runtime.
 */
const handlerCache = new Map();

async function loadHandler(moduleName) {
  if (handlerCache.has(moduleName)) {
    return handlerCache.get(moduleName);
  }

  // Intentamos .ts primero (source), luego .js (pre-compilado)
  const tsPath = path.join(HANDLERS_DIR, `${moduleName}.ts`);
  const jsPath = path.join(HANDLERS_DIR, `${moduleName}.js`);

  let modulePath;
  if (fs.existsSync(tsPath)) {
    modulePath = tsPath;
  } else if (fs.existsSync(jsPath)) {
    modulePath = jsPath;
  } else {
    throw new Error(`Handler not found: ${moduleName} (looked for .ts and .js in ${HANDLERS_DIR})`);
  }

  const mod = await import(modulePath);
  const handler = mod.handler;
  if (typeof handler !== 'function') {
    throw new Error(`Module ${modulePath} does not export a "handler" function`);
  }

  // Cacheamos para evitar re-leer en cada request
  handlerCache.set(moduleName, handler);
  return handler;
}

/**
 * createHandlerRoute — Factory que genera middleware Express para un handler.
 */
function createHandlerRoute(moduleName, apiPrefix) {
  return async (req, res, next) => {
    try {
      const handler = await loadHandler(moduleName);
      // El handler recibe el path con el prefijo /api/{name} para que
      // su propio .replace() lo normalice internamente
      const normalizedPath = `${apiPrefix}${req.path}`;
      const event = buildHandlerEvent(req, normalizedPath);
      const result = await handler(event);
      sendHandlerResponse(res, result);
    } catch (err) {
      console.error(`[${moduleName}] Error:`, err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  };
}

// ──────────────────────────────────────────────
// Route map: module name → API prefix
// ──────────────────────────────────────────────
const ROUTES = {
  auth:            '/api/auth',
  pets:            '/api/pets',
  appointments:    '/api/appointments',
  'medical-records':  '/api/medical-records',
  'clinical-records': '/api/clinical-records',
  medications:     '/api/medications',
  vaccinations:    '/api/vaccinations',
  users:           '/api/users',
  notifications:   '/api/notifications',
};

// ──────────────────────────────────────────────
// Express app setup
// ──────────────────────────────────────────────
const app = express();

// Middleware global
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// API routes — cada handler en su prefijo
// ──────────────────────────────────────────────
for (const [moduleName, prefix] of Object.entries(ROUTES)) {
  // Catch-all para /api/{name} y /api/{name}/*
  const routePath = `${prefix}(/*)?`;
  app.all(routePath, createHandlerRoute(moduleName, prefix));
}

// ──────────────────────────────────────────────
// Frontend static files (producción)
// ──────────────────────────────────────────────
if (NODE_ENV === 'production') {
  if (fs.existsSync(STATIC_DIR)) {
    console.log(`[server] Serving static files from: ${STATIC_DIR}`);
    app.use(express.static(STATIC_DIR));

    // SPA fallback — cualquier ruta no-API vuelve a index.html
    app.get('*', (req, res) => {
      const indexPath = path.join(STATIC_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          success: false,
          error: `Frontend build not found. Run: pnpm build`,
        });
      }
    });
  } else {
    console.warn(`[server] WARNING: Static dir not found at ${STATIC_DIR}`);
    console.warn('[server] Frontend will not be served. Run: pnpm build');
  }
}

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  PetCare Server`);
  console.log(`  Environment: ${NODE_ENV}`);
  console.log(`  Listening:   http://${HOST}:${PORT}`);
  console.log(`  API:         http://${HOST}:${PORT}/api`);
  console.log(`  Health:      http://${HOST}:${PORT}/health`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});

export default app;
