// Server uji lokal: meniru Cloudflare Pages + D1 memakai Node dan SQLite bawaan.
// Jalankan: node --no-warnings dev/server.mjs   (MOCK=1 untuk meniru Midtrans & Fonnte)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { handle } from "../lib/app.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const db = new DatabaseSync(process.env.DB_FILE || ":memory:");
const norm = (a) => a.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v));
class Stmt {
  constructor(sql) { this.sql = sql; this.a = []; }
  bind(...a) { this.a = norm(a); return this; }
  async first() { return db.prepare(this.sql).get(...this.a) ?? null; }
  async all() { return { results: db.prepare(this.sql).all(...this.a) }; }
  async run() { const r = db.prepare(this.sql).run(...this.a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
}
const DB = {
  prepare: (sql) => new Stmt(sql),
  batch: async (stmts) => { db.exec("BEGIN"); try { const out = []; for (const s of stmts) out.push(await s.run()); db.exec("COMMIT"); return out; } catch (e) { db.exec("ROLLBACK"); throw e; } },
};
const mem = new Map();
const MEDIA = {
  async put(k, body, o) { mem.set(k, { buf: Buffer.from(await new Response(body).arrayBuffer()), type: o?.httpMetadata?.contentType }); },
  async head(k) { const m = mem.get(k); return m ? { size: m.buf.length, httpMetadata: { contentType: m.type } } : null; },
  async get(k, o = {}) { const m = mem.get(k); if (!m) return null; const b = o.range ? m.buf.subarray(o.range.offset, o.range.offset + o.range.length) : m.buf; return { body: b, size: m.buf.length }; },
};
const env = { MEDIA: process.env.NO_R2 ? undefined : MEDIA, DB, SETUP_CODE: process.env.SETUP_CODE || "", MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY || "" };
export const sent = [];
const gas = new Map(), gasOut = new Map();
const gasAcc = (k) => { if (!gas.has(k)) gas.set(k, { used: 5e9, limit: 15e9, files: {}, sheets: {}, backups: [] }); return gas.get(k); };
if (process.env.MOCK) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opt = {}) => {
    const u = String(url);
    if (u.includes("midtrans.com/snap")) { const b = JSON.parse(opt.body); return new Response(JSON.stringify({ token: "tok-" + b.transaction_details.order_id, redirect_url: `http://localhost:${PORT}/dev-pay.html?order=${b.transaction_details.order_id}&amount=${b.transaction_details.gross_amount}` }), { status: 201 }); }
    if (u.includes("midtrans.com/v2")) return new Response(JSON.stringify({ transaction_status: "pending" }));
    if (u.includes("api.fonnte.com")) {
      const t = opt.body.get("target"), m = opt.body.get("message"), f = opt.body.get("url");
      // FONNTE_TEKS=1 meniru paket Fonnte yang belum mendukung lampiran
      if (f && process.env.FONNTE_TEKS) return new Response(JSON.stringify({ status: false, reason: "package not support attachment" }));
      sent.push({ t, m, url: f || null }); console.log(`[WA → ${t}]${f ? " [gambar]" : ""} ${m.split("\n")[0]}`); return new Response(JSON.stringify({ status: true }));
    }
    return real(url, opt);
  };
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
const PORT = +(process.env.PORT || 8788);
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/dev-pay.html") {
    const o = url.searchParams.get("order"), amt = url.searchParams.get("amount");
    res.setHeader("content-type", "text/html");
    return res.end(`<!doctype html><meta name=viewport content="width=device-width"><body style="font-family:sans-serif;padding:24px"><h3>Simulasi halaman Midtrans</h3><p>Order ${o}<br>Rp${amt}</p><button id=b style="padding:12px 20px">Bayar (simulasi)</button><script>b.onclick=async()=>{await fetch('/__pay?order=${o}&amount=${amt}');location.href='/#/bayar/${o}'}</script>`);
  }
  if (url.pathname === "/__pay") {
    const { createHash } = await import("node:crypto");
    const o = url.searchParams.get("order"), g = url.searchParams.get("amount") + ".00";
    const n = { order_id: o, status_code: "200", gross_amount: g, transaction_status: "settlement", signature_key: createHash("sha512").update(o + "200" + g + env.MIDTRANS_SERVER_KEY).digest("hex") };
    const r = await handle(new Request(`http://localhost:${PORT}/api/payment/midtrans`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(n) }), env, { waitUntil: () => {} });
    return res.end(await r.text());
  }
  // Tiruan Apps Script "WIZ Drive Connector" (satu objek per akun Google)
  if (url.pathname === "/__gas/echo") { res.setHeader("content-type", "application/json"); const t = gasOut.get(url.searchParams.get("t")); gasOut.delete(url.searchParams.get("t")); return res.end(t || "{}"); }
  if (url.pathname === "/__gas/set") { const a = gasAcc(url.searchParams.get("acc")); a.used = +url.searchParams.get("used"); return res.end("ok"); }
  if (url.pathname === "/__gas/state") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(Object.fromEntries([...gas].map(([k, v]) => [k, { used: v.used, files: Object.keys(v.files), sheets: Object.fromEntries(Object.entries(v.sheets).map(([f, sh]) => [f, Object.fromEntries(Object.entries(sh).map(([n, m]) => [n, m.size]))])), backups: v.backups }])))); }
  if (url.pathname === "/__gas" && req.method === "POST") {
    const chunks = []; for await (const c of req) chunks.push(c);
    const q = JSON.parse(Buffer.concat(chunks).toString()); const a = gasAcc(url.searchParams.get("acc")); let r;
    if (q.secret !== "rahasia-uji-123") r = { ok: false, error: "Kode rahasia tidak cocok." };
    else if (q.action === "ping") r = { ok: true, email: `wizposo.data${url.searchParams.get("acc")}@gmail.com`, used: a.used, limit: a.limit, pct: Math.round(a.used / a.limit * 1000) / 10, ...(String(url.searchParams.get("acc")).startsWith("v1") ? {} : { versi: 2 }) };
    else if (q.action === "setup") r = { ok: true, root: "https://drive.google.com/drive/folders/root" + url.searchParams.get("acc"), folders: {} };
    else if (q.action === "upsert") { const sh = ((a.sheets[q.file] ||= {})[q.sheet] ||= new Map()); q.rows.forEach((row) => sh.set(String(row[0]), row)); a.used += 2000 * q.rows.length; r = { ok: true, appended: q.rows.length, updated: 0, url: "https://docs.google.com/x" }; }
    else if (q.action === "upload") { const id = "g" + Math.random().toString(36).slice(2, 14) + "abcdefghij"; a.files[`${q.folder}/${q.year}/${q.name}`] = q.data.length; (a.byId ||= {})[id] = { mime: q.mime, data: q.data, name: q.name }; a.used += q.data.length; r = { ok: true, id, url: `https://drive.google.com/file/d/${id}/view` }; }
    else if (q.action === "backup") { const { gzipSync } = await import("node:zlib"); const id = "b" + Math.random().toString(36).slice(2, 14) + "abcdefghij"; const gz = gzipSync(Buffer.from(q.json)); (a.byId ||= {})[id] = { mime: "application/gzip", data: gz.toString("base64"), name: q.name + ".json.gz" }; a.backups.push(q.name); a.used += gz.length; r = { ok: true, id, url: `https://drive.google.com/file/d/${id}/view`, size: gz.length }; }
    else if (q.action === "get") { const f = a.byId?.[q.id]; r = f ? { ok: true, ...f, size: f.data.length } : { ok: false, error: "File tidak ditemukan" }; if (String(url.searchParams.get("acc")).startsWith("v1")) r = { ok: false, error: "Perintah tidak dikenal: get" }; }
    else if (q.action === "links") r = { ok: true, root: "https://drive.google.com/drive/folders/root" + url.searchParams.get("acc"), sheets: Object.fromEntries(Object.keys(a.sheets).map((k) => [k, "https://docs.google.com/spreadsheets/" + encodeURIComponent(k)])) };
    else r = { ok: false, error: "aksi?" };
    const t = Math.random().toString(36).slice(2); gasOut.set(t, JSON.stringify(r));
    res.statusCode = 302; res.setHeader("location", `/__gas/echo?t=${t}`); return res.end();
  }
  // Khusus uji: jalankan SQL langsung (tidak ada di Cloudflare)
  if (url.pathname === "/__sql" && req.method === "POST") { const chunks = []; for await (const c of req) chunks.push(c); const { sql, args = [] } = JSON.parse(Buffer.concat(chunks).toString()); res.setHeader("content-type", "application/json"); try { const st = db.prepare(sql); return res.end(JSON.stringify(/^\s*select/i.test(sql) ? st.all(...args) : st.run(...args))); } catch (e) { res.statusCode = 400; return res.end(JSON.stringify({ error: e.message })); } }
  if (url.pathname === "/__sent") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(sent)); }
  if (url.pathname.startsWith("/api/")) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
    const waits = [];
    const r = await handle(request, env, { waitUntil: (p) => waits.push(p) });
    res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await r.arrayBuffer())); await Promise.allSettled(waits); return;
  }
  let file = path.join(ROOT, "public", decodeURIComponent(url.pathname));
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { const alt = file + ".html"; file = fs.existsSync(alt) ? alt : path.join(ROOT, "public", "index.html"); }
  res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log("Server uji di http://localhost:" + PORT));
