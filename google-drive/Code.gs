/**
 * WIZ Drive Connector
 * Menghubungkan aplikasi WIZ Cabang dengan Google Drive akun ini.
 *
 * Yang dikerjakan skrip ini (otomatis):
 *  - Membuat folder induk dan subfolder: Database, Bukti Transfer, Slip Setoran, Dokumentasi, Cadangan, Surat Persetujuan, Foto Lokasi
 *  - Membuat spreadsheet transaksi baru setiap tahun ("Transaksi 2026", "Transaksi 2027", …)
 *    dan satu spreadsheet "Data Induk" (donatur, pundi, kotak amal, fundraiser)
 *  - Menyimpan file penting (bukti transfer, foto dokumentasi, slip) ke folder per tahun
 *  - Menyimpan cadangan lengkap harian (30 cadangan terakhir)
 *  - Melaporkan pemakaian kuota Drive
 *  - Mengambil kembali file yang pernah disimpan (hanya file di dalam folder WIZ), agar
 *    aplikasi bisa menampilkan data lama walau sudah dipindah ke Drive lain
 *
 * Versi konektor: 2. Bila memperbarui dari versi lama: tempel kode ini, pastikan KODE_RAHASIA
 * sama seperti sebelumnya, Simpan, lalu Terapkan → Kelola deployment → Edit → Versi baru → Terapkan
 * (alamat /exec tetap sama).
 *
 * CARA PASANG: lihat PANDUAN-DRIVE.md. Langkah singkat:
 *  1. Ganti KODE_RAHASIA di bawah dengan kode buatan Anda sendiri (minimal 16 karakter).
 *  2. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.
 *  3. Salin Web app URL, tempel bersama kode rahasia di dashboard WIZ → Penyimpanan.
 */
const KODE_RAHASIA = "GANTI-DENGAN-KODE-RAHASIA-ANDA";
const SIMPAN_CADANGAN = 30;
const VERSI = 2;

/* ================= Pintu masuk ================= */
function doGet() {
  return out_({ ok: true, info: "WIZ Drive Connector aktif. Hubungkan lewat dashboard WIZ." });
}
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (KODE_RAHASIA.indexOf("GANTI-") === 0) return out_({ ok: false, error: "Kode rahasia di Apps Script belum diganti." });
    if (req.secret !== KODE_RAHASIA) return out_({ ok: false, error: "Kode rahasia tidak cocok." });
    const fn = ACTIONS[req.action];
    if (!fn) return out_({ ok: false, error: "Perintah tidak dikenal: " + req.action });
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try { return out_(Object.assign({ ok: true }, fn(req))); }
    finally { lock.releaseLock(); }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ================= Folder & file ================= */
const SUB = { db: "01 Database", bukti: "02 Bukti Transfer", slip: "03 Slip Setoran", dok: "04 Dokumentasi", cadangan: "05 Cadangan", surat: "06 Surat Persetujuan", foto: "07 Foto Lokasi" };
const props_ = () => PropertiesService.getScriptProperties();

function root_(cabang) {
  const p = props_(); const id = p.getProperty("ROOT_ID");
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const name = "WIZ Cabang " + (cabang || "") + " - Database";
  const it = DriveApp.getFoldersByName(name);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  p.setProperty("ROOT_ID", f.getId());
  return f;
}
function child_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function sub_(key, cabang, year) {
  const f = child_(root_(cabang), SUB[key]);
  return year ? child_(f, String(year)) : f;
}
function sheetFile_(cabang, name) {
  const p = props_(); const k = "SS_" + name; const id = p.getProperty(k);
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return SpreadsheetApp.openById(id); } catch (e) {} }
  const folder = sub_("db", cabang);
  const full = "WIZ " + (cabang || "") + " - " + name;
  const it = folder.getFilesByName(full);
  let ss;
  if (it.hasNext()) ss = SpreadsheetApp.openById(it.next().getId());
  else { ss = SpreadsheetApp.create(full); DriveApp.getFileById(ss.getId()).moveTo(folder); }
  p.setProperty(k, ss.getId());
  return ss;
}
function sheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground("#E6F2EF");
    sh.setFrozenRows(1);
    const blank = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1");
    if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  }
  return sh;
}

/* ================= Perintah ================= */
const ACTIONS = {
  // Info akun & kuota
  ping: function (req) {
    const used = DriveApp.getStorageUsed(), limit = DriveApp.getStorageLimit();
    return { email: Session.getEffectiveUser().getEmail(), used: used, limit: limit, pct: limit ? Math.round(used / limit * 1000) / 10 : 0, versi: VERSI };
  },
  // Siapkan folder
  setup: function (req) {
    const r = root_(req.cabang); const urls = {};
    Object.keys(SUB).forEach(function (k) { urls[k] = child_(r, SUB[k]).getUrl(); });
    return { root: r.getUrl(), folders: urls };
  },
  // Tambah / perbarui baris. req: {cabang, file, sheet, header, rows}
  // file: "Transaksi 2026" atau "Data Induk". Kolom pertama = kunci unik.
  upsert: function (req) {
    const ss = sheetFile_(req.cabang, req.file);
    const sh = sheet_(ss, req.sheet, req.header);
    const n = req.header.length, last = sh.getLastRow();
    const keys = last > 1 ? sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return r[0]; }) : [];
    const idx = {}; keys.forEach(function (k, i) { idx[k] = i + 2; });
    const append = []; let updated = 0;
    req.rows.forEach(function (row) {
      const vals = row.slice(0, n); while (vals.length < n) vals.push("");
      const at = idx[String(vals[0])];
      if (at) { sh.getRange(at, 1, 1, n).setValues([vals]); updated++; }
      else { idx[String(vals[0])] = -1; append.push(vals); }
    });
    if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, n).setValues(append);
    return { url: ss.getUrl(), appended: append.length, updated: updated };
  },
  // Simpan file. req: {cabang, folder: bukti|slip|dok, year, name, mime, data(base64)}
  upload: function (req) {
    const folder = sub_(req.folder in SUB ? req.folder : "dok", req.cabang, req.year);
    const it = folder.getFilesByName(req.name);
    if (it.hasNext()) { const f = it.next(); return { id: f.getId(), url: f.getUrl(), existed: true }; }
    const blob = Utilities.newBlob(Utilities.base64Decode(req.data), req.mime, req.name);
    const f = folder.createFile(blob);
    return { id: f.getId(), url: f.getUrl() };
  },
  // Cadangan lengkap harian (dikompres). req: {cabang, name, json}
  backup: function (req) {
    const folder = sub_("cadangan", req.cabang);
    const gz = Utilities.gzip(Utilities.newBlob(req.json, "application/json", req.name + ".json"), req.name + ".json.gz");
    const f = folder.createFile(gz);
    const files = []; const it = folder.getFiles();
    while (it.hasNext()) files.push(it.next());
    files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    files.slice(SIMPAN_CADANGAN).forEach(function (x) { x.setTrashed(true); });
    return { id: f.getId(), url: f.getUrl(), size: f.getSize() };
  },
  // Ambil kembali file (hanya yang berada di dalam folder WIZ). req: {id}
  get: function (req) {
    const f = DriveApp.getFileById(req.id);
    if (!dalamWiz_(f)) throw new Error("File di luar folder WIZ tidak boleh diambil.");
    if (f.getSize() > 35 * 1024 * 1024) throw new Error("File terlalu besar untuk diambil lewat aplikasi. Buka langsung dari Google Drive.");
    const b = f.getBlob();
    return { name: f.getName(), mime: b.getContentType(), size: f.getSize(), data: Utilities.base64Encode(b.getBytes()) };
  },
  // Tautan file-file penting
  links: function (req) {
    const p = props_(); const out = {};
    p.getKeys().forEach(function (k) { if (k.indexOf("SS_") === 0) { try { out[k.slice(3)] = SpreadsheetApp.openById(p.getProperty(k)).getUrl(); } catch (e) {} } });
    return { root: root_(req.cabang).getUrl(), sheets: out };
  },
};

// Pastikan file berada di bawah folder induk WIZ (maksimal 4 tingkat)
function dalamWiz_(file) {
  const rootId = props_().getProperty("ROOT_ID");
  if (!rootId) return false;
  let level = [file.getParents()];
  for (let depth = 0; depth < 4; depth++) {
    const next = [];
    for (const it of level) while (it.hasNext()) { const p = it.next(); if (p.getId() === rootId) return true; next.push(p.getParents()); }
    if (!next.length) return false;
    level = next;
  }
  return false;
}

/** Jalankan sekali dari editor (tombol Run) untuk memberi izin akses Drive & Sheets. */
function izinkanAkses() {
  Logger.log(JSON.stringify(ACTIONS.ping({})));
  Logger.log("Izin berhasil. Sekarang lakukan Deploy sebagai Web app.");
}
