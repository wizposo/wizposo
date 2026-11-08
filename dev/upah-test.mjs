// Uji upah & komisi: persen afiliator dan ZISKO, saldo, penarikan oleh afiliator, persetujuan admin, dan upah slip.
// Jalankan setelah server uji hidup (MOCK=1). Dijalankan setelah api-test.mjs dan field-test.mjs.
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };

let r = await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" });
const adm = r.sc;
ok(!!adm, "admin masuk");

// ---------- Pengaturan persen ----------
r = await call("PUT", "admin/settings", { upah_afiliator_persen: 5, upah_zisko_persen: 10, tarik_min: 1000 }, adm);
ok(r.s === 200, "persen afiliator 5%, ZISKO 10%, tarik minimal Rp1.000 disimpan");
r = await call("PUT", "admin/settings", { upah_zisko_persen: 150 }, adm);
r = await call("GET", "admin/settings", null, adm);
ok(r.data.upah_zisko_persen === 100, "persen dibatasi maksimal 100");
await call("PUT", "admin/settings", { upah_zisko_persen: 10 }, adm);
r = await call("PUT", "admin/settings", { upah_zisko_persen: 10 }, (await call("POST", "admin/login", { email: "bendahara@wiz.id", password: "rahasia123" })).sc);
ok(r.s === 403, "bendahara tidak bisa mengubah persen");

// ---------- Afiliator: donasi lewat link ----------
r = await call("POST", "fr/register", { nama: "Yusuf Afiliator", wa: "081300000777", pin: "424242", kota: "Poso" });
ok(r.s === 201, "afiliator daftar, kode " + r.data.kode);
const fr = r.sc, kode = r.data.kode;
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.tersedia === 0 && r.data.komisi.persen === 5, "saldo awal Rp0, persen 5%");
const frId = (await call("GET", "admin/fundraisers", null, adm)).data.find((f) => f.kode === kode).id;

r = await call("POST", "public/donations", { campaign: "infak-terbaik", nominal: 100000, nama: "Donatur Link", wa: "081400000888", metode: "gateway", ref: kode });
ok(r.s === 201, "donasi masuk lewat link afiliator (belum lunas)");
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.tersedia === 0, "donasi belum lunas belum menambah saldo");
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 100000, nama: "Donatur Link", wa: "081400000888", metode: "tunai", fundraiser_id: frId }, adm);
ok(r.s === 201, "donasi lunas dicatat admin untuk afiliator");
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.diperoleh === 5000 && r.data.saldo.tersedia === 5000, "donasi Rp100.000 × 5% = saldo Rp5.000 bertambah otomatis");

// ---------- Penarikan ----------
r = await call("POST", "fr/tarik", { nominal: 500, rekening: "BSI 7123 Yusuf" }, fr);
ok(r.s === 400 && /minimal/.test(r.data.error), "penarikan di bawah minimal ditolak");
r = await call("POST", "fr/tarik", { nominal: 9000, rekening: "BSI 7123 Yusuf" }, fr);
ok(r.s === 400 && /tersedia/.test(r.data.error), "penarikan melebihi saldo ditolak");
r = await call("POST", "fr/tarik", { nominal: 3000 }, fr);
ok(r.s === 400, "penarikan tanpa rekening ditolak");
r = await call("POST", "fr/tarik", { nominal: 3000, rekening: "BSI 7123 Yusuf" }, fr);
ok(r.s === 201 && r.data.saldo.tersedia === 2000, "permintaan Rp3.000 diajukan, saldo tersedia tinggal Rp2.000");
const tarik1 = r.data.id;
r = await call("POST", "fr/tarik", { nominal: 2500, rekening: "DANA 0813 Yusuf" }, fr);
ok(r.s === 400, "saldo yang sedang diajukan tidak bisa ditarik dua kali");
r = await call("POST", "fr/tarik", { nominal: 2000, rekening: "DANA 0813 Yusuf" }, fr);
ok(r.s === 201, "permintaan kedua Rp2.000 diajukan");
const tarik2 = r.data.id;

r = await call("GET", "admin/penarikan", null, adm);
ok(r.data.length === 2 && r.data.every((t) => t.status === "diajukan" && t.kode === kode), "admin melihat 2 permintaan yang menunggu");
r = await call("POST", `admin/penarikan/afiliator/${tarik1}/setuju`, { catatan: "ditransfer" }, adm);
ok(r.s === 200, "admin menyetujui permintaan pertama");
r = await call("POST", `admin/penarikan/afiliator/${tarik1}/setuju`, {}, adm);
ok(r.s === 400, "permintaan yang sudah disetujui tidak bisa diproses ulang");
r = await call("POST", `admin/penarikan/afiliator/${tarik2}/tolak`, {}, adm);
ok(r.s === 400, "penolakan wajib menyertakan alasan");
r = await call("POST", `admin/penarikan/afiliator/${tarik2}/tolak`, { alasan: "rekening tidak sesuai" }, adm);
ok(r.s === 200, "admin menolak permintaan kedua");
r = await call("GET", "fr/me", null, fr);
const t1 = r.data.tarik.find((t) => t.id === tarik1), t2 = r.data.tarik.find((t) => t.id === tarik2);
ok(t1.status === "disetujui" && t2.status === "ditolak", "status penarikan terbarui di portal afiliator");
ok(r.data.saldo.dibayar === 3000 && r.data.saldo.tersedia === 2000, "pencatatan saldo: dibayar Rp3.000, tersedia Rp2.000 (permintaan ditolak kembali)");
r = await call("GET", "admin/penarikan?status=semua", null, adm);
ok(r.data.length === 2, "filter semua status berfungsi");

// Persen per orang: diubah admin, hanya berlaku untuk donasi berikutnya
r = await call("PUT", `admin/fundraisers/${frId}`, { komisi_persen: 8 }, adm);
ok(r.s === 200, "admin mengatur komisi khusus 8% untuk afiliator ini");
r = await call("PUT", `admin/fundraisers/${frId}`, { komisi_persen: 8 }, (await call("POST", "admin/login", { email: "bendahara@wiz.id", password: "rahasia123" })).sc);
ok(r.s === 403, "bendahara tidak bisa mengubah komisi afiliator");
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 100000, nama: "Donatur Dua", wa: "081400000889", metode: "tunai", fundraiser_id: frId }, adm);
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.diperoleh === 13000, "donasi baru pakai 8% (Rp8.000), donasi lama tetap 5% (total diperoleh Rp13.000)");
r = await call("POST", "admin/donations", { campaign: "zakat-maal", nominal: 100000, nama: "Donatur Zakat", wa: "081400000890", metode: "tunai", fundraiser_id: frId }, adm);
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.diperoleh === 13000, "donasi zakat lewat afiliator tidak menambah komisi");

// ---------- ZISKO: setoran dan upah ----------
r = await call("POST", "admin/admins", { nama: "Ahmad Zisko", role: "zisko", wa: "085200000021", password: "123456", wilayah: "Poso Kota" }, adm);
const zisId = r.data && r.data.id;
const zisRow = (await call("GET", "admin/admins", null, adm)).data.find((a) => a.wa && a.wa.endsWith("85200000021"));
const zis = (await call("POST", "admin/login", { email: "085200000021", password: "123456" })).sc;
ok(!!zis, "ZISKO masuk");
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.setoran === 0 && r.data.upah.upah === 0 && r.data.upah.persen === 10, "awal: setoran Rp0, upah Rp0, persen 10%");

r = await call("POST", "field/slips", { nama: "Donatur Slip", wa: "081499900001", cara: "tunai", sumber: "langsung", rincian: [{ k: "zakat", nominal: 100000 }, { k: "pundi", nominal: 100000 }] }, zis);
ok(r.s === 201, "slip pertama Rp200.000 dicatat");
const slipA = r.data.no;
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.setoran === 200000 && r.data.upah.upah === 10000, "setelah slip: setoran Rp200.000, upah 10% dari infak Rp100.000 = Rp10.000");

r = await call("PUT", "admin/settings", { upah_zisko_persen: 20 }, adm);
r = await call("POST", "field/slips", { nama: "Donatur Slip Dua", wa: "081499900002", cara: "tunai", sumber: "langsung", rincian: [{ k: "pundi", nominal: 50000 }] }, zis);
ok(r.s === 201, "slip kedua Rp50.000 dicatat setelah persen naik ke 20%");
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.setoran === 250000 && r.data.upah.upah === 20000, "slip lama tetap 10% (Rp10.000), slip baru 20% (Rp10.000): total upah Rp20.000");
await call("PUT", "admin/settings", { upah_zisko_persen: 10 }, adm);

r = await call("PUT", `admin/admins/${zisRow.id}`, { nama: "Ahmad Zisko", role: "zisko", wa: "085200000021", upah_persen: 15, aktif: true }, adm);
ok(r.s === 200, "admin mengatur persen khusus 15% untuk ZISKO ini");
r = await call("POST", "field/slips", { nama: "Donatur Slip Tiga", wa: "081499900003", cara: "tunai", sumber: "langsung", rincian: [{ k: "pundi", nominal: 100000 }] }, zis);
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.persen === 15 && r.data.upah.upah === 35000, "slip berikutnya memakai 15% khusus");
r = await call("POST", "field/slips", { nama: "Donatur Slip Empat", wa: "081499900004", cara: "tunai", sumber: "langsung", rincian: [{ k: "zakat", nominal: 100000 }] }, zis);
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.setoran === 450000 && r.data.upah.upah === 35000, "slip dana zakat saja tidak menambah upah");

r = await call("POST", `field/slips/${slipA}/batal`, { alasan: "salah input" }, adm);
ok(r.s === 200, "admin membatalkan slip pertama");
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.setoran === 250000 && r.data.upah.upah === 10000 + 15000, "slip batal tidak ikut dihitung: setoran Rp250.000, upah Rp25.000");

// ---------- Ringkasan admin ----------
r = await call("GET", "admin/upah", null, adm);
const pet = r.data.petugas.find((p) => p.id === zisRow.id), af = r.data.afiliator.find((f) => f.kode === kode);
ok(pet && pet.setoran === 250000 && pet.upah === 25000, "ringkasan admin: ZISKO setoran Rp250.000, upah Rp25.000");
ok(af && af.diperoleh === 13000 && af.dibayar === 3000 && af.diajukan === 0 && af.tersedia === 10000, "ringkasan admin: saldo afiliator konsisten (Rp13.000 − Rp3.000)");
// ---------- Penarikan upah ZISKO ----------
r = await call("POST", "field/tarik", { nominal: 500, rekening: "BSI 1234567890 a.n. Ahmad" }, zis);
ok(r.s === 400 && /minimal/.test(r.data.error), "penarikan upah di bawah minimal ditolak");
r = await call("POST", "field/tarik", { nominal: 30000, rekening: "BSI 1234567890 a.n. Ahmad" }, zis);
ok(r.s === 400 && /tersedia/.test(r.data.error), "penarikan upah melebihi saldo ditolak");
r = await call("POST", "field/tarik", { nominal: 10000, rekening: "" }, zis);
ok(r.s === 400, "penarikan upah tanpa rekening ditolak");
r = await call("POST", "field/tarik", { nominal: 10000, rekening: "BSI 1234567890 a.n. Ahmad" }, zis);
ok(r.s === 201 && r.data.saldo.tersedia === 15000, "petugas mengajukan tarik Rp10.000, saldo tersedia Rp15.000");
const tarikZ1 = r.data.id;
r = await call("POST", "field/tarik", { nominal: 5000, rekening: "DANA 0852 a.n. Ahmad" }, zis);
const tarikZ2 = r.data.id;
r = await call("GET", "admin/penarikan", null, adm);
ok(r.data.some((t) => t.tipe === "petugas" && t.id === tarikZ1 && t.status === "diajukan"), "permintaan petugas masuk daftar admin");
r = await call("POST", `admin/penarikan/petugas/${tarikZ1}/setuju`, { catatan: "ditransfer" }, adm);
ok(r.s === 200, "admin menyetujui penarikan petugas");
r = await call("POST", `admin/penarikan/petugas/${tarikZ2}/tolak`, { alasan: "nomor DANA tidak valid" }, adm);
ok(r.s === 200, "admin menolak penarikan petugas");
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.dibayar === 10000 && r.data.upah.tersedia === 15000, "saldo petugas: dibayar Rp10.000, tersedia Rp15.000 (penarikan ditolak kembali)");
ok(r.data.tarik.find((t) => t.id === tarikZ1)?.status === "disetujui" && r.data.tarik.find((t) => t.id === tarikZ2)?.status === "ditolak", "riwayat tarik petugas terbarui");
r = await call("POST", `admin/penarikan/petugas/${tarikZ1}/setuju`, {}, adm);
ok(r.s === 400, "penarikan petugas yang sudah diproses tidak bisa diulang");
r = await call("GET", "admin/upah", null, adm);
const pz = r.data.petugas.find((p) => p.id === zisRow.id);
ok(pz && pz.dibayar === 10000 && pz.tersedia === 15000, "ringkasan admin mencatat saldo petugas");
r = await call("GET", "admin/penarikan", null, zis);
ok(r.s === 403, "ZISKO tidak bisa melihat daftar penarikan admin");
r = await call("GET", "admin/upah", null, (await call("POST", "admin/login", { email: "bendahara@wiz.id", password: "rahasia123" })).sc);
ok(r.s === 200, "bendahara bisa melihat ringkasan upah");
r = await call("GET", "admin/upah", null, zis);
ok(r.s === 403, "ZISKO tidak bisa melihat ringkasan upah");
