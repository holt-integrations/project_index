/**
 * Project Viewer - Frontend JavaScript
 */

// API base URL (change this if deploying to different host)
const API_BASE = window.location.origin;

/**
 * Dark Mode Management
 */
function initTheme() {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme, or fall back to system preference
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
    updateHighlightTheme(theme);
}

function updateThemeIcon(theme) {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');

    if (!lightIcon || !darkIcon) return;

    if (theme === 'dark') {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    } else {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // Update DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);
    updateHighlightTheme(newTheme);

    // Save preference
    localStorage.setItem('theme', newTheme);
}

function updateHighlightTheme(theme) {
    const lightTheme = document.getElementById('highlight-light');
    const darkTheme = document.getElementById('highlight-dark');

    if (!lightTheme || !darkTheme) return;

    if (theme === 'dark') {
        lightTheme.disabled = true;
        darkTheme.disabled = false;
    } else {
        lightTheme.disabled = false;
        darkTheme.disabled = true;
    }
}

// Initialize theme immediately
initTheme();

// Set up theme toggle button
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

/**
 * Bookmarks Management
 */

// Bookmark data structure:
// {
//   path: string (unique identifier),
//   projectId: string,
//   name: string,
//   added: timestamp,
//   collection: string (optional)
// }

function getBookmarks() {
    const stored = localStorage.getItem('bookmarks');
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing bookmarks:', e);
        return [];
    }
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('bookmarksChanged', { detail: bookmarks }));
}

function addBookmark(path, projectId, name, collection = null) {
    const bookmarks = getBookmarks();

    // Check if already bookmarked
    if (bookmarks.some(b => b.path === path)) {
        return false;
    }

    const bookmark = {
        path,
        projectId,
        name,
        added: new Date().toISOString(),
        collection
    };

    bookmarks.push(bookmark);
    saveBookmarks(bookmarks);
    return true;
}

function removeBookmark(path) {
    const bookmarks = getBookmarks();
    const filtered = bookmarks.filter(b => b.path !== path);
    saveBookmarks(filtered);
}

function isBookmarked(path) {
    const bookmarks = getBookmarks();
    return bookmarks.some(b => b.path === path);
}

function toggleBookmark(path, projectId, name) {
    if (isBookmarked(path)) {
        removeBookmark(path);
        return false;
    } else {
        addBookmark(path, projectId, name);
        return true;
    }
}

function getCollections() {
    const stored = localStorage.getItem('bookmark-collections');
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing collections:', e);
        return [];
    }
}

function saveCollections(collections) {
    localStorage.setItem('bookmark-collections', JSON.stringify(collections));
}

function addCollection(name) {
    const collections = getCollections();

    // Check if collection already exists
    if (collections.some(c => c.name === name)) {
        return false;
    }

    collections.push({
        name,
        created: new Date().toISOString()
    });

    saveCollections(collections);
    return true;
}

function deleteCollection(name) {
    const collections = getCollections();
    const filtered = collections.filter(c => c.name !== name);
    saveCollections(filtered);

    // Remove collection from all bookmarks
    const bookmarks = getBookmarks();
    bookmarks.forEach(b => {
        if (b.collection === name) {
            b.collection = null;
        }
    });
    saveBookmarks(bookmarks);
}

function moveToCollection(bookmarkPath, collectionName) {
    const bookmarks = getBookmarks();
    const bookmark = bookmarks.find(b => b.path === bookmarkPath);

    if (bookmark) {
        bookmark.collection = collectionName;
        saveBookmarks(bookmarks);
    }
}

function exportBookmarks() {
    const data = {
        bookmarks: getBookmarks(),
        collections: getCollections(),
        exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importBookmarks(jsonData) {
    try {
        const data = JSON.parse(jsonData);

        if (data.bookmarks && Array.isArray(data.bookmarks)) {
            const existing = getBookmarks();

            // Merge bookmarks, avoiding duplicates
            const merged = [...existing];
            data.bookmarks.forEach(newBookmark => {
                if (!merged.some(b => b.path === newBookmark.path)) {
                    merged.push(newBookmark);
                }
            });

            saveBookmarks(merged);
        }

        if (data.collections && Array.isArray(data.collections)) {
            const existing = getCollections();

            // Merge collections, avoiding duplicates
            const merged = [...existing];
            data.collections.forEach(newCollection => {
                if (!merged.some(c => c.name === newCollection.name)) {
                    merged.push(newCollection);
                }
            });

            saveCollections(merged);
        }

        return true;
    } catch (e) {
        console.error('Error importing bookmarks:', e);
        return false;
    }
}

/**
 * Fetch manifest data from the API
 */
async function fetchManifest() {
    try {
        const response = await fetch(`${API_BASE}/api/manifest`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const manifest = await response.json();
        return manifest;
    } catch (error) {
        console.error('Error fetching manifest:', error);
        throw error;
    }
}

/**
 * Fetch a specific document's content
 */
async function fetchDocument(path) {
    try {
        const response = await fetch(`${API_BASE}/api/document?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const document = await response.json();
        return document;
    } catch (error) {
        console.error('Error fetching document:', error);
        throw error;
    }
}

/**
 * Trigger a manual scan
 */
async function triggerScan() {
    try {
        const response = await fetch(`${API_BASE}/api/scan`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error triggering scan:', error);
        throw error;
    }
}

/**
 * Format date string for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
}

/**
 * Show error message
 */
function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Hide error message
 */
function hideError() {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// Store the current manifest globally for search and sort
let currentManifest = null;
let currentSearchQuery = '';
let currentSortOption = 'documents-desc';

/**
 * Sort projects based on the selected option
 */
function sortProjects(projects, sortOption) {
    const sorted = [...projects];

    switch (sortOption) {
        case 'documents-desc':
            return sorted.sort((a, b) => b.document_count - a.document_count);
        case 'documents-asc':
            return sorted.sort((a, b) => a.document_count - b.document_count);
        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'modified-desc':
            return sorted.sort((a, b) => {
                const aTime = a.last_modified ? new Date(a.last_modified) : new Date(0);
                const bTime = b.last_modified ? new Date(b.last_modified) : new Date(0);
                return bTime - aTime;
            });
        case 'modified-asc':
            return sorted.sort((a, b) => {
                const aTime = a.last_modified ? new Date(a.last_modified) : new Date(0);
                const bTime = b.last_modified ? new Date(b.last_modified) : new Date(0);
                return aTime - bTime;
            });
        default:
            return sorted;
    }
}

/**
 * Filter projects and documents based on search query
 */
function filterProjects(projects, query) {
    if (!query || query.trim() === '') {
        return projects;
    }

    const lowerQuery = query.toLowerCase();

    return projects
        .map(project => {
            // Check if project name matches
            const projectMatches = project.name.toLowerCase().includes(lowerQuery);

            // Filter documents that match
            const matchedDocuments = project.documents.filter(doc =>
                doc.name.toLowerCase().includes(lowerQuery) ||
                doc.relative_path.toLowerCase().includes(lowerQuery)
            );

            // Include project if name matches OR has matching documents
            if (projectMatches || matchedDocuments.length > 0) {
                return {
                    ...project,
                    documents: projectMatches ? project.documents : matchedDocuments,
                    document_count: projectMatches ? project.document_count : matchedDocuments.length
                };
            }

            return null;
        })
        .filter(project => project !== null);
}

/**
 * Update search results display
 */
function updateSearchResults(filteredProjects, totalProjects, query) {
    const resultsEl = document.getElementById('search-results');
    const resultsCountEl = document.getElementById('results-count');

    if (!resultsEl || !resultsCountEl) return;

    if (query && query.trim() !== '') {
        const projectCount = filteredProjects.length;
        const documentCount = filteredProjects.reduce((sum, p) => sum + p.document_count, 0);

        resultsCountEl.textContent = `Found ${projectCount} project${projectCount !== 1 ? 's' : ''} and ${documentCount} document${documentCount !== 1 ? 's' : ''} matching "${query}"`;
        resultsEl.style.display = 'block';
    } else {
        resultsEl.style.display = 'none';
    }
}

/**
 * Render the project list on index.html
 */
function renderProjects(manifest, searchQuery = '', sortOption = 'documents-desc') {
    const container = document.getElementById('projects-container');

    if (!container) return;

    // Store current manifest
    currentManifest = manifest;
    currentSearchQuery = searchQuery;
    currentSortOption = sortOption;

    // Update stats (always show totals)
    document.getElementById('project-count').textContent = manifest.project_count;
    document.getElementById('document-count').textContent = manifest.document_count;
    document.getElementById('scan-time').textContent = `Last scanned: ${formatRelativeTime(manifest.scan_time)}`;

    // Filter projects based on search query
    let filteredProjects = filterProjects(manifest.projects, searchQuery);

    // Update search results display
    updateSearchResults(filteredProjects, manifest.projects.length, searchQuery);

    // Sort projects
    const sortedProjects = sortProjects(filteredProjects, sortOption);

    // Clear loading message
    container.innerHTML = '';

    // Show message if no results
    if (sortedProjects.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <p>No projects or documents found${searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
        `;
        container.appendChild(noResults);
        return;
    }

    // Render each project
    sortedProjects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';

        const projectHeader = document.createElement('div');
        projectHeader.className = 'project-header';

        const projectTitle = document.createElement('h2');
        projectTitle.className = 'project-title';
        projectTitle.textContent = project.name;

        const projectMeta = document.createElement('div');
        projectMeta.className = 'project-meta';
        projectMeta.innerHTML = `
            <span>${project.document_count} document${project.document_count !== 1 ? 's' : ''}</span>
            ${project.last_modified ? `<span>Updated ${formatRelativeTime(project.last_modified)}</span>` : ''}
        `;

        projectHeader.appendChild(projectTitle);
        projectHeader.appendChild(projectMeta);

        if (project.description) {
            const projectDesc = document.createElement('p');
            projectDesc.className = 'project-description';
            projectDesc.textContent = project.description;
            projectCard.appendChild(projectHeader);
            projectCard.appendChild(projectDesc);
        } else {
            projectCard.appendChild(projectHeader);
        }

        // Render documents list
        if (project.documents.length > 0) {
            const docsList = document.createElement('ul');
            docsList.className = 'documents-list';

            project.documents.forEach(doc => {
                const docItem = document.createElement('li');
                docItem.className = 'document-item';

                const docLink = document.createElement('a');
                docLink.href = `/viewer.html?path=${encodeURIComponent(doc.path)}&project=${encodeURIComponent(project.id)}`;
                docLink.className = 'document-link';

                const docName = document.createElement('span');
                docName.className = 'document-name';
                docName.textContent = doc.name;

                // Add bookmark indicator if bookmarked
                if (isBookmarked(doc.path)) {
                    const bookmarkIcon = document.createElement('svg');
                    bookmarkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    bookmarkIcon.setAttribute('width', '14');
                    bookmarkIcon.setAttribute('height', '14');
                    bookmarkIcon.setAttribute('fill', 'currentColor');
                    bookmarkIcon.setAttribute('viewBox', '0 0 24 24');
                    bookmarkIcon.setAttribute('stroke', 'currentColor');
                    bookmarkIcon.className = 'bookmark-indicator';
                    bookmarkIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />';
                    docName.appendChild(bookmarkIcon);
                }

                const docPath = document.createElement('span');
                docPath.className = 'document-path';
                docPath.textContent = doc.relative_path;

                docLink.appendChild(docName);
                docLink.appendChild(docPath);
                docItem.appendChild(docLink);
                docsList.appendChild(docItem);
            });

            projectCard.appendChild(docsList);
        }

        container.appendChild(projectCard);
    });
}

/**
 * Configure Mermaid
 */
function initMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
        });
    }
}

/**
 * Configure marked.js with syntax highlighting
 */
function configureMarked() {
    if (typeof marked === 'undefined') return;

    // Configure marked to use highlight.js for code blocks
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                    console.error('Highlighting error:', err);
                }
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true, // GitHub Flavored Markdown
    });
}

/**
 * Render mermaid diagrams in the container
 */
async function renderMermaidDiagrams(container) {
    if (typeof mermaid === 'undefined') return;

    const mermaidBlocks = container.querySelectorAll('code.language-mermaid');

    for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const code = block.textContent;
        const id = `mermaid-${Date.now()}-${i}`;

        try {
            const { svg } = await mermaid.render(id, code);
            const div = document.createElement('div');
            div.className = 'mermaid-diagram';
            div.innerHTML = svg;

            // Replace the code block with the rendered diagram
            block.parentElement.replaceWith(div);
        } catch (err) {
            console.error('Mermaid rendering error:', err);
            // Leave the code block as-is if rendering fails
        }
    }
}

/**
 * Convert markdown to HTML with syntax highlighting and diagrams
 */
function renderMarkdown(content) {
    // Initialize libraries if not already done
    configureMarked();
    initMermaid();

    if (typeof marked === 'undefined') {
        // Fallback if marked.js didn't load
        const pre = document.createElement('pre');
        pre.className = 'markdown-preview';
        pre.textContent = content;
        return pre;
    }

    // Create container
    const div = document.createElement('div');
    div.className = 'markdown-body';

    try {
        // Parse markdown to HTML
        div.innerHTML = marked.parse(content);

        // Render mermaid diagrams asynchronously
        renderMermaidDiagrams(div);

    } catch (err) {
        console.error('Markdown rendering error:', err);
        div.innerHTML = `<pre>${content}</pre>`;
    }

    return div;
}

/**
 * Table of Contents (TOC) Management
 */

// Generate a slug from heading text for IDs
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes === 1 ? '1 min' : `${minutes} mins`;
}

// Extract headings from the document container
function extractHeadings(container) {
    const headings = [];
    const headingElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headingElements.forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        const text = heading.textContent.trim();
        const slug = generateSlug(text);

        // Add unique ID to heading if it doesn't have one
        if (!heading.id) {
            heading.id = slug || `heading-${index}`;
        }

        // Get text content until next heading of same or higher level
        let nextElement = heading.nextElementSibling;
        let sectionText = '';

        while (nextElement) {
            const isHeading = /^H[1-6]$/.test(nextElement.tagName);
            if (isHeading) {
                const nextLevel = parseInt(nextElement.tagName.substring(1));
                if (nextLevel <= level) break;
            }
            sectionText += nextElement.textContent + ' ';
            nextElement = nextElement.nextElementSibling;
        }

        headings.push({
            id: heading.id,
            level,
            text,
            readingTime: calculateReadingTime(sectionText),
            element: heading
        });
    });

    return headings;
}

// Build hierarchical TOC structure
function buildTocHierarchy(headings) {
    const root = { children: [] };
    const stack = [root];

    headings.forEach(heading => {
        const item = { ...heading, children: [] };

        // Pop stack until we find the right parent
        while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }

        // Add to parent's children
        stack[stack.length - 1].children.push(item);
        stack.push(item);
    });

    return root.children;
}

// Render TOC HTML
function renderTocItem(item, parentCollapsed = false) {
    const hasChildren = item.children && item.children.length > 0;
    const li = document.createElement('li');
    li.className = 'toc-item';
    li.setAttribute('data-level', item.level);

    const link = document.createElement('a');
    link.href = `#${item.id}`;
    link.className = 'toc-link';
    link.setAttribute('data-target', item.id);

    const textSpan = document.createElement('span');
    textSpan.className = 'toc-text';
    textSpan.textContent = item.text;
    link.appendChild(textSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'toc-time';
    timeSpan.textContent = item.readingTime;
    link.appendChild(timeSpan);

    li.appendChild(link);

    // Add collapse toggle if has children
    if (hasChildren) {
        const toggle = document.createElement('button');
        toggle.className = 'toc-collapse-toggle';
        toggle.innerHTML = '▼';
        toggle.setAttribute('aria-label', 'Toggle section');

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            li.classList.toggle('collapsed');
        });

        li.appendChild(toggle);

        const childList = document.createElement('ul');
        childList.className = 'toc-list';

        item.children.forEach(child => {
            childList.appendChild(renderTocItem(child));
        });

        li.appendChild(childList);
    }

    return li;
}

// Generate and display TOC
function generateTOC(container) {
    const tocNav = document.getElementById('toc-nav');
    const tocSidebar = document.getElementById('toc-sidebar');

    if (!tocNav || !container) return;

    // Extract headings
    const headings = extractHeadings(container);

    // If no headings, hide TOC
    if (headings.length === 0) {
        if (tocSidebar) tocSidebar.style.display = 'none';
        return;
    }

    // Build hierarchy
    const hierarchy = buildTocHierarchy(headings);

    // Render TOC
    tocNav.innerHTML = '';
    const rootList = document.createElement('ul');
    rootList.className = 'toc-list toc-root';

    hierarchy.forEach(item => {
        rootList.appendChild(renderTocItem(item));
    });

    tocNav.appendChild(rootList);

    // Show TOC if we have headings
    if (tocSidebar) {
        tocSidebar.style.display = 'block';
    }

    // Set up smooth scrolling
    setupTocScrolling();

    // Set up scroll spy
    setupScrollSpy(headings);
}

// Setup smooth scrolling for TOC links
function setupTocScrolling() {
    const tocLinks = document.querySelectorAll('.toc-link');

    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update active state
                document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

// Setup scroll spy to highlight current section
function setupScrollSpy(headings) {
    let ticking = false;

    function updateActiveSection() {
        const scrollPosition = window.scrollY + 100; // Offset for header

        // Find the current section
        let currentHeading = null;
        for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i];
            if (heading.element.offsetTop <= scrollPosition) {
                currentHeading = heading;
                break;
            }
        }

        // Update active states
        document.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });

        if (currentHeading) {
            const activeLink = document.querySelector(`.toc-link[data-target="${currentHeading.id}"]`);
            if (activeLink) {
                activeLink.classList.add('active');

                // Scroll TOC to show active item
                activeLink.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateActiveSection();
            });
            ticking = true;
        }
    });

    // Initial update
    updateActiveSection();
}

// Toggle TOC sidebar
function toggleTOC() {
    const tocSidebar = document.getElementById('toc-sidebar');
    if (tocSidebar) {
        const isVisible = tocSidebar.classList.contains('visible');
        if (isVisible) {
            tocSidebar.classList.remove('visible');
        } else {
            tocSidebar.classList.add('visible');
        }
    }
}

/**
 * Code Block Enhancements
 */

// Main function to enhance all code blocks
function enhanceCodeBlocks(container) {
    if (!container) return;

    const codeBlocks = container.querySelectorAll('pre code');

    codeBlocks.forEach((codeElement, index) => {
        const pre = codeElement.parentElement;
        if (!pre || pre.classList.contains('enhanced')) return;

        // Mark as enhanced to avoid duplicate processing
        pre.classList.add('enhanced');

        // Wrap in container
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-container';
        pre.parentNode.insertBefore(wrapper, pre);

        // Create header
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // Add language badge
        const language = getCodeLanguage(codeElement);
        if (language) {
            const badge = document.createElement('span');
            badge.className = 'code-language-badge';
            badge.textContent = language;
            header.appendChild(badge);
        }

        // Add copy button
        const copyBtn = createCopyButton(codeElement);
        header.appendChild(copyBtn);

        wrapper.appendChild(header);

        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'code-block-content';

        // Add line numbers
        const lineNumbersDiv = createLineNumbers(codeElement);
        contentContainer.appendChild(lineNumbersDiv);

        // Move pre into content container
        contentContainer.appendChild(pre);
        wrapper.appendChild(contentContainer);

        // Add code folding if needed
        const lineCount = codeElement.textContent.split('\n').length;
        if (lineCount > 30) {
            addCodeFolding(wrapper, lineCount);
        }

        // Sync scroll between line numbers and code
        setupScrollSync(pre, lineNumbersDiv);
    });

    // Setup line highlighting from URL
    setupLineHighlighting(container);
}

// Get language from code element
function getCodeLanguage(codeElement) {
    // Check for language class (e.g., language-javascript, js, javascript)
    const classes = codeElement.className.split(' ');
    for (const cls of classes) {
        if (cls.startsWith('language-')) {
            return formatLanguageName(cls.substring(9));
        }
        if (cls.startsWith('hljs-')) continue; // Skip highlight.js classes
        if (cls.length > 0 && cls !== 'hljs') {
            return formatLanguageName(cls);
        }
    }
    return null;
}

// Format language name for display
function formatLanguageName(lang) {
    const names = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'py': 'Python',
        'python': 'Python',
        'rb': 'Ruby',
        'ruby': 'Ruby',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'cs': 'C#',
        'csharp': 'C#',
        'php': 'PHP',
        'go': 'Go',
        'rust': 'Rust',
        'swift': 'Swift',
        'kotlin': 'Kotlin',
        'bash': 'Bash',
        'sh': 'Shell',
        'shell': 'Shell',
        'sql': 'SQL',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'xml': 'XML',
        'yaml': 'YAML',
        'yml': 'YAML',
        'md': 'Markdown',
        'markdown': 'Markdown',
    };
    return names[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

// Create copy button
function createCopyButton(codeElement) {
    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.setAttribute('aria-label', 'Copy code');
    button.title = 'Copy code';

    // Copy icon SVG
    button.innerHTML = `
        <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <svg class="check-icon" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;

    button.addEventListener('click', () => {
        copyCodeToClipboard(codeElement, button);
    });

    return button;
}

// Copy code to clipboard
async function copyCodeToClipboard(codeElement, button) {
    const code = codeElement.textContent;

    try {
        // Try modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
            showCopyFeedback(button, true);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            showCopyFeedback(button, success);
        }
    } catch (err) {
        console.error('Failed to copy code:', err);
        showCopyFeedback(button, false);
    }
}

// Show copy feedback
function showCopyFeedback(button, success) {
    const copyIcon = button.querySelector('.copy-icon');
    const checkIcon = button.querySelector('.check-icon');

    if (!copyIcon || !checkIcon) return;

    if (success) {
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
        button.classList.add('copied');
        button.title = 'Copied!';

        setTimeout(() => {
            copyIcon.style.display = 'block';
            checkIcon.style.display = 'none';
            button.classList.remove('copied');
            button.title = 'Copy code';
        }, 2000);
    } else {
        button.title = 'Copy failed';
        setTimeout(() => {
            button.title = 'Copy code';
        }, 2000);
    }
}

// Create line numbers
function createLineNumbers(codeElement) {
    const code = codeElement.textContent;
    const lines = code.split('\n');
    const lineCount = lines.length;

    const lineNumbersDiv = document.createElement('div');
    lineNumbersDiv.className = 'line-numbers';
    lineNumbersDiv.setAttribute('aria-hidden', 'true');

    // Create line number elements
    for (let i = 1; i <= lineCount; i++) {
        const lineNum = document.createElement('span');
        lineNum.className = 'line-number';
        lineNum.textContent = i;
        lineNum.setAttribute('data-line', i);

        // Click to highlight line
        lineNum.addEventListener('click', () => {
            toggleLineHighlight(i);
        });

        lineNumbersDiv.appendChild(lineNum);
    }

    return lineNumbersDiv;
}

// Setup scroll synchronization
function setupScrollSync(pre, lineNumbersDiv) {
    pre.addEventListener('scroll', () => {
        lineNumbersDiv.scrollTop = pre.scrollTop;
    });
}

// Add code folding
function addCodeFolding(wrapper, lineCount) {
    const foldButton = document.createElement('button');
    foldButton.className = 'code-fold-toggle';
    foldButton.setAttribute('aria-expanded', 'true');

    const hiddenLines = lineCount - 10;
    foldButton.innerHTML = `
        <span class="fold-expand">Show ${hiddenLines} more lines</span>
        <span class="fold-collapse" style="display: none;">Collapse</span>
    `;

    wrapper.appendChild(foldButton);

    foldButton.addEventListener('click', () => {
        const isExpanded = wrapper.classList.toggle('code-folded');
        foldButton.setAttribute('aria-expanded', !isExpanded);

        const expandText = foldButton.querySelector('.fold-expand');
        const collapseText = foldButton.querySelector('.fold-collapse');

        if (isExpanded) {
            expandText.style.display = 'inline';
            collapseText.style.display = 'none';
        } else {
            expandText.style.display = 'none';
            collapseText.style.display = 'inline';
        }
    });

    // Start collapsed
    wrapper.classList.add('code-folded');
}

// Line highlighting from URL
function setupLineHighlighting(container) {
    const hash = window.location.hash;
    if (!hash.startsWith('#L')) return;

    const lines = parseLineRange(hash);
    if (lines.length === 0) return;

    highlightLines(container, lines);

    // Scroll to first highlighted line
    const firstLine = container.querySelector(`.line-number[data-line="${lines[0]}"]`);
    if (firstLine) {
        setTimeout(() => {
            firstLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// Parse line range from hash (e.g., #L10 or #L10-L15)
function parseLineRange(hash) {
    const match = hash.match(/^#L(\d+)(?:-L(\d+))?$/);
    if (!match) return [];

    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;

    const lines = [];
    for (let i = start; i <= end; i++) {
        lines.push(i);
    }
    return lines;
}

// Highlight specific lines
function highlightLines(container, lines) {
    // Remove existing highlights
    container.querySelectorAll('.line-highlight').forEach(el => {
        el.classList.remove('line-highlight');
    });

    // Add highlights
    lines.forEach(lineNum => {
        const lineElement = container.querySelector(`.line-number[data-line="${lineNum}"]`);
        if (lineElement) {
            lineElement.classList.add('line-highlight');

            // Also highlight the corresponding code line
            // This requires matching the line number to the code
            const pre = lineElement.closest('.code-block-container')?.querySelector('pre');
            if (pre) {
                // Add data attribute for CSS targeting
                lineElement.style.backgroundColor = 'var(--highlight-line-bg)';
            }
        }
    });
}

// Toggle line highlight (click line number)
function toggleLineHighlight(lineNum) {
    const hash = window.location.hash;
    const currentLines = parseLineRange(hash);

    let newHash;
    if (currentLines.includes(lineNum)) {
        // Remove this line
        const filtered = currentLines.filter(l => l !== lineNum);
        if (filtered.length === 0) {
            newHash = '';
        } else if (filtered.length === 1) {
            newHash = `#L${filtered[0]}`;
        } else {
            newHash = `#L${Math.min(...filtered)}-L${Math.max(...filtered)}`;
        }
    } else {
        // Add this line
        const allLines = [...currentLines, lineNum].sort((a, b) => a - b);
        if (allLines.length === 1) {
            newHash = `#L${allLines[0]}`;
        } else {
            newHash = `#L${Math.min(...allLines)}-L${Math.max(...allLines)}`;
        }
    }

    if (newHash === '') {
        history.pushState(null, null, window.location.pathname + window.location.search);
    } else {
        window.location.hash = newHash;
    }

    // Re-apply highlighting
    const container = document.getElementById('document-container');
    if (container) {
        setupLineHighlighting(container);
    }
}

/**
 * Load and display a document
 */
async function loadDocument(path, projectId) {
    const container = document.getElementById('document-container');
    const breadcrumbEl = document.getElementById('breadcrumb');

    if (!container) return;

    try {
        hideError();

        // Fetch document
        const doc = await fetchDocument(path);

        // Update breadcrumb with full path
        if (breadcrumbEl) {
            // Get the relative path from the manifest to show directory structure
            let breadcrumbHTML = `<span class="breadcrumb-item">${projectId || 'Project'}</span>`;

            // Parse the path to show directory structure
            const pathParts = path.split('/');
            const projectIndex = pathParts.findIndex(part => part === projectId);

            if (projectIndex !== -1) {
                // Show directories after the project name
                const relativeParts = pathParts.slice(projectIndex + 1);

                relativeParts.forEach((part, index) => {
                    breadcrumbHTML += `<span class="breadcrumb-separator">›</span>`;

                    // Last part is the file, others are directories
                    if (index === relativeParts.length - 1) {
                        breadcrumbHTML += `<span class="breadcrumb-item breadcrumb-file">${part}</span>`;
                    } else {
                        breadcrumbHTML += `<span class="breadcrumb-item breadcrumb-dir">${part}</span>`;
                    }
                });
            } else {
                // Fallback if we can't parse the path
                breadcrumbHTML += `<span class="breadcrumb-separator">›</span>`;
                breadcrumbHTML += `<span class="breadcrumb-item">${doc.name}</span>`;
            }

            breadcrumbEl.innerHTML = breadcrumbHTML;
        }

        // Update page title
        document.title = `${doc.name} - Project Viewer`;

        // Clear container
        container.innerHTML = '';

        // Render markdown content
        const rendered = renderMarkdown(doc.content);
        container.appendChild(rendered);

        // Enhance code blocks
        enhanceCodeBlocks(rendered);

        // Generate TOC after markdown is rendered
        // Wait a bit for mermaid diagrams to render
        setTimeout(() => {
            generateTOC(rendered);
        }, 100);

    } catch (error) {
        showError(`Failed to load document: ${error.message}`);
        container.innerHTML = '';
    }
}

/**
 * Initialize the index page
 */
async function initIndexPage() {
    try {
        hideError();

        const manifest = await fetchManifest();
        renderProjects(manifest);

        // Set up search input
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search');

        if (searchInput) {
            // Debounce search input
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;

                // Show/hide clear button
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = query ? 'flex' : 'none';
                }

                // Debounce search
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (currentManifest) {
                        renderProjects(currentManifest, query, currentSortOption);
                    }
                }, 300);
            });

            // Handle keyboard shortcuts
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    if (clearSearchBtn) {
                        clearSearchBtn.style.display = 'none';
                    }
                    if (currentManifest) {
                        renderProjects(currentManifest, '', currentSortOption);
                    }
                }
            });
        }

        // Set up clear search button
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                clearSearchBtn.style.display = 'none';
                if (currentManifest) {
                    renderProjects(currentManifest, '', currentSortOption);
                }
            });
        }

        // Set up sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const sortOption = e.target.value;
                const query = searchInput ? searchInput.value : '';
                if (currentManifest) {
                    renderProjects(currentManifest, query, sortOption);
                }
            });
        }

        // Set up refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Scanning...';

                try {
                    await triggerScan();
                    const newManifest = await fetchManifest();
                    const query = searchInput ? searchInput.value : '';
                    const sortOption = sortSelect ? sortSelect.value : 'documents-desc';
                    renderProjects(newManifest, query, sortOption);
                } catch (error) {
                    showError(`Failed to refresh: ${error.message}`);
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = 'Refresh';
                }
            });
        }

        // Global keyboard shortcut: / to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && searchInput && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });

    } catch (error) {
        showError(`Failed to load projects: ${error.message}`);
        const container = document.getElementById('projects-container');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Initialize the page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check if we're on the index page
        if (document.getElementById('projects-container')) {
            initIndexPage();
        }
    });
} else {
    // DOM already loaded
    if (document.getElementById('projects-container')) {
        initIndexPage();
    }
}
