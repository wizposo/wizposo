// Uji API end-to-end terhadap server lokal (jalankan server dengan MOCK=1 MIDTRANS_SERVER_KEY=test-key)
import crypto from "node:crypto";
const B = "http://localhost:8788/api/";
let adm = "", fr = "";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: "http://localhost:8788" }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };

let r = await call("GET", "admin/status"); ok(r.data.needsSetup === true, "butuh setup admin pertama");
r = await call("POST", "admin/setup", { nama: "Admin Poso", email: "admin@wiz.id", password: "rahasia123" }); ok(r.s === 201 && r.sc, "admin pertama dibuat"); adm = r.sc;
r = await call("POST", "admin/setup", { nama: "X", email: "x@x.id", password: "rahasia123" }); ok(r.s === 400, "setup kedua ditolak");
r = await call("POST", "admin/login", { email: "admin@wiz.id", password: "salah" }); ok(r.s === 401, "login salah ditolak");
r = await call("PUT", "admin/settings", { cabang: "Poso", wa_admin: "081200000001", rekening: [{ bank: "BSI", no: "7123456789", an: "Wahdah Inspirasi Zakat" }], fonnte_token: "tok-fonnte" }, adm); ok(r.s === 200, "pengaturan disimpan");
r = await call("GET", "admin/settings", null, adm); ok(r.data.fonnte_token.startsWith("••••") && r.data.wa_on && r.data.gateway_on, "token tersamarkan, WA & gateway aktif");
r = await call("GET", "public/config"); ok(r.data.gateway === true && r.data.rekening.length === 1 && !("fonnte_token" in r.data), "config publik aman");
r = await call("GET", "public/campaigns"); ok(r.data.length >= 10, `campaign awal: ${r.data.length}`);

r = await call("POST", "fr/register", { nama: "Ahmad Fauzi", wa: "081300000002", pin: "123456", kota: "Poso" }); ok(r.s === 201, "fundraiser daftar, kode " + r.data.kode); fr = r.sc; const kode = r.data.kode;

// Donasi via gateway + webhook
r = await call("POST", "public/donations", { campaign: "berkah-sehat", nominal: 100000, nama: "Budi Santoso", sapaan: "Bapak", wa: "081400000003", metode: "gateway", ref: kode, doa: "Semoga berkah" });
ok(r.s === 201 && r.data.payment_url, "donasi gateway dibuat + payment_url"); const gid = r.data.id;
const sig = (o, sc, g) => crypto.createHash("sha512").update(o + sc + g + "test-key").digest("hex");
r = await call("POST", "payment/midtrans", { order_id: gid, status_code: "200", gross_amount: "100000.00", transaction_status: "settlement", signature_key: "salah" }); ok(r.s === 403, "webhook tanda tangan salah ditolak");
r = await call("POST", "payment/midtrans", { order_id: gid, status_code: "200", gross_amount: "100000.00", transaction_status: "settlement", signature_key: sig(gid, "200", "100000.00") }); ok(r.s === 200, "webhook valid diterima");
r = await call("GET", "public/donations/" + gid); ok(r.data.status === "paid" && r.data.fundraiser, "donasi lunas & tercatat ke fundraiser " + r.data.fundraiser);
r = await call("POST", "payment/midtrans", { order_id: gid, status_code: "200", gross_amount: "100000.00", transaction_status: "settlement", signature_key: sig(gid, "200", "100000.00") }); ok(r.s === 200, "webhook ganda aman (idempoten)");
const sent = await (await fetch("http://localhost:8788/__sent")).json(); ok(sent.length >= 3, `notifikasi WA terkirim: ${sent.length} (donatur, admin, fundraiser)`);

// Donasi transfer manual dengan kode unik
r = await call("POST", "public/donations", { campaign: "zakat-maal", nominal: 500000, nama: "Siti", wa: "081500000004", metode: "transfer" });
ok(r.data.kode_unik > 0 && r.data.total === 500000 + r.data.kode_unik && r.data.rekening.length, `transfer: kode unik ${r.data.kode_unik}, total ${r.data.total}`); const tid = r.data.id;
r = await call("POST", "public/donations", { campaign: "zakat-maal", nominal: 5000, metode: "transfer" }); ok(r.s === 400, "nominal di bawah minimum ditolak: " + r.data.error);
r = await call("POST", "public/donations", { campaign: "zakat-maal", nominal: 50000, metode: "qris" }); ok(r.s === 400, "QRIS belum diatur ditolak");
const png = "data:image/png;base64," + Buffer.from("89504e470d0a1a0a", "hex").toString("base64");
r = await call("POST", `public/donations/${tid}/bukti`, { gambar: png }); ok(r.s === 200, "bukti transfer diunggah");
r = await call("POST", `admin/donations/${tid}/status`, { status: "paid" }); ok(r.s === 401, "tandai lunas tanpa login ditolak");
r = await call("POST", `admin/donations/${tid}/status`, { status: "paid" }, adm); ok(r.data.ok, "admin tandai lunas");

// Donasi offline (kotak amal)
r = await call("POST", "admin/kotak", { nama_lokasi: "Kios Barokah", pemilik: "Pak Udin", wa_pemilik: "081600000005", pj: "Rahmat" }, adm); ok(r.s === 201, "kotak dibuat " + r.data.kode); const kk = r.data.kode;
const camps = (await call("GET", "admin/campaigns", null, adm)).data; const infak = camps.find((c) => c.slug === "infak-terbaik");
for (const [n, t] of [[300000, "2026-07-01"], [280000, "2026-08-01"], [320000, "2026-09-01"], [90000, "2026-10-01"]])
  r = await call("POST", "admin/donations", { campaign_id: infak.id, nominal: n, metode: "kotak", kotak_kode: kk, tanggal: t, petugas: "Rahmat" }, adm);
ok(r.s === 201 && r.data.status === "paid", "setoran kotak dicatat");
r = await call("GET", "admin/dashboard", null, adm);
ok(r.data.semua.total === 100000 + 500000 + (await call("GET", "public/donations/" + tid)).data.kode_unik + 990000, "total dashboard benar: " + r.data.semua.total);
ok(r.data.anomali.length === 1 && r.data.anomali[0].kode === kk, "anomali kotak terdeteksi");

// Pundi
r = await call("POST", "public/pundi", { nama: "Ibu Aminah", wa: "081700000006", alamat: "Jl. Pulau Jawa 5", kelurahan: "Gebangrejo", kecamatan: "Poso Kota", pekerjaan: "Guru", jumlah: 2 }); ok(r.s === 201, "pendaftaran pundi");
r = await call("GET", "admin/pundi", null, adm); ok(r.data.length === 1, "pundi muncul di admin");
r = await call("PUT", "admin/pundi/" + r.data[0].id, { kode: "P-0001", status: "aktif", petugas: "Rahmat" }, adm); ok(r.s === 200, "kode pundi diberikan");

// CRM
r = await call("GET", "admin/donors", null, adm); ok(r.data.total === 3, "donatur tercatat: " + r.data.total + " " + JSON.stringify(r.data.segmen));
const aminah = r.data.rows.find((x) => x.nama === "Ibu Aminah"); ok(aminah && aminah.pekerjaan === "Guru" && aminah.kelurahan === "Gebangrejo", "data lengkap donatur dari pundi");
r = await fetch(B + "admin/export/donations", { headers: { cookie: adm } }); const csvTxt = await r.text(); ok(csvTxt.split("\n").length === 7, "ekspor CSV donasi " + (csvTxt.split("\n").length - 1) + " baris");

// Fundraiser
r = await call("GET", "fr/me", null, fr); ok(r.data.stat.total === 100000 && r.data.rank === 1, "dashboard fundraiser: total & peringkat");
r = await call("POST", "fr/login", { wa: "081300000002", pin: "000000" }); ok(r.s === 401, "PIN salah ditolak");

// Campaign CRUD
r = await call("POST", "admin/campaigns", { judul: "Bantu Masjid Pelosok Poso", target: 75000000, jenis_dana: "infak", batas: "2026-12-31", unggulan: true }, adm); ok(r.s === 201 && r.data.slug === "bantu-masjid-pelosok-poso", "campaign baru " + r.data.slug);
r = await call("POST", `admin/campaigns/${r.data.id}/updates`, { judul: "Pondasi selesai", isi: "Alhamdulillah" }, adm); ok(r.s === 201, "kabar terbaru ditambah");
r = await call("GET", "public/campaigns/bantu-masjid-pelosok-poso"); ok(r.data.updates.length === 1 && r.data.sisa_hari > 0, "detail campaign publik: sisa " + r.data.sisa_hari + " hari");
r = await call("GET", "public/campaigns/berkah-sehat"); ok(r.data.donors[0].nama === "Budi S." && r.data.terkumpul === 100000, "nama donatur disamarkan: " + r.data.donors[0].nama);
r = await call("PUT", "admin/campaigns/1", { judul: "<script>x</script>" }, ""); ok(r.s === 401, "ubah campaign tanpa login ditolak");
r = await fetch(B + "admin/settings", { method: "PUT", headers: { "content-type": "application/json", cookie: adm, origin: "https://jahat.com" }, body: "{}" }); ok(r.status === 403, "CSRF dari situs lain ditolak");
r = await call("GET", "public/live"); ok(r.data.recent.length === 2, "live feed hanya donasi online: " + r.data.recent.length);

// Dokumentasi penyaluran
const img = "data:image/png;base64," + Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").toString("base64");
const mid = (await call("POST", "admin/media", { gambar: img }, adm)).data.id;
const sehat = camps.find((c) => c.slug === "berkah-sehat");
r = await call("POST", "admin/articles", { judul: "Ambulans WIZ antar 12 pasien dhuafa", campaign_id: sehat.id, tanggal: "2026-10-20", lokasi: "Poso Kota", penerima: 12, tersalur: 3500000, status: "terbit",
  blocks: [{ t: "p", text: "Alhamdulillah, bulan ini **12 pasien** diantar." }, { t: "img", media_id: mid, caption: "Pasien diantar" }, { t: "video", url: "https://youtu.be/dQw4w9WgXcQ", caption: "Video" }, { t: "quote", text: "Terima kasih WIZ", by: "Ibu Wati" }, { t: "video", url: "javascript:alert(1)" }, { t: "x" }] }, adm);
ok(r.s === 201, "dokumentasi diterbitkan: " + r.data.slug); const aslug = r.data.slug;
r = await call("POST", "admin/articles", { judul: "Draf rahasia", status: "draf", blocks: [{ t: "p", text: "draf" }] }, adm); ok(r.s === 201, "draf disimpan");
r = await call("GET", "public/articles?campaign=berkah-sehat"); ok(r.data.length === 1 && r.data[0].cover === `/api/media/${mid}`, "hanya yang terbit tampil; sampul otomatis dari gambar pertama");
r = await call("GET", "public/articles/" + aslug); ok(r.data.blocks.length === 4 && r.data.blocks[2].kind === "youtube" && r.data.blocks[2].id === "dQw4w9WgXcQ", "blok dibersihkan (link berbahaya dibuang), YouTube terdeteksi");
r = await call("GET", "public/articles/draf-rahasia"); ok(r.s === 404, "draf tidak bisa dibuka publik");
r = await call("POST", "admin/articles", { judul: "x" }, ""); ok(r.s === 401, "tulis tanpa login ditolak");
const vid = Buffer.alloc(300000, 7);
let vr = await fetch(B + "admin/video", { method: "POST", headers: { "content-type": "video/mp4", cookie: adm, origin: "http://localhost:8788" }, body: vid });
const vurl = (await vr.json()).url; ok(vr.status === 201 && vurl.startsWith("/api/file/"), "video diunggah ke penyimpanan: " + vurl);
vr = await fetch("http://localhost:8788" + vurl, { headers: { range: "bytes=1000-1999" } }); ok(vr.status === 206 && (await vr.arrayBuffer()).byteLength === 1000 && vr.headers.get("content-range") === "bytes 1000-1999/300000", "video bisa diputar & digeser (range 206)");
vr = await fetch(B + "admin/video", { method: "POST", headers: { "content-type": "application/pdf", cookie: adm, origin: "http://localhost:8788" }, body: "x" }); ok(vr.status === 400, "format selain video ditolak");

// Google Drive: hubungkan, salin, rotasi saat 90%
const G = "http://localhost:8788/__gas?acc=";
r = await call("POST", "admin/drive", { url: G + "1", secret: "salah-kode-123" }, adm); ok(r.s === 400 && /rahasia/.test(r.data.error), "kode rahasia salah ditolak");
r = await call("POST", "admin/drive", { url: G + "1", secret: "rahasia-uji-123" }, adm); ok(r.s === 201 && r.data.status === "aktif" && r.data.email === "wizposo.data1@gmail.com", "Drive 1 terhubung & aktif (redirect Apps Script diikuti)");
r = await call("POST", "admin/drive/sync", { backup: true }, adm); ok(r.s === 200 && r.data.donasi >= 6 && r.data.induk >= 5 && r.data.file >= 1 && r.data.backup, `salin awal: ${r.data.donasi} transaksi, ${r.data.induk} data induk, ${r.data.file} file, cadangan ${r.data.backup}`);
let st = await (await fetch("http://localhost:8788/__gas/state")).json();
ok(st["1"].sheets["Transaksi 2026"]?.Donasi > 0 && st["1"].sheets["Data Induk"]?.Donatur > 0 && st["1"].sheets["Transaksi 2026"] && Object.keys(st["1"].sheets).some((k) => /Transaksi 20\d\d/.test(k)), "spreadsheet per tahun + Data Induk dibuat: " + Object.keys(st["1"].sheets).join(", "));
ok(st["1"].files.some((f) => f.startsWith("bukti/")) && st["1"].files.some((f) => f.startsWith("dok/")), "bukti transfer & foto masuk folder masing-masing per tahun");
r = await call("POST", "public/donations", { campaign: "infak-terbaik", nominal: 25000, metode: "transfer" }); const nid = r.data.id;
r = await call("GET", "admin/drive", null, adm); ok(r.data.antrean === 1, "donasi baru masuk antrean salin (tidak memperlambat donatur)");
r = await call("POST", "admin/drive", { url: G + "2", secret: "rahasia-uji-123" }, adm); ok(r.data.status === "cadangan", "Drive 2 terhubung sebagai cadangan");
await fetch("http://localhost:8788/__gas/set?acc=1&used=" + 13.6e9);
r = await call("POST", "admin/drive/sync", {}, adm); ok(r.data.penuh?.pindah_ke === "wizposo.data2@gmail.com", "Drive 1 mencapai 90%+ → pindah otomatis ke Drive 2");
r = await call("GET", "admin/drive", null, adm); const sts = Object.fromEntries(r.data.drives.map((d) => [d.email, d.status]));
ok(sts["wizposo.data1@gmail.com"] === "penuh" && sts["wizposo.data2@gmail.com"] === "aktif" && !r.data.alert, "status: Drive 1 arsip, Drive 2 aktif");
await call("POST", `admin/donations/${nid}/status`, { status: "paid" }, adm);
r = await call("POST", "admin/drive/sync", {}, adm); st = await (await fetch("http://localhost:8788/__gas/state")).json();
ok(st["2"].sheets["Transaksi 2026"]?.Donasi === 1, "data berikutnya tersimpan di Drive 2");
await fetch("http://localhost:8788/__gas/set?acc=2&used=" + 13.7e9);
r = await call("POST", "admin/drive/sync", {}, adm);
r = await call("GET", "admin/drive", null, adm); ok(r.data.alert === "penuh", "semua Drive penuh → peringatan tambah link baru");
const sentAll = await (await fetch("http://localhost:8788/__sent")).json(); ok(sentAll.some((m) => /Segera tambahkan link Google Drive baru/.test(m.m)), "WhatsApp peringatan dikirim ke admin");
r = await call("GET", "admin/dashboard", null, adm); ok(r.data.drive.alert === "penuh", "dashboard menampilkan peringatan Drive penuh");
r = await call("POST", "admin/drive", { url: G + "3", secret: "rahasia-uji-123" }, adm); ok(r.data.status === "aktif", "link Drive baru → langsung aktif, siklus berlanjut");
