document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const themeToggle = document.getElementById('themeToggle');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (moonIcon && sunIcon) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'none';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            }
        });
    }

    // Initialize public page specific functions
    if (document.getElementById('assetsGrid')) {
        fetchAssets();
    }
});

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function renderSkeletons() {
    const grid = document.getElementById('assetsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        grid.innerHTML += `
            <div class="card skeleton skeleton-card" style="box-shadow: none;">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
                <div style="margin-top: auto; display: flex; gap: 1rem;">
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `;
    }
}

async function fetchAssets() {
    renderSkeletons();

    try {
        const response = await fetch('/api/files');
        if (!response.ok) throw new Error('Failed to fetch assets');

        const files = await response.json();
        const grid = document.getElementById('assetsGrid');

        if (!grid) return;

        grid.innerHTML = '';

        if (files.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: #64748b;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <h3>No assets available</h3>
                    <p>Check back later for new uploads.</p>
                </div>
            `;
            return;
        }

        files.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.05}s`;

            card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title" title="${file.name}">${file.name}</h3>
                </div>
                <div class="card-desc">${file.description || '<em style="color:#94a3b8">No description provided.</em>'}</div>
                <div class="card-meta">
                    <span>${formatBytes(file.size)}</span>
                    <span>${formatDate(file.uploadDate)}</span>
                </div>
                <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between;">
                    <span class="badge badge-open">OPEN</span>
                    <button class="btn btn-primary" onclick="downloadFile('${file._id || file.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        showToast('Failed to load assets', 'error');
        const grid = document.getElementById('assetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--danger-color);">
                    <p>Failed to load assets. Please try again later.</p>
                </div>
            `;
        }
    }
}

function downloadFile(id) {
    window.location.href = `/api/files/${id}/download`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
