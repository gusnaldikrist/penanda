import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');

test('data.example.json: validasi format dan skema V1', () => {
  assert.ok(fs.existsSync(exampleJsonPath), 'data.example.json harus ada');
  const raw = fs.readFileSync(exampleJsonPath, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(parsed.version, 1, 'Version harus 1');
  assert.ok(Array.isArray(parsed.items), 'items harus berupa array');
  assert.equal(parsed.items.length, 4, 'Harus ada 4 data dummy items');
  assert.ok(Array.isArray(parsed.todo), 'todo harus berupa array');
  assert.equal(parsed.todo.length, 1, 'Harus ada 1 data todo');
  assert.ok(Array.isArray(parsed.logs), 'logs harus berupa array');
  assert.equal(parsed.logs.length, 1, 'Harus ada 1 data log');
  assert.deepEqual(parsed.pinned_tags, ['ta', 'wisuda', 'magang'], 'Pinned tags harus ta, wisuda, magang');
});

test('app.js: loadData() bentuk kosong awal dan render empty state', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  let panelInnerHtml = '';
  const panelIndeks = {
    getAttribute: () => 'panel-indeks',
    classList: { toggle: () => {} },
    removeAttribute: () => {},
    setAttribute: () => {},
    set innerHTML(html) { panelInnerHtml = html; },
    get innerHTML() { return panelInnerHtml; }
  };

  let statusText = '';
  let statusClass = '';
  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const store = {};
  const mockLocalStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); }
  };

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'panel-indeks') return panelIndeks;
        if (id === 'status-bar') return statusBar;
        return null;
      }
    },
    localStorage: mockLocalStorage,
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(appJs, sandbox);

  // Status awal kosong
  assert.match(statusText, /Lite - 0 item/, 'Status awal harus menunjukkan Lite - 0 item');
  assert.match(panelInnerHtml, /Belum ada item kerja/, 'Empty state harus tampil saat data kosong');
  assert.match(panelInnerHtml, /\+ Tambah Item/, 'Tombol Tambah Item ada di empty state');
  assert.match(panelInnerHtml, /Import JSON/, 'Tombol Import JSON ada di empty state');
  assert.match(panelInnerHtml, /Path lokal hanya bisa dibuka di jalur Pro/, 'Kalimat konsekuensi jalur harus ada');
});

test('app.js: saveData() dan loadData() siklus baca tulis localStorage indeks_v1', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const exampleJson = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  let panelInnerHtml = '';
  const panelIndeks = {
    getAttribute: () => 'panel-indeks',
    classList: { toggle: () => {} },
    removeAttribute: () => {},
    setAttribute: () => {},
    set innerHTML(html) { panelInnerHtml = html; },
    get innerHTML() { return panelInnerHtml; }
  };

  let statusText = '';
  let statusClass = '';
  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const store = {};
  const mockLocalStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); }
  };

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'panel-indeks') return panelIndeks;
        if (id === 'status-bar') return statusBar;
        return null;
      }
    },
    localStorage: mockLocalStorage,
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(appJs, sandbox);

  // Simpan data 4 item
  const saveSuccess = sandbox.window.saveData(exampleJson);
  assert.equal(saveSuccess, true, 'saveData harus sukses');
  assert.ok(store['indeks_v1'], 'Kunci indeks_v1 harus tersimpan di localStorage');

  // Periksa data di localStorage
  const storedJson = JSON.parse(store['indeks_v1']);
  assert.equal(storedJson.items.length, 4, 'Data tersimpan harus memiliki 4 item');

  // Periksa pembaruan status dan UI
  assert.match(statusText, /Lite - 4 item - tersimpan \d{2}:\d{2}/, 'Status bar harus diperbarui dengan jam simpan');
  assert.match(panelInnerHtml, /4 item tersimpan/, 'Panel indeks harus menampilkan jumlah item tersimpan');

  // Muat ulang (loadData)
  const loaded = sandbox.window.loadData();
  assert.equal(loaded.items.length, 4, 'loadData harus mengembalikan 4 item');
});

test('app.js: penanganan SecurityError saat localStorage diblokir browser', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  let panelInnerHtml = '';
  const panelIndeks = {
    getAttribute: () => 'panel-indeks',
    classList: { toggle: () => {} },
    removeAttribute: () => {},
    setAttribute: () => {},
    set innerHTML(html) { panelInnerHtml = html; },
    get innerHTML() { return panelInnerHtml; }
  };

  let statusText = '';
  let statusClass = '';
  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const blockedLocalStorage = {
    getItem: () => {
      const err = new Error('Access is denied for this document');
      err.name = 'SecurityError';
      throw err;
    },
    setItem: () => {
      const err = new Error('Access is denied for this document');
      err.name = 'SecurityError';
      throw err;
    }
  };

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'status-bar') return statusBar;
        if (id === 'panel-indeks') return panelIndeks;
        return null;
      }
    },
    localStorage: blockedLocalStorage,
    window: {}
  };

  vm.createContext(sandbox);
  // Jalankan inisialisasi: tidak boleh melempar unhandled error
  assert.doesNotThrow(() => {
    vm.runInContext(appJs, sandbox);
  }, 'Aplikasi tidak boleh crash jika localStorage diblokir');

  assert.equal(statusClass, 'status-bar error', 'Status bar harus memiliki class error');
  assert.match(statusText, /diblokir browser.*jalur Pro/, 'Pesan error harus mengarahkan ke jalur Pro');

  // Simulasikan user sedang mengisi form di layar
  panelInnerHtml = '<form id="active-item-form"><input value="draft catatan user"></form>';

  // Panggilan saveData tidak boleh crash, mengembalikan false, dan TIDAK me-render ulang DOM
  const saved = sandbox.window.saveData({ version: 1, items: [{ id: 'test' }] });
  assert.equal(saved, false, 'saveData harus mengembalikan false bila diblokir');
  assert.equal(
    panelInnerHtml,
    '<form id="active-item-form"><input value="draft catatan user"></form>',
    'DOM dan isian aktif di layar tidak boleh hilang atau di-rerender saat penyimpanan gagal'
  );
});

test('app.js: penanganan SyntaxError saat JSON di localStorage korup', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  let statusText = '';
  let statusClass = '';
  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const corruptLocalStorage = {
    getItem: () => '{"version": 1, "items": [ INVALID_JSON',
    setItem: () => {}
  };

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'status-bar') return statusBar;
        if (id === 'panel-indeks') return { set innerHTML(_) {} };
        return null;
      }
    },
    localStorage: corruptLocalStorage,
    window: {}
  };

  vm.createContext(sandbox);
  assert.doesNotThrow(() => {
    vm.runInContext(appJs, sandbox);
  }, 'Aplikasi tidak boleh crash saat JSON korup');

  // Storage tidak boleh dianggap diblokir
  assert.notEqual(statusClass, 'status-bar error', 'JSON korup tidak boleh memicu status storage diblokir');
  assert.match(statusText, /Lite - 0 item/, 'Harus fallback ke data kosong 0 item');

  const loaded = sandbox.window.loadData();
  assert.equal(loaded.items.length, 0, 'loadData harus mengembalikan array items kosong saat JSON rusak');
});
