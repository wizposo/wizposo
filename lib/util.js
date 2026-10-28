// Utilitas umum: respons JSON, kripto, sesi, validasi.
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const bad = (msg) => new HttpError(400, msg);
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export function randomId(len = 16) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => abc[b % abc.length]).join("");
}
export async function sha512hex(s) { return hex(await crypto.subtle.digest("SHA-512", enc.encode(s))); }

// Hash kata sandi / PIN (PBKDF2, ringan agar sesuai batas CPU paket gratis)
const ITER = 20000;
export async function hashPass(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
  return `pbkdf2$${ITER}$${b64url(salt)}$${b64url(bits)}`;
}
export async function verifyPass(pass, stored) {
  try {
    const [, it, saltB, hashB] = String(stored).split("$");
    const salt = Uint8Array.from(atob(saltB.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: +it }, key, 256);
    return timingSafe(b64url(bits), hashB);
  } catch { return false; }
}
function timingSafe(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

// Sesi: cookie bertanda tangan HMAC
async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); }
export async function signSession(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${sig}`;
}
export async function readSession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  if (!timingSafe(expect, sig)) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export function getCookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
export function sessionCookie(name, value, maxAgeSec, secure) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

// Validasi & format
export const cleanWA = (v) => String(v || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, "");
export const waFull = (v) => { const c = cleanWA(v); return c ? "62" + c : ""; };
export const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
export const int = (v) => { const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10); return Number.isFinite(n) ? n : 0; };
export const rp = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
export const slugify = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
export function maskName(nama, anonim) {
  if (anonim || !nama) return "Hamba Allah";
  return String(nama).split(/\s+/).map((w, i) => (i === 0 ? w : w[0] + ".")).join(" ");
}
export const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19);
export function csv(rows) {
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
