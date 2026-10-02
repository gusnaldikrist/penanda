# Cara membangun Penanda V1 dari sumber

Paket rilis `dist/v1/` sudah berisi frontend dan `README.txt` untuk pengguna.
Satu berkas tidak ikut di-commit: `penanda.exe`, karena ukurannya 9,7 MB
dan merupakan artefak build.

## Untuk pengguna biasa

Unduh paket dari GitHub Releases, ekstrak ke satu folder, lalu jalankan
`penanda.exe`. Tidak ada berkas lain yang perlu dipilih.

## Untuk development

Butuh Go 1.22 atau lebih baru (https://go.dev/dl/) dan Node.js untuk test.

### Build paket rilis

Gunakan `build.ps1` di root repo. Ini satu-satunya cara resmi menyinkronkan
`dist/v1/` dengan sumber:

    .\build.ps1

Yang dilakukan: membangun `penanda.exe`, menyalin 6 berkas frontend, lalu
memverifikasi hasilnya dengan hash SHA256. Tidak menambah dependency apa pun,
hanya PowerShell bawaan Windows dan Go.

Variabel yang tersedia:

| Perintah | Arti |
|---|---|
| `.\build.ps1` | Build `.exe` lalu salin frontend |
| `.\build.ps1 -CheckOnly` | Hanya cek sinkronisasi, tidak mengubah apa pun. Keluar dengan kode 1 kalau ada yang tertinggal |
| `.\build.ps1 -NoExe` | Lewati `go build`, tetap salin frontend. Untuk saat hanya CSS yang berubah |

### Kenapa harus pakai script, bukan copy manual

`penanda.exe` menyajikan frontend dari folder binary-nya sendiri (lihat
`binaryDir()` di `src/pro/main.go`). Jadi berkas yang benar-benar dilihat user
adalah `dist/v1/`, bukan `src/frontend/`. Kalau frontend berubah tapi salinan
lupa, perubahan itu tidak akan pernah terlihat sampaiorang lain yang
menyalinnya.

`-CheckOnly` berguna sebagai pemeriksaan sebelum commit:

    .\build.ps1 -CheckOnly
    if ($LASTEXITCODE -ne 0) { throw "dist/v1 belum sinkron, jalankan .\build.ps1" }
### Perintah lain yang sering dipakai

    # Jalankan server pengembangan tanpa membangun
    go run ./src/pro

    # Jalankan seluruh test
    Get-ChildItem -Path tests -Filter *.test.js | ForEach-Object { node $_.FullName }

    go test ./src/pro

## Isi paket rilis

| Berkas | Untuk siapa |
|---|---|
| `penanda.exe` | semua, hasil `go build` |
| `index.html` | disajikan penanda.exe ke browser |
| `app.js`, `search.js`, `storage-adapter.js`, `style.css` | disajikan penanda.exe |
| `data.example.json` | bahan latihan lewat Import JSON |
| `README.txt` | pengguna akhir |

Jangan meng-commit `penanda.exe`. `.gitignore` sudah mengecualikannya,
begitu juga `data.json` dan `data-YYYYMMDD.json` milik pengguna yang
tidak boleh masuk repo.
