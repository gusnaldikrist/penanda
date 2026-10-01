# Cara membangun Penanda V1 dari sumber

Paket rilis `dist/v1/` sudah berisi frontend dan `README.txt` untuk pengguna.
Satu berkas tidak ikut di-commit: `penanda.exe`, karena ukurannya 9,7 MB
dan merupakan artefak build.

## Untuk pengguna biasa

Unduh paket dari GitHub Releases, ekstrak ke satu folder, lalu jalankan
`penanda.exe`. Tidak ada berkas lain yang perlu dipilih.

## Untuk development

Butuh Go 1.22 atau lebih baru (https://go.dev/dl/) dan Node.js untuk test.

    # Bentuk binary penanda.exe ke dalam paket rilis
    go build -o dist/v1/penanda.exe ./src/pro

    # Salin frontend ke paket rilis (frontend ada di src/frontend/)
    copy src/frontend/app.js              dist/v1/app.js
    copy src/frontend/index.html          dist/v1/index.html
    copy src/frontend/search.js           dist/v1/search.js
    copy src/frontend/storage-adapter.js  dist/v1/storage-adapter.js
    copy src/frontend/style.css           dist/v1/style.css
    copy src/shared/data.example.json     dist/v1/data.example.json

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
