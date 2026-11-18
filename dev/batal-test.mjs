// Uji pembatalan & penghapusan donasi yang sudah lunas: terkumpul program, donasi masuk & komisi afiliator,
// serta upah ZISKO (lewat slip) ikut terkoreksi. Jalankan setelah server uji hidup (MOCK=1).
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };
const sent = async () => (await fetch(HOST + "/__sent")).json();
const terkumpul = async () => (await call("GET", "public/campaigns/infak-terbaik")).data.terkumpul;

const adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;
ok(!!adm, "admin masuk");
await call("PUT", "admin/settings", { upah_afiliator_persen: 5, upah_zisko_persen: 10 }, adm);

// ---------- Afiliator ----------
let r = await call("POST", "fr/register", { nama: "Idul Afiliator", wa: "081300004444", pin: "121212" });
const fr = r.sc, kode = r.data.kode;
const frId = (await call("GET", "admin/fundraisers", null, adm)).data.find((f) => f.kode === kode).id;
const awal = await terkumpul();
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 200000, nama: "Sigit", wa: "081400004441", metode: "transfer", fundraiser_id: frId }, adm);
const d1 = r.data.id;
await call("POST", `admin/donations/${d1}/status`, { status: "paid" }, adm);
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 100000, nama: "Kurnia", wa: "081400004442", metode: "tunai", fundraiser_id: frId }, adm);
const d2 = r.data.id;
r = await call("GET", "fr/me", null, fr);
ok(r.data.stat.n === 2 && r.data.saldo.diperoleh === 15000, `afiliator: 2 donasi masuk, komisi Rp15.000 (${r.data.stat.n}, ${r.data.saldo.diperoleh})`);
ok(await terkumpul() >= awal + 300000, "terkumpul program bertambah");

r = await call("GET", `admin/donations?q=${d1}`, null, adm);
const row = r.data.rows.find((x) => x.id === d1);
ok(row.status === "paid" && row.komisi === 10000, "detail admin menampilkan komisi Rp10.000");

// Batalkan donasi lunas
const before = (await sent()).length;
r = await call("POST", `admin/donations/${d1}/status`, { status: "cancelled", alasan: "dobel input" }, adm);
ok(r.s === 200 && /komisi afiliator/.test(r.data.info), "donasi lunas bisa dibatalkan: " + r.data.info);
r = await call("GET", `admin/donations?q=${d1}`, null, adm);
const b1 = r.data.rows.find((x) => x.id === d1);
ok(b1.status === "cancelled" && /dobel input/.test(b1.catatan) && !b1.paid_at, "status Dibatalkan, alasan tercatat");
r = await call("GET", "fr/me", null, fr);
ok(r.data.stat.n === 1 && r.data.saldo.diperoleh === 5000, "donasi masuk & komisi afiliator ikut berkurang");
ok(!r.data.recent.some((x) => x.total === b1.total), "tidak muncul lagi di daftar donasi masuk afiliator");
ok(await terkumpul() === awal + (row.total - row.total) + 100000 + (await call("GET", `admin/donations?q=${d2}`, null, adm)).data.rows[0].total - 100000, "terkumpul program berkurang");
await new Promise((res) => setTimeout(res, 100));
const msgs = (await sent()).slice(before);
ok(msgs.some((m) => /dibatalkan/.test(m.m) && /Rp10\.000|Rp 10\.000/.test(m.m)), "afiliator dikabari lewat WA beserta komisi yang dibatalkan");
r = await call("POST", `admin/donations/${d1}/status`, { status: "cancelled" }, adm);
ok(r.s === 200 && /sebelumnya/.test(r.data.info), "batal dua kali aman");

// Hapus permanen donasi lunas
r = await call("DELETE", `admin/donations/${d2}?alasan=${encodeURIComponent("salah program")}`, null, adm);
ok(r.s === 200 && /Donasi dihapus/.test(r.data.info), "donasi lunas bisa dihapus permanen: " + r.data.info);
r = await call("GET", "fr/me", null, fr);
ok(r.data.stat.n === 0 && r.data.saldo.diperoleh === 0, "komisi dari donasi yang dihapus ikut hilang");
ok(await terkumpul() === awal, "terkumpul program kembali seperti semula");
r = await call("DELETE", `admin/donations/${d1}`, null, adm);
ok(r.s === 200, "donasi yang sudah dibatalkan juga bisa dihapus");

// Komisi yang sudah ditarik: selisih dipotong dari komisi berikutnya
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 100000, nama: "Ahmad", wa: "081400004443", metode: "tunai", fundraiser_id: frId }, adm);
const d3 = r.data.id;
await call("PUT", "admin/settings", { tarik_min: 1000 }, adm);
r = await call("POST", "fr/tarik", { nominal: 5000, rekening: "BSI 1 Idul" }, fr);
const tid = (await call("GET", "admin/penarikan", null, adm)).data.afiliator?.find((t) => t.nominal === 5000)?.id ?? (await call("GET", "admin/penarikan", null, adm)).data.rows?.find((t) => t.nominal === 5000)?.id;
if (tid) await call("POST", `admin/penarikan/afiliator/${tid}/setuju`, { catatan: "ok" }, adm);
await call("POST", `admin/donations/${d3}/status`, { status: "cancelled" }, adm);
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 200000, nama: "Budi", wa: "081400004444", metode: "tunai", fundraiser_id: frId }, adm);
r = await call("GET", "fr/me", null, fr);
ok(r.data.saldo.tersedia === 5000, `komisi yang terlanjur ditarik dipotong dari komisi berikutnya (tersedia ${r.data.saldo.tersedia})`);

// ---------- ZISKO lewat slip ----------
await call("POST", "admin/admins", { nama: "Zisko Batal", role: "zisko", wa: "085200004444", password: "123456", wilayah: "Poso" }, adm);
const zis = (await call("POST", "admin/login", { email: "085200004444", password: "123456" })).sc;
r = await call("POST", "field/slips", { nama: "Donatur Slip", wa: "081499904444", cara: "tunai", sumber: "langsung", rincian: [{ k: "pundi", nominal: 100000 }] }, zis);
const slip = r.data.no;
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.upah === 10000, "upah ZISKO Rp10.000 dari slip");
const ds = (await call("GET", `admin/donations?q=${encodeURIComponent(slip)}`, null, adm)).data.rows[0];
ok(ds && ds.status === "paid" && ds.slip_no === slip, "donasi slip tercatat lunas");
r = await call("POST", `admin/donations/${ds.id}/status`, { status: "cancelled" }, adm);
ok(r.s === 400 && /slip/.test(r.data.error), "donasi slip diarahkan ke pembatalan slip");
r = await call("DELETE", `admin/donations/${ds.id}`, null, adm);
ok(r.s === 400 && /slip/.test(r.data.error), "donasi slip tidak bisa dihapus sebelum slip dibatalkan");
r = await call("POST", `field/slips/${encodeURIComponent(slip)}/batal`, { alasan: "salah input" }, adm);
ok(r.s === 200, "slip dibatalkan admin");
r = await call("GET", "field/me", null, zis);
ok(r.data.upah.upah === 0, "upah ZISKO ikut dibatalkan");
r = await call("DELETE", `admin/donations/${ds.id}`, null, adm);
ok(r.s === 200, "setelah slip batal, donasinya bisa dihapus");
