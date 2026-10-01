package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// Aturan "path lokal" dulu ditulis dua kali dalam dua bahasa:
// isLocalPath di storage-adapter.js (JavaScript) dan isAllowedLocalPath di
// main.go (Go). Keduanya sudah berbeda tiga dari sembilan masukan.
//
// Go adalah gerbang: kalau backend menolak, tombol Buka mati. Karena itu
// src/shared/local-path-cases.json jadi satu sumber kebenaran, dan kedua test
// membacanya. Menambah kasus di sana membuat kedua bahasa ikut menguji.
//
// Test Go ada di berkas ini; test JavaScript ada di
// tests/local-path-cases.test.js dan membaca berkas yang sama.

type kasusPathLokal struct {
	Masukan string `json:"masukan"`
	Harapan bool   `json:"harapan"`
	Alasan  string `json:"alasan"`
}

type berkasKasusPathLokal struct {
	Kasus []kasusPathLokal `json:"kasus"`
}

// loadLocalPathCases membaca sumber kebenaran aturan path lokal.
//
// Path dibaca relatif ke folder repo, bukan ke folder test, supaya test tetap
// jalan dari root maupun dari src/pro.
func loadLocalPathCases(t *testing.T) []kasusPathLokal {
	t.Helper()

	candidates := []string{
		filepath.Join("..", "..", "src", "shared", "local-path-cases.json"),
		filepath.Join("..", "src", "shared", "local-path-cases.json"),
	}

	var raw []byte
	var err error
	for _, candidate := range candidates {

		raw, err = os.ReadFile(candidate)
		if err == nil {
			break
		}
	}
	if err != nil {
		t.Fatalf("gagal membaca src/shared/local-path-cases.json: %v", err)
	}

	var parsed berkasKasusPathLokal
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatalf("berkas kasus path lokal bukan JSON yang sah: %v", err)
	}
	return parsed.Kasus
}

func TestIsAllowedLocalPath_MengikutiSumberKebenaran(t *testing.T) {
	kasus := loadLocalPathCases(t)

	// Tanpa ini test akan lulus tanpa memeriksa apa pun kalau berkas kasus
	// gagal dibaca dan helper mengembalikan daftar kosong.
	if len(kasus) < 20 {
		t.Fatalf("hanya %d kasus terbaca; test lain tidak berarti apa-apa", len(kasus))
	}

	penyimpang := 0
	for _, k := range kasus {
		if got := isAllowedLocalPath(k.Masukan); got != k.Harapan {
			penyimpang++
			t.Errorf("isAllowedLocalPath(%q) = %v, sumber kebenaran menolak %v (%s)",
				k.Masukan, got, k.Harapan, k.Alasan)
		}
	}

	if penyimpang > 0 {
		t.Errorf("%d dari %d kasus menyimpang dari sumber kebenaran", penyimpang, len(kasus))
	}
}
