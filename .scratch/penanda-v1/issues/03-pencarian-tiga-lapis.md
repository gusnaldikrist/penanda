# 03 - Pencarian tiga lapis sebagai fungsi murni

Status: resolved
Blocked by: -
Type: task

## Hasil yang diinginkan

Satu fungsi tanpa DOM, `searchItems(items, kataKunci)`, yang mengembalikan hasil terurut beserta lapisnya, sehingga dapat diuji dengan `node` dari terminal tanpa membuka halaman.

## Aturan lapis

1. Lapis 1: `title` atau `tags` memuat kata kunci.
2. Lapis 2: berbagi minimal satu tag dengan hasil lapis 1, dipakai untuk memunculkan item yang satu lingkup kerja.
3. Lapis 3: `catatan` memuat kata kunci, diberi penanda `dari catatan`.
4. Kata kunci kosong: kembalikan `items` urut `updated_at` menurun tanpa penanda lapis.
5. Pencocokan tidak peduli huruf besar-kecil dan spasi di ujung atau berlebih dirapikan lebih dulu; beberapa kata diperlakukan sebagai satu rangkaian berurutan, jadi `sheet admin` cocok pada "Sheet Admin TA" tetapi tidak pada "Sheet biaya admin"; item yang sudah masuk lapis sebelumnya tidak diulang.
6. Jumlah hasil tidak dipotong di sini; pembatasan 10 item hanya berlaku saat kata kunci kosong, dan itu urusan tiket 04.

## Langkah

1. `src/lite/search.js`: fungsi murni, ditutup pengekspor bersyarat `if (typeof module !== "undefined") module.exports = {...}` supaya bisa dipanggil node tanpa build step.
2. `tests/search.test.js`: tanpa kerangka uji pihak ketiga; cetak tiap kasus, keluar dengan kode 1 bila ada yang gagal.
3. Kasus uji memakai 4 data dummy `prd-skema.md` bagian 6: `wisuda`, `ta`, `slims`, `magang`, `sheet`, dan kata kunci kosong.

## Verifikasi

- [x] `node tests/search.test.js` lulus (15 kasus uji lulus 100%).
- [x] Kata kunci `slims`: hanya SLiMS Bulian di lapis 1.
- [x] Kata kunci `sheet admin`: cocok pada Sheet Admin TA; `admin sheet` tidak cocok.
- [x] Kata kunci kosong: 4 item urut `updated_at` menurun, tanpa penanda lapis.
