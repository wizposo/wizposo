// API WIZ Cabang — berjalan di Cloudflare Pages Functions dengan database D1 (binding: DB).
import { SCHEMA, MIGRATIONS, AMPLOP_CAMPAIGN, ROLES, PERMS, DEFAULT_SETTINGS, SEED_CAMPAIGNS } from "./schema.js";
import { fieldRoutes } from "./field.js";
import {
  HttpError, bad, json, randomId, hashPass, verifyPass, signSession, readSession, getCookie, sessionCookie,
  cleanWA, waFull, str, int, slugify, maskName, nowIso, csv,
} from "./util.js";
import { enqueue, addDrive, driveStatus, runSync, saveDrives, BATAS_PERSEN } from "./drive.js";
import { midtransCreate, midtransVerify, midtransStatus, midtransCheck, sendWA, msgKuitansi, msgAdmin, msgFundraiser } from "./integrations.js";

const SCHEMA_VERSION = "6";
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
  const a = await one(env, "SELECT id,nama,email,wa,role,wilayah,ttd_id,aktif FROM admins WHERE id=?", s.id);
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
const CAMP_COLS = "c.id,c.slug,c.judul,c.ringkas,c.jenis_dana,c.kategori,c.ikon,c.target,c.batas,c.cover_id,c.status,c.unggulan,c.urutan";
const campTotals = `LEFT JOIN (SELECT campaign_id, SUM(total) terkumpul, COUNT(*) donatur FROM donations WHERE status='paid' GROUP BY campaign_id) t ON t.campaign_id=c.id`;
function campOut(c) {
  return { ...c, terkumpul: c.terkumpul || 0, donatur: c.donatur || 0, unggulan: !!c.unggulan,
    cover: c.cover_id ? `/api/media/${c.cover_id}` : null,
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
    fundraiser: d.fr_nama || null, ada_bukti: !!d.bukti_id, kotak_kode: d.kotak_kode, pundi_kode: d.pundi_kode,
    rekening: manual && d.metode === "transfer" ? (cfg.rekening || []).filter((r) => r.no) : undefined,
    qris: manual && d.metode === "qris" && cfg.qris_media_id ? `/api/media/${cfg.qris_media_id}` : undefined,
  };
}
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
    if (cfg.notif_donatur && d.wa) await sendWA(cfg, d.wa, msgKuitansi(cfg, d, d.judul || "Donasi", `${origin}/#/kuitansi/${d.id}`));
    if (cfg.notif_admin && cfg.wa_admin && d.kanal === "online") await sendWA(cfg, cfg.wa_admin, msgAdmin(cfg, d, d.judul || "Donasi", d.fr_nama));
    if (d.kotak_kode) {
      const k = await one(env, "SELECT nama_lokasi,pemilik,wa_pemilik FROM kotak WHERE kode=?", d.kotak_kode);
      if (k?.wa_pemilik) await sendWA(cfg, k.wa_pemilik, `Assalamu'alaikum ${k.pemilik || "Bapak/Ibu"},\n\nKotak amal WIZ (${d.kotak_kode}) di ${k.nama_lokasi} telah dijemput${d.petugas ? " oleh " + d.petugas : ""}.\nIsi kotak: *Rp${d.total.toLocaleString("id-ID")}*\n\nTerima kasih telah menjadi tempat kebaikan. Semoga Allah memberkahi usaha Anda.`);
    }
    if (cfg.notif_fundraiser && d.fundraiser_id) {
      const fr = await one(env, "SELECT nama,wa FROM fundraisers WHERE id=?", d.fundraiser_id);
      if (fr) await sendWA(cfg, fr.wa, msgFundraiser(cfg, d, d.judul || "Donasi", fr));
    }
    await run(env, "UPDATE donations SET notified=1 WHERE id=?", id);
  })().catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(tasks) : await tasks;
  return true;
}

async function applyGatewayStatus(env, ctx, req, id, n) {
  const st = midtransStatus(n);
  if (st === "paid") return markPaid(env, ctx, req, id, null);
  if (st !== "pending") { await run(env, "UPDATE donations SET status=? WHERE id=? AND status='pending'", st, id); await enqueue(env, "donasi", id); }
  return false;
}

async function createDonation(env, ctx, req, b, { offline = false, admin = null } = {}) {
  const cfg = await settings(env);
  const camp = b.campaign_id
    ? await one(env, "SELECT * FROM campaigns WHERE id=?", int(b.campaign_id))
    : await one(env, "SELECT * FROM campaigns WHERE slug=?", str(b.campaign, 80));
  if (!camp || (!offline && camp.status !== "aktif")) throw bad("Program tidak ditemukan atau sudah ditutup.");
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
  if (b.wa && wa.length < 11) throw bad("Nomor WhatsApp belum lengkap.");
  const nama = str(b.nama, 80), sapaan = str(b.sapaan, 10);
  const donorId = await upsertDonor(env, wa, { nama, sapaan, ...(offline ? { alamat: str(b.alamat, 200) } : {}) });
  let frId = null;
  if (b.ref) { const fr = await one(env, "SELECT id FROM fundraisers WHERE kode=? AND status='aktif'", str(b.ref, 20).toUpperCase()); frId = fr?.id || null; }
  if (offline && b.fundraiser_id) frId = int(b.fundraiser_id) || null;
  const kode = !offline && (metode === "transfer" || metode === "qris") ? await pickUniqueCode(env, nominal) : 0;
  const id = "W" + randomId(11);
  const kotak = str(b.kotak_kode, 20).toUpperCase() || null, pundi = str(b.pundi_kode, 20).toUpperCase() || null;
  await run(env, `INSERT INTO donations(id,campaign_id,jenis_dana,nominal,kode_unik,total,donor_id,sapaan,nama,wa,anonim,doa,metode,kanal,status,fundraiser_id,kotak_kode,pundi_kode,petugas,catatan,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, camp.id, camp.jenis_dana, nominal, kode, nominal + kode, donorId, sapaan, nama, wa || null, b.anonim ? 1 : 0, str(b.doa, 300) || null,
    metode, offline ? "offline" : "online", "pending", frId, kotak, pundi, offline ? str(b.petugas, 60) || admin?.nama || null : null,
    str(b.catatan, 300) || null, nowIso());

  await enqueue(env, "donasi", id);
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
  return donationPublic(await one(env, DON_SELECT + " WHERE d.id=?", id), cfg);
}

/* ================= Media ================= */
async function saveMedia(env, dataUrl, priv = 0) {
  const m = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw bad("Format gambar harus PNG, JPG, atau WebP.");
  if (m[2].length > 900_000) throw bad("Gambar terlalu besar. Maksimal sekitar 650 KB.");
  const r = await run(env, "INSERT INTO media(mime,data,private) VALUES(?,?,?)", m[1], m[2], priv);
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
async function serveMedia(env, id, cache = "private, max-age=86400") {
  const m = id ? await one(env, "SELECT mime,data FROM media WHERE id=?", int(id)) : null;
  if (!m || !m.data) throw new HttpError(404, "File tidak ditemukan.");
  return new Response(b64bytes(m.data), { headers: { "content-type": m.mime, "cache-control": cache } });
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
    kantor_alamat: c.kantor_alamat, call_center: c.call_center, kode_cabang: c.kode_cabang });
});
R("GET", "public/campaigns", async ({ env }) => {
  const rows = await all(env, `SELECT ${CAMP_COLS}, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.status='aktif' ORDER BY c.unggulan DESC, c.urutan, c.id`);
  return json(rows.map(campOut));
});
R("GET", "public/campaigns/:slug", async ({ env, p }) => {
  const c = await one(env, `SELECT ${CAMP_COLS}, c.cerita, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.slug=? AND c.status!='draft'`, p.slug);
  if (!c) throw new HttpError(404, "Program tidak ditemukan.");
  const updates = await all(env, "SELECT id,judul,isi,created_at FROM campaign_updates WHERE campaign_id=? ORDER BY id DESC LIMIT 20", c.id);
  const donors = await all(env, "SELECT nama,anonim,total,doa,paid_at FROM donations WHERE campaign_id=? AND status='paid' ORDER BY paid_at DESC LIMIT 30", c.id);
  return json({ ...campOut(c), cerita: c.cerita, updates, donors: donors.map((d) => ({ nama: maskName(d.nama, d.anonim), total: d.total, doa: d.doa, waktu: d.paid_at })) });
});
R("GET", "public/live", async ({ env }) => {
  const recent = await all(env, `SELECT d.seq,d.nama,d.anonim,d.total,d.paid_at,c.judul FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id WHERE d.status='paid' AND d.kanal='online' ORDER BY d.paid_at DESC LIMIT 10`);
  const tot = await one(env, `SELECT COALESCE(SUM(total),0) bulan, COUNT(*) n, COUNT(DISTINCT COALESCE(donor_id, id)) donatur FROM donations WHERE status='paid' AND strftime('%Y-%m', datetime(paid_at,'${TZ}'))=strftime('%Y-%m', datetime('now','${TZ}'))`);
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
R("POST", "public/donations/:id/bukti", async ({ env, ctx, p, body }) => {
  const d = await one(env, "SELECT id,status,metode,total,nama FROM donations WHERE id=?", p.id);
  if (!d || d.status !== "pending" || !["transfer", "qris"].includes(d.metode)) throw bad("Bukti tidak bisa diunggah untuk transaksi ini.");
  const mid = await saveMedia(env, body.gambar, 1);
  await run(env, "UPDATE donations SET bukti_id=? WHERE id=?", mid, d.id);
  const cfg = await settings(env);
  if (cfg.wa_admin) { const t = sendWA(cfg, cfg.wa_admin, `📎 Bukti transfer diunggah – ${d.id}\n${d.nama || "Hamba Allah"} · Rp${d.total.toLocaleString("id-ID")}\nPeriksa di dashboard admin.`); ctx?.waitUntil ? ctx.waitUntil(t) : await t; }
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
  const f = await one(env, "SELECT kode,nama FROM fundraisers WHERE kode=? AND status='aktif'", p.kode.toUpperCase());
  return json(f || null);
});
R("GET", "media/:id", async ({ env, p }) => {
  const m = await one(env, "SELECT mime,data,private FROM media WHERE id=?", int(p.id));
  if (!m || m.private) throw new HttpError(404, "Gambar tidak ditemukan.");
  return mediaResponse(m);
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

/* ---------- Fundraiser ---------- */
R("POST", "fr/register", async ({ env, req, body }) => {
  const cfg = await settings(env);
  const nama = str(body.nama, 60), wa = waFull(body.wa), pin = String(body.pin || "");
  if (!nama || wa.length < 11) throw bad("Isi nama dan nomor WhatsApp yang valid.");
  if (!/^\d{6}$/.test(pin)) throw bad("PIN harus 6 angka.");
  if (await one(env, "SELECT id FROM fundraisers WHERE wa=?", wa)) throw bad("Nomor ini sudah terdaftar. Silakan masuk.");
  const base = slugify(nama.split(" ")[0]).replace(/-/g, "").toUpperCase().slice(0, 8) || "MITRA";
  let kode = base; for (let i = 0; await one(env, "SELECT id FROM fundraisers WHERE kode=?", kode); i++) kode = base + (10 + Math.floor(Math.random() * 89));
  const r = await run(env, "INSERT INTO fundraisers(kode,nama,wa,pin_hash,kota,status) VALUES(?,?,?,?,?,?)", kode, nama, wa, await hashPass(pin), str(body.kota, 60), cfg.fr_auto_aktif ? "aktif" : "nonaktif");
  await enqueue(env, "fundraiser", kode);
  return json({ ok: true, kode }, 201, { "set-cookie": await setSession(env, req, "wiz_fr", { t: "f", id: r.meta.last_row_id }, 30) });
});
R("POST", "fr/login", async ({ env, req, body }) => {
  const f = await one(env, "SELECT id,pin_hash FROM fundraisers WHERE wa=?", waFull(body.wa));
  if (!f || !(await verifyPass(String(body.pin || ""), f.pin_hash))) throw new HttpError(401, "Nomor WhatsApp atau PIN salah.");
  return json({ ok: true }, 200, { "set-cookie": await setSession(env, req, "wiz_fr", { t: "f", id: f.id }, 30) });
});
R("POST", "fr/logout", async () => json({ ok: true }, 200, { "set-cookie": "wiz_fr=; Path=/; Max-Age=0" }));
R("GET", "fr/me", async ({ env, req }) => {
  const f = await requireFr(env, req);
  const st = await one(env, "SELECT COUNT(*) n, COALESCE(SUM(total),0) total, COUNT(DISTINCT COALESCE(donor_id,id)) donatur FROM donations WHERE fundraiser_id=? AND status='paid'", f.id);
  const bulan = await one(env, `SELECT COALESCE(SUM(total),0) total FROM donations WHERE fundraiser_id=? AND status='paid' AND strftime('%Y-%m', datetime(paid_at,'${TZ}'))=strftime('%Y-%m', datetime('now','${TZ}'))`, f.id);
  const board = await all(env, "SELECT f.id,f.nama,COALESCE(SUM(d.total),0) total FROM fundraisers f LEFT JOIN donations d ON d.fundraiser_id=f.id AND d.status='paid' WHERE f.status='aktif' GROUP BY f.id ORDER BY total DESC LIMIT 50");
  const rank = board.findIndex((x) => x.id === f.id) + 1;
  const recent = await all(env, "SELECT d.nama,d.anonim,d.total,d.status,d.created_at,c.judul FROM donations d LEFT JOIN campaigns c ON c.id=d.campaign_id WHERE d.fundraiser_id=? ORDER BY d.seq DESC LIMIT 20", f.id);
  const camps = await all(env, `SELECT ${CAMP_COLS}, t.terkumpul, t.donatur FROM campaigns c ${campTotals} WHERE c.status='aktif' ORDER BY c.unggulan DESC, c.urutan`);
  const cfg = await settings(env);
  return json({ me: f, stat: { ...st, bulan_ini: bulan.total }, rank, peserta: board.length, apresiasi: cfg.fr_apresiasi,
    leaderboard: board.slice(0, 10).map((x, i) => ({ rank: i + 1, nama: maskName(x.nama), total: x.total, saya: x.id === f.id })),
    recent: recent.map((r) => ({ nama: maskName(r.nama, r.anonim), total: r.total, status: r.status, waktu: r.created_at, program: r.judul })),
    campaigns: camps.map(campOut) });
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
const adminPub = (a) => ({ id: a.id, nama: a.nama, email: String(a.email).startsWith("wa:") ? "" : a.email, wa: a.wa, role: a.role === "petugas" ? "zisko" : a.role, wilayah: a.wilayah, aktif: !!a.aktif, created_at: a.created_at });
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
  await run(env, "INSERT INTO admins(nama,email,wa,role,wilayah,pass_hash) VALUES(?,?,?,?,?,?)", f.nama, f.email, f.wa, f.role, f.wilayah, await hashPass(pw));
  return json({ ok: true }, 201);
});
R("PUT", "admin/admins/:id", async ({ env, req, p, body }) => {
  const me = await requireAdmin(env, req, "pengaturan"); const id = int(p.id);
  const f = await adminFields(env, body, id);
  if (id === me.id && (f.role !== "admin" || body.aktif === false)) throw bad("Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri.");
  await run(env, "UPDATE admins SET nama=?, email=?, wa=?, role=?, wilayah=?, aktif=? WHERE id=?", f.nama, f.email, f.wa, f.role, f.wilayah, body.aktif === false ? 0 : 1, id);
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
const adminDon = (d) => ({ seq: d.seq, id: d.id, status: d.status, total: d.total, nominal: d.nominal, kode_unik: d.kode_unik, metode: d.metode, kanal: d.kanal,
  jenis_dana: d.jenis_dana, program: d.judul, campaign_id: d.campaign_id, nama: d.nama, sapaan: d.sapaan, anonim: !!d.anonim, wa: d.wa, doa: d.doa,
  fundraiser: d.fr_nama, kotak_kode: d.kotak_kode, pundi_kode: d.pundi_kode, petugas: d.petugas, catatan: d.catatan, bukti_id: d.bukti_id,
  created_at: d.created_at, paid_at: d.paid_at, donor_id: d.donor_id, slip_no: d.slip_no, serah: d.serah, serah_oleh: d.serah_oleh });

/* ---------- Admin: donasi ---------- */
function donFilter(u) {
  const w = [], a = [];
  const s = (k) => u.searchParams.get(k);
  if (s("status")) { w.push("d.status=?"); a.push(s("status")); }
  if (s("jenis")) { w.push("d.jenis_dana=?"); a.push(s("jenis")); }
  if (s("campaign")) { w.push("d.campaign_id=?"); a.push(int(s("campaign"))); }
  if (s("metode")) { w.push("d.metode=?"); a.push(s("metode")); }
  if (s("fundraiser")) { w.push("d.fundraiser_id=?"); a.push(int(s("fundraiser"))); }
  if (s("dari")) { w.push(`date(datetime(COALESCE(d.paid_at,d.created_at),'${TZ}'))>=?`); a.push(s("dari")); }
  if (s("sampai")) { w.push(`date(datetime(COALESCE(d.paid_at,d.created_at),'${TZ}'))<=?`); a.push(s("sampai")); }
  if (s("q")) { w.push("(d.nama LIKE ? OR d.wa LIKE ? OR d.id LIKE ? OR d.kotak_kode LIKE ? OR d.pundi_kode LIKE ? OR d.slip_no LIKE ?)"); const k = "%" + s("q") + "%"; a.push(k, k, k, k, k, k); }
  return { where: w.length ? " WHERE " + w.join(" AND ") : "", args: a };
}
R("GET", "admin/donations", async ({ env, req, u }) => {
  await requireAdmin(env, req);
  const { where, args } = donFilter(u); const page = Math.max(1, int(u.searchParams.get("page")) || 1);
  const rows = await all(env, DON_SELECT + where + " ORDER BY d.seq DESC LIMIT 50 OFFSET ?", ...args, (page - 1) * 50);
  const agg = await one(env, `SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN d.status='paid' THEN d.total END),0) paid FROM donations d` + where, ...args);
  return json({ rows: rows.map(adminDon), total: agg.n, paid: agg.paid, page });
});
R("POST", "admin/donations", async ({ env, ctx, req, body }) => {
  const me = await requireAdmin(env, req, "catat");
  return json(await createDonation(env, ctx, req, body, { offline: true, admin: me }), 201);
});
R("POST", "admin/donations/:id/status", async ({ env, ctx, req, p, body }) => {
  await requireAdmin(env, req, "keuangan");
  const st = body.status;
  if (st === "paid") { const ok = await markPaid(env, ctx, req, p.id, null); return json({ ok, info: ok ? "Ditandai lunas, notifikasi dikirim." : "Sudah lunas sebelumnya." }); }
  if (!["cancelled", "pending"].includes(st)) throw bad("Status tidak dikenal.");
  await run(env, "UPDATE donations SET status=?, paid_at=NULL WHERE id=?", st, p.id); await enqueue(env, "donasi", p.id); return json({ ok: true });
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
  if (!["lihat", "slip", "lapangan", "peta"].some((x) => can(me, x))) throw new HttpError(403, "Tidak ada akses."); const m = await one(env, "SELECT mime,data,private FROM media WHERE id=?", int(p.id));
  if (!m) throw new HttpError(404, "Gambar tidak ditemukan."); return mediaResponse(m);
});
R("POST", "admin/media", async ({ env, req, body }) => { await requireAdmin(env, req, "slip"); return json({ id: await saveMedia(env, body.gambar, 0) }, 201); });

/* ---------- Admin: campaign ---------- */
R("GET", "admin/campaigns", async ({ env, req }) => {
  await requireAdmin(env, req);
  const rows = await all(env, `SELECT ${CAMP_COLS}, c.cerita, t.terkumpul, t.donatur FROM campaigns c ${campTotals} ORDER BY c.status='aktif' DESC, c.unggulan DESC, c.urutan, c.id`);
  return json(rows.map((c) => ({ ...campOut(c), cerita: c.cerita })));
});
async function campFields(env, b, id = null) {
  const judul = str(b.judul, 120); if (!judul) throw bad("Judul program wajib diisi.");
  let slug = slugify(b.slug || judul) || "program";
  for (let i = 2; await one(env, "SELECT id FROM campaigns WHERE slug=? AND id!=?", slug, id || 0); i++) slug = slugify(b.slug || judul) + "-" + i;
  const jenis = ["zakat", "infak", "wakaf", "fidyah"].includes(b.jenis_dana) ? b.jenis_dana : "infak";
  const status = ["aktif", "draft", "selesai"].includes(b.status) ? b.status : "aktif";
  const batas = /^\d{4}-\d{2}-\d{2}$/.test(b.batas || "") ? b.batas : null;
  return [slug, judul, str(b.ringkas, 160), str(b.cerita, 20000), jenis, str(b.kategori, 40), str(b.ikon, 20) || "heart", Math.max(0, int(b.target)), batas,
    b.cover_id ? int(b.cover_id) : null, status, b.unggulan ? 1 : 0, int(b.urutan) || 100];
}
R("POST", "admin/campaigns", async ({ env, req, body }) => {
  await requireAdmin(env, req, "program");
  const f = await campFields(env, body);
  const r = await run(env, "INSERT INTO campaigns(slug,judul,ringkas,cerita,jenis_dana,kategori,ikon,target,batas,cover_id,status,unggulan,urutan) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", ...f);
  return json({ id: r.meta.last_row_id, slug: f[0] }, 201);
});
R("PUT", "admin/campaigns/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "program");
  const f = await campFields(env, body, int(p.id));
  await run(env, "UPDATE campaigns SET slug=?,judul=?,ringkas=?,cerita=?,jenis_dana=?,kategori=?,ikon=?,target=?,batas=?,cover_id=?,status=?,unggulan=?,urutan=?,updated_at=datetime('now') WHERE id=?", ...f, int(p.id));
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
  return json(await all(env, `SELECT f.id,f.kode,f.nama,f.wa,f.kota,f.status,f.created_at, COUNT(d.seq) n, COALESCE(SUM(d.total),0) total, COUNT(DISTINCT d.donor_id) donatur
    FROM fundraisers f LEFT JOIN donations d ON d.fundraiser_id=f.id AND d.status='paid' GROUP BY f.id ORDER BY total DESC, f.id DESC`));
});
R("PUT", "admin/fundraisers/:id", async ({ env, req, p, body }) => {
  await requireAdmin(env, req, "crm");
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
      if (yt) return { t: "video", kind: "youtube", id: yt, caption: b.caption };
      if (b.url.startsWith("/api/file/")) return { t: "video", kind: "file", src: b.url, caption: b.caption };
      let host = ""; try { host = new URL(b.url).hostname.replace(/^www\./, ""); } catch {}
      return { t: "video", kind: "link", url: b.url, host, caption: b.caption };
    }
    return b;
  });
}
const ART_COLS = `a.id,a.slug,a.judul,a.ringkas,a.cover_id,a.campaign_id,a.lokasi,a.tanggal,a.penerima,a.tersalur,a.status,a.created_at,a.updated_at,c.judul program,c.slug program_slug`;
const artCard = (a) => ({ ...a, cover: a.cover_id ? `/api/media/${a.cover_id}` : null });
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
  return [slug, judul, ringkas, int(b.cover_id) || firstImg, int(b.campaign_id) || null, JSON.stringify(blocks), str(b.lokasi, 120) || null,
    /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal || "") ? b.tanggal : null, Math.max(0, int(b.penerima)), Math.max(0, int(b.tersalur)), b.status === "terbit" ? "terbit" : "draf"];
}
R("POST", "admin/articles", async ({ env, req, body }) => {
  const me = await requireEditor(env, req);
  const f = await artFields(env, body);
  const r = await run(env, "INSERT INTO articles(slug,judul,ringkas,cover_id,campaign_id,blocks,lokasi,tanggal,penerima,tersalur,status,penulis) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", ...f, me.nama);
  return json({ id: r.meta.last_row_id, slug: f[0] }, 201);
});
R("PUT", "admin/articles/:id", async ({ env, req, p, body }) => {
  await requireEditor(env, req);
  const f = await artFields(env, body, int(p.id));
  await run(env, "UPDATE articles SET slug=?,judul=?,ringkas=?,cover_id=?,campaign_id=?,blocks=?,lokasi=?,tanggal=?,penerima=?,tersalur=?,status=?,updated_at=datetime('now') WHERE id=?", ...f, int(p.id));
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
        await sendWA(cfg, cfg.wa_admin, msg);
        if (!stat.penuh?.pindah_ke) await run(env, "INSERT OR REPLACE INTO settings(key,value) VALUES('drive_alert_wa',?)", JSON.stringify(Date.now()));
      }
    }
  } catch {}
  return stat;
}
export async function scheduled(env, ctx) { await init(env); await syncAndNotify(env); }
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
  await saveDrives(env, drives); await run(env, "INSERT OR REPLACE INTO settings(key,value) VALUES('drive_alert','null')");
  return json({ ok: true });
});
R("DELETE", "admin/drive/:id", async ({ env, req, p }) => {
  await requireDriveAdmin(env, req);
  const drives = JSON.parse((await one(env, "SELECT value FROM settings WHERE key='drives'"))?.value || "[]");
  const d = drives.find((x) => x.id === p.id); if (!d) throw new HttpError(404, "Drive tidak ditemukan.");
  if (d.status === "aktif") throw bad("Drive aktif tidak bisa dilepas. Aktifkan Drive lain dulu.");
  await saveDrives(env, drives.filter((x) => x.id !== p.id));
  return json({ ok: true, info: "Drive dilepas dari aplikasi. File yang sudah tersimpan di Drive tersebut tetap ada." });
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
R("PUT", "admin/settings", async ({ env, req, body }) => {
  await requireAdmin(env, req, "pengaturan");
  const stmts = [];
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (SECRET_KEYS.includes(k)) { if (typeof v !== "string" || v.startsWith("••••")) continue; v = v.trim(); }
    else if (typeof def === "number") v = Number(v) || 0;
    else if (typeof def === "boolean") v = !!v;
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
const FIELD = fieldRoutes(R, { one, all, run, settings, requireAdmin, can, upsertDonor, markPaid, enqueue, sendWA, json, bad, HttpError, str, int, waFull, randomId, nowIso, saveDoc, serveMedia });

/* ================= Entry ================= */
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
      return await r.fn({ env, ctx, req: request, u, p: m.groups || {}, body });
    }
    return json({ error: "Alamat API tidak ditemukan." }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Terjadi kesalahan di server. Coba lagi sebentar." }, 500);
  }
}
