PENANDA v1
===========

Alat kecil untuk menemukan akses dokumen kerja: link SLiMS, Repository,
Google Sheet, berkas lokal, plus catatan todo dan logbook harian.

Semua data disimpan di komputer Anda sendiri. Tidak ada akun, tidak ada
server, tidak ada request ke internet.


CARA JALAN
----------

1. Ekstrak ZIP ini ke satu folder tetap, misalnya D:\Penanda\
   Jangan langsung membuka dari dalam ZIP.
2. Double-click penanda.exe
3. Browser otomatis terbuka ke http://localhost:8080

Satu cara jalan saja. Tidak ada mode lain, tidak ada pilihan yang perlu
dibuat saat memasang.


MENYIMPAN DATA
--------------

Setiap kali Anda menyimpan, aplikasi menulis ke berkas data.json di
folder yang sama dengan penanda.exe, sekaligus membuat salinan harian
data-YYYYMMDD.json. Kalau data.json rusak, salinan terbaru bisa dipakai
lagi.

Mencadangkan cukup dengan menyalin folder penanda.exe ke tempat lain.
Tidak perlu ada langkah backup khusus.

Untuk berpindah ke komputer lain: klik Export JSON di aplikasi, salin
berkasnya ke komputer tujuan, lalu di sana klik Import JSON dan pilih
berkas itu.


BERKAS LOKAL
-------------

Path lokal seperti D:\Data\laporan.xlsx bisa dibuka satu klik, lewat
tombol Buka. Aplikasi meneruskan permintaan itu ke penanda.exe, jadi
Windows yang membukanya dengan aplikasi bawaannya.

Kalau tombol Buka gagal, teksnya sudah disalin; ada tombol Copy di
sampingnya sebagai jalan keluar.


CADANGKAN DATA
--------------

  Salinan harian  dibuat otomatis tiap kali Anda menyimpan.
  Cadangan penuh  salin folder penanda.exe ke tempat lain sesekali.


CATATAN KEAMANAN
-----------------

- Server hanya mendengarkan di localhost (127.0.0.1). Tidak bisa diakses
  dari komputer lain atau internet.
- Tidak ada request ke domain luar. Aplikasi jalan penuh tanpa internet.
- penanda.exe adalah binary Go tanpa dependency luar. Windows mungkin
  menampilkan peringatan SmartScreen untuk binary yang belum ditandatangani.
  Pilih "More info" lalu "Run anyway". Itu perilaku normal Windows untuk
  program yang belum terbukti reputasinya, bukan tanda kerusakan.
- Kalau halaman terbuka tapi aplikasi complaining tidak menemukan
  server, Anda mungkin terklik index.html secara tidak sengaja. Tutup
  halaman itu, lalu jalankan penanda.exe.


MULAI DARI MANA
---------------

Layar kosong punya dua jalan keluar:

  + Tambah Item   -> isi sendiri satu per satu
  Import JSON     -> pakai data.example.json sebagai bahan latihan, lalu
                     ganti dengan data Anda sendiri

Cara cepat mencoba: klik Import JSON, pilih file data.example.json di
folder ini, lalu konfirmasi.


MASALAH UMUM
------------

"Port 8080 sedang dipakai"
  Program lain memakai port itu. Tutup program itu, atau reboot, lalu
  jalankan penanda.exe lagi.

Data tidak muncul padahal pernah diisi
  Cek apakah file data.json masih ada di folder penanda.exe, dan apakah
  folder itu yang sama dengan tempat penanda.exe dijalankan. Kalau
  concorrannya, data Anda ada di folder yang berbeda - cari di riwayat
  folder penanda.exe.

"Aplikasi ini berjalan lewat penanda.exe"
  Anda membuka index.html langsung. Penanda.exe adalah server; tanpa
  itu tidak ada tempat menyimpan data. Tutup halaman, klik dua kali
  penanda.exe, lalu pakai browser yang terbuka otomatis.
