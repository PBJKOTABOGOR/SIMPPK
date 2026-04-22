<script>
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
  realisasiByPackage: {}
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

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeWhitespace(value){
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSatkerKey(value){
  return normalizeWhitespace(value).toUpperCase();
}

function normalizeMethodText(value){
  return normalizeWhitespace(value);
}

function toUpper(value){
  return normalizeWhitespace(value).toUpperCase();
}

function getQueryParam(name){
  return new URLSearchParams(location.search).get(name);
}

function formatRupiahShort(value){
  const num = Number(value || 0);
  if(num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if(num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Jt';
  if(num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahFull(value){
  return 'Rp. ' + Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseNumber(value){
  if(value === undefined || value === null || value === '') return 0;
  if(typeof value === 'number') return value;

  const clean = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

function formatNumberInput(value){
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function randomKodeAnggaran(){
  const blocks = [1,2,2,4,1,2,2,4,1,2,2,4].map(len => {
    let out = '';
    for(let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
    return out;
  });
  return blocks.join('.');
}

function randomPackageId(){
  return 'SIMPKT' + Date.now().toString().slice(-10);
}

function randomId(prefix){
  return prefix + Date.now().toString().slice(-10);
}

function isMethodMatch(selectedMethod, metodeRup){
  if(!selectedMethod) return true;
  const candidates = METHOD_MAP[selectedMethod] || [selectedMethod];
  const normalized = normalizeMethodText(metodeRup).toLowerCase();
  return candidates.some(m => normalized.includes(String(m).toLowerCase()));
}

function fillUserIdentity(){
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = APP_CONFIG.currentUserName);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = APP_CONFIG.currentUserRole);
}

function requireLogin(){
  if(localStorage.getItem(STORAGE_KEYS.login) !== '1'){
    location.href = 'login.html';
    return false;
  }
  fillUserIdentity();
  return true;
}

function bindLogout(buttonId = 'btnLogout'){
  const btn = document.getElementById(buttonId);
  if(!btn) return;
  btn.onclick = () => {
    localStorage.removeItem(STORAGE_KEYS.login);
    location.href = 'login.html';
  };
}

function isTutorialDisabled(){
  return localStorage.getItem(STORAGE_KEYS.hideTutorial) === '1';
}

function disableTutorials(){
  localStorage.setItem(STORAGE_KEYS.hideTutorial, '1');
}

function setupTutorial(options){
  if(isTutorialDisabled()) return;

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

  if(!overlay || !highlight || !arrow || !card || !title || !text || !nextBtn || !skipBtn || !steps.length) return;

  let idx = 0;

  function closeTour(){
    overlay.style.display = 'none';
  }

  async function showStep(){
    const step = steps[idx];
    if(!step) return closeTour();

    if(typeof step.onEnter === 'function') await step.onEnter();

    const target = document.querySelector(step.target);
    if(!target) return closeTour();

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

      if(top < 12) top = rect.bottom + 26;
      if(top + 170 > window.innerHeight) top = rect.top - 190;

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
    if(idx >= steps.length) return closeTour();
    showStep();
  };

  skipBtn.onclick = closeTour;

  if(hideBtn){
    hideBtn.onclick = () => {
      disableTutorials();
      closeTour();
    };
  }

  window.addEventListener('resize', () => {
    if(overlay.style.display === 'block') showStep();
  });

  overlay.style.display = 'block';
  showStep();
}

/* =========================
   LOADING POPUP
========================= */
function ensureLoadingOverlay(){
  if(document.getElementById('globalLoadingOverlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    .global-loading-overlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.28);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:99999;
    }
    .global-loading-box{
      min-width:320px;
      max-width:460px;
      background:#fff;
      border-radius:10px;
      box-shadow:0 12px 28px rgba(0,0,0,.22);
      padding:24px 22px;
      text-align:center;
      border:1px solid #d9e1ea;
    }
    .global-loading-spinner{
      width:40px;
      height:40px;
      border:4px solid #dbe4ee;
      border-top:4px solid #3f6fd9;
      border-radius:50%;
      margin:0 auto 14px;
      animation:spseSpin .8s linear infinite;
    }
    .global-loading-title{
      font-size:18px;
      font-weight:700;
      color:#1f2d3d;
      margin-bottom:6px;
    }
    .global-loading-text{
      font-size:14px;
      color:#4e5d6c;
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
      <div class="global-loading-spinner"></div>
      <div class="global-loading-title">Mohon Tunggu</div>
      <div class="global-loading-text" id="globalLoadingText">Sedang menarik data...</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showLoading(message = 'Sedang menarik data...'){
  ensureLoadingOverlay();
  const overlay = document.getElementById('globalLoadingOverlay');
  const text = document.getElementById('globalLoadingText');
  if(text) text.textContent = message;
  if(overlay) overlay.style.display = 'flex';
}

function hideLoading(){
  const overlay = document.getElementById('globalLoadingOverlay');
  if(overlay) overlay.style.display = 'none';
}

/* =========================
   FORMAT TANGGAL
========================= */
function pad2(num){
  return String(num).padStart(2, '0');
}

function formatDateInput(value){
  const raw = normalizeWhitespace(value);
  if(!raw) return '';

  if(/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
    const [y, m, d] = raw.split('-');
    return `${d}-${m}-${y}`;
  }

  const date = new Date(raw);
  if(!isNaN(date.getTime())){
    return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
  }

  return raw;
}

function ddmmyyyyToYmd(value){
  const raw = normalizeWhitespace(value);
  if(!raw) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if(/^\d{2}-\d{2}-\d{4}$/.test(raw)){
    const [d, m, y] = raw.split('-');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function createDatePickerInput(options = {}){
  const wrap = document.createElement('div');
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '6px';
  wrap.style.position = 'relative';

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'text-control';
  text.placeholder = options.placeholder || 'dd-mm-yyyy';
  text.value = formatDateInput(options.value || '');
  text.readOnly = true;

  const hidden = document.createElement('input');
  hidden.type = 'date';
  hidden.value = ddmmyyyyToYmd(options.value || '');
  hidden.tabIndex = -1;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'refresh-btn';
  button.textContent = '🗓';
  button.style.width = '34px';
  button.style.minWidth = '34px';
  button.style.height = '32px';
  button.style.padding = '0';

  hidden.addEventListener('change', () => {
    text.value = formatDateInput(hidden.value);
    if(typeof options.onChange === 'function'){
      options.onChange(text.value, hidden.value);
    }
  });

  button.addEventListener('click', () => {
    if(typeof hidden.showPicker === 'function'){
      hidden.showPicker();
    } else {
      hidden.click();
    }
  });

  wrap.appendChild(text);
  wrap.appendChild(button);
  wrap.appendChild(hidden);

  return { wrap, text, hidden, button };
}

/* =========================
   API
========================= */
function buildApiUrl(action, params = {}){
  if(!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  const url = new URL(APP_CONFIG.apiUrl);
  if(action) url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if(value !== undefined && value !== null && value !== ''){
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function apiGet(action, params = {}){
  if(!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');

  const res = await fetch(buildApiUrl(action, params), {
    method: 'GET',
    cache: 'no-store'
  });

  const json = await res.json();

  if(json.ok === false || json.success === false){
    throw new Error(json.message || 'Request gagal');
  }

  return json.data !== undefined ? json.data : json;
}

async function apiPost(action, payload = {}){
  if(!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');

  const res = await fetch(APP_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  const json = await res.json();

  if(json.ok === false || json.success === false){
    throw new Error(json.message || 'Request gagal');
  }

  return json.data !== undefined ? json.data : json;
}

/* =========================
   SHEET GIZ / RUP MASTER
========================= */
async function fetchSheetRows(gid){
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

async function ensureDataLoaded(force = false){
  if(window.SPSE_APP_STATE.dataLoaded && !force) return;

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

function getUniqueSatkersByYear(tahun){
  const map = new Map();

  window.SPSE_APP_STATE.allRup
    .filter(item => String(item.tahun) === String(tahun) && item.satker)
    .forEach(item => {
      if(!map.has(item.satker_key)) map.set(item.satker_key, item.satker);
    });

  return [...map.values()].sort((a, b) => a.localeCompare(b, 'id'));
}

function filterRupRows({ tahun, satker, metode }){
  const satkerKey = normalizeSatkerKey(satker);

  return window.SPSE_APP_STATE.allRup.filter(item =>
    String(item.tahun) === String(tahun) &&
    item.satker_key === satkerKey &&
    isMethodMatch(metode, item.metode_rup)
  );
}

/* =========================
   DRAFT PACKAGE
========================= */
function setDraftPackage(pkg){
  sessionStorage.setItem(STORAGE_KEYS.draftPackage, JSON.stringify(pkg));
}

function getDraftPackage(){
  try{
    const raw = sessionStorage.getItem(STORAGE_KEYS.draftPackage);
    return raw ? JSON.parse(raw) : null;
  } catch(error){
    return null;
  }
}

function clearDraftPackage(){
  sessionStorage.removeItem(STORAGE_KEYS.draftPackage);
}

function buildDraftPackageFromRup(rupItem){
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
   PACKAGE / REALISASI LOADERS
========================= */
function normalizePackageRow(row){
  return {
    ...row,
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    kode_rup: normalizeWhitespace(row.kode_rup),
    nama_paket: normalizeWhitespace(row.nama_paket),
    satker: normalizeWhitespace(row.satker),
    tahun: normalizeWhitespace(row.tahun),
    metode_pemilihan: normalizeWhitespace(row.metode_pemilihan),
    sumber_dana: normalizeWhitespace(row.sumber_dana || 'APBD') || 'APBD',
    pagu: parseNumber(row.pagu),
    kode_anggaran: normalizeWhitespace(row.kode_anggaran),
    ppk: normalizeWhitespace(row.ppk),
    instansi: normalizeWhitespace(row.instansi || APP_CONFIG.defaultInstansi),
    status_paket: normalizeWhitespace(row.status_paket || 'Draft'),
    status_realisasi: normalizeWhitespace(row.status_realisasi || 'Belum Ada Realisasi'),
    can_delete: normalizeWhitespace(row.can_delete || 'YA'),
    lokasi_provinsi: normalizeWhitespace(row.lokasi_provinsi || 'Jawa Barat'),
    lokasi_kab_kota: normalizeWhitespace(row.lokasi_kab_kota || 'Bogor (Kota)'),
    detail_lokasi: normalizeWhitespace(row.detail_lokasi || 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah'),
    isian_edit_selesai: normalizeWhitespace(row.isian_edit_selesai || ''),
    pdn_realisasi: normalizeWhitespace(row.pdn_realisasi || '0,00'),
    umk_realisasi: normalizeWhitespace(row.umk_realisasi || '0,00'),
    tanggal_paket_selesai: normalizeWhitespace(row.tanggal_paket_selesai || ''),
    alasan_perubahan_tanggal: normalizeWhitespace(row.alasan_perubahan_tanggal || ''),
    uraian_pekerjaan: row.uraian_pekerjaan || '',
    jenis_pengadaan: normalizeWhitespace(row.jenis_pengadaan || 'Jasa Lainnya')
  };
}

function normalizeRealisasiRow(row){
  return {
    ...row,
    id_realisasi: normalizeWhitespace(row.id_realisasi),
    id_simulasi: normalizeWhitespace(row.id_simulasi),
    bukti_pembayaran: normalizeWhitespace(row.bukti_pembayaran),
    jenis_realisasi: normalizeWhitespace(row.jenis_realisasi),
    nama_dokumen: normalizeWhitespace(row.nama_dokumen),
    nomor_dokumen: normalizeWhitespace(row.nomor_dokumen),
    nilai_realisasi: parseNumber(row.nilai_realisasi),
    tanggal_realisasi: normalizeWhitespace(row.tanggal_realisasi),
    keterangan: row.keterangan || ''
  };
}

async function loadPackageRows(force = false){
  if(window.SPSE_APP_STATE.packageRows.length && !force){
    return window.SPSE_APP_STATE.packageRows;
  }

  let rows = [];
  try{
    rows = await apiGet('listPackages');
  } catch(error){
    try{
      rows = await fetchSheetRows(APP_CONFIG.packageSheetGid);
    } catch(e){
      rows = [];
    }
  }

  window.SPSE_APP_STATE.packageRows = (rows || [])
    .map(normalizePackageRow)
    .filter(row => row.id_simulasi);

  return window.SPSE_APP_STATE.packageRows;
}

function findLoadedPackageById(id){
  return (window.SPSE_APP_STATE.packageRows || []).find(item =>
    normalizeWhitespace(item.id_simulasi) === normalizeWhitespace(id)
  ) || null;
}

async function loadRealisasiRows(idSimulasi, force = false){
  const key = normalizeWhitespace(idSimulasi);
  if(!key) return [];

  if(window.SPSE_APP_STATE.realisasiByPackage[key] && !force){
    return window.SPSE_APP_STATE.realisasiByPackage[key];
  }

  const rows = await apiGet('listRealisasi', { id_simulasi: key });
  const cleanRows = (rows || []).map(normalizeRealisasiRow);
  window.SPSE_APP_STATE.realisasiByPackage[key] = cleanRows;
  return cleanRows;
}

function getPackageRealisasiRows(idSimulasi){
  const key = normalizeWhitespace(idSimulasi);
  return window.SPSE_APP_STATE.realisasiByPackage[key] || [];
}

/* =========================
   SAVE / DELETE PACKAGE
========================= */
async function savePackageToSheet(pkg){
  const saved = await apiPost('savePackage', {
    ...pkg,
    updated_at: new Date().toISOString()
  });

  await loadPackageRows(true);
  return normalizePackageRow(saved);
}

async function deletePackageFromSheet(idSimulasi){
  const res = await apiPost('deletePackage', {
    id_simulasi: idSimulasi
  });

  await loadPackageRows(true);
  return res;
}

/* =========================
   SAVE / DELETE REALISASI
========================= */
async function saveRealisasiToSheet(payload){
  const saved = await apiPost('saveRealisasi', payload);
  if(payload.id_simulasi){
    await loadRealisasiRows(payload.id_simulasi, true);
    await loadPackageRows(true);
  }
  return normalizeRealisasiRow(saved);
}

async function deleteRealisasiFromSheet(idRealisasi, idSimulasi){
  const res = await apiPost('deleteRealisasi', {
    id_realisasi: idRealisasi,
    id_simulasi: idSimulasi
  });

  if(idSimulasi){
    await loadRealisasiRows(idSimulasi, true);
    await loadPackageRows(true);
  }

  return res;
}

/* =========================
   STATUS / HAK AKSI
========================= */
function getStatusFromTanggalSelesai(tanggalSelesai){
  const ymd = ddmmyyyyToYmd(tanggalSelesai);
  if(!ymd) return 'Draft';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(ymd + 'T00:00:00');
  return target < today || target.getTime() === today.getTime()
    ? 'Paket Sudah Selesai'
    : 'Paket Sedang Berjalan';
}

function isDraftPackage(pkg){
  return getStatusFromTanggalSelesai(pkg?.tanggal_paket_selesai || '') === 'Draft';
}

function isFinishedPackage(pkg){
  return getStatusFromTanggalSelesai(pkg?.tanggal_paket_selesai || '') === 'Paket Sudah Selesai';
}

function isRunningPackage(pkg){
  return getStatusFromTanggalSelesai(pkg?.tanggal_paket_selesai || '') === 'Paket Sedang Berjalan';
}

function canDeletePackage(pkg){
  return isDraftPackage(pkg);
}

function canEditRealisasi(pkg){
  return !isFinishedPackage(pkg);
}

function canDeleteRealisasi(pkg){
  return !isFinishedPackage(pkg);
}
</script>
