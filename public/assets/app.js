/* ============================================================
   WIZ Cabang — aplikasi donatur & portal fundraiser
   ============================================================ */
"use strict";

/* ---------- Ikon ---------- */
const ICONS = {
  download:'<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  home:'<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>',
  grid:'<path d="M4 4h6v6h-6z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6h-6z"/><path d="M14 14h6v6h-6z"/>',
  calc:'<path d="M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M8 8a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z"/><path d="M8 14v.01"/><path d="M12 14v.01"/><path d="M16 14v.01"/><path d="M8 17v.01"/><path d="M12 17v.01"/><path d="M16 17v.01"/>',
  heart:'<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
  clock:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7v5l3 3"/>',
  wa:'<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>',
  user:'<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  scale:'<path d="M7 20l10 0"/><path d="M6 6l6 -1l6 1"/><path d="M12 3l0 17"/><path d="M9 12l-3 -6l-3 6a3 3 0 0 0 6 0"/><path d="M21 12l-3 -6l-3 6a3 3 0 0 0 6 0"/>',
  heartbeat:'<path d="M19.5 13.572l-7.5 7.428l-2.896 -2.868m-6.117 -8.104a5 5 0 0 1 9.013 -3.022a5 5 0 1 1 7.5 6.572"/><path d="M3 13h2l2 3l2 -6l1 3h3"/>',
  school:'<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6"/><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"/>',
  store:'<path d="M3 21l18 0"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"/><path d="M5 21l0 -10.15"/><path d="M19 21l0 -10.15"/><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"/>',
  moon:'<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
  hands:'<path d="M11 14l2 2a1 1 0 0 0 3 -3l-3 -3a1 1 0 0 0 -3 0"/><path d="M8 11l3 3"/><path d="M3 12l3.5 -3.5a2.12 2.12 0 0 1 3 0"/><path d="M21 12l-3.5 3.5"/><path d="M14 7l2 2"/><path d="M10 4l-3.5 3.5"/><path d="M13.5 4.5l3 -3"/><path d="M7 21l3 -3"/>',
  calendar:'<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/>',
  bowl:'<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1z"/><path d="M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/>',
  mosque:'<path d="M12 3c-3 2 -5 4 -5 7h10c0 -3 -2 -5 -5 -7z"/><path d="M5 21v-11"/><path d="M19 21v-11"/><path d="M3 21h18"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  ambulance:'<path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5"/><path d="M6 10h4m-2 -2v4"/>',
  coins:'<path d="M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3z"/><path d="M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4"/><path d="M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598z"/><path d="M3 6v10c0 .888 .772 1.45 2 2"/><path d="M3 11c0 .888 .772 1.45 2 2"/>',
  truck:'<path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5"/>',
  chev:'<path d="M9 6l6 6l-6 6"/>', back:'<path d="M15 6l-6 6l6 6"/>', x:'<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>', check:'<path d="M5 12l5 5l10 -10"/>',
  copy:'<path d="M8 10a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/>',
  shield:'<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/><path d="M9 12l2 2l4 -4"/>',
  file:'<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 17h6"/><path d="M9 13h6"/>',
  share:'<path d="M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.7 10.7l6.6 -3.4"/><path d="M8.7 13.3l6.6 3.4"/>',
  repeat:'<path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3"/><path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3"/>',
  box:'<path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"/><path d="M12 12l8 -4.5"/><path d="M12 12l0 9"/><path d="M12 12l-8 -4.5"/>',
  info:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
  wallet:'<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"/><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"/>',
  bolt:'<path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/>',
  bank:'<path d="M3 21l18 0"/><path d="M3 10l18 0"/><path d="M5 6l7 -3l7 3"/><path d="M4 10l0 11"/><path d="M20 10l0 11"/><path d="M8 14l0 3"/><path d="M12 14l0 3"/><path d="M16 14l0 3"/>',
  qr:'<path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M14 14h3"/><path d="M14 14v3"/><path d="M14 20h3"/><path d="M17 17h3"/><path d="M20 17v3"/>',
  trophy:'<path d="M8 21l8 0"/><path d="M12 17l0 4"/><path d="M7 4l10 0"/><path d="M17 4v8a5 5 0 0 1 -10 0v-8"/><path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  link:'<path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>',
  upload:'<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 9l5 -5l5 5"/><path d="M12 4l0 12"/>',
  news:'<path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/>',
  play:'<path d="M7 4v16l13 -8z"/>',
  logout:'<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/>',
};
const ic = (n, s = 22) => `<svg class="ic" viewBox="0 0 24 24" style="width:${s}px;height:${s}px" aria-hidden="true">${ICONS[n] || ICONS.heart}</svg>`;
const KAT = { Zakat: ["#046B5C", "#E6F2EF"], Infak: ["#B9640A", "#FEF2E3"], Sedekah: ["#B9640A", "#FEF2E3"], Kesehatan: ["#B83227", "#FCEBE9"], Pendidikan: ["#2563A8", "#E7F0FA"],
  Ekonomi: ["#7A5A12", "#F7F0DE"], Dakwah: ["#046B5C", "#E6F2EF"], Kemanusiaan: ["#9A4A0A", "#FCEFE3"], Fidyah: ["#5B4BA8", "#EEEBFA"], Pembangunan: ["#2F6B3A", "#E6F2E8"] };
const kc = (c) => KAT[c?.kategori] || ["#046B5C", "#E6F2EF"];

/* ---------- Util ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rp = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const rpk = (n) => n >= 1e9 ? "Rp" + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M" : n >= 1e6 ? "Rp" + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt" : rp(n);
const num = (v) => { const n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cleanWA = (v) => String(v || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, "");
const fmtWA = (no) => (no ? "+" + String(no).replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, "$1 $2-$3-$4") : "belum diatur");
const waLink = (no, text) => `https://wa.me/${no || ""}?text=${encodeURIComponent(text)}`;
const tgl = (s, opt = { day: "numeric", month: "short", year: "numeric" }) => { if (!s) return ""; const d = new Date(String(s).replace(" ", "T") + (String(s).includes("Z") ? "" : "Z")); return opt.timeStyle ? d.toLocaleString("id-ID", opt) : d.toLocaleDateString("id-ID", opt); };
const ago = (s) => {
  const d = (Date.now() - new Date(String(s).replace(" ", "T") + "Z")) / 1000;
  if (d < 60) return "baru saja"; if (d < 3600) return Math.floor(d / 60) + " menit lalu"; if (d < 86400) return Math.floor(d / 3600) + " jam lalu";
  return Math.floor(d / 86400) + " hari lalu";
};
const store = {
  get(k, d) { try { const v = localStorage.getItem("wizc_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("wizc_" + k, JSON.stringify(v)); } catch {} },
};
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
function copy(text, label) {
  const done = () => toast(label + " disalin");
  const fb = () => { const a = document.createElement("textarea"); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch { toast("Tekan lama untuk menyalin"); } a.remove(); };
  try { navigator.clipboard.writeText(text).then(done, fb); } catch { fb(); }
}
function fmtInput(el) { el.addEventListener("input", () => { const n = num(el.value); el.value = n ? n.toLocaleString("id-ID") : ""; }); }
async function api(path, opt = {}) {
  const r = await fetch("/api/" + path, { method: opt.method || "GET", headers: opt.body ? { "content-type": "application/json" } : {}, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: "same-origin" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || "Gagal terhubung ke server."), { status: r.status });
  return data;
}
function story(t) { return esc(t || "").split(/\n{2,}/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>`).join(""); }
async function resizeImage(file, max = 1200) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let q = 0.82, out = c.toDataURL("image/webp", q); while (out.length > 850000 && q > 0.4) { q -= 0.12; out = c.toDataURL("image/webp", q); }
  if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/jpeg", 0.8);
  return out;
}

/* ---------- State ---------- */
let CFG = { cabang: "", rekening: [] }, CAMPS = [];
const profile = store.get("profil", { sapaan: "Bapak", nama: "", wa: "" });
const pundiSaya = store.get("pundi", { kode: "", status: "" });
const params = new URLSearchParams(location.search);
if (params.get("ref")) store.set("ref", { kode: params.get("ref").toUpperCase(), exp: Date.now() + 30 * 864e5 });
const refNow = () => { const r = store.get("ref", null); return r && r.exp > Date.now() ? r.kode : ""; };
let kotakNow = store.get("kotak", null); if (kotakNow && kotakNow.exp < Date.now()) kotakNow = null;
let refInfo = null, liveTimer = null, payTimer = null;
const origin = location.origin;

/* ---------- Header & nav ---------- */
function header(title, backTo) {
  $("#top").innerHTML = !title
    ? `<span class="logo"><img src="/assets/logo.png" alt="WIZ Wahdah Inspirasi Zakat"></span><div class="cab">Cabang<b>${esc(CFG.cabang)}</b></div>
       <button class="more" id="moreBtn" aria-label="Menu lainnya" aria-haspopup="true" onclick="moreMenu(event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>`
    : `<button class="back" aria-label="Kembali" onclick="${backTo ? `location.hash='${backTo}'` : "history.length>1?history.back():location.hash='#/'"}">${ic("back", 20)}</button><div class="title">${esc(title)}</div>`;
}
function nav(active) {
  const items = [["#/", "Beranda", "home"], ["#/program", "Program", "grid"], ["donasi", "Donasi", "heart"], ["#/riwayat", "Riwayat", "clock"], ["#/akun", "Akun", "user"]];
  $("#nav").innerHTML = items.map(([h, l, i]) => h === "donasi"
    ? `<button class="mid" onclick="openDonate('infak-terbaik')" aria-label="Donasi sekarang"><span class="c">${ic(i, 24)}</span><span>${l}</span></button>`
    : `<button class="${active === h ? "on" : ""}" onclick="location.hash='${h}'">${ic(i, 22)}<span>${l}</span></button>`).join("");
}
const view = (html) => { $("#view").innerHTML = html; };
// Menu titik tiga: pintu masuk pengurus & relawan yang sengaja disamarkan dari donatur
function moreMenu(e) {
  e.stopPropagation();
  const old = $(".popmenu"); if (old) { old.remove(); return; }
  const m = document.createElement("div"); m.className = "popmenu"; m.setAttribute("role", "menu");
  m.innerHTML = `<a role="menuitem" href="/admin">${ic("user", 18)}<span><b>Masuk pengurus & petugas</b><small>Ketua, sekretaris, bendahara, admin, ZISKO, relawan amplop</small></span></a>
    <a role="menuitem" href="#/mitra">${ic("trophy", 18)}<span><b>Portal relawan afiliator</b><small>Tautan ajakan & papan peringkat</small></span></a>
    <button role="menuitem" type="button" id="mm_share">${ic("share", 18)}<span><b>Bagikan aplikasi</b><small>Ajak keluarga berzakat & bersedekah</small></span></button>`;
  document.body.appendChild(m);
  $("#mm_share").onclick = () => { m.remove(); const t = `Tunaikan zakat, infak & sedekah untuk warga ${CFG.cabang} bersama WIZ:\n${origin}`; if (navigator.share) navigator.share({ text: t }).catch(() => {}); else copy(origin, "Tautan"); };
  setTimeout(() => addEventListener("click", function off(ev) { if (!m.contains(ev.target)) { m.remove(); removeEventListener("click", off); } }), 0);
}

/* ---------- Router ---------- */
const ROUTES = [];
const route = (re, fn) => ROUTES.push([re, fn]);
async function router() {
  clearInterval(liveTimer); clearInterval(payTimer); $(".cta")?.remove(); $(".popmenu")?.remove(); $("#nav").hidden = false;
  let h = location.hash || "#/";
  const legacy = h.match(/^#(kotak|pundi)-(.+)$/i); if (legacy) { location.replace(`#/${legacy[1].toLowerCase()}/${legacy[2]}`); return; }
  for (const [re, fn] of ROUTES) {
    const m = h.match(re);
    if (m) { try { await fn(...m.slice(1)); } catch (e) { view(`<div class="err-page">${ic("info", 40)}<p>${esc(e.message)}</p><button class="btn ghost" onclick="router()">Coba lagi</button></div>`); } window.scrollTo(0, 0); $("#view").focus({ preventScroll: true }); return; }
  }
  location.replace("#/");
}
addEventListener("hashchange", router);

/* ---------- Komponen ---------- */
function campCard(c, full = false) {
  const [fg, bg] = kc(c); const pct = c.target ? Math.min(100, Math.round(c.terkumpul / c.target * 100)) : 0;
  return `<a class="cc ${full ? "full" : ""}" href="#/c/${esc(c.slug)}">
    <span class="cv ${c.cover ? "" : "noimg"}" style="background:${bg};color:${fg}">${c.cover ? `<img src="${c.cover}" alt="" loading="lazy">` : ic(c.ikon, 48)}
      <span class="tag ${c.jenis_dana === "zakat" ? "z" : "i"}">${esc((c.jenis_dana || "").toUpperCase())}</span></span>
    <span class="bd"><h3>${esc(c.judul)}</h3><p>${esc(c.ringkas || "")}</p>
      ${c.target ? `<span class="bar" style="display:block;margin:6px 0 2px"><i style="width:${pct}%"></i></span>` : ""}
      <span class="meta"><span>Terkumpul <b>${rpk(c.terkumpul)}</b></span><span>${c.sisa_hari != null ? c.sisa_hari + " hari lagi" : c.donatur + " donasi"}</span></span></span></a>`;
}
function tickerRows(list) {
  return list.length ? list.map((r) => `<div class="row"><span class="av">${esc((r.nama || "H")[0])}</span><span class="tx"><b>${esc(r.nama)}</b> · ${ago(r.waktu)}<span>${esc(r.program || "")}</span></span><span class="am">${rp(r.total)}</span></div>`).join("")
    : `<div class="row"><span class="tx">Jadilah donatur pertama hari ini.</span></div>`;
}
function drawJar(cv, fill) {
  if (!cv) return; const x = cv.getContext("2d"), W = cv.width, s = W / 124;
  x.clearRect(0, 0, W, cv.height); x.save(); x.scale(s, s);
  const body = () => { x.beginPath(); x.moveTo(22, 40); x.quadraticCurveTo(10, 44, 10, 62); x.lineTo(10, 122); x.quadraticCurveTo(10, 138, 26, 138); x.lineTo(98, 138); x.quadraticCurveTo(114, 138, 114, 122); x.lineTo(114, 62); x.quadraticCurveTo(114, 44, 102, 40); x.closePath(); };
  body(); x.fillStyle = "rgba(4,107,92,.10)"; x.fill(); x.save(); body(); x.clip();
  const top = 138 - 94 * fill; x.fillStyle = "#F7941D"; x.fillRect(0, top, 124, 140);
  x.fillStyle = "#FBB357"; for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(18 + i * 15, top + 2, 9, 4, 0, 0, Math.PI * 2); x.fill(); }
  x.restore(); body(); x.lineWidth = 4; x.strokeStyle = "#046B5C"; x.stroke();
  x.fillStyle = "#046B5C"; x.beginPath(); x.roundRect(30, 18, 64, 22, 6); x.fill(); x.fillStyle = "#FFFFFF"; x.fillRect(48, 26, 28, 5);
  x.beginPath(); x.roundRect(40, 78, 44, 30, 6); x.fill(); x.fillStyle = "#046B5C"; x.font = "800 15px Plus Jakarta Sans, sans-serif"; x.textAlign = "center"; x.fillText("WIZ", 62, 99);
  x.restore();
}
function shareText(c) { const r = refNow(); return `${c.judul}\n${c.ringkas || ""}\n\nMari ikut berbagi lewat WIZ Cabang ${CFG.cabang}:\n${origin}/${r ? "?ref=" + r : ""}#/c/${c.slug}`; }

/* ---------- Beranda ---------- */
route(/^#\/?$/, async () => {
  header(); nav("#/");
  const camps = CAMPS.length ? CAMPS : (CAMPS = await api("public/campaigns"));
  const feat = camps.filter((c) => c.unggulan).slice(0, 6);
  const arts = await api("public/articles?limit=6").catch(() => []);
  const nama = profile.nama ? `${esc(profile.sapaan)} ${esc(profile.nama)}` : "Sahabat Inspirasi";
  view(`
    ${refInfo ? `<div class="ref">${ic("user", 20)}<span>Anda diajak berbagi oleh <b>${esc(refInfo.nama)}</b>. Donasi Anda tercatat sebagai kebaikan bersama.</span></div>` : ""}
    ${kotakNow ? `<div class="scan"><span class="b">${ic("box")}</span><div><strong>Kotak Amal Digital · ${esc(kotakNow.kode)}</strong>${esc(kotakNow.nama)}. Sedekah dari sini tercatat untuk titik ini.</div></div>` : ""}
    <section class="hero">
      <small>Assalamu'alaikum, ${nama}</small>
      <h1>Tunaikan zakat & infak cukup dalam 1 menit</h1>
      <p>${esc(CFG.tagline || "")}. Kuitansi otomatis dikirim ke WhatsApp Anda.</p>
      <div class="row"><button class="btn primary" onclick="openDonate('infak-terbaik')">${ic("heart", 20)} Infak sekarang</button><a class="btn light" href="#/zakat">${ic("calc", 20)} Hitung zakat</a></div>
    </section>
    <div class="quick">
      <button onclick="location.hash='#/zakat'"><span class="q">${ic("scale", 26)}</span>Bayar zakat</button>
      <button onclick="location.hash='#/pundi'"><span class="q o">${ic("coins", 26)}</span>Pundi sedekah</button>
      <button onclick="openDonate('sedekah-jumat')"><span class="q">${ic("calendar", 26)}</span>Sedekah Jumat</button>
      <button onclick="location.hash='#/ambulans'"><span class="q r">${ic("ambulance", 26)}</span>Ambulans gratis</button>
    </div>
    <div class="sec"><h2>Program pilihan</h2><a href="#/program">Lihat semua</a></div>
    <div class="hscroll">${feat.map((c) => campCard(c)).join("")}</div>
    <div class="sec"><h2>Donasi terbaru</h2><span class="live">Langsung</span></div>
    <div class="ticker" id="ticker"><div class="skel" style="height:120px;margin:8px 0"></div></div>
    ${arts.length ? `<div class="sec"><h2>Laporan penyaluran</h2><a href="#/berita">Lihat semua</a></div><div class="hscroll">${arts.map((a) => artCard(a)).join("")}</div>` : ""}
    <div class="sec"><h2>Pundi di rumah, pahala setiap hari</h2></div>
    <button class="pundi-hero" onclick="location.hash='#/pundi'">
      <span class="jar"><canvas id="jarHome" width="124" height="144" aria-hidden="true"></canvas></span>
      <span><h3>Pundi Sedekah</h3><p>${pundiSaya.kode ? `Pundi Anda: <b style="color:var(--ink)">${esc(pundiSaya.kode)}</b>. Setor isinya atau minta dijemput.` : "Rp5.000 sehari jadi Rp150.000 sebulan. Petugas antar pundi ke rumah dan menjemputnya setiap bulan."}</p>
      <span class="lnk">${pundiSaya.kode ? "Kelola pundi saya" : "Daftar pundi gratis"} ${ic("chev", 16)}</span></span></button>
    <div class="sec"><h2>Ajak lebih banyak orang</h2></div>
    <a class="joinfr" href="#/mitra"><span class="ib">${ic("trophy", 22)}</span><span><h3>Jadi fundraiser WIZ ${esc(CFG.cabang)}</h3><p>Dapatkan tautan ajakan pribadi, pantau hasilnya, dan raih pahala dari setiap kebaikan yang Anda ajak.</p></span></a>
    <div class="sec"><h2>Mengapa titip di WIZ?</h2></div>
    <div class="trust">
      <div class="t">${ic("heart")}<b>Untuk ${esc(CFG.cabang)}</b>Seluruh donasi di aplikasi ini disalurkan di wilayah ${esc(CFG.cabang)}</div>
      <div class="t">${ic("shield")}<b>LAZNAS resmi</b>SK Kemenag RI No. 1209/2024</div>
      <div class="t">${ic("scale")}<b>Dana terpisah</b>Zakat, infak, dan fidyah dicatat terpisah</div>
      <div class="t">${ic("bolt")}<b>Kuitansi otomatis</b>Bukti dan kabar penyaluran dikirim ke WhatsApp</div>
    </div>
    <footer class="foot">Wahdah Inspirasi Zakat (WIZ) Cabang ${esc(CFG.cabang)}<br>Dana yang didonasikan bukan bersumber dan bukan untuk tujuan pencucian uang, terorisme, maupun tindak kejahatan lainnya.</footer>`);
  drawJar($("#jarHome"), 0.62);
  const tick = async () => { try { const l = await api("public/live"); const t = $("#ticker"); if (t) t.innerHTML = tickerRows(l.recent.slice(0, 5)); } catch {} };
  tick(); liveTimer = setInterval(tick, 20000);
});

/* ---------- Daftar program ---------- */
route(/^#\/program(?:\/(.+))?$/, async (kat) => {
  header("Semua program"); nav("#/program");
  CAMPS = await api("public/campaigns");
  const cats = ["Semua", ...new Set(CAMPS.map((c) => c.kategori).filter(Boolean))];
  const cur = kat ? decodeURIComponent(kat) : "Semua";
  view(`<div class="filters">${cats.map((c) => `<button class="${c === cur ? "on" : ""}" onclick="location.replace('#/program/${encodeURIComponent(c)}')">${esc(c)}</button>`).join("")}</div>
    ${CAMPS.filter((c) => cur === "Semua" || c.kategori === cur).map((c) => campCard(c, true)).join("") || `<div class="empty">Belum ada program di kategori ini.</div>`}`);
});

/* ---------- Detail program ---------- */
route(/^#\/c\/([\w-]+)$/, async (slug) => {
  const [c, arts] = await Promise.all([api("public/campaigns/" + slug), api("public/articles?limit=10&campaign=" + encodeURIComponent(slug)).catch(() => [])]); const [fg, bg] = kc(c);
  header(c.judul); nav("");
  const pct = c.target ? Math.min(100, Math.round(c.terkumpul / c.target * 100)) : 0;
  view(`<div class="dhero" style="background:${bg};color:${fg}">${c.cover ? `<img src="${c.cover}" alt="">` : ic(c.ikon, 72)}</div>
    <div class="card" style="margin-top:-12px;position:relative">
      <span class="tag ${c.jenis_dana === "zakat" ? "z" : "i"}">${esc(c.jenis_dana.toUpperCase())}</span>${c.kategori ? ` <span class="tag i">${esc(c.kategori)}</span>` : ""}
      <h2 style="margin:8px 0 4px;font-size:20px">${esc(c.judul)}</h2><p style="margin:0;color:var(--muted);font-size:14px">${esc(c.ringkas || "")}</p>
      <div class="amt-big" style="margin-top:12px;font-size:24px">${rp(c.terkumpul)}</div>
      <div class="meta"><span>terkumpul${c.target ? " dari " + rp(c.target) : ""}</span>${c.target ? `<b>${pct}%</b>` : ""}</div>
      ${c.target ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}
      <div class="dstat"><div><b>${c.donatur}</b>donasi</div><div><b>${c.sisa_hari != null ? c.sisa_hari : "Terus"}</b>${c.sisa_hari != null ? "hari lagi" : "dibuka"}</div><div><b>${arts.length + c.updates.length}</b>laporan</div></div>
    </div>
    <div class="sec"><h2>Tentang program</h2></div><div class="card story">${story(c.cerita || c.ringkas)}</div>
    ${arts.length ? `<div class="sec"><h2>Dokumentasi penyaluran</h2><span class="hint" style="margin:0">${arts.length} laporan</span></div>${arts.slice(0, 1).map((a) => artCard(a, true)).join("")}${arts.slice(1).map(artRow).join("")}` : ""}
    ${c.updates.length ? `<div class="sec"><h2>Kabar terbaru</h2></div><div class="card"><div class="tl">${c.updates.map((u) => `<div class="it"><small>${tgl(u.created_at)}</small><b>${esc(u.judul)}</b>${u.isi ? `<p>${esc(u.isi)}</p>` : ""}</div>`).join("")}</div></div>` : ""}
    <div class="sec"><h2>Doa & donatur</h2><span class="hint" style="margin:0">${c.donatur} donasi</span></div>
    <div class="card">${c.donors.length ? c.donors.map((d) => `<div class="drow"><span class="av">${esc(d.nama[0])}</span><span class="tx"><b>${esc(d.nama)} · ${rp(d.total)}</b>${d.doa ? `<i>"${esc(d.doa)}"</i><br>` : ""}<small style="color:var(--muted)">${ago(d.waktu)}</small></span></div>`).join("") : `<p style="margin:0;color:var(--muted)">Belum ada donatur. Jadilah yang pertama.</p>`}</div>
    <div style="height:80px"></div>`);
  const cta = document.createElement("div"); cta.className = "cta";
  cta.innerHTML = `<a class="btn ghost sh" aria-label="Bagikan" href="${waLink("", shareText(c))}" target="_blank" rel="noopener">${ic("share", 20)}</a><button class="btn primary" onclick="openDonate('${c.slug}')">${c.jenis_dana === "zakat" ? "Tunaikan zakat" : "Donasi sekarang"}</button>`;
  document.body.appendChild(cta); $("#nav").hidden = true;
});

/* ---------- Zakat ---------- */
let zakatTab = "penghasilan";
route(/^#\/zakat$/, async () => {
  header("Kalkulator zakat"); nav("");
  const draw = () => {
    view(`<div class="tabs" role="tablist">${[["penghasilan", "Penghasilan"], ["maal", "Harta (maal)"], ["fitrah", "Fitrah"]].map(([k, l]) => `<button role="tab" aria-selected="${zakatTab === k}" class="${zakatTab === k ? "on" : ""}" data-t="${k}">${l}</button>`).join("")}</div>
      <div class="card" id="zform"></div><div id="zres"></div>
      <div class="info">${ic("info", 20)}<span>Masih ragu? <a href="${waLink(CFG.wa_admin, "Assalamu'alaikum, saya ingin konsultasi zakat.")}" target="_blank" rel="noopener"><b>Konsultasi zakat gratis via WhatsApp</b></a>.</span></div>`);
    $$("[data-t]").forEach((b) => (b.onclick = () => { zakatTab = b.dataset.t; draw(); }));
    ZAKAT[zakatTab]();
  };
  draw();
});
const goldInput = () => `<label class="f" for="z_emas">Harga emas per gram <small>(perbarui sesuai harga hari ini)</small></label><div class="inp"><span>Rp</span><input inputmode="numeric" id="z_emas" value="${(CFG.harga_emas || 0).toLocaleString("id-ID")}"></div>`;
const money = (id, label, hint = "") => `<label class="f" for="${id}">${label}</label><div class="inp"><span>Rp</span><input inputmode="numeric" id="${id}" placeholder="0"></div>${hint ? `<div class="hint">${hint}</div>` : ""}`;
const ZAKAT = {
  penghasilan() {
    $("#zform").innerHTML = money("z_gaji", "Penghasilan per bulan", "Gaji, honor, atau hasil usaha bersih per bulan") + money("z_lain", "Penghasilan lain per bulan <small>(opsional)</small>") + goldInput();
    bindZ(() => { const total = num($("#z_gaji").value) + num($("#z_lain").value), nisab = CFG.nisab_gram * num($("#z_emas").value) / 12;
      return { total, nisab, zakat: total * 0.025, ket: `Nisab bulanan = ${CFG.nisab_gram} gram emas ÷ 12`, label: "Zakat penghasilan per bulan", jenisZ: "Zakat Penghasilan", slug: "zakat-maal" }; });
  },
  maal() {
    $("#zform").innerHTML = money("z_tab", "Tabungan, deposito & uang tunai") +
      `<label class="f" for="z_gram">Emas simpanan <small>(gram)</small></label><div class="inp"><input inputmode="decimal" id="z_gram" placeholder="0"><span>gram</span></div>` +
      money("z_inv", "Investasi, saham & piutang lancar") + money("z_dag", "Aset dagang <small>(stok barang)</small>") + money("z_utang", "Utang jatuh tempo", "Dikurangkan dari total harta") + goldInput() +
      `<div class="hint">Zakat maal wajib bila harta mencapai nisab dan telah dimiliki selama 1 tahun hijriah (haul).</div>`;
    bindZ(() => { const emas = num($("#z_emas").value), gram = parseFloat(String($("#z_gram").value).replace(",", ".")) || 0;
      const total = Math.max(0, num($("#z_tab").value) + gram * emas + num($("#z_inv").value) + num($("#z_dag").value) - num($("#z_utang").value));
      return { total, nisab: CFG.nisab_gram * emas, zakat: total * 0.025, ket: `Nisab = ${CFG.nisab_gram} gram emas`, label: "Zakat maal yang perlu ditunaikan", jenisZ: "Zakat Maal", slug: "zakat-maal" }; });
  },
  fitrah() {
    const kg = String(CFG.beras_per_jiwa).replace(".", ",");
    $("#zform").innerHTML = `<label class="f" for="z_jiwa">Jumlah jiwa dalam keluarga</label><div class="inp"><input inputmode="numeric" id="z_jiwa" value="1"><span>orang</span></div>
      <label class="f" for="z_beras">Harga beras per kg</label><div class="inp"><span>Rp</span><input inputmode="numeric" id="z_beras" value="${(CFG.harga_beras || 0).toLocaleString("id-ID")}"></div>
      <div class="hint">Zakat fitrah ditunaikan berupa makanan pokok ${kg} kg beras per jiwa. Dana yang Anda titipkan dibelikan beras oleh amil dan disalurkan sebelum shalat Idul Fitri.</div>`;
    const calc = () => { const j = num($("#z_jiwa").value), h = num($("#z_beras").value), z = Math.round(j * CFG.beras_per_jiwa * h);
      $("#zres").innerHTML = j ? `<div class="result ok"><div class="sm">Zakat fitrah untuk ${j} jiwa (${String(j * CFG.beras_per_jiwa).replace(".", ",")} kg beras)</div><div class="big">${rp(z)}</div>
        <button class="btn primary block" style="margin-top:10px" onclick="openDonate('zakat-fitrah',${z})">Titipkan zakat fitrah</button></div>` : ""; };
    fmtInput($("#z_beras")); ["#z_jiwa", "#z_beras"].forEach((s) => $(s).addEventListener("input", calc)); calc();
  },
};
function bindZ(fn) { $$("#zform input").forEach((el) => { if (el.id !== "z_gram") fmtInput(el); el.addEventListener("input", () => showZ(fn())); }); showZ(fn()); }
function showZ(r) {
  const el = $("#zres"); if (!r.total) { el.innerHTML = ""; return; }
  el.innerHTML = r.total >= r.nisab
    ? `<div class="result ok"><div class="sm">${r.label}</div><div class="big">${rp(r.zakat)}</div><div class="sm">2,5% × ${rp(r.total)} · ${r.ket} (${rp(r.nisab)})</div>
       <button class="btn primary block" style="margin-top:12px" onclick="openDonate('${r.slug}',${Math.round(r.zakat)})">Tunaikan zakat sekarang</button></div>`
    : `<div class="result no"><b>Belum mencapai nisab</b><div class="sm" style="color:var(--muted);margin-top:4px">Harta Anda ${rp(r.total)}, nisab ${rp(r.nisab)}. Anda belum wajib zakat, namun tetap bisa meraih pahala lewat infak atau Pundi Sedekah.</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button class="btn green" onclick="openDonate('infak-terbaik')">Berinfak</button><a class="btn ghost" href="#/pundi">Pundi Sedekah</a></div></div>`;
}

/* ---------- Pundi ---------- */
route(/^#\/pundi(?:\/([\w-]+))?$/, async (kode) => {
  if (kode) { pundiSaya.kode = kode.toUpperCase(); pundiSaya.status = "aktif"; store.set("pundi", pundiSaya); }
  header("Pundi Sedekah"); nav("");
  let harian = store.get("pundiHarian", 5000);
  const draw = () => {
    const punya = !!pundiSaya.kode;
    view(`<div class="card" style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center">
        <span class="jar" style="width:80px;height:92px"><canvas id="jarBig" width="160" height="184" style="width:80px;height:92px" aria-hidden="true"></canvas></span>
        <div style="min-width:0"><span class="tag i">CELENGAN KEBAIKAN</span><h2 style="margin:6px 0 4px;font-size:19px">Sedekah kecil setiap hari, terkumpul jadi besar</h2>
        <p style="margin:0;color:var(--muted);font-size:13.5px">Pundi diletakkan di rumah Anda. Keluarga mengisinya setiap hari, petugas menjemput dan menghitungnya bersama Anda.</p></div></div>
      ${punya ? `<div class="sec"><h2>Pundi saya</h2><span class="tag i">${esc(pundiSaya.kode)}</span></div>
        <div class="card"><div class="meta"><span>Jadwal jemput</span><b>${esc(CFG.pundi_jadwal || "Sebulan sekali")}</b></div>
          <div style="display:grid;gap:8px;margin-top:14px">
            <button class="btn primary block" onclick="openDonate('pundi-sedekah',null,{pundi:'${esc(pundiSaya.kode)}'})">${ic("wallet", 20)} Setor isi pundi sekarang</button>
            <a class="btn green block" href="${waLink(CFG.wa_pundi || CFG.wa_admin, `Assalamu'alaikum, pundi saya (${pundiSaya.kode}) sudah cukup penuh. Mohon dijemput.\nNama: ${profile.nama || "-"}`)}" target="_blank" rel="noopener">${ic("truck", 20)} Minta dijemput lebih awal</a>
            <button class="btn plain block" id="pk_del">Hapus kode pundi dari perangkat ini</button></div></div>`
      : `<div class="sec"><h2>Sudah punya pundi?</h2></div><div class="card">
          <label class="f" for="pk_kode" style="margin-top:0">Kode pundi <small>(tertera di stiker QR pundi)</small></label>
          <div class="inp"><input id="pk_kode" placeholder="Contoh: P-0123" autocomplete="off"></div>
          <div class="err" id="pk_err" hidden>Masukkan kode pundi, misalnya P-0123.</div>
          <button class="btn ghost block" style="margin-top:10px" id="pk_go">Simpan kode pundi</button></div>`}
      <div class="sec"><h2>Berapa yang bisa terkumpul?</h2></div>
      <div class="card"><div class="hint" style="margin:0 0 8px">Isi harian keluarga</div>
        <div class="chips c4">${[2000, 5000, 10000, 20000].map((v) => `<button class="chip ${harian === v ? "on" : ""}" data-h="${v}">${v / 1000}rb</button>`).join("")}</div>
        <div class="est"><div>Sebulan<b>${rp(harian * 30)}</b></div><div>Setahun<b>${rp(harian * 365)}</b></div></div></div>
      <div class="sec"><h2>Cara kerja</h2></div>
      <div class="card"><div class="flow">${[["Daftar", "Isi formulir di bawah. Gratis, tanpa biaya pundi."], ["Pundi diantar", "Petugas mengantar pundi bersegel dan berstiker QR ke rumah Anda."], ["Isi setiap hari", "Ajak anak dan keluarga menyisihkan sedekah, misalnya setelah Subuh."], ["Dijemput & dihitung bersama", `${CFG.pundi_jadwal || "Sebulan sekali"}. Isi dihitung di depan Anda, lalu pundi disegel ulang.`], ["Kuitansi via WhatsApp", "Bukti setoran dikirim otomatis ke nomor Anda."]].map((s, i) => `<div class="st"><span class="n">${i + 1}</span><div><b>${s[0]}</b><span>${s[1]}</span></div></div>`).join("")}</div></div>
      ${punya ? "" : `<div class="sec"><h2>Daftar Pundi Sedekah</h2></div>
        <form class="card" id="pf" novalidate>
          ${pundiSaya.status === "daftar" ? `<div class="info" style="margin:0 0 6px">${ic("check", 20)}<span>Pendaftaran Anda sudah kami terima. Petugas akan menghubungi Anda untuk jadwal pengantaran.</span></div>` : ""}
          <label class="f" for="pf_nama">Nama kepala keluarga</label><div class="inp"><input id="pf_nama" value="${esc(profile.nama)}" autocomplete="name"></div>
          <label class="f" for="pf_wa">Nomor WhatsApp</label><div class="inp"><span>+62</span><input id="pf_wa" inputmode="tel" value="${esc(profile.wa)}" placeholder="812xxxxxxx"></div>
          <label class="f" for="pf_alamat">Alamat lengkap</label><div class="inp"><textarea id="pf_alamat" placeholder="Jalan, nomor rumah, RT/RW"></textarea></div>
          <label class="f" for="pf_kel">Kelurahan / desa</label><div class="inp"><input id="pf_kel"></div>
          <label class="f" for="pf_kec">Kecamatan</label><div class="inp"><input id="pf_kec"></div>
          <label class="f" for="pf_patok">Patokan rumah <small>(opsional)</small></label><div class="inp"><input id="pf_patok" placeholder="Contoh: depan masjid, pagar hijau"></div>
          <label class="f" for="pf_kerja">Pekerjaan <small>(opsional)</small></label><div class="inp"><input id="pf_kerja"></div>
          <label class="f">Jumlah pundi</label><div class="seg" id="pf_jml">${[1, 2, 3].map((n) => `<button type="button" class="${n === 1 ? "on" : ""}" data-v="${n}">${n} pundi</button>`).join("")}</div>
          <label class="f">Waktu jemput yang nyaman</label><div class="seg" id="pf_waktu">${["Pagi", "Siang", "Sore"].map((w, i) => `<button type="button" class="${i === 2 ? "on" : ""}" data-v="${w}">${w}</button>`).join("")}</div>
          <div class="err" id="pf_err" hidden></div>
          <div class="hint">Wilayah layanan: ${esc(CFG.pundi_wilayah || CFG.cabang)}. Data hanya dipakai untuk pengantaran, penjemputan, dan kuitansi pundi.</div>
          <button class="btn primary block" style="margin-top:14px" type="submit">${ic("coins", 20)} Daftar Pundi Sedekah</button>
        </form>`}`);
    drawJar($("#jarBig"), 0.5);
    $$("[data-h]").forEach((b) => (b.onclick = () => { harian = +b.dataset.h; store.set("pundiHarian", harian); draw(); }));
    if (punya) { $("#pk_del").onclick = () => { pundiSaya.kode = ""; pundiSaya.status = ""; store.set("pundi", pundiSaya); draw(); }; return; }
    $("#pk_go").onclick = () => { const k = $("#pk_kode").value.trim().toUpperCase(); if (!/^[A-Z]{1,3}-?\d{2,6}$/.test(k)) { $("#pk_err").hidden = false; return; } pundiSaya.kode = k; pundiSaya.status = "aktif"; store.set("pundi", pundiSaya); toast("Kode pundi disimpan"); draw(); };
    $("#pk_kode").oninput = () => ($("#pk_err").hidden = true);
    ["#pf_jml", "#pf_waktu"].forEach((sel) => $$(sel + " button").forEach((b) => (b.onclick = () => { $$(sel + " button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); })));
    $("#pf").onsubmit = async (e) => {
      e.preventDefault(); const er = $("#pf_err"); er.hidden = true;
      const v = { nama: $("#pf_nama").value.trim(), wa: cleanWA($("#pf_wa").value), alamat: $("#pf_alamat").value.trim(), kelurahan: $("#pf_kel").value.trim(), kecamatan: $("#pf_kec").value.trim(),
        patokan: $("#pf_patok").value.trim(), pekerjaan: $("#pf_kerja").value.trim(), jumlah: +$("#pf_jml .on").dataset.v, waktu_jemput: $("#pf_waktu .on").dataset.v };
      const miss = []; if (!v.nama) miss.push("nama"); if (v.wa.length < 9) miss.push("nomor WhatsApp"); if (!v.alamat) miss.push("alamat"); if (!v.kelurahan) miss.push("kelurahan/desa"); if (!v.kecamatan) miss.push("kecamatan");
      if (miss.length) { er.textContent = "Lengkapi dulu: " + miss.join(", ") + "."; er.hidden = false; return; }
      const btn = e.submitter; btn.disabled = true; btn.textContent = "Mengirim…";
      try { await api("public/pundi", { method: "POST", body: v }); profile.nama = v.nama; profile.wa = v.wa; store.set("profil", profile); pundiSaya.status = "daftar"; store.set("pundi", pundiSaya); toast("Pendaftaran terkirim. Jazakallahu khairan!"); draw(); }
      catch (x) { er.textContent = x.message; er.hidden = false; btn.disabled = false; btn.textContent = "Daftar Pundi Sedekah"; }
    };
  };
  draw();
});

/* ---------- Kotak amal (dari QR) ---------- */
route(/^#\/kotak\/([\w-]+)$/, async (kode) => {
  const k = await api("public/kotak/" + encodeURIComponent(kode)).catch(() => null);
  kotakNow = { kode: kode.toUpperCase(), nama: k?.nama_lokasi || "Kotak amal digital", exp: Date.now() + 2 * 3600e3 }; store.set("kotak", kotakNow);
  location.replace("#/");
});

/* ---------- Ambulans ---------- */
route(/^#\/ambulans$/, async () => {
  header("Ambulans gratis"); nav("");
  view(`<div class="detail-hero" style="background:#FCEBE9;color:#B83227">${ic("ambulance", 72)}</div>
    <span class="tag i">BERKAH SEHAT</span><h2 style="margin:8px 0 4px;font-size:20px">Ambulans gratis untuk pasien dhuafa</h2>
    <p style="margin:0;color:var(--muted)">Layanan antar-jemput pasien ke rumah sakit tanpa biaya, terlaksana berkat titipan zakat, infak, dan sedekah para donatur.</p>
    <div class="card" style="margin-top:14px"><b>Cara memesan</b><ol class="ol"><li>Hubungi petugas lewat tombol WhatsApp di bawah.</li><li>Sampaikan nama pasien, alamat jemput, dan rumah sakit tujuan.</li><li>Petugas mengonfirmasi ketersediaan armada.</li></ol>
      <div class="hint">Syarat dan wilayah layanan mengikuti ketentuan WIZ Cabang ${esc(CFG.cabang)}. Dalam keadaan gawat darurat, hubungi juga layanan darurat 119.</div>
      <p style="margin:10px 0 0;font-size:13px">Nomor layanan: <b style="user-select:all">${fmtWA(CFG.wa_ambulans)}</b></p></div>
    <a class="btn green block" style="margin-top:12px" href="${waLink(CFG.wa_ambulans, "Assalamu'alaikum, saya ingin memesan layanan ambulans gratis WIZ.\nNama pasien: \nAlamat jemput: \nRS tujuan: ")}" target="_blank" rel="noopener">${ic("wa", 20)} Pesan ambulans via WhatsApp</a>
    <button class="btn primary block" style="margin-top:10px" onclick="openDonate('berkah-sehat')">Dukung operasional ambulans</button>`);
});

/* ---------- Riwayat ---------- */
route(/^#\/riwayat$/, async () => {
  header("Riwayat donasi"); nav("#/riwayat");
  const ids = store.get("riwayat", []);
  if (!ids.length) { view(`<div class="empty"><div class="e">${ic("heart", 32)}</div><b style="color:var(--ink)">Belum ada riwayat</b><p>Zakat, infak, dan setoran pundi Anda akan tercatat di sini.</p><button class="btn primary" onclick="openDonate('infak-terbaik')">Mulai berinfak</button></div>`); return; }
  view(`<div class="skel" style="height:200px"></div>`);
  const list = (await Promise.all(ids.slice(-30).reverse().map((id) => api("public/donations/" + id).catch(() => null)))).filter(Boolean);
  const paid = list.filter((x) => x.status === "paid");
  const tz = paid.filter((x) => x.jenis_dana === "zakat").reduce((a, b) => a + b.total, 0), ti = paid.filter((x) => x.jenis_dana !== "zakat").reduce((a, b) => a + b.total, 0);
  const st = { paid: ["Lunas", "z"], pending: ["Menunggu", "i"], failed: ["Gagal", "i"], expired: ["Kedaluwarsa", "i"], cancelled: ["Dibatalkan", "i"] };
  view(`<div class="stat"><div class="s"><small>Total zakat</small><b>${rp(tz)}</b></div><div class="s"><small>Total infak & sedekah</small><b>${rp(ti)}</b></div></div>
    ${list.map((x) => `<a class="hist" href="#/bayar/${x.id}"><span class="hi" style="background:var(--green-50);color:var(--green-t)">${ic(x.jenis_dana === "zakat" ? "scale" : "heart")}</span>
      <span class="tx"><b>${esc(x.campaign.judul)}</b>${tgl(x.paid_at || x.created_at)} · <span class="tag ${st[x.status][1]}">${st[x.status][0]}</span></span><span class="am">${rp(x.total)}</span></a>`).join("")}
    <div class="hint" style="text-align:center;margin-top:10px">Daftar ini tersimpan di perangkat Anda. Kuitansi juga dikirim ke WhatsApp.</div>`);
});

/* ---------- Akun & bantuan ---------- */
route(/^#\/akun$/, async () => {
  header("Akun & bantuan"); nav("#/akun");
  const faq = [["Apakah harus membuat akun?", "Tidak. Cukup isi nominal dan nomor WhatsApp (opsional) untuk menerima kuitansi."],
    ["Bagaimana saya tahu donasi sudah diterima?", "Pembayaran otomatis (QRIS, virtual account, e-wallet) terkonfirmasi dalam hitungan detik. Transfer manual diverifikasi admin. Kuitansi dikirim ke WhatsApp Anda."],
    ["Apakah zakat dan infak dipisah?", "Ya. Dana zakat hanya disalurkan kepada 8 golongan penerima (asnaf); infak dan sedekah untuk program sosial dan dakwah."],
    ["Apakah zakat bisa mengurangi pajak?", "Bukti setor zakat dari LAZNAS resmi dapat dipakai sebagai pengurang penghasilan kena pajak sesuai ketentuan. Minta bukti setor resmi lewat admin."]];
  view(`<div class="card"><b>Profil donatur</b><div class="hint" style="margin:2px 0 4px">Diisi sekali, otomatis terisi saat berdonasi. Tersimpan di perangkat ini.</div>
      <label class="f" for="ak_nama">Nama</label><div class="inp"><input id="ak_nama" value="${esc(profile.nama)}" placeholder="Nama Anda"></div>
      <label class="f" for="ak_wa">Nomor WhatsApp</label><div class="inp"><span>+62</span><input id="ak_wa" inputmode="tel" value="${esc(profile.wa)}" placeholder="812xxxxxxx"></div>
      <button class="btn ghost block" style="margin-top:12px" id="ak_save">Simpan profil</button></div>
    <div class="sec"><h2>Layanan</h2></div>
    <a class="linkrow" href="#/mitra"><span class="ib o">${ic("trophy")}</span><span class="tx"><b>Jadi relawan afiliator</b><span>Ajak orang berdonasi dan pantau hasilnya</span></span>${ic("chev")}</a>
    <a class="linkrow" href="#/berita"><span class="ib">${ic("news")}</span><span class="tx"><b>Laporan penyaluran</b><span>Foto dan cerita titipan yang sudah disalurkan</span></span>${ic("chev")}</a>
    <a class="linkrow" href="#/pundi"><span class="ib o">${ic("coins")}</span><span class="tx"><b>Pundi Sedekah</b><span>Daftar atau kelola pundi di rumah</span></span>${ic("chev")}</a>
    <a class="linkrow" href="${waLink(CFG.wa_admin, "Assalamu'alaikum, saya ingin bertanya tentang zakat/donasi WIZ.")}" target="_blank" rel="noopener"><span class="ib">${ic("wa")}</span><span class="tx"><b>Chat admin</b><span>${fmtWA(CFG.wa_admin)} · konsultasi & jemput zakat</span></span>${ic("chev")}</a>
    <div class="sec"><h2>Pertanyaan umum</h2></div>
    <div style="display:grid;gap:8px">${faq.map(([q, a]) => `<details class="card"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`);
  $("#ak_save").onclick = () => { profile.nama = $("#ak_nama").value.trim(); profile.wa = cleanWA($("#ak_wa").value); store.set("profil", profile); toast("Profil disimpan"); };
});

/* ---------- Portal fundraiser ---------- */
route(/^#\/mitra$/, async () => {
  header("Portal fundraiser"); nav("#/akun");
  let me = null; try { me = await api("fr/me"); } catch {}
  if (!me) return mitraAuth("daftar");
  const link = (c) => `${origin}/?ref=${me.me.kode}#/c/${c.slug}`;
  view(`<section class="hero" style="padding:18px"><small>Fundraiser · kode ${esc(me.me.kode)}</small><h1 style="font-size:20px">Assalamu'alaikum, ${esc(me.me.nama.split(" ")[0])}</h1>
      <p style="margin:0">${me.me.status === "aktif" ? "Setiap donasi lewat tautan Anda tercatat otomatis dan Anda mendapat notifikasi WhatsApp." : "Akun Anda menunggu persetujuan admin."}</p></section>
    <div class="tiles" style="margin-top:12px"><div class="s"><small>Total terkumpul</small><b>${rpk(me.stat.total)}</b></div><div class="s"><small>Bulan ini</small><b>${rpk(me.stat.bulan_ini)}</b></div>
      <div class="s"><small>Donasi</small><b>${me.stat.n}</b></div><div class="s"><small>Peringkat</small><b>${me.rank ? "#" + me.rank : "-"} <small>dari ${me.peserta}</small></b></div></div>
    ${me.apresiasi ? `<div class="info">${ic("trophy", 20)}<span>${esc(me.apresiasi)}</span></div>` : ""}
    <div class="sec"><h2>Tautan ajakan Anda</h2></div>
    <div class="linkrow"><span class="ib">${ic("link")}</span><span class="tx"><b>Semua program</b><span>${origin}/?ref=${esc(me.me.kode)}</span></span>
      <button class="btn ghost" style="padding:8px 10px" onclick="copy('${origin}/?ref=${me.me.kode}','Tautan')">${ic("copy", 18)}</button></div>
    ${me.campaigns.map((c) => `<div class="linkrow"><span class="ib o">${ic(c.ikon)}</span><span class="tx"><b>${esc(c.judul)}</b><span>${rpk(c.terkumpul)} terkumpul</span></span>
      <button class="btn ghost" style="padding:8px 10px" aria-label="Salin tautan" onclick="copy('${link(c)}','Tautan')">${ic("copy", 18)}</button>
      <a class="btn green" style="padding:8px 10px" aria-label="Bagikan ke WhatsApp" target="_blank" rel="noopener" href="${waLink("", `${c.judul}\n${c.ringkas || ""}\n\nYuk ikut berbagi lewat WIZ Cabang ${CFG.cabang}:\n${link(c)}`)}">${ic("wa", 18)}</a></div>`).join("")}
    <div class="sec"><h2>Papan kebaikan</h2></div>
    <div class="card board">${me.leaderboard.map((x) => `<div class="r ${x.saya ? "me" : ""}"><span class="n">${x.rank}</span><span>${esc(x.nama)}${x.saya ? " (Anda)" : ""}</span><span class="am">${rpk(x.total)}</span></div>`).join("") || "<p>Belum ada data.</p>"}</div>
    <div class="sec"><h2>Donasi lewat tautan Anda</h2></div>
    <div class="card">${me.recent.length ? me.recent.map((d) => `<div class="drow"><span class="av">${esc(d.nama[0])}</span><span class="tx"><b>${esc(d.nama)} · ${rp(d.total)}</b><small style="color:var(--muted)">${esc(d.program || "")} · ${d.status === "paid" ? "lunas" : "menunggu"} · ${ago(d.waktu)}</small></span></div>`).join("") : `<p style="margin:0;color:var(--muted)">Belum ada. Bagikan tautan Anda ke keluarga, grup pengajian, dan rekan kerja.</p>`}</div>
    <button class="btn plain block" style="margin-top:12px" id="fr_out">${ic("logout", 18)} Keluar</button>`);
  $("#fr_out").onclick = async () => { await api("fr/logout", { method: "POST" }); router(); };
});
function mitraAuth(mode) {
  view(`<section class="hero" style="padding:18px"><small>Program fundraiser</small><h1 style="font-size:20px">Ajak kebaikan, raih pahala yang terus mengalir</h1>
      <p style="margin:0">Dapatkan tautan ajakan pribadi. Setiap donasi lewat tautan Anda tercatat dan Anda menerima kabar via WhatsApp.</p></section>
    <div class="authtabs"><button class="${mode === "daftar" ? "on" : ""}" data-m="daftar">Daftar</button><button class="${mode === "masuk" ? "on" : ""}" data-m="masuk">Masuk</button></div>
    <form class="card" id="frf" novalidate>
      ${mode === "daftar" ? `<label class="f" for="fr_nama" style="margin-top:0">Nama lengkap</label><div class="inp"><input id="fr_nama" autocomplete="name"></div>` : ""}
      <label class="f" for="fr_wa" ${mode === "masuk" ? 'style="margin-top:0"' : ""}>Nomor WhatsApp</label><div class="inp"><span>+62</span><input id="fr_wa" inputmode="tel" value="${esc(profile.wa)}" placeholder="812xxxxxxx"></div>
      <label class="f" for="fr_pin">PIN 6 angka</label><div class="inp"><input id="fr_pin" inputmode="numeric" type="password" maxlength="6" autocomplete="${mode === "daftar" ? "new-password" : "current-password"}"></div>
      ${mode === "daftar" ? `<label class="f" for="fr_kota">Kota / kecamatan <small>(opsional)</small></label><div class="inp"><input id="fr_kota"></div>` : ""}
      <div class="err" id="fr_err" hidden></div>
      <button class="btn primary block" style="margin-top:14px" type="submit">${mode === "daftar" ? "Daftar jadi fundraiser" : "Masuk"}</button>
      ${mode === "masuk" ? `<div class="hint" style="text-align:center">Lupa PIN? Hubungi admin cabang untuk mengatur ulang.</div>` : ""}</form>`);
  $$("[data-m]").forEach((b) => (b.onclick = () => mitraAuth(b.dataset.m)));
  $("#frf").onsubmit = async (e) => {
    e.preventDefault(); const er = $("#fr_err"); er.hidden = true;
    const body = { wa: cleanWA($("#fr_wa").value), pin: $("#fr_pin").value.trim() };
    if (mode === "daftar") { body.nama = $("#fr_nama").value.trim(); body.kota = $("#fr_kota").value.trim(); }
    try { await api(mode === "daftar" ? "fr/register" : "fr/login", { method: "POST", body }); toast(mode === "daftar" ? "Selamat bergabung!" : "Berhasil masuk"); router(); }
    catch (x) { er.textContent = x.message; er.hidden = false; }
  };
}


/* ---------- Dokumentasi penyaluran ---------- */
function artCard(a, full = false) {
  return `<a class="cc ${full ? "full" : ""}" href="#/berita/${esc(a.slug)}">
    <span class="cv ${a.cover ? "" : "noimg"}" style="background:var(--green-50);color:var(--green-t)">${a.cover ? `<img src="${a.cover}" alt="" loading="lazy">` : ic("news", 44)}<span class="tag z">PENYALURAN</span></span>
    <span class="bd"><h3>${esc(a.judul)}</h3><p>${esc(a.ringkas || "")}</p>
      <span class="meta"><span>${tgl(a.tanggal ? a.tanggal + " 00:00:00" : a.created_at)}${a.lokasi ? " · " + esc(a.lokasi) : ""}</span>${a.penerima ? `<b>${a.penerima} penerima</b>` : ""}</span></span></a>`;
}
function artRow(a) {
  return `<a class="arow" href="#/berita/${esc(a.slug)}"><span class="th">${a.cover ? `<img src="${a.cover}" alt="" loading="lazy">` : ic("news", 26)}</span>
    <span class="tx"><b>${esc(a.judul)}</b><small>${tgl(a.tanggal ? a.tanggal + " 00:00:00" : a.created_at)}${a.penerima ? " · " + a.penerima + " penerima manfaat" : ""}</small></span>${ic("chev")}</a>`;
}
function renderBlocks(blocks) {
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  return blocks.map((b) => {
    if (b.t === "p") return `<p>${md(b.text)}</p>`;
    if (b.t === "h") return `<h2>${esc(b.text)}</h2>`;
    if (b.t === "quote") return `<blockquote>${md(b.text)}${b.by ? `<cite>${esc(b.by)}</cite>` : ""}</blockquote>`;
    if (b.t === "img") return `<figure><img src="${b.src}" alt="${esc(b.caption || "Dokumentasi penyaluran")}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
    if (b.t === "video") {
      const cap = b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : "";
      if (b.kind === "youtube") return `<figure><div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.id)}" title="${esc(b.caption || "Video penyaluran")}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>${cap}</figure>`;
      if (b.kind === "file") return `<figure><video src="${b.src}" controls playsinline preload="metadata"></video>${cap}</figure>`;
      return `<a class="linkrow" href="${esc(b.url)}" target="_blank" rel="noopener"><span class="ib o">${ic("play")}</span><span class="tx"><b>${esc(b.caption || "Tonton video penyaluran")}</b><span>Buka di ${esc(b.host)}</span></span>${ic("chev")}</a>`;
    }
    return "";
  }).join("");
}
route(/^#\/berita$/, async () => {
  header("Laporan penyaluran"); nav("");
  const list = await api("public/articles?limit=50");
  view(list.length ? `<p class="hint" style="margin-top:0">Bukti titipan Anda sampai kepada yang berhak di ${esc(CFG.cabang)}.</p>${list.map((a) => artCard(a, true)).join("")}`
    : `<div class="empty"><div class="e">${ic("news", 32)}</div><b style="color:var(--ink)">Belum ada laporan</b><p>Dokumentasi penyaluran akan tampil di sini.</p></div>`);
});
route(/^#\/berita\/([\w-]+)$/, async (slug) => {
  const a = await api("public/articles/" + slug);
  header("Laporan penyaluran"); nav("");
  const tglK = tgl(a.tanggal ? a.tanggal + " 00:00:00" : a.created_at, { day: "numeric", month: "long", year: "numeric" });
  view(`${a.cover ? `<div class="dhero"><img src="${a.cover}" alt=""></div>` : ""}
    <article class="art card" style="${a.cover ? "margin-top:-12px;position:relative" : ""}">
      <span class="tag z">LAPORAN PENYALURAN</span>${a.program ? ` <a class="tag i" href="#/c/${esc(a.program_slug)}">${esc(a.program)}</a>` : ""}
      <h1>${esc(a.judul)}</h1>
      <div class="ameta">${ic("calendar", 16)} ${tglK}${a.lokasi ? ` · ${esc(a.lokasi)}` : ""}</div>
      ${a.penerima || a.tersalur ? `<div class="impact">${a.penerima ? `<div><b>${a.penerima.toLocaleString("id-ID")}</b>penerima manfaat</div>` : ""}${a.tersalur ? `<div><b>${rpk(a.tersalur)}</b>dana tersalur</div>` : ""}</div>` : ""}
      <div class="story">${renderBlocks(a.blocks)}</div>
      <p class="hint" style="margin:14px 0 0">Terima kasih kepada seluruh donatur yang telah menitipkan zakat, infak, dan sedekahnya melalui WIZ Cabang ${esc(CFG.cabang)}.</p>
    </article>
    ${a.lain.length ? `<div class="sec"><h2>Laporan lainnya</h2><a href="#/berita">Lihat semua</a></div>${a.lain.map(artRow).join("")}` : ""}
    <div style="height:80px"></div>`);
  const cta = document.createElement("div"); cta.className = "cta";
  const share = `${a.judul}\n\nLaporan penyaluran WIZ Cabang ${CFG.cabang}:\n${origin}/${refNow() ? "?ref=" + refNow() : ""}#/berita/${a.slug}`;
  cta.innerHTML = `<a class="btn ghost sh" aria-label="Bagikan" href="${waLink("", share)}" target="_blank" rel="noopener">${ic("share", 20)}</a><button class="btn primary" onclick="openDonate('${esc(a.program_slug || "infak-terbaik")}')">${a.program ? "Bantu program ini" : "Donasi sekarang"}</button>`;
  document.body.appendChild(cta); $("#nav").hidden = true;
});

/* ---------- Status pembayaran & kuitansi ---------- */
route(/^#\/(?:bayar|kuitansi)\/(\w+)$/, async (id) => {
  header("Status donasi", "#/riwayat"); nav("");
  const draw = async (d) => {
    if (d.status === "paid") {
      const z = d.jenis_dana === "zakat";
      view(`<div class="success"><div class="ck">${ic("check", 40)}</div>
          <h2>Jazakallahu khairan${d.anonim || !d.nama ? "" : ", " + esc(d.sapaan || "") + " " + esc(d.nama.split(" ")[0])}!</h2>
          <p>${z ? "Zakat" : "Donasi"} Anda sebesar <b style="color:var(--ink)">${rp(d.total)}</b> telah kami terima.</p></div>
        <div class="doa"><div class="ar">آجَرَكَ اللهُ فِيمَا أَعْطَيْتَ، وَبَارَكَ لَكَ فِيمَا أَبْقَيْتَ، وَجَعَلَهُ لَكَ طَهُورًا</div>
          <div class="tr">Semoga Allah memberi pahala atas apa yang engkau berikan, memberkahi harta yang engkau sisakan, dan menjadikannya penyuci bagimu.</div></div>
        ${receipt(d)}
        <a class="btn green block" style="margin-top:12px" target="_blank" rel="noopener" href="${waLink("", `Alhamdulillah, saya baru saja ${z ? "menunaikan zakat" : "berdonasi"} untuk "${d.campaign.judul}" lewat WIZ Cabang ${CFG.cabang}. Yuk ikut berbagi:\n${origin}/${refNow() ? "?ref=" + refNow() : ""}#/c/${d.campaign.slug}`)}">${ic("share", 20)} Ajak keluarga & teman</a>
        <a class="btn plain block" href="#/">Kembali ke beranda</a>`);
      return;
    }
    if (d.status !== "pending") {
      view(`<div class="statusbox"><span class="st failed">${d.status === "expired" ? "Kedaluwarsa" : d.status === "cancelled" ? "Dibatalkan" : "Gagal"}</span><h2 style="margin:10px 0 4px">${rp(d.total)}</h2><p style="color:var(--muted);margin:0">Pembayaran untuk "${esc(d.campaign.judul)}" tidak selesai.</p></div>
        <a class="btn primary block" style="margin-top:12px" href="#/c/${d.campaign.slug}">Coba donasi lagi</a>`); return;
    }
    const tot = rp(d.total);
    let body = "";
    if (d.metode === "gateway") body = `<p style="color:var(--muted);font-size:14px">Selesaikan pembayaran di halaman pembayaran. Status di sini berubah otomatis setelah pembayaran berhasil.</p>
      ${d.payment_url ? `<a class="btn primary block" href="${d.payment_url}">${ic("bolt", 20)} Lanjutkan pembayaran</a>` : ""}`;
    else if (d.metode === "transfer") body = `<p style="color:var(--muted);font-size:14px;margin:0 0 4px">Transfer <b style="color:var(--ink)">tepat</b> sejumlah berikut, termasuk 3 digit kode unik:</p>
      <div class="copyrow"><div><small>Total transfer</small><b>${tot.slice(0, -3)}<span class="unique">${tot.slice(-3)}</span></b></div><button onclick="copy('${d.total}','Nominal')">${ic("copy", 16)} Salin</button></div>
      ${(d.rekening || []).map((r) => `<div class="copyrow"><div><small>${esc(r.bank)} a.n. ${esc(r.an)}</small><b>${esc(r.no)}</b></div><button onclick="copy('${esc(r.no)}','No. rekening')">${ic("copy", 16)} Salin</button></div>`).join("")}`;
    else body = `<div class="qrbox"><img src="${d.qris}" alt="QRIS WIZ Cabang ${esc(CFG.cabang)}" style="width:240px;max-width:100%;border-radius:8px"><div class="amt-big">${tot.slice(0, -3)}<span class="unique">${tot.slice(-3)}</span></div>
      <div class="hint">Pindai QRIS, lalu ketik nominal <b>tepat ${tot}</b> (termasuk kode unik).</div></div>`;
    const manual = d.metode !== "gateway";
    view(`<div class="statusbox"><span class="st">${ic("clock", 16)} Menunggu pembayaran</span><h2 style="margin:10px 0 2px">${tot}</h2><p style="margin:0;color:var(--muted);font-size:13.5px">${esc(d.campaign.judul)} · No. ${esc(d.id)}</p></div>
      <div style="margin-top:12px">${body}</div>
      ${manual ? `<div class="sec"><h2>Sudah transfer?</h2></div>
        ${d.ada_bukti ? `<div class="info">${ic("check", 20)}<span>Bukti transfer sudah kami terima. Admin akan memverifikasi, lalu kuitansi dikirim ke WhatsApp Anda.</span></div>`
        : `<label class="upload" for="bukti">${ic("upload", 24)}<br><b style="color:var(--ink)">Unggah bukti transfer</b><br>Foto atau tangkapan layar · mempercepat verifikasi<input type="file" id="bukti" accept="image/*"></label>`}
        <div class="hint">Transfer dengan nominal tepat biasanya terverifikasi tanpa bukti. Kuitansi dikirim setelah dana kami terima.</div>` : ""}
      <div class="info">${ic("shield", 20)}<span>Pastikan penerima atas nama <b>Wahdah Inspirasi Zakat</b>. WIZ tidak pernah meminta transfer ke rekening pribadi.</span></div>
      <button class="btn ghost block" style="margin-top:12px" id="cek">${ic("repeat", 18)} Cek status</button>`);
    $("#cek").onclick = async () => { const n = await api(`public/donations/${id}/check`, { method: "POST" }); if (n.status !== "pending") draw(n); else toast("Belum terkonfirmasi. Status diperiksa otomatis."); };
    const up = $("#bukti");
    if (up) up.onchange = async () => { const f = up.files[0]; if (!f) return; toast("Mengunggah bukti…");
      try { await api(`public/donations/${id}/bukti`, { method: "POST", body: { gambar: await resizeImage(f, 1400) } }); toast("Bukti terkirim. Terima kasih!"); draw(await api("public/donations/" + id)); } catch (x) { toast(x.message); } };
  };
  const d = await api("public/donations/" + id);
  const ids = store.get("riwayat", []); if (!ids.includes(id)) { ids.push(id); store.set("riwayat", ids.slice(-100)); }
  await draw(d);
  if (d.status === "pending") payTimer = setInterval(async () => {
    try { const n = await api(`public/donations/${id}/check`, { method: "POST" }); if (n.status !== "pending") { clearInterval(payTimer); draw(n); } } catch {}
  }, d.metode === "gateway" ? 5000 : 15000);
});
function receipt(d) {
  return `<div class="receipt">
    <div class="rr"><span>No. transaksi</span><b>${esc(d.id)}</b></div>
    <div class="rr"><span>Jenis dana</span><b><span class="tag ${d.jenis_dana === "zakat" ? "z" : "i"}">${esc(d.jenis_dana.toUpperCase())}</span></b></div>
    <div class="rr"><span>Program</span><b>${esc(d.campaign.judul)}</b></div>
    <div class="rr"><span>Atas nama</span><b>${d.anonim || !d.nama ? "Hamba Allah" : esc((d.sapaan || "") + " " + d.nama)}</b></div>
    <div class="rr"><span>Nominal</span><b>${rp(d.total)}</b></div>
    <div class="rr"><span>Metode</span><b>${{ gateway: "Pembayaran otomatis", transfer: "Transfer bank", qris: "QRIS", tunai: "Tunai", kotak: "Kotak amal", pundi: "Pundi" }[d.metode] || esc(d.metode)}</b></div>
    ${d.fundraiser ? `<div class="rr"><span>Diajak oleh</span><b>${esc(d.fundraiser)}</b></div>` : ""}
    ${d.pundi_kode ? `<div class="rr"><span>Kode pundi</span><b>${esc(d.pundi_kode)}</b></div>` : ""}
    ${d.kotak_kode ? `<div class="rr"><span>Kotak amal</span><b>${esc(d.kotak_kode)}</b></div>` : ""}
    <div class="rr"><span>Waktu</span><b>${tgl(d.paid_at, { dateStyle: "medium", timeStyle: "short" })}</b></div></div>`;
}

/* ---------- Lembar donasi ---------- */
let D = null;
function openDonate(slug, nominal = null, extra = {}) {
  const c = CAMPS.find((x) => x.slug === slug) || CAMPS.find((x) => x.slug === "infak-terbaik") || CAMPS[0];
  if (!c) { toast("Program belum dimuat. Coba lagi."); return; }
  const zak = c.jenis_dana === "zakat";
  D = { step: 1, c, nominal: nominal || (zak ? 0 : 50000), sapaan: profile.sapaan, nama: profile.nama, wa: profile.wa, anonim: false, doa: "",
    metode: CFG.gateway ? "gateway" : (CFG.rekening || []).length ? "transfer" : "qris", pundi: extra.pundi || "" };
  $("#sheetBg").hidden = false; document.body.style.overflow = "hidden"; drawSheet();
}
function closeSheet() { $("#sheetBg").hidden = true; document.body.style.overflow = ""; }
$("#sheetBg").addEventListener("click", (e) => { if (e.target.id === "sheetBg") closeSheet(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheetBg").hidden) closeSheet(); });
function sheetHead(title) {
  return `<div class="sheet-h"><div class="grab"></div><div class="r">${D.step > 1 ? `<button class="x" aria-label="Kembali" onclick="D.step--;drawSheet()">${ic("back", 18)}</button>` : ""}
    <h3 id="sheetTitle">${title}</h3><button class="x" aria-label="Tutup" onclick="closeSheet()">${ic("x", 18)}</button></div>
    <div class="steps">${[1, 2].map((i) => `<i class="${i <= D.step ? "on" : ""}"></i>`).join("")}</div></div>`;
}
function pill() {
  const [fg, bg] = kc(D.c);
  return `<div class="prog-pill"><span class="pi" style="background:${bg};color:${fg}">${ic(D.c.ikon, 20)}</span><div>${D.c.jenis_dana === "zakat" ? "Zakat untuk" : "Berdonasi untuk"}<b>${esc(D.c.judul)}</b></div>${D.step === 1 && !D.pundi ? `<button onclick="pickProg()">Ganti</button>` : ""}</div>`;
}
function pickProg() {
  $("#sheet").innerHTML = sheetHead("Pilih program") + `<div class="sheet-b" style="padding-top:12px">${CAMPS.map((c) => { const [fg, bg] = kc(c); return `<button class="prog" data-s="${c.slug}">
    <span class="pi" style="background:${bg};color:${fg}">${ic(c.ikon, 24)}</span><span class="tx"><h3>${esc(c.judul)}</h3><p>${esc(c.ringkas || "")}</p></span><span class="tag ${c.jenis_dana === "zakat" ? "z" : "i"}">${esc(c.jenis_dana)}</span></button>`; }).join("")}</div>`;
  $$("[data-s]").forEach((b) => (b.onclick = () => { D.c = CAMPS.find((x) => x.slug === b.dataset.s); drawSheet(); }));
}
function drawSheet() {
  const s = $("#sheet"), zak = D.c.jenis_dana === "zakat", min = CFG.min_donasi || 10000;
  if (D.step === 1) {
    const presets = zak ? [100000, 250000, 500000, 1000000, 2500000, 5000000] : [10000, 25000, 50000, 100000, 250000, 500000], pop = zak ? 500000 : 50000;
    s.innerHTML = sheetHead(zak ? "Tunaikan zakat" : "Infak & sedekah") + `<div class="sheet-b">${pill()}
      <label class="f">Pilih nominal</label>
      <div class="chips">${presets.map((v) => `<button class="chip ${D.nominal === v ? "on" : ""}" data-v="${v}">${v >= 1e6 ? (v / 1e6).toLocaleString("id-ID") + "jt" : v / 1000 + "rb"}${v === pop ? '<span class="pop">sering dipilih</span>' : ""}</button>`).join("")}</div>
      <label class="f" for="d_nom">Atau masukkan nominal lain</label>
      <div class="inp"><span>Rp</span><input id="d_nom" inputmode="numeric" value="${D.nominal ? D.nominal.toLocaleString("id-ID") : ""}" placeholder="Minimal ${min.toLocaleString("id-ID")}"></div>
      <div class="err" id="d_err" hidden>Minimal donasi ${rp(min)}.</div>
      ${zak ? `<a class="btn ghost block" style="margin-top:12px" href="#/zakat" onclick="closeSheet()">${ic("calc", 18)} Belum tahu jumlahnya? Hitung dulu</a>` : ""}
      </div><div class="sheet-f"><div class="sumbar"><span>Total</span><b id="d_tot">${rp(D.nominal)}</b></div><button class="btn primary block" id="d_next">Lanjutkan</button></div>`;
    const inp = $("#d_nom"); fmtInput(inp);
    inp.addEventListener("input", () => { D.nominal = num(inp.value); $("#d_tot").textContent = rp(D.nominal); $("#d_err").hidden = true; $$(".chip").forEach((c) => c.classList.toggle("on", +c.dataset.v === D.nominal)); });
    $$(".chip").forEach((c) => (c.onclick = () => { inp.value = (+c.dataset.v).toLocaleString("id-ID"); inp.dispatchEvent(new Event("input")); }));
    $("#d_next").onclick = () => { if (D.nominal < min) { $("#d_err").hidden = false; inp.focus(); return; } D.step = 2; drawSheet(); };
    return;
  }
  const methods = [];
  if (CFG.gateway) methods.push(["gateway", "Bayar otomatis", "QRIS, virtual account bank, GoPay, OVO, DANA, ShopeePay · terkonfirmasi instan", "bolt", true]);
  if ((CFG.rekening || []).length) methods.push(["transfer", "Transfer bank", CFG.rekening.map((r) => r.bank).join(", ") + " · pakai kode unik", "bank"]);
  if (CFG.qris) methods.push(["qris", "QRIS cabang", "Pindai QRIS lalu ketik nominal tepat", "qr"]);
  if (!methods.find((m) => m[0] === D.metode) && methods[0]) D.metode = methods[0][0];
  s.innerHTML = sheetHead("Data & pembayaran") + `<div class="sheet-b">${pill()}
    <label class="f">Sapaan</label><div class="seg">${["Bapak", "Ibu", "Kak"].map((x) => `<button class="${D.sapaan === x ? "on" : ""}" data-sp="${x}">${x}</button>`).join("")}</div>
    <label class="f" for="d_nama">Nama <small>(opsional)</small></label><div class="inp"><input id="d_nama" value="${esc(D.nama)}" placeholder="Nama Anda" ${D.anonim ? "disabled" : ""}></div>
    <div class="toggle"><span>Sembunyikan nama saya<br><small style="color:var(--muted)">Tampil sebagai "Hamba Allah"</small></span><button class="sw ${D.anonim ? "on" : ""}" id="d_anon" role="switch" aria-checked="${D.anonim}" aria-label="Sembunyikan nama"></button></div>
    <label class="f" for="d_wa">WhatsApp untuk kuitansi otomatis <small>(dianjurkan)</small></label><div class="inp"><span>+62</span><input id="d_wa" inputmode="tel" value="${esc(D.wa)}" placeholder="812xxxxxxx"></div>
    <div class="err" id="d_werr" hidden>Nomor WhatsApp tampaknya belum lengkap.</div>
    <label class="f" for="d_doa">Doa atau pesan <small>(opsional, tampil di halaman program)</small></label><div class="inp"><textarea id="d_doa" placeholder="Semoga menjadi amal jariyah untuk orang tua kami">${esc(D.doa)}</textarea></div>
    <label class="f">Metode pembayaran</label>
    ${methods.length ? methods.map(([id, t, sub, icn, best]) => `<button class="pay ${D.metode === id ? "on" : ""}" data-m="${id}"><span class="pl">${ic(icn, 20)}</span><span><b>${t}${best ? ' <span class="tag i" style="margin-left:4px">Tercepat</span>' : ""}</b><small>${sub}</small></span><span class="rd"></span></button>`).join("")
      : `<div class="err">Metode pembayaran belum diatur oleh admin cabang.</div>`}
    <div class="err" id="d_perr" hidden></div>
    </div><div class="sheet-f"><div class="sumbar"><span>${esc(D.c.judul)}</span><b>${rp(D.nominal)}</b></div><button class="btn primary block" id="d_pay" ${methods.length ? "" : "disabled"}>Bayar ${rp(D.nominal)}</button></div>`;
  const keep = () => { const n = $("#d_nama"); if (n && !n.disabled) D.nama = n.value.trim(); D.wa = cleanWA($("#d_wa").value); D.doa = $("#d_doa").value.trim(); };
  $$("[data-sp]").forEach((b) => (b.onclick = () => { keep(); D.sapaan = b.dataset.sp; drawSheet(); }));
  $("#d_anon").onclick = () => { keep(); D.anonim = !D.anonim; drawSheet(); };
  $$("[data-m]").forEach((b) => (b.onclick = () => { keep(); D.metode = b.dataset.m; drawSheet(); }));
  $("#d_wa").oninput = () => ($("#d_werr").hidden = true);
  $("#d_pay").onclick = async () => {
    keep();
    if (D.wa && D.wa.length < 9) { $("#d_werr").hidden = false; $("#d_wa").focus(); return; }
    const btn = $("#d_pay"); btn.disabled = true; btn.textContent = "Memproses…";
    try {
      const r = await api("public/donations", { method: "POST", body: { campaign: D.c.slug, nominal: D.nominal, sapaan: D.sapaan, nama: D.anonim ? "" : D.nama, wa: D.wa, anonim: D.anonim, doa: D.doa,
        metode: D.metode, ref: refNow(), kotak_kode: kotakNow?.kode || "", pundi_kode: D.pundi } });
      profile.sapaan = D.sapaan; if (!D.anonim && D.nama) profile.nama = D.nama; if (D.wa) profile.wa = D.wa; store.set("profil", profile);
      const ids = store.get("riwayat", []); ids.push(r.id); store.set("riwayat", ids.slice(-100));
      closeSheet();
      if (r.payment_url) { location.href = r.payment_url; return; }
      location.hash = "#/bayar/" + r.id;
    } catch (x) { const e = $("#d_perr"); e.textContent = x.message; e.hidden = false; btn.disabled = false; btn.textContent = "Bayar " + rp(D.nominal); }
  };
}

/* ---------- Mulai ---------- */
(async function start() {
  try { [CFG, CAMPS] = await Promise.all([api("public/config"), api("public/campaigns")]); }
  catch (e) { view(`<div class="err-page">${ic("info", 40)}<p>Tidak bisa memuat aplikasi. Periksa koneksi internet Anda.</p><button class="btn ghost" onclick="location.reload()">Muat ulang</button></div>`); return; }
  document.title = `WIZ Cabang ${CFG.cabang} – Zakat, Infak & Sedekah`;
  if (!CFG.gateway && !(CFG.rekening || []).length && !CFG.qris) { const b = $("#demoBar"); b.textContent = "Aplikasi sedang disiapkan: metode pembayaran belum diatur oleh admin."; b.hidden = false; }
  if (refNow()) refInfo = await api("public/fundraiser/" + refNow()).catch(() => null);
  router();
})();

/* ---------- Slip setoran & surat persetujuan digital (tautan dari WhatsApp) ---------- */
let dokP = null;
function loadDok() {
  if (typeof DOK !== "undefined") return Promise.resolve();
  return dokP ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = "/assets/dokumen.js"; s.onload = ok; s.onerror = () => { dokP = null; no(new Error("Gagal memuat dokumen. Periksa sinyal.")); }; document.head.appendChild(s); });
}
async function dokPage(judul, data, render, nama, ket) {
  header(judul, "#/"); nav("");
  view(`<div class="card" style="text-align:center"><div class="skel" style="height:200px"></div><p class="hint">Menyiapkan dokumen…</p></div>`);
  await loadDok();
  const cv = await render(data);
  view(`<div class="card">${ket}</div><div class="dokprev"><img src="${cv.toDataURL("image/png")}" alt="${esc(judul)}"></div>
    <div class="row" style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost" style="flex:1" id="dk_dl">${ic("download", 20)} Unduh</button><button class="btn primary" style="flex:1" id="dk_sh">${ic("share", 20)} Bagikan</button></div>
    <p class="hint" style="text-align:center;margin-top:14px">Dokumen resmi WIZ Cabang ${esc(CFG.cabang)}. Pertanyaan? <a href="${waLink(CFG.wa_admin, "Assalamu'alaikum, saya ingin bertanya tentang " + judul.toLowerCase() + ".")}" target="_blank" rel="noopener">Chat admin</a></p>`);
  $("#dk_dl").onclick = () => DOK.download(cv, nama);
  $("#dk_sh").onclick = () => DOK.share(cv, nama, judul + " WIZ Cabang " + CFG.cabang);
}
route(/^#\/slip\/([\w-]+)$/, async (token) => {
  const s = await api("public/slip/" + token);
  await dokPage("Slip setoran ZIS", s, (d) => DOK.slip(d), `slip-${s.no}.png`,
    `<b>Jazakumullahu khairan, ${esc(s.nama)}.</b><p class="hint" style="margin:4px 0 0">Setoran No. ${esc(s.no)} sebesar <b>${rp(s.total)}</b> telah diterima petugas ${esc(s.petugas || "")}.${s.batal ? " <b style='color:#B42318'>Slip ini dibatalkan.</b>" : ""}</p>`);
});
route(/^#\/surat\/([\w-]+)$/, async (token) => {
  const s = await api("public/surat/" + token);
  await dokPage("Surat persetujuan", s, (d) => DOK.surat(d), `surat-persetujuan-${s.kode}.png`,
    `<b>Ahlan wa sahlan, ${esc(s.nama)}.</b><p class="hint" style="margin:4px 0 0">Anda terdaftar sebagai Donatur Pundi Sedekah dengan kode <b>${esc(s.kode)}</b>. Pundi dijemput petugas setiap bulan dan slip setoran dikirim ke WhatsApp Anda.</p>`);
});
