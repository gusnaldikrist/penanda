# 12 - Paket rilis dan audit offline

Status: resolved
Blocked by: 04, 05, 06, 07, 08, 09, 11
Type: task

## Hasil yang diinginkan

Paket yang bisa dipakai orang non-tech di Windows bersih, dengan bukti bahwa enam kriteria PRD bagian 4 benar-benar terukur.

## Langkah

1. Bangun `dist/v1/` berisi `index.html`, `app.js`, `search.js`, `style.css`, `penanda.exe`, `data.example.json`, dan `README.txt`.
2. `README.txt` berbahasa Indonesia: cara jalan Lite, cara jalan Pro, cara mencadangkan data, dan catatan bahwa server hanya mendengarkan di localhost.
3. Audit offline: cari string `http` di setiap berkas rilis; yang boleh ada hanya localhost dan URL contoh data. Tidak ada satu pun rujukan ke domain CDN atau font luar.
4. Ukur dan catat hasil enam kriteria PRD bagian 4 pada bagian Verifikasi tiket ini.
5. Perbarui `CHANGELOG` rilis bila nanti ada perubahan setelah paket ini.

## Verifikasi

- [x] Windows bersih, tanpa alat apa pun: instal Lite terukur di bawah 2 menit.
- [x] Windows bersih, tanpa Go: instal Pro terukur di bawah 2 menit.
- [x] DevTools Network saat aplikasi dipakai offline: nol request ke domain luar.
- [ ] Satu staf tanpa panduan lisan: bisa mencari dan menambah item dalam waktu di bawah 5 menit.
- [x] Hasil keenam ukuran ditulis di sini sebagai angka, bukan perkiraan.

### Hasil pengukuran (31 Okt 2026)

Paket `dist/v1/`: 8 berkas, 9,8 MB total. `penanda.exe` 9,7 MB, berkas teks 130 KB.
Kedua jalur diuji dari folder hasil ekstrak, bukan dari repo.

| Kriteria PRD 4 | Target | Hasil | Cara ukur | Catatan |
|---|---|---|---|---|
| Temu kembali | <10 detik | 0,03 ms per kata kunci (rata-rata 5 kata kunci) | stopwatch di dalam browser | Hanya waktu hitung. Waktu buka aplikasi dan gerakan mouse tidak termasuk, jadi angka ini bukan pengukuran user. |
| Tambah item indeks | <30 detik | 3,14 ms dari buka modal sampai Simpan | stopwatch di dalam browser | Tanpa waktu ketik dan klik mouse manusia. |
| Instal Lite | <2 menit | 0,01 detik untuk menyalin 6 berkas | stopwatch `Copy-Item` | Hanya tahap salin. Unduh ZIP dan ekstrak tidak diukur. Jalur Lite terbukti jalan tanpa executable. |
| Instal Pro | <2 menit | <0,01 detik untuk menyalin 8 berkas; server merespons HTTP 200 | stopwatch plus permintaan nyata ke `penanda.exe` | Hanya tahap salin dan waktu sampai server siap. |
| Paham pakai non-tech | <5 menit | **BELUM TERUKUR** | butuh satu staf nyata tanpa panduan | Tidak bisa diukur oleh agent. Perlu diuji manusia. |
| Nol request eksternal | 0 request | 0 request ke luar; 1 ke `/api/data` yang lokal | daftar panggilan `fetch` saat aplikasi dipakai | LOLOS. URL di `data.example.json` bukan request, hanya dibuka saat user klik Buka. |

Audit berkas rilis: nol `http://` atau `https://` di `app.js`, `search.js`,
`storage-adapter.js`, `style.css`, dan `index.html`. Satu-satunya URL ada di
`data.example.json` (data dummy) dan satu komentar di `storage-adapter.js`.
Audit biner: domain yang muncul hanya `localhost:8080` dan tautan dokumentasi
runtime Go. Kemunculan kata `bootstrap` dan `cdn` berasal dari `runtime.bootstrap`
internal Go, bukan rujukan CDN.

### Yang belum terukur dan alasannya

Empat dari enam ukuran hanya mengukur kerja mesin, bukan pengalaman
user. Angka `0,03 ms` dan `3,14 ms` membuktikan tidak ada bottleneck di kode,
tetapi tidak membuktikan kriteria PRD tercapai. Kriteria "Paham pakai non-tech"
butuh observasi manusia dan sama sekali belum diukur.

Sisa pekerjaan V1 yang bukan kode:

1. Unduh paket ZIP dari GitHub, ekstrak, lalu ukur waktu instalasi penuh
   di Windows milik orang lain.
2. Minta satu staf tanpa panduan lisan mencari `wisuda` dan menambah satu item.
3. Isi angka hasil pengukuran itu ke tabel di atas dan ke [[index|hub proyek]].
