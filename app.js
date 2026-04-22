const APP_CONFIG = {
  spreadsheetId: '1ssQdLVKLPPj0dI6a_7iUwxm3L2IiPOZodIg1uE20BM0',
  rupMasterGid: '2083920669',
  packageSheetGid: '401635447',
  defaultInstansi: 'Kota Bogor',
  defaultTahun: '2026',
  currentUserName: 'PPK',
  currentUserRole: 'Pejabat Pembuat Komitmen',
  apiUrl: 'https://script.google.com/macros/s/AKfycbw4-u3KXZIzUUDm7Sqdjdl62OyaJX5_Vtjvyb8qtZjwgvtUEEWeoXa5FffCkD8Lhh72Hw/exec'
};

window.SPSE_APP_STATE = window.SPSE_APP_STATE || {
  allRup: [],
  filteredRup: [],
  selectedRows: new Set(),
  dataLoaded: false,
  packageRows: [],
  realisasiRows: [],
  penyediaRows: [],
  dokumenRows: []
};

const METHOD_MAP = {
  'Pengecualian': ['Dikecualikan', 'Pengecualian'],
  'Pengadaan Langsung': ['Pengadaan Langsung'],
  'Penunjukan Langsung': ['Penunjukan Langsung'],
  'Kontes': ['Kontes'],
  'Sayembara': ['Sayembara'],
  'Darurat': ['Darurat'],
  'Tender Internasional': ['Tender Internasional'],
  'Penunjukan Langsung Program Arahan Presiden': ['Penunjukan Langsung Program Arahan Presiden']
};

const STORAGE_KEYS = {
  login: 'spse_logged_in',
  hideTutorial: 'spse_hide_tutorial',
  draftPackage: 'spse_draft_package'
};

/* =========================
   UI GLOBAL
========================= */

function ensureGlobalLoading() {
  if (document.getElementById('globalLoadingOverlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    .global-loading-overlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.35);
      z-index:99999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:16px;
    }
    .global-loading-box{
      min-width:320px;
      max-width:520px;
      background:#fff;
      border-radius:10px;
      box-shadow:0 15px 40px rgba(0,0,0,.2);
      padding:18px 20px;
      text-align:center;
      font-family:Arial,sans-serif;
      color:#1f2937;
    }
    .global-loading-title{
      font-size:18px;
      font-weight:700;
      margin-bottom:8px;
    }
    .global-loading-text{
      font-size:14px;
      color:#4b5563;
      margin-bottom:12px;
    }
    .global-loading-spinner{
      width:38px;
      height:38px;
      border:4px solid #dbeafe;
      border-top:4px solid #2563eb;
      border-radius:50%;
      margin:0 auto;
      animation:spseSpin .8s linear infinite;
    }
    @keyframes spseSpin{
      from{transform:rotate(0deg);}
      to{transform:rotate(360deg);}
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'globalLoadingOverlay';
  overlay.className = 'global-loading-overlay';
  overlay.innerHTML = `
    <div class="global-loading-box">
      <div class="global-loading-title" id="globalLoadingTitle">Mohon Tunggu</div>
      <div class="global-loading-text" id="globalLoadingText">Sedang menarik data...</div>
      <div class="global-loading-spinner"></div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showLoading(message = 'Sedang menarik data...') {
  ensureGlobalLoading();
  document.getElementById('globalLoadingTitle').textContent = 'Mohon Tunggu';
  document.getElementById('globalLoadingText').textContent = message;
  document.getElementById('globalLoadingOverlay').style.display = 'flex';
}

function hideLoading() {
  const el = document.getElementById('globalLoadingOverlay');
  if (el) el.style.display = 'none';
}

function withLoading(promiseOrFn, message = 'Sedang menarik data...') {
  showLoading(message);
  const runner = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
  return Promise.resolve(runner).finally(hideLoading);
}

/* =========================
   UTIL
========================= */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSatkerKey(value) {
  return normalizeWhitespace(value).toUpperCase();
}

function normalizeMethodText(value) {
  return normalizeWhitespace(value);
}

function formatRupiahShort(value) {
  const num = Number(value || 0);
  if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if (num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Jt';
  if (num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahFull(value) {
  return 'Rp. ' + Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatTanggalIndonesia(dateInput) {
  if (!dateInput) return '';
  const ymd = ddmmyyyyToYmd(dateInput) || dateInput;
  const date = new Date(ymd + 'T00:00:00');
  if (isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateInput(value) {
  const v = normalizeWhitespace(value);
  if (!v) return '';

  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}-${m}-${y}`;
  }

  const dt = new Date(v);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return v;
}

function ddmmyyyyToYmd(value) {
  const v = normalizeWhitespace(value);
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(v)) return '';
  const [d, m, y] = v.split('-');
  return `${y}-${m}-${d}`;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const clean = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

function randomKodeAnggaran() {
  const blocks = [1,2,2,4,1,2,2,4,1,2,2,4].map(len => {
    let out = '';
    for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
    return out;
  });
  return blocks.join('.');
}

function randomPackageId() {
  return 'SIMPKT' + Date.now().toString().slice(-10);
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function isMethodMatch(selectedMethod, metodeRup) {
  if (!selectedMethod) return true;
  const candidates = METHOD_MAP[selectedMethod] || [selectedMethod];
  const normalized = normalizeMethodText(metodeRup).toLowerCase();
  return candidates.some(m => normalized.includes(String(m).toLowerCase()));
}

function todayYmd() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

function getPackageEffectiveStatus(pkg) {
  const tanggal = normalizeWhitespace(pkg?.tanggal_paket_selesai || '');
  if (!tanggal) return 'Draft';

  const ymd = ddmmyyyyToYmd(tanggal);
  if (!ymd) return normalizeWhitespace(pkg?.status_paket || 'Draft') || 'Draft';

  return ymd <= todayYmd() ? 'Paket Sudah Selesai' : 'Paket Sedang Berjalan';
}

function isPackageDraft(pkg) {
  return getPackageEffectiveStatus(pkg) === 'Draft';
}

function isPackageRunning(pkg) {
  return getPackageEffectiveStatus(pkg) === 'Paket Sedang Berjalan';
}

function isPackageFinished(pkg) {
  return getPackageEffectiveStatus(pkg) === 'Paket Sudah Selesai';
}

function canEditRealisasi(pkg) {
  return !isPackageFinished(pkg);
}

function canDeletePackage(pkg) {
  return isPackageDraft(pkg) && normalizeWhitespace(pkg.status_realisasi).toUpperCase() !== 'SUDAH ADA REALISASI';
}

/* =========================
   AUTH / TUTOR
========================= */

function fillUserIdentity() {
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = APP_CONFIG.currentUserName);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = APP_CONFIG.currentUserRole);
}

function requireLogin() {
  if (localStorage.getItem(STORAGE_KEYS.login) !== '1') {
    location.href = 'login.html';
    return false;
  }
  fillUserIdentity();
  return true;
}

function bindLogout(buttonId = 'btnLogout') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.onclick = () => {
    localStorage.removeItem(STORAGE_KEYS.login);
    location.href = 'login.html';
  };
}

function isTutorialDisabled() {
  return localStorage.getItem(STORAGE_KEYS.hideTutorial) === '1';
}

function disableTutorials() {
  localStorage.setItem(STORAGE_KEYS.hideTutorial, '1');
}

function setupTutorial(options) {
  if (isTutorialDisabled()) return;
  const overlay = document.getElementById(options.overlayId || 'tourOverlay');
  const highlight = document.getElementById(options.highlightId || 'tourHighlight');
  const arrow = document.getElementById(options.arrowId || 'tourArrow');
  const card = document.getElementById(options.cardId || 'tourCard');
  const title = document.getElementById(options.titleId || 'tourTitle');
  const text = document.getElementById(options.textId || 'tourText');
  const nextBtn = document.getElementById(options.nextBtnId || 'tourNextBtn');
  const skipBtn = document.getElementById(options.skipBtnId || 'tourSkipBtn');
  const hideBtn = document.getElementById(options.hideBtnId || 'tourNeverBtn');
  const steps = Array.isArray(options.steps) ? options.steps : [];
  if (!overlay || !highlight || !arrow || !card || !title || !text || !nextBtn || !skipBtn || !steps.length) return;

  let idx = 0;

  function closeTour() {
    overlay.style.display = 'none';
  }

  async function showStep() {
    const step = steps[idx];
    if (!step) return closeTour();
    if (typeof step.onEnter === 'function') await step.onEnter();
    const target = document.querySelector(step.target);
    if (!target) return closeTour();
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      highlight.style.left = (rect.left - 8) + 'px';
      highlight.style.top = (rect.top - 8) + 'px';
      highlight.style.width = (rect.width + 16) + 'px';
      highlight.style.height = (rect.height + 16) + 'px';

      title.textContent = step.title || 'Petunjuk';
      text.innerHTML = step.text || '';

      let left = Math.max(12, Math.min(window.innerWidth - 352, rect.left));
      let top = step.place === 'top' ? rect.top - 190 : rect.bottom + 26;
      if (top < 12) top = rect.bottom + 26;
      if (top + 170 > window.innerHeight) top = rect.top - 190;

      card.style.left = left + 'px';
      card.style.top = top + 'px';

      arrow.style.left = (rect.left + Math.min(rect.width / 2, 90)) + 'px';
      arrow.style.top = (step.place === 'top' ? rect.top - 26 : rect.bottom + 6) + 'px';
      arrow.style.transform = step.place === 'top' ? 'rotate(180deg)' : 'rotate(0deg)';

      nextBtn.textContent = idx === steps.length - 1 ? 'Selesai' : 'Lanjut';
    }, 280);
  }

  nextBtn.onclick = () => {
    idx += 1;
    if (idx >= steps.length) return closeTour();
    showStep();
  };
  skipBtn.onclick = closeTour;
  if (hideBtn) hideBtn.onclick = () => {
    disableTutorials();
    closeTour();
  };
  window.addEventListener('resize', () => overlay.style.display === 'block' && showStep());
  overlay.style.display = 'block';
  showStep();
}

/* =========================
   DATE PICKER
========================= */

function createDatePickerInput({ value = '', placeholder = 'dd-mm-yyyy' } = {}) {
  const wrap = document.createElement('div');
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '6px';
  wrap.style.flexWrap = 'wrap';

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'text-control';
  text.placeholder = placeholder;
  text.value = formatDateInput(value);

  const hidden = document.createElement('input');
  hidden.type = 'date';
  const ymd = ddmmyyyyToYmd(value);
  if (ymd) hidden.value = ymd;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-blue';
  button.style.padding = '6px 10px';
  button.textContent = '📅';

  button.onclick = () => hidden.showPicker ? hidden.showPicker() : hidden.click();
  hidden.onchange = () => {
    text.value = formatDateInput(hidden.value);
  };

  wrap.appendChild(text);
  wrap.appendChild(button);
  wrap.appendChild(hidden);

  return { wrap, text, hidden, button };
}

/* =========================
   SHEET READ
========================= */

async function fetchSheetRows(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  const jsonText = text.substring(47).slice(0, -2);
  const json = JSON.parse(jsonText);
  const cols = json.table.cols.map(c => normalizeWhitespace(c.label || ''));
  return json.table.rows.map(row => {
    const obj = {};
    cols.forEach((col, idx) => {
      obj[col] = row.c[idx] ? row.c[idx].v : '';
    });
    return obj;
  });
}

async function ensureDataLoaded() {
  if (window.SPSE_APP_STATE.dataLoaded) return;
  const rows = await fetchSheetRows(APP_CONFIG.rupMasterGid);
  window.SPSE_APP_STATE.allRup = rows.map(item => ({
    id_rup: normalizeWhitespace(item.id_rup),
    nama_paket: normalizeWhitespace(item.nama_paket),
    metode_rup: normalizeMethodText(item.metode_rup),
    pagu: Number(item.pagu || 0),
    satker: normalizeWhitespace(item.satker),
    satker_key: normalizeSatkerKey(item.satker),
    tahun: normalizeWhitespace(item.tahun),
    sumber_dana: normalizeWhitespace(item.sumber_dana || 'APBD') || 'APBD'
  }));
  window.SPSE_APP_STATE.dataLoaded = true;
}

function getUniqueSatkersByYear(tahun) {
  const map = new Map();
  window.SPSE_APP_STATE.allRup
    .filter(item => String(item.tahun) === String(tahun) && item.satker)
    .forEach(item => {
      if (!map.has(item.satker_key)) map.set(item.satker_key, item.satker);
    });
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'id'));
}

function filterRupRows({ tahun, satker, metode }) {
  const satkerKey = normalizeSatkerKey(satker);
  return window.SPSE_APP_STATE.allRup.filter(item => (
    String(item.tahun) === String(tahun) &&
    item.satker_key === satkerKey &&
    isMethodMatch(metode, item.metode_rup)
  ));
}

/* =========================
   DRAFT PACKAGE
========================= */

function setDraftPackage(pkg) {
  sessionStorage.setItem(STORAGE_KEYS.draftPackage, JSON.stringify(pkg));
}

function getDraftPackage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.draftPackage);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearDraftPackage() {
  sessionStorage.removeItem(STORAGE_KEYS.draftPackage);
}

function buildDraftPackageFromRup(rupItem) {
  const now = new Date();
  return {
    id_simulasi: randomPackageId(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    kode_rup: normalizeWhitespace(rupItem.id_rup),
    nama_paket: normalizeWhitespace(rupItem.nama_paket),
    satker: normalizeWhitespace(rupItem.satker),
    tahun: normalizeWhitespace(rupItem.tahun),
    metode_pemilihan: normalizeMethodText(rupItem.metode_rup),
    sumber_dana: normalizeWhitespace(rupItem.sumber_dana || 'APBD') || 'APBD',
    pagu: Number(rupItem.pagu || 0),
    kode_anggaran: randomKodeAnggaran(),
    ppk: APP_CONFIG.currentUserName,
    instansi: APP_CONFIG.defaultInstansi,
    status_paket: 'Draft',
    status_realisasi: 'Belum Ada Realisasi',
    can_delete: 'YA',
    lokasi_provinsi: 'Jawa Barat',
    lokasi_kab_kota: 'Bogor (Kota)',
    detail_lokasi: 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah',
    isian_edit_selesai: 'BELUM',
    pdn_realisasi: '0,00',
    umk_realisasi: '0,00',
    tanggal_paket_selesai: '',
    alasan_perubahan_tanggal: '',
    uraian_pekerjaan: '',
    jenis_pengadaan: 'Jasa Lainnya'
  };
}

/* =========================
   API
========================= */

function buildApiUrl(action, params = {}) {
  if (!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  const url = new URL(APP_CONFIG.apiUrl);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function apiGet(action, params = {}) {
  if (!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  const res = await fetch(buildApiUrl(action, params), { cache: 'no-store' });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || 'Request gagal');
  return json.data;
}

async function apiPost(action, payload = {}) {
  if (!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  const res = await fetch(APP_CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      ...payload
    })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || 'Request gagal');
  return json.data;
}

/* =========================
   PACKAGE
========================= */

async function loadPackageRows() {
  const rows = await apiGet('listPackages');
  window.SPSE_APP_STATE.packageRows = Array.isArray(rows)
    ? rows.filter(row => normalizeWhitespace(row.id_simulasi))
    : [];
  return window.SPSE_APP_STATE.packageRows;
}

function findLoadedPackageById(id) {
  return (window.SPSE_APP_STATE.packageRows || []).find(
    item => normalizeWhitespace(item.id_simulasi) === normalizeWhitespace(id)
  ) || null;
}

async function savePackageToSheet(pkg) {
  const data = await apiPost('savePackage', pkg);
  const idx = window.SPSE_APP_STATE.packageRows.findIndex(
    r => normalizeWhitespace(r.id_simulasi) === normalizeWhitespace(data.id_simulasi)
  );
  if (idx >= 0) window.SPSE_APP_STATE.packageRows[idx] = data;
  else window.SPSE_APP_STATE.packageRows.push(data);
  return data;
}

async function deletePackageFromSheet(idSimulasi) {
  return apiPost('deletePackage', { id_simulasi: idSimulasi });
}

/* =========================
   REALISASI
========================= */

async function loadRealisasiRows(idSimulasi = '') {
  const rows = await apiGet('listRealisasi', idSimulasi ? { id_simulasi: idSimulasi } : {});
  window.SPSE_APP_STATE.realisasiRows = Array.isArray(rows) ? rows : [];
  return window.SPSE_APP_STATE.realisasiRows;
}

function getPackageRealisasiRows(idSimulasi) {
  return (window.SPSE_APP_STATE.realisasiRows || []).filter(
    r => normalizeWhitespace(r.id_simulasi) === normalizeWhitespace(idSimulasi)
  );
}

function findRealisasiById(idRealisasi) {
  return (window.SPSE_APP_STATE.realisasiRows || []).find(
    r => normalizeWhitespace(r.id_realisasi) === normalizeWhitespace(idRealisasi)
  ) || null;
}

async function saveRealisasiToSheet(payload) {
  const data = await apiPost('saveRealisasi', payload);
  const idx = window.SPSE_APP_STATE.realisasiRows.findIndex(
    r => normalizeWhitespace(r.id_realisasi) === normalizeWhitespace(data.id_realisasi)
  );
  if (idx >= 0) window.SPSE_APP_STATE.realisasiRows[idx] = data;
  else window.SPSE_APP_STATE.realisasiRows.push(data);
  return data;
}

async function deleteRealisasiFromSheet(idRealisasi) {
  const data = await apiPost('deleteRealisasi', { id_realisasi: idRealisasi });
  window.SPSE_APP_STATE.realisasiRows = (window.SPSE_APP_STATE.realisasiRows || []).filter(
    r => normalizeWhitespace(r.id_realisasi) !== normalizeWhitespace(idRealisasi)
  );
  return data;
}

/* =========================
   PENYEDIA
========================= */

async function loadPenyediaRows(idRealisasi = '') {
  const rows = await apiGet('listPenyedia', idRealisasi ? { id_realisasi: idRealisasi } : {});
  window.SPSE_APP_STATE.penyediaRows = Array.isArray(rows) ? rows : [];
  return window.SPSE_APP_STATE.penyediaRows;
}

function getRealisasiPenyediaRows(idRealisasi) {
  return (window.SPSE_APP_STATE.penyediaRows || []).filter(
    r => normalizeWhitespace(r.id_realisasi) === normalizeWhitespace(idRealisasi)
  );
}

async function savePenyediaToSheet(payload) {
  const data = await apiPost('savePenyedia', payload);
  window.SPSE_APP_STATE.penyediaRows.push(data);
  return data;
}

/* =========================
   DOKUMEN
========================= */

async function loadDokumenRows(idRealisasi = '') {
  const rows = await apiGet('listDokumen', idRealisasi ? { id_realisasi: idRealisasi } : {});
  window.SPSE_APP_STATE.dokumenRows = Array.isArray(rows) ? rows : [];
  return window.SPSE_APP_STATE.dokumenRows;
}

function getRealisasiDokumenRows(idRealisasi) {
  return (window.SPSE_APP_STATE.dokumenRows || []).filter(
    r => normalizeWhitespace(r.id_realisasi) === normalizeWhitespace(idRealisasi)
  );
}

async function saveDokumenToSheet(payload) {
  const data = await apiPost('saveDokumen', payload);
  window.SPSE_APP_STATE.dokumenRows.push(data);
  return data;
}
