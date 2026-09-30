# Peta Dokumen

> Pemilik tiap topik dan urutan menyentuh dokumen saat ada perubahan.
> Konvensi vault: `C:\vault\AGENTS.md`. Aturan kerja agent: `AGENTS.md` repo.

Penanda punya dua rumah dokumen: **vault** (`C:\vault\01-Projects\Penanda\`) untuk produk dan keputusan yang dibaca user di Obsidian, dan **repo** untuk kode, tiket, serta aturan agent. Satu topik ditulis di satu berkas; berkas lain menunjuk.

Berkas vault ditulis tanpa folder (mis. `prd.md`); berkas repo memakai jalur relatif dari root repo. Daftar berkasnya tidak diulang di sini karena bisa dilihat langsung; isi dokumen ini adalah yang tidak terlihat dari folder, yaitu pemilik dan urutannya.

## 1. Pemilik topik

| Topik | Pemilik | Ikut tersentuh |
|---|---|---|
| Perilaku yang dilihat user: alur (bagian 5), zona layar (bagian 6), kriteria uji | `prd.md` | tiket yang mengerjakan perilaku itu |
| Bentuk field, batasan, validasi, contoh JSON | `prd-skema.md` | contoh JSON di `prd.md` bagian 4 |
| Endpoint, adapter penyimpanan, alur simpan, nama berkas pemulihan | `arsitektur.md` | - |
| Perintah build, versi tool, estimasi | `tech-stack.md` | - |
| Susunan zona, ukuran, keadaan layar | `wireframe.md` | - |
| Warna, huruf, radius, transisi | `design-tokens.md` | - |
| Keputusan dan alasannya | `decisions.md` | pemilik topiknya |
| Riwayat perubahan 1 baris | `changelog.md` | - |
| Catatan sesi | `session-log.md` | - |
| Kontrak kerja V1, invariant, prasyarat mesin | `.scratch/<slug>/spec.md` | tiket |
| Unit kerja yang bisa diverifikasi | `.scratch/<slug>/issues/NN-*.md` | - |

Note vault dibaca lewat Obsidian, jadi frontmatter, wikilink, dan tag mengikuti `C:\vault\AGENTS.md`. Repo tidak menyimpan salinan isi vault.

## 2. Urutan perubahan

Satu permintaan user sering menyentuh beberapa dokumen. Urutannya dari makna ke bentuk, ditutup dengan log:

1. **Keputusan** - ADR di `decisions.md` (Konteks, Keputusan, Alasan) begitu user menyetujui sebuah pilihan.
2. **Perilaku** - `prd.md` bagian 5 atau 6. Ini sumber makna; dokumen bentuk menunjuk ke sini.
3. **Data** - `prd-skema.md` bila field, batasan, atau contoh JSON berubah.
4. **Mekanisme** - `arsitektur.md` bila endpoint, alur simpan, atau pemulihan berubah.
5. **Bentuk** - `wireframe.md` untuk susunan layar, `design-tokens.md` untuk warna dan ukuran.
6. **Tiket** - selaraskan `.scratch/<slug>/issues/` supaya langkah dan verifikasinya cocok dengan perilaku baru. Tiket yang tidak sejalan menyesatkan pengerjanya.
7. **Log** - tutup dengan 1 baris `changelog.md` dan entri `session-log.md`; formatnya di `.agents/rules/vault-logging.md`.

## 3. Menambah tiket

1. Buat `.scratch/<slug>/issues/NN-slug.md` dengan nomor urut berikutnya; nomor tiket stabil dan tidak dipakai ulang.
2. Ikuti pola yang sudah ada: `Status:` dan `Blocked by:` di kepala, lalu `## Hasil yang diinginkan`, `## Langkah`, `## Verifikasi`.
3. Satu tiket = satu unit kerja yang bisa dikerjakan sendiri dan punya cara uji yang bisa dijalankan.
4. Tulis `Hasil yang diinginkan` dari sisi user (apa yang jadi bisa dilakukan); angka, nama berkas, dan pesan masuk `Langkah` atau `Verifikasi`.
5. Setiap angka dan pesan yang disebut tiket harus bisa ditelusuri ke `prd.md` atau `prd-skema.md`, sehingga tiket adalah turunan dokumen produk, bukan sumber baru.

## 4. Menutup celah spec

Celah adalah perilaku yang belum ditentukan tetapi akan memblokir tiket. Jalurnya:

1. Kumpulkan pertanyaan dalam bahasa sehari-hari, bukan istilah mesin, dan sertakan rekomendasi untuk tiap pertanyaan.
2. Tunggu user menyetujui atau mengubah. Selama belum sepaham, belum ada yang ditulis.
3. Setelah sepaham, kerjakan urutan bagian 2 sampai tuntas: ADR, pemilik topik, tiket, log.
4. Masukkan temuan sambil jalan (mis. tiket yang melewatkan elemen yang sudah ada di `wireframe.md`) ke penyerahan yang sama, supaya dokumen tidak menyimpang dari tiket.

## 5. Aturan tetap

- **Satu makna, satu tempat.** Sebelum menulis, cari kalimat yang sudah menyatakan hal itu; ubah di sana dan biarkan tempat lain menunjuk. Salinan kedua menjadi sumber penyimpangan.
- **Pointer menyebut kapan.** Rujukan antar-dokumen menyebut kondisi membukanya, mis. `pembukaan path lokal: arsitektur.md bagian 5`, bukan sekadar `lihat arsitektur`.
- **Nomor bagian PRD stabil.** Perilaku baru masuk sub-bagian yang sudah ada atau sub-bagian baru di akhir (5.8, 5.9, 5.10). Nomor lama tidak digeser karena `decisions.md` dan `changelog.md` menunjuk nomor itu.
- **Angka di sketsa adalah contoh.** Sketsa `wireframe.md` memakai tanggal dan angka karangan; nilai awal yang sebenarnya dinyatakan sebagai kalimat di dokumen pemiliknya.
- **Yang terlihat tidak diulang.** Varian yang bisa diketahui dengan membaca berkas atau menjalankan perintah (daftar berkas, skrip, struktur folder) tinggal di sana; dokumen mencatat konvensi yang tidak terlihat dan alasan di balik pilihan.
- **Bahasa.** Prosa Indonesia; istilah mesin (`items`, `GET /api/data`, `localStorage`) ditulis apa adanya.
