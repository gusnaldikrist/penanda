import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const exampleJsonPath = path.join(repoRoot, 'src', 'shared', 'data.example.json');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'lite', 'search.js');

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
      closest: (sel) => null,
      classList: {
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
        set innerHTML(v) { innerHTML = String(v); },
        get innerHTML() { return innerHTML; },
        set textContent(v) { textContent = String(v); },
        get textContent() { return textContent; },
        set className(v) { className = String(v); },
        get className() { return className; },
        set value(v) { val = String(v); },
        get value() { return val; },
        select: () => { selected = true; },
        get isSelected() { return selected; },
        focus: () => {},
        addEventListener: (event, handler) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
        },
        querySelector: (sel) => {
          if (sel === '.modal-input') return { focus: () => {}, select: () => { selected = true; } };
          if (sel === '.btn-close-modal') return { addEventListener: () => {} };
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
    console
  };

  vm.createContext(sandbox);

  // Muat search.js dulu, lalu app.js
  const searchJs = fs.readFileSync(searchJsPath, 'utf8');
  vm.runInContext(searchJs, sandbox);

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  vm.runInContext(appJs, sandbox);

  return {
    sandbox,
    getOrCreateElement,
    panelIndeks,
    statusBar,
    toasts: toastsHistory,
    modals
  };
}

test('Tiket 04: Zona pencarian dan daftar hasil awal saat ada data', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

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

test('Tiket 04: Pencarian real-time dengan query "wisuda"', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

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

test('Tiket 04: Pencarian tanpa hasil menampilkan pesan ramah pengguna', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

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

test('Tiket 04: Tombol Buka dan Copy pada URL web vs path lokal Windows', () => {
  const customData = {
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
    logs: [],
    pinned_tags: []
  };

  const env = createTestEnvironment(customData);
  const resultList = env.getOrCreateElement('result-list');

  // Dokumen Web harus punya tombol Buka (dengan target _blank) dan Copy
  assert.match(resultList.innerHTML, /href="https:\/\/example\.com\/doc"/, 'Link Buka ada untuk URL web');
  assert.match(resultList.innerHTML, /target="_blank"/, 'Target _blank ada untuk membuka di tab baru');

  // Dokumen lokal di Lite TIDAK boleh menampilkan tombol Buka, hanya tombol Copy
  assert.doesNotMatch(resultList.innerHTML, /href="D:\\Skripsi\\draft\.docx"/, 'Path lokal tidak boleh punya tombol link Buka di Lite');
  assert.match(resultList.innerHTML, /data-local="true"/, 'Item lokal ditandai data-local="true"');
});

test('Tiket 04: Jaring pengaman Copy: Cara 1 (navigator.clipboard) sukses', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  let clipboardWritten = '';
  const mockNavigator = {
    clipboard: {
      writeText: async (text) => {
        clipboardWritten = text;
      }
    }
  };

  const env = createTestEnvironment(exampleData, { navigator: mockNavigator });
  const resultList = env.getOrCreateElement('result-list');

  // Simulasikan klik tombol Copy
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy') {
          return {
            getAttribute: (attr) => {
              if (attr === 'data-url') return 'https://lib.fkominfo.uniga.ac.id/login';
              if (attr === 'data-local') return 'false';
              return null;
            }
          };
        }
        return null;
      }
    }
  });

  // Tunggu microtask promise resolve
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(clipboardWritten, 'https://lib.fkominfo.uniga.ac.id/login', 'URL harus disalin ke clipboard');
  assert.equal(env.toasts.length, 1, 'Toast notifikasi harus muncul');
  assert.match(env.toasts[0].textContent, /Teks sudah disalin/, 'Pesan sukses salin untuk URL web');
});

test('Tiket 04: Jaring pengaman Copy: path lokal menampilkan arahan Pro', async () => {
  const customData = {
    version: 1,
    items: [
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
    logs: [],
    pinned_tags: []
  };

  let clipboardWritten = '';
  const mockNavigator = {
    clipboard: {
      writeText: async (text) => {
        clipboardWritten = text;
      }
    }
  };

  const env = createTestEnvironment(customData, { navigator: mockNavigator });
  const resultList = env.getOrCreateElement('result-list');

  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy') {
          return {
            getAttribute: (attr) => {
              if (attr === 'data-url') return 'D:\\Skripsi\\draft.docx';
              if (attr === 'data-local') return 'true';
              return null;
            }
          };
        }
        return null;
      }
    }
  });

  // Tunggu microtask promise resolve
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(clipboardWritten, 'D:\\Skripsi\\draft.docx', 'Path lokal harus disalin');
  assert.equal(env.toasts.length, 1, 'Toast harus muncul');
  assert.match(
    env.toasts[0].textContent,
    /Path lokal hanya bisa dibuka di jalur Pro; teks sudah disalin/,
    'Pesan konsekuensi path lokal harus tepat'
  );
});

test('Tiket 04: Jaring pengaman Copy: Cara 3 (modal manual fallback) muncul saat clipboard & execCommand gagal', async () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));

  // Clipboard API reject
  const mockNavigator = {
    clipboard: {
      writeText: () => Promise.reject(new Error('Clipboard denied'))
    }
  };

  const env = createTestEnvironment(exampleData, { navigator: mockNavigator });
  // execCommand gagal
  env.sandbox.document.execCommand = () => false;

  const resultList = env.getOrCreateElement('result-list');

  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-copy') {
          return {
            getAttribute: (attr) => {
              if (attr === 'data-url') return 'http://localhost:8089/bulian';
              if (attr === 'data-local') return 'false';
              return null;
            }
          };
        }
        return null;
      }
    }
  });

  // Tunggu microtask promise reject
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(env.modals.length, 1, 'Modal salin manual harus terbuka');
  assert.match(
    env.modals[0].innerHTML,
    /Gagal menyalin - pilih dan salin manual dari kotak di bawah/,
    'Pesan gagal salin manual harus sesuai spesifikasi'
  );
});
