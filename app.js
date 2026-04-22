const SPREADSHEET_ID = '1ssQdLVKLPPj0dI6a_7iUwxm3L2IiPOZodIg1uE20BM0';

const SHEET_PAKET = 'paket_pencatatan';
const SHEET_REALISASI = 'realisasi_pencatatan';
const SHEET_PENYEDIA = 'penyedia_pencatatan';
const SHEET_DOKUMEN = 'dokumen_realisasi';

const HEADERS_PAKET = [
  'id_simulasi',
  'created_at',
  'updated_at',
  'kode_rup',
  'nama_paket',
  'satker',
  'tahun',
  'metode_pemilihan',
  'sumber_dana',
  'pagu',
  'kode_anggaran',
  'ppk',
  'instansi',
  'status_paket',
  'status_realisasi',
  'can_delete',
  'lokasi_provinsi',
  'lokasi_kab_kota',
  'detail_lokasi',
  'isian_edit_selesai',
  'pdn_realisasi',
  'umk_realisasi',
  'tanggal_paket_selesai',
  'alasan_perubahan_tanggal',
  'uraian_pekerjaan',
  'jenis_pengadaan'
];

const HEADERS_REALISASI = [
  'id_realisasi',
  'id_simulasi',
  'bukti_pembayaran',
  'jenis_realisasi',
  'nama_dokumen',
  'nomor_dokumen',
  'nilai_realisasi',
  'tanggal_realisasi',
  'keterangan',
  'created_at',
  'updated_at'
];

const HEADERS_PENYEDIA = [
  'id_penyedia',
  'id_realisasi',
  'id_simulasi',
  'bentuk_usaha',
  'nama_penyedia',
  'npwp',
  'email',
  'telp',
  'provinsi',
  'kabupaten_kota',
  'alamat',
  'created_at',
  'updated_at'
];

const HEADERS_DOKUMEN = [
  'id_dokumen',
  'id_realisasi',
  'id_simulasi',
  'nama_file',
  'mime_type',
  'file_base64',
  'created_at',
  'updated_at'
];

function doGet(e) {
  try {
    ensureAllSheets_();

    const action = getParam_(e, 'action');
    if (!action) {
      return jsonOutput_({ ok: false, message: 'Parameter action wajib diisi.' });
    }

    switch (action) {
      case 'listPackages':
        return jsonOutput_({ ok: true, data: listPackages_() });

      case 'listRealisasi':
        return jsonOutput_({ ok: true, data: listRealisasi_(getParam_(e, 'id_simulasi')) });

      case 'listPenyedia':
        return jsonOutput_({ ok: true, data: listPenyedia_(getParam_(e, 'id_realisasi')) });

      case 'listDokumen':
        return jsonOutput_({ ok: true, data: listDokumen_(getParam_(e, 'id_realisasi')) });

      default:
        return jsonOutput_({ ok: false, message: 'Action tidak dikenali: ' + action });
    }
  } catch (err) {
    return jsonOutput_({ ok: false, message: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    ensureAllSheets_();

    const body = parsePostBody_(e);
    const action = String(body.action || '').trim();

    if (!action) {
      return jsonOutput_({ ok: false, message: 'Action wajib diisi pada body.' });
    }

    switch (action) {
      case 'savePackage':
        return jsonOutput_({ ok: true, data: savePackage_(body) });

      case 'deletePackage':
        return jsonOutput_({ ok: true, data: deletePackage_(body.id_simulasi) });

      case 'saveRealisasi':
        return jsonOutput_({ ok: true, data: saveRealisasi_(body) });

      case 'deleteRealisasi':
        return jsonOutput_({ ok: true, data: deleteRealisasi_(body.id_simulasi, body.id_realisasi) });

      case 'savePenyedia':
        return jsonOutput_({ ok: true, data: savePenyedia_(body) });

      case 'saveDokumen':
        return jsonOutput_({ ok: true, data: saveDokumen_(body) });

      default:
        return jsonOutput_({ ok: false, message: 'Action tidak dikenali: ' + action });
    }
  } catch (err) {
    return jsonOutput_({ ok: false, message: err.message || String(err) });
  }
}

/* =========================
   PAKET
========================= */

function listPackages_() {
  const sheet = getSheet_(SHEET_PAKET, HEADERS_PAKET);
  const rows = getAllRows_(sheet);

  rows.sort(function(a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return rows;
}

function savePackage_(data) {
  const sheet = getSheet_(SHEET_PAKET, HEADERS_PAKET);
  const headerMap = getHeaderMap_(sheet);

  let idSimulasi = String(data.id_simulasi || '').trim();
  const now = nowIso_();

  if (!idSimulasi) {
    idSimulasi = createId_('SIMPKT');
  }

  const existingRow = findRowByValue_(sheet, headerMap.id_simulasi, idSimulasi);
  const existing = existingRow ? getRowObject_(sheet, existingRow) : {};

  const statusPaketRaw = pickText_(data.status_paket, existing.status_paket || 'Draft');
  const statusPaket = statusPaketRaw || 'Draft';

  const statusRealisasiRaw = pickText_(data.status_realisasi, existing.status_realisasi || 'Belum Ada Realisasi');
  const statusRealisasi = statusRealisasiRaw || 'Belum Ada Realisasi';

  const canDelete = (statusPaket === 'Draft' && statusRealisasi !== 'Sudah Ada Realisasi') ? 'YA' : 'TIDAK';

  const payload = {
    id_simulasi: idSimulasi,
    created_at: existing.created_at || now,
    updated_at: now,
    kode_rup: pickText_(data.kode_rup, existing.kode_rup),
    nama_paket: pickText_(data.nama_paket, existing.nama_paket),
    satker: pickText_(data.satker, existing.satker),
    tahun: pickText_(data.tahun, existing.tahun),
    metode_pemilihan: pickText_(data.metode_pemilihan, existing.metode_pemilihan),
    sumber_dana: pickText_(data.sumber_dana, existing.sumber_dana || 'APBD') || 'APBD',
    pagu: pickNumber_(data.pagu, existing.pagu),
    kode_anggaran: pickText_(data.kode_anggaran, existing.kode_anggaran),
    ppk: pickText_(data.ppk, existing.ppk),
    instansi: pickText_(data.instansi, existing.instansi || 'Kota Bogor') || 'Kota Bogor',
    status_paket: statusPaket,
    status_realisasi: statusRealisasi,
    can_delete: canDelete,
    lokasi_provinsi: pickText_(data.lokasi_provinsi, existing.lokasi_provinsi || 'Jawa Barat') || 'Jawa Barat',
    lokasi_kab_kota: pickText_(data.lokasi_kab_kota, existing.lokasi_kab_kota || 'Bogor (Kota)') || 'Bogor (Kota)',
    detail_lokasi: pickText_(data.detail_lokasi, existing.detail_lokasi || 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah') || 'Jl. Ir. H. Djuanda No. 10, Kel. Pabaton, Kec. Bogor Tengah',
    isian_edit_selesai: pickText_(data.isian_edit_selesai, existing.isian_edit_selesai),
    pdn_realisasi: pickText_(data.pdn_realisasi, existing.pdn_realisasi || '0,00') || '0,00',
    umk_realisasi: pickText_(data.umk_realisasi, existing.umk_realisasi || '0,00') || '0,00',
    tanggal_paket_selesai: pickText_(data.tanggal_paket_selesai, existing.tanggal_paket_selesai),
    alasan_perubahan_tanggal: pickText_(data.alasan_perubahan_tanggal, existing.alasan_perubahan_tanggal),
    uraian_pekerjaan: pickText_(data.uraian_pekerjaan, existing.uraian_pekerjaan),
    jenis_pengadaan: pickText_(data.jenis_pengadaan, existing.jenis_pengadaan || 'Jasa Lainnya') || 'Jasa Lainnya'
  };

  if (existingRow) {
    writeRowByHeaderMap_(sheet, headerMap, existingRow, payload);
  } else {
    appendRowByHeaderMap_(sheet, headerMap, payload);
  }

  return payload;
}

function deletePackage_(idSimulasi) {
  idSimulasi = String(idSimulasi || '').trim();
  if (!idSimulasi) throw new Error('id_simulasi wajib diisi.');

  const sheet = getSheet_(SHEET_PAKET, HEADERS_PAKET);
  const headerMap = getHeaderMap_(sheet);
  const row = findRowByValue_(sheet, headerMap.id_simulasi, idSimulasi);

  if (!row) throw new Error('Paket tidak ditemukan.');

  const statusPaket = String(sheet.getRange(row, headerMap.status_paket).getValue() || '').trim();
  const statusRealisasi = String(sheet.getRange(row, headerMap.status_realisasi).getValue() || '').trim();

  if (statusPaket !== 'Draft') {
    throw new Error('Yang bisa dihapus hanya paket berstatus Draft.');
  }

  if (statusRealisasi === 'Sudah Ada Realisasi') {
    throw new Error('Paket sudah ada realisasi, tidak bisa dihapus.');
  }

  sheet.deleteRow(row);
  deleteChildRowsBySimulasi_(SHEET_REALISASI, HEADERS_REALISASI, idSimulasi);
  deleteChildRowsBySimulasi_(SHEET_PENYEDIA, HEADERS_PENYEDIA, idSimulasi);
  deleteChildRowsBySimulasi_(SHEET_DOKUMEN, HEADERS_DOKUMEN, idSimulasi);

  return { deleted: true, id_simulasi: idSimulasi };
}

/* =========================
   REALISASI
========================= */

function listRealisasi_(idSimulasi) {
  const sheet = getSheet_(SHEET_REALISASI, HEADERS_REALISASI);
  const rows = getAllRows_(sheet);
  const key = String(idSimulasi || '').trim();

  if (!key) return rows;
  return rows.filter(function(r) {
    return String(r.id_simulasi || '').trim() === key;
  });
}

function saveRealisasi_(data) {
  const idSimulasi = String(data.id_simulasi || '').trim();
  if (!idSimulasi) throw new Error('id_simulasi wajib diisi.');

  const paketSheet = getSheet_(SHEET_PAKET, HEADERS_PAKET);
  const paketHeaderMap = getHeaderMap_(paketSheet);
  const paketRow = findRowByValue_(paketSheet, paketHeaderMap.id_simulasi, idSimulasi);

  if (!paketRow) throw new Error('Paket tidak ditemukan.');

  const paket = getRowObject_(paketSheet, paketRow);
  if (String(paket.status_paket || '').trim() === 'Paket Sudah Selesai') {
    throw new Error('Paket sudah selesai, realisasi tidak bisa diubah lagi.');
  }

  const pagu = toNumber_(paket.pagu);

  const sheet = getSheet_(SHEET_REALISASI, HEADERS_REALISASI);
  const headerMap = getHeaderMap_(sheet);

  let idRealisasi = String(data.id_realisasi || '').trim();
  const existingRow = idRealisasi ? findRowByValue_(sheet, headerMap.id_realisasi, idRealisasi) : 0;
  const existing = existingRow ? getRowObject_(sheet, existingRow) : {};
  const now = nowIso_();

  if (!idRealisasi) {
    idRealisasi = createId_('SIMRLS');
  }

  const nilaiBaru = toNumber_(data.nilai_realisasi);
  if (nilaiBaru <= 0) throw new Error('Nilai realisasi tidak valid.');

  const semuaRealisasi = listRealisasi_(idSimulasi);
  const totalLain = semuaRealisasi.reduce(function(sum, row) {
    if (String(row.id_realisasi || '') === idRealisasi) return sum;
    return sum + toNumber_(row.nilai_realisasi);
  }, 0);

  if ((totalLain + nilaiBaru) > pagu) {
    throw new Error('Total Nilai Realisasi melebihi Pagu');
  }

  const payload = {
    id_realisasi: idRealisasi,
    id_simulasi: idSimulasi,
    bukti_pembayaran: pickText_(data.bukti_pembayaran, existing.bukti_pembayaran),
    jenis_realisasi: pickText_(data.jenis_realisasi, existing.jenis_realisasi),
    nama_dokumen: pickText_(data.nama_dokumen, existing.nama_dokumen),
    nomor_dokumen: pickText_(data.nomor_dokumen, existing.nomor_dokumen),
    nilai_realisasi: nilaiBaru,
    tanggal_realisasi: pickText_(data.tanggal_realisasi, existing.tanggal_realisasi),
    keterangan: pickText_(data.keterangan, existing.keterangan),
    created_at: existing.created_at || now,
    updated_at: now
  };

  if (!payload.jenis_realisasi) throw new Error('Jenis realisasi wajib diisi.');
  if (!payload.nama_dokumen) throw new Error('Nama dokumen wajib diisi.');
  if (!payload.tanggal_realisasi) throw new Error('Tanggal realisasi wajib diisi.');

  if (existingRow) {
    writeRowByHeaderMap_(sheet, headerMap, existingRow, payload);
  } else {
    appendRowByHeaderMap_(sheet, headerMap, payload);
  }

  paketSheet.getRange(paketRow, paketHeaderMap.status_realisasi).setValue('Sudah Ada Realisasi');
  paketSheet.getRange(paketRow, paketHeaderMap.can_delete).setValue('TIDAK');
  paketSheet.getRange(paketRow, paketHeaderMap.updated_at).setValue(now);

  return payload;
}

function deleteRealisasi_(idSimulasi, idRealisasi) {
  idSimulasi = String(idSimulasi || '').trim();
  idRealisasi = String(idRealisasi || '').trim();

  if (!idSimulasi) throw new Error('id_simulasi wajib diisi.');
  if (!idRealisasi) throw new Error('id_realisasi wajib diisi.');

  const paketSheet = getSheet_(SHEET_PAKET, HEADERS_PAKET);
  const paketHeaderMap = getHeaderMap_(paketSheet);
  const paketRow = findRowByValue_(paketSheet, paketHeaderMap.id_simulasi, idSimulasi);

  if (!paketRow) throw new Error('Paket tidak ditemukan.');

  const paket = getRowObject_(paketSheet, paketRow);
  if (String(paket.status_paket || '').trim() === 'Paket Sudah Selesai') {
    throw new Error('Paket sudah selesai, realisasi tidak bisa dihapus.');
  }

  const realSheet = getSheet_(SHEET_REALISASI, HEADERS_REALISASI);
  const realHeaderMap = getHeaderMap_(realSheet);
  const realRow = findRowByValue_(realSheet, realHeaderMap.id_realisasi, idRealisasi);

  if (!realRow) throw new Error('Realisasi tidak ditemukan.');

  realSheet.deleteRow(realRow);

  deleteChildRowsByRealisasi_(SHEET_PENYEDIA, HEADERS_PENYEDIA, idRealisasi);
  deleteChildRowsByRealisasi_(SHEET_DOKUMEN, HEADERS_DOKUMEN, idRealisasi);

  const sisa = listRealisasi_(idSimulasi);
  const now = nowIso_();

  if (sisa.length) {
    paketSheet.getRange(paketRow, paketHeaderMap.status_realisasi).setValue('Sudah Ada Realisasi');
    paketSheet.getRange(paketRow, paketHeaderMap.can_delete).setValue('TIDAK');
  } else {
    paketSheet.getRange(paketRow, paketHeaderMap.status_realisasi).setValue('Belum Ada Realisasi');
    const statusPaket = String(paket.status_paket || '').trim();
    paketSheet.getRange(paketRow, paketHeaderMap.can_delete).setValue(statusPaket === 'Draft' ? 'YA' : 'TIDAK');
  }

  paketSheet.getRange(paketRow, paketHeaderMap.updated_at).setValue(now);

  return { deleted: true, id_realisasi: idRealisasi, id_simulasi: idSimulasi };
}

/* =========================
   PENYEDIA
========================= */

function listPenyedia_(idRealisasi) {
  const sheet = getSheet_(SHEET_PENYEDIA, HEADERS_PENYEDIA);
  const rows = getAllRows_(sheet);
  const key = String(idRealisasi || '').trim();

  if (!key) return rows;
  return rows.filter(function(r) {
    return String(r.id_realisasi || '').trim() === key;
  });
}

function savePenyedia_(data) {
  const idRealisasi = String(data.id_realisasi || '').trim();
  const idSimulasi = String(data.id_simulasi || '').trim();

  if (!idRealisasi) throw new Error('id_realisasi wajib diisi.');
  if (!idSimulasi) throw new Error('id_simulasi wajib diisi.');
  if (!String(data.bentuk_usaha || '').trim()) throw new Error('Bentuk Usaha wajib diisi.');
  if (!String(data.nama_penyedia || '').trim()) throw new Error('Nama Penyedia wajib diisi.');
  if (!String(data.provinsi || '').trim()) throw new Error('Provinsi wajib diisi.');
  if (!String(data.kabupaten_kota || '').trim()) throw new Error('Kabupaten/Kota wajib diisi.');

  const sheet = getSheet_(SHEET_PENYEDIA, HEADERS_PENYEDIA);
  const headerMap = getHeaderMap_(sheet);
  const now = nowIso_();

  const payload = {
    id_penyedia: createId_('SIMPRV'),
    id_realisasi: idRealisasi,
    id_simulasi: idSimulasi,
    bentuk_usaha: toText_(data.bentuk_usaha),
    nama_penyedia: toText_(data.nama_penyedia),
    npwp: toText_(data.npwp),
    email: toText_(data.email),
    telp: toText_(data.telp),
    provinsi: toText_(data.provinsi),
    kabupaten_kota: toText_(data.kabupaten_kota),
    alamat: toText_(data.alamat),
    created_at: now,
    updated_at: now
  };

  appendRowByHeaderMap_(sheet, headerMap, payload);
  return payload;
}

/* =========================
   DOKUMEN
========================= */

function listDokumen_(idRealisasi) {
  const sheet = getSheet_(SHEET_DOKUMEN, HEADERS_DOKUMEN);
  const rows = getAllRows_(sheet);
  const key = String(idRealisasi || '').trim();

  if (!key) return rows;

  return rows
    .filter(function(r) {
      return String(r.id_realisasi || '').trim() === key;
    })
    .map(function(row) {
      return {
        id_dokumen: row.id_dokumen,
        id_realisasi: row.id_realisasi,
        id_simulasi: row.id_simulasi,
        nama_file: row.nama_file,
        mime_type: row.mime_type,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
}

function saveDokumen_(data) {
  const idRealisasi = String(data.id_realisasi || '').trim();
  const idSimulasi = String(data.id_simulasi || '').trim();
  const namaFile = String(data.nama_file || '').trim();
  const mimeType = String(data.mime_type || '').trim();
  const fileBase64 = String(data.file_base64 || '').trim();

  if (!idRealisasi) throw new Error('id_realisasi wajib diisi.');
  if (!idSimulasi) throw new Error('id_simulasi wajib diisi.');
  if (!namaFile) throw new Error('nama_file wajib diisi.');
  if (!mimeType) throw new Error('mime_type wajib diisi.');
  if (!fileBase64) throw new Error('file_base64 wajib diisi.');

  const sheet = getSheet_(SHEET_DOKUMEN, HEADERS_DOKUMEN);
  const headerMap = getHeaderMap_(sheet);
  const now = nowIso_();

  const payload = {
    id_dokumen: createId_('SIMDOC'),
    id_realisasi: idRealisasi,
    id_simulasi: idSimulasi,
    nama_file: namaFile,
    mime_type: mimeType,
    file_base64: fileBase64,
    created_at: now,
    updated_at: now
  };

  appendRowByHeaderMap_(sheet, headerMap, payload);

  return {
    id_dokumen: payload.id_dokumen,
    id_realisasi: payload.id_realisasi,
    id_simulasi: payload.id_simulasi,
    nama_file: payload.nama_file,
    mime_type: payload.mime_type,
    created_at: payload.created_at,
    updated_at: payload.updated_at
  };
}

/* =========================
   HELPERS
========================= */

function ensureAllSheets_() {
  getSheet_(SHEET_PAKET, HEADERS_PAKET);
  getSheet_(SHEET_REALISASI, HEADERS_REALISASI);
  getSheet_(SHEET_PENYEDIA, HEADERS_PENYEDIA);
  getSheet_(SHEET_DOKUMEN, HEADERS_DOKUMEN);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);

  if (!sheet) sheet = ss.insertSheet(name);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0];
  const currentNormalized = currentHeaders.map(normalizeHeader_);
  const expectedNormalized = headers.map(normalizeHeader_);

  let mismatch = false;
  for (var i = 0; i < expectedNormalized.length; i++) {
    if (currentNormalized[i] !== expectedNormalized[i]) {
      mismatch = true;
      break;
    }
  }

  if (mismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function(header, index) {
    map[normalizeHeader_(header)] = index + 1;
  });
  return map;
}

function getAllRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return data.map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[normalizeHeader_(header)] = row[index];
    });
    return obj;
  });
}

function getRowObject_(sheet, rowNumber) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
  const obj = {};

  headers.forEach(function(header, index) {
    obj[normalizeHeader_(header)] = row[index];
  });

  return obj;
}

function appendRowByHeaderMap_(sheet, headerMap, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function(header) {
    const key = normalizeHeader_(header);
    return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : '';
  });
  sheet.appendRow(row);
}

function writeRowByHeaderMap_(sheet, headerMap, rowNumber, obj) {
  Object.keys(obj).forEach(function(key) {
    if (headerMap[key]) {
      sheet.getRange(rowNumber, headerMap[key]).setValue(obj[key]);
    }
  });
}

function findRowByValue_(sheet, colIndex, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().flat();
  const idx = values.findIndex(function(v) {
    return String(v).trim() === String(value).trim();
  });

  return idx === -1 ? 0 : idx + 2;
}

function deleteChildRowsBySimulasi_(sheetName, headers, idSimulasi) {
  const sheet = getSheet_(sheetName, headers);
  const headerMap = getHeaderMap_(sheet);
  const rows = getAllRows_(sheet);

  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].id_simulasi || '').trim() === idSimulasi) {
      sheet.deleteRow(i + 2);
    }
  }
}

function deleteChildRowsByRealisasi_(sheetName, headers, idRealisasi) {
  const sheet = getSheet_(sheetName, headers);
  const rows = getAllRows_(sheet);

  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].id_realisasi || '').trim() === idRealisasi) {
      sheet.deleteRow(i + 2);
    }
  }
}

function createId_(prefix) {
  return prefix + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMddHHmmssSSS');
}

function nowIso_() {
  return new Date().toISOString();
}

function parsePostBody_(e) {
  const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  return JSON.parse(raw);
}

function getParam_(e, key) {
  return e && e.parameter ? e.parameter[key] : '';
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function toText_(value) {
  return value === undefined || value === null ? '' : String(value);
}

function toNumber_(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const clean = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

function pickText_(incoming, fallback) {
  if (incoming === undefined || incoming === null) return toText_(fallback);
  return toText_(incoming);
}

function pickNumber_(incoming, fallback) {
  if (incoming === undefined || incoming === null || incoming === '') return toNumber_(fallback);
  return toNumber_(incoming);
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
