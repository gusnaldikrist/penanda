package main

import "testing"

// openInExplorer (dipakai endpoint /open) dan openBrowser (dipakai startup)
// sama-sama menjalankan rundll32.exe dengan argumen persis sama:
//
//	rundll32.exe url.dll,FileProtocolHandler <target>
//
// Versi sebelumnya menyalin lima baris pencarian dan pemanggilan di kedua
// tempat. Kalau salah satu diubah, yang lain diam-diam berbeda.
//
// Yang diuji di sini adalah penyusunan argumen, bukan prosesnya: memanggil
// rundll32 sungguhan akan membuka jendela di komputer yang menjalankan test.
// Argumen ini yang menentukan perintah apa yang dieksekusi, jadi diuji
// sebagai data murni.

func TestShellOpenArgs_MemakaiFileProtocolHandler(t *testing.T) {
	got := shellOpenArgs("D:\\Data\\laporan.xlsx")

	if len(got) != 2 {
		t.Fatalf("harus dua argumen, dapat %d: %v", len(got), got)
	}
	if got[0] != "url.dll,FileProtocolHandler" {
		t.Errorf("argumen pertama = %q, ingin url.dll,FileProtocolHandler", got[0])
	}
	if got[1] != "D:\\Data\\laporan.xlsx" {
		t.Errorf("argumen kedua = %q, ingin target apa adanya", got[1])
	}
}

func TestShellOpenArgs_TargetTidakDiubah(t *testing.T) {
	for _, target := range []string{
		"D:\\Data\\laporan.xlsx",
		"\\\\server\\share\\data.json",
		"file:///D:/Data",
		"http://localhost:8080",
		"C:\\Program Files\\App\\v1.2.3\\doc.pdf",
	} {
		got := shellOpenArgs(target)
		if got[1] != target {
			t.Errorf("shellOpenArgs(%q) mengubah target jadi %q", target, got[1])
		}
	}
}

func TestShellOpenArgs_TanpaSwitchTambahan(t *testing.T) {
	// Argumen ekstra tanpa sengaja berarti perintah lain yang dijalankan,
	// jadi daftar argumen harus persis dua dan tidak boleh bertambah
	// diam-diam.
	got := shellOpenArgs("D:\\Data")
	if len(got) != 2 {
		t.Errorf("argumen harus persis dua, dapat %d: %v", len(got), got)
	}
	if got[0] != "url.dll,FileProtocolHandler" {
		t.Errorf("tidak boleh ada switch tambahan, dapat %q", got[0])
	}
}

func TestShellLauncherName_Konstan(t *testing.T) {
	// Nama perintah harus konstan, bukan hasil input. Kalau nanti ditambah
	// parameter, test ini pengingat bahwa input user tidak boleh sampai sini.
	if shellLauncherName() != "rundll32.exe" {
		t.Errorf("shellLauncherName() = %q, ingin rundll32.exe", shellLauncherName())
	}
}
