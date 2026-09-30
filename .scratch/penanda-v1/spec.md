# Spec: Penanda V1 (Lite + Pro)

Status: ready-for-agent
Tiket: `issues/` di folder ini
Sumber kebenaran produk: `C:\vault\01-Projects\Penanda\prd.md`
Pendamping: `prd-skema.md` (field dan batasan), `arsitektur.md` (mekanisme dan penamaan berkas), `tech-stack.md` (teknologi dan build), `wireframe.md` (susunan layar), `design-tokens.md` (visual). Semua di `C:\vault\01-Projects\Penanda\`.

## Yang dibangun

Satu halaman daftar isi untuk menemukan alamat akses dokumen kerja (URL, path lokal Windows, UNC) dalam waktu di bawah 10 detik, ditambah todo dan logbook ringan sebagai modul terpisah. Dua jalur distribusi memakai frontend yang sama: Lite (double-click halaman, localStorage) dan Pro (double-click `penanda.exe`, berkas `data.json`).

## Kontrak yang tidak boleh dilanggar

1. Tanpa CDN, tanpa framework, tanpa build step. Semua berkas frontend harus jalan dari `file://`.
2. `app.js` dan `search.js` dimuat sebagai script biasa, bukan ES module, karena `file://` memblokir module.
3. Pencarian hanya membaca `items`. Todo dan log tidak pernah masuk hasil pencarian.
4. Todo dan log tidak menambah field wajib di form item dan tidak menambah zona di layar Indeks.
5. Bentuk berkas data identik di kedua jalur; hasil Export Lite dapat dipakai Pro dan sebaliknya.
6. Tag selalu huruf kecil tanpa spasi. Tag bermakna sama dipasang berdampingan pada item yang sama, bukan item baru.
7. Tanpa field `scope` dan tanpa field `frekuensi`.
8. Kunci penyimpanan Lite: `indeks_v1`.

## Prasyarat mesin

| Perlu untuk | Alat | Keadaan di mesin ini |
|---|---|---|
| Menjalankan `tests/search.test.js` | Node.js | Ada, v25.0.0 |
| Membangun `penanda.exe` (tiket 10 sampai 12) | Go 1.22+ | **Sudah terpasang** (v1.27.0) |

## Cara kerja per tiket

- Tiket dikerjakan berurutan sesuai nomor berkas; tiket yang punya `Blocked by:` menunggu tiket itu selesai.
- Satu tiket satu commit, Conventional Commits (`.agents/rules/git-convention.md`).
- Hasil verifikasi ditulis di bagian `## Verifikasi` berkas tiket itu sendiri, bukan di berkas lain.
- Logging sesi ke vault sesuai `.agents/rules/vault-logging.md`.

## Definisi selesai V1

1. Semua tiket di `issues/` berstatus selesai.
2. Enam kriteria di PRD bagian 4 terukur: temu kembali <10 detik, tambah item <30 detik, instal Lite <2 menit, instal Pro <2 menit, paham pakai <5 menit, nol request eksternal.
3. Paket rilis ada di `dist/v1/` dengan `README.txt` berbahasa Indonesia.
