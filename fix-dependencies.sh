#!/bin/bash

# PetCare App Dependency Fix Script (pnpm)

set -e

echo "🔧 PetCare App - Clean pnpm reinstall"
echo "====================================="
echo ""

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Install it first:"
    echo "   npm install -g pnpm"
    echo "   or"
    echo "   curl -fsSL https://get.pnpm.io/install.sh | sh -"
    exit 1
fi

echo "Using package manager: pnpm $(pnpm --version) ✅"
echo ""

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Clean all node_modules and lockfiles
echo "🧹 Cleaning up old npm artifacts..."
for dir in "$ROOT_DIR" "$ROOT_DIR/frontend" "$ROOT_DIR/netlify/functions"; do
    if [ -d "$dir/node_modules" ]; then
        echo "   Removing node_modules in $dir"
        rm -rf "$dir/node_modules"
    fi
    if [ -f "$dir/package-lock.json" ]; then
        echo "   Removing package-lock.json in $dir"
        rm -f "$dir/package-lock.json"
    fi
done

# Install all dependencies via pnpm workspace
echo ""
echo "📦 Installing all dependencies via pnpm..."
cd "$ROOT_DIR"
pnpm install

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: pnpm dev          (starts Netlify Dev)"
echo "2. Run: pnpm build        (to build for production)"
echo ""
