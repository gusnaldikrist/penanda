# Cara membangun Penanda V1 dari sumber

Paket rilis `dist/v1/` sudah berisi frontend dan `README.txt` untuk pengguna.
Satu berkas tidak ikut di-commit: `penanda.exe`, karena ukurannya 9,7 MB
dan merupakan artefak build.

## Untuk pengguna biasa

Unduh paket dari GitHub Releases. Jalur Lite tidak butuh berkas apa pun
selain `index.html`. Jalur Pro butuh `penanda.exe` yang sudah jadi.

## Untuk development

Butuh Go 1.22 atau lebih baru (https://go.dev/dl/) dan Node.js untuk test.

    # Bentuk binary penanda.exe ke dalam paket rilis
    go build -o dist/v1/penanda.exe ./src/pro

    # Jalankan server pengembangan tanpa membangun
    go run ./src/pro

    # Jalankan seluruh test
    node tests/storage-adapter.test.js
    node tests/status-bar.test.js
    node tests/search.test.js
    node tests/export-import.test.js
    node tests/foundations.test.js
    node tests/indeks.test.js
    node tests/log.test.js
    node tests/modal-crud.test.js
    node tests/storage.test.js
    node tests/terkait.test.js
    node tests/todo.test.js

    go test ./src/pro

## Isi paket rilis

| Berkas | Untuk siapa |
|---|---|
| `index.html` | semua |
| `app.js`, `search.js`, `storage-adapter.js`, `style.css` | semua |
| `data.example.json` | bahan latihan lewat Import JSON |
| `README.txt` | pengguna akhir |
| `penanda.exe` | hanya jalur Pro, hasil `go build` |

Jangan meng-commit `penanda.exe`. `.gitignore` sudah mengecualikannya,
begitu juga `data.json` dan `data-YYYYMMDD.json` milik pengguna yang
tidak boleh masuk repo.