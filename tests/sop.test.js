// tests/sop.test.js - Field sop, daftar langkah bernomor di panel, dan pencarian
// lewat langkah (Tiket 04 dari spec panel inspeksi item).
//
// Aturan validasi sop dibaca dari src/shared/sop-cases.json, berkas yang sama
// dengan yang dibaca test Go di src/pro/sop_cases_test.go. Kalau salah satu sisi
// berubah sendiri, test di sisi itu langsung gagal.
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
const sopCasesPath = path.join(repoRoot, 'src', 'shared', 'sop-cases.json');

// Harness ini lebih tipis daripada di panel-inspeksi.test.js. Yang dibutuhkan
// di sini bukan tampilan, melainkan state, pencarian, dan penyimpanan, jadi
// cukup elemen yang bisa menyimpan innerHTML dan nilainya.
function buatLingkungan(dataAwal) {
  const elemen = new Map();
  // Event naik ke document. Listener-nya dicatat di sini supaya event dari
  // elemen mana pun bisa memanggilnya, seperti di peramban.
  const pendengarDoc = {};
  const ditambahkan = [];

  function buatElemen(id, tag = 'div') {
    let innerHTML = '';
    let className = '';
    let nilai = '';
    const gaya = { display: '' };
    const pendengar = {};

    const el = {
      id,
      tagName: tag.toUpperCase(),
      dataset: {},
      style: gaya,
      get innerHTML() { return innerHTML; },
      set innerHTML(v) {
        innerHTML = String(v);
        for (const m of innerHTML.matchAll(/id="([^"]+)"/g)) {
          const anakId = m[1];
          if (!elemen.has(anakId)) elemen.set(anakId, buatElemen(anakId));
        }
      },
      get textContent() { return ''; },
      set textContent(v) { innerHTML = String(v); },
      get value() { return nilai; },
      set value(v) { nilai = String(v); },
      get className() { return className; },
      set className(v) { className = String(v); },
      getAttribute: (a) => (a === 'id' ? id : null),
      setAttribute() {},
      removeAttribute() {},
      addEventListener: (t, fn) => { (pendengar[t] ||= []).push(fn); },
      removeEventListener() {},
      dispatch: (t, payload = {}) => {
        const ev = Object.assign({ preventDefault() {}, stopPropagation() {} }, payload);
        (pendengar[t] || []).forEach((fn) => fn(ev));
        (pendengarDoc[t] || []).forEach((fn) => fn(ev));
      },
      appendChild: (c) => c,
      removeChild() {},
      focus() {},
      click() { this.dispatch('click', { target: this }); },
      closest() { return null; },
      querySelector: (sel) => ambil(String(sel).replace(/^#/, '')),
      querySelectorAll: () => [],
      select() {},
      classList: {
        contains: (c) => className.split(' ').filter(Boolean).includes(c),
        add(c) { if (!el.classList.contains(c)) className = (className ? className + ' ' : '') + c; },
        remove(c) { className = className.split(' ').filter((x) => x && x !== c).join(' '); },
        toggle(c, f) {
          const ada = el.classList.contains(c);
          const mau = f === undefined ? !ada : !!f;
          if (mau) el.classList.add(c); else el.classList.remove(c);
          return mau;
        }
      }
    };
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
    // Elemen yang ditempel ke body dicatat supaya test bisa membaca isi
    // modal yang sebenarnya. Markup modal hidup di overlay, bukan di
    // elemen ber-id di dalamnya.
    body: {
      appendChild: (c) => { ditambahkan.push(c); return c; },
      removeChild: (c) => {
        const i = ditambahkan.indexOf(c);
        if (i >= 0) ditambahkan.splice(i, 1);
      }
    },
    execCommand: () => false,
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

  const api = sandbox.module.exports;

  return {
    ambil,
    store,
    api,
    ditambahkan,
    modalTerakhir: () => ditambahkan.find((c) =>
      String(c.className).split(' ').includes('modal-overlay')) || null,
    state: api.state,
    // search.js menaruh fungsi ini di window, lalu app.js menimpa
    // module.exports, jadi satu-satunya jalan masuk yang tersisa.
    search: (items, q) => sandbox.window.searchItems(items, q),
    ketik: (q) => ambil('search-input').dispatch('input', { target: { value: q } })
  };
}

async function tick(n = 12) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

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

// Isi field lalu picu input, supaya validateForm benar-benar dijalankan.
// Hanya mengisi value tidak cukup: tanpa event, tombol simpan tetap
// dinonaktifkan dan simpan berhenti sebelum menyentuh data.
function isiForm(env, id, value) {
  const el = env.ambil(id);
  el.value = value;
  el.dispatch('input', { target: { value } });
}

function dataDengan(items) {
  return { version: 1, items, todo: [], logs: [] };
}

async function panelUntuk(item) {
  const env = buatLingkungan(dataDengan([item]));
  await tick();
  env.state.focusedItemId = item.id;
  env.ketik('');
  await tick();
  return env.ambil('panel-inspeksi').innerHTML;
}

// ---------------------------------------------------------------------------
// Aturan validasi dibaca dari satu sumber kebenaran bersama dengan Go.
// ---------------------------------------------------------------------------

test('Tiket 04 - validateSop mengikuti sumber kebenaran di src/shared/sop-cases.json', async () => {
  const berkas = JSON.parse(fs.readFileSync(sopCasesPath, 'utf8'));
  assert.ok(Array.isArray(berkas.kasus), 'berkas kasus harus punya array kasus');
  assert.ok(berkas.kasus.length >= 10,
    'kasus harus cukup banyak; dengan sedikit kasus test ini tidak berarti apa-apa');

  const env = buatLingkungan(null);
  const validateSop = env.api.validateSop;
  assert.equal(typeof validateSop, 'function',
    'validateSop harus dapat dipanggil dari test lewat antarmuka modul');

  const menyimpang = [];
  for (const k of berkas.kasus) {
    const got = validateSop(k.masukan).valid;
    if (got !== k.harapan) {
      menyimpang.push(JSON.stringify(k.masukan) + ' dapat ' + got +
        ', sumber kebenaran ' + k.harapan + ' (' + k.alasan + ')');
    }
  }

  assert.deepEqual(menyimpang, [], 'validateSop menyimpang dari sumber kebenaran:\n' + menyimpang.join('\n'));
});

test('Tiket 04 - Batas 600 karakter berlaku tepat di ujungnya', async () => {
  const env = buatLingkungan(null);
  assert.equal(env.api.validateSop('a'.repeat(600)).valid, true, '600 karakter harus sah');
  assert.equal(env.api.validateSop('a'.repeat(601)).valid, false, '601 karakter harus ditolak');
});

// ---------------------------------------------------------------------------
// Field dan bentuk di panel
// ---------------------------------------------------------------------------

test('Tiket 04 - Panel menampilkan sop sebagai daftar bernomor', async () => {
  const html = await panelUntuk(buatItem({ sop: 'Cek form pengajuan\nKirim ke kepala bagian' }));

  assert.match(html, /<ol class="panel-sop">/, 'Sop harus dirender sebagai daftar terurut');
  assert.match(html, /panel-sop-langkah[^>]*>Cek form pengajuan</, 'Langkah pertama harus tampil');
  assert.match(html, /panel-sop-langkah[^>]*>Kirim ke kepala bagian</, 'Langkah kedua harus tampil');
});

test('Tiket 04 - Nomor yang diketik pengguna dibuang sebelum ditampilkan', async () => {
  const html = await panelUntuk(
    buatItem({ sop: '1. Cek form pengajuan\n2) Kirim ke kepala bagian' })
  );

  // Kalau nomor tidak dibuang, teksnya tampil jadi "1. 1. Cek form pengajuan".
  assert.doesNotMatch(html, />1\. Cek form</, 'Nomor dengan titik tidak boleh ikut tampil');
  assert.doesNotMatch(html, />2\) Kirim</, 'Nomor dengan kurung tutup juga harus dibuang');
  assert.match(html, />Cek form pengajuan</, 'Teks langkah harus tetap utuh');
  assert.match(html, />Kirim ke kepala bagian</, 'Teks langkah kedua harus tetap utuh');
});

test('Tiket 04 - Baris kosong dibuang dan nomor tidak melompat', async () => {
  const html = await panelUntuk(
    buatItem({ sop: 'Cek form\n\n   \n\nKirim ke kepala bagian\n' })
  );

  assert.equal((html.match(/panel-sop-langkah/g) || []).length, 2,
    'Baris kosong tidak boleh jadi langkah');

  // Penomoran datang dari elemen <ol>, jadi nomornya berurutan tanpa perlu
  // dihitung di skrip. Kalau ada angka di dalam <li>, penomoran ditulis
  // manual dan bisa keluar dari urutan.
  assert.equal((html.match(/<li class="panel-sop-langkah">[^<]*\d/g) || []).length, 0,
    'Nomor tidak boleh ditulis manual di dalam langkah');
});

test('Tiket 04 - Item tanpa sop tidak menampilkan bagian langkah kerja', async () => {
  const html = await panelUntuk(buatItem({}));
  assert.doesNotMatch(html, /panel-sop/, 'Item tanpa sop tidak boleh punya bagian langkah kerja');
});

test('Tiket 04 - Sop yang isinya hanya spasi dianggap tidak diisi', async () => {
  const html = await panelUntuk(buatItem({ sop: '   \n  ' }));
  assert.doesNotMatch(html, /panel-sop/, 'Sop kosong tidak boleh jadi bagian kosong');
});

test('Tiket 04 - Modal ubah punya area teks sop dengan petunjuk satu baris satu langkah', async () => {
  const env = buatLingkungan(dataDengan([buatItem({})]));
  await tick();

  env.api.openItemModal(env.state.data.items[0]);
  await tick();

  const overlay = env.modalTerakhir();
  assert.ok(overlay, 'Modal ubah harus benar-benar terbuka');
  const modal = overlay.innerHTML;
  assert.match(modal, /<textarea id="item-sop"/, 'Modal harus punya area teks untuk sop');
  assert.match(modal, /Satu baris satu langkah/, 'Petunjuk satu baris satu langkah harus ada');
  assert.match(modal, /maxlength="600"/, 'Area teks harus membatasi 600 karakter');
});

test('Tiket 04 - Sop bertahan setelah disimpan lalu dimuat ulang', async () => {
  const env = buatLingkungan(dataDengan([buatItem({})]));
  await tick();

  const isi = 'Cek form pengajuan\nKirim ke kepala bagian\nArsipkan berkasnya';
  env.api.openItemModal(env.state.data.items[0]);
  await tick();

  const asli = env.state.data.items[0];
  isiForm(env, 'item-title', asli.title);
  isiForm(env, 'item-tags', asli.tags.join(', '));
  isiForm(env, 'link-label-0', asli.links[0].label);
  isiForm(env, 'link-url-0', asli.links[0].url);
  isiForm(env, 'item-sop', isi);
  env.ambil('btn-item-save').dispatch('click');
  await tick();
  await tick();

  // Yang tersimpan di berkas, bukan hanya di memori.
  const tersimpan = JSON.parse(env.store['indeks_v1']);
  assert.equal(tersimpan.items[0].sop, isi, 'Sop harus tersimpan di berkas data');

  // Muat ulang dari backend, lalu pastikan sop tidak hilang.
  await env.api.loadData();
  await tick();

  const item = env.state.data.items.find((i) => i.id === 'item-uji');
  assert.ok(item, 'Item harus tetap ada setelah muat ulang');
  assert.equal(item.sop, isi, 'Sop harus bertahan setelah dimuat ulang');
});

test('Tiket 04 - Sop juga tersimpan saat menambah item baru', async () => {
  const env = buatLingkungan(dataDengan([buatItem({})]));
  await tick();

  const isi = 'Cek form pengajuan\nKirim ke kepala bagian';
  env.api.openItemModal();
  await tick();

  isiForm(env, 'item-title', 'Item Baru');
  isiForm(env, 'item-tags', 'ta, harian');
  isiForm(env, 'link-label-0', 'Buka');
  isiForm(env, 'link-url-0', 'https://contoh.test/baru');
  isiForm(env, 'item-sop', isi);
  env.ambil('btn-item-save').dispatch('click');
  await tick();
  await tick();

  const tersimpan = JSON.parse(env.store['indeks_v1']);
  const baru = tersimpan.items.find((i) => i.title === 'Item Baru');
  assert.ok(baru, 'Item baru harus ada di berkas data');
  assert.equal(baru.sop, isi, 'Sop harus ikut tersimpan saat menambah item baru');
});

test('Tiket 04 - Data lama tanpa sop tetap terbaca tanpa migrasi', async () => {
  const lama = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  for (const item of lama.items) {
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'sop'), false,
      'data contoh harus tetap tanpa field sop, supaya jalur data lama ikut teruji');
  }

  const env = buatLingkungan(lama);
  await tick();

  assert.equal(env.state.storageBlocked, false, 'data lama harus terbaca, bukan ditolak');
  assert.equal(env.state.data.items.length, lama.items.length, 'seluruh item lama harus tetap ada');

  env.state.focusedItemId = lama.items[0].id;
  env.ketik('');
  await tick();
  assert.doesNotMatch(env.ambil('panel-inspeksi').innerHTML, /panel-sop/,
    'Item lama tanpa sop tidak boleh menampilkan bagian langkah kerja');
});

// ---------------------------------------------------------------------------
// Pencarian
// ---------------------------------------------------------------------------

async function cariDenganDuaItem(q) {
  const env = buatLingkungan(dataDengan([
    buatItem({ id: 'a', title: 'Tanpa Kunci', catatan: 'catatan biasa' }),
    buatItem({
      id: 'b',
      title: 'Dengan Langkah',
      catatan: 'catatan biasa',
      sop: 'Kirim ke kepala bagian'
    })
  ]));
  await tick();
  return env.search(env.state.data.items, q);
}

test('Tiket 04 - Mencari istilah yang hanya ada di sop menemukan itemnya', async () => {
  const hasil = await cariDenganDuaItem('kepala');
  assert.equal(hasil.length, 1, 'Item yang hanya punya kunci di sop harus ditemukan');
  assert.equal(hasil[0].id, 'b', 'Item yang ditemukan harus yang punya langkah itu');
});

test('Tiket 04 - Item yang ditemukan lewat sop ditandai sebagai lapis ketiga', async () => {
  const hasil = await cariDenganDuaItem('kepala');
  assert.equal(hasil[0].lapis, 3, 'Hasil dari sop harus lapis ketiga');
  assert.equal(hasil[0].penanda, 'dari langkah kerja',
    'Penanda harus menyebut dari mana item ditemukan');
});

test('Tiket 04 - Pencarian lewat sop tetap tidak membedakan huruf besar dan kecil', async () => {
  for (const kueri of ['KEPALA', 'Kepala', 'kepala']) {
    const hasil = await cariDenganDuaItem(kueri);
    assert.equal(hasil.length, 1, 'Kueri "' + kueri + '" harus menemukan item yang sama');
    assert.equal(hasil[0].id, 'b');
  }
});

test('Tiket 04 - Item yang cocok lewat catatan tetap berpenanda dari catatan', async () => {
  const hasil = await cariDenganDuaItem('biasa');
  assert.ok(hasil.length >= 2, 'Kedua item punya catatan itu, jadi keduanya harus cocok');
  const dariCatatan = hasil.filter((i) => i.penanda === 'dari catatan');
  assert.equal(dariCatatan.length, hasil.length,
    'Item yang cocok lewat catatan harus tetap berpenanda "dari catatan"');
});

test('Tiket 04 - Item yang cocok catatan dan sop tidak muncul dua kali', async () => {
  const env = buatLingkungan(dataDengan([
    buatItem({ id: 'ganda', catatan: 'kata kunci', sop: 'kata kunci di langkah' })
  ]));
  await tick();

  const hasil = env.search(env.state.data.items, 'kunci');
  assert.equal(hasil.length, 1, 'Satu item tidak boleh muncul dua kali');
  assert.equal(hasil[0].penanda, 'dari catatan', 'Catatan didahulukan kalau dua-duanya cocok');
});

test('Tiket 04 - Badge pada hasil menyebut asal penemuan', async () => {
  const env = buatLingkungan(dataDengan([
    buatItem({ id: 'b', title: 'Dengan Langkah', catatan: 'catatan biasa', sop: 'Kirim ke kepala bagian' })
  ]));
  await tick();

  env.ketik('kepala');
  await tick();

  const html = env.ambil('result-list').innerHTML;
  assert.match(html, /dari langkah kerja/, 'Baris harus berlabel dari langkah kerja');
  assert.doesNotMatch(html, /dari catatan/, 'Label dari catatan tidak boleh muncul pada item ini');
});