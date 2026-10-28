/* ============================================================
   Aplikasi petugas lapangan WIZ Cabang
   Tugas jemput · Peta sebaran · Pendaftaran donatur (+ lokasi GPS)
   Slip setoran (PNG ke WhatsApp) · Setoran ke bendahara · Amplop Ramadhan · Akun
   Memakai fungsi bersama dari admin.js dan penggambar dokumen dari dokumen.js
   ============================================================ */
"use strict";
const ST = {
  terlambat: ["Terlambat", "#DC2626"], segera: ["Segera jemput", "#EA7A0C"], antar: ["Perlu diantar", "#7C3AED"], menunggu: ["Belum waktunya", "#2563EB"],
  dijemput: ["Sudah dijemput", "#16A34A"], belum_kembali: ["Amplop belum kembali", "#D97706"], kembali: ["Amplop kembali", "#16A34A"], nonaktif: ["Nonaktif", "#9CA3AF"],
};
const JENIS = { pundi: ["Pundi", "P"], kotak: ["Kotak amal", "K"], amplop: ["Amplop", "A"] };
const TEMPAT = ["Kios / toko", "Rumah makan", "Masjid / musala", "Kantor / instansi", "Rumah warga", "Sekolah", "Lainnya"];
let TITIK = null, myPos = null;
const stTag = (s) => `<span class="tag" style="background:${ST[s][1]}1A;color:${ST[s][1]}">${ST[s][0]}</span>`;
const mapsUrl = (t) => `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`;
const jarak = (t) => {
  if (!myPos || t.lat == null) return "";
  const R = 6371e3, r = (d) => d * Math.PI / 180, a = Math.sin(r(t.lat - myPos.lat) / 2) ** 2 + Math.cos(r(myPos.lat)) * Math.cos(r(t.lat)) * Math.sin(r(t.lng - myPos.lng) / 2) ** 2;
  const m = 2 * R * Math.asin(Math.sqrt(a)); return m < 1000 ? Math.round(m) + " m" : (m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " km";
};
const wa0 = (w) => (w ? String(w).replace(/^62/, "") : "");
const bulanIni = () => new Date(Date.now() + 8 * 3600e3).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
async function loadTitik(force) { if (!TITIK || force) TITIK = await api("field/titik"); return TITIK; }

/* ---------- Antrean saat sinyal hilang ---------- */
const ANTRE = "wiz_antre";
const antreGet = () => { try { return JSON.parse(localStorage.getItem(ANTRE) || "[]"); } catch { return []; } };
const antreSet = (a) => { try { localStorage.setItem(ANTRE, JSON.stringify(a)); } catch { toast("Memori HP penuh, data tidak bisa disimpan sementara."); } };
const isNet = (e) => e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e?.message || "");
function antreBadge() { const n = antreGet().length, el = $("#net"); if (!el) return; el.hidden = !n; el.innerHTML = n ? `${ic("cloud", 16)} ${n} data menunggu sinyal · akan terkirim otomatis` : ""; }
async function flushAntre() {
  const list = antreGet(); antreBadge(); if (!list.length || !navigator.onLine) return;
  const sisa = [];
  for (const it of list) {
    try {
      if (it.jenis === "titik") { const r = await api("field/titik", { method: "POST", body: it.body }); if (r.t === "pundi") await kirimSurat(r.id, true, true); }
      if (it.jenis === "slip") { const r = await api("field/slips", { method: "POST", body: it.body }); await kirimSlip(r, true, true); }
      toast("Data tertunda berhasil dikirim");
    } catch (e) { if (isNet(e)) sisa.push(it); else toast("Data tertunda ditolak: " + e.message); }
  }
  antreSet(sisa); antreBadge(); TITIK = null;
}
addEventListener("online", () => flushAntre());

/* ---------- Leaflet (dimuat hanya saat peta dibuka) ---------- */
let leafletP = null;
function leaflet() {
  if (window.L) return Promise.resolve(window.L);
  return (leafletP ||= new Promise((ok, no) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => ok(window.L); s.onerror = () => { leafletP = null; no(new Error("Peta gagal dimuat. Periksa sinyal internet.")); };
    document.head.appendChild(s);
  }));
}
function baseLayers(L, map) {
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Imagery" });
  osm.addTo(map); L.control.layers({ Peta: osm, Satelit: sat }, null, { position: "topright" }).addTo(map);
}
const pinIcon = (L, t, big) => L.divIcon({ className: "", html: `<span class="pin pin-${t.t}${big ? " big" : ""}" style="--c:${ST[t.status][1]}">${JENIS[t.t][1]}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });

/* ---------- Ambil lokasi GPS (akurasi terbaik dalam ±25 detik) ---------- */
function ambilLokasi(onUpdate, onDone) {
  if (!("geolocation" in navigator)) { onDone(new Error("HP ini tidak mendukung GPS di browser.")); return () => {}; }
  let best = null, stop = false;
  const id = navigator.geolocation.watchPosition((p) => {
    const c = { lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) };
    if (!best || c.akurasi < best.akurasi) { best = c; onUpdate(c); }
    if (c.akurasi <= 12) end();
  }, (e) => { end(); if (!best) onDone(new Error(e.code === 1 ? "Izin lokasi ditolak. Izinkan akses lokasi untuk situs ini di pengaturan browser, lalu coba lagi." : "Sinyal GPS belum didapat. Pindah ke tempat terbuka lalu coba lagi.")); },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
  const t = setTimeout(end, 25000);
  function end() { if (stop) return; stop = true; clearTimeout(t); navigator.geolocation.clearWatch(id); if (best) onDone(null, best); }
  return end;
}
// Komponen isian lokasi untuk formulir
function lokasiWidget(host, awal) {
  let loc = awal && awal.lat != null ? { lat: awal.lat, lng: awal.lng, akurasi: awal.akurasi } : null, map = null, mk = null, stopFn = null;
  host.innerHTML = `<div class="loc"><div class="loc-st" id="loc_st"></div>
    <div class="loc-b"><button type="button" class="btn green sm" id="loc_go">${ic("gps", 18)} Ambil lokasi saya sekarang</button><button type="button" class="btn ghost sm" id="loc_pk">${ic("map", 18)} Pilih di peta</button></div>
    <div class="mini-map" id="loc_map" hidden></div>
    <p class="hint" style="margin:6px 0 0">Tekan tombol saat berdiri di depan rumah/titik. Geser pin bila posisinya kurang pas.</p>
    <label class="chk" style="margin-top:6px"><input type="checkbox" id="loc_nanti"> Lokasi menyusul (GPS bermasalah)</label></div>`;
  const show = () => {
    const el = $("#loc_st", host);
    if (!loc) { el.innerHTML = `<span class="tag st-pending">Belum ada lokasi</span>`; return; }
    const lv = loc.akurasi == null ? ["Dipilih di peta", "st-paid"] : loc.akurasi <= 20 ? ["Akurat", "st-paid"] : loc.akurasi <= 60 ? ["Cukup", "st-pending"] : ["Kurang akurat · tunggu / keluar ruangan", "st-failed"];
    el.innerHTML = `<span class="tag ${lv[1]}">${loc.akurasi != null ? "±" + loc.akurasi + " m · " : ""}${lv[0]}</span> <span class="mono">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</span>
      <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}" target="_blank" rel="noopener">Cek di Google Maps</a>`;
  };
  const showMap = async () => {
    const box = $("#loc_map", host); box.hidden = false;
    try {
      const L = await leaflet();
      const c = loc || myPos || { lat: -1.3905, lng: 120.7545 };
      if (!map) {
        map = L.map(box, { zoomControl: true }).setView([c.lat, c.lng], loc ? 18 : 14); baseLayers(L, map);
        mk = L.marker([c.lat, c.lng], { draggable: true, icon: L.divIcon({ className: "", html: `<span class="pin pin-new">${ic("pin", 18)}</span>`, iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(map);
        mk.on("dragend", () => { const p = mk.getLatLng(); loc = { lat: p.lat, lng: p.lng, akurasi: null }; show(); });
        map.on("click", (e) => { mk.setLatLng(e.latlng); loc = { lat: e.latlng.lat, lng: e.latlng.lng, akurasi: null }; show(); });
      } else { mk.setLatLng([c.lat, c.lng]); map.setView([c.lat, c.lng], 18); }
      setTimeout(() => map.invalidateSize(), 50);
    } catch (e) { box.innerHTML = `<p class="hint" style="padding:12px">${esc(e.message)}</p>`; }
  };
  $("#loc_go", host).onclick = (e) => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = `${ic("gps", 18)} Mencari sinyal GPS…`;
    stopFn = ambilLokasi((c) => { loc = c; show(); if (map) { mk.setLatLng([c.lat, c.lng]); map.setView([c.lat, c.lng], 18); } },
      (err, c) => { b.disabled = false; b.innerHTML = `${ic("gps", 18)} Ambil ulang lokasi`; if (err) toast(err.message); else { loc = c; myPos = c; show(); showMap(); } });
  };
  $("#loc_pk", host).onclick = showMap;
  show(); if (loc) showMap();
  return { get: () => ({ ...(loc || {}), lokasi_nanti: $("#loc_nanti", host).checked }), stop: () => stopFn && stopFn() };
}

/* ---------- Foto (opsional) ---------- */
function fotoWidget(host, url) {
  let data = null;
  host.innerHTML = `<label class="foto" for="ft_in">${url ? `<img src="${url}" alt="">` : `<span>${ic("camera", 26)}<br>Foto rumah/titik (opsional)</span>`}</label><input type="file" id="ft_in" accept="image/*" capture="environment" hidden>`;
  $("#ft_in", host).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { data = await resizeImage(f, 1280); $("label.foto", host).innerHTML = `<img src="${data}" alt="">`; } catch { toast("Foto gagal dibaca"); } };
  return () => data;
}

/* ============================================================
   TUGAS JEMPUT
   ============================================================ */
VIEWS.tugas = async () => {
  const d = await loadTitik(true);
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const f = { saya: q.has("semua") ? false : ME.role === "zisko", jenis: "", status: q.get("status") || "", cari: "", kec: "" };
  if (!myPos && navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { myPos = { lat: p.coords.latitude, lng: p.coords.longitude }; draw(); }, () => {}, { maximumAge: 300000, timeout: 8000 });
  const kecs = [...new Set(d.items.map((i) => i.kecamatan).filter(Boolean))].sort();
  main(`<div class="ph"><h1>Tugas jemput <small class="hint" style="font-weight:600">${bulanIni()}</small></h1><div class="acts">
      ${can("titik") ? `<button class="btn ghost sm" onclick="daftarForm({})">${ic("plus")} Daftarkan donatur</button>` : ""}
      ${can("slip") ? `<button class="btn primary sm" onclick="slipForm({})">${ic("receipt")} Input slip</button>` : ""}</div></div>
    <div id="kp"></div>
    <div class="fbar"><div class="inp grow"><input id="t_q" placeholder="Cari nama, kode, alamat"></div>
      <div class="inp"><select id="t_j"><option value="">Pundi & kotak</option><option value="pundi">Pundi saja</option><option value="kotak">Kotak saja</option></select></div>
      ${kecs.length > 1 ? `<div class="inp"><select id="t_k"><option value="">Semua kecamatan</option>${kecs.map((k) => `<option>${esc(k)}</option>`).join("")}</select></div>` : ""}
      <label class="chk" style="margin:0"><input type="checkbox" id="t_s" ${f.saya ? "checked" : ""}> Hanya tugas saya</label></div>
    <div class="segs" id="t_st"></div><div id="t_list"></div>`);
  function draw() {
    const base = d.items.filter((i) => i.t !== "amplop" && (!f.saya || i.pj_id === d.saya) && (!f.jenis || i.t === f.jenis) && (!f.kec || i.kecamatan === f.kec)
      && (!f.cari || [i.nama, i.kode, i.alamat, i.kelurahan, i.pemilik].join(" ").toLowerCase().includes(f.cari)));
    const cnt = {}; base.forEach((i) => (cnt[i.status] = (cnt[i.status] || 0) + 1));
    const aktif = base.filter((i) => i.status !== "nonaktif").length;
    $("#kp").innerHTML = `<div class="kpis"><div class="kpi hl"><small>Sudah dijemput</small><b>${cnt.dijemput || 0} / ${aktif}</b><div class="bar" style="margin-top:6px"><i style="width:${aktif ? (cnt.dijemput || 0) / aktif * 100 : 0}%"></i></div></div>
      <div class="kpi ${cnt.terlambat ? "warn" : ""}"><small>Terlambat</small><b>${cnt.terlambat || 0}</b><span>lewat tanggal jadwal</span></div>
      <div class="kpi"><small>Segera (≤3 hari)</small><b>${cnt.segera || 0}</b><span>${cnt.antar || 0} pundi perlu diantar</span></div>
      ${can("slip") ? `<a class="kpi ${d.kas_saya.total ? "warn" : ""}" href="#slip?tab=setoran"><small>Uang di tangan saya</small><b>${rp(d.kas_saya.total)}</b><span>${d.kas_saya.slip} slip belum disetor ke bendahara</span></a>` : ""}</div>`;
    $("#t_st").innerHTML = `<button class="${!f.status ? "on" : ""}" data-s="">Semua · ${base.length}</button>` + Object.keys(ST).filter((k) => cnt[k]).map((k) => `<button class="${f.status === k ? "on" : ""}" data-s="${k}"><i class="dot" style="background:${ST[k][1]}"></i>${ST[k][0]} · ${cnt[k]}</button>`).join("");
    $$("#t_st [data-s]").forEach((b) => b.onclick = () => { f.status = b.dataset.s; draw(); });
    let list = base.filter((i) => !f.status || i.status === f.status);
    if (myPos && !f.status) list = list.slice().sort((a, b) => (ST_ORDER[a.status] - ST_ORDER[b.status]) || dist(a) - dist(b));
    $("#t_list").innerHTML = list.map(kartu).join("") || `<div class="empty">${ic("box", 36)}<p>${d.items.length ? "Tidak ada titik untuk filter ini." : "Belum ada titik pundi atau kotak amal."}</p>${can("titik") ? `<button class="btn primary sm" onclick="daftarForm({})">${ic("plus")} Daftarkan donatur pertama</button>` : ""}</div>`;
    $$("#t_list [data-act]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); aksi(b.dataset.act, d.items.find((i) => i.t === b.dataset.t && i.id === +b.dataset.id)); });
    $$("#t_list .tc").forEach((c) => c.onclick = () => titikDetail(d.items.find((i) => i.t === c.dataset.t && i.id === +c.dataset.id)));
  }
  $("#t_q").oninput = () => { f.cari = val("t_q").toLowerCase(); draw(); };
  $("#t_j").onchange = () => { f.jenis = val("t_j"); draw(); };
  $("#t_k")?.addEventListener("change", () => { f.kec = val("t_k"); draw(); });
  $("#t_s").onchange = () => { f.saya = $("#t_s").checked; draw(); };
  draw();
};
const ST_ORDER = { terlambat: 0, segera: 1, antar: 2, belum_kembali: 3, menunggu: 4, dijemput: 5, kembali: 6, nonaktif: 7 };
const dist = (t) => (!myPos || t.lat == null ? 1e9 : Math.hypot(t.lat - myPos.lat, (t.lng - myPos.lng) * Math.cos(myPos.lat * Math.PI / 180)));
function kartu(t) {
  const j = jarak(t);
  return `<div class="tc" style="--c:${ST[t.status][1]}" data-t="${t.t}" data-id="${t.id}">
    <div class="tc-h"><span class="pin pin-${t.t}" style="--c:${ST[t.status][1]}">${JENIS[t.t][1]}</span><b>${esc(t.nama)}</b><span class="mono">${esc(t.kode || "-")}</span>${stTag(t.status)}</div>
    <div class="tc-b">${ic("pin", 15)} ${esc([t.alamat, t.kelurahan].filter(Boolean).join(", ") || "-")}${t.patokan ? " · " + esc(t.patokan) : ""}${j ? ` · <b>${j}</b>` : ""}${t.lat == null ? ` <span class="tag st-failed">lokasi belum ada</span>` : ""}</div>
    <div class="tc-m">${t.t === "amplop" ? esc(t.sub || "") : `Jadwal tgl ${t.jadwal}`} · ${t.terakhir ? `terakhir ${tglD(t.terakhir)} ${rp(t.terakhir_nominal)}` : "belum pernah dijemput"} · PJ ${esc(t.pj || "-")}</div>
    <div class="tc-a">
      ${t.status === "antar" && can("titik") ? `<button class="btn primary xs" data-act="serahkan" data-t="${t.t}" data-id="${t.id}">Serahkan & lengkapi</button>` : ""}
      ${t.status !== "antar" && t.status !== "nonaktif" && can("slip") && t.t !== "amplop" ? `<button class="btn ${t.status === "dijemput" ? "ghost" : "primary"} xs" data-act="slip" data-t="${t.t}" data-id="${t.id}">${ic("receipt", 15)} Input slip</button>` : ""}
      ${t.lat != null ? `<a class="btn ghost xs" href="${mapsUrl(t)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${ic("route", 15)} Rute</a>` : can("titik") ? `<button class="btn ghost xs" data-act="ubah" data-t="${t.t}" data-id="${t.id}">${ic("gps", 15)} Lengkapi lokasi</button>` : ""}
      ${t.wa ? `<a class="btn ghost xs" href="${waLink(t.wa, `Assalamu'alaikum ${t.t === "kotak" ? t.pemilik || "" : t.nama}, kami petugas WIZ Cabang ${PUB.cabang}. `)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${ic("wa", 15)} WA</a>` : ""}
    </div></div>`;
}
function aksi(act, t) {
  if (act === "slip") return slipForm(slipPre(t));
  if (act === "serahkan" || act === "ubah") return daftarForm(t);
}
function slipPre(t) {
  if (t.t === "amplop") return { sumber: "amplop", sumber_kode: t.kode, nama: t.nama, alamat: [t.alamat, t.kelurahan].filter(Boolean).join(", "), wa: wa0(t.wa) };
  return { sumber: t.t, sumber_kode: t.kode, nama: t.nama, alamat: [t.alamat, t.kelurahan].filter(Boolean).join(", "), wa: wa0(t.wa), pekerjaan: t.pekerjaan || "", rincian: t.t === "pundi" ? "pundi" : "infaq" };
}
async function titikDetail(t) {
  const row = (k, v) => (v ? `<div class="rr"><span>${k}</span><b>${v}</b></div>` : "");
  modal(`${esc(t.nama)} <span class="mono" style="font-size:13px;color:var(--muted)">${esc(t.kode || "")}</span>`, `${t.foto ? `<img src="${t.foto}" alt="" class="tfoto">` : ""}
    <div class="receipt" style="box-shadow:none;border:1px solid var(--line)">${row("Status", stTag(t.status))}${row("Jenis", JENIS[t.t][0] + (t.sub ? " · " + esc(t.sub) : ""))}
      ${row(t.t === "kotak" ? "Pemilik" : "Pekerjaan", esc(t.t === "kotak" ? t.pemilik : t.pekerjaan))}${row("WhatsApp", t.wa ? `<a href="${waLink(t.wa)}" target="_blank" rel="noopener">+${esc(t.wa)}</a>` : "")}
      ${row("Alamat", esc([t.alamat, t.kelurahan, t.kecamatan].filter(Boolean).join(", ")))}${row("Alamat kantor", esc(t.alamat_kantor))}${row("Patokan", esc(t.patokan))}
      ${row("Lokasi", t.lat != null ? `<a href="https://maps.google.com/?q=${t.lat},${t.lng}" target="_blank" rel="noopener">${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}</a>${t.akurasi ? " (±" + t.akurasi + " m)" : ""}` : "Belum ada")}
      ${t.t !== "amplop" ? row("Jadwal jemput", "Tanggal " + t.jadwal + " setiap bulan") : ""}${row("PJ / petugas", esc(t.pj))}
      ${row("Jemput terakhir", t.terakhir ? `${tglD(t.terakhir)} · ${rp(t.terakhir_nominal)}` : "Belum pernah")}${t.t !== "amplop" ? row("Bulan ini", rp(t.bulan_ini)) + row("Tahun ini", rp(t.tahun_ini)) : ""}
      ${row("Didaftarkan", t.didaftar_oleh ? esc(t.didaftar_oleh) + " · " + tglD(t.created_at) : "")}${row("Catatan", esc(t.catatan))}</div>
    ${can("lihat") && can("titik") && t.t !== "amplop" ? `<div class="sect">Pindah tugas & status</div><div class="fg">${field("td_pj", "Petugas penanggung jawab", t.pj_id || "", { sel: [["", "-"], ...FM.staff.filter((s) => ["zisko", "admin", "sekretaris", "bendahara"].includes(s.role)).map((s) => [s.id, s.nama])] })}
      ${field("td_st", "Status", t.status_raw, { sel: t.t === "kotak" ? [["aktif", "Aktif"], ["nonaktif", "Nonaktif (ditarik)"]] : [["baru", "Baru daftar"], ["diantar", "Perlu diantar"], ["aktif", "Aktif"], ["berhenti", "Berhenti"]] })}</div>
      <button class="btn ghost sm" id="td_save" style="margin-top:10px">Simpan perubahan</button>` : ""}`,
    `${t.t === "pundi" && t.surat_token ? `<button class="btn ghost sm" id="td_surat">${ic("receipt")} Surat persetujuan</button>` : ""}
     ${t.t !== "amplop" && can("titik") ? `<button class="btn ghost sm" id="td_ubah">Ubah data</button>` : ""}
     ${t.status !== "antar" && t.status !== "nonaktif" && can("slip") ? `<button class="btn primary sm" id="td_slip">${ic("receipt")} Input slip</button>` : ""}`);
  $("#td_slip")?.addEventListener("click", () => slipForm(slipPre(t)));
  $("#td_ubah")?.addEventListener("click", () => daftarForm(t));
  $("#td_surat")?.addEventListener("click", () => lihatSurat(t.id));
  $("#td_save")?.addEventListener("click", (e) => busy(e.target, async () => {
    await api(`field/titik/${t.t}/${t.id}/status`, { method: "POST", body: { status: val("td_st"), pj_id: val("td_pj") } }); closeModal(); toast("Perubahan disimpan"); TITIK = null; go();
  }));
}

/* ============================================================
   PENDAFTARAN DONATUR PUNDI / KOTAK AMAL (Surat Persetujuan + lokasi)
   ============================================================ */
function daftarForm(t = {}) {
  let jenis = t.t || "pundi";
  const ubah = !!t.id, cfg = FM.cfg;
  const pjSel = can("lihat") ? FM.staff.filter((s) => ["zisko", "admin", "sekretaris", "bendahara"].includes(s.role)).map((s) => [s.id, s.nama]) : null;
  const pkj = t.pekerjaan && !DOK.PEKERJAAN.includes(t.pekerjaan) ? "Lainnya" : t.pekerjaan || "";
  modal(ubah ? (t.status === "antar" ? "Serahkan pundi & lengkapi data" : "Ubah data " + esc(t.kode || "")) : "Pendaftaran donatur", `
    ${ubah ? "" : `<div class="segs" id="dj"><button class="on" data-j="pundi">${ic("coins", 16)} Pundi Sedekah (rumah)</button><button data-j="kotak">${ic("box", 16)} Kotak amal (kios/tempat)</button></div>`}
    <div id="d_pundi" ${jenis === "pundi" ? "" : "hidden"}>
      <p class="hint" style="margin-top:0">Sesuai <b>Surat Persetujuan Donatur Pundi Sedekah</b>. Surat bertanda tangan otomatis dikirim ke WhatsApp donatur.</p>
      <div class="fg">${field("dp_nama", "Nama lengkap *", t.t === "pundi" ? t.nama : "", { full: true })}
        ${field("dp_kerja", "Pekerjaan", pkj, { sel: [["", "Pilih pekerjaan"], ...DOK.PEKERJAAN.map((p) => [p, p])] })}${field("dp_kerja2", "Pekerjaan lainnya", pkj === "Lainnya" ? t.pekerjaan : "", { ph: "Contoh: pedagang gorengan" })}
        ${field("dp_kantor", "Alamat kantor / tempat usaha", t.alamat_kantor || "", { full: true })}
        ${field("dp_alamat", "Alamat rumah *", t.t === "pundi" ? t.alamat : "", { full: true, ph: "Jalan, nomor rumah, RT/RW" })}
        ${field("dp_kel", "Kelurahan / desa *", t.kelurahan || "")}${field("dp_kec", "Kecamatan *", t.kecamatan || "")}
        ${field("dp_pat", "Patokan rumah", t.patokan || "", { full: true, ph: "Contoh: depan masjid Al-Ikhlas, pagar hijau" })}
        ${field("dp_wa", "No. Handphone / WhatsApp *", wa0(t.wa), { pre: "+62", num: true })}
        <div><label class="f">Jumlah kaleng *</label><div class="step"><button type="button" data-d="-1">−</button><input id="dp_jml" inputmode="numeric" value="${t.jumlah || 1}"><button type="button" data-d="1">+</button></div></div></div></div>
    <div id="d_kotak" ${jenis === "kotak" ? "" : "hidden"}>
      <div class="fg">${field("dk_nama", "Nama lokasi / usaha *", t.t === "kotak" ? t.nama : "", { ph: "Contoh: Kios Barokah" })}${field("dk_jenis", "Jenis tempat", t.jenis_tempat || TEMPAT[0], { sel: TEMPAT.map((x) => [x, x]) })}
        ${field("dk_pem", "Nama pemilik / pengelola", t.pemilik || "")}${field("dk_wa", "WhatsApp pemilik", t.t === "kotak" ? wa0(t.wa) : "", { pre: "+62", num: true, hint: "Pemilik menerima slip setiap kotak dijemput (saksi)." })}
        ${field("dk_alamat", "Alamat *", t.t === "kotak" ? t.alamat : "", { full: true })}${field("dk_kel", "Kelurahan / desa", t.kelurahan || "")}${field("dk_kec", "Kecamatan", t.kecamatan || "")}
        ${field("dk_pat", "Patokan", t.patokan || "", { full: true })}</div></div>
    <div class="sect">Lokasi ${jenis === "kotak" ? "titik" : "rumah"} donatur *</div><div id="d_loc"></div>
    <div class="sect">Jadwal & petugas</div>
    <div class="fg">${field("d_jadwal", "Jemput setiap tanggal", t.jadwal || cfg.jemput_tanggal || 10, { sel: Array.from({ length: 28 }, (_, i) => [i + 1, "Tanggal " + (i + 1)]) })}
      ${pjSel ? field("d_pj", "Petugas penanggung jawab", t.pj_id || ME.id, { sel: pjSel }) : `<div><label class="f">Petugas penanggung jawab</label><div class="inp"><input value="${esc(t.pj || ME.nama)}" disabled></div></div>`}
      <div class="full" id="d_foto"></div></div>
    <div id="d_setuju" ${jenis === "pundi" ? "" : "hidden"}>
      <div class="sect">Persetujuan</div>
      <div class="fg">${field("dp_tgl", "Tanggal persetujuan", t.tgl_setuju || todayW(), { type: "date" })}
        <div><label class="chk" style="margin-top:30px"><input type="checkbox" id="dp_srh" ${t.status === "antar" || !ubah || t.status_raw === "aktif" ? "checked" : ""}> Kaleng sudah diserahkan</label></div></div>
      <label class="f">Tanda tangan donatur ${ubah && t.status !== "antar" ? "(kosongkan bila tidak berubah)" : ""}</label><div id="dp_ttd"></div>
      <label class="chk"><input type="checkbox" id="dp_kirim" checked> Kirim surat persetujuan ke WhatsApp donatur${FM.cfg.wa_on ? "" : " (WA otomatis belum aktif: surat dibagikan dari HP)"}</label></div>
    ${field("d_cat", "Catatan (opsional)", t.catatan || "", { full: true })}`,
    `<button class="btn ghost sm" onclick="closeModal()">Batal</button><button class="btn primary sm" id="d_save">${ic("check")} Simpan${jenis === "pundi" ? " & buat surat" : ""}</button>`, true);
  const lok = lokasiWidget($("#d_loc"), t);
  const foto = fotoWidget($("#d_foto"), t.foto);
  const ttd = DOK.pad($("#dp_ttd"), { ph: "Donatur tanda tangan di sini" });
  $$("#dj [data-j]").forEach((b) => b.onclick = () => {
    jenis = b.dataset.j; $$("#dj button").forEach((x) => x.classList.toggle("on", x === b));
    $("#d_pundi").hidden = $("#d_setuju").hidden = jenis !== "pundi"; $("#d_kotak").hidden = jenis !== "kotak";
    $("#d_save").innerHTML = `${ic("check")} Simpan${jenis === "pundi" ? " & buat surat" : ""}`;
  });
  $$(".step [data-d]").forEach((b) => b.onclick = () => { const i = $("#dp_jml"); i.value = Math.max(1, Math.min(50, num(i.value) + +b.dataset.d)); });
  const kerja = () => { $("#dp_kerja2").closest("div").parentElement.hidden = val("dp_kerja") !== "Lainnya"; }; $("#dp_kerja").onchange = kerja; kerja();
  $("#d_save").onclick = (e) => busy(e.target, async () => {
    const L = lok.get();
    const body = jenis === "pundi"
      ? { t: "pundi", id: t.t === "pundi" ? t.id : undefined, nama: val("dp_nama"), pekerjaan: val("dp_kerja") === "Lainnya" ? val("dp_kerja2") || "Lainnya" : val("dp_kerja"), alamat_kantor: val("dp_kantor"),
          alamat: val("dp_alamat"), kelurahan: val("dp_kel"), kecamatan: val("dp_kec"), patokan: val("dp_pat"), wa: val("dp_wa"), jumlah: num(val("dp_jml")), tgl_setuju: val("dp_tgl"), diserahkan: $("#dp_srh").checked, ttd: ttd.toDataURL() }
      : { t: "kotak", id: t.t === "kotak" ? t.id : undefined, nama_lokasi: val("dk_nama"), jenis_tempat: val("dk_jenis"), pemilik: val("dk_pem"), wa_pemilik: val("dk_wa"), alamat: val("dk_alamat"),
          kelurahan: val("dk_kel"), kecamatan: val("dk_kec"), patokan: val("dk_pat") };
    Object.assign(body, { lat: L.lat, lng: L.lng, akurasi: L.akurasi, lokasi_nanti: L.lokasi_nanti, jadwal: val("d_jadwal"), pj_id: $("#d_pj") ? val("d_pj") : undefined, catatan: val("d_cat"), foto: foto() });
    if (jenis === "pundi") {
      if (!body.nama || !body.alamat || !body.kelurahan || !body.kecamatan) throw new Error("Lengkapi nama, alamat rumah, kelurahan, dan kecamatan.");
      if (num(body.wa) < 1e8) throw new Error("Isi nomor handphone/WhatsApp donatur.");
      if (!ubah && !body.ttd && !confirmOnce(e.target, "Belum ada tanda tangan donatur. Tekan Simpan sekali lagi untuk tetap menyimpan.")) return;
    }
    if (L.lat == null && !L.lokasi_nanti && !(ubah && t.lat != null)) throw new Error("Ambil lokasi dulu (tombol Ambil lokasi saya sekarang), atau centang 'Lokasi menyusul'.");
    lok.stop();
    let r;
    try { r = await api("field/titik", { method: "POST", body }); }
    catch (x) {
      if (!isNet(x)) throw x;
      antreSet([...antreGet(), { jenis: "titik", body, at: Date.now() }]); antreBadge(); closeModal();
      return toast("Sinyal hilang. Data disimpan di HP dan akan dikirim otomatis.");
    }
    TITIK = null;
    if (r.t === "pundi") { await kirimSurat(r.id, jenis === "pundi" && $("#dp_kirim").checked); go(); }
    else { closeModal(); toast(`Kotak amal ${r.kode} tersimpan`); go(); }
  });
}
function confirmOnce(btn, msg) { if (btn.dataset.ok === "1") return true; btn.dataset.ok = "1"; mErr(msg); return false; }

// Gambar surat persetujuan → simpan PNG → kirim WA → tampilkan hasil
async function kirimSurat(id, kirim, diam) {
  const s = await api("field/surat/" + id);
  const cv = await DOK.surat(s);
  let r = { ok: false, info: "" };
  try { r = await api(`field/dok/surat/${id}`, { method: "POST", body: { png: DOK.jpg(cv), kirim: kirim && FM.cfg.wa_on } }); } catch (e) { r.info = e.message; }
  if (diam) return;
  hasilDok(cv, `surat-persetujuan-${s.kode}.png`, `Surat persetujuan ${s.kode} tersimpan`, kirim && FM.cfg.wa_on ? r.info : "WhatsApp otomatis belum aktif. Tekan Bagikan untuk mengirim gambar surat ke WhatsApp donatur.",
    `Assalamu'alaikum ${s.nama}, berikut surat persetujuan Donatur Pundi Sedekah WIZ Cabang ${PUB.cabang}. Jazakumullahu khairan.`, r.ok);
}
async function lihatSurat(id) { const s = await api("field/surat/" + id); const cv = await DOK.surat(s); hasilDok(cv, `surat-persetujuan-${s.kode}.png`, "Surat persetujuan " + s.kode, "", "", null, id); }
function hasilDok(cv, nama, judul, info, teks, ok, suratId) {
  modal(esc(judul), `${info ? `<div class="alert ${ok === false ? "" : "ok"}">${ic(ok === false ? "alert" : "check")}<span>${esc(info)}</span></div>` : ""}<div class="dokprev"><img src="${DOK.png(cv)}" alt="${esc(judul)}"></div>`,
    `${suratId ? `<button class="btn ghost sm" id="hd_wa">${ic("wa")} Kirim ulang ke WA</button>` : ""}<button class="btn ghost sm" id="hd_dl">${ic("download")} Unduh</button><button class="btn green sm" id="hd_sh">${ic("share")} Bagikan</button><button class="btn primary sm" onclick="closeModal()">Selesai</button>`, true);
  $("#hd_dl").onclick = () => DOK.download(cv, nama);
  $("#hd_sh").onclick = () => DOK.share(cv, nama, teks);
  $("#hd_wa")?.addEventListener("click", (e) => busy(e.target, async () => { const r = await api(`field/dok/surat/${suratId}`, { method: "POST", body: { png: DOK.jpg(cv), kirim: true } }); toast(r.info); }));
}

/* ============================================================
   SLIP SETORAN ZIS
   ============================================================ */
async function slipForm(pre = {}) {
  const t = TITIK || await loadTitik().catch(() => ({ items: [] }));
  const nomor = (await api("field/slip-berikut").catch(() => ({ no: "" }))).no;
  const lainCamps = FM.campaigns.filter((c) => !["zakat-maal", "pundi-sedekah", "infak-terbaik"].includes(c.slug));
  const ampOnly = ME.role === "amplop";
  const sumberOpt = ampOnly ? [["amplop", "Amplop Ramadhan"]] : [["langsung", "Setoran langsung (datang / dijemput)"], ["pundi", "Pundi Sedekah"], ["kotak", "Kotak amal"], ...(can("amplop") ? [["amplop", "Amplop Ramadhan"]] : [])];
  const kodeList = (s) => (t.items || []).filter((i) => i.t === s && i.status !== "nonaktif");
  const amCamp = FM.campaigns.find((c) => c.slug === "amplop-ramadhan");
  const pk = pre.pekerjaan && !DOK.PEKERJAAN.includes(pre.pekerjaan) ? "Lainnya" : pre.pekerjaan || "";
  modal("Input slip setoran ZIS", `<datalist id="kodes"></datalist>
    <div class="fg">${field("s_sumber", "Sumber setoran", pre.sumber || (ampOnly ? "amplop" : "langsung"), { sel: sumberOpt })}<div id="s_kode_w">${field("s_kode", "Kode titik", pre.sumber_kode || "", { list: "kodes", ph: "P-0001 / K-001 / AR-0001" })}</div>
      ${field("s_no", "No. slip", nomor, { hint: "Samakan dengan nomor di slip kertas bila ada." })}${field("s_tgl", "Tanggal", todayW(), { type: "date" })}</div>
    <div class="sect">Penyetor</div>
    <div class="inp" style="margin-bottom:8px">${ic("search", 18)}<input id="s_cari" placeholder="Cari donatur lama (nama / nomor WA)"></div><div class="list" id="s_hasil"></div>
    <div class="fg">${field("s_nama", "Nama *", pre.nama || "", { full: true })}${field("s_alamat", "Alamat (kantor / rumah)", pre.alamat || "", { full: true })}
      ${field("s_kab", "Kab./Kota", pre.kab || FM.cfg.kab_default || "")}${field("s_prov", "Provinsi", pre.provinsi || FM.cfg.provinsi_default || "")}
      ${field("s_wa", "Telp. / HP (WhatsApp)", pre.wa || "", { pre: "+62", num: true, hint: "Slip PNG dikirim ke nomor ini." })}${field("s_kerja", "Pekerjaan", pk, { sel: [["", "-"], ...DOK.PEKERJAAN.map((p) => [p, p])] })}</div>
    <div class="sect">Rincian setoran</div>
    <div class="rinci">
      ${ampOnly ? "" : `<label><span>Dana Zakat</span><div class="inp"><span>Rp</span><input id="r_zakat" inputmode="numeric"></div></label>
      <label><span>Pundi Sedekah</span><div class="inp"><span>Rp</span><input id="r_pundi" inputmode="numeric"></div></label>
      <label><span>Dana Infaq</span><div class="inp"><span>Rp</span><input id="r_infaq" inputmode="numeric"></div></label>`}
      <label class="lain"><span><select id="r_camp">${(ampOnly ? [amCamp].filter(Boolean) : lainCamps).map((c) => `<option value="${c.id}">${esc(c.judul)}</option>`).join("")}</select></span><div class="inp"><span>Rp</span><input id="r_lain" inputmode="numeric"></div></label>
      <div class="jml"><span>Jumlah</span><b id="r_tot">Rp0</b></div><p class="hint" id="r_tb" style="margin:2px 0 0;text-align:right"></p></div>
    <div class="sect">Cara setor</div>
    <div class="segs" id="s_cara"><button class="on" data-c="tunai">Tunai</button><button data-c="transfer">Transfer</button><button data-c="lainnya">Lainnya</button></div>
    <div id="s_cl_w" hidden>${field("s_cl", "Keterangan lainnya", "", { ph: "Contoh: emas, beras" })}</div>
    <label class="f">Tanda tangan penyetor (opsional)</label><div id="s_ttd"></div>
    ${FM.me_ttd === false ? `<div class="alert">${ic("alert")}<span>Tanda tangan Anda belum diatur, slip memakai nama Anda. <a href="#akun" onclick="closeModal()">Atur tanda tangan</a></span></div>` : ""}`,
    `<button class="btn ghost sm" id="s_prev">Pratinjau</button><button class="btn primary sm" id="s_save">${ic("check")} Simpan & kirim slip</button>`, true);
  const ttd = DOK.pad($("#s_ttd"), { ph: "Penyetor tanda tangan di sini" });
  let cara = "tunai";
  $$("#s_cara [data-c]").forEach((b) => b.onclick = () => { cara = b.dataset.c; $$("#s_cara button").forEach((x) => x.classList.toggle("on", x === b)); $("#s_cl_w").hidden = cara !== "lainnya"; });
  const ids = ["r_zakat", "r_pundi", "r_infaq", "r_lain"].filter((i) => $("#" + i));
  bindMoney(...ids);
  const total = () => ids.reduce((a, i) => a + num(val(i)), 0);
  const upd = () => { const n = total(); $("#r_tot").textContent = rp(n); $("#r_tb").textContent = n ? DOK.terbilang(n) : ""; };
  ids.forEach((i) => $("#" + i).addEventListener("input", upd));
  if (pre.rincian && $("#r_" + pre.rincian)) setTimeout(() => $("#r_" + pre.rincian).focus(), 300);
  const sumberUpd = () => {
    const s = val("s_sumber"); $("#s_kode_w").hidden = s === "langsung";
    $("#kodes").innerHTML = kodeList(s).map((i) => `<option value="${esc(i.kode)}">${esc(i.nama)}</option>`).join("");
    if (s === "amplop" && amCamp && $("#r_camp")) $("#r_camp").value = amCamp.id;
  };
  $("#s_sumber").onchange = () => { $("#s_kode").value = ""; sumberUpd(); }; sumberUpd();
  $("#s_kode").onchange = () => {
    const k = val("s_kode").toUpperCase(), it = (t.items || []).find((i) => i.kode === k);
    if (it) { const p = slipPre(it); $("#s_nama").value = p.nama; $("#s_alamat").value = p.alamat; $("#s_wa").value = p.wa; if (p.pekerjaan) $("#s_kerja").value = DOK.PEKERJAAN.includes(p.pekerjaan) ? p.pekerjaan : "Lainnya"; }
  };
  let tm; $("#s_cari").oninput = () => { clearTimeout(tm); tm = setTimeout(async () => {
    const qv = val("s_cari"); if (qv.length < 2) { $("#s_hasil").innerHTML = ""; return; }
    const rows = await api("field/donors?q=" + encodeURIComponent(qv)).catch(() => []);
    $("#s_hasil").innerHTML = rows.map((d, i) => `<a class="it" href="#" data-i="${i}"><span class="tx"><b>${esc(d.nama || "-")}</b><small>+${esc(d.wa)} · ${esc(d.alamat || "")}</small></span></a>`).join("") || `<p class="hint">Tidak ditemukan. Isi data baru di bawah.</p>`;
    $$("#s_hasil [data-i]").forEach((a) => a.onclick = (e) => { e.preventDefault(); const d = rows[+a.dataset.i];
      $("#s_nama").value = d.nama || ""; $("#s_alamat").value = [d.alamat, d.kelurahan].filter(Boolean).join(", "); $("#s_wa").value = wa0(d.wa);
      if (d.kab) $("#s_kab").value = d.kab; if (d.provinsi) $("#s_prov").value = d.provinsi; if (d.pekerjaan) $("#s_kerja").value = DOK.PEKERJAAN.includes(d.pekerjaan) ? d.pekerjaan : "Lainnya";
      $("#s_hasil").innerHTML = ""; $("#s_cari").value = ""; });
  }, 300); };
  const body = () => ({
    no: val("s_no"), tanggal: val("s_tgl"), sumber: val("s_sumber"), sumber_kode: val("s_kode").toUpperCase(), nama: val("s_nama"), alamat: val("s_alamat"), kab: val("s_kab"), provinsi: val("s_prov"),
    wa: val("s_wa"), pekerjaan: val("s_kerja"), cara, cara_lain: val("s_cl"), ttd_penyetor: ttd.toDataURL(),
    rincian: [["zakat", "r_zakat"], ["pundi", "r_pundi"], ["infaq", "r_infaq"]].filter(([, i]) => $("#" + i)).map(([k, i]) => ({ k, nominal: num(val(i)) }))
      .concat([{ k: "lain", nominal: num(val("r_lain")), campaign_id: val("r_camp"), label: $("#r_camp")?.selectedOptions[0]?.textContent || "" }]),
  });
  const cek = (b) => { if (!b.nama) throw new Error("Isi nama penyetor."); if (!total()) throw new Error("Isi minimal satu nominal."); if (b.sumber !== "langsung" && !b.sumber_kode) throw new Error("Isi kode titik (pundi/kotak/amplop)."); };
  $("#s_prev").onclick = async () => {
    try { const b = body(); cek(b); const cv = await DOK.slip({ ...b, no: b.no || nomor, cabang: PUB.cabang, total: total(), petugas: ME.nama, ttd_petugas: FM.me_ttd || null, ttd_penyetor: b.ttd_penyetor,
      wa: b.wa ? "0" + String(b.wa).replace(/\D/g, "").replace(/^(62|0)/, "") : "", rincian: b.rincian.map((r) => ({ ...r, label: r.k === "lain" ? r.label : r.k })) });
      const w = window.open(); if (w) { w.document.title = "Pratinjau slip"; w.document.body.style.margin = 0; w.document.body.innerHTML = `<img src="${DOK.png(cv)}" style="width:100%">`; } else toast("Izinkan pop-up untuk pratinjau.");
    } catch (e) { mErr(e.message); }
  };
  $("#s_save").onclick = (e) => busy(e.target, async () => {
    const b = body(); cek(b);
    let r;
    try { r = await api("field/slips", { method: "POST", body: b }); }
    catch (x) {
      if (!isNet(x)) throw x;
      antreSet([...antreGet(), { jenis: "slip", body: b, at: Date.now() }]); antreBadge(); closeModal();
      return toast("Sinyal hilang. Slip disimpan di HP dan dikirim otomatis saat sinyal kembali.");
    }
    TITIK = null;
    await kirimSlip(r, !!r.wa && FM.cfg.wa_on);
  });
}
// Gambar slip → simpan PNG → kirim WA → tampilkan hasil
async function kirimSlip(s, kirim, diam) {
  const cv = await DOK.slip(s);
  let r = { ok: false, info: "" };
  try { r = await api(`field/dok/slip/${encodeURIComponent(s.no)}`, { method: "POST", body: { png: DOK.png(cv), kirim } }); } catch (e) { r.info = e.message; }
  if (diam) return;
  hasilSlip(s, cv, kirim ? r.info : s.wa ? "WhatsApp otomatis belum aktif. Tekan Bagikan untuk mengirim gambar slip ke WhatsApp donatur." : "Slip tanpa nomor WhatsApp. Simpan atau bagikan dari HP.", kirim ? r.ok : null);
  if (location.hash.startsWith("#slip")) VIEWS.slip(); else if (location.hash.startsWith("#tugas") || location.hash.startsWith("#peta") || location.hash.startsWith("#amplop")) setTimeout(() => go(), 50);
}
function hasilSlip(s, cv, info, ok) {
  const nama = `slip-${s.no}.png`;
  modal(`Slip No. ${esc(s.no)}${s.batal ? " · DIBATALKAN" : ""}`, `${info ? `<div class="alert ${ok === false ? "" : "ok"}">${ic(ok === false ? "alert" : "check")}<span>${esc(info)}</span></div>` : ""}
    <div class="dokprev"><img src="${DOK.png(cv)}" alt="Slip setoran"></div>
    <p class="hint">Jumlah <b>${rp(s.total)}</b> · ${esc(s.cara)}${s.serah === "petugas" ? " · uang masih di petugas" : s.serah === "diterima" ? " · uang diterima " + esc(s.serah_oleh || "bendahara") : ""}${s.wa_status ? " · WA: " + esc(s.wa_status) : ""}</p>`,
    `${!s.batal && (can("keuangan") || s.petugas_id === ME.id) ? `<button class="btn danger sm" id="hs_x" style="margin-right:auto">Batalkan</button>` : ""}
     ${s.wa && !s.batal ? `<button class="btn ghost sm" id="hs_wa">${ic("wa")} Kirim ulang WA</button>` : ""}<button class="btn ghost sm" id="hs_dl">${ic("download")} Unduh</button>
     <button class="btn green sm" id="hs_sh">${ic("share")} Bagikan</button>${can("slip") && !s.batal ? `<button class="btn primary sm" id="hs_new">Slip baru</button>` : ""}`, true);
  $("#hs_dl").onclick = () => DOK.download(cv, nama);
  $("#hs_sh").onclick = () => DOK.share(cv, nama, `Assalamu'alaikum ${s.nama}, berikut slip setoran ZIS No. ${s.no} dari WIZ Cabang ${PUB.cabang}. Jazakumullahu khairan.`);
  $("#hs_new")?.addEventListener("click", () => slipForm({}));
  $("#hs_wa")?.addEventListener("click", (e) => busy(e.target, async () => { const r = await api(`field/dok/slip/${encodeURIComponent(s.no)}`, { method: "POST", body: { kirim: true } }); toast(r.info); }));
  $("#hs_x")?.addEventListener("click", (e) => { const b = e.currentTarget;
    if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Klik lagi untuk batalkan"; return; }
    busy(b, async () => { await api(`field/slips/${encodeURIComponent(s.no)}/batal`, { method: "POST", body: { alasan: "salah input" } }); closeModal(); toast("Slip dibatalkan"); go(); }); });
}
async function bukaSlip(no) { const s = await api("field/slips/" + encodeURIComponent(no)); hasilSlip(s, await DOK.slip(s), "", null); }

/* ---------- Halaman Slip & setoran ---------- */
VIEWS.slip = async () => {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  if (q.get("no")) { bukaSlip(q.get("no")).catch((e) => toast(e.message)); history.replaceState(null, "", "#slip"); }
  const tab = q.get("tab") || "slip";
  main(`<div class="ph"><h1>Slip & setoran</h1><div class="acts">${can("slip") ? `<button class="btn primary sm" onclick="slipForm({})">${ic("receipt")} Input slip</button>` : ""}</div></div>
    <div class="segs"><button class="${tab === "slip" ? "on" : ""}" onclick="location.hash='#slip'">Daftar slip</button><button class="${tab === "setoran" ? "on" : ""}" onclick="location.hash='#slip?tab=setoran'">${can("setoran") ? "Uang di petugas" : "Setoran saya"}</button></div><div id="sl"></div>`);
  if (tab === "setoran") return setoranView();
  const f = { q: "", page: 1 };
  const host = $("#sl");
  host.innerHTML = `<div class="fbar"><div class="inp grow"><input id="sl_q" placeholder="Cari no. slip, nama, WA, kode titik"></div></div><p class="sum" id="sl_sum"></p><div class="tw" id="sl_t"></div><div class="pager" id="sl_pg"></div>`;
  const load = async () => {
    const r = await api("field/slips?" + new URLSearchParams({ q: f.q, page: f.page }));
    $("#sl_sum").innerHTML = `<b>${r.total}</b> slip · jumlah sah <b>${rp(r.jumlah)}</b>${can("lihat") ? "" : " (slip yang Anda catat)"}`;
    $("#sl_t").innerHTML = `<table class="t"><thead><tr><th>No.</th><th>Tanggal</th><th>Penyetor</th><th>Sumber</th><th class="num">Jumlah</th><th>Petugas</th><th>Uang</th><th>WA</th></tr></thead><tbody>
      ${r.rows.map((s) => `<tr class="click" data-no="${esc(s.no)}"><td class="mono"><b>${esc(s.no)}</b>${s.batal ? '<small style="color:var(--danger)">batal</small>' : ""}</td><td>${tglD(s.tanggal + " 00:00:00")}</td>
        <td>${esc(s.nama)}<small>${s.wa ? esc(s.wa) : ""}</small></td><td>${esc(s.sumber)}${s.sumber_kode ? `<small class="mono">${esc(s.sumber_kode)}</small>` : ""}</td><td class="num">${rp(s.total)}</td><td>${esc(s.petugas || "-")}</td>
        <td>${s.batal ? "-" : s.serah === "petugas" ? '<span class="tag st-pending">di petugas</span>' : s.serah === "diterima" ? '<span class="tag st-paid">diterima</span>' : '<span class="tag i">transfer</span>'}</td>
        <td><small>${esc(s.wa_status || "-")}</small></td></tr>`).join("") || `<tr><td colspan="8" class="hint" style="text-align:center;padding:30px">Belum ada slip.</td></tr>`}</tbody></table>`;
    const pages = Math.ceil(r.total / 30);
    $("#sl_pg").innerHTML = pages > 1 ? `<button class="btn ghost xs" ${f.page <= 1 ? "disabled" : ""} id="pv">Sebelumnya</button> ${f.page} / ${pages} <button class="btn ghost xs" ${f.page >= pages ? "disabled" : ""} id="nx">Berikutnya</button>` : "";
    $("#pv")?.addEventListener("click", () => { f.page--; load(); }); $("#nx")?.addEventListener("click", () => { f.page++; load(); });
    $$("#sl_t tr[data-no]").forEach((tr) => tr.onclick = () => { const s = r.rows.find((x) => x.no === tr.dataset.no); DOK.slip(s).then((cv) => hasilSlip(s, cv, "", null)); });
  };
  let tm; $("#sl_q").oninput = () => { clearTimeout(tm); tm = setTimeout(() => { f.q = val("sl_q"); f.page = 1; load(); }, 300); };
  await load();
};
async function setoranView() {
  const d = await api("field/setoran");
  const host = $("#sl");
  if (!d.boleh_terima) {
    const g = d.petugas[0];
    host.innerHTML = `<div class="kpis"><div class="kpi ${g ? "warn" : "hl"}"><small>Uang di tangan Anda</small><b>${rp(g?.total || 0)}</b><span>${g ? g.slip.length + " slip belum diterima bendahara" : "Semua setoran sudah diterima. Jazakallahu khairan."}</span></div></div>
      ${g ? `<div class="alert ok">${ic("cash")}<span>Serahkan uang ke bendahara bersama nomor slipnya. Bendahara menandai diterima, lalu Anda mendapat WA bukti setoran.</span></div>${slipTabel(g.slip, false)}` : ""}
      <div class="sect">Riwayat diterima</div>${riwayatTabel(d.riwayat)}`;
    return;
  }
  const tot = d.petugas.reduce((a, g) => a + g.total, 0);
  host.innerHTML = `<div class="kpis"><div class="kpi ${tot ? "warn" : "hl"}"><small>Total uang di petugas</small><b>${rp(tot)}</b><span>${d.petugas.length} petugas</span></div></div>
    ${d.petugas.map((g) => `<div class="panel" style="margin-bottom:12px"><h2>${esc(g.nama)} <span class="tag i">${esc(ROLES[g.role] || g.role || "")}</span><b style="margin-left:auto">${rp(g.total)}</b></h2>
      ${slipTabel(g.slip, true, g.petugas_id)}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">${g.wa ? `<a class="btn ghost sm" href="${waLink(g.wa, `Assalamu'alaikum ${g.nama}, mohon setorkan uang ${rp(g.total)} (${g.slip.length} slip) ke bendahara. Jazakallahu khairan.`)}" target="_blank" rel="noopener">${ic("wa")} Ingatkan</a>` : ""}
      <button class="btn green sm" data-terima="${g.petugas_id}">${ic("check")} Terima yang dicentang</button></div></div>`).join("") || `<div class="empty">${ic("cash", 36)}<p>Tidak ada uang yang masih dipegang petugas.</p></div>`}
    <div class="sect">Riwayat diterima</div>${riwayatTabel(d.riwayat)}`;
  $$("[data-terima]").forEach((b) => b.onclick = () => {
    const pid = +b.dataset.terima, nos = $$(`input[data-cek="${pid}"]:checked`).map((c) => c.value);
    if (!nos.length) return toast("Centang slip yang uangnya sudah diterima.");
    const g = d.petugas.find((x) => x.petugas_id === pid), sum = g.slip.filter((s) => nos.includes(s.no)).reduce((a, s) => a + s.total, 0);
    modal("Terima setoran", `<p>Terima uang <b>${rp(sum)}</b> dari <b>${esc(g.nama)}</b> untuk ${nos.length} slip?</p><p class="hint">Pastikan uang fisik sudah dihitung dan cocok. ${esc(g.nama)} akan menerima WA bukti setoran.</p>`,
      `<button class="btn ghost sm" onclick="closeModal()">Batal</button><button class="btn green sm" id="tr_ok">Ya, sudah diterima</button>`);
    $("#tr_ok").onclick = (e) => busy(e.target, async () => { const r = await api("field/setoran/terima", { method: "POST", body: { petugas_id: pid, slip: nos } }); closeModal(); toast(`Diterima ${rp(r.total)} (${r.slip} slip)`); setoranView(); });
  });
  $$("[data-cekall]").forEach((c) => c.onchange = () => $$(`input[data-cek="${c.dataset.cekall}"]`).forEach((x) => (x.checked = c.checked)));
}
const slipTabel = (rows, cek, pid) => `<div class="tw"><table class="t"><thead><tr>${cek ? `<th><input type="checkbox" data-cekall="${pid}" checked></th>` : ""}<th>No. slip</th><th>Tanggal</th><th>Penyetor</th><th>Sumber</th><th class="num">Jumlah</th></tr></thead><tbody>
  ${rows.map((s) => `<tr>${cek ? `<td><input type="checkbox" data-cek="${pid}" value="${esc(s.no)}" checked></td>` : ""}<td class="mono"><a href="#slip?no=${esc(s.no)}">${esc(s.no)}</a></td><td>${tglD(s.tgl)}</td><td>${esc(s.penyetor || "-")}</td><td>${esc(s.sumber || "")} <span class="mono">${esc(s.kode || "")}</span></td><td class="num">${rp(s.total)}</td></tr>`).join("")}</tbody></table></div>`;
const riwayatTabel = (rows) => rows.length ? `<div class="tw"><table class="t"><thead><tr><th>Waktu</th><th>Petugas</th><th>Diterima oleh</th><th class="num">Slip</th><th class="num">Jumlah</th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td>${tgl(r.serah_at)}</td><td>${esc(r.nama)}</td><td>${esc(r.serah_oleh || "-")}</td><td class="num">${r.slip}</td><td class="num">${rp(r.total)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Belum ada riwayat.</p>`;

/* ============================================================
   PETA SEBARAN
   ============================================================ */
let MAP = null;
VIEWS.peta = async () => {
  const d = await loadTitik(true);
  const ada = { pundi: d.items.some((i) => i.t === "pundi"), kotak: d.items.some((i) => i.t === "kotak"), amplop: d.items.some((i) => i.t === "amplop") };
  const f = { jenis: new Set(Object.keys(ada).filter((k) => ada[k])), status: new Set(Object.keys(ST)), saya: false };
  const tanpa = d.items.filter((i) => i.lat == null);
  main(`<div class="ph"><h1>Peta sebaran <small class="hint" style="font-weight:600">${bulanIni()}</small></h1><div class="acts">${can("titik") ? `<button class="btn ghost sm" onclick="daftarForm({})">${ic("plus")} Daftarkan</button>` : ""}<button class="btn ghost sm" id="pm_me">${ic("gps")} Lokasi saya</button></div></div>
    <div class="petaf"><div class="segs" id="pf_j" style="margin:0">${Object.keys(ada).filter((k) => ada[k]).map((k) => `<button class="on" data-j="${k}"><span class="pin pin-${k} sm">${JENIS[k][1]}</span>${JENIS[k][0]}</button>`).join("")}
      ${d.items.some((i) => i.pj_id === d.saya) ? `<button data-saya="1">Hanya tugas saya</button>` : ""}</div>
      <div class="legend" id="pf_s"></div></div>
    <div class="peta" id="peta"><div class="hint" style="padding:20px">Memuat peta…</div></div>
    ${tanpa.length ? `<div class="alert" style="margin-top:12px">${ic("pin")}<span><b>${tanpa.length} titik belum punya lokasi:</b> ${tanpa.slice(0, 6).map((t) => esc(t.kode || t.nama)).join(", ")}${tanpa.length > 6 ? "…" : ""}. Buka <a href="#tugas">Tugas jemput</a> → Lengkapi lokasi.</span></div>` : ""}`);
  let L;
  try { L = await leaflet(); } catch (e) { $("#peta").style.height = "auto"; $("#peta").style.minHeight = "0"; $("#peta").innerHTML = `<div class="alert">${ic("alert")}<span>${esc(e.message)} Daftar titik tetap bisa dilihat di <a href="#tugas">Tugas jemput</a>.</span></div>`; return; }
  $("#peta").innerHTML = "";
  if (MAP) { try { MAP.remove(); } catch {} }
  const map = (MAP = L.map("peta", { zoomControl: true })); baseLayers(L, map);
  const layer = L.layerGroup().addTo(map);
  const pts = d.items.filter((i) => i.lat != null);
  function draw(fitView) {
    layer.clearLayers();
    const vis = pts.filter((t) => f.jenis.has(t.t) && f.status.has(t.status) && (!f.saya || t.pj_id === d.saya));
    vis.forEach((t) => {
      const m = L.marker([t.lat, t.lng], { icon: pinIcon(L, t), title: t.nama }).addTo(layer);
      m.bindPopup(`<div class="pop"><b>${esc(t.nama)}</b> <span class="mono">${esc(t.kode || "")}</span><br>${stTag(t.status)}<br>
        <small>${esc([t.alamat, t.kelurahan].filter(Boolean).join(", "))}</small><br>
        <small>${t.t === "amplop" ? esc(t.sub || "") : "Jadwal tgl " + t.jadwal} · PJ ${esc(t.pj || "-")}</small><br>
        <small>${t.terakhir ? `Terakhir ${tglD(t.terakhir)} · ${rp(t.terakhir_nominal)}` : "Belum pernah dijemput"}</small>
        <div class="pop-a"><a href="${mapsUrl(t)}" target="_blank" rel="noopener">Rute</a>${t.wa ? `<a href="${waLink(t.wa)}" target="_blank" rel="noopener">WA</a>` : ""}<a href="#" data-pd="${t.t}:${t.id}">Detail</a>
        ${can("slip") && t.t !== "amplop" && !["antar", "nonaktif"].includes(t.status) ? `<a href="#" data-ps="${t.t}:${t.id}">Input slip</a>` : ""}</div></div>`);
    });
    const cnt = {}; pts.filter((t) => f.jenis.has(t.t) && (!f.saya || t.pj_id === d.saya)).forEach((t) => (cnt[t.status] = (cnt[t.status] || 0) + 1));
    $("#pf_s").innerHTML = Object.keys(ST).filter((k) => cnt[k]).map((k) => `<button class="${f.status.has(k) ? "on" : ""}" data-st="${k}"><i class="dot" style="background:${ST[k][1]}"></i>${ST[k][0]} <b>${cnt[k]}</b></button>`).join("") || `<span class="hint">Belum ada titik berlokasi.</span>`;
    $$("#pf_s [data-st]").forEach((b) => b.onclick = () => { const k = b.dataset.st; f.status.has(k) ? f.status.delete(k) : f.status.add(k); draw(); });
    if (fitView) { if (vis.length) map.fitBounds(L.latLngBounds(vis.map((t) => [t.lat, t.lng])).pad(0.2), { maxZoom: 16 }); else map.setView([-1.3905, 120.7545], 13); }
  }
  map.on("popupopen", (e) => {
    const el = e.popup.getElement();
    $$("[data-pd]", el).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); const [t, id] = a.dataset.pd.split(":"); titikDetail(d.items.find((i) => i.t === t && i.id === +id)); });
    $$("[data-ps]", el).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); const [t, id] = a.dataset.ps.split(":"); slipForm(slipPre(d.items.find((i) => i.t === t && i.id === +id))); });
  });
  $$("#pf_j [data-j]").forEach((b) => b.onclick = () => { const k = b.dataset.j; f.jenis.has(k) ? f.jenis.delete(k) : f.jenis.add(k); b.classList.toggle("on", f.jenis.has(k)); draw(true); });
  $("#pf_j [data-saya]")?.addEventListener("click", (e) => { f.saya = !f.saya; e.currentTarget.classList.toggle("on", f.saya); draw(true); });
  let meMk = null;
  $("#pm_me").onclick = () => navigator.geolocation?.getCurrentPosition((p) => {
    myPos = { lat: p.coords.latitude, lng: p.coords.longitude };
    if (meMk) meMk.remove(); meMk = L.circleMarker([myPos.lat, myPos.lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(map).bindTooltip("Anda di sini");
    map.setView([myPos.lat, myPos.lng], 16);
  }, () => toast("Lokasi tidak bisa diambil. Izinkan akses lokasi."), { enableHighAccuracy: true, timeout: 10000 });
  draw(true);
  setTimeout(() => map.invalidateSize(), 100);
};

/* ============================================================
   AMPLOP RAMADHAN
   ============================================================ */
VIEWS.amplop = async () => {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const f = { status: q.get("status") || "", q: "", relawan: "" };
  const kelola = can("amplop_kelola"), relawan = FM.staff.filter((s) => s.role === "amplop");
  main(`<div class="ph"><h1>Amplop Ramadhan <small class="hint" style="font-weight:600">${esc(FM.cfg.amplop_periode || "")}</small></h1><div class="acts">
      ${kelola ? `<button class="btn ghost sm" id="am_buat">${ic("plus")} Buat amplop</button><button class="btn ghost sm" id="am_srh">Serahkan ke relawan</button>` : ""}
      ${can("slip") ? `<button class="btn primary sm" onclick="slipForm({sumber:'amplop'})">${ic("receipt")} Amplop kembali</button>` : ""}</div></div>
    <div id="am_k"></div>
    <div class="fbar"><div class="inp grow"><input id="am_q" placeholder="Cari kode, penerima, WA"></div>
      <div class="inp"><select id="am_s"><option value="">Semua status</option><option value="stok">Belum dibagikan</option><option value="dibagikan">Dibagikan (belum kembali)</option><option value="kembali">Kembali</option><option value="hilang">Hilang</option></select></div>
      ${kelola && relawan.length ? `<div class="inp"><select id="am_r"><option value="">Semua relawan</option>${relawan.map((r) => `<option value="${r.id}">${esc(r.nama)}</option>`).join("")}</select></div>` : ""}</div>
    <div id="am_t" class="tw"></div>`);
  $("#am_s").value = f.status;
  const AS = { stok: ["Belum dibagikan", "st-pending"], dibagikan: ["Belum kembali", "st-pending"], kembali: ["Kembali", "st-paid"], hilang: ["Hilang", "st-failed"] };
  const load = async () => {
    const r = await api("field/amplop?" + new URLSearchParams(Object.entries(f).filter(([, v]) => v)));
    const R = r.ringkas.reduce((a, x) => ({ n: a.n + x.n, stok: a.stok + x.stok, dibagikan: a.dibagikan + x.dibagikan, kembali: a.kembali + x.kembali, nominal: a.nominal + x.nominal }), { n: 0, stok: 0, dibagikan: 0, kembali: 0, nominal: 0 });
    $("#am_k").innerHTML = `<div class="kpis"><div class="kpi hl"><small>Terkumpul dari amplop</small><b>${rp(R.nominal)}</b><span>${R.kembali} amplop kembali</span></div>
      <div class="kpi"><small>${ME.role === "amplop" ? "Amplop saya" : "Total amplop"}</small><b>${R.n}</b><span>${R.stok} belum dibagikan</span></div>
      <div class="kpi ${R.dibagikan ? "warn" : ""}"><small>Belum kembali</small><b>${R.dibagikan}</b><span>sudah di tangan warga</span></div></div>
      ${kelola && r.ringkas.length ? `<div class="tw" style="margin-bottom:14px"><table class="t"><thead><tr><th>Relawan</th><th class="num">Amplop</th><th class="num">Belum dibagi</th><th class="num">Belum kembali</th><th class="num">Kembali</th><th class="num">Nominal</th></tr></thead><tbody>
        ${r.ringkas.map((x) => `<tr><td>${esc(x.relawan || "Belum diserahkan")}</td><td class="num">${x.n}</td><td class="num">${x.stok}</td><td class="num">${x.dibagikan}</td><td class="num">${x.kembali}</td><td class="num">${rp(x.nominal)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
    const aksiAm = (m) => `${m.status === "stok" || m.status === "dibagikan" ? `<button class="btn ghost xs" data-bg="${esc(m.kode)}">${m.status === "stok" ? "Bagikan" : "Ubah penerima"}</button>` : ""}
          ${m.status === "dibagikan" && can("slip") ? ` <button class="btn primary xs" data-kb="${esc(m.kode)}">Kembali</button>` : ""}${m.status === "dibagikan" ? ` <button class="btn danger xs" data-hl="${esc(m.kode)}">Hilang</button>` : ""}`;
    if (matchMedia("(max-width:860px)").matches) // HP: kartu agar tombol mudah ditekan
      $("#am_t").outerHTML = `<div id="am_t">${r.rows.map((m) => `<div class="tc" style="--c:${m.status === "kembali" ? "#16A34A" : m.status === "dibagikan" ? "#D97706" : m.status === "hilang" ? "#9CA3AF" : "#2563EB"};cursor:default">
        <div class="tc-h"><b class="mono">${esc(m.kode)}</b><span class="tag ${AS[m.status][1]}">${AS[m.status][0]}</span></div>
        <div class="tc-b">${m.nama ? `${ic("user", 15)} ${esc(m.nama)}${m.wa ? " · +" + esc(m.wa) : ""}` : "Belum ada penerima"}${m.alamat ? " · " + esc(m.alamat) : ""}${m.lat != null ? " · 📍" : ""}</div>
        ${m.nominal ? `<div class="tc-m">Kembali ${rp(m.nominal)} · <a href="#slip?no=${esc(m.slip_no)}">slip ${esc(m.slip_no)}</a></div>` : ""}
        <div class="tc-a">${aksiAm(m)}</div></div>`).join("") || `<div class="empty">${ic("mail", 36)}<p>${kelola ? "Belum ada amplop." : "Belum ada amplop yang diserahkan kepada Anda."}</p></div>`}</div>`;
    else $("#am_t").innerHTML = `<table class="t"><thead><tr><th>Kode</th><th>Status</th>${kelola ? "<th>Relawan</th>" : ""}<th>Penerima</th><th class="num">Nominal</th><th></th></tr></thead><tbody>
      ${r.rows.map((m) => `<tr><td class="mono"><b>${esc(m.kode)}</b><small>${esc(m.periode)}</small></td><td><span class="tag ${AS[m.status][1]}">${AS[m.status][0]}</span></td>${kelola ? `<td>${esc(m.relawan || "-")}</td>` : ""}
        <td>${esc(m.nama || "-")}<small>${esc([m.wa ? "+" + m.wa : "", m.alamat].filter(Boolean).join(" · "))}${m.lat != null ? " · 📍" : ""}</small></td><td class="num">${m.nominal ? rp(m.nominal) : "-"}${m.slip_no ? `<small><a href="#slip?no=${esc(m.slip_no)}">slip ${esc(m.slip_no)}</a></small>` : ""}</td>
        <td style="white-space:nowrap">${aksiAm(m)}</td></tr>`).join("")
      || `<tr><td colspan="6" class="hint" style="text-align:center;padding:30px">${kelola ? "Belum ada amplop. Tekan Buat amplop untuk membuat nomor seri." : "Belum ada amplop yang diserahkan kepada Anda."}</td></tr>`}</tbody></table>`;
    $$("[data-bg]").forEach((b) => b.onclick = () => bagikanForm(r.rows.find((m) => m.kode === b.dataset.bg), load));
    $$("[data-kb]").forEach((b) => b.onclick = () => { const m = r.rows.find((x) => x.kode === b.dataset.kb); slipForm({ sumber: "amplop", sumber_kode: m.kode, nama: m.nama || "", alamat: m.alamat || "", wa: wa0(m.wa) }); });
    $$("[data-hl]").forEach((b) => b.onclick = async () => { if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Yakin?"; return; } await api(`field/amplop/${b.dataset.hl}/status`, { method: "POST", body: { status: "hilang" } }); toast("Ditandai hilang"); load(); });
  };
  let tm; $("#am_q").oninput = () => { clearTimeout(tm); tm = setTimeout(() => { f.q = val("am_q"); load(); }, 300); };
  $("#am_s").onchange = () => { f.status = val("am_s"); load(); };
  $("#am_r")?.addEventListener("change", () => { f.relawan = val("am_r"); load(); });
  $("#am_buat")?.addEventListener("click", () => {
    modal("Buat nomor amplop", `<div class="fg">${field("ab_per", "Periode", FM.cfg.amplop_periode || "")}${field("ab_aw", "Awalan kode", "AR-")}${field("ab_n", "Jumlah amplop", "100", { num: true })}
      ${field("ab_r", "Langsung serahkan ke relawan (opsional)", "", { sel: [["", "Nanti saja"], ...relawan.map((r) => [r.id, r.nama])] })}</div><p class="hint">Nomor melanjutkan nomor terakhir dengan awalan yang sama. Tulis nomor ini di amplop fisik.</p>`,
      `<button class="btn primary sm" id="ab_s">Buat</button>`);
    $("#ab_s").onclick = (e) => busy(e.target, async () => { const r = await api("field/amplop/buat", { method: "POST", body: { periode: val("ab_per"), awalan: val("ab_aw"), jumlah: num(val("ab_n")), relawan_id: val("ab_r") } }); closeModal(); toast(`Amplop ${r.dari} s.d. ${r.sampai} dibuat`); load(); });
  });
  $("#am_srh")?.addEventListener("click", () => {
    modal("Serahkan amplop ke relawan", `<div class="fg">${field("as_r", "Relawan", "", { sel: [["", "Pilih relawan"], ...relawan.map((r) => [r.id, r.nama])] })}<div></div>${field("as_d", "Dari kode", "", { ph: "AR-0001" })}${field("as_s", "Sampai kode", "", { ph: "AR-0050" })}</div>
      ${relawan.length ? "" : `<p class="hint">Belum ada akun Relawan Amplop Ramadhan. Tambahkan di Pengaturan → Pengguna & peran.</p>`}`, `<button class="btn primary sm" id="as_s2">Serahkan</button>`);
    $("#as_s2").onclick = (e) => busy(e.target, async () => { const r = await api("field/amplop/serahkan", { method: "POST", body: { relawan_id: val("as_r"), dari: val("as_d"), sampai: val("as_s") } }); closeModal(); toast(`${r.jumlah} amplop diserahkan`); load(); });
  });
  await load();
};
function bagikanForm(m, after) {
  modal("Bagikan amplop " + esc(m.kode), `<div class="fg">${field("bg_nama", "Nama penerima *", m.nama || "")}${field("bg_wa", "WhatsApp", wa0(m.wa), { pre: "+62", num: true })}
    ${field("bg_al", "Alamat", m.alamat || "", { full: true })}${field("bg_kel", "Kelurahan / desa", m.kelurahan || "")}${field("bg_kec", "Kecamatan", m.kecamatan || "")}</div>
    <div class="sect">Lokasi rumah penerima</div><div id="bg_loc"></div>`, `<button class="btn primary sm" id="bg_s">${ic("check")} Simpan</button>`, true);
  const lok = lokasiWidget($("#bg_loc"), m);
  $("#bg_s").onclick = (e) => busy(e.target, async () => { const L = lok.get(); lok.stop();
    await api(`field/amplop/${m.kode}/bagikan`, { method: "POST", body: { nama: val("bg_nama"), wa: val("bg_wa"), alamat: val("bg_al"), kelurahan: val("bg_kel"), kecamatan: val("bg_kec"), lat: L.lat, lng: L.lng, akurasi: L.akurasi } });
    closeModal(); toast("Amplop dibagikan"); TITIK = null; after(); });
}

/* ============================================================
   AKUN SAYA
   ============================================================ */
VIEWS.akun = async () => {
  const me = await api("field/me");
  FM.me_ttd = me.ttd || false;
  main(`<div class="ph"><h1>Akun saya</h1></div>
    <div class="g2"><div class="panel"><h2>${ic("user")} ${esc(me.nama)}</h2>
      <div class="receipt" style="box-shadow:none;border:1px solid var(--line)"><div class="rr"><span>Peran</span><b>${esc(ME.role_label || me.role)}</b></div>${me.wa ? `<div class="rr"><span>WhatsApp</span><b>+${esc(me.wa)}</b></div>` : ""}
        ${me.email && !String(me.email).startsWith("wa:") ? `<div class="rr"><span>Email</span><b>${esc(me.email)}</b></div>` : ""}${me.wilayah ? `<div class="rr"><span>Wilayah</span><b>${esc(me.wilayah)}</b></div>` : ""}
        ${can("slip") ? `<div class="rr"><span>Uang di tangan</span><b>${rp(me.kas.total)} (${me.kas.slip} slip)</b></div>` : ""}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn ghost sm" id="ak_pw">Ganti kata sandi</button><button class="btn danger sm" id="ak_out">${ic("logout")} Keluar</button></div>
      <p class="hint" style="margin-top:14px">Tips: buka menu browser → <b>Tambahkan ke layar utama</b> agar aplikasi petugas bisa dibuka seperti aplikasi biasa.</p></div>
    ${can("slip") ? `<div class="panel"><h2>${ic("receipt")} Tanda tangan saya</h2><p class="hint" style="margin-top:0">Dipakai di kotak <b>Pengesahan Wahdah Inspirasi Zakat</b> pada setiap slip yang Anda buat.</p>
      ${me.ttd ? `<div class="ttd-now"><img src="${me.ttd}" alt="Tanda tangan"></div>` : ""}<div id="ak_ttd"></div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary sm" id="ak_ttd_s">${ic("check")} Simpan tanda tangan</button></div></div>` : ""}</div>`);
  const pad = can("slip") ? DOK.pad($("#ak_ttd"), { ph: me.ttd ? "Buat tanda tangan baru di sini" : "Tanda tangan di sini" }) : null;
  $("#ak_ttd_s")?.addEventListener("click", async () => { const d = pad.toDataURL(); if (!d) return toast("Buat tanda tangan dulu."); await api("field/me", { method: "PUT", body: { ttd: d } }); toast("Tanda tangan disimpan"); VIEWS.akun(); });
  $("#ak_out").onclick = async () => { try { localStorage.removeItem("wiz_boot"); } catch {} await api("admin/logout", { method: "POST" }); boot(); };
  $("#ak_pw").onclick = () => { modal("Ganti kata sandi", field("cp_l", "Kata sandi lama", "", { type: "password" }) + field("cp_b", "Kata sandi baru", "", { type: "password", hint: ["zisko", "amplop"].includes(ME.role) ? "Minimal 6 karakter." : "Minimal 8 karakter." }), `<button class="btn primary sm" id="cp_s">Simpan</button>`);
    $("#cp_s").onclick = (e) => busy(e.target, async () => { await api("admin/password", { method: "POST", body: { lama: $("#cp_l").value, baru: $("#cp_b").value } }); closeModal(); toast("Kata sandi diganti"); }); };
};
VIEWS.lapangan = VIEWS.tugas;
// Muat status tanda tangan petugas sekali (untuk peringatan di formulir slip)
(async () => { for (let i = 0; i < 40 && !FM; i++) await new Promise((r) => setTimeout(r, 250)); if (FM && can("slip")) api("field/me").then((m) => (FM.me_ttd = m.ttd || false)).catch(() => {}); })();
setInterval(antreBadge, 5000);
