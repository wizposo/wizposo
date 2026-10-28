/* ============================================================
   Dokumen WIZ: Slip Setoran ZIS & Surat Persetujuan Pundi Sedekah
   Digambar di <canvas> lalu disimpan sebagai PNG. Tata letak mengikuti
   slip cetak dan surat persetujuan resmi cabang; isian ditulis dengan
   gaya tulisan tangan (tinta biru) seperti diisi dengan pulpen.
   ============================================================ */
"use strict";
const DOK = (() => {
  const SANS = "Ubuntu, 'Trebuchet MS', 'Segoe UI', Roboto, Arial, sans-serif";
  const HAND = "Kalam, 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
  const SERIF = "'Times New Roman', Times, 'Liberation Serif', serif";
  const INK = "#1F2A5C", LABEL = "#3B403D", LINE = "#8C918E", TEAL = "#046B5C", ORANGE = "#F7941D";
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const PEKERJAAN = ["PNS", "Peg. Swasta", "Peg. BUMN", "TNI / POLRI", "Wiraswasta", "Profesional", "Lainnya"];

  /* ---------- Font & gambar ---------- */
  let fontsP = null;
  function fonts() {
    if (fontsP) return fontsP;
    if (!document.querySelector("link[data-dok-font]")) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.dokFont = "1";
      l.href = "https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Kalam:wght@400;700&display=swap";
      document.head.appendChild(l);
    }
    const faces = ["400 20px Ubuntu", "500 20px Ubuntu", "700 20px Ubuntu", "italic 400 20px Ubuntu", "italic 700 20px Ubuntu", "400 20px Kalam", "700 20px Kalam"];
    const wait = Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
    fontsP = Promise.race([wait, new Promise((r) => setTimeout(r, 3500))]); // jangan menunggu lama bila offline
    return fontsP;
  }
  const imgs = {};
  function img(src) {
    if (!src) return Promise.resolve(null);
    return (imgs[src] ||= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
  }

  /* ---------- Bantuan ---------- */
  const fmt = (n) => Math.round(n || 0).toLocaleString("id-ID");
  function terbilang(n) {
    n = Math.floor(Math.abs(n || 0));
    const s = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    const t = (x) => x < 12 ? s[x] : x < 20 ? t(x - 10) + " belas" : x < 100 ? t(Math.floor(x / 10)) + " puluh " + t(x % 10)
      : x < 200 ? "seratus " + t(x - 100) : x < 1000 ? t(Math.floor(x / 100)) + " ratus " + t(x % 100)
      : x < 2000 ? "seribu " + t(x - 1000) : x < 1e6 ? t(Math.floor(x / 1000)) + " ribu " + t(x % 1000)
      : x < 1e9 ? t(Math.floor(x / 1e6)) + " juta " + t(x % 1e6) : x < 1e12 ? t(Math.floor(x / 1e9)) + " miliar " + t(x % 1e9)
      : t(Math.floor(x / 1e12)) + " triliun " + t(x % 1e12);
    const w = (t(n).replace(/\s+/g, " ").trim() || "nol") + " rupiah";
    return w[0].toUpperCase() + w.slice(1);
  }
  const tglSlip = (ymd) => { const [y, m, d] = String(ymd || "").split("-").map(Number); return d ? `${d}-${m}-${y}` : ""; };
  // Tulis teks; perkecil huruf bila melebihi lebar
  function fit(x, text, X, Y, maxW, font, size, opt = {}) {
    text = String(text ?? ""); if (!text) return;
    let s = size; x.font = font.replace("{s}", s);
    while (x.measureText(text).width > maxW && s > size * 0.55) { s -= 1; x.font = font.replace("{s}", s); }
    x.fillStyle = opt.color || INK; x.textAlign = opt.align || "left"; x.textBaseline = "alphabetic";
    x.fillText(text, X, Y); x.textAlign = "left";
  }
  // Pecah teks menjadi beberapa baris sesuai lebar tiap baris
  function wrap(x, text, widths, font) {
    x.font = font; const words = String(text || "").split(/\s+/).filter(Boolean); const out = [];
    let line = "", i = 0;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (x.measureText(test).width > widths[Math.min(i, widths.length - 1)] && line) { out.push(line); line = w; i++; } else line = test;
    }
    if (line) out.push(line);
    return out;
  }
  function dotted(x, x1, x2, y, color = LINE, dash = [1.6, 3.2], w = 1.3) {
    x.save(); x.strokeStyle = color; x.lineWidth = w; x.setLineDash(dash); x.lineCap = "round";
    x.beginPath(); x.moveTo(x1, y); x.lineTo(x2, y); x.stroke(); x.restore();
  }
  function solid(x, x1, y1, x2, y2, color = "#6E7471", w = 1.2) { x.save(); x.strokeStyle = color; x.lineWidth = w; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); x.restore(); }
  function box(x, X, Y, w = 26, h = 20, checked = false) {
    x.save(); x.strokeStyle = "#4A4F4C"; x.lineWidth = 1.4; x.strokeRect(X, Y, w, h);
    if (checked) { // centang tulisan tangan
      x.strokeStyle = INK; x.lineWidth = 3.2; x.lineCap = "round"; x.lineJoin = "round";
      x.beginPath(); x.moveTo(X + 5, Y + h * 0.5); x.quadraticCurveTo(X + 9, Y + h * 0.75, X + 11, Y + h + 1); x.quadraticCurveTo(X + 17, Y, X + w + 3, Y - 4); x.stroke();
    }
    x.restore();
  }
  function text(x, t, X, Y, font, color = LABEL, align = "left") { x.font = font; x.fillStyle = color; x.textAlign = align; x.fillText(t, X, Y); x.textAlign = "left"; return x.measureText(t).width; }
  function drawFit(x, im, X, Y, W, H) {
    if (!im) return; const s = Math.min(W / im.width, H / im.height); const w = im.width * s, h = im.height * s;
    x.drawImage(im, X + (W - w) / 2, Y + (H - h) / 2, w, h);
  }
  function pekerjaanIdx(p) {
    const v = String(p || "").toLowerCase().replace(/\s/g, "");
    if (!v) return -1;
    const i = PEKERJAAN.findIndex((k) => k.toLowerCase().replace(/\s/g, "") === v);
    if (i >= 0) return i;
    if (/pns|asn|guru\s*pns/.test(v)) return 0; if (/swasta|karyawan/.test(v)) return 1; if (/bumn/.test(v)) return 2; if (/tni|polri|polisi/.test(v)) return 3;
    if (/wiraswasta|pedagang|usaha|dagang|jualan/.test(v)) return 4; if (/dokter|dosen|pengacara|profesional|bidan|perawat|notaris/.test(v)) return 5;
    return 6;
  }

  /* ---------- Logo mendatar (tanda WIZ + "WAHDAH INSPIRASI ZAKAT") ---------- */
  async function logoH(x, X, Y, h) {
    const lg = await img("/assets/logo.png");
    if (lg) { const sh = 158 * lg.height / 204; x.drawImage(lg, 0, 0, lg.width, sh, X, Y, h * lg.width / sh, h); }
    const tx = X + h * 440 / 158 + h * 0.16, fs = h * 0.29;
    ["WAHDAH", "INSPIRASI", "ZAKAT"].forEach((t, i) => text(x, t, tx, Y + fs * (1.02 + i * 1.12), `700 ${fs}px ${SANS}`, "#5B5F5D"));
  }

  /* ============================================================
     SLIP SETORAN ZIS (ukuran logis 1330 × 705, digambar 1,6×)
     ============================================================ */
  async function slip(d) {
    await fonts();
    const S = 1.4, W = 1330, H = 705; // 1862 × 987 px: tajam di WhatsApp, tetap ringan
    const cv = document.createElement("canvas"); cv.width = W * S; cv.height = H * S;
    const x = cv.getContext("2d"); x.scale(S, S);
    x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, W, H);

    // Ornamen sayap oranye kanan bawah
    x.save();
    let g = x.createLinearGradient(1330, 300, 1000, 705); g.addColorStop(0, "rgba(253,214,160,0.45)"); g.addColorStop(1, "rgba(253,226,190,0.18)");
    x.fillStyle = g; x.beginPath(); x.moveTo(1000, 705); x.bezierCurveTo(1100, 600, 1220, 500, 1330, 380); x.lineTo(1330, 460); x.bezierCurveTo(1240, 560, 1160, 640, 1095, 705); x.closePath(); x.fill();
    g = x.createLinearGradient(1330, 420, 1120, 705); g.addColorStop(0, "#F9A43A"); g.addColorStop(0.55, "#FBBF61"); g.addColorStop(1, "#FCD495");
    x.fillStyle = g; x.beginPath(); x.moveTo(1118, 705); x.bezierCurveTo(1190, 625, 1268, 545, 1330, 452); x.lineTo(1330, 705); x.closePath(); x.fill();
    x.fillStyle = "#FFFFFF"; x.globalAlpha = 0.95;
    x.beginPath(); x.moveTo(1205, 705); x.bezierCurveTo(1240, 660, 1290, 630, 1330, 622); x.lineTo(1330, 650); x.bezierCurveTo(1300, 660, 1268, 680, 1246, 705); x.closePath(); x.fill();
    x.beginPath(); x.ellipse(1300, 676, 26, 9, -0.55, 0, Math.PI * 2); x.fill();
    x.restore();

    // Kepala slip
    await logoH(x, 55, 12, 50);
    text(x, "SLIP SETORAN ZIS", 682, 88, `700 42px ${SANS}`, "#4F7D74", "center");
    text(x, "www.wiz.or.id", 1312, 86, `400 25px ${SANS}`, "#6D726F", "right");
    text(x, "No.", 48, 110, `400 19px ${SANS}`);
    text(x, String(d.no || ""), 98, 113, `400 34px ${SERIF}`, "#2A2A2A");
    text(x, "Bismillahirrahmanirrahim", 48, 151, `italic 400 19px ${SANS}`);

    // Cabang & tanggal
    let w = text(x, "Cabang", 348, 136, `400 20px ${SANS}`); text(x, " / Branch :", 348 + w, 136, `italic 400 13px ${SANS}`);
    solid(x, 500, 143, 965, 143);
    w = text(x, "Tanggal", 972, 147, `400 20px ${SANS}`); text(x, " / date :", 972 + w, 147, `italic 400 13px ${SANS}`);
    solid(x, 1105, 150, 1315, 150);
    // Nama / ID / Alamat
    text(x, "Nama", 45, 177, `400 20px ${SANS}`); text(x, ":", 230, 179, `400 20px ${SANS}`); dotted(x, 242, 975, 187);
    text(x, "ID Donatur :", 982, 202, `400 19px ${SANS}`); dotted(x, 1110, 1315, 208);
    w = text(x, "Alamat", 45, 212, `400 20px ${SANS}`); text(x, " (Kantor / Rumah)", 45 + w, 212, `400 11px ${SANS}`); text(x, ":", 230, 214, `400 20px ${SANS}`);
    dotted(x, 242, 975, 216); dotted(x, 242, 1315, 238);
    text(x, "Kab./Kota :", 242, 257, `400 17px ${SANS}`); dotted(x, 340, 582, 266);
    text(x, "Provinsi :", 584, 262, `400 17px ${SANS}`); dotted(x, 662, 985, 267);
    text(x, "Telp. / HP. :", 989, 262, `400 17px ${SANS}`); dotted(x, 1086, 1315, 268);
    // Pekerjaan
    text(x, "Pekerjaan", 40, 285, `400 20px ${SANS}`); text(x, ":", 228, 285, `400 20px ${SANS}`);
    const pk = pekerjaanIdx(d.pekerjaan);
    [[242, 287], [348, 390], [528, 570], [697, 739], [868, 908], [1042, 1082], [1208, 1248]].forEach(([bx, lx], i) => { box(x, bx, 268, 26, 20, pk === i); text(x, PEKERJAAN[i], lx, 286, `400 20px ${SANS}`); });

    // Tabel rincian
    const T = 297, RH = 38, CX = 830;
    x.save(); x.strokeStyle = "#7E8481"; x.lineWidth = 1.3;
    x.strokeRect(38, T, 1282, RH * 4);
    for (let i = 1; i < 4; i++) solid(x, 38, T + RH * i, 1320, T + RH * i, "#7E8481", 1.3);
    solid(x, CX, T, CX, T + RH * 4, "#7E8481", 1.3);
    x.strokeRect(CX, T + RH * 4, 1320 - CX, 40);
    x.restore();
    const rinc = Array.isArray(d.rincian) ? d.rincian : [];
    const sumK = (k) => rinc.filter((r) => r.k === k).reduce((a, r) => a + (+r.nominal || 0), 0);
    const lain = rinc.filter((r) => r.k === "lain");
    const rows = [["Dana Zakat", sumK("zakat")], ["Pundi Sedekah", sumK("pundi")], ["Dana Infaq", sumK("infaq")], ["", lain.reduce((a, r) => a + (+r.nominal || 0), 0)]];
    rows.forEach(([label, val], i) => {
      const y0 = T + RH * i, by = y0 + 28;
      box(x, 48, y0 + 9, 26, 20, val > 0);
      if (label) text(x, label, 85, by, `400 22px ${SANS}`);
      else { dotted(x, 86, 240, by + 2); if (lain.length) fit(x, lain.map((r) => r.label).join(", "), 88, by - 2, 380, `400 {s}px ${HAND}`, 22); }
      text(x, "Rp.", 867, by, `400 19px ${SANS}`); dotted(x, 905, 1120, by + 3);
      if (val > 0) fit(x, fmt(val), 915, by - 1, 200, `400 {s}px ${HAND}`, 30);
    });
    // Cara bayar & jumlah
    const JY = T + RH * 4 + 29;
    box(x, 40, JY - 18, 26, 20, d.cara === "tunai"); text(x, "Tunai", 76, JY, `500 20px ${SANS}`);
    box(x, 168, JY - 18, 26, 20, d.cara === "transfer"); text(x, "Transfer", 208, JY, `500 20px ${SANS}`);
    box(x, 328, JY - 18, 26, 20, d.cara === "lainnya"); w = text(x, "Lainnya :", 368, JY, `500 20px ${SANS}`);
    if (d.cara === "lainnya" && d.cara_lain) fit(x, d.cara_lain, 372 + w + 6, JY - 1, 250, `400 {s}px ${HAND}`, 22);
    text(x, "Jumlah", 722, JY, `italic 400 19px ${SANS}`);
    text(x, "Rp.", 846, JY, `400 19px ${SANS}`); dotted(x, 885, 1115, JY + 4);
    fit(x, fmt(d.total), 895, JY - 1, 215, `700 {s}px ${HAND}`, 31);

    // Kotak tanda tangan
    const BY = T + RH * 4 + 50, BH = 125;
    x.save(); x.strokeStyle = "#5E6461"; x.lineWidth = 1.4; x.strokeRect(32, BY, 620, BH); solid(x, 354, BY, 354, BY + BH, "#5E6461", 1.4); x.restore();
    solid(x, 45, BY + 92, 338, BY + 92, "#5E6461", 1.2); solid(x, 368, BY + 86, 637, BY + 86, "#5E6461", 1.2);
    text(x, "Pengesahan Wahdah Inspirasi Zakat", 193, BY + 114, `italic 700 14.5px ${SANS}`, "#2F3431", "center");
    text(x, "Tanda Tangan Penyetor", 503, BY + 108, `italic 700 14.5px ${SANS}`, "#2F3431", "center");
    const [tp, tq] = await Promise.all([img(d.ttd_petugas), img(d.ttd_penyetor)]);
    if (tp) drawFit(x, tp, 60, BY + 6, 260, 84); else if (d.petugas) fit(x, d.petugas, 192, BY + 72, 270, `700 {s}px ${HAND}`, 30, { align: "center" });
    if (tq) drawFit(x, tq, 380, BY + 6, 245, 78);
    if (d.petugas && tp) fit(x, d.petugas, 336, BY + 88, 200, `400 {s}px ${HAND}`, 15, { align: "right" });

    // Terbilang
    text(x, "Terbilang :", 721, BY + 26, `italic 400 19px ${SANS}`);
    [BY + 32, BY + 69, BY + 105].forEach((y) => dotted(x, 830, 1320, y, "#A7ACA9"));
    const tb = wrap(x, terbilang(d.total), [480, 480, 480], `400 22px ${HAND}`);
    tb.slice(0, 3).forEach((l, i) => fit(x, l, 836, BY + 27 + i * 37, 484, `400 {s}px ${HAND}`, 22));

    // Isian kepala
    fit(x, d.cabang || "", 600, 139, 360, `400 {s}px ${HAND}`, 32);
    fit(x, tglSlip(d.tanggal), 1112, 146, 200, `400 {s}px ${HAND}`, 29);
    fit(x, d.nama || "", 300, 182, 670, `400 {s}px ${HAND}`, 31);
    fit(x, d.id_donatur || "", 1114, 204, 200, `400 {s}px ${HAND}`, 22);
    const al = wrap(x, d.alamat || "", [670, 1060], `400 28px ${HAND}`);
    if (al[0]) fit(x, al[0], 300, 211, 670, `400 {s}px ${HAND}`, 28);
    if (al[1]) fit(x, al.slice(1).join(" "), 250, 234, 1060, `400 {s}px ${HAND}`, 26);
    fit(x, d.kab || "", 346, 262, 232, `400 {s}px ${HAND}`, 24);
    fit(x, d.provinsi || "", 666, 263, 316, `400 {s}px ${HAND}`, 24);
    fit(x, d.wa || "", 1090, 264, 224, `400 {s}px ${HAND}`, 22);

    // Kaki slip
    const LG = [["Lembar Putih", "Wahdah Inspirasi Zakat"], ["Lembar Kuning", "Donatur"], ["Lembar Merah", "Arsip"]];
    x.font = `700 13px ${SANS}`; const lw = Math.max(...LG.map(([a]) => x.measureText(a).width));
    LG.forEach(([a, b], i) => { text(x, a, 28, 648 + i * 19, `700 13px ${SANS}`, "#3F4441"); text(x, ": " + b, 28 + lw + 8, 648 + i * 19, `400 13px ${SANS}`, "#3F4441"); });
    text(x, "“Semoga Allah Ta’ala Memberkahi Zakat Infaq dan Sedekah ini”", 382, 660, `italic 700 21px ${SANS}`, "#2E3330");

    if (d.batal) {
      x.save(); x.translate(665, 380); x.rotate(-0.2); x.strokeStyle = "rgba(200,30,30,.85)"; x.lineWidth = 6; x.strokeRect(-260, -55, 520, 100);
      text(x, "DIBATALKAN", 0, 22, `700 64px ${SANS}`, "rgba(200,30,30,.85)", "center"); x.restore();
    }
    return cv;
  }

  /* ============================================================
     SURAT PERSETUJUAN PUNDI SEDEKAH (A4, 1241 × 1754 = 150 dpi)
     Latar memakai berkas resmi cabang; isian ditulis di atas titik-titik.
     ============================================================ */
  async function surat(d) {
    await fonts();
    const cv = document.createElement("canvas"); cv.width = 1241; cv.height = 1754;
    const x = cv.getContext("2d");
    x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, cv.width, cv.height);
    const bg = await img("/assets/surat-persetujuan.jpg");
    if (bg) x.drawImage(bg, 0, 0, cv.width, cv.height);
    const F = `400 {s}px ${HAND}`;
    const rows = [d.nama, d.pekerjaan, d.alamat_kantor, d.alamat, d.wa, d.jumlah ? `${d.jumlah} kaleng` : ""];
    [648, 741, 834, 927, 1021, 1114].forEach((y, i) => {
      const v = rows[i] || (i === 2 ? "-" : "");
      x.font = `400 30px ${HAND}`;
      if (i === 3 && x.measureText(String(v)).width > 700) { // alamat panjang: dua baris kecil
        const ls = wrap(x, v, [690, 690], `400 28px ${HAND}`);
        fit(x, ls[0], 452, y - 30, 700, F, 28); fit(x, ls.slice(1).join(" "), 452, y + 2, 700, F, 28);
      } else fit(x, v, 452, y, 700, F, 36);
    });
    // Tanggal: "Poso, 28 Oktober ,2026"
    const [yy, mm, dd] = String(d.tgl_setuju || "").split("-").map(Number);
    if (dd) { fit(x, `${dd} ${BULAN[mm - 1]}`, 634, 1410, 140, F, 32, { align: "center" }); fit(x, String(yy).slice(2), 741, 1418, 60, F, 32); }
    // Tanda tangan + nama
    const tt = await img(d.ttd);
    if (tt) drawFit(x, tt, 516, 1436, 260, 92);
    fit(x, `( ${d.nama || ""} )`, 646, 1578, 420, `500 {s}px ${SANS}`, 26, { align: "center", color: "#333333" });
    // Keterangan digital (kode & titik lokasi)
    const meta1 = [d.kode ? `Kode pundi ${d.kode}` : "", d.jadwal ? `jemput ± tgl ${d.jadwal} tiap bulan` : ""].filter(Boolean).join(" · ");
    const meta2 = d.lat != null && d.lng != null ? `Titik lokasi: ${(+d.lat).toFixed(6)}, ${(+d.lng).toFixed(6)}` : "";
    const meta3 = d.didaftar_oleh ? `Didaftarkan oleh ${d.didaftar_oleh}` : "";
    [meta1, meta2, meta3].filter(Boolean).forEach((m, i) => text(x, m, 1110, 180 + i * 26, `400 19px ${SANS}`, "#8A8F8C", "right"));
    return cv;
  }

  /* ---------- Tanda tangan di layar ---------- */
  function pad(host, opt = {}) {
    host.innerHTML = `<div class="ttd-pad"><canvas></canvas><span class="ttd-ph">${opt.ph || "Tanda tangan di sini"}</span><button type="button" class="ttd-x">Ulangi</button></div>`;
    const wrapEl = host.firstChild, cv = wrapEl.querySelector("canvas"), x = cv.getContext("2d"), ph = wrapEl.querySelector(".ttd-ph");
    let empty = true, drawing = false, last = null, minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
    const size = () => { const r = cv.getBoundingClientRect(), dpr = Math.max(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; x.scale(dpr, dpr); x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = "#1A1F4D"; };
    requestAnimationFrame(size);
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; last = pos(e); ph.hidden = true; });
    cv.addEventListener("pointermove", (e) => {
      if (!drawing) return; e.preventDefault(); const p = pos(e);
      x.lineWidth = e.pressure && e.pointerType === "pen" ? 1.5 + e.pressure * 2.5 : 2.6;
      x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p; empty = false;
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    });
    const end = () => { drawing = false; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    const clear = () => { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.restore(); empty = true; ph.hidden = false; minX = minY = 1e9; maxX = maxY = 0; };
    wrapEl.querySelector(".ttd-x").onclick = clear;
    return {
      isEmpty: () => empty, clear,
      // PNG transparan yang dipangkas ke area coretan agar ringan
      toDataURL() {
        if (empty) return null;
        const dpr = cv.width / cv.getBoundingClientRect().width, m = 6;
        const sx = Math.max(0, (minX - m) * dpr), sy = Math.max(0, (minY - m) * dpr), sw = Math.min(cv.width - sx, (maxX - minX + 2 * m) * dpr), sh = Math.min(cv.height - sy, (maxY - minY + 2 * m) * dpr);
        const k = Math.min(1, 600 / sw), o = document.createElement("canvas"); o.width = Math.max(1, sw * k); o.height = Math.max(1, sh * k);
        o.getContext("2d").drawImage(cv, sx, sy, sw, sh, 0, 0, o.width, o.height);
        return o.toDataURL("image/png");
      },
    };
  }

  /* ---------- Simpan / bagikan ---------- */
  const png = (cv) => cv.toDataURL("image/png");
  const jpg = (cv) => cv.toDataURL("image/jpeg", 0.9); // surat A4 berlatar foto: JPEG jauh lebih ringan
  async function blobOf(cv) { return new Promise((ok) => cv.toBlob(ok, "image/png")); }
  function download(cv, name) { const a = document.createElement("a"); a.href = png(cv); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  async function share(cv, name, textMsg) {
    try {
      const file = new File([await blobOf(cv)], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: textMsg || "" }); return true; }
    } catch (e) { if (e && e.name === "AbortError") return true; }
    download(cv, name); return false;
  }

  return { fonts, slip, surat, pad, png, jpg, share, download, terbilang, PEKERJAAN };
})();
