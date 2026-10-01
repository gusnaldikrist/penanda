import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');
const adapterJsPath = path.join(repoRoot, 'src', 'lite', 'storage-adapter.js');

// init() memanggil detectStorageMode() lalu loadData() sebagai dua promise,
// jadi dua gilir event loop diperlukan sebelum DOM ter-render.

function createStorageEnvironment(options = {}) {
  const { storage = null } = options;

  let panelInnerHtml = '';
  let statusText = '';
  let statusClass = '';

  const panelIndeks = {
    set innerHTML(html) { panelInnerHtml = html; },
    get innerHTML() { return panelInnerHtml; }
  };

  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const store = {};
  const mockLocalStorage = storage || {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'panel-indeks') return panelIndeks;
        if (id === 'status-bar') return statusBar;
        return null;
      },
      createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }),
      body: { appendChild() {}, removeChild() {} },
      addEventListener() {}
    },
    localStorage: mockLocalStorage,
    // Environment minimal untuk storage-adapter.js (Tiket 11).
    // Fetch selalu gagal supaya jalur Lite yang disimulasikan.
    fetch: async () => { throw new TypeError('Failed to fetch'); },
    AbortController,
    setTimeout, clearTimeout,
    console, Date,
    window: {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(adapterJsPath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(appJsPath, 'utf8'), sandbox);

  return {
    sandbox,
    store,
    getPanelHtml: () => panelInnerHtml,
    setPanelHtml: (html) => { panelInnerHtml = html; },
    getStatusText: () => statusText,
    getStatusClass: () => statusClass,
    async settle() {
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
    }
  };
}

test('data.example.json: validasi format dan skema V1', () => {
  assert.ok(fs.existsSync(exampleJsonPath), 'data.example.json harus ada');
  const parsed = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  assert.equal(parsed.version, 1, 'Version harus 1');
  assert.ok(Array.isArray(parsed.items), 'items harus berupa array');
  assert.equal(parsed.items.length, 4, 'Harus ada 4 data dummy items');
  assert.ok(Array.isArray(parsed.todo), 'todo harus berupa array');
  assert.equal(parsed.todo.length, 1, 'Harus ada 1 data todo');
  assert.ok(Array.isArray(parsed.logs), 'logs harus berupa array');
  assert.equal(parsed.logs.length, 1, 'Harus ada 1 data log');
  assert.deepEqual(parsed.pinned_tags, ['ta', 'wisuda', 'magang'], 'Pinned tags harus ta, wisuda, magang');
});

test('app.js: loadData() bentuk kosong awal dan render empty state', async () => {
  const env = createStorageEnvironment();
  await env.settle();

  assert.match(env.getStatusText(), /Lite - 0 item/, 'Status awal harus menunjukkan Lite - 0 item');
  assert.match(env.getPanelHtml(), /Belum ada item kerja/, 'Empty state harus tampil saat data kosong');
  assert.match(env.getPanelHtml(), /\+ Tambah Item/, 'Tombol Tambah Item ada di empty state');
  assert.match(env.getPanelHtml(), /Import JSON/, 'Tombol Import JSON ada di empty state');
  assert.match(
    env.getPanelHtml(),
    /Path lokal hanya bisa dibuka di jalur Pro/,
    'Kalimat konsekuensi jalur harus ada'
  );
});

test('app.js: saveData() dan loadData() siklus baca tulis localStorage indeks_v1', async () => {
  const exampleJson = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createStorageEnvironment();
  await env.settle();

  const saveSuccess = await env.sandbox.saveData(exampleJson);
  assert.equal(saveSuccess, true, 'saveData harus sukses');
  assert.ok(env.store.indeks_v1, 'Kunci indeks_v1 harus tersimpan di localStorage');

  const storedJson = JSON.parse(env.store.indeks_v1);
  assert.equal(storedJson.items.length, 4, 'Data tersimpan harus memiliki 4 item');

  assert.match(
    env.getStatusText(),
    /Lite - 4 item - tersimpan \d{2}:\d{2}/,
    'Status bar harus diperbarui dengan jam simpan'
  );
  assert.match(env.getPanelHtml(), /search-input/, 'Panel indeks harus menampilkan kotak pencarian setelah data tersimpan');

  const loaded = await env.sandbox.loadData();
  assert.equal(loaded.items.length, 4, 'loadData harus mengembalikan 4 item');
});

test('app.js: penanganan SecurityError saat localStorage diblokir browser', async () => {
  const blockedLocalStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); }
  };

  const env = createStorageEnvironment({ storage: blockedLocalStorage });
  await env.settle();

  assert.equal(env.getStatusClass(), 'status-bar error', 'Status bar harus memiliki class error');
  assert.match(
    env.getStatusText(),
    /diblokir browser.*jalur Pro/,
    'Pesan error harus mengarahkan ke jalur Pro'
  );

  // Simulasikan user sedang mengisi form di layar
  env.setPanelHtml('<form id="active-item-form"><input value="draft catatan user"></form>');

  // saveData tidak boleh crash, mengembalikan false, dan TIDAK me-render ulang DOM
  const saved = await env.sandbox.saveData({ version: 1, items: [{ id: 'test' }] });
  assert.equal(saved, false, 'saveData harus mengembalikan false bila diblokir');
  assert.equal(
    env.getPanelHtml(),
    '<form id="active-item-form"><input value="draft catatan user"></form>',
    'DOM dan isian aktif di layar tidak boleh hilang atau di-rerender saat penyimpanan gagal'
  );
});

test('app.js: penanganan SyntaxError saat JSON di localStorage korup', async () => {
  const corruptLocalStorage = {
    getItem: () => '{"version": 1, "items": [ INVALID_JSON',
    setItem: () => {}
  };

  const env = createStorageEnvironment({ storage: corruptLocalStorage });
  await env.settle();

  // Storage tidak boleh dianggap diblokir
  assert.notEqual(env.getStatusClass(), 'status-bar error', 'JSON korup tidak boleh memicu status storage diblokir');
  assert.match(env.getStatusText(), /Lite - 0 item/, 'Harus fallback ke data kosong 0 item');

  const loaded = await env.sandbox.loadData();
  assert.equal(loaded.items.length, 0, 'loadData harus mengembalikan array items kosong saat JSON rusak');
});