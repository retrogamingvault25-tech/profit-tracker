import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDwAU-nz8RZMU2RRduq422-FAqasQxvT14",
  authDomain: "bowling-tracker-eadd5.firebaseapp.com",
  projectId: "bowling-tracker-eadd5",
  storageBucket: "bowling-tracker-eadd5.firebasestorage.app",
  messagingSenderId: "864443842846",
  appId: "1:864443842846:web:0ec954da0a4db447d6c90f"
};

// ── Password ─────────────────────────────────────────────────
// Change this to whatever you want your login password to be
const PASSWORD = 'collectibles2024';

// ── State ────────────────────────────────────────────────────
const state = {
  loggedIn: sessionStorage.getItem('profit_auth') === 'true',
  view: 'dashboard',
  selectedLotId: null,
  lots: [],
  sales: [],
  loaded: false,
  modal: null,
  editLot: null,
  filterCategory: 'all',
  sortLots: 'date-desc',
};

// ── Firebase ─────────────────────────────────────────────────
let db;

function initFirebase() {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  onSnapshot(collection(db, 'profit_lots'), snap => {
    state.lots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.loaded) render();
  });

  onSnapshot(collection(db, 'profit_sales'), snap => {
    state.sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!state.loaded) state.loaded = true;
    render();
  });
}

// ── Storage ──────────────────────────────────────────────────
async function addLot(data) {
  const id = 'lot_' + Date.now();
  await setDoc(doc(db, 'profit_lots', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateLot(id, data) {
  await setDoc(doc(db, 'profit_lots', id), data);
}

async function deleteLot(id) {
  await deleteDoc(doc(db, 'profit_lots', id));
  const batch = writeBatch(db);
  state.sales.filter(s => s.lotId === id).forEach(s => batch.delete(doc(db, 'profit_sales', s.id)));
  await batch.commit();
}

async function addSale(data) {
  const id = 'sale_' + Date.now();
  await setDoc(doc(db, 'profit_sales', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function deleteSale(id) {
  await deleteDoc(doc(db, 'profit_sales', id));
}

// ── Stats ─────────────────────────────────────────────────────
function getLotStats(lotId) {
  const lot = state.lots.find(l => l.id === lotId);
  const sales = state.sales.filter(s => s.lotId === lotId);
  const totalGross = sales.reduce((sum, s) => sum + s.price, 0);
  const totalFees = sales.reduce((sum, s) => sum + (s.fees || 0), 0);
  const totalNet = totalGross - totalFees;
  const cost = lot ? lot.cost : 0;
  return { totalGross, totalFees, totalNet, cost, profit: totalNet - cost, salesCount: sales.length };
}

function getOverallStats() {
  const totalInvested = state.lots.reduce((sum, l) => sum + l.cost, 0);
  const totalGross = state.sales.reduce((sum, s) => sum + s.price, 0);
  const totalFees = state.sales.reduce((sum, s) => sum + (s.fees || 0), 0);
  const totalNet = totalGross - totalFees;
  return { totalInvested, totalGross, totalFees, totalNet, profit: totalNet - totalInvested, lotCount: state.lots.length };
}

// ── Helpers ───────────────────────────────────────────────────
const catIcon = cat => ({ games: '🎮', cards: '🃏', toys: '🧸', other: '📦' }[cat] || '📦');
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = n => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtSigned = n => (n < 0 ? '-' : '') + fmt(n);
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const today = () => new Date().toISOString().split('T')[0];

// ── Render ────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('root');
  if (!state.loggedIn) {
    root.innerHTML = renderLogin();
    bindLogin();
    return;
  }
  if (!state.loaded) {
    root.innerHTML = `<div class="loading">Loading your data...</div>`;
    return;
  }
  root.innerHTML = renderApp();
  bindApp();
}

// ── Login ─────────────────────────────────────────────────────
function renderLogin() {
  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-icon">📦</div>
        <h1>Collectibles Tracker</h1>
        <p>Private profit tracker</p>
        <div class="form-group">
          <input type="password" id="pw-input" class="input" placeholder="Password" autocomplete="current-password">
          <div class="error-msg hidden" id="pw-error">Incorrect password — try again</div>
        </div>
        <button class="btn btn-primary btn-block" id="login-btn">Login</button>
      </div>
    </div>
  `;
}

function bindLogin() {
  const input = document.getElementById('pw-input');
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('pw-error');

  const attempt = () => {
    if (input.value === PASSWORD) {
      sessionStorage.setItem('profit_auth', 'true');
      state.loggedIn = true;
      initFirebase();
      render();
    } else {
      err.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  };

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  input.focus();
}

// ── App Shell ─────────────────────────────────────────────────
function renderApp() {
  let content = '';
  if (state.view === 'dashboard') content = renderDashboard();
  else if (state.view === 'lots') content = renderLots();
  else if (state.view === 'lot-detail') content = renderLotDetail();

  return `
    <div class="app">
      <header class="header">
        <div class="header-inner">
          <div class="header-brand">
            <span class="brand-icon">📦</span>
            <span class="brand-name">Collectibles Tracker</span>
          </div>
          <nav class="header-nav">
            <button class="nav-btn ${state.view === 'dashboard' ? 'active' : ''}" data-nav="dashboard">Dashboard</button>
            <button class="nav-btn ${['lots','lot-detail'].includes(state.view) ? 'active' : ''}" data-nav="lots">Lots</button>
          </nav>
          <button class="btn btn-ghost" id="logout-btn">Logout</button>
        </div>
      </header>
      <main class="main">${content}</main>
      ${state.modal ? renderModal() : ''}
    </div>
  `;
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
  const stats = getOverallStats();
  const pc = stats.profit >= 0 ? 'positive' : 'negative';
  const roi = stats.totalInvested > 0 ? ((stats.profit / stats.totalInvested) * 100).toFixed(1) + '% ROI' : '—';
  const avgProfit = stats.lotCount > 0 ? fmtSigned(stats.profit / stats.lotCount) : '$0.00';

  const categories = ['games','cards','toys','other'];
  const catStats = categories.map(cat => {
    const lots = state.lots.filter(l => l.category === cat);
    const invested = lots.reduce((s, l) => s + l.cost, 0);
    const lotIds = lots.map(l => l.id);
    const revenue = state.sales.filter(s => lotIds.includes(s.lotId)).reduce((s, sale) => s + sale.price, 0);
    return { cat, count: lots.length, invested, revenue, profit: revenue - invested };
  }).filter(c => c.count > 0);

  const recentLots = [...state.lots]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return `
    <div class="dashboard">
      <div class="page-header">
        <h2>Dashboard</h2>
        <button class="btn btn-primary" data-open-modal="add-lot">+ Add Lot</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Invested</div>
          <div class="stat-value">${fmt(stats.totalInvested)}</div>
          <div class="stat-sub">${stats.lotCount} lot${stats.lotCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value positive">${fmt(stats.totalNet)}</div>
          <div class="stat-sub">${state.sales.length} sale${state.sales.length !== 1 ? 's' : ''} · ${fmt(stats.totalFees)} fees</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Net Profit</div>
          <div class="stat-value ${pc}">${fmtSigned(stats.profit)}</div>
          <div class="stat-sub">${roi}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Profit / Lot</div>
          <div class="stat-value ${pc}">${avgProfit}</div>
          <div class="stat-sub">per lot</div>
        </div>
      </div>

      ${catStats.length > 0 ? `
        <div class="section">
          <h3>By Category</h3>
          <div class="cat-grid">
            ${catStats.map(c => `
              <div class="cat-card">
                <div class="cat-icon">${catIcon(c.cat)}</div>
                <div class="cat-info">
                  <div class="cat-name">${capitalize(c.cat)}</div>
                  <div class="cat-count">${c.count} lot${c.count !== 1 ? 's' : ''}</div>
                </div>
                <div class="cat-stats">
                  <div class="cat-profit ${c.profit >= 0 ? 'positive' : 'negative'}">${fmtSigned(c.profit)}</div>
                  <div class="cat-invested">in: ${fmt(c.invested)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${recentLots.length > 0 ? `
        <div class="section">
          <h3>Recent Lots</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th>Name</th><th>Category</th><th>Date</th><th>Cost</th><th>Net Revenue</th><th>Profit</th>
              </tr></thead>
              <tbody>
                ${recentLots.map(lot => {
                  const s = getLotStats(lot.id);
                  const lpc = s.profit >= 0 ? 'positive' : 'negative';
                  return `
                    <tr class="clickable" data-goto-lot="${lot.id}">
                      <td>${lot.name}</td>
                      <td><span class="badge badge-${lot.category}">${catIcon(lot.category)} ${capitalize(lot.category)}</span></td>
                      <td>${fmtDate(lot.date)}</td>
                      <td>${fmt(lot.cost)}</td>
                      <td class="positive">${fmt(s.totalNet)}</td>
                      <td class="${lpc}">${fmtSigned(s.profit)}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>No lots yet. Add your first lot to get started!</p>
          <button class="btn btn-primary" data-open-modal="add-lot">+ Add Lot</button>
        </div>
      `}
    </div>
  `;
}

// ── Lots List ─────────────────────────────────────────────────
function renderLots() {
  let lots = [...state.lots];
  if (state.filterCategory !== 'all') lots = lots.filter(l => l.category === state.filterCategory);

  lots.sort((a, b) => {
    if (state.sortLots === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (state.sortLots === 'date-asc')  return new Date(a.date) - new Date(b.date);
    const sa = getLotStats(a.id), sb = getLotStats(b.id);
    if (state.sortLots === 'profit-desc') return sb.profit - sa.profit;
    if (state.sortLots === 'cost-desc')   return b.cost - a.cost;
    return 0;
  });

  return `
    <div class="lots-view">
      <div class="page-header">
        <h2>All Lots</h2>
        <button class="btn btn-primary" data-open-modal="add-lot">+ Add Lot</button>
      </div>

      <div class="filters">
        <div class="filter-tabs">
          ${['all','games','cards','toys','other'].map(c => `
            <button class="filter-tab ${state.filterCategory === c ? 'active' : ''}" data-filter="${c}">
              ${c === 'all' ? 'All' : catIcon(c) + ' ' + capitalize(c)}
            </button>
          `).join('')}
        </div>
        <select class="select" id="sort-select" style="width:auto">
          <option value="date-desc"   ${state.sortLots === 'date-desc'   ? 'selected' : ''}>Newest First</option>
          <option value="date-asc"    ${state.sortLots === 'date-asc'    ? 'selected' : ''}>Oldest First</option>
          <option value="profit-desc" ${state.sortLots === 'profit-desc' ? 'selected' : ''}>Most Profitable</option>
          <option value="cost-desc"   ${state.sortLots === 'cost-desc'   ? 'selected' : ''}>Highest Cost</option>
        </select>
      </div>

      ${lots.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">📦</div><p>No lots found.</p></div>
      ` : `
        <div class="lots-grid">
          ${lots.map(lot => {
            const s = getLotStats(lot.id);
            const lpc = s.profit >= 0 ? 'positive' : 'negative';
            const pct = s.cost > 0 ? ((s.profit / s.cost) * 100).toFixed(0) + '%' : '';
            return `
              <div class="lot-card" data-goto-lot="${lot.id}">
                <div class="lot-card-header">
                  <span class="badge badge-${lot.category}">${catIcon(lot.category)} ${capitalize(lot.category)}</span>
                  <span class="lot-date">${fmtDate(lot.date)}</span>
                </div>
                <h3 class="lot-name">${lot.name}</h3>
                ${lot.notes ? `<p class="lot-notes">${lot.notes}</p>` : ''}
                <div class="lot-financials">
                  <div class="lot-fin-row"><span>Cost</span><span>${fmt(lot.cost)}</span></div>
                  <div class="lot-fin-row"><span>Net Revenue (${s.salesCount} sales)</span><span class="positive">${fmt(s.totalNet)}</span></div>
                  <div class="lot-fin-row lot-fin-total">
                    <span>Profit</span>
                    <span class="${lpc}">${fmtSigned(s.profit)} ${pct ? `(${pct})` : ''}</span>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// ── Lot Detail ────────────────────────────────────────────────
function renderLotDetail() {
  const lot = state.lots.find(l => l.id === state.selectedLotId);
  if (!lot) { state.view = 'lots'; return renderLots(); }

  const sales = state.sales
    .filter(s => s.lotId === lot.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const stats = getLotStats(lot.id);
  const pc = stats.profit >= 0 ? 'positive' : 'negative';
  const pct = stats.cost > 0 ? ((stats.profit / stats.cost) * 100).toFixed(1) + '%' : null;

  return `
    <div class="lot-detail">
      <div class="page-header">
        <div class="back-nav">
          <button class="btn btn-ghost" id="back-btn">← Back</button>
          <span class="breadcrumb">Lots / ${lot.name}</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" id="edit-lot-btn">Edit</button>
          <button class="btn btn-danger" id="delete-lot-btn">Delete Lot</button>
        </div>
      </div>

      <div class="lot-detail-header">
        <div class="lot-detail-info">
          <span class="badge badge-${lot.category}">${catIcon(lot.category)} ${capitalize(lot.category)}</span>
          <h2>${lot.name}</h2>
          <p class="lot-detail-date">Purchased ${fmtDate(lot.date)}</p>
          ${lot.notes ? `<p class="lot-detail-notes">${lot.notes}</p>` : ''}
        </div>
        <div class="lot-pnl">
          <div class="pnl-row"><span>Cost</span><span>${fmt(lot.cost)}</span></div>
          <div class="pnl-row"><span>Gross Sales</span><span>${fmt(stats.totalGross)}</span></div>
          <div class="pnl-row"><span>Fees</span><span class="negative">-${fmt(stats.totalFees)}</span></div>
          <div class="pnl-row"><span>Net Revenue</span><span class="positive">${fmt(stats.totalNet)}</span></div>
          <div class="pnl-row pnl-total"><span>Net Profit</span><span class="${pc}">${fmtSigned(stats.profit)}</span></div>
          ${pct ? `<div class="pnl-row"><span>ROI</span><span class="${pc}">${pct}</span></div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>Sales (${sales.length})</h3>
          <button class="btn btn-primary" data-open-modal="add-sale">+ Record Sale</button>
        </div>

        ${sales.length === 0 ? `
          <div class="empty-state small"><p>No sales recorded yet for this lot.</p></div>
        ` : `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Item</th><th>Platform</th><th>Date</th><th>Sale</th><th>Fees</th><th>Net</th><th></th></tr></thead>
              <tbody>
                ${sales.map(sale => {
                  const fees = sale.fees || 0;
                  const net = sale.price - fees;
                  return `
                  <tr>
                    <td>${sale.item}</td>
                    <td><span class="platform-tag">${sale.platform || '—'}</span></td>
                    <td>${fmtDate(sale.date)}</td>
                    <td>${fmt(sale.price)}</td>
                    <td class="negative">${fees > 0 ? '-' + fmt(fees) : '—'}</td>
                    <td class="positive">${fmt(net)}</td>
                    <td><button class="btn-delete-sale" data-sale-id="${sale.id}">✕</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// ── Modals ────────────────────────────────────────────────────
function renderModal() {
  const overlay = `<div class="modal-overlay" id="modal-overlay">`;

  if (state.modal === 'add-lot' || state.modal === 'edit-lot') {
    const isEdit = state.modal === 'edit-lot';
    const lot = isEdit ? state.editLot : null;
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Lot' : 'Add New Lot'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Lot Name *</label>
            <input type="text" id="lot-name" class="input" placeholder="e.g. Estate Sale Box, Card Collection" value="${isEdit ? lot.name : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select id="lot-category" class="select">
                ${['games','cards','toys','other'].map(c => `
                  <option value="${c}" ${isEdit && lot.category === c ? 'selected' : ''}>${catIcon(c)} ${capitalize(c)}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date Purchased *</label>
              <input type="date" id="lot-date" class="input" value="${isEdit ? lot.date : today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Cost *</label>
            <input type="number" id="lot-cost" class="input" placeholder="0.00" min="0" step="0.01" value="${isEdit ? lot.cost : ''}">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="lot-notes" class="input textarea" placeholder="Where you got it, what's inside, etc.">${isEdit ? (lot.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="lot-submit-btn">${isEdit ? 'Save Changes' : 'Add Lot'}</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-sale') {
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>Record Sale</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Item Description *</label>
            <input type="text" id="sale-item" class="input" placeholder="e.g. Pokemon Blue, Mario Kart 64">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sale Price *</label>
              <input type="number" id="sale-price" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Fees (eBay, PayPal, etc.)</label>
              <input type="number" id="sale-fees" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
          </div>
          <div class="form-group">
            <label>Date Sold *</label>
            <input type="date" id="sale-date" class="input" value="${today()}">
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="sale-platform" class="select">
              <option value="">— Select —</option>
              ${['eBay','Facebook Marketplace','Local','Whatnot','Amazon','In-Person','Other'].map(p =>
                `<option value="${p}">${p}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="sale-submit-btn">Record Sale</button>
        </div>
      </div>
    </div>`;
  }

  return '';
}

// ── Event Binding ─────────────────────────────────────────────
function bindApp() {
  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('profit_auth');
    state.loggedIn = false;
    render();
  });

  // Nav
  document.querySelectorAll('[data-nav]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.view = btn.dataset.nav;
      state.selectedLotId = null;
      render();
    })
  );

  // Open modals
  document.querySelectorAll('[data-open-modal]').forEach(btn =>
    btn.addEventListener('click', () => { state.modal = btn.dataset.openModal; render(); })
  );

  // Go to lot detail
  document.querySelectorAll('[data-goto-lot]').forEach(el =>
    el.addEventListener('click', () => {
      state.selectedLotId = el.dataset.gotoLot;
      state.view = 'lot-detail';
      render();
    })
  );

  // Filters
  document.querySelectorAll('[data-filter]').forEach(btn =>
    btn.addEventListener('click', () => { state.filterCategory = btn.dataset.filter; render(); })
  );

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', e => { state.sortLots = e.target.value; render(); });

  // Back
  document.getElementById('back-btn')?.addEventListener('click', () => { state.view = 'lots'; render(); });

  // Edit lot
  document.getElementById('edit-lot-btn')?.addEventListener('click', () => {
    state.editLot = state.lots.find(l => l.id === state.selectedLotId);
    state.modal = 'edit-lot';
    render();
  });

  // Delete lot
  document.getElementById('delete-lot-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this lot and ALL its sales? This cannot be undone.')) {
      await deleteLot(state.selectedLotId);
      state.selectedLotId = null;
      state.view = 'lots';
    }
  });

  // Delete sale
  document.querySelectorAll('[data-sale-id]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm('Remove this sale?')) await deleteSale(btn.dataset.saleId);
    })
  );

  // Close modal
  const closeModal = () => { state.modal = null; state.editLot = null; render(); };
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });

  // Submit lot
  document.getElementById('lot-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('lot-name').value.trim();
    const cost = parseFloat(document.getElementById('lot-cost').value);
    const date = document.getElementById('lot-date').value;
    if (!name || isNaN(cost) || !date) { alert('Please fill in all required fields.'); return; }
    const data = {
      name,
      category: document.getElementById('lot-category').value,
      cost,
      date,
      notes: document.getElementById('lot-notes').value.trim(),
    };
    if (state.modal === 'edit-lot') {
      await updateLot(state.editLot.id, { ...state.editLot, ...data });
    } else {
      await addLot(data);
    }
    closeModal();
  });

  // Submit sale
  document.getElementById('sale-submit-btn')?.addEventListener('click', async () => {
    const item = document.getElementById('sale-item').value.trim();
    const price = parseFloat(document.getElementById('sale-price').value);
    const fees = parseFloat(document.getElementById('sale-fees').value) || 0;
    const date = document.getElementById('sale-date').value;
    if (!item || isNaN(price) || !date) { alert('Please fill in all required fields.'); return; }
    await addSale({
      lotId: state.selectedLotId,
      item,
      price,
      fees,
      date,
      platform: document.getElementById('sale-platform').value,
    });
    closeModal();
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.loggedIn) initFirebase();
  render();
});
