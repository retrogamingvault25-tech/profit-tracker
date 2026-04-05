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
  flips: [],
  challengeExpenses: [],
  expenses: [],
  loaded: false,
  flipsLoaded: false,
  modal: null,
  editLot: null,
  editFlip: null,
  filterCategory: 'all',
  sortLots: 'date-desc',
  pc: { rawText: '', bulkResults: [], loading: false, progress: 0, total: 0, error: null },
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

  onSnapshot(collection(db, 'challenge_flips'), snap => {
    state.flips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.flipsLoaded = true;
    render();
  });

  onSnapshot(collection(db, 'challenge_expenses'), snap => {
    state.challengeExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'profit_expenses'), snap => {
    state.expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

async function addChallengeExpense(data) {
  const id = 'cexp_' + Date.now();
  await setDoc(doc(db, 'challenge_expenses', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function deleteChallengeExpense(id) {
  await deleteDoc(doc(db, 'challenge_expenses', id));
}

async function addExpense(data) {
  const id = 'exp_' + Date.now();
  await setDoc(doc(db, 'profit_expenses', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function deleteExpense(id) {
  await deleteDoc(doc(db, 'profit_expenses', id));
}

async function addFlip(data) {
  const id = 'flip_' + Date.now();
  await setDoc(doc(db, 'challenge_flips', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateFlip(id, data) {
  const existing = state.flips.find(f => f.id === id) || {};
  await setDoc(doc(db, 'challenge_flips', id), { ...existing, ...data });
}

async function deleteFlip(id) {
  await deleteDoc(doc(db, 'challenge_flips', id));
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

// ── Challenge Stats ───────────────────────────────────────────
const CHALLENGE_START = 10;
const CHALLENGE_GOAL  = 5000;

function getChallengeStats() {
  const totalSpent    = state.flips.reduce((s, f) => s + (f.boughtFor || 0), 0);
  const totalSold     = state.flips.filter(f => f.status === 'sold').reduce((s, f) => s + (f.soldFor || 0), 0);
  const totalChallengeExpenses = state.challengeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const currentCash   = CHALLENGE_START - totalSpent + totalSold - totalChallengeExpenses;
  const listedValue = state.flips
    .filter(f => f.status !== 'sold')
    .reduce((s, f) => s + (f.listedPrice || f.boughtFor || 0), 0);
  const totalPotential = currentCash + listedValue;
  const progress = Math.min((currentCash / CHALLENGE_GOAL) * 100, 100);
  const completedFlips = state.flips.filter(f => f.status === 'sold');
  const bestFlip = completedFlips.length
    ? Math.max(...completedFlips.map(f => (f.soldFor || 0) - (f.boughtFor || 0)))
    : 0;
  const totalProfit = completedFlips.reduce((s, f) => s + ((f.soldFor || 0) - (f.boughtFor || 0)), 0);
  return { currentCash, listedValue, totalPotential, progress, bestFlip, totalProfit, completedCount: completedFlips.length };
}

// ── PriceCharting API ─────────────────────────────────────────
const PC_TOKEN = '6e3679e5bb6e87791b896e108b70d69af12dc066';
const PC_BASE  = 'https://www.pricecharting.com/api';

async function pcGetPrices(queryStr) {
  const url  = `${PC_BASE}/product?t=${PC_TOKEN}&${queryStr}`;
  console.log('[PC] fetching:', url);
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  console.log('[PC] response:', data);
  if (data.status !== 'success') throw new Error(data['error-message'] || 'Not found');
  return data;
}

const pcFmt  = pennies => (pennies && pennies > 0) ? '$' + (pennies / 100).toFixed(2) : '—';
const pcSleep = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers ───────────────────────────────────────────────────
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  else if (state.view === 'challenge') content = renderChallenge();
  else if (state.view === 'expenses') content = renderExpenses();

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
            <button class="nav-btn ${state.view === 'challenge' ? 'active' : ''}" data-nav="challenge">🏆 $10→$5K</button>
            <button class="nav-btn ${state.view === 'expenses' ? 'active' : ''}" data-nav="expenses">💸 Expenses</button>
            <button class="nav-btn ${state.modal === 'price-lookup' ? 'active' : ''}" data-open-modal="price-lookup">🔍 Price Lookup</button>
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

  if (state.modal === 'add-expense') {
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>Add Expense</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Description *</label>
            <input type="text" id="exp-desc" class="input" placeholder="e.g. Bubble mailers, tape, etc.">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="exp-category" class="select">
                ${EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="exp-date" class="input" value="${today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Amount *</label>
            <input type="number" id="exp-amount" class="input" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <input type="text" id="exp-notes" class="input" placeholder="Optional">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="expense-submit-btn">Add Expense</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'price-lookup') return renderPriceLookupModal();

  return '';
}

function renderPriceLookupModal() {
  const pc = state.pc;
  const hasResults = pc.bulkResults.length > 0;

  return `
    <div class="modal-overlay active" id="modal-overlay">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h3>🔍 Price Lookup</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-dim" style="margin-bottom:10px;font-size:13px;">Paste your item list below — one item per line. It will look up each one automatically.</p>
          <textarea id="pc-paste" class="input pc-textarea" placeholder="Super Mario World SNES&#10;Pokemon Base Set Booster Pack&#10;Zelda Ocarina of Time N64" ${pc.loading ? 'disabled' : ''}>${escHtml(pc.rawText)}</textarea>
          <div class="pc-action-row">
            <button class="btn btn-primary" id="pc-lookup-btn" ${pc.loading ? 'disabled' : ''}>
              ${pc.loading ? `Looking up ${pc.progress} / ${pc.total}…` : 'Look Up Prices'}
            </button>
            ${hasResults ? `<button class="btn btn-ghost" id="pc-clear-btn">Clear Results</button>` : ''}
          </div>
          ${pc.error ? `<div class="pc-error">${escHtml(pc.error)}</div>` : ''}
          ${pc.loading ? `<div class="pc-progress-bar"><div class="pc-progress-fill" style="width:${pc.total ? (pc.progress/pc.total*100) : 0}%"></div></div>` : ''}
          ${hasResults ? `
            <div class="table-wrap mt-12">
              <table class="table pc-table">
                <thead>
                  <tr><th>Item</th><th>Console</th><th>CIB</th><th>New</th><th>Box Only</th><th>Manual Only</th></tr>
                </thead>
                <tbody>
                  ${pc.bulkResults.map(r => r.error
                    ? `<tr><td colspan="6"><span class="text-dim">${escHtml(r.item)}</span> <span class="pc-not-found">— ${escHtml(r.errorMsg || 'not found')}</span></td></tr>`
                    : `<tr>
                        <td><strong>${escHtml(r.name)}</strong></td>
                        <td class="text-dim">${escHtml(r.console)}</td>
                        <td class="money">${pcFmt(r.cib)}</td>
                        <td class="money">${pcFmt(r.newP)}</td>
                        <td class="money">${pcFmt(r.boxOnly)}</td>
                        <td class="money">${pcFmt(r.manualOnly)}</td>
                      </tr>`
                  ).join('')}
                </tbody>
              </table>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Expenses View ─────────────────────────────────────────────
const EXPENSE_CATS = ['Shipping Supplies', 'Packaging', 'Shipping Costs', 'Platform Fees', 'Tools & Equipment', 'Travel', 'Other'];

function renderExpenses() {
  const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalSpent = state.expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const byCat = {};
  state.expenses.forEach(e => {
    const cat = e.category || 'Other';
    byCat[cat] = (byCat[cat] || 0) + (e.amount || 0);
  });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return `
    <div class="expenses-view">
      <div class="page-header">
        <h2>💸 Expenses</h2>
        <button class="btn btn-primary" data-open-modal="add-expense">+ Add Expense</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Spent</div>
          <div class="stat-value negative">${fmt(totalSpent)}</div>
          <div class="stat-sub">${state.expenses.length} expense${state.expenses.length !== 1 ? 's' : ''}</div>
        </div>
        ${topCats.slice(0, 3).map(([cat, amt]) => `
          <div class="stat-card">
            <div class="stat-label">${cat}</div>
            <div class="stat-value">${fmt(amt)}</div>
            <div class="stat-sub">${((amt / totalSpent) * 100).toFixed(0)}% of total</div>
          </div>
        `).join('')}
      </div>

      <div class="card mt-24">
        <div class="card-header"><h3>All Expenses</h3></div>
        ${sorted.length === 0
          ? `<div class="empty-state"><div class="empty-icon">💸</div><p>No expenses logged yet.</p></div>`
          : `<div class="table-wrap"><table class="table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="money">Amount</th><th></th></tr></thead>
              <tbody>
                ${sorted.map(e => `
                  <tr>
                    <td class="date-cell">${fmtDate(e.date)}</td>
                    <td>${escHtml(e.description)}</td>
                    <td><span class="badge badge-cat">${escHtml(e.category || 'Other')}</span></td>
                    <td class="money negative">${fmt(e.amount)}</td>
                    <td class="action-cell"><button class="btn btn-danger btn-xs" data-delete-expense="${e.id}">Delete</button></td>
                  </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>
    </div>
  `;
}

// ── Event Binding ─────────────────────────────────────────────
// ── Challenge View ────────────────────────────────────────────
function renderChallenge() {
  const s = getChallengeStats();
  const active = state.flips.filter(f => f.status !== 'sold').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sold   = state.flips.filter(f => f.status === 'sold').sort((a,b) => new Date(b.dateSold||b.createdAt) - new Date(a.dateSold||a.createdAt));
  const pct    = s.progress.toFixed(1);
  const cashCls = s.currentCash >= 0 ? 'positive' : 'negative';

  return `
    <div class="challenge-view">
      <div class="page-header">
        <h2>🏆 $10 → $5,000 Challenge</h2>
        <button class="btn btn-primary" data-open-modal="add-flip">+ Add Flip</button>
      </div>

      <!-- Progress bar -->
      <div class="challenge-progress-card">
        <div class="cp-top">
          <span class="cp-label">Progress</span>
          <span class="cp-pct">${pct}%</span>
        </div>
        <div class="cp-bar-track">
          <div class="cp-bar-fill" style="width:${Math.max(0,s.progress)}%"></div>
        </div>
        <div class="cp-ends">
          <span>$10</span>
          <span>$5,000</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="challenge-stats">
        <div class="cs-card cs-card--green">
          <div class="cs-label">Current Cash</div>
          <div class="cs-value ${cashCls}">${fmt(s.currentCash)}</div>
          <div class="cs-sub">Money in hand</div>
        </div>
        <div class="cs-card cs-card--blue">
          <div class="cs-label">Listed Value</div>
          <div class="cs-value">${fmt(s.listedValue)}</div>
          <div class="cs-sub">${active.length} item${active.length !== 1 ? 's' : ''} out there</div>
        </div>
        <div class="cs-card cs-card--purple">
          <div class="cs-label">Total Potential</div>
          <div class="cs-value">${fmt(s.totalPotential)}</div>
          <div class="cs-sub">Cash + listed</div>
        </div>
        <div class="cs-card cs-card--yellow">
          <div class="cs-label">Best Flip</div>
          <div class="cs-value positive">${fmt(s.bestFlip)}</div>
          <div class="cs-sub">${s.completedCount} flip${s.completedCount !== 1 ? 's' : ''} completed</div>
        </div>
      </div>

      <!-- Active items -->
      <div class="section">
        <h3>Active (${active.length})</h3>
        ${active.length === 0
          ? `<div class="empty-state small"><p>No active items — add your first flip!</p></div>`
          : `<div class="table-wrap"><table class="table">
              <thead><tr><th>Item</th><th>Category</th><th>Date</th><th>Bought For</th><th>Listed At</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${active.map(f => `
                  <tr>
                    <td><strong>${escHtml(f.item)}</strong>${f.notes ? `<div class="item-note">${escHtml(f.notes)}</div>` : ''}</td>
                    <td>${catIcon(f.category)} ${capitalize(f.category)}</td>
                    <td class="text-dim">${fmtDate(f.date)}</td>
                    <td>${fmt(f.boughtFor)}</td>
                    <td>${f.listedPrice ? fmt(f.listedPrice) : '<span class="text-dim">—</span>'}</td>
                    <td><span class="flip-status flip-status--${f.status}">${f.status === 'listed' ? 'Listed' : 'In Hand'}</span></td>
                    <td class="action-cell">
                      <button class="btn-sm-action" data-sell-flip="${f.id}">Mark Sold</button>
                      <button class="btn-sm-action btn-sm-edit" data-edit-flip="${f.id}">Edit</button>
                      <button class="btn-sm-action btn-sm-del" data-delete-flip="${f.id}">Del</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>

      <!-- Completed flips -->
      <div class="section">
        <h3>Completed Flips (${sold.length})</h3>
        ${sold.length === 0
          ? `<div class="empty-state small"><p>No completed flips yet.</p></div>`
          : `<div class="table-wrap"><table class="table">
              <thead><tr><th>Item</th><th>Category</th><th>Bought For</th><th>Sold For</th><th>Profit</th><th>Platform</th><th>Date Sold</th><th></th></tr></thead>
              <tbody>
                ${sold.map(f => {
                  const profit = (f.soldFor || 0) - (f.boughtFor || 0);
                  const pc = profit >= 0 ? 'positive' : 'negative';
                  return `<tr>
                    <td><strong>${escHtml(f.item)}</strong></td>
                    <td>${catIcon(f.category)} ${capitalize(f.category)}</td>
                    <td>${fmt(f.boughtFor)}</td>
                    <td class="positive">${fmt(f.soldFor)}</td>
                    <td class="${pc}">${fmtSigned(profit)}</td>
                    <td class="text-dim">${f.platform || '—'}</td>
                    <td class="text-dim">${f.dateSold ? fmtDate(f.dateSold) : '—'}</td>
                    <td><button class="btn-sm-action btn-sm-del" data-delete-flip="${f.id}">Del</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>`}
      </div>
      <!-- Challenge Expenses -->
      <div class="section">
        <div class="section-header">
          <h3>Expenses (${state.challengeExpenses.length})</h3>
          <button class="btn btn-outline btn-sm" data-open-modal="add-challenge-expense">+ Add Expense</button>
        </div>
        ${state.challengeExpenses.length === 0
          ? `<div class="empty-state small"><p>No expenses yet — log shipping costs, supplies, etc.</p></div>`
          : `<div class="table-wrap"><table class="table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="money">Amount</th><th></th></tr></thead>
              <tbody>
                ${[...state.challengeExpenses].sort((a,b) => new Date(b.date)-new Date(a.date)).map(e => `
                  <tr>
                    <td class="text-dim">${fmtDate(e.date)}</td>
                    <td>${escHtml(e.description)}</td>
                    <td><span class="badge badge-cat">${escHtml(e.category||'Other')}</span></td>
                    <td class="money negative">${fmt(e.amount)}</td>
                    <td class="action-cell"><button class="btn-sm-action btn-sm-del" data-delete-cexp="${e.id}">Del</button></td>
                  </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>
    </div>

    ${state.modal === 'add-flip' || state.modal === 'edit-flip' ? renderFlipModal() : ''}
    ${state.modal === 'sell-flip' ? renderSellModal() : ''}
    ${state.modal === 'add-challenge-expense' ? renderChallengeExpenseModal() : ''}
  `;
}

function renderFlipModal() {
  const f = state.editFlip;
  return `
    <div class="modal-overlay active" id="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>${f ? 'Edit Flip' : 'Add Flip'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Item *</label>
            <input type="text" id="flip-item" class="input" placeholder="e.g. Pokemon Booster Box" value="${escHtml(f?.item||'')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="flip-category" class="select">
                <option value="games"  ${f?.category==='games'  ?'selected':''}>🎮 Games</option>
                <option value="cards"  ${f?.category==='cards'  ?'selected':''}>🃏 Cards</option>
                <option value="toys"   ${f?.category==='toys'   ?'selected':''}>🧸 Toys</option>
                <option value="other"  ${f?.category==='other'  ?'selected':''}>📦 Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date Bought *</label>
              <input type="date" id="flip-date" class="input" value="${f?.date || today()}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bought For *</label>
              <input type="number" id="flip-bought" class="input" placeholder="0.00" value="${f?.boughtFor||''}" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Listed Price</label>
              <input type="number" id="flip-listed" class="input" placeholder="0.00" value="${f?.listedPrice||''}" step="0.01" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select id="flip-status" class="select">
                <option value="active" ${f?.status==='active'||!f?'selected':''}>In Hand</option>
                <option value="listed" ${f?.status==='listed'?'selected':''}>Listed for Sale</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input type="text" id="flip-notes" class="input" placeholder="Optional" value="${escHtml(f?.notes||'')}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="flip-submit-btn">${f ? 'Save Changes' : 'Add Flip'}</button>
        </div>
      </div>
    </div>`;
}

function renderSellModal() {
  const f = state.flips.find(fl => fl.id === state.sellFlipId);
  if (!f) return '';
  return `
    <div class="modal-overlay active" id="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Mark as Sold</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-dim">Recording sale for: <strong>${escHtml(f.item)}</strong></p>
          <div class="form-row">
            <div class="form-group">
              <label>Sold For *</label>
              <input type="number" id="sell-price" class="input" placeholder="0.00" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Date Sold</label>
              <input type="date" id="sell-date" class="input" value="${today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="sell-platform" class="select">
              <option value="">— Select —</option>
              ${['eBay','Facebook Marketplace','Local','Whatnot','Amazon','Heritage','Goldin','Other'].map(p=>`<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="sell-submit-btn">Save Sale</button>
        </div>
      </div>
    </div>`;
}

function renderChallengeExpenseModal() {
  return `
    <div class="modal-overlay active" id="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Add Challenge Expense</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Description *</label>
            <input type="text" id="cexp-desc" class="input" placeholder="e.g. Bubble mailers, shipping label">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="cexp-category" class="select">
                ${EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="cexp-date" class="input" value="${today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Amount *</label>
            <input type="number" id="cexp-amount" class="input" placeholder="0.00" min="0" step="0.01">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="cexp-submit-btn">Add Expense</button>
        </div>
      </div>
    </div>`;
}

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

  // Price Lookup — bulk lookup
  document.getElementById('pc-lookup-btn')?.addEventListener('click', async () => {
    const raw = document.getElementById('pc-paste').value;
    const items = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (!items.length) return;
    state.pc = { rawText: raw, bulkResults: [], loading: true, progress: 0, total: items.length, error: null };
    render();
    for (let i = 0; i < items.length; i++) {
      try {
        const data = await pcGetPrices(`q=${encodeURIComponent(items[i])}`);
        state.pc.bulkResults.push({
          item: items[i],
          name: data['product-name'] || items[i],
          console: data['console-name'] || '',
          cib: data['cib-price'],
          newP: data['new-price'],
          boxOnly: data['box-only-price'],
          manualOnly: data['manual-only-price'],
        });
      } catch(e) {
        console.error('[PC] error for', items[i], e);
        state.pc.bulkResults.push({ item: items[i], error: true, errorMsg: e.message });
      }
      state.pc.progress = i + 1;
      render();
      if (i < items.length - 1) await pcSleep(1100);
    }
    state.pc.loading = false;
    render();
  });

  // Price Lookup — clear
  document.getElementById('pc-clear-btn')?.addEventListener('click', () => {
    state.pc = { rawText: '', bulkResults: [], loading: false, progress: 0, total: 0, error: null };
    render();
  });
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

  // Challenge — add/edit flip
  document.getElementById('flip-submit-btn')?.addEventListener('click', async () => {
    const item     = document.getElementById('flip-item').value.trim();
    const boughtFor = parseFloat(document.getElementById('flip-bought').value);
    const date     = document.getElementById('flip-date').value;
    if (!item || isNaN(boughtFor) || !date) { alert('Please fill in Item, Bought For, and Date.'); return; }
    const data = {
      item,
      category:    document.getElementById('flip-category').value,
      date,
      boughtFor,
      listedPrice: parseFloat(document.getElementById('flip-listed').value) || 0,
      status:      document.getElementById('flip-status').value,
      notes:       document.getElementById('flip-notes').value.trim(),
    };
    if (state.editFlip) await updateFlip(state.editFlip.id, data);
    else                await addFlip(data);
    state.modal = null; state.editFlip = null; render();
  });

  // Challenge — edit flip button
  document.querySelectorAll('[data-edit-flip]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.editFlip = state.flips.find(f => f.id === btn.dataset.editFlip) || null;
      state.modal = 'edit-flip';
      render();
    })
  );

  // Challenge — mark sold
  document.querySelectorAll('[data-sell-flip]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.sellFlipId = btn.dataset.sellFlip;
      state.modal = 'sell-flip';
      render();
    })
  );

  // Challenge — sell submit
  document.getElementById('sell-submit-btn')?.addEventListener('click', async () => {
    const soldFor = parseFloat(document.getElementById('sell-price').value);
    if (isNaN(soldFor) || soldFor <= 0) { alert('Please enter a sale price.'); return; }
    await updateFlip(state.sellFlipId, {
      status:   'sold',
      soldFor,
      dateSold: document.getElementById('sell-date').value,
      platform: document.getElementById('sell-platform').value,
    });
    state.modal = null; state.sellFlipId = null; render();
  });

  // Challenge — delete flip
  document.querySelectorAll('[data-delete-flip]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Delete this flip?')) await deleteFlip(btn.dataset.deleteFlip);
    })
  );

  // Challenge — add expense submit
  document.getElementById('cexp-submit-btn')?.addEventListener('click', async () => {
    const description = document.getElementById('cexp-desc').value.trim();
    const amount = parseFloat(document.getElementById('cexp-amount').value);
    const date = document.getElementById('cexp-date').value;
    if (!description || isNaN(amount) || !date) { alert('Please fill in description, amount, and date.'); return; }
    await addChallengeExpense({
      description,
      category: document.getElementById('cexp-category').value,
      amount,
      date,
    });
    state.modal = null; render();
  });

  // Challenge — delete expense
  document.querySelectorAll('[data-delete-cexp]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Delete this expense?')) await deleteChallengeExpense(btn.dataset.deleteCexp);
    })
  );

  // Submit expense
  document.getElementById('expense-submit-btn')?.addEventListener('click', async () => {
    const description = document.getElementById('exp-desc').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;
    if (!description || isNaN(amount) || !date) { alert('Please fill in description, amount, and date.'); return; }
    await addExpense({
      description,
      category: document.getElementById('exp-category').value,
      amount,
      date,
      notes: document.getElementById('exp-notes').value.trim(),
    });
    closeModal();
  });

  // Delete expense
  document.querySelectorAll('[data-delete-expense]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Delete this expense?')) await deleteExpense(btn.dataset.deleteExpense);
    })
  );

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
