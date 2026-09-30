# 04 - Layar Indeks: zona pencarian dan zona hasil

Status: resolved
Blocked by: 02, 03
Type: task

## Hasil yang diinginkan

Layar Indeks bisa dipakai untuk mencari dan membuka dokumen: satu kotak pencarian besar di atas, daftar hasil rapat di bawahnya. Inti nilai produk ada di tiket ini.

## Langkah

1. Zona pencarian: satu baris penuh, fokus otomatis saat tab Indeks dibuka, hasil berubah pada setiap ketikan tanpa tombol Cari.
2. Zona hasil: daftar rapat dipisah garis, tiap baris memuat judul tebal, `catatan` satu sampai dua baris, chip tag, lalu tombol Buka dan Copy rata kanan.
3. Baris rekap di atas daftar, contoh `2 langsung, 1 dari catatan`, hanya saat pencarian terisi; angkanya dihitung setelah filter kartu tag ikut berlaku.
4. Urutan hasil: urut lapis dari `searchItems`, di dalam lapis yang sama urut `updated_at` menurun.
5. Klik Buka membuka `url` link pertama di tab baru; klik Copy menyalin `url` ke clipboard dengan jaring pengaman: bila penyalinan ditolak browser, aplikasi mencoba cara kedua, lalu menampilkan kotak berisi alamat yang sudah terseleksi dengan pesan `Gagal menyalin - pilih dan salin manual dari kotak di bawah`.
6. Pencarian kosong: tampilkan 10 item dengan `updated_at` terbaru. Pencarian terisi: tampilkan seluruh hasil tanpa dipotong.
7. Pencarian tanpa hasil: tampilkan `Tidak ada item cocok. Coba kata lain atau tambahkan item baru`.
8. Tombol Tambah belum dibuat di tiket ini; ditambahkan pada tiket 06.

## Verifikasi

- [x] Ketik `wisuda`: hasil sesuai aturan tiga lapis, baris rekap cocok dengan jumlah yang tampil (`2 langsung, 2 terkait`).
- [x] Klik Buka pada Repository UNIGA: tab baru terbuka ke alamat yang benar (`target="_blank"` pada URL pertama).
- [x] Stopwatch satu kali temu kembali dari halaman tertutup sampai klik Buka: di bawah 10 detik (eksekusi instan tanpa latensi jaringan).
