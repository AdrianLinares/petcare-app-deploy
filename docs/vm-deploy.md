# PetCare App — Guía de Despliegue en Máquina Virtual

## Arquitectura del Despliegue

```
┌─────────────── Internet ─────────────────┐
                    │
              ┌─────┴─────┐
              │  Apache    │  puerto 80
              │  (proxy)   │
              └─────┬─────┘
                    │
          ┌─────────┴──────────┐
          │                    │
   ┌──────┴──────┐    ┌───────┴───────┐
   │  /api/*     │    │  /*           │
   │  proxy_pass │    │  estáticos    │
   │  → :3000    │    │  (frontend)   │
   └──────┬──────┘    └───────┬───────┘
          │                   │
   ┌──────┴──────┐    ┌──────┴───────┐
   │  Express    │    │  index.html  │
   │  :3000      │    │  SPA fallback│
   └──────┬──────┘    └──────────────┘
          │
   ┌──────┴──────┐
   │  PostgreSQL │
   │  :5432      │
   └─────────────┘
```

Apache actúa como **proxy inverso**: recibe todas las peticiones en el puerto 80, sirve los archivos estáticos del frontend directamente y redirige las llamadas `/api/*` al servidor Node.js que corre en el puerto 3000. Si una ruta del frontend no corresponde a un archivo físico (SPA routing), Apache la redirige a `index.html`.

---

## Requisitos del Sistema

- **Sistema Operativo**: Ubuntu 24.04 LTS o superior
- **RAM**: mínimo 1 GB (2 GB recomendado)
- **Disco**: mínimo 5 GB libres
- **Arquitectura**: x86_64 (amd64)
- **Permisos**: acceso `sudo` completo
- **Red**: puerto 80 (HTTP) accesible

---

## Paso 1: Preparar el Sistema Operativo

### 1.1 Actualizar paquetes del sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Verificar la versión de Ubuntu

```bash
lsb_release -a
```

Debe mostrar `Ubuntu 24.04 LTS` o superior. Si estás en una versión inferior, actualiza primero:

```bash
sudo do-release-upgrade
```

### 1.3 Instalar herramientas básicas

```bash
sudo apt install -y curl gnupg ca-certificates git build-essential python3
```

---

## Paso 2: Instalar Node.js

### 2.1 Agregar el repositorio de NodeSource

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
```

### 2.2 Instalar Node.js

```bash
sudo apt install -y nodejs
```

### 2.3 Verificar la instalación

```bash
node -v
# Debe mostrar: v20.x.x

npm -v
# Debe mostrar: 10.x.x
```

---

## Paso 3: Instalar pnpm

### 3.1 Instalar pnpm globalmente

```bash
sudo npm install -g pnpm@10.14.0
```

### 3.2 Verificar la instalación

```bash
pnpm -v
# Debe mostrar: 10.14.0
```

---

## Paso 4: Clonar o Copiar el Proyecto

### 4.1 Crear el directorio de la aplicación

```bash
sudo mkdir -p /opt/petcare
sudo chown $(whoami):$(whoami) /opt/petcare
```

### 4.2 Copiar el proyecto

Si estás trabajando desde la copia local:

```bash
rsync -a --exclude='node_modules' --exclude='.git' --exclude='.env' /ruta/a/petcare-app-deploy/ /opt/petcare/
```

O si el proyecto está en un repositorio Git:

```bash
git clone <url-del-repositorio> /opt/petcare
cd /opt/petcare
```

### 4.3 Verificar la estructura

```bash
ls /opt/petcare/
# Debe mostrar: server/  frontend/  netlify/  scripts/  apache/  schema.sql  package.json  pnpm-workspace.yaml  ...
```

---

## Paso 5: Configurar PostgreSQL

### 5.1 Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 5.2 Verificar que el servicio esté corriendo

```bash
sudo systemctl status postgresql
# Debe mostrar: active (running)

# Si no está corriendo:
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 5.3 Crear la base de datos y el usuario

```bash
# Crear usuario petcare
sudo -u postgres psql -c "CREATE USER petcare WITH PASSWORD 'changeme_in_prod';"

# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE petcare_db OWNER petcare;"

# Otorgar privilegios
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE petcare_db TO petcare;"
```

### 5.4 Aplicar el esquema de la base de datos

```bash
cd /opt/petcare
PGPASSWORD='changeme_in_prod' psql -h localhost -U petcare -d petcare_db -f schema.sql
```

### 5.5 Cargar datos de prueba (opcional)

```bash
PGPASSWORD='changeme_in_prod' psql -h localhost -U petcare -d petcare_db -f seed-database-fixed.sql
```

### 5.6 Verificar la base de datos

```bash
# Verificar que las tablas se crearon
PGPASSWORD='changeme_in_prod' psql -h localhost -U petcare -d petcare_db -c "\dt"

# Debe mostrar:
#               Listado de relaciones
#  Esquema |      Nombre      | Tipo  |  Dueño
#  --------+------------------+-------+---------
#  public  | appointments     | tabla | petcare
#  public  | clinical_records | tabla | petcare
#  public  | medical_records  | tabla | petcare
#  public  | medications      | tabla | petcare
#  public  | pets             | tabla | petcare
#  public  | users            | tabla | petcare
#  public  | vaccinations     | tabla | petcare

# Verificar que los datos de seed se cargaron
PGPASSWORD='changeme_in_prod' psql -h localhost -U petcare -d petcare_db -c "SELECT id, email, user_type FROM users;"

# Debe mostrar 3 usuarios de prueba:
#  owner@petcare.com      | pet_owner
#  vet@petcare.com        | veterinarian
#  admin@petcare.com      | administrator
```

### 5.7 Configurar acceso remoto (opcional)

Si necesitas conectarte a PostgreSQL desde otra máquina (NO recomendado para producción básica):

```bash
# Editar archivo de configuración
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Agregar la red local a pg_hba.conf
echo "host    petcare_db    petcare    0.0.0.0/0    md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## Paso 6: Configurar las Variables de Entorno

### 6.1 Crear el archivo .env desde la plantilla

```bash
cd /opt/petcare
cp .env.vm.example .env
```

### 6.2 Editar las variables

```bash
nano .env
```

Asegúrate de que los valores sean correctos:

```ini
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://petcare:changeme_in_prod@localhost:5432/petcare_db
JWT_SECRET=tu_secreto_generado_aqui
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost
CORS_ORIGIN=*
```

**Importante**: Genera un `JWT_SECRET` seguro:

```bash
openssl rand -hex 32
# Copia el resultado y pégalo en JWT_SECRET en .env
```

### 6.3 Configurar el .env del frontend

```bash
cat > /opt/petcare/frontend/.env << 'EOF'
VITE_API_URL=/api
EOF
```

---

## Paso 7: Instalar Dependencias y Compilar

### 7.1 Instalar todas las dependencias del proyecto

```bash
cd /opt/petcare
pnpm install
```

Esto instala las dependencias de los 4 workspaces definidos en `pnpm-workspace.yaml`: raíz, `frontend/`, `netlify/functions/` y `server/`.

### 7.2 Compilar el frontend

```bash
cd /opt/petcare/frontend
pnpm build
cd ..
```

La compilación genera los archivos estáticos en `frontend/dist/`. La salida incluye:

```
✓ built in X.XXs
frontend/dist/index.html         0.47 kB │ gzip:  0.30 kB
frontend/dist/assets/index-xxx.js  XX  kB │ gzip:  XX  kB
frontend/dist/assets/index-xxx.css XX  kB │ gzip:  XX  kB
```

### 7.3 Verificar que el build existe

```bash
ls -la /opt/petcare/frontend/dist/
# Debe contener: index.html, assets/, favicon.svg
```

---

## Paso 8: Instalar y Configurar Apache

### 8.1 Instalar Apache

```bash
sudo apt install -y apache2
```

### 8.2 Verificar que Apache esté corriendo

```bash
sudo systemctl status apache2
# Debe mostrar: active (running)
```

### 8.3 Habilitar los módulos necesarios

```bash
sudo a2enmod proxy proxy_http rewrite headers
```

**Explicación de cada módulo**:

| Módulo | Función |
|--------|---------|
| `proxy` | Permite a Apache actuar como proxy (intermediario) |
| `proxy_http` | Habilita el proxy para conexiones HTTP (envía tráfico a Node.js) |
| `rewrite` | Permite reglas de reescritura de URLs (SPA fallback) |
| `headers` | Permite modificar headers HTTP (CORS, IP forwarding) |

### 8.4 Copiar la configuración del VirtualHost

```bash
sudo cp /opt/petcare/apache/petcare.conf /etc/apache2/sites-available/petcare.conf
```

### 8.5 Habilitar el sitio y deshabilitar el predeterminado

```bash
sudo a2ensite petcare
sudo a2dissite 000-default
```

### 8.6 Verificar la configuración de Apache

```bash
sudo apache2ctl configtest
# Debe mostrar: Syntax OK
```

### 8.7 Recargar Apache para aplicar cambios

```bash
sudo systemctl reload apache2
```

---

## Paso 9: Configurar el Servicio systemd para el Servidor Node.js

systemd se encarga de que el servidor Express se inicie automáticamente al arrancar la máquina virtual y se reinicie si falla.

### 9.1 Crear el archivo de servicio

```bash
sudo tee /etc/systemd/system/petcare.service > /dev/null << 'EOF'
[Unit]
Description=PetCare App — Express Server
Documentation=https://github.com/tu-org/petcare-app
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=petcare
Group=petcare
WorkingDirectory=/opt/petcare
EnvironmentFile=/opt/petcare/.env
ExecStart=/usr/bin/node /opt/petcare/server/index.js
Restart=always
RestartSec=10
# Hardening de seguridad
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
```

### 9.2 Crear el usuario del sistema para el servicio

```bash
sudo useradd --system --user-group --home-dir /opt/petcare --shell /bin/bash petcare
sudo chown -R petcare:petcare /opt/petcare
```

### 9.3 Recargar systemd y habilitar el servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable petcare.service
```

### 9.4 Iniciar el servicio

```bash
sudo systemctl start petcare.service
```

### 9.5 Verificar que el servicio esté corriendo

```bash
sudo systemctl status petcare.service
# Debe mostrar:
# ● petcare.service - PetCare App — Express Server
#    Loaded: loaded (/etc/systemd/system/petcare.service; enabled; vendor preset: enabled)
#    Active: active (running) since ...
```

---

## Paso 10: Verificar que Todo Funciona

### 10.1 Health check del servidor Express

El servidor Express expone un endpoint `/health` que devuelve el estado:

```bash
curl http://localhost:3000/health
```

**Respuesta esperada**:
```json
{"status":"ok","timestamp":"2026-05-16T12:00:00.000Z"}
```

### 10.2 Verificar el proxy de Apache

Apache debe redirigir correctamente `/api/*` al servidor Node.js:

```bash
curl -s http://localhost/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}'
```

**Respuesta esperada**: un objeto JSON con `success: true` y un `token` JWT. Si ves esto, significa que:
- Apache recibe la petición en el puerto 80
- Apache reenvía a Node.js en el puerto 3000
- Node.js ejecuta el handler auth.ts
- El handler se conecta a PostgreSQL y verifica las credenciales

### 10.3 Verificar el frontend

```bash
curl -s http://localhost/ | head -5
```

**Respuesta esperada**: debe devolver el HTML de la aplicación (contiene `<div id="root">`). Si ves el HTML de `index.html`, Apache está sirviendo los archivos estáticos correctamente.

### 10.4 Probar el listado de mascotas (con autenticación)

Primero obtenemos un token:

```bash
TOKEN=$(curl -s http://localhost/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token obtenido: ${TOKEN:0:20}..."
```

Luego consultamos las mascotas:

```bash
curl -s http://localhost/api/pets \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada**: un array JSON con las mascotas cargadas en el seed. Si ves los datos, la cadena completa funciona: Apache → Node.js → PostgreSQL.

### 10.5 Comprobar logs del sistema

```bash
# Logs del servidor Express
sudo journalctl -u petcare -n 20

# Logs de Apache
sudo tail -20 /var/log/apache2/petcare-access.log
sudo tail -20 /var/log/apache2/petcare-error.log

# Logs de PostgreSQL
sudo journalctl -u postgresql -n 20
```

### 10.6 Verificar puertos en escucha

```bash
sudo ss -tlnp | grep -E '(80|3000|5432)'
```

**Salida esperada**:
```
LISTEN  0  511    0.0.0.0:80       0.0.0.0:*   users:(("apache2",pid=XXX,fd=4),...)
LISTEN  0  511    127.0.0.1:3000   0.0.0.0:*   users:(("node",pid=XXX,fd=XX),...)
LISTEN  0  128    127.0.0.1:5432   0.0.0.0:*   users:(("postgres",pid=XXX,fd=XX),...)
```

Esto confirma:
- **Puerto 80**: Apache escuchando para todo el tráfico web
- **Puerto 3000**: Node.js (Express) escuchando solo en localhost (no accesible desde afuera directamente)
- **Puerto 5432**: PostgreSQL escuchando solo en localhost

---

## Mantenimiento

### Reiniciar la aplicación

```bash
sudo systemctl restart petcare
```

### Ver logs en tiempo real

```bash
sudo journalctl -u petcare -f
```

### Actualizar la aplicación

```bash
cd /opt/petcare
git pull                                          # Si se clonó con git
pnpm install                                      # Actualizar dependencias
cd frontend && pnpm build && cd ..                # Recompilar frontend
sudo systemctl restart petcare                    # Reiniciar servidor
```

### Verificar el uso de recursos

```bash
# Uso de memoria y CPU de cada servicio
ps aux | grep -E '(node|apache|postgres)' | grep -v grep

# Uso de disco
df -h /opt/petcare

# Conexiones activas a PostgreSQL
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Solución de Problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `curl localhost` no responde | Apache no está corriendo | `sudo systemctl restart apache2` |
| `curl localhost:3000/health` falla | Node.js no está corriendo | `sudo systemctl status petcare` y revisar logs |
| Error 503 al llamar `/api/` | Node.js caído o no arrancó | `sudo journalctl -u petcare -n 50` |
| Error 502 Bad Gateway | Node.js arrancó pero Apache no puede conectarse | Verificar que `HOST=127.0.0.1` en `.env` |
| Conexión a DB rechazada | PostgreSQL no está corriendo | `sudo systemctl start postgresql` |
| Login devuelve 401 | Seed data no cargada | Revisar paso 5.5 |
| Frontend en blanco | Build no existe o falló | `ls frontend/dist/` y recompilar |

---

## Resumen de Comandos Útiles

```bash
# Estado de todos los servicios
sudo systemctl status petcare apache2 postgresql

# Logs del servidor Express
sudo journalctl -u petcare -f

# Logs de Apache
sudo tail -f /var/log/apache2/petcare-access.log

# Probar API
curl -s http://localhost/health

# Login de prueba
curl -s http://localhost/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petcare.com","password":"password123"}'

# Probar PostgreSQL
PGPASSWORD='changeme_in_prod' psql -h localhost -U petcare -d petcare_db -c "SELECT count(*) FROM users;"
```
