import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
  selectedChallengeLotId: null,
  selectedConsignmentItemId: null,
  selectedConsignorId: null,
  invoiceMonth: null,
  invoiceSaleIds: [],
  lots: [],
  sales: [],
  challengeLots: [],
  challengeSales: [],
  challengeExpenses: [],
  invincible: [],
  consignors: [],
  consignmentItems: [],
  consignmentSales: [],
  loaded: false,
  modal: null,
  editLot: null,
  editChallengeLot: null,
  editComic: null,
  editConsignor: null,
  editConsignmentItem: null,
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

  onSnapshot(collection(db, 'challenge_lots'), snap => {
    state.challengeLots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'challenge_sales'), snap => {
    state.challengeSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'challenge_expenses'), snap => {
    state.challengeExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'invincible_comics'), snap => {
    state.invincible = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'consignors'), snap => {
    state.consignors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'consignment_items'), snap => {
    state.consignmentItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  onSnapshot(collection(db, 'consignment_sales'), snap => {
    state.consignmentSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

async function migrateFlipsToLots() {
  const snap = await getDocs(collection(db, 'challenge_flips'));
  if (snap.empty) { alert('No old flip data found to import.'); return; }
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const f = d.data();
    const lotId = 'clot_' + d.id;
    batch.set(doc(db, 'challenge_lots', lotId), {
      id: lotId,
      name: f.item || 'Unnamed',
      category: f.category || 'other',
      cost: f.boughtFor || 0,
      date: f.date || new Date().toISOString().split('T')[0],
      notes: f.notes || '',
      createdAt: f.createdAt || new Date().toISOString(),
    });
    if (f.status === 'sold' && f.soldFor) {
      const saleId = 'csale_' + d.id;
      batch.set(doc(db, 'challenge_sales', saleId), {
        id: saleId,
        lotId,
        item: f.item || 'Unnamed',
        price: f.soldFor,
        fees: 0,
        date: f.dateSold || f.date || new Date().toISOString().split('T')[0],
        platform: f.platform || '',
        createdAt: f.createdAt || new Date().toISOString(),
      });
    }
  });
  await batch.commit();
  alert(`Imported ${snap.size} flips successfully!`);
}

async function addChallengeLot(data) {
  const id = 'clot_' + Date.now();
  await setDoc(doc(db, 'challenge_lots', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateChallengeLot(id, data) {
  await setDoc(doc(db, 'challenge_lots', id), data);
}

async function deleteChallengeLot(id) {
  await deleteDoc(doc(db, 'challenge_lots', id));
  const batch = writeBatch(db);
  state.challengeSales.filter(s => s.lotId === id).forEach(s => batch.delete(doc(db, 'challenge_sales', s.id)));
  await batch.commit();
}

async function addChallengeSale(data) {
  const id = 'csale_' + Date.now();
  await setDoc(doc(db, 'challenge_sales', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function deleteChallengeSale(id) {
  await deleteDoc(doc(db, 'challenge_sales', id));
}

async function addComic(data) {
  const id = 'comic_' + Date.now();
  await setDoc(doc(db, 'invincible_comics', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateComic(id, data) {
  await setDoc(doc(db, 'invincible_comics', id), data);
}

async function deleteComic(id) {
  await deleteDoc(doc(db, 'invincible_comics', id));
}

// ── Consignment ──────────────────────────────────────────────
async function addConsignor(data) {
  const id = 'consignor_' + Date.now();
  await setDoc(doc(db, 'consignors', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateConsignor(id, data) {
  await setDoc(doc(db, 'consignors', id), data);
}

async function deleteConsignor(id) {
  await deleteDoc(doc(db, 'consignors', id));
  const items = state.consignmentItems.filter(i => i.consignorId === id);
  const itemIds = items.map(i => i.id);
  const batch = writeBatch(db);
  items.forEach(i => batch.delete(doc(db, 'consignment_items', i.id)));
  state.consignmentSales.filter(s => itemIds.includes(s.itemId)).forEach(s => batch.delete(doc(db, 'consignment_sales', s.id)));
  await batch.commit();
}

async function addConsignmentItem(data) {
  const id = 'citem_' + Date.now();
  await setDoc(doc(db, 'consignment_items', id), { id, ...data, createdAt: new Date().toISOString() });
}

async function updateConsignmentItem(id, data) {
  await setDoc(doc(db, 'consignment_items', id), data);
}

async function deleteConsignmentItem(id) {
  await deleteDoc(doc(db, 'consignment_items', id));
  const batch = writeBatch(db);
  state.consignmentSales.filter(s => s.itemId === id).forEach(s => batch.delete(doc(db, 'consignment_sales', s.id)));
  await batch.commit();
}

async function addConsignmentSale(data) {
  const id = 'csaleitem_' + Date.now();
  await setDoc(doc(db, 'consignment_sales', id), { id, ...data, paidOut: false, createdAt: new Date().toISOString() });
}

async function deleteConsignmentSale(id) {
  await deleteDoc(doc(db, 'consignment_sales', id));
}

async function toggleConsignmentSalePaid(saleObj) {
  const paidOut = !saleObj.paidOut;
  await setDoc(doc(db, 'consignment_sales', saleObj.id), {
    ...saleObj,
    paidOut,
    paidDate: paidOut ? today() : null,
  });
}

async function markSalesPaid(saleIds) {
  if (saleIds.length === 0) return;
  const batch = writeBatch(db);
  const paidDate = today();
  saleIds.forEach(id => {
    const s = state.consignmentSales.find(x => x.id === id);
    if (s) batch.set(doc(db, 'consignment_sales', id), { ...s, paidOut: true, paidDate });
  });
  await batch.commit();
}

async function markItemSalesPaid(itemId) {
  const ids = state.consignmentSales.filter(s => s.itemId === itemId && !s.paidOut).map(s => s.id);
  await markSalesPaid(ids);
}

function printInvoice(consignor, sales, month) {
  const rows = sales.map(s => {
    const item = state.consignmentItems.find(i => i.id === s.itemId);
    const net = (s.price || 0) + (s.shipping || 0) - (s.fees || 0);
    const cut = getSaleCut(s);
    return `<tr>
      <td>${escHtml(item ? item.name : 'Unknown')}</td>
      <td>${fmtDate(s.date)}</td>
      <td>${fmt(s.price)}</td>
      <td>${fmt(s.shipping || 0)}</td>
      <td>${fmt(s.fees || 0)}</td>
      <td>${fmt(net)}</td>
      <td>${fmt(cut)}</td>
    </tr>`;
  }).join('');
  const total = sales.reduce((sum, s) => sum + getSaleCut(s), 0);
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to print the invoice.'); return; }
  win.document.write(`
    <!DOCTYPE html><html><head><title>Invoice - ${escHtml(consignor.name)} - ${fmtMonth(month)}</title>
    <style>
      body { font-family: -apple-system, Arial, sans-serif; padding: 40px; color: #111; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .sub { color: #555; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
      th { background: #f3f3f3; }
      tfoot td { font-weight: 700; border-top: 2px solid #333; }
      td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6), td:nth-child(7),
      th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6), th:nth-child(7) { text-align: right; }
    </style></head><body>
    <h1>Consignment Invoice</h1>
    <div class="sub">${escHtml(consignor.name)} — ${fmtMonth(month)}</div>
    <table>
      <thead><tr><th>Item</th><th>Date</th><th>Sale</th><th>Shipping</th><th>Fees</th><th>Net</th><th>Owed to You</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="6">Total Owed</td><td>${fmt(total)}</td></tr></tfoot>
    </table>
    </body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

// One-time import of Jeff's Trains consignment spreadsheet.
// Fees are derived as Sale - (Ippys + Jeff) since the sheet's own
// "After Fees" column was inconsistent; splitPct is Jeff's exact
// share of that net so dollar amounts match the sheet precisely.
async function importJeffsTrains() {
  const consignorId = 'consignor_jeff_trains';
  // splitPct is Jeff's % of the GROSS sale price (your cut comes off the top,
  // his cut absorbs the fees) — set so the dollar amounts reproduce the sheet exactly.
  const rows = [
    { name: '6-18321 Lionel', category: 'toys', sale: 215.00, fees: 34.23, splitPct: 65.00, date: '2026-05-27', paidDate: '2026-05-27' },
    { name: 'Spiderman Shattered Dimensions', category: 'games', sale: 104.95, fees: 15.84, splitPct: 68.00, date: '2026-05-27', paidDate: '2026-05-27' },
    { name: '6-16074 Lionel', category: 'toys', sale: 44.99, fees: 7.40, splitPct: 65.01, date: '2026-06-01', paidDate: '2026-06-01' },
    { name: '6-38151 and 6-38152', category: 'toys', sale: 233.99, fees: 29.80, splitPct: 65.00, date: '2026-06-03', paidDate: '2026-06-03' },
    { name: '6-16610 Lionel', category: 'toys', sale: 14.99, fees: 3.37, splitPct: 65.04, date: '2026-06-05', paidDate: '2026-06-05' },
    { name: '6-18404 Lionel', category: 'toys', sale: 46.99, fees: 7.25, splitPct: 65.01, date: '2026-06-09', paidDate: '2026-06-09' },
    { name: '6-17801 Lionel', category: 'toys', sale: 22.95, fees: 5.53, splitPct: 65.01, date: '2026-06-26', paidDate: '2026-06-26' },
    { name: '6-16173 Lionel', category: 'toys', sale: 59.95, fees: 7.75, splitPct: 64.97, date: '2026-07-01', paidDate: '2026-07-01' },
    { name: '6-18157 Lionel', category: 'toys', sale: 170.00, fees: 22.10, splitPct: 65.00, date: '2026-07-09', paidDate: '2026-07-09' },
    { name: '6-18918/6-18929 Lionel', category: 'toys', sale: 165.00, fees: 21.45, splitPct: 65.00, date: '2026-07-22', paidDate: '2026-07-22' },
    { name: 'PS3 Games', category: 'games', sale: 162.00, fees: 17.82, splitPct: 65.00, date: '2026-07-30', paidDate: '2026-07-30' },
    { name: '6-26775 Lionel', category: 'toys', sale: 36.95, fees: 4.80, splitPct: 65.01, date: '2026-08-01', paidDate: '2026-09-08' },
    { name: '6-19706 Lionel', category: 'toys', sale: 42.99, fees: 10.50, splitPct: 69.99, date: '2026-08-05', paidDate: '2026-09-08' },
    { name: '6-19929 Lionel', category: 'toys', sale: 14.99, fees: 1.99, splitPct: 69.98, date: '2026-08-05', paidDate: '2026-09-08' },
  ];
  const batch = writeBatch(db);
  batch.set(doc(db, 'consignors', consignorId), {
    id: consignorId,
    name: 'Jeff',
    splitPct: 65,
    notes: "Imported from Jeff's Trains spreadsheet",
    createdAt: new Date().toISOString(),
  });
  rows.forEach((r, i) => {
    const itemId = 'citem_jeff_' + i;
    const saleId = 'csaleitem_jeff_' + i;
    batch.set(doc(db, 'consignment_items', itemId), {
      id: itemId,
      consignorId,
      name: r.name,
      category: r.category,
      dateReceived: r.date,
      splitPct: r.splitPct,
      notes: "Imported from Jeff's Trains spreadsheet",
      createdAt: new Date().toISOString(),
    });
    batch.set(doc(db, 'consignment_sales', saleId), {
      id: saleId,
      itemId,
      price: r.sale,
      fees: r.fees,
      date: r.date,
      platform: '',
      paidOut: true,
      paidDate: r.paidDate,
      createdAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  alert(`Imported ${rows.length} items from Jeff's Trains, all marked paid.`);
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

function getChallengeLotStats(lotId) {
  const lot = state.challengeLots.find(l => l.id === lotId);
  const sales = state.challengeSales.filter(s => s.lotId === lotId);
  const totalGross = sales.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalFees  = sales.reduce((sum, s) => sum + (s.fees  || 0), 0);
  const totalNet   = totalGross - totalFees;
  const cost = lot ? (lot.cost || 0) : 0;
  return { totalGross, totalFees, totalNet, cost, profit: totalNet - cost, salesCount: sales.length };
}

function getChallengeStats() {
  const totalInvested = state.challengeLots.reduce((s, l) => s + (l.cost || 0), 0);
  const totalGross    = state.challengeSales.reduce((s, sale) => s + (sale.price || 0), 0);
  const totalFees     = state.challengeSales.reduce((s, sale) => s + (sale.fees  || 0), 0);
  const totalNet      = totalGross - totalFees;
  const totalExpenses = state.challengeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const currentCash   = CHALLENGE_START - totalInvested + totalNet - totalExpenses;
  const progress      = Math.min((currentCash / CHALLENGE_GOAL) * 100, 100);
  const profits = state.challengeLots.map(l => getChallengeLotStats(l.id).profit);
  const bestLot = profits.length ? Math.max(...profits) : 0;
  return {
    totalInvested, totalGross, totalFees, totalNet, totalExpenses,
    currentCash, progress, bestLot,
    lotCount: state.challengeLots.length,
    salesCount: state.challengeSales.length,
  };
}

// ── Consignment Stats ─────────────────────────────────────────
// Your cut is a straight percentage of the item sale price only —
// shipping never factors into it. Fees come out of the consignor's
// side, and any leftover shipping (after fees) flows to them too.
function splitSale(sale, splitPct) {
  const price = sale.price || 0;
  const shipping = sale.shipping || 0;
  const fees = sale.fees || 0;
  const yourCut = price * ((100 - splitPct) / 100);
  const consignorCut = (price + shipping) - yourCut - fees;
  return { yourCut, consignorCut };
}

function getConsignmentItemStats(itemId) {
  const item = state.consignmentItems.find(i => i.id === itemId);
  const sales = state.consignmentSales.filter(s => s.itemId === itemId);
  const splitPct = item ? (item.splitPct || 0) : 0;
  const totalGross = sales.reduce((s, sale) => s + (sale.price || 0), 0);
  const totalShipping = sales.reduce((s, sale) => s + (sale.shipping || 0), 0);
  const totalFees = sales.reduce((s, sale) => s + (sale.fees || 0), 0);
  const totalNet = totalGross + totalShipping - totalFees;
  let consignorCut = 0, yourCut = 0;
  sales.forEach(sale => {
    const split = splitSale(sale, splitPct);
    consignorCut += split.consignorCut;
    yourCut += split.yourCut;
  });
  const unpaidSales = sales.filter(s => !s.paidOut);
  const owed = unpaidSales.reduce((s, sale) => s + splitSale(sale, splitPct).consignorCut, 0);
  const fullyPaid = sales.length > 0 && unpaidSales.length === 0;
  return { totalGross, totalShipping, totalFees, totalNet, splitPct, consignorCut, yourCut, owed, fullyPaid, salesCount: sales.length };
}

function getConsignmentOverallStats() {
  const totalItems = state.consignmentItems.length;
  const inHandCount = state.consignmentItems.filter(i => state.consignmentSales.filter(s => s.itemId === i.id).length === 0).length;
  const soldCount = totalItems - inHandCount;
  let totalYourCut = 0, totalOwed = 0, totalPaidOut = 0;
  state.consignmentItems.forEach(i => {
    const s = getConsignmentItemStats(i.id);
    totalYourCut += s.yourCut;
    totalOwed += s.owed;
    totalPaidOut += (s.consignorCut - s.owed);
  });
  return { totalItems, inHandCount, soldCount, totalYourCut, totalOwed, totalPaidOut, consignorCount: state.consignors.length };
}

function getConsignorOwed(consignorId) {
  const itemIds = state.consignmentItems.filter(i => i.consignorId === consignorId).map(i => i.id);
  return itemIds.reduce((sum, id) => sum + getConsignmentItemStats(id).owed, 0);
}

function getSaleCut(sale) {
  const item = state.consignmentItems.find(i => i.id === sale.itemId);
  const splitPct = item ? (item.splitPct || 0) : 0;
  return splitSale(sale, splitPct).consignorCut;
}

// ── Helpers ───────────────────────────────────────────────────
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const catIcon = cat => ({ games: '🎮', cards: '🃏', toys: '🧸', other: '📦' }[cat] || '📦');
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = n => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtSigned = n => (n < 0 ? '-' : '') + fmt(n);
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtMonth = m => new Date(m + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
  else if (state.view === 'challenge-lot-detail') content = renderChallengeLotDetail();
  else if (state.view === 'invincible') content = renderInvincible();
  else if (state.view === 'consignment') content = renderConsignment();
  else if (state.view === 'consignor-detail') content = renderConsignorDetail();
  else if (state.view === 'consignment-item-detail') content = renderConsignmentItemDetail();

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
            <button class="nav-btn ${['challenge','challenge-lot-detail'].includes(state.view) ? 'active' : ''}" data-nav="challenge">🏆 $10→$5K</button>
            <button class="nav-btn ${state.view === 'invincible' ? 'active' : ''}" data-nav="invincible">📚 Invincible</button>
            <button class="nav-btn ${['consignment','consignor-detail','consignment-item-detail'].includes(state.view) ? 'active' : ''}" data-nav="consignment">🤝 Consignment</button>
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

// ── Invincible Comics View ────────────────────────────────────
function renderInvincible() {
  const owned = [...state.invincible].sort((a, b) => a.issue - b.issue);
  const ownedNums = new Set(owned.map(c => c.issue));
  const missing = [];
  for (let i = 1; i <= 144; i++) {
    if (!ownedNums.has(i)) missing.push(i);
  }
  const totalSpent = owned.reduce((s, c) => s + (c.pricePaid || 0), 0);
  const pctComplete = ((owned.length / 144) * 100).toFixed(1);
  const avgCost = owned.length > 0 ? fmt(totalSpent / owned.length) : '$0.00';

  return `
    <div class="invincible-view">
      <div class="page-header">
        <h2>📚 Invincible Comics</h2>
        <button class="btn btn-primary" data-open-modal="add-comic">+ Add Issue</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Issues Owned</div>
          <div class="stat-value">${owned.length} <span style="font-size:14px;color:var(--sub)">/ 144</span></div>
          <div class="stat-sub">${pctComplete}% complete</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Spent</div>
          <div class="stat-value positive">${fmt(totalSpent)}</div>
          <div class="stat-sub">across all issues</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Still Needed</div>
          <div class="stat-value">${missing.length}</div>
          <div class="stat-sub">issues missing</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Per Issue</div>
          <div class="stat-value">${avgCost}</div>
          <div class="stat-sub">cost per issue</div>
        </div>
      </div>

      ${owned.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>No issues tracked yet. Add your first issue to get started!</p>
          <button class="btn btn-primary" data-open-modal="add-comic">+ Add Issue</button>
        </div>
      ` : `
        <div class="section">
          <h3>Owned Issues (${owned.length})</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th>#</th>
                <th>Condition</th>
                <th>Price Paid</th>
                <th>Notes</th>
                <th></th>
              </tr></thead>
              <tbody>
                ${owned.map(c => `
                  <tr>
                    <td><strong>Issue #${c.issue}</strong></td>
                    <td><span class="badge badge-${c.condition === 'graded' ? 'games' : 'cards'}">${c.condition === 'graded' ? '🏅 Graded' : '📄 Raw'}</span></td>
                    <td>${fmt(c.pricePaid || 0)}</td>
                    <td class="text-dim">${escHtml(c.notes || '—')}</td>
                    <td style="white-space:nowrap">
                      <button class="btn-sm-action" data-edit-comic="${c.id}" style="margin-right:4px">Edit</button>
                      <button class="btn-sm-action btn-sm-del" data-delete-comic="${c.id}">Del</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}

      <div class="section">
        ${missing.length === 0
          ? `<div class="empty-state small"><p>🎉 Complete set! All 144 issues owned.</p></div>`
          : `
            <h3>Still Needed (${missing.length})</h3>
            <div class="inv-missing-grid">
              ${missing.map(n => `<span class="inv-missing-num">#${n}</span>`).join('')}
            </div>
          `}
      </div>
    </div>
  `;
}

// ── Consignment View ──────────────────────────────────────────
function renderConsignment() {
  const stats = getConsignmentOverallStats();
  const consignors = [...state.consignors].sort((a, b) => a.name.localeCompare(b.name));

  const consignorCard = (c) => {
    const items = state.consignmentItems.filter(i => i.consignorId === c.id);
    const totals = items.reduce((acc, i) => {
      const s = getConsignmentItemStats(i.id);
      acc.totalNet += s.totalNet; acc.yourCut += s.yourCut; acc.owed += s.owed;
      return acc;
    }, { totalNet: 0, yourCut: 0, owed: 0 });
    return `
      <div class="lot-card" data-goto-consignor="${c.id}">
        <div class="lot-card-header">
          <span class="badge badge-cat">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          <span class="lot-date">${c.splitPct}% split</span>
        </div>
        <h3 class="lot-name">${escHtml(c.name)}</h3>
        ${c.notes ? `<p class="lot-notes">${escHtml(c.notes)}</p>` : ''}
        <div class="lot-financials">
          <div class="lot-fin-row"><span>Net Revenue</span><span class="positive">${fmt(totals.totalNet)}</span></div>
          <div class="lot-fin-row"><span>Your Cut</span><span>${fmt(totals.yourCut)}</span></div>
          <div class="lot-fin-row lot-fin-total">
            <span>Owed to Consignor</span>
            <span class="${totals.owed > 0 ? 'negative' : 'positive'}">${fmt(totals.owed)}</span>
          </div>
        </div>
      </div>`;
  };

  return `
    <div class="consignment-view">
      <div class="page-header">
        <h2>🤝 Consignment</h2>
        <button class="btn btn-primary" data-open-modal="add-consignor">+ Add Consignor</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Items In Hand</div>
          <div class="stat-value">${stats.inHandCount}</div>
          <div class="stat-sub">${stats.totalItems} total items</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Items Sold</div>
          <div class="stat-value">${stats.soldCount}</div>
          <div class="stat-sub">${stats.consignorCount} consignor${stats.consignorCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Owed to Consignors</div>
          <div class="stat-value ${stats.totalOwed > 0 ? 'negative' : ''}">${fmt(stats.totalOwed)}</div>
          <div class="stat-sub">outstanding payouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Your Earnings</div>
          <div class="stat-value positive">${fmt(stats.totalYourCut)}</div>
          <div class="stat-sub">${fmt(stats.totalPaidOut)} paid out to consignors</div>
        </div>
      </div>

      ${consignors.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🤝</div>
          <p>No consignors yet. Add your first consignor to get started!</p>
          <button class="btn btn-primary" data-open-modal="add-consignor">+ Add Consignor</button>
          <button class="btn btn-outline btn-sm" id="import-jeffs-trains-btn" style="margin-left:8px">Import Jeff's Trains Data</button>
        </div>
      ` : `
        <div class="section">
          <h3>Consignors (${consignors.length})</h3>
          <div class="lots-grid">${consignors.map(consignorCard).join('')}</div>
        </div>
      `}
    </div>
  `;
}

function renderConsignorDetail() {
  const consignor = state.consignors.find(c => c.id === state.selectedConsignorId);
  if (!consignor) { state.view = 'consignment'; return renderConsignment(); }

  const items = state.consignmentItems
    .filter(i => i.consignorId === consignor.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const inHand = items.filter(i => getConsignmentItemStats(i.id).salesCount === 0);
  const payoutDue = items.filter(i => {
    const s = getConsignmentItemStats(i.id);
    return s.salesCount > 0 && !s.fullyPaid;
  });
  const paidOut = items.filter(i => getConsignmentItemStats(i.id).fullyPaid);

  const totals = items.reduce((acc, i) => {
    const s = getConsignmentItemStats(i.id);
    acc.totalGross += s.totalGross; acc.totalShipping += s.totalShipping; acc.totalFees += s.totalFees; acc.totalNet += s.totalNet;
    acc.consignorCut += s.consignorCut; acc.yourCut += s.yourCut; acc.owed += s.owed;
    return acc;
  }, { totalGross: 0, totalShipping: 0, totalFees: 0, totalNet: 0, consignorCut: 0, yourCut: 0, owed: 0 });

  const itemCard = (item) => {
    const s = getConsignmentItemStats(item.id);
    const statusBadge = s.salesCount === 0
      ? `<span class="badge badge-cat">In Hand</span>`
      : s.fullyPaid
        ? `<span class="badge badge-paid">Paid Out</span>`
        : `<span class="badge badge-due">Payout Due</span>`;
    const showMarkPaid = s.salesCount > 0 && !s.fullyPaid;
    return `
      <div class="lot-card" data-goto-consignment-item="${item.id}">
        <div class="lot-card-header">
          <span class="badge badge-${item.category}">${catIcon(item.category)} ${capitalize(item.category)}</span>
          ${statusBadge}
        </div>
        <h3 class="lot-name">${escHtml(item.name)}</h3>
        <p class="lot-notes">${item.splitPct}% split to ${escHtml(consignor.name)}</p>
        <div class="lot-financials">
          <div class="lot-fin-row"><span>Net Revenue (${s.salesCount} sales)</span><span class="positive">${fmt(s.totalNet)}</span></div>
          <div class="lot-fin-row"><span>Your Cut</span><span>${fmt(s.yourCut)}</span></div>
          <div class="lot-fin-row lot-fin-total">
            <span>Owed to Consignor</span>
            <span class="${s.owed > 0 ? 'negative' : 'positive'}">${fmt(s.owed)}</span>
          </div>
        </div>
        ${showMarkPaid ? `<button class="btn-sm-action btn-sm-paid" data-mark-item-paid="${item.id}" style="margin-top:0.6rem;width:100%">✓ Mark Paid — ${fmt(s.owed)}</button>` : ''}
      </div>`;
  };

  return `
    <div class="lot-detail">
      <div class="page-header">
        <div class="back-nav">
          <button class="btn btn-ghost" id="consignor-back-btn">← Back</button>
          <span class="breadcrumb">Consignment / ${escHtml(consignor.name)}</span>
        </div>
        <div class="header-actions">
          ${consignor.id === 'consignor_jeff_trains' ? `<button class="btn btn-outline btn-sm" id="resync-jeffs-trains-btn">🔧 Re-sync Split %</button>` : ''}
          <button class="btn btn-ghost" id="open-invoice-btn">🧾 Invoice</button>
          <button class="btn btn-ghost" id="edit-consignor-btn">Edit</button>
          <button class="btn btn-danger" id="delete-consignor-btn">Delete Consignor</button>
        </div>
      </div>

      <div class="lot-detail-header">
        <div class="lot-detail-info">
          <span class="badge badge-cat">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          <h2>${escHtml(consignor.name)}</h2>
          <p class="lot-detail-date">${consignor.splitPct}% default split</p>
          ${consignor.notes ? `<p class="lot-detail-notes">${escHtml(consignor.notes)}</p>` : ''}
        </div>
        <div class="lot-pnl">
          <div class="pnl-row"><span>Gross Sales</span><span>${fmt(totals.totalGross)}</span></div>
          <div class="pnl-row"><span>Shipping</span><span>${fmt(totals.totalShipping)}</span></div>
          <div class="pnl-row"><span>Fees</span><span class="negative">-${fmt(totals.totalFees)}</span></div>
          <div class="pnl-row"><span>Net Revenue</span><span class="positive">${fmt(totals.totalNet)}</span></div>
          <div class="pnl-row"><span>Consignor Cut</span><span>${fmt(totals.consignorCut)}</span></div>
          <div class="pnl-row pnl-total"><span>Your Cut</span><span class="positive">${fmt(totals.yourCut)}</span></div>
          <div class="pnl-row"><span>Owed to Consignor</span><span class="${totals.owed > 0 ? 'negative' : 'positive'}">${fmt(totals.owed)}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>Items (${items.length})</h3>
          <button class="btn btn-primary" data-open-modal="add-consignment-item">+ Add Item</button>
        </div>
        ${items.length === 0 ? `<div class="empty-state small"><p>No items yet for this consignor.</p></div>` : ''}
      </div>

      ${inHand.length > 0 ? `<div class="section"><h3>In Hand (${inHand.length})</h3><div class="lots-grid">${inHand.map(itemCard).join('')}</div></div>` : ''}
      ${payoutDue.length > 0 ? `<div class="section"><h3>Payout Due (${payoutDue.length})</h3><div class="lots-grid">${payoutDue.map(itemCard).join('')}</div></div>` : ''}
      ${paidOut.length > 0 ? `<div class="section"><h3>Paid Out (${paidOut.length})</h3><div class="lots-grid">${paidOut.map(itemCard).join('')}</div></div>` : ''}
    </div>
  `;
}

function renderConsignmentItemDetail() {
  const item = state.consignmentItems.find(i => i.id === state.selectedConsignmentItemId);
  if (!item) { state.view = 'consignment'; return renderConsignment(); }

  const consignor = state.consignors.find(c => c.id === item.consignorId);
  const sales = state.consignmentSales
    .filter(s => s.itemId === item.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const stats = getConsignmentItemStats(item.id);

  return `
    <div class="lot-detail">
      <div class="page-header">
        <div class="back-nav">
          <button class="btn btn-ghost" id="consignment-back-btn">← Back</button>
          <span class="breadcrumb">Consignment / ${escHtml(consignor ? consignor.name : 'Unknown')} / ${escHtml(item.name)}</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" id="edit-consignment-item-btn">Edit</button>
          <button class="btn btn-danger" id="delete-consignment-item-btn">Delete Item</button>
        </div>
      </div>

      <div class="lot-detail-header">
        <div class="lot-detail-info">
          <span class="badge badge-${item.category}">${catIcon(item.category)} ${capitalize(item.category)}</span>
          <h2>${escHtml(item.name)}</h2>
          <p class="lot-detail-date">From ${escHtml(consignor ? consignor.name : 'Unknown')} · received ${fmtDate(item.dateReceived)}</p>
          ${item.notes ? `<p class="lot-detail-notes">${escHtml(item.notes)}</p>` : ''}
        </div>
        <div class="lot-pnl">
          <div class="pnl-row"><span>Split</span><span>${item.splitPct}% to consignor</span></div>
          <div class="pnl-row"><span>Gross Sales</span><span>${fmt(stats.totalGross)}</span></div>
          <div class="pnl-row"><span>Shipping</span><span>${fmt(stats.totalShipping)}</span></div>
          <div class="pnl-row"><span>Fees</span><span class="negative">-${fmt(stats.totalFees)}</span></div>
          <div class="pnl-row"><span>Net Revenue</span><span class="positive">${fmt(stats.totalNet)}</span></div>
          <div class="pnl-row"><span>Consignor Cut</span><span>${fmt(stats.consignorCut)}</span></div>
          <div class="pnl-row pnl-total"><span>Your Cut</span><span class="positive">${fmt(stats.yourCut)}</span></div>
          <div class="pnl-row"><span>Owed to Consignor</span><span class="${stats.owed > 0 ? 'negative' : 'positive'}">${fmt(stats.owed)}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>Sales (${sales.length})</h3>
          <button class="btn btn-primary" data-open-modal="add-consignment-sale">+ Record Sale</button>
        </div>

        ${sales.length === 0 ? `
          <div class="empty-state small"><p>No sales recorded yet for this item.</p></div>
        ` : `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Platform</th><th>Date</th><th>Sale</th><th>Shipping</th><th>Fees</th><th>Net</th><th>Consignor Cut</th><th>Payout</th><th></th></tr></thead>
              <tbody>
                ${sales.map(sale => {
                  const fees = sale.fees || 0;
                  const shipping = sale.shipping || 0;
                  const net = sale.price + shipping - fees;
                  const cut = splitSale(sale, item.splitPct).consignorCut;
                  return `
                  <tr>
                    <td><span class="platform-tag">${escHtml(sale.platform || '—')}</span></td>
                    <td>${fmtDate(sale.date)}</td>
                    <td>${fmt(sale.price)}</td>
                    <td>${shipping > 0 ? fmt(shipping) : '—'}</td>
                    <td class="negative">${fees > 0 ? '-' + fmt(fees) : '—'}</td>
                    <td class="positive">${fmt(net)}</td>
                    <td>${fmt(cut)}</td>
                    <td>
                      <button class="btn-sm-action ${sale.paidOut ? '' : 'btn-sm-del'}" data-toggle-paid="${sale.id}">
                        ${sale.paidOut ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </td>
                    <td><button class="btn-delete-sale" data-consignment-sale-id="${sale.id}">✕</button></td>
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

  if (state.modal === 'add-challenge-lot' || state.modal === 'edit-challenge-lot') {
    const isEdit = state.modal === 'edit-challenge-lot';
    const lot = isEdit ? state.editChallengeLot : null;
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Lot' : 'Add Lot'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="clot-name" class="input" placeholder="e.g. Yard Sale Games, Card Collection" value="${isEdit ? escHtml(lot.name) : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="clot-category" class="select">
                ${['games','cards','toys','other'].map(c =>
                  `<option value="${c}" ${isEdit && lot.category === c ? 'selected' : ''}>${catIcon(c)} ${capitalize(c)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date Purchased *</label>
              <input type="date" id="clot-date" class="input" value="${isEdit ? lot.date : today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Cost *</label>
            <input type="number" id="clot-cost" class="input" placeholder="0.00" min="0" step="0.01" value="${isEdit ? lot.cost : ''}">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="clot-notes" class="input textarea" placeholder="Where you got it, etc.">${isEdit ? escHtml(lot.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="clot-submit-btn">${isEdit ? 'Save Changes' : 'Add Lot'}</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-challenge-sale') {
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>Record Sale</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Item Description *</label>
            <input type="text" id="csale-item" class="input" placeholder="e.g. Pokemon Blue, Mario Kart 64">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sale Price *</label>
              <input type="number" id="csale-price" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Fees</label>
              <input type="number" id="csale-fees" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
          </div>
          <div class="form-group">
            <label>Date Sold *</label>
            <input type="date" id="csale-date" class="input" value="${today()}">
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="csale-platform" class="select">
              <option value="">— Select —</option>
              ${['eBay','Facebook Marketplace','Local','Whatnot','Amazon','In-Person','Other'].map(p =>
                `<option value="${p}">${p}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="csale-submit-btn">Record Sale</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-challenge-expense') {
    return `${overlay}
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

  if (state.modal === 'add-comic' || state.modal === 'edit-comic') {
    const isEdit = state.modal === 'edit-comic';
    const comic = isEdit ? state.editComic : null;
    const ownedNums = new Set(state.invincible.map(c => c.issue));
    if (isEdit && comic) ownedNums.delete(comic.issue);
    const availableIssues = Array.from({ length: 144 }, (_, i) => i + 1).filter(n => !ownedNums.has(n));
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Issue' : 'Add Issue'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Issue # *</label>
              <select id="comic-issue" class="select">
                ${availableIssues.map(n => `<option value="${n}" ${isEdit && comic.issue === n ? 'selected' : ''}>#${n}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Condition *</label>
              <select id="comic-condition" class="select">
                <option value="raw" ${isEdit && comic.condition === 'raw' ? 'selected' : ''}>📄 Raw</option>
                <option value="graded" ${isEdit && comic.condition === 'graded' ? 'selected' : ''}>🏅 Graded</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Price Paid *</label>
            <input type="number" id="comic-price" class="input" placeholder="0.00" min="0" step="0.01" value="${isEdit ? (comic.pricePaid || '') : ''}">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="comic-notes" class="input textarea" placeholder="Grade, slab company, story arc, etc.">${isEdit ? escHtml(comic.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="comic-submit-btn">${isEdit ? 'Save Changes' : 'Add Issue'}</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-consignor' || state.modal === 'edit-consignor') {
    const isEdit = state.modal === 'edit-consignor';
    const c = isEdit ? state.editConsignor : null;
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Consignor' : 'Add Consignor'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="consignor-name" class="input" placeholder="e.g. Jane Smith" value="${isEdit ? escHtml(c.name) : ''}">
          </div>
          <div class="form-group">
            <label>Default Split — % to Consignor *</label>
            <input type="number" id="consignor-split" class="input" placeholder="e.g. 70" min="0" max="100" step="1" value="${isEdit ? c.splitPct : '70'}">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="consignor-notes" class="input textarea" placeholder="Contact info, agreement details, etc.">${isEdit ? escHtml(c.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="consignor-submit-btn">${isEdit ? 'Save Changes' : 'Add Consignor'}</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-consignment-item' || state.modal === 'edit-consignment-item') {
    const isEdit = state.modal === 'edit-consignment-item';
    const item = isEdit ? state.editConsignmentItem : null;
    if (!isEdit && state.consignors.length === 0) {
      return `${overlay}
        <div class="modal">
          <div class="modal-header">
            <h3>Add Item</h3>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-dim">Add a consignor first before adding items.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="modal-cancel">Close</button>
          </div>
        </div>
      </div>`;
    }
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Item' : 'Add Item'}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Item Name *</label>
            <input type="text" id="citem-name" class="input" placeholder="e.g. Sealed Charizard Box" value="${isEdit ? escHtml(item.name) : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Consignor *</label>
              <select id="citem-consignor" class="select">
                ${state.consignors.map(c => `<option value="${c.id}" data-split="${c.splitPct}" ${(isEdit ? item.consignorId === c.id : state.selectedConsignorId === c.id) ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="citem-category" class="select">
                ${['games','cards','toys','other'].map(cat => `
                  <option value="${cat}" ${isEdit && item.category === cat ? 'selected' : ''}>${catIcon(cat)} ${capitalize(cat)}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date Received *</label>
              <input type="date" id="citem-date" class="input" value="${isEdit ? item.dateReceived : today()}">
            </div>
            <div class="form-group">
              <label>Split — % to Consignor *</label>
              <input type="number" id="citem-split" class="input" min="0" max="100" step="1" value="${isEdit ? item.splitPct : ((state.consignors.find(c => c.id === state.selectedConsignorId) || state.consignors[0] || { splitPct: 70 }).splitPct)}">
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="citem-notes" class="input textarea" placeholder="Condition, asking price, etc.">${isEdit ? escHtml(item.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="citem-submit-btn">${isEdit ? 'Save Changes' : 'Add Item'}</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'add-consignment-sale') {
    return `${overlay}
      <div class="modal">
        <div class="modal-header">
          <h3>Record Sale</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Sale Price *</label>
              <input type="number" id="csaleitem-price" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Shipping Charged</label>
              <input type="number" id="csaleitem-shipping" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fees</label>
              <input type="number" id="csaleitem-fees" class="input" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Date Sold *</label>
              <input type="date" id="csaleitem-date" class="input" value="${today()}">
            </div>
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="csaleitem-platform" class="select">
              <option value="">— Select —</option>
              ${['eBay','Facebook Marketplace','Local','Whatnot','Amazon','In-Person','Other'].map(p =>
                `<option value="${p}">${p}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="csaleitem-submit-btn">Record Sale</button>
        </div>
      </div>
    </div>`;
  }

  if (state.modal === 'invoice') {
    const consignor = state.consignors.find(c => c.id === state.selectedConsignorId);
    if (!consignor) return '';
    const itemIds = state.consignmentItems.filter(i => i.consignorId === consignor.id).map(i => i.id);
    const allSales = state.consignmentSales.filter(s => itemIds.includes(s.itemId));
    const months = [...new Set(allSales.map(s => s.date.slice(0, 7)))].sort().reverse();
    const month = state.invoiceMonth || months[0] || today().slice(0, 7);
    const monthSales = allSales.filter(s => s.date.slice(0, 7) === month).sort((a, b) => new Date(a.date) - new Date(b.date));
    const selectedIds = state.invoiceSaleIds || [];
    const total = monthSales.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + getSaleCut(s), 0);

    return `${overlay}
      <div class="modal modal-wide">
        <div class="modal-header">
          <h3>🧾 Invoice — ${escHtml(consignor.name)}</h3>
          <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${months.length === 0 ? `
            <p class="text-dim">No sales recorded yet for this consignor.</p>
          ` : `
            <div class="form-group">
              <label>Month</label>
              <select id="invoice-month-select" class="select">
                ${months.map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${fmtMonth(m)}</option>`).join('')}
              </select>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th></th><th>Item</th><th>Date</th><th>Sale</th><th>Shipping</th><th>Fees</th><th>Net</th><th>Owed</th></tr></thead>
                <tbody>
                  ${monthSales.map(s => {
                    const item = state.consignmentItems.find(i => i.id === s.itemId);
                    const net = (s.price || 0) + (s.shipping || 0) - (s.fees || 0);
                    const cut = getSaleCut(s);
                    return `
                      <tr>
                        <td><input type="checkbox" data-invoice-sale-checkbox="${s.id}" ${selectedIds.includes(s.id) ? 'checked' : ''}></td>
                        <td>${escHtml(item ? item.name : 'Unknown')}${s.paidOut ? ' <span class="badge badge-paid">Paid</span>' : ''}</td>
                        <td>${fmtDate(s.date)}</td>
                        <td>${fmt(s.price)}</td>
                        <td>${fmt(s.shipping || 0)}</td>
                        <td>${fmt(s.fees || 0)}</td>
                        <td>${fmt(net)}</td>
                        <td>${fmt(cut)}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
            <div class="pnl-row pnl-total" style="margin-top:1rem"><span>Total Owed (selected)</span><span class="positive">${fmt(total)}</span></div>
          `}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Close</button>
          ${months.length > 0 ? `
            <button class="btn btn-outline" id="invoice-print-btn">🖨️ Print Invoice</button>
            <button class="btn btn-primary" id="invoice-mark-paid-btn">✓ Mark Selected Paid</button>
          ` : ''}
        </div>
      </div>
    </div>`;
  }

  return '';
}

// ── Expenses View ─────────────────────────────────────────────
const EXPENSE_CATS = ['Shipping Supplies', 'Packaging', 'Shipping Costs', 'Platform Fees', 'Tools & Equipment', 'Travel', 'Other'];

// ── Event Binding ─────────────────────────────────────────────
// ── Challenge View ────────────────────────────────────────────
function renderChallenge() {
  const s = getChallengeStats();
  const pct = Math.max(0, s.progress).toFixed(1);
  const cashCls = s.currentCash >= 0 ? 'positive' : 'negative';
  const lots = [...state.challengeLots].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <div class="challenge-view">
      <div class="page-header">
        <h2>🏆 $10 → $5,000 Challenge</h2>
        <button class="btn btn-primary" data-open-modal="add-challenge-lot">+ Add Lot</button>
      </div>

      <!-- Progress bar -->
      <div class="challenge-progress-card">
        <div class="cp-top">
          <span class="cp-label">Progress to $5,000</span>
          <span class="cp-pct">${pct}%</span>
        </div>
        <div class="cp-bar-track">
          <div class="cp-bar-fill" style="width:${Math.max(0, s.progress)}%"></div>
        </div>
        <div class="cp-ends"><span>$10</span><span>$5,000</span></div>
      </div>

      <!-- Stats -->
      <div class="challenge-stats">
        <div class="cs-card cs-card--green">
          <div class="cs-label">Current Cash</div>
          <div class="cs-value ${cashCls}">${fmt(s.currentCash)}</div>
          <div class="cs-sub">Money in hand</div>
        </div>
        <div class="cs-card cs-card--blue">
          <div class="cs-label">Total Invested</div>
          <div class="cs-value">${fmt(s.totalInvested)}</div>
          <div class="cs-sub">${s.lotCount} lot${s.lotCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="cs-card cs-card--purple">
          <div class="cs-label">Total Revenue</div>
          <div class="cs-value positive">${fmt(s.totalNet)}</div>
          <div class="cs-sub">${s.salesCount} sale${s.salesCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="cs-card cs-card--yellow">
          <div class="cs-label">Best Lot Profit</div>
          <div class="cs-value ${s.bestLot >= 0 ? 'positive' : 'negative'}">${fmtSigned(s.bestLot)}</div>
          <div class="cs-sub">top performer</div>
        </div>
      </div>

      <!-- Lots list -->
      ${lots.length === 0
        ? `<div class="section"><div class="empty-state small">
             <p>No lots yet — add your first purchase to get started!</p>
             <button class="btn btn-outline btn-sm" id="migrate-flips-btn" style="margin-top:10px">Import old flip data</button>
           </div></div>`
        : (() => {
            const openLots   = lots.filter(l => !l.closed);
            const closedLots = lots.filter(l => l.closed);
            const activeLots  = openLots.filter(l => state.challengeSales.filter(s => s.lotId === l.id).length === 0);
            const sellingLots = openLots.filter(l => state.challengeSales.filter(s => s.lotId === l.id).length > 0);

            const lotCard = (lot, isClosed) => {
              const ls = getChallengeLotStats(lot.id);
              const lpc = ls.profit >= 0 ? 'positive' : 'negative';
              const pctRoi = ls.cost > 0 ? ((ls.profit / ls.cost) * 100).toFixed(0) + '%' : '';
              return `
                <div class="lot-card${isClosed ? ' lot-card--closed' : ''}" data-goto-challenge-lot="${lot.id}">
                  <div class="lot-card-header">
                    <span class="badge badge-${lot.category}">${catIcon(lot.category)} ${capitalize(lot.category)}</span>
                    <span class="lot-date">${fmtDate(lot.date)}</span>
                  </div>
                  <h3 class="lot-name">${escHtml(lot.name)}</h3>
                  ${lot.notes ? `<p class="lot-notes">${escHtml(lot.notes)}</p>` : ''}
                  <div class="lot-financials">
                    <div class="lot-fin-row"><span>Cost</span><span>${fmt(lot.cost)}</span></div>
                    <div class="lot-fin-row"><span>Net Revenue (${ls.salesCount} sales)</span><span class="positive">${fmt(ls.totalNet)}</span></div>
                    <div class="lot-fin-row lot-fin-total">
                      <span>Profit</span>
                      <span class="${lpc}">${fmtSigned(ls.profit)}${pctRoi ? ` <span class="pct-tag">${pctRoi}</span>` : ''}</span>
                    </div>
                  </div>
                </div>`;
            };

            return `
              ${activeLots.length > 0 ? `
                <div class="section">
                  <h3>Active — In Hand (${activeLots.length})</h3>
                  <div class="lots-grid">${activeLots.map(l => lotCard(l, false)).join('')}</div>
                </div>` : ''}
              ${sellingLots.length > 0 ? `
                <div class="section">
                  <h3>Has Sales (${sellingLots.length})</h3>
                  <div class="lots-grid">${sellingLots.map(l => lotCard(l, false)).join('')}</div>
                </div>` : ''}
              ${closedLots.length > 0 ? `
                <div class="section">
                  <h3>Closed (${closedLots.length})</h3>
                  <div class="lots-grid">${closedLots.map(l => lotCard(l, true)).join('')}</div>
                </div>` : ''}`;
          })()
      }

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
  `;
}

function renderChallengeLotDetail() {
  const lot = state.challengeLots.find(l => l.id === state.selectedChallengeLotId);
  if (!lot) return `<div class="empty-state"><p>Lot not found.</p></div>`;
  const sales = state.challengeSales.filter(s => s.lotId === lot.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const stats = getChallengeLotStats(lot.id);
  const pc  = stats.profit >= 0 ? 'positive' : 'negative';
  const pct = stats.cost > 0 ? ((stats.profit / stats.cost) * 100).toFixed(1) + '%' : null;

  return `
    <div class="lot-detail">
      <div class="page-header">
        <div class="back-nav">
          <button class="btn btn-ghost" id="challenge-back-btn">← Back</button>
          <span class="breadcrumb">Challenge / ${escHtml(lot.name)}</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" id="edit-challenge-lot-btn">Edit</button>
          ${lot.closed
            ? `<button class="btn btn-outline" id="reopen-challenge-lot-btn">Reopen</button>`
            : `<button class="btn btn-success" id="close-challenge-lot-btn">✓ Close Lot</button>`}
          <button class="btn btn-danger" id="delete-challenge-lot-btn">Delete Lot</button>
        </div>
      </div>

      <div class="lot-detail-header">
        <div class="lot-detail-info">
          <span class="badge badge-${lot.category}">${catIcon(lot.category)} ${capitalize(lot.category)}</span>
          <h2>${escHtml(lot.name)}</h2>
          <p class="lot-detail-date">Purchased ${fmtDate(lot.date)}</p>
          ${lot.notes ? `<p class="lot-detail-notes">${escHtml(lot.notes)}</p>` : ''}
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
          <button class="btn btn-primary" data-open-modal="add-challenge-sale">+ Record Sale</button>
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
                    <td>${escHtml(sale.item)}</td>
                    <td><span class="platform-tag">${escHtml(sale.platform || '—')}</span></td>
                    <td>${fmtDate(sale.date)}</td>
                    <td>${fmt(sale.price)}</td>
                    <td class="negative">${fees > 0 ? '-' + fmt(fees) : '—'}</td>
                    <td class="positive">${fmt(net)}</td>
                    <td><button class="btn-delete-sale" data-challenge-sale-id="${sale.id}">✕</button></td>
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
      state.selectedChallengeLotId = null;
      state.selectedConsignmentItemId = null;
      state.selectedConsignorId = null;
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
  const closeModal = () => {
    state.modal = null;
    state.editLot = null;
    state.editChallengeLot = null;
    state.editConsignor = null;
    state.editConsignmentItem = null;
    render();
  };

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

  // Challenge — migrate old flips
  document.getElementById('migrate-flips-btn')?.addEventListener('click', async () => {
    if (confirm('Import all old flip data into the new lots format?')) await migrateFlipsToLots();
  });

  // Challenge — navigate into lot detail
  document.querySelectorAll('[data-goto-challenge-lot]').forEach(el =>
    el.addEventListener('click', () => {
      state.selectedChallengeLotId = el.dataset.gotoChallengeLot;
      state.view = 'challenge-lot-detail';
      render();
    })
  );

  // Challenge — back to list
  document.getElementById('challenge-back-btn')?.addEventListener('click', () => {
    state.view = 'challenge';
    state.selectedChallengeLotId = null;
    render();
  });

  // Challenge — close lot
  document.getElementById('close-challenge-lot-btn')?.addEventListener('click', async () => {
    const lot = state.challengeLots.find(l => l.id === state.selectedChallengeLotId);
    if (lot) await updateChallengeLot(lot.id, { ...lot, closed: true });
  });

  // Challenge — reopen lot
  document.getElementById('reopen-challenge-lot-btn')?.addEventListener('click', async () => {
    const lot = state.challengeLots.find(l => l.id === state.selectedChallengeLotId);
    if (lot) await updateChallengeLot(lot.id, { ...lot, closed: false });
  });

  // Challenge — edit lot button
  document.getElementById('edit-challenge-lot-btn')?.addEventListener('click', () => {
    state.editChallengeLot = state.challengeLots.find(l => l.id === state.selectedChallengeLotId) || null;
    state.modal = 'edit-challenge-lot';
    render();
  });

  // Challenge — delete lot
  document.getElementById('delete-challenge-lot-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this lot and ALL its sales? This cannot be undone.')) {
      await deleteChallengeLot(state.selectedChallengeLotId);
      state.selectedChallengeLotId = null;
      state.view = 'challenge';
    }
  });

  // Challenge — submit lot (add/edit)
  document.getElementById('clot-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('clot-name').value.trim();
    const cost = parseFloat(document.getElementById('clot-cost').value);
    const date = document.getElementById('clot-date').value;
    if (!name || isNaN(cost) || !date) { alert('Please fill in name, cost, and date.'); return; }
    const data = {
      name,
      category: document.getElementById('clot-category').value,
      cost,
      date,
      notes: document.getElementById('clot-notes').value.trim(),
    };
    if (state.modal === 'edit-challenge-lot') {
      await updateChallengeLot(state.editChallengeLot.id, { ...state.editChallengeLot, ...data });
    } else {
      await addChallengeLot(data);
    }
    state.modal = null; state.editChallengeLot = null; render();
  });

  // Challenge — submit sale
  document.getElementById('csale-submit-btn')?.addEventListener('click', async () => {
    const item  = document.getElementById('csale-item').value.trim();
    const price = parseFloat(document.getElementById('csale-price').value);
    const fees  = parseFloat(document.getElementById('csale-fees').value) || 0;
    const date  = document.getElementById('csale-date').value;
    if (!item || isNaN(price) || !date) { alert('Please fill in item, price, and date.'); return; }
    await addChallengeSale({
      lotId: state.selectedChallengeLotId,
      item,
      price,
      fees,
      date,
      platform: document.getElementById('csale-platform').value,
    });
    state.modal = null; render();
  });

  // Challenge — delete sale
  document.querySelectorAll('[data-challenge-sale-id]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Remove this sale?')) await deleteChallengeSale(btn.dataset.challengeSaleId);
    })
  );

  // Challenge — add expense submit
  document.getElementById('cexp-submit-btn')?.addEventListener('click', async () => {
    const description = document.getElementById('cexp-desc').value.trim();
    const amount = parseFloat(document.getElementById('cexp-amount').value);
    const date = document.getElementById('cexp-date').value;
    if (!description || isNaN(amount) || !date) { alert('Please fill in description, amount, and date.'); return; }
    await addChallengeExpense({ description, category: document.getElementById('cexp-category').value, amount, date });
    state.modal = null; render();
  });

  // Challenge — delete expense
  document.querySelectorAll('[data-delete-cexp]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Delete this expense?')) await deleteChallengeExpense(btn.dataset.deleteCexp);
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

  // Invincible — submit comic (add/edit)
  document.getElementById('comic-submit-btn')?.addEventListener('click', async () => {
    const issue = parseInt(document.getElementById('comic-issue').value);
    const pricePaid = parseFloat(document.getElementById('comic-price').value);
    if (!issue || isNaN(pricePaid)) { alert('Please fill in issue number and price paid.'); return; }
    const data = {
      issue,
      condition: document.getElementById('comic-condition').value,
      pricePaid,
      notes: document.getElementById('comic-notes').value.trim(),
    };
    if (state.modal === 'edit-comic') {
      await updateComic(state.editComic.id, { ...state.editComic, ...data });
    } else {
      await addComic(data);
    }
    state.modal = null; state.editComic = null; render();
  });

  // Invincible — edit comic button
  document.querySelectorAll('[data-edit-comic]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.editComic = state.invincible.find(c => c.id === btn.dataset.editComic) || null;
      state.modal = 'edit-comic';
      render();
    })
  );

  // Invincible — delete comic
  document.querySelectorAll('[data-delete-comic]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm('Remove this issue from your collection?')) await deleteComic(btn.dataset.deleteComic);
    })
  );

  // Consignment — one-time import of Jeff's Trains spreadsheet
  document.getElementById('import-jeffs-trains-btn')?.addEventListener('click', async () => {
    if (confirm("Import Jeff's Trains consignment data (1 consignor, 14 items, 14 sales, all marked paid)?")) {
      await importJeffsTrains();
    }
  });

  // Consignment — re-sync Jeff's Trains data onto the corrected split formula
  document.getElementById('resync-jeffs-trains-btn')?.addEventListener('click', async () => {
    if (confirm("Re-sync Jeff's Trains data to the corrected split %? This overwrites the Jeff consignor, its 14 items, and their sales back to the original sheet's values — any manual edits you've made to them since importing will be lost.")) {
      await importJeffsTrains();
    }
  });

  // Consignment — go to consignor detail
  document.querySelectorAll('[data-goto-consignor]').forEach(el =>
    el.addEventListener('click', () => {
      state.selectedConsignorId = el.dataset.gotoConsignor;
      state.view = 'consignor-detail';
      render();
    })
  );

  // Consignment — back to consignor list
  document.getElementById('consignor-back-btn')?.addEventListener('click', () => {
    state.view = 'consignment';
    state.selectedConsignorId = null;
    render();
  });

  // Consignment — go to item detail
  document.querySelectorAll('[data-goto-consignment-item]').forEach(el =>
    el.addEventListener('click', () => {
      state.selectedConsignmentItemId = el.dataset.gotoConsignmentItem;
      state.view = 'consignment-item-detail';
      render();
    })
  );

  // Consignment — back to consignor detail
  document.getElementById('consignment-back-btn')?.addEventListener('click', () => {
    const item = state.consignmentItems.find(i => i.id === state.selectedConsignmentItemId);
    state.selectedConsignorId = item ? item.consignorId : state.selectedConsignorId;
    state.view = 'consignor-detail';
    state.selectedConsignmentItemId = null;
    render();
  });

  // Consignment — submit consignor (add/edit)
  document.getElementById('consignor-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('consignor-name').value.trim();
    const splitPct = parseFloat(document.getElementById('consignor-split').value);
    if (!name || isNaN(splitPct)) { alert('Please fill in name and split percentage.'); return; }
    const data = { name, splitPct, notes: document.getElementById('consignor-notes').value.trim() };
    if (state.modal === 'edit-consignor') {
      await updateConsignor(state.editConsignor.id, { ...state.editConsignor, ...data });
    } else {
      await addConsignor(data);
    }
    state.modal = null; state.editConsignor = null; render();
  });

  // Consignment — edit consignor
  document.getElementById('edit-consignor-btn')?.addEventListener('click', () => {
    state.editConsignor = state.consignors.find(c => c.id === state.selectedConsignorId) || null;
    state.modal = 'edit-consignor';
    render();
  });

  // Consignment — delete consignor
  document.getElementById('delete-consignor-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this consignor and ALL their items and sales? This cannot be undone.')) {
      await deleteConsignor(state.selectedConsignorId);
      state.selectedConsignorId = null;
      state.view = 'consignment';
    }
  });

  // Consignment — submit item (add/edit)
  document.getElementById('citem-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('citem-name').value.trim();
    const consignorId = document.getElementById('citem-consignor').value;
    const date = document.getElementById('citem-date').value;
    const splitPct = parseFloat(document.getElementById('citem-split').value);
    if (!name || !consignorId || !date || isNaN(splitPct)) { alert('Please fill in all required fields.'); return; }
    const data = {
      name,
      consignorId,
      category: document.getElementById('citem-category').value,
      dateReceived: date,
      splitPct,
      notes: document.getElementById('citem-notes').value.trim(),
    };
    if (state.modal === 'edit-consignment-item') {
      await updateConsignmentItem(state.editConsignmentItem.id, { ...state.editConsignmentItem, ...data });
    } else {
      await addConsignmentItem(data);
    }
    state.modal = null; state.editConsignmentItem = null; render();
  });

  // Consignment — consignor select changes default split (add mode only)
  const citemConsignorSelect = document.getElementById('citem-consignor');
  if (citemConsignorSelect && state.modal === 'add-consignment-item') {
    citemConsignorSelect.addEventListener('change', e => {
      const opt = e.target.selectedOptions[0];
      const splitInput = document.getElementById('citem-split');
      if (opt && splitInput) splitInput.value = opt.dataset.split;
    });
  }

  // Consignment — edit item button
  document.getElementById('edit-consignment-item-btn')?.addEventListener('click', () => {
    state.editConsignmentItem = state.consignmentItems.find(i => i.id === state.selectedConsignmentItemId) || null;
    state.modal = 'edit-consignment-item';
    render();
  });

  // Consignment — delete item
  document.getElementById('delete-consignment-item-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this item and ALL its sales? This cannot be undone.')) {
      const item = state.consignmentItems.find(i => i.id === state.selectedConsignmentItemId);
      await deleteConsignmentItem(state.selectedConsignmentItemId);
      state.selectedConsignorId = item ? item.consignorId : state.selectedConsignorId;
      state.selectedConsignmentItemId = null;
      state.view = 'consignor-detail';
    }
  });

  // Consignment — submit sale
  document.getElementById('csaleitem-submit-btn')?.addEventListener('click', async () => {
    const price = parseFloat(document.getElementById('csaleitem-price').value);
    const shipping = parseFloat(document.getElementById('csaleitem-shipping').value) || 0;
    const fees = parseFloat(document.getElementById('csaleitem-fees').value) || 0;
    const date = document.getElementById('csaleitem-date').value;
    if (isNaN(price) || !date) { alert('Please fill in price and date.'); return; }
    await addConsignmentSale({
      itemId: state.selectedConsignmentItemId,
      price,
      shipping,
      fees,
      date,
      platform: document.getElementById('csaleitem-platform').value,
    });
    state.modal = null; render();
  });

  // Consignment — delete sale
  document.querySelectorAll('[data-consignment-sale-id]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Remove this sale?')) await deleteConsignmentSale(btn.dataset.consignmentSaleId);
    })
  );

  // Consignment — toggle payout status
  document.querySelectorAll('[data-toggle-paid]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const sale = state.consignmentSales.find(s => s.id === btn.dataset.togglePaid);
      if (sale) await toggleConsignmentSalePaid(sale);
    })
  );

  // Consignment — quick mark item paid (from item card)
  document.querySelectorAll('[data-mark-item-paid]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm('Mark all outstanding sales for this item as paid to the consignor?')) {
        await markItemSalesPaid(btn.dataset.markItemPaid);
      }
    })
  );

  // Consignment — open invoice modal
  document.getElementById('open-invoice-btn')?.addEventListener('click', () => {
    const itemIds = state.consignmentItems.filter(i => i.consignorId === state.selectedConsignorId).map(i => i.id);
    const allSales = state.consignmentSales.filter(s => itemIds.includes(s.itemId));
    const months = [...new Set(allSales.map(s => s.date.slice(0, 7)))].sort().reverse();
    const month = months[0] || today().slice(0, 7);
    state.invoiceMonth = month;
    state.invoiceSaleIds = allSales.filter(s => s.date.slice(0, 7) === month).map(s => s.id);
    state.modal = 'invoice';
    render();
  });

  // Consignment — invoice month change
  document.getElementById('invoice-month-select')?.addEventListener('change', e => {
    const month = e.target.value;
    const itemIds = state.consignmentItems.filter(i => i.consignorId === state.selectedConsignorId).map(i => i.id);
    const monthSales = state.consignmentSales.filter(s => itemIds.includes(s.itemId) && s.date.slice(0, 7) === month);
    state.invoiceMonth = month;
    state.invoiceSaleIds = monthSales.map(s => s.id);
    render();
  });

  // Consignment — invoice checkbox toggle
  document.querySelectorAll('[data-invoice-sale-checkbox]').forEach(cb =>
    cb.addEventListener('change', () => {
      const id = cb.dataset.invoiceSaleCheckbox;
      if (cb.checked) {
        if (!state.invoiceSaleIds.includes(id)) state.invoiceSaleIds.push(id);
      } else {
        state.invoiceSaleIds = state.invoiceSaleIds.filter(x => x !== id);
      }
      render();
    })
  );

  // Consignment — print invoice
  document.getElementById('invoice-print-btn')?.addEventListener('click', () => {
    const consignor = state.consignors.find(c => c.id === state.selectedConsignorId);
    const selectedSales = state.consignmentSales.filter(s => state.invoiceSaleIds.includes(s.id));
    if (selectedSales.length === 0) { alert('Select at least one sale to print.'); return; }
    printInvoice(consignor, selectedSales, state.invoiceMonth);
  });

  // Consignment — mark selected invoice sales as paid
  document.getElementById('invoice-mark-paid-btn')?.addEventListener('click', async () => {
    if (state.invoiceSaleIds.length === 0) { alert('Select at least one sale.'); return; }
    if (confirm(`Mark ${state.invoiceSaleIds.length} selected sale(s) as paid?`)) {
      await markSalesPaid(state.invoiceSaleIds);
      state.modal = null;
      render();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.loggedIn) initFirebase();
  render();
});
