# Project Viewer - MVP Implementation Plan

## Overview

A lightweight web application running on Raspberry Pi that scans `~/Projects` for markdown documentation, provides intuitive navigation, and renders markdown with proper formatting including ASCII diagrams and mermaid charts.

## MVP Scope

### Core Features (Must Have)
- Automatic scanning of `~/Projects` directory structure
- Generation and caching of project manifest (JSON file)
- Web interface listing all discovered projects and documentation
- Markdown rendering with support for:
  - Standard markdown formatting
  - ASCII diagrams
  - Mermaid charts
  - Code syntax highlighting
- Click-to-view navigation for markdown files
- Display file location within project structure

### Deferred Features (Post-MVP)
- PDF export functionality
- Advanced search and filtering
- Full-text search across documentation
- Auto-refresh/file watching for manifest updates
- Project tagging and categorization

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.13)
  - Lightweight, async, perfect for file serving
  - Auto-generated API documentation
- **Task Scheduling**: Simple Python script with systemd timer or cron
  - Periodic manifest generation
- **Manifest Format**: JSON file with project metadata

### Frontend
- **Framework**: Simple HTML/CSS/JavaScript (or lightweight React if needed)
- **Markdown Rendering**: `marked.js` or `react-markdown`
- **Mermaid Support**: `mermaid.js`
- **Styling**: Basic CSS or lightweight framework (e.g., Pico CSS, Water CSS)

### Infrastructure
- Runs directly on Raspberry Pi (no Docker needed for MVP)
- Systemd service for backend
- Systemd timer for manifest updates

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

## Project Structure

```
project_index/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── scanner.py           # Directory scanning logic
│   ├── models.py            # Data models (Project, Document)
│   ├── config.py            # Configuration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main page
│   ├── viewer.html          # Document viewer
│   ├── app.js               # Frontend logic
│   └── styles.css           # Styling
├── data/
│   └── manifest.json        # Generated project index
├── docs/
│   ├── draft.md             # Original requirements
│   └── plan.md              # This document
└── README.md                # Setup and usage instructions
```

## Implementation Phases

### Phase 0: Project Setup ✓
**Goal**: Initialize project structure and development environment

- [x] Create project directory structure
- [x] Write implementation plan
- [ ] Initialize git repository
- [ ] Create README.md with setup instructions
- [ ] Set up Python virtual environment
- [ ] Create initial requirements.txt

**Validation**: Project structure exists, dependencies installable

---

### Phase 1: File System Scanner
**Goal**: Build the core scanning logic that discovers projects and documentation

**Tasks**:
1. Implement directory scanner (`scanner.py`)
   - Recursively scan `~/Projects`
   - Identify markdown files (`.md`, `.markdown`)
   - Detect project roots (directories with common markers: `README.md`, `.git`, `package.json`, etc.)
   - Filter out excluded directories: `node_modules`, `.venv`, `venv`, `.git`, `dist`, `build`, `__pycache__`

2. Define data models (`models.py`)
   - `Project`: name, path, description, documents
   - `Document`: name, path, relative_path, size, modified_time

3. Implement manifest generation
   - Scan projects and generate JSON manifest
   - Save to `data/manifest.json`
   - Include metadata: scan timestamp, project count, document count

4. Create standalone scanner script
   - Can be run manually: `python backend/scanner.py`
   - Outputs statistics to console

**Validation**:
- Run scanner on `~/Projects`
- Verify manifest.json contains accurate project/document data
- Confirm excluded directories are ignored

---

### Phase 2: Backend API
**Goal**: Create FastAPI server to serve manifest and markdown files

**Tasks**:
1. Set up FastAPI application (`main.py`)
   - Configure CORS for local development
   - Add basic error handling
   - Serve static files for frontend

2. Implement API endpoints:
   - `GET /api/manifest` - Return manifest.json
   - `GET /api/projects` - List all projects
   - `GET /api/projects/{project_id}` - Get project details
   - `GET /api/document` - Serve markdown file content (with path parameter)
   - `GET /api/scan` - Trigger manual manifest refresh

3. Add configuration (`config.py`)
   - Projects directory path
   - Excluded directory patterns
   - Server host/port settings

4. Create requirements.txt
   - FastAPI
   - uvicorn
   - python-multipart (if needed for file uploads later)

**Validation**:
- Start server: `uvicorn backend.main:app --reload`
- Test each API endpoint with curl or browser
- Verify markdown files are served correctly

---

### Phase 3: Frontend - Basic UI
**Goal**: Create simple, functional web interface

**Tasks**:
1. Create project list view (`index.html`)
   - Fetch and display projects from `/api/manifest`
   - Show project name and document count
   - Display last scan timestamp

2. Create document viewer (`viewer.html`)
   - Accept document path as URL parameter
   - Fetch markdown content from API
   - Display breadcrumb showing file location
   - Back navigation to project list

3. Add basic styling (`styles.css`)
   - Responsive layout
   - Readable typography
   - Simple navigation

4. Implement client-side logic (`app.js`)
   - Fetch manifest on page load
   - Handle navigation between views
   - Error handling for missing files

**Validation**:
- Open browser to `http://localhost:8000`
- Navigate between projects and documents
- Verify all markdown files are accessible

---

### Phase 4: Markdown Rendering
**Goal**: Add rich markdown rendering with diagrams

**Tasks**:
1. Integrate markdown library
   - Add `marked.js` for markdown parsing
   - Configure code syntax highlighting (`highlight.js` or `prism.js`)

2. Add Mermaid support
   - Include `mermaid.js` library
   - Auto-detect and render mermaid code blocks

3. Style rendered content
   - GitHub-flavored markdown CSS
   - Proper code block styling
   - Table formatting
   - Responsive images

4. Test with various markdown features
   - Headers, lists, tables
   - Code blocks with syntax highlighting
   - ASCII diagrams (in code blocks)
   - Mermaid charts

**Validation**:
- Create test markdown files with various features
- Verify all elements render correctly
- Test ASCII diagrams display properly in `<pre>` blocks
- Confirm mermaid charts render as diagrams

---

### Phase 5: Search and Navigation
**Goal**: Add intuitive search and improved navigation

**Tasks**:
1. Implement client-side search
   - Search box in project list view
   - Filter projects by name
   - Filter documents by filename

2. Enhance navigation
   - Breadcrumb trail showing: Project > Directory > Document
   - "Show in project structure" feature
   - Tree view of project directories (optional)

3. Add sorting options
   - Sort projects alphabetically
   - Sort by last modified date
   - Sort by document count

**Validation**:
- Search for specific projects and documents
- Navigate using breadcrumbs
- Verify sorting works correctly

---

### Phase 6: Automation and Deployment
**Goal**: Deploy as a persistent service with automatic updates

**Tasks**:
1. Create systemd service file
   - Service for FastAPI backend
   - Automatic restart on failure
   - Logging configuration

2. Create systemd timer for scanner
   - Run scanner every hour (configurable)
   - Log scan results

3. Write deployment script
   - Install dependencies
   - Set up virtual environment
   - Configure systemd services
   - Start services

4. Add monitoring
   - Health check endpoint (`/health`)
   - Log rotation configuration

**Validation**:
- Install as systemd service
- Verify service starts on boot
- Confirm scanner runs on schedule
- Check logs are properly rotated

---

### Phase 7: Polish and Testing
**Goal**: Finalize MVP for daily use

**Tasks**:
1. Error handling improvements
   - Handle missing files gracefully
   - Show user-friendly error messages
   - Add loading states

2. Performance optimization
   - Cache manifest in memory
   - Lazy load large markdown files
   - Optimize file system scanning

3. Documentation
   - Complete README.md
   - Add inline code comments
   - Document API endpoints
   - Create usage guide

4. Testing
   - Test with all projects in `~/Projects`
   - Test on mobile browsers
   - Verify performance with large documentation sets

**Validation**:
- Full end-to-end testing
- Documentation is clear and complete
- Performance is acceptable on Raspberry Pi

---

## Development Guidelines

### Coding Standards
- Python: Follow PEP 8, use type hints
- JavaScript: Use modern ES6+ syntax, clear variable names
- Keep it simple: Prefer readability over cleverness

### Resource Considerations
- Raspberry Pi has 4GB RAM - keep memory usage minimal
- Use streaming for large files if needed
- Cache manifest in memory, not on every request
- Limit concurrent file operations

### Security Considerations
- Only serve files from `~/Projects` directory
- Validate file paths to prevent directory traversal
- No authentication needed (local network only)
- Consider adding basic auth if exposing beyond local network

## Success Criteria

The MVP is complete when:
- [x] All projects in `~/Projects` are discovered and listed
- [ ] Markdown files render correctly with diagrams
- [ ] Navigation is intuitive and responsive
- [ ] Service runs reliably on Raspberry Pi
- [ ] Manifest updates automatically on schedule
- [ ] Documentation is complete and clear
- [ ] Can access from any device on local network

## Timeline Approach

Build iteratively, testing each phase before moving forward. Each phase should be fully functional before proceeding. Focus on getting core functionality working end-to-end before adding polish.

## Post-MVP Enhancements

Consider for future iterations:
- PDF export functionality (using headless browser or markdown-pdf library)
- Full-text search across all documentation
- File watching for real-time updates
- Project statistics and analytics
- Dark mode theme
- Favorites/bookmarks system
- Recent documents history
- Multi-user support with preferences
