# Project Viewer

A lightweight web application that scans `~/Projects` for markdown documentation, providing intuitive navigation and rich rendering including ASCII diagrams and mermaid charts.

## Overview

Project Viewer is designed to run on a Raspberry Pi and provides a centralized way to browse, search, and view documentation across all your projects. No database required - just a simple JSON manifest that's periodically regenerated.

## Features

**MVP (Current)**:
- Automatic scanning of `~/Projects` directory
- Web interface for browsing projects and documentation
- Rich markdown rendering with syntax highlighting
- Support for ASCII diagrams and mermaid charts
- Displays file location within project structure
- Periodic manifest updates via scheduled task

**Planned** (see `docs/deferred.md`):
- PDF export functionality
- Full-text search across all documentation
- Git integration and version history
- Dark mode
- Bookmarks and reading history
- Advanced filtering and search

## Architecture

```
┌─────────────────────────────────────────────┐
│           Browser (Frontend)                 │
│  - Project list view                         │
│  - Document viewer with markdown rendering   │
└──────────────────┬──────────────────────────┘
                   │ HTTP
                   ▼
┌─────────────────────────────────────────────┐
│        FastAPI Backend (Port 8000)           │
│  - Serve manifest                            │
│  - Serve markdown files                      │
│  - Serve static frontend                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          File System Scanner                 │
│  - Periodic manifest generation              │
│  - Scans ~/Projects                          │
│  - Filters out node_modules, .venv, etc.     │
└─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.13+ (tested on Raspberry Pi 4)
- Projects directory at `~/Projects`

### Installation

1. Clone or navigate to this repository:
```bash
cd /home/jared/Projects/project_index
```

2. Create and activate a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r backend/requirements.txt
```

4. Run the scanner to generate the initial manifest:
```bash
python backend/scanner.py
```

5. Start the development server:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8001
```

6. Open your browser to:
```
http://localhost:8001
```

Or from another device on your network:
```
http://<raspberry-pi-ip>:8001
```

## Project Structure

```
project_index/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── scanner.py           # Directory scanning logic
│   ├── models.py            # Data models
│   ├── config.py            # Configuration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Project list page
│   ├── viewer.html          # Document viewer
│   ├── app.js               # Frontend logic
│   └── styles.css           # Styling
├── deployment/
│   ├── deploy.sh            # Automated deployment script
│   ├── uninstall.sh         # Uninstall script
│   ├── status.sh            # Status check script
│   ├── project-viewer.service        # Systemd service file
│   ├── project-viewer-scan.service   # Systemd scan service
│   └── project-viewer-scan.timer     # Systemd timer
├── data/
│   └── manifest.json        # Generated project index (auto-generated)
├── docs/
│   ├── draft.md             # Original requirements
│   ├── plan.md              # Implementation plan
│   ├── deferred.md          # Post-MVP features
│   └── markdown-test.md     # Markdown rendering test
└── README.md                # This file
```

## Configuration

Configuration is managed in `backend/config.py`. Key settings:

- **PROJECTS_DIR**: Base directory to scan (default: `~/Projects`)
- **EXCLUDED_DIRS**: Directories to skip during scanning
- **HOST**: Server host (default: `0.0.0.0`)
- **PORT**: Server port (default: `8001`)

## Development

### Running in Development Mode

```bash
# Activate virtual environment
source .venv/bin/activate

# Start server with auto-reload
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Manual Manifest Refresh

```bash
# Run scanner directly
python backend/scanner.py

# Or trigger via API (when server is running)
curl http://localhost:8001/api/scan
```

### Testing

```bash
# Test API endpoints
curl http://localhost:8001/api/manifest
curl http://localhost:8001/api/projects
```

## Deployment

### Automated Deployment (Recommended)

The easiest way to deploy Project Viewer as a systemd service:

```bash
cd /home/jared/Projects/project_index
./deployment/deploy.sh
```

This script will:
1. Check Python version
2. Create virtual environment (if needed)
3. Install dependencies
4. Run initial project scan
5. Install systemd service files
6. Enable and start services
7. Verify installation

After deployment, the service will:
- Start automatically on boot
- Restart on failure
- Scan projects every hour
- Be accessible at `http://localhost:8001`

### Deployment Management

Check service status:
```bash
./deployment/status.sh
```

View logs:
```bash
sudo journalctl -u project-viewer -f
```

Restart service:
```bash
sudo systemctl restart project-viewer
```

Run manual scan:
```bash
sudo systemctl start project-viewer-scan
```

Uninstall:
```bash
./deployment/uninstall.sh
```

### Manual Deployment

If you prefer manual deployment, systemd service files are provided in the `deployment/` directory:
- `project-viewer.service` - Main web service
- `project-viewer-scan.service` - Scan service
- `project-viewer-scan.timer` - Timer for periodic scans

Copy these to `/etc/systemd/system/` and enable them with:

```bash
sudo cp deployment/*.service deployment/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now project-viewer.service
sudo systemctl enable --now project-viewer-scan.timer
```

## API Endpoints

- `GET /` - Frontend interface
- `GET /api/manifest` - Full manifest data
- `GET /api/projects` - List all projects
- `GET /api/projects/{project_id}` - Get project details
- `GET /api/document?path=<file_path>` - Get markdown content
- `GET /api/scan` - Trigger manifest refresh
- `GET /health` - Health check endpoint

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>
```

### Virtual Environment Issues

```bash
# Remove and recreate
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Manifest Not Updating

```bash
# Check scanner output
python backend/scanner.py

# Check file permissions
ls -la data/

# Verify timer is running
sudo systemctl status project-viewer-scan.timer
```

## Documentation

- **Implementation Plan**: See `docs/plan.md` for phased development approach
- **Deferred Features**: See `docs/deferred.md` for post-MVP enhancements
- **Original Requirements**: See `docs/draft.md`

## License

Personal project - use as you see fit.

## Author

Jared Holt

## Status

**Current Phase**: Phase 6 - Automation and Deployment (Complete)

**Completed Features**:
- ✅ Project scanning and manifest generation
- ✅ FastAPI backend with RESTful API
- ✅ Frontend with search and navigation
- ✅ Rich markdown rendering with syntax highlighting
- ✅ Mermaid diagram support
- ✅ Systemd service integration
- ✅ Automated deployment scripts

**Next Phase**: Phase 7 - Polish and Testing

See `docs/plan.md` for detailed implementation roadmap.
