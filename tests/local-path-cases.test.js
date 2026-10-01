import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Aturan "path lokal" dulu ditulis dua kali dalam dua bahasa:
// isLocalPath di storage-adapter.js dan isAllowedLocalPath di main.go.
// Keduanya sudah berbeda tiga dari sembilan masukan.
//
// Go adalah gerbang: kalau backend menolak, tombol Buka mati. Karena itu
// src/shared/local-path-cases.json jadi satu sumber kebenaran. Test Go ada di
// src/pro/localpath_cases_test.go dan membaca berkas yang sama, jadi
// penyimpangan di salah satu bahasa jadi test gagal, bukan bug diam.

const casesPath = path.join('src', 'shared', 'local-path-cases.json');

function loadAdapter() {
  const sandbox = {
    document: { getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    console, setTimeout, clearTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('src/frontend/storage-adapter.js', 'utf8'), sandbox);
  return sandbox.module.exports;
}

function loadCases() {
  const parsed = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  assert.ok(Array.isArray(parsed.kasus) && parsed.kasus.length >= 20,
    `hanya ${parsed.kasus ? parsed.kasus.length : 0} kasus terbaca; test lain tidak berarti apa-apa`);
  return parsed.kasus;
}

test('isLocalPath mengikuti sumber kebenaran yang sama dengan Go', () => {
  const adapter = loadAdapter();
  const kasus = loadCases();

  const menyimpang = [];
  for (const k of kasus) {
    const got = adapter.isLocalPath(k.masukan);
    if (got !== k.harapan) {
      menyimpang.push(`isLocalPath(${JSON.stringify(k.masukan)}) = ${got}, sumber kebenaran ${k.harapan} (${k.alasan})`);
    }
  }

  assert.deepEqual(menyimpang, [],
    `aturan JS menyimpang dari sumber kebenaran:\n  ${menyimpang.join('\n  ')}`);
});

test('UI tidak menawarkan tombol Buka untuk alamat yang pasti ditolak backend', () => {
  const adapter = loadAdapter();
  const kasus = loadCases().filter(k => !k.harapan);

  // Go adalah gerbang. Kalau UI menganggap ini path lokal, user mendapat
  // tombol yang pasti ditolak. Ini kebuntuan yang harus dicegah, bukan
  // sekadar beda jawaban.
  const salahTawaran = kasus
    .filter(k => adapter.isLocalPath(k.masukan))
    .map(k => JSON.stringify(k.masukan));

  assert.deepEqual(salahTawaran, [],
    `alamat berikut dianggap path lokal oleh UI tapi ditolak backend: ${salahTawaran.join(', ')}`);
});

test('alamat yang dianggap path lokal benar-benar bisa dibuka', () => {
  const adapter = loadAdapter();
  const kasus = loadCases().filter(k => k.harapan);

  // Arah sebaliknya: UI menutup jalan yang sebenarnya bisa dipakai.
  // Bukan bug sekelas tombol mati, tapi tetap penyimpangan yang tidak
  // boleh ada karena dua bahasa harus punya satu jawaban.
  const terlewat = kasus
    .filter(k => !adapter.isLocalPath(k.masukan))
    .map(k => JSON.stringify(k.masukan));

  assert.deepEqual(terlewat, [],
    `alamat berikut bisa dibuka backend tapi UI tidak menawarkannya: ${terlewat.join(', ')}`);
});

test('aturan path lokal tetap menolak alamat web dan teks biasa', () => {
  const adapter = loadAdapter();

  // Penjaga tambahan supaya penyelarasan tidak mengorbankan aturan lama.
  for (const addr of ['https://lib.uniga.ac.id', 'http://localhost:8080', '', null, undefined, 42]) {
    assert.equal(adapter.isLocalPath(addr), false, `"${addr}" bukan path lokal`);
  }
});

test('aturan path lokal tidak melemah untuk masukan aneh', () => {
  const adapter = loadAdapter();

  // Kalau penyelarasan longgar, FU ini bisa jadi celah: endpoint /open
  // menjalankan rundll32 dengan argumen dari user.
  for (const addr of ['D:', '1:\\Data', 'D', 'file:', '\\\\', 'notas.txt']) {
    const lokal = adapter.isLocalPath(addr);
    const bolehDijalankan = lokal && addr.length > 2;
    if (bolehDijalankan) {
      assert.fail(`UI menganggap ${JSON.stringify(addr)} bisa dijalankan, tapi ini tidak berguna`);
    }
  }
});
