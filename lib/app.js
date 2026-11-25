// API WIZ Cabang — berjalan di Cloudflare Pages Functions dengan database D1 (binding: DB).
import { SCHEMA, MIGRATIONS, AMPLOP_CAMPAIGN, QURBAN_CAMPAIGN, ROLES, PERMS, DEFAULT_SETTINGS, SEED_CAMPAIGNS } from "./schema.js";
import { fieldRoutes } from "./field.js";
import {
  HttpError, bad, json, randomId, hashPass, verifyPass, signSession, readSession, getCookie, sessionCookie,
  cleanWA, waFull, str, int, slugify, maskName, nowIso, csv, rp,
} from "./util.js";
import { enqueue, tandaiDonasiDihapus, addDrive, driveStatus, runSync, saveDrives, seedAll, fetchFile, fetchDriveFile, callDrive, BATAS_PERSEN } from "./drive.js";
import { midtransCreate, midtransVerify, midtransStatus, midtransCheck, sendWA, msgKuitansi, msgAdmin, msgFundraiser } from "./integrations.js";

const SCHEMA_VERSION = "18";
const TZ = "+8 hours"; // WITA
const SECRET_KEYS = ["midtrans_server_key", "fonnte_token"];
let ready = false;

/* ================= DB helpers ================= */
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
const one = (env, sql, ...a) => q(env, sql, ...a).first();
const all = async (env, sql, ...a) => (await q(env, sql, ...a).all()).results || [];
const run = (env, sql, ...a) => q(env, sql, ...a).run();

async function init(env) {
  if (ready) return;
  let ver = null;
  try { ver = (await one(env, "SELECT value FROM settings WHERE key='schema_v'"))?.value; } catch {}
  if (ver !== JSON.stringify(SCHEMA_VERSION)) {
    const stmts = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean).map((s) => env.DB.prepare(s));
    await env.DB.batch(stmts);
    for (const m of MIGRATIONS) { try { await env.DB.prepare(m).run(); } catch {} }
    await run(env, "INSERT OR REPLACE INTO settings(key,value) VALUES('schema_v',?)", JSON.stringify(SCHEMA_VERSION));
  }
  if (!(await one(env, "SELECT value FROM settings WHERE key='_secret'")))
    await run(env, "INSERT OR IGNORE INTO settings(key,value) VALUES('_secret',?)", JSON.stringify(randomId(48)));
  if (!(await one(env, "SELECT id FROM campaigns LIMIT 1"))) {
    await env.DB.batch(SEED_CAMPAIGNS.map(([slug, judul, ringkas, jenis, kat, ikon, target, unggul, urut, cerita]) =>
      env.DB.prepare("INSERT OR IGNORE INTO campaigns(slug,judul,ringkas,cerita,jenis_dana,kategori,ikon,target,unggulan,urutan) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(slug, judul, ringkas, cerita, jenis, kat, ikon, target, unggul, urut)));
  }
  await run(env, AMPLOP_CAMPAIGN);
  await run(env, QURBAN_CAMPAIGN);
  ready = true;
}

async function settings(env) {
  const rows = await all(env, "SELECT key,value FROM settings");
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) { try { s[r.key] = JSON.parse(r.value); } catch {} }
  if (env.MIDTRANS_SERVER_KEY) s.midtrans_server_key = env.MIDTRANS_SERVER_KEY;
  if (env.MIDTRANS_PRODUCTION) s.midtrans_production = env.MIDTRANS_PRODUCTION === "true";
  if (env.FONNTE_TOKEN) s.fonnte_token = env.FONNTE_TOKEN;
  return s;
}
const gatewayOn = (cfg) => !!cfg.midtrans_server_key;

/* ================= Auth ================= */
async function session(env, req, cookie) {
  const secret = (await settings(env))._secret;
  return readSession(getCookie(req, cookie), secret);
}
// perm: nama hak akses di PERMS (schema.js). Tanpa perm = hanya pengurus (admin, ketua, sekretaris, bendahara).
async function requireAdmin(env, req, perm = "lihat") {
  const s = await session(env, req, "wiz_adm");
  if (!s || s.t !== "a") throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  const a = await one(env, "SELECT id,nama,email,wa,role,wilayah,ttd_id,aktif,upah_persen FROM admins WHERE id=?", s.id);
  if (!a || !a.aktif) throw new HttpError(401, "Akun tidak ditemukan atau sudah dinonaktifkan.");
  if (a.role === "petugas") a.role = "zisko";
  if (perm && !can(a, perm)) throw new HttpError(403, "Akun Anda tidak punya akses ke bagian ini.");
  return a;
}
const can = (a, perm) => a.role === "admin" || (PERMS[perm] || []).includes(a.role);
const permsOf = (a) => Object.keys(PERMS).filter((p) => can(a, p));
// Batasi tebakan kata sandi: 5 kali salah → kunci 15 menit
async function loginGuard(env, key) {
  const r = await one(env, "SELECT n, until FROM login_fail WHERE k=?", key);
  if (r && r.until > Date.now()) throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi ${Math.ceil((r.until - Date.now()) / 60000)} menit lagi.`);
}
async function loginFail(env, key) {
  const r = await one(env, "SELECT n FROM login_fail WHERE k=?", key); const n = (r?.n || 0) + 1;
  await run(env, "INSERT OR REPLACE INTO login_fail(k,n,until) VALUES(?,?,?)", key, n >= 5 ? 0 : n, n >= 5 ? Date.now() + 15 * 60e3 : 0);
}
async function requireFr(env, req) {
  const s = await session(env, req, "wiz_fr");
  if (!s || s.t !== "f") throw new HttpError(401, "Silakan masuk sebagai fundraiser.");
  const f = await one(env, "SELECT id,kode,nama,wa,kota,status,created_at FROM fundraisers WHERE id=?", s.id);
  if (!f) throw new HttpError(401, "Akun fundraiser tidak ditemukan.");
  return f;
}
async function setSession(env, req, name, payload, days) {
  const cfg = await settings(env);
  const token = await signSession({ ...payload, exp: Date.now() + days * 864e5 }, cfg._secret);
  return sessionCookie(name, token, days * 86400, new URL(req.url).protocol === "https:");
}

/* ================= Campaign helpers ================= */
const CAMP_COLS = "c.id,c.slug,c.judul,c.ringkas,c.jenis_dana,c.kategori,c.ikon,c.target,c.batas,c.cover_id,c.galeri,c.og_id,c.og_src,c.status,c.unggulan,c.urutan,c.komisi_persen";
// Galeri gambar (tanpa batas jumlah): daftar id media berurutan; gambar utama (cover_id) selalu tampil pertama
const galeriIds = (v) => { let x = v; if (typeof x === "string") { try { x = JSON.parse(x); } catch { x = []; } }
  return [...new Set((Array.isArray(x) ? x : []).map((n) => int(n)).filter((n) => n > 0))].slice(0, 500); };
const galeriUrls = (coverId, galeri) => { const ids = galeriIds(galeri); const urut = coverId ? [coverId, ...ids.filter((i) => i !== coverId)] : ids; return urut.map((i) => `/api/media/${i}`); };
const campTotalsAll = `LEFT JOIN (SELECT campaign_id, SUM(total) terkumpul, COUNT(*) donatur FROM donations WHERE status='paid' GROUP BY campaign_id) t ON t.campaign_id=c.id`;
// Total publik: catatan ZISKO (pundi sedekah) tidak ikut dihitung
const campTotals = `LEFT JOIN (SELECT campaign_id, SUM(total) terkumpul, COUNT(*) donatur FROM donations WHERE status='paid' AND petugas_id IS NULL AND slip_no IS NULL GROUP BY campaign_id) t ON t.campaign_id=c.id`;
function campOut(c) {
  return { ...c, terkumpul: c.terkumpul || 0, donatur: c.donatur || 0, unggulan: !!c.unggulan,
    cover: c.cover_id ? `/api/media/${c.cover_id}` : null, galeri: galeriUrls(c.cover_id, c.galeri), galeri_ids: galeriIds(c.galeri),
    sisa_hari: c.batas ? Math.max(0, Math.ceil((new Date(c.batas + "T23:59:59+08:00") - Date.now()) / 864e5)) : null };
}

/* ================= Donasi ================= */
async function upsertDonor(env, wa, data = {}) {
  if (!wa) return null;
  const ex = await one(env, "SELECT id FROM donors WHERE wa=?", wa);
  const fields = ["nama", "sapaan", "email", "alamat", "kelurahan", "kecamatan", "pekerjaan", "alamat_kantor", "kab", "provinsi", "lat", "lng"];
  if (ex) {
    const sets = fields.filter((f) => data[f]);
    if (sets.length) { await run(env, `UPDATE donors SET ${sets.map((f) => f + "=?").join(",")}, updated_at=datetime('now') WHERE id=?`, ...sets.map((f) => data[f]), ex.id); await enqueue(env, "donatur", ex.id); }
    return ex.id;
  }
  const r = await run(env, `INSERT INTO donors(wa,${fields.join(",")}) VALUES(?${",?".repeat(fields.length)})`, wa, ...fields.map((f) => data[f] ?? null));
  await enqueue(env, "donatur", r.meta.last_row_id);
  return r.meta.last_row_id;
}

async function pickUniqueCode(env, nominal) {
  for (let i = 0; i < 25; i++) {
    const k = 1 + Math.floor(Math.random() * 499);
    const hit = await one(env, "SELECT seq FROM donations WHERE total=? AND status='pending' AND created_at > datetime('now','-3 days')", nominal + k);
    if (!hit) return k;
  }
  return 1 + Math.floor(Math.random() * 499);
}

function donationPublic(d, cfg) {
  const manual = d.metode === "transfer" || d.metode === "qris";
  return {
    id: d.id, status: d.status, nominal: d.nominal, kode_unik: d.kode_unik, total: d.total, metode: d.metode, jenis_dana: d.jenis_dana,
    campaign: { judul: d.judul, slug: d.slug }, sapaan: d.sapaan, nama: d.nama, anonim: !!d.anonim, doa: d.doa,
    created_at: d.created_at, paid_at: d.paid_at, payment_url: d.status === "pending" ? d.payment_url : null,
    fundraiser: d.fr_nama || null, ada_bukti: !!d.bukti_id, ada_klaim: !!d.klaim_at, kotak_kode: d.kotak_kode, pundi_kode: d.pundi_kode,
    rekening: manual && d.metode === "transfer" ? (cfg.rekening || []).filter((r) => r.no) : undefined,
    qris: manual && d.metode === "qris" && cfg.qris_media_id ? `/api/media/${cfg.qris_media_id}` : undefined,
  };
}
// Notifikasi otomatis: kirim lewat Fonnte dan catat di Riwayat Pesan WA (agar kegagalan terlihat admin)
async function notifWA(env, cfg, target, pesan, label, file = null) {
  const r = await sendWA(cfg, target, pesan, file);
  try {
    await run(env, "INSERT INTO wa_antrean(wa,nama,pesan,status,alasan,dikirim_at,label) VALUES(?,?,?,?,?,?,?)",
      waFull(target) || String(target || ""), "", pesan, r.ok ? "terkirim" : "gagal", r.ok ? null : String(r.reason || "gagal").slice(0, 200), nowIso(), label);
  } catch {}
  // Setiap notifikasi untuk admin juga disalin ke nomor Koordinator pundi (bila diaktifkan di Pengaturan)
  const adminNo = waFull(cfg.wa_admin), pundiNo = waFull(cfg.wa_pundi);
  if (cfg.notif_pundi && pundiNo && adminNo && waFull(target) === adminNo && pundiNo !== adminNo) {
    await notifWA(env, cfg, pundiNo, pesan, label + " · salinan", file).catch(() => {});
  }
  return r;
}
// Kode afiliasi = nomor urut pendaftaran 4 digit (0001). Kode lama berbasis nama tetap diterima.
const kodeFr = (id) => String(id).padStart(4, "0");
const normKodeFr = (k) => { const s = str(k, 20).toUpperCase(); return /^\d{1,6}$/.test(s) ? s.padStart(4, "0") : s; };
const cariFr = (env, kode, kolom = "id,komisi_persen") => {
  const k = normKodeFr(kode); return k ? one(env, `SELECT ${kolom} FROM fundraisers WHERE (kode=? OR kode_lama=?) AND status='aktif'`, k, k) : null;
};
const komisiRp = (d) => (d.komisi_persen > 0 ? Math.round((d.nominal * d.komisi_persen) / 100) : 0);
const DON_SELECT = `SELECT d.*, c.judul, c.slug, f.nama fr_nama FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id LEFT JOIN fundraisers f ON f.id=d.fundraiser_id`;

// Tandai lunas (idempoten) lalu kirim notifikasi
async function markPaid(env, ctx, req, id, paidAt, opt = {}) {
  const r = await run(env, "UPDATE donations SET status='paid', paid_at=COALESCE(?, datetime('now')) WHERE id=? AND status!='paid'", paidAt || null, id);
  if (!r.meta.changes) return false;
  await enqueue(env, "donasi", id);
  if (opt.quiet) { await run(env, "UPDATE donations SET notified=1 WHERE id=?", id); return true; } // slip setoran mengirim notifikasinya sendiri
  const cfg = await settings(env);
  const d = await one(env, DON_SELECT + " WHERE d.id=?", id);
  const origin = new URL(req.url).origin;
  const tasks = (async () => {
    if (cfg.notif_donatur && d.wa) await notifWA(env, cfg, d.wa, msgKuitansi(cfg, d, d.judul || "Donasi", `${origin}/#/kuitansi/${d.id}`), "Kuitansi donatur");
    if (cfg.notif_admin && cfg.wa_admin && d.kanal === "online") await notifWA(env, cfg, cfg.wa_admin, msgAdmin(cfg, d, d.judul || "Donasi", d.fr_nama, `${origin}/admin#donasi?id=${d.id}`), "Info admin: lunas");
    if (d.kotak_kode) {
      const k = await one(env, "SELECT nama_lokasi,pemilik,wa_pemilik FROM kotak WHERE kode=?", d.kotak_kode);
      if (k?.wa_pemilik) await notifWA(env, cfg, k.wa_pemilik, `Assalamu'alaikum ${k.pemilik || "Bapak/Ibu"},\n\nKotak amal WIZ (${d.kotak_kode}) di ${k.nama_lokasi} telah dijemput${d.petugas ? " oleh " + d.petugas : ""}.\nIsi kotak: *Rp${d.total.toLocaleString("id-ID")}*\n\nTerima kasih telah menjadi tempat kebaikan. Semoga Allah memberkahi usaha Anda.`, "Info pemilik kotak");
    }
    if (cfg.notif_fundraiser && d.fundraiser_id) {
      const fr = await one(env, "SELECT id,kode,nama,wa FROM fundraisers WHERE id=?", d.fundraiser_id);
      if (fr) await notifWA(env, cfg, fr.wa, msgFundraiser(cfg, d, d.judul || "Donasi", fr, komisiRp(d), `${origin}/#/mitra`), "Info afiliator: lunas");
    }
    await run(env, "UPDATE donations SET notified=1 WHERE id=?", id);
  })().catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(tasks) : await tasks;
  return true;
}

// Transfer/QRIS manual tanpa bukti: tidak tampil di daftar admin dan kedaluwarsa setelah 24 jam
const ZISKO_SQL = "(d.petugas_id IS NOT NULL OR d.slip_no IS NOT NULL)";
const TANPA_BUKTI = "(d.kanal='online' AND d.metode IN ('transfer','qris') AND d.bukti_id IS NULL AND d.klaim_at IS NULL AND d.status IN ('pending','expired'))";
async function kedaluwarsaManual(env) {
  await run(env, "UPDATE donations SET status='expired' WHERE kanal='online' AND metode IN ('transfer','qris') AND status='pending' AND bukti_id IS NULL AND klaim_at IS NULL AND datetime(created_at) < datetime('now','-24 hours')");
}
// Pengingat sekali ke donatur: 2 jam setelah donasi transfer/QRIS belum ada bukti
async function ingatkanBukti(env, origin = "") {
  const cfg = await settings(env);
  if (!cfg.fonnte_token || !cfg.notif_donatur) return 0;
  const rows = await all(env, `SELECT d.id,d.nama,d.sapaan,d.wa,d.total,d.metode,c.judul FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id
    WHERE d.kanal='online' AND d.metode IN ('transfer','qris') AND d.status='pending' AND d.bukti_id IS NULL AND d.klaim_at IS NULL AND d.ingat_at IS NULL AND d.wa IS NOT NULL
    AND datetime(d.created_at) < datetime('now','-2 hours') AND datetime(d.created_at) > datetime('now','-24 hours') LIMIT 20`);
  const base = origin || cfg.situs_url || "";
  const admin = cfg.call_center || cfg.wa_admin || "";
  for (const d of rows) {
    await run(env, "UPDATE donations SET ingat_at=? WHERE id=?", nowIso(), d.id);
    if (!base) continue;
    await notifWA(env, cfg, d.wa, `Assalamu'alaikum ${[d.sapaan, d.nama].filter(Boolean).join(" ") || "Bapak/Ibu"},\n\nKami melihat donasi Anda *${rp(d.total)}* untuk "${d.judul || "Donasi"}" belum dilengkapi bukti transfer.\n\n` +
      `Bila sudah ${d.metode === "qris" ? "membayar lewat QRIS" : "transfer"}, mohon unggah bukti di tautan ini:\n${base}/#/bayar/${d.id}\n\nAtau cukup *balas pesan ini dengan foto bukti transfer*${admin ? ` / hubungi admin di wa.me/${admin}` : ""}. Bila belum sempat, abaikan saja pesan ini. Jazakallahu khairan.`,
      "Pengingat bukti transfer");
  }
  return rows.length;
}
// Instruksi transfer ke WhatsApp donatur, berisi tautan untuk mengunggah bukti
async function instruksiDonatur(env, ctx, req, cfg, id) {
  const asal = new URL(req.url).origin;
  if (cfg.situs_url !== asal && !/localhost|127\.0\.0\.1/.test(asal)) await run(env, "INSERT INTO settings(key,value) VALUES('situs_url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(asal)).catch(() => {});
  if (!cfg.notif_donatur) return;
  const d = await one(env, DON_SELECT + " WHERE d.id=?", id);
  if (!d?.wa) return;
  const origin = new URL(req.url).origin;
  const rek = (cfg.rekening || []).filter((r) => r.no).map((r) => `• ${r.bank} ${r.no} a.n. ${r.an}`).join("\n");
  const msg = `Assalamu'alaikum ${d.nama || "Bapak/Ibu"},\n\nJazakallahu khairan atas niat baik Anda untuk "${d.judul || "Donasi"}".\n\n` +
    (d.metode === "qris" ? `Silakan bayar lewat *QRIS WIZ* sebesar *${rp(d.total)}* (tepat, termasuk kode unik).` : `Silakan transfer *${rp(d.total)}* (tepat, termasuk kode unik) ke:\n${rek || "rekening WIZ yang tertera di aplikasi"}`) +
    `\n\nSetelah membayar, *unggah bukti transfer* di tautan ini agar donasi Anda tercatat:\n${origin}/#/bayar/${d.id}\n\nBatas unggah bukti 24 jam. Anda juga bisa membalas pesan ini dengan foto bukti transfer.` +
    `\nKonfirmasi dan kuitansi akan kami kirim ke nomor ini setelah donasi diverifikasi admin.`;
  const t = notifWA(env, cfg, d.wa, msg, "Instruksi transfer donatur").catch(() => {});
  return ctx?.waitUntil ? ctx.waitUntil(t) : t;
}
// Bukti transfer masuk: admin diberi tautan untuk menandai lunas, afiliator diberi kabar
async function notifDonasiBaru(env, ctx, req, cfg, id, klaim = false) {
  const d = await one(env, DON_SELECT + " WHERE d.id=?", id);
  if (!d) return;
  const origin = new URL(req.url).origin;
  const manual = d.metode === "transfer" || d.metode === "qris";
  const tasks = (async () => {
    if (manual && cfg.notif_admin && cfg.wa_admin) {
      const msg = (klaim ? `🕒 Donatur menyatakan SUDAH TRANSFER (bukti belum terkirim) – WIZ ${cfg.cabang}\n` : `📎 Donasi baru + bukti transfer – WIZ ${cfg.cabang}\n`) + `${d.anonim ? "Hamba Allah" : d.nama || "-"}${d.wa ? " (+" + d.wa + ")" : ""}\nProgram: ${d.judul || "-"}\n` +
        `${d.metode === "qris" ? "QRIS" : "Transfer"}: *${rp(d.total)}* (kode unik ${d.kode_unik})${d.fr_nama ? "\nLewat afiliator: " + d.fr_nama : ""}\n\n` +
        (klaim ? `Cocokkan mutasi dengan nominal *${rp(d.total)}*${d.bukti_gagal ? `\nKendala unggah: ${d.bukti_gagal}` : ""}\n` : "") +
        `Cek mutasi${klaim ? "" : " & bukti"}, lalu tekan Tandai lunas:\n${origin}/admin#donasi?id=${d.id}`;
      await notifWA(env, cfg, cfg.wa_admin, msg, klaim ? "Info admin: konfirmasi tanpa bukti" : "Info admin: bukti transfer");
    }
    if (cfg.notif_fundraiser && d.fundraiser_id) {
      const fr = await one(env, "SELECT kode,nama,wa FROM fundraisers WHERE id=?", d.fundraiser_id);
      if (fr) await notifWA(env, cfg, fr.wa, `Assalamu'alaikum ${fr.nama},\n\nAda donatur yang berdonasi *${rp(d.nominal)}* untuk "${d.judul || "Donasi"}" lewat tautan Anda (kode ${fr.kode}).\n` +
        `${klaim ? "Donatur menyatakan sudah transfer" : "Bukti transfernya sudah masuk"} dan sedang diperiksa admin. Kami kabari lagi setelah dana diterima.\n\nJazakallahu khairan atas ajakan kebaikannya.`, "Info afiliator: donasi baru");
    }
  })().catch(() => {});
  return ctx?.waitUntil ? ctx.waitUntil(tasks) : tasks;
}

async function applyGatewayStatus(env, ctx, req, id, n) {
  const st = midtransStatus(n);
  if (st === "paid") return markPaid(env, ctx, req, id, null);
  if (st !== "pending") { await run(env, "UPDATE donations SET status=? WHERE id=? AND status='pending'", st, id); await enqueue(env, "donasi", id); }
  return false;
}

async function createDonation(env, ctx, req, b, { offline = false, admin = null, qurban = false } = {}) {
  const cfg = await settings(env);
  const camp = b.campaign_id
    ? await one(env, "SELECT * FROM campaigns WHERE id=?", int(b.campaign_id))
    : await one(env, "SELECT * FROM campaigns WHERE slug=?", str(b.campaign, 80));
  if (!camp || (!offline && !qurban && camp.status !== "aktif")) throw bad("Program tidak ditemukan atau sudah ditutup.");
  const nominal = int(b.nominal);
  if (nominal < (offline ? 1 : cfg.min_donasi || 10000)) throw bad(`Minimal donasi Rp${(cfg.min_donasi || 10000).toLocaleString("id-ID")}.`);
  if (nominal > 1_000_000_000) throw bad("Nominal terlalu besar. Hubungi admin untuk donasi besar.");
  const metodeOnline = ["gateway", "transfer", "qris"], metodeOffline = ["tunai", "kotak", "pundi", "amplop", "transfer", "qris", "lainnya"];
  const metode = str(b.metode, 20);
  if (!(offline ? metodeOffline : metodeOnline).includes(metode)) throw bad("Metode pembayaran tidak dikenali.");
  if (metode === "gateway" && !gatewayOn(cfg)) throw bad("Pembayaran otomatis belum aktif. Pilih transfer bank.");
  if (!offline && metode === "transfer" && !(cfg.rekening || []).some((r) => r.no)) throw bad("Rekening cabang belum diatur. Hubungi admin.");
  if (!offline && metode === "qris" && !cfg.qris_media_id) throw bad("QRIS cabang belum diatur. Pilih metode lain.");

  const wa = waFull(b.wa);
  // Donasi online wajib nomor WA: untuk instruksi pembayaran, konfirmasi/kuitansi, dan dihubungi bila ada selisih transfer
  if (!offline && !b.wa) throw bad("Nomor WhatsApp wajib diisi agar Anda menerima konfirmasi dan kuitansi donasi.");
  if (b.wa && (wa.length < 11 || wa.length > 15 || (!offline && !/^628\d{7,12}$/.test(wa)))) throw bad("Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.");
  const nama = str(b.nama, 80), sapaan = str(b.sapaan, 10);
  const donorId = await upsertDonor(env, wa, { nama, sapaan, ...(offline ? { alamat: str(b.alamat, 200) } : {}) });
  let frId = null, frPersen = null; // persen komisi afiliator disalin saat donasi dicatat
  const frInfo = (fr) => { frId = fr?.id || null; frPersen = fr ? (camp?.komisi_persen ?? fr.komisi_persen ?? cfg.upah_afiliator_persen) : null; };
  if (b.ref) frInfo(await cariFr(env, b.ref));
  if (offline && b.fundraiser_id) frInfo(await one(env, "SELECT id,komisi_persen FROM fundraisers WHERE id=?", int(b.fundraiser_id)));
  const kode = !offline && (metode === "transfer" || metode === "qris") ? await pickUniqueCode(env, nominal) : 0;
  const id = "W" + randomId(11);
  const kotak = str(b.kotak_kode, 20).toUpperCase() || null, pundi = str(b.pundi_kode, 20).toUpperCase() || null;
  await run(env, `INSERT INTO donations(id,campaign_id,jenis_dana,nominal,kode_unik,total,donor_id,sapaan,nama,wa,anonim,doa,metode,kanal,status,fundraiser_id,kotak_kode,pundi_kode,petugas,catatan,created_at,komisi_persen)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, camp.id, camp.jenis_dana, nominal, kode, nominal + kode, donorId, sapaan, nama, wa || null, b.anonim ? 1 : 0, str(b.doa, 300) || null,
    metode, offline ? "offline" : "online", "pending", frId, kotak, pundi, offline ? str(b.petugas, 60) || admin?.nama || null : null,
    str(b.catatan, 300) || null, nowIso(), camp.jenis_dana === "infak" ? frPersen : null); // komisi hanya dari infak/sedekah, bukan zakat

  // Transfer/QRIS online baru tercatat (daftar admin & Drive) setelah donatur mengunggah bukti
  if (offline || metode === "gateway") await enqueue(env, "donasi", id);
  if (offline) await markPaid(env, ctx, req, id, b.tanggal ? str(b.tanggal, 10) + " 04:00:00" : null);
  else if (metode === "gateway") {
    try {
      const pay = await midtransCreate(cfg, { id, total: nominal, campaign_id: camp.id, nama, wa, anonim: b.anonim }, camp.judul, `${new URL(req.url).origin}/#/bayar/${id}`);
      await run(env, "UPDATE donations SET gateway_ref=?, payment_url=? WHERE id=?", pay.token, pay.url, id);
    } catch (e) {
      await run(env, "UPDATE donations SET status='failed', catatan=? WHERE id=?", String(e.message).slice(0, 200), id);
      throw bad("Pembayaran otomatis sedang bermasalah. Coba lagi atau pilih transfer bank.");
    }
  }
  if (!offline && (metode === "transfer" || metode === "qris")) { try { await instruksiDonatur(env, ctx, req, cfg, id); } catch {} }
  return donationPublic(await one(env, DON_SELECT + " WHERE d.id=?", id), cfg);
}

/* ================= Media ================= */
async function saveMedia(env, dataUrl, priv = 0) {
  const m = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw bad("Format gambar harus PNG, JPG, atau WebP.");
  if (m[2].length > 900_000) throw bad("Gambar terlalu besar. Maksimal sekitar 650 KB.");
  let r;
  try { r = await run(env, "INSERT INTO media(mime,data,private) VALUES(?,?,?)", m[1], m[2], priv); }
  catch (e) { throw new HttpError(503, "Penyimpanan gambar sedang sibuk. Coba lagi sebentar, atau tekan \"Saya sudah transfer\"."); }
  return r.meta.last_row_id;
}
// Dokumen & foto lapangan (selalu privat). Batas ukuran per jenis agar D1 tetap ringan.
const DOC_MAX = { ttd: 300_000, foto: 900_000, slip: 1_400_000, surat: 1_400_000 };
async function saveDoc(env, dataUrl, kind) {
  const m = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw bad("Format gambar harus PNG, JPG, atau WebP.");
  if (m[2].length > (DOC_MAX[kind] || 900_000)) throw bad(kind === "ttd" ? "Tanda tangan terlalu besar." : "Gambar terlalu besar. Perkecil dulu.");
  const r = await run(env, "INSERT INTO media(mime,data,private,kind) VALUES(?,?,1,?)", m[1], m[2], kind);
  return r.meta.last_row_id;
}
// Isi file: dari D1, atau (bila sudah dipindah ke Google Drive) diambil dari Drive yang menyimpannya.
// Hasil dari Drive disimpan sementara di cache Cloudflare supaya pembukaan berikutnya cepat.
async function mediaBytes(env, id) {
  const m = id ? await one(env, "SELECT id,mime,data,private FROM media WHERE id=?", int(id)) : null;
  if (!m) return null;
  if (m.data) return { mime: m.mime, bytes: b64bytes(m.data), private: m.private };
  const c = globalThis.caches?.default, key = new Request(`https://wiz-arsip.internal/media/${m.id}`);
  try { const hit = c && (await c.match(key)); if (hit) return { mime: hit.headers.get("content-type") || m.mime, bytes: new Uint8Array(await hit.arrayBuffer()), private: m.private }; } catch {}
  let f = null; try { f = await fetchFile(env, m.id); } catch (e) { throw new HttpError(502, "File tersimpan di Google Drive tetapi gagal diambil: " + e.message); }
  if (!f) return null;
  const bytes = b64bytes(f.data), mime = f.mime || m.mime;
  try { if (c) await c.put(key, new Response(bytes, { headers: { "content-type": mime, "cache-control": "max-age=604800" } })); } catch {}
  return { mime, bytes, private: m.private };
}
async function serveMedia(env, id, cache = "private, max-age=86400") {
  const m = await mediaBytes(env, id);
  if (!m) throw new HttpError(404, "File tidak ditemukan.");
  return new Response(m.bytes, { headers: { "content-type": m.mime, "cache-control": cache } });
}
// Dekode base64 dengan perulangan biasa (jauh lebih hemat CPU daripada Array.from + callback)
function b64bytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function mediaResponse(m) {
  const bin = b64bytes(m.data);
  return new Response(bin, { headers: { "content-type": m.mime, "cache-control": m.private ? "private, no-store" : "public, max-age=31536000, immutable" } });
}

/* ================= Router ================= */
const routes = [];
const R = (method, pattern, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn });

/* ---------- Publik ---------- */
R("GET", "public/config", async ({ env }) => {
  const c = await settings(env);
  return json({ cabang: c.cabang, tagline: c.tagline, wa_admin: c.wa_admin, wa_ambulans: c.wa_ambulans, wa_pundi: c.wa_pundi,
    rekening: (c.rekening || []).filter((r) => r.no), qris: c.qris_media_id ? `/api/media/${c.qris_media_id}` : null,
    harga_emas: c.harga_emas, nisab_gram: c.nisab_gram, harga_beras: c.harga_beras, beras_per_jiwa: c.beras_per_jiwa,
    pundi_jadwal: c.pundi_jadwal, pundi_wilayah: c.pundi_wilayah, gateway: gatewayOn(c), min_donasi: c.min_donasi, fr_apresiasi: c.fr_apresiasi,
    kantor_alamat: c.kantor_alamat, call_center: c.call_center, kode_cabang: c.kode_cabang,
    trust: (c.trust_items || []).map((t) => ({ judul: t.judul, ringkas: t.ringkas, teks: t.teks, ikon: t.ikon, gambar: t.gambar_id ? "/api/media/" + t.gambar_id : null })) });
});
R("GET", "public/campaigns", async ({ env }) => {
  const rows = await all(env, `SELECT ${CAMP_COLS}, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.status='aktif' ORDER BY c.unggulan DESC, c.urutan, c.id`);
  return json(rows.map(campOut));
});
R("GET", "public/campaigns/:slug", async ({ env, p }) => {
  const c = await one(env, `SELECT ${CAMP_COLS}, c.cerita, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.slug=? AND c.status!='draft'`, p.slug);
  if (!c) throw new HttpError(404, "Program tidak ditemukan.");
  const updates = await all(env, "SELECT id,judul,isi,created_at FROM campaign_updates WHERE campaign_id=? ORDER BY id DESC LIMIT 20", c.id);
  const donors = await all(env, "SELECT nama,anonim,total,doa,paid_at FROM donations WHERE campaign_id=? AND status='paid' AND petugas_id IS NULL AND slip_no IS NULL ORDER BY paid_at DESC LIMIT 30", c.id);
  return json({ ...campOut(c), cerita: c.cerita, updates, donors: donors.map((d) => ({ nama: maskName(d.nama, d.anonim), total: d.total, doa: d.doa, waktu: d.paid_at })) });
});
R("GET", "public/live", async ({ env }) => {
  const recent = await all(env, `SELECT d.seq,d.nama,d.anonim,d.total,d.paid_at,c.judul FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id WHERE d.status='paid' AND d.kanal='online' AND d.petugas_id IS NULL AND d.slip_no IS NULL ORDER BY d.paid_at DESC LIMIT 10`);
  const tot = await one(env, `SELECT COALESCE(SUM(total),0) bulan, COUNT(*) n, COUNT(DISTINCT COALESCE(donor_id, id)) donatur FROM donations WHERE status='paid' AND petugas_id IS NULL AND slip_no IS NULL AND strftime('%Y-%m', datetime(paid_at,'${TZ}'))=strftime('%Y-%m', datetime('now','${TZ}'))`);
  return json({ bulan_ini: tot, recent: recent.map((r) => ({ seq: r.seq, nama: maskName(r.nama, r.anonim), total: r.total, waktu: r.paid_at, program: r.judul })) });
});
R("POST", "public/donations", async ({ env, ctx, req, body }) => json(await createDonation(env, ctx, req, body), 201));
R("GET", "public/donations/:id", async ({ env, p }) => {
  const d = await one(env, DON_SELECT + " WHERE d.id=?", p.id);
  if (!d) throw new HttpError(404, "Transaksi tidak ditemukan.");
  return json(donationPublic(d, await settings(env)));
});
R("POST", "public/donations/:id/check", async ({ env, ctx, req, p }) => {
  const cfg = await settings(env);
  const d = await one(env, "SELECT id,status,metode FROM donations WHERE id=?", p.id);
  if (!d) throw new HttpError(404, "Transaksi tidak ditemukan.");
  if (d.status === "pending" && d.metode === "gateway" && gatewayOn(cfg)) {
    try { const n = await midtransCheck(cfg, d.id); if (n.transaction_status) await applyGatewayStatus(env, ctx, req, d.id, n); } catch {}
  }
  return json(donationPublic(await one(env, DON_SELECT + " WHERE d.id=?", p.id), cfg));
});
R("POST", "public/donations/:id/bukti", async ({ env, ctx, req, p, body }) => {
  const d = await one(env, "SELECT id,status,metode,total,nama,bukti_id,klaim_at FROM donations WHERE id=?", p.id);
  if (!d || !["pending", "expired"].includes(d.status) || !["transfer", "qris"].includes(d.metode)) throw bad("Bukti tidak bisa diunggah untuk transaksi ini.");
  const mid = await saveMedia(env, body.gambar, 1);
  // Bukti datang setelah 24 jam: donasi dihidupkan lagi untuk diperiksa admin
  await run(env, "UPDATE donations SET bukti_id=?, bukti_gagal=NULL, status='pending' WHERE id=?", mid, d.id);
  await enqueue(env, "donasi", d.id);
  if (!d.bukti_id && !d.klaim_at) { try { await notifDonasiBaru(env, ctx, req, await settings(env), d.id); } catch {} }
  return json({ ok: true });
});
// Unggah bukti gagal di HP donatur: catat penyebabnya agar admin & pengembang bisa menelusuri
R("POST", "public/donations/:id/bukti-gagal", async ({ env, p, body }) => {
  await run(env, "UPDATE donations SET bukti_gagal=? WHERE id=? AND bukti_id IS NULL", str(body.alasan, 200) || "tidak diketahui", p.id);
  return json({ ok: true });
});
// Donatur menyatakan sudah transfer tanpa bukti: donasi tampil di admin, admin mencocokkan lewat nominal unik
R("POST", "public/donations/:id/klaim", async ({ env, ctx, req, p }) => {
  const d = await one(env, "SELECT id,status,metode,bukti_id,klaim_at FROM donations WHERE id=?", p.id);
  if (!d || !["pending", "expired"].includes(d.status) || !["transfer", "qris"].includes(d.metode)) throw bad("Transaksi ini tidak bisa dikonfirmasi.");
  if (!d.klaim_at) {
    await run(env, "UPDATE donations SET klaim_at=?, status='pending' WHERE id=?", nowIso(), d.id);
    await enqueue(env, "donasi", d.id);
    if (!d.bukti_id) { try { await notifDonasiBaru(env, ctx, req, await settings(env), d.id, true); } catch {} }
  }
  return json({ ok: true });
});
R("POST", "public/pundi", async ({ env, ctx, body }) => {
  const wa = waFull(body.wa); const nama = str(body.nama, 80);
  if (!nama || wa.length < 11 || !str(body.alamat) || !str(body.kelurahan) || !str(body.kecamatan)) throw bad("Lengkapi nama, WhatsApp, alamat, kelurahan, dan kecamatan.");
  const data = { nama, alamat: str(body.alamat, 200), kelurahan: str(body.kelurahan, 60), kecamatan: str(body.kecamatan, 60), pekerjaan: str(body.pekerjaan, 60) };
  const donorId = await upsertDonor(env, wa, data);
  const dup = await one(env, "SELECT id FROM pundi WHERE wa=? AND status IN ('baru','diantar')", wa);
  if (dup) return json({ ok: true, id: dup.id, sudah: true });
  const r = await run(env, "INSERT INTO pundi(nama,wa,alamat,kelurahan,kecamatan,patokan,pekerjaan,jumlah,waktu_jemput,donor_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
    nama, wa, data.alamat, data.kelurahan, data.kecamatan, str(body.patokan, 120), data.pekerjaan, Math.min(5, Math.max(1, int(body.jumlah) || 1)), str(body.waktu_jemput, 20), donorId);
  await enqueue(env, "pundi", r.meta.last_row_id);
  const cfg = await settings(env);
  const target = cfg.wa_pundi || cfg.wa_admin;
  if (target) { const t = sendWA(cfg, target, `🏺 Pendaftar Pundi Sedekah baru\n${nama} (+${wa})\n${data.alamat}, ${data.kelurahan}, ${data.kecamatan}\nJumlah: ${int(body.jumlah) || 1} pundi · jemput ${str(body.waktu_jemput, 20) || "-"}`); ctx?.waitUntil ? ctx.waitUntil(t) : await t; }
  return json({ ok: true, id: r.meta.last_row_id }, 201);
});
R("GET", "public/fundraiser/:kode", async ({ env, p }) => {
  const f = await cariFr(env, p.kode, "kode,nama");
  return json(f || null);
});
R("GET", "media/:id", async ({ env, p }) => {
  const m = await one(env, "SELECT mime,data,private FROM media WHERE id=?", int(p.id));
  if (!m || m.private) throw new HttpError(404, "Gambar tidak ditemukan.");
  if (m.data) return mediaResponse(m);
  return serveMedia(env, p.id, "public, max-age=86400");
});

/* ---------- Webhook payment gateway ---------- */
R("POST", "payment/midtrans", async ({ env, ctx, req, body }) => {
  const cfg = await settings(env);
  if (!gatewayOn(cfg) || !(await midtransVerify(cfg, body))) throw new HttpError(403, "Tanda tangan tidak valid.");
  const d = await one(env, "SELECT id,total FROM donations WHERE id=?", body.order_id);
  if (!d) return json({ ok: true, info: "unknown order" });
  if (Math.round(parseFloat(body.gross_amount)) !== d.total) throw bad("Nominal tidak cocok.");
  await applyGatewayStatus(env, ctx, req, d.id, body);
  return json({ ok: true });
});

/* ---------- Upah & komisi ---------- */
const pctOrNull = (v) => (v === null || v === undefined || v === "" ? null : Math.min(100, Math.max(0, Number(v) || 0)));
// Saldo afiliator: komisi dari donasi lunas yang masuk lewat link/kode, dikurangi penarikan yang menunggu atau sudah dibayar
async function saldoFr(env, id) {
  const e = await one(env, "SELECT COALESCE(SUM(CAST(ROUND(nominal*komisi_persen/100.0) AS INTEGER)),0) v FROM donations WHERE fundraiser_id=? AND status='paid' AND komisi_persen>0", id);
  const by = Object.fromEntries((await all(env, "SELECT status, COALESCE(SUM(nominal),0) v FROM penarikan WHERE fundraiser_id=? AND status IN ('diajukan','disetujui') GROUP BY status", id)).map((r) => [r.status, r.v]));
  // Komisi qurban: tetap per peserta, hanya dihitung setelah peserta lunas (tidak memakai persen sedekah)
  const qrows = await all(env, PESERTA_SQL + " WHERE q.fundraiser_id=? AND q.status!='batal'", id);
  const lunasQ = qrows.filter((q) => ["lunas", "disembelih", "dibagikan"].includes(statusQurban(q)));
  const komisiQurban = lunasQ.reduce((a, q) => a + (q.komisi_rp || 0), 0);
  const diperoleh = e.v + komisiQurban, dibayar = by.disetujui || 0, diajukan = by.diajukan || 0;
  return { diperoleh, komisi_sedekah: e.v, komisi_qurban: komisiQurban, qurban_lunas: lunasQ.length, dibayar, diajukan, tersedia: Math.max(0, diperoleh - dibayar - diajukan) };
}
// Upah petugas: total setoran slip yang tidak dibatalkan, dan upahnya sesuai persen yang berlaku saat slip dicatat
async function upahPetugas(env, id) {
  const r = await one(env, "SELECT COALESCE(SUM(total),0) setoran, COUNT(*) slip, COALESCE(SUM(upah_dasar),0) dasar, COALESCE(SUM(CAST(ROUND(COALESCE(upah_dasar,0)*COALESCE(upah_persen,0)/100.0) AS INTEGER)),0) upah FROM slips WHERE petugas_id=? AND batal=0", id);
  return { setoran: r.setoran, slip: r.slip, dasar: r.dasar, upah: r.upah };
}
// Saldo petugas: upah yang sudah tercatat, dikurangi permintaan tarik yang menunggu atau sudah dibayar
async function saldoPetugas(env, id) {
  const { upah } = await upahPetugas(env, id);
  const by = Object.fromEntries((await all(env, "SELECT status, COALESCE(SUM(nominal),0) v FROM penarikan_petugas WHERE admin_id=? AND status IN ('diajukan','disetujui') GROUP BY status", id)).map((r) => [r.status, r.v]));
  return { diperoleh: upah, dibayar: by.disetujui || 0, diajukan: by.diajukan || 0, tersedia: Math.max(0, upah - (by.disetujui || 0) - (by.diajukan || 0)) };
}

/* ---------- Fundraiser ---------- */
R("POST", "fr/register", async ({ env, req, body }) => {
  const cfg = await settings(env);
  const nama = str(body.nama, 60), wa = waFull(body.wa), pin = String(body.pin || "");
  if (!nama || wa.length < 11) throw bad("Isi nama dan nomor WhatsApp yang valid.");
  if (!/^\d{6}$/.test(pin)) throw bad("PIN harus 6 angka.");
  if (await one(env, "SELECT id FROM fundraisers WHERE wa=?", wa)) throw bad("Nomor ini sudah terdaftar. Silakan masuk.");
  // Kode afiliasi = nomor urut pendaftaran (0001, 0002, …), tidak memuat nama
  const r = await run(env, "INSERT INTO fundraisers(kode,nama,wa,pin_hash,kota,status) VALUES(?,?,?,?,?,?)", "TMP" + randomId(10), nama, wa, await hashPass(pin), str(body.kota, 60), cfg.fr_auto_aktif ? "aktif" : "nonaktif");
  const kode = kodeFr(r.meta.last_row_id);
  await run(env, "UPDATE fundraisers SET kode=? WHERE id=?", kode, r.meta.last_row_id);
  await enqueue(env, "fundraiser", kode);
  return json({ ok: true, kode }, 201, { "set-cookie": await setSession(env, req, "wiz_fr", { t: "f", id: r.meta.last_row_id }, 30) });
});
R("POST", "fr/login", async ({ env, req, body }) => {
  const f = await one(env, "SELECT id,pin_hash FROM fundraisers WHERE wa=?", waFull(body.wa));
  if (!f || !(await verifyPass(String(body.pin || ""), f.pin_hash))) throw new HttpError(401, "Nomor WhatsApp atau PIN salah.");
  return json({ ok: true }, 200, { "set-cookie": await setSession(env, req, "wiz_fr", { t: "f", id: f.id }, 30) });
});
R("POST", "fr/logout", async () => json({ ok: true }, 200, { "set-cookie": "wiz_fr=; Path=/; Max-Age=0" }));
// Peserta tabungan qurban yang didaftarkan lewat tautan afiliator ini (tanpa nomor WA & catatan internal)
R("GET", "fr/qurban", async ({ env, req }) => {
  const f = await requireFr(env, req);
  const rows = await all(env, PESERTA_SQL + " WHERE q.fundraiser_id=? ORDER BY q.id DESC", f.id);
  const musimCache = new Map();
  const peserta = [];
  for (const q of rows) {
    if (!musimCache.has(q.musim_id)) musimCache.set(q.musim_id, await qurbanMusimById(env, q.musim_id));
    const m = musimCache.get(q.musim_id);
    if (!m) continue;
    const o = qurbanOut(q, m);
    peserta.push({ kode: o.kode, nama: o.nama, kota: q.kota || "", jenis: o.jenis, bagian: o.bagian, tahun_hijriah: o.tahun_hijriah,
      target: o.target, terkumpul: o.terkumpul, persen: o.persen, status: o.status, daftar: o.created_at,
      komisi: q.komisi_rp || 0, komisi_siap: ["lunas", "disembelih", "dibagikan"].includes(o.status) });
  }
  const aktif = peserta.filter((p) => p.status !== "batal");
  return json({ peserta, ringkas: { total: aktif.length, lunas: aktif.filter((p) => ["lunas", "disembelih", "dibagikan"].includes(p.status)).length,
    terkumpul: aktif.reduce((a, p) => a + p.terkumpul, 0) } });
});

R("GET", "fr/me", async ({ env, req }) => {
  const f = await requireFr(env, req);
  const st = await one(env, "SELECT COUNT(*) n, COALESCE(SUM(total),0) total, COUNT(DISTINCT COALESCE(donor_id,id)) donatur FROM donations WHERE fundraiser_id=? AND status='paid'", f.id);
  const bulan = await one(env, `SELECT COALESCE(SUM(total),0) total FROM donations WHERE fundraiser_id=? AND status='paid' AND strftime('%Y-%m', datetime(paid_at,'${TZ}'))=strftime('%Y-%m', datetime('now','${TZ}'))`, f.id);
  const board = await all(env, "SELECT f.id,f.nama,COALESCE(SUM(d.total),0) total FROM fundraisers f LEFT JOIN donations d ON d.fundraiser_id=f.id AND d.status='paid' WHERE f.status='aktif' GROUP BY f.id ORDER BY total DESC LIMIT 50");
  const rank = board.findIndex((x) => x.id === f.id) + 1;
  const recent = await all(env, `SELECT d.nama,d.anonim,d.total,d.status,d.created_at,c.judul FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id WHERE d.fundraiser_id=? AND NOT ${TANPA_BUKTI} AND d.status IN ('paid','pending') ORDER BY d.seq DESC LIMIT 20`, f.id);
  const camps = await all(env, `SELECT ${CAMP_COLS}, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.status='aktif' ORDER BY c.unggulan DESC, c.urutan`);
  const cfg = await settings(env);
  const saldo = await saldoFr(env, f.id);
  const tarik = await all(env, "SELECT id,nominal,rekening,status,catatan,created_at,diproses_at FROM penarikan WHERE fundraiser_id=? ORDER BY id DESC LIMIT 20", f.id);
  const frRow = await one(env, "SELECT komisi_persen FROM fundraisers WHERE id=?", f.id);
  return json({ me: f, saldo, tarik, komisi: { persen: frRow?.komisi_persen ?? cfg.upah_afiliator_persen, tarik_min: cfg.tarik_min }, stat: { ...st, bulan_ini: bulan.total }, rank, peserta: board.length, apresiasi: cfg.fr_apresiasi,
    leaderboard: board.slice(0, 10).map((x, i) => ({ rank: i + 1, nama: maskName(x.nama), total: x.total, saya: x.id === f.id })),
    recent: recent.map((r) => ({ nama: maskName(r.nama, r.anonim), total: r.total, status: r.status, waktu: r.created_at, program: r.judul })),
    campaigns: camps.map(campOut) });
});

// Permintaan tarik saldo afiliator: masuk ke daftar admin dan dikirim ke WhatsApp admin
R("POST", "fr/tarik", async ({ env, ctx, req, body }) => {
  const f = await requireFr(env, req);
  const cfg = await settings(env);
  const nominal = int(body.nominal), min = Number(cfg.tarik_min) || 0;
  const rek = str(body.rekening, 120);
  if (!rek) throw bad("Isi nama bank/e-wallet dan nomor rekening tujuan.");
  if (nominal < min) throw bad(`Penarikan minimal ${rp(min)}.`);
  const s = await saldoFr(env, f.id);
  if (nominal > s.tersedia) throw bad(`Saldo tersedia ${rp(s.tersedia)}.`);
  const r = await run(env, "INSERT INTO penarikan(fundraiser_id,nominal,rekening,status,created_at) VALUES(?,?,?,'diajukan',?)", f.id, nominal, rek, nowIso());
  const link = `${new URL(req.url).origin}/admin#upah?tarik=afiliator-${r.meta.last_row_id}`;
  const pesanAdmin = `💸 Permintaan tarik saldo afiliator\n${f.nama} (kode ${f.kode})${f.wa ? " · +" + f.wa : ""}\nNominal: *${rp(nominal)}*\nRekening: ${rek}\nSisa saldo setelah ditarik: ${rp(s.tersedia - nominal)}\n\nTransfer dana, lalu setujui di sini:\n${link}`;
  const pesanFr = `Assalamu'alaikum ${f.nama},\n\nPermintaan tarik saldo *${rp(nominal)}* ke ${rek} sudah kami terima dan sedang diproses admin. Anda akan mendapat kabar lagi setelah disetujui.`;
  const tasks = Promise.all([
    cfg.wa_admin ? notifWA(env, cfg, cfg.wa_admin, pesanAdmin, "Info admin: penarikan") : null,
    f.wa ? notifWA(env, cfg, f.wa, pesanFr, "Info afiliator: penarikan") : null,
  ]).catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(tasks) : await tasks;
  return json({ ok: true, id: r.meta.last_row_id, saldo: await saldoFr(env, f.id) }, 201);
});

/* ---------- Admin: upah & penarikan ---------- */
R("GET", "admin/upah", async ({ env, req }) => {
  await requireAdmin(env, req, "keuangan");
  const cfg = await settings(env);
  const afiliator = [];
  for (const f of await all(env, "SELECT id,kode,nama,wa,status,komisi_persen FROM fundraisers ORDER BY nama")) {
    const d = await one(env, "SELECT COUNT(*) n FROM donations WHERE fundraiser_id=? AND status='paid'", f.id);
    afiliator.push({ id: f.id, kode: f.kode, nama: f.nama, wa: f.wa, status: f.status, persen: f.komisi_persen ?? cfg.upah_afiliator_persen, donasi: d.n, ...(await saldoFr(env, f.id)) });
  }
  const petugas = [];
  for (const a of await all(env, "SELECT id,nama,role,wa,upah_persen FROM admins WHERE aktif=1 AND role IN ('zisko','amplop') ORDER BY nama")) {
    const persen = a.upah_persen ?? (a.role === "zisko" ? cfg.upah_zisko_persen : 0);
    petugas.push({ id: a.id, nama: a.nama, role: a.role, wa: a.wa, persen, ...(await upahPetugas(env, a.id)), ...(await saldoPetugas(env, a.id)) });
  }
  return json({ afiliator, petugas, tarik_min: cfg.tarik_min });
});
// Daftar permintaan tarik saldo dari afiliator dan petugas ZISKO/amplop, digabung dalam satu daftar
R("GET", "admin/penarikan", async ({ env, req, u }) => {
  await requireAdmin(env, req, "keuangan");
  const st = u.searchParams.get("status") || "diajukan";
  const semua = st === "semua";
  const where = semua ? "" : "WHERE p.status=?";
  const args = semua ? [] : [st];
  return json(await all(env, `SELECT * FROM (
      SELECT 'afiliator' tipe, p.id, p.nominal, p.rekening, p.status, p.catatan, p.created_at, p.diproses_at, p.diproses_oleh, f.nama, f.kode, f.wa
        FROM penarikan p JOIN fundraisers f ON f.id=p.fundraiser_id ${where}
      UNION ALL
      SELECT 'petugas' tipe, p.id, p.nominal, p.rekening, p.status, p.catatan, p.created_at, p.diproses_at, p.diproses_oleh, a.nama, a.role kode, a.wa
        FROM penarikan_petugas p JOIN admins a ON a.id=p.admin_id ${where}
    ) ORDER BY created_at DESC, id DESC LIMIT 150`, ...args, ...args));
});
const TARIK_SEL = {
  afiliator: "SELECT p.*, f.nama, f.wa FROM penarikan p JOIN fundraisers f ON f.id=p.fundraiser_id WHERE p.id=?",
  petugas: "SELECT p.*, a.nama, a.wa FROM penarikan_petugas p JOIN admins a ON a.id=p.admin_id WHERE p.id=?",
};
const tarikDetail = async (env, tipe, id) => {
  if (!TARIK_SEL[tipe]) throw bad("Jenis penarikan tidak dikenal.");
  const t = await one(env, TARIK_SEL[tipe], int(id));
  if (!t) throw new HttpError(404, "Permintaan tidak ditemukan.");
  return { ...t, tipe };
};
const tarikTable = (tipe) => (tipe === "petugas" ? "penarikan_petugas" : "penarikan");
R("POST", "admin/penarikan/:tipe/:id/setuju", async ({ env, ctx, req, p, body }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const t = await tarikDetail(env, p.tipe, p.id);
  if (t.status !== "diajukan") throw bad("Permintaan ini sudah diproses.");
  await run(env, `UPDATE ${tarikTable(p.tipe)} SET status='disetujui', diproses_at=?, diproses_oleh=?, catatan=? WHERE id=?`, nowIso(), me.nama, str(body.catatan, 120) || null, t.id);
  const cfg = await settings(env);
  if (t.wa) { const m = sendWA(cfg, t.wa, `Assalamu'alaikum ${t.nama},\n\nPenarikan saldo Anda *${rp(t.nominal)}* telah disetujui dan dicatat oleh ${me.nama}. Dana dikirim ke: ${t.rekening}.\n\nJazakallahu khairan atas kerja sama Anda.`).catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(m) : await m; }
  return json({ ok: true });
});
R("POST", "admin/penarikan/:tipe/:id/tolak", async ({ env, ctx, req, p, body }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const t = await tarikDetail(env, p.tipe, p.id);
  if (t.status !== "diajukan") throw bad("Permintaan ini sudah diproses.");
  const alasan = str(body.alasan, 120); if (!alasan) throw bad("Isi alasan penolakan.");
  await run(env, `UPDATE ${tarikTable(p.tipe)} SET status='ditolak', diproses_at=?, diproses_oleh=?, catatan=? WHERE id=?`, nowIso(), me.nama, alasan, t.id);
  const cfg = await settings(env);
  if (t.wa) { const m = sendWA(cfg, t.wa, `Assalamu'alaikum ${t.nama},\n\nPermintaan tarik saldo *${rp(t.nominal)}* belum dapat diproses. Alasan: ${alasan}. Saldo Anda kembali tersedia. Silakan hubungi admin cabang bila ada pertanyaan.`).catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(m) : await m; }
  return json({ ok: true });
});
// Permintaan tarik upah dari petugas ZISKO/amplop (masuk daftar admin dan WA admin)
R("POST", "field/tarik", async ({ env, ctx, req, body }) => {
  const me = await requireAdmin(env, req, "slip");
  const cfg = await settings(env);
  const nominal = int(body.nominal), min = Number(cfg.tarik_min) || 0;
  const rek = str(body.rekening, 120);
  if (!rek) throw bad("Isi nama bank/e-wallet dan nomor rekening tujuan.");
  if (nominal < min) throw bad(`Penarikan minimal ${rp(min)}.`);
  const s = await saldoPetugas(env, me.id);
  if (nominal > s.tersedia) throw bad(`Saldo upah tersedia ${rp(s.tersedia)}.`);
  const r = await run(env, "INSERT INTO penarikan_petugas(admin_id,nominal,rekening,status,created_at) VALUES(?,?,?,'diajukan',?)", me.id, nominal, rek, nowIso());
  const link = `${new URL(req.url).origin}/admin#upah?tarik=petugas-${r.meta.last_row_id}`;
  const pesanAdmin = `💸 Permintaan tarik upah ${ROLES[me.role] || me.role}\n${me.nama}${me.wa ? " · +" + me.wa : ""}\nNominal: *${rp(nominal)}*\nRekening: ${rek}\nSisa upah setelah ditarik: ${rp(s.tersedia - nominal)}\n\nTransfer dana, lalu setujui di sini:\n${link}`;
  const pesanPet = `Assalamu'alaikum ${me.nama},\n\nPermintaan tarik upah *${rp(nominal)}* ke ${rek} sudah kami terima dan sedang diproses admin.`;
  const tasks = Promise.all([
    cfg.wa_admin ? notifWA(env, cfg, cfg.wa_admin, pesanAdmin, "Info admin: penarikan") : null,
    me.wa ? notifWA(env, cfg, me.wa, pesanPet, "Info petugas: penarikan") : null,
  ]).catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(tasks) : await tasks;
  return json({ ok: true, id: r.meta.last_row_id, saldo: await saldoPetugas(env, me.id) }, 201);
});

/* ---------- Admin: akun ---------- */
R("GET", "admin/status", async ({ env, req }) => {
  const n = await one(env, "SELECT COUNT(*) n FROM admins");
  let me = null; try { me = await requireAdmin(env, req, null); me.perms = permsOf(me); me.role_label = ROLES[me.role] || me.role; } catch {}
  return json({ needsSetup: !n.n, me, setupCodeRequired: !!env.SETUP_CODE, roles: ROLES });
});
R("POST", "admin/setup", async ({ env, req, body }) => {
  if ((await one(env, "SELECT COUNT(*) n FROM admins")).n) throw bad("Admin pertama sudah dibuat.");
  if (env.SETUP_CODE && body.setup_code !== env.SETUP_CODE) throw new HttpError(403, "Kode penyiapan salah.");
  const nama = str(body.nama, 60), email = str(body.email, 120).toLowerCase(), pw = String(body.password || "");
  if (!nama || !/^\S+@\S+\.\S+$/.test(email) || pw.length < 8) throw bad("Isi nama, email yang valid, dan kata sandi minimal 8 karakter.");
  const r = await run(env, "INSERT INTO admins(nama,email,pass_hash,role) VALUES(?,?,?,'admin')", nama, email, await hashPass(pw));
  return json({ ok: true }, 201, { "set-cookie": await setSession(env, req, "wiz_adm", { t: "a", id: r.meta.last_row_id }, 7) });
});
R("POST", "admin/login", async ({ env, req, body }) => {
  const idf = str(body.email, 120).toLowerCase();
  const isWa = /^[+\d\s-]{8,}$/.test(idf) && !idf.includes("@");
  const key = isWa ? waFull(idf) : idf;
  if (!key) throw bad("Isi email atau nomor WhatsApp.");
  await loginGuard(env, key);
  const a = await one(env, `SELECT id,pass_hash,aktif,role FROM admins WHERE ${isWa ? "wa" : "email"}=?`, key);
  if (!a || !(await verifyPass(String(body.password || ""), a.pass_hash))) { await loginFail(env, key); throw new HttpError(401, "Akun atau kata sandi salah."); }
  if (!a.aktif) throw new HttpError(403, "Akun ini sudah dinonaktifkan. Hubungi admin cabang.");
  await run(env, "DELETE FROM login_fail WHERE k=?", key);
  const days = ["zisko", "amplop"].includes(a.role) ? 30 : 7; // petugas lapangan tidak perlu sering masuk ulang
  return json({ ok: true }, 200, { "set-cookie": await setSession(env, req, "wiz_adm", { t: "a", id: a.id }, days) });
});
R("POST", "admin/logout", async () => json({ ok: true }, 200, { "set-cookie": "wiz_adm=; Path=/; Max-Age=0" }));
const LAPANGAN_ROLES = ["zisko", "amplop"];
const minPass = (role) => (LAPANGAN_ROLES.includes(role) ? 6 : 8);
const adminPub = (a) => ({ id: a.id, nama: a.nama, email: String(a.email).startsWith("wa:") ? "" : a.email, wa: a.wa, role: a.role === "petugas" ? "zisko" : a.role, wilayah: a.wilayah, aktif: !!a.aktif, created_at: a.created_at, upah_persen: a.upah_persen ?? null });
R("GET", "admin/admins", async ({ env, req }) => { await requireAdmin(env, req, "pengaturan"); return json((await all(env, "SELECT * FROM admins ORDER BY aktif DESC, role, nama")).map(adminPub)); });
async function adminFields(env, body, id = 0) {
  const nama = str(body.nama, 60), email = str(body.email, 120).toLowerCase(), wa = waFull(body.wa);
  const role = ROLES[body.role] ? body.role : "zisko";
  if (!nama) throw bad("Nama wajib diisi.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw bad("Format email tidak valid.");
  if (body.wa && wa.length < 11) throw bad("Nomor WhatsApp belum lengkap.");
  if (!email && !wa) throw bad("Isi email atau nomor WhatsApp untuk masuk.");
  if (email && await one(env, "SELECT id FROM admins WHERE email=? AND id!=?", email, id)) throw bad("Email sudah dipakai pengguna lain.");
  if (wa && await one(env, "SELECT id FROM admins WHERE wa=? AND id!=?", wa, id)) throw bad("Nomor WhatsApp sudah dipakai pengguna lain.");
  return { nama, email: email || "wa:" + wa, wa: wa || null, role, wilayah: str(body.wilayah, 120) || null };
}
R("POST", "admin/admins", async ({ env, req, body }) => {
  await requireAdmin(env, req, "pengaturan");
  const f = await adminFields(env, body); const pw = String(body.password || "");
  if (pw.length < minPass(f.role)) throw bad(`Kata sandi minimal ${minPass(f.role)} karakter.`);
  const r = await run(env, "INSERT INTO admins(nama,email,wa,role,wilayah,pass_hash) VALUES(?,?,?,?,?,?)", f.nama, f.email, f.wa, f.role, f.wilayah, await hashPass(pw));
  if ("upah_persen" in body) await run(env, "UPDATE admins SET upah_persen=? WHERE id=?", pctOrNull(body.upah_persen), r.meta.last_row_id);
  return json({ ok: true }, 201);
});
R("PUT", "admin/admins/:id", async ({ env, req, p, body }) => {
  const me = await requireAdmin(env, req, "pengaturan"); const id = int(p.id);
  const f = await adminFields(env, body, id);
  if (id === me.id && (f.role !== "admin" || body.aktif === false)) throw bad("Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri.");
  await run(env, "UPDATE admins SET nama=?, email=?, wa=?, role=?, wilayah=?, aktif=? WHERE id=?", f.nama, f.email, f.wa, f.role, f.wilayah, body.aktif === false ? 0 : 1, id);
  if ("upah_persen" in body) await run(env, "UPDATE admins SET upah_persen=? WHERE id=?", pctOrNull(body.upah_persen), id);
  if (body.password) {
    if (String(body.password).length < minPass(f.role)) throw bad(`Kata sandi minimal ${minPass(f.role)} karakter.`);
    await run(env, "UPDATE admins SET pass_hash=? WHERE id=?", await hashPass(String(body.password)), id);
  }
  return json({ ok: true });
});
R("DELETE", "admin/admins/:id", async ({ env, req, p }) => {
  const me = await requireAdmin(env, req, "pengaturan");
  if (int(p.id) === me.id) throw bad("Anda tidak bisa menghapus akun sendiri.");
  // Riwayat (slip, titik) tetap menyimpan nama petugas, jadi akun cukup dinonaktifkan bila sudah pernah bertugas
  const used = await one(env, "SELECT 1 x FROM slips WHERE petugas_id=? UNION SELECT 1 FROM donations WHERE petugas_id=? LIMIT 1", int(p.id), int(p.id));
  if (used) { await run(env, "UPDATE admins SET aktif=0 WHERE id=?", int(p.id)); return json({ ok: true, info: "Pengguna sudah punya riwayat tugas, jadi dinonaktifkan (tidak dihapus)." }); }
  await run(env, "DELETE FROM admins WHERE id=?", int(p.id)); return json({ ok: true, info: "Pengguna dihapus." });
});
R("POST", "admin/password", async ({ env, req, body }) => {
  const me = await requireAdmin(env, req, null);
  const a = await one(env, "SELECT pass_hash FROM admins WHERE id=?", me.id);
  if (!(await verifyPass(String(body.lama || ""), a.pass_hash))) throw bad("Kata sandi lama salah.");
  if (String(body.baru || "").length < minPass(me.role)) throw bad(`Kata sandi baru minimal ${minPass(me.role)} karakter.`);
  await run(env, "UPDATE admins SET pass_hash=? WHERE id=?", await hashPass(body.baru), me.id); return json({ ok: true });
});

/* ---------- Admin: dashboard ---------- */
R("GET", "admin/dashboard", async ({ env, ctx, req }) => {
  const me = await requireAdmin(env, req);
  const local = `datetime(paid_at,'${TZ}')`, nowL = `datetime('now','${TZ}')`;
  const sum = (where) => one(env, `SELECT COALESCE(SUM(total),0) total, COUNT(*) n FROM donations WHERE status='paid' AND ${where}`);
  const [hari, minggu, bulan, semua] = await Promise.all([
    sum(`date(${local})=date(${nowL})`), sum(`${local} >= datetime(${nowL},'-7 days')`),
    sum(`strftime('%Y-%m',${local})=strftime('%Y-%m',${nowL})`), sum("1=1")]);
  const pending = await one(env, "SELECT COUNT(*) n, COALESCE(SUM(total),0) total, SUM(bukti_id IS NOT NULL) bukti FROM donations WHERE status='pending' AND created_at > datetime('now','-3 days')");
  const jenis = await all(env, `SELECT jenis_dana, SUM(total) total FROM donations WHERE status='paid' AND strftime('%Y-%m',${local})=strftime('%Y-%m',${nowL}) GROUP BY jenis_dana`);
  const harian = await all(env, `SELECT date(${local}) tgl, SUM(total) total, COUNT(*) n FROM donations WHERE status='paid' AND ${local} >= date(${nowL},'-29 days') GROUP BY tgl ORDER BY tgl`);
  const perProgram = await all(env, `SELECT c.judul, SUM(d.total) total, COUNT(*) n FROM donations d JOIN campaigns c ON c.id=d.campaign_id WHERE d.status='paid' AND strftime('%Y-%m',datetime(d.paid_at,'${TZ}'))=strftime('%Y-%m',${nowL}) GROUP BY c.id ORDER BY total DESC LIMIT 8`);
  const perMetode = await all(env, `SELECT metode, SUM(total) total, COUNT(*) n FROM donations WHERE status='paid' AND strftime('%Y-%m',${local})=strftime('%Y-%m',${nowL}) GROUP BY metode ORDER BY total DESC`);
  const topFr = await all(env, `SELECT f.nama, f.kode, SUM(d.total) total, COUNT(*) n FROM donations d JOIN fundraisers f ON f.id=d.fundraiser_id WHERE d.status='paid' AND strftime('%Y-%m',datetime(d.paid_at,'${TZ}'))=strftime('%Y-%m',${nowL}) GROUP BY f.id ORDER BY total DESC LIMIT 5`);
  const donatur = await one(env, `SELECT COUNT(DISTINCT donor_id) aktif FROM donations WHERE status='paid' AND donor_id IS NOT NULL AND strftime('%Y-%m',${local})=strftime('%Y-%m',${nowL})`);
  const donaturBaru = await one(env, `SELECT COUNT(*) n FROM donors WHERE strftime('%Y-%m',datetime(created_at,'${TZ}'))=strftime('%Y-%m',${nowL})`);
  const recent = await all(env, DON_SELECT + " ORDER BY d.seq DESC LIMIT 15");
  const pundiBaru = await one(env, "SELECT COUNT(*) n FROM pundi WHERE status='baru'");
  // Deteksi anomali kotak amal: setoran terakhir < 50% rata-rata sebelumnya
  const kotakRows = await all(env, "SELECT kotak_kode k, total, paid_at FROM donations WHERE status='paid' AND kotak_kode IS NOT NULL ORDER BY paid_at");
  const byK = {}; kotakRows.forEach((r) => (byK[r.k] ||= []).push(r));
  const anomali = Object.entries(byK).filter(([, a]) => a.length >= 3).map(([k, a]) => {
    const last = a[a.length - 1], prev = a.slice(0, -1), avg = prev.reduce((s, x) => s + x.total, 0) / prev.length;
    return { kode: k, terakhir: last.total, rata: Math.round(avg), tanggal: last.paid_at };
  }).filter((x) => x.terakhir < x.rata * 0.5);
  const lastSeq = (await one(env, "SELECT MAX(seq) s FROM donations"))?.s || 0;
  const ds = await driveStatus(env);
  const aktif = ds.drives.find((d) => d.status === "aktif");
  const lastAt = ds.last_sync ? new Date(ds.last_sync.at).getTime() : 0;
  if (aktif && ds.antrean + ds.media_antre > 0 && Date.now() - lastAt > 10 * 60e3) { const t = syncAndNotify(env); ctx?.waitUntil ? ctx.waitUntil(t) : t.catch(() => {}); }
  const drive = { alert: ds.alert, aktif: aktif ? { email: aktif.email, pct: aktif.pct } : null, cadangan: ds.drives.filter((d) => d.status === "cadangan").length, error: ds.last_error };
  // Lapangan: uang yang masih dipegang petugas & status jemput bulan ini
  const kas = await one(env, "SELECT COALESCE(SUM(total),0) total, COUNT(DISTINCT slip_no) slip, COUNT(DISTINCT petugas_id) petugas FROM donations WHERE serah='petugas' AND status='paid'");
  const jemput = {};
  try { (await FIELD.titikList(env, me, await settings(env))).items.filter((i) => i.t !== "amplop").forEach((i) => (jemput[i.status] = (jemput[i.status] || 0) + 1)); } catch {}
  return json({ hari, minggu, bulan, semua, pending, jenis, harian, perProgram, perMetode, topFr, donatur: { aktif: donatur.aktif, baru: donaturBaru.n },
    recent: recent.map(adminDon), pundiBaru: pundiBaru.n, anomali, lastSeq, drive, kas, jemput });
});
const adminDon = (d) => ({ komisi: d.status === "paid" ? komisiRp(d) : 0, fundraiser_id: d.fundraiser_id, seq: d.seq, id: d.id, status: d.status, total: d.total, nominal: d.nominal, kode_unik: d.kode_unik, metode: d.metode, kanal: d.kanal,
  jenis_dana: d.jenis_dana, program: d.judul, campaign_id: d.campaign_id, nama: d.nama, sapaan: d.sapaan, anonim: !!d.anonim, wa: d.wa, doa: d.doa,
  fundraiser: d.fr_nama, kotak_kode: d.kotak_kode, pundi_kode: d.pundi_kode, petugas: d.petugas, catatan: d.catatan, bukti_id: d.bukti_id,
  created_at: d.created_at, paid_at: d.paid_at, ingat_at: d.ingat_at, klaim_at: d.klaim_at, bukti_gagal: d.bukti_gagal, donor_id: d.donor_id, slip_no: d.slip_no, serah: d.serah, serah_oleh: d.serah_oleh });

/* ---------- Admin: donasi ---------- */
function donFilter(u) {
  const w = [], a = [];
  const s = (k) => u.searchParams.get(k);
  // Transfer/QRIS tanpa bukti disembunyikan, kecuali dicari atau dipilih lewat filter "Belum kirim bukti"
  if (s("status") === "tanpa_bukti") w.push(TANPA_BUKTI);
  else if (s("status")) { w.push("d.status=?"); a.push(s("status")); }
  if (s("status") !== "tanpa_bukti" && !s("q") && !s("semua")) w.push(`NOT ${TANPA_BUKTI}`);
  // Kategori: "zisko" = Pundi Sedekah (slip ZISKO); daftar Donasi biasa hanya program lain
  if (s("sumber") === "zisko") w.push(ZISKO_SQL);
  else if (!s("semua")) w.push(`NOT ${ZISKO_SQL}`);
  if (s("jenis")) { w.push("d.jenis_dana=?"); a.push(s("jenis")); }
  if (s("campaign")) { w.push("d.campaign_id=?"); a.push(int(s("campaign"))); }
  if (s("metode")) { w.push("d.metode=?"); a.push(s("metode")); }
  if (s("fundraiser")) { w.push("d.fundraiser_id=?"); a.push(int(s("fundraiser"))); }
  if (s("dari")) { w.push(`date(datetime(COALESCE(d.paid_at,d.created_at),'${TZ}'))>=?`); a.push(s("dari")); }
  if (s("sampai")) { w.push(`date(datetime(COALESCE(d.paid_at,d.created_at),'${TZ}'))<=?`); a.push(s("sampai")); }
  if (s("q")) { const q = s("q"), angka = int(q.replace(/[^\d]/g, ""));
    w.push("(d.nama LIKE ? OR d.wa LIKE ? OR d.id LIKE ? OR d.kotak_kode LIKE ? OR d.pundi_kode LIKE ? OR d.slip_no LIKE ? OR (?>0 AND d.total=?))"); const k = "%" + q + "%"; a.push(k, k, k, k, k, k, /^[\d.\s,rp]+$/i.test(q) ? angka : 0, angka); }
  return { where: w.length ? " WHERE " + w.join(" AND ") : "", args: a };
}
R("GET", "admin/donations", async ({ env, req, u }) => {
  await requireAdmin(env, req);
  await kedaluwarsaManual(env).catch(() => {});
  await ingatkanBukti(env, u.origin).catch(() => {});
  const { where, args } = donFilter(u); const page = Math.max(1, int(u.searchParams.get("page")) || 1);
  const rows = await all(env, DON_SELECT + where + " ORDER BY d.seq DESC LIMIT 50 OFFSET ?", ...args, (page - 1) * 50);
  const agg = await one(env, `SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN d.status='paid' THEN d.total END),0) paid FROM donations d` + where, ...args);
  const tb = await one(env, `SELECT COUNT(*) n FROM donations d WHERE ${TANPA_BUKTI} AND d.status='pending'`);
  return json({ rows: rows.map(adminDon), total: agg.n, paid: agg.paid, page, tanpa_bukti: tb.n });
});
R("POST", "admin/donations", async ({ env, ctx, req, body }) => {
  const me = await requireAdmin(env, req, "catat");
  return json(await createDonation(env, ctx, req, body, { offline: true, admin: me }), 201);
});
// Pembatalan donasi (termasuk yang sudah lunas). Semua angka — terkumpul program, donasi masuk & komisi afiliator,
// statistik — dihitung dari donasi berstatus lunas, jadi begitu dibatalkan semuanya ikut terkoreksi.
// Donasi dari slip ZISKO/relawan dibatalkan lewat slip-nya agar upah petugas ikut terkoreksi.
async function slipAktif(env, d) {
  if (!d.slip_no) return null;
  const s = await one(env, "SELECT no,batal FROM slips WHERE no=?", d.slip_no);
  return s && !s.batal ? s : null;
}
async function batalkanDonasi(env, ctx, req, me, d, alasan, label = "dibatalkan") {
  const s = await slipAktif(env, d);
  if (s) throw bad(`Donasi ini bagian dari slip ${s.no} (setoran ZISKO/relawan). Batalkan slip-nya agar upah petugas ikut terkoreksi.`);
  const lunas = d.status === "paid";
  await run(env, "UPDATE donations SET status='cancelled', paid_at=NULL, serah=NULL, catatan=TRIM(COALESCE(catatan,'')||?) WHERE id=?", ` · ${label} ${me.nama}${alasan ? ": " + alasan : ""}`, d.id);
  await enqueue(env, "donasi", d.id);
  const komisi = lunas ? komisiRp(d) : 0;
  // Kabari afiliator bila donasi lunas lewat tautannya dibatalkan (sebelumnya ia sudah menerima kabar lunas)
  if (lunas && d.fundraiser_id) {
    const fr = await one(env, "SELECT nama,wa FROM fundraisers WHERE id=?", d.fundraiser_id);
    if (fr?.wa) {
      const cfg = await settings(env), origin = new URL(req.url).origin;
      const pesan = `Assalamu'alaikum ${fr.nama},\n\nMohon maaf, satu donasi lewat tautan Anda *dibatalkan* oleh admin WIZ ${cfg.cabang || ""}:\n• No. ${d.id}\n• ${rp(d.total)}${alasan ? `\n• Alasan: ${alasan}` : ""}${komisi ? `\n\nKomisi ${rp(komisi)} dari donasi ini ikut dibatalkan.` : ""}\n\nCek dasbor Anda: ${origin}/#/mitra`;
      const job = notifWA(env, cfg, fr.wa, pesan, "Donasi dibatalkan").catch(() => {});
      ctx?.waitUntil ? ctx.waitUntil(job) : await job;
    }
  }
  return { lunas, komisi };
}
const infoBatal = (r) => r.lunas ? `Donasi dibatalkan. Terkumpul program, donasi masuk${r.komisi ? `, dan komisi afiliator (${rp(r.komisi)})` : " dan komisi"} sudah dikoreksi.` : "Donasi dibatalkan.";
R("POST", "admin/donations/:id/status", async ({ env, ctx, req, p, body }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const st = body.status;
  if (st === "paid") { const ok = await markPaid(env, ctx, req, p.id, null); return json({ ok, info: ok ? "Ditandai lunas, notifikasi dikirim." : "Sudah lunas sebelumnya." }); }
  if (!["cancelled", "pending"].includes(st)) throw bad("Status tidak dikenal.");
  const d = await one(env, "SELECT * FROM donations WHERE id=?", p.id);
  if (!d) throw new HttpError(404, "Transaksi tidak ditemukan.");
  if (st === "cancelled") {
    if (d.status === "cancelled") return json({ ok: true, info: "Sudah dibatalkan sebelumnya." });
    return json({ ok: true, info: infoBatal(await batalkanDonasi(env, ctx, req, me, d, str(body.alasan, 120))) });
  }
  if (await slipAktif(env, d)) throw bad("Donasi dari slip setoran tidak bisa diubah ke menunggu.");
  await run(env, "UPDATE donations SET status='pending', paid_at=NULL WHERE id=?", p.id); await enqueue(env, "donasi", p.id); return json({ ok: true });
});
// Hapus permanen. Donasi lunas dibatalkan dulu (koreksi komisi & kabar afiliator), lalu barisnya di Google Sheet ditandai "dihapus".
R("DELETE", "admin/donations/:id", async ({ env, ctx, req, p, u }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const d = await one(env, "SELECT d.*, c.judul, f.nama fr FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id LEFT JOIN fundraisers f ON f.id=d.fundraiser_id WHERE d.id=?", p.id);
  if (!d) throw new HttpError(404, "Transaksi tidak ditemukan.");
  const s = await slipAktif(env, d);
  if (s) throw bad(`Transaksi ini bagian dari slip ${s.no}. Batalkan slip-nya dulu agar upah petugas ikut terkoreksi.`);
  const alasan = str(u.searchParams.get("alasan"), 120);
  let r = { lunas: false, komisi: 0 };
  if (d.status === "paid") r = await batalkanDonasi(env, ctx, req, me, d, alasan, "dihapus");
  const jejak = { ...d, catatan: `${d.catatan || ""} · dihapus ${me.nama}${alasan ? ": " + alasan : ""}`.replace(/^ · /, "") };
  await run(env, "DELETE FROM donations WHERE id=?", p.id);
  if (d.status === "paid" || d.status === "cancelled") { const job = tandaiDonasiDihapus(env, jejak); ctx?.waitUntil ? ctx.waitUntil(job) : await job; }
  return json({ ok: true, info: r.lunas ? infoBatal(r).replace("Donasi dibatalkan.", "Donasi dihapus.") : "Transaksi dihapus." });
});
R("POST", "admin/donations/:id/resend", async ({ env, req, p }) => {
  await requireAdmin(env, req, "catat");
  const cfg = await settings(env); const d = await one(env, DON_SELECT + " WHERE d.id=?", p.id);
  if (!d || d.status !== "paid" || !d.wa) throw bad("Hanya donasi lunas dengan nomor WhatsApp yang bisa dikirimi kuitansi.");
  const r = await sendWA(cfg, d.wa, msgKuitansi(cfg, d, d.judul, `${new URL(req.url).origin}/#/kuitansi/${d.id}`));
  if (!r.ok) throw bad("WhatsApp gagal terkirim: " + r.reason);
  return json({ ok: true });
});
R("GET", "admin/media/:id", async ({ env, req, p }) => {
  const me = await requireAdmin(env, req, null);
  if (!["lihat", "slip", "lapangan", "peta"].some((x) => can(me, x))) throw new HttpError(403, "Tidak ada akses.");
  return serveMedia(env, p.id, "private, max-age=86400");
});
// Gambar pratinjau tautan (JPEG 1200×630) yang dibuat browser admin dari gambar utama
R("POST", "admin/og", async ({ env, req, body }) => {
  await requireAdmin(env, req);
  const tabel = body.jenis === "berita" ? "articles" : body.jenis === "program" ? "campaigns" : null;
  if (!tabel) throw bad("Jenis tidak dikenal.");
  if (!/^data:image\/jpeg;base64,/.test(String(body.gambar || ""))) throw bad("Gambar pratinjau harus JPEG.");
  const row = await one(env, `SELECT id, cover_id FROM ${tabel} WHERE id=?`, int(body.id));
  if (!row) throw new HttpError(404, "Data tidak ditemukan.");
  const mid = await saveMedia(env, body.gambar, 0);
  await run(env, `UPDATE ${tabel} SET og_id=?, og_src=? WHERE id=?`, mid, int(body.src) || row.cover_id, row.id);
  return json({ ok: true, id: mid });
});
R("POST", "admin/media", async ({ env, req, body }) => { await requireAdmin(env, req, "slip"); return json({ id: await saveMedia(env, body.gambar, 0) }, 201); });

/* ---------- Admin: campaign ---------- */
R("GET", "admin/campaigns", async ({ env, req }) => {
  await requireAdmin(env, req);
  const rows = await all(env, `SELECT ${CAMP_COLS}, c.cerita, t.terkumpul, t.donatur FROM campaigns c ${campTotalsAll} ORDER BY c.status='aktif' DESC, c.unggulan DESC, c.urutan, c.id`);
  return json(rows.map((c) => ({ ...campOut(c), cerita: c.cerita, komisi_persen: c.komisi_persen })));
});
async function campFields(env, b, id = null) {
  const judul = str(b.judul, 120); if (!judul) throw bad("Judul program wajib diisi.");
  let slug = slugify(b.slug || judul) || "program";
  for (let i = 2; await one(env, "SELECT id FROM campaigns WHERE slug=? AND id!=?", slug, id || 0); i++) slug = slugify(b.slug || judul) + "-" + i;
  const jenis = ["zakat", "infak", "wakaf", "fidyah"].includes(b.jenis_dana) ? b.jenis_dana : "infak";
  const status = ["aktif", "draft", "selesai"].includes(b.status) ? b.status : "aktif";
  const batas = /^\d{4}-\d{2}-\d{2}$/.test(b.batas || "") ? b.batas : null;
  return [slug, judul, str(b.ringkas, 160), str(b.cerita, 20000), jenis, str(b.kategori, 40), str(b.ikon, 20) || "heart", Math.max(0, int(b.target)), batas,
    int(b.cover_id) || galeriIds(b.galeri)[0] || null, status, b.unggulan ? 1 : 0, int(b.urutan) || 100, JSON.stringify(galeriIds(b.galeri)), pctOrNull(b.komisi_persen)];
}
R("POST", "admin/campaigns", async ({ env, req, body }) => {
  await requireAdmin(env, req, "program");
  const f = await campFields(env, body);
  const r = await run(env, "INSERT INTO campaigns(slug,judul,ringkas,cerita,jenis_dana,kategori,ikon,target,batas,cover_id,status,unggulan,urutan,galeri,komisi_persen) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", ...f);
  return json({ id: r.meta.last_row_id, slug: f[0] }, 201);
});
R("PUT", "admin/campaigns/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "program");
  const f = await campFields(env, body, int(p.id));
  await run(env, "UPDATE campaigns SET slug=?,judul=?,ringkas=?,cerita=?,jenis_dana=?,kategori=?,ikon=?,target=?,batas=?,cover_id=?,status=?,unggulan=?,urutan=?,galeri=?,komisi_persen=?,updated_at=datetime('now') WHERE id=?", ...f, int(p.id));
  return json({ ok: true, slug: f[0] });
});
R("DELETE", "admin/campaigns/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "program");
  if (await one(env, "SELECT seq FROM donations WHERE campaign_id=? LIMIT 1", int(p.id))) {
    await run(env, "UPDATE campaigns SET status='selesai' WHERE id=?", int(p.id));
    return json({ ok: true, info: "Program sudah memiliki donasi, jadi ditandai selesai (tidak dihapus)." });
  }
  await run(env, "DELETE FROM campaigns WHERE id=?", int(p.id)); return json({ ok: true, info: "Program dihapus." });
});
R("GET", "admin/campaigns/:id/updates", async ({ env, req, p }) => { await requireAdmin(env, req); return json(await all(env, "SELECT * FROM campaign_updates WHERE campaign_id=? ORDER BY id DESC", int(p.id))); });
R("POST", "admin/campaigns/:id/updates", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "program"); const judul = str(body.judul, 140); if (!judul) throw bad("Judul kabar wajib diisi.");
  await run(env, "INSERT INTO campaign_updates(campaign_id,judul,isi) VALUES(?,?,?)", int(p.id), judul, str(body.isi, 5000)); return json({ ok: true }, 201);
});
R("DELETE", "admin/updates/:id", async ({ env, req, p }) => { await requireAdmin(env, req, "program"); await run(env, "DELETE FROM campaign_updates WHERE id=?", int(p.id)); return json({ ok: true }); });

/* ---------- Admin: donatur (CRM) ---------- */
const DONOR_AGG = `SELECT o.*, COUNT(x.seq) n, COALESCE(SUM(x.total),0) total, MAX(x.paid_at) terakhir, MIN(x.paid_at) pertama,
  COALESCE(SUM(CASE WHEN x.jenis_dana='zakat' THEN x.total END),0) zakat FROM donors o LEFT JOIN donations x ON x.donor_id=o.id AND x.status='paid'`;
function segmenOf(r) {
  if (!r.n) return "belum";
  const days = (Date.now() - new Date(r.terakhir.replace(" ", "T") + "Z")) / 864e5;
  if (days > 90) return "tidur";
  if ((Date.now() - new Date(r.pertama.replace(" ", "T") + "Z")) / 864e5 <= 30) return "baru";
  return r.n >= 3 ? "setia" : "aktif";
}
async function donorRows(env, u) {
  const w = [], a = []; const qv = u.searchParams.get("q");
  if (qv) { w.push("(o.nama LIKE ? OR o.wa LIKE ? OR o.kelurahan LIKE ? OR o.kecamatan LIKE ? OR o.pekerjaan LIKE ?)"); const k = "%" + qv + "%"; a.push(k, k, k, k, k); }
  const rows = await all(env, DONOR_AGG + (w.length ? " WHERE " + w.join(" AND ") : "") + " GROUP BY o.id ORDER BY total DESC, o.id DESC LIMIT 2000", ...a);
  const seg = u.searchParams.get("segmen");
  return rows.map((r) => ({ ...r, segmen: segmenOf(r) })).filter((r) => !seg || r.segmen === seg);
}
R("GET", "admin/donors", async ({ env, req, u }) => {
  await requireAdmin(env, req);
  const rows = await donorRows(env, u); const page = Math.max(1, int(u.searchParams.get("page")) || 1);
  const seg = {}; rows.forEach((r) => (seg[r.segmen] = (seg[r.segmen] || 0) + 1));
  return json({ rows: rows.slice((page - 1) * 50, page * 50), total: rows.length, segmen: seg, page });
});
R("GET", "admin/donors/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req);
  const d = await one(env, DONOR_AGG + " WHERE o.id=? GROUP BY o.id", int(p.id)); if (!d) throw new HttpError(404, "Donatur tidak ditemukan.");
  const hist = await all(env, DON_SELECT + " WHERE d.donor_id=? ORDER BY d.seq DESC LIMIT 200", int(p.id));
  return json({ ...d, segmen: segmenOf(d), riwayat: hist.map(adminDon) });
});
R("PUT", "admin/donors/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "crm");
  const f = ["nama", "sapaan", "email", "alamat", "kelurahan", "kecamatan", "pekerjaan", "kategori", "catatan"];
  await run(env, `UPDATE donors SET ${f.map((k) => k + "=?").join(",")}, updated_at=datetime('now') WHERE id=?`, ...f.map((k) => str(body[k], k === "catatan" || k === "alamat" ? 500 : 80) || null), int(p.id));
  await enqueue(env, "donatur", int(p.id));
  return json({ ok: true });
});
R("POST", "admin/donors", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm"); const wa = waFull(body.wa); if (wa.length < 11) throw bad("Nomor WhatsApp wajib dan harus valid.");
  const id = await upsertDonor(env, wa, { nama: str(body.nama, 80), sapaan: str(body.sapaan, 10), alamat: str(body.alamat, 300), kelurahan: str(body.kelurahan, 60), kecamatan: str(body.kecamatan, 60), pekerjaan: str(body.pekerjaan, 60), email: str(body.email, 120) });
  return json({ id }, 201);
});

/* ---------- Admin: fundraiser ---------- */
R("GET", "admin/fundraisers", async ({ env, req }) => {
  await requireAdmin(env, req);
  return json(await all(env, `SELECT f.id,f.kode,f.nama,f.wa,f.kota,f.status,f.created_at,f.komisi_persen, COUNT(d.seq) n, COALESCE(SUM(d.total),0) total, COUNT(DISTINCT d.donor_id) donatur
    FROM fundraisers f LEFT JOIN donations d ON d.fundraiser_id=f.id AND d.status='paid' GROUP BY f.id ORDER BY total DESC, f.id DESC`));
});
R("PUT", "admin/fundraisers/:id", async ({ env, req, p, body }) => {
  const me = await requireAdmin(env, req, "crm");
  if ("komisi_persen" in body) { if (me.role !== "admin") throw new HttpError(403, "Hanya admin yang mengatur persen komisi."); await run(env, "UPDATE fundraisers SET komisi_persen=? WHERE id=?", pctOrNull(body.komisi_persen), int(p.id)); }
  if (body.status) { await run(env, "UPDATE fundraisers SET status=? WHERE id=?", body.status === "aktif" ? "aktif" : "nonaktif", int(p.id)); await enqueue(env, "fundraiser", (await one(env, "SELECT kode FROM fundraisers WHERE id=?", int(p.id)))?.kode); }
  if (body.pin) { if (!/^\d{6}$/.test(body.pin)) throw bad("PIN harus 6 angka."); await run(env, "UPDATE fundraisers SET pin_hash=? WHERE id=?", await hashPass(body.pin), int(p.id)); }
  return json({ ok: true });
});

/* ---------- Admin: pundi & kotak ---------- */
R("GET", "admin/pundi", async ({ env, req }) => {
  await requireAdmin(env, req, "lapangan");
  return json(await all(env, `SELECT p.*, (SELECT COALESCE(SUM(total),0) FROM donations WHERE pundi_kode=p.kode AND status='paid') total,
    (SELECT MAX(paid_at) FROM donations WHERE pundi_kode=p.kode AND status='paid') terakhir FROM pundi p ORDER BY p.status='baru' DESC, p.id DESC`));
});
R("PUT", "admin/pundi/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "titik");
  const kode = str(body.kode, 20).toUpperCase() || null;
  if (kode && await one(env, "SELECT id FROM pundi WHERE kode=? AND id!=?", kode, int(p.id))) throw bad("Kode pundi sudah dipakai.");
  const st = ["baru", "diantar", "aktif", "berhenti"].includes(body.status) ? body.status : "baru";
  await run(env, "UPDATE pundi SET kode=?, status=?, petugas=? WHERE id=?", kode, st, str(body.petugas, 60) || null, int(p.id));
  await enqueue(env, "pundi", int(p.id));
  return json({ ok: true });
});
R("GET", "admin/kotak", async ({ env, req }) => {
  await requireAdmin(env, req, "lapangan");
  return json(await all(env, `SELECT k.*, COUNT(d.seq) n, COALESCE(SUM(d.total),0) total, MAX(d.paid_at) terakhir FROM kotak k
    LEFT JOIN donations d ON d.kotak_kode=k.kode AND d.status='paid' GROUP BY k.id ORDER BY k.kode`));
});
R("POST", "admin/kotak", async ({ env, req, body }) => {
  await requireAdmin(env, req, "titik");
  let kode = str(body.kode, 20).toUpperCase();
  if (!kode) { const n = (await one(env, "SELECT COUNT(*) n FROM kotak")).n + 1; kode = "K-" + String(n).padStart(3, "0"); while (await one(env, "SELECT id FROM kotak WHERE kode=?", kode)) kode = "K-" + String(Math.floor(Math.random() * 900) + 100); }
  if (!str(body.nama_lokasi)) throw bad("Nama lokasi wajib diisi.");
  if (await one(env, "SELECT id FROM kotak WHERE kode=?", kode)) throw bad("Kode kotak sudah dipakai.");
  await run(env, "INSERT INTO kotak(kode,nama_lokasi,alamat,pemilik,wa_pemilik,pj) VALUES(?,?,?,?,?,?)", kode, str(body.nama_lokasi, 100), str(body.alamat, 200), str(body.pemilik, 60), waFull(body.wa_pemilik) || null, str(body.pj, 60));
  await enqueue(env, "kotak", kode);
  return json({ ok: true, kode }, 201);
});
R("PUT", "admin/kotak/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "titik");
  await run(env, "UPDATE kotak SET nama_lokasi=?, alamat=?, pemilik=?, wa_pemilik=?, pj=?, status=? WHERE id=?", str(body.nama_lokasi, 100), str(body.alamat, 200), str(body.pemilik, 60),
    waFull(body.wa_pemilik) || null, str(body.pj, 60), body.status === "nonaktif" ? "nonaktif" : "aktif", int(p.id));
  await enqueue(env, "kotak", (await one(env, "SELECT kode FROM kotak WHERE id=?", int(p.id)))?.kode);
  return json({ ok: true });
});
R("GET", "public/kotak/:kode", async ({ env, p }) => {
  const k = await one(env, "SELECT kode,nama_lokasi FROM kotak WHERE kode=? AND status='aktif'", p.kode.toUpperCase()); return json(k || null);
});

/* ---------- Dokumentasi penyaluran (artikel) ---------- */
// Tautan video selain YouTube yang bisa diputar langsung di halaman (embed)
function videoEmbed(u) {
  let x; try { x = new URL(u); } catch { return null; }
  const host = x.hostname.replace(/^(www\.|m\.|web\.)/, ""), path = x.pathname;
  let m;
  if (host === "drive.google.com" && (m = /\/file\/d\/([\w-]{10,})/.exec(path) || (/^\/open/.test(path) && x.searchParams.get("id") && [0, x.searchParams.get("id")])))
    return { src: `https://drive.google.com/file/d/${m[1]}/preview`, rasio: "16/9", host: "Google Drive" };
  if ((host === "facebook.com" || host === "fb.watch") && (host === "fb.watch" || /\/(videos?|reel|watch|share\/[rv])\b/.test(path) || x.searchParams.get("v")))
    return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`, rasio: /\/reel|share\/r/.test(path) ? "9/16" : "16/9", host: "Facebook" };
  if (host === "tiktok.com" && (m = /\/video\/(\d{8,})/.exec(path)))
    return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, rasio: "9/16", host: "TikTok" };
  if (host === "instagram.com" && (m = /\/(reel|reels|p|tv)\/([\w-]{5,})/.exec(path)))
    return { src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed`, rasio: "9/16", host: "Instagram" };
  if (host === "vimeo.com" && (m = /^\/(\d{5,})/.exec(path)))
    return { src: `https://player.vimeo.com/video/${m[1]}`, rasio: "16/9", host: "Vimeo" };
  return null;
}
const ytId = (u) => (String(u).match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/) || [])[1] || null;
function cleanBlocks(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 80).map((b) => {
    const t = b?.t;
    if (t === "p" || t === "h") { const text = str(b.text, t === "h" ? 160 : 6000); return text ? { t, text } : null; }
    if (t === "quote") { const text = str(b.text, 1000); return text ? { t, text, by: str(b.by, 80) } : null; }
    if (t === "img") { const id = int(b.media_id); return id ? { t, media_id: id, caption: str(b.caption, 200) } : null; }
    if (t === "video") {
      const url = str(b.url, 400);
      if (!url || !(/^https:\/\//.test(url) || /^\/api\/file\/[\w.-]+$/.test(url))) return null;
      return { t, url, caption: str(b.caption, 200) };
    }
    return null;
  }).filter(Boolean);
}
function blocksOut(blocks) {
  return (blocks || []).map((b) => {
    if (b.t === "img") return { t: "img", src: `/api/media/${b.media_id}`, caption: b.caption };
    if (b.t === "video") {
      const yt = ytId(b.url);
      if (yt) return { t: "video", kind: "youtube", id: yt, tegak: /\/shorts\//.test(b.url), caption: b.caption };
      const em = videoEmbed(b.url);
      if (em) return { t: "video", kind: "embed", ...em, url: b.url, caption: b.caption };
      if (b.url.startsWith("/api/file/")) return { t: "video", kind: "file", src: b.url, caption: b.caption };
      let host = ""; try { host = new URL(b.url).hostname.replace(/^www\./, ""); } catch {}
      return { t: "video", kind: "link", url: b.url, host, caption: b.caption };
    }
    return b;
  });
}
const ART_COLS = `a.id,a.slug,a.judul,a.ringkas,a.cover_id,a.galeri,a.og_id,a.og_src,a.campaign_id,a.lokasi,a.tanggal,a.penerima,a.tersalur,a.status,a.created_at,a.updated_at,c.judul program,c.slug program_slug`;
const artCard = (a) => ({ ...a, cover: a.cover_id ? `/api/media/${a.cover_id}` : null, galeri: galeriUrls(a.cover_id, a.galeri), galeri_ids: galeriIds(a.galeri) });
R("GET", "public/articles", async ({ env, u }) => {
  const w = ["a.status='terbit'"], args = [];
  const camp = u.searchParams.get("campaign");
  if (camp) { w.push("c.slug=?"); args.push(camp); }
  const lim = Math.min(50, int(u.searchParams.get("limit")) || 20);
  const rows = await all(env, `SELECT ${ART_COLS} FROM articles a LEFT JOIN campaigns c ON c.id=a.campaign_id WHERE ${w.join(" AND ")} ORDER BY COALESCE(a.tanggal, date(a.created_at)) DESC, a.id DESC LIMIT ?`, ...args, lim);
  return json(rows.map(artCard));
});
R("GET", "public/articles/:slug", async ({ env, p }) => {
  const a = await one(env, `SELECT ${ART_COLS}, a.blocks FROM articles a LEFT JOIN campaigns c ON c.id=a.campaign_id WHERE a.slug=? AND a.status='terbit'`, p.slug);
  if (!a) throw new HttpError(404, "Berita tidak ditemukan.");
  const lain = await all(env, `SELECT ${ART_COLS} FROM articles a LEFT JOIN campaigns c ON c.id=a.campaign_id WHERE a.status='terbit' AND a.id!=? ORDER BY (a.campaign_id IS ?) DESC, a.id DESC LIMIT 3`, a.id, a.campaign_id);
  return json({ ...artCard(a), blocks: blocksOut(JSON.parse(a.blocks || "[]")), lain: lain.map(artCard) });
});
const requireEditor = (env, req) => requireAdmin(env, req, "dokumentasi");
R("GET", "admin/articles", async ({ env, req }) => {
  await requireAdmin(env, req);
  return json((await all(env, `SELECT ${ART_COLS} FROM articles a LEFT JOIN campaigns c ON c.id=a.campaign_id ORDER BY a.id DESC`)).map(artCard));
});
R("GET", "admin/articles/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req);
  const a = await one(env, `SELECT ${ART_COLS}, a.blocks FROM articles a LEFT JOIN campaigns c ON c.id=a.campaign_id WHERE a.id=?`, int(p.id));
  if (!a) throw new HttpError(404, "Berita tidak ditemukan.");
  return json({ ...artCard(a), blocks: JSON.parse(a.blocks || "[]") });
});
async function artFields(env, b, id = null) {
  const judul = str(b.judul, 160); if (!judul) throw bad("Judul wajib diisi.");
  const blocks = cleanBlocks(b.blocks);
  let slug = slugify(judul) || "berita";
  for (let i = 2; await one(env, "SELECT id FROM articles WHERE slug=? AND id!=?", slug, id || 0); i++) slug = slugify(judul) + "-" + i;
  const firstImg = blocks.find((x) => x.t === "img")?.media_id || null;
  const ringkas = str(b.ringkas, 220) || (blocks.find((x) => x.t === "p")?.text || "").replace(/\*\*/g, "").replace(/\s+/g, " ").slice(0, 200);
  const gal = galeriIds(b.galeri);
  return [slug, judul, ringkas, int(b.cover_id) || gal[0] || firstImg, int(b.campaign_id) || null, JSON.stringify(blocks), str(b.lokasi, 120) || null,
    /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal || "") ? b.tanggal : null, Math.max(0, int(b.penerima)), Math.max(0, int(b.tersalur)), b.status === "terbit" ? "terbit" : "draf", JSON.stringify(gal)];
}
R("POST", "admin/articles", async ({ env, req, body }) => {
  const me = await requireEditor(env, req);
  const f = await artFields(env, body);
  const r = await run(env, "INSERT INTO articles(slug,judul,ringkas,cover_id,campaign_id,blocks,lokasi,tanggal,penerima,tersalur,status,galeri,penulis) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", ...f, me.nama);
  return json({ id: r.meta.last_row_id, slug: f[0] }, 201);
});
R("PUT", "admin/articles/:id", async ({ env, req, p, body }) => {
  await requireEditor(env, req);
  const f = await artFields(env, body, int(p.id));
  await run(env, "UPDATE articles SET slug=?,judul=?,ringkas=?,cover_id=?,campaign_id=?,blocks=?,lokasi=?,tanggal=?,penerima=?,tersalur=?,status=?,galeri=?,updated_at=datetime('now') WHERE id=?", ...f, int(p.id));
  return json({ ok: true, slug: f[0] });
});
R("DELETE", "admin/articles/:id", async ({ env, req, p }) => { await requireEditor(env, req); await run(env, "DELETE FROM articles WHERE id=?", int(p.id)); return json({ ok: true }); });

/* Unggah video ke Cloudflare R2 (opsional, binding MEDIA) */
const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
R("POST", "admin/video", async ({ env, req }) => {
  await requireEditor(env, req);
  if (!env.MEDIA) throw bad("Penyimpanan video belum diaktifkan. Pakai tautan YouTube, atau aktifkan R2 (lihat panduan).");
  const type = (req.headers.get("content-type") || "").split(";")[0];
  if (!VIDEO_TYPES[type]) throw bad("Format video harus MP4, WebM, atau MOV.");
  const len = int(req.headers.get("content-length"));
  if (len > 95 * 1024 * 1024) throw bad("Video terlalu besar. Maksimal 95 MB; kompres dulu atau unggah ke YouTube.");
  const key = `v-${randomId(16).toLowerCase()}.${VIDEO_TYPES[type]}`;
  await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: type } });
  return json({ url: `/api/file/${key}` }, 201);
});
R("GET", "file/:key", async ({ env, req, p }) => {
  if (!env.MEDIA || !/^v-[\w]+\.(mp4|webm|mov)$/.test(p.key)) throw new HttpError(404, "File tidak ditemukan.");
  const rng = (req.headers.get("range") || "").match(/bytes=(\d+)-(\d*)/);
  const head = await env.MEDIA.head(p.key); if (!head) throw new HttpError(404, "File tidak ditemukan.");
  const size = head.size, type = head.httpMetadata?.contentType || "video/mp4";
  const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "public, max-age=31536000, immutable" };
  if (rng) {
    const start = +rng[1], end = rng[2] ? Math.min(+rng[2], size - 1) : Math.min(start + 4 * 1024 * 1024 - 1, size - 1);
    if (start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const obj = await env.MEDIA.get(p.key, { range: { offset: start, length: end - start + 1 } });
    return new Response(obj.body, { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  const obj = await env.MEDIA.get(p.key);
  return new Response(obj.body, { headers: { ...base, "content-length": String(size) } });
});

/* ---------- Penyimpanan Google Drive ---------- */
async function syncAndNotify(env, opts = {}) {
  const stat = await runSync(env, opts);
  try {
    const cfg = await settings(env);
    const alert = (await one(env, "SELECT value FROM settings WHERE key='drive_alert'"))?.value;
    const needWA = stat.penuh || (alert && JSON.parse(alert) === "penuh");
    if (needWA && cfg.wa_admin) {
      const last = stat.penuh?.pindah_ke ? 0 : JSON.parse((await one(env, "SELECT value FROM settings WHERE key='drive_alert_wa'"))?.value || "0");
      if (Date.now() - last > 20 * 3600e3) {
        const msg = stat.penuh?.pindah_ke
          ? `ℹ️ Google Drive ${stat.penuh.email} sudah terpakai ${stat.penuh.pct}%. Penyimpanan otomatis dipindah ke ${stat.penuh.pindah_ke}. Siapkan satu Drive cadangan lagi di dashboard → Penyimpanan.`
          : `⚠️ Google Drive cabang sudah terpakai ${stat.penuh?.pct || BATAS_PERSEN}%+. Data tetap aman di server, tetapi salinan ke Drive dihentikan. Segera tambahkan link Google Drive baru di dashboard → Penyimpanan.`;
        await notifWA(env, cfg, cfg.wa_admin, msg, "Info admin: Google Drive");
        if (!stat.penuh?.pindah_ke) await run(env, "INSERT OR REPLACE INTO settings(key,value) VALUES('drive_alert_wa',?)", JSON.stringify(Date.now()));
      }
    }
  } catch {}
  return stat;
}
/* ================= Tabungan Qurban ================= */
// Setoran dicatat sebagai donasi (campaign "tabungan-qurban", jenis qurban) agar bukti transfer, verifikasi admin,
// kuitansi, dan komisi afiliator memakai alur yang sama. Status peserta dihitung dari donasi lunas, jadi tidak perlu disinkronkan manual.
const wibYmd = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const wibJam = () => new Date(Date.now() + 7 * 3600e3).getUTCHours();
const hariAntara = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);
const ymdOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
const tglPanjang = (ymd) => new Date(ymd + "T00:00:00Z").toLocaleDateString("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const batasDari = (tglIdul) => new Date(Date.parse(tglIdul + "T00:00:00Z") - 20 * 864e5).toISOString().slice(0, 10);
const QB_MIN_DEFAULT = 50000;

const qurbanMusimAktif = (env) => one(env, "SELECT * FROM qurban_musim WHERE status='buka' ORDER BY id DESC LIMIT 1");
const qurbanMusimById = (env, id) => one(env, "SELECT * FROM qurban_musim WHERE id=?", id);
const qurbanTerdaftar = async (env, musimId) => (await one(env, "SELECT COUNT(*) n FROM qurban_peserta WHERE musim_id=? AND status!='batal'", musimId)).n;
// Kelas sapi (opsional): daftar {kode, harga per bagian}. Jika kosong, pakai harga_sapi_bagian.
const kelasSapiList = (m) => {
  try { const a = JSON.parse(m.kelas_sapi || "[]"); return Array.isArray(a) ? a.filter((k) => k && k.kode && Number(k.harga) > 0) : []; } catch { return []; }
};
const hargaPaket = (m, jenis, bagian, kelas) => {
  if (jenis === "kambing") return m.harga_kambing;
  const list = kelasSapiList(m);
  if (!list.length) return m.harga_sapi_bagian * bagian;
  const k = list.find((x) => x.kode === kelas);
  return k ? k.harga * bagian : 0;
};
const PESERTA_SQL = `SELECT q.*, f.nama fr_nama, f.kode fr_kode, f.komisi_persen fr_persen,
  (SELECT COALESCE(SUM(d.total),0) FROM donations d WHERE d.qurban_peserta_id=q.id AND d.status='paid') terkumpul
  FROM qurban_peserta q LEFT JOIN fundraisers f ON f.id=q.fundraiser_id`;
const statusQurban = (q) => q.status === "batal" || q.status === "disembelih" || q.status === "dibagikan" ? q.status
  : q.target > 0 && q.terkumpul >= q.target ? "lunas" : q.terkumpul > 0 ? "cicil" : "daftar";
const sisaQurban = (q) => Math.max(0, q.target - q.terkumpul);
const bulanSisa = (batas) => Math.max(1, Math.ceil(hariAntara(batas, wibYmd()) / 30));
function saranQurban(q, m) {
  const sisa = sisaQurban(q); if (!sisa) return 0;
  const per = Math.ceil(sisa / bulanSisa(m.batas_pelunasan) / 1000) * 1000;
  return Math.min(sisa, Math.max(m.min_setoran, per));
}
const catatanQ = (q, tambah) => (q.catatan ? q.catatan + " · " : "") + tambah;
function musimOut(m, terdaftar) {
  return { id: m.id, tahun_hijriah: m.tahun_hijriah, tanggal_idul_adha: m.tanggal_idul_adha, batas_pelunasan: m.batas_pelunasan,
    hari_ke_batas: hariAntara(m.batas_pelunasan, wibYmd()), harga_kambing: m.harga_kambing, harga_sapi_bagian: m.harga_sapi_bagian,
    kelas_sapi: kelasSapiList(m), kuota: m.kuota, terdaftar, min_setoran: m.min_setoran, status: m.status };
}
function qurbanOut(q, m, setoran = [], admin = false) {
  const o = { id: q.id, kode: q.kode, nama: q.nama, atas_nama: q.atas_nama, jenis: q.jenis, bagian: q.bagian, kelas: q.kelas || null, target: q.target,
    terkumpul: q.terkumpul, sisa: sisaQurban(q), status: statusQurban(q), persen: q.target ? Math.min(100, Math.round(q.terkumpul / q.target * 100)) : 0,
    batas: m.batas_pelunasan, hari_ke_batas: hariAntara(m.batas_pelunasan, wibYmd()), tahun_hijriah: m.tahun_hijriah,
    min_setoran: m.min_setoran, saran: saranQurban(q, m), pengingat_tgl: q.pengingat_tgl, pengingat_aktif: !!q.pengingat_aktif,
    setoran, created_at: q.created_at };
  if (admin) Object.assign(o, { wa: q.wa, kota: q.kota, musim_id: q.musim_id, fr_nama: q.fr_nama, fr_kode: q.fr_kode,
    dikembalikan: q.dikembalikan, catatan: q.catatan, musim_status: m.status, komisi_persen: m.komisi_persen });
  return o;
}
const qurbanSetoran = (env, q) => all(env, "SELECT id,nominal,kode_unik,total,metode,status,created_at,paid_at FROM donations WHERE qurban_peserta_id=? ORDER BY seq DESC", q.id);
async function qurbanCari(env, kode, wa) {
  return one(env, PESERTA_SQL + " WHERE q.kode=? AND q.wa=?", str(kode, 12).toUpperCase(), waFull(wa));
}
// Menautkan donasi setoran ke peserta, termasuk komisi afiliator sesuai pengaturan musim
async function qurbanTautkan(env, donId, q, m) {
  const cfg = await settings(env);
  const fr = q.fundraiser_id ? await one(env, "SELECT komisi_persen FROM fundraisers WHERE id=?", q.fundraiser_id) : null;
  const persen = null; // qurban memakai komisi tetap per peserta (lihat saldoFr), bukan persen
  await run(env, "UPDATE donations SET qurban_peserta_id=?, fundraiser_id=?, komisi_persen=? WHERE id=?", q.id, q.fundraiser_id || null, persen, donId);
}

// Publik: musim yang sedang dibuka
R("GET", "public/qurban", async ({ env }) => {
  const m = await qurbanMusimAktif(env);
  const cfg = await settings(env);
  const halaman = halamanPublik(await qurbanHalaman(env));
  if (!m) return json({ musim: null, cabang: cfg.cabang || "", halaman, penyetor: [] });
  return json({ musim: musimOut(m, await qurbanTerdaftar(env, m.id)), cabang: cfg.cabang || "", halaman, penyetor: await qurbanPenyetor(env, m.id) });
});

R("POST", "public/qurban/daftar", async ({ env, ctx, req, body }) => {
  const m = await qurbanMusimAktif(env);
  if (!m) throw bad("Pendaftaran qurban belum dibuka.");
  if (hariAntara(m.batas_pelunasan, wibYmd()) < 0) throw bad("Batas pelunasan musim ini sudah lewat. Hubungi admin WIZ.");
  if (m.kuota > 0 && (await qurbanTerdaftar(env, m.id)) >= m.kuota) throw bad("Kuota qurban musim ini sudah penuh.");
  const jenis = str(body.jenis, 10);
  if (!["kambing", "sapi"].includes(jenis)) throw bad("Pilih jenis qurban: kambing atau sapi.");
  const bagian = jenis === "sapi" ? int(body.bagian) : 1;
  if (jenis === "sapi" && (bagian < 1 || bagian > 7)) throw bad("Sapi dibagi maksimal 7 bagian (pilih 1–7).");
  const kelas = jenis === "sapi" && kelasSapiList(m).length ? str(body.kelas, 4).toLowerCase() : null;
  if (jenis === "sapi" && kelasSapiList(m).length && !kelasSapiList(m).some((k) => k.kode === kelas)) throw bad("Pilih kategori sapi yang tersedia.");
  const target = hargaPaket(m, jenis, bagian, kelas);
  if (!target) throw bad("Harga qurban belum diatur admin. Hubungi admin WIZ.");
  const nama = str(body.nama, 80);
  if (!nama) throw bad("Nama wajib diisi.");
  if (!body.wa) throw bad("Nomor WhatsApp wajib diisi agar Anda menerima pengingat tabungan.");
  const wa = waFull(body.wa);
  if (wa.length < 11 || wa.length > 15 || !/^628\d{7,12}$/.test(wa)) throw bad("Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.");
  const tgl = Math.min(28, Math.max(1, int(body.pengingat_tgl) || 1));
  const fr = body.ref ? await cariFr(env, str(body.ref, 20)) : null;
  const r = await run(env, "INSERT INTO qurban_peserta(musim_id,jenis,bagian,target,nama,wa,kota,atas_nama,fundraiser_id,pengingat_tgl,kelas,komisi_rp) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    m.id, jenis, bagian, target, nama, wa, str(body.kota, 60) || null, str(body.atas_nama, 80) || nama, fr?.id || null, tgl, kelas, int(m.komisi_rp) || 0);
  const id = r.meta.last_row_id, kode = "QB-" + String(id).padStart(4, "0");
  await run(env, "UPDATE qurban_peserta SET kode=? WHERE id=?", kode, id);
  const cfg = await settings(env);
  if (cfg.wa_admin && cfg.notif_admin) {
    const origin = new URL(req.url).origin;
    const job = notifWA(env, cfg, cfg.wa_admin, `Ada pendaftar qurban baru.\n\nKode: *${kode}*\nNama: ${nama}\nPaket: ${jenis === "sapi" ? `sapi ${bagian}/7 bagian${kelas ? " kelas " + kelas.toUpperCase() : ""}` : "kambing 1 ekor"}\nTarget: ${rp(target)}\nWA: +${wa}\n\nKelola: ${origin}/admin#qurban`, "Info admin: pendaftar qurban").catch(() => {});
    ctx?.waitUntil ? ctx.waitUntil(job) : await job;
  }
  return json({ ok: true, kode, id }, 201);
});

R("POST", "public/qurban/cek", async ({ env, body }) => {
  const q = await qurbanCari(env, body.kode, body.wa);
  if (!q) throw new HttpError(404, "Kode atau nomor WhatsApp tidak cocok. Pastikan kode dan nomor yang didaftarkan sudah benar.");
  const m = await qurbanMusimById(env, q.musim_id);
  return json(qurbanOut(q, m, await qurbanSetoran(env, q)));
});

R("POST", "public/qurban/setor", async ({ env, ctx, req, body }) => {
  const q = await qurbanCari(env, body.kode, body.wa);
  if (!q) throw new HttpError(404, "Kode atau nomor WhatsApp tidak cocok.");
  const m = await qurbanMusimById(env, q.musim_id);
  const sisa = sisaQurban(q);
  if (sisa <= 0) throw bad("Tabungan qurban Anda sudah lunas. Barakallahu fiikum.");
  if (q.status !== "aktif" || m.status !== "buka") throw bad("Tabungan ini sudah tidak menerima setoran. Hubungi admin WIZ.");
  const nominal = int(body.nominal);
  if (nominal < m.min_setoran) throw bad(`Setoran minimal ${rp(m.min_setoran)}.`);
  if (nominal > sisa) throw bad(`Nominal melebihi sisa tabungan (${rp(sisa)}).`);
  const metode = str(body.metode, 20);
  if (!["transfer", "qris"].includes(metode)) throw bad("Pilih transfer bank atau QRIS.");
  const camp = await one(env, "SELECT id FROM campaigns WHERE slug='tabungan-qurban'");
  const d = await createDonation(env, ctx, req, { campaign_id: camp.id, nominal, metode, nama: q.nama, wa: q.wa }, { qurban: true });
  await qurbanTautkan(env, d.id, q, m);
  return json({ ok: true, id: d.id, total: d.total }, 201);
});

R("POST", "public/qurban/pengaturan", async ({ env, body }) => {
  const q = await qurbanCari(env, body.kode, body.wa);
  if (!q) throw new HttpError(404, "Kode atau nomor WhatsApp tidak cocok.");
  if (q.status === "batal") throw bad("Tabungan ini sudah dibatalkan.");
  const tgl = Math.min(28, Math.max(1, int(body.pengingat_tgl) || 1));
  const aktif = body.pengingat_aktif === false || body.pengingat_aktif === 0 || body.pengingat_aktif === "0" ? 0 : 1;
  await run(env, "UPDATE qurban_peserta SET pengingat_tgl=?, pengingat_aktif=? WHERE id=?", tgl, aktif, q.id);
  return json({ ok: true, info: "Pengaturan pengingat disimpan." });
});

// Admin: daftar peserta musim terbaru
R("GET", "admin/qurban", async ({ env, req, u }) => {
  await requireAdmin(env, req, "lihat");
  const cfg = await settings(env);
  const musimList = await all(env, "SELECT * FROM qurban_musim ORDER BY id DESC LIMIT 30");
  const pilih = int(u.searchParams.get("musim"));
  const m = (pilih && musimList.find((x) => x.id === pilih)) || musimList[0] || null;
  const list = musimList.map((x) => ({ id: x.id, tahun_hijriah: x.tahun_hijriah, batas_pelunasan: x.batas_pelunasan, status: x.status }));
  if (!m) return json({ musim: null, musim_list: [], peserta: [], ringkas: null, cabang: cfg.cabang || "" });
  const rows = (await all(env, PESERTA_SQL + " WHERE q.musim_id=? ORDER BY q.id DESC", m.id)).map((q) => qurbanOut(q, m, [], true));
  const aktif = rows.filter((r) => r.status !== "batal");
  const ringkas = {
    peserta: aktif.length,
    daftar: rows.filter((r) => r.status === "daftar").length, cicil: rows.filter((r) => r.status === "cicil").length,
    lunas: rows.filter((r) => r.status === "lunas").length, disembelih: rows.filter((r) => ["disembelih", "dibagikan"].includes(r.status)).length,
    batal: rows.filter((r) => r.status === "batal").length,
    terkumpul: aktif.reduce((a, r) => a + r.terkumpul, 0), target: aktif.reduce((a, r) => a + r.target, 0),
    dikembalikan: rows.reduce((a, r) => a + (r.dikembalikan || 0), 0),
  };
  return json({ musim: { ...musimOut(m, aktif.length), komisi_persen: m.komisi_persen, catatan: m.catatan }, musim_list: list, peserta: rows, ringkas, cabang: cfg.cabang || "" });
});

/* Halaman publik qurban: narasi, dokumentasi tahun sebelumnya (video & galeri), dan daftar penyetor */
async function qurbanHalaman(env) {
  const cfg = await settings(env);
  const h = cfg.qurban_halaman && typeof cfg.qurban_halaman === "object" ? cfg.qurban_halaman : {};
  return { narasi: String(h.narasi || ""), cover_id: int(h.cover_id) || null, dokumentasi: Array.isArray(h.dokumentasi) ? h.dokumentasi : [] };
}
function videoInfo(u) {
  const yt = ytId(u); if (yt) return { kind: "youtube", id: yt, url: u };
  const em = videoEmbed(u); if (em) return { kind: "embed", ...em, url: u };
  let host = ""; try { host = new URL(u).hostname.replace(/^www\./, ""); } catch {}
  return { kind: "link", url: u, host };
}
function halamanPublik(h) {
  return { narasi: h.narasi, cover: h.cover_id ? `/api/media/${h.cover_id}` : null, dokumentasi: h.dokumentasi.map((d) => ({ judul: String(d.judul || ""), tahun: String(d.tahun || ""),
    video: (Array.isArray(d.video) ? d.video : []).filter((x) => /^https?:\/\//i.test(String(x))).map(videoInfo),
    galeri: galeriIds(d.galeri || []).map((i) => `/api/media/${i}`) })) };
}
// Peserta yang sudah menyetor (ada setoran lunas), hanya nama dan paket, tanpa nominal
const qurbanPenyetor = async (env, musimId) => (await all(env, `SELECT q.nama, q.jenis, q.bagian FROM qurban_peserta q
  WHERE q.musim_id=? AND q.status!='batal' AND (SELECT COALESCE(SUM(d.total),0) FROM donations d WHERE d.qurban_peserta_id=q.id AND d.status='paid' AND d.petugas_id IS NULL AND d.slip_no IS NULL) > 0
  ORDER BY q.id`, musimId)).map((r) => ({ nama: r.nama, paket: r.jenis === "sapi" ? `Sapi ${r.bagian}/7 bagian` : "Kambing 1 ekor" }));

R("GET", "admin/qurban/halaman", async ({ env, req }) => {
  await requireAdmin(env, req, "lihat");
  const h = await qurbanHalaman(env);
  return json({ narasi: h.narasi, cover_id: h.cover_id, dokumentasi: h.dokumentasi.map((d) => ({ judul: str(d.judul, 120), tahun: str(d.tahun, 20),
    video: Array.isArray(d.video) ? d.video : [], galeri: galeriIds(d.galeri || []) })) });
});
R("POST", "admin/qurban/halaman", async ({ env, req, body }) => {
  await requireAdmin(env, req, "dokumentasi");
  const narasi = str(body.narasi, 8000);
  const dokumentasi = (Array.isArray(body.dokumentasi) ? body.dokumentasi : []).slice(0, 20).map((d) => ({
    judul: str(d.judul, 120), tahun: str(d.tahun, 20),
    video: (Array.isArray(d.video) ? d.video : []).map((x) => String(x).trim()).filter((x) => /^https?:\/\//i.test(x)).slice(0, 20),
    galeri: galeriIds(d.galeri || []).slice(0, 200) })).filter((d) => d.judul || d.video.length || d.galeri.length);
  const cover_id = int(body.cover_id) || null;
  await run(env, "INSERT INTO settings(key,value) VALUES('qurban_halaman',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify({ narasi, cover_id, dokumentasi }));
  return json({ ok: true, info: "Halaman qurban disimpan." });
});

// Admin: buat / ubah musim qurban
R("POST", "admin/qurban/musim", async ({ env, req, body }) => {
  await requireAdmin(env, req, "keuangan");
  const tahun = str(body.tahun_hijriah, 40);
  if (!tahun) throw bad("Isi tahun hijriah, mis. 1448 H.");
  if (!ymdOk(body.tanggal_idul_adha)) throw bad("Tanggal Idul Adha belum benar.");
  const batas = body.batas_pelunasan ? str(body.batas_pelunasan, 10) : batasDari(body.tanggal_idul_adha);
  if (!ymdOk(batas)) throw bad("Batas pelunasan belum benar.");
  if (hariAntara(batas, body.tanggal_idul_adha) >= 0) throw bad("Batas pelunasan harus sebelum tanggal Idul Adha.");
  const hargaK = int(body.harga_kambing), hargaS = int(body.harga_sapi_bagian);
  if (hargaK < 0 || hargaS < 0) throw bad("Harga tidak boleh negatif.");
  const kelasIn = Array.isArray(body.kelas_sapi) ? body.kelas_sapi : [];
  const kelasSimpan = kelasIn.map((k) => ({ kode: str(k.kode, 4).toLowerCase(), harga: int(k.harga) }))
    .filter((k) => k.kode && k.harga > 0);
  if (kelasIn.some((k) => int(k.harga) < 0)) throw bad("Harga kelas sapi tidak boleh negatif.");
  const kelasJson = kelasSimpan.length ? JSON.stringify(kelasSimpan) : null;
  const minS = int(body.min_setoran) || QB_MIN_DEFAULT;
  if (minS < 10000) throw bad("Setoran minimal tidak boleh kurang dari Rp10.000.");
  const kuota = Math.max(0, int(body.kuota));
  const kom = body.komisi_persen === null || body.komisi_persen === undefined || body.komisi_persen === "" ? null
    : Math.min(100, Math.max(0, Number(String(body.komisi_persen).replace(",", ".")) || 0));
  const status = body.status === "tutup" ? "tutup" : "buka";
  const catatan = str(body.catatan, 300) || null;
  const id = int(body.id);
  const komisiRp = Math.max(0, int(body.komisi_rp) || 0);
  const nilai = [tahun, body.tanggal_idul_adha, batas, hargaK, hargaS, kuota, minS, kom, status, catatan];
  if (id) {
    if (!(await qurbanMusimById(env, id))) throw new HttpError(404, "Musim tidak ditemukan.");
    await run(env, "UPDATE qurban_musim SET tahun_hijriah=?, tanggal_idul_adha=?, batas_pelunasan=?, harga_kambing=?, harga_sapi_bagian=?, kuota=?, min_setoran=?, komisi_persen=?, status=?, catatan=?, kelas_sapi=?, komisi_rp=? WHERE id=?", ...nilai, kelasJson, komisiRp, id);
    return json({ ok: true, id, info: "Musim qurban diperbarui." });
  }
  const r = await run(env, "INSERT INTO qurban_musim(tahun_hijriah,tanggal_idul_adha,batas_pelunasan,harga_kambing,harga_sapi_bagian,kuota,min_setoran,komisi_persen,status,catatan,kelas_sapi,komisi_rp) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", ...nilai, kelasJson, komisiRp);
  return json({ ok: true, id: r.meta.last_row_id, info: "Musim qurban dibuat." }, 201);
});

// Admin: hapus musim (hanya jika belum ada peserta; kalau sudah ada, cukup ditutup)
R("DELETE", "admin/qurban/musim/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "keuangan");
  const id = int(p.id);
  if (!(await qurbanMusimById(env, id))) throw new HttpError(404, "Musim tidak ditemukan.");
  if (await one(env, "SELECT id FROM qurban_peserta WHERE musim_id=? LIMIT 1", id)) throw bad("Musim ini sudah punya peserta, jadi tidak bisa dihapus. Ubah pendaftarannya menjadi Ditutup saja.");
  await run(env, "DELETE FROM qurban_musim WHERE id=?", id);
  return json({ ok: true, info: "Musim qurban dihapus." });
});

// Admin: detail satu peserta beserta setorannya
R("GET", "admin/qurban/peserta/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "lihat");
  const q = await one(env, PESERTA_SQL + " WHERE q.id=?", p.id);
  if (!q) throw new HttpError(404, "Peserta tidak ditemukan.");
  return json(qurbanOut(q, await qurbanMusimById(env, q.musim_id), await qurbanSetoran(env, q), true));
});

// Admin: tandai disembelih / dibagikan (setelah lunas)
R("POST", "admin/qurban/peserta/:id/status", async ({ env, ctx, req, p, body }) => {
  await requireAdmin(env, req, "keuangan");
  const q = await one(env, PESERTA_SQL + " WHERE q.id=?", p.id);
  if (!q) throw new HttpError(404, "Peserta tidak ditemukan.");
  const st = str(body.status, 12);
  if (!["disembelih", "dibagikan"].includes(st)) throw bad("Status tidak dikenal.");
  if (st === "disembelih" && statusQurban(q) !== "lunas") throw bad("Hanya peserta yang sudah lunas yang bisa ditandai disembelih.");
  if (st === "dibagikan" && q.status !== "disembelih") throw bad("Tandai disembelih dulu sebelum dibagikan.");
  await run(env, "UPDATE qurban_peserta SET status=? WHERE id=?", st, q.id);
  const cfg = await settings(env);
  const pesan = st === "disembelih"
    ? `Alhamdulillah, qurban Anda dengan kode *${q.kode}* telah disembelih. Insya Allah dagingnya segera disalurkan kepada yang berhak. Semoga Allah menerima qurban Anda. Jazakumullah khairan.`
    : `Daging qurban Anda (kode *${q.kode}*) telah disalurkan kepada penerima manfaat. Terima kasih atas kepercayaan Anda. Semoga menjadi amal jariyah.`;
  if (q.wa) { const job = notifWA(env, cfg, q.wa, pesan, "Qurban: " + st).catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(job) : await job; }
  return json({ ok: true, info: st === "disembelih" ? "Ditandai disembelih, peserta dikabari." : "Ditandai dibagikan, peserta dikabari." });
});

// Admin: setoran tunai langsung di kantor atau saat penjemputan
R("POST", "admin/qurban/peserta/:id/setor", async ({ env, ctx, req, p, body }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const q = await one(env, PESERTA_SQL + " WHERE q.id=?", p.id);
  if (!q) throw new HttpError(404, "Peserta tidak ditemukan.");
  if (q.status !== "aktif") throw bad("Peserta ini tidak aktif, setoran tidak bisa dicatat.");
  const sisa = sisaQurban(q);
  if (sisa <= 0) throw bad("Tabungan qurban ini sudah lunas.");
  const nominal = int(body.nominal);
  if (nominal < 1000) throw bad("Nominal setoran belum benar.");
  if (nominal > sisa) throw bad(`Nominal melebihi sisa tabungan (${rp(sisa)}).`);
  // Setoran yang dicatat admin: tunai, atau transfer yang wajib disertai bukti (untuk setoran yang sudah masuk sebelum sistem aktif)
  const metode = body.metode === "transfer" ? "transfer" : "tunai";
  const buktiId = int(body.bukti_id);
  if (metode === "transfer" && buktiId < 1) throw bad("Untuk setoran transfer, unggah bukti transfernya.");
  const m = await qurbanMusimById(env, q.musim_id);
  const camp = await one(env, "SELECT id FROM campaigns WHERE slug='tabungan-qurban'");
  const d = await createDonation(env, ctx, req, { campaign_id: camp.id, nominal, metode, nama: q.nama, wa: q.wa, tanggal: ymdOk(body.tanggal) ? body.tanggal : undefined, petugas: me.nama, catatan: str(body.catatan, 200) || undefined },
    { offline: true, admin: me });
  if (metode === "transfer") await run(env, "UPDATE donations SET bukti_id=? WHERE id=?", buktiId, d.id);
  await qurbanTautkan(env, d.id, q, m);
  return json({ ok: true, id: d.id, info: `Setoran tunai ${rp(nominal)} dicatat.` }, 201);
});

// Admin: pembatalan. Tiga pilihan: kembalikan dana, alihkan ke musim lain, atau pindahkan setoran ke infak.
R("POST", "admin/qurban/peserta/:id/batal", async ({ env, ctx, req, p, body }) => {
  const me = await requireAdmin(env, req, "keuangan");
  const q = await one(env, PESERTA_SQL + " WHERE q.id=?", p.id);
  if (!q) throw new HttpError(404, "Peserta tidak ditemukan.");
  const st = statusQurban(q);
  if (st === "batal") throw bad("Peserta ini sudah dibatalkan.");
  if (st === "disembelih" || st === "dibagikan") throw bad("Qurban yang sudah disembelih tidak bisa dibatalkan.");
  const cfg = await settings(env);
  const tindakan = str(body.tindakan, 12), alasan = str(body.alasan, 120);
  const dari = await qurbanMusimById(env, q.musim_id);
  let info, pesan;
  if (tindakan === "alihkan") {
    const tujuan = await qurbanMusimById(env, int(body.musim_tujuan_id));
    if (!tujuan || tujuan.id === dari.id) throw bad("Pilih musim tujuan yang berbeda.");
    if (tujuan.status !== "buka") throw bad("Musim tujuan belum dibuka.");
    const target = hargaPaket(tujuan, q.jenis, q.bagian, q.kelas);
    if (!target) throw bad("Kategori sapi peserta tidak tersedia di musim tujuan.");
    await run(env, "UPDATE qurban_peserta SET musim_id=?, target=?, status='aktif', catatan=? WHERE id=?", tujuan.id, target, catatanQ(q, `dialihkan ke ${tujuan.tahun_hijriah} oleh ${me.nama}${alasan ? ": " + alasan : ""}`), q.id);
    info = `Peserta dialihkan ke ${tujuan.tahun_hijriah}. Setoran yang sudah masuk tetap tercatat.`;
    pesan = `Assalamu'alaikum ${q.nama}, tabungan qurban Anda (kode *${q.kode}*) dialihkan ke musim ${tujuan.tahun_hijriah}. Target baru: ${rp(target)}. Setoran yang sudah masuk tetap tercatat.${alasan ? "\nAlasan: " + alasan : ""}`;
  } else if (tindakan === "infak") {
    const infak = await one(env, "SELECT id FROM campaigns WHERE slug='infak-terbaik'");
    await run(env, `UPDATE donations SET campaign_id=?, jenis_dana='infak', qurban_peserta_id=NULL,
      komisi_persen=CASE WHEN fundraiser_id IS NULL THEN NULL ELSE COALESCE((SELECT f.komisi_persen FROM fundraisers f WHERE f.id=donations.fundraiser_id), ?) END
      WHERE qurban_peserta_id=?`, infak.id, cfg.upah_afiliator_persen, q.id);
    await run(env, "UPDATE qurban_peserta SET status='batal', catatan=? WHERE id=?", catatanQ(q, `setoran dipindah ke infak oleh ${me.nama}${alasan ? ": " + alasan : ""}`), q.id);
    info = `Setoran ${rp(q.terkumpul)} dipindah ke Infak Terbaik dan peserta dibatalkan.`;
    pesan = `Assalamu'alaikum ${q.nama}, tabungan qurban Anda (kode *${q.kode}*) dibatalkan. Setoran yang sudah masuk (${rp(q.terkumpul)}) kami alihkan menjadi infak, sesuai pilihan Anda.${alasan ? "\nAlasan: " + alasan : ""}`;
  } else if (tindakan === "kembalikan") {
    const kembali = body.nominal_kembali === undefined || body.nominal_kembali === "" ? q.terkumpul : Math.min(q.terkumpul, Math.max(0, int(body.nominal_kembali)));
    const paid = await all(env, "SELECT * FROM donations WHERE qurban_peserta_id=? AND status='paid'", q.id);
    for (const d of paid) await batalkanDonasi(env, ctx, req, me, d, alasan || "tabungan qurban dibatalkan", "dibatalkan");
    await run(env, "UPDATE donations SET status='cancelled' WHERE qurban_peserta_id=? AND status IN ('pending','expired')", q.id);
    await run(env, "UPDATE qurban_peserta SET status='batal', dikembalikan=?, catatan=? WHERE id=?", kembali, catatanQ(q, `dikembalikan ${rp(kembali)} oleh ${me.nama}${alasan ? ": " + alasan : ""}`), q.id);
    info = `Qurban dibatalkan. Catat pengembalian ${rp(kembali)} setelah transfer ke peserta dilakukan.`;
    pesan = `Assalamu'alaikum ${q.nama}, tabungan qurban Anda (kode *${q.kode}*) dibatalkan. Dana yang Anda setorkan sebesar ${rp(kembali)} akan dikembalikan oleh admin WIZ.${alasan ? "\nAlasan: " + alasan : ""}`;
  } else throw bad("Pilih tindakan: kembalikan, alihkan, atau infak.");
  if (q.wa) { const job = notifWA(env, cfg, q.wa, pesan, "Qurban: dibatalkan").catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(job) : await job; }
  return json({ ok: true, info });
});

// Pengingat otomatis (dipanggil dari scheduled): bulanan sesuai tanggal pilihan peserta, dan menjelang batas pelunasan
async function qurbanPengingat(env) {
  const cfg = await settings(env);
  if (!cfg.fonnte_token || wibJam() < 8) return 0;
  const hariIni = wibYmd(), bulan = hariIni.slice(0, 7), tglHari = Number(hariIni.slice(8, 10));
  const musimList = await all(env, "SELECT * FROM qurban_musim WHERE status='buka' AND batas_pelunasan >= ?", hariIni);
  let kirim = 0;
  for (const m of musimList) {
    const hari = hariAntara(m.batas_pelunasan, hariIni);
    const rows = await all(env, PESERTA_SQL + " WHERE q.musim_id=? AND q.status='aktif' AND q.pengingat_aktif=1", m.id);
    for (const q of rows) {
      if (sisaQurban(q) <= 0) continue;
      const tagihan = [];
      if (q.pengingat_tgl === tglHari) {
        const ada = await one(env, "SELECT COUNT(*) n FROM donations WHERE qurban_peserta_id=? AND status IN ('paid','pending') AND substr(created_at,1,7)=?", q.id, bulan);
        if (!ada.n) tagihan.push(["bulanan", bulan]);
      }
      if ([14, 7, 3, 1, 0].includes(hari)) tagihan.push(["tenggat", `${m.batas_pelunasan}:${hari}`]);
      for (const [jenis, periode] of tagihan) {
        if (await one(env, "SELECT 1 x FROM qurban_pengingat WHERE peserta_id=? AND jenis=? AND periode=?", q.id, jenis, periode)) continue;
        const sisa = sisaQurban(q), link = `${cfg.situs_url || ""}/#/qurban`;
        const isi = jenis === "bulanan"
          ? `Assalamu'alaikum ${q.nama},\n\nPengingat *Tabungan Qurban* ${cfg.cabang || "WIZ"} bulan ini.\nKode: *${q.kode}*\nTarget: ${rp(q.target)}\nTerkumpul: ${rp(q.terkumpul)}\nSisa: *${rp(sisa)}*\nBatas pelunasan: *${tglPanjang(m.batas_pelunasan)}*\n\nSaran setoran bulan ini: *${rp(saranQurban(q, m))}* (boleh disesuaikan).\nSetor atau ubah jadwal pengingat: ${link}\n\nJazakumullah khairan.`
          : `Assalamu'alaikum ${q.nama},\n\nBatas pelunasan Tabungan Qurban (kode *${q.kode}*) ${hari === 0 ? "*hari ini*" : `tinggal *${hari} hari* lagi`}, yaitu ${tglPanjang(m.batas_pelunasan)}.\nSisa yang perlu dilunasi: *${rp(sisa)}*.\nSetor sekarang: ${link}\n\nJazakumullah khairan.`;
        await notifWA(env, cfg, q.wa, isi, "Pengingat qurban: " + jenis);
        await run(env, "INSERT OR IGNORE INTO qurban_pengingat(peserta_id,jenis,periode) VALUES(?,?,?)", q.id, jenis, periode);
        kirim++;
      }
    }
  }
  return kirim;
}

export async function scheduled(env, ctx) { await init(env); await kedaluwarsaManual(env).catch(() => {}); await ingatkanBukti(env).catch(() => {}); await syncAndNotify(env); await tickWA(env).catch(() => {}); await qurbanPengingat(env).catch(() => {}); }
const requireDriveAdmin = (env, req) => requireAdmin(env, req, "penyimpanan");
R("GET", "admin/drive", async ({ env, req }) => { await requireAdmin(env, req); return json(await driveStatus(env)); });
R("POST", "admin/drive", async ({ env, ctx, req, body }) => {
  await requireDriveAdmin(env, req);
  let d; try { d = await addDrive(env, (await settings(env)).cabang, body.url, body.secret); } catch (e) { throw bad(e.message); }
  if (d.status === "aktif") { const t = syncAndNotify(env, { force: true }); ctx?.waitUntil ? ctx.waitUntil(t) : await t; }
  const { secret, ...pub } = d; return json(pub, 201);
});
R("POST", "admin/drive/:id/aktif", async ({ env, req, p }) => {
  await requireDriveAdmin(env, req);
  const drives = JSON.parse((await one(env, "SELECT value FROM settings WHERE key='drives'"))?.value || "[]");
  const d = drives.find((x) => x.id === p.id); if (!d) throw new HttpError(404, "Drive tidak ditemukan.");
  if (d.pct >= BATAS_PERSEN) throw bad(`Drive ini sudah terpakai ${d.pct}%. Pilih Drive lain.`);
  drives.forEach((x) => { if (x.status === "aktif") x.status = "cadangan"; }); d.status = "aktif";
  try { const st = await callDrive(d, "setup", { cabang: (await settings(env)).cabang }); d.root = st.root; d.folders = st.folders; } catch {}
  await saveDrives(env, drives); await run(env, "INSERT OR REPLACE INTO settings(key,value) VALUES('drive_alert','null')");
  await seedAll(env); // Drive aktif baru menerima salinan lengkap tahun berjalan + data induk
  return json({ ok: true });
});
R("DELETE", "admin/drive/:id", async ({ env, req, p }) => {
  await requireDriveAdmin(env, req);
  const drives = JSON.parse((await one(env, "SELECT value FROM settings WHERE key='drives'"))?.value || "[]");
  const d = drives.find((x) => x.id === p.id); if (!d) throw new HttpError(404, "Drive tidak ditemukan.");
  if (d.status === "aktif") throw bad("Drive aktif tidak bisa dilepas. Aktifkan Drive lain dulu.");
  // Drive yang masih menyimpan file/cadangan tidak dihapus dari daftar: dijadikan arsip (hanya dibaca)
  const pakai = (await one(env, "SELECT (SELECT COUNT(*) FROM media_sync WHERE drive_id=?) + (SELECT COUNT(*) FROM backups WHERE drive_id=?) n", d.id, d.id)).n;
  if (pakai && d.status !== "arsip") {
    d.status = "arsip"; d.arsip_at = new Date().toISOString(); await saveDrives(env, drives);
    return json({ ok: true, info: `Drive menyimpan ${pakai} file/cadangan, jadi dijadikan ARSIP: tidak ditulisi lagi, tetapi isinya tetap bisa dibuka dari aplikasi.` });
  }
  if (pakai) throw bad("Drive arsip ini masih menyimpan file yang dipakai aplikasi. Biarkan tetap sebagai arsip agar data lama bisa dibuka.");
  await saveDrives(env, drives.filter((x) => x.id !== p.id));
  return json({ ok: true, info: "Drive dilepas dari aplikasi. File yang sudah tersimpan di Drive tersebut tetap ada." });
});
// Arsip: daftar file yang tersimpan di semua Drive
const KIND_LABEL = { slip: "Slip setoran", surat: "Surat persetujuan", foto: "Foto lokasi", bukti: "Bukti transfer", dok: "Foto dokumentasi" };
R("GET", "admin/drive/files", async ({ env, req, u }) => {
  await requireDriveAdmin(env, req);
  const w = ["s.drive_id!='lewat'"], a = [];
  const kind = u.searchParams.get("jenis");
  if (kind === "bukti") w.push("m.private=1 AND m.kind IS NULL"); else if (kind === "dok") w.push("m.private=0"); else if (kind) { w.push("m.kind=?"); a.push(kind); }
  if (u.searchParams.get("drive")) { w.push("s.drive_id=?"); a.push(u.searchParams.get("drive")); }
  if (u.searchParams.get("tahun")) { w.push("strftime('%Y', m.created_at)=?"); a.push(u.searchParams.get("tahun")); }
  const qv = str(u.searchParams.get("q"), 60); if (qv) { w.push("s.nama LIKE ?"); a.push("%" + qv + "%"); }
  const page = Math.max(1, int(u.searchParams.get("page")) || 1);
  const where = " WHERE " + w.join(" AND ");
  const rows = await all(env, `SELECT s.media_id id, s.drive_id, s.nama, s.ukuran, s.file_url, m.kind, m.private, m.created_at, (m.data='') di_drive FROM media_sync s JOIN media m ON m.id=s.media_id${where} ORDER BY s.media_id DESC LIMIT 50 OFFSET ?`, ...a, (page - 1) * 50);
  const n = (await one(env, `SELECT COUNT(*) n FROM media_sync s JOIN media m ON m.id=s.media_id${where}`, ...a)).n;
  return json({ rows: rows.map((r) => ({ ...r, jenis: KIND_LABEL[r.kind || (r.private ? "bukti" : "dok")] || "File", di_drive: !!r.di_drive })), total: n, page });
});
R("GET", "admin/drive/backups", async ({ env, req }) => {
  await requireDriveAdmin(env, req);
  return json(await all(env, "SELECT id, drive_id, at, nama, url, size, gfile IS NOT NULL bisa FROM backups ORDER BY at DESC LIMIT 200"));
});
// Unduh cadangan (gzip) dari Drive mana pun, untuk dipulihkan
R("GET", "admin/drive/backups/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "pengaturan");
  const b = await one(env, "SELECT * FROM backups WHERE id=?", int(p.id)); if (!b?.gfile) throw new HttpError(404, "Cadangan tidak ditemukan.");
  let f; try { f = await fetchDriveFile(env, b.drive_id, b.gfile); } catch (e) { throw bad("Gagal mengambil cadangan dari Drive: " + e.message); }
  if (!f) throw new HttpError(404, "Drive penyimpan cadangan ini tidak terhubung lagi.");
  return new Response(b64bytes(f.data), { headers: { "content-type": "application/gzip", "content-disposition": `attachment; filename="${b.nama}.json.gz"`, "cache-control": "no-store" } });
});
// Tautan spreadsheet & folder di setiap Drive (termasuk Drive penuh/arsip)
R("GET", "admin/drive/:id/links", async ({ env, req, p }) => {
  await requireDriveAdmin(env, req);
  const drives = JSON.parse((await one(env, "SELECT value FROM settings WHERE key='drives'"))?.value || "[]");
  const d = drives.find((x) => x.id === p.id); if (!d) throw new HttpError(404, "Drive tidak ditemukan.");
  try { return json(await callDrive(d, "links", { cabang: (await settings(env)).cabang })); } catch (e) { throw bad("Drive tidak merespons: " + e.message); }
});
// Pulihkan baris dari cadangan: hanya MENAMBAH data yang hilang (INSERT OR IGNORE), tidak pernah menimpa
const RESTORE_TABLES = ["campaigns", "campaign_updates", "articles", "donors", "donations", "fundraisers", "pundi", "kotak", "slips", "amplop", "penarikan", "penarikan_petugas", "wa_kontak"];
R("POST", "admin/restore", async ({ env, req, body }) => {
  await requireAdmin(env, req, "pengaturan");
  const t = String(body.table || ""); if (!RESTORE_TABLES.includes(t)) throw bad("Tabel tidak dikenal.");
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 300) : [];
  const cols = new Set((await all(env, `PRAGMA table_info(${t})`)).map((c) => c.name));
  const stmts = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    if (t === "fundraisers") r.pin_hash = "reset-" + randomId(8); // PIN tidak ikut dicadangkan; atur ulang PIN di menu Relawan
    const ks = Object.keys(r).filter((k) => cols.has(k) && k !== "pass_hash");
    if (!ks.length) continue;
    stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO ${t}(${ks.join(",")}) VALUES(${ks.map(() => "?").join(",")})`).bind(...ks.map((k) => (r[k] === undefined ? null : r[k]))));
  }
  let added = 0;
  for (let i = 0; i < stmts.length; i += 50) (await env.DB.batch(stmts.slice(i, i + 50))).forEach((x) => (added += x.meta?.changes || 0));
  return json({ ok: true, ditambah: added, dikirim: rows.length });
});
R("POST", "admin/drive/sync", async ({ env, req, body }) => {
  await requireAdmin(env, req);
  const stat = await syncAndNotify(env, { force: true, backup: !!body.backup });
  if (stat.error) throw bad("Sinkron gagal: " + stat.error);
  return json({ ...stat, status: await driveStatus(env) });
});

/* ---------- Admin: pengaturan ---------- */
const mask = (v) => (v ? "••••" + String(v).slice(-4) : "");
R("GET", "admin/settings", async ({ env, req }) => {
  await requireAdmin(env, req);
  const c = await settings(env); const out = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) out[k] = SECRET_KEYS.includes(k) ? mask(c[k]) : c[k];
  out.webhook_url = new URL(req.url).origin + "/api/payment/midtrans";
  out.gateway_on = gatewayOn(c); out.wa_on = !!c.fonnte_token;
  out.from_env = { midtrans: !!env.MIDTRANS_SERVER_KEY, fonnte: !!env.FONNTE_TOKEN };
  out.video_upload = !!env.MEDIA;
  return json(out);
});
const TRUST_IKON = ["heart", "shield", "scale", "bolt", "trophy"];
const trustSanitize = (v) => (Array.isArray(v) ? v : []).slice(0, 12).map((t) => ({
  judul: str(t?.judul, 60), ringkas: str(t?.ringkas, 140), teks: str(t?.teks, 1500),
  ikon: TRUST_IKON.includes(t?.ikon) ? t.ikon : "heart", gambar_id: int(t?.gambar_id) || null,
})).filter((t) => t.judul);
R("PUT", "admin/settings", async ({ env, req, body }) => {
  await requireAdmin(env, req, "pengaturan");
  const stmts = [];
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (SECRET_KEYS.includes(k)) { if (typeof v !== "string" || v.startsWith("••••")) continue; v = v.trim(); }
    else if (k.startsWith("upah_")) v = pctOrNull(v) ?? 0;
    else if (typeof def === "number") v = Number(v) || 0;
    else if (typeof def === "boolean") v = !!v;
    else if (k === "trust_items") v = trustSanitize(v);
    else if (Array.isArray(def)) v = Array.isArray(v) ? v.slice(0, 6).map((r) => ({ bank: str(r.bank, 30), no: str(r.no, 30), an: str(r.an, 60) })) : def;
    else if (k.startsWith("wa_")) v = waFull(v);
    else if (k === "qris_media_id") v = v ? int(v) : null;
    else v = str(v, 300);
    stmts.push(env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)").bind(k, JSON.stringify(v)));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
});
R("POST", "admin/test-wa", async ({ env, req, body }) => {
  await requireAdmin(env, req, "pengaturan");
  const r = await sendWA(await settings(env), waFull(body.wa), "Tes notifikasi WhatsApp dari aplikasi WIZ Cabang berhasil. Alhamdulillah.");
  if (!r.ok) throw bad("Gagal: " + r.reason); return json({ ok: true });
});

/* ---------- Admin: ekspor CSV ---------- */
R("GET", "admin/export/donations", async ({ env, req, u }) => {
  await requireAdmin(env, req);
  const { where, args } = donFilter(u);
  const rows = await all(env, DON_SELECT + where + " ORDER BY d.seq DESC LIMIT 20000", ...args);
  const body = csv([["No transaksi", "Tanggal", "Status", "Program", "Jenis dana", "Nominal", "Kode unik", "Total", "Metode", "Kanal", "Sapaan", "Nama", "Anonim", "WhatsApp", "Fundraiser", "Kotak", "Pundi", "Petugas", "Doa", "Catatan"],
    ...rows.map((d) => [d.id, d.paid_at || d.created_at, d.status, d.judul, d.jenis_dana, d.nominal, d.kode_unik, d.total, d.metode, d.kanal, d.sapaan, d.nama, d.anonim ? "ya" : "", d.wa ? "+" + d.wa : "", d.fr_nama, d.kotak_kode, d.pundi_kode, d.petugas, d.doa, d.catatan])]);
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="donasi-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
R("GET", "admin/export/donors", async ({ env, req, u }) => {
  await requireAdmin(env, req);
  const rows = await donorRows(env, u);
  const body = csv([["Nama", "Sapaan", "WhatsApp", "Email", "Alamat", "Kelurahan", "Kecamatan", "Pekerjaan", "Kategori", "Segmen", "Jumlah donasi", "Total", "Total zakat", "Donasi pertama", "Donasi terakhir", "Catatan"],
    ...rows.map((r) => [r.nama, r.sapaan, "+" + r.wa, r.email, r.alamat, r.kelurahan, r.kecamatan, r.pekerjaan, r.kategori, r.segmen, r.n, r.total, r.zakat, r.pertama, r.terakhir, r.catatan])]);
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="donatur-${new Date().toISOString().slice(0, 10)}.csv"` } });
});

/* ---------- Lapangan (lib/field.js) ---------- */
const FIELD = fieldRoutes(R, { one, all, run, settings, requireAdmin, can, upsertDonor, markPaid, enqueue, sendWA, notifWA, json, bad, HttpError, str, int, waFull, randomId, nowIso, saveDoc, serveMedia, upahPetugas, saldoPetugas, pctOrNull });

/* ================= Entry ================= */
/* ---------- Pesan WA: jadwal, blast, dan berhenti ---------- */
// Waktu dihitung dalam WITA (UTC+8). Cron berjalan tiap 15 menit; jadwal dianggap jatuh tempo dalam 30 menit sejak jamnya.
const WA_WINDOW = 30;
const witaNow = (d = new Date()) => {
  const x = new Date(d.getTime() + 8 * 3600e3), pad = (n) => String(n).padStart(2, "0");
  return { tgl: `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`, menit: x.getUTCHours() * 60 + x.getUTCMinutes(),
    hari: ((x.getUTCDay() + 6) % 7) + 1, bulan: x.getUTCMonth() + 1, tgd: x.getUTCDate() };
};
const listAngka = (s) => String(s || "").split(",").map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0);
const jamMenit = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const baris = (isi) => String(isi || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
// Mode tulis: satu teks utuh = satu pesan; beberapa pesan bergiliran dipisah baris "---"
const potongPesan = (isi) => String(isi || "").replace(/\r/g, "").split(/\n[ \t]*-{3,}[ \t]*(?:\n|$)/).map((x) => x.trim()).filter(Boolean);
const isiPesan = (j) => (j.sumber === "tulis" ? potongPesan(j.isi) : baris(j.isi));
const WA_FOOTER = "\n\n_Balas BERHENTI untuk tidak menerima pesan ini lagi._";
const WA_BATCH = 25;            // nomor per permintaan ke Fonnte (spintax diacak ulang tiap kelompok)
const WA_DELAY = "10-25";       // jeda acak antar-nomor (detik), diatur oleh antrean Fonnte
const isGrupId = (s) => /^[\w-]+@g\.us$/.test(String(s || "").trim());
const namaAman = (s) => String(s || "").replace(/[|,\n\r{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
const labelList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

// Spintax {Assalamu'alaikum|Salam} → salah satu pilihan; {nama} tidak terpengaruh karena tanpa "|"
const spin = (t) => String(t || "").replace(/\{([^{}]*\|[^{}]*)\}/g, (_, s) => { const o = s.split("|"); return o[Math.floor(Math.random() * o.length)]; });

// Ambil nomor dari teks bebas: "Ahmad - 0812 3456 7890", "+62 812-...", satu atau banyak per baris
function parseNomor(teks) {
  const out = [];
  for (const line of String(teks || "").split(/\r?\n|;/)) {
    const parts = line.split(/,(?=\s*\+?\d)/);
    for (const part of parts) {
      const m = /(\+?\d[\d\s().-]{7,}\d)/.exec(part); if (!m) continue;
      const wa = waFull(m[1].replace(/[^\d+]/g, "")); if (!wa || wa.length < 10 || wa.length > 15) continue;
      const nama = namaAman(part.replace(m[1], "").replace(/^[\s:\-–|.]+|[\s:\-–|.]+$/g, ""));
      out.push({ wa, nama });
    }
  }
  return out;
}

// CSV (format ekspor Google Sheets): kutip ganda, koma dan baris baru di dalam sel
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  const s = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

// Tautan Google Sheet biasa → tautan unduh CSV (lembar sesuai gid)
function sheetCsvUrl(url) {
  const u = String(url || "").trim();
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(u)) return "";
  if (/output=csv|format=csv/.test(u)) return u;
  const id = /\/d\/([\w-]{20,})/.exec(u)?.[1]; if (!id) return "";
  const gid = /[#&?]gid=(\d+)/.exec(u)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

// Baris materi dari Sheet: kolom "pesan", atau disusun dari judul/arab/terjemah/sumber/faedah. Kolom "gambar" opsional.
async function materiSheet(url, kategori = "") {
  const csvUrl = sheetCsvUrl(url); if (!csvUrl) throw bad("Tautan Google Sheet tidak dikenali. Salin tautan dari tombol Bagikan.");
  let res;
  try { res = await fetch(csvUrl, { redirect: "follow" }); } catch { throw bad("Google Sheet tidak dapat dihubungi."); }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("text/html")) throw bad("Sheet belum dibagikan. Atur akses: \"Siapa saja yang memiliki link\" dapat melihat.");
  const rows = parseCSV(await res.text()); if (rows.length < 2) throw bad("Sheet kosong. Baris pertama berisi judul kolom, materi mulai baris kedua.");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const ip = col("pesan"), ij = col("judul"), ia = col("arab"), it = col("terjemah"), is = col("sumber"), iff = col("faedah"), ig = col("gambar"), ik = col("kategori"), iak = col("aktif");
  if (ip < 0 && it < 0) throw bad('Sheet perlu kolom "pesan", atau kolom "terjemah" (boleh ditambah judul, arab, sumber, faedah).');
  const kat = String(kategori || "").trim().toLowerCase();
  const out = [];
  for (const r of rows.slice(1)) {
    const v = (i) => (i >= 0 ? String(r[i] || "").trim() : "");
    if (kat && v(ik).toLowerCase() !== kat) continue;
    if (iak >= 0 && /^(tidak|no|0|false)$/i.test(v(iak))) continue;
    let teks = v(ip);
    if (!teks) {
      const bag = [];
      if (v(ij)) bag.push(`*${v(ij)}*`);
      if (v(ia)) bag.push(v(ia));
      if (v(it)) bag.push(`"${v(it)}"`);
      if (v(is)) bag.push(`📚 ${v(is)}`);
      if (v(iff)) bag.push(`💡 ${v(iff)}`);
      teks = bag.join("\n\n");
    }
    if (!teks) continue;
    const g = v(ig);
    out.push({ teks, lampiran: /^https?:\/\//.test(g) ? g : "" });
  }
  if (!out.length) throw bad(kat ? `Tidak ada baris dengan kategori "${kategori}".` : "Tidak ada materi yang terbaca di Sheet.");
  return out;
}

// Target jadwal lama (kolom audiens) tetap terbaca
function targetOf(j) {
  let t = {};
  try { t = j.target ? JSON.parse(j.target) : {}; } catch { t = {}; }
  if (!j.target && j.audiens) t = { donatur: j.audiens };
  return t;
}
function bersihTarget(b) {
  const arr = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim()).filter(Boolean).slice(0, 500);
  const t = {};
  if (AUDIENS_WA.includes(b.donatur)) t.donatur = b.donatur;
  if (b.kontak_semua) t.kontak_semua = true;
  const label = arr(b.label).map((x) => str(x, 40)); if (label.length) t.label = label;
  const grup = arr(b.grup).filter(isGrupId); if (grup.length) t.grup = grup;
  const anggota = arr(b.anggota).filter(isGrupId); if (anggota.length) t.anggota = anggota;
  const pilih = arr(b.pilih).map(waFull).filter(Boolean); if (pilih.length) t.pilih = [...new Set(pilih)];
  const nomor = String(b.nomor || "").slice(0, 20000).trim(); if (nomor && parseNomor(nomor).length) t.nomor = nomor;
  return t;
}
const targetKosong = (t) => !t.donatur && !t.kontak_semua && !t.label && !t.grup && !t.anggota && !t.pilih && !t.nomor;

// Semua penerima: pribadi (tanpa nomor yang minta berhenti, tanpa duplikat) dan grup
async function penerimaTarget(env, t) {
  const berhenti = new Set((await all(env, "SELECT wa FROM wa_berhenti")).map((r) => r.wa));
  const map = new Map();
  const add = (waRaw, nama) => {
    const wa = waFull(waRaw); if (!wa || berhenti.has(wa)) return;
    const n = namaAman(nama);
    if (!map.has(wa)) map.set(wa, { wa, nama: n }); else if (!map.get(wa).nama && n) map.get(wa).nama = n;
  };
  if (t.donatur) {
    const sql = t.donatur === "sedekah"
      ? "SELECT wa, MAX(nama) nama FROM donations WHERE status='paid' AND jenis_dana='infak' AND wa IS NOT NULL AND wa<>'' GROUP BY wa"
      : t.donatur === "pundi"
        ? "SELECT wa, MAX(nama) nama FROM donations WHERE status='paid' AND (metode='pundi' OR (pundi_kode IS NOT NULL AND pundi_kode<>'')) AND wa IS NOT NULL AND wa<>'' GROUP BY wa"
        : "SELECT wa, nama FROM donors WHERE wa IS NOT NULL AND wa<>'' UNION SELECT wa, MAX(nama) nama FROM donations WHERE wa IS NOT NULL AND wa<>'' GROUP BY wa";
    for (const r of await all(env, sql)) add(r.wa, r.nama);
  }
  if (t.kontak_semua || t.label) {
    const want = new Set((t.label || []).map((x) => x.toLowerCase()));
    for (const r of await all(env, "SELECT wa,nama,label FROM wa_kontak")) {
      if (t.kontak_semua || labelList(r.label).some((l) => want.has(l.toLowerCase()))) add(r.wa, r.nama);
    }
  }
  if (t.anggota) {
    for (const g of t.anggota) for (const r of await all(env, "SELECT wa,nama FROM wa_grup_anggota WHERE grup_id=?", g)) add(r.wa, r.nama);
  }
  if (t.pilih) {
    const kontak = new Map((await all(env, "SELECT wa,nama FROM wa_kontak")).map((r) => [r.wa, r.nama]));
    for (const wa of t.pilih) {
      let nama = kontak.get(wa);
      if (!nama) nama = (await one(env, "SELECT nama FROM donors WHERE wa=? UNION SELECT nama FROM donations WHERE wa=? LIMIT 1", wa, wa))?.nama;
      add(wa, nama);
    }
  }
  if (t.nomor) for (const p of parseNomor(t.nomor)) add(p.wa, p.nama);
  const grup = [];
  if (t.grup) {
    const nama = new Map((await all(env, "SELECT id,nama FROM wa_grup")).map((r) => [r.id, r.nama]));
    for (const id of t.grup) grup.push({ id, nama: nama.get(id) || id });
  }
  return { pribadi: [...map.values()], grup };
}
// Kompatibel dengan pemanggil lama (audiens donatur saja)
const penerimaWA = async (env, audiens) => (await penerimaTarget(env, { donatur: audiens })).pribadi;

// Masukkan satu materi ke antrean untuk semua penerima jadwal
async function antreJadwal(env, j, item) {
  const { teks, lampiran = "" } = typeof item === "string" ? { teks: item } : item;
  const { pribadi, grup } = await penerimaTarget(env, targetOf(j));
  const stmts = [];
  for (const p of pribadi) {
    const templat = teks + WA_FOOTER;
    stmts.push(env.DB.prepare("INSERT INTO wa_antrean(jadwal_id,wa,nama,pesan,templat,lampiran,grup) VALUES(?,?,?,?,?,?,0)")
      .bind(j.id, p.wa, p.nama || "", spin(templat).replaceAll("{nama}", p.nama || "Bapak/Ibu"), templat, lampiran || null));
  }
  for (const g of grup) {
    stmts.push(env.DB.prepare("INSERT INTO wa_antrean(jadwal_id,wa,nama,pesan,templat,lampiran,grup) VALUES(?,?,?,?,?,?,1)")
      .bind(j.id, g.id, g.nama || "", spin(teks).replaceAll("{nama}", "Bapak/Ibu"), teks, lampiran || null));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return stmts.length;
}

// Materi berikutnya untuk jadwal: dari isi teks (satu baris = satu pesan) atau dari Google Sheet
async function materiJadwal(j) {
  if (j.sumber === "sheet") return materiSheet(j.sheet_url, j.kategori);
  return isiPesan(j).map((teks) => ({ teks, lampiran: j.lampiran || "" }));
}

const cocokJadwal = (j, now) => {
  const jm = jamMenit(j.jam); if (jm === null) return false;
  if (now.menit < jm || now.menit >= jm + WA_WINDOW) return false;
  if (j.mode === "sekali") return j.tanggal_mulai === now.tgl;
  if (j.mode === "mingguan") return listAngka(j.hari).includes(now.hari);
  if (j.mode === "harian") return true;
  if (j.mode === "bulanan") {
    if (!listAngka(j.bulan).includes(now.bulan)) return false;
    const pekan = Math.min(4, Math.ceil(now.tgd / 7));
    return listAngka(j.pekan).includes(pekan) || listAngka(j.tanggal).includes(now.tgd);
  }
  return false;
};

// Jadwal yang jatuh tempo: ambil satu materi (berputar ke materi pertama setelah yang terakhir)
async function prosesJadwal(env) {
  const now = witaNow();
  let n = 0;
  for (const j of await all(env, "SELECT * FROM wa_jadwal WHERE aktif=1")) {
    if (j.terakhir_tgl === now.tgl || !cocokJadwal(j, now)) continue;
    let materi;
    try { materi = await materiJadwal(j); } catch (e) {
      await run(env, "UPDATE wa_jadwal SET catatan=? WHERE id=?", String(e.message || e).slice(0, 200), j.id); continue;
    }
    if (!materi.length) continue;
    const idx = (j.baris_idx || 0) % materi.length;
    n += await antreJadwal(env, j, materi[idx]);
    await run(env, "UPDATE wa_jadwal SET terakhir_tgl=?, baris_idx=?, catatan=NULL, aktif=CASE WHEN mode='sekali' THEN 0 ELSE aktif END WHERE id=?", now.tgl, (idx + 1) % materi.length, j.id);
  }
  return n;
}

// Kirim antrean ke Fonnte. Pesan yang sama dikelompokkan: satu permintaan untuk banyak nomor,
// nama tiap penerima lewat variabel Fonnte {name}, jeda acak antar-nomor diatur antrean Fonnte.
async function kirimAntrean(env, maxPanggil = 12) {
  const cfg = await settings(env);
  if (!cfg.fonnte_token) return { terkirim: 0, gagal: 0 };
  const rows = await all(env, "SELECT id,jadwal_id,wa,nama,pesan,templat,lampiran,grup FROM wa_antrean WHERE status='menunggu' ORDER BY id LIMIT 1500");
  const kelompok = new Map();
  for (const r of rows) {
    const k = r.templat == null ? `x${r.id}` : `${r.jadwal_id}|${r.grup}|${r.lampiran || ""}|${r.templat}`;
    if (!kelompok.has(k)) kelompok.set(k, []);
    kelompok.get(k).push(r);
  }
  let terkirim = 0, gagal = 0, panggil = 0;
  for (const items of kelompok.values()) {
    for (let i = 0; i < items.length && panggil < maxPanggil; i += WA_BATCH) {
      const part = items.slice(i, i + WA_BATCH), a = part[0];
      let target, pesan;
      if (a.templat == null) { target = a.wa; pesan = a.pesan; }
      else if (a.grup) { target = part.map((x) => x.wa).join(","); pesan = spin(a.templat).replaceAll("{nama}", "Bapak/Ibu"); }
      else { target = part.map((x) => `${x.wa}|${namaAman(x.nama) || "Bapak/Ibu"}`).join(","); pesan = spin(a.templat).replaceAll("{nama}", "{name}"); }
      const r = await sendWA(cfg, target, pesan, a.lampiran ? { url: a.lampiran, filename: "materi" } : null, { delay: part.length > 1 ? WA_DELAY : "" });
      panggil++;
      const ids = part.map((x) => x.id);
      for (let k = 0; k < ids.length; k += 90) {
        const ph = ids.slice(k, k + 90);
        await run(env, `UPDATE wa_antrean SET status=?, alasan=?, dikirim_at=? WHERE id IN (${ph.map(() => "?").join(",")})`,
          r.ok ? "terkirim" : "gagal", r.ok ? (r.gambar === false ? "terkirim tanpa gambar" : null) : String(r.reason || "gagal").slice(0, 200), nowIso(), ...ph);
      }
      r.ok ? (terkirim += part.length) : (gagal += part.length);
    }
    if (panggil >= maxPanggil) break;
  }
  return { terkirim, gagal };
}

async function tickWA(env) {
  await ingatkanBukti(env).catch(() => {});
  const jadwal = await prosesJadwal(env);
  const kirim = await kirimAntrean(env);
  return { jadwal, ...kirim };
}
const kirimLatar = (env, ctx) => { const t = kirimAntrean(env).catch(() => {}); return ctx?.waitUntil ? ctx.waitUntil(t) : t; };

async function webhookKey(env) {
  const r = await one(env, "SELECT value FROM settings WHERE key='wa_webhook_key'");
  if (r) return JSON.parse(r.value);
  const k = randomId(24).toLowerCase();
  await run(env, "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_webhook_key',?)", JSON.stringify(k));
  return k;
}

// Daftar grup dari Fonnte: perbarui dulu (fetch-group), lalu ambil (get-whatsapp-group)
async function grupFonnte(cfg) {
  const post = async (path) => {
    const res = await fetch("https://api.fonnte.com/" + path, { method: "POST", headers: { Authorization: cfg.fonnte_token } });
    return res.json().catch(() => ({}));
  };
  await post("fetch-group");
  const d = await post("get-whatsapp-group");
  if (!d.status) throw bad("Fonnte: " + (d.detail || d.reason || "grup tidak dapat diambil") + ". Pastikan nomor Fonnte sudah bergabung di grup.");
  return (d.data || []).filter((g) => isGrupId(g.id)).map((g) => ({ id: g.id, nama: str(g.name, 120) || g.id }));
}

async function simpanKontak(env, items, label, sumber) {
  const lbl = labelList(label).map((x) => str(x, 40));
  const ada = new Map((await all(env, "SELECT wa,nama,label FROM wa_kontak")).map((r) => [r.wa, r]));
  const stmts = []; let baru = 0;
  const seen = new Set();
  for (const it of items) {
    const wa = waFull(it.wa); if (!wa || wa.length < 10 || seen.has(wa)) continue; seen.add(wa);
    const nama = namaAman(it.nama), lama = ada.get(wa);
    if (!lama) baru++;
    const gab = [...new Set([...labelList(lama?.label), ...lbl])].join(", ");
    stmts.push(env.DB.prepare("INSERT INTO wa_kontak(wa,nama,label,sumber) VALUES(?,?,?,?) ON CONFLICT(wa) DO UPDATE SET nama=CASE WHEN excluded.nama<>'' THEN excluded.nama ELSE wa_kontak.nama END, label=excluded.label")
      .bind(wa, nama || lama?.nama || "", gab, sumber));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return { tersimpan: stmts.length, baru };
}

const JENIS_WA = ["teks", "hadits", "ayat", "pengumuman"], AUDIENS_WA = ["semua", "sedekah", "pundi"], MODE_WA = ["sekali", "harian", "mingguan", "bulanan", "sekarang"];
const listField = (v) => (Array.isArray(v) ? v.join(",") : String(v || "")).split(",").map((x) => x.trim()).filter(Boolean).join(",");

R("GET", "admin/wa/jadwal", async ({ env, req, u }) => {
  await requireAdmin(env, req, "crm");
  await tickWA(env).catch(() => {}); // Pages tanpa cron: proses juga saat halaman dibuka
  const cfg = await settings(env);
  const hitung = await all(env, "SELECT jadwal_id, status, COUNT(*) n FROM wa_antrean WHERE jadwal_id IS NOT NULL GROUP BY jadwal_id, status");
  const jadwal = (await all(env, "SELECT * FROM wa_jadwal ORDER BY id DESC LIMIT 100")).map((j) => {
    const c = Object.fromEntries(hitung.filter((h) => h.jadwal_id === j.id).map((h) => [h.status, h.n]));
    return { ...j, target: targetOf(j), terkirim: c.terkirim || 0, gagal: c.gagal || 0, menunggu: c.menunggu || 0, baris: j.sumber === "sheet" ? null : isiPesan(j).length };
  });
  const key = await webhookKey(env);
  return json({ jadwal, token_ok: !!cfg.fonnte_token, webhook: `${u.origin}/api/wa/masuk?k=${key}`,
    menunggu_total: (await one(env, "SELECT COUNT(*) n FROM wa_antrean WHERE status='menunggu'")).n });
});
// Data pendukung: label kontak, grup, jumlah kontak
R("GET", "admin/wa/data", async ({ env, req }) => {
  await requireAdmin(env, req, "crm");
  const labels = new Map();
  const kontak = await all(env, "SELECT label FROM wa_kontak");
  for (const r of kontak) for (const l of labelList(r.label)) labels.set(l, (labels.get(l) || 0) + 1);
  const grup = await all(env, "SELECT g.id, g.nama, g.updated_at, (SELECT COUNT(*) FROM wa_grup_anggota a WHERE a.grup_id=g.id) anggota FROM wa_grup g ORDER BY g.nama");
  return json({ kontak_total: kontak.length, labels: [...labels].map(([label, n]) => ({ label, n })).sort((a, b) => a.label.localeCompare(b.label)), grup });
});
R("POST", "admin/wa/pratinjau", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const t = body.audiens && !body.target ? { donatur: AUDIENS_WA.includes(body.audiens) ? body.audiens : "semua" } : bersihTarget(body.target || {});
  const p = await penerimaTarget(env, t);
  return json({ jumlah: p.pribadi.length, grup: p.grup.length, contoh: p.pribadi.slice(0, 5).map((x) => x.nama || "+" + x.wa) });
});
R("POST", "admin/wa/sheet/cek", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const m = await materiSheet(body.url, body.kategori);
  return json({ jumlah: m.length, contoh: m.slice(0, 2) });
});
R("POST", "admin/wa/jadwal", async ({ env, ctx, req, body }) => {
  const me = await requireAdmin(env, req, "crm");
  const judul = str(body.judul, 120), isi = String(body.isi || "").trim();
  const jenis = JENIS_WA.includes(body.jenis) ? body.jenis : "teks";
  const mode = MODE_WA.includes(body.mode) ? body.mode : "sekali";
  const sumber = ["sheet", "tulis"].includes(body.sumber) ? body.sumber : "teks";
  const target = body.target ? bersihTarget(body.target) : { donatur: AUDIENS_WA.includes(body.audiens) ? body.audiens : "semua" };
  const lampiran = /^https?:\/\/\S+$/.test(String(body.lampiran || "").trim()) ? String(body.lampiran).trim().slice(0, 500) : "";
  if (!judul) throw bad("Isi judul pesan.");
  if (targetKosong(target)) throw bad("Pilih minimal satu penerima.");
  let sheet_url = "", kategori = "";
  if (sumber === "sheet") {
    sheet_url = String(body.sheet_url || "").trim().slice(0, 500); kategori = str(body.kategori, 40);
    await materiSheet(sheet_url, kategori); // validasi sekarang agar admin langsung tahu bila salah
  } else if (!isiPesan({ sumber, isi }).length) throw bad("Isi pesan belum diisi.");
  const jam = jamMenit(body.jam) !== null ? String(body.jam).trim() : "";
  const now = witaNow();
  let row = { hari: "", pekan: "", tanggal: "", bulan: "", jam: "", tanggal_mulai: null };
  if (mode === "sekali") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.tanggal || ""))) throw bad("Pilih tanggal pengiriman.");
    if (!jam) throw bad("Pilih jam pengiriman.");
    row = { ...row, tanggal_mulai: body.tanggal, jam };
  } else if (mode === "harian") {
    if (!jam) throw bad("Pilih jam pengiriman.");
    row.jam = jam;
  } else if (mode === "mingguan") {
    row.hari = listField(body.hari).split(",").filter((x) => listAngka(x).length && listAngka(x)[0] <= 7).join(",");
    if (!row.hari) throw bad("Centang minimal satu hari.");
    if (!jam) throw bad("Pilih jam pengiriman.");
    row.jam = jam;
  } else if (mode === "bulanan") {
    row.pekan = listField(body.pekan); row.tanggal = listField(body.tanggal); row.bulan = listField(body.bulan);
    if (!row.pekan && !row.tanggal) throw bad("Pilih pekan atau tanggal.");
    if (!row.bulan) throw bad("Centang minimal satu bulan.");
    if (!jam) throw bad("Pilih jam pengiriman.");
    row.jam = jam;
  }
  const r = await run(env, "INSERT INTO wa_jadwal(judul,jenis,isi,audiens,target,sumber,sheet_url,kategori,lampiran,mode,hari,pekan,tanggal,bulan,jam,tanggal_mulai,aktif,dibuat_oleh) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    judul, jenis, isi, target.donatur || "", JSON.stringify(target), sumber, sheet_url, kategori, lampiran, mode === "sekarang" ? "sekali" : mode,
    row.hari, row.pekan, row.tanggal, row.bulan, row.jam, mode === "sekarang" ? now.tgl : row.tanggal_mulai, mode === "sekarang" ? 0 : 1, me.nama);
  const id = r.meta.last_row_id;
  if (mode === "sekarang") {
    const materi = await materiJadwal({ sumber, isi, sheet_url, kategori, lampiran });
    const jumlah = await antreJadwal(env, { id, target: JSON.stringify(target) }, materi[0]);
    await run(env, "UPDATE wa_jadwal SET terakhir_tgl=?, baris_idx=? WHERE id=?", now.tgl, 1 % materi.length, id);
    await kirimLatar(env, ctx);
    return json({ ok: true, id, jumlah }, 201);
  }
  const p = await penerimaTarget(env, target);
  return json({ ok: true, id, jumlah: p.pribadi.length + p.grup.length }, 201);
});
R("POST", "admin/wa/jadwal/:id/aktif", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "UPDATE wa_jadwal SET aktif=? WHERE id=?", body.aktif ? 1 : 0, int(p.id));
  return json({ ok: true });
});
// Kirim materi berikutnya dari jadwal ini sekarang juga (tanpa menunggu jamnya)
R("POST", "admin/wa/jadwal/:id/kirim", async ({ env, ctx, req, p }) => {
  await requireAdmin(env, req, "crm");
  const j = await one(env, "SELECT * FROM wa_jadwal WHERE id=?", int(p.id));
  if (!j) throw new HttpError(404, "Jadwal tidak ditemukan.");
  const materi = await materiJadwal(j);
  const idx = (j.baris_idx || 0) % materi.length;
  const jumlah = await antreJadwal(env, j, materi[idx]);
  await run(env, "UPDATE wa_jadwal SET baris_idx=? WHERE id=?", (idx + 1) % materi.length, j.id);
  await kirimLatar(env, ctx);
  return json({ ok: true, jumlah });
});
R("POST", "admin/wa/jadwal/:id/ulang", async ({ env, ctx, req, p }) => {
  await requireAdmin(env, req, "crm");
  const r = await run(env, "UPDATE wa_antrean SET status='menunggu', alasan=NULL WHERE jadwal_id=? AND status='gagal'", int(p.id));
  await kirimLatar(env, ctx);
  return json({ ok: true, jumlah: r.meta.changes || 0 });
});
R("DELETE", "admin/wa/jadwal/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "DELETE FROM wa_antrean WHERE jadwal_id=? AND status='menunggu'", int(p.id));
  await run(env, "DELETE FROM wa_jadwal WHERE id=?", int(p.id));
  return json({ ok: true });
});
R("POST", "admin/wa/proses", async ({ env, req }) => {
  await requireAdmin(env, req, "crm");
  return json({ ok: true, ...(await tickWA(env)) });
});
R("GET", "admin/wa/riwayat", async ({ env, req, u }) => {
  await requireAdmin(env, req, "crm");
  const st = u.searchParams.get("status");
  const where = ["menunggu", "terkirim", "gagal"].includes(st) ? "WHERE a.status=?" : "";
  const rows = await all(env, `SELECT a.id,a.wa,a.nama,a.pesan,a.status,a.alasan,a.grup,a.created_at,a.dikirim_at,COALESCE(j.judul,a.label) judul FROM wa_antrean a LEFT JOIN wa_jadwal j ON j.id=a.jadwal_id ${where} ORDER BY a.id DESC LIMIT 300`, ...(where ? [st] : []));
  const total = Object.fromEntries((await all(env, "SELECT status, COUNT(*) n FROM wa_antrean GROUP BY status")).map((r) => [r.status, r.n]));
  return json({ rows, total });
});

// ---- Kontak WA (buku telepon admin) ----
R("GET", "admin/wa/kontak", async ({ env, req, u }) => {
  await requireAdmin(env, req, "crm");
  const q = str(u.searchParams.get("q"), 60).toLowerCase(), lbl = str(u.searchParams.get("label"), 40).toLowerCase();
  let rows = await all(env, "SELECT wa,nama,label,sumber,created_at FROM wa_kontak ORDER BY nama COLLATE NOCASE, wa");
  if (q) rows = rows.filter((r) => (r.nama || "").toLowerCase().includes(q) || r.wa.includes(q.replace(/\D/g, "") || "~"));
  if (lbl) rows = rows.filter((r) => labelList(r.label).some((l) => l.toLowerCase() === lbl));
  return json({ total: rows.length, rows: rows.slice(0, 500) });
});
R("POST", "admin/wa/kontak", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const wa = waFull(body.wa); if (!wa || wa.length < 10) throw bad("Nomor WhatsApp tidak valid.");
  if (body.ganti_label) await run(env, "UPDATE wa_kontak SET label='' WHERE wa=?", wa);
  return json({ ok: true, ...(await simpanKontak(env, [{ wa, nama: body.nama }], body.label, "manual")) });
});
// Impor: teks tempelan (nama & nomor bebas format) atau daftar dari file .vcf/.csv/kontak HP yang diurai di browser
R("POST", "admin/wa/kontak/impor", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const items = Array.isArray(body.items) ? body.items.slice(0, 5000) : parseNomor(body.teks);
  if (!items.length) throw bad("Tidak ada nomor WhatsApp yang terbaca.");
  return json({ ok: true, ...(await simpanKontak(env, items, body.label, str(body.sumber, 20) || "impor")) });
});
R("DELETE", "admin/wa/kontak/:wa", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "DELETE FROM wa_kontak WHERE wa=?", waFull(p.wa));
  return json({ ok: true });
});
// Cari penerima satu per satu (kontak + donatur)
R("GET", "admin/wa/cari", async ({ env, req, u }) => {
  await requireAdmin(env, req, "crm");
  const q = str(u.searchParams.get("q"), 60); if (q.length < 2) return json([]);
  const like = `%${q}%`, dig = q.replace(/\D/g, "");
  const rows = await all(env, `SELECT wa, nama, 'kontak' sumber FROM wa_kontak WHERE nama LIKE ?1 ${dig.length >= 4 ? "OR wa LIKE ?2" : ""}
    UNION SELECT wa, nama, 'donatur' sumber FROM donors WHERE wa IS NOT NULL AND wa<>'' AND (nama LIKE ?1 ${dig.length >= 4 ? "OR wa LIKE ?2" : ""}) LIMIT 40`,
  ...(dig.length >= 4 ? [like, `%${dig}%`] : [like]));
  const map = new Map();
  for (const r of rows) { const wa = waFull(r.wa); if (wa && !map.has(wa)) map.set(wa, { wa, nama: r.nama || "", sumber: r.sumber }); }
  return json([...map.values()].slice(0, 30));
});

// ---- Grup WA ----
R("POST", "admin/wa/grup/sinkron", async ({ env, req }) => {
  await requireAdmin(env, req, "crm");
  const cfg = await settings(env);
  if (!cfg.fonnte_token) throw bad("Isi token Fonnte di Pengaturan terlebih dahulu.");
  const grup = await grupFonnte(cfg);
  const stmts = grup.map((g) => env.DB.prepare("INSERT INTO wa_grup(id,nama,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, updated_at=excluded.updated_at").bind(g.id, g.nama, nowIso()));
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return json({ ok: true, jumlah: grup.length });
});
R("POST", "admin/wa/grup", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const id = String(body.id || "").trim(); if (!isGrupId(id)) throw bad("ID grup harus berakhiran @g.us.");
  await run(env, "INSERT INTO wa_grup(id,nama,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET nama=excluded.nama", id, str(body.nama, 120) || id, nowIso());
  return json({ ok: true });
});
R("DELETE", "admin/wa/grup/:id", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "DELETE FROM wa_grup_anggota WHERE grup_id=?", p.id);
  await run(env, "DELETE FROM wa_grup WHERE id=?", p.id);
  return json({ ok: true });
});
R("GET", "admin/wa/grup/:id/anggota", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  return json(await all(env, "SELECT wa,nama,sumber,created_at FROM wa_grup_anggota WHERE grup_id=? ORDER BY nama COLLATE NOCASE, wa", p.id));
});
R("POST", "admin/wa/grup/:id/anggota", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "crm");
  if (!(await one(env, "SELECT id FROM wa_grup WHERE id=?", p.id))) throw new HttpError(404, "Grup tidak ditemukan.");
  const items = Array.isArray(body.items) ? body.items.slice(0, 5000) : parseNomor(body.teks);
  if (!items.length) throw bad("Tidak ada nomor WhatsApp yang terbaca.");
  const seen = new Set(), stmts = [];
  for (const it of items) {
    const wa = waFull(it.wa); if (!wa || wa.length < 10 || seen.has(wa)) continue; seen.add(wa);
    stmts.push(env.DB.prepare("INSERT INTO wa_grup_anggota(grup_id,wa,nama,sumber) VALUES(?,?,?,'manual') ON CONFLICT(grup_id,wa) DO UPDATE SET nama=CASE WHEN excluded.nama<>'' THEN excluded.nama ELSE wa_grup_anggota.nama END")
      .bind(p.id, wa, namaAman(it.nama)));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return json({ ok: true, jumlah: stmts.length });
});
R("DELETE", "admin/wa/grup/:id/anggota/:wa", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "DELETE FROM wa_grup_anggota WHERE grup_id=? AND wa=?", p.id, waFull(p.wa));
  return json({ ok: true });
});

// ---- Daftar berhenti ----
R("GET", "admin/wa/berhenti", async ({ env, req }) => {
  await requireAdmin(env, req, "crm");
  return json(await all(env, "SELECT wa,nama,status,created_at,dikonfirmasi_at,sumber FROM wa_berhenti ORDER BY created_at DESC LIMIT 300"));
});
R("POST", "admin/wa/berhenti", async ({ env, req, body }) => {
  await requireAdmin(env, req, "crm");
  const wa = waFull(body.wa); if (!wa) throw bad("Isi nomor WhatsApp.");
  await run(env, "INSERT INTO wa_berhenti(wa,nama,status,dikonfirmasi_at,sumber) VALUES(?,?,'dikonfirmasi',?,'manual') ON CONFLICT(wa) DO UPDATE SET status='dikonfirmasi', dikonfirmasi_at=excluded.dikonfirmasi_at",
    wa, str(body.nama, 80) || null, nowIso());
  return json({ ok: true });
});
R("POST", "admin/wa/berhenti/:wa/konfirmasi", async ({ env, req, p }) => {
  const me = await requireAdmin(env, req, "crm");
  const wa = waFull(p.wa);
  const r = await run(env, "UPDATE wa_berhenti SET status='dikonfirmasi', dikonfirmasi_at=?, sumber=? WHERE wa=?", nowIso(), "dikonfirmasi " + me.nama, wa);
  if (!r.meta.changes) throw new HttpError(404, "Nomor tidak ditemukan dalam daftar berhenti.");
  return json({ ok: true });
});
R("DELETE", "admin/wa/berhenti/:wa", async ({ env, req, p }) => {
  await requireAdmin(env, req, "crm");
  await run(env, "DELETE FROM wa_berhenti WHERE wa=?", waFull(p.wa));
  return json({ ok: true });
});

// Webhook Fonnte: (1) pesan di grup → catat pengirim sebagai anggota grup; (2) balasan BERHENTI di chat pribadi.
const waMasuk = async ({ env, ctx, u, body }) => {
  if (u.searchParams.get("k") !== (await webhookKey(env))) throw new HttpError(403, "Kunci webhook salah.");
  const gid = [body.sender, body.from, body.group, body.groupid].map((x) => String(x || "").trim()).find(isGrupId);
  const nama = str(body.name || body.pushname, 80) || null;
  if (gid) {
    const m = waFull(body.member || body.participant || body.author || "");
    if (m && m.length >= 10) {
      await run(env, "INSERT INTO wa_grup(id,nama,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING", gid, gid, nowIso());
      await run(env, "INSERT INTO wa_grup_anggota(grup_id,wa,nama,sumber) VALUES(?,?,?,'webhook') ON CONFLICT(grup_id,wa) DO UPDATE SET nama=COALESCE(excluded.nama, wa_grup_anggota.nama)", gid, m, namaAman(nama) || null);
    }
    return json({ ok: true });
  }
  const wa = waFull(body.sender || body.from || "");
  const teks = String(body.message || body.text || "").trim().toLowerCase();
  if (wa && /\bberhenti\b/.test(teks)) {
    await run(env, "INSERT INTO wa_berhenti(wa,nama,status) VALUES(?,?,'menunggu') ON CONFLICT(wa) DO UPDATE SET status=CASE WHEN wa_berhenti.status='dikonfirmasi' THEN 'dikonfirmasi' ELSE 'menunggu' END", wa, nama);
    const cfg = await settings(env);
    if (cfg.wa_admin) {
      const msg = `🔔 Permintaan berhenti dari +${wa}${nama ? ` (${nama})` : ""}.\nNomor ini tidak akan menerima pesan lagi.\nKonfirmasi di aplikasi: ${u.origin}/admin#pesanwa?berhenti=${wa}`;
      const t = notifWA(env, cfg, cfg.wa_admin, msg, "Info admin: permintaan berhenti").catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(t) : await t;
    }
  }
  return json({ ok: true });
};
R("POST", "wa/masuk", waMasuk);
R("GET", "wa/masuk", async () => json({ ok: true }));

// Halaman bagikan: /c/slug, /program/slug, /berita/slug (dan /) dengan tag pratinjau (Open Graph) dari server,
// agar WhatsApp/Facebook menampilkan judul, ringkasan, dan gambar. Pengunjung lalu diarahkan ke halaman aplikasi.
const escAttr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export async function ogPage(request, env) {
  try { return await ogPageInti(request, env); } catch { return env.ASSETS.fetch(request); }
}
async function ogPageInti(request, env) {
  const url = new URL(request.url);
  // Ambil index.html tanpa header cache browser (If-None-Match) agar tidak mendapat 304 kosong
  const asset = await env.ASSETS.fetch(new Request(new URL("/", url).toString(), { headers: { accept: "text/html" } }));
  let html = asset.ok ? await asset.text() : "";
  if (!/<head>/i.test(html) || !/<\/html>/i.test(html)) return env.ASSETS.fetch(request);
  const m = /^\/(c|program|berita)\/([\w-]+)\/?$/.exec(url.pathname);
  const halamanQurban = /^\/qurban\/?$/.test(url.pathname);
  let cabang = "Poso", title = "", desc = "", img = "", imgW = 0, hash = "", type = "website";
  try {
    if (env.DB) {
      await init(env);
      const cfg = await settings(env); cabang = cfg.cabang || cabang;
      if (m && m[1] === "berita") {
        const r = await one(env, "SELECT slug,judul,ringkas,cover_id,og_id FROM articles WHERE slug=? AND status='terbit'", m[2]);
        if (r) { title = r.judul; desc = r.ringkas || ""; img = r.og_id ? `/api/media/${r.og_id}` : r.cover_id ? `/api/media/${r.cover_id}` : ""; imgW = r.og_id ? 1200 : 0; hash = `#/berita/${r.slug}`; type = "article"; }
      } else if (m) {
        const r = await one(env, "SELECT slug,judul,ringkas,cover_id,og_id FROM campaigns WHERE slug=? AND status!='draft'", m[2]);
        if (r) { title = r.judul; desc = r.ringkas || ""; img = r.og_id ? `/api/media/${r.og_id}` : r.cover_id ? `/api/media/${r.cover_id}` : ""; imgW = r.og_id ? 1200 : 0; hash = `#/c/${r.slug}`; }
      } else if (halamanQurban) {
        const h = await qurbanHalaman(env), musim = await qurbanMusimAktif(env);
        const gid = h.cover_id || galeriIds(h.dokumentasi[0]?.galeri || [])[0] || null;
        title = musim ? `Tabungan Qurban ${musim.tahun_hijriah}` : "Tabungan Qurban";
        desc = h.narasi.replace(/\s+/g, " ").trim() || `Menabung qurban sedikit demi sedikit bersama WIZ Cabang ${cabang}. Pelunasan sebelum Idul Adha.`;
        img = gid ? `/api/media/${gid}` : ""; hash = "#/qurban";
      }
    }
  } catch {}
  const site = `WIZ Cabang ${cabang}`;
  title = title ? `${title} · ${site}` : `${site} – Zakat, Infak & Sedekah`;
  desc = (desc || `Tunaikan zakat, infak, dan sedekah untuk warga ${cabang}. Mudah, aman, kuitansi otomatis via WhatsApp.`).slice(0, 200);
  const imgAbs = new URL(img || "/assets/icon.png", url).toString();
  const pageUrl = new URL(url.pathname, url).toString();
  const meta = [
    `<title>${escAttr(title)}</title>`, `<meta name="description" content="${escAttr(desc)}">`,
    `<meta property="og:type" content="${type}">`, `<meta property="og:site_name" content="${escAttr(site)}">`,
    `<meta property="og:title" content="${escAttr(title)}">`, `<meta property="og:description" content="${escAttr(desc)}">`,
    `<meta property="og:url" content="${escAttr(pageUrl)}">`, `<meta property="og:image" content="${escAttr(imgAbs)}">`,
    `<meta property="og:image:secure_url" content="${escAttr(imgAbs)}">`, `<meta property="og:image:alt" content="${escAttr(title)}">`,
    ...(imgW ? [`<meta property="og:image:type" content="image/jpeg">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`] : []),
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`, `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(desc)}">`, `<meta name="twitter:image" content="${escAttr(imgAbs)}">`,
    `<link rel="canonical" href="${escAttr(pageUrl)}">`,
    hash ? `<script>if(!location.hash)history.replaceState(null,"","/"+location.search+${JSON.stringify(hash)});</script>` : "",
  ].join("\n");
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "")
    .replace(/<link rel="canonical"[^>]*>\s*/i, "")
    .replace(/<head>/i, `<head>\n${meta}`);
  const headers = new Headers(asset.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  for (const k of ["content-length", "etag", "last-modified", "content-encoding"]) headers.delete(k);
  headers.set("cache-control", "no-cache");
  return new Response(html, { status: 200, headers });
}

export async function handle(request, env, ctx) {
  try {
    if (!env.DB) return json({ error: "Database belum terhubung. Tambahkan binding D1 bernama DB di pengaturan Cloudflare Pages." }, 500);
    await init(env);
    const u = new URL(request.url);
    const path = u.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const method = request.method === "HEAD" ? "GET" : request.method;
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = path.match(r.re); if (!m) continue;
      let body = {};
      if (["POST", "PUT"].includes(method)) {
        const ct = request.headers.get("content-type") || "";
        if (ct.includes("application/json")) body = await request.json().catch(() => ({}));
        else if (ct.includes("form")) body = Object.fromEntries((await request.formData()).entries());
        // Perlindungan CSRF sederhana untuk rute admin/fundraiser
        if (/^(admin|fr|field)\//.test(path)) {
          const origin = request.headers.get("origin");
          if (origin && origin !== u.origin) throw new HttpError(403, "Permintaan dari situs lain ditolak.");
        }
      }
      return await r.fn({ env, ctx, req: request, u, p: Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => { try { return [k, decodeURIComponent(v)]; } catch { return [k, v]; } })), body });
    }
    return json({ error: "Alamat API tidak ditemukan." }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Terjadi kesalahan di server. Coba lagi sebentar." }, 500);
  }
}
