"""
Configuration settings for Project Viewer.
"""
import os
from pathlib import Path

# Base directory to scan for projects
PROJECTS_DIR = Path.home() / "Projects"

# Directories to exclude during scanning
EXCLUDED_DIRS = {
    "node_modules",
    ".venv",
    "venv",
    "env",
    ".git",
    ".svn",
    ".hg",
    "dist",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    "coverage",
    ".coverage",
    "htmlcov",
    ".eggs",
    "*.egg-info",
    ".idea",
    ".vscode",
    ".DS_Store",
    "target",  # Rust
    "bin",
    "obj",  # C#
    "vendor",  # Go, PHP
}

# File extensions to consider as markdown
MARKDOWN_EXTENSIONS = {".md", ".markdown", ".mdown", ".mkd"}

# Files that indicate a project root
PROJECT_ROOT_MARKERS = {
    "README.md",
    "readme.md",
    ".git",
    "package.json",
    "pyproject.toml",
    "setup.py",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "CMakeLists.txt",
    "Makefile",
    "docker-compose.yml",
    "Dockerfile",
}

# Output manifest file
MANIFEST_PATH = Path(__file__).parent.parent / "data" / "manifest.json"

# Server configuration
HOST = "0.0.0.0"
PORT = 8000

# Maximum file size to read (in bytes) - 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
