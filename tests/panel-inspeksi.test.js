import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buatBackendPalsu } from './helpers/fake-backend.js';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'frontend', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'frontend', 'search.js');
const adapterJsPath = path.join(repoRoot, 'src', 'frontend', 'storage-adapter.js');

// Selector yang dipakai aplikasi saat mencari elemen dari event target.
const SELECTOR_BUATAN = [
  '.baris-tabel'
];

function buatLingkungan(dataAwal) {
  const elemen = new Map();
  // Event di peramban naik ke document. Tanpa ini, handler global aplikasi
  // tidak pernah jalan di sini dan bug seperti "fokus set lalu langsung
  // dibersihkan handler document" tidak akan pernah terlihat.
  const pendengarDoc = {};

  function buatElemen(id, tag = 'div') {
    let innerHTML = '';
    let textContent = '';
    let namaKelas = '';
    const gaya = { display: '' };
    const atribut = new Map();
    const pendengar = {};
    let nilai = '';

    const el = {
      id,
      tagName: tag.toUpperCase(),
      get value() { return nilai; },
      set value(v) { nilai = String(v); },
      dataset: {},
      style: gaya,
      // Mengisi innerHTML harus membuat elemen anak yang punya id, sama seperti
      // peramban. Tanpa itu, elemen yang hanya ada di dalam markup tidak pernah
      // ada di lingkungan uji.
      get innerHTML() { return innerHTML; },
      set innerHTML(v) {
        innerHTML = String(v);
        const cocok = [...innerHTML.matchAll(/id="([^"]+)"/g)];
        for (const m of cocok) {
          const anakId = m[1];
          if (!elemen.has(anakId)) elemen.set(anakId, buatElemen(anakId));
        }
      },
      get textContent() { return textContent; },
      set textContent(v) { textContent = String(v); },
      getAttribute: (a) => (a === 'id' ? id : (atribut.get(a) ?? null)),
      setAttribute: (a, v) => atribut.set(a, String(v)),
      removeAttribute: (a) => atribut.delete(a),
      addEventListener: (t, fn) => { (pendengar[t] ||= []).push(fn); },
      removeEventListener() {},
      dispatch: (t, payload = {}) => {
        (pendengar[t] || []).forEach((fn) => fn(payload));
        (pendengarDoc[t] || []).forEach((fn) => fn(payload));
      },
      appendChild: (c) => c,
      focus() {},
      click() { this.dispatch('click', { target: this }); },
      closest(sel) {
        // Selector bisa berisi beberapa kelas dipisah koma, seperti yang
        // dipakai aplikasi saat mencari elemen baris.
        const daftar = String(sel).split(',').map((s) => s.trim()).filter(Boolean);
        for (const s of daftar) {
          if (s.startsWith('#') && el.id === s.slice(1)) return el;
          if (s.startsWith('.') && el.classList.contains(s.slice(1))) return el;
        }
        return null;
      },
      querySelector: (sel) => ambil(String(sel).replace(/^#/, '')),
      querySelectorAll: () => [],
      classList: {
        contains: (c) => namaKelas.split(' ').filter(Boolean).includes(c),
        add(c) { if (!el.classList.contains(c)) namaKelas = (namaKelas ? namaKelas + ' ' : '') + c; },
        remove(c) { namaKelas = namaKelas.split(' ').filter((x) => x && x !== c).join(' '); },
        toggle(c, force) {
          const ada = el.classList.contains(c);
          const mau = force === undefined ? !ada : !!force;
          if (mau) el.classList.add(c); else el.classList.remove(c);
          return mau;
        }
      }
    };

    // className harus jadi getter, bukan salinan: kelas ditambahkan
    // setelah elemen dibuat.
    Object.defineProperty(el, 'className', {
      get() { return namaKelas; },
      set(v) { namaKelas = String(v); }
    });

    return el;
  }

  function ambil(id) {
    const kunci = String(id).replace(/^#/, '');
    if (!elemen.has(kunci)) elemen.set(kunci, buatElemen(kunci));
    return elemen.get(kunci);
  }

  const tab = ['tab-indeks', 'tab-todo', 'tab-log'].map((i) => ambil(i));
  const panel = ['panel-indeks', 'panel-todo', 'panel-log'].map((i) => ambil(i));
  ambil('status-bar');

  const store = {};
  if (dataAwal) store['indeks_v1'] = JSON.stringify(dataAwal);
  const backend = buatBackendPalsu(store);

  const doc = {
    readyState: 'complete',
    getElementById: (id) => elemen.get(id) || null,
    createElement: (t) => buatElemen(null, t),
    querySelectorAll: (sel) => {
      if (sel === '.nav-tab-btn') return tab;
      if (sel === '.tab-panel') return panel;
      return [];
    },
    querySelector: () => null,
    body: { appendChild() {}, removeChild() {} },
    addEventListener: (t, fn) => { (pendengarDoc[t] ||= []).push(fn); }
  };

  const sandbox = {
    document: doc,
    window: { addEventListener() {}, location: { search: '' } },
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
    navigator: { clipboard: { writeText: async () => {} } },
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, JSON, Date, Math, Object, Array, String, Number, Boolean, Error, RegExp,
    AbortController,
    module: { exports: {} },
    location: { protocol: 'http:', host: 'localhost:8080' },
    fetch: backend.fetch.bind(backend)
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(fs.readFileSync(searchJsPath, 'utf8'), sandbox, { filename: 'search.js' });
  vm.runInContext(fs.readFileSync(adapterJsPath, 'utf8'), sandbox, { filename: 'storage-adapter.js' });
  vm.runInContext(fs.readFileSync(appJsPath, 'utf8'), sandbox, { filename: 'app.js' });

  const api = {
    ambil,
    state: sandbox.module.exports.state,
    hasil: () => ambil('result-list'),
    panel: () => ambil('panel-inspeksi'),
    terkait: () => ambil('zone-terkait'),
    zonaKartu: () => ambil('zone-kartu'),
    split: () => ambil('indeks-split'),

    // Beralih mode lewat tombol sungguhan, bukan lewat kotak pencarian:
    // mengetik di kotak pencarian sengaja menghapus fokus, jadi tidak bisa
    // dipakai untuk menguji panel yang bergantung pada fokus.
    async gantiMode() {
      const zone = ambil('zone-kartu');
      // Target harus bereaksi seperti tombol sungguhan di dalam zone-kartu:
      // handler global memeriksa closest ke zone itu.
      const tombol = {
        closest: (sel) => {
          const daftar = String(sel).split(',').map((s) => s.trim());
          if (daftar.includes('#btn-toggle-view') || daftar.includes('.btn-view-toggle')) return zone;
          if (daftar.includes('#zone-kartu')) return zone;
          return null;
        }
      };
      zone.dispatch('click', { target: tombol });
      return this.state.viewMode;
    },

    async pilihItem(id) {
      // Baris harus memakai kelas yang sesuai mode: kartu memakai
      // result-item, tabel memakai baris-tabel. Kalau kelasnya tidak cocok,
      // handler global menganggap klik ini misses lalu menghapus fokus,
      // sehingga test tidak lagi menguji hal yang dimaksudnya.
      const kelasBaris = this.state.viewMode === 'table' ? 'baris-tabel' : 'result-item';
      const baris = {
        id,
        className: kelasBaris + ' accent-amber',
        getAttribute: (a) => (a === 'data-id' ? id : null),
        closest: (sel) =>
          String(sel).split(',').map((s) => s.trim()).includes('.' + kelasBaris)
            ? baris
            : null
      };
      baris.classList = {
        contains: (c) => String(baris.className).split(' ').includes(c)
      };
      ambil('result-list').dispatch('click', { target: baris });
    },

    ketik(query) {
      ambil('search-input').dispatch('input', { target: { value: query } });
    }
  };

  return api;
}

const contoh = () => JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

async function tick(n = 12) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

// ---------------------------------------------------------------------------

test('Tiket 01 - Switcher punya dua mode: kartu dan tabel', async () => {
  const env = buatLingkungan(contoh());
  await tick();

  const markup = env.zonaKartu().innerHTML;
  assert.match(markup, /id="btn-toggle-view"/, 'Switcher tampilan harus ada');
  assert.match(markup, /Kartu|Tabel/, 'Tombol switcher harus menyebut mode yang dituju');
});

test('Tiket 01 - Tombol switcher menukar mode kartu dan tabel', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  assert.equal(env.state.viewMode, 'grid', 'Mode awal harus kartu');

  await env.gantiMode();
  assert.equal(env.state.viewMode, 'table', 'Satu klik harus pindah ke tabel');

  await env.gantiMode();
  assert.equal(env.state.viewMode, 'grid', 'Klik kedua harus kembali ke kartu');
});

test('Tiket 01 - Mode tabel memakai elemen tabel dengan header kolom', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.gantiMode();

  const hasil = env.hasil();
  assert.match(hasil.innerHTML, /<table/, 'Area hasil harus memakai elemen tabel');
  assert.match(hasil.innerHTML, /<thead/, 'Tabel harus punya header');
  assert.match(hasil.innerHTML, /<th[^>]*>JUDUL/, 'Header kolom judul harus ada');
  assert.match(hasil.className, /tabel-mode/, 'Kelas area hasil harus menandai mode tabel');
});

test('Tiket 01 - Baris tabel memuat isi tiap kolom', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.gantiMode();

  const html = env.hasil().innerHTML;
  assert.match(html, /<tbody>/, 'Tabel harus punya badan');
  assert.match(html, /Sheet Admin TA/, 'Nama item harus muncul di baris');
  assert.match(html, /docs\.google\.com/, 'URL harus muncul di baris');
  assert.match(html, /#ta/, 'Tag harus muncul di baris');
});

test('Tiket 01 - Panel menerima "biasanya bareng ini" di mode tabel', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.gantiMode();
  await env.pilihItem('sheet-ta-admin');

  assert.match(env.panel().innerHTML, /biasanya bareng ini/i,
    'Panel harus menampilkan daftar item terkait');
});

test('Tiket 01 - Baris terkait tidak lagi tampil di bawah tabel pada mode tabel', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.gantiMode();
  await env.pilihItem('sheet-ta-admin');

  assert.notEqual(env.terkait().style.display, 'flex',
    'Baris terkait di bawah tabel harus disembunyikan pada mode tabel');
  assert.match(env.panel().innerHTML, /biasanya bareng ini/i,
    'Isinya harus pindah ke panel');
});

test('Tiket 01 - Mode kartu tetap memakai grid dan panel tetap kosong', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.pilihItem('sheet-ta-admin');

  assert.match(env.hasil().className, /bookmark-grid/, 'Mode kartu harus tetap memakai grid');
  assert.doesNotMatch(env.hasil().innerHTML, /<table/, 'Mode kartu tidak boleh memakai tabel');
  assert.equal(env.panel().innerHTML, '', 'Panel harus kosong pada mode kartu');
  assert.equal(env.terkait().style.display, 'flex',
    'Mode kartu harus tetap menampilkan baris terkait seperti sebelumnya');
});

test('Tiket 01 - Memilih baris mengisi panel, melepas fokus mengosongkannya', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.gantiMode();

  assert.equal(env.panel().innerHTML, '', 'Panel kosong sebelum ada item dipilih');

  await env.pilihItem('slims-bulian');
  assert.match(env.panel().innerHTML, /biasanya bareng ini/i, 'Panel harus terisi setelah memilih');

  await env.pilihItem(null);
  assert.equal(env.panel().innerHTML, '', 'Panel harus kosong setelah fokus dilepas');
});

test('Tiket 01 - Beralih mode mempertahankan item yang sedang dipilih', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  await env.pilihItem('sheet-ta-admin');
  await env.gantiMode();

  assert.equal(env.state.focusedItemId, 'sheet-ta-admin',
    'Item yang dipilih harus bertahan setelah beralih mode');
  assert.match(env.panel().innerHTML, /biasanya bareng ini/i,
    'Panel harus tetap terisi setelah beralih mode');
});

test('Tiket 01 - Beralih mode mempertahankan kata kunci pencarian', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  env.ketik('pkl');
  await tick();
  assert.match(env.hasil().innerHTML, /Job Training/, 'Mode kartu harus menemukan kata kunci');

  await env.gantiMode();
  assert.match(env.hasil().innerHTML, /Job Training/,
    'Mode tabel harus mempertahankan hasil pencarian yang sama');
});

test('Tiket 01 - Wadah split aktif hanya pada mode tabel', async () => {
  const env = buatLingkungan(contoh());
  await tick();
  assert.doesNotMatch(env.split().className, /indeks-split-aktif/,
    'Mode kartu tidak punya split aktif');

  await env.gantiMode();
  assert.match(env.split().className, /indeks-split-aktif/,
    'Mode tabel harus mengaktifkan split');
});