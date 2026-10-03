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
const styleCssPath = path.join(repoRoot, 'src', 'frontend', 'style.css');

function createTestEnvironment(initialData = null, options = {}) {
  const elements = new Map();
  const docListeners = {};

  function createElementObj(id, tagName = 'div') {
    let innerHTML = '';
    let textContent = '';
    let className = '';
    let val = '';
    let style = { display: '' };
    const listeners = {};
    let focused = false;
    const attributes = new Map();

    const el = {
      tagName: tagName.toUpperCase(),
      id,
      listeners,
      style,
      getAttribute: (attr) => {
        if (attr === 'id') return id;
        if (attr === 'data-tab') return id.replace('tab-', '').replace('panel-', '');
        return attributes.get(attr) || null;
      },
      setAttribute: (attr, v) => {
        attributes.set(attr, String(v));
      },
      removeAttribute: (attr) => {
        attributes.delete(attr);
      },
      closest: (sel) => {
        if (sel === '.btn-copy' && className.includes('btn-copy')) return el;
        if (sel === '.btn-buka' && className.includes('btn-buka')) return el;
        if (sel === '.btn-card-tag' && className.includes('btn-card-tag')) return el;
        if (sel === '.baris-tabel' && className.includes('baris-tabel')) return el;
        if (sel === '#panel-inspeksi' && (id === 'panel-inspeksi' || className.includes('panel-inspeksi'))) return el;
        return null;
      },
      classList: {
        contains: (cls) => className.split(' ').filter(Boolean).includes(cls),
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
        },
        add: (cls) => {
          const classes = new Set(className.split(' ').filter(Boolean));
          classes.add(cls);
          className = Array.from(classes).join(' ');
        },
        remove: (cls) => {
          const classes = new Set(className.split(' ').filter(Boolean));
          classes.delete(cls);
          className = Array.from(classes).join(' ');
        }
      },
      set innerHTML(val) {
        innerHTML = String(val);
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
          listeners[event].forEach(fn => fn({
            target: el,
            currentTarget: el,
            preventDefault: () => {},
            stopPropagation: () => {},
            ...payload
          }));
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
      return createElementObj(null, tag);
    },
    body: {
      appendChild: (el) => {
        if (el.className === 'toast-notice') toasts.push(el);
        if (el.className === 'modal-overlay') modals.push(el);
      },
      removeChild: (el) => {
        const tIdx = toasts.indexOf(el);
        if (tIdx >= 0) toasts.splice(tIdx, 1);
        const mIdx = modals.indexOf(el);
        if (mIdx >= 0) modals.splice(mIdx, 1);
      }
    },
    addEventListener: (event, handler) => {
      if (!docListeners[event]) docListeners[event] = [];
      docListeners[event].push(handler);
    },
    trigger: (event, payload = {}) => {
      if (docListeners[event]) {
        docListeners[event].forEach(fn => fn({
          preventDefault: () => {},
          stopPropagation: () => {},
          ...payload
        }));
      }
    }
  };

  const winListeners = {};
  const mockWindow = {
    addEventListener: (event, handler) => {
      if (!winListeners[event]) winListeners[event] = [];
      winListeners[event].push(handler);
    },
    trigger: (event, payload = {}) => {
      if (winListeners[event]) {
        winListeners[event].forEach(fn => fn({
          preventDefault: () => {},
          stopPropagation: () => {},
          ...payload
        }));
      }
    }
  };

  const sandbox = {
    document: domDocument,
    localStorage: mockLocalStorage,
    window: mockWindow,
    module: { exports: {} },
    navigator: options.navigator || {
      clipboard: {
        writeText: async () => {}
      }
    },
    setTimeout: (fn, delay) => setTimeout(fn, delay),
    clearTimeout,
    fetch: backend.fetch,
    AbortController,
    Date,
    console
  };

  vm.createContext(sandbox);

  const searchJs = fs.readFileSync(searchJsPath, 'utf8');
  vm.runInContext(searchJs, sandbox);

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const adapterJs = fs.readFileSync(adapterJsPath, 'utf8');
  vm.runInContext(adapterJs, sandbox);
  vm.runInContext(appJs, sandbox);

  return {
    sandbox,
    state: sandbox.module.exports.state,
    getOrCreateElement,
    panelIndeks,
    statusBar,
    toasts,
    modals,
    triggerDoc: domDocument.trigger,
    triggerWin: mockWindow.trigger
  };
}

// Panel selalu terlihat di layar, jadi "tersembunyi" tidak lagi berarti
// display:none. Yang berubah adalah isinya: panel menampilkan keadaan
// kosong ketika tidak ada item terpilih, dan berisi item terkait ketika ada.
// Assertion lama yang memeriksa display:none harus memeriksa isi.
function panelKosong(panel) {
  const isi = String(panel.innerHTML || '').trim();
  return isi === '' || /panel-kosong/.test(isi);
}

function panelBerisi(panel) {
  return !panelKosong(panel);
}
test('Tiket 05 - Zona 2 (Harian): memuat 2 chip dari data contoh (SLiMS Bulian, Sheet Admin TA)', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const zoneHarian = env.getOrCreateElement('zone-harian');
  assert.ok(zoneHarian, 'Elemen #zone-harian harus ada di layar Indeks');
  assert.match(zoneHarian.innerHTML, /HARIAN/i, 'Label HARIAN harus ada');
  assert.match(zoneHarian.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian harus muncul di baris Harian');
  assert.match(zoneHarian.innerHTML, /Sheet Admin TA/, 'Sheet Admin TA harus muncul di baris Harian');
  assert.doesNotMatch(zoneHarian.innerHTML, /Repository UNIGA/, 'Repository UNIGA bukan tag harian');
});

test('Tiket 05 - Zona 3 (Kartu Pinned Tags): menampilkan TA 2, Wisuda 2, Magang 1 dan klik menyaring hasil', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const zoneKartu = env.getOrCreateElement('zone-kartu');
  assert.ok(zoneKartu, 'Elemen #zone-kartu harus ada');
  assert.match(zoneKartu.innerHTML, /KARTU/i, 'Label KARTU harus ada');

  // Periksa kemunculan kartu tag beserta jumlahnya
  assert.match(zoneKartu.innerHTML, /TA[\s\S]*?2/i, 'Kartu TA harus bernilai 2');
  assert.match(zoneKartu.innerHTML, /Wisuda[\s\S]*?2/i, 'Kartu Wisuda harus bernilai 2');
  assert.match(zoneKartu.innerHTML, /Magang[\s\S]*?1/i, 'Kartu Magang harus bernilai 1');

  const resultList = env.getOrCreateElement('result-list');

  // Klik kartu TA
  zoneKartu.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-card-tag') {
          return {
            getAttribute: (attr) => attr === 'data-tag' ? 'ta' : null
          };
        }
        return null;
      }
    }
  });

  // Zona hasil harus mempersempit ke 2 item (Sheet Admin TA dan Repository UNIGA)
  assert.match(resultList.innerHTML, /Sheet Admin TA/, 'Sheet Admin TA bertag ta');
  assert.match(resultList.innerHTML, /Repository UNIGA/, 'Repository UNIGA bertag ta');
  assert.doesNotMatch(resultList.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian tidak memiliki tag ta');
  assert.doesNotMatch(resultList.innerHTML, /Sheet Job Training/, 'Sheet Job Training tidak memiliki tag ta di lapis 1 awal saat filter aktif');

  // Kartu TA harus memiliki kelas .active
  assert.match(zoneKartu.innerHTML, /active/, 'Kartu yang diklik harus berstatus active');

  // Klik ulang kartu TA untuk melepas filter
  zoneKartu.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-card-tag') {
          return {
            getAttribute: (attr) => attr === 'data-tag' ? 'ta' : null
          };
        }
        return null;
      }
    }
  });

  // Filter lepas, seluruh item default kembali tampil
  assert.match(resultList.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian kembali tampil setelah filter kartu dilepas');
});

test('Tiket 05 - Filter bertumpuk: ketik "ta" lalu klik kartu Magang menyaring ke irisan keduanya', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const searchInput = env.getOrCreateElement('search-input');
  const zoneKartu = env.getOrCreateElement('zone-kartu');
  const resultList = env.getOrCreateElement('result-list');

  // Ketik "ta" di kotak pencarian
  searchInput.trigger('input', { target: { value: 'ta' } });

  // Klik kartu Magang
  zoneKartu.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-card-tag') {
          return {
            getAttribute: (attr) => attr === 'data-tag' ? 'magang' : null
          };
        }
        return null;
      }
    }
  });

  // Hanya Sheet Job Training yang lolos (cocok kata kunci "ta" dan bertag "magang")
  assert.match(resultList.innerHTML, /Sheet Job Training/, 'Sheet Job Training lolos filter AND');
  assert.doesNotMatch(resultList.innerHTML, /Repository UNIGA/, 'Repository UNIGA tidak memiliki tag magang');
  assert.doesNotMatch(resultList.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian tidak memiliki tag magang');
});

test('Tiket 05 - Zona 5 (Terkait): klik badan baris Sheet Admin TA memunculkan item terkait tanpa dirinya sendiri', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const resultList = env.getOrCreateElement('result-list');
  const panel = env.getOrCreateElement('panel-inspeksi');

  // Sebelum ada baris difokuskan, zona Terkait tersembunyi
  assert.ok(panelKosong(panel), 'Panel harus menampilkan keadaan kosong saat belum ada fokus');

  // Simulasikan klik pada badan baris Sheet Admin TA (id: sheet-ta-admin)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka') return null; // bukan tombol
        if (sel === '.baris-tabel') {
          return {
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  // Baris Sheet Admin TA mendapat kelas .focused
  assert.match(resultList.innerHTML, /focused/, 'Baris terfokus harus memiliki kelas .focused');

  // Zona Terkait tampil
  assert.ok(panelBerisi(panel), 'Panel harus menampilkan item terkait');
  assert.match(panel.innerHTML, /TERKAIT/i, 'Label terkait harus ada');
  assert.match(panel.innerHTML, /Biasanya bareng ini/i, 'Subjudul Biasanya bareng ini harus ada');

  // Menampilkan item dengan irisan tag terbanyak (Repository UNIGA, Sheet Job Training, SLiMS Bulian)
  assert.match(panel.innerHTML, /Repository UNIGA/, 'Repository UNIGA memiliki irisan tag ta & wisuda');
  assert.match(panel.innerHTML, /Sheet Job Training/, 'Sheet Job Training memiliki irisan tag ta');

  // Sheet Admin TA TIDAK boleh muncul di dalam daftar item terkait dirinya sendiri
  assert.doesNotMatch(
    panel.innerHTML,
    /class="[^"]*terkait-item[^"]*"[^>]*>Sheet Admin TA/i,
    'Sheet Admin TA tidak boleh muncul di daftar terkait dirinya'
  );
});

test('Tiket 05 - Klik tombol aksi Buka/Copy/Ubah tidak memicu fokus baris', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const resultList = env.getOrCreateElement('result-list');
  const panel = env.getOrCreateElement('panel-inspeksi');

  // Simulasikan klik tombol Copy
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy') {
          return {
            getAttribute: (attr) => {
              if (attr === 'data-url') return 'https://example.com';
              if (attr === 'data-local') return 'false';
              return null;
            }
          };
        }
        if (sel === '.baris-tabel') {
          return {
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  // Zona terkait tetap tersembunyi karena yang diklik adalah tombol Copy
  assert.ok(panelKosong(panel), 'Klik tombol Copy tidak boleh mengisi panel');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Baris tidak boleh berstatus .focused setelah klik Copy');

  // Simulasikan klik tombol Ubah
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-ubah') return { className: 'btn-ubah' };
        if (sel === '.baris-tabel') {
          return {
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  assert.ok(panelKosong(panel), 'Klik tombol Ubah tidak boleh mengisi panel');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Baris tidak boleh berstatus .focused setelah klik Ubah');
});

test('Tiket 05 - Tombol Esc dan klik luar melepas fokus dan menyembunyikan panel terkait', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const resultList = env.getOrCreateElement('result-list');
  const panel = env.getOrCreateElement('panel-inspeksi');

  // 1. Fokuskan baris sheet-ta-admin
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.baris-tabel') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });

  assert.ok(panelBerisi(panel), 'Panel terisi setelah baris diklik');

  // Re-click pada baris yang sama tidak melepas fokus (fokus tetap aktif)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.baris-tabel') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });
  assert.ok(panelBerisi(panel), 'Re-click pada baris yang sama tetap mengisi panel');

  // 2. Tekan Esc: melepas fokus
  env.triggerDoc('keydown', { key: 'Escape' });
  assert.ok(panelKosong(panel), 'Esc harus mengembalikan panel ke keadaan kosong');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Kelas .focused harus dilepas oleh Esc');

  // 3. Fokuskan lagi lalu uji klik luar (outside click)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.baris-tabel') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });
  assert.ok(panelBerisi(panel), 'Panel terisi kembali setelah klik lagi');

  // Trigger klik luar (target bukan .baris-tabel dan bukan #panel-inspeksi)
  env.triggerDoc('click', {
    target: {
      closest: () => null
    }
  });
  assert.ok(panelKosong(panel), 'Klik luar harus mengembalikan panel ke keadaan kosong');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Kelas .focused harus dilepas oleh klik luar');
});

test('Tiket 05 - Klik kartu tag tanpa kata kunci menampilkan seluruh item tanpa terpotong 10 item', async () => {
  // Buat 15 item dengan tag "projek"
  const fifteenItems = [];
  for (let i = 1; i <= 15; i++) {
    fifteenItems.push({
      id: `item-${i}`,
      title: `Item Projek ${i}`,
      tags: ['projek', 'kerja'],
      links: [{ label: 'Link', url: `https://example.com/${i}` }],
      catatan: `Catatan ${i}`,
      updated_at: `2026-09-${String(i).padStart(2, '0')}`
    });
  }

  const customData = {
    version: 1,
    items: fifteenItems,
    todo: [],
    logs: [],
    pinned_tags: ['projek']
  };

  const env = createTestEnvironment(customData);
  // detectStorageMode lalu loadData async sejak tiket 11
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const zoneKartu = env.getOrCreateElement('zone-kartu');
  const resultList = env.getOrCreateElement('result-list');

  // Klik kartu tag 'projek' saat input pencarian kosong
  zoneKartu.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-card-tag') {
          return { getAttribute: (attr) => attr === 'data-tag' ? 'projek' : null };
        }
        return null;
      }
    }
  });

  // Hitung jumlah baris tabel di innerHTML
  const countMatches = (resultList.innerHTML.match(/class="baris-tabel/g) || []).length;
  assert.equal(countMatches, 15, 'Filter kartu tag harus menampilkan seluruh 15 item tanpa terpotong 10 item');
});

test('Tiket 05 - Validasi CSS: batasan 768 px, scrolling independen zona hasil, chip token', () => {
  const css = fs.readFileSync(styleCssPath, 'utf8');

  // html dan body harus mengunci tinggi ke 100% dan overflow hidden
  assert.match(css, /html,\s*body\s*\{[^}]*height:\s*100%/, 'html dan body harus height: 100%');
  assert.match(css, /html,\s*body\s*\{[^}]*overflow:\s*hidden/, 'html dan body harus overflow: hidden');

  // body harus flex column
  assert.match(css, /body\s*\{[^}]*display:\s*flex/, 'body harus display: flex');
  assert.match(css, /body\s*\{[^}]*flex-direction:\s*column/, 'body harus flex-direction: column');

  // Zona hasil harus scrollable vertikal
  assert.match(css, /#result-list|\.result-list/, 'Harus ada selector untuk result-list');
  assert.match(css, /overflow-y:\s*auto/, 'Zona hasil harus overflow-y: auto');

  // Zona harian dan kartu harus scrollable horizontal
  assert.match(css, /overflow-x:\s*auto/, 'Zona harian atau kartu harus overflow-x: auto');

  // Token aktif pada kartu tag
  assert.match(css, /--action-soft/, 'Harus memakai token --action-soft');
  assert.match(css, /--action/, 'Harus memakai token --action');
});

test('Tiket 05 - Dropdown sort toolbar kartu: Terakhir Digunakan (default) dan A - Z', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const zoneKartu = env.getOrCreateElement('zone-kartu');
  assert.ok(zoneKartu, 'Elemen #zone-kartu harus ada');

  // Dropdown sort pindah ke baris kendali Indeks (tiket 01), bukan lagi
  // dirender di dalam zona Kartu.
  const markupKendali = env.panelIndeks.innerHTML;
  assert.match(markupKendali, /id="select-sort-order"/, 'Harus ada elemen #select-sort-order');
  assert.match(markupKendali, /Urutan: Terakhir Digunakan/, 'Opsi Terakhir Digunakan harus ada');
  assert.match(markupKendali, /A - Z/, 'Opsi A - Z harus ada');

  const appState = env.sandbox.module.exports.state;
  assert.equal(appState.sortOrder, 'recent', 'Default sortOrder harus recent');

  const resultList = env.getOrCreateElement('result-list');
  const selectSort = env.getOrCreateElement('select-sort-order');

  // Ekstrak judul awal (recent default)
  const judulDari = (html) => [...html.matchAll(/<span class="sel-nama">([\s\S]*?)<\/span>\s*<\/span>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, ''));
  const judulBersih = (h) => judulDari(h).map(s => s.replace(/\s+/g, ' ').trim());
  const titlesInitial = judulBersih(resultList.innerHTML);
  assert.deepEqual(titlesInitial, ['SLiMS Bulian', 'Repository UNIGA', 'Sheet Job Training', 'Sheet Admin TA'], 'Urutan awal sesuai recent');

  // Trigger perubahan urutan ke A - Z
  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'az' } });
  assert.equal(appState.sortOrder, 'az', 'State sortOrder harus menjadi az');

  // Ekstrak judul kartu dari hasil render A - Z
  const titlesAz = judulBersih(resultList.innerHTML);
  assert.ok(titlesAz.length > 1, 'Harus ada judul yang dirender');
  const sortedTitles = titlesAz.slice().sort((a, b) => a.localeCompare(b));
  assert.deepEqual(titlesAz, sortedTitles, 'Daftar item harus berurutan A - Z secara alfabetis');
  assert.deepEqual(titlesAz, ['Repository UNIGA', 'Sheet Admin TA', 'Sheet Job Training', 'SLiMS Bulian']);

  // Kembalikan ke 'recent'
  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'recent' } });
  assert.equal(appState.sortOrder, 'recent', 'State sortOrder harus kembali ke recent');

  // Pastikan urutan DOM benar-benar kembali ke urutan recent awal
  const titlesRestored = judulBersih(resultList.innerHTML);
  assert.deepEqual(titlesRestored, titlesInitial, 'Daftar item harus kembali ke urutan recent semula di DOM');
});

test('Tiket 05 - Pengurutan A - Z mempertahankan lapis pencarian (Lapis 1 > Lapis 2 > Lapis 3)', async () => {
  const customData = {
    version: 1,
    items: [
      { id: 'i1', title: 'Zeta Item (Tag Cocok)', tags: ['magang'], links: [], catatan: '', updated_at: '2026-09-01' },
      { id: 'i2', title: 'Alpha Item (Tag Cocok)', tags: ['magang'], links: [], catatan: '', updated_at: '2026-09-02' },
      { id: 'i3', title: 'Beta Note Match', tags: ['pkl'], links: [], catatan: 'memuat magang di catatan', updated_at: '2026-09-03' },
      { id: 'i4', title: 'Alpha Note Match', tags: ['pkl'], links: [], catatan: 'juga magang di catatan', updated_at: '2026-09-04' }
    ],
    todo: [],
    logs: [],
    pinned_tags: ['magang']
  };

  const env = createTestEnvironment(customData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const selectSort = env.getOrCreateElement('select-sort-order');
  const searchInput = env.getOrCreateElement('search-input');
  const resultList = env.getOrCreateElement('result-list');

  // Ganti urutan ke 'az'
  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'az' } });

  // Cari dengan query "magang":
  // i1 dan i2 cocok pada tag -> Lapis 1
  // i3 dan i4 tidak berbagi tag lapis 1, hanya cocok pada catatan -> Lapis 3
  searchInput.trigger('input', { target: { value: 'magang' } });

  // Penanda pencarian ("dari catatan:") berada di dalam span nama sebagai
  // tag, jadi teksnya ikut diambil.
  const titles = [...resultList.innerHTML.matchAll(/<span class="sel-nama">([\s\S]*?)<\/span>\s*<\/span>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

  // Di lapis 1 (Alpha Item dan Zeta Item): diurutkan A-Z -> Alpha Item duluan, baru Zeta Item
  assert.equal(titles[0], 'Alpha Item (Tag Cocok)');
  assert.equal(titles[1], 'Zeta Item (Tag Cocok)');
  // Lapis 3 (Alpha Note Match dan Beta Note Match): diurutkan A-Z di dalam lapis 3 -> Alpha Note Match duluan, baru Beta Note Match
  // dan seluruh Lapis 1 tetap mendahului Lapis 3 meskipun Zeta > Alpha secara alfabetis
  assert.equal(titles[2], 'dari catatan: Alpha Note Match');
  assert.equal(titles[3], 'dari catatan: Beta Note Match');
});

test('Tiket 05 - Validasi CSS: .select-sort-order memakai token resmi dan focus ring', () => {
  const css = fs.readFileSync(styleCssPath, 'utf8');
  assert.match(css, /\.select-sort-order\s*\{/, 'Harus ada style untuk .select-sort-order');
  assert.match(css, /\.select-sort-order:focus-visible/, 'Harus ada focus-visible ring untuk .select-sort-order');
});

test('Tiket 05 - Simpan data baru mempertahankan state.sortOrder az dan opsi selected di dropdown', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const selectSort = env.getOrCreateElement('select-sort-order');
  const resultList = env.getOrCreateElement('result-list');
  const appState = env.sandbox.module.exports.state;

  // Ganti ke 'az'
  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'az' } });
  assert.equal(appState.sortOrder, 'az');

  // Tambah item baru bernama "Aplikasi Arsip" lewat saveData
  const updatedData = {
    ...exampleData,
    items: [
      ...exampleData.items,
      {
        id: 'aplikasi-arsip',
        title: 'Aplikasi Arsip',
        tags: ['arsip'],
        links: [{ label: 'Buka', url: 'https://example.com/arsip' }],
        catatan: '',
        updated_at: '2026-10-02'
      }
    ]
  };

  await env.sandbox.module.exports.saveData(updatedData);

  // State tetap 'az'
  assert.equal(appState.sortOrder, 'az', 'sortOrder harus tetap az setelah simpan data baru');

  // Kontrol dibangun sekali saja sejak tiket 01, jadi pilihannya tidak lagi
  // tercermin lewat atribut selected pada markup. Yang dijaga adalah kontrolnya
  // masih ada tepat satu kali, dan urutannya masih berlaku seperti di bawah.
  const kemunculan = (env.panelIndeks.innerHTML.match(/id="select-sort-order"/g) || []).length;
  assert.equal(kemunculan, 1, 'Pengatur urutan harus tetap ada tepat satu kali setelah simpan data');

  // Item baru "Aplikasi Arsip" harus menjadi urutan pertama di DOM karena A-Z
  // Penanda pencarian ("dari catatan:") berada di dalam span nama sebagai
  // tag, jadi teksnya ikut diambil.
  const titles = [...resultList.innerHTML.matchAll(/<span class="sel-nama">([\s\S]*?)<\/span>\s*<\/span>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  assert.equal(titles[0], 'Aplikasi Arsip', 'Aplikasi Arsip harus di urutan pertama alfabetis');
});

test('Tiket 05 - Tie-breaker: jika judul identik pada sortOrder az, urutkan updated_at menurun', async () => {
  const duplicateTitlesData = {
    version: 1,
    items: [
      { id: 'item-lama', title: 'SOP Pelayanan', tags: ['sop'], links: [], catatan: '', updated_at: '2026-09-01' },
      { id: 'item-baru', title: 'SOP Pelayanan', tags: ['sop'], links: [], catatan: '', updated_at: '2026-09-30' }
    ],
    todo: [],
    logs: [],
    pinned_tags: ['sop']
  };

  const env = createTestEnvironment(duplicateTitlesData);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const selectSort = env.getOrCreateElement('select-sort-order');
  const resultList = env.getOrCreateElement('result-list');

  selectSort.trigger('change', { target: { id: 'select-sort-order', value: 'az' } });

  const ids = [...resultList.innerHTML.matchAll(/class="[^"]*baris-tabel[^"]*"[^>]*data-id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['item-baru', 'item-lama'], 'Item dengan updated_at lebih baru harus mendahului item lama saat judul identik');
});

