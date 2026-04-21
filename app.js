const APP_CONFIG = {
  spreadsheetId: '1ssQdLVKLPPj0dI6a_7iUwxm3L2IiPOZodIg1uE20BM0',
  rupMasterGid: '2083920669',
  defaultInstansi: 'Kota Bogor',
  defaultTahun: '2026',
  currentUserName: 'PPK',
  currentUserRole: 'Pejabat Pembuat Komitmen'
};

window.SPSE_APP_STATE = window.SPSE_APP_STATE || {
  allRup: [],
  filteredRup: [],
  selectedRows: new Set(),
  dataLoaded: false
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
  username: 'spse_username',
  hideTutorial: 'spse_hide_tutorial',
  packages: 'spse_created_packages'
};

function makeCaptcha(len = 6){
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for(let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRupiahShort(value){
  const num = Number(value || 0);
  if(num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if(num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Jt';
  if(num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahFull(value){
  return 'Rp. ' + Number(value || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTanggalIndonesia(dateInput){
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseMaybeNumber(value){
  if(typeof value === 'number') return value;
  const clean = String(value || '').replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}

function randomKodeAnggaran(){
  const blocks = [];
  const lengths = [1, 2, 2, 2, 4, 1, 2, 2, 2, 4, 1, 2, 2, 2, 4];
  lengths.forEach(len => {
    let str = '';
    for(let i = 0; i < len; i++) str += Math.floor(Math.random() * 10);
    blocks.push(str);
  });
  return blocks.join('.');
}

function randomPackageId(){
  const base = Date.now().toString();
  return 'PKT' + base.slice(-10);
}

function getQueryParam(name){
  return new URLSearchParams(location.search).get(name);
}

function getStoredPackages(){
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.packages);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveStoredPackages(list){
  localStorage.setItem(STORAGE_KEYS.packages, JSON.stringify(list));
}

function findPackageById(packageId){
  return getStoredPackages().find(item => item.package_id === packageId) || null;
}

function updatePackage(packageId, updater){
  const rows = getStoredPackages();
  const index = rows.findIndex(item => item.package_id === packageId);
  if(index === -1) return null;
  const current = rows[index];
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  rows[index] = next;
  saveStoredPackages(rows);
  return next;
}

function deletePackage(packageId){
  const rows = getStoredPackages();
  const current = rows.find(item => item.package_id === packageId);
  if(!current || current.has_realisasi) return false;
  saveStoredPackages(rows.filter(item => item.package_id !== packageId));
  return true;
}

function buildPackageFromRup(rupItem){
  const now = new Date();
  return {
    package_id: randomPackageId(),
    created_at: now.toISOString(),
    tanggal_buat: formatTanggalIndonesia(now),
    id_rup: String(rupItem.id_rup || '').trim(),
    nama_paket: String(rupItem.nama_paket || '').trim(),
    metode_rup: String(rupItem.metode_rup || '').trim(),
    pagu: Number(rupItem.pagu || 0),
    satker: String(rupItem.satker || '').trim(),
    tahun: String(rupItem.tahun || '').trim(),
    sumber_dana: String(rupItem.sumber_dana || 'APBD').trim() || 'APBD',
    status: 'Draft',
    has_realisasi: false,
    instansi: APP_CONFIG.defaultInstansi,
    kode_anggaran: randomKodeAnggaran(),
    ppk: APP_CONFIG.currentUserName,
    lokasi_provinsi: 'Jawa Barat',
    lokasi_kabkota: 'Bogor (Kota)',
    detail_lokasi: 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah',
    is_saved: false
  };
}

function createPackageFromSelectedRup(rupItem){
  const pkg = buildPackageFromRup(rupItem);
  const rows = getStoredPackages();
  rows.push(pkg);
  saveStoredPackages(rows);
  return pkg;
}

function isTutorialDisabled(){
  return localStorage.getItem(STORAGE_KEYS.hideTutorial) === '1';
}

function disableTutorials(){
  localStorage.setItem(STORAGE_KEYS.hideTutorial, '1');
}

function enableTutorials(){
  localStorage.removeItem(STORAGE_KEYS.hideTutorial);
}

async function ensureDataLoaded(){
  if(window.SPSE_APP_STATE.dataLoaded) return;
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/gviz/tq?gid=${APP_CONFIG.rupMasterGid}&tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const jsonText = text.substring(47).slice(0, -2);
  const json = JSON.parse(jsonText);
  const cols = json.table.cols.map(c => (c.label || '').trim());
  const rows = json.table.rows.map(row => {
    const obj = {};
    cols.forEach((col, idx) => {
      obj[col] = row.c[idx] ? row.c[idx].v : '';
    });
    return obj;
  });
  window.SPSE_APP_STATE.allRup = rows.map(item => ({
    id_rup: String(item.id_rup || '').trim(),
    nama_paket: String(item.nama_paket || '').trim(),
    metode_rup: String(item.metode_rup || '').trim(),
    pagu: Number(item.pagu || 0),
    satker: String(item.satker || '').trim(),
    tahun: String(item.tahun || '').trim(),
    sumber_dana: 'APBD'
  }));
  window.SPSE_APP_STATE.dataLoaded = true;
}

function isMethodMatch(selectedMethod, metodeRup){
  if(!selectedMethod) return true;
  const candidates = METHOD_MAP[selectedMethod] || [selectedMethod];
  const normalized = String(metodeRup || '').toLowerCase();
  return candidates.some(m => normalized.includes(String(m).toLowerCase()));
}

function fillUserIdentity(){
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = APP_CONFIG.currentUserName);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = APP_CONFIG.currentUserRole);
}

function requireLogin(){
  if(localStorage.getItem(STORAGE_KEYS.login) !== '1') {
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

  let currentIndex = 0;

  function closeTour(){
    overlay.style.display = 'none';
  }

  async function showStep(){
    const step = steps[currentIndex];
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
      let left = Math.max(12, Math.min(window.innerWidth - 332, rect.left));
      let top = step.place === 'top' ? rect.top - 190 : rect.bottom + 26;
      if(top < 12) top = rect.bottom + 26;
      if(top + 180 > window.innerHeight) top = rect.top - 190;
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      arrow.style.left = (rect.left + Math.min(rect.width / 2, 90)) + 'px';
      arrow.style.top = (step.place === 'top' ? rect.top - 26 : rect.bottom + 6) + 'px';
      arrow.style.transform = step.place === 'top' ? 'rotate(180deg)' : 'rotate(0deg)';
      nextBtn.textContent = currentIndex === steps.length - 1 ? 'Selesai' : 'Lanjut';
    }, 260);
  }

  nextBtn.onclick = () => {
    currentIndex += 1;
    if(currentIndex >= steps.length) return closeTour();
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
