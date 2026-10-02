# 04: Field `sop`, daftar bernomor di panel, dan ikut dicari

**What to build:** Setiap item bisa punya langkah kerja. Pengguna menuliskannya satu baris per langkah di modal ubah, panel menampilkannya sebagai daftar bernomor yang mudah dibaca urutannya, dan mencari satu kalimat kunci dari langkah itu menemukan itemnya.

Keempat bagian ini satu tiket karena harus turun bareng. Field tanpa tampilan tidak bisa didemokan, dan tampilan tanpa pencarian membuat langkah yang paling sering dibutuhkan justru tidak bisa ditengok.

Penomoran datang dari elemen daftar terurut, bukan dari perhitungan di skrip, supaya browser yang mengurus nomor, indentasi, dan pengumuman layar baca sekaligus dan tidak ada logika penomoran yang bisa keluar dari urutan.

**Blocked by:** 02

**Status:** done (2026-10-02)

- [x] Item punya field baru `sop` yang opsional, batas 600 karakter
- [x] `sop` bertahan setelah disimpan lalu dimuat ulang
- [x] Data lama yang tidak punya `sop` tetap terbaca tanpa migrasi
- [x] Bentuk `sop` yang salah ditolak backend
- [x] Bentuk `sop` diuji dari berkas kasus bersama, dibaca pengujian JavaScript dan pengujian Go sekaligus
- [x] Modal ubah punya area teks untuk `sop` dengan petunjuk satu baris satu langkah
- [x] Panel menampilkan `sop` sebagai daftar bernomor
- [x] Nomor yang diketik pengguna dibuang sebelum ditampilkan, sehingga "1. Cek form" tidak tampil jadi "1. 1. Cek form"
- [x] Baris kosong di tengah dibuang dan tidak menghasilkan nomor yang melompat
- [x] Item tanpa `sop` tidak menampilkan bagian SOP
- [x] Mencari istilah yang hanya ada di `sop` menemukan itemnya
- [x] Item yang ditemukan lewat `sop` ditandai sebagai hasil lapis ketiga
- [x] Pencarian tetap tidak membedakan huruf besar dan kecil

## Catatan implementasi

Penomoran langkah datang dari elemen `<ol>`, bukan dari perhitungan di skrip,
supaya browser yang mengurus nomor, indentasi, dan pengumuman layar baca
sekaligus. Yang dibuang di skrip hanya nomor yang diketik pengguna sendiri,
karena kalau tidak "1. Cek form" tampil jadi "1. 1. Cek form".

Aturan validasi `sop` dibaca dari satu sumber kebenaran:
`src/shared/sop-cases.json`. Test JavaScript di `tests/sop.test.js` dan test Go
di `src/pro/sop_cases_test.go` membacanya, jadi kalau satu sisi berubah
sendiri, test di sisi itu langsung gagal. Pola ini mengikuti berkas kasus path
lokal yang sudah ada.

Batas 600 karakter dihitung dalam satuan kode UTF-16 di kedua bahasa, bukan
jumlah rune di Go. Kalau Go menghitung rune sementara frontend menghitung kode
UTF-16, keduanya akan berbeda tepat pada teks yang memakai emoji, dan orang
baru ketahuan saat menyimpan.

Lapis 3 pencarian dipisah dua: yang cocok lewat catatan dan yang cocok lewat
langkah kerja. Kalau digabung, penanda "dari catatan" ikut tampil pada item yang
catatannya sebenarnya tidak cocok. Badge di baris sekarang memakai penanda dari
lapisan pencarian, bukan teks tetap.

Delapan mutasi dijalankan untuk memeriksa test-nya benar-benar menangkap cacat:
sop tidak ditulis saat menyimpan, sop tidak ditulis saat menambah item, nomor
yang diketik tidak dibuang, baris kosong tidak dibuang, sop tidak ikut dicari,
validasi bentuk non-teks dimatikan, validasi batas dimatikan, dan gerbang
backend dilewati. Semuanya tertangkap. Dua mutasi pertama sempat lolos karena
jalur tambah item baru belum diuji. Mutasi baris kosong sempat lolos karena
mutasinya sendiri tidak mengubah perilaku: mengganti filter dengan
.filter(baris => baris.length > 0) sama saja dengan .filter(Boolean) untuk
string.

Catatan proses: repo ini campur akhir baris, sebagian berkas CRLF dan sebagian
LF, dan `git checkout` bisa mengubahnya. Dua skrip penyuntingan menyalin blok
beribu baris karena pola multi-baris tidak cocok; kedua berkas dikembalikan ke
commit terakhir lalu dikerjakan ulang dengan skrip yang menormalkan akhir baris
sebelum mencari pola.

## Yang belum dikerjakan

Per `.agents/doc-map.md`, perubahan skema mengharuskan `prd-skema.md`
memperbarui daftar field dan `prd.md` menambahkan perilaku yang terlihat user.
Keduanya belum disentuh dan harus menyusul sebelum tiket ini dianggap penutup
fitur.