#!/bin/bash
# Project Viewer Deployment Script
#
# This script sets up the Project Viewer as a systemd service
# and configures automatic scanning.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
SERVICE_FILES=("project-viewer.service" "project-viewer-scan.service" "project-viewer-scan.timer")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Project Viewer Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root (for systemd installation)
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Error: Do not run this script as root${NC}"
    echo "The script will prompt for sudo password when needed"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "$PROJECT_DIR/backend/main.py" ]; then
    echo -e "${RED}Error: Could not find backend/main.py${NC}"
    echo "Please run this script from the project directory"
    exit 1
fi

echo -e "${YELLOW}Project directory: $PROJECT_DIR${NC}"
echo ""

# Step 1: Check Python version
echo -e "${GREEN}[1/8] Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python $PYTHON_VERSION"

# Step 2: Create virtual environment if it doesn't exist
echo -e "${GREEN}[2/8] Setting up virtual environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists"
fi

# Step 3: Install dependencies
echo -e "${GREEN}[3/8] Installing Python dependencies...${NC}"
"$VENV_DIR/bin/pip" install --upgrade pip > /dev/null
"$VENV_DIR/bin/pip" install -r "$PROJECT_DIR/backend/requirements.txt"
echo "Dependencies installed"

# Step 4: Run initial scan
echo -e "${GREEN}[4/8] Running initial project scan...${NC}"
cd "$PROJECT_DIR"
"$VENV_DIR/bin/python" backend/scanner.py
echo "Initial scan complete"

# Step 5: Install systemd service files
echo -e "${GREEN}[5/8] Installing systemd service files...${NC}"
for service_file in "${SERVICE_FILES[@]}"; do
    echo "Installing $service_file..."
    sudo cp "$PROJECT_DIR/deployment/$service_file" "/etc/systemd/system/$service_file"
done
echo "Service files installed"

# Step 6: Reload systemd
echo -e "${GREEN}[6/8] Reloading systemd daemon...${NC}"
sudo systemctl daemon-reload
echo "Systemd reloaded"

# Step 7: Enable and start services
echo -e "${GREEN}[7/8] Enabling and starting services...${NC}"

# Start main service
echo "Starting project-viewer service..."
sudo systemctl enable project-viewer.service
sudo systemctl start project-viewer.service

# Enable and start timer
echo "Starting project-viewer-scan timer..."
sudo systemctl enable project-viewer-scan.timer
sudo systemctl start project-viewer-scan.timer

# Wait a moment for service to start
sleep 2

# Step 8: Verify installation
echo -e "${GREEN}[8/8] Verifying installation...${NC}"
echo ""

# Check service status
if sudo systemctl is-active --quiet project-viewer.service; then
    echo -e "${GREEN}✓ Web service is running${NC}"
else
    echo -e "${RED}✗ Web service is not running${NC}"
    echo "Check logs with: sudo journalctl -u project-viewer.service -f"
fi

# Check timer status
if sudo systemctl is-active --quiet project-viewer-scan.timer; then
    echo -e "${GREEN}✓ Scan timer is active${NC}"
else
    echo -e "${RED}✗ Scan timer is not active${NC}"
    echo "Check logs with: sudo journalctl -u project-viewer-scan.timer -f"
fi

# Test health endpoint
echo ""
echo "Testing health endpoint..."
sleep 2
if curl -s http://localhost:8001/health > /dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service is now running at: http://localhost:8001"
echo ""
echo "Useful commands:"
echo "  Status:   sudo systemctl status project-viewer"
echo "  Logs:     sudo journalctl -u project-viewer -f"
echo "  Restart:  sudo systemctl restart project-viewer"
echo "  Stop:     sudo systemctl stop project-viewer"
echo ""
echo "Scanner commands:"
echo "  Status:   sudo systemctl status project-viewer-scan.timer"
echo "  Run now:  sudo systemctl start project-viewer-scan.service"
echo "  Logs:     sudo journalctl -u project-viewer-scan -f"
echo ""
