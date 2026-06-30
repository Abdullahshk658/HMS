// ─────────────────────────────────────────────────────────────────────────────
// Global State
// ─────────────────────────────────────────────────────────────────────────────

let allLogs = [];
let currentTab = localStorage.getItem('currentTab') || 'alerts';
let logsRefreshTimer = null;
let statsRefreshTimer = null;
let studentsLoadedOnce = false;

const API_BASE = window.location.origin;


// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function () {
    restoreFilters();

    const hashTab = getTabFromHash();

    if (hashTab) {
        currentTab = hashTab;
    }

    switchTab(currentTab, false);

    bindFilterListeners();
    monitorVideoFeed();

    loadLogs(false);
    loadStats();

    logsRefreshTimer = setInterval(() => {
        loadLogs(false);
    }, 3000);

    statsRefreshTimer = setInterval(() => {
        loadStats();
    }, 10000);
});


// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

function getTabFromHash() {
    const hash = window.location.hash.replace('#', '').trim();

    if (hash === 'students') return 'students';
    if (hash === 'alerts') return 'alerts';

    return null;
}

function switchTab(tab, updateHash = true) {
    if (!['alerts', 'students'].includes(tab)) {
        tab = 'alerts';
    }

    currentTab = tab;
    localStorage.setItem('currentTab', currentTab);

    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    const tabContent = document.getElementById('tab-' + tab);
    const tabButton = document.getElementById('btn-' + tab);

    if (tabContent) {
        tabContent.classList.add('active');
    }

    if (tabButton) {
        tabButton.classList.add('active');
    }

    if (updateHash) {
        window.location.hash = tab;
    }

    if (tab === 'students') {
        loadStudents(false);
    } else {
        renderLogsNoFlicker(allLogs);
    }
}

window.addEventListener('hashchange', function () {
    const hashTab = getTabFromHash();

    if (hashTab && hashTab !== currentTab) {
        switchTab(hashTab, false);
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────────────────────────────

function bindFilterListeners() {
    const filterIds = [
        'filterName',
        'filterTimestamp',
        'filterStatus',
        'filterAnomaly'
    ];

    filterIds.forEach(id => {
        const el = document.getElementById(id);

        if (!el) return;

        const eventName = el.tagName === 'SELECT' ? 'change' : 'input';

        el.addEventListener(eventName, function () {
            saveFilters();
            loadLogs(false);
        });
    });
}

function getFilters() {
    return {
        name: document.getElementById('filterName').value.trim(),
        timestamp: document.getElementById('filterTimestamp').value.trim(),
        status: document.getElementById('filterStatus').value,
        anomaly: document.getElementById('filterAnomaly').value
    };
}

function saveFilters() {
    localStorage.setItem('logFilters', JSON.stringify(getFilters()));
}

function restoreFilters() {
    const saved = localStorage.getItem('logFilters');

    if (!saved) return;

    try {
        const filters = JSON.parse(saved);

        document.getElementById('filterName').value = filters.name || '';
        document.getElementById('filterTimestamp').value = filters.timestamp || '';
        document.getElementById('filterStatus').value = filters.status || '';
        document.getElementById('filterAnomaly').value = filters.anomaly || '';

    } catch (err) {
        console.warn('Could not restore filters:', err);
    }
}

function resetFilters() {
    document.getElementById('filterName').value = '';
    document.getElementById('filterTimestamp').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterAnomaly').value = '';

    saveFilters();
    loadLogs(true);
}


// ─────────────────────────────────────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────────────────────────────────────

async function loadLogs(forceRender = false) {
    try {
        const filters = getFilters();

        const params = new URLSearchParams();
        params.set('limit', '100');

        if (filters.name) {
            params.set('name', filters.name);
        }

        if (filters.timestamp) {
            params.set('timestamp', filters.timestamp);
        }

        if (filters.status) {
            params.set('status', filters.status);
        }

        if (filters.anomaly !== '') {
            params.set('anomaly', filters.anomaly);
        }

        const res = await fetch(`${API_BASE}/logs?${params.toString()}`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to load logs: ${res.status}`);
        }

        const logs = await res.json();

        if (!Array.isArray(logs)) {
            throw new Error('Invalid logs response');
        }

        allLogs = logs;

        if (currentTab === 'alerts' || forceRender) {
            renderLogsNoFlicker(allLogs);
        }

    } catch (err) {
        console.error('Error loading logs:', err);

        if (currentTab === 'alerts') {
            const tbody = document.getElementById('logsTable');

            tbody.innerHTML = `
                <tr class="no-data-row">
                    <td colspan="5" class="no-data">
                        Error loading logs. Is app.py running?
                    </td>
                </tr>
            `;
        }
    }
}

function renderLogsNoFlicker(logs) {
    const tbody = document.getElementById('logsTable');

    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="5" class="no-data">No logs found</td>
            </tr>
        `;
        return;
    }

    const incomingIds = new Set(logs.map(log => String(log.id)));

    tbody.querySelectorAll('tr[data-log-id]').forEach(row => {
        if (!incomingIds.has(row.dataset.logId)) {
            row.remove();
        }
    });

    const placeholder = tbody.querySelector('.no-data-row');

    if (placeholder) {
        placeholder.remove();
    }

    const existingRows = new Map();

    tbody.querySelectorAll('tr[data-log-id]').forEach(row => {
        existingRows.set(row.dataset.logId, row);
    });

    logs.forEach((log, index) => {
        const idStr = String(log.id);

        let row = existingRows.get(idStr);

        if (!row) {
            row = document.createElement('tr');
            row.dataset.logId = idStr;
            row.innerHTML = buildLogRowHtml(log);
        } else {
            const newHtml = buildLogRowHtml(log);

            if (row.innerHTML.trim() !== newHtml.trim()) {
                row.innerHTML = newHtml;
            }
        }

        const currentRowAtPosition = tbody.children[index];

        if (currentRowAtPosition !== row) {
            tbody.insertBefore(row, currentRowAtPosition || null);
        }
    });
}

function buildLogRowHtml(log) {
    const statusClass = log.status === 'Authorized'
        ? 'status-authorized'
        : 'status-unauthorized';

    const anomalyClass = Number(log.anomaly) === 1
        ? 'anomaly-yes'
        : 'anomaly-no';

    const anomalyText = Number(log.anomaly) === 1
        ? '⚠️ Yes'
        : 'No';

    const confidence = Number(log.confidence || 0).toFixed(2);

    return `
        <td>${escapeHtml(log.name || '')}</td>
        <td>${escapeHtml(log.timestamp || '')}</td>
        <td><span class="${statusClass}">${escapeHtml(log.status || '')}</span></td>
        <td>${confidence}</td>
        <td><span class="${anomalyClass}">${anomalyText}</span></td>
    `;
}


// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to load stats: ${res.status}`);
        }

        const stats = await res.json();

        document.getElementById('stat-users').textContent =
            `Users: ${stats.total_users}`;

        document.getElementById('stat-images').textContent =
            `Images: ${stats.total_images || 0}`;

        document.getElementById('stat-logs').textContent =
            `Logs: ${stats.total_logs}`;

        document.getElementById('stat-anomalies').textContent =
            `Anomalies: ${stats.anomalies}`;

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Add User / Add Images
// ─────────────────────────────────────────────────────────────────────────────

async function addUser() {
    const name = document.getElementById('name').value.trim();
    const files = document.getElementById('images').files;

    if (!name || !files || files.length === 0) {
        showMessage('formMessage', 'Please enter name and select at least one image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);

    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    try {
        const res = await fetch(`${API_BASE}/add_user`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            showMessage(
                'formMessage',
                `✓ ${data.message}. Images added: ${data.images_added}`,
                'success'
            );

            document.getElementById('name').value = '';
            document.getElementById('images').value = '';

            await loadStats();
            await loadStudents(true);
            await loadLogs(false);

        } else {
            showMessage('formMessage', '✗ ' + (data.error || 'Unable to add student'), 'error');
        }

    } catch (err) {
        console.error(err);
        showMessage('formMessage', '✗ Error adding student', 'error');
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// CSV Import
// ─────────────────────────────────────────────────────────────────────────────

async function importCsv() {
    const file = document.getElementById('csvFile').files[0];

    if (!file) {
        showMessage('csvMessage', 'Please select a CSV file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('csv_file', file);

    try {
        showMessage('csvMessage', 'Importing CSV, please wait...', 'info');

        const res = await fetch(`${API_BASE}/import_csv`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            let msg = `✓ CSV import completed. Students: ${data.students_imported_or_updated}, Images added: ${data.images_added}`;

            if (data.skipped && data.skipped.length > 0) {
                msg += `. Skipped rows: ${data.skipped.length}`;
                console.warn('Skipped CSV rows:', data.skipped);
            }

            showMessage('csvMessage', msg, 'success');

            document.getElementById('csvFile').value = '';

            await loadStats();
            await loadStudents(true);
            await loadLogs(false);

        } else {
            showMessage('csvMessage', '✗ ' + (data.error || 'CSV import failed'), 'error');
        }

    } catch (err) {
        console.error(err);
        showMessage('csvMessage', '✗ Error importing CSV', 'error');
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────────────────────────────────────

async function loadStudents(force = false) {
    const grid = document.getElementById('studentsGrid');

    if (!grid) return;

    if (!force && studentsLoadedOnce && currentTab === 'students') {
        // do not flicker
    } else {
        grid.innerHTML = '<p class="no-data">Loading...</p>';
    }

    try {
        const res = await fetch(`${API_BASE}/users`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to load users: ${res.status}`);
        }

        const users = await res.json();

        if (!Array.isArray(users) || users.length === 0) {
            grid.innerHTML = '<p class="no-data">No students registered yet.</p>';
            studentsLoadedOnce = true;
            return;
        }

        renderStudents(users);
        studentsLoadedOnce = true;

    } catch (err) {
        console.error('Error loading students:', err);

        grid.innerHTML = `
            <p class="no-data">
                Error loading students. Is app.py running?
            </p>
        `;
    }
}

function renderStudents(users) {
    const grid = document.getElementById('studentsGrid');

    grid.innerHTML = '';

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'student-card';

        card.innerHTML = `
            <div class="student-photo-wrapper">
                <img
                    class="student-photo"
                    src="${escapeAttribute(API_BASE + user.primary_image_url)}"
                    alt="${escapeAttribute(user.name)}"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >

                <div class="student-avatar-fallback" style="display:none;">
                    ${escapeHtml(getInitial(user.name))}
                </div>
            </div>

            <div class="student-name">${escapeHtml(user.name)}</div>
            <div class="student-id">ID: ${user.id}</div>
            <div class="student-images-count">Images: ${user.image_count}</div>

            <button
                type="button"
                class="btn-delete-student"
                onclick="deleteStudent(${user.id}, '${escapeJs(user.name)}')"
            >
                🗑 Delete
            </button>
        `;

        grid.appendChild(card);
    });
}

async function deleteStudent(userId, studentName) {
    const confirmed = confirm(
        `Are you sure you want to delete "${studentName}" from the database?\n\nImages will remain in the folder, but this student will no longer be recognized.`
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/delete_user/${userId}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            alert('Student deleted successfully');

            await loadStudents(true);
            await loadStats();
            await loadLogs(false);

        } else {
            alert(data.error || 'Failed to delete student');
        }

    } catch (err) {
        console.error(err);
        alert('Error deleting student');
    }
}

function getInitial(name) {
    if (!name || !name.trim()) return '?';
    return name.trim().charAt(0).toUpperCase();
}


// ─────────────────────────────────────────────────────────────────────────────
// Video Feed
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Video Feed - resilient to Camo Studio hiccups
// ─────────────────────────────────────────────────────────────────────────────

function monitorVideoFeed() {
    const videoFeed = document.getElementById('videoFeed');
    const feedStatus = document.getElementById('feedStatus');

    if (!videoFeed || !feedStatus) return;

    let errorCount = 0;
    let recoveryTimer = null;

    videoFeed.onerror = () => {
        errorCount++;
        feedStatus.textContent = '🟡 Reconnecting...';
        feedStatus.style.color = '#f59e0b';

        // Don't reload immediately — wait, then quietly refresh just the img src
        if (recoveryTimer) clearTimeout(recoveryTimer);
        recoveryTimer = setTimeout(() => {
            // Refresh ONLY the img src, not the whole page
            const baseSrc = '/video_feed';
            videoFeed.src = baseSrc + '?t=' + Date.now();
        }, 2000);

        // If many errors, show disconnected
        if (errorCount > 5) {
            feedStatus.textContent = '🔴 Disconnected — Is app.py running?';
            feedStatus.style.color = '#ef4444';
        }
    };

    videoFeed.onload = () => {
        errorCount = 0;
        feedStatus.textContent = '🟢 Connected';
        feedStatus.style.color = '#22c55e';
        if (recoveryTimer) {
            clearTimeout(recoveryTimer);
            recoveryTimer = null;
        }
    };
}


// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

function showMessage(elementId, text, type) {
    const div = document.getElementById(elementId);

    if (!div) return;

    div.textContent = text;
    div.className = `message ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            div.textContent = '';
            div.className = 'message';
        }, 5000);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttribute(str) {
    return escapeHtml(str);
}

function escapeJs(str) {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}