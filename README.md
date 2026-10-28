# WIZ Cabang — Platform Zakat, Infak & Sedekah

Aplikasi penghimpunan dana lengkap untuk WIZ cabang. Berjalan gratis di **Cloudflare Pages + D1** (tanpa server sendiri).

## Isi aplikasi

| Bagian | Alamat | Untuk |
|---|---|---|
| Aplikasi donatur | `/` | Donatur: program, donasi, zakat, Pundi Sedekah, ambulans, riwayat |
| Portal fundraiser | `/#/mitra` | Relawan: daftar, tautan ajakan pribadi, papan peringkat |
| Ruang pengurus & petugas | `/admin` (dari aplikasi: tombol titik tiga ⋮ di pojok kanan atas) | Ketua, sekretaris, bendahara, admin, ZISKO, relawan Amplop Ramadhan. Menu tampil sesuai peran |

Fitur utama: program/campaign tanpa batas, dokumentasi penyaluran ala blog (teks, foto, video), payment gateway Midtrans (QRIS dinamis, virtual account, e-wallet) dengan konfirmasi otomatis, transfer manual dengan kode unik dan unggah bukti, kuitansi WhatsApp otomatis (Fonnte), sistem fundraiser & afiliasi, database donatur (CRM) dengan segmentasi, ekspor Excel (CSV), Pundi Sedekah, kotak amal ber-QR dengan WA ke pemilik kios dan deteksi setoran janggal, cetak stiker QR, dana zakat/infak/fidyah terpisah.

## Peran & hak akses

| Bagian | Admin | Ketua | Sekretaris | Bendahara | ZISKO | Relawan amplop |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Ringkasan, donasi, donatur, program (lihat) | ✓ | ✓ | ✓ | ✓ | | |
| Catat donasi offline | ✓ | | ✓ | ✓ | | |
| Tandai lunas, batalkan slip | ✓ | | | ✓ | | |
| Program & dokumentasi penyaluran | ✓ | | ✓ | | | |
| Ubah data donatur & relawan afiliator | ✓ | | ✓ | ✓ | | |
| Tugas jemput & daftar titik pundi/kotak | ✓ | ✓ (lihat) | ✓ | ✓ | ✓ | |
| Peta sebaran | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (amplopnya) |
| Input slip setoran (PNG ke WA donatur) | ✓ | | ✓ | ✓ | ✓ | ✓ (amplop) |
| Terima uang setoran dari petugas | ✓ | | | ✓ | | |
| Amplop Ramadhan | ✓ | ✓ (lihat) | ✓ | ✓ | | ✓ (miliknya) |
| Google Drive | ✓ | ✓ | | ✓ | | |
| Pengaturan & pengguna | ✓ | | | | | |

Relawan afiliator memakai **portal relawan** (`/#/mitra`) dengan nomor WA + PIN. Pengurus masuk dengan email; ZISKO dan relawan amplop cukup dengan nomor WhatsApp. Lima kali salah kata sandi mengunci akun 15 menit.

## Kerja lapangan
- **Pendaftaran donatur Pundi Sedekah** mengikuti Surat Persetujuan (nama lengkap, pekerjaan, alamat kantor, alamat rumah, no. HP, jumlah kaleng) ditambah **lokasi GPS rumah** (akurasi ditampilkan, pin bisa digeser, tampilan satelit), foto opsional, jadwal jemput, petugas, dan tanda tangan donatur di layar. Surat persetujuan bertanda tangan dibuat otomatis dan dikirim ke WhatsApp donatur.
- **Kotak amal** didaftarkan dengan lokasi, pemilik, dan jadwal jemput.
- **Tugas jemput** mengurutkan titik: terlambat, segera, perlu diantar, belum waktunya, sudah dijemput (bulan berjalan), lengkap dengan jarak, tombol rute Google Maps, WA, dan input slip.
- **Peta sebaran** menampilkan pundi, kotak, dan amplop dengan warna status, filter, dan petugas penanggung jawab.
- **Slip setoran ZIS** mengikuti slip cetak cabang (No., cabang, tanggal, nama, ID donatur, alamat, kab./kota, provinsi, telp., pekerjaan, Dana Zakat, Pundi Sedekah, Dana Infaq, lainnya, tunai/transfer, jumlah, terbilang, tanda tangan). Nomor slip bisa disamakan dengan slip kertas. Gambar PNG dikirim ke WA donatur; tanpa WA otomatis, petugas menekan **Bagikan**.
- **Uang di petugas**: slip tunai tercatat "di petugas" sampai bendahara menekan **Terima**; petugas mendapat WA bukti setoran.
- **Amplop Ramadhan**: buat nomor seri, serahkan ke relawan, catat penerima + lokasi, setor kembali dengan slip.
- Tanpa sinyal, pendaftaran dan slip disimpan di HP lalu terkirim otomatis saat online.

## Cara memasang di Cloudflare Workers (sekitar 20 menit, tanpa menulis kode)

Cara ini cocok bila Anda sudah memakai alamat `….workers.dev`. Aplikasi baru bisa menggantikan Worker lama dengan alamat yang sama.

### 1. Buat database D1
1. Masuk dash.cloudflare.com → **Storage & Databases** → **D1 SQL Database** → **Create** → nama `wiz-db` → **Create**.
2. Salin **Database ID** (deretan huruf-angka panjang) yang tampil di halaman database. Tabel dibuat otomatis oleh aplikasi.

### 2. Siapkan file konfigurasi
Buka file `wrangler.jsonc` dengan Notepad, lalu ubah:
- `"name"`: samakan dengan nama Worker Anda sekarang (bagian depan alamat `.workers.dev`, misalnya `wiz-donasi-poso`).
- `"database_id"`: tempel Database ID dari langkah 1.

### 3. Unggah ke GitHub
1. github.com → **New repository** → nama `wiz-poso`, pilih **Private** → **Create repository**.
2. Klik **uploading an existing file**, seret **semua isi** folder ini (folder `public`, `src`, `lib`, `functions`, `dev`, serta `wrangler.jsonc` dan `README.md`) → **Commit changes**.

### 4. Hubungkan ke Cloudflare
1. **Workers & Pages** → buka Worker Anda yang sekarang → **Settings** → **Build** → **Connect** ke repo `wiz-poso`.
   (Atau buat baru: **Create** → **Import a repository** → pilih `wiz-poso`.)
2. Build command: *(kosongkan)*. Deploy command: `npx wrangler deploy`. Simpan, lalu tunggu deploy selesai (1–2 menit).
3. **Settings** → **Variables and Secrets** → **Add**: nama `SETUP_CODE`, tipe **Secret**, isi kode rahasia buatan Anda. Kode ini mencegah orang lain membuat admin pertama.

### 5. Siapkan admin
1. Buka `https://<nama-worker>.<akun>.workers.dev/admin`.
2. Isi nama, kode penyiapan, email, dan kata sandi admin pertama.
3. **Pengaturan**: isi nomor WhatsApp, rekening resmi cabang, QRIS (opsional), harga emas & beras, jadwal pundi → **Simpan pengaturan**.

### 6. (Opsional) Unggah video langsung
Tanpa langkah ini, video dokumentasi tetap bisa ditampilkan lewat tautan YouTube.
1. **Storage & Databases** → **R2** → aktifkan R2 (gratis 10 GB) → **Create bucket** bernama `wiz-media`.
2. Di `wrangler.jsonc` di GitHub, hapus tanda `//` di depan tiga baris `"r2_buckets"`, lalu **Commit**. Cloudflare memasang ulang otomatis.

### 7. Aktifkan pembayaran otomatis (Midtrans)
1. Daftar di **midtrans.com** atas nama lembaga dan selesaikan verifikasi.
2. Dashboard Midtrans: **Settings → Access Keys**, salin **Server Key**.
3. Dashboard WIZ: **Pengaturan → Payment gateway**, tempel Server Key. Centang *Mode produksi* hanya setelah akun produksi disetujui.
4. Salin **URL notifikasi** dari Pengaturan, tempel di Midtrans: **Settings → Payment → Notification URL**.

Tanpa Midtrans, aplikasi tetap berjalan dengan transfer bank (kode unik) dan QRIS statis yang diverifikasi admin.

### 8. Aktifkan kuitansi WhatsApp otomatis (Fonnte)
1. Daftar di **fonnte.com**, hubungkan nomor WhatsApp cabang, salin **Token**.
2. Tempel di **Pengaturan → Notifikasi WhatsApp**, simpan, lalu **Kirim tes**.

### 9. Domain sendiri (opsional)
Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, misalnya `donasi.wizposo.or.id`.

> Memakai Cloudflare **Pages** (bukan Workers)? Hubungkan repo ke Pages dengan build output directory `public`, tambahkan binding D1 bernama `DB` di **Settings → Bindings**, lalu ikuti langkah 5–8. Folder `functions/` dipakai otomatis oleh Pages.

## Salinan otomatis ke Google Drive
Dashboard → **Penyimpanan**. Hubungkan satu atau beberapa akun Google Drive lewat Apps Script (kode di `google-drive/Code.gs`, panduan di `google-drive/PANDUAN-DRIVE.md`). Aplikasi menyalin data ke spreadsheet per tahun, menyimpan bukti transfer dan foto per tahun, membuat cadangan harian, dan berpindah otomatis ke Drive cadangan saat pemakaian mencapai 90%.

Penyalinan berjalan di latar belakang: setiap 15 menit lewat cron (Cloudflare Workers) dan setiap kali admin membuka dashboard. Donatur tidak pernah menunggu Google, jadi aplikasi tetap cepat. Pada Cloudflare Pages (tanpa cron), penyalinan berjalan saat dashboard dibuka atau lewat tombol **Sinkronkan sekarang**.

## Menulis dokumentasi penyaluran
Dashboard → **Dokumentasi** → **Tulis dokumentasi**. Isi judul, pilih program terkait, tanggal, lokasi, jumlah penerima manfaat, dan dana tersalur (opsional). Susun isi dengan blok **paragraf, subjudul, gambar, video, dan kutipan/testimoni**; urutan bisa digeser naik-turun. Simpan sebagai **draf** dulu atau langsung **terbitkan**. Tulisan yang terbit tampil di halaman program terkait, di beranda (Laporan penyaluran), dan di menu Berita.

## Memperbarui aplikasi
Unggah file yang berubah ke repo GitHub yang sama (**Add file → Upload files**). Cloudflare otomatis memasang versi baru dalam 1–2 menit. Data di database tetap aman; kolom dan tabel baru ditambahkan otomatis. Jangan menimpa `wrangler.jsonc` yang sudah berisi Database ID Anda.

Bila sudah memasang konektor Google Drive versi lama, salin ulang `google-drive/Code.gs` ke Apps Script lalu **Deploy → Manage deployments → Edit → New version** agar folder *06 Surat Persetujuan* dan *07 Foto Lokasi* ikut dibuat (tanpa langkah ini file tetap tersimpan di folder Dokumentasi).

## Kapasitas paket gratis Cloudflare
- Workers / Pages Functions: 100.000 permintaan per hari.
- R2 (video): 10 GB penyimpanan, tanpa biaya unduh.
- D1: 5 GB penyimpanan, 5 juta baca dan 100.000 tulis per hari.

Cukup untuk ribuan donasi per hari.

## Uji coba lokal (untuk pengembang)
```
MOCK=1 MIDTRANS_SERVER_KEY=test-key node --no-warnings dev/server.mjs
node --no-warnings dev/api-test.mjs
node --no-warnings dev/field-test.mjs
```
Server uji memakai SQLite bawaan Node (versi 22.5 atau lebih baru) sebagai pengganti D1 dan meniru Midtrans dan Fonnte.

## Struktur
```
public/            halaman statis (aplikasi donatur, dashboard admin, aset)
src/worker.js      pintu masuk Cloudflare Workers
wrangler.jsonc     konfigurasi Workers (nama, D1, R2)
functions/api/     pintu masuk Cloudflare Pages Functions (/api/*)
lib/               logika server: app.js (API), field.js (lapangan, slip, amplop, peta), schema.js (database & peran), drive.js, integrations.js, util.js
public/assets/     app.js (donatur), admin.js (pengurus), lapangan.js (petugas), dokumen.js (slip & surat PNG)
google-drive/      konektor Apps Script (Code.gs) dan panduan Google Drive
dev/               server dan uji lokal (tidak dipakai di Cloudflare)
```
