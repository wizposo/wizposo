// Uji pesan WA: penerima, blast, jadwal, daftar berhenti, dan webhook Fonnte.
// Jalankan setelah server uji hidup (MOCK=1), setelah api-test, field-test, upah-test.
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "", raw = false) => {
  const r = await fetch(B + path, { method, headers: { ...(raw ? { "content-type": "application/x-www-form-urlencoded" } : { "content-type": "application/json" }), cookie, origin: HOST }, body: raw ? body : (body ? JSON.stringify(body) : undefined) });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };

const adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;
ok(!!adm, "admin masuk");

let r = await call("GET", "admin/wa/jadwal", null, adm);
ok(r.s === 200 && Array.isArray(r.data.jadwal), "halaman Pesan WA dapat dibuka");
const key = new URL(r.data.webhook).searchParams.get("k");
ok(!!key && key.length >= 20, "kunci webhook dibuat otomatis");

// Donatur baru yang pernah berdonasi
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 50000, nama: "Uji WA Satu", wa: "081400000799", metode: "tunai" }, adm);
ok(r.s === 201, "donatur uji dicatat (sedekah)");
const jumlah0 = (await call("POST", "admin/wa/pratinjau", { audiens: "semua" }, adm)).data.jumlah;
ok(jumlah0 >= 1, `pratinjau semua donatur: ${jumlah0} penerima`);

// Balasan BERHENTI dari donatur tersebut lewat webhook
r = await call("POST", "wa/masuk", "sender=081400000799&message=BERHENTI&name=Uji+WA+Satu", "", true);
ok(r.s === 403, "webhook tanpa kunci ditolak");
const wh = `wa/masuk?k=${key}`;
r = await call("POST", wh, "sender=081400000799&message=BERHENTI&name=Uji+WA+Satu", "", true);
ok(r.s === 200, "webhook menerima balasan BERHENTI");
const jumlah1 = (await call("POST", "admin/wa/pratinjau", { audiens: "semua" }, adm)).data.jumlah;
ok(jumlah1 === jumlah0 - 1, "nomor yang minta berhenti tidak lagi dihitung sebagai penerima");

r = await call("GET", "admin/wa/berhenti", null, adm);
const item = r.data.find((x) => x.wa === "6281400000799");
ok(item && item.status === "menunggu", "permintaan berhenti tercatat menunggu konfirmasi");
r = await call("POST", "admin/wa/berhenti/6281400000799/konfirmasi", {}, adm);
ok(r.s === 200, "admin mengonfirmasi berhenti");
r = await call("GET", "admin/wa/berhenti", null, adm);
ok(r.data.find((x) => x.wa === "6281400000799")?.status === "dikonfirmasi", "status berubah menjadi dikonfirmasi");

// Pesan biasa dari donatur lain tidak mengubah daftar
await call("POST", wh, "sender=081400000788&message=Assalamualaikum", "", true);
r = await call("GET", "admin/wa/berhenti", null, adm);
ok(!r.data.find((x) => x.wa === "6281400000788"), "pesan biasa bukan permintaan berhenti");

// Jadwal mingguan: semua hari, jam 00:00 (cocok untuk uji), isi dua baris (berputar)
r = await call("POST", "admin/wa/jadwal", { judul: "Uji mingguan", jenis: "hadits", isi: "Pesan baris satu {nama}\nPesan baris dua", audiens: "semua", mode: "mingguan", hari: [1, 2, 3, 4, 5, 6, 7], jam: "00:00" }, adm);
ok(r.s === 201 && r.data.id, "jadwal mingguan dibuat");
const jid = r.data.id;
r = await call("POST", "admin/wa/jadwal", { judul: "Uji tanpa hari", isi: "x", mode: "mingguan", hari: [], jam: "07:00" }, adm);
ok(r.s === 400, "jadwal mingguan tanpa hari ditolak");
r = await call("POST", "admin/wa/jadwal", { judul: "Uji bulanan", isi: "x", mode: "bulanan", pekan: [1], bulan: [], jam: "07:00" }, adm);
ok(r.s === 400, "jadwal bulanan tanpa bulan ditolak");
r = await call("POST", "admin/wa/jadwal", { judul: "Blast sekarang", isi: "Assalamualaikum {nama}, ajakan sedekah hari ini.", audiens: "sedekah", mode: "sekarang" }, adm);
ok(r.s === 201 && r.data.jumlah >= 1, `blast sekarang masuk antrean untuk ${r.data.jumlah} donatur sedekah`);

// Cron/proses: tanpa token Fonnte, antrean tetap menunggu (tidak hilang, tidak dianggap terkirim)
r = await call("GET", "admin/wa/jadwal", null, adm);
const j = r.data.jadwal.find((x) => x.id === jid);
ok(j && j.baris === 2, "jadwal menyimpan dua baris isi");
const terkirimTotal = r.data.jadwal.reduce((a, x) => a + x.terkirim, 0);
if (r.data.token_ok) ok(terkirimTotal >= 1, "dengan token Fonnte, antrean diproses dan tercatat terkirim");
else ok(r.data.menunggu_total >= 1, "tanpa token Fonnte, antrean menunggu");

// Nonaktifkan lalu hapus
r = await call("POST", `admin/wa/jadwal/${jid}/aktif`, { aktif: false }, adm);
ok(r.s === 200, "jadwal dinonaktifkan");
r = await call("DELETE", `admin/wa/jadwal/${jid}`, null, adm);
ok(r.s === 200, "jadwal dihapus");

// Bendahara tidak punya akses CRM WA? (peran crm: admin, sekretaris, bendahara)
r = await call("GET", "admin/wa/jadwal", null, "");
ok(r.s === 401, "tanpa login ditolak");
