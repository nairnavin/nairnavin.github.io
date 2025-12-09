// DOM Elements
const fileItems = document.querySelectorAll('.file-item');
const tabsContainer = document.querySelector('.tabs-container');
const contentArea = document.getElementById('content-area');
const sidebar = document.querySelector('.sidebar');
const explorerIcon = document.getElementById('explorer-icon');

// State
let activeFile = 'home';
let openTabs = ['home'];
let contentCache = {};

// Set to true during development to always fetch fresh content
const DEV_MODE = true;

// Initialize
function init() {
    loadContent('home');
    setupEventListeners();
}

// Load content for a file (async)
async function loadContent(fileName) {
    activeFile = fileName;

    // Update file list active state immediately
    fileItems.forEach(item => {
        item.classList.toggle('active', item.dataset.file === fileName);
    });

    // Add tab if not exists
    if (!openTabs.includes(fileName)) {
        openTabs.push(fileName);
        renderTabs();
    } else {
        updateTabsActiveState();
    }

    // Show loading state
    contentArea.innerHTML = '<p>Loading...</p>';

    try {
        // Check cache first (skip cache in dev mode)
        if (DEV_MODE || !contentCache[fileName]) {
            // Add cache-busting query param in dev mode
            const url = DEV_MODE
                ? `content/${fileName}.json?t=${Date.now()}`
                : `content/${fileName}.json`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load content');
            contentCache[fileName] = await response.json();
        }

        // Render JSON to HTML
        contentArea.innerHTML = renderContent(fileName, contentCache[fileName]);
    } catch (error) {
        contentArea.innerHTML = `<p>Error loading content: ${error.message}</p>`;
    }
}

// Main render dispatcher
function renderContent(fileName, data) {
    switch (fileName) {
        case 'home':
            return renderHome(data);
        case 'background':
            return renderBackground(data);
        case 'blogs':
            return renderBlogs(data);
        default:
            return '<p>Unknown page</p>';
    }
}

// Security: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Parse simple markdown bold (**text**) to HTML
function parseBold(text) {
    return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// Render home page
function renderHome(data) {
    let html = `<h1>${escapeHtml(data.title)}</h1>`;

    for (const section of data.sections) {
        html += renderSection(section);
    }

    return html;
}

// Render a section based on type
function renderSection(section) {
    switch (section.type) {
        case 'about':
            return `
                <h2>${escapeHtml(section.heading)}</h2>
                <p>${escapeHtml(section.content)}</p>
            `;

        case 'list':
            return `
                <h2>${escapeHtml(section.heading)}</h2>
                <ul>${section.items.map(renderListItem).join('')}</ul>
            `;

        case 'skills':
            return `
                <h2>${escapeHtml(section.heading)}</h2>
                <div class="skills-container">
                    ${section.skills.map(skill =>
                        `<span class="skill-tag">${escapeHtml(skill)}</span>`
                    ).join('')}
                </div>
            `;

        case 'competencies':
            return `
                <h2>${escapeHtml(section.heading)}</h2>
                <p>${section.items.map(escapeHtml).join(' | ')}</p>
            `;

        case 'connect':
            return `
                <h2>${escapeHtml(section.heading)}</h2>
                <ul>${section.links.map(link =>
                    `<li><a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.platform)}</a></li>`
                ).join('')}</ul>
            `;

        default:
            return '';
    }
}

// Render list item with optional link and highlights
function renderListItem(item) {
    if (typeof item === 'string') {
        return `<li>${escapeHtml(item)}</li>`;
    }

    let html = '<li>';
    if (item.text) html += escapeHtml(item.text) + ' ';
    if (item.link) {
        html += `<a href="${escapeHtml(item.link.url)}" target="_blank">${escapeHtml(item.link.text)}</a> `;
    }
    if (item.highlights) {
        html += item.highlights.map(h => `<strong>${escapeHtml(h)}</strong>`).join(', ') + ' ';
    }
    if (item.suffix) html += escapeHtml(item.suffix) + ' ';
    if (item.highlights2) {
        html += item.highlights2.map(h => `<strong>${escapeHtml(h)}</strong>`).join(', ') + ' ';
    }
    if (item.suffix2) html += escapeHtml(item.suffix2);
    html += '</li>';

    return html;
}

// Render background page
function renderBackground(data) {
    let html = `<h1>${escapeHtml(data.title)}</h1>`;

    // Experience section
    html += `<h2>${escapeHtml(data.experience.heading)}</h2>`;
    for (const pos of data.experience.positions) {
        html += renderExperienceItem(pos);
    }

    html += '<hr>';

    // Education section
    html += `<h2>${escapeHtml(data.education.heading)}</h2>`;
    for (const deg of data.education.degrees) {
        html += renderEducationItem(deg);
    }

    html += '<hr>';

    // Certifications
    html += `<h2>${escapeHtml(data.certifications.heading)}</h2>`;
    html += `<ul>${data.certifications.items.map(cert =>
        `<li>${escapeHtml(cert.name)} - ${escapeHtml(cert.issuer)} (${escapeHtml(cert.period)})</li>`
    ).join('')}</ul>`;

    html += '<hr>';

    // Other Initiatives
    html += `<h2>${escapeHtml(data.initiatives.heading)}</h2>`;
    html += `<ul>${data.initiatives.items.map(renderInitiativeItem).join('')}</ul>`;

    return html;
}

// Render experience item with proper CSS classes
function renderExperienceItem(pos) {
    let html = `
        <div class="experience-item">
            <h3><span class="company">${escapeHtml(pos.company)}</span></h3>
            <p class="period">${escapeHtml(pos.period)} | ${escapeHtml(pos.location)}</p>
            <p class="role">${escapeHtml(pos.role)}</p>
            <ul>
    `;

    for (const highlight of pos.highlights) {
        html += `<li>${parseBold(highlight)}</li>`;
    }

    html += '</ul></div>';
    return html;
}

// Render education item
function renderEducationItem(deg) {
    let html = `<h3>${escapeHtml(deg.title)}</h3>`;
    html += `<p><strong>${escapeHtml(deg.institution)}</strong> | ${escapeHtml(deg.year)}`;
    if (deg.gpa) html += ` | GPA: ${escapeHtml(deg.gpa)}`;
    html += '</p>';
    if (deg.specialization) {
        html += `<p>Specialization: ${escapeHtml(deg.specialization)}</p>`;
    }
    return html;
}

// Render initiative item
function renderInitiativeItem(item) {
    let html = `<li><strong>${escapeHtml(item.category)}`;
    if (item.period) html += ` (${escapeHtml(item.period)})`;
    html += `:</strong> ${escapeHtml(item.details)}</li>`;
    return html;
}

// Render blogs page
function renderBlogs(data) {
    let html = `<h1>${escapeHtml(data.title)}</h1>`;
    html += `<p>${escapeHtml(data.intro)}</p>`;

    // Featured link card
    html += `
        <a href="${escapeHtml(data.featuredLink.url)}" target="_blank" class="blog-link-card">
            <h3>${escapeHtml(data.featuredLink.title)}</h3>
            <p>${escapeHtml(data.featuredLink.description)}</p>
        </a>
    `;

    // Topics
    html += `<h2>${escapeHtml(data.topics.heading)}</h2>`;
    html += '<ul>';
    for (const topic of data.topics.items) {
        html += `<li><strong>${escapeHtml(topic.category)}:</strong> ${escapeHtml(topic.description)}</li>`;
    }
    html += '</ul>';

    // Speaking topics
    html += `<h2>${escapeHtml(data.speakingTopics.heading)}</h2>`;
    html += '<ul>';
    for (const talk of data.speakingTopics.items) {
        html += `<li><strong>${escapeHtml(talk.event)}:</strong> ${escapeHtml(talk.topic)}</li>`;
    }
    html += '</ul>';

    html += '<hr>';

    // Footer
    html += `<p>${escapeHtml(data.footer.text)} <a href="${escapeHtml(data.footer.link.url)}" target="_blank">${escapeHtml(data.footer.link.text)}</a> ${escapeHtml(data.footer.suffix)}</p>`;

    return html;
}

// Render tabs
function renderTabs() {
    tabsContainer.innerHTML = openTabs.map(file => `
        <div class="tab ${file === activeFile ? 'active' : ''}" data-file="${file}">
            <svg class="tab-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 4.5V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2h5.5L14 4.5zm-3 0A1.5 1.5 0 019.5 3V1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4.5h-2z"/>
            </svg>
            <span>${file}.md</span>
            <button class="tab-close" data-file="${file}">&times;</button>
        </div>
    `).join('');

    // Add tab event listeners
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                loadContent(tab.dataset.file);
            }
        });
    });

    // Add close button event listeners
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(btn.dataset.file);
        });
    });
}

// Update tabs active state without re-rendering
function updateTabsActiveState() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.file === activeFile);
    });
}

// Close a tab
function closeTab(fileName) {
    const index = openTabs.indexOf(fileName);
    if (index > -1 && openTabs.length > 1) {
        openTabs.splice(index, 1);

        // If closing active tab, switch to another
        if (fileName === activeFile) {
            const newActive = openTabs[Math.min(index, openTabs.length - 1)];
            loadContent(newActive);
        }

        renderTabs();
    }
}

// Setup event listeners
function setupEventListeners() {
    // File item clicks
    fileItems.forEach(item => {
        item.addEventListener('click', () => {
            loadContent(item.dataset.file);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Explorer icon toggle for mobile
    explorerIcon.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !explorerIcon.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
