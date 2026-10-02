# Panel Inspeksi Item dan Tampilan Tabel

Status: ready-for-agent
Tiket: `issues/` di folder ini, empat tiket vertikal
Sumber kebenaran produk: `C:\vault\01-Projects\Penanda\prd.md`
Pendamping: `prd-skema.md` (field dan batasan), `design-tokens.md` (visual). Keduanya di `C:\vault\01-Projects\Penanda\`.

> **Baca dulu sebelum memakai spec ini.** Spec ini bukan redesign visual, tapi perubahan
> komposisi layar plus satu field data baru. Yang tidak berubah: skema yang sudah ada,
> validasi, endpoint, dan batasan tanpa CDN maupun framework.

## Problem Statement

Penanda menampilkan hasil pencarian sebagai kartu grid. Setiap kartu memuat judul, catatan, tag, dan tombol aksi. Dua hal hilang sebagai hasilnya.

Pertama, membandingkan beberapa item sekaligus itu mahal. Ketika ada belasan item dengan nama serupa, yang membedakan cuma catatan dan tag, dan catatan itu dipotong sehingga tidak bisa dibandingkan. Untuk memutuskan item mana yang akan dibuka, pengguna harus memeriksa satu per satu.

Kedua, konteks sebuah item tersebar. Aturan kerja, tautan, tag, dan catatan ada di tempat berbeda, dan tidak ada satu tampilan yang mengumpulkan semuanya sekaligus. Ketika pengguna sedang mengerjakan satu item, ia perlu melihat semuanya tanpa meninggalkan daftar.

## Solution

Daftar hasil punya dua mode. Mode kartu untuk memindai banyak item dan memakai lebar penuh. Mode tabel untuk mengerjakan satu item: ketika satu baris dipilih, layar terbagi dua, area tabel di kiri memakai 65 persen lebar, panel inspeksi di kanan memakai 35 persen. Ketika pengguna memilih satu baris tabel, panel menampilkan konteks lengkap item itu: judul, tautan dengan tombol salin, tag, catatan, dan langkah kerja bernomor. Panel mengubah dirinya sendiri menjadi keadaan kosong yang menjelaskan tujuannya ketika tidak ada baris dipilih.

Ditambah satu: langkah kerja bernomor. Setiap item bisa punya SOP berupa daftar langkah, dan panel menampilkannya sebagai daftar bernomor supaya urutannya mudah dibaca. Langkah ini opsional, item yang tidak punya SOP tetap tampil normal.

## Untuk siapa, dan ukurannya

Penggunanya satu pustakawan yang mengantar orang mencari akses dokumen. Ia bekerja sendirian di depan arsip, sering berjam-jam, dan tahu dokumen mana yang sering dibuka.

**Ukuran berhasil yang dipakai menilai perubahan ini:**

> Jumlah klik untuk membuka satu item turun dari dua jadi satu.

Ukuran ini dipilih karena bisa dihitung manual, tidak membutuhkan timer, tidak membutuhkan penghitung, dan bisa diuji langsung pada satu orang. Kalau angkanya tidak turun, panel ini tidak menjalankan fungsinya.

**Asumsi yang harus diuji dan belum terbukti:** panel mengambil 35 persen ruang tabel, sehingga area pemindaian menjadi lebih sempit. Dugaan yang belum diuji adalah bahwa waktu dari mengetik kata kunci sampai dokumen benar terbuka menjadi lebih singkat. Dugaan ini bisa benar, bisa salah. Yang salah sama fatally — kalau area tabel jadi terlalu sempit, jumlah klik mungkin turun sementara waktu rises. Pengukuran harus mencatat kedua angka, bukan hanya satu.

## User Stories

1. Sebagai pustakawan, saya ingin melihat item sebagai tabel, sehingga saya bisa membandingkan beberapa item sekaligus dalam satu pandangan.
2. Sebagai pustakawan, saya ingin melihat URL setiap item di barisnya, sehingga saya tahu item itu dokumen yang mana sebelum membukanya.
3. Sebagai pustakawan, saya ingin melihat tag setiap item di barisnya, sehingga saya bisa mengelompokkan sekilas.
4. Sebagai pustakawan, saya ingin catatan setiap item tetap terlihat singkat di baris, sehingga saya punya gambaran tanpa harus memilih.
5. Sebagai pustakawan, saya ingin memilih satu baris dan melihat seluruh konteksnya di panel, sehingga saya tidak perlu membuka modal yang memutus alur kerja.
6. Sebagai pustakawan, saya ingin panel menampilkan judul lengkap item, sehingga saya tidak salah membaca karena teks terpotong.
7. Sebagai pustakawan, saya ingin panel menampilkan tautan dengan tombol salin, sehingga saya bisa menyalin URL tanpa membuka browser.
8. Sebagai pustakawan, saya ingin panel menampilkan seluruh tag item, sehingga saya tidak membuat tag duplikat saat menambah yang baru.
9. Sebagai pustakawan, saya ingin panel menampilkan catatan lengkap tanpa dipotong, sehingga saya tidak salah langkah karena teksnya terpotong.
10. Sebagai pustakawan, saya ingin panel menampilkan langkah kerja bernomor, sehingga urutannya jelas tanpa perlu membacanya dua kali.
11. Sebagai pustakawan, saya ingin panel menjelaskan tujuannya saat belum ada baris dipilih, sehingga saya tahu panel itu bukan bagian yang gagal.
12. Sebagai pustakawan, saya ingin panel tetap berisi isinya saat saya menggulir tabel, sehingga konteks item tidak hilang di tengah jalan.
13. Sebagai pustakawan, saya ingin berpindah dari satu item ke item lain dengan tombol panah, sehingga panel selalu menunjukkan item yang sedang saya baca.
14. Sebagai pustakawan, saya ingin ada tombol ubah di panel, sehingga saya tidak perlu menutup panel dan mencari-cari di baris.
15. Sebagai pustakawan, saya ingin menulis SOP berupa satu baris per langkah, sehingga saya tidak perlu satu input untuk setiap langkah.
16. Sebagai pustakawan, saya ingin nomor langkah muncul otomatis, sehingga saya tidak perlu mengetik angka dan salah nomor.
17. Sebagai pustakawan, saya ingin SOP tampil sebagai daftar bernomor, sehingga urutannya mudah dibaca sekilas.
18. Sebagai pustakawan, saya ingin item yang tidak punya SOP tetap tampil normal, sehingga tidak semua item wajib punya SOP.
19. Sebagai pustakawan, saya ingin panjang SOP lebih longgar daripada catatan, sehingga langkah yang wajar tidak terpotong.
20. Sebagai pustakawan, saya ingin bisa mencari item berdasarkan isi SOP-nya, sehingga saya menemukan langkah penting dari judul maupun tag.
21. Sebagai pustakawan, saya ingin tabel tetap punya kolom aksi yang jelas, sehingga saya tahu apa yang bisa dilakukan pada item.
22. Sebagai pustakawan, saya ingin baris yang sedang dipilih terlihat jelas, sehingga saya tidak salah mengira baris mana yang aktif.
23. Sebagai pustakawan, saya ingin data lama tetap terbaca, sehingga saya tidak perlu mengisi ulang.
24. Sebagai pustakawan, saya ingin panel menampilkan catatan item apa pun yang dipilih, sehingga tidak perlu menebak isi item itu.

## Implementation Decisions

### Tampilan tabel memakai elemen tabel semantik

Di mode tabel, area hasil memakai elemen tabel dengan header kolom, bukan `div` bergrid. Tabel memberi semantik yang benar untuk layar baca: setiap sel diumumkan bersama nama kolomnya, sedangkan grid kartu hanya dibaca berurutan. Tabel juga membuat perbandingan antarbaris jauh lebih mudah karena mata mengikuti kolom.

Mode kartu tetap memakai struktur yang sekarang. Mode itu tidak hilang, hanya tidak lagi menjadi satu-satunya pilihan.

### Urutan prioritas kolom saat layar sempit

Lima kolom pada layar 1366 piksel terasa sempit. Urutan pemangkasan ditetapkan, bukan diserahkan ke keputusan saat coding:

**URL dipangkas lebih dulu.** Alasannya, URL sudah tampil utuh di panel dan ada tombol salin di sana. Yang hilang dari tabel masih bisa dibaca lengkap lewat panel, jadi tidak ada informasi yang benar-benar hilang.

**Tag berikutnya.** Kalau layar masih sempit, tag dipangkas sebagian.

**Catatan terakhir.** Catatan adalah pembeda utama antara item yang namanya mirip, jadi paling akhir boleh hilang.

Kolom judul dan aksi tidak pernah dipangkas.

### Tabel adalah mode kedua, bukan satu-satunya tampilan

Aplikasi sudah punya dua mode tampilan dari sebelumnya: kartu dan daftar. Tabel masuk sebagai mode yang menggantikan daftar, sehingga ada dua mode: kartu dan tabel.

Pembagian itu bukan pilihan teknis, tapi perbedaan tujuan. Mode kartu untuk memindai banyak item, jadi memakai lebar penuh tanpa panel. Mode tabel untuk mengerjakan satu item, jadi panel terbuka di sampingnya. Kalau panel muncul di kedua mode, switcher hanya jadi pilihan tampilan tanpa alasan.

Konsekuensinya: baris "biasanya bareng ini" yang sebelumnya tampil di bawah tabel berpindah ke dalam panel. Konteks item terpilih tidak lagi tampil di dua tempat, dan tidak lagi jauh dari daftar yang sedang dipindai.

### Pembagian layar

Area hasil memakai dua kolom: tabel 65 persen, panel 35 persen. Panel punya lebar minimum agar isinya tetap terbaca; di bawah lebar itu panel menutup dan tabel memakai penuh. PRD menetapkan layar sempit sebagai lingkup V2, jadi perilaku di bawah 768 piksel tidak dikerjakan sekarang.

### Panel hanya membaca, dengan satu pintasan

Panel menampilkan, bukan mengedit. Semua perubahan data tetap lewat modal CRUD, supaya ada satu tempat validasi dan tidak ada aturan yang ditulis dua kali.

**Panel punya satu tombol: ubah.** Alasannya, tanpa tombol itu mengubah satu catatan butuh lima langkah, dan tidak ada satu pun tempat yang menyatakan panel itu hanya-baca. Tombol ini menutup modal yang sama, bukan membuat jalur edit kedua, jadi validasi tetap punya satu sumber.

### Keadaan kosong, bukan panel yang hilang

Panel tidak hilang saat tidak ada baris dipilih. Dia berubah jadi keadaan kosong yang menyebutkan tujuannya sendiri: *"Pilih salah satu baris untuk melihat detailnya."*

Alasannya dua. Pertama, panel yang tiba-tiba hilang tanpa penjelasan bisa dibaca sebagai aplikasi gagal, dan itu termasuk galat yang tidak menjelaskan apa yang terjadi. Kedua, kalimat keadaan kosong itu sekaligus memberi tahu pengguna apa yang dilakukan panel, sehingga ketika panel terisi tujuannya sudah jelas.

Keadaan kosong ini juga menampilkan hitungan hasil pencarian, supaya area yang kosong tetap informatif.

### Penomoran memakai elemen daftar

Nomor langkah datang dari elemen daftar terurut, bukan dari perhitungan di skrip. Browser menangani nomor, indentasi, dan pengumuman layar baca sekaligus, sehingga tidak ada logika penomoran yang bisa rusak.

Keputusan ini datang dari prototipe kecil yang menguji dua cara:

```js
// Ditolak: nomor dihitung sendiri, mudah keluar dari sinkron
steps.map((line, i) => `<div>${i + 1}. ${line}</div>`).join('')

// Dipakai: penomoran dan indentasi dari elemen daftar
steps.map(line => `<li>${escapeHtml(line)}</li>`).join('')
```

Nomor yang diketik pengguna dibuang sebelum dirender. Kalau pengguna mengetik "1. Cek form", hasilnya tidak boleh tampil "1. 1. Cek form". Pola untuk membuangnya ditetapkan di satu tempat.

### Baris kosong di tengah

Baris kosong dibuang sebelum penomoran. Jika pengguna menyisipkan jeda di tengah langkah, penomorannya menjadi rapat. Keputusan ini disengaja: untuk daftar langkah kerja, jeda jarang bermakna, sedangkan nomor yang melompat membuat urutan sulit diikuti mata.

### Field baru `sop`

```
sop   string   opsional   maksimal 600 karakter, satu baris = satu langkah
```

Hanya ini satu-satunya perubahan skema. Field opsional berarti seluruh data lama tetap valid tanpa migrasi, dan memaksa siapa pun mengisi SOP akan membuat orang mengarangnya, sedangkan data kosong lebih jujur daripada data busuk.

Normalisasi data saat ini hanya mempertahankan kunci yang sudah dikenal, sehingga field baru wajib masuk daftar itu secara eksplisit. Tanpa itu field akan terbuang diam-diam setiap kali data dimuat, dan gejalanya hanya muncul beberapa saat setelah data dimuat.

Validasi di sisi server tetap memeriksa bahwa field itu berupa string bila ada, dan menolak bentuk lain. Batas 600 karakter cukup untuk lima sampai enam langkah wajar tanpa berubah jadi dokumen.

### Bagian kosong tidak dirender

Panel menampilkan hanya bagian yang datanya ada. Item tanpa SOP tidak menampilkan judul bagian SOP dengan tanda hubung. Item tanpa catatan tidak menampilkan bagian catatan.

Konsekuensi yang perlu disadari: pengguna tidak bisa membedakan item yang memang tidak punya SOP dari item yang belum diisi SOP-nya. Ini pilihan sadar, demi panel yang tidak dipenuhi ruang kosong. Kalau nanti ternyata bermasalah, jalan keluarnya bukan selalu menampilkan bagian kosong, melainkan memberi tanda pada item yang belum diisi.

### SOP ikut pencarian lapis ketiga

Pencarian lapis ketiga sekarang membaca satu field. Setelah perubahan, isinya membaca gabungan catatan dan SOP. Konsekuensinya pencarian istilah di dalam langkah SOP akan menemukan itemnya, sama seperti bagaimana pencarian istilah di dalam catatan sudah bekerja.

### Panel bertahan saat tabel bergulir

Memilih baris lain, mengetik di kotak pencarian, atau menggulir tabel tidak boleh mengosongkan panel selama item yang difokuskan masih ada di hasil. Kalau item itu hilang dari hasil, fokus boleh dilepas, dan keadaan kosong panel menunjuk ke alasannya.

## Testing Decisions

Pengujian hanya menguji perilaku luar yang terlihat pengguna. Tidak ada pengujian yang memeriksa nama variabel internal, urutan properti CSS, atau struktur DOM yang tidak terlihat.

Tiga seam, semuanya sudah ada di repo:

**Seam 1 — harness render frontend.** Memuat aplikasi ke dalam lingkungan uji dengan DOM tiruan, memicu render, lalu memeriksa hasil. Dipakai tanpa perlu diperluas.

Yang diuji: tabel muncul dengan header kolom yang benar; baris memuat judul, url, tag, dan catatan; memilih baris mengisi panel dengan data item yang benar; keadaan kosong muncul dengan kalimatnya ketika tidak ada baris dipilih; panel bertahan setelah pengguliran dan setelah pengetikan di kotak pencarian; panel terisi kembali setelah baris dipilih lagi; panel menjadi kosong dengan alasan yang benar ketika item yang difokuskan hilang dari hasil; tombol ubah di panel membuka modal yang sama seperti tombol di baris; SOP dirender sebagai daftar bernomor dengan jumlah langkah yang benar; nomor yang diketik pengguna dibuang; baris kosong di tengah tidak menghasilkan nomor melompat; item tanpa SOP tidak menampilkan bagian SOP; SOP ikut memberi hasil pencarian lapis ketiga.

**Seam 2 — berkas kasus bersama untuk bentuk skema.** Pola sudah ada di repo: satu berkas kasus dibaca pengujian JavaScript dan pengujian Go sekaligus, sehingga bentuk field baru tidak bisa berbeda antara dua bahasa. Diperluas dengan kasus untuk field baru: nilai kosong, nilai berupa teks, nilai berisi baris kosong, dan nilai melebihi batas.

**Seam 3 — handler backend lewat pengujian HTTP.** Menguji bahwa payload dengan field baru diterima, dan payload dengan field baru yang salah bentuk ditolak.

Pengujian yang jadi acuan terdekat: pengujian dropdown pengurutan memeriksa urutan DOM yang dihasilkan, bukan cara pengurutan di dalam; pengujian kontras membaca nilai nyata dari berkas CSS lalu menghitung, bukan memeriksa string.

**Yang tidak diuji:** lebar panel dalam piksel, proporsi pembagian kolom, urutan properti CSS, perilaku hover, dan animasi.

## Out of Scope

- Kolom ringkasan SOP di tabel. Panel sudah menampilkan SOP utuh ketika baris dipilih, jadi kolom terpotong di setiap baris tidak menambah informasi
- Daftar periksa dengan kotak centang. Langkah bernomor dipilih karena tidak menyimpan status
- Operator yang bertanggung jawab atas item
- Waktu akses terakhir lengkap dengan jam
- Urutan berdasarkan paling sering dipakai, dan penghitungan pemakaian
- Penyimpanan item sebagai lampiran
- Enkripsi data lokal dan seluruh sistem pengelolaan kunci
- Pemeriksaan daring apakah layanan pihak ketiga masih hidup
- Perilaku di bawah 768 piksel; PRD menetapkan ini V2
- Navigasi panah di seluruh aplikasi; panel hanya mengikuti item terpilih yang sudah ada
- Migrasi data: field baru opsional, tidak ada yang perlu dimigrasi
- Modul baru di luar tab yang sudah ada
- Pengujian otomatis aksesibilitas dengan pembaca layar; panel memakai elemen tabel dan daftar standar agar dapat diuji kemudian tanpa struktur khusus

## Further Notes

**Risiko yang sudah diketahui dan diterima:**

1. Field baru bisa terbuang diam-diam. Normalisasi data hanya mempertahankan kunci yang dikenal, jadi field baru wajib masuk daftar itu. Kegagalan ini tidak terlihat di pengujian yang tidak memeriksa putaran baca-tulis secara khusus.

2. Keadaan kosong perlu kalimat yang benar. Test harus memeriksa kalimatnya muncul, bukan hanya elemennya ada, karena itu satu-satunya tanda bahwa panel berfungsi.

3. Panel bertahan saat menggulir adalah perilaku yang mudah hilang saat refactor berikutnya. Test khusus untuk itu ada karena tidak ada test lain yang akan menangkapnya.

4. Panel hanya-baca dengan tombol pintasan masih lima langkah bagi yang tidak terbiasa. Kalau pengukuran menunjukkan jumlah klik tidak turun, pert foremost yang perlu diperiksa adalah apakah tombol ubah di panel cukup, bukan langsung menambah jalur edit kedua.

5. Percakapan yang harus disepakati lebih dulu: transformasi kartu menjadi tabel mengubah komposisi halaman secara signifikan, jadi pengujian visual di layar nyata tetap diperlukan setelah selesai. Spec ini tidak menunggu penilaian visual, tetapi hasilnya juga belum bisa dinyatakan bagus sebelum ada yang melihatnya.

6. Pengukuran ukuran berhasil harus mencatat waktu ke dokumen, bukan hanya jumlah klik. Kenaikan jumlah klik dengan waktu yang sama berarti panel tidak membantu. Waktu yang lebih lambat dengan jumlah klik yang sama berarti area tabel terlalu sempit, dan itu alasan untuk meninjau ulang pembagian layar.