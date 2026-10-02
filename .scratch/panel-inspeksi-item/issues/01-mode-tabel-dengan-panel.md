# 01: Tabel sebagai mode kedua, panel menerima "biasanya bareng ini"

**What to build:** Ketika pengguna beralih ke mode tabel, area hasil berubah dari kartu grid menjadi tabel, dan layar terbagi dua: area tabel di kiri, panel di kanan. Panel menerima isi yang sebelumnya tampil di bawah tabel, yaitu item-item yang biasanya bareng dengan item yang dipilih. Konteks itu kini tampil berdampingan dengan daftar, bukan jauh di bawahnya.

Dua mode itu punya tujuan berbeda, bukan sekadar dua tampilan. Mode kartu untuk memindai banyak item dan karena itu memakai lebar penuh tanpa panel. Mode tabel untuk mengerjakan satu item dan karena itu membuka panel di sampingnya.

**Blocked by:** None (can start immediately)

**Status:** done (2026-10-02)

- [x] Switcher tampilan punya dua mode: kartu dan tabel
- [x] Beralih ke mode tabel mengubah area kiri menjadi tabel dengan header kolom
- [x] Layar terbagi dua: area tabel lebih lebar, panel lebih sempit
- [x] Panel menampilkan "biasanya bareng ini" untuk item yang sedang dipilih
- [x] Baris "biasanya bareng ini" tidak lagi tampil di bawah tabel
- [x] Mode kartu tetap bekerja seperti sebelumnya dan tidak menampilkan panel
- [x] Beralih mode mempertahankan hasil pencarian dan item yang sedang dipilih
- [x] Memilih baris tabel mengisi panel dengan item terkaitnya
- [x] Menghapus fokus melepas isi panel

## Catatan implementasi

Tiga cacat ditemukan karena menyingkap tiga hal yang tidak terlihat dari tes:

1. Handler pemilihan baris hanya mengenali `.result-item`. Baris tabel memakai
   kelas `.baris-tabel`, jadi tanpa pencarian tambahan baris tabel tidak bisa
   dipilih sama sekali.
2. Handler global yang menghapus fokus saat klik di luar juga hanya mengenali
   `.result-item`. Begitu baris tabel menjadi target klik, fokus langsung
   terhapus setelah baris itu terpilih, jadi panel selalu kosong.
3. Cacat yang sama muncul pada tombol switcher: handler `zone-kartu` membangun
   ulang `innerHTML` lebih dulu, sehingga tombol yang diklik sudah terlepas dari
   dokumen saat event naik ke `document`, dan `closest` pada node lepas selalu
   `null`. Memindahkan handler global ke fase capture membuat penilaian
   "klik luar atau bukan" terjadi sebelum ada yang membangun ulang DOM.

Harness di `tests/panel-inspeksi.test.js` awalnya tidak menjalankan listener di
`document`, sehingga cacat 2 dan 3 lolos dari 11 test yang semuanya hijau.
Listener document kini ikut jalan dan pengujian memilih baris memakai elemen
baris sungguhan.

Kolom ketiga diberi label CATATAN, bukan SOP RINGKAS, karena isinya `catatan`.
Label itu akan bertabrakan dengan field `sop` di tiket 04.

`tests/indeks.test.js` dapat tambahan `classList.add`, `remove`, dan `contains`
di harness-nya. Selector tunggal tidak berubah.