#!/bin/bash
# Project Viewer Status Script
#
# Quick status check for Project Viewer services

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Project Viewer Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check web service
echo -e "${YELLOW}Web Service:${NC}"
if systemctl is-active --quiet project-viewer.service 2>/dev/null; then
    echo -e "  Status: ${GREEN}Running${NC}"
    echo -n "  Uptime: "
    systemctl show project-viewer.service --property=ActiveEnterTimestamp | cut -d= -f2
else
    echo -e "  Status: ${RED}Stopped${NC}"
fi
echo ""

# Check scan timer
echo -e "${YELLOW}Scan Timer:${NC}"
if systemctl is-active --quiet project-viewer-scan.timer 2>/dev/null; then
    echo -e "  Status: ${GREEN}Active${NC}"
    echo -n "  Next run: "
    systemctl list-timers project-viewer-scan.timer 2>/dev/null | grep project-viewer-scan | awk '{print $1, $2, $3}' || echo "Unknown"
else
    echo -e "  Status: ${RED}Inactive${NC}"
fi
echo ""

# Check last scan service run
echo -e "${YELLOW}Last Scan:${NC}"
if systemctl list-units project-viewer-scan.service 2>/dev/null | grep -q project-viewer-scan; then
    LAST_RUN=$(systemctl show project-viewer-scan.service --property=ActiveExitTimestamp | cut -d= -f2)
    if [ -n "$LAST_RUN" ] && [ "$LAST_RUN" != "n/a" ]; then
        echo "  $LAST_RUN"
    else
        echo "  No runs yet"
    fi
else
    echo "  Service not installed"
fi
echo ""

# Check health endpoint
echo -e "${YELLOW}Health Check:${NC}"
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Responding${NC} (http://localhost:8001)"
    RESPONSE=$(curl -s http://localhost:8001/health)
    echo "  $(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Projects: {data.get('projects_dir_exists', 'unknown')}\")" 2>/dev/null || echo "")"
else
    echo -e "  ${RED}✗ Not responding${NC}"
fi
echo ""

# Show manifest info if it exists
if [ -f "data/manifest.json" ]; then
    echo -e "${YELLOW}Manifest:${NC}"
    MANIFEST_INFO=$(python3 -c "import json; data=json.load(open('data/manifest.json')); print(f\"{data['project_count']} projects, {data['document_count']} documents, scanned {data['scan_time']}\")" 2>/dev/null)
    if [ -n "$MANIFEST_INFO" ]; then
        echo "  $MANIFEST_INFO"
    fi
    echo ""
fi

echo -e "${BLUE}========================================${NC}"
echo ""
echo "Commands:"
echo "  View logs:     sudo journalctl -u project-viewer -f"
echo "  Restart:       sudo systemctl restart project-viewer"
echo "  Run scan now:  sudo systemctl start project-viewer-scan"
echo ""
