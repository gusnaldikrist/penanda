# 03: Panel punya keadaan kosong, pintasan ubah, dan bertahan saat tabel bergulir

**What to build:** Panel tidak pernah hilang tanpa penjelasan, punya jalan pintas ke modal ubah, dan isinya tidak hilang karena layar diperbarui.

Tiga hal ini satu tiket karena satu sebab: ketiganya adalah kalem-kelem panel yang belum selesai. Kalau hanya satu yang dikerjakan, panel akan terlihat benar tapi belum bisa diandalkan untuk dipakai berjam-jam.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Panel menampilkan kalimat "Pilih salah satu baris untuk melihat detailnya" ketika tidak ada item dipilih
- [ ] Keadaan kosong itu juga menyebutkan berapa hasil pencarian, supaya area kosong tetap informatif
- [ ] Panel punya tombol ubah yang membuka modal yang sama seperti tombol ubah di baris
- [ ] Tombol ubah di panel bukan jalur edit kedua: isinya lewat modal CRUD yang sama
- [ ] Menggulir tabel tidak mengosongkan panel selama item terpilih masih ada di hasil
- [ ] Mengetik di kotak pencarian tidak mengosongkan panel selama item terpilih masih cocok dengan hasil
- [ ] Memilih baris lain mengganti isi panel ke item yang baru dipilih
- [ ] Memilih baris lagi mengisi panel kembali dengan data yang benar
- [ ] Kalau item terpilih hilang dari hasil, panel mengosongkan diri dengan menyebutkan alasannya, bukan keadaan kosong generik
- [ ] Keadaan kosong hanya muncul karena satu sebab, dan pengujian memeriksa kalimatnya muncul, bukan hanya elemennya ada