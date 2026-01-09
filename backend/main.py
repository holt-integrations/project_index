"""
FastAPI backend for Project Viewer.

Serves project manifest, markdown files, and frontend static files.
"""
import json
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config
from . import git_utils
from .models import Manifest, Project
from .scanner import scan_projects_directory, generate_manifest, save_manifest


# Create FastAPI app
app = FastAPI(
    title="Project Viewer API",
    description="API for browsing project documentation",
    version="0.1.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_manifest() -> Optional[Manifest]:
    """Load the manifest from disk."""
    try:
        if not config.MANIFEST_PATH.exists():
            return None

        with open(config.MANIFEST_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return Manifest(**data)

    except Exception as e:
        print(f"Error loading manifest: {e}")
        return None


def is_path_safe(file_path: Path, base_dir: Path) -> bool:
    """
    Check if a file path is within the allowed base directory.

    Prevents directory traversal attacks.
    """
    try:
        file_path_resolved = file_path.resolve()
        base_dir_resolved = base_dir.resolve()

        return str(file_path_resolved).startswith(str(base_dir_resolved))

    except Exception:
        return False


@app.get("/")
async def root():
    """Serve the main index page."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    index_path = frontend_dir / "index.html"

    if index_path.exists():
        return FileResponse(index_path)
    else:
        # Fallback to API info if frontend not available
        return {
            "message": "Project Viewer API",
            "version": "0.1.0",
            "endpoints": {
                "manifest": "/api/manifest",
                "projects": "/api/projects",
                "project_detail": "/api/projects/{project_id}",
                "document": "/api/document?path=<file_path>",
                "scan": "/api/scan",
                "health": "/health"
            }
        }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    manifest = load_manifest()

    return {
        "status": "healthy",
        "manifest_exists": manifest is not None,
        "projects_dir": str(config.PROJECTS_DIR),
        "projects_dir_exists": config.PROJECTS_DIR.exists()
    }


@app.get("/api/manifest")
async def get_manifest():
    """Get the complete manifest with all projects and documents."""
    manifest = load_manifest()

    if manifest is None:
        raise HTTPException(
            status_code=404,
            detail="Manifest not found. Run the scanner first."
        )

    return manifest


@app.get("/api/projects", response_model=List[Project])
async def get_projects():
    """Get a list of all projects."""
    manifest = load_manifest()

    if manifest is None:
        raise HTTPException(
            status_code=404,
            detail="Manifest not found. Run the scanner first."
        )

    return manifest.projects


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get details for a specific project."""
    manifest = load_manifest()

    if manifest is None:
        raise HTTPException(
            status_code=404,
            detail="Manifest not found. Run the scanner first."
        )

    # Find the project
    project = next((p for p in manifest.projects if p.id == project_id), None)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found"
        )

    return project


@app.get("/api/document")
async def get_document(path: str = Query(..., description="Absolute path to the document")):
    """
    Get the content of a markdown document.

    Requires the absolute path to the document.
    Validates that the path is within the projects directory for security.
    """
    try:
        file_path = Path(path)

        # Security check: ensure file is within projects directory
        if not is_path_safe(file_path, config.PROJECTS_DIR):
            raise HTTPException(
                status_code=403,
                detail="Access denied: File is outside the projects directory"
            )

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {path}"
            )

        # Check if it's a file (not a directory)
        if not file_path.is_file():
            raise HTTPException(
                status_code=400,
                detail="Path is not a file"
            )

        # Check file size
        file_size = file_path.stat().st_size
        if file_size > config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size} bytes (max: {config.MAX_FILE_SIZE} bytes)"
            )

        # Read and return file content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Try to get git_info from manifest
            git_info = None
            manifest = load_manifest()
            if manifest:
                # Find the document in the manifest
                for project in manifest.projects:
                    for doc in project.documents:
                        if doc.path == str(file_path):
                            git_info = doc.git_info
                            break
                    if git_info is not None:
                        break

            return {
                "path": str(file_path),
                "name": file_path.name,
                "size": file_size,
                "content": content,
                "git_info": git_info
            }

        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="File is not a valid UTF-8 text file"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )


@app.post("/api/scan")
async def trigger_scan():
    """
    Trigger a manual scan of the projects directory.

    Re-generates the manifest file.
    """
    try:
        print("Manual scan triggered via API...")

        # Run the scanner
        projects = scan_projects_directory(config.PROJECTS_DIR)
        manifest = generate_manifest(projects, config.PROJECTS_DIR)
        save_manifest(manifest, config.MANIFEST_PATH)

        return {
            "status": "success",
            "message": "Scan completed successfully",
            "projects_found": manifest.project_count,
            "documents_found": manifest.document_count,
            "scan_time": manifest.scan_time
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Scan failed: {str(e)}"
        )


@app.get("/api/document/history")
async def get_document_history(
    path: str = Query(..., description="Absolute path to the document"),
    limit: int = Query(50, ge=1, le=config.GIT_MAX_HISTORY_COMMITS, description="Maximum number of commits to return")
):
    """
    Get commit history for a document.

    Requires the document to be in a git repository.
    """
    if not config.ENABLE_GIT_INTEGRATION:
        raise HTTPException(status_code=501, detail="Git integration is disabled")

    try:
        file_path = Path(path)

        # Security check: ensure file is within projects directory
        if not is_path_safe(file_path, config.PROJECTS_DIR):
            raise HTTPException(
                status_code=403,
                detail="Access denied: File is outside the projects directory"
            )

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")

        # Find the git repository root
        current_dir = file_path.parent
        repo_root = None

        while current_dir != current_dir.parent:
            if git_utils.is_git_repository(current_dir):
                repo_root = current_dir
                break
            current_dir = current_dir.parent

        if not repo_root:
            raise HTTPException(
                status_code=400,
                detail="File is not in a git repository"
            )

        # Get commit history
        from git import Repo
        repo = Repo(repo_root)
        history = git_utils.get_commit_history(repo, file_path, limit)

        return {
            "path": str(file_path),
            "total_commits": len(history),
            "commits": history
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting commit history: {str(e)}"
        )


@app.get("/api/document/diff")
async def get_document_diff(
    path: str = Query(..., description="Absolute path to the document"),
    from_commit: str = Query(..., description="Starting commit SHA"),
    to_commit: str = Query(..., description="Ending commit SHA")
):
    """
    Get diff between two commits for a document.

    Requires the document to be in a git repository.
    """
    if not config.ENABLE_GIT_INTEGRATION:
        raise HTTPException(status_code=501, detail="Git integration is disabled")

    try:
        file_path = Path(path)

        # Security check: ensure file is within projects directory
        if not is_path_safe(file_path, config.PROJECTS_DIR):
            raise HTTPException(
                status_code=403,
                detail="Access denied: File is outside the projects directory"
            )

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")

        # Find the git repository root
        current_dir = file_path.parent
        repo_root = None

        while current_dir != current_dir.parent:
            if git_utils.is_git_repository(current_dir):
                repo_root = current_dir
                break
            current_dir = current_dir.parent

        if not repo_root:
            raise HTTPException(
                status_code=400,
                detail="File is not in a git repository"
            )

        # Get diff
        from git import Repo
        repo = Repo(repo_root)
        diff_result = git_utils.get_diff(repo, file_path, from_commit, to_commit)

        return {
            "path": str(file_path),
            "from_commit": from_commit,
            "to_commit": to_commit,
            "diff": diff_result['diff'],
            "stats": diff_result['stats']
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting diff: {str(e)}"
        )


@app.get("/api/document/contributors")
async def get_document_contributors(
    path: str = Query(..., description="Absolute path to the document")
):
    """
    Get contributors for a document.

    Requires the document to be in a git repository.
    """
    if not config.ENABLE_GIT_INTEGRATION:
        raise HTTPException(status_code=501, detail="Git integration is disabled")

    try:
        file_path = Path(path)

        # Security check: ensure file is within projects directory
        if not is_path_safe(file_path, config.PROJECTS_DIR):
            raise HTTPException(
                status_code=403,
                detail="Access denied: File is outside the projects directory"
            )

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")

        # Find the git repository root
        current_dir = file_path.parent
        repo_root = None

        while current_dir != current_dir.parent:
            if git_utils.is_git_repository(current_dir):
                repo_root = current_dir
                break
            current_dir = current_dir.parent

        if not repo_root:
            raise HTTPException(
                status_code=400,
                detail="File is not in a git repository"
            )

        # Get contributors
        from git import Repo
        repo = Repo(repo_root)
        contributors = git_utils.get_contributors(repo, file_path)

        return {
            "path": str(file_path),
            "contributors": contributors
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting contributors: {str(e)}"
        )


# Serve viewer page
@app.get("/viewer.html")
async def viewer_page():
    """Serve the document viewer page."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    viewer_path = frontend_dir / "viewer.html"

    if viewer_path.exists():
        return FileResponse(viewer_path)
    else:
        raise HTTPException(status_code=404, detail="Viewer page not found")


# Serve bookmarks page
@app.get("/bookmarks.html")
async def bookmarks_page():
    """Serve the bookmarks page."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    bookmarks_path = frontend_dir / "bookmarks.html"

    if bookmarks_path.exists():
        return FileResponse(bookmarks_path)
    else:
        raise HTTPException(status_code=404, detail="Bookmarks page not found")


# Serve static assets (CSS, JS)
@app.get("/styles.css")
async def serve_styles():
    """Serve CSS file."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    css_path = frontend_dir / "styles.css"

    if css_path.exists():
        return FileResponse(css_path, media_type="text/css")
    else:
        raise HTTPException(status_code=404, detail="CSS file not found")


@app.get("/app.js")
async def serve_js():
    """Serve JavaScript file."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    js_path = frontend_dir / "app.js"

    if js_path.exists():
        return FileResponse(js_path, media_type="application/javascript")
    else:
        raise HTTPException(status_code=404, detail="JavaScript file not found")


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Starting Project Viewer API")
    print("=" * 60)
    print(f"Host: {config.HOST}")
    print(f"Port: {config.PORT}")
    print(f"Projects directory: {config.PROJECTS_DIR}")
    print("=" * 60)
    print()

    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True
    )
