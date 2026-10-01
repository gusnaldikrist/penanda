# Spec: Penanda V1 (Lite + Pro)

Status: selesai (12 tiket `resolved`); sebagian kontrak dibatalkan 2026-10-01
Tiket: `issues/` di folder ini
Sumber kebenaran produk: `C:\vault\01-Projects\Penanda\prd.md`
Pendamping: `prd-skema.md` (field dan batasan), `arsitektur.md` (mekanisme dan penamaan berkas), `tech-stack.md` (teknologi dan build), `wireframe.md` (susunan layar), `design-tokens.md` (visual). Semua di `C:\vault\01-Projects\Penanda\`.

> **Baca dulu sebelum memakai spec ini.** Dokumen ini kontrak kerja yang disepakati sebelum
> eksekusi dan sengaja tidak ditulis ulang, supaya jejaknya tetap terlihat. Sebagian isinya
> dibatalkan user pada 2026-10-01 setelah V1 berjalan. Untuk dokumen yang menyatakan keadaan
> sekarang, baca dokumen vault; daftar pembatalannya ada di bagian "Kontrak" di bawah.

## Yang dibangun

Satu halaman daftar isi untuk menemukan alamat akses dokumen kerja (URL, path lokal Windows, UNC) dalam waktu di bawah 10 detik, ditambah todo dan logbook ringan sebagai modul terpisah. Dua jalur distribusi memakai frontend yang sama: Lite (double-click halaman, localStorage) dan Pro (double-click `penanda.exe`, berkas `data.json`).

## Kontrak yang tidak boleh dilanggar

1. Tanpa CDN, tanpa framework, tanpa build step. ~~Semua berkas frontend harus jalan dari `file://`.~~ Pengecualian 2026-10-01: frontend disajikan backend, jadi tidak perlu jalan dari `file://`.
2. `app.js` dan `search.js` dimuat sebagai script biasa, bukan ES module. Alasan awal: `file://` memblokir module. Tetap berlaku supaya tidak perlu build step.
3. Pencarian hanya membaca `items`. Todo dan log tidak pernah masuk hasil pencarian.
4. Todo dan log tidak menambah field wajib di form item dan tidak menambah zona di layar Indeks.
5. ~~Bentuk berkas data identik di kedua jalur; hasil Export Lite dapat dipakai Pro dan sebaliknya.~~ **Dibatalkan 2026-10-01**: hanya ada satu jalur, jadi bentuk berkasnya hanya satu. Aturan yang tersisa: bentuk berkas yang diterima Import harus sama dengan bentuk yang ditulis backend.
6. Tag selalu huruf kecil tanpa spasi. Tag bermakna sama dipasang berdampingan pada item yang sama, bukan item baru.
7. Tanpa field `scope` dan tanpa field `frekuensi`.
8. ~~Kunci penyimpanan Lite: `indeks_v1`.~~ **Dibatalkan 2026-10-01**: tidak ada localStorage sama sekali. Test penjaga `tests/single-mode.test.js` mengunci frontend tidak menyentuh `localStorage`.

Kontrak 1 sampai 4 masih berlaku. Kontrak 1 punya satu pengecualian yang lahir dari pembatalan ini: frontend tidak lagi harus bisa dibuka dari `file://` - backend yang menyajikannya. Yang tetap berlaku adalah tanpa CDN, tanpa framework, dan tanpa build step. Kontrak 3 dan 4 tidak berubah.

Keputusan pembatalannya beserta alasannya ada di `decisions.md` vault, entri "Jalur Lite dihapus: satu cara jalan, satu tempat data" (2026-10-01).

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
2. Enam kriteria di PRD bagian 4 terukur: temu kembali <10 detik, tambah item <30 detik, instal <2 menit, paham pakai <5 menit, nol request eksternal. Semula ditulis "instal Lite <2 menit, instal Pro <2 menit"; setelah jalur Lite dihapus hanya ada satu cara instalasi.
3. Paket rilis ada di `dist/v1/` dengan `README.txt` berbahasa Indonesia.
