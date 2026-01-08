#!/bin/bash
# Project Viewer Uninstall Script
#
# This script removes the systemd services for Project Viewer

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVICE_FILES=("project-viewer.service" "project-viewer-scan.service" "project-viewer-scan.timer")

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Project Viewer Uninstall Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Error: Do not run this script as root${NC}"
    echo "The script will prompt for sudo password when needed"
    exit 1
fi

# Confirm uninstallation
read -p "Are you sure you want to uninstall Project Viewer services? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

echo ""

# Stop services
echo -e "${GREEN}[1/4] Stopping services...${NC}"
sudo systemctl stop project-viewer.service 2>/dev/null || true
sudo systemctl stop project-viewer-scan.timer 2>/dev/null || true
echo "Services stopped"

# Disable services
echo -e "${GREEN}[2/4] Disabling services...${NC}"
sudo systemctl disable project-viewer.service 2>/dev/null || true
sudo systemctl disable project-viewer-scan.timer 2>/dev/null || true
echo "Services disabled"

# Remove service files
echo -e "${GREEN}[3/4] Removing service files...${NC}"
for service_file in "${SERVICE_FILES[@]}"; do
    if [ -f "/etc/systemd/system/$service_file" ]; then
        echo "Removing $service_file..."
        sudo rm "/etc/systemd/system/$service_file"
    fi
done
echo "Service files removed"

# Reload systemd
echo -e "${GREEN}[4/4] Reloading systemd daemon...${NC}"
sudo systemctl daemon-reload
sudo systemctl reset-failed
echo "Systemd reloaded"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Uninstall Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Note: This script does not remove:"
echo "  - Virtual environment (.venv/)"
echo "  - Generated manifest (data/manifest.json)"
echo "  - Project files"
echo ""
echo "To completely remove Project Viewer, delete the project directory."
echo ""
