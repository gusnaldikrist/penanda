import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const adapterPath = path.join(repoRoot, 'src', 'lite', 'storage-adapter.js');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');

function loadAdapter() {
  const sandbox = {
    console, Date, setTimeout, clearTimeout,
    AbortController,
    // Controller minimal yang cukup untuk menguji jalur batal-abort.
    AbortSignal: { prototype: {} }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(adapterPath, 'utf8'), sandbox);
  return sandbox.module.exports;
}

// Fake fetch yang mencatat panggilan dan mengembalikan jawaban terkontrol.
function createFetchStub(handler) {
  const calls = [];
  const stub = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body });
    return handler(url, options);
  };
  stub.calls = calls;
  return stub;
}

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

// ---------------------------------------------------------------------------
// Deteksi jalur
// ---------------------------------------------------------------------------

test('Tiket 11 - Deteksi jalur: GET /api/data sukses berarti Pro', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(200, '{"version":1}'));

  const mode = await adapter.detectMode(fetchStub);

  assert.equal(mode, 'Pro');
  assert.equal(fetchStub.calls[0].url, '/api/data');
  assert.equal(fetchStub.calls[0].method, 'GET');
});

test('Tiket 11 - Deteksi jalur: backend menjawab galat berarti Lite', async () => {
  const adapter = loadAdapter();

  for (const status of [400, 404, 500, 503]) {
    const mode = await adapter.detectMode(createFetchStub(() => jsonResponse(status, '')));
    assert.equal(mode, 'Lite', `status ${status} harus berarti Lite`);
  }
});

test('Tiket 11 - Deteksi jalur: fetch ditolak (dibuka dari Explorer) berarti Lite', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => {
    throw new TypeError('Failed to fetch');
  });

  const mode = await adapter.detectMode(fetchStub);
  assert.equal(mode, 'Lite');
});

test('Tiket 11 - Deteksi jalur: tanpa fungsi fetch sama sekali berarti Lite', async () => {
  const adapter = loadAdapter();
  const mode = await adapter.detectMode(null);
  assert.equal(mode, 'Lite', 'Browser tua tanpa fetch harus tetap jalan di Lite');
});

// ---------------------------------------------------------------------------
// Path lokal vs alamat web (arsitektur bagian 5)
// ---------------------------------------------------------------------------

test('Tiket 11 - Path lokal: huruf drive, UNC, dan skema file', () => {
  const adapter = loadAdapter();

  for (const addr of ['D:\\', 'C:\\Users\\pustakawan', 'd:/Data', '\\\\server\\share\\data.json', 'file:///D:/Data']) {
    assert.equal(adapter.isLocalPath(addr), true, `"${addr}" harus dianggap path lokal`);
  }
});

test('Tiket 11 - Path lokal: alamat web dan teks biasa bukan path lokal', () => {
  const adapter = loadAdapter();

  for (const addr of ['https://lib.uniga.ac.id', 'http://localhost:8080', 'D:', 'drive.google.com', '', null, undefined]) {
    assert.equal(adapter.isLocalPath(addr), false, `"${addr}" bukan path lokal`);
  }
});

test('Tiket 11 - Path lokal: 주소 web tidak tertukar dengan path lokal', () => {
  const adapter = loadAdapter();

  // Alamat web tetap bukan path lokal, jadi tombolnya tidak berubah jadi Copy.
  for (const addr of ['http://localhost:8080', 'https://docs.google.com/x']) {
    assert.equal(adapter.isLocalPath(addr), false, `"${addr}" bukan path lokal`);
  }
});

// ---------------------------------------------------------------------------
// Area status tiga bagian (PRD 5.9, wireframe bagian 6)
// ---------------------------------------------------------------------------

test('Tiket 11 - Area status tiga bagian dipisah tanda hubung', () => {
  const adapter = loadAdapter();

  assert.equal(adapter.formatStatus('Lite', 24, '16:02'), 'Lite - 24 item - tersimpan 16:02');
  assert.equal(adapter.formatStatus('Pro', 24, '16:02'), 'Pro - 24 item - tersimpan 16:02');
});

test('Tiket 11 - Area status: kata memuat hanya saat membaca berkas, jam belum ada', () => {
  const adapter = loadAdapter();

  assert.equal(adapter.formatStatus('Pro', 0, null, true), 'Pro - 0 item - memuat');
  // Setelah simpan sukses, jam muncul dan kata memuat hilang
  assert.equal(adapter.formatStatus('Pro', 24, '16:02', false), 'Pro - 24 item - tersimpan 16:02');
});

test('Tiket 11 - Area status tanpa jam simpan hanya dua bagian', () => {
  const adapter = loadAdapter();
  assert.equal(adapter.formatStatus('Lite', 4, null), 'Lite - 4 item');
});

test('Tiket 11 - Jam simpan memakai format 24 jam dua digit', () => {
  const adapter = loadAdapter();

  assert.equal(adapter.formatSavedTime(new Date(2026, 9, 1, 9, 5)), '09:05');
  assert.equal(adapter.formatSavedTime(new Date(2026, 9, 1, 16, 2)), '16:02');
  assert.equal(adapter.formatSavedTime(new Date(2026, 9, 1, 0, 0)), '00:00');
  assert.equal(adapter.formatSavedTime(new Date(2026, 9, 1, 23, 59)), '23:59');
});

// ---------------------------------------------------------------------------
// Tulis dan buka lewat backend
// ---------------------------------------------------------------------------

test('Tiket 11 - Tulis lewat backend: POST /api/data dengan badan JSON', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(200, ''));

  await adapter.writeRemote('{"version":1}', fetchStub);

  assert.equal(fetchStub.calls[0].url, '/api/data');
  assert.equal(fetchStub.calls[0].method, 'POST');
  assert.equal(fetchStub.calls[0].body, '{"version":1}');
});

test('Tiket 11 - Tulis lewat backend: galat dilempar agar pemanggil tahu simpan gagal', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(500, ''));

  await assert.rejects(() => adapter.writeRemote('{}', fetchStub), /500/);
});

test('Tiket 11 - Baca lewat backend: galat dilempar', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(500, ''));

  await assert.rejects(() => adapter.readRemote(fetchStub), /500/);
});

test('Tiket 11 - Buka path lokal lewat backend: POST /open berisi {path}', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(200, ''));

  await adapter.openRemotePath('D:\\Data', fetchStub);

  assert.equal(fetchStub.calls[0].url, '/open');
  assert.equal(fetchStub.calls[0].method, 'POST');
  assert.equal(fetchStub.calls[0].body, '{"path":"D:\\\\Data"}');
});

test('Tiket 11 - Buka path lokal lewat backend: galat dilempar agar bisa fallback Copy', async () => {
  const adapter = loadAdapter();
  const fetchStub = createFetchStub(() => jsonResponse(400, ''));

  await assert.rejects(() => adapter.openRemotePath('D:\\Data', fetchStub), /400/);
});

// ---------------------------------------------------------------------------
// Batas waktu: halaman dari Explorer tidak punya server
// ---------------------------------------------------------------------------

test('Tiket 11 - Deteksi jalur: permintaan menggantung dibatasi waktu lalu jadi Lite', async () => {
  const adapter = loadAdapter();
  // Fetch yang tidak pernah selesai, hanya menunggu abort signal.
  const fetchStub = (url, options) => new Promise((resolve, reject) => {
    if (options.signal) {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }
  });

  const mode = await adapter.detectMode(fetchStub);
  assert.equal(mode, 'Lite', 'Permintaan menggantung harus berakhir sebagai Lite, bukan menggantung selamanya');
});

// ---------------------------------------------------------------------------
// Jalur Lite: localStorage
// ---------------------------------------------------------------------------

test('Tiket 11 - Jalur Lite baca dan tulis lewat kunci indeks_v1', () => {
  const adapter = loadAdapter();
  const store = {};
  const fakeLocalStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };

  const sandbox = { console, Date };
  sandbox.localStorage = fakeLocalStorage;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(adapterPath, 'utf8'), sandbox);
  const litAdapter = sandbox.module.exports;

  assert.equal(litAdapter.readLocal(), null, 'Belum ada data harus mengembalikan null');
  litAdapter.writeLocal('{"version":1}');
  assert.equal(store.indeks_v1, '{"version":1}', 'Kunci localStorage harus indeks_v1');
  assert.equal(litAdapter.readLocal(), '{"version":1}');
});

test('Tiket 11 - Jalur Lite: localStorage diblokir tidak melempar keluar', () => {
  const adapter = loadAdapter();
  const sandbox = {
    console, Date,
    localStorage: {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(adapterPath, 'utf8'), sandbox);
  const litAdapter = sandbox.module.exports;

  assert.throws(
    () => litAdapter.readLocal(),
    /SecurityError/,
    'localStorage diblokir harus melempar, bukan dibaca sebagai null supaya pemanggil tahu'
  );
  assert.throws(
    () => litAdapter.writeLocal('{}'),
    /SecurityError/,
    'Penulisan yang diblokir harus tetap melempar agar pemanggil tahu'
  );
});

// ---------------------------------------------------------------------------
// Bentuk berkas: adapter dan app.js harus sepakat soal versi
// ---------------------------------------------------------------------------

test('Tiket 11 - Constanta versi adapter sama dengan yang dipakai app.js', () => {
  const appSource = fs.readFileSync(appJsPath, 'utf8');
  const match = appSource.match(/const SUPPORTED_VERSION\s*=\s*(\d+)/);
  assert.ok(match, 'app.js harus mendeklarasikan SUPPORTED_VERSION');

  const goSource = fs.readFileSync(path.join(repoRoot, 'src', 'pro', 'main.go'), 'utf8');
  const goMatch = goSource.match(/supportedVersion\s*=\s*(\d+)/);
  assert.ok(goMatch, 'main.go harus mendeklarasikan supportedVersion');

  assert.equal(match[1], goMatch[1], 'Lite dan Pro harus memakai angka versi yang sama');
});

test('Tiket 11 - Kunci localStorage adapter sama dengan(app.js)', () => {
  const adapter = loadAdapter();
  assert.equal(adapter.STORAGE_KEY, 'indeks_v1', 'Kunci localStorage harus indeks_v1 (spec kontrak 8)');
});