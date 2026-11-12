// Uji WA blast: kontak, label, grup & anggota, kirim sekarang ke target campuran, spintax, Google Sheet, riwayat.
// Jalankan setelah wa-test (server uji MOCK=1).
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "", raw = false) => {
  const r = await fetch(B + path, { method, headers: { ...(raw ? { "content-type": "application/x-www-form-urlencoded" } : { "content-type": "application/json" }), cookie, origin: HOST }, body: raw ? body : (body ? JSON.stringify(body) : undefined) });
  const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { s: r.status, data, sc: (r.headers.get("set-cookie") || "").split(";")[0] };
};
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
const adm = (await call("POST", "admin/login", { email: "admin@wiz.id", password: "rahasia123" })).sc;

// Kontak
let r = await call("POST", "admin/wa/kontak", { wa: "0812 1111 0001", nama: "Ustadz Ahmad", label: "Pengurus" }, adm);
ok(r.s === 200 && r.data.baru === 1, "kontak manual tersimpan");
r = await call("POST", "admin/wa/kontak", { wa: "abc", nama: "x" }, adm);
ok(r.s === 400, "nomor tidak valid ditolak");
r = await call("POST", "admin/wa/kontak/impor", { teks: "Budi Santoso - 0812-1111-0002\n+62 812 1111 0003 Siti Aminah\n081211110004, 081211110005\nbaris tanpa nomor", label: "Relawan, Pengurus" }, adm);
ok(r.s === 200 && r.data.tersimpan === 4, `impor tempelan membaca 4 nomor (terbaca ${r.data.tersimpan})`);
r = await call("POST", "admin/wa/kontak/impor", { items: [{ wa: "081211110006", nama: "Dari VCF" }, { wa: "081211110002", nama: "" }], label: "Majelis", sumber: "vcf" }, adm);
ok(r.s === 200 && r.data.baru === 1, "impor daftar file: satu baru, satu diperbarui");
r = await call("GET", "admin/wa/kontak?label=pengurus", null, adm);
ok(r.data.total === 5, `filter label Pengurus: ${r.data.total} kontak`);
const budi = (await call("GET", "admin/wa/kontak?q=budi", null, adm)).data.rows[0];
ok(budi && budi.nama === "Budi Santoso" && /Majelis/.test(budi.label) && /Relawan/.test(budi.label), "nama tetap, label digabung saat impor ulang");
r = await call("GET", "admin/wa/cari?q=siti", null, adm);
ok(r.data.some((x) => x.wa === "6281211110003" && x.nama === "Siti Aminah" && x.sumber === "kontak"), "cari penerima berdasarkan nama (kontak + donatur)");
r = await call("GET", "admin/wa/data", null, adm);
ok(r.data.kontak_total === 6 && r.data.labels.find((x) => x.label === "Relawan")?.n === 4, "ringkasan label kontak");

// Grup
r = await call("POST", "admin/wa/grup/sinkron", {}, adm);
ok(r.s === 200 && r.data.jumlah === 2, "sinkron grup dari Fonnte");
const G = "120363000000000001@g.us";
r = await call("POST", `admin/wa/grup/${encodeURIComponent(G)}/anggota`, { teks: "Rahmat 081211110007\n081211110008" }, adm);
ok(r.s === 200 && r.data.jumlah === 2, "anggota grup ditambah dari tempelan");
const key = new URL((await call("GET", "admin/wa/jadwal", null, adm)).data.webhook).searchParams.get("k");
r = await call("POST", `wa/masuk?k=${key}`, `sender=${encodeURIComponent(G)}&member=081211110009&name=Hasan&message=Masya+Allah`, "", true);
ok(r.s === 200, "webhook pesan grup diterima");
r = await call("GET", `admin/wa/grup/${encodeURIComponent(G)}/anggota`, null, adm);
ok(r.data.length === 3 && r.data.find((x) => x.wa === "6281211110009")?.sumber === "webhook", "anggota grup tercatat otomatis dari webhook");
r = await call("POST", `wa/masuk?k=${key}`, `sender=${encodeURIComponent(G)}&member=081211110009&message=berhenti`, "", true);
r = await call("GET", "admin/wa/berhenti", null, adm);
ok(!r.data.find((x) => x.wa === "6281211110009"), "kata berhenti di grup tidak dianggap permintaan berhenti");

// Pratinjau target campuran (duplikat dihitung sekali)
r = await call("POST", "admin/wa/pratinjau", { target: { label: ["Relawan"], anggota: [G], nomor: "081211110002\nTamu 0813 9999 0001", grup: [G] } }, adm);
ok(r.data.jumlah === 8 && r.data.grup === 1, `pratinjau campuran: ${r.data.jumlah} pribadi + ${r.data.grup} grup`);
r = await call("POST", "admin/wa/jadwal", { judul: "Kosong", isi: "x", mode: "sekarang", target: {} }, adm);
ok(r.s === 400, "tanpa penerima ditolak");

// Kirim sekarang: spintax + {nama} + grup
r = await call("POST", "admin/wa/jadwal", { judul: "Undangan kajian", jenis: "pengumuman", isi: "{Assalamu'alaikum|Salam} {nama}, hadirilah kajian Ahad pagi.", mode: "sekarang", target: { label: ["Pengurus"], grup: [G] } }, adm);
ok(r.s === 201 && r.data.jumlah === 6, `kirim sekarang: ${r.data.jumlah} pesan (5 kontak + 1 grup)`);
const jidNow = r.data.id;
r = await call("GET", "admin/wa/riwayat", null, adm);
const mine = r.data.rows.filter((x) => x.judul === "Undangan kajian");
ok(mine.length === 6 && mine.every((x) => x.status === "terkirim"), "langsung terkirim tanpa menunggu cron");
const ahmad = mine.find((x) => x.wa === "6281211110001");
ok(ahmad && /^(Assalamu'alaikum|Salam) Ustadz Ahmad,/.test(ahmad.pesan) && /BERHENTI/.test(ahmad.pesan), "nama, spintax, dan footer berhenti terpasang");
const g = mine.find((x) => x.grup === 1);
ok(g && !/BERHENTI/.test(g.pesan) && /Bapak\/Ibu/.test(g.pesan), "pesan grup tanpa footer berhenti");

// Google Sheet
r = await call("POST", "admin/wa/sheet/cek", { url: "https://docs.google.com/spreadsheets/d/1AbcdefghijklmnopqrstuvwxyZ/edit#gid=0", kategori: "hadits" }, adm);
ok(r.s === 200 && r.data.jumlah === 2 && /\*Hadits Harian\*/.test(r.data.contoh[0].teks) && /📚 HR\. Bukhari/.test(r.data.contoh[0].teks), "Sheet terbaca dan disusun (judul, arab, terjemah, sumber)");
r = await call("POST", "admin/wa/sheet/cek", { url: "https://docs.google.com/spreadsheets/d/1PRIVATxxxxxxxxxxxxxxxxxxxx/edit" }, adm);
ok(r.s === 400 && /dibagikan/.test(r.data.error), "Sheet yang belum dibagikan memberi pesan jelas");
r = await call("POST", "admin/wa/sheet/cek", { url: "https://contoh.com/sheet" }, adm);
ok(r.s === 400, "tautan bukan Google Sheet ditolak");
r = await call("POST", "admin/wa/jadwal", { judul: "Hadits harian", jenis: "hadits", sumber: "sheet", sheet_url: "https://docs.google.com/spreadsheets/d/1AbcdefghijklmnopqrstuvwxyZ/edit#gid=0", kategori: "hadits", mode: "harian", jam: "05:30", target: { pilih: ["081211110001"] } }, adm);
ok(r.s === 201, "jadwal harian dari Google Sheet dibuat");
const jidS = r.data.id;
r = await call("POST", `admin/wa/jadwal/${jidS}/kirim`, {}, adm);
ok(r.s === 200 && r.data.jumlah === 1, "kirim materi berikutnya sekarang");
await call("POST", `admin/wa/jadwal/${jidS}/kirim`, {}, adm);
r = await call("GET", "admin/wa/riwayat", null, adm);
const hs = r.data.rows.filter((x) => x.judul === "Hadits harian").map((x) => x.pesan).reverse();
ok(hs.length === 2 && /niatnya, Ustadz Ahmad/.test(hs[0]) && /Senyummu/.test(hs[1]), "materi berputar ke baris berikutnya, {nama} di Sheet diganti");
r = await call("POST", "admin/wa/jadwal", { judul: "Ayat", sumber: "sheet", sheet_url: "https://docs.google.com/spreadsheets/d/1AbcdefghijklmnopqrstuvwxyZ/edit", kategori: "ayat", mode: "sekarang", target: { pilih: ["081211110001"] } }, adm);
r = await call("GET", "admin/wa/riwayat", null, adm);
ok(/""?tunaikan""? zakat|"tunaikan" zakat/.test(r.data.rows.find((x) => x.judul === "Ayat")?.pesan || ""), "kutipan di dalam sel CSV terbaca benar");
r = await call("GET", "admin/wa/jadwal", null, adm);
const js = r.data.jadwal.find((x) => x.id === jidS);
ok(js && js.mode === "harian" && js.sumber === "sheet" && js.target.pilih?.length === 1, "daftar jadwal menampilkan sumber & target");

// Ulang yang gagal, hapus kontak & berhenti
r = await call("POST", `admin/wa/jadwal/${jidNow}/ulang`, {}, adm);
ok(r.s === 200 && r.data.jumlah === 0, "kirim ulang: tidak ada yang gagal");
r = await call("POST", "admin/wa/jadwal", { judul: "Paragraf", sumber: "tulis", isi: "Baris satu {nama}\nBaris dua\n\nParagraf tiga\n---\nPesan kedua", mode: "sekarang", target: { pilih: ["081211110001"] } }, adm);
ok(r.s === 201 && r.data.jumlah === 1, "mode tulis: pesan beberapa paragraf dikirim utuh");
r = await call("GET", "admin/wa/riwayat", null, adm);
const pg = r.data.rows.find((x) => x.judul === "Paragraf")?.pesan || "";
ok(/Baris satu Ustadz Ahmad\nBaris dua\n\nParagraf tiga/.test(pg) && !/Pesan kedua/.test(pg), "baris baru tetap, pesan kedua menunggu giliran");
r = await call("GET", "admin/wa/jadwal", null, adm);
ok(r.data.jadwal.find((x) => x.judul === "Paragraf")?.baris === 2, "pemisah --- menghasilkan dua pesan bergiliran");
r = await call("DELETE", "admin/wa/kontak/081211110006", null, adm);
ok(r.s === 200 && (await call("GET", "admin/wa/data", null, adm)).data.kontak_total === 5, "kontak dihapus");
await call("POST", "admin/wa/berhenti", { wa: "081211110005" }, adm);
r = await call("POST", "admin/wa/pratinjau", { target: { label: ["Relawan"] } }, adm);
ok(r.data.jumlah === 3, "nomor berhenti dikecualikan dari label");
await call("DELETE", "admin/wa/berhenti/081211110005", null, adm);
r = await call("POST", "admin/wa/pratinjau", { target: { label: ["Relawan"] } }, adm);
ok(r.data.jumlah === 4, "hapus dari daftar berhenti: nomor bisa menerima lagi");
r = await call("DELETE", `admin/wa/grup/${encodeURIComponent(G)}`, null, adm);
ok(r.s === 200 && (await call("GET", "admin/wa/data", null, adm)).data.grup.length === 1, "grup dihapus beserta anggotanya");
r = await call("GET", "admin/wa/kontak", null, "");
ok(r.s === 401, "tanpa login ditolak");
