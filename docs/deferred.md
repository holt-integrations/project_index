# Project Viewer - Deferred Features

Features and enhancements to consider after MVP completion. Organized by category and priority.

**Recommended Implementation Order**

Prefer this list for implementation order (builds from simple to complex). Before beginning development, write a unique planning document to this directory (docs).

- [x] Dark Mode
- [x] Bookmarks and Favorites
- [x] Interactive Table of Contents
- [x] Code Block Enhancements
- [x] Git History View
- [x] Full-Text Search
- [x] PDF Export

**Tweaks**

- [x] When in dark mode, the text entered into the search field is hard to read because it is dark text on a dark background. Perhaps it is not being addressed in the stylesheet.
- [x] Allow user to config target directory. Default is `~/Projects` but a user may want to customize.
- [x] Code blocks use color coded syntax for common languages (not plain text)
- [ ] ToC: default to fully collapsed

**Idea Bank**

- "Top of doc" button at bottom of page for convenient navigation
- Open terminal at location
- Open [editor] at location
- Markdown editor to allow making changes/updates within the app
	- Optional integration with Apostrophe?
- Pretty URLs (routing?)

---

## Export and Sharing

### PDF Export (High Priority)
**Description**: Convert any markdown document to PDF with a single click.

**Implementation**:
- Use headless Chrome/Chromium via `playwright` or `puppeteer-core`
- Or use Python libraries like `markdown-pdf` or `weasyprint`
- Save PDFs to `~/project_index_exports/` or similar
- Include metadata: source project, export date, file path
- Preserve formatting, diagrams, and mermaid charts

**UI**:
- "Export to PDF" button on document viewer
- Download history page
- Batch export for multiple documents

**Considerations**:
- PDF generation can be resource-intensive on Raspberry Pi
- Where should the PDF be written? Recommend a separate location inside the Project Index app.
- Consider queueing system for multiple exports
- May need ARM64-compatible headless browser

---

### Multi-Format Export
**Description**: Export to additional formats beyond PDF.

**Formats**:
- HTML (standalone with embedded CSS)
- DOCX (for Word compatibility)
- ePub (for e-readers)
- Plain text (stripped of formatting)

**Use Cases**:
- Share documentation with non-technical stakeholders
- Archive documentation in various formats
- Read documentation offline on different devices

---

### Print Optimization
**Description**: CSS optimizations for printing directly from browser.

**Features**:
- Page break controls
- Print-friendly headers/footers
- Remove navigation elements
- Optimize margins and spacing

---

## Search and Discovery

### Full-Text Search (High Priority)
**Description**: Search within document contents, not just filenames.

**Implementation**:
- Build search index during manifest generation
- Use lightweight search engine (e.g., `lunr.js` client-side or SQLite FTS5)
- Index document content, headers, code blocks
- Store index alongside manifest
- Not the default action. Must be toggled on by the user.

**UI**:
- Global search bar
- Search results with context snippets
- Highlight search terms in documents
- Advanced filters (by project, file type, date range)

**Performance**:
- Incremental indexing for changed files only
- Lazy loading of search results
- Consider search result caching

---

### Smart Recommendations
**Description**: Suggest related documents based on content or context.

**Features**:
- "Related documents" section on viewer
- "People who viewed this also viewed..."
- Links to documents that reference current file
- Detect cross-references between documents

**Implementation**:
- Track document views (simple log file)
- Analyze markdown links between documents
- Basic content similarity (keyword matching)

---

### Advanced Filtering
**Description**: Powerful filtering beyond basic search.

**Filters**:
- File size range
- Last modified date
- Project tags
- Document type (README, API docs, guides, etc.)
- Programming language (detected from project)
- Presence of diagrams/code blocks
- Word count / reading time

---

### Saved Searches
**Description**: Save frequent search queries for quick access.

**Features**:
- Save search + filter combinations
- Name and organize saved searches
- Quick access dropdown
- Share search URLs

---

## Content Enhancements

### Interactive Table of Contents (High Priority)
**Description**: Auto-generated TOC for long documents.

**Features**:
- Parse markdown headers to build TOC
- Sticky/floating TOC sidebar
- Smooth scroll to sections
- Highlight current section on scroll
- Collapsible sections
- Estimated reading time per section

---

### Code Block Enhancements (High Priority)
**Description**: Improve code block functionality.

**Features**:
- Copy-to-clipboard button
- Line numbers
- Line highlighting
- Syntax theme selector
- Code folding for long blocks
- Language detection and auto-highlighting
- Run code snippets (sandboxed, for supported languages)

---

### Link Preview
**Description**: Hover over internal links to preview content.

**Features**:
- Show first few lines of linked document
- Preview external links (fetch meta tags)
- Image previews
- Keyboard shortcuts to follow links

---

### Image Gallery
**Description**: Browse all images in a project.

**Features**:
- Extract images from markdown documents
- Grid view of all project images
- Lightbox viewer
- Image metadata (size, dimensions, format)
- Filter by image type

---

### Document Templates
**Description**: Detect and highlight common document types.

**Features**:
- Special rendering for README files
- API documentation formatting
- Changelog/release notes timeline view
- Architecture diagrams gallery
- License information display

---

### Embedded Content Support
**Description**: Render additional content types beyond markdown.

**Formats**:
- Jupyter notebooks (`.ipynb`) with output cells
- AsciiDoc files
- reStructuredText
- Org-mode files
- LaTeX rendering for math equations

---

## Git Integration

### Git History View (Medium Priority)
**Description**: Show version history for documents in git repositories.

**Features**:
- Detect if project is a git repo
- Show last commit info for document
- View commit history for file
- Diff between versions
- Link to GitHub/GitLab if remote exists
- Show contributors for each document

**Implementation**:
- Use `gitpython` library
- Cache git data during manifest generation
- Optional: show git blame annotations

---

### Commit-Based Updates
**Description**: Track documentation changes via git commits.

**Features**:
- "What's new" feed of recent doc changes
- Subscribe to specific project updates
- Email notifications for documentation changes (optional)
- RSS feed of documentation updates

---

### Branch Awareness
**Description**: View documentation from different git branches.

**Features**:
- Branch selector dropdown
- Compare documentation across branches
- Indicate which branch is being viewed
- Useful for versioned documentation

---

## User Experience

### Dark Mode (High Priority)
**Description**: Toggle between light and dark themes.

**Features**:
- Persistent theme preference
- Auto-detect system preference
- Separate code syntax themes
- Smooth transition animation

---

### Bookmarks and Favorites (High awPriority)
**Description**: Mark documents for quick access.

**Features**:
- Star/bookmark any document
- Bookmarks page with quick links
- Collections/folders for bookmarks
- Export/import bookmarks
- Sync across devices (local storage + optional cloud)

---

### Reading History
**Description**: Track recently viewed documents.

**Features**:
- Recent documents list
- View count tracking
- Last read timestamp
- Resume where you left off (scroll position)
- Clear history option

---

### Customizable UI
**Description**: Personalize the viewing experience.

**Options**:
- Font size and family
- Line height and width
- Color scheme customization
- Layout preferences (sidebar position, compact mode)
- Hide/show UI elements

---

### Keyboard Shortcuts
**Description**: Navigate efficiently without mouse.

**Shortcuts**:
- Search: `/` or `Ctrl+K`
- Navigate back: `Backspace` or `Esc`
- Next/prev document: `J`/`K`
- Bookmark: `B`
- Print/Export: `Ctrl+P`
- Copy link: `Ctrl+Shift+C`
- Toggle TOC: `T`

---

### Mobile Optimization
**Description**: Responsive design for phones and tablets.

**Features**:
- Touch-friendly navigation
- Swipe gestures (back/forward)
- Optimized for small screens
- Progressive Web App (PWA) support
- Offline viewing capability

---

## Collaboration and Sharing

### Comments and Annotations
**Description**: Add notes and discussions to documents.

**Features**:
- Inline comments on specific paragraphs
- Highlight text and add notes
- Reply threads
- Resolve/archive comments
- Export comments separately

**Storage**:
- Separate from original documents
- Local JSON files or simple database
- Optional: doesn't modify source files

---

### Share Links
**Description**: Generate shareable links to specific documents.

**Features**:
- Copy link to clipboard
- Link to specific section (anchor)
- QR code generation
- Optional: temporary links with expiration
- Optional: password-protected links

---

### Multi-User Support
**Description**: Support multiple users with preferences.

**Features**:
- Simple user profiles
- Per-user bookmarks and history
- Per-user theme preferences
- Basic authentication
- User activity tracking

---

## Analytics and Insights

### Project Statistics (Medium Priority)
**Description**: Visualize documentation metrics.

**Metrics**:
- Total documents per project
- Documentation coverage (files with docs vs without)
- Most viewed documents
- Recently updated projects
- Documentation health score
- Average document length
- Programming language distribution

**Visualization**:
- Charts and graphs
- Dashboard page
- Trend analysis over time

---

### Documentation Quality Analysis
**Description**: Assess documentation completeness.

**Checks**:
- Presence of README
- Broken internal links
- Missing images
- Outdated content (old modification dates)
- Code blocks without language specified
- Spelling and grammar suggestions
- Readability score

---

### Usage Tracking
**Description**: Understand how documentation is used.

**Metrics**:
- Page views per document
- Time spent reading
- Search queries
- Most visited projects
- Peak usage times
- Export activity

**Privacy**: All data stays local, no external tracking.

---

## Automation and Integration

### Real-Time Updates (High Priority)
**Description**: Automatically detect file system changes.

**Implementation**:
- Use `watchdog` library for file system monitoring
- Incremental manifest updates
- WebSocket or SSE to push updates to browser
- Live reload when document changes
- Notification when new projects are added

---

### API for External Tools
**Description**: RESTful API for integrations.

**Use Cases**:
- IDE plugins to open documentation
- Command-line tool to search docs
- Alfred/Raycast extensions
- Integration with other services

**Endpoints**:
- Search API
- Document content API
- Project listing API
- Metadata API

---

### Webhook Support
**Description**: Trigger actions on events.

**Events**:
- New document added
- Document updated
- Project created
- Search performed

**Actions**:
- Send notifications
- Trigger external builds
- Update external systems

---

### Import External Documentation
**Description**: Pull documentation from external sources.

**Sources**:
- GitHub repositories (via API)
- Confluence pages
- Notion pages
- Google Docs
- Web pages (convert to markdown)

---

### Documentation Generation
**Description**: Auto-generate documentation from code.

**Features**:
- Extract docstrings from Python files
- JSDoc comments to markdown
- API endpoint documentation
- Database schema documentation
- Generate README templates

---

## Performance and Reliability

### Caching Layer
**Description**: Improve performance with intelligent caching.

**Strategies**:
- In-memory LRU cache for frequent documents
- Pre-render popular documents
- Cache search results
- Browser-side service worker cache

---

### Progressive Loading
**Description**: Load content incrementally for better UX.

**Features**:
- Lazy load document sections
- Infinite scroll for project lists
- Stream large documents
- Skeleton screens while loading

---

### Offline Mode
**Description**: Access documentation without network.

**Implementation**:
- Service worker for offline support
- Cache strategy for documents
- Sync when back online
- Indicate offline status

---

### Health Monitoring
**Description**: Track system health and performance.

**Features**:
- Monitor scan duration
- Track API response times
- Disk space warnings
- Error logging and alerting
- Uptime tracking
- Resource usage graphs (CPU, memory)

---

## Advanced Features

### AI-Powered Features
**Description**: Leverage LLMs for enhanced functionality.

**Features**:
- Summarize long documents
- Generate documentation from code
- Answer questions about documentation
- Suggest documentation improvements
- Auto-tag documents by content
- Semantic search (beyond keyword matching)

**Implementation**:
- Optional integration with OpenAI/Anthropic APIs
- Or local models (Ollama on Raspberry Pi)

---

### Documentation Diff Tool
**Description**: Compare versions of documents.

**Features**:
- Side-by-side diff view
- Highlight additions/deletions
- Compare across git commits
- Compare across projects (find duplicates)

---

### Custom Dashboards
**Description**: Create personalized overview pages.

**Features**:
- Drag-and-drop widgets
- Pin favorite projects
- Recent activity feed
- Quick links section
- Customizable layout

---

### Documentation Templates
**Description**: Generate new documentation from templates.

**Templates**:
- README template
- API documentation
- Architecture decision record (ADR)
- Project proposal
- Troubleshooting guide

---

### Internationalization (i18n)
**Description**: Support multiple languages.

**Features**:
- Detect document language
- Multi-language UI
- Translate documentation (via API or local)
- Language filter in search

---

### Plugin System
**Description**: Extend functionality with custom plugins.

**Features**:
- Plugin API
- Custom markdown renderers
- Custom file type handlers
- UI extensions
- Hook into scan process

---

## Suggested Priority

### High Priority (Next Iteration)
- PDF Export
- Full-Text Search
- Interactive Table of Contents
- Dark Mode
- Real-Time Updates
- Bookmarks and Favorites

### Medium Priority (Future Enhancement)
- Git Integration
- Project Statistics
- Advanced Filtering
- Multi-Format Export
- Code Block Enhancements

### Low Priority (Nice to Have)
- AI-Powered Features
- Multi-User Support
- Plugin System
- Internationalization
- Custom Dashboards

### Experimental (Research Needed)
- Jupyter Notebook Support
- Documentation Generation
- Import External Documentation
- AI Summarization

---

## Implementation Notes

### Resource Considerations
- Raspberry Pi has limited resources - prioritize lightweight features
- Avoid memory-intensive operations (large search indexes, AI models)
- Consider offloading heavy tasks (PDF generation) to queue system
- Monitor performance impact of each feature

### Incremental Development
- Add one feature at a time
- Validate each addition doesn't degrade performance
- Keep features modular and toggleable
- Document configuration options

### User Feedback
- Implement analytics to understand usage patterns
- Prioritize features based on actual needs
- Consider user surveys after MVP launch
- Iterate based on real-world usage

---

## Conclusion

This list represents potential enhancements beyond the MVP. Not all features need to be implemented - choose based on actual usage patterns and needs. The goal is a tool that's genuinely useful for daily documentation browsing, not feature bloat.

Start with the **High Priority** items that provide the most value with reasonable effort, then expand based on feedback and requirements.
