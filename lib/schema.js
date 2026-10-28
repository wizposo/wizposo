// Skema database D1. Dibuat otomatis saat aplikasi pertama kali dipanggil.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, mime TEXT NOT NULL, data TEXT NOT NULL, private INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, judul TEXT NOT NULL, ringkas TEXT, cerita TEXT,
  jenis_dana TEXT NOT NULL DEFAULT 'infak', kategori TEXT, ikon TEXT, target INTEGER NOT NULL DEFAULT 0, batas TEXT,
  cover_id INTEGER, status TEXT NOT NULL DEFAULT 'aktif', unggulan INTEGER NOT NULL DEFAULT 0, urutan INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS campaign_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL, judul TEXT NOT NULL, isi TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, wa TEXT NOT NULL UNIQUE, nama TEXT, sapaan TEXT, email TEXT, alamat TEXT, kelurahan TEXT,
  kecamatan TEXT, pekerjaan TEXT, kategori TEXT, catatan TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS fundraisers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, nama TEXT NOT NULL, wa TEXT NOT NULL UNIQUE, pin_hash TEXT NOT NULL,
  kota TEXT, status TEXT NOT NULL DEFAULT 'aktif', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS donations (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, campaign_id INTEGER, jenis_dana TEXT NOT NULL,
  nominal INTEGER NOT NULL, kode_unik INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  donor_id INTEGER, sapaan TEXT, nama TEXT, wa TEXT, anonim INTEGER NOT NULL DEFAULT 0, doa TEXT,
  metode TEXT NOT NULL, kanal TEXT NOT NULL DEFAULT 'online', status TEXT NOT NULL DEFAULT 'pending',
  gateway_ref TEXT, payment_url TEXT, fundraiser_id INTEGER, kotak_kode TEXT, pundi_kode TEXT, petugas TEXT, bukti_id INTEGER, catatan TEXT,
  notified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), paid_at TEXT);
CREATE INDEX IF NOT EXISTS ix_don_status ON donations(status, created_at);
CREATE INDEX IF NOT EXISTS ix_don_campaign ON donations(campaign_id, status);
CREATE INDEX IF NOT EXISTS ix_don_fr ON donations(fundraiser_id, status);
CREATE INDEX IF NOT EXISTS ix_don_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS ix_don_kotak ON donations(kotak_kode);
CREATE TABLE IF NOT EXISTS pundi (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT UNIQUE, nama TEXT NOT NULL, wa TEXT NOT NULL, alamat TEXT, kelurahan TEXT, kecamatan TEXT,
  patokan TEXT, pekerjaan TEXT, jumlah INTEGER NOT NULL DEFAULT 1, waktu_jemput TEXT, status TEXT NOT NULL DEFAULT 'baru', petugas TEXT,
  donor_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, judul TEXT NOT NULL, ringkas TEXT, cover_id INTEGER, campaign_id INTEGER,
  blocks TEXT NOT NULL DEFAULT '[]', lokasi TEXT, tanggal TEXT, penerima INTEGER NOT NULL DEFAULT 0, tersalur INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draf', penulis TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_art ON articles(status, campaign_id);
CREATE TABLE IF NOT EXISTS sync_queue (entity TEXT NOT NULL, ref TEXT NOT NULL, PRIMARY KEY(entity, ref));
CREATE TABLE IF NOT EXISTS media_sync (media_id INTEGER PRIMARY KEY, drive_id TEXT, file_url TEXT);
CREATE TABLE IF NOT EXISTS kotak (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, nama_lokasi TEXT NOT NULL, alamat TEXT, pemilik TEXT, wa_pemilik TEXT,
  pj TEXT, status TEXT NOT NULL DEFAULT 'aktif', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS slips (
  no TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, tanggal TEXT NOT NULL, donor_id INTEGER, nama TEXT NOT NULL, alamat TEXT, kab TEXT, provinsi TEXT,
  wa TEXT, pekerjaan TEXT, rincian TEXT NOT NULL, cara TEXT NOT NULL, cara_lain TEXT, total INTEGER NOT NULL, sumber TEXT NOT NULL, sumber_kode TEXT,
  petugas_id INTEGER, petugas TEXT, ttd_penyetor INTEGER, png_id INTEGER, wa_status TEXT, batal INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_slip_pet ON slips(petugas_id, created_at);
CREATE INDEX IF NOT EXISTS ix_slip_src ON slips(sumber, sumber_kode);
CREATE TABLE IF NOT EXISTS amplop (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, periode TEXT NOT NULL, relawan_id INTEGER, status TEXT NOT NULL DEFAULT 'stok',
  nama TEXT, wa TEXT, alamat TEXT, kelurahan TEXT, kecamatan TEXT, lat REAL, lng REAL, akurasi INTEGER, donor_id INTEGER,
  dibagikan_at TEXT, kembali_at TEXT, nominal INTEGER NOT NULL DEFAULT 0, slip_no TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_amp ON amplop(relawan_id, status);
CREATE TABLE IF NOT EXISTS login_fail (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, until INTEGER NOT NULL DEFAULT 0);
`;

// Kolom tambahan untuk database yang sudah berjalan (dijalankan satu per satu; error "duplicate column" diabaikan)
export const MIGRATIONS = [
  "ALTER TABLE admins ADD COLUMN wa TEXT", "ALTER TABLE admins ADD COLUMN ttd_id INTEGER", "ALTER TABLE admins ADD COLUMN wilayah TEXT",
  "ALTER TABLE admins ADD COLUMN aktif INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE media ADD COLUMN kind TEXT",
  "ALTER TABLE donors ADD COLUMN alamat_kantor TEXT", "ALTER TABLE donors ADD COLUMN kab TEXT", "ALTER TABLE donors ADD COLUMN provinsi TEXT",
  "ALTER TABLE donors ADD COLUMN lat REAL", "ALTER TABLE donors ADD COLUMN lng REAL",
  "ALTER TABLE pundi ADD COLUMN alamat_kantor TEXT", "ALTER TABLE pundi ADD COLUMN lat REAL", "ALTER TABLE pundi ADD COLUMN lng REAL",
  "ALTER TABLE pundi ADD COLUMN akurasi INTEGER", "ALTER TABLE pundi ADD COLUMN jadwal INTEGER", "ALTER TABLE pundi ADD COLUMN pj_id INTEGER",
  "ALTER TABLE pundi ADD COLUMN foto_id INTEGER", "ALTER TABLE pundi ADD COLUMN ttd_id INTEGER", "ALTER TABLE pundi ADD COLUMN surat_token TEXT",
  "ALTER TABLE pundi ADD COLUMN tgl_setuju TEXT", "ALTER TABLE pundi ADD COLUMN surat_png INTEGER", "ALTER TABLE pundi ADD COLUMN catatan TEXT", "ALTER TABLE pundi ADD COLUMN didaftar_oleh TEXT",
  "ALTER TABLE kotak ADD COLUMN kelurahan TEXT", "ALTER TABLE kotak ADD COLUMN kecamatan TEXT", "ALTER TABLE kotak ADD COLUMN patokan TEXT",
  "ALTER TABLE kotak ADD COLUMN jenis_tempat TEXT", "ALTER TABLE kotak ADD COLUMN lat REAL", "ALTER TABLE kotak ADD COLUMN lng REAL",
  "ALTER TABLE kotak ADD COLUMN akurasi INTEGER", "ALTER TABLE kotak ADD COLUMN jadwal INTEGER", "ALTER TABLE kotak ADD COLUMN pj_id INTEGER",
  "ALTER TABLE kotak ADD COLUMN foto_id INTEGER", "ALTER TABLE kotak ADD COLUMN catatan TEXT",
  "ALTER TABLE donations ADD COLUMN slip_no TEXT", "ALTER TABLE donations ADD COLUMN petugas_id INTEGER", "ALTER TABLE donations ADD COLUMN serah TEXT",
  "ALTER TABLE donations ADD COLUMN serah_at TEXT", "ALTER TABLE donations ADD COLUMN serah_oleh TEXT",
  "CREATE INDEX IF NOT EXISTS ix_don_slip ON donations(slip_no)",
  "CREATE INDEX IF NOT EXISTS ix_don_pundi ON donations(pundi_kode)",
  "CREATE INDEX IF NOT EXISTS ix_don_serah ON donations(serah, petugas_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_wa ON admins(wa)",
  "UPDATE admins SET role='zisko' WHERE role='petugas'",
];
// Program khusus amplop (draf: tidak tampil ke donatur online, tetapi bisa dipakai di slip)
export const AMPLOP_CAMPAIGN = `INSERT OR IGNORE INTO campaigns(slug,judul,ringkas,cerita,jenis_dana,kategori,ikon,target,unggulan,urutan,status) VALUES('amplop-ramadhan','Amplop Ramadhan','Sedekah Ramadhan lewat amplop yang dibagikan relawan','Amplop Ramadhan dibagikan relawan kepada warga dan dikumpulkan kembali menjelang akhir Ramadhan.','infak','Sedekah','moon',0,0,12,'draft')`;

// Peran pengguna dan hak aksesnya. Relawan afiliator memakai portal fundraiser (/#/mitra) dengan PIN.
export const ROLES = {
  admin: "Admin",
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  zisko: "ZISKO (penghimpun ZIS)",
  amplop: "Relawan Amplop Ramadhan",
};
export const PERMS = {
  lihat: ["admin", "ketua", "sekretaris", "bendahara"],          // ringkasan, donasi, donatur, program (baca)
  catat: ["admin", "sekretaris", "bendahara"],                   // catat donasi offline
  keuangan: ["admin", "bendahara"],                              // ubah status donasi, kirim ulang kuitansi
  program: ["admin", "sekretaris"],
  dokumentasi: ["admin", "sekretaris"],
  crm: ["admin", "sekretaris", "bendahara"],                     // ubah donatur & relawan afiliator
  lapangan: ["admin", "ketua", "sekretaris", "bendahara", "zisko"], // lihat titik pundi/kotak & tugas jemput
  titik: ["admin", "sekretaris", "bendahara", "zisko"],          // daftarkan / ubah titik pundi & kotak
  slip: ["admin", "sekretaris", "bendahara", "zisko", "amplop"],   // input slip setoran
  setoran: ["admin", "bendahara"],                               // terima uang dari petugas
  amplop: ["admin", "ketua", "sekretaris", "bendahara", "amplop"],
  amplop_kelola: ["admin", "sekretaris", "bendahara"],
  peta: ["admin", "ketua", "sekretaris", "bendahara", "zisko", "amplop"],
  penyimpanan: ["admin", "ketua", "bendahara"],
  pengaturan: ["admin"],
};
export const PEKERJAAN = ["PNS", "Peg. Swasta", "Peg. BUMN", "TNI / POLRI", "Wiraswasta", "Profesional", "Lainnya"];

export const DEFAULT_SETTINGS = {
  cabang: "Poso",
  tagline: "Bersama berbagi bahagia untuk warga Poso",
  wa_admin: "",
  wa_ambulans: "",
  wa_pundi: "",
  rekening: [
    { bank: "BSI", no: "", an: "Wahdah Inspirasi Zakat" },
    { bank: "Muamalat", no: "", an: "Wahdah Inspirasi Zakat" },
  ],
  qris_media_id: null,
  harga_emas: 2300000,
  nisab_gram: 85,
  harga_beras: 15000,
  beras_per_jiwa: 2.5,
  pundi_jadwal: "Pekan pertama setiap bulan",
  pundi_wilayah: "Kota Poso dan sekitarnya",
  fr_auto_aktif: true,
  fr_apresiasi: "",
  midtrans_server_key: "",
  midtrans_production: false,
  fonnte_token: "",
  notif_donatur: true,
  notif_admin: true,
  notif_fundraiser: true,
  min_donasi: 10000,
  // Lapangan
  kantor_alamat: "Jln. Pulau Sabang, Kayamanya, Poso",
  call_center: "0821 8726 6600",
  kab_default: "Poso",
  provinsi_default: "Sulawesi Tengah",
  kode_cabang: "PSO",
  jemput_tanggal: 10,
  amplop_periode: "Ramadhan 1448 H",
};

// Campaign awal agar aplikasi langsung berisi
export const SEED_CAMPAIGNS = [
  ["zakat-maal", "Zakat Maal & Penghasilan", "Bersihkan harta, tunaikan kewajiban", "zakat", "Zakat", "scale", 0, 1, 1,
   "Zakat Anda disalurkan kepada 8 golongan penerima (asnaf) sesuai syariat, untuk mustahik di wilayah cabang."],
  ["zakat-fitrah", "Zakat Fitrah", "Dibelikan beras dan disalurkan sebelum Idul Fitri", "zakat", "Zakat", "scale", 0, 0, 2,
   "Dana zakat fitrah dibelikan beras oleh amil dan disalurkan kepada mustahik sebelum shalat Idul Fitri."],
  ["infak-terbaik", "Infak Terbaik", "Disalurkan ke kebutuhan paling mendesak", "infak", "Infak", "heart", 0, 1, 3,
   "Infak tanpa memilih program. Amil menyalurkannya ke kebutuhan yang paling mendesak di wilayah cabang."],
  ["pundi-sedekah", "Pundi Sedekah", "Celengan kebaikan di rumah Anda", "infak", "Sedekah", "coins", 0, 0, 4,
   "Sedekah harian keluarga lewat pundi di rumah. Dijemput petugas setiap bulan atau disetor langsung dari aplikasi."],
  ["berkah-sehat", "Berkah Sehat & Ambulans Gratis", "Santunan pasien dhuafa dan ambulans gratis", "infak", "Kesehatan", "heartbeat", 50000000, 1, 5,
   "Membantu pasien dhuafa: santunan biaya selama perawatan, khitan gratis, pendampingan medis, dan operasional ambulans gratis."],
  ["berkah-juara", "Berkah Juara", "Pendidikan anak yatim dan dhuafa", "infak", "Pendidikan", "school", 30000000, 0, 6,
   "Dukungan biaya pendidikan dan sarana belajar bagi anak yatim dan dhuafa."],
  ["berkah-mandiri", "Berkah Mandiri", "Modal dan pendampingan UMKM", "infak", "Ekonomi", "store", 25000000, 0, 7,
   "Pemberdayaan ekonomi: modal usaha dan kelas pendampingan agar penerima manfaat mandiri."],
  ["berkah-hidayah", "Berkah Hidayah", "Dakwah pelosok dan pembinaan mualaf", "infak", "Dakwah", "moon", 20000000, 0, 8,
   "Mendukung dai di pelosok dan pembinaan saudara-saudara mualaf."],
  ["berkah-peduli", "Berkah Peduli", "Kemanusiaan dan tanggap bencana", "infak", "Kemanusiaan", "hands", 40000000, 0, 9,
   "Bantuan cepat bagi korban bencana dan warga yang tertimpa musibah."],
  ["sedekah-jumat", "Sedekah Jumat", "Amalan pekanan di hari terbaik", "infak", "Sedekah", "calendar", 0, 0, 10,
   "Sedekah rutin setiap hari Jumat untuk program sosial dan dakwah cabang."],
  ["fidyah", "Fidyah", "Ganti puasa bagi yang berhalangan", "fidyah", "Fidyah", "bowl", 0, 0, 11,
   "Fidyah disalurkan dalam bentuk makanan kepada fakir miskin sesuai jumlah hari yang ditinggalkan."],
];
