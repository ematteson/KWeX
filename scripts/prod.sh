#!/bin/bash
# KWeX Production Server Script
# Starts backend in production mode and builds/serves frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  KWeX Production Servers${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"

    # Kill all background jobs
    jobs -p | xargs -r kill 2>/dev/null

    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Check if setup has been run
BACKEND_DIR="$PROJECT_ROOT/src/backend"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"

if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}Backend virtual environment not found.${NC}"
    echo "Please run ./scripts/setup.sh first."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}Frontend dependencies not installed.${NC}"
    echo "Please run ./scripts/setup.sh first."
    exit 1
fi

# ========================================
# Check Faethm API Configuration
# ========================================
if [ -n "$FaethmPROD" ]; then
    echo -e "${GREEN}Faethm API: LIVE MODE${NC}"
    echo "  Using FaethmPROD environment variable"

    # Update .env if needed
    if [ -f "$BACKEND_DIR/.env" ]; then
        if grep -q "FAETHM_API_MOCK=true" "$BACKEND_DIR/.env"; then
            echo "  Updating .env for live Faethm API..."
            sed -i.bak 's/FAETHM_API_MOCK=true/FAETHM_API_MOCK=false/' "$BACKEND_DIR/.env"
            sed -i.bak "s/FAETHM_API_KEY=\"\"/FAETHM_API_KEY=\"$FaethmPROD\"/" "$BACKEND_DIR/.env"
            sed -i.bak 's|FAETHM_API_URL=""|FAETHM_API_URL="https://api.faethm.com"|' "$BACKEND_DIR/.env"
            rm -f "$BACKEND_DIR/.env.bak"
        fi
    fi
else
    echo -e "${YELLOW}Faethm API: MOCK MODE${NC}"
    echo "  Set FaethmPROD env var for live API"
fi
echo ""

# ========================================
# Build Frontend
# ========================================
echo -e "${YELLOW}Building frontend for production...${NC}"
cd "$FRONTEND_DIR"

npm run build

echo -e "  ${GREEN}[OK]${NC} Frontend built to dist/"
echo ""

# ========================================
# Start Backend (Production)
# ========================================
echo -e "${YELLOW}Starting backend server (production mode)...${NC}"
cd "$BACKEND_DIR"

# Disable debug mode for production
export DEBUG=false

# Get number of CPU cores for workers
WORKERS=${WORKERS:-4}

(
    source venv/bin/activate
    echo "  Backend running at http://localhost:8000"
    echo "  Workers: $WORKERS"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers $WORKERS 2>&1 | sed 's/^/  [backend] /'
) &

BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# ========================================
# Serve Frontend (Production)
# ========================================
echo -e "${YELLOW}Starting frontend preview server...${NC}"
cd "$FRONTEND_DIR"

(
    echo "  Frontend running at http://localhost:4173"
    npm run preview 2>&1 | sed 's/^/  [frontend] /'
) &

FRONTEND_PID=$!

# ========================================
# Wait for servers
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Servers Running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Access points:"
echo "  - Frontend:    http://localhost:4173"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs:    http://localhost:8000/docs"
echo ""
echo "Configuration:"
echo "  - Workers: $WORKERS"
echo "  - Debug: disabled"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all servers"
echo ""

# Wait for any background process to exit
wait
