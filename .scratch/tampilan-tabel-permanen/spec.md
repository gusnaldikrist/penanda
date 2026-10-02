# Tampilan Indeks Jadi Satu: Tabel Permanen

Status: ready-for-agent
Sumber: menggantikan bagian "Tabel masuk sebagai mode kedua" dari spec panel inspeksi item
Sumber kebenaran produk: `C:\vault\01-Projects\Penanda\prd.md`
Pendamping: `wireframe.md` di vault yang sama, untuk bentuk layar

> **Baca dulu sebelum memakai spec ini.** Spec ini menghapus satu tampilan yang baru
> saja selesai dikerjakan, bukan menambah fitur. Yang tidak berubah: isi panel
> inspeksi, skema data, validasi, endpoint, dan batasan tanpa CDN maupun framework.

## Problem Statement

Area hasil Indeks punya dua mode tampilan: mode kartu dan mode tabel. Mode kartu
adalah bawaan, jadi setiap kali aplikasi dibuka, yang tampil adalah grid yang
bentuknya sama persis dengan aplikasi sebelum empat tiket panel inspeksi dikerjakan.
Seluruh pekerjaan itu hanya muncul di mode tabel.

Praktisnya: fitur yang dikerjakan lewat empat tiket tidak kelihatan sampai
seseorang menekan tombol switcher. Setelah mencoba aplikasinya sendiri, pelapor
melaporkan "tampilannya masih belum berubah" — padahal kodenya sudah berubah dan
terpasang dengan benar.

Menghapus switcher juga membatalkan alasan kedua mode itu ada. Alasan mode kartu
adalah memindai banyak item. Kalau ia menjadi satu-satunya tampilan yang muncul
saat aplikasi dibuka, alasan mode tabel yaitu mengerjakan satu item justru
menjadi pilihan yang harus dicari-cari.

## Solution

Area hasil Indeks memakai satu tampilan saja: tabel. Mode kartu dihapus
seluruhnya, tombol switcher dihapus, dan panel inspeksi selalu ada di sebelah
kanan area hasil.

Zona Kartu di layar — baris filter tag dari tag yang disematkan — tetap ada dan
tidak berubah. Itu bukan mode tampilan, melainkan kendali penyaring. Yang hilang
hanya tata letak grid untuk hasil pencarian.

Tidak ada perubahan skema data, tidak ada perubahan endpoint, tidak ada perubahan
perilaku pencarian tiga lapis.

## Untuk siapa, dan ukurannya

Penggunanya satu pustakawan yang mengantar orang mencari akses dokumen. Ia
bekerja sendirian di depan arsip, sering berjam-jam, dan tahu dokumen mana yang
sering dibuka.

Ukuran berhasil dari spec sebelumnya tetap dipakai, dan spec ini tidak
mengukurnya ulang:

> Jumlah klik untuk membuka satu item turun dari dua jadi satu.

Perubahan spec ini justru membuat angka itu bisa diukur dengan jujur. Selama
mode tersembunyi masih ada, pengukuran bisa dilakukan pada orang yang sudah
tahu harus menekan tombolnya — dan itu bukan cara kerja pengguna sungguhan.

**Asumsi yang harus diuji dan belum terbukti:** panel mengambil 35 persen ruang
tabel, sehingga area pemindaian menyempit. Dugaannya, waktu dari mengetik kata
kunci sampai dokumen terbuka menjadi lebih singkat. Dugaan ini bisa salah sama
fatalnya — kalau area tabel terlalu sempit, jumlah klik bisa turun sementara
waktu naik. Pengukuran harus mencatat kedua angka, bukan hanya satu.

## Kenapa baru sekarang

Empat tiket sebelumnya mempertahankan mode kartu karena tujuannya berbeda dari
mode tabel. Alasan itu belum pernah diuji: tidak ada catatan yang mengukur kapan
orang benar-benar butuh memindai banyak item tanpa satu item yang sedang
dikerjakan. Bukti yang ada justru sebaliknya — mode bawaan tidak menampilkan
nilai dari pekerjaan yang baru selesai.

## User Stories

1. Sebagai pustakawan, saya ingin area hasil langsung tampil sebagai tabel saat
   aplikasi dibuka, sehingga tidak perlu menekan apa pun untuk sampai ke
   tampilan yang saya butuhkan setiap hari.
2. Sebagai pustakawan, saya ingin panel inspeksi selalu terlihat di sebelah
   kanan, sehingga konteks item selalu ada di samping daftar.
3. Sebagai pustakawan, saya ingin panel menampilkan keadaan kosong yang
   menyebutkan tujuannya saat belum ada baris dipilih, sehingga saya tahu panel
   itu bukan bagian yang gagal.
4. Sebagai pustakawan, saya ingin memilih satu baris dan langsung melihat tautan
   lengkap beserta tombol salinnya, sehingga tidak perlu membuka modal yang
   memutus alur kerja.
5. Sebagai pustakawan, saya ingin catatan tampil utuh di panel, sehingga saya
   tidak salah langkah karena teksnya terpotong.
6. Sebagai pustakawan, saya ingin langkah kerja tampil sebagai daftar bernomor,
   sehingga urutannya jelas tanpa membacanya dua kali.
7. Sebagai pustakawan, saya ingin melihat semua tag item termasuk yang belum
   disematkan, sehingga saya tidak membuat tag duplikat.
8. Sebagai pustakawan, saya ingin item terkait tetap ada, sekarang di dalam
   panel, sehingga konteks tidak lagi jauh di bawah daftar.
9. Sebagai pustakawan, saya ingin satu tombol ubah di panel, sehingga mengubah
   satu catatan tidak menuntut lima langkah.
10. Sebagai pustakawan, saya ingin kolom URL hilang duluan saat layar sempit,
    karena URL-nya sudah tampil utuh di panel beserta tombol salin.
11. Sebagai pustakawan, saya ingin kolom tag hilang setelah itu, dan catatan
    paling akhir, karena catatan adalah pembeda utama antara item yang namanya
    mirip.
12. Sebagai pustakawan, saya ingin kolom judul dan aksi selalu terlihat, sehingga
    nama item dan tombol tindakannya tidak pernah hilang.
13. Sebagai pustakawan, saya ingin baris terpilih ditandai secara visual dan
    lewat atribut yang bisa dibaca teknologi bantu, sehingga saya tahu item mana
    yang sedang saya baca.
14. Sebagai pustakawan, saya ingin mengetik kata kunci dan panel tetap isi selama
    item yang dipilih masih cocok, sehingga konteks tidak hilang saat saya
    mempersempit daftar.
15. Sebagai pustakawan, saya ingin panel menyebut alasannya bila item yang saya
    pilih tidak lagi ada di hasil pencarian, sehingga saya tidak mengira
    aplikasinya salah.
16. Sebagai pustakawan, saya ingin memilih baris lain mengganti isi panel, dan
    memilih lagi mengisinya kembali, sehingga panel selalu soal item yang sedang
    saya baca.
17. Sebagai pustakawan, saya ingin menggulir tabel tanpa kehilangan isi panel,
    sehingga konteks tidak hilang di tengah jalan.
18. Sebagai pustakawan, saya ingin zona kartu sebagai filter tag tetap bekerja
    seperti sebelumnya, sehingga penyaringan berdasar tag tidak ikut hilang.
19. Sebagai pustakawan, saya ingin urutan Terakhir Digunakan dan A-Z tetap
    bekerja, sehingga pengurutan tidak ikut hilang bersama mode tampilan.
20. Sebagai pustakawan, saya ingin zona harian tetap bekerja, sehingga pintasan
    ke dokumen harian tidak ikut berubah.
21. Sebagai pustakawan, saya ingin tidak ada tombol untuk pilihan yang sudah
    tidak ada lagi, sehingga tidak ada tombol yang tidak melakukan apa-apa.
22. Sebagai pustakawan, saya ingin tampilan tetap terbaca di layar kecil,
    sehingga aplikasi tetap bisa dipakai di luar kantor.
23. Sebagai pustakawan, saya ingin tidak ada pilihan tampilan yang perlu diingat,
    sehingga tidak ada satu langkah ekstra di jalur utama.
24. Sebagai pustakawan, saya ingin panel tetap bisa difokuskan tanpa membuka
    modal, sehingga memeriksa satu item tidak memutus alur kerja saya.

## Implementation Decisions

**Satu tampilan, bukan mode yang disembunyikan.** Mode kartu dihapus, bukan
disembunyikan di balik fitur lain. Alasannya aturan proyek: jangan menulis
kelembutan untuk hal yang tak mungkin terjadi. Menyimpan penanda mode sebagai
nilai yang selalu satu hanya menambah cabang yang tidak pernah dievaluasi.

**Zona Kartu bukan mode tampilan.** Baris filter tag dari tag yang disematkan
tetap ada. Keduanya sama-sama memakai kata "kartu" dalam bahasa sehari-hari, jadi
perubahan ini tidak boleh menyentuhnya. Risiko salah baca di sini nyata: menghapus
"kartu" yang salah akan menghapus kemampuan penyaringan tag.

**Tombol switcher dihapus beserta ikonnya.** Setelah tidak ada mode kedua, ikon
grid maupun tabel tidak lagi punya pemakai di mana pun.

**Enam titik penanganan mode jadi satu.** Penanda mode dibaca di enam tempat:
menata area hasil, menyalakan wadah split, menentukan kelas area hasil, memilih
perender baris, membangun wadah split, dan tombol switcher. Setelah penghapusan,
enamnya hilang atau berubah menjadi konstan.

**Panel tidak lagi punya syarat mode.** Dulu panel hanya dirender bila mode
tabel aktif. Sekarang tidak ada syaratnya, jadi keadaan kosong panel pun tidak
perlu dibedakan berdasarkan mode.

**Layar sempit: panel tetap 35 persen.** Tidak ada tampilan cadangan lagi, jadi
mempertahankan pembagian 65/35 dan mengandalkan urutan pemangkasan yang sudah
ditetapkan. Panel menutup di bawah lebar tertentu ditolak dengan alasan:
menyembunyikan konteks persis di perangkat yang paling sering dipakai di luar
kantor, sedangkan pemangkasan kolom sudah menurunkan tabel secara bertahap
sampai ke judul dan aksi yang selalu tampil.

**Gaya mode kartu dibuang seluruhnya.** Aturan gaya khusus grid kehilangan
pemakai. Kelas yang hilang: tata letak grid, kartu hasil, dan seluruh
bagian di dalamnya — judul, kategori, catatan, footer, aksi — plus gaya
tombol switcher dan zona item terkait di bawah daftar.

Satu koreksi terhadap draf spec ini: gaya kartu placeholder sempat dianggap
sudah mati karena tidak dirender oleh logika. Itu keliru. Placeholder itu
dipakai di halaman dasar sebagai isi awal sebelum logika merender, jadi
gayahnya masih hidup dan aturannya di pengujian bentuk gaya juga tetap
berlaku. Jangan ikut dihapus.

**Dokumen produk disinkronkan sesuai urutan peta dokumen.** Urutannya: keputusan,
perilaku, bentuk, lalu log. Dua pernyataan di PRD yang sekarang tidak berlaku
lagi — area hasil punya dua mode, dan zona terkait adalah baris di bawah
daftar — keduanya harus ditulis ulang.

## Testing Decisions

**Seam: harness yang sudah ada, tidak tambah baru.** Berkas pengujian panel
inspeksi sudah punya harness sandbox yang memuat logika aplikasi ke lingkungan
uji. Semua pengujian perubahan ini memakai seam itu. Seam baru hanya menambah
tempat yang bisa salah.

**Yang diuji hanya perilaku yang terlihat.** Tidak ada pengujian yang memeriksa
nilai internal state atau nama kelas. Yang diperiksa: elemen apa yang muncul,
kalimat apa yang tertulis, dan kolom mana yang hilang pada lebar berapa.

**Sembilan pengujian dihapus, bukan ditulis ulang.** Sembilan pengujian
memeriksa keberadaan mode kedua: lima tentang switcher dan mode kartu, satu
tentang wadah split yang hanya aktif di mode tabel, satu tentang keadaan
kosong panel yang hanya berlaku di mode tabel, dan dua tentang apa yang
berlangsung saat mode beralih. Semuanya harus hilang, karena mode itu memang
tidak ada lagi. Mempertahankannya dengan bentuk lain hanya akan menguji
kebohongan.

**Satu helper di harness dibuang.** Helper untuk beralih mode dipakai enam
belas kali. Setelah mode tidak ada lagi, helper itu jadi tidak ada gunanya dan
seluruh pemakaiannya dihapus. Tiga pengujian di berkas pengujian langkah kerja
menyetel mode secara langsung dan perlu dibersihkan.

**Berkas pengujian item terkait harus dimigrasikan, bukan dibiarkan atau
dihapus.** Ini penghalang terbesar dari perubahan ini, dan klaim awal bahwa
berkasnya aman hanya karena menyebut kata "kartu" ternyata salah. Tiga skenario
menguji zona terkait di bawah daftar dan semuanya gagal begitu mode kartu
hilang: memunculkan item terkait tanpa dirinya sendiri, tombol aksi tidak
memicu fokus, dan Esc serta klik luar menutup.

Sembilan assertion di dalamnya dipindahkan, bukan dihapus. Yang berubah bukan
logikanya melainkan tempat isinya berada.

Migrasi: assertion yang memeriksa isi zona terkait diarahkan ke panel
inspeksi, dengan panel sebagai satu-satunya rumah item terkait. Mekanismenya
sama — cari elemen, klik baris, periksa isi. Yang berubah hanya tempat isinya
berada. Kalau assertion-nya dihapus saja, tiga skenario ikut hilang tanpa
pengganti.

Zona terkait sebagai elemen di bawah daftar ikut hilang, karena panel
sekarang menjadi satu-satunya rumah item terkait. Menyisakannya sebagai
wadah mati hanya menambah tempat yang bisa salah.

**"Tersembunyi" berubah makna, dan itu harus dicatat.** Dulu panel kosong
berarti disembunyikan dari layar, dan assertion-nya memeriksa properti
tampil. Sekarang panel selalu tampil — itu justru inti perubahan ini — dan yang
berubah adalah isinya. Panel menampilkan keadaan kosong yang menjelaskan
tujuannya, atau berisi item terpilih. Jadi sembilan assertion "tidak tampil"
tidak bisa diterjemahkan jadi "tidak tampil" yang lain; mereka harus
memeriksa isi, bukan visibilitas.

Dua pengujian juga mengekstrak judul item dari markup kartu, dan keduanya ikut
pindah: kartu memakai pengenal kelas sendiri, sedangkan sel judul tabel
memuat dua lencana di dalam satu sel — lencana kategori dan lencana penanda
pencarian. Mengambil teks sel itu harus memisahkan keduanya, kalau tidak
judul ikut membawa badge dan pengujian urutan ikut gagal.

**Berkas pengujian ekspor-impor tidak boleh pecah.** Berkas itu menyebut
kartu hanya dalam konteks zona filter tag, yaitu klik kartu tag, dan tidak
pernah menyentuh mode tampilan. Nilainya sebagai penjaga tetap berlaku: kalau
ada yang keliru menghapus zona kartu, pengujian itu ikut gagal. Karena itu
berkas itu tidak boleh ikut disunting.

**Pengujian bentuk gaya tidak boleh disunting.** Berkas itu punya satu aturan
yang mengikat gaya kartu placeholder. Gaya placeholder bukan sisa mode
kartu: ia dipakai di halaman dasar sebagai isi awal sebelum logika merender.
Aturan itu tetap berlaku dan berkasnya tidak boleh ikut disunting.

**Tiga pengujian baru, untuk mengunci perilaku yang baru.** Pengujian lama
hanya bisa memeriksa mode kedua, jadi begitu mode itu dihapus tidak ada yang
menjaga perilaku penggantinya. Yang perlu dijaga: area hasil berupa tabel
sejak aplikasi dibuka tanpa ada langkah tambahan, tidak ada tombol switcher di
markup mana pun, dan wadah split serta panel sudah aktif sejak awal. Ketiganya
harus gagal kalau salah satu bagian itu dimatikan.

**Uji mutasi wajib dijalankan, dan hasilnya dicatat.** Perubahan ini menghapus
cabang, dan menghapus cabang tidak pernah membuat pengujian gagal. Kalau mode
kartu dihapus tanpa pengujian yang menggigit, tidak ada yang memberi tahu.
Sembilan mutasi dijalankan dan sembilan digigit.
pengujiannya benar-benar gagal.

## Out of Scope

- Mengubah isi panel. Konteks lengkap, keadaan kosong, tombol ubah, langkah
  kerja, dan urutan pemangkasan semuanya sudah selesai dan tidak berubah.
- Mengubah skema data. Tidak ada kolom data baru, tidak ada kolom data yang
  dihapus.
- Mengubah perilaku pencarian tiga lapis, termasuk cara langkah kerja ikut
  dicari.
- Panel yang menutup sendiri di layar sangat sempit, dan apa pun yang terkait
  dengan perilaku di bawah 768 piksel; PRD sudah menaruhnya di luar lingkup V1.
- Navigasi panah untuk berpindah item, dan penandaan item yang belum diisi
  langkah kerja. Keduanya sudah ditolak saat spec ditulis dan alasannya masih
  berlaku.
- Menyimpan pilihan tampilan milik pengguna di berkas data. Tidak ada yang perlu
  disimpan kalau tidak ada pilihan.
- Mengukur ulang ukuran berhasil dari spec sebelumnya. Itu pengukuran di satu
  staf, bukan bagian dari perubahan ini.

## Further Notes

**Perubahan ini menghapus pekerjaan, bukan menambahnya.** Itu tidak sendirinya
alasan yang buruk. Alasan yang buruk adalah mempertahankan dua tampilan dengan
alasan yang belum pernah diuji. Kalau pengukuran nanti membuktikan bahwa
memindai banyak item memang benar-benar sering dibutuhkan, mode itu bisa
dikembalikan dengan bukti, bukan dengan asumsi.

**Verifikasi tambahan di beberapa lebar layar.** Panel sekarang selalu ada,
sehingga pemangkasan kolom yang sebelumnya hanya terjadi sesekali akan terjadi
lebih sering. Perlu dicek secara visual apakah lencana yang lebih sempit masih
terbaca sebagai lencana, bukan teks biasa.

**Peringatan proses yang berlaku untuk sesi berikutnya.** Repo dan vault
sama-sama campur akhir baris, dan beberapa skrip penyuntingan mengabaikannya
sampai menyalin blok beribu baris. Apa pun yang menyunting berkas di dua tempat
itu perlu menormalkan akhir baris sebelum mencari pola.
