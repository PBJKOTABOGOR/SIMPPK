const APP_CONFIG = {
  spreadsheetId: '1ssQdLVKLPPj0dI6a_7iUwxm3L2IiPOZodIg1uE20BM0',
  rupMasterGid: '2083920669',
  defaultInstansi: 'Kota Bogor',
  defaultTahun: '2026'
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

function makeCaptcha(len = 6){
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for(let i=0;i<len;i++) result += chars[Math.floor(Math.random()*chars.length)];
  return result;
}

function formatRupiahShort(value){
  const num = Number(value || 0);
  if(num >= 1000000000) return 'Rp ' + (num / 1000000000).toLocaleString('id-ID', {maximumFractionDigits:1}) + ' M';
  if(num >= 1000000) return 'Rp ' + (num / 1000000).toLocaleString('id-ID', {maximumFractionDigits:1}) + ' Jt';
  if(num >= 1000) return 'Rp ' + (num / 1000).toLocaleString('id-ID', {maximumFractionDigits:1}) + ' Rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
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
    pagu: item.pagu || 0,
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
