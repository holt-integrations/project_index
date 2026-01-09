# Full-Text Search - Implementation Plan

**Date**: 2026-01-09
**Feature**: Full-Text Search
**Priority**: High
**Status**: Planning

## Overview

Add full-text search capability to search within document contents (not just filenames). Users can search across all markdown documentation with context snippets, filters, and result highlighting.

## Current State

### What Exists
- Basic filename/project search in index page (filters list)
- Manifest contains document metadata (name, path, size)
- Scanner traverses all projects and documents
- Frontend displays filtered project/document lists

### What's Missing
- Content indexing (searching inside documents)
- Search index storage
- Search API endpoint
- Search results with context snippets
- Search term highlighting in documents
- Advanced filters (project, date, file type)

## Requirements Analysis

### 1. Search Index Generation
**Priority**: HIGH
**Complexity**: MEDIUM

Build search index during manifest generation to enable fast full-text search.

**Implementation**:
- Use SQLite with FTS5 (Full-Text Search extension)
- Index during scanner.py execution
- Store index in `data/search_index.db`
- Index: document content, headers, code blocks

**Data to Index per Document**:
```python
{
    "id": "auto-increment",
    "path": "/path/to/doc.md",
    "project_id": "project_name",
    "name": "README.md",
    "content": "full document text",
    "headers": "extracted h1, h2, h3 text",
    "modified_time": "2026-01-09T10:30:00"
}
```

**SQLite FTS5 Schema**:
```sql
CREATE VIRTUAL TABLE documents_fts USING fts5(
    path UNINDEXED,
    project_id UNINDEXED,
    name,
    content,
    headers,
    modified_time UNINDEXED
);
```

### 2. Search Configuration
**Priority**: HIGH
**Complexity**: LOW

Allow users to enable/disable search indexing.

**Configuration** (`backend/config.py`):
```python
# Full-text search settings
ENABLE_FULL_TEXT_SEARCH = False  # Disabled by default (opt-in)
SEARCH_INDEX_PATH = Path(__file__).parent.parent / "data" / "search_index.db"
SEARCH_MAX_RESULTS = 100  # Maximum results to return
SEARCH_SNIPPET_LENGTH = 150  # Characters in context snippet
SEARCH_INDEX_CODE_BLOCKS = True  # Whether to index code blocks
```

**Why Disabled by Default**:
- Indexing adds time to scan process
- Increases storage requirements
- Not all users need content search
- Users must opt-in via config

### 3. Incremental Indexing
**Priority**: MEDIUM
**Complexity**: MEDIUM

Only re-index changed documents to improve scan performance.

**Implementation**:
- Track last indexed timestamp per document
- Compare file modified_time with indexed timestamp
- Re-index only if file modified after last index
- Remove deleted files from index

**Algorithm**:
```python
for document in documents:
    indexed_doc = get_indexed_document(document.path)

    if not indexed_doc:
        # New document - index it
        index_document(document)
    elif document.modified_time > indexed_doc.modified_time:
        # Modified document - re-index
        update_indexed_document(document)
    # else: unchanged - skip
```

### 4. Search API Endpoint
**Priority**: HIGH
**Complexity**: MEDIUM

API endpoint to search indexed documents.

**Endpoint**: `GET /api/search?q=<query>&project=<project>&limit=<limit>`

**Query Parameters**:
- `q` (required): Search query string
- `project` (optional): Filter by project ID
- `limit` (optional): Max results (default 50, max 100)
- `offset` (optional): Pagination offset

**Response Format**:
```json
{
    "query": "authentication",
    "total_results": 42,
    "results": [
        {
            "path": "/path/to/doc.md",
            "project_id": "signals",
            "name": "README.md",
            "snippet": "...user authentication system using JWT tokens...",
            "rank": 0.95,
            "match_count": 3
        }
    ]
}
```

**FTS5 Query Features**:
- Phrase search: `"exact phrase"`
- Boolean: `term1 AND term2`, `term1 OR term2`, `NOT term`
- Prefix: `auth*` matches authentication, authorize, etc.
- Column search: `headers:introduction`

### 5. Search Results UI
**Priority**: HIGH
**Complexity**: MEDIUM

Display search results with context snippets.

**UI Location**:
- Global search bar in index page (replace/enhance existing search)
- Search mode toggle: "Files" vs "Content"
- Dedicated search results page

**Search Results Display**:
```
┌─────────────────────────────────────────────┐
│ Search: "authentication" (42 results)       │
├─────────────────────────────────────────────┤
│                                             │
│ 📄 signals/README.md                        │
│ ...user authentication system using JWT    │
│ tokens for secure API access...            │
│                                             │
│ 📄 project_index/docs/plan.md              │
│ ...add authentication middleware to protect│
│ sensitive endpoints...                      │
│                                             │
└─────────────────────────────────────────────┘
```

**Features**:
- Project badge/icon
- Document path as clickable link
- Context snippet with highlighted search terms
- Match count and relevance score (optional)
- Keyboard navigation (arrow keys)

### 6. Search Term Highlighting
**Priority**: MEDIUM
**Complexity**: MEDIUM

Highlight search terms in document when opened from search results.

**Implementation**:
- Pass search query in URL: `viewer.html?path=...&search=authentication`
- Frontend highlights matching terms in rendered markdown
- Use CSS `mark` element or custom highlight class
- Support multiple terms

**JavaScript**:
```javascript
function highlightSearchTerms(container, terms) {
    // Walk DOM tree, find text nodes, wrap matches in <mark>
    // Preserve markdown rendering (don't break links, code blocks)
}
```

**CSS**:
```css
mark.search-highlight {
    background: yellow;
    font-weight: bold;
    padding: 0.1em 0.2em;
}
```

### 7. Advanced Filters
**Priority**: LOW
**Complexity**: MEDIUM

Filter search results by project, date, file type.

**Filters**:
- **Project**: Dropdown or checkboxes to filter by project
- **Date Range**: "Last 7 days", "Last month", "Last year", Custom
- **File Type**: By file extension or location (docs/, README, etc.)
- **Has Code Blocks**: Documents containing code snippets

**UI**:
- Collapsible filter panel on left side
- Apply button or auto-update results
- Clear all filters button
- Show active filters as chips/tags

## Proposed Implementation Order

### Phase 1: Core Search Infrastructure (MVP)
1. **Add SQLite FTS5 search module** (`backend/search_index.py`)
2. **Update scanner.py** to build search index
3. **Add search API endpoint** (`GET /api/search`)
4. **Update config.py** with search settings

### Phase 2: Search UI
5. **Add search mode toggle** to index page
6. **Create search results display** with snippets
7. **Integrate search with existing UI**

### Phase 3: Enhancements
8. **Add search term highlighting** in viewer
9. **Implement incremental indexing**
10. **Add advanced filters**

## Technical Architecture

### Backend Changes

#### New Module: `backend/search_index.py`

```python
import sqlite3
from pathlib import Path
from typing import List, Dict, Optional

class SearchIndex:
    """Full-text search index using SQLite FTS5."""

    def __init__(self, db_path: Path):
        """Initialize search index."""

    def create_index(self):
        """Create FTS5 virtual table."""

    def index_document(self, doc: Document, project_id: str):
        """Add document to search index."""

    def update_document(self, doc: Document, project_id: str):
        """Update existing document in index."""

    def remove_document(self, path: str):
        """Remove document from index."""

    def search(
        self,
        query: str,
        project_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Search documents and return results with snippets."""

    def get_indexed_document(self, path: str) -> Optional[Dict]:
        """Get indexed document metadata."""

    def clear_index(self):
        """Clear entire search index."""
```

**Key Functions**:

```python
def extract_headers(content: str) -> str:
    """Extract markdown headers for separate indexing."""
    headers = []
    for line in content.split('\n'):
        if line.startswith('#'):
            header_text = line.lstrip('#').strip()
            headers.append(header_text)
    return ' '.join(headers)

def generate_snippet(content: str, query: str, length: int = 150) -> str:
    """Generate context snippet around search match."""
    # Find first occurrence of query
    # Extract surrounding context (length characters)
    # Add ellipsis if truncated
    pass
```

#### Updates to `backend/scanner.py`

```python
from . import search_index

def scan_projects_directory(base_dir: Path) -> List[Project]:
    # ... existing code ...

    # NEW: Build search index if enabled
    if config.ENABLE_FULL_TEXT_SEARCH:
        print("\nBuilding search index...")
        index = search_index.SearchIndex(config.SEARCH_INDEX_PATH)
        index.create_index()

        for project in projects:
            for doc in project.documents:
                # Read document content
                with open(doc.path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Index document
                index.index_document(doc, project.id, content)

        print(f"Indexed {total_docs} documents")
```

#### New API Endpoint (`backend/main.py`)

```python
from . import search_index

@app.get("/api/search")
async def search_documents(
    q: str = Query(..., description="Search query"),
    project: Optional[str] = Query(None, description="Filter by project ID"),
    limit: int = Query(50, ge=1, le=config.SEARCH_MAX_RESULTS),
    offset: int = Query(0, ge=0)
):
    """
    Full-text search across all documents.

    Requires ENABLE_FULL_TEXT_SEARCH to be enabled in config.
    """
    if not config.ENABLE_FULL_TEXT_SEARCH:
        raise HTTPException(
            status_code=501,
            detail="Full-text search is not enabled. Set ENABLE_FULL_TEXT_SEARCH=True in config.py"
        )

    try:
        index = search_index.SearchIndex(config.SEARCH_INDEX_PATH)
        results = index.search(q, project_id=project, limit=limit, offset=offset)

        return {
            "query": q,
            "project_filter": project,
            "total_results": len(results),
            "results": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )
```

### Frontend Changes

#### Search UI Enhancement (`frontend/index.html`)

Add search mode toggle:

```html
<div class="search-container">
    <input type="text" id="search-input" placeholder="Search...">
    <div class="search-mode-toggle">
        <button id="search-mode-files" class="active">Files</button>
        <button id="search-mode-content">Content</button>
    </div>
</div>
```

#### Search Results Display (`frontend/app.js`)

```javascript
async function searchContent(query, projectFilter = null) {
    try {
        let url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;
        if (projectFilter) {
            url += `&project=${encodeURIComponent(projectFilter)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        renderSearchResults(data);
    } catch (error) {
        console.error('Search error:', error);
        showError(`Search failed: ${error.message}`);
    }
}

function renderSearchResults(data) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';

    if (data.total_results === 0) {
        container.innerHTML = '<p class="no-results">No results found</p>';
        return;
    }

    const resultsList = document.createElement('div');
    resultsList.className = 'search-results-list';

    data.results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        item.innerHTML = `
            <div class="result-header">
                <span class="result-project">${escapeHtml(result.project_id)}</span>
                <a href="/viewer.html?path=${encodeURIComponent(result.path)}&project=${encodeURIComponent(result.project_id)}&search=${encodeURIComponent(data.query)}"
                   class="result-title">${escapeHtml(result.name)}</a>
            </div>
            <div class="result-snippet">${highlightSnippet(result.snippet, data.query)}</div>
            <div class="result-meta">
                <span class="result-path">${escapeHtml(result.path)}</span>
            </div>
        `;

        resultsList.appendChild(item);
    });

    container.appendChild(resultsList);
}

function highlightSnippet(snippet, query) {
    // Simple highlighting (could be improved with regex)
    const terms = query.toLowerCase().split(/\s+/);
    let highlighted = escapeHtml(snippet);

    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
}
```

#### Search Term Highlighting in Viewer

```javascript
// In loadDocument() function
const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('search');

if (searchQuery) {
    // Highlight search terms after rendering
    highlightSearchTerms(container, searchQuery);
}

function highlightSearchTerms(container, query) {
    const terms = query.toLowerCase().split(/\s+/);
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {
        const text = node.textContent;
        let highlightedText = text;

        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            if (regex.test(text)) {
                const span = document.createElement('span');
                span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                node.parentNode.replaceChild(span, node);
            }
        });
    });
}
```

#### CSS Styles (`frontend/styles.css`)

```css
/* Search mode toggle */
.search-mode-toggle {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.search-mode-toggle button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    cursor: pointer;
}

.search-mode-toggle button.active {
    background: var(--primary-color);
    color: white;
}

/* Search results */
.search-results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.search-result-item {
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
}

.search-result-item:hover {
    border-color: var(--primary-color);
}

.result-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
}

.result-project {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--primary-color);
    color: white;
    font-size: 0.75rem;
    border-radius: 3px;
}

.result-title {
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
}

.result-title:hover {
    color: var(--primary-color);
}

.result-snippet {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 0.5rem;
}

.result-snippet mark {
    background: rgba(255, 214, 0, 0.3);
    font-weight: 600;
    padding: 0.1em 0.2em;
}

.result-meta {
    font-size: 0.875rem;
    color: var(--text-muted);
}

.result-path {
    font-family: monospace;
}

/* Search highlighting in viewer */
mark.search-highlight {
    background: rgba(255, 214, 0, 0.5);
    font-weight: 600;
    padding: 0.1em 0.2em;
    border-radius: 2px;
}
```

## UI/UX Considerations

### Search Mode Toggle
- Default: Files mode (current behavior)
- Content mode: Full-text search
- Clear visual indication of active mode
- Keyboard shortcut to toggle: `Ctrl+Shift+F`

### Search Results
- Show total result count
- Display project as badge/chip
- Snippet shows ~150 characters of context
- Search terms highlighted in snippet
- Click result to open document with search terms highlighted

### Performance Indicators
- Show "Searching..." loading state
- Display search time (e.g., "Found 42 results in 0.05s")
- Pagination for >50 results
- Lazy load results on scroll

### Empty States
- "No results found for 'query'" with suggestions
- "Full-text search is not enabled" if feature disabled
- "Type to search" placeholder when empty

## Performance Considerations

### 1. Index Size
- SQLite FTS5 creates inverted index
- Approximate size: ~20-30% of original content
- For 100 documents × 10KB avg = 200-300KB index

### 2. Indexing Time
- ~0.1-0.2 seconds per document
- 100 documents = 10-20 seconds
- Run during scan (acceptable for hourly scans)

### 3. Search Speed
- FTS5 is very fast: <100ms for most queries
- Results limited to 100 (configurable)
- Snippet generation adds minimal overhead

### 4. Memory Usage
- SQLite keeps index on disk, not in RAM
- Minimal memory footprint
- Raspberry Pi friendly

### 5. Incremental Indexing
- Reduces re-index time by 80-90%
- Only process changed documents
- Track timestamps in separate table

## Security Considerations

### 1. SQL Injection
- **Risk**: User-provided search queries could inject SQL
- **Mitigation**: Use parameterized queries, FTS5 query parser handles escaping

### 2. Path Traversal
- **Risk**: Search results could expose paths outside projects directory
- **Mitigation**: Only index documents from scanned projects, validate paths

### 3. Resource Exhaustion
- **Risk**: Complex regex queries could cause DoS
- **Mitigation**: Limit query complexity, set timeouts, rate limiting

### 4. Content Exposure
- **Risk**: Search might expose sensitive content
- **Mitigation**: Same security model as document viewer (path validation)

## Error Handling

### Index Creation Failures
- Log error and disable search feature
- Continue with manifest generation
- Show warning in UI

### Search Query Errors
- Invalid FTS5 syntax: Return error message with hint
- Empty query: Return all documents (or show help)
- Database locked: Retry with backoff

### Missing Index
- API returns 501 "Search not enabled"
- UI shows message with instructions to enable

## Configuration Options

Add to `backend/config.py`:

```python
# Full-text search settings
ENABLE_FULL_TEXT_SEARCH = False  # Toggle on/off
SEARCH_INDEX_PATH = Path(__file__).parent.parent / "data" / "search_index.db"
SEARCH_MAX_RESULTS = 100  # Max results per query
SEARCH_SNIPPET_LENGTH = 150  # Characters in snippet
SEARCH_INDEX_CODE_BLOCKS = True  # Index code blocks
SEARCH_INDEX_HEADERS_SEPARATELY = True  # Boost header matches
SEARCH_INCREMENTAL_INDEX = True  # Only re-index changed files
```

## Dependencies

### Backend
- **SQLite 3**: Built-in with Python (no new dependency)
- FTS5 extension: Enabled by default in Python 3.x

### Frontend
- No new dependencies (vanilla JavaScript)

## Testing Plan

### Backend Testing
1. Create search index from sample documents
2. Test various FTS5 queries (phrase, boolean, prefix)
3. Verify snippet generation
4. Test incremental indexing (modify document, re-scan)
5. Test with large documents (>100KB)
6. Test with special characters in content

### Frontend Testing
1. Test search mode toggle
2. Test search results display
3. Test snippet highlighting
4. Test term highlighting in viewer
5. Test keyboard navigation
6. Test pagination
7. Test empty states

### Edge Cases
- Empty documents
- Documents with only code blocks
- Documents with non-ASCII characters
- Very long documents (>1MB)
- Queries with special characters
- Boolean query syntax
- Multiple search terms

### Performance Testing
- Index 1000 documents, measure time
- Search 1000 documents, measure response time
- Test incremental index performance
- Memory usage during indexing

## Accessibility

### Search UI
- Keyboard accessible (Tab navigation)
- Screen reader announcements for result count
- aria-label for search mode buttons
- Focus management when switching modes

### Search Results
- Semantic HTML (list structure)
- Clear link text (document name + path)
- Keyboard navigation through results
- Focus visible on active result

## Future Enhancements (Not in This Plan)

- Fuzzy search (typo tolerance)
- Search suggestions/autocomplete
- Search history
- Saved searches
- Search analytics (popular queries)
- Advanced query builder UI
- Export search results
- Search within specific file types only
- Regex search support

## Success Metrics

1. Search index builds successfully for all documents
2. Search queries return in <200ms
3. Snippets accurately show context around matches
4. Highlighting works in viewer without breaking layout
5. No performance degradation during scans
6. Users can find documents by content (not just name)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Indexing slows down scans significantly | Medium | Make indexing optional, run in background, incremental indexing |
| Search results too slow on Raspberry Pi | Medium | Limit result count, optimize FTS5 queries, add caching |
| Index size grows too large | Low | Monitor size, add cleanup for old documents, compression |
| Complex queries cause crashes | Low | Query validation, timeouts, error handling |
| Users expect Google-quality search | Medium | Set expectations, provide query syntax help, fuzzy search in future |

## Estimated Effort

- **Phase 1** (Core Infrastructure): 4-5 hours
  - SQLite FTS5 module: 2 hours
  - Scanner integration: 1 hour
  - Search API endpoint: 1 hour
  - Testing: 1 hour

- **Phase 2** (Search UI): 3-4 hours
  - Search mode toggle: 1 hour
  - Results display: 2 hours
  - Integration: 1 hour

- **Phase 3** (Enhancements): 3-4 hours
  - Term highlighting: 2 hours
  - Incremental indexing: 1.5 hours
  - Advanced filters: 1.5 hours (future)

**Total**: 10-13 hours for complete implementation (Phases 1-2)

## Conclusion

Full-Text Search will significantly improve document discoverability by allowing users to search inside document contents, not just filenames. The SQLite FTS5 implementation is lightweight, fast, and perfect for Raspberry Pi deployment.

The phased approach allows us to deliver core search functionality first (index + API + basic UI), then enhance with highlighting and filters. The feature is opt-in via configuration to avoid performance impact for users who don't need content search.

Key decisions:
- SQLite FTS5 (not lunr.js) for better performance and server-side control
- Disabled by default (opt-in) to avoid indexing overhead
- Incremental indexing to minimize re-scan time
- Search term highlighting in viewer for better UX
