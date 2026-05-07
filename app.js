/**
 * Creative Content Schedule Manager - Logic
 * Core functionality: CRUD, Calendar, Stats, Export/Import
 */

// --- State Management ---
let state = {
    tasks: [],
    kpis: [],
    viewDate: new Date(), // For calendar
    currentPage: 'dashboard',
    sheetsUrl: '', // Google Apps Script URL
    isSyncing: false
};

// --- Initial Demo Data ---
const todayStr = new Date().toISOString().split('T')[0];
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
const nextWeekStr = nextWeek.toISOString().split('T')[0];

const demoTasks = [
    {
        id: '1',
        title: 'Premium Watch Promo Video',
        client: 'Luxury Timepieces',
        platform: 'Facebook',
        contentType: 'Video',
        workType: 'Videography',
        status: 'Editing',
        priority: 'High',
        shootDate: todayStr,
        postDate: nextWeekStr,
        fileLink: 'https://drive.google.com/demo',
        script: 'Focus on macro shots of the movement.',
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'New Collection Poster',
        client: 'Fashion Hub',
        platform: 'Instagram',
        contentType: 'Poster',
        workType: 'Graphic Design',
        status: 'Review',
        priority: 'Medium',
        shootDate: '',
        postDate: todayStr,
        fileLink: '',
        script: 'Use vibrant colors and modern typography.',
        createdAt: new Date().toISOString()
    },
    {
        id: '3',
        title: 'Daily Vlog Edit',
        client: 'Personal Brand',
        platform: 'YouTube',
        contentType: 'Video',
        workType: 'Motion Graphic',
        status: 'Idea',
        priority: 'Low',
        shootDate: tomorrowStr,
        postDate: nextWeekStr,
        fileLink: '',
        script: 'Travel style transitions.',
        createdAt: new Date().toISOString()
    }
];

// --- initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    setupEventListeners();
    setupModalListeners();
    renderCurrentPage();
    updateDashboardStats();
});

function loadData() {
    const savedTasks = localStorage.getItem('cc_tasks');
    const savedKpis = localStorage.getItem('cc_kpis');
    
    if (savedTasks) {
        state.tasks = JSON.parse(savedTasks);
    } else {
        state.tasks = [...demoTasks];
        saveData();
    }
    
    if (savedKpis) {
        state.kpis = JSON.parse(savedKpis);
    }
}

function saveData() {
    localStorage.setItem('cc_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('cc_kpis', JSON.stringify(state.kpis));
}

// --- Routing & Navigation ---
function setupEventListeners() {
    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateTo(page);
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
            }
        });
    });

    // Calendar Navigation
    document.getElementById('prevMonth').onclick = () => {
        state.viewDate.setMonth(state.viewDate.getMonth() - 1);
        renderCalendar();
    };
    document.getElementById('nextMonth').onclick = () => {
        state.viewDate.setMonth(state.viewDate.getMonth() + 1);
        renderCalendar();
    };

    // Task Form Submission
    document.getElementById('taskForm').onsubmit = (e) => {
        e.preventDefault();
        saveTask();
    };

    // KPI Form Submission
    document.getElementById('kpiForm').onsubmit = (e) => {
        e.preventDefault();
        saveKPI();
    };

    // Search and Filter
    document.getElementById('searchTask').oninput = renderTaskTable;
    document.getElementById('filterStatus').onchange = renderTaskTable;
    document.getElementById('filterClient').onchange = renderTaskTable;

    // CSV Import
    document.getElementById('importCsv').onchange = handleCsvImport;
}

function setupModalListeners() {
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
        }
    });
}

function navigateTo(pageId) {
    state.currentPage = pageId;
    
    // Update Sidebar UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });

    // Update Content Visibility
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === pageId);
    });

    renderCurrentPage();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function renderCurrentPage() {
    switch(state.currentPage) {
        case 'dashboard':
            updateDashboardStats();
            renderRecentTasks();
            renderCharts();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'board':
            renderKanban();
            break;
        case 'daily':
            renderDailyTasks();
            break;
        case 'tasks':
            populateClientFilter();
            renderTaskTable();
            break;
        case 'templates':
            renderTemplates();
            break;
        case 'kpi':
            renderKPITable();
            break;
    }
}

// --- Component: Dashboard ---
function updateDashboardStats() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const stats = {
        total: state.tasks.length,
        today: state.tasks.filter(t => t.postDate === todayStr).length,
        pending: state.tasks.filter(t => t.status !== 'Done' && t.status !== 'Posted').length,
        shooting: state.tasks.filter(t => t.status === 'Shooting').length,
        editing: state.tasks.filter(t => t.status === 'Editing').length,
        completed: state.tasks.filter(t => t.status === 'Done' || t.status === 'Posted').length,
        overdue: state.tasks.filter(t => t.postDate < todayStr && t.status !== 'Done' && t.status !== 'Posted' && t.postDate).length
    };

    const container = document.getElementById('statCards');
    container.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Total Tasks</span>
            <span class="stat-value">${stats.total}</span>
        </div>
        <div class="stat-card" style="--primary: var(--info)">
            <span class="stat-label">Today's Deadlines</span>
            <span class="stat-value">${stats.today}</span>
        </div>
        <div class="stat-card" style="--primary: var(--warning)">
            <span class="stat-label">Shooting / Editing</span>
            <span class="stat-value">${stats.shooting + stats.editing}</span>
        </div>
        <div class="stat-card" style="--primary: var(--danger)">
            <span class="stat-label">Overdue</span>
            <span class="stat-value">${stats.overdue}</span>
        </div>
    `;
}

function renderRecentTasks() {
    const recent = [...state.tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const container = document.getElementById('recentTasksList');
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No tasks yet.</p>';
        return;
    }

    container.innerHTML = recent.map(t => `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border);">
            <div>
                <div style="font-weight: 500;">${t.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${t.client} • ${t.contentType}</div>
            </div>
            <div style="font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; background: var(--bg-sidebar); height: fit-content;">${t.status}</div>
        </div>
    `).join('');

    // Update Priority List
    const highPriority = state.tasks.filter(t => t.priority === 'High' && t.status !== 'Done').slice(0, 5);
    const pContainer = document.getElementById('priorityFocusList');
    pContainer.innerHTML = highPriority.map(t => `
        <div style="margin-bottom: 12px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border-left: 3px solid var(--danger);">
            <div style="font-weight: 600; font-size: 0.9rem;">${t.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Due: ${t.postDate || 'N/A'}</div>
        </div>
    `).join('') || '<p style="color: var(--text-muted);">All clear!</p>';
}

// --- Component: Calendar ---
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('currentMonthYear');
    
    const year = state.viewDate.getFullYear();
    const month = state.viewDate.getMonth();
    
    title.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(state.viewDate);
    
    grid.innerHTML = '';
    
    // Day labels
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        grid.innerHTML += `<div class="calendar-day-label">${day}</div>`;
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Padding
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = state.tasks.filter(t => t.postDate === dateStr || t.shootDate === dateStr);
        const isToday = dateStr === todayStr;
        
        let taskHtml = dayTasks.slice(0, 3).map(t => `
            <div class="task-pill" style="background: ${getTaskColor(t.contentType)}">${t.title}</div>
        `).join('');
        
        if (dayTasks.length > 3) taskHtml += `<div style="font-size: 0.6rem; color: var(--text-muted); text-align: center;">+${dayTasks.length - 3} more</div>`;

        grid.innerHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''}" onclick="addTaskAtDate('${dateStr}')">
                <div class="day-number">${d}</div>
                ${taskHtml}
            </div>
        `;
    }
}

function getTaskColor(type) {
    switch(type) {
        case 'Video': return '#3B82F6';
        case 'Poster': return '#10B981';
        case 'Reel': case 'TikTok': return '#F59E0B';
        case 'Thumbnail': return '#8B5CF6';
        default: return '#64748B';
    }
}

function addTaskAtDate(date) {
    document.getElementById('taskPostDate').value = date;
    openModal('taskModal');
}

// --- Component: Task Manager ---
function renderTaskTable() {
    const tbody = document.getElementById('taskTableBody');
    const search = document.getElementById('searchTask').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const clientFilter = document.getElementById('filterClient').value;

    const filtered = state.tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search) || t.client.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || t.status === statusFilter;
        const matchesClient = !clientFilter || t.client === clientFilter;
        return matchesSearch && matchesStatus && matchesClient;
    });

    tbody.innerHTML = filtered.map(t => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 16px;">
                <div style="font-weight: 500;">${t.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${t.platform}</div>
            </td>
            <td style="padding: 16px;">${t.client}</td>
            <td style="padding: 16px;"><span class="task-pill" style="background: ${getTaskColor(t.contentType)}">${t.contentType}</span></td>
            <td style="padding: 16px; font-size: 0.85rem;">${t.postDate || 'None'}</td>
            <td style="padding: 16px;"><span style="color: ${getStatusColor(t.status)}">${t.status}</span></td>
            <td style="padding: 16px;">
                <button class="btn btn-secondary" style="padding: 6px 10px;" onclick="editTask('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-secondary" style="padding: 6px 10px; color: var(--danger);" onclick="deleteTask('${t.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No tasks found.</td></tr>';
}

function getStatusColor(status) {
    switch(status) {
        case 'Done': case 'Posted': return 'var(--success)';
        case 'Idea': return 'var(--text-muted)';
        case 'Shooting': return 'var(--warning)';
        case 'Editing': return 'var(--info)';
        case 'Review': return '#A855F7';
        default: return 'var(--text-main)';
    }
}

function populateClientFilter() {
    const select = document.getElementById('filterClient');
    const clients = [...new Set(state.tasks.map(t => t.client))].filter(Boolean);
    select.innerHTML = '<option value="">All Clients</option>' + clients.map(c => `<option value="${c}">${c}</option>`).join('');
}

// --- Task CRUD ---
function saveTask() {
    const id = document.getElementById('taskId').value;
    const task = {
        id: id || Date.now().toString(),
        title: document.getElementById('taskTitle').value,
        client: document.getElementById('taskClient').value,
        platform: document.getElementById('taskPlatform').value,
        contentType: document.getElementById('taskContentType').value,
        workType: document.getElementById('taskWorkType').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        shootDate: document.getElementById('taskShootDate').value,
        postDate: document.getElementById('taskPostDate').value,
        fileLink: document.getElementById('taskFileLink').value,
        script: document.getElementById('taskScript').value,
        createdAt: id ? state.tasks.find(t => t.id === id).createdAt : new Date().toISOString()
    };

    if (id) {
        const index = state.tasks.findIndex(t => t.id === id);
        state.tasks[index] = task;
    } else {
        state.tasks.push(task);
    }

    saveData();
    closeModal('taskModal');
    renderCurrentPage();
}

function editTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;

    document.getElementById('taskId').value = t.id;
    document.getElementById('taskTitle').value = t.title;
    document.getElementById('taskClient').value = t.client;
    document.getElementById('taskPlatform').value = t.platform;
    document.getElementById('taskContentType').value = t.contentType;
    document.getElementById('taskWorkType').value = t.workType;
    document.getElementById('taskStatus').value = t.status;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskShootDate').value = t.shootDate;
    document.getElementById('taskPostDate').value = t.postDate;
    document.getElementById('taskFileLink').value = t.fileLink;
    document.getElementById('taskScript').value = t.script;

    document.getElementById('taskModalTitle').innerText = 'Edit Task';
    openModal('taskModal');
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
        renderCurrentPage();
    }
}

// --- Bulk Generator ---
function generateBulkTasks() {
    const posters = parseInt(document.getElementById('genPosters').value) || 0;
    const videos = parseInt(document.getElementById('genVideos').value) || 0;
    const reels = parseInt(document.getElementById('genReels').value) || 0;
    const thumbs = parseInt(document.getElementById('genThumbnails').value) || 0;
    const dateVal = document.getElementById('genMonth').value; // YYYY-MM-DD
    
    if (!dateVal) {
        alert('Please select a target date/month.');
        return;
    }

    const selectedDate = new Date(dateVal);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const newTasks = [];

    // Simple distribution logic
    const distribute = (count, type) => {
        for (let i = 0; i < count; i++) {
            const day = Math.floor(Math.random() * daysInMonth) + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            newTasks.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                title: `${type} #${i + 1}`,
                client: 'Internal',
                platform: type === 'Poster' ? 'Facebook' : 'TikTok',
                contentType: type,
                workType: type === 'Poster' ? 'Graphic Design' : 'Videography',
                status: 'Idea',
                priority: 'Medium',
                shootDate: '',
                postDate: dateStr,
                fileLink: '',
                script: '',
                createdAt: new Date().toISOString()
            });
        }
    };

    distribute(posters, 'Poster');
    distribute(videos, 'Video');
    distribute(reels, 'Reel');
    distribute(thumbs, 'Thumbnail');

    state.tasks.push(...newTasks);
    saveData();
    closeModal('generatorModal');
    navigateTo('tasks');
    showToast(`Generated ${newTasks.length} tasks!`, 'success');
}

// --- Components: Daily Tasks ---
function renderDailyTasks() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayDateLabel').innerText = new Date().toLocaleDateString();
    
    const daily = state.tasks.filter(t => t.postDate === today || t.shootDate === today);
    const container = document.getElementById('dailyTaskList');
    
    if (daily.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border); color: var(--text-muted);">No tasks scheduled for today.</div>';
        return;
    }

    container.innerHTML = daily.map(t => `
        <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 16px; display: flex; align-items: center; gap: 20px;">
            <input type="checkbox" ${t.status === 'Done' ? 'checked' : ''} onchange="toggleTaskDone('${t.id}')" style="width: 24px; height: 24px; cursor: pointer;">
            <div style="flex: 1;">
                <h4 style="${t.status === 'Done' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${t.client} • ${t.contentType} • ${t.postDate === today ? 'Posting' : 'Shooting'}</p>
            </div>
            <span style="color: ${getStatusColor(t.status)}; font-weight: 600; font-size: 0.8rem;">${t.status}</span>
        </div>
    `).join('');
}

function toggleTaskDone(id) {
    const index = state.tasks.findIndex(t => t.id === id);
    state.tasks[index].status = state.tasks[index].status === 'Done' ? 'Editing' : 'Done';
    saveData();
    renderDailyTasks();
}

// --- Component: Scripts & Captions ---
const templates = [
    { name: 'Product Promo', hook: 'Don’t buy X before watching this!', body: 'Explain problem... Show X as solution... List 3 benefits.', cta: 'Link in bio!' },
    { name: 'Knowledge Video', hook: '3 Secrets about [Niche] you didn’t know.', body: 'Secret 1... Secret 2... Secret 3.', cta: 'Follow for more tips!' },
    { name: 'Testimonial', hook: 'How [Client] achieved [Result] in 30 days.', body: 'Before... Process... After results.', cta: 'DM for free consultation.' }
];

function renderTemplates() {
    const container = document.getElementById('templateGrid');
    container.innerHTML = templates.map(t => `
        <div class="card" style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
            <h3 style="margin-bottom: 12px;">${t.name}</h3>
            <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-bottom: 8px;">Hook: ${t.hook}</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">${t.body}</p>
            <button class="btn btn-secondary" style="width: 100%;" onclick="copyText('${t.hook}\\n${t.body}\\n${t.cta}')">Use Template</button>
        </div>
    `).join('');
}

function generateCaption() {
    const hook = document.getElementById('capHook').value;
    const problem = document.getElementById('capProblem').value;
    const benefit = document.getElementById('capBenefit').value;
    const cta = document.getElementById('capCTA').value;
    const hashtags = document.getElementById('capHashtags').value;

    const output = `🔥 ${hook}\n\n😟 បញ្ហា៖ ${problem}\n\n✅ ដំណោះស្រាយ៖ ${benefit}\n\n👉 ${cta}\n\n${hashtags}`;
    document.getElementById('captionOutput').innerText = output;
}

function copyCaption() {
    const text = document.getElementById('captionOutput').innerText;
    copyText(text);
}

// --- Component: KPI Tracker ---
function saveKPI() {
    const kpi = {
        link: document.getElementById('kpiLink').value,
        reach: document.getElementById('kpiReach').value,
        views: document.getElementById('kpiViews').value,
        engagement: document.getElementById('kpiEngagement').value,
        leads: document.getElementById('kpiLeads').value,
        notes: document.getElementById('kpiNotes').value
    };
    state.kpis.push(kpi);
    saveData();
    closeModal('kpiModal');
    renderKPITable();
}

function renderKPITable() {
    const tbody = document.getElementById('kpiTableBody');
    tbody.innerHTML = state.kpis.map(k => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 16px; font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;"><a href="${k.link}" target="_blank" style="color: var(--primary);">${k.link}</a></td>
            <td style="padding: 16px;">${parseInt(k.reach).toLocaleString()}</td>
            <td style="padding: 16px;">${parseInt(k.views).toLocaleString()}</td>
            <td style="padding: 16px;">${parseInt(k.engagement).toLocaleString()}</td>
            <td style="padding: 16px;">${parseInt(k.leads).toLocaleString()}</td>
            <td style="padding: 16px; font-size: 0.8rem; color: var(--text-muted);">${k.notes}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No metrics tracked yet.</td></tr>';
}

// --- Utilities ---
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    // Set default date for generator if opening that modal
    if (id === 'generatorModal') {
        const now = new Date();
        document.getElementById('genMonth').value = now.toISOString().split('T')[0];
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if (id === 'taskModal') {
        document.getElementById('taskForm').reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskModalTitle').innerText = 'Add New Task';
    }
}
// --- Google Sheets Sync ---
async function syncWithSheets() {
    if (!state.sheetsUrl) return alert('Please enter your Google Apps Script URL in Settings.');
    
    state.isSyncing = true;
    updateSyncStatus('Syncing...');

    try {
        // 1. Send local data to Sheets (POST)
        const response = await fetch(state.sheetsUrl, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors for simple POST
            body: JSON.stringify({ tasks: state.tasks })
        });

        // 2. Pull latest from Sheets (GET)
        const getResponse = await fetch(state.sheetsUrl);
        const remoteTasks = await getResponse.json();
        
        if (remoteTasks && Array.isArray(remoteTasks)) {
            state.tasks = remoteTasks;
            saveData();
            renderCurrentPage();
            updateSyncStatus('Synced');
        }
    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('Sync Failed');
    } finally {
        state.isSyncing = false;
    }
}

function updateSyncStatus(text) {
    const btn = document.getElementById('syncBtn');
    if (btn) btn.innerText = text;
}

function saveSheetsUrl() {
    const url = document.getElementById('sheetsUrlInput').value;
    state.sheetsUrl = url;
    localStorage.setItem('cc_sheets_url', url);
    showToast('URL Saved! You can now sync.', 'success');
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'success'));
}

function exportToCSV() {
    if (state.tasks.length === 0) return alert('No tasks to export.');
    
    // Define headers explicitly to ensure consistency even if state is empty/different
    const headers = ['id', 'title', 'client', 'platform', 'contentType', 'workType', 'status', 'priority', 'shootDate', 'postDate', 'fileLink', 'script', 'createdAt'];
    const rows = state.tasks.map(t => headers.map(h => `"${String(t[h] || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `creative_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
}

function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n').slice(1); // Skip header
        const imported = rows.filter(r => r.trim()).map(r => {
            const values = r.match(/(".*?"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
            return {
                id: values[0] || Date.now().toString(),
                title: values[1], client: values[2], platform: values[3], contentType: values[4],
                workType: values[5], status: values[6], priority: values[7],
                shootDate: values[8], postDate: values[9], fileLink: values[10],
                script: values[11], createdAt: values[12] || new Date().toISOString()
            };
        });
        
        state.tasks.push(...imported);
        saveData();
        renderCurrentPage();
        alert(`Imported ${imported.length} tasks!`);
    };
    reader.readAsText(file);
}

function resetData() {
    if (confirm('CAUTION: This will delete ALL your tasks and KPI data permanently. Proceed?')) {
        state.tasks = [];
        state.kpis = [];
        localStorage.clear();
        location.reload();
    }
}

// --- Theme Management ---
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    
    localStorage.setItem('cc_theme', isLight ? 'light' : 'dark');
    
    if (isLight) {
        icon.className = 'fas fa-sun';
        text.innerText = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.innerText = 'Dark Mode';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('cc_theme');
    const savedUrl = localStorage.getItem('cc_sheets_url');
    if (savedTheme === 'light') toggleTheme();
    if (savedUrl) {
        state.sheetsUrl = savedUrl;
        const input = document.getElementById('sheetsUrlInput');
        if (input) input.value = savedUrl;
    }
}

// --- Enhanced Features: Charts ---
let statusChart, typeChart;

function renderCharts() {
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    const ctxType = document.getElementById('typeChart').getContext('2d');

    const statusData = {
        'Idea': 0, 'Shooting': 0, 'Editing': 0, 'Review': 0, 'Done': 0
    };
    const typeData = {};

    state.tasks.forEach(t => {
        if (statusData[t.status] !== undefined) statusData[t.status]++;
        typeData[t.contentType] = (typeData[t.contentType] || 0) + 1;
    });

    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: ['#94A3B8', '#F59E0B', '#3B82F6', '#A855F7', '#10B981'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8' } } } }
    });

    if (typeChart) typeChart.destroy();
    typeChart = new Chart(ctxType, {
        type: 'bar',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                label: 'Count',
                data: Object.values(typeData),
                backgroundColor: '#0066FF',
                borderRadius: 8
            }]
        },
        options: { 
            scales: { 
                y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94A3B8' } },
                x: { grid: { display: false }, ticks: { color: '#94A3B8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- Enhanced Features: Kanban ---
function renderKanban() {
    const statuses = ['Idea', 'Shooting', 'Editing', 'Review', 'Done'];
    statuses.forEach(status => {
        const container = document.getElementById(`col-${status}`);
        const tasks = state.tasks.filter(t => t.status === status);
        
        container.innerHTML = tasks.map(t => `
            <div class="kanban-card" onclick="editTask('${t.id}')">
                <div style="font-size: 0.8rem; color: var(--primary); margin-bottom: 4px;">${t.client}</div>
                <div style="font-weight: 600; margin-bottom: 8px;">${t.title}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${t.postDate || 'No date'}</span>
                    <span class="task-pill" style="background: ${getTaskColor(t.contentType)}">${t.contentType}</span>
                </div>
            </div>
        `).join('') || '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px;">Empty</div>';
    });
}

// --- Enhanced Features: Toasts ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle';
    const color = type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : 'var(--primary)';
    
    toast.style.borderLeftColor = color;
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${color}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
