# 06 - Modal tambah, ubah, dan hapus item

Status: resolved
Blocked by: 02, 04
Type: task

## Hasil yang diinginkan

Item bisa ditambah, diubah, dan dihapus tanpa berpindah halaman, dengan tombol Tambah di kanan kotak pencarian seperti pada `wireframe.md`.

## Langkah

1. Modal lebar 640 px, terpusat, latar belakang gelap tipis dan tidak bisa diklik; isi modal menyesuaikan objek yang sedang diubah.
2. Field item: Judul, Tag (dipisah koma), Link (pasangan label dan url, bisa lebih dari satu), Catatan.
3. `id` dibuat otomatis dari `title`: huruf kecil, spasi jadi tanda hubung, karakter lain dibuang; bila slug sudah terpakai tambahkan angka urut.
4. Validasi mengikuti `prd-skema.md` bagian 5; tombol Simpan tidak aktif selama nilai wajib belum lengkap, dan ditolak: judul kosong, tanpa tag, tanpa link, tag berspasi atau berhuruf besar, tanggal di luar format.
5. Tag yang baru diketik dipaksa huruf kecil dan tanpa spasi; tag bermakna sama tidak dijadikan item baru melainkan dipasang pada item yang sama.
6. Simpan memperbarui `updated_at` ke tanggal hari ini dan langsung menyimpan ke penyimpanan Lite.
7. Hapus menuntut judul item diketik persis, dengan huruf besar-kecil diabaikan, sebagai konfirmasi; setelah item dihapus, `item_id` pada todo dan log yang menunjuk item itu menjadi null dan entrinya tetap ada.

## Verifikasi

- [x] Tambah item baru dari klik Tambah sampai Simpan: di bawah 30 detik.
- [x] Dua item dengan judul sama: yang kedua mendapat `id` berakhiran angka, bukan menimpa yang pertama.
- [x] Coba simpan tag `TA ` atau tag berspasi: ditolak dengan pesan jelas.
- [x] Hapus Sheet Admin TA: entri todo dan log tetap tampil dengan penanda tanpa tautan.
- [x] Konfirmasi hapus diisi judul yang salah: tombol hapus tidak berjalan; setelah judul benar, item benar-benar hilang.
