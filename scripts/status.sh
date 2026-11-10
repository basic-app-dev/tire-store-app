#!/usr/bin/env bash

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=============================================================="
echo "📊 Tire Store App — System Service Status"
echo "=============================================================="

# 1. Backend API (Port 4000)
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  BACKEND_PID=$(lsof -Pi :4000 -sTCP:LISTEN -t | head -n 1)
  echo "🟢 Backend API:    ONLINE  (Port 4000, PID: ${BACKEND_PID}) -> http://localhost:4000/health"
else
  echo "⚪ Backend API:    OFFLINE (Port 4000)"
fi

# 2. Frontend Web (Port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  FRONTEND_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t | head -n 1)
  echo "🟢 Frontend Web:   ONLINE  (Port 3000, PID: ${FRONTEND_PID}) -> http://localhost:3000"
else
  echo "⚪ Frontend Web:   OFFLINE (Port 3000)"
fi

# 3. Mobile Expo Server (Port 8081)
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
  MOBILE_PID=$(lsof -Pi :8081 -sTCP:LISTEN -t | head -n 1)
  echo "🟢 Mobile Server:  ONLINE  (Port 8081, PID: ${MOBILE_PID}) -> http://localhost:8081"
else
  echo "⚪ Mobile Server:  OFFLINE (Port 8081)"
fi

echo "--------------------------------------------------------------"
echo "🗄️  Database Layer Commands:"
echo "   ./scripts/db.sh deploy   (Apply migrations)"
echo "   ./scripts/db.sh seed     (Seed fitments & tires)"
echo "   ./scripts/db.sh verify   (Live Supabase check)"
echo "   ./scripts/db.sh studio   (Drizzle Studio GUI)"
echo "=============================================================="

