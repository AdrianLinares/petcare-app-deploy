# ============================================================================
# PetCare App — Dockerfile Multi-Etapa
# ============================================================================
# Etapa 1: Instalar dependencias y build del frontend
# ============================================================================
FROM node:20-slim AS builder

# Instalar pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Instalar dependencias del sistema necesarias para bcrypt (compilación nativa)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de manifiesto primero (caching de capas)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/
COPY netlify/functions/package.json ./netlify/functions/
COPY server/package.json ./server/

# Instalar todas las dependencias del workspace
RUN pnpm install --no-frozen-lockfile

# Copiar código fuente
COPY . .

# Build del frontend (Vite genera estáticos en frontend/dist)
RUN pnpm build

# ============================================================================
# Etapa 2: Imagen final liviana para producción
# ============================================================================
FROM node:20-slim AS runner

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Instalar dependencias para bcrypt (runtime nativo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variables de entorno por defecto (sobrescribir en docker-compose o -e)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV STATIC_DIR=frontend/dist

# Copiar dependencias de producción desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copiar server (Express wrapper)
COPY server ./server

# Copiar handlers (Netlify Functions source .ts)
COPY netlify/functions ./netlify/functions

# Copiar frontend build
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copiar schema.sql para setup inicial
COPY schema.sql ./schema.sql
COPY seed-database-fixed.sql ./seed-database-fixed.sql

# Puerto del servidor Express
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Iniciar servidor Express (usa node --experimental-strip-types para .ts)
CMD ["npx", "tsx", "server/index.js"]
