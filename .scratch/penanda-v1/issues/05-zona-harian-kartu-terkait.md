# 05 - Zona harian, kartu, dan terkait

Status: resolved
Blocked by: 04
Type: task

## Hasil yang diinginkan

Layar Indeks lengkap kelima zonanya: baris Harian, baris Kartu, dan baris Terkait yang memicu ingatan alur kerja.

## Langkah

1. Zona Harian: satu baris chip dari item bertag `harian`, geser horizontal bila lebih dari lima, klik langsung membuka link utama.
2. Zona Kartu: satu chip per tag di `pinned_tags`, memuat nama tag dan jumlah item; sekali klik mempersempit zona hasil ke tag itu, filter itu bertumpuk dengan kata kunci di kotak cari (bukan menghapusnya), dan klik ulang melepasnya. Tanpa batas jumlah kartu: bila tidak muat, barisnya bergeser horizontal.
3. Zona Terkait: muncul saat badan satu baris hasil diklik atau disentuh, bukan tombol Buka, Copy, atau Ubah di dalamnya. Satu baris terfokus pada satu waktu dengan latar `--action-soft`; fokus lepas saat `Esc`, klik di luar daftar, kata kunci berubah, atau baris itu keluar dari hasil. Isinya maksimal 3 item lain dengan irisan tag terbanyak, dan item yang sedang difokuskan tidak ikut.
4. Chip kartu yang sedang aktif memakai gaya aktif dari `design-tokens.md` (latar `--action-soft`, teks `--action`).
5. Kelima zona dijaga berada dalam tinggi layar 768 px; hanya zona hasil yang menggulir.

## Verifikasi

- [x] Data contoh: baris Harian berisi 2 chip (SLiMS Bulian, Sheet Admin TA).
- [x] Data contoh: kartu TA 2, Wisuda 2, Magang 1; klik TA memunculkan 2 hasil.
- [x] Fokus pada Sheet Admin TA: zona Terkait memunculkan Repository UNIGA dan Sheet Job Training, maksimal 3 item, tanpa dirinya sendiri.
- [x] Klik badan baris (bukan tombolnya) memunculkan zona Terkait; tekan `Esc` menyembunyikannya lagi.
- [x] Ketik `ta` lalu klik kartu Magang: daftar menyempit ke irisan keduanya dan kartu yang aktif tampak berbeda.
- [x] Tinggi total kelima zona pada layar 768 px tidak memaksa seluruh halaman menggulir.
