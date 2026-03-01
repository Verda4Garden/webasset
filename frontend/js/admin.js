// Utility Functions
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

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global state
let currentToken = localStorage.getItem('adminToken');

document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const themeToggle = document.getElementById('themeToggle');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }

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

    // Event Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('btnLogout').addEventListener('click', logout);
    document.getElementById('btnUpload').addEventListener('click', () => showModal('uploadModal'));
    document.getElementById('uploadModalClose').addEventListener('click', () => hideModal('uploadModal'));
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    // File dropzone
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const btnRemoveFile = document.getElementById('btnRemoveFile');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection();
        }
    });

    fileInput.addEventListener('change', handleFileSelection);
    btnRemoveFile.addEventListener('click', clearFileSelection);

    // Initial check
    checkAuth();
});

// Authentication
function checkAuth() {
    if (currentToken) {
        document.getElementById('loginFormContainer').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('btnLogout').style.display = 'inline-flex';
        fetchAdminAssets();
    } else {
        document.getElementById('loginFormContainer').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('btnLogout').style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const loginText = document.getElementById('loginText');
    const spinner = document.getElementById('loginSpinner');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    loginText.style.display = 'none';
    spinner.style.display = 'inline-block';
    btn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentToken = data.token;
            localStorage.setItem('adminToken', currentToken);
            showToast('Login successful');
            e.target.reset();
            checkAuth();
        } else {
            if (response.status === 429) {
                showToast('Too many login attempts, please try again later', 'error');
            } else {
                showToast(data.message || 'Login failed', 'error');
            }
        }
    } catch (err) {
        showToast('Network error occurred', 'error');
    } finally {
        loginText.style.display = 'inline-block';
        spinner.style.display = 'none';
        btn.disabled = false;
    }
}

function logout() {
    currentToken = null;
    localStorage.removeItem('adminToken');
    checkAuth();
    showToast('Logged out successfully');
}

// Ensure fetch handles 401 Unauthorized globally
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${currentToken}`;

    const response = await fetch(url, options);

    if (response.status === 401) {
        logout();
        showToast('Session expired, please login again', 'error');
        throw new Error('Unauthorized');
    }

    return response;
}

// Fetch and display admin assets
async function fetchAdminAssets() {
    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="spinner" style="border-top-color: var(--primary-color);"></div> Loading...</td></tr>';

    try {
        const response = await fetchWithAuth('/api/files/all');
        const files = await response.json();

        if (files.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            <h3>No assets found</h3>
                            <p>Upload your first asset to see it here.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        files.forEach(file => {
            const fileId = file._id || file.id;
            const tr = document.createElement('tr');
            const statusClass = file.status === 'OPEN' ? 'badge-open' : 'badge-closed';

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${file.name}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">ID: ${fileId}</div>
                </td>
                <td>${file.originalName}</td>
                <td>${formatBytes(file.size)}</td>
                <td><span class="badge ${statusClass}">${file.status}</span></td>
                <td>${formatDate(file.uploadDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="toggleStatus('${fileId}', '${file.status === 'OPEN' ? 'CLOSED' : 'OPEN'}')" title="Toggle Status">
                            ${file.status === 'OPEN' ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'}
                        </button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="adminDownload('${fileId}')" title="Download">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </button>
                        <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="confirmDelete('${fileId}')" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error loading files.</td></tr>';
            showToast('Failed to fetch assets', 'error');
        }
    }
}

// Upload Handling
function handleFileSelection() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('selectedFile').style.display = 'flex';
        document.getElementById('selectedFileName').textContent = `${file.name} (${formatBytes(file.size)})`;
        document.getElementById('btnSubmitUpload').disabled = false;

        // Auto-fill name if empty
        if (!document.getElementById('assetName').value) {
            document.getElementById('assetName').value = file.name.split('.')[0];
        }
    }
}

function clearFileSelection() {
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('selectedFile').style.display = 'none';
    document.getElementById('btnSubmitUpload').disabled = true;
}

async function handleUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', document.getElementById('assetName').value);
    formData.append('description', document.getElementById('assetDescription').value);
    formData.append('status', document.getElementById('assetStatus').value);

    const btnSubmit = document.getElementById('btnSubmitUpload');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner" style="width: 16px; height: 16px;"></span> Uploading...';

    try {
        const response = await fetchWithAuth('/api/files/upload', {
            method: 'POST',
            body: formData // No Content-Type header needed for FormData handled by browser
        });

        const data = await response.json();

        if (response.ok) {
            showToast('File uploaded successfully');
            hideModal('uploadModal');
            document.getElementById('uploadForm').reset();
            clearFileSelection();
            fetchAdminAssets();
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    } catch (err) {
        if (err.message !== 'Unauthorized') showToast('Network error during upload', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Upload';
    }
}

// Actions
async function toggleStatus(id, newStatus) {
    try {
        const response = await fetchWithAuth(`/api/files/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast(`Asset status changed to ${newStatus}`);
            fetchAdminAssets();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to update status', 'error');
        }
    } catch (err) {
        if (err.message !== 'Unauthorized') showToast('Network error', 'error');
    }
}

let itemToDelete = null;

function confirmDelete(id) {
    itemToDelete = id;
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to delete this asset? This action cannot be undone.';
    showModal('confirmModal');

    document.getElementById('btnConfirmOk').onclick = async () => {
        hideModal('confirmModal');
        await deleteAsset(itemToDelete);
    };

    document.getElementById('btnConfirmCancel').onclick = () => {
        hideModal('confirmModal');
        itemToDelete = null;
    };
}

async function deleteAsset(id) {
    try {
        const response = await fetchWithAuth(`/api/files/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Asset deleted successfully');
            fetchAdminAssets();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to delete asset', 'error');
        }
    } catch (err) {
        if (err.message !== 'Unauthorized') showToast('Network error', 'error');
    }
}

function adminDownload(id) {
    // Pass token as query param so server can verify download for closed files
    window.open(`/api/files/${id}/download?token=${currentToken}`, '_blank');
}

// Modal Config
function showModal(id) {
    document.getElementById(id).classList.add('active');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('active');
}
