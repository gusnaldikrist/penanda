# 10 - Jalur Pro: server Go dan endpoint data

Status: ready-for-agent
Blocked by: 02
Type: task

## Hasil yang diinginkan

Satu binary Go tanpa dependency luar yang menyajikan frontend dan menyimpan data ke `data.json` di folder tempat binary itu berada, lengkap dengan salinan harian.

## Prasyarat

Go 1.22+ belum terpasang di mesin pengembang (periksa dengan `go version`). Instal lebih dulu sebelum mengerjakan tiket ini.

## Langkah

1. `src/pro/go.mod` dan `src/pro/main.go`, hanya memakai `net/http`, `encoding/json`, `os`, `os/exec`, `path/filepath`.
2. Sajikan berkas frontend dari folder tempat binary berada (`os.Executable()` lalu `http.FileServer` atas folder itu), supaya paket rilis cukup disalin apa adanya.
3. `GET /api/data`: kirim seluruh isi `data.json`. Bila berkas belum ada, jawab bentuk kosong berisi `version` 1 dengan status 200, karena itu keadaan instalasi baru; status 500 hanya bila berkas ada tetapi gagal dibaca.
4. `POST /api/data`: validasi JSON, tolak dengan 400 bila tidak sah atau `version` tidak dikenal tanpa mengubah berkas lama, lalu tulis ke berkas sementara dan ganti `data.json` dengan berkas itu, lalu tulis salinan `data-YYYYMMDD.json` (hari yang sama ditulis ulang), lalu jawab 200.
5. Port tetap 8080; bila port sedang dipakai, cetak pesan dan keluar tanpa mencoba port lain.
6. Cetak alamat yang harus dibuka saat server siap, lalu buka browser.

## Verifikasi

- `go run ./src/pro`, buka `localhost:8080`: halaman frontend tampil.
- Simpan satu perubahan: `data.json` dan `data-YYYYMMDD.json` terbentuk di folder yang sama.
- Kirim `POST /api/data` berisi JSON rusak: jawaban 400 dan isi `data.json` tidak berubah.
- Hentikan paksa proses saat menyimpan: `data.json` tetap utuh, tidak setengah tertulis.
