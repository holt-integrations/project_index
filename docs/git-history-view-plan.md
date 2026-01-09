# Git History View - Implementation Plan

**Date**: 2026-01-09
**Feature**: Git History View
**Priority**: Medium
**Status**: Planning

## Overview

Add Git integration to show version history, commit information, contributors, and diffs for documents in Git repositories. This provides context about when documentation was written, who wrote it, and how it has evolved over time.

## Current State

### What Exists
- Scanner traverses project directories and finds markdown files
- Documents tracked with: name, path, size, modified_time
- Projects tracked with basic metadata
- Backend serves manifest and document content
- Frontend displays documents with markdown rendering

### What's Missing
- Git repository detection
- Commit history for documents
- Contributor information
- Diff viewing between versions
- Link to remote repository (GitHub/GitLab)
- Git metadata in manifest
- UI to display git history

## Requirements Analysis

### 1. Git Repository Detection
**Priority**: HIGH
**Complexity**: LOW

Detect if a project is a Git repository and collect basic repo information.

**Implementation**:
- Check for `.git` directory in project root
- Use GitPython library to access repo metadata
- Collect: repo path, remote URL, current branch
- Handle non-git projects gracefully (feature disabled)

**Data to Collect**:
- `is_git_repo`: boolean
- `git_remote_url`: string (if exists)
- `git_branch`: string (current branch)
- `git_remote_type`: "github" | "gitlab" | "other" | null

### 2. Last Commit Info for Document
**Priority**: HIGH
**Complexity**: MEDIUM

Show when the document was last modified via git commit.

**Implementation**:
- For each document, get the last commit that modified it
- Use `git log -1 --format=... -- <file_path>`
- Cache during manifest generation (performance)

**Data to Collect per Document**:
```python
{
    "last_commit": {
        "sha": "abc123...",
        "author_name": "John Doe",
        "author_email": "john@example.com",
        "date": "2026-01-09T10:30:00",
        "message": "Update documentation",
        "message_short": "Update documentation"  # First line only
    }
}
```

### 3. Commit History for File
**Priority**: MEDIUM
**Complexity**: MEDIUM

View full commit history for a specific document.

**Implementation**:
- Create API endpoint: `GET /api/document/history?path=<path>&limit=50`
- Use `git log --follow -- <file_path>` to track renames
- Return list of commits with metadata
- Paginate for performance (default 50, max 200)

**Response Format**:
```json
{
    "path": "/path/to/file.md",
    "total_commits": 42,
    "commits": [
        {
            "sha": "abc123",
            "author_name": "John Doe",
            "author_email": "john@example.com",
            "date": "2026-01-09T10:30:00",
            "message": "Full commit message here",
            "message_short": "Short message",
            "stats": {
                "insertions": 10,
                "deletions": 5,
                "files_changed": 1
            }
        }
    ]
}
```

### 4. Diff Between Versions
**Priority**: MEDIUM
**Complexity**: HIGH

Show what changed between two commits for a document.

**Implementation**:
- Create API endpoint: `GET /api/document/diff?path=<path>&from=<sha>&to=<sha>`
- Use `git diff <sha1> <sha2> -- <file_path>`
- Return unified diff format
- Frontend renders diff with syntax highlighting

**Response Format**:
```json
{
    "path": "/path/to/file.md",
    "from_commit": "abc123",
    "to_commit": "def456",
    "diff": "--- a/file.md\n+++ b/file.md\n@@ -1,3 +1,4 @@\n...",
    "stats": {
        "insertions": 10,
        "deletions": 5
    }
}
```

**UI Design**:
- Side-by-side diff view OR unified diff view
- Color coding: green for additions, red for deletions
- Line numbers for both versions
- Syntax highlighting for markdown

### 5. Contributors for Document
**Priority**: MEDIUM
**Complexity**: LOW

Show who has contributed to a document.

**Implementation**:
- Use `git shortlog -sne -- <file_path>`
- Count commits per author
- Include in document metadata or separate endpoint

**Data Format**:
```json
{
    "contributors": [
        {
            "name": "John Doe",
            "email": "john@example.com",
            "commit_count": 15
        },
        {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "commit_count": 7
        }
    ]
}
```

### 6. Link to Remote Repository
**Priority**: LOW
**Complexity**: LOW

Provide links to view the file on GitHub/GitLab.

**Implementation**:
- Detect remote URL from git config
- Parse to determine hosting service
- Generate appropriate URL format
- Handle GitHub, GitLab, Gitea, Bitbucket

**URL Patterns**:
- GitHub: `https://github.com/{owner}/{repo}/blob/{branch}/{path}`
- GitLab: `https://gitlab.com/{owner}/{repo}/-/blob/{branch}/{path}`
- Commit view: `https://github.com/{owner}/{repo}/commit/{sha}`

**UI Location**:
- Icon/button in document viewer header
- Opens in new tab

### 7. Git Blame Annotations (Future)
**Priority**: VERY LOW (out of scope for MVP)
**Complexity**: VERY HIGH

Show which commit/author last modified each line.

**Recommendation**: Defer to future iteration. Complex UI, performance concerns.

## Proposed Implementation Order

### Phase 1: Git Detection and Basic Metadata (MVP)
1. **Add GitPython dependency**
2. **Git repository detection** - Detect .git in projects
3. **Extend data models** - Add git fields to Document and Project
4. **Last commit info** - Collect during manifest generation
5. **Display in UI** - Show last commit info in document viewer

### Phase 2: Commit History
6. **History API endpoint** - `/api/document/history`
7. **History UI** - Modal or sidebar with commit list
8. **Remote repository links** - GitHub/GitLab integration

### Phase 3: Advanced Features
9. **Contributors API and UI** - Show who contributed
10. **Diff API endpoint** - `/api/document/diff`
11. **Diff viewer UI** - Side-by-side or unified diff

## Technical Architecture

### Backend Changes

#### Dependencies (`backend/requirements.txt`)
```
GitPython==3.1.43
```

#### Data Models (`backend/models.py`)

**New Model: GitCommit**
```python
class GitCommit(BaseModel):
    sha: str
    author_name: str
    author_email: str
    date: datetime
    message: str
    message_short: str

class GitContributor(BaseModel):
    name: str
    email: str
    commit_count: int

class GitInfo(BaseModel):
    """Git metadata for a document."""
    last_commit: Optional[GitCommit] = None
    contributors: Optional[List[GitContributor]] = None
```

**Updated Document Model**
```python
class Document(BaseModel):
    name: str
    path: str
    relative_path: str
    size: int
    modified_time: datetime
    git_info: Optional[GitInfo] = None  # NEW
```

**Updated Project Model**
```python
class Project(BaseModel):
    id: str
    name: str
    path: str
    description: Optional[str]
    documents: List[Document]
    document_count: int
    last_modified: Optional[datetime]
    is_git_repo: bool = False  # NEW
    git_remote_url: Optional[str] = None  # NEW
    git_branch: Optional[str] = None  # NEW
    git_remote_type: Optional[str] = None  # NEW
```

#### Git Module (`backend/git_utils.py`)

New module for git operations:

```python
from pathlib import Path
from typing import Optional, List
from git import Repo, InvalidGitRepositoryError
from .models import GitCommit, GitContributor, GitInfo

def is_git_repository(project_path: Path) -> bool:
    """Check if path is a git repository."""

def get_repository_info(project_path: Path) -> dict:
    """Get basic git repository information."""

def get_last_commit_for_file(repo: Repo, file_path: Path) -> Optional[GitCommit]:
    """Get the last commit that modified a file."""

def get_commit_history(repo: Repo, file_path: Path, limit: int = 50) -> List[GitCommit]:
    """Get commit history for a file."""

def get_contributors(repo: Repo, file_path: Path) -> List[GitContributor]:
    """Get list of contributors for a file."""

def get_diff(repo: Repo, file_path: Path, from_sha: str, to_sha: str) -> dict:
    """Get diff between two commits for a file."""

def parse_remote_url(remote_url: str) -> dict:
    """Parse git remote URL to determine hosting service."""

def generate_remote_file_url(remote_url: str, branch: str, file_path: str) -> Optional[str]:
    """Generate URL to view file on remote hosting service."""
```

#### Scanner Updates (`backend/scanner.py`)

```python
from .git_utils import (
    is_git_repository,
    get_repository_info,
    get_last_commit_for_file
)

def scan_projects_directory(base_dir: Path) -> List[Project]:
    # ... existing code ...

    for item in sorted(base_dir.iterdir()):
        # ... existing code ...

        # NEW: Check if git repo
        is_git = is_git_repository(item)
        git_info = get_repository_info(item) if is_git else {}

        # NEW: Get git metadata for documents
        if is_git:
            try:
                repo = Repo(item)
                for doc in documents:
                    last_commit = get_last_commit_for_file(repo, Path(doc.path))
                    if last_commit:
                        doc.git_info = GitInfo(last_commit=last_commit)
            except Exception as e:
                print(f"Warning: Could not get git info for {item}: {e}")

        project = Project(
            # ... existing fields ...
            is_git_repo=is_git,
            git_remote_url=git_info.get('remote_url'),
            git_branch=git_info.get('branch'),
            git_remote_type=git_info.get('remote_type')
        )
```

#### API Endpoints (`backend/main.py`)

**New Endpoints**:

```python
@app.get("/api/document/history")
async def get_document_history(
    path: str = Query(...),
    limit: int = Query(50, ge=1, le=200)
):
    """Get commit history for a document."""

@app.get("/api/document/diff")
async def get_document_diff(
    path: str = Query(...),
    from_commit: str = Query(...),
    to_commit: str = Query(...)
):
    """Get diff between two commits for a document."""

@app.get("/api/document/contributors")
async def get_document_contributors(path: str = Query(...)):
    """Get contributors for a document."""
```

### Frontend Changes

#### UI Components

**1. Git Metadata Display (viewer.html)**
- Location: Below breadcrumb, above document content
- Shows: Last commit author, date, message
- Expandable to show full history

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Breadcrumb                                          │
├─────────────────────────────────────────────────────┤
│ 📝 Last updated by John Doe on Jan 9, 2026         │
│ "Update documentation"                [View History]│
├─────────────────────────────────────────────────────┤
│ Document Content                                    │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**2. History Modal/Sidebar**
- Triggered by "View History" button
- Shows list of commits with date, author, message
- Click commit to see diff
- Link to remote (GitHub/GitLab) if available

**3. Diff Viewer**
- Side-by-side or unified view toggle
- Syntax highlighting for markdown
- Line numbers
- Color coding (green/red for add/remove)

#### JavaScript Functions (`app.js`)

```javascript
// Git history functions
async function loadGitHistory(docPath) {
    // Fetch commit history from API
    // Render in modal/sidebar
}

async function loadGitDiff(docPath, fromSha, toSha) {
    // Fetch diff from API
    // Render diff viewer
}

function renderGitMetadata(gitInfo, container) {
    // Render last commit info
    // Add "View History" button
}

function renderCommitHistory(commits, container) {
    // Render list of commits
    // Add click handlers
}

function renderDiff(diffData, container) {
    // Render diff with syntax highlighting
    // Handle line numbers and color coding
}

function parseRemoteUrl(remoteUrl) {
    // Determine if GitHub, GitLab, etc.
    // Generate appropriate URLs
}
```

#### CSS Styles (`styles.css`)

```css
.git-metadata {
    /* Last commit info display */
}

.git-history-sidebar {
    /* History modal/sidebar */
}

.commit-list {
    /* List of commits */
}

.commit-item {
    /* Individual commit */
}

.diff-viewer {
    /* Diff viewer container */
}

.diff-line-add {
    /* Added lines (green) */
}

.diff-line-remove {
    /* Removed lines (red) */
}

.diff-line-context {
    /* Context lines (neutral) */
}
```

## UI/UX Considerations

### Git Metadata Display
- **Position**: Between breadcrumb and document content
- **Style**: Subtle, not intrusive
- **Icon**: Git icon (branch symbol)
- **Format**: "Last updated by {author} on {date}" with short commit message
- **Action**: "View History" button to expand

### History Modal
- **Trigger**: "View History" button
- **Layout**: Modal overlay or slide-in sidebar (similar to TOC)
- **Content**:
  - List of commits (most recent first)
  - Each shows: date, author, short message
  - Click to expand and see diff
- **Actions**:
  - "View on GitHub/GitLab" link (if remote exists)
  - "View Diff" for each commit
  - Close button

### Diff Viewer
- **Trigger**: Click commit in history
- **Layout**: Full-width modal or split view
- **Views**: Toggle between unified and side-by-side
- **Features**:
  - Line numbers
  - Syntax highlighting (markdown-aware)
  - Color coding: green (add), red (remove), gray (context)
  - Navigation: Previous/Next commit buttons
  - Download diff button

### Remote Repository Links
- **Icon**: GitHub/GitLab logo (auto-detected)
- **Position**: Document viewer header, near bookmark button
- **Action**: Opens file on remote in new tab
- **Tooltip**: "View on GitHub" or "View on GitLab"

## Performance Considerations

### 1. Git Operations During Scan
- Git operations can be slow for large repositories
- **Mitigation**:
  - Cache git metadata in manifest
  - Only update on manual rescan
  - Add progress indicator during scan
  - Consider making git metadata optional (toggle in config)

### 2. Large Commit Histories
- Files with 1000+ commits can be slow to process
- **Mitigation**:
  - Default limit: 50 commits
  - Pagination for history API
  - Lazy load commit details (don't fetch all upfront)

### 3. Diff Generation
- Large diffs can be memory-intensive
- **Mitigation**:
  - Limit diff size (skip if file > 1MB in diff)
  - Stream diff instead of loading all into memory
  - Truncate very large diffs with "View full diff on GitHub" link

### 4. Memory Usage
- GitPython creates Repo objects
- **Mitigation**:
  - Reuse Repo objects during scan
  - Close repos after processing
  - Use context managers

## Error Handling

### Git Not Available
- **Scenario**: Git not installed on system
- **Handling**: Feature disabled, show message in logs, no UI shown

### Corrupted Git Repository
- **Scenario**: `.git` exists but repository is corrupted
- **Handling**: Log warning, treat as non-git project, continue scan

### File Not in Git History
- **Scenario**: File exists but never committed (new/untracked)
- **Handling**: Show "Not yet committed" or hide git metadata

### Detached HEAD State
- **Scenario**: Repository in detached HEAD state
- **Handling**: Show SHA instead of branch name

### Large Binary Files
- **Scenario**: Diff includes large binary files
- **Handling**: Show "Binary file changed" instead of diff

### Network Issues (Remote Links)
- **Scenario**: Remote URL is SSH format
- **Handling**: Convert to HTTPS for web links, or show "No web URL available"

## Testing Plan

### Backend Testing
1. Test git detection on various repository states
2. Test last commit extraction for files
3. Test commit history pagination
4. Test diff generation for various change types
5. Test contributors aggregation
6. Test remote URL parsing (GitHub, GitLab, Bitbucket)
7. Test error handling (non-git repos, corrupted repos)

### Frontend Testing
1. Test git metadata display
2. Test history modal opening/closing
3. Test commit list rendering
4. Test diff viewer rendering
5. Test remote links generation
6. Test theme support (light/dark) for diff colors
7. Test keyboard shortcuts (if added)

### Edge Cases
- Empty git repository (no commits)
- File with single commit
- File with 1000+ commits
- File renamed multiple times (--follow)
- File deleted then restored
- Merge commits
- Rebase history
- Submodules
- Shallow clone (limited history)

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Security Considerations

### 1. Path Traversal
- **Risk**: User-provided paths in git operations
- **Mitigation**: Validate all paths are within project directory (reuse existing `is_path_safe`)

### 2. Command Injection
- **Risk**: Using shell commands with user input
- **Mitigation**: Use GitPython library (no shell commands), parameterized git operations

### 3. Sensitive Information
- **Risk**: Commit messages may contain sensitive info
- **Mitigation**: Display only, don't modify; user controls which projects to scan

### 4. Large Payloads
- **Risk**: Very large diffs or histories could cause DoS
- **Mitigation**: Implement limits (max commits, max diff size)

## Configuration Options

Add to `backend/config.py`:

```python
# Git integration settings
ENABLE_GIT_INTEGRATION = True  # Toggle feature on/off
GIT_MAX_HISTORY_COMMITS = 200  # Max commits to return
GIT_MAX_DIFF_SIZE = 1 * 1024 * 1024  # 1MB max diff size
GIT_SCAN_TIMEOUT = 30  # Seconds before git operation times out
```

## Dependencies

### Backend
- **GitPython**: 3.1.43
  - Pure Python implementation
  - Works on ARM64 (Raspberry Pi)
  - No additional system dependencies (git binary required)

### Frontend
- No new dependencies
- Use existing highlight.js for diff syntax highlighting
- Use existing CSS framework

### System Requirements
- Git must be installed on system (`git --version`)
- Projects must use Git (optional - feature gracefully disabled if not)

## Accessibility

### Git Metadata
- Semantic HTML (use `<time>` for dates)
- aria-labels for icons and buttons
- Keyboard accessible "View History" button

### History Modal
- Focus trap when modal open
- Escape key to close
- aria-modal="true"
- Focus returns to trigger button on close

### Diff Viewer
- Sufficient color contrast (don't rely only on color)
- Use symbols (+/-) in addition to color
- Screen reader friendly (announce "Addition" / "Deletion")
- Keyboard navigation through diff lines

## Future Enhancements (Not in This Plan)

- Git blame per line (inline annotations)
- Compare arbitrary versions (multi-select)
- Export diff as patch file
- "Revert to version" functionality (view old version)
- Timeline visualization of changes
- Search within commit messages
- Filter by author
- Branch comparison
- Tag-based versioning
- Integration with GitHub API (PRs, issues mentions)
- Contributor avatars (from Gravatar)
- Commit graph visualization

## Success Metrics

1. Git repositories detected correctly (100% of git projects)
2. Last commit info shown for documents in git repos
3. History loads in < 500ms for typical files
4. Diff renders correctly for all supported markdown syntax
5. No performance degradation on non-git projects
6. Remote links work for GitHub and GitLab

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitPython not available on ARM64 | High | Verified: GitPython 3.1.43 supports ARM64, pure Python |
| Scan time increases significantly | High | Make git metadata optional, cache in manifest, add progress indicator |
| Large repos timeout during scan | Medium | Implement timeout, skip git metadata if operation takes > 30s |
| Commit history UI clutters document viewer | Medium | Use modal/sidebar, keep collapsed by default |
| Diff rendering breaks with large files | Medium | Limit diff size, truncate with link to remote |
| Remote URL parsing fails for uncommon hosts | Low | Support major hosts (GitHub, GitLab), graceful fallback for others |

## Estimated Effort

- **Phase 1** (Git Detection and Basic Metadata): 4-5 hours
  - GitPython setup and testing: 1 hour
  - Backend git detection: 1 hour
  - Last commit metadata collection: 1.5 hours
  - UI display of git metadata: 1.5 hours

- **Phase 2** (Commit History): 3-4 hours
  - History API endpoint: 1.5 hours
  - History UI (modal/sidebar): 1.5 hours
  - Remote links: 1 hour

- **Phase 3** (Advanced Features): 4-5 hours
  - Contributors API: 1 hour
  - Diff API endpoint: 2 hours
  - Diff viewer UI: 2 hours

**Total**: 11-14 hours for complete implementation

## Implementation Notes

### GitPython Basics

```python
from git import Repo

# Open repository
repo = Repo('/path/to/project')

# Get last commit for file
commits = list(repo.iter_commits(paths='README.md', max_count=1))
last_commit = commits[0] if commits else None

# Get commit history
history = list(repo.iter_commits(paths='README.md', max_count=50))

# Get diff between commits
diff = repo.git.diff(commit1.hexsha, commit2.hexsha, 'README.md')

# Get remote URL
if repo.remotes:
    remote_url = repo.remotes.origin.url
```

### Remote URL Patterns

- SSH: `git@github.com:user/repo.git`
- HTTPS: `https://github.com/user/repo.git`
- Convert SSH to HTTPS for web links

### Commit Message Formatting

- Short message: First line only (72 chars max)
- Full message: Full commit body
- Strip leading/trailing whitespace
- Preserve line breaks in full message

## Conclusion

Git History View will add significant value by providing context about documentation evolution. The phased approach allows us to deliver basic git integration first (detection, last commit info) before adding more complex features (history modal, diff viewer).

The implementation leverages GitPython for reliable git operations without shell command risks. All git metadata is cached during manifest generation to avoid performance impact during browsing.

The UI design keeps git features unobtrusive but accessible, using modals and sidebars similar to existing features (TOC, bookmarks). Remote repository links provide seamless integration with GitHub/GitLab for teams already using these platforms.
