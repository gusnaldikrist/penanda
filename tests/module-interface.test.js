import test from 'node:test';
import { buatBackendPalsu } from './helpers/fake-backend.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Test untuk interface publik app.js.
//
// 27 simbol dulu ditulis tiga kali (window, globalThis, module.exports).
// Menambah satu simbol berarti tiga edit, dan sudah pernah kelewat. Test ini
// mengunci bahwa ada SATU daftar simbol, dan ketiga permukaan mengikutinya.

const repoRoot = path.resolve('.');
const appJsPath = path.join(repoRoot, 'src', 'frontend', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'frontend', 'search.js');
const adapterJsPath = path.join(repoRoot, 'src', 'frontend', 'storage-adapter.js');

function loadApp() {
  const backend = buatBackendPalsu({});
  const sandbox = {
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }),
      body: { appendChild() {}, removeChild() {} }, addEventListener() {}, readyState: 'complete'
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    fetch: backend.fetch,
    AbortController, setTimeout, clearTimeout, console, Date
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(searchJsPath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(adapterJsPath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(appJsPath, 'utf8'), sandbox);
  return sandbox;
}

test('interface publik: satu daftar simbol, tiga permukaan mengikutinya', () => {
  const sandbox = loadApp();
  const iface = sandbox.MODULE_INTERFACE;

  assert.ok(iface && typeof iface === 'object',
    'MODULE_INTERFACE harus ada sebagai satu daftar simbol');

  for (const [nama, nilai] of Object.entries(iface)) {
    assert.equal(sandbox.window[nama], nilai,
      `${nama} harus ada di window, diambil dari daftar yang sama`);
    assert.equal(sandbox.globalThis[nama], nilai,
      `${nama} harus ada di globalThis, diambil dari daftar yang sama`);
    assert.equal(sandbox.module.exports[nama], nilai,
      `${nama} harus ada di module.exports, diambil dari daftar yang sama`);
  }
});

test('interface publik: window dan globalThis tidak perlu ditulis dua kali', () => {
  const sandbox = loadApp();
  const iface = sandbox.MODULE_INTERFACE;

  // Dulu ada blok window.* dan blok globalThis.* terpisah. Karena keduanya
  // objek yang sama, blok kedua hanya mengulang pekerjaan blok pertama.
  const diWindow = Object.keys(iface);
  const samaSemua = diWindow.every(n => sandbox.window[n] === sandbox.globalThis[n]);
  assert.ok(samaSemua,
    'window dan globalThis harus memilih objek yang sama, jadi cukup ditulis sekali');
});

test('interface publik: state hanya untuk test, bukan window', () => {
  const sandbox = loadApp();

  // Kebijakan sejak tiket 02: state tidak boleh bocor ke browser supaya
  // tidak bisa dimutasi dari luar aplikasi. Tidak ada penulisan state ke
  // window maupun globalThis di seluruh src/frontend.
  assert.equal(sandbox.window.state, undefined,
    'state tidak boleh ada di window');
  assert.equal(sandbox.globalThis.state, undefined,
    'state tidak boleh ada di globalThis');
  assert.ok('state' in sandbox.module.exports,
    'state tetap harus ada di module.exports untuk test');
  assert.equal(typeof sandbox.module.exports.state, 'object',
    'state yang diekspor harus berupa objek');
});

test('interface publik: tidak ada pembungkus tipis yang hanya meneruskan', () => {
  const source = fs.readFileSync(appJsPath, 'utf8');

  // Aturan path lokal hanya ada di storage-adapter.js. app.js pernah punya
  // wrapper isLocalPath yang isinya satu baris meneruskan ke adapter, tapi
  // tidak ada yang memakainya selain satu pemanggilan yang bisa langsung ke
  // adapter. Wrapper seperti itu menambah nama tanpa menambah kemampuan.
  const wrapper = [...source.matchAll(/function (\w+)\(\s*\w+\s*\)\s*\{\s*return storage\.\w+\([^)]*\);\s*\}/g)];
  assert.deepEqual(wrapper.map(m => m[1]), [],
    `ditemukan pembungkus yang hanya meneruskan ke storage: ${wrapper.map(m => m[1]).join(', ')}`);

  // Aturan path lokal tidak diekspor dari app.js sama sekali; yang diuji
  // adalah versi di adapter.
  assert.equal('isLocalPath' in loadApp().module.exports, false,
    'isLocalPath tidak diekspor dari app.js');
});

test('interface publik: state yang diekspor benar-benar dipakai aplikasi', () => {
  const sandbox = loadApp();
  const state = sandbox.module.exports.state;

  // Kalau state yang diekspor bukan milik aplikasi ini, test lain akan
  // memeriksa objek yang salah tanpa pernah gagal.
  assert.equal(state.activeTab, 'indeks', 'harus state aplikasi, bukan objek kosong');
  // state.data masih null sampai loadData() dipanggil, jadi cukup cek bahwa
  // kuncinya milik aplikasi ini.
  assert.ok('activeTab' in state && 'todoSearchQuery' in state,
    'state yang diekspor harus punya kunci milik aplikasi');
  assert.equal(typeof sandbox.module.exports.saveData, 'function');
});

test('interface publik: tidak ada simbol yang ditulis dua kali di sumber', () => {
  const source = fs.readFileSync(appJsPath, 'utf8');

  // Dulu `state` muncul dua kali di literal module.exports. Hanya yang
  // terakhir yang berlaku, jadi yang pertama adalah kebisingan.
  const blokExports = source.slice(source.indexOf('module.exports'));
  const sebutanState = (blokExports.match(/^\s{6}state,?\s*(\/\/[^\n]*)?$/gm) || []).length;
  assert.ok(sebutanState <= 1,
    `state boleh disebut sekali di module.exports, ditemukan ${sebutanState}`);

  // Setiap simbol harus muncul sekali sebagai kunci di daftar tunggal
  const daftar = source.match(/const MODULE_INTERFACE = \{([\s\S]*?)\n  \};/);
  assert.ok(daftar, 'harus ada literal MODULE_INTERFACE');
  const kunci = (daftar[1].match(/^\s{4}(\w+),?\s*$/gm) || []).map(s => s.trim().replace(/,$/, ''));
  const unik = new Set(kunci);
  assert.equal(kunci.length, unik.size,
    `daftar simbol tidak boleh punya kunci kembar: ${kunci.length - unik.size} pengulangan`);
});

test('interface publik: menambah simbol cukup satu baris', () => {
  const source = fs.readFileSync(appJsPath, 'utf8');

  // Satu-satunya penulisan global yang boleh ada adalah MODULE_INTERFACE
  // sendiri, supaya test bisa membaca daftar simbol yang sebenarnya dipakai.
  const diGlobal = [...source.matchAll(/^\s{4}(?:window|globalThis)\.(\w+)\s*=/gm)]
    .map(m => m[1]);
  const takDiizinkan = diGlobal.filter(nama => nama !== 'MODULE_INTERFACE');

  assert.deepEqual(takDiizinkan, [],
    `tidak boleh menulis simbol per-simbol ke window/globalThis. Ditemukan: ${takDiizinkan.join(', ')}`);

  // Penulisan harus memakai daftar, bukan menyalin isinya satu per satu.
  assert.match(source, /Object\.assign\(window, MODULE_INTERFACE\)/,
    'window harus diisi lewat Object.assign dari daftar, bukan assignment manual');
  assert.match(source, /Object\.assign\(\{\}, MODULE_INTERFACE/,
    'module.exports harus diisi dari daftar yang sama');
});
