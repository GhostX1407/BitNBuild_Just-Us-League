const API_BASE_URL = 'http://127.0.0.1:8000';
let isOnline = false;

// DOM Elements
const els = {
    status: document.getElementById('backend-status'),
    refreshBtn: document.getElementById('refresh-btn'),
    form: document.getElementById('incident-form'),
    formError: document.getElementById('form-error'),
    submitBtn: document.getElementById('submit-btn'),
    submitBtnText: document.getElementById('submit-btn').querySelector('span'),
    feed: document.getElementById('incident-feed'),
    feedStatus: document.getElementById('feed-status'),
    stats: {
        total: document.getElementById('stat-total'),
        high: document.getElementById('stat-high'),
        medium: document.getElementById('stat-medium'),
        low: document.getElementById('stat-low'),
        dup: document.getElementById('stat-dup')
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    fetchIncidents();
    
    // Set up polling (every 15 seconds)
    setInterval(() => {
        if (isOnline) fetchIncidents(true);
    }, 15000);
});

// Event Listeners
els.refreshBtn.addEventListener('click', () => {
    checkHealth();
    fetchIncidents();
});

els.form.addEventListener('submit', handleFormSubmit);

// API Functions
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            isOnline = true;
            updateStatusUI(true);
        } else {
            throw new Error('Not OK');
        }
    } catch (error) {
        isOnline = false;
        updateStatusUI(false);
    }
}

async function fetchIncidents(isBackground = false) {
    if (!isBackground) {
        els.feed.innerHTML = '';
        showFeedStatus('loading');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents`);
        if (!response.ok) throw new Error('Failed to fetch incidents');
        
        const data = await response.json();
        const incidents = data.items || [];
        
        renderDashboard(incidents);
    } catch (error) {
        console.error(error);
        if (!isBackground) {
            showFeedStatus('error');
        }
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Reset errors
    els.formError.classList.add('hidden');
    els.formError.textContent = '';
    
    // Set loading state
    els.submitBtn.disabled = true;
    els.submitBtnText.textContent = 'Submitting...';

    const formData = new FormData(els.form);
    const payload = {
        title: formData.get('title'),
        category: formData.get('category'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        description: formData.get('description')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to submit incident');
        }

        // Success
        els.form.reset();
        await fetchIncidents(); // Refresh feed immediately
    } catch (error) {
        console.error(error);
        els.formError.textContent = 'Error submitting report. Please check connection and try again.';
        els.formError.classList.remove('hidden');
    } finally {
        els.submitBtn.disabled = false;
        els.submitBtnText.textContent = 'Report Incident';
    }
}

// UI Rendering Functions
function updateStatusUI(online) {
    els.status.className = `flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-300 ${
        online 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-red-50 border-red-200 text-red-700'
    }`;
    
    els.status.innerHTML = `
        <span class="relative flex h-2 w-2">
          ${online ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ''}
          <span class="relative inline-flex rounded-full h-2 w-2 ${online ? 'bg-emerald-500' : 'bg-red-500'}"></span>
        </span>
        ${online ? 'System Online' : 'Backend Offline'}
    `;
}

function showFeedStatus(state) {
    els.feedStatus.style.display = 'block';
    if (state === 'loading') {
        els.feedStatus.innerHTML = `
            <div class="animate-pulse flex flex-col items-center">
                <div class="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-500 animate-spin mb-4"></div>
                <p>Loading incidents...</p>
            </div>
        `;
    } else if (state === 'empty') {
        els.feedStatus.innerHTML = `<p>No incidents reported yet.</p>`;
    } else if (state === 'error') {
        els.feedStatus.innerHTML = `<p class="text-red-500">Unable to load incidents. Is the backend running?</p>`;
    }
}

function renderDashboard(incidents) {
    updateSummary(incidents);
    
    if (incidents.length === 0) {
        els.feed.innerHTML = '';
        showFeedStatus('empty');
        return;
    }

    els.feedStatus.style.display = 'none';
    
    const html = incidents.map(inc => createIncidentCard(inc)).join('');
    els.feed.innerHTML = html;
}

function updateSummary(incidents) {
    let high = 0, medium = 0, low = 0, dups = 0;
    
    incidents.forEach(inc => {
        if (inc.severity === 'High') high++;
        else if (inc.severity === 'Medium') medium++;
        else if (inc.severity === 'Low') low++;
        
        if (inc.is_duplicate) dups++;
    });

    els.stats.total.textContent = incidents.length;
    els.stats.high.textContent = high;
    els.stats.medium.textContent = medium;
    els.stats.low.textContent = low;
    els.stats.dup.textContent = dups;
}

function createIncidentCard(incident) {
    // Severity styling
    let sevColors = 'bg-slate-100 text-slate-800 border-slate-200';
    if (incident.severity === 'High') sevColors = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (incident.severity === 'Medium') sevColors = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (incident.severity === 'Low') sevColors = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    // Duplicate badge
    const duplicateBadge = incident.is_duplicate 
        ? `<span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
             Duplicate of #INC-${incident.duplicate_of_id}
           </span>` 
        : '';

    // Date formatting
    const dateStr = new Date(incident.created_at).toLocaleString();

    return `
        <article class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 card-transition flex flex-col gap-3">
            <div class="flex justify-between items-start gap-4 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-slate-400">#INC-${incident.id}</span>
                    <h3 class="text-base font-semibold text-slate-800">${escapeHtml(incident.title)}</h3>
                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">${escapeHtml(incident.category)}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${duplicateBadge}
                    <span class="px-2.5 py-0.5 rounded-full border ${sevColors} text-xs font-bold uppercase tracking-wide">
                        ${incident.severity}
                    </span>
                </div>
            </div>
            
            <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(incident.description)}</p>
            
            ${incident.classification_reason ? `
                <div class="mt-2 bg-slate-50 border border-slate-100 rounded-md p-3">
                    <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Why this severity?</span>
                    <p class="text-xs text-slate-600 italic">"${escapeHtml(incident.classification_reason)}"</p>
                </div>
            ` : ''}

            <div class="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                <div class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    ${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}
                </div>
                <div>${dateStr}</div>
            </div>
        </article>
    `;
}

// Utility: Prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
