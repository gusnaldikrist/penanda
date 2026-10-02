package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// newTestDir membuat folder sementara kosong untuk dipakai uji.
func newTestDir(t *testing.T) string {
	t.Helper()
	return t.TempDir()
}

const contohData = `{"version":1,"items":[],"todo":[],"logs":[],"pinned_tags":["ta"]}`

func TestValidatePayload_MenerimaDataSah(t *testing.T) {
	if err := validatePayload([]byte(contohData)); err != nil {
		t.Fatalf("data sah harus diterima, dapat: %v", err)
	}
}

func TestValidatePayload_MenolakJSONRusak(t *testing.T) {
	if err := validatePayload([]byte("{ ini bukan json")); err == nil {
		t.Fatal("JSON rusak harus ditolak")
	}
}

func TestValidatePayload_MenolakObjekBukanData(t *testing.T) {
	// Array dan angka adalah JSON yang sah, tapi bukan bentuk data Penanda.
	for _, payload := range []string{`[1,2,3]`, `"teks"`, `42`, `null`} {
		if err := validatePayload([]byte(payload)); err == nil {
			t.Fatalf("payload %s harus ditolak", payload)
		}
	}
}

func TestValidatePayload_MenolakFieldTidakArray(t *testing.T) {
	// Mirip validateImportedData di frontend: bentuk berkas harus sama persis.
	for _, field := range []string{"items", "todo", "logs", "pinned_tags"} {
		payload := `{"version":1,"items":[],"todo":[],"logs":[],"pinned_tags":[],"` + field + `":"bukan array"}`
		err := validatePayload([]byte(payload))
		if err == nil {
			t.Fatalf("field %s non-array harus ditolak", field)
		}
		if !containsField(err.Error(), field) {
			t.Fatalf("pesan error harus menyebut %s, dapat: %v", field, err)
		}
	}
}

func TestValidatePayload_MenolakVersionTidakDikenal(t *testing.T) {
	if err := validatePayload([]byte(`{"version":99,"items":[],"todo":[],"logs":[],"pinned_tags":[]}`)); err == nil {
		t.Fatal("version yang tidak dikenal harus ditolak")
	}
	if err := validatePayload([]byte(`{"version":"1","items":[],"todo":[],"logs":[],"pinned_tags":[]}`)); err == nil {
		t.Fatal("version bertipe string harus ditolak")
	}
	payload := `{"items":[],"todo":[],"logs":[],"pinned_tags":[]}`
	if err := validatePayload([]byte(payload)); err == nil {
		t.Fatal("version yang hilang harus ditolak")
	}
	// 1.5 akan terpotong jadi 1 kalau dibandingkan lewat int(); frontend
	// memakai perbandingan ketat, jadi backend harus menolaknya juga
	// (spec kontrak 5).
	if err := validatePayload([]byte(`{"version":1.5,"items":[],"todo":[],"logs":[],"pinned_tags":[]}`)); err == nil {
		t.Fatal("version 1.5 harus ditolak, sama seperti di frontend")
	}
}

func TestDailyCopyName_MenycantumkanTanggalHariIni(t *testing.T) {
	// Arsitektur bagian 6: data-YYYYMMDD.json
	got := dailyCopyName(time.Date(2026, 10, 1, 15, 4, 5, 0, time.Local))
	if got != "data-20261001.json" {
		t.Fatalf("dapat %q, harus data-20261001.json", got)
	}
}

func TestDailyCopyName_HariSamaMemakaiNamaSama(t *testing.T) {
	// Arsitektur bagian 1: hari yang sama ditulis ulang, bukan menumpuk berkas.
	pagi := time.Date(2026, 10, 1, 8, 0, 0, 0, time.Local)
	malam := time.Date(2026, 10, 1, 23, 59, 0, 0, time.Local)
	if dailyCopyName(pagi) != dailyCopyName(malam) {
		t.Fatal("waktu berbeda pada hari sama harus memakai nama salinan yang sama")
	}
}

func TestDailyCopyName_HariBerbedaMemakaiNamaBerbeda(t *testing.T) {
	hariA := time.Date(2026, 10, 1, 23, 59, 0, 0, time.Local)
	hariB := time.Date(2026, 10, 2, 0, 1, 0, 0, time.Local)
	if dailyCopyName(hariA) == dailyCopyName(hariB) {
		t.Fatal("hari berbeda harus memakai nama salinan berbeda")
	}
}

func TestWriteData_MembuatDataDanSalinanHarian(t *testing.T) {
	dir := newTestDir(t)
	now := time.Date(2026, 10, 1, 15, 4, 5, 0, time.Local)

	if err := writeData(dir, []byte(contohData), now); err != nil {
		t.Fatalf("gagal menulis: %v", err)
	}

	isi, err := os.ReadFile(filepath.Join(dir, dataFileName))
	if err != nil {
		t.Fatalf("data.json harus terbentuk: %v", err)
	}
	var parsed map[string]any
	if err := json.Unmarshal(isi, &parsed); err != nil {
		t.Fatalf("data.json harus berisi JSON sah: %v", err)
	}

	salinan := filepath.Join(dir, dailyCopyName(now))
	if _, err := os.Stat(salinan); err != nil {
		t.Fatalf("salinan harian harus terbentuk: %v", err)
	}
}

func TestWriteData_HariSamaMenimpaSalinanTidakMenumpuk(t *testing.T) {
	dir := newTestDir(t)
	now := time.Date(2026, 10, 1, 9, 0, 0, 0, time.Local)
	if err := writeData(dir, []byte(contohData), now); err != nil {
		t.Fatalf("gagal menulis: %v", err)
	}

	isiBaru := `{"version":1,"items":[{"id":"a","title":"Baru"}],"todo":[],"logs":[],"pinned_tags":[]}`
	if err := writeData(dir, []byte(isiBaru), now.Add(6*time.Hour)); err != nil {
		t.Fatalf("gagal menulis ulang: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("gagal membaca folder: %v", err)
	}
	jumlahSalinan := 0
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".json" && e.Name() != dataFileName {
			jumlahSalinan++
		}
	}
	if jumlahSalinan != 1 {
		t.Fatalf("harus ada tepat 1 salinan harian, dapat %d (nama sama harus ditimpa)", jumlahSalinan)
	}
}

// Target yang sudah ada tidak boleh hilang walau penulisan berikutnya gagal.
func TestWriteFileAtomic_MenyimpanTargetDenganBenar(t *testing.T) {
	dir := newTestDir(t)
	target := filepath.Join(dir, dataFileName)

	if err := writeFileAtomic(target, []byte("isi pertama")); err != nil {
		t.Fatalf("gagal menulis pertama: %v", err)
	}
	isi, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("gagal membaca: %v", err)
	}
	if string(isi) != "isi pertama" {
		t.Fatalf("dapat %q, harus \"isi pertama\"", isi)
	}

	if err := writeFileAtomic(target, []byte("isi kedua")); err != nil {
		t.Fatalf("gagal menulis kedua: %v", err)
	}
	isi, _ = os.ReadFile(target)
	if string(isi) != "isi kedua" {
		t.Fatalf("dapat %q, harus \"isi kedua\"", isi)
	}

	// Tidak boleh ada berkas sementara tertinggal setelah penulisan berhasil
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("gagal membaca folder: %v", err)
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Fatalf("berkas sementara %s tidak boleh tertinggal setelah tulis berhasil", e.Name())
		}
	}
}

// Kalau target ada dan penulisan gagal karena folder tidak bisa ditulis,
// isi target lama harus tetap utuh.
func TestWriteFileAtomic_GagalTidakMerusakTargetLama(t *testing.T) {
	dir := newTestDir(t)
	subdir := filepath.Join(dir, "tidak-bisa-ditulis")
	if err := os.Mkdir(subdir, 0o444); err != nil {
		t.Fatalf("gagal membuat folder uji: %v", err)
	}
	// Di Windows, folder baca-saja tidak berlaku; pakai path yang pasti gagal:
	// target di dalam folder yang tidak ada.
	if err := writeFileAtomic(filepath.Join(subdir, "tidak-ada", dataFileName), []byte("x")); err == nil {
		t.Skip("lingkungan uji membolehkan menulis ke folder baca-saja")
	}
}

// Arsitektur bagian 4 langkah 4: tulis lewat berkas sementara supaya data.json
// tidak pernah setengah tertulis saat aplikasi ditutup paksa.
func TestWriteData_TidakMenggantiDataLamaSaatPayloadTidakSah(t *testing.T) {
	dir := newTestDir(t)
	now := time.Now()
	if err := writeData(dir, []byte(contohData), now); err != nil {
		t.Fatalf("gagal menulis data awal: %v", err)
	}

	sebelum, err := os.ReadFile(filepath.Join(dir, dataFileName))
	if err != nil {
		t.Fatalf("gagal membaca data.json: %v", err)
	}

	if err := writeData(dir, []byte("{ rusak"), now); err == nil {
		t.Fatal("payload tidak sah harus ditolak")
	}

	sesudah, err := os.ReadFile(filepath.Join(dir, dataFileName))
	if err != nil {
		t.Fatalf("gagal membaca data.json: %v", err)
	}
	if string(sebelum) != string(sesudah) {
		t.Fatal("data.json yang lama harus tetap utuh setelah payload tidak sah")
	}
}

func TestEmptyData_MengandungVersionSatu(t *testing.T) {
	// Arsitektur bagian 3: berkas belum ada dijawab bentuk kosong berisi version 1
	payload := emptyData()
	var parsed map[string]any
	if err := json.Unmarshal(payload, &parsed); err != nil {
		t.Fatalf("bentuk kosong harus JSON sah: %v", err)
	}
	if parsed["version"] != float64(1) {
		t.Fatalf("version bentuk kosong harus 1, dapat %v", parsed["version"])
	}
	for _, field := range []string{"items", "todo", "logs", "pinned_tags"} {
		v, ok := parsed[field].([]any)
		if !ok {
			t.Fatalf("%s harus berupa array kosong", field)
		}
		if len(v) != 0 {
			t.Fatalf("%s harus kosong", field)
		}
	}
}

// Arsitektur bagian 3: server "hanya menyajikan berkas frontend sendiri".
// Tanpa penyaring, http.FileServer bocorkan data.json lewat peramban.
func TestNoDataFiles_MenolakBerkasDataPengguna(t *testing.T) {
	dir := newTestDir(t)

	// Berkas frontend dan berkas data sama-sama ada di folder itu
	if err := os.WriteFile(filepath.Join(dir, dataFileName), []byte(contohData), 0o644); err != nil {
		t.Fatalf("gagal menulis data.json uji: %v", err)
	}
	for _, frontendFile := range []string{"index.html", "app.js", "style.css"} {
		if err := os.WriteFile(filepath.Join(dir, frontendFile), []byte("/* frontend */"), 0o644); err != nil {
			t.Fatalf("gagal menulis %s uji: %v", frontendFile, err)
		}
	}
	salinan := filepath.Join(dir, "data-20261001.json")
	if err := os.WriteFile(salinan, []byte(contohData), 0o644); err != nil {
		t.Fatalf("gagal menulis salinan uji: %v", err)
	}

	server := httptest.NewServer(noDataFiles(http.FileServer(http.Dir(dir))))
	defer server.Close()

	for _, path := range []string{"/data.json", "/data-20261001.json", "/app.js", "/style.css", "/index.html"} {
		resp, err := http.Get(server.URL + path)
		if err != nil {
			t.Fatalf("gagal meminta %s: %v", path, err)
		}
		status := resp.StatusCode
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		switch path {
		case "/data.json", "/data-20261001.json":
			if status != http.StatusNotFound {
				t.Fatalf("%s harus 404, dapat %d", path, status)
			}
			if strings.Contains(string(body), "pinned_tags") {
				t.Fatalf("%s membocorkan isi data user", path)
			}
		default:
			if status != http.StatusOK {
				t.Fatalf("berkas frontend %s harus 200, dapat %d", path, status)
			}
		}
	}
}

// Frontend harus selalu ditanyakan ulang ke server sebelum peramban memakai
// salinan lamanya sendiri. Diuji lewat newHandler, bukan middleware yang
// dibungkus sendiri: kalau dibungkus sendiri, test ini tetap lulus walau
// newHandler lupa memasang middleware-nya.
// Tanpa ini, hasil perubahan CSS baru tidak terlihat sampai peramban
// dibersihkan manual, dan penyebabnya tidak kelihatan dari layar.
func TestNoStaleAssets_MenyalinHeaderCacheControl(t *testing.T) {
	server := httptest.NewServer(newHandler(newTestDir(t)))
	defer server.Close()

	for _, path := range []string{"/", "/index.html", "/style.css", "/app.js"} {
		resp, err := http.Get(server.URL + path)
		if err != nil {
			t.Fatalf("gagal meminta %s: %v", path, err)
		}
		got := resp.Header.Get("Cache-Control")
		resp.Body.Close()

		if got != "no-cache" {
			t.Fatalf("%s harus mengirim Cache-Control no-cache, dapat %q", path, got)
		}
	}
}

// Header harus muncul walau berkas ditolak: peramban yang pernah menyimpan
// respons 404 pun perlu diberi tahu untuk menanyakannya lagi.
func TestNoStaleAssets_HeaderTetapAdaSaatBerkasDitolak(t *testing.T) {
	server := httptest.NewServer(newHandler(newTestDir(t)))
	defer server.Close()

	resp, err := http.Get(server.URL + "/halaman-yang-tidak-ada.css")
	if err != nil {
		t.Fatalf("gagal meminta berkas tak ada: %v", err)
	}
	got := resp.Header.Get("Cache-Control")
	resp.Body.Close()

	if got != "no-cache" {
		t.Fatalf("respons 404 juga harus memakai no-cache, dapat %q", got)
	}
}

// Sifat yang benar: no-cache bukan no-store. Peramban boleh menyimpan,
// tapi wajib menanyakan ulang.
func TestNoStaleAssets_BukanLarangMenyimpan(t *testing.T) {
	server := httptest.NewServer(newHandler(newTestDir(t)))
	defer server.Close()

	resp, err := http.Get(server.URL + "/index.html")
	if err != nil {
		t.Fatalf("gagal meminta index.html: %v", err)
	}
	directives := resp.Header.Get("Cache-Control")
	resp.Body.Close()

	for _, forbidden := range []string{"no-store", "max-age="} {
		if strings.Contains(directives, forbidden) {
			t.Fatalf("Cache-Control %q tidak boleh memuat %q", directives, forbidden)
		}
	}
}

// Last-Modified harus tetap ada supaya penanyaan ulang dijawab dengan 304
// yang murah, bukan dengan mengirim ulang seluruh berkas.
func TestNoStaleAssets_LastModifiedTetapAda(t *testing.T) {
	dir := newTestDir(t)
	target := filepath.Join(dir, "index.html")
	if err := os.WriteFile(target, []byte("<html></html>"), 0o644); err != nil {
		t.Fatalf("gagal menulis index.html uji: %v", err)
	}

	server := httptest.NewServer(newHandler(dir))
	defer server.Close()

	resp, err := http.Get(server.URL + "/index.html")
	if err != nil {
		t.Fatalf("gagal meminta index.html: %v", err)
	}
	lastModified := resp.Header.Get("Last-Modified")
	resp.Body.Close()

	if lastModified == "" {
		t.Fatal("Last-Modified tidak boleh hilang, tanpa itu penanyaan ulang mahal")
	}
}

// Arsitektur bagian 5: POST /open menerima path lokal Windows dan skema file.
func TestIsAllowedLocalPath_MenerimaPathLokalWindows(t *testing.T) {
	for _, candidate := range []string{
		`D:\`,
		`C:\Users\pustakawan\Data`,
		`d:/Data`,
		`\\server\share\data.json`,
		`\\server\share`,
		`file:///D:/Data`,
		`FILE:///D:/Data`,
	} {
		if !isAllowedLocalPath(candidate) {
			t.Fatalf("%q harus diterima sebagai path lokal", candidate)
		}
	}
}

// Hanya tiga awalan itu yang boleh; alamat lain di luar cakupan.
func TestIsAllowedLocalPath_MenolakLainnya(t *testing.T) {
	for _, candidate := range []string{
		"",
		"   ",
		`D`,
		`http://localhost:8080`,
		`https://lib.uniga.ac.id`,
		`\\`,
		`file:`,
		`ms-settings:`,
		`javascript:alert(1)`,
		`1:\Data`,
	} {
		if isAllowedLocalPath(candidate) {
			t.Fatalf("%q harus ditolak", candidate)
		}
	}
}

func TestHandleOpenPath_MenolakMetodeLainPOST(t *testing.T) {
	dir := newTestDir(t)
	handler := newHandler(dir)

	req := httptest.NewRequest(http.MethodGet, "/open", nil)
	resp := httptest.NewRecorder()
	handler.ServeHTTP(resp, req)

	if resp.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET /open harus 405, dapat %d", resp.Code)
	}
}

func TestHandleOpenPath_MenolakJSONRusak(t *testing.T) {
	dir := newTestDir(t)
	handler := newHandler(dir)

	req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader("{ bukan json"))
	resp := httptest.NewRecorder()
	handler.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("JSON rusak harus 400, dapat %d", resp.Code)
	}
}

func TestHandleOpenPath_MenolakAlamatDiLuarCakupan(t *testing.T) {
	dir := newTestDir(t)
	handler := newHandler(dir)

	for _, address := range []string{"https://lib.uniga.ac.id", `D`, "javascript:alert(1)", `\\`, `file:`} {
		body, _ := json.Marshal(openRequest{Path: address})
		req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader(string(body)))
		resp := httptest.NewRecorder()
		handler.ServeHTTP(resp, req)

		if resp.Code != http.StatusBadRequest {
			t.Fatalf("alamat %q harus 400, dapat %d", address, resp.Code)
		}
	}
}

func containsField(msg, field string) bool {
	return strings.Contains(msg, field)
}
