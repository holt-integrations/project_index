/**
 * Project Viewer - Frontend JavaScript
 */

// API base URL (change this if deploying to different host)
const API_BASE = window.location.origin;

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

/**
 * Render the project list on index.html
 */
function renderProjects(manifest) {
    const container = document.getElementById('projects-container');

    if (!container) return;

    // Update stats
    document.getElementById('project-count').textContent = manifest.project_count;
    document.getElementById('document-count').textContent = manifest.document_count;
    document.getElementById('scan-time').textContent = `Last scanned: ${formatRelativeTime(manifest.scan_time)}`;

    // Clear loading message
    container.innerHTML = '';

    // Sort projects by document count (descending)
    const sortedProjects = [...manifest.projects].sort((a, b) =>
        b.document_count - a.document_count
    );

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
 * Convert markdown to HTML (basic implementation)
 * In Phase 4, this will be replaced with a proper library
 */
function renderMarkdown(content) {
    // For now, just wrap in a pre tag to preserve formatting
    // This will be enhanced in Phase 4 with marked.js
    const pre = document.createElement('pre');
    pre.className = 'markdown-preview';
    pre.textContent = content;
    return pre;
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

        // Update breadcrumb
        if (breadcrumbEl) {
            breadcrumbEl.innerHTML = `
                <span class="breadcrumb-item">${projectId || 'Project'}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${doc.name}</span>
            `;
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

        // Set up refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Scanning...';

                try {
                    await triggerScan();
                    const newManifest = await fetchManifest();
                    renderProjects(newManifest);
                } catch (error) {
                    showError(`Failed to refresh: ${error.message}`);
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = 'Refresh';
                }
            });
        }

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
