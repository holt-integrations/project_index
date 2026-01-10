"""
Configuration settings for Project Viewer.

Supports configuration via:
1. config.yaml file in project root
2. Environment variables (PROJECT_VIEWER_<setting>)
3. Hardcoded defaults

Configuration is loaded once at startup and cached.
"""
import os
from pathlib import Path
from typing import Optional, Set
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Main application settings with support for YAML config and environment variables."""

    # ======================================================================
    # Directory Configuration
    # ======================================================================

    projects_directory: Path = Field(
        default=Path.home() / "Projects",
        description="Base directory to scan for projects"
    )

    docs_subdirectory: Optional[str] = Field(
        default=None,
        description="Optional subdirectory to restrict document search (e.g., 'docs', 'documentation'). Leave None/empty to scan entire project."
    )

    include_root_readme: bool = Field(
        default=True,
        description="Include root README.md even when docs_subdirectory is set"
    )

    # ======================================================================
    # Server Configuration
    # ======================================================================

    host: str = Field(default="0.0.0.0", description="Server bind address")
    port: int = Field(default=8001, description="Server port")

    # ======================================================================
    # File Processing
    # ======================================================================

    max_file_size: int = Field(
        default=10 * 1024 * 1024,
        description="Maximum file size to read (bytes) - 10MB"
    )

    # ======================================================================
    # Feature Toggles
    # ======================================================================

    enable_git_integration: bool = Field(default=True, description="Enable git history features")
    enable_full_text_search: bool = Field(default=True, description="Enable full-text search")
    enable_pdf_export: bool = Field(default=True, description="Enable PDF export")

    # ======================================================================
    # Git Integration Settings
    # ======================================================================

    git_max_history_commits: int = Field(default=200, description="Max commits to return in history")
    git_max_diff_size: int = Field(default=1024 * 1024, description="Max diff size (1MB)")
    git_scan_timeout: int = Field(default=30, description="Git operation timeout (seconds)")

    # ======================================================================
    # Full-Text Search Settings
    # ======================================================================

    search_max_results: int = Field(default=100, description="Maximum search results per query")
    search_snippet_length: int = Field(default=150, description="Characters in context snippet")
    search_index_code_blocks: bool = Field(default=True, description="Index code blocks in search")
    search_incremental_index: bool = Field(default=True, description="Only re-index changed files")

    # ======================================================================
    # PDF Export Settings
    # ======================================================================

    pdf_max_file_size: int = Field(
        default=50 * 1024 * 1024,
        description="Maximum PDF file size (50MB)"
    )
    pdf_keep_history: bool = Field(default=True, description="Track PDF export history")

    # ======================================================================
    # Computed/Derived Paths
    # ======================================================================

    @property
    def manifest_path(self) -> Path:
        """Path to manifest JSON file."""
        return Path(__file__).parent.parent / "data" / "manifest.json"

    @property
    def search_index_path(self) -> Path:
        """Path to search index database."""
        return Path(__file__).parent.parent / "data" / "search_index.db"

    @property
    def pdf_export_dir(self) -> Path:
        """Directory for PDF exports."""
        return Path(__file__).parent.parent / "data" / "exports"

    @property
    def pdf_history_path(self) -> Path:
        """Path to PDF export history."""
        return Path(__file__).parent.parent / "data" / "export_history.json"

    # ======================================================================
    # Validators
    # ======================================================================

    @field_validator('projects_directory', mode='before')
    @classmethod
    def expand_path(cls, v):
        """Expand ~ and environment variables in paths."""
        if isinstance(v, str):
            expanded = os.path.expanduser(os.path.expandvars(v))
            return Path(expanded)
        return v

    @field_validator('docs_subdirectory', mode='before')
    @classmethod
    def normalize_empty_string(cls, v):
        """Convert empty strings to None."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    # ======================================================================
    # Pydantic Settings Configuration
    # ======================================================================

    model_config = SettingsConfigDict(
        env_prefix='PROJECT_VIEWER_',
        env_nested_delimiter='__',
        case_sensitive=False,
        extra='ignore',  # Ignore unknown fields in config file
    )


# ======================================================================
# Singleton Pattern: Load settings once at module import
# ======================================================================

_settings_instance: Optional[Settings] = None


def get_settings() -> Settings:
    """
    Get or create the singleton settings instance.

    Loads configuration from (in order of precedence):
    1. Environment variables with PROJECT_VIEWER_ prefix (highest)
    2. config.yaml in project root (if exists)
    3. Hardcoded defaults (lowest)

    Returns:
        Settings instance with loaded configuration
    """
    global _settings_instance

    if _settings_instance is None:
        # Look for config.yaml in project root
        config_file = Path(__file__).parent.parent / "config.yaml"

        if config_file.exists():
            # Load config file data
            import yaml
            with open(config_file, 'r', encoding='utf-8') as f:
                config_data = yaml.safe_load(f) or {}

            # Merge environment variables with config file
            # Environment variables take precedence
            import os
            env_settings = {}

            # Check for environment variable overrides
            for field_name in Settings.model_fields.keys():
                env_var_name = f"PROJECT_VIEWER_{field_name.upper()}"
                if env_var_name in os.environ:
                    env_settings[field_name] = os.environ[env_var_name]

            # Environment variables override config file values
            final_config = {**config_data, **env_settings}

            _settings_instance = Settings(**final_config)
        else:
            # No config file, use defaults and env vars
            # Pydantic Settings will automatically load from env vars
            _settings_instance = Settings()

    return _settings_instance


# Create settings instance at module load
settings = get_settings()


# ======================================================================
# Backwards Compatibility: Module-level constants
# ======================================================================
# These constants maintain compatibility with existing code that imports
# from this module. They reference the singleton settings instance.

# Directory configuration
PROJECTS_DIR = settings.projects_directory
DOCS_SUBDIRECTORY = settings.docs_subdirectory
INCLUDE_ROOT_README = settings.include_root_readme

# Excluded directories (hardcoded, not configurable)
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

# Output paths
MANIFEST_PATH = settings.manifest_path

# Server configuration
HOST = settings.host
PORT = settings.port

# File processing
MAX_FILE_SIZE = settings.max_file_size

# Git integration settings
ENABLE_GIT_INTEGRATION = settings.enable_git_integration
GIT_MAX_HISTORY_COMMITS = settings.git_max_history_commits
GIT_MAX_DIFF_SIZE = settings.git_max_diff_size
GIT_SCAN_TIMEOUT = settings.git_scan_timeout

# Full-text search settings
ENABLE_FULL_TEXT_SEARCH = settings.enable_full_text_search
SEARCH_INDEX_PATH = settings.search_index_path
SEARCH_MAX_RESULTS = settings.search_max_results
SEARCH_SNIPPET_LENGTH = settings.search_snippet_length
SEARCH_INDEX_CODE_BLOCKS = settings.search_index_code_blocks
SEARCH_INCREMENTAL_INDEX = settings.search_incremental_index

# PDF export settings
ENABLE_PDF_EXPORT = settings.enable_pdf_export
PDF_EXPORT_DIR = settings.pdf_export_dir
PDF_MAX_FILE_SIZE = settings.pdf_max_file_size
PDF_KEEP_HISTORY = settings.pdf_keep_history
PDF_HISTORY_PATH = settings.pdf_history_path
