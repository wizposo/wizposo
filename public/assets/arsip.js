/* ============================================================
   Gudang data semua Google Drive
   Semua Drive yang pernah terhubung (aktif, cadangan, penuh, arsip) tetap bisa dibaca:
   file lama dibuka lewat aplikasi, spreadsheet tiap Drive bisa dibuka, dan cadangan dari
   Drive mana pun bisa dipakai untuk memulihkan data yang hilang.
   ============================================================ */
"use strict";
(() => {
  const asli = VIEWS.penyimpanan;
  const ukuran = (b) => (b >= 1e9 ? (b / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " GB" : b >= 1e6 ? (b / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " MB" : Math.round((b || 0) / 1e3) + " KB");
  const JENIS = [["", "Semua jenis"], ["bukti", "Bukti transfer"], ["slip", "Slip setoran"], ["surat", "Surat persetujuan"], ["foto", "Foto lokasi"], ["dok", "Foto dokumentasi"]];

  VIEWS.penyimpanan = async () => {
    await asli();
    const s = await api("admin/drive");
    const byId = Object.fromEntries(s.drives.map((d) => [d.id, d]));
    const totalFile = s.drives.reduce((a, d) => a + (d.files || 0), 0), totalByte = s.drives.reduce((a, d) => a + (d.file_bytes || 0), 0);
    const lama = s.drives.filter((d) => d.perlu_update);
    const box = document.createElement("div");
    box.innerHTML = `<div class="sect" style="margin-top:26px">Gudang data semua Drive</div>
      ${lama.length ? `<div class="alert">${ic("alert")}<span><b>${lama.length} Drive memakai konektor versi lama</b> (${lama.map((d) => esc(d.email)).join(", ")}). Perbarui kodenya agar file lama bisa dibuka dari aplikasi:
        buka Apps Script akun tersebut, tempel <a href="#" id="ar_code">kode konektor terbaru</a> (kode rahasia tetap sama), Simpan, lalu <b>Terapkan → Kelola deployment → Edit → Versi baru → Terapkan</b>. Alamat /exec tidak berubah.</span></div>` : ""}
      <div class="kpis">
        <div class="kpi"><small>Drive terhubung</small><b>${s.drives.length}</b><span>${["aktif", "cadangan", "penuh", "arsip"].map((k) => `${s.drives.filter((d) => d.status === k).length} ${k}`).join(" · ")}</span></div>
        <div class="kpi"><small>File tersimpan di Drive</small><b>${totalFile.toLocaleString("id-ID")}</b><span>${ukuran(totalByte)} · semua bisa dibuka dari aplikasi</span></div>
        <div class="kpi"><small>Ringan di server</small><b>${(s.d1_media.di_drive || 0).toLocaleString("id-ID")}</b><span>file lama sudah dipindah ke Drive · ${ukuran(s.d1_media.bytes)} masih di server</span></div>
        <div class="kpi"><small>Cadangan tersimpan</small><b>${s.drives.reduce((a, d) => a + (d.backups || 0), 0)}</b><span>tersebar di ${s.drives.filter((d) => d.backups).length} Drive</span></div>
      </div>
      <div class="panel"><h2>Isi tiap Drive</h2><div class="list">${s.drives.map((d) => `<div class="it" style="align-items:flex-start"><span class="tx"><b style="word-break:break-all">${esc(d.email)}</b> <span class="tag ${DS[d.status]?.[1] || "i"}">${DS[d.status]?.[0] || d.status}</span>
          <small>${(d.files || 0).toLocaleString("id-ID")} file (${ukuran(d.file_bytes)}) · ${d.backups || 0} cadangan · terpakai ${d.pct ?? "-"}%${d.perlu_update ? ' · <b style="color:var(--danger)">konektor perlu diperbarui</b>' : ""}</small></span>
        <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${d.root ? `<a class="btn ghost xs" href="${esc(d.root)}" target="_blank" rel="noopener">${ic("ext", 14)} Folder</a>` : ""}<button class="btn ghost xs" data-ln="${d.id}">${ic("grid", 14)} Spreadsheet</button>
          ${d.files ? `<button class="btn ghost xs" data-fd="${d.id}">${ic("search", 14)} File</button>` : ""}</span></div>`).join("") || `<p class="hint">Belum ada Drive.</p>`}</div></div>
      <div class="panel" style="margin-top:16px"><h2>Cari file tersimpan</h2>
        <p class="hint" style="margin-top:0">Bukti transfer, slip, surat persetujuan, dan foto dari semua Drive. Tekan <b>Lihat</b> untuk membukanya lewat aplikasi, walau Drive-nya sudah penuh atau diarsipkan.</p>
        <div class="fbar"><div class="inp grow"><input id="ar_q" placeholder="Cari nama file, nomor slip, kode pundi"></div>
          <div class="inp"><select id="ar_j">${JENIS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
          <div class="inp"><select id="ar_t"><option value="">Semua tahun</option>${Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => `<option>${y}</option>`).join("")}</select></div>
          <div class="inp"><select id="ar_d"><option value="">Semua Drive</option>${s.drives.map((d) => `<option value="${d.id}">${esc(d.email)}</option>`).join("")}</select></div></div>
        <div class="tw" id="ar_tbl"></div><div class="pager" id="ar_pg"></div></div>
      <div class="panel" style="margin-top:16px"><h2>Cadangan & pemulihan</h2>
        <p class="hint" style="margin-top:0">Cadangan lengkap dibuat setiap hari dan disalin ke Drive aktif serta Drive cadangan. <b>Pulihkan</b> hanya menambahkan data yang hilang, tidak pernah menimpa atau menghapus data yang ada.</p>
        <div class="tw" id="ar_bk"></div></div>`;
    $("#main").appendChild(box);
    $("#ar_code")?.addEventListener("click", async (e) => { e.preventDefault(); try { copy(await (await fetch("/assets/wiz-drive-connector.gs.txt")).text(), "Kode konektor"); } catch { toast("Gagal memuat kode"); } });

    // Spreadsheet per Drive
    $$("[data-ln]").forEach((b) => b.onclick = () => busy(b, async () => {
      const r = await api(`admin/drive/${b.dataset.ln}/links`);
      const sh = Object.entries(r.sheets || {}).sort();
      modal("Spreadsheet di " + esc(byId[b.dataset.ln].email), `<div class="list">${sh.map(([n, u]) => `<a class="it" href="${esc(u)}" target="_blank" rel="noopener">${ic("grid")}<span class="tx"><b>${esc(n)}</b><small>Buka di Google Sheets</small></span>${ic("ext", 16)}</a>`).join("") || `<p class="hint">Belum ada spreadsheet di Drive ini.</p>`}
        <a class="it" href="${esc(r.root)}" target="_blank" rel="noopener">${ic("cloud")}<span class="tx"><b>Folder induk WIZ</b><small>Semua folder & file di Drive ini</small></span>${ic("ext", 16)}</a></div>`);
    }));

    // Pencarian file
    const f = { q: "", jenis: "", tahun: "", drive: "", page: 1 };
    const load = async () => {
      const r = await api("admin/drive/files?" + new URLSearchParams(Object.entries(f).filter(([, v]) => v)));
      $("#ar_tbl").innerHTML = `<table class="t"><thead><tr><th>File</th><th>Jenis</th><th>Tanggal</th><th>Disimpan di</th><th class="num">Ukuran</th><th></th></tr></thead><tbody>
        ${r.rows.map((x) => `<tr><td><b>${esc(x.nama || "file-" + x.id)}</b><small>${x.di_drive ? "Diambil dari Drive saat dibuka" : "Juga tersedia di server"}</small></td><td>${esc(x.jenis)}</td><td>${tglD(x.created_at)}</td>
          <td>${esc(byId[x.drive_id]?.email || "Drive tidak terhubung")}<small>${esc(DS[byId[x.drive_id]?.status]?.[0] || "")}</small></td><td class="num">${ukuran(x.ukuran)}</td>
          <td style="white-space:nowrap"><a class="btn ghost xs" href="/api/admin/media/${x.id}" target="_blank" rel="noopener">Lihat</a> ${x.file_url ? `<a class="btn ghost xs" href="${esc(x.file_url)}" target="_blank" rel="noopener">Drive</a>` : ""}</td></tr>`).join("")
          || `<tr><td colspan="6" class="hint" style="text-align:center;padding:24px">Belum ada file tersimpan untuk pencarian ini.</td></tr>`}</tbody></table>`;
      const pages = Math.ceil(r.total / 50);
      $("#ar_pg").innerHTML = pages > 1 ? `<button class="btn ghost xs" ${f.page <= 1 ? "disabled" : ""} id="ar_pv">Sebelumnya</button> ${f.page} / ${pages} <button class="btn ghost xs" ${f.page >= pages ? "disabled" : ""} id="ar_nx">Berikutnya</button>` : "";
      $("#ar_pv")?.addEventListener("click", () => { f.page--; load(); }); $("#ar_nx")?.addEventListener("click", () => { f.page++; load(); });
    };
    let tm; $("#ar_q").oninput = () => { clearTimeout(tm); tm = setTimeout(() => { f.q = val("ar_q"); f.page = 1; load(); }, 300); };
    [["ar_j", "jenis"], ["ar_t", "tahun"], ["ar_d", "drive"]].forEach(([id, k]) => ($("#" + id).onchange = () => { f[k] = val(id); f.page = 1; load(); }));
    $$("[data-fd]").forEach((b) => b.onclick = () => { $("#ar_d").value = b.dataset.fd; f.drive = b.dataset.fd; f.page = 1; load(); $("#ar_tbl").scrollIntoView({ behavior: "smooth" }); });
    load().catch((e) => ($("#ar_tbl").innerHTML = `<p class="hint" style="padding:16px">${esc(e.message)}</p>`));

    // Cadangan
    const bk = await api("admin/drive/backups").catch(() => []);
    $("#ar_bk").innerHTML = `<table class="t"><thead><tr><th>Waktu</th><th>Disimpan di</th><th class="num">Ukuran</th><th></th></tr></thead><tbody>
      ${bk.map((b) => `<tr><td>${tgl(b.at.replace("T", " ").slice(0, 19))}<small>${esc(b.nama || "")}</small></td><td>${esc(byId[b.drive_id]?.email || "Drive tidak terhubung")}</td><td class="num">${ukuran(b.size)}</td>
        <td style="white-space:nowrap">${b.url ? `<a class="btn ghost xs" href="${esc(b.url)}" target="_blank" rel="noopener">Drive</a> ` : ""}${b.bisa && can("pengaturan") ? `<a class="btn ghost xs" href="/api/admin/drive/backups/${b.id}">Unduh</a> <button class="btn ghost xs" data-rs="${b.id}">Pulihkan</button>` : ""}</td></tr>`).join("")
        || `<tr><td colspan="4" class="hint" style="text-align:center;padding:24px">Belum ada cadangan tercatat. Tekan "Cadangkan sekarang".</td></tr>`}</tbody></table>`;
    $$("[data-rs]").forEach((b) => b.onclick = () => pulihkan(bk.find((x) => x.id === +b.dataset.rs), byId));
  };

  // Pulihkan: unduh cadangan (gzip) dari Drive, buka di browser, kirim per 300 baris
  function pulihkan(b, byId) {
    modal("Pulihkan data dari cadangan", `<p>Cadangan <b>${esc(b.nama)}</b> dari <b>${esc(byId[b.drive_id]?.email || "")}</b>.</p>
      <div class="alert ok">${ic("check")}<span>Hanya data yang <b>tidak ada</b> di aplikasi yang ditambahkan (program, donatur, donasi, slip, pundi, kotak, amplop, berita, relawan). Data yang sudah ada tidak diubah dan tidak dihapus. Relawan yang dipulihkan perlu diatur ulang PIN-nya.</span></div>
      <div id="rs_log" class="hint"></div>`, `<button class="btn ghost sm" onclick="closeModal()">Batal</button><button class="btn primary sm" id="rs_go">Mulai pulihkan</button>`);
    $("#rs_go").onclick = (e) => busy(e.currentTarget, async () => {
      const log = (t) => ($("#rs_log").innerHTML += esc(t) + "<br>");
      log("Mengambil cadangan dari Google Drive…");
      const res = await fetch(`/api/admin/drive/backups/${b.id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Cadangan gagal diambil.");
      const teks = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
      const data = JSON.parse(teks).data || {};
      let total = 0;
      for (const t of ["campaigns", "campaign_updates", "articles", "donors", "fundraisers", "pundi", "kotak", "amplop", "slips", "donations"]) {
        const rows = data[t] || []; let add = 0;
        for (let i = 0; i < rows.length; i += 300) add += (await api("admin/restore", { method: "POST", body: { table: t, rows: rows.slice(i, i + 300) } })).ditambah;
        if (rows.length) log(`${t}: ${rows.length} baris diperiksa, ${add} ditambahkan`);
        total += add;
      }
      log(`Selesai. ${total} baris data yang hilang telah dipulihkan.`);
      $("#rs_go").remove(); toast("Pemulihan selesai");
    });
  }
})();
