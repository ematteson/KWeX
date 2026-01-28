#!/bin/bash
# KWeX Setup Script
# Installs all dependencies for both backend and frontend

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
echo -e "${BLUE}  KWeX Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 11 ]; then
        echo -e "  ${GREEN}[OK]${NC} Python $PYTHON_VERSION"
    else
        echo -e "  ${RED}[ERROR]${NC} Python 3.11+ required, found $PYTHON_VERSION"
        exit 1
    fi
else
    echo -e "  ${RED}[ERROR]${NC} Python 3 not found"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}[OK]${NC} Node.js v$NODE_VERSION"
    else
        echo -e "  ${RED}[ERROR]${NC} Node.js 18+ required, found v$NODE_VERSION"
        exit 1
    fi
else
    echo -e "  ${RED}[ERROR]${NC} Node.js not found"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}[OK]${NC} npm v$NPM_VERSION"
else
    echo -e "  ${RED}[ERROR]${NC} npm not found"
    exit 1
fi

echo ""

# ========================================
# Backend Setup
# ========================================
echo -e "${YELLOW}Setting up backend...${NC}"

BACKEND_DIR="$PROJECT_ROOT/src/backend"
cd "$BACKEND_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "  Activating virtual environment..."
source venv/bin/activate

# Upgrade pip (required for pyproject.toml editable installs)
echo "  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "  Installing Python dependencies..."
pip install -e ".[dev]" -q

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "  Creating .env from template..."
    cp .env.example .env

    # Check for FaethmPROD environment variable
    if [ -n "$FaethmPROD" ]; then
        echo "  Detected FaethmPROD environment variable, configuring live Faethm API..."
        sed -i.bak 's/FAETHM_API_MOCK=true/FAETHM_API_MOCK=false/' .env
        sed -i.bak "s/FAETHM_API_KEY=\"\"/FAETHM_API_KEY=\"$FaethmPROD\"/" .env
        sed -i.bak 's|FAETHM_API_URL=""|FAETHM_API_URL="https://api.faethm.com"|' .env
        rm -f .env.bak
        echo -e "  ${GREEN}[OK]${NC} Configured for live Faethm API"
    else
        echo -e "  ${YELLOW}[INFO]${NC} Using mock Faethm API (set FaethmPROD env var for live)"
    fi
else
    echo "  .env already exists, skipping..."
fi

deactivate
echo -e "  ${GREEN}[OK]${NC} Backend setup complete"
echo ""

# ========================================
# Frontend Setup
# ========================================
echo -e "${YELLOW}Setting up frontend...${NC}"

FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
cd "$FRONTEND_DIR"

# Install dependencies
echo "  Installing Node.js dependencies..."
npm install --silent

echo -e "  ${GREEN}[OK]${NC} Frontend setup complete"
echo ""

# ========================================
# Summary
# ========================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start development servers:"
echo -e "     ${YELLOW}./scripts/dev.sh${NC}"
echo ""
echo "  2. Or start production servers:"
echo -e "     ${YELLOW}./scripts/prod.sh${NC}"
echo ""
echo "Access points:"
echo "  - Frontend:    http://localhost:5173"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs:    http://localhost:8000/docs"
echo ""

if [ -n "$FaethmPROD" ]; then
    echo -e "${GREEN}Faethm API: LIVE MODE${NC}"
else
    echo -e "${YELLOW}Faethm API: MOCK MODE${NC}"
    echo "  Set FaethmPROD environment variable for live API"
fi
echo ""
