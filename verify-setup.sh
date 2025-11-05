#!/bin/bash

# MailAgent Setup Verification Script
# Verifies that all services and configuration are working correctly

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       MailAgent - Setup Verification Script                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_item() {
  local test_name=$1
  local test_command=$2
  local expected=$3

  echo -n "Testing: $test_name ... "

  if eval "$test_command" &> /dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Command: $test_command"
    ((FAILED++))
  fi
}

# Warning function
warn_item() {
  local warning=$1
  echo -e "${YELLOW}⚠️  WARNING${NC}: $warning"
  ((WARNINGS++))
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item ".env file exists" "[ -f .env ]"
test_item "Docker installed" "command -v docker"
test_item "Docker Compose installed" "command -v docker-compose"
test_item "Node.js 18+ installed" "node -e 'const v = parseInt(process.version.slice(1)); process.exit(v >= 18 ? 0 : 1)'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Source the .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

test_item "NODE_ENV set" "[ -n '$NODE_ENV' ]"
test_item "API_PORT set" "[ -n '$API_PORT' ]"
test_item "API_HOST set" "[ -n '$API_HOST' ]"
test_item "DB_HOST set" "[ -n '$DB_HOST' ]"
test_item "DB_PORT set" "[ -n '$DB_PORT' ]"
test_item "DB_USER set" "[ -n '$DB_USER' ]"
test_item "DB_PASSWORD set" "[ -n '$DB_PASSWORD' ]"
test_item "DB_NAME set" "[ -n '$DB_NAME' ]"
test_item "JWT_SECRET set" "[ -n '$JWT_SECRET' ]"
test_item "AES_SECRET_KEY set" "[ -n '$AES_SECRET_KEY' ]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Checking Cryptographic Key Validity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check JWT_SECRET length (should be at least 32 chars)
JWT_LENGTH=${#JWT_SECRET}
echo -n "Checking JWT_SECRET length ($JWT_LENGTH chars) ... "
if [ $JWT_LENGTH -ge 32 ]; then
  echo -e "${GREEN}✅ PASSED${NC} (minimum 32 chars)"
  ((PASSED++))
else
  echo -e "${RED}❌ FAILED${NC} (minimum 32 chars, got $JWT_LENGTH)"
  ((FAILED++))
fi

# Check AES_SECRET_KEY is base64 and can be decoded to 32 bytes
echo -n "Checking AES_SECRET_KEY (base64, 32 bytes) ... "
if echo -n "$AES_SECRET_KEY" | base64 -d 2>/dev/null | wc -c | grep -q "^32$"; then
  echo -e "${GREEN}✅ PASSED${NC}"
  ((PASSED++))
elif command -v openssl &> /dev/null; then
  # Try with openssl
  DECODED_LENGTH=$(echo -n "$AES_SECRET_KEY" | openssl base64 -d 2>/dev/null | wc -c)
  if [ "$DECODED_LENGTH" = "32" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (verified with openssl)"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  WARNING${NC} (decodes to $DECODED_LENGTH bytes, expected 32)"
    ((WARNINGS++))
  fi
else
  warn_item "AES_SECRET_KEY validation skipped (base64 tools not available)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking Docker Service Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "docker-compose.yml exists" "[ -f docker-compose.yml ]"

# Check if services are running
if docker-compose ps &> /dev/null; then
  echo "Docker Compose services status:"
  echo ""
  docker-compose ps
  echo ""

  test_item "PostgreSQL service running" "docker-compose ps postgres | grep -q 'Up'"
  test_item "Redis service running" "docker-compose ps redis | grep -q 'Up'"
  test_item "Backend service running" "docker-compose ps backend | grep -q 'Up'"
  test_item "Frontend service running" "docker-compose ps frontend | grep -q 'Up'"
else
  warn_item "Docker Compose is not running. Start with: docker-compose up -d"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Checking Service Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker-compose ps backend | grep -q 'Up'; then
  test_item "Backend API responding" "curl -s http://localhost:3000/api/health | grep -q '\"status\":\"healthy\"'"
  test_item "Backend health check passes" "curl -s http://localhost:3000/api/health | grep -q '\"services\":{\"database\":{\"status\":\"up\"'"
fi

if docker-compose ps frontend | grep -q 'Up'; then
  test_item "Frontend accessible" "curl -s http://localhost:3001 | grep -q 'html'"
fi

if docker-compose ps postgres | grep -q 'Up'; then
  test_item "PostgreSQL database healthy" "docker-compose ps postgres | grep -q 'healthy'"
fi

if docker-compose ps redis | grep -q 'Up'; then
  test_item "Redis database healthy" "docker-compose ps redis | grep -q 'healthy'"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Checking Project Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "Backend source exists" "[ -d backend/src ]"
test_item "Frontend source exists" "[ -d frontend ]"
test_item "Configuration file exists" "[ -f backend/src/config/configuration.ts ]"
test_item "Database schema exists" "[ -f backend/prisma/schema.prisma ]"
test_item "Nginx config exists" "[ -f nginx/nginx.conf ]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✨ All checks passed! Your MailAgent setup is ready to go!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Start services: docker-compose up -d"
  echo "  2. Wait for services to be healthy: docker-compose ps"
  echo "  3. Access frontend: http://localhost:3001"
  echo "  4. Access API docs: http://localhost:3000/api/docs"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
  echo ""
  echo "Common issues:"
  echo "  • Docker not running: Start Docker Desktop"
  echo "  • Port in use: Check what's using port 3000, 3001, 5432"
  echo "  • Invalid .env: Run setup.bat or setup.sh again"
  echo "  • Services not running: Run docker-compose up -d"
  exit 1
fi
