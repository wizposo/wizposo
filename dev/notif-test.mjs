// Uji notifikasi admin & afiliator serta kode afiliasi nomor urut. Jalankan setelah suite lain (server MOCK=1).
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: (r.headers.get("set-cookie") || "").split(";")[0] };
};
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
const adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;
// Pastikan WA admin terisi
const set = (await call("GET", "admin/settings", null, adm)).data;
if (!set.wa_admin) await call("PUT", "admin/settings", { ...set, wa_admin: "081299990000" }, adm);

let r = await call("POST", "fr/register", { nama: "Rahasia Namanya", wa: "081355550001", pin: "123456", kota: "Poso" });
ok(r.s === 201 && /^\d{4,}$/.test(r.data.kode), `kode afiliasi berupa nomor urut: ${r.data.kode}`);
const kode = r.data.kode;
ok(!/RAHASIA/i.test(kode), "kode tidak memuat nama afiliator");
r = await call("GET", "public/fundraiser/" + kode);
ok(r.s === 200 && r.data?.kode === kode, "tautan ?ref=" + kode + " dikenali");
r = await call("GET", "public/fundraiser/" + String(Number(kode)));
ok(r.data?.kode === kode, "kode tanpa nol di depan juga dikenali");

// Donasi transfer lewat tautan afiliasi
const camp = (await call("GET", "public/campaigns")).data.find((c) => c.jenis_dana !== "zakat") || (await call("GET", "public/campaigns")).data[0];
r = await call("POST", "public/donations", { campaign: camp.slug, nominal: 100000, nama: "Donatur Notif", wa: "081355550002", metode: "transfer", ref: kode });
ok(r.s === 201 || r.s === 200, "donasi transfer lewat tautan afiliasi dibuat");
const did = r.data.id;
const riwayat = async () => (await call("GET", "admin/wa/riwayat", null, adm)).data.rows;
let rows = await riwayat();
const admBaru = rows.find((x) => x.judul === "Info admin: donasi baru" && x.pesan.includes(did));
ok(admBaru && admBaru.pesan.includes(`/admin#donasi?id=${did}`), "admin menerima WA donasi baru berisi tautan tandai lunas");
ok(admBaru && /kode unik \d+/.test(admBaru.pesan) && admBaru.pesan.includes("Rahasia Namanya"), "pesan admin memuat total, kode unik, dan afiliator");
const frBaru = rows.find((x) => x.judul === "Info afiliator: donasi baru" && x.wa === "6281355550001");
ok(frBaru && frBaru.pesan.includes(`kode ${kode}`) && frBaru.status === "terkirim", "afiliator menerima WA saat ada donasi lewat tautannya");

// Bukti transfer
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
r = await call("POST", `public/donations/${did}/bukti`, { gambar: png });
ok(r.s === 200, "bukti transfer diunggah");
rows = await riwayat();
ok(rows.some((x) => x.judul === "Info admin: bukti transfer" && x.pesan.includes(`/admin#donasi?id=${did}`)), "WA bukti transfer ke admin berisi tautan langsung");

// Admin menandai lunas → afiliator dapat kabar lunas + komisi
r = await call("POST", `admin/donations/${did}/status`, { status: "paid" }, adm);
ok(r.s === 200, "admin menandai lunas");
await new Promise((res) => setTimeout(res, 300));
rows = await riwayat();
const frLunas = rows.find((x) => x.judul === "Info afiliator: lunas" && x.wa === "6281355550001");
ok(frLunas && /sudah \*lunas\*/.test(frLunas.pesan), "afiliator menerima WA donasi lunas");
ok(frLunas && /Komisi Anda: \*Rp/.test(frLunas.pesan), "pesan lunas afiliator menyebut komisi");
ok(rows.some((x) => x.judul === "Info admin: lunas" && x.pesan.includes(`/admin#donasi?id=${did}`)), "admin menerima WA lunas dengan tautan detail");
ok(rows.some((x) => x.judul === "Kuitansi donatur" && x.wa === "6281355550002"), "kuitansi donatur tercatat di riwayat");
const d = (await call("GET", `admin/donations?q=${did}`, null, adm)).data;
ok(JSON.stringify(d).includes("Rahasia Namanya"), "donasi tercatat atas nama afiliator");
