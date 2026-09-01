#!/usr/bin/env bash
# =============================================================
# scripts/dev-start.sh — Start local dev environment
# Usage: ./scripts/dev-start.sh
# =============================================================

set -e

COMPOSE_FILE="docker-compose.dev.yml"
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;96m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}🚀 SIMPEG Dev Environment${NC}"
echo "─────────────────────────────────────"

docker compose -f $COMPOSE_FILE up -d --no-build --remove-orphans

echo ""
echo -e "${BOLD}${GREEN}✅ Dev environment siap!${NC}"
echo "─────────────────────────────────────"
echo -e "  🌐 App (SPA via nginx) : ${CYAN}http://localhost:8000${NC}"
echo -e "  ⚡ Vite HMR (dev)      : ${CYAN}http://localhost:5173${NC}"
echo -e "  📡 API (langsung)      : ${CYAN}http://localhost:8080/api/v1${NC}"
echo -e "  📖 Swagger             : ${CYAN}http://localhost:8000/swagger/index.html${NC}"
echo -e "  📧 Mailhog             : ${CYAN}http://localhost:8025${NC}"
echo "─────────────────────────────────────"