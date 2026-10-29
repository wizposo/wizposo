// Sinkronisasi ke Google Drive (lewat Apps Script "WIZ Drive Connector").
// Prinsip: D1 tetap database utama yang cepat. Drive menerima salinan di latar belakang
// (cron tiap 15 menit + sesudah aktivitas admin), jadi donatur tidak pernah menunggu Google.
//
// Banyak Drive = gudang yang terus bertambah:
// - Hanya satu Drive "aktif" yang ditulisi. Drive "penuh" (>=90%) dan "arsip" tetap DIBACA.
// - Setiap file yang tersalin dicatat di media_sync (Drive mana + ID file Google), jadi file lama
//   bisa diambil kembali kapan saja dari Drive mana pun dan ditampilkan di aplikasi.
// - File privat lama (bukti, foto lokasi, slip, surat) dikeluarkan dari D1 setelah aman di Drive
//   agar D1 tetap ringan; saat dibuka, aplikasi mengambilnya dari Drive yang menyimpannya.
// - Drive yang "dilepas" tidak dihapus bila masih menyimpan file; statusnya menjadi "arsip".
import { randomId } from "./util.js";

export const BATAS_PERSEN = 90;
const TZ = "+8 hours";
const toDate = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(String(s)) ? String(s) : String(s).replace(" ", "T") + "Z");
const yearOf = (s) => new Date(toDate(s).getTime() + 8 * 3600e3).getUTCFullYear();
const telp = (wa) => (wa ? "'+" + wa : "");
const peta = (lat, lng) => (lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "");
const wita = (s) => (s ? new Date(toDate(s).getTime() + 8 * 3600e3).toISOString().slice(0, 19).replace("T", " ") : "");

export async function callDrive(drive, action, payload = {}, timeoutMs = 25000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(drive.url, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...payload, action, secret: drive.secret }), redirect: "follow", signal: ctl.signal });
    const txt = await res.text(); let data;
    try { data = JSON.parse(txt); } catch { throw new Error(res.status >= 400 ? `Google menolak (HTTP ${res.status}). Pastikan akses Web app "Anyone".` : "Balasan Apps Script tidak dikenali. Pastikan URL berakhiran /exec."); }
    if (!data.ok) throw new Error(data.error || "Apps Script gagal.");
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Google Drive tidak merespons (lebih dari 25 detik).");
    throw e;
  } finally { clearTimeout(t); }
}

/* ---------- Kolom spreadsheet ---------- */
const H = {
  donasi: ["No transaksi", "Dibuat (WITA)", "Lunas (WITA)", "Status", "Program", "Jenis dana", "Nominal", "Kode unik", "Total", "Metode", "Kanal", "Sapaan", "Nama", "Anonim", "WhatsApp", "Fundraiser", "Kotak", "Pundi", "Petugas", "Doa", "Catatan", "Disalin (WITA)"],
  donatur: ["ID", "Nama", "Sapaan", "WhatsApp", "Email", "Alamat", "Kelurahan", "Kecamatan", "Pekerjaan", "Kategori", "Catatan", "Terdaftar (WITA)"],
  pundi: ["ID", "Kode", "Nama", "WhatsApp", "Pekerjaan", "Alamat rumah", "Alamat kantor", "Kelurahan", "Kecamatan", "Patokan", "Jumlah kaleng", "Jadwal jemput (tgl)", "Status", "PJ / petugas",
    "Latitude", "Longitude", "Akurasi (m)", "Peta", "Tgl persetujuan", "Didaftar oleh", "Terdaftar (WITA)"],
  kotak: ["Kode", "Lokasi", "Jenis tempat", "Alamat", "Kelurahan", "Kecamatan", "Patokan", "Pemilik", "WA pemilik", "PJ", "Jadwal jemput (tgl)", "Status", "Latitude", "Longitude", "Peta", "Dibuat (WITA)"],
  slip: ["No. slip", "Tanggal", "Nama", "Alamat", "Kab./Kota", "Provinsi", "Telp./HP", "Pekerjaan", "Dana Zakat", "Pundi Sedekah", "Dana Infaq", "Lainnya", "Keterangan lainnya", "Jumlah",
    "Cara bayar", "Sumber", "Kode titik", "Petugas", "Status", "WA", "Dicatat (WITA)"],
  amplop: ["Kode", "Periode", "Relawan", "Status", "Penerima", "WhatsApp", "Alamat", "Kelurahan", "Kecamatan", "Latitude", "Longitude", "Peta", "Dibagikan (WITA)", "Kembali (WITA)", "Nominal", "No. slip"],
  fundraiser: ["Kode", "Nama", "WhatsApp", "Kota", "Status", "Bergabung (WITA)"],
};

/* ---------- Antrean ---------- */
export async function enqueue(env, entity, ref) {
  if (ref == null) return;
  try { await env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity, ref) VALUES(?,?)").bind(entity, String(ref)).run(); } catch {}
}

async function getDrives(env) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key='drives'").first();
  try { return JSON.parse(r?.value || "[]"); } catch { return []; }
}
export async function saveDrives(env, drives) {
  await env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('drives',?)").bind(JSON.stringify(drives)).run();
}
const setKey = (env, k, v) => env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)").bind(k, JSON.stringify(v)).run();
const getKey = async (env, k, d = null) => { const r = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(k).first(); try { return r ? JSON.parse(r.value) : d; } catch { return d; } };

export const VERSI_KONEKTOR = 2; // versi Code.gs yang punya perintah "get" (ambil file kembali)
const fileIdOf = (row) => row?.gfile || (String(row?.file_url || "").match(/\/d\/([\w-]{20,})/) || [])[1] || null;

/* ---------- Ambil kembali file dari Drive mana pun ---------- */
export async function fetchFile(env, mediaId) {
  const row = await env.DB.prepare("SELECT * FROM media_sync WHERE media_id=?").bind(mediaId).first();
  return fetchDriveFile(env, row?.drive_id, fileIdOf(row));
}
export async function fetchDriveFile(env, driveId, gfile) {
  if (!driveId || !gfile) return null;
  const d = (await getDrives(env)).find((x) => x.id === driveId);
  if (!d) return null;
  const r = await callDrive(d, "get", { id: gfile }, 30000);
  return { mime: r.mime, data: r.data, name: r.name };
}

/* ---------- Tambah Drive baru ---------- */
export async function addDrive(env, cabang, url, secret) {
  url = String(url || "").trim(); secret = String(secret || "").trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) && !url.startsWith("http://localhost")) throw new Error("URL harus Web app Apps Script yang berakhiran /exec.");
  if (secret.length < 8) throw new Error("Kode rahasia minimal 8 karakter.");
  const drive = { id: randomId(8), url, secret };
  const info = await callDrive(drive, "ping");
  const drives = await getDrives(env);
  // Drive yang sama dihubungkan ulang: cukup perbarui kode rahasia & info konektor, data dan statusnya tetap.
  const lama = drives.find((d) => d.url === url);
  if (lama) {
    Object.assign(lama, { secret, email: info.email || lama.email, used: info.used, limit: info.limit, pct: info.pct, versi: info.versi || 1, checked_at: new Date().toISOString() });
    await saveDrives(env, drives); await setKey(env, "sync_error", null);
    return { ...lama, diperbarui: true };
  }
  const setup = await callDrive(drive, "setup", { cabang });
  const aktif = drives.find((d) => d.status === "aktif");
  Object.assign(drive, { email: info.email, used: info.used, limit: info.limit, pct: info.pct, root: setup.root, folders: setup.folders, added_at: new Date().toISOString(),
    versi: info.versi || 1, status: info.pct >= BATAS_PERSEN ? "penuh" : aktif ? "cadangan" : "aktif" });
  drives.push(drive); await saveDrives(env, drives);
  if (drive.status === "aktif") { await setKey(env, "drive_alert", null); await seedAll(env); }
  return drive;
}
// Saat Drive aktif pertama kali dipasang, antrekan semua data agar tersalin lengkap
export async function seedAll(env) {
  await env.DB.batch([
    // Transaksi tahun berjalan saja; tahun sebelumnya sudah ada di Drive lama
    env.DB.prepare(`INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'donasi', id FROM donations WHERE strftime('%Y', datetime(created_at,'${TZ}'))=strftime('%Y', datetime('now','${TZ}'))`),
    env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'donatur', id FROM donors"),
    env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'pundi', id FROM pundi"),
    env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'kotak', kode FROM kotak"),
    env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'fundraiser', kode FROM fundraisers"),
    env.DB.prepare(`INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'slip', no FROM slips WHERE substr(tanggal,1,4)=strftime('%Y', datetime('now','${TZ}'))`),
    env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'amplop', kode FROM amplop"),
  ]);
}

/* ---------- Status untuk dashboard ---------- */
export async function driveStatus(env) {
  const drives = await getDrives(env);
  const q = await env.DB.prepare("SELECT COUNT(*) n FROM sync_queue").first();
  const m = await env.DB.prepare("SELECT COUNT(*) n FROM media WHERE COALESCE(kind,'')!='ttd' AND data!='' AND id NOT IN (SELECT media_id FROM media_sync)").first();
  const per = (await env.DB.prepare("SELECT drive_id, COUNT(*) n, COALESCE(SUM(ukuran),0) bytes FROM media_sync WHERE drive_id!='lewat' GROUP BY drive_id").all()).results || [];
  const bk = (await env.DB.prepare("SELECT drive_id, COUNT(*) n, MAX(at) terakhir FROM backups GROUP BY drive_id").all()).results || [];
  const d1 = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(LENGTH(data)),0) bytes, SUM(data='') di_drive FROM media").first();
  return { drives: drives.map(({ secret, ...d }) => ({ ...d, files: per.find((x) => x.drive_id === d.id)?.n || 0, file_bytes: per.find((x) => x.drive_id === d.id)?.bytes || 0,
      backups: bk.find((x) => x.drive_id === d.id)?.n || 0, perlu_update: (d.versi || 1) < VERSI_KONEKTOR })),
    antrean: q.n, media_antre: m.n, last_sync: await getKey(env, "last_sync"), last_backup: await getKey(env, "last_backup"),
    last_error: await getKey(env, "sync_error"), alert: await getKey(env, "drive_alert"), batas: BATAS_PERSEN, versi_konektor: VERSI_KONEKTOR,
    d1_media: { n: d1.n, bytes: d1.bytes, di_drive: d1.di_drive || 0 } };
}

/* ---------- Proses sinkron ---------- */
export async function runSync(env, opts = {}) {
  const now = Date.now();
  const lock = await getKey(env, "sync_lock", 0);
  if (!opts.force && lock && now - lock < 4 * 60e3) return { skipped: "sedang berjalan" };
  await setKey(env, "sync_lock", now);
  const stat = { donasi: 0, induk: 0, file: 0, backup: false };
  try {
    let drives = await getDrives(env);
    let drive = drives.find((d) => d.status === "aktif");
    if (!drive) { await setKey(env, "drive_alert", drives.length ? "penuh" : "belum"); return { skipped: "belum ada Drive aktif" }; }
    const cfg = await env.DB.prepare("SELECT value FROM settings WHERE key='cabang'").first();
    const cabang = cfg ? JSON.parse(cfg.value) : "";

    // 1. Data (antrean perubahan)
    const items = (await env.DB.prepare("SELECT entity, ref FROM sync_queue ORDER BY rowid LIMIT 500").all()).results || [];
    const by = {}; items.forEach((i) => (by[i.entity] ||= []).push(i.ref));
    const done = [];
    const send = async (file, sheet, header, rows, refs, entity) => {
      if (!rows.length) return;
      for (let i = 0; i < rows.length; i += 200) await callDrive(drive, "upsert", { cabang, file, sheet, header, rows: rows.slice(i, i + 200) });
      refs.forEach((r) => done.push([entity, r]));
    };
    if (by.donasi?.length) {
      const ph = by.donasi.map(() => "?").join(",");
      const rows = (await env.DB.prepare(`SELECT d.*, c.judul, f.nama fr FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id LEFT JOIN fundraisers f ON f.id=d.fundraiser_id WHERE d.id IN (${ph})`).bind(...by.donasi).all()).results || [];
      const perYear = {};
      rows.forEach((d) => (perYear[yearOf(d.created_at)] ||= []).push(d));
      const stamp = wita(new Date().toISOString());
      for (const [y, list] of Object.entries(perYear)) {
        await send(`Transaksi ${y}`, "Donasi", H.donasi, list.map((d) => [d.id, wita(d.created_at), wita(d.paid_at), d.status, d.judul, d.jenis_dana, d.nominal, d.kode_unik, d.total, d.metode, d.kanal,
          d.sapaan || "", d.nama || "", d.anonim ? "ya" : "", telp(d.wa), d.fr || "", d.kotak_kode || "", d.pundi_kode || "", d.petugas || "", d.doa || "", d.catatan || "", stamp]), list.map((d) => d.id), "donasi");
        stat.donasi += list.length;
      }
      const found = new Set(rows.map((d) => d.id)); by.donasi.filter((r) => !found.has(r)).forEach((r) => done.push(["donasi", r]));
    }
    const induk = async (entity, sql, sheet, map) => {
      if (!by[entity]?.length) return;
      const ph = by[entity].map(() => "?").join(",");
      const rows = (await env.DB.prepare(sql.replace("(?)", `(${ph})`)).bind(...by[entity]).all()).results || [];
      await send("Data Induk", sheet, H[entity], rows.map(map), by[entity], entity);
      stat.induk += rows.length;
    };
    await induk("donatur", "SELECT * FROM donors WHERE id IN (?)", "Donatur", (o) => [o.id, o.nama || "", o.sapaan || "", telp(o.wa), o.email || "", o.alamat || "", o.kelurahan || "", o.kecamatan || "", o.pekerjaan || "", o.kategori || "", o.catatan || "", wita(o.created_at)]);
    await induk("pundi", "SELECT * FROM pundi WHERE id IN (?)", "Pundi Sedekah", (p) => [p.id, p.kode || "", p.nama, telp(p.wa), p.pekerjaan || "", p.alamat || "", p.alamat_kantor || "", p.kelurahan || "", p.kecamatan || "",
      p.patokan || "", p.jumlah, p.jadwal || "", p.status, p.petugas || "", p.lat ?? "", p.lng ?? "", p.akurasi ?? "", peta(p.lat, p.lng), p.tgl_setuju || "", p.didaftar_oleh || "", wita(p.created_at)]);
    await induk("kotak", "SELECT * FROM kotak WHERE kode IN (?)", "Kotak Amal", (k) => [k.kode, k.nama_lokasi, k.jenis_tempat || "", k.alamat || "", k.kelurahan || "", k.kecamatan || "", k.patokan || "", k.pemilik || "",
      telp(k.wa_pemilik), k.pj || "", k.jadwal || "", k.status, k.lat ?? "", k.lng ?? "", peta(k.lat, k.lng), wita(k.created_at)]);
    await induk("amplop", "SELECT m.*, a.nama relawan FROM amplop m LEFT JOIN admins a ON a.id=m.relawan_id WHERE m.kode IN (?)", "Amplop Ramadhan", (m) => [m.kode, m.periode, m.relawan || "", m.status, m.nama || "",
      telp(m.wa), m.alamat || "", m.kelurahan || "", m.kecamatan || "", m.lat ?? "", m.lng ?? "", peta(m.lat, m.lng), wita(m.dibagikan_at), wita(m.kembali_at), m.nominal || "", m.slip_no || ""]);
    if (by.slip?.length) {
      const ph = by.slip.map(() => "?").join(",");
      const rows = (await env.DB.prepare(`SELECT * FROM slips WHERE no IN (${ph})`).bind(...by.slip).all()).results || [];
      const perYear = {}; rows.forEach((x) => (perYear[x.tanggal.slice(0, 4)] ||= []).push(x));
      for (const [y, list] of Object.entries(perYear)) {
        await send(`Transaksi ${y}`, "Slip Setoran", H.slip, list.map((x) => {
          const r = JSON.parse(x.rincian || "[]"), v = (k) => r.filter((i) => i.k === k).reduce((a, i) => a + i.nominal, 0) || "";
          return [x.no, x.tanggal, x.nama, x.alamat || "", x.kab || "", x.provinsi || "", telp(x.wa), x.pekerjaan || "", v("zakat"), v("pundi"), v("infaq"), v("lain"), r.filter((i) => i.k === "lain").map((i) => i.label).join(", "),
            x.total, x.cara + (x.cara_lain ? ": " + x.cara_lain : ""), x.sumber, x.sumber_kode || "", x.petugas || "", x.batal ? "BATAL" : "sah", x.wa_status || "", wita(x.created_at)];
        }), list.map((x) => x.no), "slip");
        stat.induk += list.length;
      }
      const found = new Set(rows.map((x) => x.no)); by.slip.filter((r) => !found.has(r)).forEach((r) => done.push(["slip", r]));
    }
    await induk("fundraiser", "SELECT * FROM fundraisers WHERE kode IN (?)", "Fundraiser", (f) => [f.kode, f.nama, telp(f.wa), f.kota || "", f.status, wita(f.created_at)]);
    if (done.length) await env.DB.batch(done.map(([e, r]) => env.DB.prepare("DELETE FROM sync_queue WHERE entity=? AND ref=?").bind(e, r)));

    // 2. File penting (bukti transfer & foto dokumentasi) — 8 file per putaran agar ringan
    // Tanda tangan tidak diunggah terpisah (sudah tergambar di slip/surat)
    await env.DB.prepare("INSERT OR IGNORE INTO media_sync(media_id, drive_id) SELECT id, 'lewat' FROM media WHERE kind='ttd' AND id NOT IN (SELECT media_id FROM media_sync)").run();
    const media = (await env.DB.prepare("SELECT id, mime, data, private, kind, created_at FROM media WHERE id NOT IN (SELECT media_id FROM media_sync) AND data!='' ORDER BY id LIMIT 8").all()).results || [];
    const clean = (t) => String(t || "").replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
    for (const m of media) {
      const ext = m.mime.split("/")[1].replace("jpeg", "jpg");
      let folder = m.private ? "bukti" : "dok", name = `${m.private ? "bukti" : "foto"}-${m.id}.${ext}`;
      if (m.kind === "slip") { const x = await env.DB.prepare("SELECT no, nama FROM slips WHERE png_id=?").bind(m.id).first(); folder = "slip"; name = `Slip ${x?.no || m.id} - ${clean(x?.nama)}.${ext}`; }
      else if (m.kind === "surat") { const x = await env.DB.prepare("SELECT kode, nama FROM pundi WHERE surat_png=?").bind(m.id).first(); folder = "surat"; name = `Surat persetujuan ${x?.kode || m.id} - ${clean(x?.nama)}.${ext}`; }
      else if (m.kind === "foto") { folder = "foto"; name = `foto-lokasi-${m.id}.${ext}`; }
      const r = await callDrive(drive, "upload", { cabang, folder, year: yearOf(m.created_at), name, mime: m.mime, data: m.data });
      await env.DB.prepare("INSERT OR REPLACE INTO media_sync(media_id, drive_id, file_url, gfile, ukuran, nama) VALUES(?,?,?,?,?,?)").bind(m.id, drive.id, r.url, r.id || null, Math.round(m.data.length * 0.75), name).run();
      stat.file++;
    }
    // File privat yang sudah 30 hari aman di Drive dikeluarkan dari D1 agar database tetap ringan.
    // Saat dibuka lagi, aplikasi mengambilnya dari Drive yang menyimpannya (lihat fetchFile).
    // Gambar publik (sampul program, foto berita) tetap di D1 supaya halaman donatur selalu cepat.
    await env.DB.prepare(`UPDATE media SET data='' WHERE private=1 AND COALESCE(kind,'')!='ttd' AND data!='' AND created_at < datetime('now','-30 days')
      AND id IN (SELECT media_id FROM media_sync WHERE drive_id!='lewat' AND (gfile IS NOT NULL OR file_url LIKE '%/d/%'))`).run();

    // 3. Cadangan lengkap sekali sehari
    const lastB = await getKey(env, "last_backup");
    if (opts.backup || !lastB || now - new Date(lastB.at).getTime() > 23 * 3600e3) {
      const dump = {};
      for (const t of ["campaigns", "campaign_updates", "articles", "donors", "donations", "fundraisers", "pundi", "kotak", "slips", "amplop", "admins"]) {
        const rows = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results || [];
        dump[t] = t === "admins" ? rows.map(({ pass_hash, ...a }) => a) : t === "fundraisers" ? rows.map(({ pin_hash, ...f }) => f) : rows;
      }
      const name = "cadangan-" + wita(new Date().toISOString()).replace(/[: ]/g, "-");
      const json = JSON.stringify({ dibuat: new Date().toISOString(), cabang, versi: 2, data: dump });
      const r = await callDrive(drive, "backup", { cabang, name, json }, 60000);
      const at = new Date().toISOString();
      await env.DB.prepare("INSERT INTO backups(drive_id, at, nama, gfile, url, size) VALUES(?,?,?,?,?,?)").bind(drive.id, at, name, r.id || null, r.url, r.size || 0).run();
      await setKey(env, "last_backup", { at, url: r.url, size: r.size, drive: drive.email });
      stat.backup = true;
      // Salinan kedua di Drive cadangan (bila ada) agar cadangan tidak hanya di satu akun
      const mirror = (await getDrives(env)).find((d) => d.status === "cadangan" && d.id !== drive.id);
      if (mirror) {
        try { const r2 = await callDrive(mirror, "backup", { cabang, name, json }, 60000);
          await env.DB.prepare("INSERT INTO backups(drive_id, at, nama, gfile, url, size) VALUES(?,?,?,?,?,?)").bind(mirror.id, at, name, r2.id || null, r2.url, r2.size || 0).run();
          stat.backup_cermin = mirror.email; } catch (e) { stat.backup_cermin_gagal = String(e.message || e); }
      }
    }

    // 4. Cek kuota; pindah otomatis ke Drive cadangan bila mencapai batas
    const info = await callDrive(drive, "ping");
    drives = await getDrives(env);
    const me = drives.find((d) => d.id === drive.id);
    Object.assign(me, { used: info.used, limit: info.limit, pct: info.pct, versi: info.versi || 1, checked_at: new Date().toISOString() });
    let pindah = null;
    if (info.pct >= BATAS_PERSEN) {
      me.status = "penuh"; me.full_at = new Date().toISOString();
      const next = drives.find((d) => d.status === "cadangan");
      if (next) { next.status = "aktif"; pindah = next; }
    }
    await saveDrives(env, drives);
    if (me.status === "penuh") {
      await setKey(env, "drive_alert", pindah ? null : "penuh");
      if (pindah) { const st = await callDrive(pindah, "setup", { cabang }); pindah.root = st.root; pindah.folders = st.folders; await saveDrives(env, drives); await seedAll(env); }
      stat.penuh = { email: me.email, pct: info.pct, pindah_ke: pindah?.email || null };
    } else await setKey(env, "drive_alert", null);
    await setKey(env, "last_sync", { at: new Date().toISOString(), ...stat, sisa: (await env.DB.prepare("SELECT COUNT(*) n FROM sync_queue").first()).n });
    await setKey(env, "sync_error", null);
    return stat;
  } catch (e) {
    await setKey(env, "sync_error", { at: new Date().toISOString(), pesan: String(e.message || e) });
    return { error: String(e.message || e) };
  } finally {
    await setKey(env, "sync_lock", 0);
  }
}
