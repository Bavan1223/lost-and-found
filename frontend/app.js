// =============================================
// Campus Lost & Found — Frontend Application
// =============================================

const API = ''; // Same origin — frontend is served by Express
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// ===================== HELPERS =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.headers) Object.assign(headers, opts.headers);

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ===================== TOAST =====================
function toast(message, type = 'info') {
  const container = $('.toast-container') || (() => {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ===================== ROUTING =====================
function navigate(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-links a').forEach(a => a.classList.remove('active'));

  const target = $(`#page-${page}`);
  if (target) target.classList.add('active');

  const navLink = $(`.nav-links a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  // Load page data
  if (page === 'dashboard') loadDashboard();
  if (page === 'lost') loadLostItems();
  if (page === 'found') loadFoundItems();
}

function updateUI() {
  const authNav = $('#auth-nav');
  const appNav = $('#app-nav');
  const userInfo = $('#user-info');

  if (token && currentUser) {
    authNav.style.display = 'none';
    appNav.style.display = 'flex';
    userInfo.style.display = 'flex';
    $('#user-name').textContent = currentUser.name;
    $('#user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    navigate('dashboard');
  } else {
    authNav.style.display = 'flex';
    appNav.style.display = 'none';
    userInfo.style.display = 'none';
    navigate('login');
  }
}

// ===================== AUTH =====================
async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#reg-name').value,
        email: $('#reg-email').value,
        password: $('#reg-password').value,
        studentId: $('#reg-studentid').value,
      }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    toast('Account created successfully!', 'success');
    updateUI();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value,
        password: $('#login-password').value,
      }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    toast(`Welcome back, ${currentUser.name}!`, 'success');
    updateUI();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  toast('Logged out', 'info');
  updateUI();
}

// ===================== DASHBOARD =====================
async function loadDashboard() {
  const statsEl = $('#dashboard-stats');
  const recentEl = $('#dashboard-recent');

  try {
    const health = await api('/api/health');
    $('#db-status').textContent = health.database === 'connected' ? '🟢 Connected' : '🔴 Disconnected';
    $('#db-status').className = health.database === 'connected' ? 'badge badge-active' : 'badge badge-pending';
  } catch { 
    $('#db-status').textContent = '🔴 Offline';
  }

  try {
    const [lost, found] = await Promise.all([
      api('/api/lost?limit=5'),
      api('/api/found?limit=5'),
    ]);

    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-value">${lost.total || 0}</div><div class="stat-label">Lost Items</div></div>
      <div class="stat-card"><div class="stat-value">${found.total || 0}</div><div class="stat-label">Found Items</div></div>
      <div class="stat-card"><div class="stat-value">${(lost.total || 0) + (found.total || 0)}</div><div class="stat-label">Total Reports</div></div>
    `;

    recentEl.innerHTML = (lost.data || []).slice(0, 3).map(item => renderItemCard(item, 'lost')).join('')
      + (found.data || []).slice(0, 3).map(item => renderItemCard(item, 'found')).join('');

    if (!recentEl.innerHTML) {
      recentEl.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No items reported yet. Be the first!</p></div>';
    }
  } catch (err) {
    statsEl.innerHTML = '<p class="loading-text">Could not load stats — check if the server is running.</p>';
  }
}

// ===================== ITEM RENDERING =====================
function renderItemCard(item, type) {
  const statusClass = item.status === 'active' ? 'badge-active' : item.status === 'matched' ? 'badge-matched' : 'badge-resolved';
  const dateField = type === 'lost' ? item.dateLost : item.dateFound;
  const dateLabel = type === 'lost' ? 'Lost' : 'Found';
  const reporter = item.reportedBy?.name || 'Unknown';

  return `
    <div class="card item-card">
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="badge ${statusClass}">${item.status}</span>
      </div>
      <div class="item-meta">
        <span>📁 <span class="badge badge-category">${item.category}</span></span>
        <span>📍 ${escapeHtml(item.location)}</span>
        <span>📅 ${dateField ? new Date(dateField).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div class="item-desc">${escapeHtml(item.description)}</div>
      <div class="item-footer">
        <span style="font-size:0.8rem;color:var(--text-muted)">By ${escapeHtml(reporter)}</span>
        ${type === 'lost' && token ? `<button class="btn btn-sm btn-primary" onclick="aiMatch('${item._id}')">🤖 AI Match</button>` : ''}
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== LOST ITEMS =====================
let lostFilter = '';

async function loadLostItems() {
  const grid = $('#lost-grid');
  grid.innerHTML = '<p class="loading-text"><span class="spinner"></span> Loading...</p>';

  try {
    const query = lostFilter ? `?category=${lostFilter}` : '';
    const data = await api(`/api/lost${query}`);
    if (!data.data || data.data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>No lost items found.</p></div>';
      return;
    }
    grid.innerHTML = data.data.map(i => renderItemCard(i, 'lost')).join('');
  } catch (err) {
    grid.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
  }
}

// ===================== FOUND ITEMS =====================
async function loadFoundItems() {
  const grid = $('#found-grid');
  grid.innerHTML = '<p class="loading-text"><span class="spinner"></span> Loading...</p>';

  try {
    const data = await api('/api/found');
    if (!data.data || data.data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>No found items reported yet.</p></div>';
      return;
    }
    grid.innerHTML = data.data.map(i => renderItemCard(i, 'found')).join('');
  } catch (err) {
    grid.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
  }
}

// ===================== REPORT FORMS =====================
async function handleReportLost(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Reporting...';

  try {
    await api('/api/lost', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#rl-title').value,
        description: $('#rl-desc').value,
        category: $('#rl-category').value,
        location: $('#rl-location').value,
        dateLost: $('#rl-date').value || undefined,
        contactEmail: $('#rl-email').value || undefined,
        tags: $('#rl-tags').value || undefined,
      }),
    });
    toast('Lost item reported!', 'success');
    e.target.reset();
    navigate('lost');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📋 Report Lost Item';
  }
}

async function handleReportFound(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Reporting...';

  try {
    await api('/api/found', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#rf-title').value,
        description: $('#rf-desc').value,
        category: $('#rf-category').value,
        location: $('#rf-location').value,
        dateFound: $('#rf-date').value || undefined,
      }),
    });
    toast('Found item reported!', 'success');
    e.target.reset();
    navigate('found');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 Report Found Item';
  }
}

// ===================== AI FEATURES =====================
async function aiMatch(lostItemId) {
  toast('Running AI matching...', 'info');
  try {
    const data = await api('/api/ai/match', {
      method: 'POST',
      body: JSON.stringify({ lostItemId }),
    });

    const resultEl = $('#ai-match-results');
    navigate('ai');

    if (!data.matches || data.matches.length === 0) {
      resultEl.innerHTML = '<div class="ai-result"><h4>No Matches Found</h4><p>The AI could not find matching items yet. Try again after more found items are reported.</p></div>';
      return;
    }

    resultEl.innerHTML = `
      <div class="ai-result">
        <h4>🤖 AI Match Results for "${escapeHtml(data.lostItem?.title || '')}"</h4>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.75rem">${escapeHtml(data.summary || '')}</p>
        <p style="font-size:0.8rem;color:var(--text-muted)">Scanned ${data.totalFoundItemsScanned || 0} found items</p>
        ${data.matches.map(m => `
          <div class="match-item">
            <div>
              <strong>${escapeHtml(m.foundItem?.title || m.foundItemId)}</strong>
              <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${escapeHtml(m.reason || '')}</p>
            </div>
            <div class="match-score">${m.score}%</div>
          </div>
        `).join('')}
      </div>`;
  } catch (err) {
    toast('AI Match failed: ' + err.message, 'error');
  }
}

async function handleAIDescribe(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Enhancing...';

  try {
    const data = await api('/api/ai/describe', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#aid-title').value,
        roughDescription: $('#aid-desc').value,
        category: $('#aid-category').value,
      }),
    });

    $('#ai-describe-result').innerHTML = `
      <div class="ai-result">
        <h4>✨ Enhanced Description</h4>
        <p style="margin-bottom:0.75rem">${escapeHtml(data.enhanced)}</p>
        <h4>🏷️ Keywords</h4>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem">
          ${(data.keywords || []).map(k => `<span class="badge badge-category">${escapeHtml(k)}</span>`).join('')}
        </div>
        ${data.tips ? `<h4>💡 Tip</h4><p style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(data.tips)}</p>` : ''}
      </div>`;
  } catch (err) {
    toast('AI Describe failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Enhance Description';
  }
}

async function handleAIAsk(e) {
  e.preventDefault();
  const input = $('#ai-question');
  const question = input.value.trim();
  if (!question) return;

  const chatBox = $('#ai-chat-box');
  chatBox.innerHTML += `<div class="chat-msg chat-user">${escapeHtml(question)}</div>`;
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const data = await api('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    chatBox.innerHTML += `<div class="chat-msg chat-ai">${escapeHtml(data.answer)}</div>`;
  } catch (err) {
    chatBox.innerHTML += `<div class="chat-msg chat-ai" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</div>`;
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===================== FILTER CHIPS =====================
function setLostFilter(cat) {
  lostFilter = lostFilter === cat ? '' : cat;
  $$('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === lostFilter));
  loadLostItems();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  $$('.nav-links a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const page = a.dataset.page;
      if (page === 'logout') return logout();
      navigate(page);
    });
  });

  // Auth forms
  $('#form-register')?.addEventListener('submit', handleRegister);
  $('#form-login')?.addEventListener('submit', handleLogin);

  // Report forms
  $('#form-report-lost')?.addEventListener('submit', handleReportLost);
  $('#form-report-found')?.addEventListener('submit', handleReportFound);

  // AI forms
  $('#form-ai-describe')?.addEventListener('submit', handleAIDescribe);
  $('#form-ai-ask')?.addEventListener('submit', handleAIAsk);

  // Auth page switching
  $$('[data-switch]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.switch));
  });

  // Filter chips
  $$('.filter-chip').forEach(c => {
    c.addEventListener('click', () => setLostFilter(c.dataset.cat));
  });

  updateUI();
});
