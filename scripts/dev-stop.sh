#!/usr/bin/env bash
# =============================================================
# scripts/dev-stop.sh — Stop local dev environment
# Usage: ./scripts/dev-stop.sh
# =============================================================

set -e

COMPOSE_FILE="docker-compose.dev.yml"
GREEN="\033[0;32m"
NC="\033[0m"

echo -e "${GREEN}⏹  Stopping SIMPEG dev containers...${NC}"
docker compose -f $COMPOSE_FILE down
echo -e "${GREEN}✅ Containers dihentikan. Data tetap tersimpan di volumes.${NC}"