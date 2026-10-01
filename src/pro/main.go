// main.go — Penanda jalur Pro (Tiket 10)
//
// Binary tunggal tanpa dependency luar. Menyajikan berkas frontend dari
// folder tempat binary berada, dan menyimpan data ke data.json di folder
// yang sama, lengkap dengan salinan harian.
//
// Hanya memakai pustaka standar: net/http, encoding/json, os,
// path/filepath, time, errors, fmt.

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	dataFileName = "data.json"
	serverAddr   = "localhost:8080"
	// Satu-satunya versi skema yang dikenal di V1 (prd-skema.md bagian pembuka)
	supportedVersion = 1
)

// validatePayload menolak apa pun yang bukan bentuk data Penanda.
// Bentuk yang diterima sengaja sama persis dengan validateImportedData di
// frontend, supaya berkas hasil Export Lite dan hasil POST Pro serasi.
func validatePayload(raw []byte) error {
	// Dilakukan dua tahap supaya pesan galat tidak membocorkan jargon Go
	// ("cannot unmarshal ... into Go value of type ...") ke user.
	var probe any
	if err := json.Unmarshal(raw, &probe); err != nil {
		return fmt.Errorf("JSON tidak bisa dibaca: %v", err)
	}
	parsed, objectValid := probe.(map[string]any)
	if !objectValid || parsed == nil {
		return errors.New("isi berkas bukan objek data Penanda")
	}

	versionValue, ok := parsed["version"]
	if !ok {
		return errors.New("field version tidak ditemukan")
	}
	versionNumber, isNumber := versionValue.(float64)
	if !isNumber {
		return fmt.Errorf("field version harus berupa angka, dapat %T", versionValue)
	}
	// Perbandingan dilakukan pada nilai float apa adanya, bukan int(), supaya
	// version 1.5 tidak ikut diterima karena terpotong jadi 1. Lite memakai
	// perbandingan ketat juga, jadi keduanya menerima berkas yang sama.
	if versionNumber != supportedVersion {
		return fmt.Errorf("version %v tidak dikenal; hanya version %d yang dipakai", versionNumber, supportedVersion)
	}

	for _, field := range []string{"items", "todo", "logs", "pinned_tags"} {
		value, ada := parsed[field]
		if !ada {
			return fmt.Errorf("field %s tidak ditemukan", field)
		}
		if _, isArray := value.([]any); !isArray {
			return fmt.Errorf("field %s harus berupa array", field)
		}
	}

	return nil
}

// emptyData adalah jawaban saat data.json belum ada. Ini keadaan instalasi
// baru, jadi statusnya sukses (200), bukan galat.
func emptyData() []byte {
	// Marshal dari map literal ini tidak mungkin gagal, jadi err diabaikan.
	payload, _ := json.Marshal(map[string]any{
		"version":     supportedVersion,
		"items":       []any{},
		"todo":        []any{},
		"logs":        []any{},
		"pinned_tags": []any{},
	})
	return payload
}

// dailyCopyName mengembalikan nama salinan harian, misalnya data-20261001.json.
// Pemanggil pada waktu yang sama memakai nama sama, sehingga salinan hari itu
// ditimpa alih-alih menumpuk berkas baru setiap kali simpan.
func dailyCopyName(now time.Time) string {
	return "data-" + now.Format("20060102") + ".json"
}

// writeData menulis payload ke data.json lalu ke salinan harian.
// Tulisan memakai berkas sementara lebih dulu supaya data.json tidak pernah
// setengah tertulis bila aplikasi ditutup paksa saat menyimpan.
func writeData(baseDir string, payload []byte, now time.Time) error {
	if err := validatePayload(payload); err != nil {
		return err
	}

	// validatePayload sudah memastikan bisa di-unmarshal, tapi marshal ulang
	// dipakai supaya yang tersimpan selalu JSON yang rapi dan berindeks.
	rapih, err := json.MarshalIndent(json.RawMessage(payload), "", "  ")
	if err != nil {
		return fmt.Errorf("gagal menyiapkan JSON untuk ditulis: %w", err)
	}

	dataPath := filepath.Join(baseDir, dataFileName)
	salinanPath := filepath.Join(baseDir, dailyCopyName(now))

	if err := writeFileAtomic(dataPath, rapih); err != nil {
		return err
	}
	if err := writeFileAtomic(salinanPath, rapih); err != nil {
		return err
	}
	return nil
}

func writeFileAtomic(targetPath string, content []byte) error {
	dir := filepath.Dir(targetPath)
	// Berkas sementara di folder yang sama supaya Rename tidak antar-volume.
	// Pola ini membuat berkas sementara ikut hilang bila Rename gagal.
	tmpFile, err := os.CreateTemp(dir, filepath.Base(targetPath)+".*.tmp")
	if err != nil {
		return fmt.Errorf("gagal membuat berkas sementara: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	if _, err := tmpFile.Write(content); err != nil {
		tmpFile.Close()
		return fmt.Errorf("gagal menulis berkas sementara: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("gagal menutup berkas sementara: %w", err)
	}
	if err := os.Rename(tmpPath, targetPath); err != nil {
		return fmt.Errorf("gagal mengganti %s: %w", filepath.Base(targetPath), err)
	}
	return nil
}

// binaryDir mengembalikan folder tempat binary ini berada. Frontend disajikan
// dari folder yang sama, supaya paket rilis cukup disalin apa adanya.
func binaryDir() string {
	executable, err := os.Executable()
	if err != nil {
		// Jalur yang tidak bisa diketahui berarti proses dijalankan tanpa binary
		// di disk; fallback ini hanya untuk jaga-jaga.
		wd, wdErr := os.Getwd()
		if wdErr != nil {
			return "."
		}
		return wd
	}
	resolved, err := filepath.EvalSymlinks(executable)
	if err != nil {
		return filepath.Dir(executable)
	}
	return filepath.Dir(resolved)
}

func newHandler(baseDir string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetData(w, baseDir)
		case http.MethodPost:
			handlePostData(w, r, baseDir)
		default:
			w.Header().Set("Allow", "GET, POST")
			http.Error(w, "metode tidak didukung", http.StatusMethodNotAllowed)
		}
	})

	// Frontend: seluruh berkas di folder binary, termasuk index.html.
	// Berkas data dan salinan harian disaring supaya tidak bisa diunduh lewat
	// peramban; isinya milik user dan tidak perlu dibuka dari HTTP.
	mux.Handle("/", noDataFiles(http.FileServer(http.Dir(baseDir))))

	return mux
}

// noDataFiles membungkus handler berkas sehingga data.json dan
// data-YYYYMMDD.json tidak dapat diambil lewat HTTP. Tanpa ini,
// http.FileServer menyajikan seluruh folder dan membocorkan data user.
//
// Daftar isi direktori juga dimatikan: daftar tanpa isi pun membocorkan nama
// berkas data milik user.
func noDataFiles(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isDataFile(r.URL.Path) {
			http.NotFound(w, r)
			return
		}
		// Daftar isi direktori dimatikan. Halaman utama ("/") tetap boleh
		// karena memang harus menyajikan index.html.
		if strings.HasSuffix(r.URL.Path, "/") && r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isDataFile(urlPath string) bool {
	name := filepath.Base(urlPath)
	if name == dataFileName || strings.HasPrefix(name, "data-") || strings.HasSuffix(name, ".tmp") {
		return strings.HasSuffix(name, ".json") || strings.HasSuffix(name, ".tmp")
	}
	return false
}

func handleGetData(w http.ResponseWriter, baseDir string) {
	dataPath := filepath.Join(baseDir, dataFileName)

	content, err := os.ReadFile(dataPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Instalasi baru: belum ada berkas, jadi jawaban kosong yang sah.
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			w.Write(emptyData())
			return
		}
		// Berkas ada tapi gagal dibaca: ini masalah, bukan keadaan awal.
		http.Error(w, "gagal membaca data.json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}

func handlePostData(w http.ResponseWriter, r *http.Request, baseDir string) {
	body, err := readAllLimited(r)
	if err != nil {
		http.Error(w, "gagal membaca badan permintaan", http.StatusBadRequest)
		return
	}

	if err := writeData(baseDir, body, time.Now()); err != nil {
		// Data lama tidak tersentuh: writeData memvalidasi sebelum menulis.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// Balasan POST sengaja tanpa badan data. Adapter di tiket 11 memakai
	// waktu simpan dari jawabannya, bukan isi data; memuat bentuk kosong di sini
	// akan membingungkan pembacaan yang mengira datanya habis.
	w.WriteHeader(http.StatusOK)
}

// readAllLimited membatasi ukuran badan permintaan supaya satu permintaan
// besar tidak menghabiskan memori. Batas longgar karena data Penanda kecil.
func readAllLimited(r *http.Request) ([]byte, error) {
	const maksUkuran = 8 << 20 // 8 MiB
	defer r.Body.Close()

	limited := io.LimitReader(r.Body, maksUkuran+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if len(body) > maksUkuran {
		return nil, errors.New("badan permintaan terlalu besar")
	}
	return body, nil
}

func main() {
	baseDir := binaryDir()

	listener, err := net.Listen("tcp", serverAddr)
	if err != nil {
		fmt.Printf("Port %s sedang dipakai. Tutup aplikasi lain yang memakai port itu, lalu jalankan penanda.exe lagi.\n", serverAddr)
		os.Exit(1)
	}

	url := "http://" + serverAddr
	fmt.Printf("Penanda siap. Buka %s di browser.\n", url)
	fmt.Printf("Data disimpan di %s\n", filepath.Join(baseDir, dataFileName))

	if err := openBrowser(url); err != nil {
		fmt.Printf("Tidak bisa membuka browser otomatis. Buka %s secara manual.\n", url)
	}

	if err := http.Serve(listener, newHandler(baseDir)); err != nil {
		fmt.Printf("Server berhenti: %v\n", err)
		os.Exit(1)
	}
}

func openBrowser(url string) error {
	browserLauncher, err := exec.LookPath("rundll32.exe")
	if err != nil {
		return errors.New("tidak menemukan perintah pembuka browser")
	}
	cmd := exec.Command(browserLauncher, "url.dll,FileProtocolHandler", url)
	return cmd.Start()
}
