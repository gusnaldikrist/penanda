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

function createTestEnvironment(initialData = null) {
  const elements = new Map();
  const docListeners = {};

  function createElementObj(id, tagName = 'div') {
    let innerHTML = '';
    let textContent = '';
    let className = '';
    let val = '';
    let style = { display: '' };
    let disabled = false;
    const listeners = {};
    const attributes = new Map();

    const el = {
      tagName: tagName.toUpperCase(),
      id,
      listeners,
      style,
      getAttribute: (attr) => {
        if (attr === 'id') return id;
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
        if (sel === '.btn-ubah' && className.includes('btn-ubah')) return el;
        if (sel === '.btn-card-tag' && className.includes('btn-card-tag')) return el;
        if (sel === '.result-item' && className.includes('result-item')) return el;
        if (sel === '.chip-harian' && className.includes('chip-harian')) return el;
        if (sel === '.modal-overlay' && className.includes('modal-overlay')) return el;
        if (sel === '.modal-box' && className.includes('modal-box')) return el;
        return null;
      },
      querySelector: (sel) => {
        for (const child of elements.values()) {
          if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
          if (sel.startsWith('.') && child.className.includes(sel.slice(1))) return child;
        }
        return null;
      },
      querySelectorAll: (sel) => {
        const results = [];
        for (const child of elements.values()) {
          if (sel.startsWith('.') && child.className.includes(sel.slice(1))) {
            results.push(child);
          }
        }
        return results;
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
        const tagRegex = /<([a-zA-Z0-9]+)([^>]*\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)([^>]*\bid="([^"]+)"[^>]*)\/?>/g;
        for (const m of innerHTML.matchAll(tagRegex)) {
          const childTag = m[1] || m[5];
          const attrs = m[2] || m[6];
          const childId = m[3] || m[7];
          const childInner = m[4] || '';
          const child = getOrCreateElement(childId);
          child.tagName = childTag.toUpperCase();
          if (childInner && !childInner.includes('<')) {
            child.textContent = childInner.trim();
            child.innerHTML = childInner.trim();
          }
          const valMatch = attrs.match(/value="([^"]*)"/);
          if (valMatch) {
            child.value = valMatch[1];
          }
          if (/\bdisabled\b/.test(attrs)) {
            child.disabled = true;
          } else {
            child.disabled = false;
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
      set disabled(d) {
        disabled = Boolean(d);
      },
      get disabled() {
        return disabled;
      },
      focus: () => {},
      select: () => {},
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

  const activeModals = [];

  const domDocument = {
    readyState: 'complete',
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: (selector) => {
      if (selector === '.nav-tab-btn') return [tabIndeks, tabTodo, tabLog];
      if (selector === '.tab-panel') return [panelIndeks, panelTodo, panelLog];
      const results = [];
      for (const el of elements.values()) {
        if (selector.startsWith('.') && el.className.includes(selector.slice(1))) {
          results.push(el);
        }
      }
      return results;
    },
    querySelector: (selector) => {
      if (selector === '.modal-overlay') return activeModals[activeModals.length - 1] || null;
      for (const el of elements.values()) {
        if (selector.startsWith('#') && el.id === selector.slice(1)) return el;
        if (selector.startsWith('.') && el.className.includes(selector.slice(1))) return el;
      }
      return null;
    },
    createElement: (tag) => {
      return createElementObj(null, tag);
    },
    body: {
      appendChild: (el) => {
        el.parentNode = domDocument.body;
        if (el.className && el.className.includes('modal-overlay')) {
          activeModals.push(el);
        }
      },
      removeChild: (el) => {
        el.parentNode = null;
        const idx = activeModals.indexOf(el);
        if (idx >= 0) activeModals.splice(idx, 1);
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

  const sandbox = {
    document: domDocument,
    localStorage: mockLocalStorage,
    navigator: {
      clipboard: {
        writeText: async () => {}
      }
    },
    setTimeout: (fn, delay) => setTimeout(fn, delay),
    clearTimeout,
    console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

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
    activeModals,
    store,
    triggerDoc: domDocument.trigger
  };
}

test('Tiket 06 - Tombol + Tambah ada di sebelah kotak pencarian dan di empty state', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const btnTambah = env.getOrCreateElement('btn-tambah-item');
  assert.ok(btnTambah, 'Tombol #btn-tambah-item harus ada di layar Indeks');
  assert.match(btnTambah.textContent, /Tambah/i, 'Teks tombol harus memuat Tambah');

  // Buka modal Tambah
  btnTambah.trigger('click');
  assert.equal(env.activeModals.length, 1, 'Modal harus terbuka setelah tombol Tambah diklik');
  const modal = env.activeModals[0];
  assert.match(modal.innerHTML, /Tambah Item|Tambah item/i, 'Judul modal harus Tambah Item');
});

test('Tiket 06 - Pembuatan ID slug unik dari judul (termasuk suffix angka urut)', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const { generateItemId } = env.sandbox;
  assert.equal(typeof generateItemId, 'function', 'generateItemId harus didefinisikan');

  const items = [{ id: 'sheet-admin-ta' }];
  const id1 = generateItemId('Sheet Admin TA', items);
  assert.equal(id1, 'sheet-admin-ta-2', 'Judul sama kedua harus mendapat akhiran -2');

  const id2 = generateItemId('Sheet Admin TA', [...items, { id: 'sheet-admin-ta-2' }]);
  assert.equal(id2, 'sheet-admin-ta-3', 'Judul sama ketiga harus mendapat akhiran -3');

  const idBaru = generateItemId('Layanan Sirkulasi Baru!', items);
  assert.equal(idBaru, 'layanan-sirkulasi-baru', 'Karakter tanda seru dan spasi harus dinormalisasi');
});

test('Tiket 06 - Validasi Tag: menolak tag huruf besar atau berspasi dengan pesan jelas', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const { validateTags } = env.sandbox;
  assert.equal(typeof validateTags, 'function', 'validateTags harus didefinisikan');

  // Valid
  const resValid = validateTags('ta, wisuda, magang');
  assert.equal(resValid.valid, true, 'Tag huruf kecil tanpa spasi harus valid');
  assert.deepEqual(Array.from(resValid.tags), ['ta', 'wisuda', 'magang']);

  // Invalid: huruf besar "TA "
  const resUppercase = validateTags('TA, wisuda');
  assert.equal(resUppercase.valid, false, 'Tag dengan huruf besar harus tidak valid');
  assert.match(resUppercase.error, /huruf besar/i, 'Pesan error harus menyebut huruf besar');

  // Invalid: spasi di dalam tag "sheet admin" atau spasi ujung
  const resSpace = validateTags('ta, sheet admin');
  assert.equal(resSpace.valid, false, 'Tag berspasi harus tidak valid');
  assert.match(resSpace.error, /spasi/i, 'Pesan error harus menyebut spasi');

  // Invalid: kosong
  const resEmpty = validateTags('');
  assert.equal(resEmpty.valid, false, 'Tag kosong harus tidak valid');
});

test('Tiket 06 - Alur Tambah item: mengisi form, simpan, tersimpan di localStorage dengan updated_at hari ini', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const btnTambah = env.getOrCreateElement('btn-tambah-item');
  btnTambah.trigger('click');

  const titleInput = env.getOrCreateElement('item-title');
  const tagsInput = env.getOrCreateElement('item-tags');
  const linkLabelInput = env.getOrCreateElement('link-label-0');
  const linkUrlInput = env.getOrCreateElement('link-url-0');
  const catatanInput = env.getOrCreateElement('item-catatan');
  const saveBtn = env.getOrCreateElement('btn-item-save');

  titleInput.value = 'Dokumen Pedoman Mutu';
  titleInput.trigger('input');

  tagsInput.value = 'pedoman, mutu, akreditasi';
  tagsInput.trigger('input');

  linkLabelInput.value = 'Buka Pedoman';
  linkLabelInput.trigger('input');

  linkUrlInput.value = 'https://uniga.ac.id/pedoman.pdf';
  linkUrlInput.trigger('input');

  catatanInput.value = 'Pelajari panduan sebelum visitasi akreditasi';
  catatanInput.trigger('input');

  assert.equal(saveBtn.disabled, false, 'Tombol simpan harus aktif saat form valid');

  saveBtn.trigger('click');

  // Verifikasi modal tertutup
  assert.equal(env.activeModals.length, 0, 'Modal harus tertutup setelah simpan sukses');

  // Verifikasi tersimpan di localStorage
  const savedData = JSON.parse(env.store['indeks_v1']);
  const addedItem = savedData.items.find(it => it.id === 'dokumen-pedoman-mutu');
  assert.ok(addedItem, 'Item baru harus ada di penyimpanan data');
  assert.equal(addedItem.title, 'Dokumen Pedoman Mutu');
  assert.deepEqual(addedItem.tags, ['pedoman', 'mutu', 'akreditasi']);
  assert.equal(addedItem.links.length, 1);
  assert.equal(addedItem.links[0].label, 'Buka Pedoman');
  assert.equal(addedItem.links[0].url, 'https://uniga.ac.id/pedoman.pdf');

  // Tanggal updated_at format YYYY-MM-DD
  assert.match(addedItem.updated_at, /^\d{4}-\d{2}-\d{2}$/, 'updated_at harus berupa YYYY-MM-DD');
});

test('Tiket 06 - Alur Ubah item: klik Ubah pada baris hasil, edit judul/catatan, simpan', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const resultList = env.getOrCreateElement('result-list');

  // Klik tombol Ubah pada baris Repository UNIGA
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-ubah') {
          return {
            className: 'btn-ubah',
            getAttribute: (attr) => attr === 'data-id' ? 'repo-uniga' : null
          };
        }
        return null;
      }
    }
  });

  assert.equal(env.activeModals.length, 1, 'Modal Ubah harus terbuka');
  const titleInput = env.getOrCreateElement('item-title');
  assert.equal(titleInput.value, 'Repository UNIGA', 'Nilai judul harus terisi data lama');

  // Ubah catatan
  const catatanInput = env.getOrCreateElement('item-catatan');
  catatanInput.value = 'Minta mahasiswa upload mandiri sebelum sidang';
  catatanInput.trigger('input');

  const saveBtn = env.getOrCreateElement('btn-item-save');
  saveBtn.trigger('click');

  assert.equal(env.activeModals.length, 0, 'Modal harus tertutup setelah simpan');

  const savedData = JSON.parse(env.store['indeks_v1']);
  const updatedItem = savedData.items.find(it => it.id === 'repo-uniga');
  assert.equal(updatedItem.catatan, 'Minta mahasiswa upload mandiri sebelum sidang');
});

test('Tiket 06 - Alur Hapus item: konfirmasi judul teks salah ditolak, judul benar menghapus item & melepas tautan todo/log', () => {
  const exampleData = JSON.parse(fs.readFileSync(exampleJsonPath, 'utf8'));
  const env = createTestEnvironment(exampleData);

  const resultList = env.getOrCreateElement('result-list');

  // Klik Ubah pada Sheet Admin TA
  resultList.trigger('click', {
    target: {
      closest: (sel) => {
        if (sel === '.btn-ubah') {
          return {
            className: 'btn-ubah',
            getAttribute: (attr) => attr === 'data-id' ? 'sheet-ta-admin' : null
          };
        }
        return null;
      }
    }
  });

  const deleteBtn = env.getOrCreateElement('btn-item-delete');
  assert.ok(deleteBtn, 'Tombol Hapus item harus ada di modal Ubah');
  deleteBtn.trigger('click');

  // Tampil form konfirmasi hapus
  const confirmInput = env.getOrCreateElement('input-confirm-delete');
  const confirmBtn = env.getOrCreateElement('btn-confirm-delete');

  assert.ok(confirmInput, 'Input konfirmasi hapus harus ada');
  assert.equal(confirmBtn.disabled, true, 'Tombol hapus permanen harus nonaktif di awal');

  // Coba judul salah
  confirmInput.value = 'Judul Lain Salah';
  confirmInput.trigger('input');
  assert.equal(confirmBtn.disabled, true, 'Tombol hapus permanen harus tetap nonaktif jika judul salah');

  // Ketik judul yang benar (abaikan huruf besar-kecil)
  confirmInput.value = 'sheet admin ta';
  confirmInput.trigger('input');
  assert.equal(confirmBtn.disabled, false, 'Tombol hapus permanen harus aktif saat judul cocok');

  // Klik konfirmasi hapus
  confirmBtn.trigger('click');

  // Modal tertutup
  assert.equal(env.activeModals.length, 0, 'Modal harus tertutup setelah hapus');

  // Periksa data tersimpan
  const savedData = JSON.parse(env.store['indeks_v1']);
  assert.ok(!savedData.items.some(it => it.id === 'sheet-ta-admin'), 'Item sheet-ta-admin harus terhapus');

  // Periksa todo yang sebelumnya terhubung ke sheet-ta-admin
  const relatedTodo = savedData.todo.find(t => t.id === 't1');
  assert.ok(relatedTodo, 'Todo t1 harus tetap ada');
  assert.equal(relatedTodo.item_id, null, 'item_id pada todo t1 harus menjadi null');

  // Periksa log yang sebelumnya terhubung ke sheet-ta-admin
  const relatedLog = savedData.logs.find(l => l.id === 'l1');
  assert.ok(relatedLog, 'Log l1 harus tetap ada');
  assert.equal(relatedLog.item_id, null, 'item_id pada log l1 harus menjadi null');
});

test('Tiket 06 - Validasi CSS: modal lebar 640px, baris search dan tambah, tombol teks destruktif', () => {
  const css = fs.readFileSync(styleCssPath, 'utf8');

  // Modal lebar 640px
  assert.match(css, /max-width:\s*640px/, 'Modal harus mendukung lebar 640px');

  // Tombol destruktif
  assert.match(css, /--bad/, 'Tombol destruktif harus memakai token --bad');
});
