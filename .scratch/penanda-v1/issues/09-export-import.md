# 09 - Export dan Import JSON (jalur Lite)

Status: resolved
Blocked by: 02
Type: task

## Hasil yang diinginkan

Data jalur Lite bisa dipindahkan dan dicadangkan tanpa alat lain: satu berkas JSON keluar dari browser dan bisa dimasukkan kembali.

## Langkah

1. Tombol Export: mengunduh berkas bernama `indeks-data-YYYYMMDD.json` berisi seluruh isi berkas, termasuk penanda `version`.
2. Tombol Import: memilih berkas JSON, memvalidasi bentuknya, lalu meminta konfirmasi karena seluruh data saat ini akan ditimpa.
3. Berkas tidak sah: tampilkan pesan alasan singkat dan jangan ubah data yang ada.
4. Hasil Export dari Lite harus dapat dipakai jalur Pro dan sebaliknya, karena bentuk datanya identik.

## Verifikasi

- [x] Export lalu Import pada profil browser lain: 4 item, 1 todo, 1 log, dan `pinned_tags` pulih utuh.
- [x] Import berkas yang `items`-nya bukan array: ditolak, data lama tetap utuh.
- [x] Nama berkas hasil unduhan memuat tanggal hari ini.
