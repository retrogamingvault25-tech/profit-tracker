import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Config ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDwAU-nz8RZMU2RRduq422-FAqasQxvT14",
  authDomain: "bowling-tracker-eadd5.firebaseapp.com",
  projectId: "bowling-tracker-eadd5",
  storageBucket: "bowling-tracker-eadd5.firebasestorage.app",
  messagingSenderId: "864443842846",
  appId: "1:864443842846:web:0ec954da0a4db447d6c90f"
};

const PASSWORD = 'collectibles2024';

const VENDORS = [
  { label: 'Samuels',  key: 'samuels'  },
  { label: 'P&G',      key: 'pg'       },
  { label: 'BT',       key: 'bt'       },
  { label: 'PLob',     key: 'plob'     },
  { label: 'US Foods', key: 'usfoods'  },
  { label: 'Cintas',   key: 'cintas'   },
  { label: 'Paper',    key: 'paper'    },
  { label: 'Natures',  key: 'natures'  },
  { label: 'Drinks',   key: 'drinks'   },
  { label: 'Bread',    key: 'bread'    },
];

// ── State ─────────────────────────────────────────────────────
const state = {
  loggedIn: sessionStorage.getItem('sf_auth') === 'true',
  weeks: [],
  loaded: false,
  modal: null,
  editWeek: null,
  selectedWeekId: null,
};

// ── Firebase ──────────────────────────────────────────────────
let db;

function initFirebase() {
  const app = initializeApp(firebaseConfig, 'shorefresh');
  db = getFirestore(app);
  onSnapshot(collection(db, 'sf_weeks'), async snap => {
    state.weeks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Seed first week from the 4/13–4/19 spreadsheet if nothing exists yet
    if (state.weeks.length === 0 && !state._seeded) {
      state._seeded = true;
      await addWeek({
        weekStart: '2026-04-13',
        weekLabel: '4/13 \u2013 4/19',
        sales: 33428,
        labor: 0,
        vendors: {
          samuels: 2463.90,
          pg:      2665.85,
          bt:      1719.74,
          plob:    0,
          usfoods: 2431.44,
          cintas:  318,
          paper:   0,
          natures: 401.20,
          drinks:  845,
          bread:   154,
        },
      });
      return;
    }
    state.loaded = true;
    render();
  });
}

async function addWeek(data) {
  const id = 'sfweek_' + Date.now();
  await setDoc(doc(db, 'sf_weeks', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateWeek(id, data) {
  await setDoc(doc(db, 'sf_weeks', id), data);
}

async function deleteWeek(id) {
  await deleteDoc(doc(db, 'sf_weeks', id));
}

// ── Helpers ───────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtPct = n => (n * 100).toFixed(1) + '%';
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function getWeekStats(week) {
  const cogTotal  = VENDORS.reduce((s, v) => s + (week.vendors?.[v.key] || 0), 0);
  const sales     = week.sales || 0;
  const labor     = week.labor || 0;
  const cogPct    = sales > 0 ? cogTotal / sales : 0;
  const laborPct  = sales > 0 ? labor   / sales : 0;
  const overallPct = sales > 0 ? (cogTotal + labor) / sales : 0;
  return { cogTotal, sales, labor, cogPct, laborPct, overallPct };
}

function sortedWeeks() {
  return [...state.weeks].sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
}

// Color thresholds — adjust to match your targets
function pctCls(pct, type) {
  if (type === 'cog')    return pct < 0.30 ? 'positive' : pct < 0.36 ? 'warn' : 'negative';
  if (type === 'labor')  return pct < 0.28 ? 'positive' : pct < 0.35 ? 'warn' : 'negative';
  /* overall */          return pct < 0.58 ? 'positive' : pct < 0.68 ? 'warn' : 'negative';
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('root');
  if (!state.loggedIn) { root.innerHTML = renderLogin(); bindLogin(); return; }
  if (!state.loaded)   { root.innerHTML = `<div class="loading">Loading...</div>`; return; }
  root.innerHTML = renderApp();
  bindApp();
}

// ── Login ─────────────────────────────────────────────────────
function renderLogin() {
  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-icon">🌊</div>
        <h1>Shore Fresh</h1>
        <p>P&L Tracker</p>
        <div class="form-group" style="margin-top:1.5rem">
          <input type="password" id="pw-input" class="input" placeholder="Password" autocomplete="current-password">
          <div class="error-msg hidden" id="pw-error">Incorrect password</div>
        </div>
        <button class="btn btn-primary btn-block" id="login-btn">Login</button>
      </div>
    </div>`;
}

function bindLogin() {
  const input = document.getElementById('pw-input');
  const btn   = document.getElementById('login-btn');
  const err   = document.getElementById('pw-error');
  const attempt = () => {
    if (input.value === PASSWORD) {
      sessionStorage.setItem('sf_auth', 'true');
      state.loggedIn = true;
      initFirebase();
      alert("WHAT'S UP BIG DOG");
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
  const weeks   = sortedWeeks();
  const display = weeks.find(w => w.id === state.selectedWeekId) || weeks[0];
  const displayStats = display ? getWeekStats(display) : null;

  return `
    <div class="app">
      <header class="header">
        <div class="header-inner">
          <div class="header-brand">
            <span class="brand-icon">🌊</span>
            <span class="brand-name">Shore Fresh P&L</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button class="btn btn-primary" id="add-week-btn">+ Add Week</button>
            <button class="btn btn-ghost" id="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      <main class="main">
        ${displayStats ? renderCurrentWeek(display, displayStats) : renderEmpty()}
        ${weeks.length > 0 ? renderYTD(weeks) : ''}
        ${weeks.length > 0 ? renderHistory(weeks) : ''}
      </main>
      ${state.modal ? renderWeekModal() : ''}
    </div>`;
}

// ── Current Week ──────────────────────────────────────────────
function renderCurrentWeek(week, s) {
  return `
    <div class="sf-current">
      <div class="page-header">
        <h2>Week of ${escHtml(week.weekLabel)}</h2>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Sales</div>
          <div class="stat-value positive">${fmt(s.sales)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">COG Total</div>
          <div class="stat-value">${fmt(s.cogTotal)}</div>
          <div class="stat-sub ${pctCls(s.cogPct, 'cog')}">${fmtPct(s.cogPct)} of sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Labor</div>
          <div class="stat-value">${fmt(s.labor)}</div>
          <div class="stat-sub ${pctCls(s.laborPct, 'labor')}">${fmtPct(s.laborPct)} of sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overall %</div>
          <div class="stat-value ${pctCls(s.overallPct, 'overall')}">${fmtPct(s.overallPct)}</div>
          <div class="stat-sub">(COG + Labor) ÷ Sales</div>
        </div>
      </div>

      <div class="card mt-24">
        <div class="card-header"><h3>COG Breakdown</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Vendor</th><th class="money">Amount</th><th class="money">% of COG</th><th class="money">% of Sales</th></tr>
            </thead>
            <tbody>
              ${VENDORS.filter(v => (week.vendors?.[v.key] || 0) > 0).map(v => {
                const amt    = week.vendors[v.key] || 0;
                const ofCog  = s.cogTotal > 0 ? amt / s.cogTotal : 0;
                const ofSales = s.sales   > 0 ? amt / s.sales   : 0;
                return `<tr>
                  <td><strong>${escHtml(v.label)}</strong></td>
                  <td class="money">${fmt(amt)}</td>
                  <td class="money text-dim">${fmtPct(ofCog)}</td>
                  <td class="money text-dim">${fmtPct(ofSales)}</td>
                </tr>`;
              }).join('')}
              <tr class="sf-total-row">
                <td><strong>Total COG</strong></td>
                <td class="money"><strong>${fmt(s.cogTotal)}</strong></td>
                <td class="money">100%</td>
                <td class="money ${pctCls(s.cogPct, 'cog')}">${fmtPct(s.cogPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderEmpty() {
  return `
    <div class="empty-state" style="margin-top:3rem">
      <div class="empty-icon">📊</div>
      <p>No weeks logged yet. Hit <strong>+ Add Week</strong> to get started.</p>
    </div>`;
}

// ── Year-to-Date Totals ───────────────────────────────────────
function renderYTD(weeks) {
  const totals = weeks.reduce((acc, week) => {
    const s = getWeekStats(week);
    acc.sales    += s.sales;
    acc.cogTotal += s.cogTotal;
    acc.labor    += s.labor;
    VENDORS.forEach(v => {
      acc.vendors[v.key] = (acc.vendors[v.key] || 0) + (week.vendors?.[v.key] || 0);
    });
    return acc;
  }, { sales: 0, cogTotal: 0, labor: 0, vendors: {} });

  const cogPct     = totals.sales > 0 ? totals.cogTotal / totals.sales : 0;
  const laborPct   = totals.sales > 0 ? totals.labor    / totals.sales : 0;
  const overallPct = totals.sales > 0 ? (totals.cogTotal + totals.labor) / totals.sales : 0;

  return `
    <div class="section mt-24">
      <h3>Year-to-Date Totals (${weeks.length} week${weeks.length !== 1 ? 's' : ''})</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value positive">${fmt(totals.sales)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total COG</div>
          <div class="stat-value">${fmt(totals.cogTotal)}</div>
          <div class="stat-sub ${pctCls(cogPct, 'cog')}">${fmtPct(cogPct)} of sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Labor</div>
          <div class="stat-value">${fmt(totals.labor)}</div>
          <div class="stat-sub ${pctCls(laborPct, 'labor')}">${fmtPct(laborPct)} of sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overall %</div>
          <div class="stat-value ${pctCls(overallPct, 'overall')}">${fmtPct(overallPct)}</div>
          <div class="stat-sub">(COG + Labor) ÷ Sales</div>
        </div>
      </div>

      <div class="card mt-24">
        <div class="card-header"><h3>YTD Vendor Totals</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Vendor</th><th class="money">Total Spent</th><th class="money">% of COG</th><th class="money">% of Sales</th></tr>
            </thead>
            <tbody>
              ${VENDORS.filter(v => (totals.vendors[v.key] || 0) > 0).map(v => {
                const amt     = totals.vendors[v.key] || 0;
                const ofCog   = totals.cogTotal > 0 ? amt / totals.cogTotal : 0;
                const ofSales = totals.sales    > 0 ? amt / totals.sales    : 0;
                return `<tr>
                  <td><strong>${escHtml(v.label)}</strong></td>
                  <td class="money">${fmt(amt)}</td>
                  <td class="money text-dim">${fmtPct(ofCog)}</td>
                  <td class="money text-dim">${fmtPct(ofSales)}</td>
                </tr>`;
              }).join('')}
              <tr class="sf-total-row">
                <td><strong>Total COG</strong></td>
                <td class="money"><strong>${fmt(totals.cogTotal)}</strong></td>
                <td class="money">100%</td>
                <td class="money ${pctCls(cogPct, 'cog')}">${fmtPct(cogPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ── History Table ─────────────────────────────────────────────
function renderHistory(weeks) {
  return `
    <div class="section mt-24">
      <h3>All Weeks (${weeks.length})</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Week</th>
              <th class="money">Sales</th>
              <th class="money">COG</th>
              <th class="money">COG%</th>
              <th class="money">Labor</th>
              <th class="money">Labor%</th>
              <th class="money">Overall%</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${weeks.map(week => {
              const s = getWeekStats(week);
              return `<tr>
                <td><strong>${escHtml(week.weekLabel)}</strong></td>
                <td class="money positive">${fmt(s.sales)}</td>
                <td class="money">${fmt(s.cogTotal)}</td>
                <td class="money ${pctCls(s.cogPct, 'cog')}">${fmtPct(s.cogPct)}</td>
                <td class="money">${fmt(s.labor)}</td>
                <td class="money ${pctCls(s.laborPct, 'labor')}">${fmtPct(s.laborPct)}</td>
                <td class="money ${pctCls(s.overallPct, 'overall')}">${fmtPct(s.overallPct)}</td>
                <td class="action-cell" style="display:flex;gap:4px;">
                  <button class="btn-sm-action" data-view-week="${week.id}">View</button>
                  <button class="btn-sm-action btn-sm-edit" data-edit-week="${week.id}">Edit</button>
                  <button class="btn-sm-action btn-sm-del"  data-delete-week="${week.id}">Del</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Week Modal ────────────────────────────────────────────────
function renderWeekModal() {
  const isEdit = state.modal === 'edit-week';
  const w = isEdit ? state.editWeek : null;
  return `
    <div class="modal-overlay active" id="modal-overlay">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Week' : 'Add Week'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Week Start Date *</label>
              <input type="date" id="wk-start" class="input" value="${w?.weekStart || ''}">
            </div>
            <div class="form-group">
              <label>Week Label</label>
              <input type="text" id="wk-label" class="input" placeholder="e.g. 4/13 – 4/19" value="${escHtml(w?.weekLabel || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sales *</label>
              <input type="number" id="wk-sales" class="input" placeholder="0.00" step="0.01" min="0" value="${w?.sales || ''}">
            </div>
            <div class="form-group">
              <label>Labor</label>
              <input type="number" id="wk-labor" class="input" placeholder="0.00" step="0.01" min="0" value="${w?.labor || ''}">
            </div>
          </div>

          <div class="sf-vendors-grid">
            <div class="sf-vendors-label">Vendor Costs (COG)</div>
            ${VENDORS.map(v => `
              <div class="form-group">
                <label>${escHtml(v.label)}</label>
                <input type="number" id="wk-v-${v.key}" class="input" placeholder="0.00" step="0.01" min="0" value="${w?.vendors?.[v.key] || ''}">
              </div>`).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="week-submit-btn">${isEdit ? 'Save Changes' : 'Add Week'}</button>
        </div>
      </div>
    </div>`;
}

// ── Bind ──────────────────────────────────────────────────────
function bindApp() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('sf_auth');
    state.loggedIn = false;
    render();
  });

  document.getElementById('add-week-btn')?.addEventListener('click', () => {
    state.modal = 'add-week';
    state.editWeek = null;
    render();
  });

  const closeModal = () => { state.modal = null; state.editWeek = null; render(); };
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Auto-fill week label when start date is picked
  document.getElementById('wk-start')?.addEventListener('change', e => {
    const d = new Date(e.target.value + 'T12:00:00');
    if (isNaN(d)) return;
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const fd = dt => `${dt.getMonth() + 1}/${dt.getDate()}`;
    const labelEl = document.getElementById('wk-label');
    if (labelEl && !labelEl.value) labelEl.value = `${fd(d)} \u2013 ${fd(end)}`;
  });

  // Submit week
  document.getElementById('week-submit-btn')?.addEventListener('click', async () => {
    const weekStart = document.getElementById('wk-start').value;
    const sales     = parseFloat(document.getElementById('wk-sales').value) || 0;
    if (!weekStart || !sales) { alert('Week start date and sales are required.'); return; }

    const vendors = {};
    VENDORS.forEach(v => {
      vendors[v.key] = parseFloat(document.getElementById(`wk-v-${v.key}`).value) || 0;
    });

    const data = {
      weekStart,
      weekLabel: document.getElementById('wk-label').value.trim() || weekStart,
      sales,
      labor: parseFloat(document.getElementById('wk-labor').value) || 0,
      vendors,
    };

    if (state.modal === 'edit-week') {
      await updateWeek(state.editWeek.id, { ...state.editWeek, ...data });
    } else {
      await addWeek(data);
    }
    closeModal();
  });

  // View week breakdown
  document.querySelectorAll('[data-view-week]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.selectedWeekId = btn.dataset.viewWeek;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    })
  );

  // Edit week
  document.querySelectorAll('[data-edit-week]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.editWeek = state.weeks.find(w => w.id === btn.dataset.editWeek) || null;
      state.modal = 'edit-week';
      render();
    })
  );

  // Delete week
  document.querySelectorAll('[data-delete-week]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Delete this week?')) await deleteWeek(btn.dataset.deleteWeek);
    })
  );
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.loggedIn) initFirebase();
  render();
});
