// Uji galeri gambar program & laporan penyaluran (slide). Jalankan pada server uji MOCK=1.
const HOST = "http://localhost:8788", B = HOST + "/api/";
const call = async (method, path, body, cookie = "") => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", cookie, origin: HOST }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let data; try { data = JSON.parse(txt); } catch { data = txt; } return { s: r.status, data };
};
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
const lr = await fetch(B + "admin/login", { method: "POST", headers: { "content-type": "application/json", origin: HOST }, body: JSON.stringify({ email: "admin@wiz.id", password: "rahasia123" }) });
const adm = (lr.headers.get("set-cookie") || "").split(";")[0];
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const ids = [];
for (let i = 0; i < 4; i++) ids.push((await call("POST", "admin/media", { gambar: png }, adm)).data.id);
ok(ids.every(Boolean), "4 gambar terunggah");

let r = await call("POST", "admin/campaigns", { judul: "Program Galeri Uji", ringkas: "Uji slide", jenis_dana: "infak", galeri: ids, cover_id: ids[2], status: "aktif" }, adm);
ok(r.s === 201, "program dengan 4 gambar dibuat");
const slug = r.data.slug, cid = r.data.id;
let c = (await call("GET", "public/campaigns/" + slug)).data;
ok(c.galeri.length === 4 && c.galeri[0] === `/api/media/${ids[2]}`, "gambar utama tampil sebagai slide pertama");
ok(c.cover === `/api/media/${ids[2]}`, "gambar utama dipakai sebagai sampul kartu");
ok(c.galeri.slice(1).join() === [ids[0], ids[1], ids[3]].map((i) => `/api/media/${i}`).join(), "urutan gambar lain mengikuti urutan admin");
r = await call("PUT", "admin/campaigns/" + cid, { judul: "Program Galeri Uji", jenis_dana: "infak", galeri: [ids[3], ids[0]], cover_id: 0, status: "aktif", slug }, adm);
c = (await call("GET", "public/campaigns/" + slug)).data;
ok(c.galeri.length === 2 && c.cover === `/api/media/${ids[3]}`, "tanpa pilihan utama: gambar pertama otomatis jadi utama");
const list = (await call("GET", "public/campaigns")).data.find((x) => x.slug === slug);
ok(list && list.cover && Array.isArray(list.galeri), "daftar program ikut membawa sampul & galeri");
const many = []; for (let i = 0; i < 60; i++) many.push(ids[i % 4] + 0);
r = await call("PUT", "admin/campaigns/" + cid, { judul: "Program Galeri Uji", jenis_dana: "infak", galeri: ids.concat(ids), status: "aktif", slug }, adm);
c = (await call("GET", "public/campaigns/" + slug)).data;
ok(c.galeri.length === 4, "gambar ganda disaring");

// Laporan penyaluran
r = await call("POST", "admin/articles", { judul: "Laporan Galeri Uji", galeri: [ids[1], ids[0], ids[3]], cover_id: ids[0], status: "terbit", blocks: [{ t: "p", text: "Isi laporan." }], penerima: 5, tersalur: 7800000 }, adm);
ok(r.s === 201, "laporan dengan 3 foto slide dibuat");
let a = (await call("GET", "public/articles/" + r.data.slug)).data;
ok(a.galeri.length === 3 && a.galeri[0] === `/api/media/${ids[0]}`, "laporan: foto utama di slide pertama");
r = await call("POST", "admin/articles", { judul: "Laporan Tanpa Galeri", status: "terbit", blocks: [{ t: "p", text: "Isi." }, { t: "img", media_id: ids[2] }] }, adm);
a = (await call("GET", "public/articles/" + r.data.slug)).data;
ok(a.cover === `/api/media/${ids[2]}` && a.galeri.length === 1, "tanpa galeri: foto pertama di isi tulisan dipakai");
const adminA = (await call("GET", "admin/articles/" + r.data.id, null, adm)).data;
ok(Array.isArray(adminA.galeri_ids), "admin menerima daftar id galeri untuk diedit");
console.log("SLUG " + slug);

// Video di berita/laporan: berbagai platform diputar langsung
const vids = [
  ["https://youtu.be/dQw4w9WgXcQ", "youtube"], ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "youtube"],
  ["https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/view?usp=sharing", "embed", "Google Drive"],
  ["https://www.facebook.com/wizposo/videos/1234567890123456/", "embed", "Facebook"], ["https://fb.watch/abc123XY/", "embed", "Facebook"],
  ["https://www.facebook.com/reel/987654321098765", "embed", "Facebook"],
  ["https://www.tiktok.com/@wizposo/video/7301234567890123456", "embed", "TikTok"],
  ["https://www.instagram.com/reel/C1a2B3c4D5e/", "embed", "Instagram"], ["https://vimeo.com/123456789", "embed", "Vimeo"],
  ["https://contoh.com/video.html", "link"],
];
r = await call("POST", "admin/articles", { judul: "Laporan Video Uji", status: "terbit", blocks: [{ t: "p", text: "Video kegiatan." }, ...vids.map(([url]) => ({ t: "video", url, caption: "Video" }))] }, adm);
a = (await call("GET", "public/articles/" + r.data.slug)).data;
const vb = a.blocks.filter((b) => b.t === "video");
ok(vb.length === vids.length, `${vb.length} blok video tersimpan`);
vids.forEach(([url, kind, host], i) => ok(vb[i].kind === kind && (!host || vb[i].host === host), `${url.replace(/^https:\/\/(www\.)?/, "").slice(0, 38)} → ${vb[i].kind}${vb[i].host ? " " + vb[i].host : ""}`));
ok(vb[1].tegak === true && vb[0].tegak === false, "YouTube Shorts ditampilkan tegak");
ok(vb[6].rasio === "9/16" && vb[2].rasio === "16/9", "TikTok tegak, Drive mendatar");
ok(vb[2].src === "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/preview", "Drive memakai pemutar /preview");
