#!/bin/bash

# Complete Testing Script for Gym Manager System
# This script tests everything to ensure the system is working properly

echo "🚀 Starting Complete System Test..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# Step 1: Check if we're in the right directory
print_step "Checking directory..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in the correct directory. Please run this from services/api${NC}"
    exit 1
fi
print_status "In correct directory" 0

# Step 2: Check Node.js version
print_step "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    print_status "Node.js version $NODE_VERSION is compatible" 0
else
    print_status "Node.js version $NODE_VERSION is too old. Need 20+" 1
fi

# Step 3: Install dependencies
print_step "Installing dependencies..."
npm install --silent
print_status "Dependencies installed" $?

# Step 4: Check if PostgreSQL is running
print_step "Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
        print_status "PostgreSQL is running" 0
    else
        echo -e "${YELLOW}⚠️  PostgreSQL not accessible. Please ensure PostgreSQL is running.${NC}"
        echo "You can start it with: sudo service postgresql start"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Please install PostgreSQL.${NC}"
fi

# Step 5: Run linting
print_step "Running code linting..."
npm run lint
print_status "Linting passed" $?

# Step 6: Run unit tests
print_step "Running unit tests..."
npm run test:unit
print_status "Unit tests passed" $?

# Step 7: Run integration tests (if database is available)
print_step "Running integration tests..."
if psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
    npm run test:integration
    print_status "Integration tests passed" $?
else
    echo -e "${YELLOW}⚠️  Skipping integration tests - PostgreSQL not available${NC}"
fi

# Step 8: Generate coverage report
print_step "Generating coverage report..."
npm run test:coverage
print_status "Coverage report generated" $?

# Step 9: Test database setup
print_step "Testing database setup..."
if psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
    npm run test:db:setup
    print_status "Database setup successful" $?
else
    echo -e "${YELLOW}⚠️  Skipping database setup - PostgreSQL not available${NC}"
fi

# Step 10: Test API server startup
print_step "Testing API server startup..."
timeout 10s npm run dev &
SERVER_PID=$!
sleep 5

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    print_status "API server is working" 0
else
    echo -e "${YELLOW}⚠️  API server health check failed${NC}"
fi

# Kill the server
kill $SERVER_PID 2>/dev/null

# Step 11: Check test results
print_step "Checking test results..."
if [ -d "coverage" ]; then
    print_status "Coverage report generated successfully" 0
    echo -e "${BLUE}📊 Coverage report available at: coverage/index.html${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage report not found${NC}"
fi

# Final summary
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Testing Complete!${NC}"
echo "=================================="
echo ""
echo "📋 Test Summary:"
echo "✅ Dependencies installed"
echo "✅ Code linting passed"
echo "✅ Unit tests passed"
if psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
    echo "✅ Integration tests passed"
    echo "✅ Database setup successful"
else
    echo "⚠️  Integration tests skipped (PostgreSQL not available)"
fi
echo "✅ Coverage report generated"
echo ""
echo -e "${GREEN}🚀 Your system is ready for Demo 4!${NC}"
echo ""
echo "Next steps:"
echo "1. View coverage report: open coverage/index.html"
echo "2. Start development server: npm run dev"
echo "3. Test API endpoints: curl http://localhost:3000/health"
echo "4. View API docs: http://localhost:3000/api-docs"

