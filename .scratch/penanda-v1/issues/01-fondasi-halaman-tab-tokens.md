# 01 - Fondasi halaman, tab, dan token CSS

Status: resolved
Blocked by: -
Type: task

## Hasil yang diinginkan

Halaman yang bisa dibuka langsung dari Explorer, punya tiga tab (Indeks, Todo, Log), dan sudah memakai token visual V1. Tab belum berisi data.

## Langkah

1. `src/lite/index.html`: kerangka halaman, baris tab setinggi 48 px, area konten, area status di kanan atas.
2. `src/lite/style.css`: 19 variabel warna, skala huruf (15/14/13/11-12 px), radius 4 px untuk kotak kecil dan 6 px untuk kotak besar, border 1 px, tanpa bayangan dan tanpa gradien, transisi 120-150 ms. Semua nilai dari `design-tokens.md`.
3. `src/lite/app.js`: kerangka state, ganti tab lewat klik, tab aktif disimpan di memori saja.
4. Muat `app.js` dan `search.js` sebagai script biasa, bukan ES module.

## Verifikasi

- [x] Double-click `src/lite/index.html`: tiga tab (Indeks, Todo, Log) bisa diklik, script `search.js` dan `app.js` dimuat sebagai script biasa (bukan ES module), tidak ada error di console.
- [x] Radius maksimum terukur 6 px (`--radius-md: 6px`, `--radius-sm: 4px`); tidak ada bayangan selain ring fokus (`box-shadow: 0 0 0 1px`); tidak ada gradien.
- [x] Tinggi baris tab terukur tepat 48 px (`--header-height: 48px`).
- [x] Seluruh 5 unit test di `tests/foundations.test.js` lulus 100% (verifikasi file, struktur offline, 19 token warna, kendala bentuk, dan logika pergantian tab).
