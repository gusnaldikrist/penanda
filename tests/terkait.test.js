import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'lite', 'search.js');
const styleCssPath = path.join(repoRoot, 'src', 'lite', 'style.css');

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
        if (sel === '.result-item' && className.includes('result-item')) return el;
        if (sel === '#zone-terkait' && (id === 'zone-terkait' || className.includes('zone-terkait'))) return el;
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
    navigator: options.navigator || {
      clipboard: {
        writeText: async () => {}
      }
    },
    setTimeout: (fn, delay) => setTimeout(fn, delay),
    clearTimeout,
    console
  };

  vm.createContext(sandbox);

  const searchJs = fs.readFileSync(searchJsPath, 'utf8');
  vm.runInContext(searchJs, sandbox);

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  vm.runInContext(appJs, sandbox);

  return {
    sandbox,
    getOrCreateElement,
    panelIndeks,
    statusBar,
    toasts,
    modals,
    triggerDoc: domDocument.trigger,
    triggerWin: mockWindow.trigger
  };
}

test('Tiket 05 - Zona 2 (Harian): memuat 2 chip dari data contoh (SLiMS Bulian, Sheet Admin TA)', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const zoneHarian = env.getOrCreateElement('zone-harian');
  assert.ok(zoneHarian, 'Elemen #zone-harian harus ada di layar Indeks');
  assert.match(zoneHarian.innerHTML, /HARIAN/i, 'Label HARIAN harus ada');
  assert.match(zoneHarian.innerHTML, /SLiMS Bulian/, 'SLiMS Bulian harus muncul di baris Harian');
  assert.match(zoneHarian.innerHTML, /Sheet Admin TA/, 'Sheet Admin TA harus muncul di baris Harian');
  assert.doesNotMatch(zoneHarian.innerHTML, /Repository UNIGA/, 'Repository UNIGA bukan tag harian');
});

test('Tiket 05 - Zona 3 (Kartu Pinned Tags): menampilkan TA 2, Wisuda 2, Magang 1 dan klik menyaring hasil', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

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

test('Tiket 05 - Filter bertumpuk: ketik "ta" lalu klik kartu Magang menyaring ke irisan keduanya', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

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

test('Tiket 05 - Zona 5 (Terkait): klik badan baris Sheet Admin TA memunculkan Terkait tanpa dirinya sendiri', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const resultList = env.getOrCreateElement('result-list');
  const zoneTerkait = env.getOrCreateElement('zone-terkait');

  // Sebelum ada baris difokuskan, zona Terkait tersembunyi
  assert.equal(zoneTerkait.style.display, 'none', 'Zona terkait tersembunyi saat belum ada fokus');

  // Simulasikan klik pada badan baris Sheet Admin TA (id: sheet-ta-admin)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka') return null; // bukan tombol
        if (sel === '.result-item') {
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
  assert.notEqual(zoneTerkait.style.display, 'none', 'Zona terkait harus tampil');
  assert.match(zoneTerkait.innerHTML, /TERKAIT/i, 'Label Terkait harus ada');
  assert.match(zoneTerkait.innerHTML, /Biasanya bareng ini/i, 'Subjudul Biasanya bareng ini harus ada');

  // Menampilkan item dengan irisan tag terbanyak (Repository UNIGA, Sheet Job Training, SLiMS Bulian)
  assert.match(zoneTerkait.innerHTML, /Repository UNIGA/, 'Repository UNIGA memiliki irisan tag ta & wisuda');
  assert.match(zoneTerkait.innerHTML, /Sheet Job Training/, 'Sheet Job Training memiliki irisan tag ta');

  // Sheet Admin TA TIDAK boleh muncul di dalam daftar item terkait dirinya sendiri
  assert.doesNotMatch(
    zoneTerkait.innerHTML,
    /class="[^"]*terkait-item[^"]*"[^>]*>Sheet Admin TA/i,
    'Sheet Admin TA tidak boleh muncul di daftar terkait dirinya'
  );
});

test('Tiket 05 - Klik tombol aksi Buka/Copy/Ubah tidak memicu fokus baris', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const resultList = env.getOrCreateElement('result-list');
  const zoneTerkait = env.getOrCreateElement('zone-terkait');

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
        if (sel === '.result-item') {
          return {
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  // Zona terkait tetap tersembunyi karena yang diklik adalah tombol Copy
  assert.equal(zoneTerkait.style.display, 'none', 'Klik tombol Copy tidak boleh memicu zona Terkait');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Baris tidak boleh berstatus .focused setelah klik Copy');

  // Simulasikan klik tombol Ubah
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-ubah') return { className: 'btn-ubah' };
        if (sel === '.result-item') {
          return {
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  assert.equal(zoneTerkait.style.display, 'none', 'Klik tombol Ubah tidak boleh memicu zona Terkait');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Baris tidak boleh berstatus .focused setelah klik Ubah');
});

test('Tiket 05 - Tombol Esc dan klik luar melepas fokus dan menyembunyikan Zona Terkait', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const resultList = env.getOrCreateElement('result-list');
  const zoneTerkait = env.getOrCreateElement('zone-terkait');

  // 1. Fokuskan baris sheet-ta-admin
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.result-item') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });

  assert.notEqual(zoneTerkait.style.display, 'none', 'Zona terkait aktif setelah baris diklik');

  // Re-click pada baris yang sama tidak melepas fokus (fokus tetap aktif)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.result-item') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });
  assert.notEqual(zoneTerkait.style.display, 'none', 'Re-click pada baris yang sama harus tetap fokus');

  // 2. Tekan Esc: melepas fokus
  env.triggerDoc('keydown', { key: 'Escape' });
  assert.equal(zoneTerkait.style.display, 'none', 'Esc harus menyembunyikan zona terkait');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Kelas .focused harus dilepas oleh Esc');

  // 3. Fokuskan lagi lalu uji klik luar (outside click)
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy' || sel === '.btn-buka' || sel === '.btn-ubah') return null;
        if (sel === '.result-item') {
          return { getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null };
        }
        return null;
      }
    }
  });
  assert.notEqual(zoneTerkait.style.display, 'none', 'Zona terkait aktif kembali');

  // Trigger klik luar (target bukan .result-item dan bukan #zone-terkait)
  env.triggerDoc('click', {
    target: {
      closest: () => null
    }
  });
  assert.equal(zoneTerkait.style.display, 'none', 'Klik luar harus menyembunyikan zona terkait');
  assert.doesNotMatch(resultList.innerHTML, /focused/, 'Kelas .focused harus dilepas oleh klik luar');
});

test('Tiket 05 - Klik kartu tag tanpa kata kunci menampilkan seluruh item tanpa terpotong 10 item', () => {
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

  // Hitung jumlah result-item di innerHTML
  const countMatches = (resultList.innerHTML.match(/class="result-item/g) || []).length;
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
