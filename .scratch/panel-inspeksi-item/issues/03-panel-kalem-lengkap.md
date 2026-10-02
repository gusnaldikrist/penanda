# 03: Panel punya keadaan kosong, pintasan ubah, dan bertahan saat tabel bergulir

**What to build:** Panel tidak pernah hilang tanpa penjelasan, punya jalan pintas ke modal ubah, dan isinya tidak hilang karena layar diperbarui.

Tiga hal ini satu tiket karena satu sebab: ketiganya adalah kalem-kelem panel yang belum selesai. Kalau hanya satu yang dikerjakan, panel akan terlihat benar tapi belum bisa diandalkan untuk dipakai berjam-jam.

**Blocked by:** 02

**Status:** done (2026-10-02)

- [x] Panel menampilkan kalimat "Pilih salah satu baris untuk melihat detailnya" ketika tidak ada item dipilih
- [x] Keadaan kosong itu juga menyebutkan berapa hasil pencarian, supaya area kosong tetap informatif
- [x] Panel punya tombol ubah yang membuka modal yang sama seperti tombol ubah di baris
- [x] Tombol ubah di panel bukan jalur edit kedua: isinya lewat modal CRUD yang sama
- [x] Menggulir tabel tidak mengosongkan panel selama item terpilih masih ada di hasil
- [x] Mengetik di kotak pencarian tidak mengosongkan panel selama item terpilih masih cocok dengan hasil
- [x] Memilih baris lain mengganti isi panel ke item yang baru dipilih
- [x] Memilih baris lagi mengisi panel kembali dengan data yang benar
- [x] Kalau item terpilih hilang dari hasil, panel mengosongkan diri dengan menyebutkan alasannya, bukan keadaan kosong generik
- [x] Keadaan kosong hanya muncul karena satu sebab, dan pengujian memeriksa kalimatnya muncul, bukan hanya elemennya ada

## Catatan implementasi

Panel punya dua keadaan kosong yang berbeda sebabnya, jadi kalimatnya juga
berbeda. Tanpa item terpilih berbunyi "Pilih salah satu baris untuk melihat
detailnya" beserta jumlah item. Item terpilih yang tidak lagi ada di hasil
pencarian berbunyi "Item ini tidak lagi ada di hasil pencarian" beserta jumlah
hasil. Menyamakan keduanya akan menutupi dua kejadian yang tidak sama.

Bentuk panel kosong tidak bisa dibaca dari `state.focusedItemId`, karena nilai
itu sudah null justru pada kasus yang perlu dijelaskan: item yang hilang dari
hasil sudah dilepas fokusnya sebelum render. Jadi alasannya dicatat terpisah
sebagai flag lalu diteruskan ke render.

Mengetik di kotak pencarian tidak lagi menghapus fokus. Sebelumnya setiap
ketikan menghapus `focusedItemId` secara paksa, sehingga panel ikut kosong
walaupun item terpilih masih cocok. `updateIndeksResults` sudah membersihkan
fokus sendiri kalau itemnya benar-benar tidak ada lagi di hasil, jadi
pembersihan di listener jadi berduplikat dan lebih kasar.

Satu test tiket 01 ikut berubah: "panel kosong" dulu berarti string kosong,
sekarang berarti menampilkan keadaan kosong. Assertion-nya diubah dari
`innerHTML === ''` menjadi memeriksa `panel-kosong` ada.

Harness test dapat tambahan: elemen yang ditempel ke `document.body` dicatat,
dan `querySelector('.modal-overlay')` sekarang mencarinya di sana. Tanpa itu,
test tidak bisa membuktikan tombol ubah di panel membuka modal item yang sama
karena `appendChild` sebelumnya tidak berpengaruh apa pun.