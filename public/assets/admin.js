/* ============================================================
   Dashboard admin WIZ Cabang
   ============================================================ */
"use strict";
const ICONS = {
  dash:'<path d="M4 4h6v8h-6z"/><path d="M4 16h6v4h-6z"/><path d="M14 12h6v8h-6z"/><path d="M14 4h6v4h-6z"/>',
  heart:'<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
  grid:'<path d="M4 4h6v6h-6z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6h-6z"/><path d="M14 14h6v6h-6z"/>',
  users:'<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  trophy:'<path d="M8 21l8 0"/><path d="M12 17l0 4"/><path d="M7 4l10 0"/><path d="M17 4v8a5 5 0 0 1 -10 0v-8"/><path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  box:'<path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"/><path d="M12 12l8 -4.5"/><path d="M12 12l0 9"/><path d="M12 12l-8 -4.5"/>',
  gear:'<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  plus:'<path d="M12 5l0 14"/><path d="M5 12l14 0"/>', x:'<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  download:'<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  wa:'<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>',
  bell:'<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
  print:'<path d="M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2"/><path d="M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4"/><path d="M7 15a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z"/>',
  alert:'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>',
  logout:'<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/>',
  ext:'<path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><path d="M15 4h5v5"/>',
  copy:'<path d="M8 10a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/>',
  check:'<path d="M5 12l5 5l10 -10"/>',
  cloud:'<path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/>',
  map:'<path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/>',
  route:'<path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4z"/><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5"/>',
  receipt:'<path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M13 15h2"/>',
  pin:'<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"/>',
  user:'<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  mail:'<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z"/><path d="M3 7l9 6l9 -6"/>',
  cash:'<path d="M7 9m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/><path d="M14 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 9v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h2"/>',
  camera:'<path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"/><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  gps:'<path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0"/><path d="M12 2l0 2"/><path d="M12 20l0 2"/><path d="M20 12l2 0"/><path d="M2 12l2 0"/>',
  share:'<path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.7 10.7l6.6 -3.4"/><path d="M8.7 13.3l6.6 3.4"/>',
  search:'<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
  news:'<path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/>',
};
const ic = (n, s = 20) => `<svg class="ic" viewBox="0 0 24 24" style="width:${s}px;height:${s}px" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rp = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const rpk = (n) => n >= 1e9 ? "Rp" + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M" : n >= 1e6 ? "Rp" + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt" : rp(n);
const num = (v) => { const n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toD = (s) => new Date(String(s).replace(" ", "T") + "Z");
const tgl = (s) => (s ? toD(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const tglD = (s) => (s ? toD(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
const todayW = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const waLink = (no, text = "") => `https://wa.me/${no}${text ? "?text=" + encodeURIComponent(text) : ""}`;
const STATUS = { paid: "Lunas", pending: "Menunggu", failed: "Gagal", expired: "Kedaluwarsa", cancelled: "Dibatalkan" };
const METODE = { gateway: "Otomatis", transfer: "Transfer", qris: "QRIS", tunai: "Tunai", kotak: "Kotak amal", pundi: "Pundi", amplop: "Amplop Ramadhan", lainnya: "Lainnya" };
const SEG = { setia: "Setia", aktif: "Aktif", baru: "Baru", tidur: "Tidur >90 hari", belum: "Belum berdonasi" };
const IKON = ["heart", "scale", "heartbeat", "school", "store", "moon", "hands", "calendar", "coins", "bowl", "mosque", "ambulance"];
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800); }
function copy(t, l) { try { navigator.clipboard.writeText(t).then(() => toast(l + " disalin")); } catch { toast("Salin manual: " + t); } }
async function api(path, opt = {}) {
  const r = await fetch("/api/" + path, { method: opt.method || "GET", headers: opt.body ? { "content-type": "application/json" } : {}, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: "same-origin" });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith("admin/status") && !path.startsWith("admin/login")) { boot(); throw new Error("Sesi berakhir. Silakan masuk lagi."); }
  if (!r.ok) throw new Error(data.error || "Gagal terhubung ke server.");
  return data;
}
async function resizeImage(file, max = 1600) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let q = 0.85, out = c.toDataURL("image/webp", q); while (out.length > 850000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/webp", q); }
  return out.startsWith("data:image/webp") ? out : c.toDataURL("image/jpeg", 0.8);
}
const field = (id, label, val = "", opt = {}) => `<div class="${opt.full ? "full" : ""}"><label class="f" for="${id}">${label}</label><div class="inp">${opt.pre ? `<span>${opt.pre}</span>` : ""}${opt.area
  ? `<textarea id="${id}" rows="${opt.rows || 3}" placeholder="${esc(opt.ph || "")}">${esc(val)}</textarea>`
  : opt.sel ? `<select id="${id}">${opt.sel.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`
  : `<input id="${id}" type="${opt.type || "text"}" value="${esc(val)}" placeholder="${esc(opt.ph || "")}" ${opt.num ? 'inputmode="numeric"' : ""} ${opt.list ? `list="${opt.list}"` : ""}>`}</div>${opt.hint ? `<div class="hint">${opt.hint}</div>` : ""}</div>`;
const val = (id) => $("#" + id)?.value?.trim() ?? "";
function bindMoney(...ids) { ids.forEach((id) => { const el = $("#" + id); if (!el) return; const f = () => { const n = num(el.value); el.value = n ? n.toLocaleString("id-ID") : ""; }; f(); el.addEventListener("input", f); }); }

/* ---------- Modal ---------- */
function modal(title, body, foot = "", wide = false) {
  $("#modal").classList.toggle("wide", !!wide);
  $("#modal").innerHTML = `<div class="sheet-h"><div class="r"><h3 id="modalTitle">${title}</h3><button class="x" aria-label="Tutup" onclick="closeModal()">${ic("x", 18)}</button></div></div>
    <div class="sheet-b" style="padding-top:8px">${body}<div class="err" id="m_err" hidden></div></div>${foot ? `<div class="sheet-f" style="display:flex;gap:8px;justify-content:flex-end">${foot}</div>` : ""}`;
  $("#modalBg").hidden = false;
}
function closeModal() { $("#modalBg").hidden = true; }
$("#modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") closeModal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
const mErr = (m) => { const e = $("#m_err"); e.textContent = m; e.hidden = false; };
async function busy(btn, fn) { const t = btn.innerHTML; btn.disabled = true; btn.textContent = "Menyimpan…"; try { await fn(); } catch (e) { mErr(e.message); } finally { btn.disabled = false; btn.innerHTML = t; } }

/* ---------- State & boot ---------- */
let ME = null, CAMPS = [], PUB = {}, FM = null, ROLES = {}, poll = null, lastSeq = 0;
// [id, judul, ikon, hak akses]
const ALL_PAGES = [["dashboard", "Ringkasan", "dash", "lihat"], ["tugas", "Tugas jemput", "route", "lapangan"], ["peta", "Peta sebaran", "map", "peta"], ["slip", "Slip & setoran", "receipt", "slip"],
  ["amplop", "Amplop Ramadhan", "mail", "amplop"], ["donasi", "Donasi", "heart", "lihat"], ["program", "Program", "grid", "lihat"], ["berita", "Dokumentasi", "news", "dokumentasi"],
  ["donatur", "Donatur", "users", "lihat"], ["fundraiser", "Relawan afiliator", "trophy", "lihat"], ["pesanwa", "Pesan WA", "wa", "crm"], ["upah", "Upah & penarikan", "cash", "keuangan"], ["penyimpanan", "Penyimpanan", "cloud", "penyimpanan"], ["pengaturan", "Pengaturan", "gear", "pengaturan"], ["akun", "Akun saya", "user", null]];
let PAGES = [];
const can = (p) => !!ME && (ME.role === "admin" || (ME.perms || []).includes(p));
const MOBILE = { zisko: ["tugas", "peta", "slip", "akun"], amplop: ["amplop", "peta", "slip", "akun"] };
async function boot() {
  clearInterval(poll);
  let offline = false;
  const st = await api("admin/status").catch((e) => { offline = e instanceof TypeError; return {}; });
  const cache = (() => { try { return JSON.parse(localStorage.getItem("wiz_boot") || "null"); } catch { return null; } })();
  if (offline && cache) { // tanpa sinyal: buka dengan data terakhir, isian disimpan di HP lalu dikirim saat online
    ({ me: ME, roles: ROLES, pub: PUB, fm: FM, camps: CAMPS } = cache);
    PAGES = ALL_PAGES.filter(([, , , p]) => !p || can(p)); shell(); go(); toast("Tidak ada sinyal. Data yang diisi akan dikirim otomatis nanti."); return;
  }
  if (st.needsSetup) return authView("setup", st.setupCodeRequired);
  if (!st.me) { try { localStorage.removeItem("wiz_boot"); } catch {} return authView("login"); }
  ME = st.me; ROLES = st.roles || {};
  PAGES = ALL_PAGES.filter(([, , , p]) => !p || can(p));
  [PUB, CAMPS, FM] = await Promise.all([api("public/config"), can("lihat") ? api("admin/campaigns") : [], api("field/meta").catch(() => null)]);
  if (!CAMPS.length && FM) CAMPS = FM.campaigns;
  try { localStorage.setItem("wiz_boot", JSON.stringify({ me: ME, roles: ROLES, pub: PUB, fm: FM, camps: CAMPS.map(({ id, slug, judul, jenis_dana, status }) => ({ id, slug, judul, jenis_dana, status })) })); } catch {}
  shell(); go();
  if (typeof flushAntre === "function") flushAntre();
}
function authView(mode, needCode) {
  $("#root").innerHTML = `<div class="center"><form class="auth card" id="af" novalidate>
    <span class="logo"><img src="/assets/logo.png" alt="WIZ"></span>
    <h2 style="margin:0 0 4px">${mode === "setup" ? "Siapkan akun admin pertama" : "Masuk ruang pengurus"}</h2>
    <p class="hint" style="margin:0 0 6px">${mode === "setup" ? "Akun ini menjadi admin utama cabang." : "Untuk pengurus, ZISKO, dan relawan WIZ cabang."}</p>
    ${mode === "setup" ? field("a_nama", "Nama") + (needCode ? field("a_code", "Kode penyiapan", "", { hint: "Kode SETUP_CODE yang diatur di Cloudflare." }) : "") : ""}
    ${mode === "setup" ? field("a_email", "Email", "", { type: "email" }) : field("a_email", "Email atau nomor WhatsApp", "", { ph: "nama@email.com / 0812…" })}${field("a_pass", "Kata sandi", "", { type: "password", hint: mode === "setup" ? "Minimal 8 karakter." : "" })}
    <div class="err" id="m_err" hidden></div>
    <button class="btn primary block" style="margin-top:16px" type="submit">${mode === "setup" ? "Buat akun & masuk" : "Masuk"}</button>
    <p class="hint" style="text-align:center"><a href="/#/mitra">Relawan afiliator? Masuk di portal relawan</a> · <a href="/">Aplikasi donatur</a></p></form></div>`;
  $("#af").onsubmit = async (e) => {
    e.preventDefault();
    try { await api(mode === "setup" ? "admin/setup" : "admin/login", { method: "POST", body: { nama: val("a_nama"), email: val("a_email"), password: $("#a_pass").value, setup_code: val("a_code") } }); boot(); }
    catch (x) { mErr(x.message); }
  };
}
function shell() {
  const mob = (MOBILE[ME.role] || ["dashboard", "donasi", "tugas", "peta"]).map((id) => PAGES.find((p) => p[0] === id)).filter(Boolean);
  for (const p of PAGES) if (mob.length < 4 && !mob.includes(p)) mob.push(p);
  const rest = PAGES.filter((p) => !mob.includes(p));
  $("#root").innerHTML = `<div class="shell"><aside class="side"><span class="logo"><img src="/assets/logo.png" alt="WIZ"></span><div class="cab">Cabang ${esc(PUB.cabang)} · ${esc(ME.nama)}<br><span class="tag i" style="margin-top:4px">${esc(ME.role_label || ME.role)}</span></div>
    ${PAGES.map(([id, l, i]) => `<a href="#${id}" data-p="${id}">${ic(i)}${l}<span class="bd" id="bd_${id}" hidden></span></a>`).join("")}
    <div class="foot"><a href="/" target="_blank" rel="noopener">${ic("ext")} Lihat aplikasi</a><a href="#" id="logout">${ic("logout")} Keluar</a></div></aside>
    <main class="main" id="main"></main></div>
    <div class="net" id="net" hidden></div>
    <nav class="mnav">${mob.map(([id, l, i]) => `<a href="#${id}" data-p="${id}">${ic(i, 22)}<span>${l.split(" ")[0]}</span></a>`).join("")}<a href="#" id="more">${ic("grid", 22)}<span>Lainnya</span></a></nav>`;
  $("#more").onclick = (e) => { e.preventDefault(); modal("Menu", `<div class="list">${rest.map(([id, l, i]) => `<a class="it" href="#${id}" onclick="closeModal()">${ic(i)}<span class="tx"><b>${l}</b></span></a>`).join("")}
    <a class="it" href="/" target="_blank" rel="noopener">${ic("ext")}<span class="tx"><b>Lihat aplikasi donatur</b></span></a><a class="it" href="#" id="lo2">${ic("logout")}<span class="tx"><b>Keluar</b></span></a></div>`);
    $("#lo2").onclick = async (ev) => { ev.preventDefault(); closeModal(); try { localStorage.removeItem("wiz_boot"); } catch {} await api("admin/logout", { method: "POST" }); boot(); }; };
  $("#logout").onclick = async (e) => { e.preventDefault(); try { localStorage.removeItem("wiz_boot"); } catch {} await api("admin/logout", { method: "POST" }); boot(); };
}
addEventListener("hashchange", () => ME && go());
async function go() {
  clearInterval(poll);
  const home = (MOBILE[ME.role] || []).find((id) => PAGES.some((x) => x[0] === id)) || PAGES[0][0];
  let p = (location.hash.slice(1) || home).split("?")[0];
  if (!PAGES.some((x) => x[0] === p) && !(p === "lapangan" && can("lapangan"))) p = home;
  $$("[data-p]").forEach((a) => a.classList.toggle("on", a.dataset.p === p));
  const fn = VIEWS[p] || VIEWS.dashboard;
  try { await fn(); } catch (e) { $("#main").innerHTML = `<div class="alert">${ic("alert")}<span>${esc(e.message)}</span></div>`; }
}
const main = (h) => { $("#main").innerHTML = h; };
const VIEWS = {};

/* ---------- Notifikasi donasi baru ---------- */
function beep() { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.08; o.start(); o.frequency.setValueAtTime(1320, a.currentTime + 0.12); o.stop(a.currentTime + 0.28); } catch {} }
function notifyNew(rows) {
  rows.forEach((d) => {
    toast(`Donasi masuk ${rp(d.total)} · ${d.program || ""}`);
    try { if (Notification.permission === "granted") new Notification("Donasi masuk " + rp(d.total), { body: `${d.anonim ? "Hamba Allah" : d.nama || "Donatur"} · ${d.program || ""}`, icon: "/assets/icon.png" }); } catch {}
  });
  if (rows.length) beep();
}

/* ---------- Ringkasan ---------- */
VIEWS.dashboard = async () => {
  const render = async (first) => {
    const d = await api("admin/dashboard");
    if (!first && d.lastSeq > lastSeq) notifyNew(d.recent.filter((x) => x.seq > lastSeq && x.status === "paid"));
    lastSeq = d.lastSeq;
    const zak = d.jenis.find((j) => j.jenis_dana === "zakat")?.total || 0, inf = d.jenis.filter((j) => j.jenis_dana !== "zakat").reduce((a, b) => a + b.total, 0);
    const maxP = Math.max(1, ...d.perProgram.map((x) => x.total)), maxM = Math.max(1, ...d.perMetode.map((x) => x.total));
    const bd = $("#bd_lapangan"); if (bd) { bd.hidden = !d.pundiBaru; bd.textContent = d.pundiBaru; }
    const bdd = $("#bd_donasi"); if (bdd) { bdd.hidden = !d.pending.bukti; bdd.textContent = d.pending.bukti; }
    main(`<div class="ph"><h1>Ringkasan</h1><div class="acts">
        ${"Notification" in window && Notification.permission === "default" ? `<button class="btn ghost sm" id="nperm">${ic("bell")} Aktifkan notifikasi</button>` : ""}
        ${can("catat") ? `<button class="btn primary sm" onclick="offlineForm()">${ic("plus")} Catat donasi offline</button>` : ""}</div></div>
      ${d.pending.bukti ? `<div class="alert">${ic("alert")}<span><b>${d.pending.bukti} bukti transfer</b> menunggu verifikasi. <a href="#donasi?status=pending">Periksa sekarang</a></span></div>` : ""}
      ${d.anomali.map((a) => `<div class="alert">${ic("alert")}<span>Setoran kotak <b>${esc(a.kode)}</b> terakhir ${rp(a.terakhir)}, jauh di bawah rata-rata ${rp(a.rata)}. Periksa segel dan petugasnya.</span></div>`).join("")}
      ${d.drive?.alert === "penuh" ? `<div class="alert">${ic("alert")}<span><b>Google Drive penuh (${d.drive.aktif?.pct || "90"}%+).</b> Salinan data berhenti. <a href="#penyimpanan">Tambahkan link Google Drive baru</a></span></div>` : ""}
      ${d.drive?.alert === "belum" || (!d.drive?.aktif && d.drive?.alert !== "penuh") ? `<div class="alert ok">${ic("bell")}<span>Google Drive belum terhubung. <a href="#penyimpanan">Hubungkan</a> agar data tersalin dan tercadangkan otomatis.</span></div>` : ""}
      ${d.drive?.aktif && d.drive.aktif.pct >= 80 && d.drive.aktif.pct < 90 && !d.drive.cadangan ? `<div class="alert">${ic("alert")}<span>Google Drive sudah ${d.drive.aktif.pct}%. <a href="#penyimpanan">Siapkan Drive cadangan</a> sebelum mencapai 90%.</span></div>` : ""}
      ${d.pundiBaru ? `<div class="alert ok">${ic("box")}<span><b>${d.pundiBaru} pendaftar Pundi Sedekah</b> menunggu diantar. <a href="#lapangan">Atur pengantaran</a></span></div>` : ""}
      <div class="kpis">
        <div class="kpi hl"><small>Hari ini</small><b>${rp(d.hari.total)}</b><span>${d.hari.n} donasi</span></div>
        <div class="kpi"><small>7 hari terakhir</small><b>${rpk(d.minggu.total)}</b><span>${d.minggu.n} donasi</span></div>
        <div class="kpi"><small>Bulan ini</small><b>${rpk(d.bulan.total)}</b><span>Zakat ${rpk(zak)} · Infak ${rpk(inf)}</span></div>
        <div class="kpi"><small>Total terhimpun</small><b>${rpk(d.semua.total)}</b><span>${d.semua.n} donasi</span></div>
        <div class="kpi ${d.pending.n ? "warn" : ""}"><small>Menunggu pembayaran</small><b>${d.pending.n}</b><span>${rpk(d.pending.total)} · 3 hari terakhir</span></div>
        <div class="kpi"><small>Donatur bulan ini</small><b>${d.donatur.aktif}</b><span>${d.donatur.baru} donatur baru</span></div>
        ${jemputKpi(d)}
      </div>
      <div class="g2"><div class="panel"><h2>Penghimpunan 30 hari <span class="live">Diperbarui otomatis</span></h2><canvas class="chart" id="ch"></canvas></div>
        <div class="panel"><h2>Donasi terbaru</h2><div class="list">${d.recent.slice(0, 7).map((x) => `<div class="it"><span class="tx"><b>${esc(x.anonim ? "Hamba Allah" : x.nama || "Donatur")}</b> · ${rp(x.total)}<small>${esc(x.program || "")} · ${METODE[x.metode]} · ${tgl(x.created_at)}</small></span><span class="tag st-${x.status}">${STATUS[x.status]}</span></div>`).join("") || "<p class='hint'>Belum ada donasi.</p>"}</div></div></div>
      <div class="g2"><div class="panel hb"><h2>Program bulan ini</h2>${d.perProgram.map((x) => `<div class="r"><span>${esc(x.judul)}</span><b>${rp(x.total)}</b><div class="bar"><i style="width:${x.total / maxP * 100}%"></i></div></div>`).join("") || "<p class='hint'>Belum ada data bulan ini.</p>"}</div>
        <div class="panel hb"><h2>Kanal bulan ini</h2>${d.perMetode.map((x) => `<div class="r"><span>${METODE[x.metode]} · ${x.n}×</span><b>${rp(x.total)}</b><div class="bar"><i style="width:${x.total / maxM * 100}%;background:var(--green)"></i></div></div>`).join("") || "<p class='hint'>Belum ada data.</p>"}
          <h2 style="margin-top:18px">Fundraiser teratas</h2>${d.topFr.map((f, i) => `<div class="r"><span>${i + 1}. ${esc(f.nama)} · ${f.n}×</span><b>${rp(f.total)}</b></div>`).join("") || "<p class='hint'>Belum ada donasi lewat fundraiser bulan ini.</p>"}</div></div>`);
    drawChart($("#ch"), d.harian);
    $("#nperm")?.addEventListener("click", () => Notification.requestPermission().then(() => render()));
  };
  await render(true);
  poll = setInterval(() => render(false).catch(() => {}), 15000);
};
function drawChart(cv, rows) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const x = cv.getContext("2d"); x.scale(dpr, dpr);
  const days = []; for (let i = 29; i >= 0; i--) { const t = new Date(Date.now() + 8 * 3600e3 - i * 864e5).toISOString().slice(0, 10); days.push({ t, v: rows.find((r) => r.tgl === t)?.total || 0 }); }
  const css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim();
  const max = Math.max(...days.map((d) => d.v), 1), top = niceMax(max), pl = 54, pb = 22, pw = W - pl - 8, ph = H - pb - 10;
  x.font = "11px Plus Jakarta Sans, sans-serif"; x.fillStyle = ink; x.strokeStyle = line; x.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = 10 + ph - ph * i / 4; x.beginPath(); x.moveTo(pl, y); x.lineTo(W - 8, y); x.stroke(); x.textAlign = "right"; x.fillText(short(top * i / 4), pl - 6, y + 4); }
  const bw = pw / days.length;
  days.forEach((d, i) => {
    const h = ph * d.v / top, X = pl + i * bw + bw * 0.18;
    x.fillStyle = i === days.length - 1 ? "#F7941D" : "#046B5C"; if (h) { x.beginPath(); x.roundRect(X, 10 + ph - h, bw * 0.64, h, [3, 3, 0, 0]); x.fill(); }
    if (i % 7 === 2 || i === days.length - 1) { x.fillStyle = ink; x.textAlign = "center"; x.fillText(new Date(d.t + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }), X + bw * 0.32, H - 6); }
  });
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return v; }
function short(v) { return v >= 1e6 ? (v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt" : v >= 1e3 ? Math.round(v / 1e3) + " rb" : String(Math.round(v)); }

/* ---------- Donasi ---------- */
VIEWS.donasi = async () => {
  const qs = new URLSearchParams(location.hash.split("?")[1] || "");
  const bukaId = (qs.get("id") || "").replace(/[^\w]/g, "");
  const f = { status: qs.get("status") || "", jenis: "", campaign: "", metode: "", dari: "", sampai: "", q: bukaId, page: 1 };
  main(`<div class="ph"><h1>Donasi</h1><div class="acts"><a class="btn ghost sm" id="exp" href="#">${ic("download")} Ekspor Excel (CSV)</a>${can("catat") ? `<button class="btn primary sm" onclick="offlineForm()">${ic("plus")} Catat donasi offline</button>` : ""}</div></div>
    <div class="fbar">
      <div class="inp grow"><input id="f_q" placeholder="Cari nama, WA, no. transaksi, kode kotak/pundi"></div>
      <div class="inp"><select id="f_status"><option value="">Semua status</option>${Object.entries({ ...STATUS, tanpa_bukti: "Belum kirim bukti (transfer/QRIS)" }).map(([k, l]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="inp"><select id="f_jenis"><option value="">Semua dana</option><option value="zakat">Zakat</option><option value="infak">Infak</option><option value="wakaf">Wakaf</option><option value="fidyah">Fidyah</option></select></div>
      <div class="inp"><select id="f_campaign"><option value="">Semua program</option>${CAMPS.map((c) => `<option value="${c.id}">${esc(c.judul)}</option>`).join("")}</select></div>
      <div class="inp"><select id="f_metode"><option value="">Semua metode</option>${Object.entries(METODE).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="inp"><input type="date" id="f_dari" aria-label="Dari tanggal"></div><div class="inp"><input type="date" id="f_sampai" aria-label="Sampai tanggal"></div>
    </div><p class="sum" id="sum"></p><div class="tw" id="tbl"></div><div class="pager" id="pg"></div>`);
  const qstr = () => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const load = async () => {
    const r = await api("admin/donations?" + qstr());
    $("#exp").href = "/api/admin/export/donations?" + qstr();
    $("#sum").innerHTML = `<b>${r.total}</b> transaksi · lunas <b>${rp(r.paid)}</b>` +
      (r.tanpa_bukti && f.status !== "tanpa_bukti" ? ` · <a href="#" id="lihat_tb">${r.tanpa_bukti} transfer belum kirim bukti (disembunyikan)</a>` : "");
    $("#lihat_tb")?.addEventListener("click", (e) => { e.preventDefault(); f.status = "tanpa_bukti"; $("#f_status").value = "tanpa_bukti"; f.page = 1; load(); });
    $("#tbl").innerHTML = `<table class="t"><thead><tr><th>Waktu</th><th>Donatur</th><th>Program</th><th>Metode</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${r.rows.map((d) => `<tr class="click" data-id="${d.id}"><td>${tgl(d.paid_at || d.created_at)}<small>${esc(d.id)}</small></td>
        <td>${esc(d.anonim ? "Hamba Allah" : d.nama || "-")}${d.anonim && d.nama ? ` <small>(${esc(d.nama)})</small>` : ""}<small>${d.wa ? "+" + d.wa : ""}${d.fundraiser ? " · via " + esc(d.fundraiser) : ""}</small></td>
        <td>${esc(d.program || "-")}<small>${esc(d.jenis_dana)}${d.kotak_kode ? " · " + esc(d.kotak_kode) : ""}${d.pundi_kode ? " · " + esc(d.pundi_kode) : ""}</small></td>
        <td>${METODE[d.metode] || d.metode}${d.bukti_id ? `<small style="color:var(--orange-t)">ada bukti</small>` : ""}</td><td class="num">${rp(d.total)}</td>
        <td><span class="tag st-${d.status}">${STATUS[d.status]}</span></td>
        <td>${d.status === "pending" && d.metode !== "gateway" && can("keuangan") ? `<button class="btn green xs" data-pay="${d.id}">Tandai lunas</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="hint" style="text-align:center;padding:30px">Tidak ada transaksi untuk filter ini.</td></tr>`}</tbody></table>`;
    const pages = Math.ceil(r.total / 50);
    $("#pg").innerHTML = pages > 1 ? `<button class="btn ghost xs" ${f.page <= 1 ? "disabled" : ""} id="pv">Sebelumnya</button> Halaman ${f.page} dari ${pages} <button class="btn ghost xs" ${f.page >= pages ? "disabled" : ""} id="nx">Berikutnya</button>` : "";
    $("#pv")?.addEventListener("click", () => { f.page--; load(); }); $("#nx")?.addEventListener("click", () => { f.page++; load(); });
    $$("[data-pay]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); setStatus(b.dataset.pay, "paid", load); });
    $$("tr[data-id]").forEach((tr) => tr.onclick = () => donDetail(r.rows.find((x) => x.id === tr.dataset.id), load));
  };
  let t; $("#f_q").oninput = () => { clearTimeout(t); t = setTimeout(() => { f.q = val("f_q"); f.page = 1; load(); }, 350); };
  ["status", "jenis", "campaign", "metode", "dari", "sampai"].forEach((k) => $("#f_" + k).onchange = () => { f[k] = $("#f_" + k).value; f.page = 1; load(); });
  if (bukaId) $("#f_q").value = bukaId;
  await load();
  if (bukaId) { $(`tr[data-id="${bukaId}"]`)?.click(); history.replaceState(null, "", "#donasi"); }
  poll = setInterval(() => { if (!$("#modalBg").hidden) return; load().catch(() => {}); }, 20000);
};
async function setStatus(id, status, after) {
  try { const r = await api(`admin/donations/${id}/status`, { method: "POST", body: { status } }); toast(r.info || "Status diperbarui"); closeModal(); after && after(); } catch (e) { toast(e.message); }
}
function donDetail(d, after) {
  const row = (k, v) => v ? `<div class="rr"><span>${k}</span><b>${v}</b></div>` : "";
  modal("Detail donasi", `<div class="receipt" style="box-shadow:none;border:1px solid var(--line)">
      ${row("No. transaksi", esc(d.id))}${row("Status", `<span class="tag st-${d.status}">${STATUS[d.status]}</span>`)}${row("Program", esc(d.program))}${row("Jenis dana", esc(d.jenis_dana))}
      ${row("Nominal", rp(d.nominal))}${d.kode_unik ? row("Kode unik", rp(d.kode_unik)) : ""}${row("Total", "<b>" + rp(d.total) + "</b>")}${row("Metode", METODE[d.metode])}
      ${row("Donatur", esc(((d.sapaan || "") + " " + (d.nama || "")).trim() || "-") + (d.anonim ? " (sembunyikan nama)" : ""))}${row("WhatsApp", d.wa ? `<a href="${waLink(d.wa)}" target="_blank" rel="noopener">+${d.wa}</a>` : "")}
      ${row("Fundraiser", esc(d.fundraiser))}${row("No. slip", d.slip_no ? `<a href="#slip?no=${esc(d.slip_no)}" onclick="closeModal()">${esc(d.slip_no)}</a>` : "")}${row("Uang", d.serah === "petugas" ? "Masih di petugas" : d.serah === "diterima" ? "Diterima " + esc(d.serah_oleh || "bendahara") : "")}${row("Kotak", esc(d.kotak_kode))}${row("Pundi", esc(d.pundi_kode))}${row("Petugas", esc(d.petugas))}${row("Doa", esc(d.doa))}${row("Catatan", esc(d.catatan))}
      ${row("Dibuat", tgl(d.created_at))}${row("Lunas", d.paid_at ? tgl(d.paid_at) : "")}</div>
    ${d.bukti_id ? `<div class="sect">Bukti transfer</div><a href="/api/admin/media/${d.bukti_id}" target="_blank" rel="noopener"><img src="/api/admin/media/${d.bukti_id}" alt="Bukti transfer" style="max-height:340px;border-radius:12px;border:1px solid var(--line)"></a>` : ""}`,
    !can("keuangan") ? "" : `${d.status === "paid" && d.wa && !d.slip_no ? `<button class="btn ghost sm" id="rs">${ic("wa")} Kirim ulang kuitansi</button>` : ""}
     ${d.status === "pending" ? `<button class="btn danger sm" id="cx">Batalkan</button>${d.metode !== "gateway" ? `<button class="btn green sm" id="pd">${ic("check")} Tandai lunas</button>` : ""}` : ""}
     ${d.status === "cancelled" ? `<button class="btn ghost sm" id="rp">Kembalikan ke menunggu</button>` : ""}
     ${["pending", "cancelled", "failed", "expired"].includes(d.status) ? `<button class="btn ghost sm" id="hp" style="color:var(--danger)">Hapus</button>` : ""}`);
  $("#pd")?.addEventListener("click", () => setStatus(d.id, "paid", after));
  $("#cx")?.addEventListener("click", () => setStatus(d.id, "cancelled", after));
  $("#rp")?.addEventListener("click", () => setStatus(d.id, "pending", after));
  $("#hp")?.addEventListener("click", () => {
    modal("Hapus transaksi", `<p>Transaksi <b>${esc(d.id)}</b> (${rp(d.total)}) akan dihapus permanen dan tidak bisa dikembalikan. Gunakan Batalkan jika ingin riwayatnya tetap tercatat.</p>`, `<button class="btn danger sm" id="hp_ok">Ya, hapus permanen</button>`);
    $("#hp_ok").onclick = (e) => busy(e.target, async () => { await api(`admin/donations/${d.id}`, { method: "DELETE" }); closeModal(); toast("Transaksi dihapus"); after && after(); }); });
  $("#rs")?.addEventListener("click", async () => { try { await api(`admin/donations/${d.id}/resend`, { method: "POST" }); toast("Kuitansi terkirim"); } catch (e) { mErr(e.message); } });
}
async function offlineForm(pre = {}) {
  const [kotak, frs] = await Promise.all([api("admin/kotak"), api("admin/fundraisers")]);
  const camps = CAMPS.filter((c) => c.status !== "draft");
  modal("Catat donasi offline", `<p class="hint" style="margin-top:0">Untuk uang tunai, setoran kotak amal, pundi, atau transfer yang diterima langsung. Langsung tercatat lunas.</p>
    <div class="fg">${field("o_metode", "Sumber dana", pre.metode || "tunai", { sel: [["tunai", "Tunai"], ["kotak", "Kotak amal"], ["pundi", "Pundi Sedekah"], ["transfer", "Transfer"], ["qris", "QRIS"]] })}
    ${field("o_tgl", "Tanggal diterima", todayW(), { type: "date" })}
    ${field("o_camp", "Program", pre.campaign_id || (camps.find((c) => c.slug === "infak-terbaik") || camps[0])?.id, { sel: camps.map((c) => [c.id, `${c.judul} (${c.jenis_dana})`]), full: true })}
    ${field("o_nom", "Nominal", pre.nominal || "", { pre: "Rp", num: true })}${field("o_pet", "Petugas", pre.petugas || ME.nama)}
    <div id="o_kotak_w" class="full">${field("o_kotak", "Kotak amal", pre.kotak_kode || "", { sel: [["", "Pilih kotak"], ...kotak.map((k) => [k.kode, `${k.kode} · ${k.nama_lokasi}`])] })}
      ${field("o_seg", "Nomor segel baru (opsional)", "", { ph: "Contoh: S-00125" })}</div>
    <div id="o_pundi_w" class="full">${field("o_pundi", "Kode pundi", pre.pundi_kode || "", { ph: "P-0001" })}</div>
    ${field("o_nama", "Nama donatur (opsional)", pre.nama || "")}${field("o_wa", "WhatsApp (untuk kuitansi)", pre.wa || "", { pre: "+62", num: true })}
    ${field("o_fr", "Fundraiser (opsional)", "", { sel: [["", "Tidak ada"], ...frs.filter((f) => f.status === "aktif").map((f) => [f.id, f.nama])] })}
    ${field("o_cat", "Catatan", "", { full: true })}</div>`,
    `<button class="btn ghost sm" onclick="closeModal()">Batal</button><button class="btn primary sm" id="o_save">Simpan & tandai lunas</button>`);
  bindMoney("o_nom");
  const sync = () => { const m = $("#o_metode").value; $("#o_kotak_w").hidden = m !== "kotak"; $("#o_pundi_w").hidden = m !== "pundi";
    if (m === "pundi") $("#o_camp").value = CAMPS.find((c) => c.slug === "pundi-sedekah")?.id || $("#o_camp").value; };
  $("#o_metode").onchange = sync; sync();
  $("#o_save").onclick = (e) => busy(e.target, async () => {
    const m = val("o_metode"); if (m === "kotak" && !val("o_kotak")) throw new Error("Pilih kotak amal.");
    if (num(val("o_nom")) < 1) throw new Error("Isi nominal.");
    await api("admin/donations", { method: "POST", body: { campaign_id: val("o_camp"), nominal: num(val("o_nom")), metode: m, tanggal: val("o_tgl"), petugas: val("o_pet"),
      kotak_kode: m === "kotak" ? val("o_kotak") : "", pundi_kode: m === "pundi" ? val("o_pundi") : "", nama: val("o_nama"), wa: val("o_wa"), fundraiser_id: val("o_fr"),
      catatan: [val("o_cat"), val("o_seg") ? "Segel baru " + val("o_seg") : ""].filter(Boolean).join(" · ") } });
    closeModal(); toast("Donasi dicatat"); go();
  });
}

/* ---------- Program ---------- */
VIEWS.program = async () => {
  CAMPS = await api("admin/campaigns");
  main(`<div class="ph"><h1>Program</h1><div class="acts"><button class="btn primary sm" onclick="campForm()">${ic("plus")} Program baru</button></div></div>
    <div class="tw"><table class="t"><thead><tr><th>Program</th><th>Dana</th><th class="num">Terkumpul</th><th class="num">Target</th><th>Batas</th><th>Status</th></tr></thead><tbody>
    ${CAMPS.map((c) => { const pct = c.target ? Math.min(100, Math.round(c.terkumpul / c.target * 100)) : 0; return `<tr class="click" data-id="${c.id}"><td><b>${esc(c.judul)}</b>${c.unggulan ? ' <span class="tag i">Unggulan</span>' : ""}<small>/c/${esc(c.slug)} · ${c.donatur} donasi</small>
      ${c.target ? `<div class="bar" style="margin:6px 0 0;height:5px;max-width:260px"><i style="width:${pct}%"></i></div>` : ""}</td><td>${esc(c.jenis_dana)}</td><td class="num">${rp(c.terkumpul)}</td><td class="num">${c.target ? rp(c.target) : "-"}</td>
      <td>${c.batas ? tglD(c.batas + " 00:00:00") : "-"}</td><td><span class="tag ${c.status === "aktif" ? "st-paid" : "st-pending"}">${esc(c.status)}</span></td></tr>`; }).join("")}</tbody></table></div>`);
  $$("tr[data-id]").forEach((tr) => tr.onclick = () => campForm(CAMPS.find((c) => c.id === +tr.dataset.id)));
  ogSiapkan("program", CAMPS);
};
// Galeri gambar: tambah banyak sekaligus (tanpa batas), pilih gambar utama, atur urutan, hapus
function galeriState(o) {
  const ids = [...(o.galeri_ids || [])];
  if (o.cover_id && !ids.includes(o.cover_id)) ids.unshift(o.cover_id);
  return { ids, cover: o.cover_id || ids[0] || null };
}
function galeriEditor(hostSel, st) {
  const host = $(hostSel);
  const draw = () => {
    if (st.cover && !st.ids.includes(st.cover)) st.cover = st.ids[0] || null;
    if (!st.cover && st.ids.length) st.cover = st.ids[0];
    host.innerHTML = `<div class="gal">${st.ids.map((id, i) => `<div class="gal-it ${id === st.cover ? "utama" : ""}">
        <img src="/api/media/${id}" alt="" loading="lazy">${id === st.cover ? `<span class="gal-b">Utama</span>` : ""}
        <div class="gal-act">${id === st.cover ? "" : `<button type="button" data-g="utama" data-i="${i}" title="Jadikan gambar utama">★ Utama</button>`}
          <button type="button" data-g="kiri" data-i="${i}" title="Geser ke kiri" ${i ? "" : "disabled"}>‹</button><button type="button" data-g="kanan" data-i="${i}" title="Geser ke kanan" ${i < st.ids.length - 1 ? "" : "disabled"}>›</button>
          <button type="button" data-g="hapus" data-i="${i}" title="Hapus" class="del">✕</button></div></div>`).join("")}
      <label class="gal-add"><input type="file" accept="image/*" multiple hidden><span>${ic("plus", 24)}<br>Tambah gambar</span></label></div>
      <p class="hint" style="margin:6px 0 0">${st.ids.length ? `${st.ids.length} gambar. ` : ""}Gambar <b>Utama</b> tampil di kartu dan menjadi slide pertama. Boleh pilih banyak gambar sekaligus.</p>`;
    host.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => {
      const i = +b.dataset.i, ids = st.ids;
      if (b.dataset.g === "utama") st.cover = ids[i];
      if (b.dataset.g === "kiri" && i > 0) [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
      if (b.dataset.g === "kanan" && i < ids.length - 1) [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
      if (b.dataset.g === "hapus") ids.splice(i, 1);
      draw();
    });
    const inp = host.querySelector(".gal-add input");
    inp.onchange = async () => {
      const files = [...inp.files]; if (!files.length) return;
      const lbl = host.querySelector(".gal-add span");
      for (let k = 0; k < files.length; k++) {
        lbl.innerHTML = `Mengunggah ${k + 1}/${files.length}…`;
        try { const data = await resizeImage(files[k]); st.ids.push((await api("admin/media", { method: "POST", body: { gambar: data } })).id); }
        catch (e) { toast(`${files[k].name}: ${e.message}`); }
      }
      draw();
    };
  };
  draw();
}

// Gambar pratinjau tautan WhatsApp/Facebook: JPEG 1200×630 dari gambar utama, dibuat otomatis di latar belakang
async function buatOg(coverId) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `/api/media/${coverId}`; });
  const W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H;
  const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  let q = 0.78, out = c.toDataURL("image/jpeg", q);
  while (out.length > 380000 && q > 0.45) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
  return out;
}
let OG_JALAN = false;
async function ogSiapkan(jenis, rows) {
  if (OG_JALAN) return; OG_JALAN = true;
  try {
    for (const r of rows.filter((x) => x.cover_id && x.og_src !== x.cover_id)) {
      try { await api("admin/og", { method: "POST", body: { jenis, id: r.id, src: r.cover_id, gambar: await buatOg(r.cover_id) } }); r.og_src = r.cover_id; } catch {}
    }
  } finally { OG_JALAN = false; }
}

async function campForm(c = {}) {
  const gal = galeriState(c);
  const kats = [...new Set(["Zakat", "Infak", "Sedekah", "Kesehatan", "Pendidikan", "Ekonomi", "Dakwah", "Kemanusiaan", "Pembangunan", "Fidyah", ...CAMPS.map((x) => x.kategori).filter(Boolean)])];
  modal(c.id ? "Ubah program" : "Program baru", `<datalist id="kats">${kats.map((k) => `<option value="${esc(k)}">`).join("")}</datalist>
    <label class="f">Gambar program <small>(rasio 16:9 paling pas)</small></label><div id="c_gal"></div>
    <div class="fg">${field("c_judul", "Judul", c.judul || "", { full: true })}${field("c_ringkas", "Ringkasan singkat", c.ringkas || "", { full: true, hint: "Tampil di kartu program, maksimal 160 karakter." })}
    ${field("c_jenis", "Jenis dana", c.jenis_dana || "infak", { sel: [["infak", "Infak / sedekah"], ["zakat", "Zakat"], ["wakaf", "Wakaf"], ["fidyah", "Fidyah"]] })}${field("c_kat", "Kategori", c.kategori || "", { list: "kats" })}
    ${field("c_target", "Target (kosongkan bila tanpa target)", c.target || "", { pre: "Rp", num: true })}${field("c_batas", "Batas waktu (opsional)", c.batas || "", { type: "date" })}
    ${field("c_ikon", "Ikon cadangan", c.ikon || "heart", { sel: IKON.map((i) => [i, i]) })}${field("c_status", "Status", c.status || "aktif", { sel: [["aktif", "Aktif (tampil)"], ["draft", "Draf (tersembunyi)"], ["selesai", "Selesai (arsip)"]] })}
    ${field("c_urut", "Urutan tampil", c.urutan || 100, { num: true })}<div><label class="chk"><input type="checkbox" id="c_ung" ${c.unggulan ? "checked" : ""}> Tampilkan di "Program pilihan"</label></div>
    ${field("c_cerita", "Cerita program", c.cerita || "", { area: true, rows: 8, full: true, hint: "Pisahkan paragraf dengan baris kosong. Tulis **teks** untuk huruf tebal." })}</div>
    ${c.id ? `<div class="sect">Kabar terbaru</div><div class="list" id="upd"></div><div class="fg">${field("u_judul", "Judul kabar", "", { full: true, ph: "Contoh: Alhamdulillah, bantuan tahap 1 disalurkan" })}${field("u_isi", "Isi kabar", "", { area: true, full: true })}</div>
      <button class="btn ghost sm" style="margin-top:8px" id="u_add">${ic("plus")} Terbitkan kabar</button>` : ""}`,
    `${c.id ? `<button class="btn danger sm" id="c_del" style="margin-right:auto">Hapus</button><a class="btn ghost sm" href="/c/${esc(c.slug)}" target="_blank" rel="noopener">${ic("ext")} Lihat</a>` : ""}<button class="btn primary sm" id="c_save">Simpan</button>`);
  bindMoney("c_target");
  galeriEditor("#c_gal", gal);
  $("#c_save").onclick = (e) => busy(e.target, async () => {
    const body = { judul: val("c_judul"), ringkas: val("c_ringkas"), jenis_dana: val("c_jenis"), kategori: val("c_kat"), target: num(val("c_target")), batas: val("c_batas"),
      ikon: val("c_ikon"), status: val("c_status"), urutan: num(val("c_urut")), unggulan: $("#c_ung").checked, cerita: $("#c_cerita").value, cover_id: gal.cover, galeri: gal.ids, slug: c.slug };
    await api(c.id ? "admin/campaigns/" + c.id : "admin/campaigns", { method: c.id ? "PUT" : "POST", body }); closeModal(); toast("Program disimpan"); VIEWS.program();
  });
  if (!c.id) return;
  $("#c_del").onclick = async () => { if ($("#c_del").dataset.ok !== "1") { $("#c_del").dataset.ok = "1"; $("#c_del").textContent = "Klik lagi untuk hapus"; return; }
    const r = await api("admin/campaigns/" + c.id, { method: "DELETE" }); closeModal(); toast(r.info); VIEWS.program(); };
  const loadU = async () => { const u = await api(`admin/campaigns/${c.id}/updates`);
    $("#upd").innerHTML = u.map((x) => `<div class="it"><span class="tx"><b>${esc(x.judul)}</b><small>${tglD(x.created_at)} · ${esc((x.isi || "").slice(0, 80))}</small></span><button class="btn danger xs" data-du="${x.id}">Hapus</button></div>`).join("") || `<p class="hint">Belum ada kabar. Kabar penyaluran membuat donatur percaya dan kembali berdonasi.</p>`;
    $$("[data-du]").forEach((b) => b.onclick = async () => { await api("admin/updates/" + b.dataset.du, { method: "DELETE" }); loadU(); }); };
  loadU();
  $("#u_add").onclick = (e) => busy(e.target, async () => { await api(`admin/campaigns/${c.id}/updates`, { method: "POST", body: { judul: val("u_judul"), isi: val("u_isi") } }); $("#u_judul").value = ""; $("#u_isi").value = ""; toast("Kabar diterbitkan"); loadU(); });
}

/* ---------- Donatur (CRM) ---------- */
VIEWS.donatur = async () => {
  const f = { q: "", segmen: "", page: 1 };
  main(`<div class="ph"><h1>Database donatur</h1><div class="acts"><a class="btn ghost sm" id="exp" href="/api/admin/export/donors">${ic("download")} Ekspor Excel (CSV)</a><button class="btn primary sm" id="addd">${ic("plus")} Tambah donatur</button></div></div>
    <div class="fbar"><div class="inp grow"><input id="f_q" placeholder="Cari nama, WA, kelurahan, kecamatan, pekerjaan"></div></div><div class="segs" id="segs"></div><div class="tw" id="tbl"></div><div class="pager" id="pg"></div>`);
  const load = async () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    const r = await api("admin/donors?" + qs); $("#exp").href = "/api/admin/export/donors?" + qs;
    const total = Object.values(r.segmen).reduce((a, b) => a + b, 0);
    $("#segs").innerHTML = `<button class="${!f.segmen ? "on" : ""}" data-s="">Semua</button>` + Object.entries(SEG).map(([k, l]) => `<button class="${f.segmen === k ? "on" : ""}" data-s="${k}">${l}${f.segmen ? "" : ` · ${r.segmen[k] || 0}`}</button>`).join("");
    $$("[data-s]").forEach((b) => b.onclick = () => { f.segmen = b.dataset.s; f.page = 1; load(); });
    $("#tbl").innerHTML = `<table class="t"><thead><tr><th>Nama</th><th>WhatsApp</th><th>Wilayah</th><th>Pekerjaan</th><th>Segmen</th><th class="num">Donasi</th><th class="num">Total</th><th>Terakhir</th></tr></thead><tbody>
      ${r.rows.map((d) => `<tr class="click" data-id="${d.id}"><td><b>${esc(((d.sapaan || "") + " " + (d.nama || "-")).trim())}</b></td><td>+${esc(d.wa)}</td><td>${esc([d.kelurahan, d.kecamatan].filter(Boolean).join(", ") || "-")}</td>
        <td>${esc(d.pekerjaan || "-")}</td><td><span class="tag ${d.segmen === "tidur" || d.segmen === "belum" ? "st-pending" : "st-paid"}">${SEG[d.segmen]}</span></td><td class="num">${d.n}</td><td class="num">${rp(d.total)}</td><td>${d.terakhir ? tglD(d.terakhir) : "-"}</td></tr>`).join("")
      || `<tr><td colspan="8" class="hint" style="text-align:center;padding:30px">${total ? "Tidak ada donatur untuk pencarian ini." : "Donatur tercatat otomatis saat berdonasi dengan nomor WhatsApp atau mendaftar pundi."}</td></tr>`}</tbody></table>`;
    const pages = Math.ceil(r.total / 50);
    $("#pg").innerHTML = pages > 1 ? `<button class="btn ghost xs" ${f.page <= 1 ? "disabled" : ""} id="pv">Sebelumnya</button> ${f.page} / ${pages} <button class="btn ghost xs" ${f.page >= pages ? "disabled" : ""} id="nx">Berikutnya</button>` : "";
    $("#pv")?.addEventListener("click", () => { f.page--; load(); }); $("#nx")?.addEventListener("click", () => { f.page++; load(); });
    $$("tr[data-id]").forEach((tr) => tr.onclick = () => donorDetail(+tr.dataset.id, load));
  };
  let t; $("#f_q").oninput = () => { clearTimeout(t); t = setTimeout(() => { f.q = val("f_q"); f.page = 1; load(); }, 350); };
  $("#addd").onclick = () => donorForm({}, load);
  await load();
};
function donorForm(d, after) {
  modal(d.id ? "Ubah data donatur" : "Tambah donatur", `<div class="fg">${field("p_nama", "Nama", d.nama || "")}${field("p_sapaan", "Sapaan", d.sapaan || "Bapak", { sel: [["Bapak", "Bapak"], ["Ibu", "Ibu"], ["Kak", "Kak"]] })}
    ${d.id ? "" : field("p_wa", "WhatsApp", "", { pre: "+62", num: true })}${field("p_email", "Email", d.email || "", { type: "email" })}${field("p_alamat", "Alamat", d.alamat || "", { full: true })}
    ${field("p_kel", "Kelurahan / desa", d.kelurahan || "")}${field("p_kec", "Kecamatan", d.kecamatan || "")}${field("p_kerja", "Pekerjaan", d.pekerjaan || "")}
    ${field("p_kat", "Kategori", d.kategori || "", { sel: [["", "-"], ["perorangan", "Perorangan"], ["mitra lokasi", "Mitra lokasi kotak"], ["perusahaan", "Perusahaan / instansi"], ["majelis", "Majelis taklim / masjid"]] })}
    ${field("p_cat", "Catatan", d.catatan || "", { area: true, full: true })}</div>`,
    `<button class="btn primary sm" id="p_save">Simpan</button>`);
  $("#p_save").onclick = (e) => busy(e.target, async () => {
    const body = { nama: val("p_nama"), sapaan: val("p_sapaan"), wa: val("p_wa"), email: val("p_email"), alamat: val("p_alamat"), kelurahan: val("p_kel"), kecamatan: val("p_kec"), pekerjaan: val("p_kerja"), kategori: val("p_kat"), catatan: val("p_cat") };
    await api(d.id ? "admin/donors/" + d.id : "admin/donors", { method: d.id ? "PUT" : "POST", body }); closeModal(); toast("Data donatur disimpan"); after && after();
  });
}
async function donorDetail(id, after) {
  const d = await api("admin/donors/" + id);
  modal(esc(((d.sapaan || "") + " " + (d.nama || "Donatur")).trim()), `<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><small>Total</small><b>${rpk(d.total)}</b></div><div class="kpi"><small>Zakat</small><b>${rpk(d.zakat)}</b></div><div class="kpi"><small>Donasi</small><b>${d.n}</b></div></div>
    <div class="receipt" style="box-shadow:none;border:1px solid var(--line)"><div class="rr"><span>WhatsApp</span><b><a href="${waLink(d.wa)}" target="_blank" rel="noopener">+${esc(d.wa)}</a></b></div>
      <div class="rr"><span>Alamat</span><b>${esc([d.alamat, d.kelurahan, d.kecamatan].filter(Boolean).join(", ") || "-")}</b></div><div class="rr"><span>Pekerjaan</span><b>${esc(d.pekerjaan || "-")}</b></div>
      <div class="rr"><span>Segmen</span><b>${SEG[d.segmen]}</b></div><div class="rr"><span>Donasi pertama</span><b>${d.pertama ? tglD(d.pertama) : "-"}</b></div>${d.catatan ? `<div class="rr"><span>Catatan</span><b>${esc(d.catatan)}</b></div>` : ""}</div>
    <div class="sect">Riwayat</div><div class="list">${d.riwayat.map((x) => `<div class="it"><span class="tx"><b>${rp(x.total)}</b> · ${esc(x.program)}<small>${tgl(x.paid_at || x.created_at)} · ${METODE[x.metode]}</small></span><span class="tag st-${x.status}">${STATUS[x.status]}</span></div>`).join("") || "<p class='hint'>Belum ada donasi.</p>"}</div>`,
    `<a class="btn green sm" href="${waLink(d.wa, `Assalamu'alaikum ${d.sapaan || ""} ${d.nama || ""},\n\n`)}" target="_blank" rel="noopener">${ic("wa")} Sapa via WhatsApp</a><button class="btn ghost sm" id="ed">Ubah data</button>`);
  $("#ed").onclick = () => donorForm(d, after);
}

/* ---------- Fundraiser ---------- */
VIEWS.fundraiser = async () => {
  const rows = await api("admin/fundraisers");
  const link = location.origin + "/#/mitra";
  main(`<div class="ph"><h1>Fundraiser & afiliasi</h1><div class="acts"><button class="btn ghost sm" onclick="copy('${link}','Tautan pendaftaran')">${ic("copy")} Salin tautan pendaftaran</button>
      <a class="btn green sm" target="_blank" rel="noopener" href="${waLink("", `Assalamu'alaikum, yuk jadi fundraiser WIZ Cabang ${PUB.cabang}. Daftar di sini, dapatkan tautan ajakan pribadi, dan pantau kebaikan yang Anda ajak:\n${link}`)}">${ic("wa")} Ajak jadi fundraiser</a></div></div>
    <div class="kpis"><div class="kpi"><small>Fundraiser aktif</small><b>${rows.filter((r) => r.status === "aktif").length}</b></div><div class="kpi"><small>Total dihimpun lewat fundraiser</small><b>${rpk(rows.reduce((a, b) => a + b.total, 0))}</b></div>
      <div class="kpi"><small>Donatur yang diajak</small><b>${rows.reduce((a, b) => a + b.donatur, 0)}</b></div></div>
    <div class="tw"><table class="t"><thead><tr><th>#</th><th>Fundraiser</th><th>Kode</th><th>Kota</th><th class="num">Donasi</th><th class="num">Total</th><th class="num">Komisi</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map((f, i) => `<tr><td>${i + 1}</td><td><b>${esc(f.nama)}</b><small><a href="${waLink(f.wa)}" target="_blank" rel="noopener">+${esc(f.wa)}</a> · sejak ${tglD(f.created_at)}</small></td><td class="mono">${esc(f.kode)}</td><td>${esc(f.kota || "-")}</td>
      <td class="num">${f.n}</td><td class="num">${rp(f.total)}</td><td class="num">${f.komisi_persen != null ? f.komisi_persen + "%" : "<small>umum</small>"}</td><td><span class="tag ${f.status === "aktif" ? "st-paid" : "st-pending"}">${f.status}</span></td>
      <td style="white-space:nowrap"><button class="btn ghost xs" data-t="${f.id}" data-s="${f.status === "aktif" ? "nonaktif" : "aktif"}">${f.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}</button> <button class="btn ghost xs" data-pin="${f.id}">Atur PIN</button> <button class="btn ghost xs" data-kom="${f.id}" data-persen="${f.komisi_persen ?? ""}">Komisi</button></td></tr>`).join("")
    || `<tr><td colspan="9" class="hint" style="text-align:center;padding:30px">Belum ada fundraiser. Bagikan tautan pendaftaran ke relawan, pengurus, dan jamaah.</td></tr>`}</tbody></table></div>`);
  $$("[data-t]").forEach((b) => b.onclick = async () => { await api("admin/fundraisers/" + b.dataset.t, { method: "PUT", body: { status: b.dataset.s } }); toast("Status diperbarui"); VIEWS.fundraiser(); });
  $$("[data-kom]").forEach((b) => b.onclick = () => { modal("Komisi afiliator", field("n_kom", "Persen komisi khusus (%)", b.dataset.persen, { hint: "Kosongkan untuk memakai persen umum dari Pengaturan. Berlaku untuk donasi berikutnya, donasi lama tidak berubah." }), `<button class="btn primary sm" id="kom_s">Simpan</button>`);
    $("#kom_s").onclick = (e) => busy(e.target, async () => { const raw = val("n_kom"); await api("admin/fundraisers/" + b.dataset.kom, { method: "PUT", body: { komisi_persen: raw === "" ? null : Number(raw.replace(",", ".")) } }); closeModal(); toast("Komisi disimpan"); VIEWS.fundraiser(); }); });
  $$("[data-pin]").forEach((b) => b.onclick = () => { modal("Atur ulang PIN", field("n_pin", "PIN baru (6 angka)", "", { num: true }), `<button class="btn primary sm" id="pin_s">Simpan PIN</button>`);
    $("#pin_s").onclick = (e) => busy(e.target, async () => { await api("admin/fundraisers/" + b.dataset.pin, { method: "PUT", body: { pin: val("n_pin") } }); closeModal(); toast("PIN diperbarui. Beri tahu fundraiser lewat WhatsApp."); }); });
};

/* ---------- Pesan WA: kirim, jadwal, kontak, grup ---------- */
const WA_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"];
const WA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WA_AUDIENS = { "": "Tidak", semua: "Semua donatur", sedekah: "Donatur yang pernah sedekah", pundi: "Donatur Pundi Sedekah" };
const WA_MODE = { sekarang: "Sekarang", sekali: "Nanti", harian: "Harian", mingguan: "Mingguan", bulanan: "Bulanan" };
const WA_JENIS = [["teks", "Pesan biasa"], ["pengumuman", "Pengumuman"], ["hadits", "Hadits"], ["ayat", "Ayat"]];
const WA_TABS = [["kirim", "Kirim pesan"], ["jadwal", "Terjadwal"], ["riwayat", "Riwayat"], ["kontak", "Kontak"], ["grup", "Grup"], ["berhenti", "Berhenti"]];
const WA_SHEET_CONTOH = "https://docs.google.com/spreadsheets/d/…/edit#gid=0";
let WA_TAB = "kirim", WA_DATA = null;
// Isian composer disimpan agar tidak hilang saat pindah tab
const WA_C = { pilih: new Map(), nomor: "", donatur: "", label: [], grup: [], anggota: [], kontak_semua: false, judul: "", jenis: "teks", sumber: "tulis", isi: "", lampiran: "", sheet_url: "", kategori: "", mode: "sekarang" };

const waTry = async (btn, fn) => { const t = btn.innerHTML; btn.disabled = true; btn.textContent = "Memproses…"; try { await fn(); } catch (e) { $("#m_err") && !$("#modalBg").hidden ? mErr(e.message) : toast(e.message); } finally { btn.disabled = false; btn.innerHTML = t; } };
const waChk = (name, items, checked = []) => `<div class="wa-chks">${items.map(([v, l]) => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${checked.map(String).includes(String(v)) ? "checked" : ""}> ${l}</label>`).join("")}</div>`;
const waTanggalIni = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); };
const waJadwalText = (j) => j.mode === "sekali" ? `${tglD(j.tanggal_mulai)} · ${j.jam || "-"}`
  : j.mode === "harian" ? `Tiap hari · ${j.jam}`
  : j.mode === "mingguan" ? `Tiap ${String(j.hari || "").split(",").map((n) => WA_HARI[n - 1]).join(", ")} · ${j.jam}`
  : j.mode === "bulanan" ? `${String(j.bulan || "").split(",").map((n) => WA_BULAN[n - 1]?.slice(0, 3)).join(", ")} · ${j.pekan ? "pekan " + j.pekan.split(",").join(", ") : "tgl " + j.tanggal} · ${j.jam}` : j.mode;
const waTargetText = (t = {}) => {
  const g = (ids) => ids.map((id) => (WA_DATA?.grup.find((x) => x.id === id)?.nama || id)).join(", ");
  const s = [];
  if (t.donatur) s.push(WA_AUDIENS[t.donatur]);
  if (t.kontak_semua) s.push("Semua kontak");
  if (t.label?.length) s.push("Label: " + t.label.join(", "));
  if (t.grup?.length) s.push("Grup: " + g(t.grup));
  if (t.anggota?.length) s.push("Anggota " + g(t.anggota));
  if (t.pilih?.length) s.push(`${t.pilih.length} orang dipilih`);
  if (t.nomor) s.push("Nomor tambahan");
  return s.join(" · ") || "-";
};
// Tampilan gelembung WA: *tebal*, _miring_, ~coret~, {nama}, {a|b}
const waBubble = (t) => esc(String(t || "").replace(/\{([^{}]*\|[^{}]*)\}/g, (_, s) => s.split("|")[0]).replaceAll("{nama}", "Ahmad"))
  .replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>").replace(/~([^~\n]+)~/g, "<s>$1</s>").replace(/\n/g, "<br>");

// ---- Kontak dari file / HP ----
function waParseVcf(text) {
  const out = [];
  for (const card of String(text).split(/BEGIN:VCARD/i).slice(1)) {
    const lines = card.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    const fn = lines.find((l) => /^FN[;:]/i.test(l))?.split(":").slice(1).join(":").trim()
      || lines.find((l) => /^N[;:]/i.test(l))?.split(":").slice(1).join(":").split(";").filter(Boolean).reverse().join(" ").trim() || "";
    for (const l of lines.filter((x) => /^(item\d+\.)?TEL/i.test(x))) out.push({ nama: fn, wa: l.split(":").slice(1).join(":").trim() });
  }
  return out;
}
function waParseCsv(text) {
  const rows = []; let row = [], cell = "", q = false; const s = String(text).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const telCol = head.map((h, i) => (/phone|telp|telepon|hp|whatsapp|^wa$|nomor/.test(h) && !/type|label|jenis/.test(h) ? i : -1)).filter((i) => i >= 0);
  const nameCol = head.findIndex((h) => /^(name|nama|display name|nama lengkap|full name)$/.test(h));
  const first = head.indexOf("first name"), last = head.indexOf("last name");
  const body = telCol.length ? rows.slice(1) : rows;
  const out = [];
  for (const r of body) {
    const nama = nameCol >= 0 ? r[nameCol] : first >= 0 ? `${r[first] || ""} ${r[last] || ""}` : r.find((x) => /[a-z]/i.test(x) && !/\d{6,}/.test(x)) || "";
    const cells = telCol.length ? telCol.map((i) => r[i] || "") : r.filter((x) => /\d[\d\s+().-]{7,}/.test(x));
    for (const c of cells) for (const n of String(c).split(/:::|\//)) if (/\d{6,}/.test(n.replace(/\D/g, ""))) out.push({ nama: String(nama).trim(), wa: n.trim() });
  }
  return out;
}
const waBisaKontakHP = () => "contacts" in navigator && "select" in (navigator.contacts || {});
async function waAmbilKontakHP() {
  const sel = await navigator.contacts.select(["name", "tel"], { multiple: true });
  const out = [];
  for (const c of sel) for (const t of c.tel || []) out.push({ nama: (c.name || [])[0] || "", wa: t });
  return out;
}
const waItemsKeTeks = (items) => items.map((x) => `${x.nama ? x.nama + " - " : ""}${x.wa}`).join("\n");

VIEWS.pesanwa = async () => {
  const qs = new URLSearchParams(location.hash.split("?")[1] || "");
  if (qs.get("berhenti")) WA_TAB = "berhenti";
  if (qs.get("tab")) WA_TAB = qs.get("tab");
  const [d, data] = await Promise.all([api("admin/wa/jadwal"), api("admin/wa/data")]);
  WA_DATA = data;
  main(`<div class="ph"><h1>Pesan WA</h1></div>
    ${!d.token_ok ? `<div class="alert"><span>Token Fonnte belum diatur. Isi di Pengaturan → Notifikasi WhatsApp agar pesan bisa dikirim.</span></div>` : ""}
    <div class="wa-tabs">${WA_TABS.map(([k, l]) => `<button class="${WA_TAB === k ? "on" : ""}" data-watab="${k}">${l}${k === "riwayat" && d.menunggu_total ? ` <span class="wa-badge">${d.menunggu_total}</span>` : ""}</button>`).join("")}</div>
    <div id="wa_body"></div>`);
  $(".wa-tabs .on")?.scrollIntoView({ inline: "center", block: "nearest" });
  $$("[data-watab]").forEach((b) => b.onclick = () => { WA_TAB = b.dataset.watab; if (location.hash !== "#pesanwa") history.replaceState(null, "", "#pesanwa"); VIEWS.pesanwa(); });
  const view = { kirim: waKirim, jadwal: waJadwal, riwayat: waRiwayat, kontak: waKontak, grup: waGrup, berhenti: waBerhenti }[WA_TAB] || waKirim;
  await view(d, qs);
};

// ================= Tab: Kirim pesan =================
function waTarget() {
  return { donatur: WA_C.donatur || undefined, kontak_semua: WA_C.kontak_semua || undefined, label: WA_C.label, grup: WA_C.grup, anggota: WA_C.anggota, pilih: [...WA_C.pilih.keys()], nomor: WA_C.nomor };
}
function waBoxWaktu() {
  const jam = field("wa_jam", "Jam (WITA)", WA_C.jam || "07:00", { type: "time" });
  const m = WA_C.mode;
  if (m === "sekarang") return `<p class="hint" style="margin:0">Pesan langsung dikirim. Fonnte memberi jeda acak 10–25 detik antar-nomor agar aman dari blokir.</p>`;
  if (m === "sekali") return `<div class="wa-grid">${field("wa_tgl", "Tanggal", WA_C.tgl || waTanggalIni(), { type: "date" })}${jam}</div>`;
  if (m === "harian") return `<div class="wa-grid">${jam}</div><p class="hint">Setiap hari dikirim satu materi, bergiliran dari materi pertama sampai terakhir lalu mengulang.</p>`;
  if (m === "mingguan") return `<label class="f">Hari</label>${waChk("wa_hari", WA_HARI.map((h, i) => [i + 1, h]), WA_C.hari || [5])}<div class="wa-grid" style="margin-top:10px">${jam}</div>`;
  return `<label class="f">Pekan</label>${waChk("wa_pekan", [[1, "Pekan 1"], [2, "Pekan 2"], [3, "Pekan 3"], [4, "Pekan 4"]], WA_C.pekan || [])}
    <div class="wa-grid" style="margin-top:10px">${field("wa_tanggal", "Atau tanggal (pisahkan koma)", WA_C.tanggal || "", { ph: "Contoh: 1, 15" })}${jam}</div>
    <label class="f" style="margin-top:10px">Bulan</label>${waChk("wa_bulan", WA_BULAN.map((b, i) => [i + 1, b.slice(0, 3)]), WA_C.bulan || WA_BULAN.map((_, i) => i + 1))}`;
}
function waSimpanWaktu() {
  if ($("#wa_jam")) WA_C.jam = val("wa_jam");
  if ($("#wa_tgl")) WA_C.tgl = val("wa_tgl");
  if ($("#wa_tanggal")) WA_C.tanggal = val("wa_tanggal");
  if ($("input[name=wa_hari]")) WA_C.hari = $$("input[name=wa_hari]:checked").map((x) => +x.value);
  if ($("input[name=wa_pekan]")) WA_C.pekan = $$("input[name=wa_pekan]:checked").map((x) => +x.value);
  if ($("input[name=wa_bulan]")) WA_C.bulan = $$("input[name=wa_bulan]:checked").map((x) => +x.value);
}

async function waKirim() {
  const L = WA_DATA.labels, G = WA_DATA.grup;
  $("#wa_body").innerHTML = `
    <div class="panel"><h2>1. Penerima</h2>
      <div class="wa-grid">${field("wa_don", "Donatur", WA_C.donatur, { sel: Object.entries(WA_AUDIENS) })}</div>
      <div class="wa-sec"><label class="f">Kontak WA ${WA_DATA.kontak_total ? `<small>(${WA_DATA.kontak_total} kontak)</small>` : ""}</label>
        ${WA_DATA.kontak_total ? `<div class="wa-chks"><label><input type="checkbox" id="wa_ksemua" ${WA_C.kontak_semua ? "checked" : ""}> <b>Semua kontak</b></label></div>
          ${L.length ? waChk("wa_lbl", L.map((x) => [x.label, `${esc(x.label)} <small>(${x.n})</small>`]), WA_C.label) : ""}`
          : `<p class="hint" style="margin:0">Belum ada kontak. Tambahkan di tab <a href="#" data-goto="kontak">Kontak</a>, atau tempel nomor di bawah.</p>`}</div>
      <div class="wa-sec"><label class="f">Grup WA</label>
        ${G.length ? `<div class="wa-glist">${G.map((g) => `<div class="wa-g"><div><b>${esc(g.nama)}</b><small>${g.anggota} anggota tercatat</small></div>
            <label><input type="checkbox" name="wa_grup" value="${esc(g.id)}" ${WA_C.grup.includes(g.id) ? "checked" : ""}> Kirim ke grup</label>
            <label class="${g.anggota ? "" : "wa-dis"}"><input type="checkbox" name="wa_ang" value="${esc(g.id)}" ${WA_C.anggota.includes(g.id) ? "checked" : ""} ${g.anggota ? "" : "disabled"}> Kirim pribadi ke anggota</label></div>`).join("")}</div>`
          : `<p class="hint" style="margin:0">Belum ada grup. Ambil daftar grup di tab <a href="#" data-goto="grup">Grup</a>.</p>`}</div>
      <div class="wa-sec"><label class="f">Pilih orang tertentu</label>
        <div class="inp"><input id="wa_cari" placeholder="Ketik nama atau nomor kontak / donatur" autocomplete="off"></div>
        <div id="wa_hasil" class="wa-hasil"></div><div id="wa_dipilih" class="wa-dipilih"></div></div>
      <div class="wa-sec">${field("wa_nomor", "Nomor baru (satu per baris, boleh dengan nama)", WA_C.nomor, { area: true, rows: 3, ph: "Contoh:\nAhmad - 0812 3456 7890\n0813xxxxxxx" })}
        <div class="acts" style="margin-top:6px">${waBisaKontakHP() ? `<button class="btn ghost xs" id="wa_hp">${ic("user", 14)} Ambil dari kontak HP</button>` : ""}
          <label class="btn ghost xs" style="cursor:pointer">Impor file kontak (.vcf/.csv)<input type="file" id="wa_file" accept=".vcf,.csv,.txt,text/vcard,text/csv" hidden></label></div>
        ${waBisaKontakHP() ? "" : `<p class="hint">Tombol "Ambil dari kontak HP" muncul bila admin membuka aplikasi lewat Chrome di HP Android.</p>`}</div>
      <div class="wa-total" id="wa_total">Menghitung penerima…</div></div>

    <div class="panel" style="margin-top:16px"><h2>2. Isi pesan</h2>
      <div class="wa-grid">${field("wa_judul", "Judul (untuk catatan admin)", WA_C.judul, { ph: "Contoh: Hadits harian, Undangan kajian" })}${field("wa_jenis", "Jenis", WA_C.jenis, { sel: WA_JENIS })}</div>
      <div class="wa-seg" style="margin-top:12px">${[["tulis", "Tulis pesan"], ["sheet", "Ambil dari Google Sheet"]].map(([k, l]) => `<button class="${WA_C.sumber === k ? "on" : ""}" data-sumber="${k}">${l}</button>`).join("")}</div>
      <div id="wa_isi_box" style="margin-top:12px"></div></div>

    <div class="panel" style="margin-top:16px"><h2>3. Waktu kirim</h2>
      <div class="wa-seg">${Object.entries(WA_MODE).map(([k, l]) => `<button class="${WA_C.mode === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("")}</div>
      <div id="wa_waktu" style="margin-top:12px">${waBoxWaktu()}</div>
      <div class="acts" style="margin-top:16px"><button class="btn primary" id="wa_go">${WA_C.mode === "sekarang" ? ic("wa", 16) + " Kirim sekarang" : "Simpan jadwal"}</button></div></div>`;

  $$("[data-goto]").forEach((a) => a.onclick = (e) => { e.preventDefault(); WA_TAB = a.dataset.goto; VIEWS.pesanwa(); });
  // ---- penerima ----
  let tHitung;
  const hitung = () => { clearTimeout(tHitung); tHitung = setTimeout(async () => {
    try { const r = await api("admin/wa/pratinjau", { method: "POST", body: { target: waTarget() } });
      if (!$("#wa_total")) return;
      $("#wa_total").innerHTML = r.jumlah || r.grup ? `Penerima: <b>${r.jumlah}</b> nomor pribadi${r.grup ? ` + <b>${r.grup}</b> grup` : ""}${r.contoh.length ? `<small>${esc(r.contoh.join(", "))}${r.jumlah > r.contoh.length ? ", …" : ""}</small>` : ""}` : "Belum ada penerima dipilih.";
    } catch (e) { if ($("#wa_total")) $("#wa_total").textContent = e.message; } }, 350); };
  const ambilPenerima = () => {
    WA_C.donatur = val("wa_don"); WA_C.kontak_semua = !!$("#wa_ksemua")?.checked;
    WA_C.label = $$("input[name=wa_lbl]:checked").map((x) => x.value);
    WA_C.grup = $$("input[name=wa_grup]:checked").map((x) => x.value);
    WA_C.anggota = $$("input[name=wa_ang]:checked").map((x) => x.value);
    WA_C.nomor = $("#wa_nomor").value; hitung();
  };
  ["#wa_don", "#wa_ksemua"].forEach((s) => $(s)?.addEventListener("change", ambilPenerima));
  $$("input[name=wa_lbl], input[name=wa_grup], input[name=wa_ang]").forEach((x) => x.onchange = ambilPenerima);
  $("#wa_nomor").addEventListener("input", ambilPenerima);
  const tampilPilih = () => {
    $("#wa_dipilih").innerHTML = [...WA_C.pilih.values()].map((p) => `<span class="wa-pill">${esc(p.nama || "+" + p.wa)} <button data-lepas="${p.wa}" aria-label="Hapus">×</button></span>`).join("");
    $$("[data-lepas]").forEach((b) => b.onclick = () => { WA_C.pilih.delete(b.dataset.lepas); tampilPilih(); hitung(); });
  };
  let tCari;
  $("#wa_cari").oninput = () => { clearTimeout(tCari); tCari = setTimeout(async () => {
    const q = val("wa_cari"); if (q.length < 2) { $("#wa_hasil").innerHTML = ""; return; }
    const rows = await api("admin/wa/cari?q=" + encodeURIComponent(q));
    $("#wa_hasil").innerHTML = rows.map((r) => `<button data-ambil='${esc(JSON.stringify(r))}'><b>${esc(r.nama || "(tanpa nama)")}</b> <span class="mono">+${r.wa}</span> <small>${r.sumber}</small></button>`).join("") || `<p class="hint">Tidak ditemukan. Tulis nomornya di kotak "Nomor baru".</p>`;
    $$("[data-ambil]").forEach((b) => b.onclick = () => { const r = JSON.parse(b.dataset.ambil); WA_C.pilih.set(r.wa, r); $("#wa_cari").value = ""; $("#wa_hasil").innerHTML = ""; tampilPilih(); hitung(); });
  }, 300); };
  const tambahNomor = (items) => {
    if (!items.length) return toast("Tidak ada nomor yang terbaca.");
    const el = $("#wa_nomor"); el.value = (el.value.trim() ? el.value.trim() + "\n" : "") + waItemsKeTeks(items); ambilPenerima();
    toast(`${items.length} nomor ditambahkan`);
  };
  $("#wa_hp")?.addEventListener("click", async () => { try { tambahNomor(await waAmbilKontakHP()); } catch (e) { toast("Kontak HP tidak dapat dibuka: " + e.message); } });
  $("#wa_file").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const t = await f.text(); tambahNomor(/BEGIN:VCARD/i.test(t) ? waParseVcf(t) : waParseCsv(t)); e.target.value = ""; };
  tampilPilih(); hitung();

  // ---- isi ----
  const isiBox = () => {
    if (WA_C.sumber === "sheet") {
      $("#wa_isi_box").innerHTML = `<div class="wa-grid">${field("wa_sheet", "Tautan Google Sheet", WA_C.sheet_url, { ph: WA_SHEET_CONTOH, full: true })}${field("wa_kat", "Kategori (opsional)", WA_C.kategori, { ph: "hadits / ayat / kosongkan untuk semua" })}</div>
        <p class="hint">Bagikan Sheet dengan akses <b>"Siapa saja yang memiliki link"</b> (Pelihat). Baris pertama berisi judul kolom: <span class="mono">judul, arab, terjemah, sumber, faedah, kategori, gambar</span>, atau satu kolom <span class="mono">pesan</span>. Satu baris = satu materi, dikirim bergiliran. Bisa memakai {nama}.</p>
        <div class="acts"><button class="btn ghost sm" id="wa_cek_sheet">Cek Sheet</button></div><div id="wa_sheet_hasil"></div>`;
      const simpan = () => { WA_C.sheet_url = val("wa_sheet"); WA_C.kategori = val("wa_kat"); };
      $("#wa_sheet").oninput = simpan; $("#wa_kat").oninput = simpan;
      $("#wa_cek_sheet").onclick = (e) => waTry(e.target, async () => {
        simpan(); const r = await api("admin/wa/sheet/cek", { method: "POST", body: { url: WA_C.sheet_url, kategori: WA_C.kategori } });
        $("#wa_sheet_hasil").innerHTML = `<p class="hint"><b>${r.jumlah} materi</b> terbaca. Contoh materi pertama:</p><div class="wa-bubble">${waBubble(r.contoh[0].teks)}${r.contoh[0].lampiran ? `<small>🖼 ${esc(r.contoh[0].lampiran)}</small>` : ""}</div>`;
      });
    } else {
      $("#wa_isi_box").innerHTML = `<div class="wa-tools">${[["{nama}", "Nama"], ["*", "Tebal"], ["_", "Miring"], ["{Assalamu'alaikum|Salam}", "Variasi"], ["\n---\n", "Pesan berikutnya"]].map(([v, l]) => `<button class="btn ghost xs" data-sisip="${esc(v)}">${l}</button>`).join("")}</div>
        <div class="wa-tulis"><div>${field("wa_isi", "Isi pesan", WA_C.isi, { area: true, rows: 9, ph: "Assalamu'alaikum {nama},\n\nTulis pesan di sini…" })}</div>
          <div><label class="f">Pratinjau</label><div class="wa-bubble" id="wa_prev"></div></div></div>
        ${field("wa_lamp", "Gambar (opsional): tautan https ke gambar", WA_C.lampiran, { ph: "https://…/poster.jpg" })}
        <p class="hint"><b>{nama}</b> diganti nama penerima. <b>{Assalamu'alaikum|Salam}</b> dipilih acak per kelompok penerima agar pesan bervariasi. Untuk jadwal berulang, pisahkan beberapa pesan dengan baris <b>---</b>; setiap jadwal mengirim satu pesan secara bergiliran. Pesan pribadi otomatis diberi ajakan balas BERHENTI.</p>`;
      const prev = () => { WA_C.isi = $("#wa_isi").value; $("#wa_prev").innerHTML = waBubble(WA_C.isi.split(/\n[ \t]*-{3,}[ \t]*(?:\n|$)/)[0]) || `<span class="hint">Pratinjau pesan</span>`; };
      $("#wa_isi").addEventListener("input", prev); $("#wa_lamp").oninput = () => { WA_C.lampiran = val("wa_lamp"); };
      $$("[data-sisip]").forEach((b) => b.onclick = () => {
        const ta = $("#wa_isi"), v = b.dataset.sisip, s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
        const ins = v === "*" || v === "_" ? v + (sel || "teks") + v : v;
        ta.setRangeText(ins, s, e, "end"); ta.focus(); prev();
      });
      prev();
    }
  };
  $$("[data-sumber]").forEach((b) => b.onclick = () => { WA_C.sumber = b.dataset.sumber; $$("[data-sumber]").forEach((x) => x.classList.toggle("on", x === b)); isiBox(); });
  isiBox();
  $("#wa_judul").oninput = () => { WA_C.judul = val("wa_judul"); };
  $("#wa_jenis").onchange = () => { WA_C.jenis = val("wa_jenis"); };

  // ---- waktu & kirim ----
  $$("[data-mode]").forEach((b) => b.onclick = () => {
    waSimpanWaktu(); WA_C.mode = b.dataset.mode; $$("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
    $("#wa_waktu").innerHTML = waBoxWaktu();
    $("#wa_go").innerHTML = WA_C.mode === "sekarang" ? ic("wa", 16) + " Kirim sekarang" : "Simpan jadwal";
  });
  $("#wa_go").onclick = (e) => {
    ambilPenerima(); waSimpanWaktu();
    const body = { judul: WA_C.judul || (WA_C.mode === "sekarang" ? "Kirim langsung " + new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""),
      jenis: WA_C.jenis, sumber: WA_C.sumber, isi: WA_C.isi, lampiran: WA_C.lampiran, sheet_url: WA_C.sheet_url, kategori: WA_C.kategori, mode: WA_C.mode, target: waTarget(),
      jam: WA_C.jam, tanggal: WA_C.mode === "bulanan" ? WA_C.tanggal : WA_C.tgl, hari: WA_C.hari, pekan: WA_C.pekan, bulan: WA_C.bulan };
    const go = () => waTry(e.target, async () => {
      const r = await api("admin/wa/jadwal", { method: "POST", body }); closeModal();
      if (WA_C.mode === "sekarang") { toast(`Terkirim ke antrean Fonnte: ${r.jumlah} pesan`); WA_C.isi = ""; WA_C.pilih.clear(); WA_C.nomor = ""; WA_TAB = "riwayat"; }
      else { toast("Jadwal disimpan"); WA_TAB = "jadwal"; }
      VIEWS.pesanwa();
    });
    if (WA_C.mode !== "sekarang") return go();
    modal("Kirim sekarang?", `<p>${$("#wa_total").innerHTML}</p><p class="hint">Pesan yang sudah dikirim tidak dapat ditarik kembali.</p>`, `<button class="btn ghost sm" onclick="closeModal()">Batal</button><button class="btn primary sm" id="wa_ya">Ya, kirim</button>`);
    $("#wa_ya").onclick = (ev) => { e = ev; go(); };
  };
}

// ================= Tab: Terjadwal =================
async function waJadwal(d) {
  const list = d.jadwal.filter((j) => j.aktif || j.mode !== "sekali" || j.terakhir_tgl !== j.tanggal_mulai || j.menunggu);
  $("#wa_body").innerHTML = `<div class="panel"><h2>Pesan terjadwal</h2>
    <p class="hint" style="margin-top:0">Jadwal diperiksa otomatis tiap 15 menit. Tombol <b>Kirim materi berikutnya</b> mengirim giliran berikutnya saat ini juga.</p>
    <div class="tw"><table class="t"><thead><tr><th>Judul</th><th>Penerima</th><th>Jadwal</th><th>Materi</th><th class="num">Terkirim</th><th class="num">Gagal</th><th></th></tr></thead><tbody>
    ${list.map((j) => `<tr class="${j.aktif ? "" : "wa-off"}"><td><b>${esc(j.judul)}</b><small>${esc(WA_JENIS.find((x) => x[0] === j.jenis)?.[1] || j.jenis)}${j.aktif ? "" : " · nonaktif"}</small>${j.catatan ? `<small style="color:var(--danger)">${esc(j.catatan)}</small>` : ""}</td>
      <td>${esc(waTargetText(j.target))}</td><td>${esc(waJadwalText(j))}</td>
      <td>${j.sumber === "sheet" ? `Google Sheet${j.kategori ? " · " + esc(j.kategori) : ""}<small>giliran ke-${(j.baris_idx || 0) + 1}</small>` : `${j.baris} pesan<small>giliran ke-${((j.baris_idx || 0) % Math.max(1, j.baris)) + 1}</small>`}</td>
      <td class="num">${j.terkirim}</td><td class="num">${j.gagal}${j.gagal ? `<br><button class="btn ghost xs" data-ulang="${j.id}">Kirim ulang</button>` : ""}</td>
      <td class="wa-act"><button class="btn ghost xs" data-now="${j.id}">Kirim materi berikutnya</button><button class="btn ghost xs" data-aktif="${j.id}" data-on="${j.aktif ? 0 : 1}">${j.aktif ? "Nonaktifkan" : "Aktifkan"}</button><button class="btn ghost xs" data-hapus="${j.id}" style="color:var(--danger)">Hapus</button></td></tr>`).join("")
      || `<tr><td colspan="7" class="hint" style="text-align:center;padding:24px">Belum ada jadwal. Buat di tab Kirim pesan, lalu pilih waktu Harian, Mingguan, atau Bulanan.</td></tr>`}</tbody></table></div></div>`;
  $$("[data-now]").forEach((b) => b.onclick = () => waTry(b, async () => { const r = await api(`admin/wa/jadwal/${b.dataset.now}/kirim`, { method: "POST" }); toast(`${r.jumlah} pesan dikirim`); VIEWS.pesanwa(); }));
  $$("[data-ulang]").forEach((b) => b.onclick = () => waTry(b, async () => { const r = await api(`admin/wa/jadwal/${b.dataset.ulang}/ulang`, { method: "POST" }); toast(`${r.jumlah} pesan dikirim ulang`); VIEWS.pesanwa(); }));
  $$("[data-aktif]").forEach((b) => b.onclick = () => waTry(b, async () => { await api(`admin/wa/jadwal/${b.dataset.aktif}/aktif`, { method: "POST", body: { aktif: b.dataset.on === "1" } }); VIEWS.pesanwa(); }));
  $$("[data-hapus]").forEach((b) => b.onclick = () => { modal("Hapus jadwal", `<p>Jadwal ini dihapus dan pesan yang masih menunggu di antrean dibatalkan. Riwayat yang sudah terkirim tetap ada.</p>`, `<button class="btn danger sm" id="hap_ok">Ya, hapus</button>`);
    $("#hap_ok").onclick = (e) => waTry(e.target, async () => { await api(`admin/wa/jadwal/${b.dataset.hapus}`, { method: "DELETE" }); closeModal(); toast("Jadwal dihapus"); VIEWS.pesanwa(); }); });
}

// ================= Tab: Riwayat =================
let WA_RST = "";
async function waRiwayat() {
  const r = await api("admin/wa/riwayat" + (WA_RST ? "?status=" + WA_RST : ""));
  const T = { menunggu: ["Menunggu", "st-pending"], terkirim: ["Terkirim", "st-paid"], gagal: ["Gagal", "st-failed"] };
  $("#wa_body").innerHTML = `<div class="panel"><h2>Riwayat pengiriman</h2>
    <div class="acts" style="margin-bottom:12px">${[["", "Semua"], ["menunggu", "Menunggu"], ["terkirim", "Terkirim"], ["gagal", "Gagal"]].map(([k, l]) => `<button class="btn ${WA_RST === k ? "primary" : "ghost"} xs" data-rst="${k}">${l}${k ? ` (${r.total[k] || 0})` : ""}</button>`).join("")}
      <button class="btn ghost xs" id="wa_proses" style="margin-left:auto">Proses antrean sekarang</button></div>
    <p class="hint" style="margin-top:0">"Terkirim" berarti pesan sudah diterima antrean Fonnte. Fonnte mengirimkannya bertahap dengan jeda acak.</p>
    <div class="tw"><table class="t"><thead><tr><th>Waktu</th><th>Judul</th><th>Tujuan</th><th>Pesan</th><th>Status</th></tr></thead><tbody>
    ${r.rows.map((x) => `<tr><td>${tglD(x.dikirim_at || x.created_at)}</td><td>${esc(x.judul || "-")}</td><td>${x.grup ? `👥 ${esc(x.nama)}` : `${esc(x.nama || "")}<small class="mono">+${esc(x.wa)}</small>`}</td>
      <td><div class="wa-cut">${esc(x.pesan)}</div></td><td><span class="tag ${T[x.status]?.[1] || ""}">${T[x.status]?.[0] || x.status}</span>${x.alasan ? `<small>${esc(x.alasan)}</small>` : ""}</td></tr>`).join("")
      || `<tr><td colspan="5" class="hint" style="text-align:center;padding:24px">Belum ada pesan.</td></tr>`}</tbody></table></div></div>`;
  $$("[data-rst]").forEach((b) => b.onclick = () => { WA_RST = b.dataset.rst; waRiwayat(); });
  $("#wa_proses").onclick = (e) => waTry(e.target, async () => { const x = await api("admin/wa/proses", { method: "POST" }); toast(`${x.terkirim} terkirim, ${x.gagal} gagal`); waRiwayat(); });
}

// ================= Tab: Kontak =================
let WA_KQ = "", WA_KL = "";
async function waKontak() {
  const r = await api(`admin/wa/kontak?q=${encodeURIComponent(WA_KQ)}&label=${encodeURIComponent(WA_KL)}`);
  const L = WA_DATA.labels;
  $("#wa_body").innerHTML = `<div class="panel"><h2>Tambah kontak</h2>
      <div class="wa-grid">${field("k_nama", "Nama", "", { ph: "Nama" })}${field("k_wa", "Nomor WhatsApp", "", { ph: "08xx" })}${field("k_lbl", "Label (pisahkan koma)", "", { ph: "Pengurus, Relawan", list: "k_lbls" })}</div>
      <datalist id="k_lbls">${L.map((x) => `<option value="${esc(x.label)}">`).join("")}</datalist>
      <div class="acts" style="margin-top:8px"><button class="btn primary sm" id="k_add">Simpan kontak</button></div>
      <h3 style="margin:20px 0 8px">Tambah banyak sekaligus</h3>
      ${field("k_teks", "Tempel daftar (satu per baris: nama dan nomor)", "", { area: true, rows: 4, ph: "Ahmad - 0812 3456 7890\nSiti 0813xxxxxxx" })}
      <div class="wa-grid">${field("k_lbl2", "Label untuk kontak yang diimpor", "", { ph: "Contoh: Majelis Taklim", list: "k_lbls" })}</div>
      <div class="acts" style="margin-top:8px"><button class="btn ghost sm" id="k_tempel">Simpan daftar</button>
        ${waBisaKontakHP() ? `<button class="btn ghost sm" id="k_hp">${ic("user", 14)} Ambil dari kontak HP</button>` : ""}
        <label class="btn ghost sm" style="cursor:pointer">Impor file .vcf / .csv<input type="file" id="k_file" accept=".vcf,.csv,.txt,text/vcard,text/csv" hidden></label></div>
      <p class="hint">File kontak bisa diekspor dari Google Contacts (contacts.google.com → Ekspor → vCard atau Google CSV) atau dari aplikasi Kontak di HP. ${waBisaKontakHP() ? "" : 'Tombol "Ambil dari kontak HP" tersedia saat aplikasi dibuka di Chrome Android.'}</p></div>
    <div class="panel" style="margin-top:16px"><h2>Daftar kontak <small>(${r.total})</small></h2>
      <div class="fbar"><div class="inp grow"><input id="k_q" placeholder="Cari nama atau nomor" value="${esc(WA_KQ)}"></div>
        <div class="inp"><select id="k_fl"><option value="">Semua label</option>${L.map((x) => `<option ${WA_KL === x.label ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Nama</th><th>WhatsApp</th><th>Label</th><th></th></tr></thead><tbody>
      ${r.rows.map((k) => `<tr><td>${esc(k.nama || "-")}</td><td class="mono">+${esc(k.wa)}</td><td>${(k.label || "").split(",").filter((x) => x.trim()).map((x) => `<span class="wa-lbl">${esc(x.trim())}</span>`).join(" ")}</td>
        <td class="wa-act"><button class="btn ghost xs" data-kedit='${esc(JSON.stringify(k))}'>Ubah</button><button class="btn ghost xs" data-kdel="${k.wa}" style="color:var(--danger)">Hapus</button></td></tr>`).join("")
        || `<tr><td colspan="4" class="hint" style="text-align:center;padding:24px">Belum ada kontak.</td></tr>`}</tbody></table></div>
      ${r.total > r.rows.length ? `<p class="hint">Menampilkan ${r.rows.length} dari ${r.total}. Gunakan pencarian untuk mempersempit.</p>` : ""}</div>`;
  const muat = async () => { WA_DATA = await api("admin/wa/data"); waKontak(); };
  const impor = async (body) => { const x = await api("admin/wa/kontak/impor", { method: "POST", body }); toast(`${x.tersimpan} kontak tersimpan (${x.baru} baru)`); await muat(); };
  $("#k_add").onclick = (e) => waTry(e.target, async () => { await api("admin/wa/kontak", { method: "POST", body: { nama: val("k_nama"), wa: val("k_wa"), label: val("k_lbl") } }); toast("Kontak disimpan"); await muat(); });
  $("#k_tempel").onclick = (e) => waTry(e.target, () => impor({ teks: $("#k_teks").value, label: val("k_lbl2"), sumber: "tempel" }));
  $("#k_hp")?.addEventListener("click", (e) => waTry(e.target, async () => impor({ items: await waAmbilKontakHP(), label: val("k_lbl2"), sumber: "hp" })));
  $("#k_file").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const t = await f.text(); const items = /BEGIN:VCARD/i.test(t) ? waParseVcf(t) : waParseCsv(t);
    try { await impor({ items, label: val("k_lbl2"), sumber: f.name.split(".").pop().toLowerCase() }); } catch (er) { toast(er.message); } e.target.value = ""; };
  let tq; $("#k_q").oninput = () => { clearTimeout(tq); tq = setTimeout(() => { WA_KQ = val("k_q"); waKontak(); }, 400); };
  $("#k_fl").onchange = () => { WA_KL = val("k_fl"); waKontak(); };
  $$("[data-kdel]").forEach((b) => b.onclick = () => waTry(b, async () => { await api(`admin/wa/kontak/${b.dataset.kdel}`, { method: "DELETE" }); toast("Kontak dihapus"); await muat(); }));
  $$("[data-kedit]").forEach((b) => b.onclick = () => { const k = JSON.parse(b.dataset.kedit);
    modal("Ubah kontak", `<div class="wa-grid">${field("ke_nama", "Nama", k.nama || "")}${field("ke_lbl", "Label (pisahkan koma)", k.label || "", { list: "k_lbls" })}</div><p class="hint mono">+${esc(k.wa)}</p>`, `<button class="btn primary sm" id="ke_ok">Simpan</button>`);
    $("#ke_ok").onclick = (e) => waTry(e.target, async () => { await api("admin/wa/kontak", { method: "POST", body: { wa: k.wa, nama: val("ke_nama"), label: val("ke_lbl"), ganti_label: true } }); closeModal(); toast("Kontak diperbarui"); await muat(); }); });
}

// ================= Tab: Grup =================
async function waGrup(d) {
  const G = WA_DATA.grup;
  $("#wa_body").innerHTML = `<div class="panel"><h2>Grup WhatsApp</h2>
      <p class="hint" style="margin-top:0">Nomor WhatsApp yang terhubung ke Fonnte harus sudah menjadi anggota grup. Tekan tombol di bawah setiap kali nomor itu bergabung ke grup baru.</p>
      <div class="acts"><button class="btn primary sm" id="g_sync">Ambil daftar grup dari Fonnte</button></div>
      <div class="tw" style="margin-top:12px"><table class="t"><thead><tr><th>Grup</th><th class="num">Anggota tercatat</th><th></th></tr></thead><tbody>
      ${G.map((g) => `<tr><td><b>${esc(g.nama)}</b><small class="mono">${esc(g.id)}</small></td><td class="num">${g.anggota}</td>
        <td class="wa-act"><button class="btn ghost xs" data-gang="${esc(g.id)}" data-gnama="${esc(g.nama)}">Anggota</button><button class="btn ghost xs" data-gdel="${esc(g.id)}" style="color:var(--danger)">Hapus</button></td></tr>`).join("")
        || `<tr><td colspan="3" class="hint" style="text-align:center;padding:24px">Belum ada grup.</td></tr>`}</tbody></table></div></div>
    <div class="panel" style="margin-top:16px"><h2>Tentang anggota grup</h2>
      <p class="hint" style="margin-top:0">Fonnte tidak menyediakan daftar anggota grup. Aplikasi mencatat anggota dengan dua cara:</p>
      <ol class="hint" style="margin:0;padding-left:18px"><li><b>Otomatis</b>: setiap anggota yang menulis pesan di grup tercatat lewat webhook (alamat webhook ada di tab Berhenti).</li>
        <li><b>Manual</b>: buka info grup di WhatsApp, salin nomor anggota, lalu tempel di tombol Anggota.</li></ol>
      <h3 style="margin:16px 0 8px">Tambah grup manual</h3>
      <div class="wa-grid">${field("g_id", "ID grup (berakhiran @g.us)", "", { ph: "1203630xxxxxxx@g.us" })}${field("g_nama", "Nama grup", "")}</div>
      <div class="acts" style="margin-top:8px"><button class="btn ghost sm" id="g_add">Simpan grup</button></div></div>`;
  const muat = async () => { WA_DATA = await api("admin/wa/data"); waGrup(d); };
  $("#g_sync").onclick = (e) => waTry(e.target, async () => { const r = await api("admin/wa/grup/sinkron", { method: "POST" }); toast(`${r.jumlah} grup ditemukan`); await muat(); });
  $("#g_add").onclick = (e) => waTry(e.target, async () => { await api("admin/wa/grup", { method: "POST", body: { id: val("g_id"), nama: val("g_nama") } }); toast("Grup disimpan"); await muat(); });
  $$("[data-gdel]").forEach((b) => b.onclick = () => { modal("Hapus grup", `<p>Grup dan daftar anggotanya dihapus dari aplikasi. Grup di WhatsApp tidak terpengaruh.</p>`, `<button class="btn danger sm" id="gd_ok">Ya, hapus</button>`);
    $("#gd_ok").onclick = (e) => waTry(e.target, async () => { await api(`admin/wa/grup/${encodeURIComponent(b.dataset.gdel)}`, { method: "DELETE" }); closeModal(); toast("Grup dihapus"); await muat(); }); });
  $$("[data-gang]").forEach((b) => b.onclick = () => waAnggota(b.dataset.gang, b.dataset.gnama, muat));
}
async function waAnggota(id, nama, muat) {
  const rows = await api(`admin/wa/grup/${encodeURIComponent(id)}/anggota`);
  modal("Anggota " + esc(nama), `<div class="tw" style="max-height:260px;overflow:auto"><table class="t"><tbody>
    ${rows.map((a) => `<tr><td>${esc(a.nama || "-")}<small class="mono">+${esc(a.wa)}</small></td><td><small>${a.sumber === "webhook" ? "otomatis" : "manual"}</small></td><td class="num"><button class="btn ghost xs" data-adel="${a.wa}" style="color:var(--danger)">Hapus</button></td></tr>`).join("")
      || `<tr><td class="hint">Belum ada anggota tercatat.</td></tr>`}</tbody></table></div>
    ${field("a_teks", "Tambah anggota (tempel nomor, satu per baris)", "", { area: true, rows: 4, ph: "Ahmad 0812xxxx\n0813xxxx" })}`, `<button class="btn primary sm" id="a_ok">Simpan anggota</button>`, true);
  $("#a_ok").onclick = (e) => waTry(e.target, async () => { const r = await api(`admin/wa/grup/${encodeURIComponent(id)}/anggota`, { method: "POST", body: { teks: $("#a_teks").value } }); toast(`${r.jumlah} anggota disimpan`); closeModal(); await muat(); });
  $$("[data-adel]").forEach((b) => b.onclick = () => waTry(b, async () => { await api(`admin/wa/grup/${encodeURIComponent(id)}/anggota/${b.dataset.adel}`, { method: "DELETE" }); b.closest("tr").remove(); WA_DATA = await api("admin/wa/data"); }));
}

// ================= Tab: Berhenti & webhook =================
async function waBerhenti(d, qs) {
  const konfirm = (qs.get("berhenti") || "").replace(/\D/g, "");
  const berhenti = await api("admin/wa/berhenti");
  const tag = (s) => (s === "dikonfirmasi" ? `<span class="tag st-paid">Berhenti</span>` : `<span class="tag st-pending">Menunggu konfirmasi</span>`);
  $("#wa_body").innerHTML = `${konfirm ? `<div class="panel" style="margin-bottom:16px;border:2px solid #f59e0b"><h2>Konfirmasi berhenti</h2>
      <p>Nomor <b class="mono">+${esc(konfirm)}</b> meminta berhenti. Nomor ini sudah tidak menerima pesan. Tekan tombol untuk mencatatnya.</p>
      <button class="btn primary sm" id="wa_kf">Konfirmasi berhenti</button></div>` : ""}
    <div class="panel"><h2>Berhenti menerima pesan</h2>
      <p class="hint" style="margin-top:0">Nomor yang membalas BERHENTI tidak menerima pesan pribadi lagi. Admin menerima pemberitahuan WhatsApp berisi tautan konfirmasi.</p>
      <div class="wa-grid">${field("wa_bwa", "Nomor WhatsApp", "", { ph: "08xx" })}${field("wa_bnm", "Nama (opsional)", "", { ph: "Nama" })}</div>
      <div class="acts" style="margin:8px 0 12px"><button class="btn ghost sm" id="wa_tambah_b">Tambahkan ke daftar berhenti</button></div>
      <div class="tw"><table class="t"><thead><tr><th>WhatsApp</th><th>Nama</th><th>Status</th><th>Waktu</th><th></th></tr></thead><tbody>
      ${berhenti.map((b) => `<tr><td class="mono">+${esc(b.wa)}</td><td>${esc(b.nama || "-")}</td><td>${tag(b.status)}</td><td>${tglD(b.created_at)}</td><td class="wa-act"><button class="btn ghost xs" data-izin="${b.wa}">Izinkan lagi</button></td></tr>`).join("")
        || `<tr><td colspan="5" class="hint" style="text-align:center;padding:24px">Belum ada yang berhenti.</td></tr>`}</tbody></table></div></div>
    <div class="panel" style="margin-top:16px"><h2>Webhook Fonnte</h2>
      <p class="hint" style="margin-top:0">Di dashboard Fonnte (menu Device → Edit), isi kolom <b>Webhook</b> dengan alamat berikut. Webhook dipakai untuk balasan BERHENTI dan pencatatan anggota grup otomatis.</p>
      <div class="inp"><input readonly value="${esc(d.webhook)}" onclick="this.select()" style="font-size:13px"></div></div>`;
  $("#wa_kf")?.addEventListener("click", (e) => waTry(e.target, async () => { await api(`admin/wa/berhenti/${konfirm}/konfirmasi`, { method: "POST" }); toast("Berhenti dikonfirmasi"); location.hash = "#pesanwa"; }));
  $("#wa_tambah_b").onclick = (e) => waTry(e.target, async () => { await api("admin/wa/berhenti", { method: "POST", body: { wa: val("wa_bwa"), nama: val("wa_bnm") } }); toast("Ditambahkan ke daftar berhenti"); VIEWS.pesanwa(); });
  $$("[data-izin]").forEach((b) => b.onclick = () => waTry(b, async () => { await api(`admin/wa/berhenti/${b.dataset.izin}`, { method: "DELETE" }); toast("Nomor bisa menerima pesan lagi"); VIEWS.pesanwa(); }));
}

/* ---------- Upah & penarikan ---------- */
let UPAH_TAB = "diajukan";
const TARIK_TAG = { diajukan: ["Menunggu", "st-pending"], disetujui: ["Dibayar", "st-paid"], ditolak: ["Ditolak", "st-failed"] };
VIEWS.upah = async () => {
  // Tautan dari WA admin: #upah?tarik=afiliator-12 atau #upah?tarik=petugas-5
  const buka = /^(afiliator|petugas)-(\d+)$/.exec(new URLSearchParams(location.hash.split("?")[1] || "").get("tarik") || "");
  if (buka) { UPAH_TAB = "semua"; history.replaceState(null, "", "#upah"); }
  const [d, tarik] = await Promise.all([api("admin/upah"), api("admin/penarikan?status=" + UPAH_TAB)]);
  const saldoAf = d.afiliator.reduce((a, b) => a + b.tersedia, 0), saldoPet = d.petugas.reduce((a, b) => a + b.tersedia, 0);
  const menunggu = d.afiliator.reduce((a, b) => a + b.diajukan, 0) + d.petugas.reduce((a, b) => a + b.diajukan, 0);
  const upah = d.petugas.reduce((a, b) => a + b.upah, 0);
  const TABS = [["diajukan", "Menunggu"], ["disetujui", "Sudah dibayar"], ["ditolak", "Ditolak"], ["semua", "Semua"]];
  main(`<div class="ph"><h1>Upah & penarikan</h1></div>
    <div class="kpis"><div class="kpi"><small>Saldo afiliator tersedia</small><b>${rp(saldoAf)}</b></div><div class="kpi"><small>Saldo upah petugas tersedia</small><b>${rp(saldoPet)}</b></div>
      <div class="kpi"><small>Penarikan menunggu persetujuan</small><b>${rp(menunggu)}</b></div><div class="kpi"><small>Total upah petugas (semua waktu)</small><b>${rp(upah)}</b></div></div>
    <div class="panel" style="margin-top:16px"><h2>Permintaan tarik saldo</h2>
      <div class="acts" style="margin-bottom:12px">${TABS.map(([k, l]) => `<button class="btn ${UPAH_TAB === k ? "primary" : "ghost"} xs" data-tab="${k}">${l}</button>`).join("")}</div>
      <div class="tw"><table class="t"><thead><tr><th>Tanggal</th><th>Penerima</th><th class="num">Nominal</th><th>Rekening tujuan</th><th>Status</th><th></th></tr></thead><tbody>
      ${tarik.map((t) => `<tr><td>${tglD(t.created_at)}</td><td><b>${esc(t.nama)}</b><small class="mono">${t.tipe === "petugas" ? esc(ROLES[t.kode] || t.kode) : esc(t.kode)} · +${esc(t.wa)}</small></td><td class="num">${rp(t.nominal)}</td><td>${esc(t.rekening)}${t.catatan ? `<small>${esc(t.catatan)}</small>` : ""}</td>
        <td><span class="tag ${TARIK_TAG[t.status]?.[1] || ""}">${TARIK_TAG[t.status]?.[0] || t.status}</span>${t.diproses_oleh ? `<small>oleh ${esc(t.diproses_oleh)}</small>` : ""}</td>
        <td style="white-space:nowrap">${t.status === "diajukan" ? `<button class="btn primary xs" data-ok="${t.id}" data-tipe="${t.tipe}">Setujui</button> <button class="btn ghost xs" data-no="${t.id}" data-tipe="${t.tipe}">Tolak</button>` : ""}</td></tr>`).join("")
        || `<tr><td colspan="6" class="hint" style="text-align:center;padding:24px">Tidak ada permintaan di daftar ini.</td></tr>`}</tbody></table></div>
      <p class="hint">Minimal penarikan ${rp(d.tarik_min)}. Setelah disetujui, catat sudah ditransfer agar saldo tercatat benar.</p></div>
    <div class="panel" style="margin-top:16px"><h2>Saldo afiliator</h2><div class="tw"><table class="t"><thead><tr><th>Afiliator</th><th class="num">Komisi</th><th class="num">Donasi lunas</th><th class="num">Diperoleh</th><th class="num">Dibayar</th><th class="num">Menunggu</th><th class="num">Tersedia</th></tr></thead><tbody>
      ${d.afiliator.map((f) => `<tr><td><b>${esc(f.nama)}</b><small class="mono">${esc(f.kode)}</small></td><td class="num">${f.persen}%</td><td class="num">${f.donasi}</td><td class="num">${rp(f.diperoleh)}</td><td class="num">${rp(f.dibayar)}</td><td class="num">${rp(f.diajukan)}</td><td class="num"><b>${rp(f.tersedia)}</b></td></tr>`).join("")
        || `<tr><td colspan="7" class="hint" style="text-align:center;padding:24px">Belum ada afiliator.</td></tr>`}</tbody></table></div>
      <p class="hint">Komisi hanya dihitung dari donasi infak dan sedekah, tidak dari zakat.</p></div>
    <div class="panel" style="margin-top:16px"><h2>Setoran & upah petugas</h2><div class="tw"><table class="t"><thead><tr><th>Petugas</th><th>Peran</th><th class="num">Persen</th><th class="num">Slip</th><th class="num">Total setoran</th><th class="num">Upah</th><th class="num">Dibayar</th><th class="num">Tersedia</th></tr></thead><tbody>
      ${d.petugas.map((p) => `<tr><td><b>${esc(p.nama)}</b></td><td>${esc(ROLES[p.role] || p.role)}</td><td class="num">${p.persen}%</td><td class="num">${p.slip}</td><td class="num">${rp(p.setoran)}</td><td class="num">${rp(p.upah)}</td><td class="num">${rp(p.dibayar)}</td><td class="num"><b>${rp(p.tersedia)}</b></td></tr>`).join("")
        || `<tr><td colspan="8" class="hint" style="text-align:center;padding:24px">Belum ada petugas lapangan.</td></tr>`}</tbody></table></div>
      <p class="hint">Upah petugas dihitung dari program infak dan sedekah saja. Slip yang dibatalkan tidak ikut dihitung.</p></div>`);
  $$("[data-tab]").forEach((b) => b.onclick = () => { UPAH_TAB = b.dataset.tab; VIEWS.upah(); });
  $$("[data-ok]").forEach((b) => b.onclick = () => { modal("Setujui penarikan", `<p>Pastikan dana sudah ditransfer ke rekening tujuan, lalu catat persetujuan ini. Penerima akan menerima kabar lewat WhatsApp.</p>${field("n_cat", "Catatan (opsional)", "", { ph: "Contoh: transfer BSI tanggal 3 Nov" })}`, `<button class="btn primary sm" id="ok_s">Setujui & catat</button>`);
    $("#ok_s").onclick = (e) => busy(e.target, async () => { await api(`admin/penarikan/${b.dataset.tipe}/${b.dataset.ok}/setuju`, { method: "POST", body: { catatan: val("n_cat") } }); closeModal(); toast("Penarikan disetujui dan dicatat"); VIEWS.upah(); }); });
  $$("[data-no]").forEach((b) => b.onclick = () => { modal("Tolak penarikan", `<p>Saldo akan kembali tersedia. Jelaskan alasannya agar penerima bisa memperbaiki pengajuan.</p>${field("n_alasan", "Alasan penolakan", "", { ph: "Contoh: nomor rekening tidak jelas" })}`, `<button class="btn danger sm" id="no_s">Tolak</button>`);
    $("#no_s").onclick = (e) => busy(e.target, async () => { await api(`admin/penarikan/${b.dataset.tipe}/${b.dataset.no}/tolak`, { method: "POST", body: { alasan: val("n_alasan") } }); closeModal(); toast("Penarikan ditolak"); VIEWS.upah(); }); });
  if (buka) {
    const t = tarik.find((x) => x.tipe === buka[1] && String(x.id) === buka[2]);
    if (!t) return toast("Permintaan penarikan tidak ditemukan.");
    const tr = $(`[data-ok="${t.id}"][data-tipe="${t.tipe}"]`)?.closest("tr") || null;
    if (t.status !== "diajukan") return toast(`Permintaan ini sudah ${TARIK_TAG[t.status]?.[0].toLowerCase() || t.status}${t.diproses_oleh ? " oleh " + t.diproses_oleh : ""}.`);
    tr?.scrollIntoView({ block: "center" });
    const peran = t.tipe === "petugas" ? ROLES[t.kode] || t.kode : "Afiliator · kode " + t.kode;
    modal("Permintaan penarikan", `<div class="receipt" style="box-shadow:none;border:1px solid var(--line)">
        <div class="rr"><span>Penerima</span><b>${esc(t.nama)}</b></div><div class="rr"><span>Peran</span><b>${esc(peran)}</b></div>
        <div class="rr"><span>WhatsApp</span><b class="mono">+${esc(t.wa || "-")}</b></div><div class="rr"><span>Nominal</span><b>${rp(t.nominal)}</b></div>
        <div class="rr"><span>Rekening tujuan</span><b>${esc(t.rekening)}</b></div><div class="rr"><span>Diajukan</span><b>${tglD(t.created_at)}</b></div></div>
      <p class="hint">Transfer dana ke rekening di atas terlebih dahulu, lalu tekan Setujui. Penerima akan dikabari lewat WhatsApp.</p>`,
      `<button class="btn ghost sm" id="lk_no">Tolak</button><button class="btn primary sm" id="lk_ok">Setujui</button>`);
    $("#lk_ok").onclick = () => { closeModal(); $(`[data-ok="${t.id}"][data-tipe="${t.tipe}"]`).click(); };
    $("#lk_no").onclick = () => { closeModal(); $(`[data-no="${t.id}"][data-tipe="${t.tipe}"]`).click(); };
  }
};

/* ---------- Pundi & kotak ---------- */
VIEWS.lapanganLama = async () => {
  const [pundi, kotak] = await Promise.all([api("admin/pundi"), api("admin/kotak")]);
  const PS = { baru: "Baru daftar", diantar: "Sedang diantar", aktif: "Aktif", berhenti: "Berhenti" };
  main(`<div class="ph"><h1>Pundi & kotak amal</h1><div class="acts"><button class="btn ghost sm" id="prt">${ic("print")} Cetak stiker QR</button><button class="btn primary sm" id="addk">${ic("plus")} Kotak baru</button></div></div>
    <div class="sect" style="margin-top:0">Kotak amal (${kotak.length})</div>
    <div class="tw"><table class="t"><thead><tr><th>Kode</th><th>Lokasi</th><th>Pemilik</th><th>PJ</th><th class="num">Setoran</th><th class="num">Total</th><th>Terakhir</th><th></th></tr></thead><tbody>
    ${kotak.map((k) => `<tr><td class="mono"><b>${esc(k.kode)}</b></td><td>${esc(k.nama_lokasi)}<small>${esc(k.alamat || "")}</small></td><td>${esc(k.pemilik || "-")}<small>${k.wa_pemilik ? "+" + esc(k.wa_pemilik) : ""}</small></td><td>${esc(k.pj || "-")}</td>
      <td class="num">${k.n}</td><td class="num">${rp(k.total)}</td><td>${k.terakhir ? tglD(k.terakhir) : "-"}</td>
      <td style="white-space:nowrap"><button class="btn green xs" data-setor="${esc(k.kode)}" data-pj="${esc(k.pj || "")}">Catat setoran</button> <button class="btn ghost xs" data-ek="${k.id}">Ubah</button></td></tr>`).join("")
      || `<tr><td colspan="8" class="hint" style="text-align:center;padding:24px">Belum ada kotak amal. Tambahkan titik kios atau rumah yang menampung kotak.</td></tr>`}</tbody></table></div>
    <div class="sect">Pundi Sedekah (${pundi.length})</div>
    <div class="tw"><table class="t"><thead><tr><th>Kode</th><th>Keluarga</th><th>Alamat</th><th>Jemput</th><th>Petugas</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
    ${pundi.map((p) => `<tr><td class="mono"><b>${esc(p.kode || "-")}</b></td><td>${esc(p.nama)}<small><a href="${waLink(p.wa)}" target="_blank" rel="noopener">+${esc(p.wa)}</a> · ${p.jumlah} pundi</small></td>
      <td>${esc(p.alamat || "")}<small>${esc([p.kelurahan, p.kecamatan].filter(Boolean).join(", "))}${p.patokan ? " · " + esc(p.patokan) : ""}</small></td><td>${esc(p.waktu_jemput || "-")}</td><td>${esc(p.petugas || "-")}</td>
      <td class="num">${rp(p.total)}</td><td><span class="tag ${p.status === "aktif" ? "st-paid" : p.status === "berhenti" ? "st-failed" : "st-pending"}">${PS[p.status]}</span></td>
      <td style="white-space:nowrap">${p.kode ? `<button class="btn green xs" data-sp="${esc(p.kode)}" data-n="${esc(p.nama)}" data-w="${esc(p.wa)}">Catat setoran</button> ` : ""}<button class="btn ghost xs" data-ep="${p.id}">Atur</button></td></tr>`).join("")
      || `<tr><td colspan="8" class="hint" style="text-align:center;padding:24px">Belum ada pendaftar. Pendaftaran masuk dari menu Pundi di aplikasi donatur.</td></tr>`}</tbody></table></div>`);
  $("#addk").onclick = () => kotakForm({});
  $$("[data-ek]").forEach((b) => b.onclick = () => kotakForm(kotak.find((k) => k.id === +b.dataset.ek)));
  $$("[data-setor]").forEach((b) => b.onclick = () => offlineForm({ metode: "kotak", kotak_kode: b.dataset.setor, petugas: b.dataset.pj || ME.nama }));
  $$("[data-sp]").forEach((b) => b.onclick = () => offlineForm({ metode: "pundi", pundi_kode: b.dataset.sp, nama: b.dataset.n, wa: b.dataset.w.replace(/^62/, "") }));
  $$("[data-ep]").forEach((b) => b.onclick = () => { const p = pundi.find((x) => x.id === +b.dataset.ep);
    modal("Atur pundi " + esc(p.nama), `<div class="fg">${field("pu_kode", "Kode pundi", p.kode || "P-" + String(p.id).padStart(4, "0"), { hint: "Tulis kode yang sama di stiker pundi." })}
      ${field("pu_st", "Status", p.status, { sel: Object.entries(PS) })}${field("pu_pet", "Petugas penjemput", p.petugas || "", { full: true })}</div>`,
      `<a class="btn green sm" href="${waLink(p.wa, `Assalamu'alaikum ${p.nama}, kami dari WIZ Cabang ${PUB.cabang} akan mengantar Pundi Sedekah Anda. `)}" target="_blank" rel="noopener">${ic("wa")} Hubungi</a><button class="btn primary sm" id="pu_s">Simpan</button>`);
    $("#pu_s").onclick = (e) => busy(e.target, async () => { await api("admin/pundi/" + p.id, { method: "PUT", body: { kode: val("pu_kode"), status: val("pu_st"), petugas: val("pu_pet") } }); closeModal(); toast("Pundi diperbarui"); VIEWS.lapangan(); }); });
  $("#prt").onclick = () => printQR(kotak, pundi.filter((p) => p.kode));
};
function kotakForm(k) {
  modal(k.id ? "Ubah kotak " + esc(k.kode) : "Kotak amal baru", `<div class="fg">${k.id ? "" : field("k_kode", "Kode (kosongkan untuk otomatis)", "", { ph: "K-001" })}${field("k_lok", "Nama lokasi", k.nama_lokasi || "", { ph: "Kios Barokah" })}
    ${field("k_alamat", "Alamat", k.alamat || "", { full: true })}${field("k_pem", "Pemilik tempat", k.pemilik || "")}${field("k_wa", "WhatsApp pemilik", k.wa_pemilik ? String(k.wa_pemilik).replace(/^62/, "") : "", { pre: "+62", num: true, hint: "Pemilik menerima WA setiap kotak dijemput (saksi independen)." })}
    ${field("k_pj", "Penanggung jawab (PJ)", k.pj || "")}${k.id ? field("k_st", "Status", k.status, { sel: [["aktif", "Aktif"], ["nonaktif", "Nonaktif"]] }) : ""}</div>`,
    `<button class="btn primary sm" id="k_s">Simpan</button>`);
  $("#k_s").onclick = (e) => busy(e.target, async () => {
    const body = { kode: val("k_kode"), nama_lokasi: val("k_lok"), alamat: val("k_alamat"), pemilik: val("k_pem"), wa_pemilik: val("k_wa"), pj: val("k_pj"), status: val("k_st") || "aktif" };
    const r = await api(k.id ? "admin/kotak/" + k.id : "admin/kotak", { method: k.id ? "PUT" : "POST", body }); closeModal(); toast(k.id ? "Kotak diperbarui" : "Kotak " + r.kode + " dibuat"); VIEWS.lapangan();
  });
}
function qrSvg(text) {
  if (typeof qrcode !== "function") return `<div class="mono" style="padding:20px 0">${esc(text)}</div>`;
  const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
function printQR(kotak, pundi) {
  const items = [...kotak.filter((k) => k.status === "aktif").map((k) => ({ kode: k.kode, sub: k.nama_lokasi, url: `${location.origin}/#/kotak/${k.kode}`, t: "Kotak Amal" })),
    ...pundi.map((p) => ({ kode: p.kode, sub: p.nama, url: `${location.origin}/#/pundi/${p.kode}`, t: "Pundi Sedekah" }))];
  modal("Stiker QR", items.length ? `<p class="hint" style="margin-top:0">Tempel di kotak atau pundi. Donatur yang memindai langsung bisa bersedekah dan tercatat untuk titik tersebut.</p>
    <div id="printArea"><div class="qrs">${items.map((i) => `<div class="q"><img class="l" src="/assets/logo.png" alt="WIZ"><b>${esc(i.t)}</b><small>${esc(i.sub)}</small>${qrSvg(i.url)}<b class="mono">${esc(i.kode)}</b><small>Pindai untuk bersedekah</small></div>`).join("")}</div></div>`
    : `<p class="hint">Belum ada kotak aktif atau pundi berkode.</p>`, items.length ? `<button class="btn primary sm" onclick="print()">${ic("print")} Cetak</button>` : "");
}

/* ---------- Pengaturan ---------- */
VIEWS.pengaturan = async () => {
  const [s, admins] = await Promise.all([api("admin/settings"), api("admin/admins")]);
  const rek = [...(s.rekening || []), {}, {}].slice(0, 3);
  const wa0 = (v) => (v ? String(v).replace(/^62/, "") : "");
  let qrisId = s.qris_media_id;
  main(`<div class="ph"><h1>Pengaturan</h1><div class="acts"><button class="btn primary sm" id="save">${ic("check")} Simpan pengaturan</button></div></div>
    <div class="g2"><div>
      <div class="panel"><h2>Profil cabang</h2><div class="fg">${field("s_cabang", "Nama cabang", s.cabang)}${field("s_min", "Minimal donasi", s.min_donasi, { pre: "Rp", num: true })}${field("s_tag", "Tagline", s.tagline, { full: true })}</div></div>
      <div class="panel" style="margin-top:16px"><h2>Kontak WhatsApp</h2><div class="fg">${field("s_wa_admin", "Admin & konsultasi zakat", wa0(s.wa_admin), { pre: "+62", num: true, hint: "Juga menerima notifikasi donasi masuk." })}
        ${field("s_wa_amb", "Layanan ambulans", wa0(s.wa_ambulans), { pre: "+62", num: true })}${field("s_wa_pundi", "Koordinator pundi", wa0(s.wa_pundi), { pre: "+62", num: true })}</div></div>
      <div class="panel" style="margin-top:16px"><h2>Rekening & QRIS cabang</h2><p class="hint" style="margin-top:0">Hanya rekening resmi atas nama lembaga. Kosongkan baris yang tidak dipakai.</p>
        ${rek.map((r, i) => `<div class="fg">${field("r_bank" + i, "Bank", r.bank || "")}${field("r_no" + i, "Nomor rekening", r.no || "", { num: true })}${field("r_an" + i, "Atas nama", r.an || "Wahdah Inspirasi Zakat", { full: true })}</div>`).join("<hr style='border:0;border-top:1px dashed var(--line);margin:12px 0'>")}
        <label class="f">Gambar QRIS statis (opsional)</label><label class="cover-prev" style="aspect-ratio:1;max-width:220px;cursor:pointer" for="qr_f" id="qr_p">${qrisId ? `<img src="/api/media/${qrisId}" alt="QRIS">` : `<span>${ic("plus", 24)}<br>Unggah QRIS</span>`}</label><input type="file" id="qr_f" accept="image/*" hidden>
        ${qrisId ? `<button class="btn ghost xs" style="margin-top:8px" id="qr_x">Hapus QRIS</button>` : ""}</div>
      <div class="panel" style="margin-top:16px"><h2>Zakat & pundi</h2><div class="fg">${field("s_emas", "Harga emas per gram", s.harga_emas, { pre: "Rp", num: true, hint: "Perbarui berkala; menentukan nisab." })}${field("s_nisab", "Nisab (gram emas)", s.nisab_gram, { num: true })}
        ${field("s_beras", "Harga beras per kg", s.harga_beras, { pre: "Rp", num: true })}${field("s_kg", "Beras per jiwa (kg)", s.beras_per_jiwa)}
        ${field("s_pj", "Jadwal jemput pundi", s.pundi_jadwal)}${field("s_pw", "Wilayah layanan pundi", s.pundi_wilayah)}</div></div>
      <div class="panel" style="margin-top:16px"><h2>Lapangan, slip & surat</h2><div class="fg">
        ${field("s_ktr", "Alamat kantor (di surat persetujuan)", s.kantor_alamat, { full: true })}${field("s_cc", "Call center", s.call_center)}${field("s_kode", "Kode cabang (ID donatur)", s.kode_cabang, { hint: "Contoh PSO → ID donatur PSO-00012" })}
        ${field("s_kab", "Kab./Kota bawaan di slip", s.kab_default)}${field("s_prov", "Provinsi bawaan di slip", s.provinsi_default)}
        ${field("s_jt", "Tanggal jemput bawaan (1–28)", s.jemput_tanggal, { num: true, hint: "Bisa diatur berbeda per titik." })}${field("s_ap", "Periode Amplop Ramadhan", s.amplop_periode)}</div></div>
    </div><div>
      <div class="panel"><h2>Payment gateway (Midtrans) <span class="tag ${s.gateway_on ? "st-paid" : "st-pending"}" style="margin-left:auto">${s.gateway_on ? "Aktif" : "Belum aktif"}</span></h2>
        <p class="hint" style="margin-top:0">Membuat QRIS dinamis, virtual account semua bank, dan e-wallet dengan konfirmasi otomatis. Daftar di midtrans.com atas nama lembaga.</p>
        ${s.from_env.midtrans ? `<div class="alert ok">${ic("check")}<span>Server key diatur lewat variabel lingkungan Cloudflare.</span></div>` : field("s_mt", "Server key", s.midtrans_server_key, { type: "password", ph: "Mid-server-…", hint: "Disimpan aman, hanya 4 karakter terakhir yang ditampilkan." })}
        <label class="chk"><input type="checkbox" id="s_mtp" ${s.midtrans_production ? "checked" : ""}> Mode produksi (matikan untuk uji coba sandbox)</label>
        <label class="f">URL notifikasi (tempel di Midtrans › Settings › Payment › Notification URL)</label>
        <div class="copyrow"><span class="mono">${esc(s.webhook_url)}</span><button onclick="copy('${s.webhook_url}','URL')">${ic("copy", 16)} Salin</button></div></div>
      <div class="panel" style="margin-top:16px"><h2>Notifikasi WhatsApp (Fonnte) <span class="tag ${s.wa_on ? "st-paid" : "st-pending"}" style="margin-left:auto">${s.wa_on ? "Aktif" : "Belum aktif"}</span></h2>
        <p class="hint" style="margin-top:0">Kuitansi otomatis ke donatur, notifikasi ke admin, fundraiser, dan pemilik kotak. Daftar di fonnte.com lalu hubungkan nomor WhatsApp cabang.</p>
        ${s.from_env.fonnte ? `<div class="alert ok">${ic("check")}<span>Token diatur lewat variabel lingkungan Cloudflare.</span></div>` : field("s_fn", "Token Fonnte", s.fonnte_token, { type: "password" })}
        <label class="chk"><input type="checkbox" id="s_nd" ${s.notif_donatur ? "checked" : ""}> Kirim kuitansi ke donatur</label>
        <label class="chk"><input type="checkbox" id="s_na" ${s.notif_admin ? "checked" : ""}> Beri tahu admin setiap donasi online</label>
        <label class="chk"><input type="checkbox" id="s_nf" ${s.notif_fundraiser ? "checked" : ""}> Beri tahu fundraiser saat ajakannya berhasil</label>
        <div style="display:flex;gap:8px;margin-top:12px"><div class="inp" style="flex:1"><span>+62</span><input id="t_wa" inputmode="numeric" placeholder="Nomor uji"></div><button class="btn ghost sm" id="t_go">Kirim tes</button></div></div>
      <div class="panel" style="margin-top:16px"><h2>Fundraiser</h2>
        <label class="chk"><input type="checkbox" id="s_fa" ${s.fr_auto_aktif ? "checked" : ""}> Fundraiser baru langsung aktif</label>
        ${field("s_fap", "Pesan apresiasi di portal fundraiser", s.fr_apresiasi, { area: true, ph: "Contoh: Fundraiser terbaik tiap bulan mendapat paket buku dan doa bersama." , hint: "Komisi dan upah hanya dari infak dan sedekah, tidak dari zakat." })}</div>
      <div class="panel" style="margin-top:16px"><h2>Upah & komisi</h2><p class="hint" style="margin-top:0">Komisi afiliator dihitung dari donasi infak dan sedekah yang lunas. Upah petugas dihitung dari rincian infak dan sedekah pada slip. Dana zakat tidak pernah menghasilkan komisi atau upah. Tiap transaksi menyimpan persen yang berlaku saat dicatat.</p>
        <div class="fg">${field("s_upa", "Komisi afiliator (%)", s.upah_afiliator_persen ?? 0, { hint: "Dibayar dari donasi yang masuk lewat tautan afiliator." })}${field("s_upz", "Upah petugas ZISKO (%)", s.upah_zisko_persen ?? 0, { hint: "Dihitung dari setiap slip setoran yang dicatat." })}
        ${field("s_tmin", "Penarikan minimal", s.tarik_min ?? 50000, { pre: "Rp", num: true })}</div></div>
      <div class="panel" style="margin-top:16px"><h2>Pengguna & peran</h2><p class="hint" style="margin-top:0">Pengurus masuk dengan email, petugas lapangan cukup dengan nomor WhatsApp. Relawan afiliator mendaftar sendiri di portal relawan.</p>
        <div class="list">${admins.map((a) => `<a class="it" href="#" data-ea="${a.id}"><span class="tx"><b>${esc(a.nama)}</b>${a.aktif ? "" : ' <span class="tag st-failed">nonaktif</span>'}<small>${esc(ROLES[a.role] || a.role)} · ${esc([a.email, a.wa ? "+" + a.wa : ""].filter(Boolean).join(" · "))}${a.wilayah ? " · " + esc(a.wilayah) : ""}</small></span>${ic("ext", 16)}</a>`).join("")}</div>
        <button class="btn ghost sm" style="margin-top:8px" id="add_a">${ic("plus")} Tambah pengguna</button> <button class="btn ghost sm" style="margin-top:8px" onclick="location.hash='#akun'">Akun saya</button></div>
    </div></div>`);
  bindMoney("s_min", "s_emas", "s_beras");
  $("#qr_f").onchange = async () => { const f = $("#qr_f").files[0]; if (!f) return; try { const data = await resizeImage(f, 1000); qrisId = (await api("admin/media", { method: "POST", body: { gambar: data } })).id; $("#qr_p").innerHTML = `<img src="${data}" alt="QRIS">`; toast("QRIS diunggah. Klik Simpan."); } catch (e) { toast(e.message); } };
  $("#qr_x")?.addEventListener("click", () => { qrisId = null; $("#qr_p").innerHTML = `<span>QRIS dihapus. Klik Simpan.</span>`; });
  $("#save").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const body = { cabang: val("s_cabang"), tagline: val("s_tag"), min_donasi: num(val("s_min")), wa_admin: val("s_wa_admin"), wa_ambulans: val("s_wa_amb"), wa_pundi: val("s_wa_pundi"),
        rekening: [0, 1, 2].map((i) => ({ bank: val("r_bank" + i), no: val("r_no" + i), an: val("r_an" + i) })).filter((r) => r.bank && r.no), qris_media_id: qrisId,
        harga_emas: num(val("s_emas")), nisab_gram: num(val("s_nisab")), harga_beras: num(val("s_beras")), beras_per_jiwa: parseFloat(val("s_kg").replace(",", ".")) || 2.5,
        pundi_jadwal: val("s_pj"), pundi_wilayah: val("s_pw"), kantor_alamat: val("s_ktr"), call_center: val("s_cc"), kode_cabang: val("s_kode").toUpperCase(),
        kab_default: val("s_kab"), provinsi_default: val("s_prov"), jemput_tanggal: Math.min(28, Math.max(1, num(val("s_jt")) || 10)), amplop_periode: val("s_ap"), midtrans_production: $("#s_mtp").checked, notif_donatur: $("#s_nd").checked, notif_admin: $("#s_na").checked,
        notif_fundraiser: $("#s_nf").checked, fr_auto_aktif: $("#s_fa").checked, fr_apresiasi: val("s_fap"), upah_afiliator_persen: Math.min(100, Number(val("s_upa").replace(",", ".")) || 0), upah_zisko_persen: Math.min(100, Number(val("s_upz").replace(",", ".")) || 0), tarik_min: num(val("s_tmin")) };
      if ($("#s_mt")) body.midtrans_server_key = val("s_mt"); if ($("#s_fn")) body.fonnte_token = val("s_fn");
      await api("admin/settings", { method: "PUT", body }); PUB = await api("public/config"); toast("Pengaturan disimpan"); VIEWS.pengaturan();
    } catch (x) { toast(x.message); } finally { b.disabled = false; }
  };
  $("#t_go").onclick = async () => { try { await api("admin/test-wa", { method: "POST", body: { wa: val("t_wa") } }); toast("Pesan tes terkirim"); } catch (e) { toast(e.message); } };
  $("#add_a").onclick = () => userForm({});
  $$("[data-ea]").forEach((b) => b.onclick = (e) => { e.preventDefault(); userForm(admins.find((a) => a.id === +b.dataset.ea)); });
};

/* ---------- Dokumentasi penyaluran ---------- */
VIEWS.berita = async () => {
  const rows = await api("admin/articles");
  main(`<div class="ph"><h1>Dokumentasi penyaluran</h1><div class="acts"><button class="btn primary sm" onclick="artForm()">${ic("plus")} Tulis dokumentasi</button></div></div>
    <p class="hint" style="margin-top:-6px">Laporan penyaluran dengan teks, foto, dan video. Tampil di halaman program terkait dan di menu Berita aplikasi donatur. Opsional, isi kapan saja.</p>
    <div class="tw"><table class="t"><thead><tr><th>Judul</th><th>Program</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
    ${rows.map((a) => `<tr class="click" data-id="${a.id}"><td><b>${esc(a.judul)}</b><small>${esc(a.lokasi || "")}</small></td><td>${esc(a.program || "Umum")}</td><td>${a.tanggal ? tglD(a.tanggal + " 00:00:00") : tglD(a.created_at)}</td>
      <td><span class="tag ${a.status === "terbit" ? "st-paid" : "st-pending"}">${a.status === "terbit" ? "Terbit" : "Draf"}</span></td></tr>`).join("")
    || `<tr><td colspan="4" class="hint" style="text-align:center;padding:30px">Belum ada dokumentasi. Foto dan cerita penyaluran membuat donatur yakin dan kembali berdonasi.</td></tr>`}</tbody></table></div>`);
  $$("tr[data-id]").forEach((tr) => tr.onclick = () => artForm(+tr.dataset.id));
  ogSiapkan("berita", rows);
};
const BLK = { p: "Paragraf", h: "Subjudul", img: "Gambar", video: "Video", quote: "Kutipan / testimoni" };
async function artForm(id) {
  const [a, st] = await Promise.all([id ? api("admin/articles/" + id) : Promise.resolve({ status: "draf", blocks: [{ t: "p", text: "" }] }), api("admin/settings").catch(() => ({}))]);
  const blocks = (a.blocks || []).map((b) => (b.t === "img" ? { ...b, src: "/api/media/" + b.media_id } : { ...b }));
  const gal = galeriState(a);
  modal(id ? "Ubah dokumentasi" : "Tulis dokumentasi penyaluran", `<div class="fg">
      ${field("ar_judul", "Judul", a.judul || "", { full: true, ph: "Contoh: Ambulans WIZ antar 12 pasien dhuafa ke RSUD Poso bulan ini" })}
      ${field("ar_camp", "Program terkait", a.campaign_id || "", { sel: [["", "Umum (tanpa program)"], ...CAMPS.map((c) => [c.id, c.judul])] })}
      ${field("ar_tgl", "Tanggal kegiatan", a.tanggal || todayW(), { type: "date" })}
      ${field("ar_lok", "Lokasi", a.lokasi || "", { ph: "Kel. Gebangrejo, Poso Kota" })}
      ${field("ar_ring", "Ringkasan", a.ringkas || "", { full: true, hint: "Opsional. Kosongkan untuk memakai awal paragraf pertama." })}</div>
    <label class="f">Foto slide <small>(tampil bergeser di bagian atas laporan; kosongkan untuk memakai foto pertama di isi tulisan)</small></label><div id="ar_gal"></div>
    <div class="sect">Isi tulisan</div><div id="blks"></div>
    <div class="addbar"><span class="hint">Tambah:</span>
      <button class="btn ghost xs" data-add="p">+ Paragraf</button><button class="btn ghost xs" data-add="h">+ Subjudul</button>
      <label class="btn ghost xs" style="cursor:pointer">+ Gambar<input type="file" id="ar_imgs" accept="image/*" multiple hidden></label>
      <button class="btn ghost xs" data-add="video">+ Video</button><button class="btn ghost xs" data-add="quote">+ Kutipan</button></div>`,
    `${id ? `<button class="btn danger sm" id="ar_del" style="margin-right:auto">Hapus</button>` : ""}${a.status === "terbit" && a.slug ? `<a class="btn ghost sm" href="/#/berita/${esc(a.slug)}" target="_blank" rel="noopener">${ic("ext")} Lihat</a>` : ""}
     <button class="btn ghost sm" id="ar_draf">Simpan draf</button><button class="btn primary sm" id="ar_pub">${ic("check")} Terbitkan</button>`, true);
  bindMoney("ar_ters");
  const draw = () => {
    $("#blks").innerHTML = blocks.map((b, i) => `<div class="blk" data-i="${i}"><div class="bh"><b>${BLK[b.t]}</b>
        <button class="btn ghost xs" data-mv="-1" ${i ? "" : "disabled"} aria-label="Naik">↑</button><button class="btn ghost xs" data-mv="1" ${i < blocks.length - 1 ? "" : "disabled"} aria-label="Turun">↓</button><button class="btn danger xs" data-rm aria-label="Hapus blok">✕</button></div>
      ${b.t === "p" ? `<div class="inp"><textarea rows="4" data-k="text" placeholder="Tulis cerita penyaluran…">${esc(b.text || "")}</textarea></div>` : ""}
      ${b.t === "h" ? `<div class="inp"><input data-k="text" value="${esc(b.text || "")}" placeholder="Subjudul"></div>` : ""}
      ${b.t === "quote" ? `<div class="inp"><textarea rows="2" data-k="text" placeholder="Ucapan penerima manfaat…">${esc(b.text || "")}</textarea></div><div class="inp" style="margin-top:6px"><input data-k="by" value="${esc(b.by || "")}" placeholder="Nama / keterangan, misalnya Ibu Wati, penerima santunan"></div>` : ""}
      ${b.t === "img" ? `<img src="${b.src}" alt="" class="bimg"><div class="inp" style="margin-top:6px"><input data-k="caption" value="${esc(b.caption || "")}" placeholder="Keterangan foto (opsional)"></div>` : ""}
      ${b.t === "video" ? `<div class="inp"><input data-k="url" value="${esc(b.url || "")}" placeholder="Tempel tautan video: YouTube, Facebook, Instagram, TikTok, Google Drive, atau Vimeo"></div>
        ${st.video_upload ? `<label class="btn ghost xs" style="margin-top:6px;cursor:pointer">atau unggah file video (MP4, maks 95 MB)<input type="file" accept="video/mp4,video/webm,video/quicktime" data-vf hidden></label><span class="hint" data-vp></span>` : `<div class="hint">Unggah file video langsung bisa diaktifkan lewat penyimpanan R2 (lihat panduan). Untuk sekarang, unggah ke YouTube lalu tempel tautannya.</div>`}
        ${b.url && b.url.startsWith("/api/file/") ? `<video src="${b.url}" controls preload="metadata" class="bimg"></video>` : ""}
        <div class="inp" style="margin-top:6px"><input data-k="caption" value="${esc(b.caption || "")}" placeholder="Keterangan video (opsional)"></div>` : ""}</div>`).join("")
      || `<p class="hint">Belum ada isi. Tambahkan paragraf, gambar, atau video di bawah.</p>`;
    $$("#blks .blk").forEach((el) => {
      const i = +el.dataset.i;
      $$("[data-k]", el).forEach((inp) => inp.oninput = () => (blocks[i][inp.dataset.k] = inp.value));
      $$("[data-mv]", el).forEach((btn) => btn.onclick = () => { const j = i + +btn.dataset.mv; [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; draw(); });
      $("[data-rm]", el).onclick = () => { blocks.splice(i, 1); draw(); };
      const vf = $("[data-vf]", el);
      if (vf) vf.onchange = () => uploadVideo(vf.files[0], $("[data-vp]", el)).then((url) => { if (url) { blocks[i].url = url; draw(); } });
    });
  };
  draw();
  $$("[data-add]").forEach((b) => b.onclick = () => { blocks.push({ t: b.dataset.add, text: "", url: "", caption: "" }); draw(); $("#blks .blk:last-child textarea, #blks .blk:last-child input")?.focus(); });
  $("#ar_imgs").onchange = async () => {
    for (const f of [...$("#ar_imgs").files]) {
      toast("Mengunggah " + f.name + "…");
      try { const data = await resizeImage(f); const mid = (await api("admin/media", { method: "POST", body: { gambar: data } })).id; blocks.push({ t: "img", media_id: mid, src: data, caption: "" }); draw(); }
      catch (e) { mErr(e.message); }
    }
    $("#ar_imgs").value = "";
  };
  galeriEditor("#ar_gal", gal);
  const save = (status) => async (e) => busy(e.currentTarget, async () => {
    const body = { judul: val("ar_judul"), campaign_id: val("ar_camp"), tanggal: val("ar_tgl"), lokasi: val("ar_lok"), penerima: a.penerima || 0, tersalur: a.tersalur || 0,
      ringkas: val("ar_ring"), cover_id: gal.cover, galeri: gal.ids, status, blocks: blocks.map(({ src, ...b }) => b) };
    if (status === "terbit" && !body.blocks.some((b) => (b.text || b.media_id || b.url))) throw new Error("Isi tulisan masih kosong.");
    await api(id ? "admin/articles/" + id : "admin/articles", { method: id ? "PUT" : "POST", body });
    closeModal(); toast(status === "terbit" ? "Dokumentasi diterbitkan" : "Draf disimpan"); if ((location.hash.slice(1) || "") === "berita") VIEWS.berita(); else location.hash = "#berita";
  });
  $("#ar_draf").onclick = save("draf"); $("#ar_pub").onclick = save("terbit");
  $("#ar_del")?.addEventListener("click", async (e) => { const b = e.currentTarget; if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Klik lagi untuk hapus"; return; }
    await api("admin/articles/" + id, { method: "DELETE" }); closeModal(); toast("Dokumentasi dihapus"); VIEWS.berita(); });
}
function uploadVideo(file, out) {
  return new Promise((ok) => {
    if (!file) return ok(null);
    if (file.size > 95 * 1024 * 1024) { toast("Video lebih dari 95 MB. Kompres dulu atau unggah ke YouTube."); return ok(null); }
    const x = new XMLHttpRequest(); x.open("POST", "/api/admin/video"); x.setRequestHeader("content-type", file.type || "video/mp4");
    x.upload.onprogress = (e) => { if (out && e.lengthComputable) out.textContent = " Mengunggah " + Math.round(e.loaded / e.total * 100) + "%"; };
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} if (x.status < 300) { toast("Video terunggah"); ok(d.url); } else { toast(d.error || "Unggah video gagal"); ok(null); } };
    x.onerror = () => { toast("Unggah video gagal. Periksa koneksi."); ok(null); };
    x.send(file);
  });
}

/* ---------- Penyimpanan Google Drive ---------- */
const gb = (b) => (b / 1073741824).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " GB";
const DS = { aktif: ["Aktif (ditulisi)", "st-paid"], cadangan: ["Cadangan", "st-pending"], penuh: ["Penuh · tetap dibaca", "st-failed"], arsip: ["Arsip · tetap dibaca", "i"] };
function usage(d) {
  const pct = d.pct || 0, col = pct >= 90 ? "var(--danger)" : pct >= 75 ? "var(--orange)" : "var(--green)";
  return `<div class="bar" style="margin:6px 0 4px"><i style="width:${Math.min(100, pct)}%;background:${col}"></i></div><small>${pct}% · ${gb(d.used || 0)} dari ${gb(d.limit || 0)}</small>`;
}
VIEWS.penyimpanan = async () => {
  const s = await api("admin/drive");
  const aktif = s.drives.find((d) => d.status === "aktif");
  const secretSaran = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join("");
  main(`<div class="ph"><h1>Penyimpanan Google Drive</h1><div class="acts">
      <button class="btn ghost sm" id="dv_bk" ${aktif ? "" : "disabled"}>${ic("download")} Cadangkan sekarang</button>
      <button class="btn primary sm" id="dv_sync" ${aktif ? "" : "disabled"}>${ic("check")} Sinkronkan sekarang</button></div></div>
    ${s.alert === "penuh" ? `<div class="alert">${ic("alert")}<span><b>Google Drive sudah mencapai ${s.batas}%.</b> Data tetap aman di server, tetapi salinan ke Drive berhenti. Hubungkan Google Drive baru di bawah.</span></div>` : ""}
    ${!s.drives.length ? `<div class="alert ok">${ic("bell")}<span><b>Belum ada Google Drive terhubung.</b> Hubungkan agar semua data dan file penting tersalin otomatis ke Drive cabang.</span></div>` : ""}
    ${s.last_error ? `<div class="alert">${ic("alert")}<span>Sinkron terakhir gagal (${tgl(s.last_error.at.replace("T", " ").slice(0, 19))}): ${esc(s.last_error.pesan)}</span></div>` : ""}
    ${aktif && !s.drives.some((d) => d.status === "cadangan") ? `<div class="alert ok">${ic("bell")}<span>Saran: siapkan <b>satu Drive cadangan</b>. Saat Drive aktif mencapai ${s.batas}%, aplikasi pindah otomatis tanpa jeda.</span></div>` : ""}
    <div class="kpis">
      <div class="kpi ${aktif ? "hl" : ""}"><small>Drive aktif</small><b style="font-size:16px;word-break:break-all">${aktif ? esc(aktif.email) : "Belum ada"}</b>${aktif ? usage(aktif).replace("<small>", "<span>").replace("</small>", "</span>") : "<span>Tambahkan di bawah</span>"}</div>
      <div class="kpi"><small>Antrean salin</small><b>${s.antrean + s.media_antre}</b><span>${s.antrean} data · ${s.media_antre} file</span></div>
      <div class="kpi"><small>Sinkron terakhir</small><b style="font-size:16px">${s.last_sync ? tgl(s.last_sync.at.replace("T", " ").slice(0, 19)) : "-"}</b><span>Otomatis tiap 15 menit</span></div>
      <div class="kpi"><small>Cadangan lengkap</small><b style="font-size:16px">${s.last_backup ? tgl(s.last_backup.at.replace("T", " ").slice(0, 19)) : "-"}</b><span>${s.last_backup ? `<a href="${esc(s.last_backup.url)}" target="_blank" rel="noopener">Buka file</a> · harian, 30 terakhir` : "Harian, 30 terakhir"}</span></div>
    </div>
    <div class="g2"><div>
      <div class="panel"><h2>Drive terhubung</h2>${s.drives.length ? `<div class="list">${s.drives.map((d) => `<div class="it" style="align-items:flex-start"><span class="tx"><b style="word-break:break-all">${esc(d.email)}</b> <span class="tag ${DS[d.status][1]}">${DS[d.status][0]}</span>${usage(d)}
          <small>Terhubung ${tglD(d.added_at.replace("T", " ").slice(0, 19))}${d.root ? ` · <a href="${esc(d.root)}" target="_blank" rel="noopener">Buka folder</a>` : ""}</small></span>
          <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${(d.status === "cadangan" || d.status === "arsip") && d.pct < s.batas ? `<button class="btn ghost xs" data-act="${d.id}">Jadikan aktif</button>` : ""}${d.status !== "aktif" && !(d.status === "arsip" && (d.files || d.backups)) ? `<button class="btn danger xs" data-rm="${d.id}">${d.files || d.backups ? "Arsipkan" : "Lepas"}</button>` : ""}</span></div>`).join("")}</div>`
        : `<p class="hint">Belum ada. Ikuti panduan di samping, lalu tempel link Web app di bawah.</p>`}
        <div class="sect">Hubungkan Google Drive</div>
        ${field("dv_url", "Link Web app Apps Script", "", { ph: "https://script.google.com/macros/s/…/exec" })}
        ${field("dv_sec", "Kode rahasia", "", { type: "password", hint: "Sama persis dengan KODE_RAHASIA di Apps Script." })}
        <div class="err" id="m_err" hidden></div>
        <button class="btn primary sm" style="margin-top:12px" id="dv_add">${ic("plus")} Tes & hubungkan</button>
      </div>
      <div class="panel" style="margin-top:16px"><h2>Isi Drive yang dibuat otomatis</h2>
        <div class="list">
          <div class="it"><span class="tx"><b>01 Database</b><small>"Transaksi 2026", "Transaksi 2027", … (file baru otomatis tiap tahun) dan "Data Induk" (donatur, pundi, kotak, fundraiser)</small></span></div>
          <div class="it"><span class="tx"><b>02 Bukti Transfer</b><small>Foto bukti dari donatur, dipisah per tahun</small></span></div>
          <div class="it"><span class="tx"><b>03 Slip Setoran</b><small>Slip setoran lapangan (PNG), per tahun</small></span></div>
          <div class="it"><span class="tx"><b>04 Dokumentasi</b><small>Foto program dan laporan penyaluran, per tahun</small></span></div>
          <div class="it"><span class="tx"><b>05 Cadangan</b><small>Cadangan lengkap harian (dikompres), 30 terakhir per Drive; salinan kedua di Drive cadangan</small></span></div>
          <div class="it"><span class="tx"><b>06 Surat Persetujuan · 07 Foto Lokasi</b><small>Surat persetujuan pundi dan foto rumah/titik, per tahun</small></span></div>
        </div></div>
    </div><div>
      <div class="panel"><h2>Panduan: hubungkan Google Drive (10 menit)</h2>
        <ol class="ol" style="color:var(--ink)">
          <li>Buat akun Gmail khusus cabang, misalnya <b>wizposo.data1@gmail.com</b>. Aktifkan verifikasi 2 langkah.</li>
          <li>Masuk ke akun itu, buka <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> → <b>New project</b>.</li>
          <li>Hapus isi editor, lalu tempel kode konektor. <button class="btn ghost xs" id="dv_code">${ic("copy")} Salin kode konektor</button></li>
          <li>Ganti <span class="mono">GANTI-DENGAN-KODE-RAHASIA-ANDA</span> dengan kode rahasia, misalnya: <span class="mono" style="user-select:all">${secretSaran}</span> <button class="btn ghost xs" onclick="copy('${secretSaran}','Kode rahasia')">Salin</button></li>
          <li>Klik <b>Save</b>, pilih fungsi <b>izinkanAkses</b>, klik <b>Run</b>, lalu izinkan akses (Advanced → Go to project).</li>
          <li><b>Deploy → New deployment</b> → jenis <b>Web app</b> → Execute as: <b>Me</b> → Who has access: <b>Anyone</b> → <b>Deploy</b>.</li>
          <li>Salin <b>Web app URL</b>, tempel bersama kode rahasia di formulir "Hubungkan Google Drive", lalu klik <b>Tes & hubungkan</b>.</li>
        </ol>
        <div class="info">${ic("bell")}<span>Akun Google gratis berkapasitas 15 GB (dipakai bersama Gmail & Google Foto). Aplikasi hanya memakai sampai <b>${s.batas}%</b>. Saat batas tercapai, aplikasi pindah ke Drive cadangan atau mengirim WhatsApp ke admin untuk menambah link baru. Drive lama tetap menyimpan arsipnya dan <b>isinya tetap bisa dibuka dari aplikasi</b>, jadi semakin banyak Drive semakin besar gudangnya.</span></div>
      </div></div></div>`);
  $("#dv_code").onclick = async () => { try { const t = await (await fetch("/assets/wiz-drive-connector.gs.txt")).text(); copy(t, "Kode konektor"); } catch { toast("Gagal memuat kode"); } };
  $("#dv_add").onclick = (e) => busy(e.currentTarget, async () => {
    const d = await api("admin/drive", { method: "POST", body: { url: val("dv_url"), secret: val("dv_sec") } });
    toast(d.diperbarui ? `Kode rahasia ${d.email} diperbarui. Konektor versi ${d.versi}.` : d.status === "aktif" ? `Terhubung ke ${d.email}. Penyalinan data dimulai.` : `Terhubung sebagai Drive ${d.status}.`); VIEWS.penyimpanan();
  });
  const run = async (btn, backup) => { btn.disabled = true; const t = btn.innerHTML; btn.textContent = "Memproses…";
    try { const r = await api("admin/drive/sync", { method: "POST", body: { backup } }); toast(`Tersalin: ${r.donasi || 0} transaksi, ${r.induk || 0} data induk, ${r.file || 0} file${r.backup ? ", cadangan dibuat" : ""}`); VIEWS.penyimpanan(); }
    catch (x) { toast(x.message); btn.disabled = false; btn.innerHTML = t; } };
  $("#dv_sync").onclick = (e) => run(e.currentTarget, false);
  $("#dv_bk").onclick = (e) => run(e.currentTarget, true);
  $$("[data-act]").forEach((b) => b.onclick = async () => { await api(`admin/drive/${b.dataset.act}/aktif`, { method: "POST" }); toast("Drive diaktifkan"); VIEWS.penyimpanan(); });
  $$("[data-rm]").forEach((b) => b.onclick = async () => { if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Yakin?"; return; } const r = await api("admin/drive/" + b.dataset.rm, { method: "DELETE" }); toast(r.info); VIEWS.penyimpanan(); });
};

boot();

/* ---------- Pengguna & peran ---------- */
const ROLE_INFO = {
  admin: "Akses penuh, termasuk pengaturan dan pengguna.",
  ketua: "Memantau semua: ringkasan, donasi, peta sebaran, uang di petugas, Drive. Tidak mengubah data keuangan.",
  sekretaris: "Program, dokumentasi, database donatur, pendaftaran titik, slip.",
  bendahara: "Keuangan: tandai lunas, terima setoran uang dari petugas, batalkan slip, Drive.",
  zisko: "Penghimpun lapangan: daftarkan pundi/kotak + lokasi, tugas jemput, peta, input slip ke WA donatur.",
  amplop: "Relawan Amplop Ramadhan: bagikan amplop, catat penerima & lokasi, setor amplop kembali dengan slip.",
};
function userForm(a) {
  const lap = (r) => ["zisko", "amplop"].includes(r);
  modal(a.id ? "Ubah pengguna" : "Tambah pengguna", `<div class="fg">${field("na_nama", "Nama", a.nama || "")}${field("na_role", "Peran", a.role || "zisko", { sel: Object.entries(ROLES) })}
      <div class="full hint" id="na_info" style="margin-top:6px"></div>
      ${field("na_wa", "Nomor WhatsApp", a.wa ? String(a.wa).replace(/^62/, "") : "", { pre: "+62", num: true, hint: "Bisa dipakai untuk masuk. Juga menerima bukti setoran diterima." })}${field("na_email", "Email (opsional untuk petugas)", a.email || "", { type: "email" })}
      ${field("na_wil", "Wilayah tugas (opsional)", a.wilayah || "", { ph: "Contoh: Poso Kota, Lage" })}
      ${field("na_pass", a.id ? "Kata sandi baru (kosongkan bila tetap)" : "Kata sandi awal", "", { type: "password", hint: "Pengurus minimal 8 karakter, petugas lapangan minimal 6." })}
      ${field("na_upah", "Persen upah khusus (%) — opsional", a.upah_persen ?? "", { hint: "Untuk ZISKO dan relawan Amplop. Kosongkan untuk memakai persen umum dari Pengaturan." })}
      ${a.id && a.id !== ME.id ? `<div class="full"><label class="chk"><input type="checkbox" id="na_akt" ${a.aktif ? "checked" : ""}> Akun aktif (bisa masuk)</label></div>` : ""}</div>`,
    `${a.id && a.id !== ME.id ? `<button class="btn danger sm" id="na_del" style="margin-right:auto">Hapus</button>` : ""}<button class="btn primary sm" id="na_s">${a.id ? "Simpan" : "Tambah"}</button>`);
  const info = () => { $("#na_info").textContent = ROLE_INFO[val("na_role")] || ""; }; $("#na_role").onchange = info; info();
  $("#na_s").onclick = (e) => busy(e.target, async () => {
    const body = { nama: val("na_nama"), role: val("na_role"), wa: val("na_wa"), email: val("na_email"), wilayah: val("na_wil"), password: $("#na_pass").value, aktif: $("#na_akt") ? $("#na_akt").checked : true, upah_persen: val("na_upah") === "" ? null : Number(val("na_upah").replace(",", ".")) };
    if (!a.id && lap(body.role) && !body.wa) throw new Error("Petugas lapangan wajib punya nomor WhatsApp untuk masuk.");
    await api(a.id ? "admin/admins/" + a.id : "admin/admins", { method: a.id ? "PUT" : "POST", body }); closeModal(); toast("Pengguna disimpan");
    if (!a.id && body.wa) setTimeout(() => modal("Kirim info masuk", `<p>Bagikan cara masuk ke ${esc(body.nama)}:</p><div class="copyrow"><span class="mono">${esc(location.origin)}/admin</span></div>`,
      `<a class="btn green sm" target="_blank" rel="noopener" href="${waLink("62" + body.wa.replace(/\D/g, "").replace(/^(62|0)/, ""), `Assalamu'alaikum ${body.nama},\n\nAkun ${ROLES[body.role]} WIZ Cabang ${PUB.cabang} sudah aktif.\nBuka: ${location.origin}/admin\nMasuk dengan nomor WhatsApp ini dan kata sandi yang diberikan admin. Simpan halaman ke layar utama HP agar mudah dibuka.`)}">${ic("wa")} Kirim via WhatsApp</a>`), 200);
    VIEWS.pengaturan();
  });
  $("#na_del")?.addEventListener("click", async (e) => { const b = e.currentTarget; if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Klik lagi untuk hapus"; return; }
    const r = await api("admin/admins/" + a.id, { method: "DELETE" }); closeModal(); toast(r.info); VIEWS.pengaturan(); });
}
function jemputKpi(d) {
  const j = d.jemput || {}, aktif = Object.entries(j).filter(([k]) => k !== "nonaktif").reduce((a, [, v]) => a + v, 0);
  if (!aktif && !d.kas?.total) return "";
  return `<a class="kpi ${j.terlambat ? "warn" : ""}" href="#peta"><small>Jemput bulan ini</small><b>${j.dijemput || 0}/${aktif}</b><span>${j.terlambat || 0} terlambat · ${j.segera || 0} segera · lihat peta</span></a>
    <a class="kpi ${d.kas?.total ? "warn" : ""}" href="#slip?tab=setoran"><small>Uang masih di petugas</small><b>${rpk(d.kas?.total || 0)}</b><span>${d.kas?.slip || 0} slip · ${d.kas?.petugas || 0} petugas</span></a>`;
}
