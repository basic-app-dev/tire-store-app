#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================="
echo "🛑 Stopping Full Tire Store Stack"
echo "=============================================================="

# 1. Stop Frontend Web
"${SCRIPT_DIR}/stop-frontend.sh"

echo ""

# 2. Stop Backend API
"${SCRIPT_DIR}/stop-backend.sh"

echo ""
echo "=============================================================="
echo "✅ All Tire Store application processes stopped."
echo "=============================================================="

