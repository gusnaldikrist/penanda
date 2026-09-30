# 12 - Paket rilis dan audit offline

Status: ready-for-agent
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

- Windows bersih, tanpa alat apa pun: instal Lite terukur di bawah 2 menit.
- Windows bersih, tanpa Go: instal Pro terukur di bawah 2 menit.
- DevTools Network saat aplikasi dipakai offline: nol request ke domain luar.
- Satu staf tanpa panduan lisan: bisa mencari dan menambah item dalam waktu di bawah 5 menit.
- Hasil keenam ukuran ditulis di sini sebagai angka, bukan perkiraan.
