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
const styleCssPath = path.join(repoRoot, 'src', 'frontend', 'style.css');

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
        // Event sungguhan selalu punya preventDefault dan stopPropagation,
        // jadi payload dispatched harus menyediakannya juga.
        const ev = Object.assign({ preventDefault() {}, stopPropagation() {} }, payload);
        (pendengar[t] || []).forEach((fn) => fn(ev));
        (pendengarDoc[t] || []).forEach((fn) => fn(ev));
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

  // document tidak punya execCommand, jadi copyToClipboard selalu jatuh ke
  // navigator.clipboard. Dua jejak ini supaya test bisa memeriksa URL mana
  // yang benar-benar disalin. Elemen yang ditempel ke body ikut dicatat
  // supaya test bisa memeriksa modal mana yang benar-benar dibuka.
  const tersalin = [];
  const ditambahkan = [];

  const doc = {
    readyState: 'complete',
    getElementById: (id) => elemen.get(id) || null,
    createElement: (t) => buatElemen(null, t),
    querySelectorAll: (sel) => {
      if (sel === '.nav-tab-btn') return tab;
      if (sel === '.tab-panel') return panel;
      return [];
    },
    querySelector: (sel) => {
      // Modal yang ditempel ke body harus bisa ditemukan, sama seperti di
      // peramban. Aplikasi yang memeriksa ini akan memakai nilai itu.
      if (sel === '.modal-overlay') {
        return ditambahkan.find((c) =>
          String(c.className).split(' ').filter(Boolean).includes('modal-overlay')) || null;
      }
      return null;
    },
    // Elemen yang ditempel ke body dicatat supaya test bisa memeriksa modal
    // mana yang benar-benar dibuka, bukan menebak dari elemen yang ada.
    body: {
      appendChild: (c) => { ditambahkan.push(c); return c; },
      removeChild: (c) => {
        const i = ditambahkan.indexOf(c);
        if (i >= 0) ditambahkan.splice(i, 1);
      }
    },
    addEventListener: (t, fn) => { (pendengarDoc[t] ||= []).push(fn); }
  };

  const sandbox = {
    document: doc,
    window: { addEventListener() {}, location: { search: '' } },
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
    navigator: { clipboard: { writeText: async (t) => { tersalin.push(String(t)); } } },
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
    tersalin,
    ditambahkan,
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

  // Tiket 03 mengubah arti "panel kosong": panel tidak lagi menjadi string
  // kosong, tapi menampilkan keadaan kosong yang menyebutkan tujuannya.
  assert.match(env.panel().innerHTML, /panel-kosong/,
    'Sebelum ada item dipilih, panel menampilkan keadaan kosong');

  await env.pilihItem('slims-bulian');
  assert.match(env.panel().innerHTML, /biasanya bareng ini/i, 'Panel harus terisi setelah memilih');

  await env.pilihItem(null);
  assert.match(env.panel().innerHTML, /panel-kosong/,
    'Setelah fokus dilepas, panel kembali ke keadaan kosong');
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
// ---------------------------------------------------------------------------
// Tiket 02: isi panel dan urutan pemangkasan kolom tabel
// ---------------------------------------------------------------------------

function buatItem(ubah) {
  return Object.assign({
    id: 'item-uji',
    title: 'Judul Uji',
    tags: ['ta'],
    links: [{ label: 'Buka', url: 'https://contoh.test/a' }],
    catatan: 'Catatan uji',
    updated_at: '2026-10-01'
  }, ubah || {});
}

function buatData(items, pinnedTags) {
  return {
    version: 1,
    items: items,
    todo: [],
    logs: [],
    pinned_tags: pinnedTags || ['ta']
  };
}

async function panelUntuk(items, pinnedTags) {
  const env = buatLingkungan(buatData(items, pinnedTags));
  await tick();
  await env.gantiMode();
  await env.pilihItem(items[0].id);
  return { env, html: env.panel().innerHTML };
}

// Ambang lebar layar di bawah mana sebuah kolom disembunyikan. Mengembalikan
// null kalau tidak ada media query yang menyembunyikannya, artinya kolom itu
// tidak pernah dipangkas.
function ambangPangkas(css, kelas) {
  const pola = /@media\s*\(max-width:\s*(\d+)px\)\s*\{/g;
  let cocok;
  let ambang = null;
  while ((cocok = pola.exec(css)) !== null) {
    let kedalaman = 1;
    let i = cocok.index + cocok[0].length;
    while (i < css.length && kedalaman > 0) {
      if (css[i] === '{') kedalaman++;
      else if (css[i] === '}') kedalaman--;
      i++;
    }
    const isi = css.slice(cocok.index + cocok[0].length, i - 1);
    const aturan = new RegExp('\\.' + kelas + '\\s*\\{[^}]*display:\\s*none');
    if (aturan.test(isi)) {
      const nilai = Number(cocok[1]);
      ambang = ambang === null ? nilai : Math.min(ambang, nilai);
    }
  }
  return ambang;
}

test('Tiket 02 - Panel menampilkan judul item tanpa dipotong', async () => {
  const judul = 'Katalog Perpustakaan Pusat Revisi Keenam Tahun Anggaran Dua Ribu Dua Puluh Enam';
  const { html } = await panelUntuk([buatItem({ title: judul })]);

  assert.match(html, /class="panel-judul"/, 'Panel harus punya bagian judul');
  assert.ok(html.includes(judul), 'Judul harus tampil utuh di panel, bukan dipotong');
});

test('Tiket 02 - Panel menampilkan setiap tautan sebagai baris berisi label dan URL', async () => {
  const { html } = await panelUntuk([
    buatItem({
      links: [
        { label: 'Katalog', url: 'https://contoh.test/katalog' },
        { label: 'Pedoman', url: 'https://contoh.test/pedoman' }
      ]
    })
  ]);

  assert.equal((html.match(/panel-tautan-baris/g) || []).length, 2,
    'Setiap tautan harus punya barisnya sendiri di panel');
  assert.match(html, /Katalog/, 'Label tautan pertama harus tampil');
  assert.match(html, /https:\/\/contoh\.test\/katalog/, 'URL tautan pertama harus tampil utuh');
  assert.match(html, /Pedoman/, 'Label tautan kedua harus tampil');
  assert.match(html, /https:\/\/contoh\.test\/pedoman/, 'URL tautan kedua harus tampil utuh');
});

test('Tiket 02 - Setiap tautan di panel punya tombol salin', async () => {
  const { html } = await panelUntuk([
    buatItem({
      links: [
        { label: 'Katalog', url: 'https://contoh.test/katalog' },
        { label: 'Pedoman', url: 'https://contoh.test/pedoman' }
      ]
    })
  ]);

  assert.equal((html.match(/btn-aksi btn-copy/g) || []).length, 2,
    'Setiap baris tautan harus punya satu tombol salin');
});

test('Tiket 02 - Klik tombol salin di panel menyalin URL tautan itu', async () => {
  const env = buatLingkungan(buatData([
    buatItem({
      links: [
        { label: 'Katalog', url: 'https://contoh.test/katalog' },
        { label: 'Pedoman', url: 'https://contoh.test/pedoman' }
      ]
    })
  ]));
  await tick();
  await env.gantiMode();
  await env.pilihItem('item-uji');
  assert.equal(env.tersalin.length, 0, 'Belum ada yang disalin');

  const target = { getAttribute: () => 'https://contoh.test/pedoman' };
  target.closest = (sel) =>
    (String(sel).split(',').map((s) => s.trim()).includes('.btn-copy') ? target : null);
  env.panel().dispatch('click', { target });
  await tick();

  assert.equal(env.tersalin.length, 1, 'Satu klik harus memicu satu kali salin');
  assert.equal(env.tersalin[0], 'https://contoh.test/pedoman',
    'Salin harus memakai URL tautan yang diklik, bukan tautan pertama');
});

test('Tiket 02 - Tautan web di panel bisa dibuka langsung', async () => {
  const { html } = await panelUntuk([
    buatItem({
      links: [{ label: 'Katalog', url: 'https://contoh.test/katalog' }]
    })
  ]);

  assert.match(html, /<a[^>]*class="btn-aksi btn-buka"[^>]*href="https:\/\/contoh\.test\/katalog"/,
    'Tautan web harus jadi elemen a yang bisa diklik');
  assert.match(html, /target="_blank"/, 'Tautan web harus terbuka di tab baru');
});

test('Tiket 02 - Path lokal di panel memakai tombol, bukan tautan', async () => {
  const { html } = await panelUntuk([
    buatItem({
      links: [{ label: 'Berkas lokal', url: 'D:\\Perpustakaan\\katalog' }]
    })
  ]);

  assert.match(html, /btn-buka-local/,
    'Path lokal harus memakai tombol, bukan tautan');
  assert.doesNotMatch(html, /href="D:\\Perpustakaan/,
    'Path lokal tidak boleh jadi href, peramban tidak bisa membukanya');
});

test('Tiket 02 - Panel menampilkan seluruh tag, termasuk yang belum terdaftar', async () => {
  const { html } = await panelUntuk([buatItem({ tags: ['ta', 'koleksi-khas', 'arsip'] })], ['ta']);

  assert.match(html, /ta/, 'Tag terdaftar harus tampil');
  assert.match(html, /koleksi-khas/, 'Tag yang belum terdaftar harus tetap tampil');
  assert.match(html, /arsip/, 'Tag kedua yang belum terdaftar harus tetap tampil');
});

test('Tiket 02 - Panel menampilkan catatan tanpa dipotong', async () => {
  const catatan = 'Ambil di rak nomor tujuh, minta kartu tanda pinjam, lalu serahkan ke bagian katalog';
  const { html } = await panelUntuk([buatItem({ catatan })]);

  assert.match(html, /class="panel-catatan"/, 'Panel harus punya bagian catatan');
  assert.ok(html.includes(catatan), 'Catatan harus tampil utuh di panel, bukan dipotong');
});

test('Tiket 02 - Item tanpa catatan tidak menampilkan bagian catatan kosong', async () => {
  const { html } = await panelUntuk([buatItem({ catatan: '' })]);

  assert.doesNotMatch(html, /panel-catatan/, 'Item tanpa catatan tidak boleh punya bagian catatan');
  assert.doesNotMatch(html, />\s*CATATAN\s*</, 'Judul bagian catatan harus ikut hilang');
});

test('Tiket 02 - Baris terpilih ditandai secara visual dan lewat atribut', async () => {
  const { env } = await panelUntuk([buatItem({}), buatItem({ id: 'item-lain', title: 'Lain' })]);
  const html = env.hasil().innerHTML;

  assert.match(html, /<tr class="baris-tabel[^"]*focused[^"]*"[^>]*aria-selected="true"/,
    'Baris terpilih harus punya kelas focused dan aria-selected true');
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1,
    'Hanya satu baris yang boleh ditandai terpilih');
});

test('Tiket 02 - Tabel memuat judul, URL, tag, catatan, dan aksi', async () => {
  const { env } = await panelUntuk([buatItem({})]);
  const html = env.hasil().innerHTML;

  for (const kolom of ['JUDUL &amp; KATEGORI', 'TAUTAN', 'CATATAN', 'TAGAR', 'AKSI']) {
    assert.ok(html.includes(kolom + '</th>'), 'Kolom ' + kolom + ' harus ada di header tabel');
  }
  assert.equal((html.match(/<th[\s>]/g) || []).length, 5, 'Tabel harus punya lima kolom');
});

test('Tiket 02 - Urutan pemangkasan: URL dulu, lalu tag, lalu catatan', () => {
  const css = fs.readFileSync(styleCssPath, 'utf8');

  const url = ambangPangkas(css, 'sel-alamat');
  const tag = ambangPangkas(css, 'sel-tag');
  const catatan = ambangPangkas(css, 'sel-catatan');

  assert.notEqual(url, null, 'Kolom URL harus punya aturan pemangkasan');
  assert.notEqual(tag, null, 'Kolom tag harus punya aturan pemangkasan');
  assert.notEqual(catatan, null, 'Kolom catatan harus punya aturan pemangkasan');

  assert.ok(url > tag, 'URL harus dipangkas lebih dulu, jadi ambangnya lebih tinggi dari tag');
  assert.ok(tag > catatan, 'Tag harus dipangkas sebelum catatan, jadi ambangnya lebih tinggi dari catatan');
});

test('Tiket 02 - Judul dan aksi tidak pernah dipangkas', () => {
  const css = fs.readFileSync(styleCssPath, 'utf8');

  assert.equal(ambangPangkas(css, 'sel-judul'), null, 'Kolom judul tidak boleh pernah disembunyikan');
  assert.equal(ambangPangkas(css, 'sel-aksi'), null, 'Kolom aksi tidak boleh pernah disembunyikan');
});

test('Tiket 02 - Klik tombol di panel tidak menghapus item terpilih', async () => {
  const env = buatLingkungan(buatData([
    buatItem({ links: [{ label: 'Katalog', url: 'https://contoh.test/katalog' }] })
  ]));
  await tick();
  await env.gantiMode();
  await env.pilihItem('item-uji');
  assert.equal(env.state.focusedItemId, 'item-uji', 'Item harus terpilih sebelum diklik');
  const isiSebelum = env.panel().innerHTML;
  assert.ok(isiSebelum.includes('panel-tautan-baris'), 'Panel harus terisi sebelum diklik');

  // Target adalah tombol di dalam panel, seperti di peramban.
  const target = { getAttribute: () => 'https://contoh.test/katalog' };
  target.closest = (sel) => {
    const daftar = String(sel).split(',').map((s) => s.trim());
    if (daftar.includes('.btn-copy') || daftar.includes('#panel-inspeksi')) return target;
    return null;
  };
  env.panel().dispatch('click', { target });
  await tick();

  assert.equal(env.state.focusedItemId, 'item-uji',
    'Klik di panel tidak boleh menghapus item yang sedang terpilih');
  assert.ok(env.panel().innerHTML.includes('panel-tautan-baris'),
    'Panel tidak boleh ikut kosong setelah diklik');
});

// ---------------------------------------------------------------------------
// Tiket 03: keadaan kosong, pintasan ubah, dan ketahanan panel
// ---------------------------------------------------------------------------

const KALIMAT_KOSONG = 'Pilih salah satu baris untuk melihat detailnya';

async function envTabel(items, pinnedTags) {
  const env = buatLingkungan(buatData(items, pinnedTags));
  await tick();
  await env.gantiMode();
  return env;
}

function contohEmpat() {
  return [
    buatItem({ id: 'slims-bulian', title: 'SLiMS Bulian', tags: ['slims', 'harian'] }),
    buatItem({ id: 'repo-uniga', title: 'Repository UNIGA', tags: ['repository', 'ta'] }),
    buatItem({ id: 'sheet-job-training', title: 'Sheet Job Training', tags: ['sheet', 'magang'] })
  ];
}

test('Tiket 03 - Panel menampilkan kalimat keadaan kosong saat tidak ada item dipilih', async () => {
  const env = await envTabel(contohEmpat());
  const html = env.panel().innerHTML;

  assert.ok(html.includes(KALIMAT_KOSONG),
    'Panel harus menjelaskan tujuannya, bukan diam saja atau hilang');
});

test('Tiket 03 - Keadaan kosong menyebutkan berapa hasil pencarian', async () => {
  const env = await envTabel(contohEmpat());
  env.ketik('slims');
  await tick();

  const html = env.panel().innerHTML;
  assert.ok(html.includes(KALIMAT_KOSONG), 'Kalimat keadaan kosong harus tetap ada');
  assert.match(html, /1 hasil/,
    'Keadaan kosong harus menyebut jumlah hasil pencarian, tidak boleh kosong saja');
});

test('Tiket 03 - Panel punya tombol ubah yang membuka modal item yang sama', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  assert.match(env.panel().innerHTML, /panel-ubah/,
    'Panel harus punya tombol ubah, tidak boleh read-only tanpa jalan keluar');

  const target = { getAttribute: () => 'slims-bulian' };
  target.closest = (sel) =>
    (String(sel).split(',').map((s) => s.trim()).includes('.panel-ubah') ? target : null);
  env.panel().dispatch('click', { target });
  await tick();

  const modal = env.ditambahkan.find((c) =>
    String(c.className).split(' ').includes('modal-overlay'));
  assert.ok(modal, 'Tombol ubah di panel harus membuka sebuah modal');
  assert.ok(modal.innerHTML.includes('Ubah Item'),
    'Modal yang terbuka harus modal ubah item, bukan judul lain');
  assert.ok(modal.innerHTML.includes('modal-item-box'),
    'Modal harus memakai kotak form item yang sama seperti tombol ubah di baris');
  assert.ok(modal.innerHTML.includes('value="SLiMS Bulian"'),
    'Modal harus terisi judul item yang sedang dipilih');
});

test('Tiket 03 - Tombol ubah di panel bukan jalur edit kedua', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  const target = { getAttribute: () => 'slims-bulian' };
  target.closest = (sel) =>
    (String(sel).split(',').map((s) => s.trim()).includes('.panel-ubah') ? target : null);
  env.panel().dispatch('click', { target });
  await tick();

  const modal = env.ditambahkan.find((c) =>
    String(c.className).split(' ').includes('modal-overlay'));

  // Satu jalur edit berarti satu modal. Kalau panel membuka form sendiri,
  // validasi akan ditulis dua kali dan bisa berbeda antar tempat.
  assert.equal(env.ditambahkan.length, 1, 'Panel harus membuka tepat satu modal');
  assert.equal(modal.innerHTML.split('id="item-title"').length - 1, 1,
    'Form item harus muncul tepat sekali, jadi tidak ada jalur edit kedua');
  assert.equal(modal.innerHTML.split('id="item-tags"').length - 1, 1,
    'Field tag harus muncul tepat sekali');
});

test('Tiket 03 - Menggulir tabel tidak mengosongkan panel', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');
  const sebelum = env.panel().innerHTML;
  assert.ok(sebelum.includes('SLiMS Bulian'), 'Panel harus terisi sebelum menggulir');

  env.hasil().dispatch('scroll', {});
  await tick();

  assert.ok(env.panel().innerHTML.includes('SLiMS Bulian'),
    'Menggulir tabel tidak boleh mengosongkan panel');
  assert.equal(env.state.focusedItemId, 'slims-bulian',
    'Menggulir tabel tidak boleh melepas item terpilih');
});

test('Tiket 03 - Mengetik tidak mengosongkan panel selama item masih cocok', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  env.ketik('sli');
  await tick();

  assert.equal(env.state.focusedItemId, 'slims-bulian',
    'Item yang masih cocok dengan hasil tidak boleh kehilangan fokus');
  assert.ok(env.panel().innerHTML.includes('SLiMS Bulian'),
    'Panel harus tetap menampilkan item terpilih saat mengetik');
});

test('Tiket 03 - Memilih baris lain mengganti isi panel', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');
  assert.ok(env.panel().innerHTML.includes('SLiMS Bulian'));

  await env.pilihItem('repo-uniga');

  assert.equal(env.state.focusedItemId, 'repo-uniga', 'Fokus harus pindah ke baris baru');
  const html = env.panel().innerHTML;
  assert.ok(html.includes('Repository UNIGA'), 'Panel harus menampilkan item yang baru dipilih');
  assert.doesNotMatch(html, /SLiMS Bulian/, 'Isi item sebelumnya tidak boleh ikut tertinggal');
});

test('Tiket 03 - Memilih baris lagi mengisi panel kembali dengan data yang benar', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  // Lepas fokus dengan klik di luar area hasil.
  env.hasil().dispatch('click', { target: { closest: () => null } });
  await tick();
  assert.ok(env.panel().innerHTML.includes(KALIMAT_KOSONG),
    'Setelah fokus dilepas panel harus kembali ke keadaan kosong');

  await env.pilihItem('repo-uniga');

  const html = env.panel().innerHTML;
  assert.ok(html.includes('Repository UNIGA'), 'Panel harus terisi lagi setelah dipilih ulang');
  assert.ok(html.includes('contoh.test/a'),
    'Panel harus menampilkan tautan item yang dipilih ulang, bukan sisa item sebelumnya');
});

test('Tiket 03 - Item terpilih hilang dari hasil, panel menyebut alasannya', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  env.ketik('job training');
  await tick();

  assert.equal(env.state.focusedItemId, null,
    'Item yang tidak lagi cocok harus kehilangan fokus');
  const html = env.panel().innerHTML;
  assert.match(html, /tidak lagi ada di hasil/,
    'Panel harus menyebut bahwa itemnya tidak lagi ada di hasil');
  assert.doesNotMatch(html, new RegExp(KALIMAT_KOSONG),
    'Alasan item hilang tidak boleh memakai kalimat keadaan kosong generik');
});

test('Tiket 03 - Keadaan kosong generik hanya muncul karena satu sebab', async () => {
  const env = await envTabel(contohEmpat());

  // Sebab satu: tidak ada yang dipilih.
  assert.ok(env.panel().innerHTML.includes(KALIMAT_KOSONG),
    'Tanpa item terpilih, kalimat keadaan kosong harus muncul');
  assert.equal(env.state.focusedItemId, null, 'Sebabnya memang tidak ada item terpilih');

  // Item yang hilang punya sebab lain, jadi kalimat yang sama tidak boleh muncul.
  await env.pilihItem('slims-bulian');
  env.ketik('job training');
  await tick();

  assert.equal(env.state.focusedItemId, null, 'Fokus sudah lepas karena item hilang dari hasil');
  assert.doesNotMatch(env.panel().innerHTML, new RegExp(KALIMAT_KOSONG),
    'Kalimat keadaan kosong hanya boleh muncul karena tidak ada yang dipilih');

  // Dan kembali ke sebab satu ketika memang tidak ada yang dipilih lagi.
  env.ketik('');
  await tick();
  assert.ok(env.panel().innerHTML.includes(KALIMAT_KOSONG),
    'Setelah pencarian dilepas, keadaan kosong kembali ke sebab aslinya');
});

test('Tiket 03 - Panel memakai keadaan kosong hanya di mode tabel', async () => {
  const env = await envTabel(contohEmpat());
  await env.pilihItem('slims-bulian');

  const htmlTabel = env.panel().innerHTML;
  assert.ok(htmlTabel.includes('SLiMS Bulian'), 'Mode tabel mengisi panel');

  await env.gantiMode();
  assert.equal(env.panel().innerHTML, '',
    'Mode kartu tidak punya panel, jadi keadaan kosong panel tidak muncul di sana');
  assert.doesNotMatch(env.panel().innerHTML, new RegExp(KALIMAT_KOSONG),
    'Kalimat panel tidak boleh bocor ke mode kartu');
  assert.notEqual(env.terkait().style.display, 'flex',
    'Mode kartu tetap memakai baris item terkait di bawah daftar, bukan panel');
});
