#!/bin/bash
# ============================================================================
# PetCare App — Script de Inicio (Producción)
# ============================================================================
# Uso:
#   bash scripts/start.sh                # Inicia con valores por defecto
#   PORT=8080 bash scripts/start.sh      # Puerto personalizado
# ============================================================================

set -euo pipefail

# ── Rutas ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# ── Configuración ──────────────────────────────────────────────────────────
NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

# ── Funciones ──────────────────────────────────────────────────────────────
log()  { echo -e "\033[0;32m[✓]\033[0m $1"; }
warn() { echo -e "\033[1;33m[!]\033[0m $1"; }
err()  { echo -e "\033[0;31m[✗]\033[0m $1"; exit 1; }

# ── Validaciones ───────────────────────────────────────────────────────────
# Verificar Node.js
if ! command -v node &>/dev/null; then
  err "Node.js no está instalado."
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | sed 's/v//')
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  err "Se requiere Node.js >= 20. Versión actual: $(node -v)"
fi

log "Node.js $(node -v)"

# Verificar archivo .env
if [[ ! -f "${APP_DIR}/.env" ]]; then
  warn "No se encontró .env en ${APP_DIR}"
  warn "Copiando desde .env.vm.example..."
  if [[ -f "${APP_DIR}/.env.vm.example" ]]; then
    cp "${APP_DIR}/.env.vm.example" "${APP_DIR}/.env"
    warn "Edita ${APP_DIR}/.env con tus valores antes de continuar."
    warn "Especialmente DATABASE_URL y JWT_SECRET."
  else
    err "No hay .env ni .env.vm.example. Crea un .env manualmente."
  fi
fi

# Verificar frontend compilado
if [[ ! -d "${APP_DIR}/frontend/dist" ]]; then
  warn "Frontend no compilado. Compilando..."
  cd "${APP_DIR}"
  pnpm build || err "Falló la compilación del frontend."
  log "Frontend compilado correctamente."
fi

# ── Iniciar servidor ───────────────────────────────────────────────────────
cd "${APP_DIR}"

log "Iniciando PetCare Server..."
log "  Modo:      ${NODE_ENV}"
log "  Puerto:    ${PORT}"
log "  Host:      ${HOST}"
echo ""

# Cargar .env (soporte para dotenv-style)
export NODE_ENV PORT HOST
set -a
source "${APP_DIR}/.env" 2>/dev/null || true
set +a

# Iniciar con tsx para transpilación en caliente de los .ts handlers
exec node --experimental-strip-types server/index.js
