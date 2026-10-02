# 02: Panel menampilkan konteks lengkap item

**What to build:** Panel menampilkan judul, seluruh tautan, seluruh tag, dan catatan lengkap dari item yang dipilih, supaya pengguna bisa bekerja pada satu item tanpa membuka modal yang memutus alur kerja. Catatan di panel sengaja tidak dipotong, berbeda dari tabel yang memangkas supaya beberapa baris masih muat sekaligus.

Kolom tabel memakai urutan pemangkasan yang sudah ditetapkan: URL paling dulu dipangkas karena sudah tampil utuh di panel beserta tombol salin, lalu tag, dan catatan paling akhir karena catatan adalah pembeda utama antara item yang namanya mirip.

**Blocked by:** 01

**Status:** done (2026-10-02)

- [x] Panel menampilkan judul item tanpa dipotong
- [x] Panel menampilkan setiap tautan sebagai baris berisi label dan URL
- [x] Setiap tautan punya tombol salin
- [x] Tautan bisa dibuka langsung dari panel
- [x] Panel menampilkan seluruh tag item, termasuk yang belum terdaftar
- [x] Panel menampilkan catatan tanpa dipotong
- [x] Item tanpa catatan tidak menampilkan bagian catatan kosong
- [x] Baris tabel yang sedang dipilih ditandai jelas secara visual dan lewat atribut yang bisa dibaca teknologi bantu
- [x] Tabel memuat judul, URL, tag, catatan, dan aksi
- [x] URL dipangkas lebih dulu di layar sempit, lalu tag, lalu catatan
- [x] Judul dan aksi tidak pernah dipangkas

## Catatan implementasi

Urutan pemangkasan ditulis sebagai tiga media query terpisah, bukan satu
blok dengan tiga kondisi. Ambang URL 1280, tag 1100, catatan 940. Kolom
yang dipangkas lebih dulu punya ambang lebih tinggi, jadi hilang lebih awal.
Judul dan aksi tidak punya ambang sama sekali.

Ditemukan cacat lewat pemeriksaan peramban, bukan lewat test: handler
global "klik luar" tidak menganggap `#panel-inspeksi` sebagai bagian area
hasil, sehingga menekan tombol salin di panel menghapus item yang sedang
terpilih lalu mengosongkan panel yang baru saja dipakai. Test regresinya
sudah dibuktikan menangkap cacat: gagal saat klausanya dibuang, lulus
saat dikembalikan.

Harness `tests/panel-inspeksi.test.js` dapat dua perbaikan: payload event
sekarang menyertakan `preventDefault` dan `stopPropagation` seperti event
sungguhan, dan `navigator.clipboard.writeText` dicatat supaya test bisa
memeriksa URL mana yang benar-benar disalin.

Panel menampilkan seluruh tag item, bukan hanya yang jadi kartu di zona
kartu, supaya tag yang belum terdaftar tetap terlihat dan tidak tercipta
duplikat.