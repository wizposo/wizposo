// Uji alur lapangan: peran, pendaftaran titik + lokasi, slip setoran, setoran ke bendahara, amplop, peta.
// Jalankan setelah server uji hidup (MOCK=1). Bisa dijalankan sesudah api-test.mjs atau sendiri.
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };
const sent = async () => (await fetch(HOST + "/__sent")).json();
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let r = await call("GET", "admin/status");
let adm;
if (r.data.needsSetup) { r = await call("POST", "admin/setup", { nama: "Admin Poso", email: "admin@wiz.id", password: "rahasia123" }); adm = r.sc; }
else { r = await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" }); adm = r.sc; }
await call("PUT", "admin/settings", { fonnte_token: "tok-fonnte", wa_admin: "081200000001" }, adm);
const login = async (id, pw) => (await call("POST", "admin/login", { email: id, password: pw })).sc;

// ---------- Peran ----------
r = await call("POST", "admin/admins", { nama: "Ahmad Zisko", role: "zisko", wa: "085200000011", password: "123456", wilayah: "Poso Kota" }, adm); ok(r.s === 201, "akun ZISKO dibuat (masuk pakai nomor WA)");
r = await call("POST", "admin/admins", { nama: "Siti Bendahara", role: "bendahara", email: "bendahara@wiz.id", wa: "085200000012", password: "rahasia123" }, adm); ok(r.s === 201, "akun bendahara dibuat");
r = await call("POST", "admin/admins", { nama: "Rahmat Amplop", role: "amplop", wa: "085200000013", password: "654321" }, adm); ok(r.s === 201, "akun relawan Amplop Ramadhan dibuat");
r = await call("POST", "admin/admins", { nama: "Pak Ketua", role: "ketua", email: "ketua@wiz.id", password: "rahasia123" }, adm); ok(r.s === 201, "akun ketua dibuat");
r = await call("POST", "admin/admins", { nama: "X", role: "sekretaris", email: "s@wiz.id", password: "pendek" }, adm); ok(r.s === 400, "pengurus wajib sandi ≥ 8 karakter");
const zis = await login("0852-0000-0011", "123456"); ok(!!zis, "ZISKO masuk dengan nomor WA");
const ben = await login("bendahara@wiz.id", "rahasia123"), amp = await login("085200000013", "654321"), ket = await login("ketua@wiz.id", "rahasia123");
r = await call("GET", "admin/status", null, zis); ok(r.data.me.role === "zisko" && r.data.me.perms.includes("slip") && !r.data.me.perms.includes("lihat"), "hak akses ZISKO: " + r.data.me.perms.join(", "));
r = await call("GET", "admin/dashboard", null, zis); ok(r.s === 403, "ZISKO tidak bisa membuka ringkasan keuangan");
r = await call("GET", "admin/donations", null, zis); ok(r.s === 403, "ZISKO tidak bisa melihat daftar donasi");
r = await call("PUT", "admin/settings", { cabang: "X" }, ben); ok(r.s === 403, "bendahara tidak bisa mengubah pengaturan");
for (let i = 0; i < 5; i++) await call("POST", "admin/login", { email: "085200000099", password: "salah" });
r = await call("POST", "admin/login", { email: "085200000099", password: "salah" }); ok(r.s === 429, "5 kali salah sandi → dikunci 15 menit");

// ---------- Pendaftaran Pundi (Surat Persetujuan) dengan lokasi ----------
const meta = (await call("GET", "field/meta", null, zis)).data; ok(meta.pekerjaan.length === 7 && meta.cfg.call_center, "data formulir siap (7 pilihan pekerjaan, alamat kantor cabang)");
const pundiBody = { t: "pundi", nama: "Gorengan Halal", pekerjaan: "Wiraswasta", alamat_kantor: "Pasar Sentral Poso", alamat: "Jl. Pulau Sumatera No. 5", kelurahan: "Kayamanya", kecamatan: "Poso Kota", wa: "081355500021", jumlah: 2, jadwal: 15, ttd: PNG, foto: PNG };
r = await call("POST", "field/titik", pundiBody, zis); ok(r.s === 400 && /lokasi/i.test(r.data.error), "tanpa lokasi rumah ditolak");
r = await call("POST", "field/titik", { ...pundiBody, lat: -1.39123, lng: 120.75456, akurasi: 9 }, zis); ok(r.s === 201 && /^P-\d{4}$/.test(r.data.kode) && r.data.surat_token, "pundi terdaftar dengan lokasi GPS: " + r.data.kode);
const pundi = r.data;
r = await call("POST", `field/dok/surat/${pundi.id}`, { png: PNG, kirim: true }, zis);
let wa = (await sent()).at(-1); ok(r.data.ok && r.data.gambar && wa.t === "6281355500021" && wa.url?.endsWith(`/api/doc/${pundi.surat_token}.png`) && /Donatur Pundi Sedekah/.test(wa.m), "surat persetujuan (PNG) dikirim ke WA donatur");
r = await fetch(B + `doc/${pundi.surat_token}.png`); ok(r.status === 200 && r.headers.get("content-type") === "image/png", "gambar surat bisa diambil Fonnte lewat tautan rahasia");
r = await call("GET", "public/surat/" + pundi.surat_token); ok(r.data.nama === "Gorengan Halal" && /\*\*\*\*/.test(r.data.wa) && r.data.lat === null && r.data.ttd, "halaman surat publik: nomor disamarkan, lokasi tidak dibuka");
r = await call("POST", "field/titik", { t: "kotak", nama_lokasi: "Kios Barokah", jenis_tempat: "Kios / toko", pemilik: "Pak Hasan", wa_pemilik: "081355500022", alamat: "Jl. Tadulako 12", kelurahan: "Lawanga", kecamatan: "Poso Kota", lat: -1.3851, lng: 120.7602, akurasi: 14 }, zis);
ok(r.s === 201 && /^K-\d{3}$/.test(r.data.kode), "kotak amal terdaftar dengan lokasi: " + r.data.kode); const kotakKode = r.data.kode;
r = await call("GET", "field/titik", null, zis);
const tp = r.data.items.find((i) => i.kode === pundi.kode);
ok(tp && tp.lat === -1.39123 && tp.pj === "Ahmad Zisko" && tp.status === "menunggu" && tp.jadwal === 15, "peta: titik baru tampil, PJ & jadwal benar, status menunggu");

// ---------- Slip setoran ----------
r = await call("POST", "field/slips", { sumber: "pundi", sumber_kode: pundi.kode, nama: "Gorengan Halal", alamat: "Jl. Pulau Sumatera No. 5", kab: "Poso", provinsi: "Sulawesi Tengah", wa: "081355500021", pekerjaan: "Wiraswasta",
  rincian: [{ k: "pundi", nominal: 31000 }], cara: "tunai", ttd_penyetor: PNG }, zis);
ok(r.s === 201 && r.data.no === "000001" && r.data.total === 31000 && r.data.id_donatur.startsWith("PSO-"), `slip tersimpan: No. ${r.data.no}, ID donatur ${r.data.id_donatur}`);
const slip1 = r.data;
r = await call("POST", `field/dok/slip/${slip1.no}`, { png: PNG, kirim: true }, zis);
wa = (await sent()).at(-1); ok(r.data.gambar && wa.url?.includes(`/api/doc/${slip1.token}.png`) && /Pundi Sedekah: Rp31\.000/.test(wa.m), "slip PNG dikirim ke WA donatur beserta rincian");
r = await call("POST", "field/slips", { no: "115705", sumber: "kotak", sumber_kode: kotakKode, nama: "Kios Barokah", wa: "081355500022", rincian: [{ k: "infaq", nominal: 150000 }, { k: "zakat", nominal: 50000 }], cara: "tunai" }, zis);
ok(r.s === 201 && r.data.no === "115705" && r.data.rincian.length === 2, "nomor slip kertas (115705) dipakai, 2 jenis dana dalam satu slip");
r = await call("POST", "field/slips", { no: "115705", nama: "X", rincian: [{ k: "infaq", nominal: 1000 }] }, zis); ok(r.s === 400 && /sudah dipakai/.test(r.data.error), "nomor slip ganda ditolak");
r = await call("GET", "field/slip-berikut", null, zis); ok(r.data.no === "115706", "nomor otomatis berikutnya melanjutkan slip kertas: " + r.data.no);
r = await call("GET", "admin/donations?q=115705", null, adm); ok(r.data.rows.length === 2 && r.data.rows.every((d) => d.status === "paid" && d.slip_no === "115705" && d.serah === "petugas"), "slip → 2 donasi lunas (zakat & infak terpisah), uang tercatat di petugas");
r = await call("GET", "field/titik", null, zis);
ok(r.data.items.find((i) => i.kode === pundi.kode).status === "dijemput" && r.data.items.find((i) => i.kode === pundi.kode).terakhir_nominal === 31000, "peta: pundi berubah hijau (sudah dijemput) Rp31.000");
ok(r.data.kas_saya.total === 231000 && r.data.kas_saya.slip === 2, "uang di tangan ZISKO: Rp231.000 (2 slip)");
r = await call("GET", "public/slip/" + slip1.token); ok(r.data.no === "000001" && r.data.ttd_penyetor && !r.data.token && /\*\*\*\*/.test(r.data.wa), "halaman slip publik untuk donatur (nomor disamarkan)");

// ---------- Setoran ke bendahara ----------
r = await call("GET", "field/setoran", null, ben); const g = r.data.petugas.find((p) => p.nama === "Ahmad Zisko");
ok(g && g.total === 231000 && g.slip.length === 2 && r.data.boleh_terima, "bendahara melihat uang yang masih dipegang ZISKO");
r = await call("POST", "field/setoran/terima", { petugas_id: g.petugas_id, slip: ["000001"] }, zis); ok(r.s === 403, "ZISKO tidak bisa menandai setorannya sendiri diterima");
r = await call("POST", "field/setoran/terima", { petugas_id: g.petugas_id, slip: ["000001"] }, ben); ok(r.s === 200 && r.data.total === 31000, "bendahara menerima setoran slip 000001");
wa = (await sent()).at(-1); ok(wa.t === "6285200000011" && /telah diterima oleh Siti Bendahara/.test(wa.m), "ZISKO mendapat WA bukti setoran diterima");
r = await call("GET", "field/me", null, zis); ok(r.data.kas.total === 200000, "sisa uang di ZISKO: Rp200.000");
r = await call("GET", "admin/dashboard", null, ket); ok(r.s === 200 && r.data.kas.total === 200000 && r.data.jemput.dijemput >= 2, "ketua: ringkasan menampilkan uang di petugas & status jemput");
r = await call("POST", "field/slips", { nama: "X", rincian: [{ k: "infaq", nominal: 1000 }] }, ket); ok(r.s === 403, "ketua tidak mencatat slip (hanya memantau)");

// ---------- Amplop Ramadhan ----------
const relId = (await call("GET", "admin/admins", null, adm)).data.find((a) => a.role === "amplop").id;
r = await call("POST", "field/amplop/buat", { periode: "Ramadhan 1448 H", awalan: "AR-", jumlah: 20 }, adm); ok(r.s === 201 && r.data.dari === "AR-0001" && r.data.sampai === "AR-0020", "20 amplop dibuat AR-0001 s.d. AR-0020");
r = await call("POST", "field/amplop/serahkan", { relawan_id: relId, dari: "AR-0001", sampai: "AR-0010" }, adm); ok(r.data.jumlah === 10, "10 amplop diserahkan ke relawan");
r = await call("GET", "field/amplop", null, amp); ok(r.data.rows.length === 10, "relawan hanya melihat 10 amplop miliknya");
r = await call("POST", "field/amplop/AR-0003/bagikan", { nama: "Ibu Nur", wa: "081355500031", alamat: "Jl. Pattimura 3", kelurahan: "Gebangrejo", lat: -1.3977, lng: 120.7488, akurasi: 20 }, amp); ok(r.s === 200, "amplop AR-0003 dibagikan + lokasi penerima");
r = await call("POST", "field/amplop/AR-0015/bagikan", { nama: "X" }, amp); ok(r.s === 403, "amplop relawan lain tidak bisa diubah");
r = await call("GET", "field/titik", null, amp); ok(r.data.items.length === 1 && r.data.items[0].t === "amplop" && r.data.items[0].status === "belum_kembali", "peta relawan: hanya amplopnya (belum kembali)");
const camps = (await call("GET", "field/meta", null, amp)).data.campaigns; const ar = camps.find((c) => c.slug === "amplop-ramadhan");
ok(ar && ar.status === "draft", "program Amplop Ramadhan tersedia (tersembunyi dari donatur online)");
r = await call("POST", "field/slips", { sumber: "pundi", sumber_kode: pundi.kode, nama: "X", rincian: [{ k: "pundi", nominal: 1000 }] }, amp); ok(r.s === 403, "relawan amplop tidak bisa mencatat setoran pundi");
r = await call("POST", "field/slips", { sumber: "amplop", sumber_kode: "AR-0003", nama: "Ibu Nur", wa: "081355500031", rincian: [{ k: "lain", campaign_id: ar.id, nominal: 75000 }], cara: "tunai" }, amp);
ok(r.s === 201 && r.data.rincian[0].label === "Amplop Ramadhan", "amplop kembali dicatat dengan slip (baris Lainnya: Amplop Ramadhan)");
const slipAmp = r.data.no;
r = await call("GET", "field/amplop?status=kembali", null, adm); ok(r.data.rows[0]?.kode === "AR-0003" && r.data.rows[0].nominal === 75000 && r.data.rows[0].slip_no === slipAmp, "status amplop: kembali Rp75.000 + nomor slip");

// ---------- Pembatalan ----------
r = await call("POST", `field/slips/${slipAmp}/batal`, { alasan: "uji" }, ben); ok(r.s === 200, "bendahara membatalkan slip salah input");
r = await call("GET", "field/amplop?status=dibagikan", null, adm); ok(r.data.rows.some((m) => m.kode === "AR-0003"), "amplop kembali ke status dibagikan setelah slip dibatalkan");
r = await call("GET", "admin/donations?q=" + slipAmp, null, adm); ok(r.data.rows.every((d) => d.status === "cancelled"), "donasi dari slip batal ikut dibatalkan");

// ---------- Google Drive ----------
let ds = (await call("GET", "admin/drive", null, adm)).data;
if (!ds.drives.some((d) => d.status === "aktif")) await call("POST", "admin/drive", { url: HOST + "/__gas?acc=9", secret: "rahasia-uji-123" }, adm);
ds = (await call("GET", "admin/drive", null, adm)).data; const acc = ds.drives.find((d) => d.status === "aktif").url.split("acc=")[1];
for (let i = 0; i < 4; i++) await call("POST", "admin/drive/sync", {}, adm);
const st = (await (await fetch(HOST + "/__gas/state")).json())[acc];
const y = new Date(Date.now() + 8 * 3600e3).getUTCFullYear();
ok(st.sheets[`Transaksi ${y}`]?.["Slip Setoran"] >= 3 && st.sheets["Data Induk"]?.["Amplop Ramadhan"] >= 10 && st.sheets["Data Induk"]?.["Pundi Sedekah"] >= 1, "Drive: sheet Slip Setoran (per tahun), Amplop Ramadhan, Pundi dengan lokasi");
ok(st.files.some((f) => f.startsWith("slip/")) && st.files.some((f) => f.startsWith("surat/")) && st.files.some((f) => f.startsWith("foto/")), "Drive: PNG slip, surat persetujuan, dan foto lokasi di folder masing-masing");
