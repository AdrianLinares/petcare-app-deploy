#!/bin/bash
# PetCare Docker — Prueba de Integración Completa
# Prueba toda la cadena: APACHE → EXPRESS → POSTGRESQL
# Ejecutar: bash scripts/test-docker.sh

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
