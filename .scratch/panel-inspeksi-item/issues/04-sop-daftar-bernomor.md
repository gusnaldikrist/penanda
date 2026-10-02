# 04: Field `sop`, daftar bernomor di panel, dan ikut dicari

**What to build:** Setiap item bisa punya langkah kerja. Pengguna menuliskannya satu baris per langkah di modal ubah, panel menampilkannya sebagai daftar bernomor yang mudah dibaca urutannya, dan mencari satu kalimat kunci dari langkah itu menemukan itemnya.

Keempat bagian ini satu tiket karena harus turun bareng. Field tanpa tampilan tidak bisa didemokan, dan tampilan tanpa pencarian membuat langkah yang paling sering dibutuhkan justru tidak bisa ditengok.

Penomoran datang dari elemen daftar terurut, bukan dari perhitungan di skrip, supaya browser yang mengurus nomor, indentasi, dan pengumuman layar baca sekaligus dan tidak ada logika penomoran yang bisa keluar dari urutan.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Item punya field baru `sop` yang opsional, batas 600 karakter
- [ ] `sop` bertahan setelah disimpan lalu dimuat ulang
- [ ] Data lama yang tidak punya `sop` tetap terbaca tanpa migrasi
- [ ] Bentuk `sop` yang salah ditolak backend
- [ ] Bentuk `sop` diuji dari berkas kasus bersama, dibaca pengujian JavaScript dan pengujian Go sekaligus
- [ ] Modal ubah punya area teks untuk `sop` dengan petunjuk satu baris satu langkah
- [ ] Panel menampilkan `sop` sebagai daftar bernomor
- [ ] Nomor yang diketik pengguna dibuang sebelum ditampilkan, sehingga "1. Cek form" tidak tampil jadi "1. 1. Cek form"
- [ ] Baris kosong di tengah dibuang dan tidak menghasilkan nomor yang melompat
- [ ] Item tanpa `sop` tidak menampilkan bagian SOP
- [ ] Mencari istilah yang hanya ada di `sop` menemukan itemnya
- [ ] Item yang ditemukan lewat `sop` ditandai sebagai hasil lapis ketiga
- [ ] Pencarian tetap tidak membedakan huruf besar dan kecil