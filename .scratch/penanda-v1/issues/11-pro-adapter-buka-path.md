# 11 - Jalur Pro: adapter penyimpanan dan buka path lokal

Status: resolved
Blocked by: 10
Type: task

## Hasil yang diinginkan

Frontend yang sama jalan di dua jalur: mendeteksi sendiri apakah ada backend, lalu memakai API atau localStorage. Path lokal Windows dapat dibuka dengan satu klik di jalur Pro.

## Langkah

1. Saat halaman siap, adapter mencoba `GET /api/data`. Sukses berarti mode Pro (semua baca dan tulis lewat API), gagal berarti mode Lite (localStorage), termasuk saat halaman dibuka dari Explorer.
2. Area status kanan atas memuat tiga bagian dipisah tanda hubung: jalur, jumlah item, dan waktu simpan terakhir, contoh `Pro - 24 item - tersimpan 16:02` atau `Lite - 24 item - tersimpan 16:02` dengan jam lokal 24 jam. Saat membaca berkas, jalur Pro menambahkan kata `memuat`; jam hanya berubah setelah simpan sukses.
3. Tentukan alamat yang dianggap path lokal: awalan huruf drive (`C:\`, `D:\`), awalan UNC (`\\server`), dan skema `file:`.
4. Tombol Buka pada alamat http, https, atau localhost: buka tab baru di kedua jalur.
5. Tombol Buka pada path lokal di mode Pro: kirim `POST /open` berisi `{path}` dan biarkan backend menjalankan `startfile`.
6. Tombol Buka pada path lokal di mode Lite: ganti menjadi tombol Copy dengan pesan `Path lokal hanya bisa dibuka di jalur Pro; teks sudah disalin`, memakai jaring pengaman penyalinan yang sama seperti tiket 04.
7. Keadaan kosong: kalimat konsekuensi jalur ditampilkan sekali sesuai PRD bagian 5.8, supaya user tidak menebak kenapa tombol berbeda antar-jalur.
7. Bila `POST /open` gagal: tampilkan alasan singkat di area status dan sisakan tombol Copy sebagai jalan keluar.

## Verifikasi

- [x] Buka `src/lite/index.html` langsung dari Explorer tanpa server: aplikasi tetap jalan penuh di mode Lite.
- [x] Mode Pro: klik Buka pada path `D:\` membuka Explorer, klik Buka pada URL membuka tab baru.
- [x] Mode Lite: item berpath lokal menampilkan tombol Copy dengan pesan arahan, bukan tombol yang gagal senyap.
- [x] Matikan server saat halaman Pro terbuka lalu simpan: pesan gagal muncul dan isian tidak hilang.
