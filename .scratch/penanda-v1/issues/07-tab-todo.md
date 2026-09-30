# 07 - Tab Todo

Status: ready-for-agent
Blocked by: 06
Type: task

## Hasil yang diinginkan

Tab Todo bisa dipakai penuh: tambah, ubah, centang, hapus, dan saring. Entitas terpisah, tidak mengubah perilaku tab Indeks.

## Langkah

1. Daftar memuat teks, kotak centang di kiri, label status, nama item tertaut, lalu tombol Ubah dan Hapus.
2. Urutan: belum selesai di atas, di dalam tiap kelompok urut `updated_at` menurun.
3. Saringan: kotak cari teks milik tab ini (kata kuncinya tidak mempengaruhi tab lain) yang mencocokkan teks todo dan judul item tertaut memakai aturan kata kunci PRD 5.1, plus tombol Semua, Belum, Selesai.
4. Tambah dan ubah lewat modal yang sama dengan tiket 06, isi menyesuaikan: teks (wajib), deadline (opsional), item tertaut (opsional, dipilih dari daftar item).
5. Label status otomatis dari selisih hari kalender: `lewat` bila deadline sebelum hari ini, `mepet` bila deadline hari ini sampai tiga hari ke depan, dan tanpa label bila empat hari lagi atau lebih atau bila deadline kosong; entri yang sudah dicentang berlabel `selesai` menggantikan label lain.
6. Hapus menuntut kata `hapus` diketik sebagai konfirmasi; menghapus todo tidak menghapus item yang ditautkan.
7. Tanpa notifikasi dan tanpa kalender.

## Verifikasi

- Tambah todo, centang, muat ulang halaman: keadaan selesai tetap tersimpan.
- Deadline kemarin: berlabel `lewat`; deadline hari ini dan deadline dua hari lagi: berlabel `mepet`; deadline lima hari lagi dan tanpa deadline: tanpa label.
- Hapus item tertaut: todo tetap ada dengan penanda tanpa tautan.
- Ketik kata kunci di kotak cari tab Todo: hanya daftar todo yang menyempit, tab Indeks tidak berubah.
- Ketik judul item tertaut (mis. `sheet admin`): todo yang menautkan item itu ikut tampil.
