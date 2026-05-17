#!/bin/sh
# NOTE: If you want to run this directly, first do: chmod +x setup.sh
set -e

log() {
  printf "%s\n" "$*"
}

fail() {
  printf "%s\n" "$*" >&2
  exit 1
}

require_node() {
  node_version=$(node -v 2>/dev/null || true)
  if [ -z "$node_version" ]; then
    fail "Node.js 20.x is required (>=20 <21). Please install Node 20 and retry."
  fi

  case "$node_version" in
    v*) version=${node_version#v} ;;
    *) version=$node_version ;;
  esac

  major=${version%%.*}

  case "$major" in
    ''|*[!0-9]*)
      fail "Unable to parse Node.js version: $node_version"
      ;;
  esac

  if [ "$major" -lt 20 ] || [ "$major" -ge 21 ]; then
    fail "Node.js 20.x is required (>=20 <21). Detected $node_version."
  fi
}

require_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    fail "pnpm is not installed. Install it with: npm install -g pnpm"
  fi
}

copy_if_missing() {
  src=$1
  dest=$2

  if [ ! -f "$dest" ] && [ -f "$src" ]; then
    cp "$src" "$dest"
    log "Created $dest from $src"
  fi
}

ensure_jwt_secret() {
  if [ ! -f ".env" ]; then
    return 0
  fi

  jwt_line=$(awk -F= '/^JWT_SECRET=/{print $0; exit}' .env)
  if [ -z "$jwt_line" ]; then
    return 0
  fi

  jwt_value=${jwt_line#JWT_SECRET=}

  case "$jwt_value" in
    ""|*replace_with_strong_random_secret*)
      if ! command -v openssl >/dev/null 2>&1; then
        fail "openssl not found. Please set JWT_SECRET manually in .env."
      fi

      new_secret=$(openssl rand -hex 32)
      tmp=".env.tmp.$$"

      awk -v secret="$new_secret" '
        BEGIN { replaced=0 }
        /^JWT_SECRET=/ { print "JWT_SECRET=" secret; replaced=1; next }
        { print }
        END { if (replaced==0) print "JWT_SECRET=" secret }
      ' .env > "$tmp"

      mv "$tmp" .env
      log "Generated JWT_SECRET in .env"
      ;;
  esac
}

require_node
require_pnpm

copy_if_missing ".env.example" ".env"
copy_if_missing "frontend/.env.example" "frontend/.env"
copy_if_missing "netlify/functions/.env.example" "netlify/functions/.env"

ensure_jwt_secret

# Install all dependencies via pnpm workspace
log "📦 Installing all dependencies via pnpm..."
pnpm install

cat <<'EOF'
Setup complete.

Next steps:
- If you need a real database, edit DATABASE_URL in .env.
- Start development: pnpm dev
EOF
