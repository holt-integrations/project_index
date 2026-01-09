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
