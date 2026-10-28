// Modul lapangan: titik Pundi Sedekah & kotak amal (dengan lokasi GPS), tugas jemput bulanan,
// peta sebaran, slip setoran ZIS (gambar PNG ke WhatsApp donatur), setoran uang petugas ke
// bendahara, dan Amplop Ramadhan.
import { PEKERJAAN } from "./schema.js";

const TZ = "+8 hours";
const toDate = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(String(s)) ? String(s) : String(s).replace(" ", "T") + "Z");
const witaOf = (s) => new Date(toDate(s).getTime() + 8 * 3600e3).toISOString(); // "YYYY-MM-DDTHH:MM..." waktu WITA
const witaNow = () => new Date(Date.now() + 8 * 3600e3).toISOString();
const rp = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tglIndo = (ymd) => { const [y, m, d] = String(ymd).split("-").map(Number); return `${d} ${BULAN[m - 1]} ${y}`; };
const STATUS_URUT = { terlambat: 0, segera: 1, antar: 2, belum_kembali: 3, menunggu: 4, dijemput: 5, kembali: 6, nonaktif: 7 };

export function fieldRoutes(R, H) {
  const { one, all, run, settings, requireAdmin, can, upsertDonor, markPaid, enqueue, sendWA, json, bad, HttpError, str, int, waFull, randomId, nowIso, saveDoc } = H;

  /* ---------- Bantuan ---------- */
  const anyOf = async (env, req, perms) => {
    const me = await requireAdmin(env, req, null);
    if (!perms.some((p) => can(me, p))) throw new HttpError(403, "Akun Anda tidak punya akses ke bagian ini.");
    return me;
  };
  const coord = (b, wajib) => {
    const lat = Number(b.lat), lng = Number(b.lng);
    const ok = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) && b.lat !== "" && b.lat != null;
    if (!ok) { if (wajib && !b.lokasi_nanti) throw bad("Ambil lokasi rumah/titik dulu (tombol Ambil lokasi), atau centang 'Lokasi menyusul'."); return { lat: null, lng: null, akurasi: null }; }
    return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, akurasi: Math.max(0, Math.min(99999, int(b.akurasi))) || null };
  };
  const jadwalOf = (v, cfg) => Math.min(28, Math.max(1, int(v) || cfg.jemput_tanggal || 10));
  const staffName = async (env, id) => (id ? (await one(env, "SELECT nama FROM admins WHERE id=?", int(id)))?.nama || null : null);
  const nextKode = async (env, table, prefix, pad) => {
    const rows = await all(env, `SELECT kode FROM ${table} WHERE kode LIKE ?`, prefix + "%");
    const max = rows.reduce((m, r) => Math.max(m, int(String(r.kode).slice(prefix.length))), 0);
    return prefix + String(max + 1).padStart(pad, "0");
  };
  const media = async (env, dataUrl, kind) => (dataUrl ? saveDoc(env, dataUrl, kind) : null);
  const idDonatur = (cfg, id) => (id ? `${cfg.kode_cabang || "WIZ"}-${String(id).padStart(5, "0")}` : "");
  const masked = (wa) => (wa ? "0" + String(wa).replace(/^62/, "").replace(/^(\d{3})\d+(\d{3})$/, "$1****$2") : "");
  const canEditTitik = (me, x) => can(me, "titik") && (me.role !== "zisko" || !x || !x.pj_id || x.pj_id === me.id || x.status === "baru");

  /* ---------- Data pendukung untuk aplikasi petugas ---------- */
  R("GET", "field/meta", async ({ env, req }) => {
    const me = await requireAdmin(env, req, null);
    const cfg = await settings(env);
    const staff = await all(env, "SELECT id,nama,role,wa,wilayah FROM admins WHERE aktif=1 ORDER BY nama");
    const camps = await all(env, "SELECT id,slug,judul,jenis_dana,status FROM campaigns WHERE status!='selesai' OR slug='amplop-ramadhan' ORDER BY urutan, id");
    return json({ staff, campaigns: camps, pekerjaan: PEKERJAAN, slip_berikut: await nextSlipNo(env),
      cfg: { cabang: cfg.cabang, kab_default: cfg.kab_default, provinsi_default: cfg.provinsi_default, kode_cabang: cfg.kode_cabang, jemput_tanggal: cfg.jemput_tanggal,
        kantor_alamat: cfg.kantor_alamat, call_center: cfg.call_center, amplop_periode: cfg.amplop_periode, wa_on: !!cfg.fonnte_token } });
  });
  R("GET", "field/donors", async ({ env, req, u }) => {
    await anyOf(env, req, ["slip", "titik"]);
    const k = "%" + str(u.searchParams.get("q"), 60) + "%";
    return json(await all(env, "SELECT id,nama,sapaan,wa,alamat,alamat_kantor,kab,provinsi,pekerjaan,kelurahan,kecamatan FROM donors WHERE nama LIKE ? OR wa LIKE ? ORDER BY updated_at DESC LIMIT 10", k, k));
  });
  R("GET", "field/me", async ({ env, req }) => {
    const me = await requireAdmin(env, req, null);
    const kas = await one(env, "SELECT COALESCE(SUM(total),0) total, COUNT(DISTINCT slip_no) slip FROM donations WHERE serah='petugas' AND status='paid' AND petugas_id=?", me.id);
    return json({ ...me, ttd: me.ttd_id ? `/api/admin/media/${me.ttd_id}` : null, kas });
  });
  R("PUT", "field/me", async ({ env, req, body }) => {
    const me = await requireAdmin(env, req, null);
    if (body.ttd) { const id = await media(env, body.ttd, "ttd"); await run(env, "UPDATE admins SET ttd_id=? WHERE id=?", id, me.id); }
    if (body.ttd === null) await run(env, "UPDATE admins SET ttd_id=NULL WHERE id=?", me.id);
    return json({ ok: true });
  });

  /* ---------- Titik: pundi, kotak, amplop + status jemput bulan ini ---------- */
  async function titikList(env, me, cfg) {
    const now = witaNow(), ym = now.slice(0, 7), day = +now.slice(8, 10);
    const pick = await all(env, `SELECT pundi_kode, kotak_kode, total, paid_at FROM donations WHERE status='paid' AND (pundi_kode IS NOT NULL OR kotak_kode IS NOT NULL) AND paid_at > datetime('now','-400 days')`);
    // Ringkas per titik: jemputan terakhir (dijumlah per hari), total bulan ini dan tahun ini
    const agg = {};
    for (const d of pick) {
      d.key = d.pundi_kode ? "P:" + d.pundi_kode : "K:" + d.kotak_kode; d.w = witaOf(d.paid_at);
      const a = (agg[d.key] ||= { last: null, lastTgl: null, lastSum: 0, bulan: 0, tahun: 0 });
      if (!a.last || d.paid_at > a.last) { a.last = d.paid_at; a.lastTgl = d.w.slice(0, 10); }
      if (d.w.slice(0, 7) === ym) a.bulan += d.total;
      if (d.w.slice(0, 4) === ym.slice(0, 4)) a.tahun += d.total;
    }
    for (const d of pick) if (d.w.slice(0, 10) === agg[d.key].lastTgl) agg[d.key].lastSum += d.total;
    const staff = Object.fromEntries((await all(env, "SELECT id,nama,wa FROM admins")).map((s) => [s.id, s]));
    const st = (x, a) => {
      if (["nonaktif", "berhenti"].includes(x.status)) return "nonaktif";
      if (x.t === "pundi" && ["baru", "diantar"].includes(x.status)) return "antar";
      if (a?.last && witaOf(a.last).slice(0, 7) === ym) return "dijemput";
      if (!a?.last && witaOf(x.created_at).slice(0, 7) === ym) return "menunggu"; // baru dipasang bulan ini
      const j = jadwalOf(x.jadwal, cfg);
      if (day > j) return "terlambat";
      return j - day <= 3 ? "segera" : "menunggu";
    };
    const items = [];
    if (can(me, "lapangan") || can(me, "peta") && me.role !== "amplop") {
      for (const p of await all(env, "SELECT * FROM pundi")) {
        const x = { ...p, t: "pundi" }, a = agg["P:" + p.kode];
        items.push({ t: "pundi", id: p.id, kode: p.kode, nama: p.nama, sub: `${p.jumlah} kaleng`, alamat: p.alamat, alamat_kantor: p.alamat_kantor, kelurahan: p.kelurahan, kecamatan: p.kecamatan,
          patokan: p.patokan, pekerjaan: p.pekerjaan, wa: p.wa, jumlah: p.jumlah, lat: p.lat, lng: p.lng, akurasi: p.akurasi, pj_id: p.pj_id, pj: staff[p.pj_id]?.nama || p.petugas, pj_wa: staff[p.pj_id]?.wa,
          jadwal: jadwalOf(p.jadwal, cfg), status_raw: p.status, status: st(x, a), terakhir: a?.last || null, terakhir_nominal: a?.lastSum || 0, bulan_ini: a?.bulan || 0, tahun_ini: a?.tahun || 0,
          foto: p.foto_id ? `/api/admin/media/${p.foto_id}` : null, surat_token: p.surat_token, tgl_setuju: p.tgl_setuju, catatan: p.catatan, didaftar_oleh: p.didaftar_oleh, created_at: p.created_at });
      }
      for (const k of await all(env, "SELECT * FROM kotak")) {
        const x = { ...k, t: "kotak" }, a = agg["K:" + k.kode];
        items.push({ t: "kotak", id: k.id, kode: k.kode, nama: k.nama_lokasi, sub: k.jenis_tempat || "Kotak amal", alamat: k.alamat, kelurahan: k.kelurahan, kecamatan: k.kecamatan, patokan: k.patokan,
          pemilik: k.pemilik, wa: k.wa_pemilik, jenis_tempat: k.jenis_tempat, lat: k.lat, lng: k.lng, akurasi: k.akurasi, pj_id: k.pj_id, pj: staff[k.pj_id]?.nama || k.pj, pj_wa: staff[k.pj_id]?.wa,
          jadwal: jadwalOf(k.jadwal, cfg), status_raw: k.status, status: st(x, a), terakhir: a?.last || null, terakhir_nominal: a?.lastSum || 0, bulan_ini: a?.bulan || 0, tahun_ini: a?.tahun || 0,
          foto: k.foto_id ? `/api/admin/media/${k.foto_id}` : null, catatan: k.catatan, created_at: k.created_at });
      }
    }
    if (can(me, "amplop")) {
      const own = me.role === "amplop";
      for (const m of await all(env, `SELECT * FROM amplop WHERE status IN ('dibagikan','kembali','hilang') ${own ? "AND relawan_id=?" : ""}`, ...(own ? [me.id] : []))) {
        items.push({ t: "amplop", id: m.id, kode: m.kode, nama: m.nama || "Penerima amplop", sub: m.periode, alamat: m.alamat, kelurahan: m.kelurahan, kecamatan: m.kecamatan, wa: m.wa,
          lat: m.lat, lng: m.lng, akurasi: m.akurasi, pj_id: m.relawan_id, pj: staff[m.relawan_id]?.nama, pj_wa: staff[m.relawan_id]?.wa, status_raw: m.status,
          status: m.status === "kembali" ? "kembali" : m.status === "hilang" ? "nonaktif" : "belum_kembali", terakhir: m.kembali_at, terakhir_nominal: m.nominal, created_at: m.dibagikan_at });
      }
    }
    items.sort((a, b) => STATUS_URUT[a.status] - STATUS_URUT[b.status] || (a.kecamatan || "").localeCompare(b.kecamatan || "") || String(a.kode).localeCompare(String(b.kode)));
    return { bulan: ym, hari: day, items };
  }
  R("GET", "field/titik", async ({ env, req }) => {
    const me = await anyOf(env, req, ["lapangan", "peta", "amplop"]);
    const cfg = await settings(env);
    const data = await titikList(env, me, cfg);
    const kas = await one(env, "SELECT COALESCE(SUM(total),0) total, COUNT(DISTINCT slip_no) slip FROM donations WHERE serah='petugas' AND status='paid' AND petugas_id=?", me.id);
    return json({ ...data, saya: me.id, kas_saya: kas });
  });

  // Daftarkan / lengkapi titik (formulir Surat Persetujuan Pundi Sedekah atau kotak amal)
  R("POST", "field/titik", async ({ env, req, body }) => {
    const me = await requireAdmin(env, req, "titik");
    const cfg = await settings(env);
    const t = body.t === "kotak" ? "kotak" : "pundi";
    const id = int(body.id) || null;
    const ex = id ? await one(env, `SELECT * FROM ${t} WHERE id=?`, id) : null;
    if (id && !ex) throw new HttpError(404, "Data tidak ditemukan.");
    if (ex && !canEditTitik(me, ex)) throw new HttpError(403, "Titik ini dipegang petugas lain. Minta admin untuk memindahkan.");
    const loc = coord(body, !ex);
    const keepLoc = ex && loc.lat == null ? { lat: ex.lat, lng: ex.lng, akurasi: ex.akurasi } : loc;
    const pjId = me.role === "zisko" && !can(me, "lihat") ? (ex?.pj_id || me.id) : int(body.pj_id) || ex?.pj_id || me.id;
    const pjNama = await staffName(env, pjId);
    const jadwal = jadwalOf(body.jadwal, cfg);
    const foto = body.foto ? await media(env, body.foto, "foto") : ex?.foto_id || null;

    if (t === "pundi") {
      const nama = str(body.nama, 80), wa = waFull(body.wa);
      if (!nama) throw bad("Nama lengkap wajib diisi.");
      if (wa.length < 11) throw bad("Nomor handphone/WhatsApp wajib diisi dengan benar.");
      if (!str(body.alamat)) throw bad("Alamat rumah wajib diisi.");
      const data = { nama, pekerjaan: str(body.pekerjaan, 60), alamat: str(body.alamat, 200), alamat_kantor: str(body.alamat_kantor, 200), kelurahan: str(body.kelurahan, 60), kecamatan: str(body.kecamatan, 60),
        kab: cfg.kab_default, provinsi: cfg.provinsi_default, lat: keepLoc.lat, lng: keepLoc.lng };
      const donorId = await upsertDonor(env, wa, data);
      const ttd = body.ttd ? await media(env, body.ttd, "ttd") : ex?.ttd_id || null;
      const jumlah = Math.min(50, Math.max(1, int(body.jumlah) || 1));
      const tgl = /^\d{4}-\d{2}-\d{2}$/.test(body.tgl_setuju || "") ? body.tgl_setuju : ex?.tgl_setuju || witaNow().slice(0, 10);
      const status = body.diserahkan === false ? (ex?.status === "aktif" ? "aktif" : "diantar") : "aktif";
      let kode = ex?.kode || null;
      if (!kode) kode = await nextKode(env, "pundi", "P-", 4);
      const token = ex?.surat_token || randomId(20).toLowerCase();
      const vals = [kode, nama, wa, data.alamat, data.alamat_kantor || null, data.kelurahan || null, data.kecamatan || null, str(body.patokan, 120) || null, data.pekerjaan || null, jumlah,
        status, pjNama, pjId, donorId, keepLoc.lat, keepLoc.lng, keepLoc.akurasi, jadwal, foto, ttd, token, tgl, str(body.catatan, 300) || null];
      let pid = id;
      if (ex) await run(env, `UPDATE pundi SET kode=?,nama=?,wa=?,alamat=?,alamat_kantor=?,kelurahan=?,kecamatan=?,patokan=?,pekerjaan=?,jumlah=?,status=?,petugas=?,pj_id=?,donor_id=?,lat=?,lng=?,akurasi=?,jadwal=?,foto_id=?,ttd_id=?,surat_token=?,tgl_setuju=?,catatan=? WHERE id=?`, ...vals, id);
      else pid = (await run(env, `INSERT INTO pundi(kode,nama,wa,alamat,alamat_kantor,kelurahan,kecamatan,patokan,pekerjaan,jumlah,status,petugas,pj_id,donor_id,lat,lng,akurasi,jadwal,foto_id,ttd_id,surat_token,tgl_setuju,catatan,didaftar_oleh,waktu_jemput)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ...vals, me.nama, "tgl " + jadwal)).meta.last_row_id;
      await enqueue(env, "pundi", pid);
      return json({ ok: true, t, id: pid, kode, surat_token: token, donor_id: donorId, id_donatur: idDonatur(cfg, donorId), pj: pjNama }, ex ? 200 : 201);
    }

    const nama = str(body.nama_lokasi || body.nama, 100);
    if (!nama) throw bad("Nama lokasi/usaha wajib diisi.");
    if (!str(body.alamat)) throw bad("Alamat wajib diisi.");
    const waP = waFull(body.wa_pemilik); if (body.wa_pemilik && waP.length < 11) throw bad("Nomor WhatsApp pemilik belum lengkap.");
    let kode = ex?.kode || str(body.kode, 20).toUpperCase() || await nextKode(env, "kotak", "K-", 3);
    if (!ex && await one(env, "SELECT id FROM kotak WHERE kode=?", kode)) throw bad("Kode kotak sudah dipakai.");
    const vals = [nama, str(body.alamat, 200), str(body.pemilik, 60) || null, waP || null, pjNama, str(body.kelurahan, 60) || null, str(body.kecamatan, 60) || null, str(body.patokan, 120) || null,
      str(body.jenis_tempat, 40) || null, keepLoc.lat, keepLoc.lng, keepLoc.akurasi, jadwal, pjId, foto, str(body.catatan, 300) || null];
    let kid = id;
    if (ex) await run(env, "UPDATE kotak SET nama_lokasi=?,alamat=?,pemilik=?,wa_pemilik=?,pj=?,kelurahan=?,kecamatan=?,patokan=?,jenis_tempat=?,lat=?,lng=?,akurasi=?,jadwal=?,pj_id=?,foto_id=?,catatan=? WHERE id=?", ...vals, id);
    else kid = (await run(env, "INSERT INTO kotak(nama_lokasi,alamat,pemilik,wa_pemilik,pj,kelurahan,kecamatan,patokan,jenis_tempat,lat,lng,akurasi,jadwal,pj_id,foto_id,catatan,kode) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", ...vals, kode)).meta.last_row_id;
    await enqueue(env, "kotak", kode);
    return json({ ok: true, t, id: kid, kode, pj: pjNama }, ex ? 200 : 201);
  });
  R("POST", "field/titik/:t/:id/status", async ({ env, req, p, body }) => {
    const me = await requireAdmin(env, req, "titik");
    const t = p.t === "kotak" ? "kotak" : "pundi";
    const ex = await one(env, `SELECT * FROM ${t} WHERE id=?`, int(p.id)); if (!ex) throw new HttpError(404, "Data tidak ditemukan.");
    if (!canEditTitik(me, ex)) throw new HttpError(403, "Titik ini dipegang petugas lain.");
    const ok = t === "kotak" ? ["aktif", "nonaktif"] : ["baru", "diantar", "aktif", "berhenti"];
    if (!ok.includes(body.status)) throw bad("Status tidak dikenal.");
    await run(env, `UPDATE ${t} SET status=? WHERE id=?`, body.status, ex.id);
    if (body.pj_id && can(me, "lihat")) { const n = await staffName(env, body.pj_id); await run(env, `UPDATE ${t} SET pj_id=?, ${t === "kotak" ? "pj" : "petugas"}=? WHERE id=?`, int(body.pj_id), n, ex.id); }
    await enqueue(env, t, t === "kotak" ? ex.kode : ex.id);
    return json({ ok: true });
  });

  /* ---------- Surat persetujuan pundi (data untuk digambar ulang) ---------- */
  const suratData = async (env, p, cfg, pub) => ({
    kode: p.kode, nama: p.nama, pekerjaan: p.pekerjaan, alamat_kantor: p.alamat_kantor, alamat: [p.alamat, p.kelurahan, p.kecamatan].filter(Boolean).join(", "),
    wa: pub ? masked(p.wa) : "0" + String(p.wa).replace(/^62/, ""), jumlah: p.jumlah, tgl_setuju: p.tgl_setuju, cabang: cfg.cabang, kantor_alamat: cfg.kantor_alamat, call_center: cfg.call_center,
    kota: cfg.kab_default || cfg.cabang, lat: pub ? null : p.lat, lng: pub ? null : p.lng, petugas: p.petugas, didaftar_oleh: p.didaftar_oleh, jadwal: p.jadwal,
    ttd: p.ttd_id ? (pub ? `/api/public/surat/${p.surat_token}/ttd` : `/api/admin/media/${p.ttd_id}`) : null, token: p.surat_token,
  });
  R("GET", "field/surat/:id", async ({ env, req, p }) => {
    await anyOf(env, req, ["lapangan", "titik"]);
    const x = await one(env, "SELECT * FROM pundi WHERE id=?", int(p.id)); if (!x) throw new HttpError(404, "Data tidak ditemukan.");
    return json(await suratData(env, x, await settings(env), false));
  });
  R("GET", "public/surat/:token", async ({ env, p }) => {
    const x = await one(env, "SELECT * FROM pundi WHERE surat_token=?", p.token); if (!x) throw new HttpError(404, "Surat tidak ditemukan.");
    return json(await suratData(env, x, await settings(env), true));
  });
  R("GET", "public/surat/:token/ttd", async ({ env, p }) => {
    const x = await one(env, "SELECT ttd_id FROM pundi WHERE surat_token=?", p.token);
    return H.serveMedia(env, x?.ttd_id);
  });

  /* ---------- Unggah dokumen PNG + kirim ke WhatsApp ---------- */
  const caption = {
    slip: (cfg, s, url) => {
      const rows = JSON.parse(s.rincian).filter((r) => r.nominal > 0).map((r) => `${r.label}: ${rp(r.nominal)}`).join("\n");
      return `Assalamu'alaikum ${s.nama},\n\nAlhamdulillah, setoran ZIS Anda telah kami terima.\n\n*Slip Setoran ZIS · WIZ Cabang ${cfg.cabang}*\nNo. ${s.no} · ${tglIndo(s.tanggal)}\n${rows}\n*Jumlah: ${rp(s.total)}*\n` +
        `${s.sumber === "kotak" ? `Kotak amal: ${s.sumber_kode}\n` : s.sumber === "pundi" ? `Pundi: ${s.sumber_kode}\n` : s.sumber === "amplop" ? `Amplop: ${s.sumber_kode}\n` : ""}Petugas: ${s.petugas}\n\n` +
        `Slip digital: ${url}\n\n_Ajarakallahu fiima a'thaita, wa baaraka laka fiima abqaita, wa ja'alahu laka thahuura._\nSemoga Allah Ta'ala memberkahi zakat, infak, dan sedekah ini.`;
    },
    surat: (cfg, x, url, pj) => `Assalamu'alaikum ${x.nama},\n\nJazakumullahu khairan telah bersedia menjadi *Donatur Pundi Sedekah WIZ Cabang ${cfg.cabang}*.\n\n` +
      `Kode pundi: *${x.kode}* · ${x.jumlah} kaleng\nJadwal jemput: sekitar tanggal ${x.jadwal || cfg.jemput_tanggal} setiap bulan\nPetugas: ${pj?.nama || x.petugas || "-"}${pj?.wa ? " (wa.me/" + pj.wa + ")" : ""}\n\n` +
      `Surat persetujuan digital: ${url}\n\nSetiap kali pundi dijemput, slip setoran akan dikirim ke nomor ini. Semoga menjadi amal jariyah yang terus mengalir.`,
  };
  R("POST", "field/dok/:jenis/:key", async ({ env, ctx, req, p, body }) => {
    const me = await anyOf(env, req, ["slip", "titik"]);
    const cfg = await settings(env);
    const origin = new URL(req.url).origin;
    if (p.jenis === "slip") {
      const s = await one(env, "SELECT * FROM slips WHERE no=?", p.key); if (!s) throw new HttpError(404, "Slip tidak ditemukan.");
      if (body.png) { const mid = await saveDoc(env, body.png, "slip"); await run(env, "UPDATE slips SET png_id=? WHERE no=?", mid, s.no); s.png_id = mid; }
      if (!body.kirim) return json({ ok: true });
      if (!s.wa) return json({ ok: false, info: "Slip tanpa nomor WhatsApp. Bagikan manual dari HP." });
      const r = await sendWA(cfg, s.wa, caption.slip(cfg, s, `${origin}/#/slip/${s.token}`), s.png_id ? { url: `${origin}/api/doc/${s.token}.png`, filename: `slip-${s.no}.png` } : null);
      const status = r.ok ? (r.gambar ? "gambar" : "teks") : "gagal: " + r.reason;
      await run(env, "UPDATE slips SET wa_status=? WHERE no=?", status.slice(0, 120), s.no);
      return json({ ok: r.ok, gambar: !!r.gambar, info: r.ok ? (r.gambar ? "Slip terkirim ke WhatsApp donatur." : "Terkirim sebagai teks berisi tautan slip (paket Fonnte belum mendukung gambar).") : "WhatsApp otomatis gagal: " + r.reason });
    }
    if (p.jenis === "surat") {
      const x = await one(env, "SELECT * FROM pundi WHERE id=?", int(p.key)); if (!x) throw new HttpError(404, "Data tidak ditemukan.");
      if (body.png) { const mid = await saveDoc(env, body.png, "surat"); await run(env, "UPDATE pundi SET surat_png=? WHERE id=?", mid, x.id); x.surat_png = mid; }
      if (!body.kirim) return json({ ok: true });
      const pj = x.pj_id ? await one(env, "SELECT nama, wa FROM admins WHERE id=?", x.pj_id) : null;
      const r = await sendWA(cfg, x.wa, caption.surat(cfg, x, `${origin}/#/surat/${x.surat_token}`, pj), x.surat_png ? { url: `${origin}/api/doc/${x.surat_token}.png`, filename: `surat-persetujuan-${x.kode}.${x.surat_png ? "jpg" : "png"}` } : null);
      return json({ ok: r.ok, gambar: !!r.gambar, info: r.ok ? (r.gambar ? "Surat persetujuan terkirim ke WhatsApp donatur." : "Terkirim sebagai teks berisi tautan surat.") : "WhatsApp otomatis gagal: " + r.reason });
    }
    throw bad("Jenis dokumen tidak dikenal.");
  });
  // Gambar PNG untuk Fonnte / unduhan (alamat rahasia berbasis token)
  R("GET", "doc/:file", async ({ env, p }) => {
    const token = String(p.file).replace(/\.png$/, "");
    const s = await one(env, "SELECT png_id FROM slips WHERE token=?", token);
    const id = s?.png_id || (await one(env, "SELECT surat_png FROM pundi WHERE surat_token=?", token))?.surat_png;
    return H.serveMedia(env, id, "private, max-age=3600");
  });

  /* ---------- Slip setoran ZIS ---------- */
  async function nextSlipNo(env) {
    const r = await one(env, "SELECT MAX(CAST(no AS INTEGER)) n FROM slips WHERE no GLOB '[0-9]*' AND no NOT GLOB '*[^0-9]*'");
    return String((r?.n || 0) + 1).padStart(6, "0");
  }
  const slipOut = (cfg, s, pub) => {
    const rincian = JSON.parse(s.rincian || "[]");
    return { no: s.no, tanggal: s.tanggal, cabang: cfg.cabang, nama: s.nama, alamat: s.alamat, kab: s.kab, provinsi: s.provinsi, wa: pub ? masked(s.wa) : s.wa ? "0" + String(s.wa).replace(/^62/, "") : "",
      pekerjaan: s.pekerjaan, id_donatur: idDonatur(cfg, s.donor_id), rincian, cara: s.cara, cara_lain: s.cara_lain, total: s.total, sumber: s.sumber, sumber_kode: s.sumber_kode,
      petugas: s.petugas, petugas_id: pub ? undefined : s.petugas_id, batal: !!s.batal, wa_status: pub ? undefined : s.wa_status, created_at: s.created_at, token: pub ? undefined : s.token,
      ttd_petugas: s.ttd_petugas ? (pub ? `/api/public/slip/${s.token}/ttd/petugas` : `/api/admin/media/${s.ttd_petugas}`) : null,
      ttd_penyetor: s.ttd_penyetor ? (pub ? `/api/public/slip/${s.token}/ttd/penyetor` : `/api/admin/media/${s.ttd_penyetor}`) : null,
      serah: pub ? undefined : s.serah, serah_oleh: pub ? undefined : s.serah_oleh };
  };
  const SLIP_SEL = `SELECT s.*, a.ttd_id ttd_petugas, (SELECT MAX(serah) FROM donations WHERE slip_no=s.no) serah, (SELECT MAX(serah_oleh) FROM donations WHERE slip_no=s.no) serah_oleh FROM slips s LEFT JOIN admins a ON a.id=s.petugas_id`;
  R("GET", "field/slip-berikut", async ({ env, req }) => { await requireAdmin(env, req, "slip"); return json({ no: await nextSlipNo(env) }); });
  R("GET", "field/slips", async ({ env, req, u }) => {
    const me = await requireAdmin(env, req, "slip");
    const cfg = await settings(env);
    const w = [], a = [];
    if (!can(me, "lihat")) { w.push("s.petugas_id=?"); a.push(me.id); }
    else if (u.searchParams.get("petugas")) { w.push("s.petugas_id=?"); a.push(int(u.searchParams.get("petugas"))); }
    const qv = str(u.searchParams.get("q"), 60); if (qv) { w.push("(s.no LIKE ? OR s.nama LIKE ? OR s.wa LIKE ? OR s.sumber_kode LIKE ?)"); a.push(...Array(4).fill("%" + qv + "%")); }
    const page = Math.max(1, int(u.searchParams.get("page")) || 1);
    const rows = await all(env, SLIP_SEL + (w.length ? " WHERE " + w.join(" AND ") : "") + " ORDER BY s.created_at DESC LIMIT 30 OFFSET ?", ...a, (page - 1) * 30);
    const agg = await one(env, "SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN batal=0 THEN total END),0) total FROM slips s" + (w.length ? " WHERE " + w.join(" AND ") : ""), ...a);
    return json({ rows: rows.map((s) => slipOut(cfg, s, false)), total: agg.n, jumlah: agg.total, page });
  });
  R("GET", "field/slips/:no", async ({ env, req, p }) => {
    const me = await requireAdmin(env, req, "slip");
    const s = await one(env, SLIP_SEL + " WHERE s.no=?", p.no); if (!s) throw new HttpError(404, "Slip tidak ditemukan.");
    if (!can(me, "lihat") && s.petugas_id !== me.id) throw new HttpError(403, "Slip ini dicatat petugas lain.");
    return json(slipOut(await settings(env), s, false));
  });
  R("GET", "public/slip/:token", async ({ env, p }) => {
    const s = await one(env, SLIP_SEL + " WHERE s.token=?", p.token); if (!s) throw new HttpError(404, "Slip tidak ditemukan.");
    return json(slipOut(await settings(env), s, true));
  });
  R("GET", "public/slip/:token/ttd/:who", async ({ env, p }) => {
    const s = await one(env, "SELECT s.ttd_penyetor, a.ttd_id FROM slips s LEFT JOIN admins a ON a.id=s.petugas_id WHERE s.token=?", p.token);
    return H.serveMedia(env, p.who === "penyetor" ? s?.ttd_penyetor : s?.ttd_id);
  });

  const KOLOM = { zakat: ["Dana Zakat", "zakat-maal"], pundi: ["Pundi Sedekah", "pundi-sedekah"], infaq: ["Dana Infaq", "infak-terbaik"] };
  R("POST", "field/slips", async ({ env, ctx, req, body }) => {
    const me = await requireAdmin(env, req, "slip");
    const cfg = await settings(env);
    // Nomor slip: samakan dengan slip kertas bila ada; kosong = nomor berikutnya otomatis
    let no = str(body.no, 20).replace(/\s/g, "");
    if (no && !/^[\w-]{1,20}$/.test(no)) throw bad("Nomor slip hanya boleh huruf, angka, dan tanda minus.");
    if (!no) no = await nextSlipNo(env);
    if (await one(env, "SELECT no FROM slips WHERE no=?", no)) throw bad(`Nomor slip ${no} sudah dipakai. Periksa lagi nomor di slip kertas.`);
    const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal || "") ? body.tanggal : witaNow().slice(0, 10);
    if (tanggal > witaNow().slice(0, 10)) throw bad("Tanggal slip tidak boleh setelah hari ini.");
    const nama = str(body.nama, 80); if (!nama) throw bad("Nama penyetor wajib diisi.");
    const wa = waFull(body.wa); if (body.wa && wa.length < 11) throw bad("Nomor Telp./HP belum lengkap.");
    const cara = ["tunai", "transfer", "lainnya"].includes(body.cara) ? body.cara : "tunai";
    const sumber = ["pundi", "kotak", "amplop", "langsung"].includes(body.sumber) ? body.sumber : "langsung";
    const sumberKode = sumber === "langsung" ? null : str(body.sumber_kode, 20).toUpperCase();
    let amp = null;
    if (sumber === "pundi" && !(await one(env, "SELECT id FROM pundi WHERE kode=?", sumberKode))) throw bad("Kode pundi tidak ditemukan.");
    if (sumber === "kotak" && !(await one(env, "SELECT id FROM kotak WHERE kode=?", sumberKode))) throw bad("Kode kotak amal tidak ditemukan.");
    if (sumber === "amplop") {
      amp = await one(env, "SELECT * FROM amplop WHERE kode=?", sumberKode);
      if (!amp) throw bad("Kode amplop tidak ditemukan.");
      if (me.role === "amplop" && amp.relawan_id !== me.id) throw new HttpError(403, "Amplop ini dipegang relawan lain.");
      if (amp.status === "kembali") throw bad("Amplop ini sudah disetor dengan slip " + amp.slip_no + ".");
    }
    if (me.role === "amplop" && sumber !== "amplop") throw new HttpError(403, "Relawan amplop hanya mencatat setoran amplop.");
    // Rincian dana (baris slip)
    const camps = await all(env, "SELECT id,slug,judul,jenis_dana FROM campaigns");
    const bySlug = Object.fromEntries(camps.map((c) => [c.slug, c])), byId = Object.fromEntries(camps.map((c) => [c.id, c]));
    const rincian = [];
    for (const r of Array.isArray(body.rincian) ? body.rincian.slice(0, 6) : []) {
      const nominal = Math.max(0, int(r.nominal)); if (!nominal) continue;
      if (nominal > 1_000_000_000) throw bad("Nominal terlalu besar.");
      if (KOLOM[r.k]) {
        const c = bySlug[KOLOM[r.k][1]] || camps.find((x) => x.jenis_dana === (r.k === "zakat" ? "zakat" : "infak"));
        rincian.push({ k: r.k, label: KOLOM[r.k][0], nominal, campaign_id: c?.id || null });
      } else {
        const c = byId[int(r.campaign_id)] || (sumber === "amplop" ? bySlug["amplop-ramadhan"] : null);
        if (!c) throw bad("Pilih program untuk baris lainnya.");
        rincian.push({ k: "lain", label: str(r.label, 40) || c.judul, nominal, campaign_id: c.id });
      }
    }
    const total = rincian.reduce((s, r) => s + r.nominal, 0);
    if (!total) throw bad("Isi minimal satu nominal setoran.");
    // Donatur
    const pekerjaan = str(body.pekerjaan, 60);
    const donorId = wa ? await upsertDonor(env, wa, { nama, alamat: str(body.alamat, 200), kab: str(body.kab, 60), provinsi: str(body.provinsi, 60), pekerjaan }) : int(body.donor_id) || null;
    const ttdP = body.ttd_penyetor ? await media(env, body.ttd_penyetor, "ttd") : null;
    const token = randomId(20).toLowerCase();
    await run(env, `INSERT INTO slips(no,token,tanggal,donor_id,nama,alamat,kab,provinsi,wa,pekerjaan,rincian,cara,cara_lain,total,sumber,sumber_kode,petugas_id,petugas,ttd_penyetor)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, no, token, tanggal, donorId, nama, str(body.alamat, 200) || null, str(body.kab, 60) || null, str(body.provinsi, 60) || null, wa || null,
      pekerjaan || null, JSON.stringify(rincian), cara, cara === "lainnya" ? str(body.cara_lain, 40) : null, total, sumber, sumberKode, me.id, me.nama, ttdP);
    // Satu baris donasi per jenis dana agar laporan zakat/infak/program tetap rapi
    const metode = ["pundi", "kotak", "amplop"].includes(sumber) ? sumber : cara === "transfer" ? "transfer" : cara === "lainnya" ? "lainnya" : "tunai";
    const serah = cara === "tunai" ? (can(me, "setoran") ? "diterima" : "petugas") : null;
    const today = witaNow().slice(0, 10);
    const paidAt = tanggal === today ? nowIso() : tanggal + " 04:00:00";
    for (const r of rincian) {
      const c = byId[r.campaign_id];
      const id = "W" + randomId(11);
      await run(env, `INSERT INTO donations(id,campaign_id,jenis_dana,nominal,kode_unik,total,donor_id,nama,wa,metode,kanal,status,pundi_kode,kotak_kode,petugas,petugas_id,slip_no,serah,serah_at,serah_oleh,catatan,created_at)
        VALUES(?,?,?,?,0,?,?,?,?,?,'offline','pending',?,?,?,?,?,?,?,?,?,?)`, id, r.campaign_id, c?.jenis_dana || "infak", r.nominal, r.nominal, donorId, nama, wa || null, metode,
        sumber === "pundi" ? sumberKode : null, sumber === "kotak" ? sumberKode : null, me.nama, me.id, no, serah, serah === "diterima" ? nowIso() : null, serah === "diterima" ? me.nama : null,
        `Slip ${no}${sumber === "amplop" ? " · amplop " + sumberKode : ""}`, nowIso());
      await markPaid(env, ctx, req, id, paidAt, { quiet: true });
    }
    if (sumber === "pundi") await run(env, "UPDATE pundi SET status='aktif' WHERE kode=? AND status IN ('baru','diantar')", sumberKode);
    if (amp) { await run(env, "UPDATE amplop SET status='kembali', kembali_at=?, nominal=?, slip_no=? WHERE id=?", nowIso(), total, no, amp.id); await enqueue(env, "amplop", amp.kode); }
    await enqueue(env, "slip", no);
    const s = await one(env, SLIP_SEL + " WHERE s.no=?", no);
    return json(slipOut(cfg, s, false), 201);
  });
  // Batalkan slip salah input: bendahara/admin kapan saja; petugas sendiri dalam 6 jam selama uang belum diterima bendahara
  R("POST", "field/slips/:no/batal", async ({ env, req, p, body }) => {
    const me = await requireAdmin(env, req, "slip");
    const s = await one(env, SLIP_SEL + " WHERE s.no=?", p.no); if (!s) throw new HttpError(404, "Slip tidak ditemukan.");
    if (s.batal) throw bad("Slip sudah dibatalkan.");
    const own = s.petugas_id === me.id && Date.now() - toDate(s.created_at).getTime() < 6 * 3600e3 && s.serah !== "diterima";
    if (!can(me, "keuangan") && !own) throw new HttpError(403, "Hanya bendahara/admin yang bisa membatalkan slip ini.");
    const alasan = str(body.alasan, 120) || "salah input";
    await run(env, "UPDATE slips SET batal=1, wa_status=? WHERE no=?", "batal: " + alasan, s.no);
    const ids = await all(env, "SELECT id FROM donations WHERE slip_no=?", s.no);
    await run(env, "UPDATE donations SET status='cancelled', serah=NULL, catatan=COALESCE(catatan,'')||? WHERE slip_no=?", ` · dibatalkan ${me.nama}: ${alasan}`, s.no);
    for (const d of ids) await enqueue(env, "donasi", d.id);
    if (s.sumber === "amplop") await run(env, "UPDATE amplop SET status='dibagikan', kembali_at=NULL, nominal=0, slip_no=NULL WHERE slip_no=?", s.no);
    await enqueue(env, "slip", s.no);
    return json({ ok: true });
  });

  /* ---------- Setoran uang petugas ke bendahara ---------- */
  R("GET", "field/setoran", async ({ env, req }) => {
    const me = await requireAdmin(env, req, "slip");
    const own = !can(me, "setoran");
    const rows = await all(env, `SELECT d.petugas_id, COALESCE(a.nama, d.petugas) nama, a.wa, a.role, d.slip_no, MIN(d.paid_at) tgl, SUM(d.total) total, MAX(s.nama) penyetor, MAX(s.sumber) sumber, MAX(s.sumber_kode) kode
      FROM donations d LEFT JOIN admins a ON a.id=d.petugas_id LEFT JOIN slips s ON s.no=d.slip_no
      WHERE d.serah='petugas' AND d.status='paid' ${own ? "AND d.petugas_id=?" : ""} GROUP BY d.petugas_id, d.slip_no ORDER BY nama, tgl`, ...(own ? [me.id] : []));
    const per = {};
    for (const r of rows) { const g = (per[r.petugas_id] ||= { petugas_id: r.petugas_id, nama: r.nama, wa: r.wa, role: r.role, total: 0, slip: [] }); g.total += r.total; g.slip.push({ no: r.slip_no, tgl: r.tgl, total: r.total, penyetor: r.penyetor, sumber: r.sumber, kode: r.kode }); }
    const riwayat = await all(env, `SELECT serah_oleh, serah_at, COALESCE(a.nama, d.petugas) nama, SUM(d.total) total, COUNT(DISTINCT d.slip_no) slip FROM donations d LEFT JOIN admins a ON a.id=d.petugas_id
      WHERE d.serah='diterima' AND d.serah_at IS NOT NULL AND d.petugas_id IS NOT NULL ${own ? "AND d.petugas_id=?" : ""} GROUP BY d.serah_at, d.petugas_id ORDER BY d.serah_at DESC LIMIT 30`, ...(own ? [me.id] : []));
    return json({ petugas: Object.values(per), riwayat, boleh_terima: !own });
  });
  R("POST", "field/setoran/terima", async ({ env, ctx, req, body }) => {
    const me = await requireAdmin(env, req, "setoran");
    const pid = int(body.petugas_id); if (!pid) throw bad("Pilih petugas.");
    const nos = Array.isArray(body.slip) ? body.slip.map((x) => str(x, 20)).filter(Boolean) : [];
    const where = `petugas_id=? AND serah='petugas' AND status='paid'${nos.length ? ` AND slip_no IN (${nos.map(() => "?").join(",")})` : ""}`;
    const sum = await one(env, `SELECT COALESCE(SUM(total),0) total, COUNT(DISTINCT slip_no) n FROM donations WHERE ${where}`, pid, ...nos);
    if (!sum.n) throw bad("Tidak ada setoran yang menunggu untuk petugas ini.");
    const at = nowIso();
    const ids = await all(env, `SELECT id FROM donations WHERE ${where}`, pid, ...nos);
    await run(env, `UPDATE donations SET serah='diterima', serah_at=?, serah_oleh=? WHERE ${where}`, at, me.nama, pid, ...nos);
    for (const d of ids) await enqueue(env, "donasi", d.id);
    const cfg = await settings(env); const pet = await one(env, "SELECT nama, wa FROM admins WHERE id=?", pid);
    if (pet?.wa) { const t = sendWA(cfg, pet.wa, `Assalamu'alaikum ${pet.nama},\n\nSetoran Anda *${rp(sum.total)}* (${sum.n} slip) telah diterima oleh ${me.nama} pada ${tglIndo(witaNow().slice(0, 10))}.\n\nJazakallahu khairan atas amanahnya.`); ctx?.waitUntil ? ctx.waitUntil(t) : await t; }
    return json({ ok: true, total: sum.total, slip: sum.n });
  });

  /* ---------- Amplop Ramadhan ---------- */
  R("GET", "field/amplop", async ({ env, req, u }) => {
    const me = await requireAdmin(env, req, "amplop");
    const own = me.role === "amplop";
    const w = [], a = [];
    if (own) { w.push("m.relawan_id=?"); a.push(me.id); }
    else if (u.searchParams.get("relawan")) { w.push("m.relawan_id=?"); a.push(int(u.searchParams.get("relawan"))); }
    if (u.searchParams.get("status")) { w.push("m.status=?"); a.push(u.searchParams.get("status")); }
    if (u.searchParams.get("periode")) { w.push("m.periode=?"); a.push(u.searchParams.get("periode")); }
    const qv = str(u.searchParams.get("q"), 40); if (qv) { w.push("(m.kode LIKE ? OR m.nama LIKE ? OR m.wa LIKE ?)"); a.push(...Array(3).fill("%" + qv + "%")); }
    const where = w.length ? " WHERE " + w.join(" AND ") : "";
    const rows = await all(env, `SELECT m.*, s.nama relawan FROM amplop m LEFT JOIN admins s ON s.id=m.relawan_id${where} ORDER BY m.kode LIMIT 1000`, ...a);
    const ringkas = await all(env, `SELECT m.relawan_id, s.nama relawan, COUNT(*) n, SUM(m.status='stok') stok, SUM(m.status='dibagikan') dibagikan, SUM(m.status='kembali') kembali, SUM(m.status='hilang') hilang, COALESCE(SUM(m.nominal),0) nominal
      FROM amplop m LEFT JOIN admins s ON s.id=m.relawan_id${own ? " WHERE m.relawan_id=?" : ""} GROUP BY m.relawan_id ORDER BY nominal DESC`, ...(own ? [me.id] : []));
    const periode = (await all(env, "SELECT DISTINCT periode FROM amplop ORDER BY periode DESC")).map((r) => r.periode);
    return json({ rows, ringkas, periode });
  });
  R("POST", "field/amplop/buat", async ({ env, req, body }) => {
    await requireAdmin(env, req, "amplop_kelola");
    const cfg = await settings(env);
    const periode = str(body.periode, 40) || cfg.amplop_periode;
    const awalan = str(body.awalan, 10).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "AR-";
    const jumlah = int(body.jumlah); if (jumlah < 1 || jumlah > 2000) throw bad("Jumlah amplop 1–2000 per sekali buat.");
    let mulai = int(body.mulai);
    if (!mulai) mulai = (await all(env, "SELECT kode FROM amplop WHERE kode LIKE ?", awalan + "%")).reduce((m, r) => Math.max(m, int(String(r.kode).slice(awalan.length))), 0) + 1;
    const rel = int(body.relawan_id) || null;
    const stmts = [];
    for (let i = 0; i < jumlah; i++) stmts.push(env.DB.prepare("INSERT OR IGNORE INTO amplop(kode,periode,relawan_id) VALUES(?,?,?)").bind(awalan + String(mulai + i).padStart(4, "0"), periode, rel));
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    await env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'amplop', kode FROM amplop WHERE periode=?").bind(periode).run();
    return json({ ok: true, dari: awalan + String(mulai).padStart(4, "0"), sampai: awalan + String(mulai + jumlah - 1).padStart(4, "0") }, 201);
  });
  R("POST", "field/amplop/serahkan", async ({ env, req, body }) => {
    await requireAdmin(env, req, "amplop_kelola");
    const rel = int(body.relawan_id);
    const r = rel ? await one(env, "SELECT id, role FROM admins WHERE id=? AND aktif=1", rel) : null;
    if (!r) throw bad("Pilih relawan amplop.");
    const dari = str(body.dari, 20).toUpperCase(), sampai = str(body.sampai, 20).toUpperCase() || dari;
    if (!dari) throw bad("Isi kode amplop awal.");
    const res = await run(env, "UPDATE amplop SET relawan_id=? WHERE kode BETWEEN ? AND ? AND status='stok'", rel, dari, sampai);
    await env.DB.prepare("INSERT OR IGNORE INTO sync_queue(entity,ref) SELECT 'amplop', kode FROM amplop WHERE kode BETWEEN ? AND ?").bind(dari, sampai).run();
    return json({ ok: true, jumlah: res.meta.changes });
  });
  R("POST", "field/amplop/:kode/bagikan", async ({ env, req, p, body }) => {
    const me = await requireAdmin(env, req, "amplop");
    const m = await one(env, "SELECT * FROM amplop WHERE kode=?", p.kode.toUpperCase()); if (!m) throw new HttpError(404, "Amplop tidak ditemukan.");
    if (me.role === "amplop" && m.relawan_id !== me.id) throw new HttpError(403, "Amplop ini dipegang relawan lain.");
    if (m.status === "kembali") throw bad("Amplop ini sudah kembali dan disetor.");
    const nama = str(body.nama, 80); if (!nama) throw bad("Nama penerima amplop wajib diisi.");
    const wa = waFull(body.wa); if (body.wa && wa.length < 11) throw bad("Nomor WhatsApp belum lengkap.");
    const loc = coord(body, false);
    const donorId = wa ? await upsertDonor(env, wa, { nama, alamat: str(body.alamat, 200), kelurahan: str(body.kelurahan, 60), kecamatan: str(body.kecamatan, 60), lat: loc.lat, lng: loc.lng }) : null;
    await run(env, "UPDATE amplop SET status='dibagikan', nama=?, wa=?, alamat=?, kelurahan=?, kecamatan=?, lat=?, lng=?, akurasi=?, donor_id=?, dibagikan_at=COALESCE(dibagikan_at, ?), relawan_id=COALESCE(relawan_id, ?) WHERE id=?",
      nama, wa || null, str(body.alamat, 200) || null, str(body.kelurahan, 60) || null, str(body.kecamatan, 60) || null, loc.lat, loc.lng, loc.akurasi, donorId, nowIso(), me.id, m.id);
    await enqueue(env, "amplop", m.kode);
    return json({ ok: true });
  });
  R("POST", "field/amplop/:kode/status", async ({ env, req, p, body }) => {
    const me = await requireAdmin(env, req, "amplop");
    const m = await one(env, "SELECT * FROM amplop WHERE kode=?", p.kode.toUpperCase()); if (!m) throw new HttpError(404, "Amplop tidak ditemukan.");
    if (me.role === "amplop" && m.relawan_id !== me.id) throw new HttpError(403, "Amplop ini dipegang relawan lain.");
    if (!["hilang", "dibagikan", "stok"].includes(body.status) || m.status === "kembali") throw bad("Status tidak bisa diubah.");
    await run(env, "UPDATE amplop SET status=? WHERE id=?", body.status, m.id); await enqueue(env, "amplop", m.kode);
    return json({ ok: true });
  });

  return { titikList };
}
