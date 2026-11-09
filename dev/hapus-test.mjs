// Uji hapus transaksi: transaksi belum lunas boleh dihapus, donasi lunas tidak.
// Jalankan setelah server uji hidup (MOCK=1).
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: sc ? sc.split(";")[0] : "" };
};
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };

const adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;
ok(!!adm, "admin masuk");

// Transaksi tunai yang sudah lunas
let r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 50000, nama: "Uji Hapus Lunas", wa: "081400000777", metode: "tunai" }, adm);
ok(r.s === 201, "donasi lunas dicatat");
const paidId = r.data.id;
r = await call("DELETE", `admin/donations/${paidId}`, null, adm);
ok(r.s === 400 && /lunas/.test(r.data.error), "donasi lunas tidak bisa dihapus");

// Transaksi transfer yang masih menunggu
r = await call("POST", "admin/donations", { campaign: "infak-terbaik", nominal: 50000, nama: "Uji Hapus Pending", wa: "081400000778", metode: "transfer" }, adm);
ok(r.s === 201, "donasi menunggu dicatat");
const pendId = r.data.id;
r = await call("POST", `admin/donations/${pendId}/status`, { status: "cancelled" }, adm);
ok(r.s === 200, "donasi dibatalkan");
r = await call("DELETE", `admin/donations/${pendId}`, null, adm);
ok(r.s === 200, "donasi dibatalkan boleh dihapus");
r = await call("DELETE", `admin/donations/${pendId}`, null, adm);
ok(r.s === 404, "transaksi yang sudah dihapus tidak ditemukan lagi");

// Hanya yang berhak
const bend = (await call("POST", "admin/login", { email: "bendahara@wiz.id", password: "rahasia123" })).sc;
r = await call("DELETE", `admin/donations/${paidId}`, null, bend);
ok(r.s === 400 || r.s === 403, "bendahara tidak bisa menghapus donasi lunas");
