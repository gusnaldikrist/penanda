import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = path.resolve('.');
const htmlPath = path.join(repoRoot, 'src', 'lite', 'index.html');
const cssPath = path.join(repoRoot, 'src', 'lite', 'style.css');
const appJsPath = path.join(repoRoot, 'src', 'lite', 'app.js');
const searchJsPath = path.join(repoRoot, 'src', 'lite', 'search.js');
const adapterJsPath = path.join(repoRoot, 'src', 'lite', 'storage-adapter.js');

test('File dasar tiket 01 harus ada', () => {
  assert.ok(fs.existsSync(htmlPath), 'index.html harus ada');
  assert.ok(fs.existsSync(cssPath), 'style.css harus ada');
  assert.ok(fs.existsSync(appJsPath), 'app.js harus ada');
  assert.ok(fs.existsSync(searchJsPath), 'search.js harus ada');
});

test('index.html: struktur, offline, aksesibilitas ARIA, dan script biasa', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Tanpa CDN / external requests
  assert.doesNotMatch(html, /https?:\/\//i, 'index.html tidak boleh memuat URL eksternal CDN/font');

  // Script biasa, BUKAN ES Module
  assert.doesNotMatch(html, /type=["']module["']/i, 'Script harus dimuat biasa, bukan module');
  assert.match(html, /<script src="search\.js"><\/script>/, 'search.js dimuat');
  assert.match(html, /<script src="app\.js"><\/script>/, 'app.js dimuat');

  // Tab buttons memiliki ID yang cocok dengan aria-labelledby pada panel
  assert.match(html, /id="tab-indeks"[^>]*data-tab="indeks"/, 'Tombol tab indeks memiliki id="tab-indeks"');
  assert.match(html, /id="tab-todo"[^>]*data-tab="todo"/, 'Tombol tab todo memiliki id="tab-todo"');
  assert.match(html, /id="tab-log"[^>]*data-tab="log"/, 'Tombol tab log memiliki id="tab-log"');

  // Panel tab dengan kaitan aria-labelledby yang valid
  assert.match(html, /id="panel-indeks"[^>]*aria-labelledby="tab-indeks"/, 'Panel indeks terhubung ke tab-indeks');
  assert.match(html, /id="panel-todo"[^>]*aria-labelledby="tab-todo"/, 'Panel todo terhubung ke tab-todo');
  assert.match(html, /id="panel-log"[^>]*aria-labelledby="tab-log"/, 'Panel log terhubung ke tab-log');

  assert.match(html, /id="status-bar"/, 'Status bar ada');
});

test('style.css: memuat seluruh 19 token warna resmi V1 dan skala font lengkap', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const tokens = [
    '--bg', '--card', '--band', '--band-2', '--line', '--line-strong',
    '--ink', '--body', '--muted', '--faint', '--on-ink',
    '--action', '--action-hover', '--action-soft',
    '--ok', '--ok-bg', '--warn', '--warn-bg', '--bad', '--bad-bg'
  ];

  for (const token of tokens) {
    assert.ok(css.includes(`${token}:`), `Token ${token} harus didefinisikan di style.css`);
  }

  // Skala font compact (15, 14, 13, 11-12px)
  assert.match(css, /--font-title:\s*15px;/, 'Font title 15px');
  assert.match(css, /--font-body:\s*14px;/, 'Font body 14px');
  assert.match(css, /--font-small:\s*13px;/, 'Font small 13px');
  assert.match(css, /--font-meta:\s*12px;/, 'Font meta 12px');
  assert.match(css, /--font-meta-sm:\s*11px;/, 'Font meta-sm 11px');
});

test('style.css: kendala bentuk (max radius 6px, no gradient, no heavy shadow, header 48px, padding kartu 8-12px)', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  // Header 48px
  assert.match(css, /--header-height:\s*48px;/, 'Header height harus 48px');

  // Tanpa gradien
  assert.doesNotMatch(css, /gradient/i, 'style.css tidak boleh memiliki gradien');

  // Tanpa box shadow kecuali focus ring (0 0 0 1px)
  const shadowMatches = css.match(/box-shadow:[^;]+;/gi) || [];
  for (const shadow of shadowMatches) {
    assert.match(shadow, /0 0 0 1px/i, `Box-shadow hanya diizinkan untuk focus ring, ditemukan: ${shadow}`);
  }

  // Radius maksimum 6px
  const radiusMatches = css.match(/border-radius:\s*([^;]+);/gi) || [];
  for (const radiusMatch of radiusMatches) {
    const rawVal = radiusMatch.replace(/border-radius:\s*/i, '').replace(';', '').trim();
    if (rawVal.includes('var(')) {
      assert.ok(rawVal.includes('--radius-sm') || rawVal.includes('--radius-md'), `Radius var harus sm (4px) atau md (6px): ${rawVal}`);
    } else {
      const pxMatch = rawVal.match(/^(\d+)px$/);
      if (pxMatch) {
        const px = parseInt(pxMatch[1], 10);
        assert.ok(px <= 6, `Radius maksimum adalah 6px, ditemukan ${px}px`);
      }
    }
  }

  // Padding kartu 8-12px sesuai token desain
  assert.match(css, /\.placeholder-card\s*\{[^}]*padding:\s*12px;/s, 'Padding kartu placeholder harus 12px');
});

test('app.js: inisialisasi state dan logika pergantian tab di memori', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  class ClassList {
    constructor() { this.classes = new Set(); }
    toggle(className, shouldAdd) {
      if (shouldAdd) this.classes.add(className);
      else this.classes.delete(className);
    }
    contains(className) { return this.classes.has(className); }
  }

  class Element {
    constructor(tag, attrs = {}) {
      this.tag = tag;
      this.attrs = attrs;
      this.classList = new ClassList();
      this.hidden = false;
      this.listeners = {};
      if (attrs.class) attrs.class.split(' ').forEach(c => this.classList.classes.add(c));
    }
    getAttribute(name) { return this.attrs[name]; }
    setAttribute(name, val) { this.attrs[name] = val; if (name === 'hidden') this.hidden = true; }
    removeAttribute(name) { delete this.attrs[name]; if (name === 'hidden') this.hidden = false; }
    addEventListener(event, fn) { this.listeners[event] = this.listeners[event] || []; this.listeners[event].push(fn); }
    click() { (this.listeners['click'] || []).forEach(fn => fn()); }
  }

  const buttons = [
    new Element('button', { id: 'tab-indeks', 'data-tab': 'indeks', class: 'nav-tab-btn active' }),
    new Element('button', { id: 'tab-todo', 'data-tab': 'todo', class: 'nav-tab-btn' }),
    new Element('button', { id: 'tab-log', 'data-tab': 'log', class: 'nav-tab-btn' })
  ];
  const panels = [
    new Element('section', { id: 'panel-indeks', class: 'tab-panel active' }),
    new Element('section', { id: 'panel-todo', class: 'tab-panel', hidden: '' }),
    new Element('section', { id: 'panel-log', class: 'tab-panel', hidden: '' })
  ];
  const statusBar = new Element('div', { id: 'status-bar' });

  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll: (selector) => {
        if (selector === '.nav-tab-btn') return buttons;
        if (selector === '.tab-panel') return panels;
        return [];
      },
      getElementById: (id) => {
        if (id === 'status-bar') return statusBar;
        if (id === 'panel-indeks') return panels[0];
        if (id === 'panel-todo') return panels[1];
        if (id === 'panel-log') return panels[2];
        return null;
      }
    },
    window: {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    // Environment minimal untuk storage-adapter.js (Tiket 11).
    // Fetch selalu gagal supaya jalur Lite yang disimulasikan.
    fetch: async () => { throw new TypeError('Failed to fetch'); },
    AbortController,
    setTimeout, clearTimeout,
    console, Date
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };

  vm.createContext(sandbox);
  // Adapter harus lebih dulu: app.js berhenti kalau adapter belum ada
  vm.runInContext(fs.readFileSync(adapterJsPath, 'utf8'), sandbox);
  vm.runInContext(appJs, sandbox);

  // Verifikasi tab awal: Indeks aktif, Todo & Log tersembunyi
  assert.ok(buttons[0].classList.contains('active'), 'Tombol Indeks harus active');
  assert.ok(panels[0].classList.contains('active'), 'Panel Indeks harus active');
  assert.equal(panels[0].hidden, false, 'Panel Indeks tidak boleh hidden');

  // Klik Todo
  buttons[1].click();
  assert.ok(buttons[1].classList.contains('active'), 'Tombol Todo active');
  assert.ok(panels[1].classList.contains('active'), 'Panel Todo active');
  assert.equal(panels[1].hidden, false, 'Panel Todo tampil');
  assert.equal(panels[0].classList.contains('active'), false, 'Panel Indeks non-aktif');
  assert.equal(panels[0].hidden, true, 'Panel Indeks hidden');

  // Klik Log
  buttons[2].click();
  assert.ok(buttons[2].classList.contains('active'), 'Tombol Log active');
  assert.ok(panels[2].classList.contains('active'), 'Panel Log active');
  assert.equal(panels[2].hidden, false, 'Panel Log tampil');
  assert.equal(panels[1].hidden, true, 'Panel Todo hidden');

  // Klik kembali Indeks
  buttons[0].click();
  assert.ok(buttons[0].classList.contains('active'), 'Tombol Indeks active');
  assert.ok(panels[0].classList.contains('active'), 'Panel Indeks active');
  assert.equal(panels[0].hidden, false, 'Panel Indeks tampil');
  assert.equal(panels[2].hidden, true, 'Panel Log hidden');
});
