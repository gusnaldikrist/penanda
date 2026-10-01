import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'lite', 'search.js');
const adapterJsPath = path.join(repoRoot, 'src', 'lite', 'storage-adapter.js');

// Harness minimal yang cukup untuk test status bar dan penyimpanan.
// Berkas test lain punya harness sendiri yang lebih lengkap.

function createTestEnvironment(initialData = null, fetchImpl = null) {
  const elements = new Map();
  const docListeners = {};

  let panelInnerHtml = '';
  let statusText = '';
  let statusClass = '';

  const statusBar = {
    set textContent(text) { statusText = text; },
    get textContent() { return statusText; },
    set className(cls) { statusClass = cls; },
    get className() { return statusClass; }
  };

  const panelIndeks = {
    set innerHTML(html) { panelInnerHtml = html; },
    get innerHTML() { return panelInnerHtml; }
  };

  function getOrCreateElement(id, tagName = 'div') {
    if (!elements.has(id)) {
      const listeners = {};
      let value = '';
      let className = '';
      let innerHTML = '';
      let style = { display: '' };
      let disabled = false;
      const attributes = new Map();
      elements.set(id, {
        id,
        tagName: tagName.toUpperCase(),
        listeners,
        style,
        setAttribute: (a, v) => attributes.set(a, String(v)),
        getAttribute: (a) => (a === 'id' ? id : (attributes.get(a) || null)),
        removeAttribute: (a) => attributes.delete(a),
        addEventListener(evt, h) {
          if (!listeners[evt]) listeners[evt] = [];
          listeners[evt].push(h);
        },
        trigger(evt, data = {}) {
          if (listeners[evt]) {
            for (const h of listeners[evt]) h({ target: this, preventDefault() {}, ...data });
          }
        },
        set innerHTML(html) { innerHTML = String(html); },
        get innerHTML() { return innerHTML; },
        set textContent(t) { innerHTML = String(t); },
        get textContent() { return innerHTML; },
        set value(v) { value = String(v); },
        get value() { return value; },
        set className(c) { className = String(c); },
        get className() { return className; },
        set disabled(d) { disabled = Boolean(d); },
        get disabled() { return disabled; },
        dataset: {},
        focus() {},
        select() {},
        closest() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        classList: { contains: () => false, toggle() {}, add() {}, remove() {} }
      });
    }
    return elements.get(id);
  }

  getOrCreateElement('panel-indeks', 'section');
  getOrCreateElement('panel-todo', 'section');
  getOrCreateElement('panel-log', 'section');

  const activeModals = [];
  const store = {};
  if (initialData) store.indeks_v1 = JSON.stringify(initialData);

  const domDocument = {
    readyState: 'complete',
    getElementById: (id) => {
      if (id === 'status-bar') return statusBar;
      if (id === 'panel-indeks') return panelIndeks;
      return getOrCreateElement(id);
    },
    querySelector: (sel) => (sel === '.modal-overlay'
      ? (activeModals.length ? activeModals[activeModals.length - 1] : null)
      : null),
    querySelectorAll: () => [],
    createElement: (tag) => getOrCreateElement('dyn-' + Math.random().toString(36).slice(2, 8), tag),
    body: {
      appendChild(node) {
        if (node.className && String(node.className).includes('modal-overlay')) {
          activeModals.push(node);
          node.parentNode = domDocument.body;
        }
      },
      removeChild(node) {
        const i = activeModals.indexOf(node);
        if (i !== -1) { activeModals.splice(i, 1); node.parentNode = null; }
      }
    },
    addEventListener(evt, h) {
      if (!docListeners[evt]) docListeners[evt] = [];
      docListeners[evt].push(h);
    },
    trigger: (evt, data) => { if (docListeners[evt]) for (const h of docListeners[evt]) h(data); }
  };

  const sandbox = {
    document: domDocument,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; }
    },
    // Default: fetch gagal, yaitu halaman dibuka dari file:// tanpa backend.
    fetch: fetchImpl || (async () => { throw new TypeError('Failed to fetch'); }),
    AbortController,
    setTimeout, clearTimeout,
    console, Date
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(searchJsPath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(adapterJsPath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(appJsPath, 'utf8'), sandbox);

  return {
    sandbox,
    state: sandbox.module.exports.state,
    panelIndeks: { get innerHTML() { return panelInnerHtml; } },
    getPanelHtml: () => panelInnerHtml,
    activeModals,
    store,
    getOrCreateElement,
    getStatusText: () => statusText,
    getStatusClass: () => statusClass,
    triggerDoc: domDocument.trigger,
    // init() memanggil detectStorageMode lalu loadData berurutan
    async settle() {
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
    }
  };
}

// Kalimat "path lokal hanya bisa dibuka di jalur Pro" hanya benar di Lite.
// Di Pro path lokal justru bisa dibuka, jadi kalimatnya akan menyesatkan
// (PRD 5.8 menyebutnya "pada jalur Lite").
test('kalimat konsekuensi jalur hanya tampil di Lite', async () => {
  const liteEnv = createTestEnvironment();
  await liteEnv.settle();
  assert.equal(liteEnv.state.mode, 'Lite');
  assert.match(
    liteEnv.getPanelHtml(),
    /Path lokal hanya bisa dibuka di jalur Pro/,
    'Jalur Lite harus menampilkan kalimat konsekuensi'
  );

  const proData = { version: 1, items: [], todo: [], logs: [], pinned_tags: [] };
  const proEnv = createTestEnvironment(null, async () => ({
    ok: true, status: 200, text: async () => JSON.stringify(proData)
  }));
  await proEnv.settle();
  assert.equal(proEnv.state.mode, 'Pro');

  const proHtml = proEnv.getPanelHtml();
  assert.ok(
    !proHtml.includes('hanya bisa dibuka di jalur Pro'),
    'Jalur Pro tidak boleh menampilkan kalimat itu karena path lokal bisa dibuka'
  );
});

// Race condition: simpan saat jalur belum terdeteksi (tiket 11)
// ---------------------------------------------------------------------------

// init() memanggil detectStorageMode lalu loadData. Selama jendela itu
// data di layar belum berasal dari mana pun, sehingga saveData yang keburu
// akan menimpa data.json user dengan data kosong.
test('jalur belum terdeteksi: simpan ditolak, tidak ada POST ke server', async () => {
  const posts = [];
  const env = createTestEnvironment(null, async (url, opts = {}) => {
    if (opts.method === 'POST') { posts.push(opts.body); return { ok: true, status: 200, text: async () => '' }; }
    // GET sengaja lambat supaya jendela deteksi masih terbuka
    await new Promise(r => setTimeout(r, 50));
    return { ok: true, status: 200, text: async () => '{"version":1,"items":[],"todo":[],"logs":[],"pinned_tags":[]}' };
  });

  // Belum menunggu settle(): init() masih berjalan
  assert.equal(env.state.isModeReady, false, 'Awalnya jalur belum siap');

  const ok = await env.sandbox.saveData({
    version: 1,
    items: [{ id: 'x', title: 'Item Baru' }], todo: [], logs: [], pinned_tags: []
  });

  assert.equal(ok, false, 'Simpan harus ditolak selama jalur belum terdeteksi');
  assert.equal(posts.length, 0, 'Tidak boleh ada POST ke server selama jendela deteksi');
  assert.match(
    env.getStatusText(),
    /belum selesai dimuat/i,
    'User harus diberi tahu kenapa simpan belum bisa'
  );
});

test('setelah jalur terdeteksi: simpan diizinkan dan memakai jalur yang benar', async () => {
  const data = {
    version: 1,
    items: [{ id: 'a', title: 'Item Dari Server', tags: ['x'], links: [{ label: 'b', url: 'https://a.test' }], catatan: '', updated_at: '2026-10-01' }],
    todo: [], logs: [], pinned_tags: []
  };
  const posts = [];

  const env = createTestEnvironment(null, async (url, opts = {}) => {
    if (opts.method === 'POST') { posts.push(opts.body); return { ok: true, status: 200, text: async () => '' }; }
    await new Promise(r => setTimeout(r, 20));
    return { ok: true, status: 200, text: async () => JSON.stringify(data) };
  });

  await new Promise(r => setTimeout(r, 120));

  assert.equal(env.state.isModeReady, true, 'Setelah init selesai, simpan harus diizinkan');
  assert.equal(env.state.mode, 'Pro');

  const ok = await env.sandbox.saveData({
    ...data,
    items: [...data.items, { id: 'b', title: 'Item Baru', tags: ['x'], links: [{ label: 'b', url: 'https://b.test' }], catatan: '', updated_at: '2026-10-01' }]
  });

  assert.equal(ok, true, 'Simpan setelah init harus berhasil');
  assert.equal(posts.length, 1, 'Harus tepat satu POST');
  const body = JSON.parse(posts[0]);
  assert.equal(body.items.length, 2, 'POST harus memuat data lama DAN item baru, bukan hanya item baru');
});

// ---------------------------------------------------------------------------
// Tombol Buka pada path lokal berbeda per jalur (tiket 11 langkah 5 dan 6)
// ---------------------------------------------------------------------------

test('jalur Lite: path lokal memakai tombol Copy, bukan Buka', async () => {
  const data = {
    version: 1,
    items: [{
      id: 'lokal',
      title: 'Berkas lokal',
      tags: ['x'],
      links: [{ label: 'buka', url: 'D:\\Data\\laporan.xlsx' }],
      catatan: '',
      updated_at: '2026-10-01'
    }],
    todo: [], logs: [], pinned_tags: []
  };

  const env = createTestEnvironment(data);
  await env.settle();
  assert.equal(env.state.mode, 'Lite');

  await env.sandbox.switchTab('indeks');
  env.sandbox.renderIndeksView();

  const html = env.getOrCreateElement('result-list').innerHTML;
  assert.match(html, /btn-copy/, 'Tombol Copy harus ada di jalur Lite');
  assert.ok(!/btn-buka-local/.test(html), 'Tombol Buka path lokal tidak boleh muncul di Lite');
});

test('jalur Pro: path lokal memakai tombol Buka dan tetap ada tombol Copy', async () => {
  const data = {
    version: 1,
    items: [{
      id: 'lokal',
      title: 'Berkas lokal',
      tags: ['x'],
      links: [{ label: 'buka', url: 'D:\\Data\\laporan.xlsx' }],
      catatan: '',
      updated_at: '2026-10-01'
    }],
    todo: [], logs: [], pinned_tags: []
  };

  const env = createTestEnvironment(null, async () => ({
    ok: true, status: 200, text: async () => JSON.stringify(data)
  }));
  await env.settle();
  assert.equal(env.state.mode, 'Pro');

  env.sandbox.renderIndeksView();

  const html = env.getOrCreateElement('result-list').innerHTML;
  assert.match(html, /btn-buka-local/, 'Tombol Buka path lokal harus muncul di jalur Pro');
  assert.match(html, /btn-copy/, 'Tombol Copy harus tetap ada sebagai jalan keluar');
});

test('status bar Lite: jalur, jumlah item, waktu simpan', async () => {
  const env = createTestEnvironment();
  await env.settle();

  assert.match(env.getStatusText(), /^Lite - 0 item/, 'Status harus diawali jalur Lite dan jumlah item');
  assert.doesNotMatch(env.getStatusText(), /Pro/, 'Jalur Lite tidak boleh menampilkan kata Pro');
});

test('status bar Pro: jalur Pro dipakai saat backend menjawab', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await env.settle();

  // Harness ini fetch-nya selalu gagal, jadi jalur tetap Lite
  assert.match(env.getStatusText(), /^Lite - /, 'Tanpa backend, jalur harus Lite');
});

test('status bar memuat tiga bagian dipisah tanda hubung', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await env.settle();

  const ok = await env.sandbox.saveData(exampleData);
  assert.equal(ok, true, 'saveData harus sukses di jalur Lite');

  const text = env.getStatusText();
  const parts = text.split(' - ');
  assert.equal(parts.length, 3, `Status harus tiga bagian, dapat: "${text}"`);
  assert.equal(parts[0], 'Lite');
  assert.equal(parts[1], '4 item');
  assert.match(parts[2], /^tersimpan \d{2}:\d{2}$/, 'Bagian ketiga harus waktu simpan');
});

test('status bar: jam simpan tidak berubah saat hanya membaca', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await env.settle();

  const sebelum = env.getStatusText();
  await env.sandbox.loadData();
  await env.settle();
  const sesudah = env.getStatusText();

  assert.equal(sesudah, sebelum, 'Membaca data tidak boleh mengubah area status');
});

// ---------------------------------------------------------------------------
// Deteksi jalur ujung ke ujung (tiket 11 langkah 1)
// ---------------------------------------------------------------------------

function createModeEnvironment(fetchImpl, initialData = null) {
  return createTestEnvironment(initialData, fetchImpl);
}

test('jalur Pro: backend menjawab, data dibaca dari server dan status menyebut Pro', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  const env = createTestEnvironment(null, async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(exampleData)
  }));
  await env.settle();

  assert.equal(env.state.mode, 'Pro', 'Backend yang menjawab berarti jalur Pro');
  assert.equal(env.state.data.items.length, 4, 'Data harus dibaca dari backend');
  assert.match(env.getStatusText(), /^Pro - 4 item/, 'Area status harus menyebut jalur Pro');
  assert.doesNotMatch(env.getStatusText(), /Lite/, 'Jalur Pro tidak boleh menampilkan Lite');
});

test('jalur Lite: backend tidak menjawab, data dibaca dari localStorage', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  const env = createTestEnvironment(exampleData);
  const mode = await env.sandbox.detectStorageMode();

  assert.equal(mode, 'Lite', 'Tanpa backend harus berarti Lite');
  await env.sandbox.loadData();
  assert.equal(env.state.data.items.length, 4, 'Data harus dibaca dari localStorage');
  assert.match(env.getStatusText(), /^Lite - /, 'Area status harus menyebut Lite');
});

test('jalur Lite: backend menjawab galat tetap berarti Lite', async () => {
  const env = createTestEnvironment();
  const mode = await env.sandbox.detectStorageMode();
  assert.equal(mode, 'Lite', 'Status galat dari backend berarti Lite');
});

test('jalur Pro: backend hidup tapi gagal membaca, area status memberi tahu', async () => {
  const env = createTestEnvironment(null, async () => ({ ok: true, status: 200, text: async () => '' }));
  await env.settle();
  assert.equal(env.state.mode, 'Pro');

  // Sekarang backend mati
  env.sandbox.fetch = async () => ({ ok: false, status: 500, text: async () => '' });
  await env.sandbox.loadData();

  assert.match(
    env.getStatusText(),
    /Gagal membaca data dari server/,
    'Kegagalan membaca harus terlihat, bukan layar kosong yang menyesatkan'
  );
});

test('jalur Pro: penyimpanan lewat API, bukan localStorage', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const calls = [];

  const env = createTestEnvironment(null, async (url, opts = {}) => {
    calls.push({ url, method: opts.method, body: opts.body });
    return { ok: true, status: 200, text: async () => '' };
  });
  await env.settle();
  assert.equal(env.state.mode, 'Pro');

  const ok = await env.sandbox.saveData(exampleData);
  assert.equal(ok, true, 'Simpan lewat API harus sukses');

  const postCalls = calls.filter(c => c.method === 'POST');
  assert.equal(postCalls.length, 1, 'Harus satu permintaan POST ke backend');
  assert.equal(postCalls[0].url, '/api/data');
  assert.match(postCalls[0].body, /"version":1/, 'Badan POST berisi seluruh isi berkas');
  assert.equal(env.store.indeks_v1, undefined, 'Jalur Pro tidak boleh menulis ke localStorage');
  assert.match(env.getStatusText(), /Pro - 4 item - tersimpan \d{2}:\d{2}/, 'Status Pro menampilkan jam simpan');
});

test('jalur Pro: backend mati saat simpan, isian harus tetap di tempatnya', async () => {
  const env = createTestEnvironment(null, async () => ({
    ok: true, status: 200, text: async () => '{"version":1,"items":[],"todo":[],"logs":[],"pinned_tags":[]}'
  }));
  await env.settle();
  assert.equal(env.state.mode, 'Pro');

  // Backend mati setelah halaman siap
  env.sandbox.fetch = async () => { throw new TypeError('Failed to fetch'); };

  const ok = await env.sandbox.saveData({ version: 1, items: [{ id: 'x' }] });
  assert.equal(ok, false, 'Simpan harus melaporkan gagal');
  assert.match(env.getStatusText(), /Gagal menyimpan ke server/, 'Kegagalan harus tampil di area status');
});