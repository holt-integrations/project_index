# Configurable Directories - Implementation Plan

## Overview

Add user-configurable directory settings to allow customization of:
1. **Target directory** - where projects are scanned (currently hardcoded to `~/Projects`)
2. **Documentation subdirectory pattern** - optional restriction to specific folders within projects (e.g., `docs/`, `documentation/`, or scan everywhere)

## Current Architecture

### Existing Behavior

**Projects Directory**: Hardcoded to `~/Projects` in `backend/config.py`:
```python
PROJECTS_DIR = Path.home() / "Projects"
```

**Document Discovery**: Currently scans **recursively** throughout entire project directories for markdown files:
- Uses `rglob("*")` to find all files
- Excludes predefined directories (node_modules, .git, etc.)
- Finds markdown files anywhere in project tree
- No restriction to specific subdirectories

**Pattern**: `~/Projects/[project-name]/**/*.md`

### Usage Locations

`PROJECTS_DIR` is referenced in **13 locations** across **2 files**:
- `backend/main.py` (11 occurrences): API endpoints, security validation, logging
- `backend/scanner.py` (2 occurrences): Scanning entry point

## User Requirements

Based on user request:

1. **Configurable Target Directory**
   - Allow users to specify base directory instead of `~/Projects`
   - Examples: `/data/repositories`, `/mnt/docs`, `~/work/documentation`

2. **Configurable Docs Subdirectory** (NEW FEATURE)
   - Optional pattern to restrict document search to specific folders
   - Examples:
     - `docs/` - only scan `[project]/docs/`
     - `documentation/` - only scan `[project]/documentation/`
     - Empty/null - scan entire project (current behavior)
   - Pattern: `[target-dir]/[project-name]/[docs-pattern]/**/*.md`

3. **Configuration Method**
   - Simple config file approach preferred by user
   - Easy for users to edit
   - No complex UI required (at least for MVP)

## Clarification Questions

Before finalizing implementation, I need clarification on:

### 1. Documentation Subdirectory Behavior

**Option A: Single Subdirectory** (Simpler)
- If `docs_subdirectory = "docs"`, only scan `[project]/docs/` folder
- Markdown files outside this folder are ignored
- Example: `~/Projects/my-app/docs/README.md` ✅ included
- Example: `~/Projects/my-app/README.md` ❌ excluded

**Option B: Multiple Subdirectories** (More Flexible)
- Allow comma-separated list: `docs_subdirectory = "docs,documentation,wiki"`
- Scans multiple patterns within each project
- More flexible but slightly more complex

**Option C: Glob Pattern** (Most Flexible)
- Allow glob patterns: `docs_subdirectory = "docs/**"` or `"**/documentation/**"`
- Maximum flexibility but potential for user error

**Recommendation**: Start with **Option A** (single subdirectory), can expand later

### 2. Root-Level Markdown Files

If a project has `README.md` in root but `docs_subdirectory = "docs"`:
- **Should root README.md still be included?** (special case)
- **Or strictly enforce subdirectory restriction?**

**Recommendation**: Include root README.md as special case (often important)

### 3. Configuration Precedence

If we support multiple configuration sources:
1. Environment variables (e.g., `PROJECT_VIEWER_PROJECTS_DIR`)
2. Config file (e.g., `.project-viewer.yaml`)
3. Command-line arguments
4. Hardcoded defaults

**Which order should take precedence?**

**Recommendation**: Command-line args > Environment vars > Config file > Defaults

### 4. Configuration File Location

Where should the config file live?
- **Option A**: Project root - `~/project_index/config.yaml`
- **Option B**: User home - `~/.project-viewer/config.yaml`
- **Option C**: Both - user home overrides project default

**Recommendation**: Start with **Option A** (project root), easier for single-user setup

## Proposed Solution

### Architecture: Pydantic Settings

**Why Pydantic Settings?**
- Already installed: `pydantic-settings==2.7.1` in requirements.txt (unused)
- Type-safe configuration with validation
- Automatic environment variable support
- Easy to extend later
- Integrates seamlessly with existing Pydantic models

### Configuration Structure

**File**: `config.yaml` (or `config.json` or `.env`)

```yaml
# Project Viewer Configuration

# Base directory to scan for projects
projects_directory: "~/Projects"

# Optional: restrict document search to specific subdirectory
# Leave empty or comment out to scan entire project recursively
docs_subdirectory: ""  # e.g., "docs", "documentation", ""

# Optional: include root README.md even when docs_subdirectory is set
include_root_readme: true

# Server settings
server:
  host: "0.0.0.0"
  port: 8001

# File processing
max_file_size: 10485760  # 10MB in bytes

# Feature toggles
features:
  git_integration: true
  full_text_search: true
  pdf_export: true
```

### Implementation Steps

#### Phase 1: Basic Configuration Support

**1. Update `backend/config.py`**

Replace hardcoded constants with Pydantic Settings:

```python
"""
Configuration settings for Project Viewer.

Supports configuration via:
1. config.yaml file in project root
2. Environment variables (PROJECT_VIEWER_<setting>)
3. Hardcoded defaults
"""
import os
from pathlib import Path
from typing import Optional, Set
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class ServerSettings(BaseSettings):
    """Server configuration."""
    host: str = "0.0.0.0"
    port: int = 8001


class FeaturesSettings(BaseSettings):
    """Feature toggle configuration."""
    git_integration: bool = True
    full_text_search: bool = True
    pdf_export: bool = True


class Settings(BaseSettings):
    """Main application settings."""

    # Directory configuration
    projects_directory: Path = Field(
        default=Path.home() / "Projects",
        description="Base directory to scan for projects"
    )

    docs_subdirectory: Optional[str] = Field(
        default=None,
        description="Optional subdirectory to restrict document search (e.g., 'docs', 'documentation')"
    )

    include_root_readme: bool = Field(
        default=True,
        description="Include root README.md even when docs_subdirectory is set"
    )

    # File processing
    max_file_size: int = Field(
        default=10 * 1024 * 1024,
        description="Maximum file size to read (bytes)"
    )

    # Excluded directories (set as class attribute, not configurable)
    excluded_dirs: Set[str] = {
        "node_modules", ".venv", "venv", "env", ".git", ".svn", ".hg",
        "dist", "build", "__pycache__", ".pytest_cache", ".mypy_cache",
        ".tox", "coverage", ".coverage", "htmlcov", ".eggs", "*.egg-info",
        ".idea", ".vscode", ".DS_Store", "target", "bin", "obj", "vendor"
    }

    # Markdown extensions (set as class attribute)
    markdown_extensions: Set[str] = {".md", ".markdown", ".mdown", ".mkd"}

    # Project root markers (set as class attribute)
    project_root_markers: Set[str] = {
        "README.md", "readme.md", ".git", "package.json", "pyproject.toml",
        "setup.py", "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
        "CMakeLists.txt", "Makefile", "docker-compose.yml", "Dockerfile"
    }

    # Nested settings
    server: ServerSettings = Field(default_factory=ServerSettings)
    features: FeaturesSettings = Field(default_factory=FeaturesSettings)

    # Git settings
    git_max_history_commits: int = 200
    git_max_diff_size: int = 1024 * 1024
    git_scan_timeout: int = 30

    # Search settings
    search_max_results: int = 100
    search_snippet_length: int = 150
    search_index_code_blocks: bool = True
    search_incremental_index: bool = True

    # PDF export settings
    pdf_max_file_size: int = 50 * 1024 * 1024
    pdf_keep_history: bool = True

    # Derived paths (computed from projects_directory)
    @property
    def manifest_path(self) -> Path:
        """Path to manifest file."""
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

    @field_validator('projects_directory', mode='before')
    @classmethod
    def expand_path(cls, v):
        """Expand ~ and environment variables in paths."""
        if isinstance(v, str):
            return Path(os.path.expanduser(os.path.expandvars(v)))
        return v

    model_config = SettingsConfigDict(
        env_prefix='PROJECT_VIEWER_',
        env_nested_delimiter='__',
        yaml_file='config.yaml',
        yaml_file_encoding='utf-8',
        extra='ignore',  # Ignore unknown fields
    )


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Backwards compatibility: expose settings as module-level attributes
settings = get_settings()

# Expose commonly used settings at module level for backwards compatibility
PROJECTS_DIR = settings.projects_directory
DOCS_SUBDIRECTORY = settings.docs_subdirectory
INCLUDE_ROOT_README = settings.include_root_readme
EXCLUDED_DIRS = settings.excluded_dirs
MARKDOWN_EXTENSIONS = settings.markdown_extensions
PROJECT_ROOT_MARKERS = settings.project_root_markers
MANIFEST_PATH = settings.manifest_path
HOST = settings.server.host
PORT = settings.server.port
MAX_FILE_SIZE = settings.max_file_size
ENABLE_GIT_INTEGRATION = settings.features.git_integration
GIT_MAX_HISTORY_COMMITS = settings.git_max_history_commits
GIT_MAX_DIFF_SIZE = settings.git_max_diff_size
GIT_SCAN_TIMEOUT = settings.git_scan_timeout
ENABLE_FULL_TEXT_SEARCH = settings.features.full_text_search
SEARCH_INDEX_PATH = settings.search_index_path
SEARCH_MAX_RESULTS = settings.search_max_results
SEARCH_SNIPPET_LENGTH = settings.search_snippet_length
SEARCH_INDEX_CODE_BLOCKS = settings.search_index_code_blocks
SEARCH_INCREMENTAL_INDEX = settings.search_incremental_index
ENABLE_PDF_EXPORT = settings.features.pdf_export
PDF_EXPORT_DIR = settings.pdf_export_dir
PDF_MAX_FILE_SIZE = settings.pdf_max_file_size
PDF_KEEP_HISTORY = settings.pdf_keep_history
PDF_HISTORY_PATH = settings.pdf_history_path
```

**2. Update `backend/scanner.py`**

Add docs_subdirectory filtering logic:

```python
def find_markdown_files(project_root: Path, docs_subdirectory: Optional[str] = None, include_root_readme: bool = True) -> List[Document]:
    """
    Recursively find all markdown files in a project directory.

    Args:
        project_root: Root directory of the project
        docs_subdirectory: Optional subdirectory to restrict search (e.g., "docs")
        include_root_readme: Include root README.md even when docs_subdirectory is set

    Returns:
        List of Document objects
    """
    documents = []

    # Determine search path
    if docs_subdirectory:
        # Restricted search in specific subdirectory
        search_paths = [project_root / docs_subdirectory]

        # Optionally include root README.md
        if include_root_readme:
            root_readme = project_root / "README.md"
            if root_readme.exists() and root_readme.is_file():
                try:
                    stat = root_readme.stat()
                    relative_path = root_readme.relative_to(project_root)

                    document = Document(
                        name=root_readme.name,
                        path=str(root_readme.absolute()),
                        relative_path=str(relative_path),
                        size=stat.st_size,
                        modified_time=datetime.fromtimestamp(stat.st_mtime)
                    )
                    documents.append(document)
                except Exception as e:
                    print(f"Warning: Could not process file {root_readme}: {e}")
    else:
        # Search entire project (current behavior)
        search_paths = [project_root]

    # Process each search path
    for search_path in search_paths:
        if not search_path.exists():
            print(f"Warning: Search path does not exist: {search_path}")
            continue

        try:
            for item in search_path.rglob("*"):
                # Skip if in an excluded directory
                if any(is_excluded_dir(parent) for parent in item.parents if parent != project_root):
                    continue

                # Skip if the item itself is an excluded directory
                if item.is_dir() and is_excluded_dir(item):
                    continue

                # Process markdown files
                if item.is_file() and is_markdown_file(item):
                    # Skip if already added (e.g., root README.md)
                    if any(doc.path == str(item.absolute()) for doc in documents):
                        continue

                    try:
                        stat = item.stat()
                        relative_path = item.relative_to(project_root)

                        document = Document(
                            name=item.name,
                            path=str(item.absolute()),
                            relative_path=str(relative_path),
                            size=stat.st_size,
                            modified_time=datetime.fromtimestamp(stat.st_mtime)
                        )
                        documents.append(document)

                    except Exception as e:
                        print(f"Warning: Could not process file {item}: {e}")

        except Exception as e:
            print(f"Error scanning {search_path}: {e}")

    return documents


def scan_projects_directory(
    base_dir: Path,
    docs_subdirectory: Optional[str] = None,
    include_root_readme: bool = True
) -> List[Project]:
    """
    Scan the base directory for projects.

    Args:
        base_dir: Base directory containing projects
        docs_subdirectory: Optional subdirectory to restrict document search
        include_root_readme: Include root README.md even when docs_subdirectory is set
    """
    projects = []

    # ... existing validation code ...

    for item in sorted(base_dir.iterdir()):
        if not item.is_dir() or is_excluded_dir(item):
            continue

        # Find markdown files (with optional subdirectory restriction)
        documents = find_markdown_files(
            item,
            docs_subdirectory=docs_subdirectory,
            include_root_readme=include_root_readme
        )

        # ... rest of existing logic ...
```

**3. Update `backend/main.py`**

Use settings from config:

```python
from .config import get_settings

settings = get_settings()

# Replace all `config.PROJECTS_DIR` with `settings.projects_directory`
# Replace all `config.HOST` with `settings.server.host`
# etc.

@app.post("/api/scan")
async def trigger_scan():
    """Trigger a manual scan of the projects directory."""
    try:
        print("Manual scan triggered via API...")

        # Get current settings
        settings = get_settings()

        # Run the scanner with current settings
        projects = scan_projects_directory(
            settings.projects_directory,
            docs_subdirectory=settings.docs_subdirectory,
            include_root_readme=settings.include_root_readme
        )
        manifest = generate_manifest(projects, settings.projects_directory)
        save_manifest(manifest, settings.manifest_path)

        # ... rest of logic ...
```

**4. Add Dependencies**

Update `backend/requirements.txt`:

```
pyyaml>=6.0  # For YAML config file support
```

(Note: pydantic-settings is already installed)

**5. Create Default Config File**

Create `config.yaml` in project root:

```yaml
# Project Viewer Configuration
# Copy this file and customize to your needs

# Base directory to scan for projects
# Supports ~ expansion and environment variables like $HOME
projects_directory: "~/Projects"

# Optional: restrict document search to specific subdirectory within each project
# Examples: "docs", "documentation", "wiki"
# Leave empty or comment out to scan entire project recursively (default behavior)
# docs_subdirectory: "docs"

# Include root README.md even when docs_subdirectory is set
include_root_readme: true

# Server settings
server:
  host: "0.0.0.0"
  port: 8001

# Maximum file size to read (bytes)
max_file_size: 10485760  # 10MB

# Feature toggles
features:
  git_integration: true
  full_text_search: true
  pdf_export: true

# Git integration settings
git_max_history_commits: 200
git_max_diff_size: 1048576  # 1MB
git_scan_timeout: 30  # seconds

# Full-text search settings
search_max_results: 100
search_snippet_length: 150
search_index_code_blocks: true
search_incremental_index: true

# PDF export settings
pdf_max_file_size: 52428800  # 50MB
pdf_keep_history: true
```

#### Phase 2: Configuration UI (Future Enhancement)

**Admin Settings Page** (`/admin/settings.html`):
- Form to edit configuration
- Live preview of affected projects
- Validation before saving
- Requires authentication (simple password)

**API Endpoints**:
- `GET /api/admin/settings` - Get current configuration
- `PUT /api/admin/settings` - Update configuration (requires auth)
- `POST /api/admin/reload` - Reload config without restart

#### Phase 3: Multi-Directory Support (Future Enhancement)

Allow scanning multiple base directories:

```yaml
projects_directories:
  - path: "~/Projects"
    docs_subdirectory: ""
  - path: "/data/documentation"
    docs_subdirectory: "docs"
  - path: "~/work/repos"
    docs_subdirectory: null
```

## Testing Plan

### 1. Configuration Loading Tests

**Test config.yaml parsing**:
- Valid YAML file
- Invalid YAML syntax
- Missing optional fields (should use defaults)
- Path expansion (`~` and `$HOME`)

**Test environment variable override**:
```bash
PROJECT_VIEWER_PROJECTS_DIRECTORY=/tmp/test python backend/scanner.py
```

**Test precedence**:
- Command-line > Environment > Config file > Defaults

### 2. Subdirectory Filtering Tests

**Test docs_subdirectory = null** (current behavior):
- Finds markdown files anywhere in project
- Excludes node_modules, .git, etc.

**Test docs_subdirectory = "docs"**:
- Only finds files in `[project]/docs/**/*.md`
- Includes `[project]/README.md` if include_root_readme=true
- Ignores `[project]/src/README.md`
- Handles projects without docs/ folder gracefully (0 documents)

**Test include_root_readme**:
- `true`: Includes root README.md even with docs_subdirectory set
- `false`: Strictly enforces subdirectory restriction

### 3. Edge Cases

- Non-existent projects_directory (should error gracefully)
- Empty projects_directory (should return empty manifest)
- Relative paths vs absolute paths
- Symlinks in directory structure
- Permissions issues (unreadable directories)

### 4. Backwards Compatibility

**Verify existing deployments work**:
- No config.yaml file → uses hardcoded defaults
- Existing manifest.json still loads correctly
- All API endpoints still function

## Migration Guide

### For Existing Users

**No Breaking Changes**:
- Default configuration matches current hardcoded behavior
- No action required if happy with `~/Projects` and recursive search

**To Customize**:

1. **Create config.yaml** in project root:
   ```yaml
   projects_directory: "/your/custom/path"
   ```

2. **Restart server**:
   ```bash
   # Server automatically picks up config.yaml
   .venv/bin/uvicorn backend.main:app --reload
   ```

3. **Run initial scan**:
   ```bash
   .venv/bin/python backend/scanner.py
   # OR
   curl -X POST http://localhost:8001/api/scan
   ```

### Environment Variable Override

For containerized deployments:

```bash
docker run \
  -e PROJECT_VIEWER_PROJECTS_DIRECTORY=/data/repos \
  -e PROJECT_VIEWER_DOCS_SUBDIRECTORY=docs \
  -v /host/repos:/data/repos \
  project-viewer
```

## Documentation Updates

### 1. Update README.md

Add "Configuration" section:

```markdown
## Configuration

Project Viewer can be configured via `config.yaml` file or environment variables.

### Configuration File

Create `config.yaml` in the project root:

```yaml
projects_directory: "~/Projects"  # Base directory to scan
docs_subdirectory: ""  # Optional: restrict to subfolder (e.g., "docs")
```

### Environment Variables

All settings can be overridden with environment variables:

```bash
export PROJECT_VIEWER_PROJECTS_DIRECTORY=~/work/documentation
export PROJECT_VIEWER_DOCS_SUBDIRECTORY=docs
```

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `projects_directory` | `~/Projects` | Base directory containing projects |
| `docs_subdirectory` | `null` | Optional subdirectory to restrict search |
| `include_root_readme` | `true` | Include root README.md with docs_subdirectory |
| `server.host` | `0.0.0.0` | Server bind address |
| `server.port` | `8001` | Server port |
```

### 2. Create Configuration Guide

`docs/configuration.md` with detailed examples and use cases.

## Implementation Timeline

**Phase 1: Core Configuration (Priority 1)**
- Time estimate: 3-4 hours
- Deliverables:
  - Pydantic Settings integration
  - config.yaml support
  - Environment variable support
  - Subdirectory filtering logic
  - Testing and validation

**Phase 2: Documentation (Priority 2)**
- Time estimate: 1 hour
- Deliverables:
  - README update
  - Configuration guide
  - Migration examples

**Phase 3: UI (Future)**
- Time estimate: 4-6 hours
- Deliverables:
  - Admin settings page
  - Configuration API
  - Authentication

## Open Questions for User

1. **Docs Subdirectory Behavior**: Should we support multiple subdirectories (e.g., `"docs,documentation"`) or just one?

2. **Root README Handling**: When `docs_subdirectory = "docs"`, should root README.md be included automatically?

3. **Configuration File Format**: Preference for YAML vs JSON vs .env?

4. **Configuration Location**: Project root vs user home directory?

5. **Existing Projects**: Should we provide a migration script to help users transition to custom directories?

6. **Validation**: Should the scanner warn/error if `docs_subdirectory` is set but projects don't have that folder?

## Success Criteria

- ✅ Users can configure `projects_directory` via config.yaml
- ✅ Users can optionally restrict scanning to subdirectories
- ✅ Configuration supports path expansion (`~`, environment variables)
- ✅ Backwards compatible (no config file = current behavior)
- ✅ Environment variables override config file
- ✅ All existing features work with custom directories
- ✅ Documentation clearly explains configuration options
- ✅ Tests validate all configuration scenarios

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing deployments | High | Maintain backwards compatibility; defaults = current behavior |
| Path validation security | High | Strict validation; prevent directory traversal |
| Config file syntax errors | Medium | Comprehensive validation; helpful error messages |
| Performance with restricted subdirectories | Low | Subdirectory filtering should be faster than recursive scan |
| User confusion about settings | Medium | Clear documentation; example config files |

## References

- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Environment Variable Configuration Best Practices](https://12factor.net/config)
- [YAML Specification](https://yaml.org/spec/1.2.2/)
