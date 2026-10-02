package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// Aturan "sop" ditulis dua kali dalam dua bahasa: validSop di frontend
// (JavaScript) dan validSop di main.go (Go). Go adalah gerbang: kalau
// backend menerima berkas yang ditolak frontend, atau sebaliknya, orang
// baru menemukan masalahnya setelah menyimpan, bukan saat mengetik.
//
// src/shared/sop-cases.json jadi satu sumber kebenaran, dan kedua test
// membacanya. Test Go ada di berkas ini; test JavaScript ada di
// tests/sop-cases.test.js dan membaca berkas yang sama.

type kasusSop struct {
	Masukan any    `json:"masukan"`
	Harapan bool   `json:"harapan"`
	Alasan  string `json:"alasan"`
}

type berkasKasusSop struct {
	Kasus []kasusSop `json:"kasus"`
}

// loadSopCases membaca sumber kebenaran aturan field sop.
//
// Path dibaca relatif ke folder repo, bukan ke folder test, supaya test tetap
// jalan dari root maupun dari src/pro.
func loadSopCases(t *testing.T) []kasusSop {
	t.Helper()

	candidates := []string{
		filepath.Join("..", "..", "src", "shared", "sop-cases.json"),
		filepath.Join("..", "src", "shared", "sop-cases.json"),
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
		t.Fatalf("gagal membaca src/shared/sop-cases.json: %v", err)
	}

	var parsed berkasKasusSop
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatalf("berkas kasus sop bukan JSON yang sah: %v", err)
	}
	return parsed.Kasus
}

func TestValidSop_MengikutiSumberKebenaran(t *testing.T) {
	kasus := loadSopCases(t)

	// Tanpa ini test akan lulus tanpa memeriksa apa pun kalau berkas kasus
	// gagal dibaca dan helper mengembalikan daftar kosong.
	if len(kasus) < 10 {
		t.Fatalf("hanya %d kasus terbaca; test lain tidak berarti apa-apa", len(kasus))
	}

	penyimpang := 0
	for _, k := range kasus {
		if got := validSop(k.Masukan); got != k.Harapan {
			penyimpang++
			t.Errorf("validSop(%#v) = %v, sumber kebenaran %v (%s)",
				k.Masukan, got, k.Harapan, k.Alasan)
		}
	}

	if penyimpang > 0 {
		t.Errorf("%d dari %d kasus menyimpang dari sumber kebenaran", penyimpang, len(kasus))
	}
}

// TestValidPayload_MenolakSopSalahBentuk memastikan aturan itu benar-benar
// dijalankan pada berkas yang masuk lewat gerbang, bukan hanya pada fungsi
// validSop-nya. Tanpa test ini, penyebutan validSop di validatePayload bisa
// terhapus tanpa ada yang gagal.
func TestValidPayload_MenolakSopSalahBentuk(t *testing.T) {
	kasus := loadSopCases(t)

	for _, k := range kasus {
		payload := map[string]any{
			"version":     float64(1),
			"items":       []any{map[string]any{"id": "x", "sop": k.Masukan}},
			"todo":        []any{},
			"logs":        []any{},
			"pinned_tags": []any{},
		}
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("gagal menyusun payload: %v", err)
		}

		diterima := validatePayload(raw) == nil
		if diterima != k.Harapan {
			t.Errorf("validatePayload menerima=%v, sumber kebenaran %v (%s)", diterima, k.Harapan, k.Alasan)
		}
	}
}

// TestValidPayload_SopHilangTetapDiterima menutup celah data lama: berkas
// yang ditulis sebelum field ini ada tidak punya sop sama sekali.
func TestValidPayload_SopHilangTetapDiterima(t *testing.T) {
	raw := []byte(`{"version":1,"items":[{"id":"lama","title":"Item lama","catatan":"tanpa sop"}],"todo":[],"logs":[],"pinned_tags":[]}`)

	if err := validatePayload(raw); err != nil {
		t.Fatalf("data lama tanpa field sop harus tetap diterima: %v", err)
	}
}

// TestValidPayload_SopDiItemSalahBentukDitolak memeriksa bahwa indeks item
// yang disebut di pesan galat benar, supaya pesan itu bisa dipakai menemukan
// item yang salah tanpa membaca seluruh berkas.
func TestValidPayload_SopDiItemSalahBentukDitolak(t *testing.T) {
	raw := []byte(`{"version":1,"items":[{"id":"ok"},{"id":"rusak","sop":42}],"todo":[],"logs":[],"pinned_tags":[]}`)

	err := validatePayload(raw)
	if err == nil {
		t.Fatal("item dengan sop angka harus ditolak")
	}
	if want := "indeks 1"; !contains(err.Error(), want) {
		t.Errorf("pesan galat harus menyebut %q, dapat: %v", want, err)
	}
}

func contains(text, want string) bool {
	return len(text) >= len(want) && (text == want || indexOf(text, want) >= 0)
}

func indexOf(text, want string) int {
	for i := 0; i+len(want) <= len(text); i++ {
		if text[i:i+len(want)] == want {
			return i
		}
	}
	return -1
}
