// Uji gudang banyak Drive: file tetap bisa diambil dari Drive mana pun, Drive lama jadi arsip, cadangan & pemulihan.
import { gunzipSync } from "node:zlib";
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const buf = Buffer.from(await r.arrayBuffer()); let data; try { data = JSON.parse(buf.toString()); } catch { data = buf; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "", type: r.headers.get("content-type") };
};
const sql = async (q, args = []) => (await fetch(HOST + "/__sql", { method: "POST", body: JSON.stringify({ sql: q, args }) })).json();
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
const G = (acc) => HOST + "/__gas?acc=" + acc;

let r = await call("GET", "admin/status"); let adm;
if (r.data.needsSetup) adm = (await call("POST", "admin/setup", { nama: "Admin", email: "admin@wiz.id", password: "rahasia123" })).sc;
else adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;
await call("PUT", "admin/settings", { rekening: [{ bank: "BSI", no: "7123456789", an: "WIZ" }] }, adm);
// Lepas Drive lama dari uji sebelumnya agar mulai bersih
for (const d of (await call("GET", "admin/drive", null, adm)).data.drives) await sql("UPDATE settings SET value='[]' WHERE key='drives'");

r = await call("POST", "admin/drive", { url: G("a1"), secret: "rahasia-uji-123" }, adm); ok(r.data.status === "aktif", "Drive A aktif");
const png = "data:image/png;base64," + Buffer.from("89504e470d0a1a0a0000000d494844520000000100000001", "hex").toString("base64");
r = await call("POST", "public/donations", { campaign: "infak-terbaik", nominal: 50000, nama: "Arsip Uji", wa: "081377700001", metode: "transfer" });
const did = r.data.id; await call("POST", `public/donations/${did}/bukti`, { gambar: png });
const mid = (await sql("SELECT bukti_id FROM donations WHERE id=?", [did]))[0].bukti_id;
for (let i = 0; i < 3; i++) await call("POST", "admin/drive/sync", { backup: i === 0 }, adm);
const ms = (await sql("SELECT * FROM media_sync WHERE media_id=?", [mid]))[0];
ok(ms && ms.gfile && ms.ukuran > 0 && /bukti/.test(ms.nama), "bukti transfer tersalin & tercatat: Drive + ID file + ukuran");

// File berumur >30 hari dikeluarkan dari D1, tetapi tetap bisa dibuka
await sql("UPDATE media SET created_at=datetime('now','-40 days') WHERE id=?", [mid]);
await call("POST", "admin/drive/sync", {}, adm);
ok((await sql("SELECT data FROM media WHERE id=?", [mid]))[0].data === "", "file lama dikeluarkan dari D1 (server tetap ringan)");
r = await call("GET", "admin/media/" + mid, null, adm);
ok(r.s === 200 && r.type === "image/png" && Buffer.compare(r.data, Buffer.from(png.split(",")[1], "base64")) === 0, "file lama dibuka lewat aplikasi, diambil dari Google Drive (isi sama persis)");

// Drive B cadangan, A penuh → pindah; isi tahun berjalan ikut disalin ke B
r = await call("POST", "admin/drive", { url: G("b1"), secret: "rahasia-uji-123" }, adm); ok(r.data.status === "cadangan", "Drive B cadangan");
await fetch(HOST + "/__gas/set?acc=a1&used=" + 13.8e9);
r = await call("POST", "admin/drive/sync", {}, adm); ok(r.data.penuh?.pindah_ke === "wizposo.data" + "b1@gmail.com", "Drive A 90%+ → pindah ke B");
for (let i = 0; i < 3; i++) await call("POST", "admin/drive/sync", {}, adm);
const st = await (await fetch(HOST + "/__gas/state")).json();
const y = new Date(Date.now() + 8 * 3600e3).getUTCFullYear();
const nDon = (await sql(`SELECT COUNT(*) n FROM donations WHERE strftime('%Y', datetime(created_at,'+8 hours'))='${y}'`))[0].n;
ok(st.b1.sheets[`Transaksi ${y}`]?.Donasi === nDon && st.b1.sheets["Data Induk"]?.Donatur > 0, `Drive B menerima salinan lengkap tahun berjalan (${nDon} transaksi) + data induk`);
r = await call("GET", "admin/media/" + mid, null, adm); ok(r.s === 200, "file di Drive A (penuh) tetap bisa dibuka");

// Lepas A → jadi arsip, tetap terbaca
const dA = (await call("GET", "admin/drive", null, adm)).data.drives.find((d) => d.email.startsWith("wizposo.dataa1"));
r = await call("DELETE", "admin/drive/" + dA.id, null, adm); ok(/ARSIP/.test(r.data.info), "Drive A yang masih menyimpan file dijadikan arsip, bukan dihapus");
r = await call("DELETE", "admin/drive/" + dA.id, null, adm); ok(r.s === 400, "Drive arsip yang berisi file tidak bisa dilepas total");
await sql("DELETE FROM settings WHERE key LIKE 'cache%'");
r = await call("GET", "admin/media/" + mid, null, adm); ok(r.s === 200, "file di Drive arsip tetap bisa dibuka");
r = await call("GET", "admin/drive", null, adm);
const a = r.data.drives.find((d) => d.id === dA.id);
ok(a.status === "arsip" && a.files >= 1 && a.backups >= 1 && r.data.d1_media.di_drive >= 1, `status gudang: A arsip (${a.files} file, ${a.backups} cadangan), ${r.data.d1_media.di_drive} file dipindah dari server`);
r = await call("GET", "admin/drive/files?jenis=bukti", null, adm); ok(r.data.rows.some((x) => x.id === mid && x.drive_id === dA.id && x.di_drive), "pencarian file: bukti ditemukan beserta Drive penyimpannya");
r = await call("GET", `admin/drive/${dA.id}/links`, null, adm); ok(Object.keys(r.data.sheets).some((k) => /Transaksi/.test(k)), "spreadsheet di Drive arsip tetap bisa dibuka");

// Cadangan + cermin + pemulihan
await call("POST", "admin/drive", { url: G("c1"), secret: "rahasia-uji-123" }, adm);
r = await call("POST", "admin/drive/sync", { backup: true }, adm); ok(r.data.backup && r.data.backup_cermin === "wizposo.datac1@gmail.com", "cadangan harian + salinan kedua di Drive cadangan");
const bks = (await call("GET", "admin/drive/backups", null, adm)).data;
ok(bks.length >= 3 && new Set(bks.map((b) => b.drive_id)).size >= 2, `${bks.length} cadangan tersebar di ${new Set(bks.map((b) => b.drive_id)).size} Drive`);
const oldBk = bks.find((b) => b.drive_id === dA.id);
r = await call("GET", "admin/drive/backups/" + oldBk.id, null, adm);
const dump = JSON.parse(gunzipSync(r.data).toString());
ok(r.type === "application/gzip" && dump.data.donations.some((d) => d.id === did), "cadangan dari Drive arsip bisa diunduh & dibuka");
await sql("DELETE FROM donations WHERE id=?", [did]); await sql("DELETE FROM donors WHERE wa='6281377700001'");
let added = 0;
for (const t of ["donors", "donations"]) added += (await call("POST", "admin/restore", { table: t, rows: dump.data[t] }, adm)).data.ditambah;
ok(added === 2 && (await sql("SELECT COUNT(*) n FROM donations WHERE id=?", [did]))[0].n === 1, "pemulihan: donasi & donatur yang terhapus kembali, data lain tidak berubah");
r = await call("POST", "admin/restore", { table: "donations", rows: dump.data.donations }, adm); ok(r.data.ditambah === 0, "pemulihan ulang tidak menggandakan data");
r = await call("POST", "admin/restore", { table: "admins", rows: [{ email: "x@x" }] }, adm); ok(r.s === 400, "tabel akun pengguna tidak bisa dipulihkan lewat jalur ini");

// Konektor versi lama terdeteksi
r = await call("POST", "admin/drive", { url: G("v1z"), secret: "rahasia-uji-123" }, adm);
r = await call("GET", "admin/drive", null, adm); ok(r.data.drives.find((d) => d.email.includes("v1z")).perlu_update, "Drive dengan konektor lama ditandai perlu diperbarui");
