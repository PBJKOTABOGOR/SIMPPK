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
  realisasiMap: {},
  penyediaMap: {},
  dokumenMap: {}
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
   GLOBAL LOADING
========================= */

let __spseLoadingCount = 0;

function initGlobalLoading() {
  if (document.getElementById('spseGlobalLoadingStyle')) return;

  const style = document.createElement('style');
  style.id = 'spseGlobalLoadingStyle';
  style.textContent = `
    .spse-loading-overlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.35);
      z-index:99999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    .spse-loading-box{
      min-width:320px;
      max-width:90vw;
      background:#fff;
      border-radius:10px;
      box-shadow:0 12px 36px rgba(0,0,0,.25);
      padding:20px 24px;
      text-align:center;
      font-family:Arial,sans-serif;
      color:#1f2937;
    }
    .spse-loading-spinner{
      width:40px;
      height:40px;
      margin:0 auto 12px;
      border:4px solid #dbe3ea;
      border-top-color:#1d4ed8;
      border-radius:50%;
      animation:spseSpin 1s linear infinite;
    }
    .spse-loading-title{
      font-size:18px;
      font-weight:700;
      margin-bottom:6px;
      color:#111827;
    }
    .spse-loading-text{
      font-size:14px;
      color:#4b5563;
    }
    @keyframes spseSpin{
      to { transform:rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'spseGlobalLoading';
  overlay.className = 'spse-loading-overlay';
  overlay.innerHTML = `
    <div class="spse-loading-box">
      <div class="spse-loading-spinner"></div>
      <div class="spse-loading-title">Mohon Tunggu</div>
      <div class="spse-loading-text">Sedang Menarik Data...</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showGlobalLoading(text) {
  initGlobalLoading();
  __spseLoadingCount += 1;
  const overlay = document.getElementById('spseGlobalLoading');
  const textEl = overlay?.querySelector('.spse-loading-text');
  if (textEl && text) textEl.textContent = text;
  if (overlay) overlay.style.display = 'flex';
}

function hideGlobalLoading() {
  __spseLoadingCount = Math.max(0, __spseLoadingCount - 1);
  if (__spseLoadingCount > 0) return;
  const overlay = document.getElementById('spseGlobalLoading');
  if (overlay) overlay.style.display = 'none';
}

/* =========================
   BASIC HELPERS
========================= */

function makeCaptcha(len = 6) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

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
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

  if (hideBtn) {
    hideBtn.onclick = () => {
      disableTutorials();
      closeTour();
    };
  }

  window.addEventListener('resize', () => overlay.style.display === 'block' && showStep());
  overlay.style.display = 'block';
  showStep();
}

/* =========================
   DATE HELPERS
========================= */

function ymdToDdMmYyyy(value) {
  const v = normalizeWhitespace(value);
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}-${m}-${y}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) return v;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v.replace(/\//g, '-');
  return v;
}

function ddmmyyyyToYmd(value) {
  const v = normalizeWhitespace(value);
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [d, m, y] = v.split('-');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split('/');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function formatDateInput(value) {
  return ymdToDdMmYyyy(value);
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const clean = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = Number(clean);
  return Number.isNaN(num) ? 0 : num;
}

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
  text.readOnly = true;
  text.style.maxWidth = '180px';

  const hidden = document.createElement('input');
  hidden.type = 'date';
  hidden.value = ddmmyyyyToYmd(text.value);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'refresh-btn';
  button.textContent = '📅';

  button.onclick = () => {
    if (typeof hidden.showPicker === 'function') {
      hidden.showPicker();
    } else {
      hidden.click();
    }
  };

  hidden.addEventListener('change', () => {
    text.value = ymdToDdMmYyyy(hidden.value);
  });

  wrap.appendChild(text);
  wrap.appendChild(button);
  wrap.appendChild(hidden);

  return { wrap, text, hidden, button };
}

/* =========================
   API HELPERS
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

async function apiGet(action, params = {}, loadingText = 'Sedang Menarik Data...') {
  showGlobalLoading(loadingText);
  try {
    const res = await fetch(buildApiUrl(action, params), { cache: 'no-store' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Request gagal');
    return json.data;
  } finally {
    hideGlobalLoading();
  }
}

async function apiPost(payload, loadingText = 'Sedang Menyimpan Data...') {
  if (!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  showGlobalLoading(loadingText);
  try {
    const res = await fetch(APP_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || 'Request gagal');
    return json.data;
  } finally {
    hideGlobalLoading();
  }
}

/* =========================
   SHEET FETCH RUP MASTER
========================= */

async function fetchSheetRows(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
  showGlobalLoading('Sedang Menarik Data...');
  try {
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
  } finally {
    hideGlobalLoading();
  }
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
   PACKAGE API
========================= */

function normalizePackageRow(item) {
  return {
    id_simulasi: normalizeWhitespace(item.id_simulasi),
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
    kode_rup: normalizeWhitespace(item.kode_rup),
    nama_paket: normalizeWhitespace(item.nama_paket),
    satker: normalizeWhitespace(item.satker),
    tahun: normalizeWhitespace(item.tahun),
    metode_pemilihan: normalizeWhitespace(item.metode_pemilihan),
    sumber_dana: normalizeWhitespace(item.sumber_dana || 'APBD') || 'APBD',
    pagu: parseNumber(item.pagu),
    kode_anggaran: normalizeWhitespace(item.kode_anggaran),
    ppk: normalizeWhitespace(item.ppk),
    instansi: normalizeWhitespace(item.instansi || APP_CONFIG.defaultInstansi),
    status_paket: normalizeWhitespace(item.status_paket || 'Draft') || 'Draft',
    status_realisasi: normalizeWhitespace(item.status_realisasi || 'Belum Ada Realisasi') || 'Belum Ada Realisasi',
    can_delete: normalizeWhitespace(item.can_delete || 'YA') || 'YA',
    lokasi_provinsi: normalizeWhitespace(item.lokasi_provinsi || 'Jawa Barat'),
    lokasi_kab_kota: normalizeWhitespace(item.lokasi_kab_kota || 'Bogor (Kota)'),
    detail_lokasi: normalizeWhitespace(item.detail_lokasi || 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah'),
    isian_edit_selesai: normalizeWhitespace(item.isian_edit_selesai || ''),
    pdn_realisasi: normalizeWhitespace(item.pdn_realisasi || '0,00'),
    umk_realisasi: normalizeWhitespace(item.umk_realisasi || '0,00'),
    tanggal_paket_selesai: normalizeWhitespace(item.tanggal_paket_selesai || ''),
    alasan_perubahan_tanggal: normalizeWhitespace(item.alasan_perubahan_tanggal || ''),
    uraian_pekerjaan: item.uraian_pekerjaan || '',
    jenis_pengadaan: normalizeWhitespace(item.jenis_pengadaan || 'Jasa Lainnya')
  };
}

async function loadPackageRows() {
  const rows = await apiGet('listPackages', {}, 'Sedang Menarik Data Paket...');
  window.SPSE_APP_STATE.packageRows = (Array.isArray(rows) ? rows : [])
    .map(normalizePackageRow)
    .filter(row => row.id_simulasi && (row.nama_paket || row.kode_rup));
  return window.SPSE_APP_STATE.packageRows;
}

function findLoadedPackageById(id) {
  return (window.SPSE_APP_STATE.packageRows || []).find(item =>
    normalizeWhitespace(item.id_simulasi) === normalizeWhitespace(id)
  ) || null;
}

async function savePackageToSheet(pkg) {
  const data = await apiPost(
    { action: 'savePackage', ...pkg, updated_at: new Date().toISOString() },
    'Sedang Menyimpan Paket...'
  );
  const normalized = normalizePackageRow(data);

  const idx = (window.SPSE_APP_STATE.packageRows || []).findIndex(r => r.id_simulasi === normalized.id_simulasi);
  if (idx >= 0) window.SPSE_APP_STATE.packageRows[idx] = normalized;
  else window.SPSE_APP_STATE.packageRows.unshift(normalized);

  return normalized;
}

async function deletePackageFromSheet(idSimulasi) {
  const data = await apiPost(
    { action: 'deletePackage', id_simulasi: idSimulasi },
    'Sedang Menghapus Paket...'
  );
  window.SPSE_APP_STATE.packageRows = (window.SPSE_APP_STATE.packageRows || []).filter(
    item => normalizeWhitespace(item.id_simulasi) !== normalizeWhitespace(idSimulasi)
  );
  delete window.SPSE_APP_STATE.realisasiMap[idSimulasi];
  return data;
}

/* =========================
   REALISASI API
========================= */

function normalizeRealisasiRow(item) {
  return {
    id_realisasi: normalizeWhitespace(item.id_realisasi),
    id_simulasi: normalizeWhitespace(item.id_simulasi),
    bukti_pembayaran: normalizeWhitespace(item.bukti_pembayaran),
    jenis_realisasi: normalizeWhitespace(item.jenis_realisasi),
    nama_dokumen: normalizeWhitespace(item.nama_dokumen),
    nomor_dokumen: normalizeWhitespace(item.nomor_dokumen),
    nilai_realisasi: parseNumber(item.nilai_realisasi),
    tanggal_realisasi: normalizeWhitespace(item.tanggal_realisasi),
    keterangan: item.keterangan || '',
    created_at: item.created_at || '',
    updated_at: item.updated_at || ''
  };
}

async function loadRealisasiRows(idSimulasi) {
  const rows = await apiGet(
    'listRealisasi',
    { id_simulasi: idSimulasi },
    'Sedang Menarik Data Realisasi...'
  );
  window.SPSE_APP_STATE.realisasiMap[idSimulasi] = (Array.isArray(rows) ? rows : []).map(normalizeRealisasiRow);
  return window.SPSE_APP_STATE.realisasiMap[idSimulasi];
}

function getPackageRealisasiRows(idSimulasi) {
  return window.SPSE_APP_STATE.realisasiMap[idSimulasi] || [];
}

function findLoadedRealisasiById(idSimulasi, idRealisasi) {
  return (window.SPSE_APP_STATE.realisasiMap[idSimulasi] || []).find(
    item => normalizeWhitespace(item.id_realisasi) === normalizeWhitespace(idRealisasi)
  ) || null;
}

async function saveRealisasiToSheet(payload) {
  const data = await apiPost(
    { action: 'saveRealisasi', ...payload },
    'Sedang Menyimpan Realisasi...'
  );
  const normalized = normalizeRealisasiRow(data);
  await loadRealisasiRows(normalized.id_simulasi);
  await loadPackageRows();
  return normalized;
}

async function deleteRealisasiFromSheet(idSimulasi, idRealisasi) {
  const data = await apiPost(
    { action: 'deleteRealisasi', id_simulasi: idSimulasi, id_realisasi: idRealisasi },
    'Sedang Menghapus Realisasi...'
  );
  await loadRealisasiRows(idSimulasi);
  await loadPackageRows();
  return data;
}

/* =========================
   PENYEDIA API
========================= */

function normalizePenyediaRow(item) {
  return {
    id_penyedia: normalizeWhitespace(item.id_penyedia),
    id_realisasi: normalizeWhitespace(item.id_realisasi),
    id_simulasi: normalizeWhitespace(item.id_simulasi),
    bentuk_usaha: normalizeWhitespace(item.bentuk_usaha),
    nama_penyedia: normalizeWhitespace(item.nama_penyedia),
    npwp: normalizeWhitespace(item.npwp),
    email: normalizeWhitespace(item.email),
    telp: normalizeWhitespace(item.telp),
    provinsi: normalizeWhitespace(item.provinsi),
    kabupaten_kota: normalizeWhitespace(item.kabupaten_kota),
    alamat: item.alamat || '',
    created_at: item.created_at || '',
    updated_at: item.updated_at || ''
  };
}

async function loadPenyediaRows(idRealisasi) {
  const rows = await apiGet(
    'listPenyedia',
    { id_realisasi: idRealisasi },
    'Sedang Menarik Data Penyedia...'
  );
  window.SPSE_APP_STATE.penyediaMap[idRealisasi] = (Array.isArray(rows) ? rows : []).map(normalizePenyediaRow);
  return window.SPSE_APP_STATE.penyediaMap[idRealisasi];
}

function getRealisasiPenyediaRows(idRealisasi) {
  return window.SPSE_APP_STATE.penyediaMap[idRealisasi] || [];
}

async function savePenyediaToSheet(payload) {
  const data = await apiPost(
    { action: 'savePenyedia', ...payload },
    'Sedang Menyimpan Penyedia...'
  );
  const normalized = normalizePenyediaRow(data);
  await loadPenyediaRows(normalized.id_realisasi);
  return normalized;
}

/* =========================
   DOKUMEN API
========================= */

function normalizeDokumenRow(item) {
  return {
    id_dokumen: normalizeWhitespace(item.id_dokumen),
    id_realisasi: normalizeWhitespace(item.id_realisasi),
    id_simulasi: normalizeWhitespace(item.id_simulasi),
    nama_file: normalizeWhitespace(item.nama_file),
    mime_type: normalizeWhitespace(item.mime_type),
    created_at: item.created_at || '',
    updated_at: item.updated_at || ''
  };
}

async function loadDokumenRows(idRealisasi) {
  const rows = await apiGet(
    'listDokumen',
    { id_realisasi: idRealisasi },
    'Sedang Menarik Data Dokumen...'
  );
  window.SPSE_APP_STATE.dokumenMap[idRealisasi] = (Array.isArray(rows) ? rows : []).map(normalizeDokumenRow);
  return window.SPSE_APP_STATE.dokumenMap[idRealisasi];
}

function getRealisasiDokumenRows(idRealisasi) {
  return window.SPSE_APP_STATE.dokumenMap[idRealisasi] || [];
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveDokumenToSheet(payload) {
  const data = await apiPost(
    { action: 'saveDokumen', ...payload },
    'Sedang Mengunggah Dokumen...'
  );
  const normalized = normalizeDokumenRow(data);
  await loadDokumenRows(normalized.id_realisasi);
  return normalized;
}

/* =========================
   PACKAGE STATUS
========================= */

function getTodayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hitungStatusPaketDariTanggal(tanggalDdMmYyyy) {
  if (!normalizeWhitespace(tanggalDdMmYyyy)) return 'Draft';

  const ymd = ddmmyyyyToYmd(tanggalDdMmYyyy);
  if (!ymd) return 'Draft';

  if (ymd < getTodayYmd()) return 'Paket Sudah Selesai';
  return 'Paket Sedang Berjalan';
}

function isPackageLocked(currentPackage) {
  const status = normalizeWhitespace(currentPackage?.status_paket || '');
  return status === 'Paket Sudah Selesai';
}

/* =========================
   AUTO INIT
========================= */

document.addEventListener('DOMContentLoaded', () => {
  initGlobalLoading();
  fillUserIdentity();
});
