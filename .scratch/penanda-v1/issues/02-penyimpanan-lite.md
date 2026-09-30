# 02 - Penyimpanan Lite dan data awal

Status: ready-for-agent
Blocked by: 01
Type: task

## Hasil yang diinginkan

Data dibaca dan ditulis ke localStorage pada kunci `indeks_v1` dengan bentuk yang sama seperti `data.example.json`. Saat belum ada data, layar menampilkan keadaan kosong dengan dua jalan keluar seperti PRD bagian 5.8: Tambah item atau Import JSON; tombol Import sendiri dikerjakan pada tiket 09.

## Langkah

1. `src/shared/data.example.json`: salin blok JSON di `prd-skema.md` bagian 6 apa adanya.
2. `src/lite/app.js`: `loadData()` dan `saveData(data)` atas kunci `indeks_v1`; bentuk kosong `{"version":1,"items":[],"todo":[],"logs":[],"pinned_tags":[]}`.
3. Bila browser memblokir localStorage (`SecurityError`), tampilkan pesan singkat yang mengarahkan ke jalur Pro dan jangan kehilangan isian yang sedang di layar.

## Verifikasi

- Buka dari `file://`, isi 4 item lewat `saveData()` dari console memakai blok JSON di `prd-skema.md` bagian 6, muat ulang halaman: 4 item tetap ada.
- `data.example.json` lolos `ConvertFrom-Json` dan `version` bernilai 1.
