#!/usr/bin/env bash
# =============================================================
# scripts/prod-deploy.sh — Deploy/update production di VPS
# Usage: ./scripts/prod-deploy.sh
# Jalankan di VPS setelah git pull
# =============================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;96m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}🚀 SIMPEG Production Deploy (Go)${NC}"
echo "─────────────────────────────────────"

if [ ! -f ".env" ]; then
    echo "❌ .env tidak ditemukan! Salin .env.example ke .env dan isi semua nilai."
    exit 1
fi

echo "🟢 Building frontend SPA..."
(cd simpeg-go/frontend && npm install --legacy-peer-deps && npm run build)

echo "🔨 Building Go image..."
docker compose build --no-cache app

echo "🔄 Restarting services..."
docker compose up -d --force-recreate app
sleep 5
docker compose up -d --force-recreate nginx

echo ""
echo -e "${BOLD}${GREEN}✅ Deploy selesai!${NC}"
echo "─────────────────────────────────────"
echo -e "  🌐 App    : ${CYAN}https://simpeg.uml.ac.id${NC}"
echo -e "  📊 Status : $(docker compose ps --format 'table {{.Name}}\t{{.Status}}')"
echo "─────────────────────────────────────"