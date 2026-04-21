const APP_CONFIG = {
  spreadsheetId: '1ssQdLVKLPPj0dI6a_7iUwxm3L2IiPOZodIg1uE20BM0',
  rupMasterGid: '2083920669',
  packageSheetGid: '401635447',
  defaultInstansi: 'Kota Bogor',
  defaultTahun: '2026',
  currentUserName: 'PPK',
  currentUserRole: 'Pejabat Pembuat Komitmen',
  apiUrl: 'https://script.google.com/macros/s/AKfycbz2YdOnLyniHWIAKC_hlGwFTpFftjDAxiF1nI2eHmnggj8DFkiD51MEbSbvJHCDMaj9Jg/exec'
};

window.SPSE_APP_STATE = window.SPSE_APP_STATE || {
  allRup: [],
  filteredRup: [],
  selectedRows: new Set(),
  dataLoaded: false,
  packageRows: []
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

const PROVIDER_BENTUK_USAHA = [
  'BUM Desa','BUM Desa Bersama','Badan Layanan Umum (BLU)','Badan Usaha Luar Negeri','Badan hukum lainnya','Bentuk Usaha Tetap','Kantor Perwakilan','Koperasi','Orang Perseorangan','Persekutuan Firma (FA / Venootschap Onder Firma)','Persekutuan Komanditer (CV / Commanditer Venoschaap )','Persekutuan Perdata','Perseroan Terbatas (PT)','Perseroan Terbatas (PT) Perorangan','Persyarikatan atau Perkumpulan','Perusahaan umum (Perum)','Perusahaan umum daerah (Perumda)'
];
const PROVINSI_LIST = ['Aceh','Bali','Banten','Bengkulu','DI Yogyakarta','DKI Jakarta','Gorontalo','Jambi','Jawa Barat','Jawa Tengah','Jawa Timur','Kalimantan Barat','Kalimantan Selatan','Kalimantan Tengah','Kalimantan Timur','Kalimantan Utara','Kepulauan Bangka Belitung','Kepulauan Riau','Lampung','Maluku','Maluku Utara','Nusa Tenggara Barat','Nusa Tenggara Timur','Papua','Papua Barat','Papua Barat Daya','Papua Pegunungan','Papua Selatan','Papua Tengah','Riau','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tengah','Sulawesi Tenggara','Sulawesi Utara','Sumatera Barat','Sumatera Selatan','Sumatera Utara'];
const KABKOTA_JABAR = ['Bandung Barat (Kab.)','Bandung (Kab.)','Bandung (Kota)','Banjar (Kota)','Bekasi (Kab.)','Bekasi (Kota)','Bogor (Kab.)','Bogor (Kota)','Ciamis (Kab.)','Cianjur (Kab.)','Cimahi (Kota)','Cirebon (Kab.)','Cirebon (Kota)','Depok (Kota)','Garut (Kab.)','Indramayu (Kab.)','Karawang (Kab.)','Kuningan (Kab.)','Majalengka (Kab.)','Pangandaran (Kab.)','Purwakarta (Kab.)','Subang (Kab.)','Sukabumi (Kab.)','Sukabumi (Kota)','Sumedang (Kab.)','Tasikmalaya (Kab.)','Tasikmalaya (Kota)'];

function makeCaptcha(len = 6){
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for(let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
function escapeHtml(value){
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function normalizeWhitespace(value){ return String(value || '').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim(); }
function normalizeSatkerKey(value){ return normalizeWhitespace(value).toUpperCase(); }
function normalizeMethodText(value){ return normalizeWhitespace(value); }
function formatRupiahShort(value){
  const num = Number(value || 0);
  if(num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID',{maximumFractionDigits:1}) + ' M';
  if(num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID',{maximumFractionDigits:1}) + ' Jt';
  if(num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID',{maximumFractionDigits:1}) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}
function formatRupiahFull(value){ return 'Rp. ' + Number(value || 0).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function formatTanggalIndonesia(dateInput){
  if(!dateInput) return '';
  const date = new Date(dateInput);
  if(Number.isNaN(date.getTime())) return String(dateInput);
  return date.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
}
function formatDateDMY(value){
  if(!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function parseDateDMY(text){
  const clean = normalizeWhitespace(text);
  const match = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if(!match) return null;
  const d = new Date(Number(match[3]), Number(match[2])-1, Number(match[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function todayAtZero(){ const d = new Date(); d.setHours(0,0,0,0); return d; }
function randomKodeAnggaran(){
  return [1,2,2,4,1,2,2,4,1,2,2,4].map(len => Array.from({length:len},()=>Math.floor(Math.random()*10)).join('')).join('.');
}
function randomPackageId(){ return 'SIMPKT' + Date.now().toString().slice(-10); }
function randomRealisasiId(){ return 'SIMRLS' + Date.now().toString().slice(-10); }
function randomProviderId(){ return 'SIMPRV' + Date.now().toString().slice(-10); }
function getQueryParam(name){ return new URLSearchParams(location.search).get(name); }
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
  if(localStorage.getItem(STORAGE_KEYS.login) !== '1'){ location.href = 'login.html'; return false; }
  fillUserIdentity();
  return true;
}
function bindLogout(buttonId='btnLogout'){
  const btn=document.getElementById(buttonId); if(!btn) return;
  btn.onclick=()=>{ localStorage.removeItem(STORAGE_KEYS.login); location.href='login.html'; };
}
function isTutorialDisabled(){ return localStorage.getItem(STORAGE_KEYS.hideTutorial) === '1'; }
function disableTutorials(){ localStorage.setItem(STORAGE_KEYS.hideTutorial,'1'); }
function setupTutorial(options){
  if(isTutorialDisabled()) return;
  const overlay=document.getElementById(options.overlayId||'tourOverlay');
  const highlight=document.getElementById(options.highlightId||'tourHighlight');
  const arrow=document.getElementById(options.arrowId||'tourArrow');
  const card=document.getElementById(options.cardId||'tourCard');
  const title=document.getElementById(options.titleId||'tourTitle');
  const text=document.getElementById(options.textId||'tourText');
  const nextBtn=document.getElementById(options.nextBtnId||'tourNextBtn');
  const skipBtn=document.getElementById(options.skipBtnId||'tourSkipBtn');
  const hideBtn=document.getElementById(options.hideBtnId||'tourNeverBtn');
  const steps=Array.isArray(options.steps)?options.steps:[];
  if(!overlay||!highlight||!arrow||!card||!title||!text||!nextBtn||!skipBtn||!steps.length) return;
  let idx=0;
  function closeTour(){ overlay.style.display='none'; }
  async function showStep(){
    const step=steps[idx]; if(!step) return closeTour();
    if(typeof step.onEnter==='function') await step.onEnter();
    const target=document.querySelector(step.target); if(!target) return closeTour();
    target.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>{
      const rect=target.getBoundingClientRect();
      highlight.style.left=(rect.left-8)+'px'; highlight.style.top=(rect.top-8)+'px'; highlight.style.width=(rect.width+16)+'px'; highlight.style.height=(rect.height+16)+'px';
      title.textContent=step.title||'Petunjuk'; text.innerHTML=step.text||'';
      let left=Math.max(12,Math.min(window.innerWidth-352,rect.left));
      let top=step.place==='top'?rect.top-190:rect.bottom+26; if(top<12) top=rect.bottom+26; if(top+170>window.innerHeight) top=rect.top-190;
      card.style.left=left+'px'; card.style.top=top+'px';
      arrow.style.left=(rect.left+Math.min(rect.width/2,90))+'px'; arrow.style.top=(step.place==='top'?rect.top-26:rect.bottom+6)+'px'; arrow.style.transform=step.place==='top'?'rotate(180deg)':'rotate(0deg)';
      nextBtn.textContent=idx===steps.length-1?'Selesai':'Lanjut';
    },280);
  }
  nextBtn.onclick=()=>{ idx+=1; if(idx>=steps.length) return closeTour(); showStep(); };
  skipBtn.onclick=closeTour; if(hideBtn) hideBtn.onclick=()=>{ disableTutorials(); closeTour(); };
  window.addEventListener('resize',()=>overlay.style.display==='block'&&showStep()); overlay.style.display='block'; showStep();
}
async function fetchSheetRows(gid){
  const url=`https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
  const res=await fetch(url,{cache:'no-store'}); const text=await res.text();
  const json=JSON.parse(text.substring(47).slice(0,-2));
  const cols=json.table.cols.map(c=>normalizeWhitespace(c.label||''));
  return json.table.rows.map(row=>{ const obj={}; cols.forEach((col,idx)=>{ obj[col]=row.c[idx]?row.c[idx].v:''; }); return obj; });
}
async function ensureDataLoaded(){
  if(window.SPSE_APP_STATE.dataLoaded) return;
  const rows=await fetchSheetRows(APP_CONFIG.rupMasterGid);
  window.SPSE_APP_STATE.allRup=rows.map(item=>({
    id_rup: normalizeWhitespace(item.id_rup), nama_paket: normalizeWhitespace(item.nama_paket), metode_rup: normalizeMethodText(item.metode_rup), pagu: Number(item.pagu||0), satker: normalizeWhitespace(item.satker), satker_key: normalizeSatkerKey(item.satker), tahun: normalizeWhitespace(item.tahun), sumber_dana: normalizeWhitespace(item.sumber_dana||'APBD')||'APBD'
  }));
  window.SPSE_APP_STATE.dataLoaded=true;
}
function getUniqueSatkersByYear(tahun){
  const map=new Map();
  window.SPSE_APP_STATE.allRup.filter(item=>String(item.tahun)===String(tahun)&&item.satker).forEach(item=>{ if(!map.has(item.satker_key)) map.set(item.satker_key,item.satker); });
  return [...map.values()].sort((a,b)=>a.localeCompare(b,'id'));
}
function filterRupRows({tahun,satker,metode}){
  const satkerKey=normalizeSatkerKey(satker);
  return window.SPSE_APP_STATE.allRup.filter(item=>String(item.tahun)===String(tahun)&&item.satker_key===satkerKey&&isMethodMatch(metode,item.metode_rup));
}
function setDraftPackage(pkg){ sessionStorage.setItem(STORAGE_KEYS.draftPackage, JSON.stringify(pkg)); }
function getDraftPackage(){ try{ const raw=sessionStorage.getItem(STORAGE_KEYS.draftPackage); return raw?JSON.parse(raw):null; }catch(error){ return null; } }
function clearDraftPackage(){ sessionStorage.removeItem(STORAGE_KEYS.draftPackage); }
function buildDraftPackageFromRup(rupItem){
  const now=new Date().toISOString();
  return {
    id_simulasi: randomPackageId(), created_at: now, updated_at: now,
    kode_rup: normalizeWhitespace(rupItem.id_rup), nama_paket: normalizeWhitespace(rupItem.nama_paket), satker: normalizeWhitespace(rupItem.satker), tahun: normalizeWhitespace(rupItem.tahun), metode_pemilihan: normalizeMethodText(rupItem.metode_rup), sumber_dana: normalizeWhitespace(rupItem.sumber_dana||'APBD')||'APBD', pagu: Number(rupItem.pagu||0), kode_anggaran: randomKodeAnggaran(), ppk: APP_CONFIG.currentUserName, instansi: APP_CONFIG.defaultInstansi, status_paket:'Draft', status_realisasi:'Belum Ada Realisasi', can_delete:'YA', lokasi_provinsi:'Jawa Barat', lokasi_kab_kota:'Bogor (Kota)', detail_lokasi:'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah', isian_edit_selesai:'BELUM', pdn_realisasi:0, umk_realisasi:0, tanggal_paket_selesai:''
  };
}
async function loadPackageRows(){
  try{ const rows=await fetchSheetRows(APP_CONFIG.packageSheetGid); window.SPSE_APP_STATE.packageRows=rows.filter(row=>normalizeWhitespace(row.id_simulasi)); return window.SPSE_APP_STATE.packageRows; }catch(error){ window.SPSE_APP_STATE.packageRows=[]; return []; }
}
function findLoadedPackageById(id){ return (window.SPSE_APP_STATE.packageRows||[]).find(item=>normalizeWhitespace(item.id_simulasi)===normalizeWhitespace(id))||null; }
function buildApiUrl(params){ const url=new URL(APP_CONFIG.apiUrl); Object.entries(params||{}).forEach(([k,v])=>url.searchParams.set(k,v)); return url.toString(); }
async function callApi(action, payload={}){
  if(!APP_CONFIG.apiUrl) throw new Error('API_URL_EMPTY');
  const res = await fetch(APP_CONFIG.apiUrl, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({action, ...payload}) });
  const json = await res.json();
  if(!json.success) throw new Error(json.message || 'Request API gagal');
  return json;
}
async function savePackageToSheet(pkg){ return callApi('savePackage',{data:{...pkg,updated_at:new Date().toISOString()}}); }
async function deletePackageFromSheet(idSimulasi){ return callApi('deletePackage',{id_simulasi:idSimulasi}); }
async function getRealisasiRows(idSimulasi){ const json = await callApi('getRealisasi',{id_simulasi:idSimulasi}); return json.rows || []; }
async function saveRealisasiRow(data){ const json = await callApi('saveRealisasi',{data}); return json.row || data; }
async function deleteRealisasiRow(idRealisasi){ return callApi('deleteRealisasi',{id_realisasi:idRealisasi}); }
async function getProviderRows(idRealisasi){ const json = await callApi('getProviders',{id_realisasi:idRealisasi}); return json.rows || []; }
async function saveProviderRow(data){ const json = await callApi('saveProvider',{data}); return json.row || data; }
async function deleteProviderRow(idPenyedia){ return callApi('deleteProvider',{id_penyedia:idPenyedia}); }
async function getDocumentRows(idRealisasi){ const json = await callApi('getDocuments',{id_realisasi:idRealisasi}); return json.rows || []; }
async function uploadDocumentRow(data){ const json = await callApi('saveDocument',{data}); return json.row || data; }
function parseRupiahInput(text){
  const clean = String(text || '').replace(/\s+/g,'').replace(/Rp\.?/gi,'');
  if(!clean) return 0;
  const normalized = clean.replace(/\./g,'').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}
function formatRupiahInput(num){
  const n = Number(num || 0);
  return n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function compareDateToToday(dmy){
  const d = parseDateDMY(dmy); if(!d) return null; d.setHours(0,0,0,0);
  const today = todayAtZero();
  if(d.getTime() <= today.getTime()) return 'selesai';
  return 'berjalan';
}
function fileToDataPayload(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const parts = result.split(',');
      resolve({ filename:file.name, mime_type:file.type || 'application/octet-stream', base64: parts[1] || '' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
