import test from 'node:test';
import assert from 'node:assert/strict';
import { buatBackendPalsu } from './helpers/fake-backend.js';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'frontend', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'frontend', 'search.js');
const adapterJsPath = path.join(repoRoot, 'src', 'frontend', 'storage-adapter.js');

function createTestEnvironment(initialData = null, options = {}) {
  const elements = new Map();

  function createElementObj(id) {
    let innerHTML = '';
    let textContent = '';
    let className = '';
    let val = '';
    let style = { display: '' };
    const listeners = {};
    let focused = false;

    const el = {
      id,
      listeners,
      style,
      getAttribute: (attr) => {
        if (attr === 'id') return id;
        if (attr === 'data-tab') return id.replace('tab-', '').replace('panel-', '');
        return null;
      },
      setAttribute: () => {},
      removeAttribute: () => {},
      closest: (_sel) => null,
      classList: {
        contains: (cls) => className.split(' ').filter(Boolean).includes(cls),
        add: (cls) => {
          const classes = new Set(className.split(' ').filter(Boolean));
          classes.add(cls);
          className = Array.from(classes).join(' ');
        },
        remove: (cls) => {
          const classes = new Set(className.split(' ').filter(Boolean));
          classes.delete(cls);
          className = Array.from(classes).join(' ');
        },
        toggle: (cls, force) => {
          const classes = new Set(className.split(' ').filter(Boolean));
          if (force === undefined) {
            if (classes.has(cls)) classes.delete(cls);
            else classes.add(cls);
          } else if (force) {
            classes.add(cls);
          } else {
            classes.delete(cls);
          }
          className = Array.from(classes).join(' ');
        }
      },
      set innerHTML(val) {
        innerHTML = String(val);
        // Daftarkan elemen turunan yang memiliki id
        const idMatches = [...innerHTML.matchAll(/id="([^"]+)"/g)];
        for (const m of idMatches) {
          const childId = m[1];
          if (!elements.has(childId)) {
            elements.set(childId, createElementObj(childId));
          }
        }
      },
      get innerHTML() {
        return innerHTML;
      },
      set textContent(val) {
        textContent = String(val);
      },
      get textContent() {
        return textContent;
      },
      set value(v) {
        val = String(v);
      },
      get value() {
        return val;
      },
      set className(val) {
        className = String(val);
      },
      get className() {
        return className;
      },
      focus: () => {
        focused = true;
      },
      get isFocused() {
        return focused;
      },
      addEventListener: (event, handler) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      },
      trigger: (event, payload = {}) => {
        if (listeners[event]) {
          listeners[event].forEach(fn => fn({ target: el, preventDefault: () => {}, ...payload }));
        }
      }
    };
    return el;
  }

  function getOrCreateElement(id) {
    if (!elements.has(id)) {
      elements.set(id, createElementObj(id));
    }
    return elements.get(id);
  }

  // Elemen awal yang ada di template HTML
  const panelIndeks = getOrCreateElement('panel-indeks');
  const panelTodo = getOrCreateElement('panel-todo');
  const panelLog = getOrCreateElement('panel-log');
  const tabIndeks = getOrCreateElement('tab-indeks');
  const tabTodo = getOrCreateElement('tab-todo');
  const tabLog = getOrCreateElement('tab-log');
  const statusBar = getOrCreateElement('status-bar');

  const store = {};
  if (initialData) {
    store['indeks_v1'] = JSON.stringify(initialData);
  }

  const mockLocalStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); }
  };

  // Server palsu: aplikasi hanya punya satu jalur, jadi data harus datang
  // dari backend, bukan localStorage. Backend menulis ke store yang sama,
  // jadi assertion yang sudah ada tetap berlaku.
  const backend = buatBackendPalsu(store);

  const toasts = [];
  const toastsHistory = [];
  const modals = [];

  const domDocument = {
    readyState: 'complete',
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: (selector) => {
      if (selector === '.nav-tab-btn') return [tabIndeks, tabTodo, tabLog];
      if (selector === '.tab-panel') return [panelIndeks, panelTodo, panelLog];
      return [];
    },
    querySelector: (selector) => {
      if (selector === '.toast-notice') return toasts[toasts.length - 1] || null;
      if (selector === '.modal-overlay') return modals[modals.length - 1] || null;
      return null;
    },
    createElement: (tag) => {
      let innerHTML = '';
      let textContent = '';
      let className = '';
      let style = {};
      const listeners = {};
      let val = '';
      let selected = false;

      const newEl = {
        tag,
        style,
        listeners,
        parentNode: null,
        set innerHTML(v) { innerHTML = String(v); },
        get innerHTML() { return innerHTML; },
        set textContent(v) { textContent = String(v); },
        get textContent() { return textContent; },
        set className(v) { className = String(v); },
        get className() { return className; },
        set value(v) {
          val = String(v);
          lastExecCommandText = val;
        },
        get value() { return val; },
        select: () => { selected = true; },
        get isSelected() { return selected; },
        focus: () => {},
        addEventListener: (event, handler) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
        },
        trigger: (event, payload = {}) => {
          if (listeners[event]) {
            listeners[event].forEach(fn => fn({ target: newEl, preventDefault: () => {}, ...payload }));
          }
        },
        querySelector: (sel) => {
          if (sel === '.modal-input') return { focus: () => {}, select: () => { selected = true; } };
          if (sel === '.btn-close-modal') {
            return {
              addEventListener: (evt, cb) => {
                if (evt === 'click') {
                  newEl.closeModal = cb;
                }
              }
            };
          }
          return null;
        }
      };
      return newEl;
    },
    body: {
      appendChild: (el) => {
        el.parentNode = domDocument.body;
        if (el.className === 'toast-notice') {
          toasts.push(el);
          toastsHistory.push(el);
        }
        if (el.className === 'modal-overlay') modals.push(el);
      },
      removeChild: (el) => {
        el.parentNode = null;
        const tIdx = toasts.indexOf(el);
        if (tIdx >= 0) toasts.splice(tIdx, 1);
        const mIdx = modals.indexOf(el);
        if (mIdx >= 0) modals.splice(mIdx, 1);
      }
    }
  };

  let lastExecCommand = null;
  let lastExecCommandText = '';
  domDocument.execCommand = (typeof options.execCommand === 'function')
    ? options.execCommand
    : (cmd) => {
        lastExecCommand = cmd;
        return true;
      };

  const sandbox = {
    document: domDocument,
    localStorage: mockLocalStorage,
    window: {},
    navigator: options.navigator || {
      clipboard: {
        writeText: async () => {}
      }
    },
    setTimeout: (fn, delay) => {
      // Simulasikan delay tanpa menghapus toast secara instan di assertion yang sama
      return setTimeout(fn, delay);
    },
    clearTimeout,
    fetch: backend.fetch,
    AbortController,
    Date,
    console
  };

  vm.createContext(sandbox);

  // Muat search.js dulu, lalu app.js
  const searchJs = fs.readFileSync(searchJsPath, 'utf8');
  vm.runInContext(searchJs, sandbox);

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const adapterJs = fs.readFileSync(adapterJsPath, 'utf8');
  vm.runInContext(adapterJs, sandbox);
  vm.runInContext(appJs, sandbox);

  return {
    sandbox,
    getOrCreateElement,
    panelIndeks,
    statusBar,
    toasts: toastsHistory,
    modals,
    getLastExecCommand: () => lastExecCommand,
    getLastExecCommandText: () => lastExecCommandText
  };
}

test('Tiket 04: Zona pencarian dan daftar hasil awal saat ada data', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  // Panel indeks harus memuat input pencarian dan daftar hasil
  assert.match(env.panelIndeks.innerHTML, /id="search-input"/, 'Harus ada input pencarian #search-input');
  assert.match(env.panelIndeks.innerHTML, /id="search-rekap"/, 'Harus ada elemen baris rekap #search-rekap');
  assert.match(env.panelIndeks.innerHTML, /id="result-list"/, 'Harus ada elemen kontainer hasil #result-list');

  // Input pencarian harus otomatis terfokus saat tab Indeks dibuka
  const searchInput = env.getOrCreateElement('search-input');
  assert.equal(searchInput.isFocused, true, 'Input pencarian harus otomatis terfokus');

  // Daftar awal saat kata kunci kosong menampilkan item
  const resultList = env.getOrCreateElement('result-list');
  assert.match(resultList.innerHTML, /Repository UNIGA/, 'Item dummy harus muncul');
  assert.match(resultList.innerHTML, /SLiMS Bulian/, 'Item dummy harus muncul');

  // Baris rekap harus tersembunyi saat kata kunci kosong
  const searchRekap = env.getOrCreateElement('search-rekap');
  assert.equal(searchRekap.style.display, 'none', 'Baris rekap harus tersembunyi saat pencarian kosong');
});

test('Tiket 04: Pencarian real-time dengan query "wisuda"', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const searchInput = env.getOrCreateElement('search-input');
  const searchRekap = env.getOrCreateElement('search-rekap');
  const resultList = env.getOrCreateElement('result-list');

  // Simulasikan pengetikan "wisuda"
  searchInput.trigger('input', { target: { value: 'wisuda' } });

  // Baris rekap harus muncul dan cocok dengan jumlah yang tampil
  assert.equal(searchRekap.style.display, 'block', 'Baris rekap harus ditampilkan saat pencarian terisi');
  assert.match(searchRekap.textContent, /2 langsung, 2 terkait/, 'Rekap harus mencantumkan 2 langsung dan 2 terkait');

  // Hasil pencarian memuat item yang sesuai
  assert.match(resultList.innerHTML, /Repository UNIGA/, 'Repository UNIGA masuk lapis 1');
  assert.match(resultList.innerHTML, /Sheet Admin TA/, 'Sheet Admin TA masuk lapis 1');
  assert.match(resultList.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian masuk lapis 2');
  assert.match(resultList.innerHTML, /Sheet Job Training/, 'Sheet Job Training masuk lapis 2');
});

test('Tiket 04: Pencarian tanpa hasil menampilkan pesan ramah pengguna', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const searchInput = env.getOrCreateElement('search-input');
  const searchRekap = env.getOrCreateElement('search-rekap');
  const resultList = env.getOrCreateElement('result-list');

  // Ketik kata kunci yang tidak ada
  searchInput.trigger('input', { target: { value: 'kata-kunci-tidak-ada-123' } });

  assert.equal(searchRekap.style.display, 'none', 'Baris rekap disembunyikan saat tidak ada hasil');
  assert.match(
    resultList.innerHTML,
    /Tidak ada item cocok\. Coba kata lain atau tambahkan item baru/,
    'Harus memunculkan pesan tidak ada item cocok'
  );
});

const twoItemsFixture = {
  version: 1,
  items: [
    {
      id: 'web-item',
      title: 'Dokumen Web',
      tags: ['web'],
      links: [{ label: 'Web', url: 'https://example.com/doc' }],
      catatan: 'Catatan web',
      updated_at: '2026-09-30'
    },
    {
      id: 'local-item',
      title: 'Dokumen Lokal Windows',
      tags: ['lokal'],
      links: [{ label: 'Lokal', url: 'D:\\Skripsi\\draft.docx' }],
      catatan: 'Catatan lokal',
      updated_at: '2026-09-30'
    }
  ],
  todo: [],
  logs: []
};

function triggerCopyClick(resultList, dataUrl, isLocal) {
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy') {
          return {
            getAttribute: (attr) => {
              if (attr === 'data-url') return dataUrl;
              if (attr === 'data-local') return isLocal ? 'true' : 'false';
              return null;
            }
          };
        }
        return null;
      }
    }
  });
}

test('Tiket 04: Tombol Buka dan Copy pada URL web vs path lokal Windows', async () => {
  const env = createTestEnvironment(twoItemsFixture);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const resultList = env.getOrCreateElement('result-list');

  // Dokumen Web harus punya tombol Buka (dengan target _blank) dan Copy
  assert.match(resultList.innerHTML, /href="https:\/\/example\.com\/doc"/, 'Link Buka ada untuk URL web');
  assert.match(resultList.innerHTML, /target="_blank"/, 'Target _blank ada untuk membuka di tab baru');

  // Path lokal memakai tombol Buka (backend yang membuka), bukan tautan
  // href: browser tidak boleh membuka path Windows dari halaman web.
  assert.doesNotMatch(resultList.innerHTML, /href="D:\\Skripsi\\draft\.docx"/, 'Path lokal tidak boleh jadi tautan href');
  assert.match(resultList.innerHTML, /btn-buka-local/, 'Path lokal punya tombol Buka');
  assert.match(resultList.innerHTML, /data-local="true"/, 'Item lokal ditandai data-local="true"');
});

test('Tiket 04: Jaring pengaman Copy: Cara 1 (sinkron execCommand) dipakai pada URL web', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const resultList = env.getOrCreateElement('result-list');

  // Simulasikan klik tombol Copy pada URL web
  triggerCopyClick(resultList, 'https://lib.fkominfo.uniga.ac.id/login', false);

  assert.equal(env.getLastExecCommand(), 'copy', 'Cara 1 harus memanggil execCommand copy');
  assert.equal(env.getLastExecCommandText(), 'https://lib.fkominfo.uniga.ac.id/login', 'Teks textarea cocok');

  // Dulu di sini ada assertion bahwa tidak boleh ada toast, dengan alasan
  // bebas scope-creep. Keputusan itu dibalik: menyalin tautan web adalah
  // kasus utama produk ini, dan tanpa konfirmasi orang tidak punya cara
  // tahu kliknya berhasil atau tidak.
  assert.equal(env.toasts.length, 1, 'Menyalin URL web harus menampilkan konfirmasi');
  assert.match(env.toasts[0].textContent, /disalin/i,
    'Konfirmasi harus menyebut tautan sudah tersalin');
});

test('Tiket 04: Jaring pengaman Copy: path lokal menampilkan arahan Pro', async () => {
  const env = createTestEnvironment(twoItemsFixture);
  // loadData async saat halaman siap
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const resultList = env.getOrCreateElement('result-list');

  triggerCopyClick(resultList, 'D:\\Skripsi\\draft.docx', true);

  assert.equal(env.getLastExecCommand(), 'copy', 'Cara 1 harus memanggil execCommand copy');
  assert.equal(env.toasts.length, 1, 'Toast harus muncul untuk path lokal');
  assert.match(
    env.toasts[0].textContent,
    /Path sudah disalin/,
    'Toast copy path lokal harus menyebutkan teksnya tersalin'
  );
  assert.ok(
    !/hanya bisa dibuka/.test(env.toasts[0].textContent),
    'Toast tidak boleh menyatakan path lokal tidak bisa dibuka: sekarang ada tombol Buka'
  );
});

test('Tiket 04: Jaring pengaman Copy: Cara 2 (navigator.clipboard) aktif saat Cara 1 gagal', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  let clipboardWritten = '';
  const mockNavigator = {
    clipboard: {
      writeText: async (text) => {
        clipboardWritten = text;
      }
    }
  };

  const env = createTestEnvironment(exampleData, {
    execCommand: () => false, // execCommand gagal
    navigator: mockNavigator
  });
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const resultList = env.getOrCreateElement('result-list');

  triggerCopyClick(resultList, 'https://lib.fkominfo.uniga.ac.id/login', false);

  // Tunggu microtask promise resolve
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(clipboardWritten, 'https://lib.fkominfo.uniga.ac.id/login', 'Cara 2 navigator.clipboard harus aktif');
  assert.equal(env.modals.length, 0, 'Modal manual tidak boleh muncul jika Cara 2 sukses');
});

test('Tiket 04: Jaring pengaman Copy: Cara 3 (modal manual fallback) muncul saat execCommand & clipboard gagal', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  // Clipboard API reject
  const mockNavigator = {
    clipboard: {
      writeText: () => Promise.reject(new Error('Clipboard denied'))
    }
  };

  const env = createTestEnvironment(exampleData, {
    execCommand: () => false, // execCommand gagal
    navigator: mockNavigator
  });
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const resultList = env.getOrCreateElement('result-list');

  triggerCopyClick(resultList, 'http://localhost:8089/bulian', false);

  // Tunggu microtask promise reject
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(env.modals.length, 1, 'Modal salin manual harus terbuka');
  const modal = env.modals[0];
  assert.match(
    modal.innerHTML,
    /Gagal menyalin - pilih dan salin manual dari kotak di bawah/,
    'Pesan gagal salin manual harus sesuai spesifikasi'
  );

  // Verifikasi wireframe §5: Latar modal tidak bisa diklik untuk menutup
  modal.trigger('click', { target: modal });
  assert.equal(env.modals.length, 1, 'Modal tidak boleh tertutup saat backdrop overlay diklik');

  // Tutup lewat tombol modal Tutup
  if (typeof modal.closeModal === 'function') {
    modal.closeModal();
    assert.equal(env.modals.length, 0, 'Modal tertutup saat tombol Tutup ditekan');
  }
});

test('Tiket 01: Pengatur urutan ada di baris kendali, bukan di zona Kartu', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const markup = env.panelIndeks.innerHTML;
  assert.match(markup, /id="select-sort-order"/,
    'Pengatur urutan harus ada di markup baris kendali Indeks');
  assert.doesNotMatch(markup, /Urutan kartu/,
    'Label aksesibilitas pengatur urutan tidak lagi boleh menyebut kartu');
});

test('Tiket 01: Pengatur urutan tetap ada saat tidak ada satu pun tag tersemat', async () => {
  // Keadaan ini berlaku di setiap instalasi baru dan tidak pernah diuji
  // sebelumnya: seluruh fixture lama memakai data.example.json yang pinned_tags-nya
  // terisi, jadi regresi yang menutup pengatur urutan tidak pernah terlihat.
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment({ ...exampleData });
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  assert.match(env.panelIndeks.innerHTML, /id="select-sort-order"/,
    'Pengatur urutan harus tetap ada walau tidak ada tag tersemat sama sekali');

  const selectSort = env.getOrCreateElement('select-sort-order');
  const resultList = env.getOrCreateElement('result-list');

  const judulDari = (html) => [...html.matchAll(/<span class="sel-nama">([\s\S]*?)<\/span>\s*<\/span>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

  // Keadaan urutan tidak dibaca langsung karena harness berkas ini tidak
  // mengekspor state; yang diperiksa adalah akibatnya pada DOM.
  const judulAwal = judulDari(resultList.innerHTML);
  assert.ok(judulAwal.length > 1, 'Harus ada beberapa baris untuk diurutkan');

  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'az' } });

  const judulAz = judulDari(resultList.innerHTML);
  assert.deepEqual(judulAz, judulAz.slice().sort((a, b) => a.localeCompare(b)),
    'Daftar harus benar-benar terurut A - Z setelah memilihnya');
  assert.notDeepEqual(judulAz, judulAwal,
    'Memilih A - Z harus mengubah urutan baris, bukan hanya menyimpan keadaan');

  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'recent' } });
  assert.deepEqual(judulDari(resultList.innerHTML), judulAwal,
    'Urutan semula harus pulih persis');
});

test('Tiket 01: Pengatur urutan tidak terduplikasi dan pendengarnya tidak menumpuk', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const selectSort = env.getOrCreateElement('select-sort-order');
  assert.equal(selectSort.listeners.change.length, 1,
    'Pengatur urutan harus punya tepat satu pendengar change');

  const searchInput = env.getOrCreateElement('search-input');
  searchInput.trigger('input', { target: { value: 'ta' } });
  await new Promise(resolve => setImmediate(resolve));

  const kemunculan = (env.panelIndeks.innerHTML.match(/id="select-sort-order"/g) || []).length;
  assert.equal(kemunculan, 1,
    'Pengatur urutan harus tetap muncul tepat satu kali setelah render ulang');
  assert.equal(selectSort.listeners.change.length, 1,
    'Render ulang tidak boleh menambah pendengar change');
});

test('Tiket 02 - Zona Kartu tag tidak ada lagi di markup Indeks', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const markup = env.panelIndeks.innerHTML;
  assert.doesNotMatch(markup, /id="zone-kartu"/,
    'Zona Kartu harus hilang dari markup Indeks');
  assert.doesNotMatch(markup, /btn-card-tag/,
    'Tombol kartu tag tidak boleh ada di markup mana pun pada layar Indeks');
  assert.doesNotMatch(markup, /KARTU/,
    'Penanda KARTU tidak boleh muncul di layar Indeks');
});

test('Tiket 02 - Penyaringan per tag lewat kotak cari tetap bekerja', async () => {
  // Dengan kartu dihapus, mengetik tag di kotak cari menjadi satu-satunya
  // jalan menyaring per tag, jadi jalannya dikunci di sini.
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const searchInput = env.getOrCreateElement('search-input');
  const resultList = env.getOrCreateElement('result-list');

  // "magang" hanya ada sebagai tag pada satu item dan tidak muncul di judul
  // maupun catatan mana pun. Jadi mengetik kata itu harus menemukan item itu,
  // dan harus membuang kedua item yang tidak berbagi tag dengannya.
  searchInput.trigger('input', { target: { value: 'magang' } });

  const isi = resultList.innerHTML;
  assert.match(isi, /Sheet Job Training/, 'Item bertag magang harus cocok lewat Lapis 1');
  assert.doesNotMatch(isi, /SLiMS Bulian/,
    'SLiMS Bulian tidak memuat magang dan tidak berbagi tag dengannya');
  assert.doesNotMatch(isi, /Repository UNIGA/,
    'Repository UNIGA tidak memuat magang dan tidak berbagi tag dengannya');
});

test('Tiket 04 - Zona Harian tidak ada lagi di markup Indeks', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const markup = env.panelIndeks.innerHTML;
  assert.doesNotMatch(markup, /id="zone-harian"/,
    'Zona Harian harus hilang dari markup Indeks');
  assert.doesNotMatch(markup, /chip-harian/,
    'Chip harian tidak boleh ada di markup mana pun pada layar Indeks');
  assert.doesNotMatch(markup, /HARIAN/,
    'Penanda HARIAN tidak boleh muncul di layar Indeks');
});

test('Tiket 04 - Tag harian tetap sah dan tetap dicari seperti tag lain', async () => {
  // Baris Harian dihapus, tapi tag "harian" tidak dilarang: ia kini hanya
  // tag biasa. Dua hal ini dikunci supaya penghapusan tidak ikut mengubah
  // aturan tag maupun perilaku pencarian.
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const searchInput = env.getOrCreateElement('search-input');
  const resultList = env.getOrCreateElement('result-list');

  searchInput.trigger('input', { target: { value: 'harian' } });

  const isi = resultList.innerHTML;
  assert.match(isi, /SLiMS Bulian/, 'Item bertag harian harus tetap ditemukan lewat kotak cari');
  assert.match(isi, /Sheet Admin TA/, 'Item bertag harian kedua harus tetap ditemukan');
});
