# PetCare App — Guía de Despliegue en Docker

## Arquitectura del Despliegue

```
┌──────────────────────────────────────────────────────┐
│                   docker-compose.yml                  │
│                                                       │
│  ┌─────────────────┐         ┌────────────────────┐  │
│  │  postgres:16-alp │         │  app (node:20-slim) │  │
│  │                 │         │                    │  │
│  │  Puerto: 5432   │◄────────│  Puerto: 3000      │  │
│  │  Volumen:       │  red    │                    │  │
│  │  postgres_data  │         │  Express server    │  │
│  │                 │         │  + handlers .ts    │  │
│  │  Init scripts:  │         │  + frontend estático│  │
│  │  01-schema.sql  │         │                    │  │
│  │  02-seed.sql    │         │  Depende de:       │  │
│  └─────────────────┘         │  postgres (healthy) │  │
│                               └────────────────────┘  │
│                        │                              │
│              petcare-network (bridge)                  │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
                  Cliente → http://localhost:3000
```

Docker Compose orquesta dos contenedores en una red interna aislada:
- **postgres**: La base de datos PostgreSQL con el esquema y los datos de prueba aplicados automáticamente al iniciar.
- **app**: El servidor Express con el frontend compilado, que expone el puerto 3000 al host.

---

## Requisitos

- **Docker Engine**: 24.0 o superior
- **Docker Compose**: v2.24 o superior (incluido en Docker Desktop y Docker Engine)
- **RAM**: mínimo 1 GB disponible para los contenedores
- **Disco**: mínimo 2 GB libres

### Verificar requisitos

```bash
docker --version
# Docker version 24.0.7, build afdd53b

docker compose version
# Docker Compose version v2.24.2
```

---

## Estructura de Archivos para Docker

```
petcare-app-deploy/
├── Dockerfile              ← Definición de la imagen multi-etapa
├── docker-compose.yml      ← Orquestación de servicios
├── .dockerignore           ← Archivos excluidos del contexto Docker
├── schema.sql              ← Esquema de base de datos (init)
├── seed-database-fixed.sql ← Datos de prueba (init)
├── server/
│   ├── package.json
│   └── index.js            ← Express server
├── frontend/
│   └── package.json
└── netlify/functions/      ← Handlers reutilizados
```

---

## Paso 1: Build de la Imagen Docker

### 1.1 Entender el Dockerfile multi-etapa — instrucción por instrucción

El `Dockerfile` está dividido en dos etapas para minimizar el tamaño de la imagen final.
Cada punto a continuación muestra la **instrucción real del Dockerfile** y lo que hace.

**Etapa 1 — `builder`** (pesada, contiene herramientas de compilación):

```dockerfile
# 1. Imagen base con Node.js 20
FROM node:20-slim AS builder
```

```dockerfile
# 2. Instalar pnpm vía corepack (gestor de paquetes oficial)
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
```

```dockerfile
# 3. Instalar herramientas del sistema necesarias para compilar bcrypt
#    (bcrypt necesita python3 + make + g++ para su bindings nativos)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
```

```dockerfile
# 4. Copiar SOLO los archivos de manifiesto primero.
#    Estrategia de cache: mientras no cambien package.json / pnpm-lock.yaml,
#    Docker reusa la capa de 'pnpm install' sin re-ejecutarla.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/
COPY netlify/functions/package.json ./netlify/functions/
COPY server/package.json ./server/
```

```dockerfile
# 5. Instalar todas las dependencias del workspace (root + frontend + functions + server)
RUN pnpm install --frozen-lockfile
```

```dockerfile
# 6. Copiar el código fuente completo (después de instalar deps para mantener cache)
COPY . .
```

```dockerfile
# 7. Compilar el frontend con Vite → genera frontend/dist/
RUN pnpm build
```

**Etapa 2 — `runner`** (liviana, solo lo mínimo para ejecutar):

```dockerfile
# 1. Imagen base limpia (sin herramientas de build)
FROM node:20-slim AS runner
```

```dockerfile
# 2. Instalar exclusivamente las dependencias de runtime para bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
```

```dockerfile
# 3. Copiar node_modules desde builder (ya instalado y optimizado)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
```

```dockerfile
# 4. Copiar solo lo necesario para correr la app:
#    - server/        → Express wrapper
#    - netlify/functions/ → handlers .ts
#    - frontend/dist/ → estáticos compilados
#    - schema.sql     → referencia para debug
COPY server ./server
COPY netlify/functions ./netlify/functions
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY schema.sql ./schema.sql
COPY seed-database-fixed.sql ./seed-database-fixed.sql
```

```dockerfile
# 5. Puerto que expone el servidor Express
EXPOSE 3000
```

```dockerfile
# 6. Health check cada 30s para que docker-compose sepa cuándo está listo
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
```

```dockerfile
# 7. Comando de inicio: node con soporte experimental para TypeScript nativo
#    Esto permite importar los .ts de netlify/functions/ sin necesidad de tsx ni build previo
CMD ["node", "--experimental-strip-types", "server/index.js"]
```

### 1.2 Construir la imagen

```bash
# Desde el directorio raíz del proyecto
cd /ruta/a/petcare-app-deploy

# Build de la imagen
docker compose build
```

Flags útiles:

```bash
# Sin caché (build limpio)
docker compose build --no-cache

# Ver el detalle de cada capa
docker compose build --progress=plain
```

### 1.3 Verificar que la imagen se creó

```bash
docker images petcare-app-app
# O usando el nombre del proyecto (directorio):
docker images | grep petcare
```

**Salida esperada**:
```
petcare-app-deploy-app    latest    a1b2c3d4e5f6    2 minutos ago    447MB
```

El tamaño (~450 MB) es razonable para una imagen Node.js con PostgreSQL client y bcrypt compilado.

---

## Paso 2: Configurar Variables de Entorno

### 2.1 Crear el archivo .env — variable por variable

Docker Compose lee automáticamente un archivo `.env` en el mismo directorio que `docker-compose.yml` y sustituye las variables `${VAR}` en el YAML. Necesitamos dos variables.

**Paso 1: Ir al directorio del proyecto**

```bash
cd /ruta/a/petcare-app-deploy
```

**Paso 2: Generar una contraseña segura para PostgreSQL**

```bash
# Generar contraseña aleatoria de 32 caracteres
openssl rand -base64 24
# Ejemplo de salida: 5X8qK3mP9oL2nR7vJ4wB1yT6uE0cF
```

**Paso 3: Generar un secreto JWT seguro**

```bash
# El JWT_SECRET firma los tokens de autenticación. Debe ser fuerte.
openssl rand -hex 32
# Ejemplo de salida: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

**Paso 4: Crear el archivo .env con los valores generados**

```bash
cat > .env << 'EOF'
# ── PostgreSQL ──────────────────────────────────────
# La contraseña del usuario 'petcare' en la base de datos
# Debe coincidir con POSTGRES_PASSWORD en el servicio postgres
POSTGRES_PASSWORD=<PON_AQUI_LA_CONTRASENA_GENERADA>

# ── JWT ─────────────────────────────────────────────
# Secreto para firmar los tokens JWT (mínimo 32 caracteres, usar aleatorio)
JWT_SECRET=<PON_AQUI_EL_SECRETO_GENERADO>
EOF
```

Reemplaza `<PON_AQUI_LA_CONTRASENA_GENERADA>` y `<PON_AQUI_EL_SECRETO_GENERADO>` con los valores de los pasos 2 y 3.

**Paso 5: Verificar que el archivo .env tiene los valores correctos**

```bash
cat .env
# Debe mostrar algo como:
# POSTGRES_PASSWORD=5X8qK3mP9oL2nR7vJ4wB1yT6uE0cF
# JWT_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

**¿Por qué estas variables están en `.env` y no en `docker-compose.yml`?**

Porque contienen secretos. El archivo `.env` está en `.gitignore` y nunca se sube al repositorio. `docker-compose.yml` referencia `${POSTGRES_PASSWORD}` y `${JWT_SECRET}`, que Docker Compose resuelve automáticamente desde el `.env` del directorio.

Si no existe `.env`, Docker Compose usa los valores por defecto definidos en el YAML con el operador `:-`:
- `${POSTGRES_PASSWORD:-changeme_in_prod}` → usa `changeme_in_prod` si la variable no está definida
- `${JWT_SECRET:-replace_with_strong_random_secret}` → el default no es seguro para producción

### 2.2 Entender cómo se pasan las variables

En `docker-compose.yml`:

```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: petcare_db
      POSTGRES_USER: petcare
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme_in_prod}

  app:
    environment:
      DATABASE_URL: postgresql://petcare:${POSTGRES_PASSWORD:-changeme_in_prod}@postgres:5432/petcare_db
      JWT_SECRET: ${JWT_SECRET:-replace_with_strong_random_secret}
```

Docker Compose lee el archivo `.env` automáticamente y reemplaza `${VAR}` con los valores.

---

## Paso 3: Iniciar los Contenedores

### 3.1 Iniciar todos los servicios

```bash
docker compose up -d
```

La bandera `-d` (detach) ejecuta los contenedores en segundo plano.

### 3.2 Ver el progreso del inicio

```bash
docker compose logs -f
```

**Salida esperada durante el inicio**:

```
[+] Running 3/3
 ✔ Network petcare-network  Created
 ✔ Container petcare-postgres  Started
 ✔ Container petcare-app       Started
```

```
petcare-postgres  | PostgreSQL init process complete; ready for start up.
petcare-postgres  | 2026-05-16 12:00:00.000 UTC [1] LOG:  database system is ready to accept connections
petcare-app      | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
petcare-app      |   PetCare Server
petcare-app      |   Environment: production
petcare-app      |   Listening:   http://0.0.0.0:3000
petcare-app      |   API:         http://0.0.0.0:3000/api
petcare-app      |   Health:      http://0.0.0.0:3000/health
petcare-app      | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.3 Verificar el estado de los contenedores

```bash
docker compose ps
```

**Salida esperada**:
```
NAME                 SERVICE              STATUS              PORTS
petcare-postgres     postgres             running (healthy)   0.0.0.0:5432->5432/tcp
petcare-app          app                  running (healthy)   0.0.0.0:3000->3000/tcp
```

---

## Paso 4: Entender la Inicialización de la Base de Datos

### 4.1 Cómo funciona el init automático

El servicio `postgres` monta dos archivos SQL en `/docker-entrypoint-initdb.d/`:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
  - ./seed-database-fixed.sql:/docker-entrypoint-initdb.d/02-seed.sql
```

Cuando el contenedor de PostgreSQL arranca por **primera vez** (no existe el volumen `postgres_data`), ejecuta todos los archivos `.sql` y `.sh` en `/docker-entrypoint-initdb.d/` en orden alfabético:

1. `01-schema.sql` → Crea las tablas (`users`, `pets`, `appointments`, etc.)
2. `02-seed.sql` → Inserta los datos de prueba (3 usuarios, mascotas, citas, etc.)

En inicios subsecuentes, el volumen persistente ya existe y los scripts **no se vuelven a ejecutar**.

### 4.2 Forzar la reinicialización

Si necesitas reiniciar desde cero (borrar todos los datos y volver a aplicar schema + seed):

```bash
# Baja los contenedores y borra los volúmenes
docker compose down -v

# Vuelve a iniciar (ejecutará los scripts init de nuevo)
docker compose up -d
```

**Advertencia**: `docker compose down -v` borra **TODOS** los datos de la base de datos. Es irreversible.

---

## Paso 5: Verificar que Todo Funciona

### 5.1 Health check del contenedor

Cada contenedor tiene un health check configurado:

```bash
# Ver salud de PostgreSQL
docker inspect petcare-postgres --format='{{json .State.Health.Status}}'
# "healthy"

# Ver salud de la app
docker inspect petcare-app --format='{{json .State.Health.Status}}'
# "healthy"
```

### 5.2 Health check de la aplicación

```bash
curl http://localhost:3000/health
```

**Respuesta esperada**:
```json
{"status":"ok","timestamp":"2026-05-16T12:00:00.000Z"}
```

### 5.3 Probar autenticación (login)

```bash
curl -s http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}'
```

**Respuesta esperada**: un objeto JSON con:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "email": "admin@petcare.com",
      "userType": "administrator",
      "fullName": "Admin User",
      ...
    }
  }
}
```

Si ves esto, la cadena completa funciona: Express → handler auth.ts → PostgreSQL.

### 5.4 Probar consulta autenticada

```bash
# Obtener token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Listar mascotas
curl -s http://localhost:3000/api/pets \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool | head -20
```

**Respuesta esperada**: un array con las mascotas cargadas en el seed.

### 5.5 Verificar la base de datos directamente

```bash
# Conectarse a PostgreSQL dentro del contenedor
docker exec -it petcare-postgres psql -U petcare -d petcare_db -c "\dt"

# Contar usuarios
docker exec -it petcare-postgres psql -U petcare -d petcare_db -c "SELECT count(*) FROM users;"
# Debe devolver: 3

# Ver conexiones activas desde la app
docker exec -it petcare-postgres psql -U petcare -d petcare_db -c "SELECT count(*) FROM pg_stat_activity WHERE application_name != 'psql';"
```

### 5.6 Verificar los logs de cada contenedor

```bash
# Logs del servidor Express
docker compose logs app

# Logs de PostgreSQL
docker compose logs postgres

# Logs en tiempo real
docker compose logs -f app
```

### 5.7 Ver recursos de los contenedores

```bash
docker stats --no-stream petcare-app petcare-postgres
```

**Salida esperada** (valores aproximados):
```
NAME                CPU %     MEM USAGE / LIMIT     MEM %
petcare-app         0.15%     78.5MiB / 1.944GiB   3.94%
petcare-postgres    0.08%     42.3MiB / 1.944GiB   2.13%
```

---

## Paso 6: Comandos de Gestión

### Iniciar y detener

```bash
# Iniciar todos los servicios
docker compose up -d

# Detener todos los servicios (sin borrar datos)
docker compose down

# Detener y borrar volúmenes (borra TODOS los datos)
docker compose down -v

# Detener y borrar todo (volúmenes + imágenes)
docker compose down --rmi all -v
```

### Logs

```bash
# Logs de todos los servicios
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f app
docker compose logs -f postgres

# Últimas N líneas
docker compose logs --tail=50 app
```

### Ejecutar comandos dentro de un contenedor

```bash
# Shell interactivo en la app
docker exec -it petcare-app sh

# Shell interactivo en PostgreSQL
docker exec -it petcare-postgres sh

# Consulta SQL directa
docker exec -it petcare-postgres psql -U petcare -d petcare_db -c "SELECT * FROM users;"

# Ver archivos dentro del contenedor app
docker exec petcare-app ls -la /app/frontend/dist/
```

### Reconstruir y reiniciar

```bash
# Después de cambios en el código
docker compose build app
docker compose up -d

# O en un solo comando (build + recreate si cambió)
docker compose up -d --build
```

---

## Paso 7: Prueba de Integración Completa

Este script prueba toda la cadena: APACHE → EXPRESS → POSTGRESQL

```bash
#!/bin/bash
# test-petcare-docker.sh

echo "=== PetCare Docker — Prueba de Integración ==="
echo ""

# 1. Verificar que los contenedores están corriendo
echo "1. Estado de contenedores..."
docker compose ps --status running | grep -q "petcare-app" || { echo "✗ app no está corriendo"; exit 1; }
docker compose ps --status running | grep -q "petcare-postgres" || { echo "✗ postgres no está corriendo"; exit 1; }
echo "✓ Contenedores corriendo"

# 2. Health check
echo "2. Health check..."
HEALTH=$(curl -s http://localhost:3000/health)
echo "$HEALTH" | grep -q '"status":"ok"' || { echo "✗ Health check falló"; exit 1; }
echo "✓ Health check: ok"

# 3. Login
echo "3. Login como admin..."
LOGIN=$(curl -s http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}')
echo "$LOGIN" | grep -q '"success":true' || { echo "✗ Login falló"; exit 1; }
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "✓ Login exitoso (token obtenido)"

# 4. Listar mascotas
echo "4. Listar mascotas..."
PETS=$(curl -s http://localhost:3000/api/pets \
  -H "Authorization: Bearer $TOKEN")
PET_COUNT=$(echo "$PETS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('data', []))))" 2>/dev/null || echo "0")
echo "✓ Mascotas encontradas: $PET_COUNT"

# 5. Verificar conexión directa a DB
echo "5. Verificar PostgreSQL..."
USER_COUNT=$(docker exec petcare-postgres psql -U petcare -d petcare_db -t -A -c "SELECT count(*) FROM users;")
echo "✓ Usuarios en DB: $USER_COUNT"

echo ""
echo "=== PRUEBA COMPLETA EXITOSA ==="
```

Guarda esto como `scripts/test-docker.sh`, hazlo ejecutable (`chmod +x`) y ejecútalo:

```bash
bash scripts/test-docker.sh
```

**Salida esperada**:
```
=== PetCare Docker — Prueba de Integración ===

1. Estado de contenedores...
✓ Contenedores corriendo
2. Health check...
✓ Health check: ok
3. Login como admin...
✓ Login exitoso (token obtenido)
4. Listar mascotas...
✓ Mascotas encontradas: 5
5. Verificar PostgreSQL...
✓ Usuarios en DB: 3

=== PRUEBA COMPLETA EXITOSA ===
```

---

## Paso 8: Mantenimiento

### Actualizar la aplicación

```bash
cd /ruta/a/petcare-app-deploy

# Si viene de Git
git pull

# Reconstruir la imagen con los cambios
docker compose build app

# Reiniciar el servicio
docker compose up -d
```

### Hacer backup de la base de datos

```bash
# Backup a un archivo
docker exec petcare-postgres pg_dump -U petcare petcare_db > backup-$(date +%Y%m%d).sql

# Restaurar desde backup
cat backup-20260516.sql | docker exec -i petcare-postgres psql -U petcare petcare_db
```

### Limpiar imágenes y contenedores viejos

```bash
# Eliminar imágenes no usadas
docker image prune -a

# Eliminar contenedores detenidos
docker container prune

# Limpiar todo el sistema Docker
docker system prune -a --volumes
```

---

## Paso 9: Solución de Problemas

### El contenedor app no arranca

```bash
# Ver logs
docker compose logs app

# Causas comunes:
# 1. PostgreSQL no está listo aún — el health check espera hasta 30s
# 2. Error de conexión a DB — revisar DATABASE_URL en docker-compose.yml
# 3. Error de compilación de bcrypt — revisar que python3/make/g++ estén en el builder
```

### Error de conexión a PostgreSQL

```bash
# Verificar que postgres esté healthy
docker inspect petcare-postgres --format='{{.State.Health.Status}}'

# Conectarse manualmente
docker exec -it petcare-postgres psql -U petcare -d petcare_db -c "SELECT 1;"
```

### Error "port is already allocated"

```bash
# El puerto 3000 o 5432 ya está en uso en el host
# Cambiar el puerto en docker-compose.yml:
# ports:
#   - "3001:3000"   # cambia host:3000 a host:3001

# O detener el proceso que ocupa el puerto
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Los datos de seed no se cargaron

```bash
# Verificar que los archivos SQL están montados
docker exec petcare-postgres ls -la /docker-entrypoint-initdb.d/

# Si el volumen ya existía, los scripts no se ejecutan
# Solución: forzar reinicialización
docker compose down -v
docker compose up -d
```

### La app corre pero la página web está en blanco

```bash
# Verificar que el frontend se compiló correctamente
docker exec petcare-app ls -la /app/frontend/dist/
# Debe contener: index.html y assets/

# Verificar el HTML que devuelve
curl -s http://localhost:3000/ | head -5
# Debe contener: <div id="root"></div>
```

---

## Referencia Rápida

| Comando | Descripción |
|---------|-------------|
| `docker compose up -d` | Iniciar servicios en segundo plano |
| `docker compose down` | Detener servicios |
| `docker compose down -v` | Detener y borrar datos de DB |
| `docker compose logs -f app` | Ver logs del servidor en tiempo real |
| `docker compose ps` | Ver estado de los contenedores |
| `docker compose build` | Reconstruir imágenes |
| `docker compose up -d --build` | Reconstruir y reiniciar |
| `docker exec -it petcare-app sh` | Shell dentro del contenedor app |
| `docker exec -it petcare-postgres psql -U petcare -d petcare_db` | SQL shell en PostgreSQL |
| `docker inspect petcare-app --format='{{.State.Health.Status}}'` | Ver health status |
