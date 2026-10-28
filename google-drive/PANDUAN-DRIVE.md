# Menghubungkan Google Drive ke aplikasi WIZ Cabang

Database utama tetap di Cloudflare D1 (cepat, gratis 5 GB). Google Drive menerima **salinan otomatis** semua data dan file penting, sehingga pengurus bisa membuka datanya di Google Sheets kapan saja dan data tetap aman walau terjadi masalah di server.

## Yang dibuat otomatis di Drive
```
WIZ Cabang Poso - Database/
├── 01 Database/        Transaksi 2026, Transaksi 2027, … (satu file per tahun) + Data Induk
├── 02 Bukti Transfer/  2026/, 2027/, …
├── 03 Slip Setoran/    2026/, 2027/, …
├── 04 Dokumentasi/     2026/, 2027/, …
└── 05 Cadangan/        cadangan lengkap harian (.json.gz), 30 terakhir
```
- **Transaksi <tahun>**: sheet "Donasi" berisi semua transaksi tahun itu. File baru dibuat otomatis saat tahun berganti, jadi tiap file tetap ringan.
- **Data Induk**: sheet Donatur, Pundi Sedekah, Kotak Amal, Fundraiser.

## Langkah (sekitar 10 menit per akun)
1. Buat akun Gmail khusus cabang, misalnya `wizposo.data1@gmail.com`, dan aktifkan verifikasi 2 langkah.
2. Masuk ke akun itu, buka https://script.google.com → **New project**.
3. Hapus isi editor, tempel seluruh isi file `Code.gs` (atau klik **Salin kode konektor** di dashboard → Penyimpanan).
4. Ganti `GANTI-DENGAN-KODE-RAHASIA-ANDA` dengan kode rahasia buatan Anda (minimal 16 karakter; dashboard memberi contoh acak).
5. Klik **Save**, pilih fungsi `izinkanAkses`, klik **Run**, lalu izinkan akses (**Advanced → Go to project → Allow**).
6. **Deploy → New deployment** → jenis **Web app** → Execute as: **Me** → Who has access: **Anyone** → **Deploy**.
7. Salin **Web app URL** (berakhiran `/exec`).
8. Dashboard WIZ → **Penyimpanan** → tempel URL dan kode rahasia → **Tes & hubungkan**.

Drive pertama langsung **aktif** dan seluruh data mulai disalin. Drive berikutnya yang dihubungkan menjadi **cadangan**.

## Siklus 90%
- Aplikasi memeriksa pemakaian Drive setiap kali menyalin (tiap 15 menit).
- Saat Drive aktif mencapai **90%**, Drive itu menjadi **arsip** (data lamanya tetap di sana) dan aplikasi **pindah otomatis** ke Drive cadangan. Admin menerima WhatsApp pemberitahuan.
- Bila tidak ada cadangan, penyalinan berhenti sementara (data tetap aman di server), dashboard menampilkan peringatan, dan admin menerima WhatsApp untuk menambah link Google Drive baru. Setelah link baru dihubungkan, penyalinan berlanjut.
- Saran: selalu siapkan **satu Drive cadangan** supaya perpindahan tanpa jeda.

## Catatan keamanan
- Jangan bagikan Web app URL dan kode rahasia. Keduanya hanya disimpan di server aplikasi (tidak pernah tampil ke donatur).
- Biarkan folder Drive **pribadi** (jangan "Anyone with the link"); data donatur adalah amanah.
- Bila kode rahasia bocor: ganti `KODE_RAHASIA` di Apps Script, **Deploy → Manage deployments → Edit → New version**, lalu lepas dan hubungkan ulang Drive di dashboard.
