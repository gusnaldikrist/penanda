PENANDA v1
===========

Alat kecil untuk menemukan akses dokumen kerja: link SLiMS, Repository,
Google Sheet, berkas lokal, plus catatan todo dan logbook harian.

Semua data disimpan di komputer Anda sendiri. Tidak ada akun, tidak ada
server, tidak ada request ke internet.


CARA JALAN LITE (tanpa instal apa pun)
--------------------------------------

1. Ekstrak ZIP ini ke satu folder tetap, misalnya D:\Penanda\
   Jangan langsung membuka dari dalam ZIP.
2. Double-click index.html.
3. Aplikasi terbuka di browser. Selesai.

Data Lite disimpan di localStorage browser. Untuk memindahkan data ke
komputer lain: klik Export, lalu di komputer lain klik Import dan pilih
berkas itu.

Catatan: di jalur Lite, path lokal seperti D:\Data\laporan.xlsx tidak bisa
dibuka oleh browser. Untuk itu pakai jalur Pro.


CARA JALAN PRO (punya path lokal banyak)
----------------------------------------

1. Ekstrak ZIP ini ke satu folder tetap, misalnya D:\Penanda\
2. Double-click penanda.exe
3. Browser otomatis terbuka ke http://localhost:8080

Yang berbeda dari Lite:
- Path lokal bisa dibuka satu klik, bukan disalin manual.
- Setiap kali menyimpan, aplikasi membuat salinan harian otomatis
  (data-YYYYMMDD.json) di folder yang sama. Kalau data rusak, salinan
  terbaru bisa dipakai kembali.
- Data disimpan di berkas data.json di folder penanda.exe, jadi mudah
  dicadangkan: cukup salin foldernya.


CADANGKAN DATA
--------------

Jalur Lite  : Export JSON setiap sekarang dan kemudian. Simpan berkasnya
              di tempat aman. Itu satu-satunya cadangan Anda.
Jalur Pro   : salinan harian dibuat otomatis. Tetap disarankan menyalin
              folder penanda.exe ke tempat lain sesekali.


CATATAN KEAMANAN
-----------------

- Server hanya mendengarkan di localhost (127.0.0.1). Tidak bisa diakses
  dari komputer lain atau internet.
- Tidak ada request ke domain luar. Aplikasi jalan penuh tanpa internet.
- penanda.exe adalah binary Go tanpa dependency luar. Windows mungkin
  menampilkan peringatan SmartScreen untuk binary yang belum ditandatangani.
  Pilih "More info" lalu "Run anyway". Itu perilaku normal Windows untuk
  program yang belum terbukti reputasinya, bukan tanda kerusakan.


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
  Kalau lewat Lite, cek apakah sedang buka di browser atau profil yang
  sama. localStorage terpisah per browser. Kalau lewat Pro, cek apakah
  file data.json masih ada di folder penanda.exe.

"Path lokal hanya bisa dibuka di jalur Pro"
  Itu memang begitu. Browser tidak boleh membuka path Windows dari
  halaman web. Pakai jalur Pro kalau perlu membuka berkas lokal.