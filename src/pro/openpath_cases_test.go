package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Bukti akhir kandidat 5: dua kasus yang dulu membuat tombol Buka mati.
//
// Sebelumnya UI (isLocalPath di storage-adapter.js) menganggap "file:" dan
// "\\" sebagai path lokal, sehingga menampilkan tombol Buka. Backend
// (isAllowedLocalPath) menolak keduanya dengan 400. User melihat tombol dan
// lalu pesan gagal.
//
// Test di sini memakai HTTP sungguhan lewat handler, bukan memanggil fungsi
// isAllowedLocalPath langsung, supaya jalur yang dipakai user ikut teruji:
// serialisasi JSON, penolakan, dan pesan yang sampai ke user.

func TestEndpointOpen_MenolakAlamatTanpaIsi(t *testing.T) {
	kasus := []struct {
		masukan string
		alasan  string
	}{
		{"file:", "skema file tanpa isi tidak menunjuk berkas"},
		{`\\`, "UNC tanpa nama server tidak menyebut apa pun"},
		{"", "nilai kosong"},
		{"https://lib.uniga.ac.id", "alamat web bukan path lokal"},
	}

	for _, k := range kasus {
		t.Run(k.alasan, func(t *testing.T) {
			body, _ := json.Marshal(openRequest{Path: k.masukan})
			req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader(string(body)))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			handleOpenPath(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("masukan %q harus ditolak 400, dapat %d", k.masukan, rec.Code)
			}
			if !strings.Contains(rec.Body.String(), "di luar cakupan") {
				t.Errorf("pesan harus menyebutolak, dapat: %q", rec.Body.String())
			}
		})
	}
}

func TestEndpointOpen_TidakMenerimaAlamatWeb(t *testing.T) {
	// Endpoint /open menolak alamat web, dan ini dijaga supaya tidak
	// berubah jadi proxy pembuka URL someday.
	body, _ := json.Marshal(openRequest{Path: "https://www.google.com"})
	req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handleOpenPath(rec, req)

	if rec.Code == http.StatusOK {
		t.Fatal("alamat web tidak boleh diterima oleh endpoint /open")
	}
}
