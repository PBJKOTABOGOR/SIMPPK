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
   BASIC HELPERS
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
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSatkerKey(value) {
  return normalizeWhitespace(value).toUpperCase();
}

function normalizeMethodText(value) {
  return normalizeWhitespace(value);
}

function safeNumber(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (value === null || value === undefined || value === '') return 0;

  const raw = String(value).trim();

  if (!raw) return 0;

  const clean = raw
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

function parseNumber(value) {
  return safeNumber(value);
}

function formatRupiahShort(value) {
  const num = safeNumber(value);
  if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if (num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Jt';
  if (num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahFull(value) {
  return 'Rp. ' + safeNumber(value).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatNumberIndonesia(value) {
  return safeNumber(value).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatNumberInput(value) {
  return safeNumber(value).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseTanggalIndonesia(value) {
  const text = normalizeWhitespace(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(text + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const d = new Date(text);
    return isNaN(d.getTime()) ? null : d;
  }

  const parts = text.split(/[-/]/);
  if (parts.length !== 3) return null;

  let day = Number(parts[0]);
  let month = Number(parts[1]) - 1;
  let year = Number(parts[2]);

  if (String(parts[0]).length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]) - 1;
    day = Number(parts[2]);
  }

  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateToDisplay(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : parseTanggalIndonesia(value);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : parseTanggalIndonesia(value);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateInput(value) {
  return formatDateToDisplay(value);
}

function formatTanggalIndonesia(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    const parsed = parseTanggalIndonesia(dateInput);
    if (!parsed) return String(dateInput);
    return parsed.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function randomKodeAnggaran() {
  const blocks = [1, 2, 2, 4, 1, 2, 2, 4, 1, 2, 2, 4].map(len => {
    let out = '';
    for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
    return out;
  });
  return blocks.join('.');
}

function randomPackageId() {
  return 'SIMPKT' + Date.now().toString();
}

function randomRealisasiId() {
  return 'SIMRLS' + Date.now().toString();
}

function randomPenyediaId() {
  return 'SIMPRV' + Date.now().toString();
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

/* =========================
   LOGIN UI
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

/* =========================
   TUTORIAL
========================= */
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

  window.addEventListener('resize', () => {
    if (overlay.style.display === 'block') showStep();
  });

  overlay.style.display = 'block';
  showStep();
}

/* =========================
   GLOBAL LOADING
========================= */
function ensureGlobalLoading() {
  let overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'globalLoadingOverlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;

  overlay.innerHTML = `
    <div style="
      min-width: 320px;
      max-width: 420px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      padding: 28px 24px;
      text-align: center;
      font-family: Arial, sans-serif;
    ">
      <div style="
        width: 28px;
        height: 28px;
        margin: 0 auto 16px auto;
        border: 4px solid #dbe6ff;
        border-top-color: #4b7bec;
        border-radius: 50%;
        animation: spseSpin .8s linear infinite;
      "></div>
      <div id="globalLoadingTitle" style="font-size: 26px; font-weight: 700; color: #222; margin-bottom: 8px;">Mohon Tunggu</div>
      <div id="globalLoadingText" style="font-size: 16px; color: #555;">Sedang Menarik Data...</div>
    </div>
  `;

  if (!document.getElementById('globalLoadingStyle')) {
    const style = document.createElement('style');
    style.id = 'globalLoadingStyle';
    style.textContent = `
      @keyframes spseSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
  return overlay;
}

function showLoading(title = 'Mohon Tunggu', text = 'Sedang Menarik Data...') {
  const overlay = ensureGlobalLoading();
  const titleEl = document.getElementById('globalLoadingTitle');
  const textEl = document.getElementById('globalLoadingText');

  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;

  overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

/* =========================
   SHEET RUP
========================= */
async function fetchSheetRows(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error('Gagal mengambil data sheet.');
  }

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
    pagu: safeNumber(item.pagu),
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
   SESSION DRAFT
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
    pagu: safeNumber(rupItem.pagu || 0),
    kode_anggaran: randomKodeAnggaran(),
    ppk: APP_CONFIG.currentUserName,
    instansi: APP_CONFIG.defaultInstansi,
    status_paket: 'Draft',
    status_realisasi: 'Belum Ada Realisasi',
    can_delete: 'YA',
    lokasi_provinsi: 'Jawa Barat',
    lokasi_kab_kota: 'Bogor (Kota)',
    detail_lokasi: 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah',
    isian_edit_selesai: '',
    pdn_realisasi: '0,00',
    umk_realisasi: '0,00',
    tanggal_paket_selesai: '',
    alasan_perubahan_tanggal: '',
    uraian_pekerjaan: '',
    jenis_pengadaan: 'Jasa Lainnya'
  };
}

/* =========================
   API HELPERS
========================= */
function ensureApiUrl() {
  if (!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
}

function buildApiUrl(action, params = {}) {
  ensureApiUrl();

  const url = new URL(APP_CONFIG.apiUrl);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function callApiGet(action, params = {}) {
  ensureApiUrl();

  const res = await fetch(buildApiUrl(action, params), {
    method: 'GET',
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Gagal mengambil data dari API');
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.message || 'Gagal mengambil data');
  }

  return json.data;
}

async function callApiPost(payload) {
  ensureApiUrl();

  const res = await fetch(APP_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Gagal memproses data ke API');
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.message || 'Gagal memproses data');
  }

  return json.data;
}

/* =========================
   PACKAGE API
========================= */
function normalizePackageRow(row) {
  const tanggalSelesai = row.tanggal_paket_selesai || '';
  const evaluated = evaluatePackageStatusByTanggal(tanggalSelesai);

  return {
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    kode_rup: normalizeWhitespace(row.kode_rup),
    nama_paket: normalizeWhitespace(row.nama_paket),
    satker: normalizeWhitespace(row.satker),
    tahun: normalizeWhitespace(row.tahun),
    metode_pemilihan: normalizeWhitespace(row.metode_pemilihan),
    sumber_dana: normalizeWhitespace(row.sumber_dana || 'APBD') || 'APBD',
    pagu: safeNumber(row.pagu),
    kode_anggaran: normalizeWhitespace(row.kode_anggaran),
    ppk: normalizeWhitespace(row.ppk),
    instansi: normalizeWhitespace(row.instansi),
    status_paket: evaluated.status_paket,
    status_realisasi: normalizeWhitespace(row.status_realisasi || 'Belum Ada Realisasi'),
    can_delete: evaluated.can_delete,
    lokasi_provinsi: normalizeWhitespace(row.lokasi_provinsi),
    lokasi_kab_kota: normalizeWhitespace(row.lokasi_kab_kota),
    detail_lokasi: normalizeWhitespace(row.detail_lokasi),
    isian_edit_selesai: normalizeWhitespace(row.isian_edit_selesai),
    pdn_realisasi: row.pdn_realisasi ?? '0,00',
    umk_realisasi: row.umk_realisasi ?? '0,00',
    tanggal_paket_selesai: tanggalSelesai,
    alasan_perubahan_tanggal: row.alasan_perubahan_tanggal || '',
    uraian_pekerjaan: row.uraian_pekerjaan || '',
    jenis_pengadaan: normalizeWhitespace(row.jenis_pengadaan || 'Jasa Lainnya')
  };
}

async function loadPackageRows() {
  const data = await callApiGet('listPackages');
  window.SPSE_APP_STATE.packageRows = (data || [])
    .map(normalizePackageRow)
    .filter(row => row.id_simulasi);
  return window.SPSE_APP_STATE.packageRows;
}

function findLoadedPackageById(id) {
  return (window.SPSE_APP_STATE.packageRows || []).find(item =>
    normalizeWhitespace(item.id_simulasi) === normalizeWhitespace(id)
  ) || null;
}

async function savePackageToSheet(pkg) {
  const evaluated = evaluatePackageStatusByTanggal(pkg.tanggal_paket_selesai || '');

  const payload = {
    action: 'savePackage',
    ...pkg,
    status_paket: evaluated.status_paket,
    can_delete: evaluated.can_delete,
    updated_at: new Date().toISOString()
  };

  const saved = await callApiPost(payload);
  await loadPackageRows();
  return normalizePackageRow(saved || payload);
}

async function deletePackageFromSheet(idSimulasi) {
  const result = await callApiPost({
    action: 'deletePackage',
    id_simulasi: idSimulasi
  });

  await loadPackageRows();
  return result;
}

/* =========================
   REALISASI API
========================= */
function normalizeRealisasiRow(row) {
  return {
    id_realisasi: normalizeWhitespace(row.id_realisasi),
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    bukti_pembayaran: normalizeWhitespace(row.bukti_pembayaran),
    jenis_realisasi: normalizeWhitespace(row.jenis_realisasi),
    nama_dokumen: normalizeWhitespace(row.nama_dokumen),
    nomor_dokumen: normalizeWhitespace(row.nomor_dokumen),
    nilai_realisasi: safeNumber(row.nilai_realisasi),
    tanggal_realisasi: row.tanggal_realisasi || '',
    keterangan: row.keterangan || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function loadRealisasiRows(idSimulasi) {
  const data = await callApiGet('listRealisasi', { id_simulasi: idSimulasi });
  window.SPSE_APP_STATE.realisasiRows = (data || []).map(normalizeRealisasiRow);
  return window.SPSE_APP_STATE.realisasiRows;
}

function getPackageRealisasiRows(idSimulasi) {
  return (window.SPSE_APP_STATE.realisasiRows || []).filter(item =>
    normalizeWhitespace(item.id_simulasi) === normalizeWhitespace(idSimulasi)
  );
}

function getTotalRealisasiByPackage(idSimulasi) {
  return getPackageRealisasiRows(idSimulasi).reduce((sum, row) => {
    return sum + safeNumber(row.nilai_realisasi);
  }, 0);
}

function findLoadedRealisasiById(idRealisasi) {
  return (window.SPSE_APP_STATE.realisasiRows || []).find(item =>
    normalizeWhitespace(item.id_realisasi) === normalizeWhitespace(idRealisasi)
  ) || null;
}

async function saveRealisasiToSheet(payload) {
  const saved = await callApiPost({
    action: 'saveRealisasi',
    ...payload
  });

  await loadRealisasiRows(payload.id_simulasi);
  await loadPackageRows();
  return normalizeRealisasiRow(saved);
}

/* =========================
   PENYEDIA API
========================= */
function normalizePenyediaRow(row) {
  return {
    id_penyedia: normalizeWhitespace(row.id_penyedia),
    id_realisasi: normalizeWhitespace(row.id_realisasi),
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    bentuk_usaha: normalizeWhitespace(row.bentuk_usaha),
    nama_penyedia: normalizeWhitespace(row.nama_penyedia),
    npwp: normalizeWhitespace(row.npwp),
    email: normalizeWhitespace(row.email),
    telp: normalizeWhitespace(row.telp),
    provinsi: normalizeWhitespace(row.provinsi),
    kabupaten_kota: normalizeWhitespace(row.kabupaten_kota),
    alamat: row.alamat || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function loadPenyediaRows(idRealisasi) {
  const data = await callApiGet('listPenyedia', { id_realisasi: idRealisasi });
  window.SPSE_APP_STATE.penyediaRows = (data || []).map(normalizePenyediaRow);
  return window.SPSE_APP_STATE.penyediaRows;
}

async function savePenyediaToSheet(payload) {
  const saved = await callApiPost({
    action: 'savePenyedia',
    ...payload
  });

  await loadPenyediaRows(payload.id_realisasi);
  return normalizePenyediaRow(saved);
}

/* =========================
   DOKUMEN API
========================= */
function normalizeDokumenRow(row) {
  return {
    id_dokumen: normalizeWhitespace(row.id_dokumen),
    id_realisasi: normalizeWhitespace(row.id_realisasi),
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    nama_file: normalizeWhitespace(row.nama_file),
    mime_type: normalizeWhitespace(row.mime_type),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function loadDokumenRows(idRealisasi) {
  const data = await callApiGet('listDokumen', { id_realisasi: idRealisasi });
  window.SPSE_APP_STATE.dokumenRows = (data || []).map(normalizeDokumenRow);
  return window.SPSE_APP_STATE.dokumenRows;
}

async function saveDokumenToSheet(payload) {
  const saved = await callApiPost({
    action: 'saveDokumen',
    ...payload
  });

  await loadDokumenRows(payload.id_realisasi);
  return normalizeDokumenRow(saved);
}

/* =========================
   STATUS / BUSINESS RULES
========================= */
function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizeDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function hitungStatusPaketDariTanggal(tanggalPaketSelesai) {
  const raw = String(tanggalPaketSelesai || '').trim();
  if (!raw) return 'Draft';

  const date = parseTanggalIndonesia(raw.replace(/\//g, '-'));
  if (!date) return 'Draft';

  const endDate = normalizeDateOnly(date);
  const today = getTodayStart();

  if (endDate < today) return 'Paket Sudah Selesai';
  return 'Paket Sedang Berjalan';
}

function evaluatePackageStatusByTanggal(tanggalPaketSelesai) {
  const status = hitungStatusPaketDariTanggal(tanggalPaketSelesai);

  return {
    status_paket: status,
    can_delete: status === 'Draft' ? 'YA' : 'TIDAK'
  };
}

function canEditRealisasiByStatus(status) {
  const s = normalizeWhitespace(status);
  return s === 'Draft' || s === 'Paket Sedang Berjalan';
}

function canDeletePackageByStatus(status) {
  return normalizeWhitespace(status) === 'Draft';
}

/* =========================
   DATE PICKER
========================= */
function createDatePickerInput(options = {}) {
  const {
    value = '',
    placeholder = 'dd-mm-yyyy',
    disabled = false
  } = options;

  const wrap = document.createElement('div');
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '6px';

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'text-control';
  text.readOnly = true;
  text.placeholder = placeholder;
  text.style.maxWidth = '150px';
  text.style.width = '150px';
  text.style.cursor = 'pointer';
  text.value = value ? formatDateToDisplay(value) : '';

  const buttonHolder = document.createElement('div');
  buttonHolder.style.position = 'relative';
  buttonHolder.style.width = '32px';
  buttonHolder.style.height = '30px';
  buttonHolder.style.flex = '0 0 32px';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-blue';
  button.style.width = '32px';
  button.style.height = '30px';
  button.style.padding = '0';
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.textContent = '📅';

  const hidden = document.createElement('input');
  hidden.type = 'date';
  hidden.value = value ? formatDateForInput(value) : '';
  hidden.style.position = 'absolute';
  hidden.style.left = '0';
  hidden.style.top = '0';
  hidden.style.width = '32px';
  hidden.style.height = '30px';
  hidden.style.opacity = '0';
  hidden.style.cursor = 'pointer';
  hidden.style.zIndex = '5';
  hidden.style.border = '0';
  hidden.style.margin = '0';
  hidden.style.padding = '0';

  function syncTextFromHidden() {
    if (!hidden.value) {
      text.value = '';
      return;
    }
    text.value = formatDateToDisplay(hidden.value);
  }

  function openPicker() {
    if (hidden.disabled) return;

    try {
      hidden.focus();
    } catch (e) {}

    if (typeof hidden.showPicker === 'function') {
      try {
        hidden.showPicker();
        return;
      } catch (e) {}
    }

    hidden.click();
  }

  text.addEventListener('click', openPicker);
  button.addEventListener('click', openPicker);
  hidden.addEventListener('change', syncTextFromHidden);
  hidden.addEventListener('input', syncTextFromHidden);

  buttonHolder.appendChild(button);
  buttonHolder.appendChild(hidden);

  wrap.appendChild(text);
  wrap.appendChild(buttonHolder);

  function setValue(val) {
    hidden.value = val ? formatDateForInput(val) : '';
    text.value = val ? formatDateToDisplay(val) : '';
  }

  function setDisabled(state) {
    const isDisabled = !!state;

    text.disabled = isDisabled;
    button.disabled = isDisabled;
    hidden.disabled = isDisabled;

    text.style.background = isDisabled ? '#f3f4f6' : '#fff';
    text.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    button.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    hidden.style.pointerEvents = isDisabled ? 'none' : 'auto';
  }

  setValue(value);
  setDisabled(disabled);

  return {
    wrap,
    text,
    hidden,
    button,
    getValue() {
      return text.value || '';
    },
    setValue,
    setDisabled
  };
}
