# Zona Kartu Tag Dihapus, Pengatur Urutan Naik ke Indeks

Status: ready-for-agent
Sumber: menutup celah pada spec `panel-inspeksi-item` dan `tampilan-tabel-permanen` — keduanya menyatakan zona Kartu menyaring berdasarkan tag, tetapi tidak ada jalur mana pun yang mengisinya
Sumber kebenaran produk: `C:\vault\01-Projects\Penanda\prd.md`
Pendamping: `wireframe.md` di vault yang sama, untuk bentuk layar

> **Baca dulu sebelum memakai spec ini.** Spec ini menghapus satu zona layar
> beserta satu field skema, bukan menambah fitur. Yang tidak berubah: isi panel
> inspeksi, zona Harian, pencarian tiga lapis, aturan tag, validasi `sop`,
> endpoint, dan batasan tanpa CDN maupun framework.

## Problem Statement

Dokumen produk menyebut satu zona di layar Indeks yang belum pernah terlihat user
mana pun. Namanya Kartu: sebaris tombol berlabel tag dengan angka jumlah item di
di sebelahnya, yang kalau diklik menyaring hasil pencarian ke tag itu.

Zona itu tidak pernah muncul. Isinya dibaca dari satu field di berkas data,
`pinned_tags`, dan field itu tidak ditulis dari mana pun di aplikasi — tidak ada
tombol, tidak ada form, tidak ada nilai bawaan saat instalasi baru. Frontend punya
nilainya kosong sebagai keadaan awal, backend menjawab kosong ketika berkas data
belum ada, dan berkas contoh yang memuat tiga tag awal hanya dibaca pengujian,
tidak pernah dimuat aplikasi. Akibatnya di instalasi nyata, `pinned_tags` kosong
dan zona Kartu disembunyikan setiap kali dirender.

Yang lebih buruk, pengatur urutan hasil — pemilih antara "Terakhir Digunakan" dan
"A - Z" — diletakkan di dalam zona Kartu itu. Ia ikut hilang bersama zona. Jadi
dua hal mati karena satu sebab yang sama, danuser yang membaca dokumen produk
akan mengira dua fitur itu ada.

Dua spec sebelumnya sudah melewati titik ini dari arah lain: mode kartu dihapus
karena tidak terlihat, lalu kategori item dihapus karena kosa katanya terkunci di
kode. Yang tersisa di depan adalah satu zona yang isinya kosong dan satu
kontrol nyata yang ikut tertahan di dalamnya.

Pengguna yang bekerja sendirian di depan arsip tidak akan memperbarui daftar
tag besar itu sendiri. rattled daftar seperti itu adalah kejadian yang jarang,
dan menambahkannya berarti menambah kontrol, keadaan, validasi, serta pengujian
untuk sesuatu yang dipakai sekali seumur aplikasi.

## Solution

Zona Kartu dihapus seluruhnya, bukan disembunyikan. Field `pinned_tags` dibuang
dari skema data karena tidak ada yang mengisinya dan tidak ada lagi yang membacanya.

Pengatur urutan tidak ikut hilang. Ia pindah ke baris kendali Indeks, sebelah
kotak cari, dan tetap mengatur urutan tabel hasil. Label yang dipakai tidak lagi
menyebut "kartu" karena tidak lagi ada kartu.

State penyaring tag ikut dibuang beserta seluruh jalur yang memakainya, sehingga
tidak ada kode yatim yang tersisa setelah perubahan ini. Yang menggantikannya
sudah ada dan sudah kerjakan: mengetik tag di kotak cari sudah menyaring hasil ke
tag itu, karena lapis pertama pencarian cocok ke judul maupun tag.

Dengan ini Indeks punya satu bentuk layar: baris kendali dengan kotak cari dan
pengatur urutan, zona Harian, tabel hasil, panel inspeksi di kanan.

## User Stories

1. As a pustakawan, I want the Indeks screen to show me only controls that work, so that I don't waste time looking for a tag filter that was never there.
2. As a pustakawan, I want the Indeks screen to show me only controls that work, so that the screen matches what the product documentation promises.
3. As a pustakawan, I want the sort control to stay on screen, so that I can still switch between most-recent and alphabetical order.
4. As a pustakawan, I want the sort control to be near the search box, so that I find it where I already look for controls.
5. As a pustakawan, I want the sort control to be labelled in words that match what it does, so that a label mentioning cards no longer confuses me on a screen with no cards.
6. As a pustakawan, I want the Harian row to stay exactly as it is, so that removing the Kartu row does not disturb my daily shortcuts.
7. As a pustakawan, I want typing a tag into the search box to filter results by that tag, so that I can still narrow a long list by topic without a separate filter row.
8. As a pustakawan, I want the inspection panel on the right to stay exactly as it is, so that the cleanup does not remove the feature I just finished.
9. As a pustakawan, I want the result table to stay exactly as it is, so that the cleanup does not undo the single-table decision from the last spec.
10. As a pustakawan, I want a fresh installation to start on a screen with no empty row taking up space, so that the screen is not padded with a zone that would only show something else.
11. As a pustakawan, I want my existing data to keep working after the update, so that no item, tag, todo, or log is lost.
12. As a pustakawan, I want an exported data file from an older version to still import, so that a backup I already have is not rejected.
13. As a pustakawan, I want saving after the update to leave a clean data file, so that the removed field stops lingering on disk.
14. As a pustakawan, I want the sort choice to survive a re-render, so that switching to alphabetical does not reset when I type more keywords.
15. As a pustakawan, I want the sort choice to apply to the results I am looking at, so that the table I see is in the order I picked.
16. As a pustakawan, I want the result count and the panel's "no results" wording to behave the same whether or not a tag filter existed, so that the panel never explains something that did not happen.
17. As a pustakawan, I want the count of results to stay correct after the filter row is gone, so that the number above the table keeps meaning what it says.
18. As a pustakawan, I want the empty-result state to still be reachable by searching for something with no match, so that removing a filter path does not remove the explanation for an empty table.
19. As a pustakawan, I want the screen to load with no leftover keyboard shortcuts bound to a removed feature, so that a shortcut never triggers something invisible.
20. As a pustakawan, I want clicking outside the panel to clear the selection, so that the cleanup does not change the behaviour I already rely on.
21. As a pustakawan, I want the sort control to be reachable by keyboard, so that I do not have to reach for the mouse.
22. As a pustakawan, I want the sort control to announce itself to a screen reader, so that the control is not a nameless dropdown.
23. As a pustakawan, I want the Harian row and the sort control to line up on the same row height, so that the screen does not grow a stray control strip.
24. As a pustakawan, I want the sort control to keep its offline fonts and colours, so that no external font or CDN is introduced by moving it.
25. As a maintainer, I want the removed field gone from the data schema and from backend validation, so that the code does not carry a field nothing reads or writes.
26. As a maintainer, I want the backend to keep accepting an unknown field it does not recognise, so that files written by an older version still load.
27. As a maintainer, I want the backend's fresh-install payload to contain exactly the fields the app actually uses, so that the empty answer matches the schema.
28. As a maintainer, I want the frontend's import validation to require only the fields that still exist, so that import does not demand a field nobody writes.
29. As a maintainer, I want the shared example data file to match the schema, so that tests and documentation stop describing a field the app ignores.
30. As a maintainer, I want the filter-tag state and its four branches deleted rather than left dormant, so that no unreachable branch survives.
31. As a maintainer, I want the styles used only by the removed row deleted, so that dead CSS does not accumulate.
32. As a maintainer, I want the sort control's styles kept, so that moving the control does not strip its appearance.
33. As a maintainer, I want the stale comment about a grid/list mode switch removed along with its last remaining rule, so that comments do not describe a feature deleted in an earlier spec.
34. As a maintainer, I want a test that fails if the removed row ever comes back, so that the decision is enforced rather than remembered.
35. As a maintainer, I want a test proving the sort control still works when the data has no pinned field at all, so that the exact regression that hid the control cannot return unnoticed.
36. As a maintainer, I want a test proving the exported file's field list exactly matches the schema, so that a removed field cannot quietly reappear in exports.
37. As a maintainer, I want backend tests for the required field list in both directions, so that a missing required field is still rejected and the removed field is not demanded.
38. As a maintainer, I want mutation runs over the new assertions, so that the tests are proven to actually fail when the behaviour breaks.
39. As a maintainer, I want the decision and its reason recorded in the ADR log before code changes, so that a later reader knows the field was removed rather than forgotten.
40. As a maintainer, I want the product document, schema document, wireframe, changelog, session log, and project hub updated in that order, so that documents do not disagree with each other.
41. As a maintainer, I want the release bundle rebuilt and hash-verified after the frontend changes, so that the binary the user double-clicks serves the new screen.
42. As a maintainer, I want a commit per ticket with a conventional message, so that the two units of work stay separable.
43. As a maintainer, I want no commit or push without explicit permission, so that the repository history stays under the user's control.

## Implementation Decisions

- **Penghapusannyatotal, bukan conditional.** Zona Kartu, perendernya, handler
  kliknya, dan seluruh aturan gayanya dihapus dari kode. Menyembunyikan sebuah
  zona yang isinya kosong hanya memindahkan masalahnya.

- **Pengatur urutan pindah, bukan hilang.** Markup dan pendengarnya pindah ke baris
  kendali Indeks. Perilaku urutan tidak berubah sama sekali: keadaan urutan tetap
  punya dua nilai, dan penggantian nilai tetap memicu render ulang hasil.

- **Label aksesibilitas ditulis ulang.** Label yang menyebut kartu diganti menjadi
  kata yang describing apa yang diurutkan, bukan tata letak yang sudah tidak ada.

- **State penyaring tag dibuang seluruhnya.** Empat tempat memakainya ikut hilang:
  penyaringan hasil setelah pencarian, percabangan pemilihan sumber baris tabel,
  data yang dipakai panel untuk menghitung jumlah hasil dan deciding apakah ada
  kueri, serta pembatalan saringan ketika data diimpor. Percabangan yang tersisa
  setelahnya hanya bergantung pada isi kotak cari.

- **Perhatikan-tabrakan nama saat penghapusan.** Dua handler pintasan keyboard
  punya variabel lokal dengan nama yang sama seperti state yang dihapus, tapi
  isinya nama tag dari elemen yang sedang fokus, bukan filter tag. Keduanya tidak
  boleh ikut terhapus.

- **Field skema dibuang dari empat tempat.** Keadaan awal frontend, normalisasi
  data yang dibaca, daftar field wajib pada validasi import frontend, dan daftar
  field wajib pada validasi backend. Jawaban backend untuk instalasi baru ikut
  Adjustmentsodis erfolgreichen Schritt.

- **Field yang tidak dikenal tetap diterima.** Tidak ada penambahan aturan yang
  menolak field asing. Ini yang menjaga berkas lama tetap terbaca, dan disengaja:
backend adalah gerbang yang memeriksa bentuk yang harus dipenuhi, bukan
 menyaring segala hal yang tidak ada di daftar.

- **Pen-angleEndung data tidak divalidasi.** Backend menjawab isi berkas apa adanya
  tanpa memeriksa bentuk. Ini keadaan yang sudah ada sebelumnya dan tidak diubah
  spec ini; konsekuensinya berkas lama yang masih memuat field yang dibuang tetap
  terbaca dan tidak perlu langkah pemindahan.

- **Field yang dibuang hilang dari disk sendiri.** Normalisasi data hanya
  mempertahankan field yang masih dipakai, jadi berkas data pengguna bersih pada
  simpan berikutnya tanpa langkah migrasi manual.

- **Nomor versi skema tidak dinaikkan.** Menghapus field yang tidak pernah diisi
  user bukan perubahan mayor: berkas versi lama masih diterima dan masih dibaca.
  Menaikkan versi akan menolak berkas backup milik pengguna tanpa alasan.

- **Contoh data bersama ikut menyesuaikan** supaya tidak lagi mendeskripsikan field
  yang diabaikan aplikasi.

- **Gaya yang hanya dipakai baris yang dihapus ikut dibuang**, termasuk komentar
  yang menyebut pengatur mode tampilan yang sudah dihapus di spec sebelumnya.
  Gaya pengatur urutan tetap dipakai ulang oleh kontrol yang dipindahkan.

## Testing Decisions

- **Pengujian mengukur yang terlihat dari luar, bukan struktur internal.** Yang
  diperiksa adalah apa yang ada di DOM setelah render dan apa yang keluar dari
  file export, bukan apakah fungsi tertentu masih dipanggil.

- **Seam yang dipakai: environment pengujian DOM yang sudah ada.** Semua pengujian
  JavaScript berjalan lewat environment yang sama dengan data dari berkas contoh
  dan memberi akses ke elemen yang dirender. Tidak ada seam baru. Ini seam
  tertinggi yang tersedia: aplikasi tidak punya lapisan di atas render DOM.

- **Berkas contoh tetap dipakai sebagai masukan utama**, dengan satu perbedaan:
  field yang dibuang tidak lagi ada di dalamnya. Pengujian lama yang menyuntik
  field itu langsung ke data harus ditulis ulang supaya tetap menguji hal yang
  benar tanpa menghidupkan kembali field yang dihapus.

- **Berkas pengujian yang harus turun atau berubah.** Pengujian Indeks untuk
  susunan layar dan urutan, pengujian panel inspeksi untuk markup zona Kartu,
  pengujian ekspor-impor untuk daftar field berkas, pengujian item terkait dan
  pengujian `sop` untuk fixture yang menyuntik field tersebut, serta pengujian
  backend untuk daftar field wajib dan_field kosong.

- **Pengujian yang harus baru ada.** Baris Kartu tidak ada setelah render.
  Pengatur urutan ada dan masih bisa mengubah urutan baris ketika dipilih. Berkas
  export memuat tepat daftar field skema dan tidak memuat field yang dibuang.
  Backend masih menolak berkas tanpa field wajib. Backend tidak lagi menuntut
  field yang dibuang. Instalasi baru menjawab field yang ada saja.

- **Pengujian negatif yang menentukan nilai.** Yang paling penting adalah
  pengujian yang memastikan pengatur urutan tetap ada pada data yang sama sekali
  tidak punya field yang dibuang — itulah kondisi yang menyembunyikannya. Tanpa
  pengujian itu, penghapusan bisa tampak berhasil dan regresinya tetapbisu.

- **Pengujian Panel dan related tidak boleh asserting markup yang dihapus.** Kalau
  sebuah pengujian memverifikasi bahwa tombol switcher tidak ada, bentuk
  verifikasinya berubah menjadi memverifikasi bahwa zonanya sendiri tidak ada,
  bukan assertion yang dibiarkan tidak punya target.

- **Tradisi mutation testing dilanjutkan.** Pengujian baru dijalankan terhadap
  mutasi yang sengaja merusak perilaku, untuk memastikan pengujian benar-benar
  menangkap cacat. Pengujian yang lolos dari mutasi diperbaiki, bukan diterima.

- **Perintah verifikasi.** Pengujian JavaScript dijalankan per berkas dengan
  penjalan Node, karena repo tidak punya pelari pengujian pihak ketiga. Pengujian
  Go dijalankan dari root repo. Setelah semua lulus, jalankan perintah build
 -aggregate sinkronisasi paket rilis dan verifikasi hash-nya.

## Out of Scope

- **Penyaring tag baru.** Spec ini tidak menambah penyaring tag dengan bentuk apa
  pun. Menetik tag di kotak cari sudah menyaring ke tag itu dan itu yang dipakai.
- **Daftar tag otomatis.** Tidak adaruptions dari tag yang paling sering dipakai,
  dan tidak ada CONTROL untuk menyematkan atau melepas tag. Alasannya dinyatakan di
  atas: pengguna tunggal, daftar besar, kejadian jarang.
- **Panel inspeksi dan tabel hasil.** Keduanya hasil spec sebelumnya dan tidak
  tersentuh.
- **Pengurutan.** Tidak ada nilai urutan baru, tidak ada urutan ketiga, tidak ada
  pengurutan per kolom.
- **Mode kartu.** Sudah dihapus di spec sebelumnya dan tidak dikhxumuskan kembali.
- **Kategori item.** Sudah dihapus dan tidak dikembalikan.
- **Pengukuran ukuran berhasil.** Mengukur jumlah klik dan waktunya adalah
  pekerjaan manusia dan tetap terbuka; spec ini tidak mengukurnya.
- **Nomor versi skema dan migrasi data.** Tidak ada langkah pemindahan data untuk
  pengguna. Field yang dibuang hilang sendiri.

## Further Notes

- Spec ini adalah yang ketiga berturut-turut yang menghapus tampilan, bukan
  menambahkan. Arah itu disengaja dan konsisten: setiap penghapusan sucessi
  yang berasal dari fitur yang tidak terjangkau user, dan yang membuat dokumen
  produk menyatakan sesuatu yang tidak ada.

- Balasan backend untuk instalasi baru adalah satu-satunya tempat yang terlihat
  jelas sebagai "nilai awal". Setelah perubahan ini, nilai awal itu adalah nol
  item, nol todo, nol log. Nomor tag awal yang pernah disebut di dokumen skema
  hilang bersama fieldnya, dan tidak perlu ada gantinya karena tidak ada lagi
  yang membacanya.

- Bila suatu saat penyaring tag dibutuhkan lagi, tempat yang benar untuknya bukan
  mengembalikan field ini, melainkan menambahkannya sebagai sumber lain yang
  divalidasi. Itu keputusan terpisah dan di luar spec ini.

- Urutan perubahan dokumen mengikuti peta dokumen repo: keputusan di log
  keputusan lebih dulu, lalu perilaku di dokumen produk, lalu data di dokumen
  skema, lalu bentuk di wireframe, lalu tiket, ditutup log sesi dan changelog.
  Dokumen tidak boleh ditulis acak urutan.
