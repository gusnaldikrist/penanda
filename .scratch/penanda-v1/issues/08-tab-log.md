# 08 - Tab Log

Status: ready-for-agent
Blocked by: 06
Type: task

## Hasil yang diinginkan

Tab Log bisa dipakai penuh: catat, ubah, hapus, dan saring berdasarkan teks maupun rentang tanggal.

## Langkah

1. Daftar memuat kolom tanggal tetap di kiri, teks, nama item tertaut, lalu tombol Ubah dan Hapus.
2. Urutan: `date` menurun; entri dengan tanggal sama urut masukan terbaru.
3. Saringan: kotak cari teks yang mencocokkan teks log dan judul item tertaut memakai aturan kata kunci PRD 5.1, plus tanggal Dari dan Sampai. Kedua kotak tanggal kosong saat tab dibuka pertama kali, sehingga seluruh entri tampil.
4. Tambah lewat modal yang sama dengan tiket 06: tanggal (default hari ini, bisa diubah), teks (wajib), item tertaut opsional.
5. Hapus menuntut kata `hapus` diketik sebagai konfirmasi; menghapus log tidak menghapus item yang ditautkan.
6. Tidak menambah penghitung ke area status: area status tetap tiga bagian seperti PRD 5.9 (`Lite - 24 item - tersimpan 16:02`).

## Verifikasi

- Catat entri baru: tanggal terisi hari ini dan entri muncul di baris teratas.
- Ubah tanggal entri menjadi bulan lalu: urutan daftar ikut berubah.
- Saring `Dari: 2026-09-01` `Sampai: 2026-09-29`: hanya entri dalam rentang itu tampil.
- Hapus item tertaut: log tetap ada dengan penanda tanpa tautan.
- Tab Log dibuka pertama kali: kedua kotak tanggal kosong dan seluruh entri tampil.
- Ketik judul item tertaut (mis. `sheet admin`): log yang menautkan item itu ikut tampil.
