#!/bin/bash
# ============================================================================
# PetCare App — Script de Instalación en VM (Ubuntu 24.04+)
# ============================================================================
# Uso:
#   sudo bash scripts/setup-vm.sh
#
# Lo que hace:
#   1. Instala Node.js 20, pnpm, PostgreSQL 16, Apache
#   2. Configura la base de datos (esquema + seed)
#   3. Instala dependencias del proyecto
#   4. Compila el frontend
#   5. Configura Apache como reverse proxy
#   6. Configura systemd para el servidor Express
#   7. Inicia todo
# ============================================================================

set -euo pipefail

# ── Configuración ──────────────────────────────────────────────────────────
APP_DIR="/opt/petcare"
APP_USER="petcare"
APP_GROUP="petcare"
DB_NAME="petcare_db"
DB_USER="petcare"
DB_PASSWORD="${POSTGRES_PASSWORD:-changeme_in_prod}"
NODE_PORT=3000
NODE_VERSION=20

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Verificar ejecución como root ──────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Este script debe ejecutarse como root (sudo)."
fi

# ── 1. Instalar dependencias del sistema ────────────────────────────────────
log "Actualizando repositorios..."
apt-get update -qq

log "Instalando dependencias del sistema..."
apt-get install -y -qq \
    curl \
    gnupg \
    ca-certificates \
    git \
    build-essential \
    python3 \
    postgresql \
    postgresql-contrib \
    apache2 \
    libapache2-mod-proxy-html

# ── 2. Instalar Node.js 20 ─────────────────────────────────────────────────
log "Instalando Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
fi

log "Node.js $(node -v) instalado."

# ── 3. Instalar pnpm ───────────────────────────────────────────────────────
log "Instalando pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@10.14.0
fi
log "pnpm $(pnpm -v) instalado."

# ── 4. Crear usuario del sistema ───────────────────────────────────────────
log "Creando usuario '${APP_USER}'..."
if ! id -u "${APP_USER}" &>/dev/null; then
  useradd --system --user-group --home-dir "${APP_DIR}" --shell /bin/bash "${APP_USER}"
fi

# ── 5. Copiar aplicación ───────────────────────────────────────────────────
log "Copiando aplicación a ${APP_DIR}..."
mkdir -p "${APP_DIR}"
# Si estamos en el directorio del proyecto:
if [[ -f package.json ]] && [[ -d frontend ]] && [[ -d netlify ]]; then
  # Copiar todo excepto node_modules, .git, etc.
  rsync -a \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='*.local' \
    --exclude='dist' \
    ./ "${APP_DIR}/"
  log "Archivos copiados desde $(pwd)."
else
  # Si no estamos en el directorio del proyecto, clonar desde GitHub
  # (ajustar URL según corresponda)
  warn "No se detectó el proyecto en el directorio actual."
  warn "Clonando desde repositorio..."
  # git clone https://github.com/tu-org/petcare-app.git "${APP_DIR}"
  err "Clona el repositorio manualmente en ${APP_DIR} y vuelve a ejecutar."
fi

# ── 6. Configurar base de datos ────────────────────────────────────────────
log "Configurando PostgreSQL..."
# Iniciar PostgreSQL si no está corriendo
if ! systemctl is-active --quiet postgresql; then
  systemctl start postgresql
fi

# Crear usuario y base de datos (si no existen)
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\" | grep -q 1 || psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\""
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\""

# Aplicar esquema y seed data
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f "${APP_DIR}/schema.sql"
log "Schema aplicado."

if [[ -f "${APP_DIR}/seed-database-fixed.sql" ]]; then
  PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f "${APP_DIR}/seed-database-fixed.sql"
  log "Seed data insertada."
fi

# ── 7. Configurar variables de entorno ─────────────────────────────────────
log "Configurando variables de entorno..."
if [[ ! -f "${APP_DIR}/.env" ]]; then
  cat > "${APP_DIR}/.env" <<EOF
# Generado por setup-vm.sh — editar según necesidad
NODE_ENV=production
PORT=${NODE_PORT}
HOST=127.0.0.1
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost
CORS_ORIGIN=*
EOF
  log ".env creado con JWT_SECRET generado."
fi

# Copiar .env al entorno de functions (Netlify legacy)
mkdir -p "${APP_DIR}/netlify/functions"
cp "${APP_DIR}/.env" "${APP_DIR}/netlify/functions/.env" 2>/dev/null || true

# Configurar frontend .env para build
cat > "${APP_DIR}/frontend/.env" <<EOF
VITE_API_URL=/api
EOF

# ── 8. Instalar dependencias y compilar ────────────────────────────────────
log "Instalando dependencias del proyecto..."
cd "${APP_DIR}"
pnpm install
cd frontend
pnpm install
cd ..

log "Compilando frontend..."
cd frontend
pnpm build
cd ..

# ── 9. Configurar Apache ───────────────────────────────────────────────────
log "Configurando Apache..."
# Copiar VirtualHost
cp apache/petcare.conf /etc/apache2/sites-available/petcare.conf

# Habilitar módulos necesarios
a2enmod proxy proxy_http rewrite headers proxy_html
a2ensite petcare
a2dissite 000-default

# Verificar config
apache2ctl configtest || warn "Apache config test falló — revisar manualmente."

systemctl reload apache2
log "Apache configurado y recargado."

# ── 10. Configurar systemd ─────────────────────────────────────────────────
log "Configurando servicio systemd..."
cat > /etc/systemd/system/petcare.service <<EOF
[Unit]
Description=PetCare App — Express Server
Documentation=https://github.com/tu-org/petcare-app
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(which node) server/index.js
Restart=always
RestartSec=10
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable petcare.service
systemctl start petcare.service

log "Servicio petcare iniciado."

# ── 11. Verificar ──────────────────────────────────────────────────────────
sleep 3
if systemctl is-active --quiet petcare; then
  log "PetCare App corriendo correctamente."
  log ""
  log "═══ RESUMEN ════════════════════════════════════"
  log "  Aplicación:  http://localhost"
  log "  API:         http://localhost/api"
  log "  Health:      http://localhost/health"
  log "  Base datos:  postgresql://localhost:5432/${DB_NAME}"
  log "  Servicio:    systemctl status petcare"
  log "  Logs:        journalctl -u petcare -f"
  log "════════════════════════════════════════════════"
else
  err "El servicio petcare no inició. Revisar: journalctl -u petcare -n 50"
fi
