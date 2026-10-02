# 02: Panel menampilkan konteks lengkap item

**What to build:** Panel menampilkan judul, seluruh tautan, seluruh tag, dan catatan lengkap dari item yang dipilih, supaya pengguna bisa bekerja pada satu item tanpa membuka modal yang memutus alur kerja. Catatan di panel sengaja tidak dipotong, berbeda dari tabel yang memangkas supaya beberapa baris masih muat sekaligus.

Kolom tabel memakai urutan pemangkasan yang sudah ditetapkan: URL paling dulu dipangkas karena sudah tampil utuh di panel beserta tombol salin, lalu tag, dan catatan paling akhir karena catatan adalah pembeda utama antara item yang namanya mirip.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Panel menampilkan judul item tanpa dipotong
- [ ] Panel menampilkan setiap tautan sebagai baris berisi label dan URL
- [ ] Setiap tautan punya tombol salin
- [ ] Tautan bisa dibuka langsung dari panel
- [ ] Panel menampilkan seluruh tag item, termasuk yang belum terdaftar
- [ ] Panel menampilkan catatan tanpa dipotong
- [ ] Item tanpa catatan tidak menampilkan bagian catatan kosong
- [ ] Baris tabel yang sedang dipilih ditandai jelas secara visual dan lewat atribut yang bisa dibaca teknologi bantu
- [ ] Tabel memuat judul, URL, tag, catatan, dan aksi
- [ ] URL dipangkas lebih dulu di layar sempit, lalu tag, lalu catatan
- [ ] Judul dan aksi tidak pernah dipangkas