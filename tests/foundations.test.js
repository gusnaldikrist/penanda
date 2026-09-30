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

test('File dasar tiket 01 harus ada', () => {
  assert.ok(fs.existsSync(htmlPath), 'index.html harus ada');
  assert.ok(fs.existsSync(cssPath), 'style.css harus ada');
  assert.ok(fs.existsSync(appJsPath), 'app.js harus ada');
  assert.ok(fs.existsSync(searchJsPath), 'search.js harus ada');
});

test('index.html: struktur, offline, dan script biasa', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Tanpa CDN / external requests
  assert.doesNotMatch(html, /https?:\/\//i, 'index.html tidak boleh memuat URL eksternal CDN/font');

  // Script biasa, BUKAN ES Module
  assert.doesNotMatch(html, /type=["']module["']/i, 'Script harus dimuat biasa, bukan module');
  assert.match(html, /<script src="search\.js"><\/script>/, 'search.js dimuat');
  assert.match(html, /<script src="app\.js"><\/script>/, 'app.js dimuat');

  // Tab dan panel
  assert.match(html, /data-tab="indeks"/, 'Tab indeks ada');
  assert.match(html, /data-tab="todo"/, 'Tab todo ada');
  assert.match(html, /data-tab="log"/, 'Tab log ada');
  assert.match(html, /id="panel-indeks"/, 'Panel indeks ada');
  assert.match(html, /id="panel-todo"/, 'Panel todo ada');
  assert.match(html, /id="panel-log"/, 'Panel log ada');
  assert.match(html, /id="status-bar"/, 'Status bar ada');
});

test('style.css: memuat seluruh 19 token warna resmi V1', () => {
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
});

test('style.css: kendala bentuk (max radius 6px, no gradient, no heavy shadow, header 48px)', () => {
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
  for (const r of radiusMatches) {
    const val = r.replace(/border-radius:\s*/i, '').replace(';', '').trim();
    if (val.includes('var(')) {
      assert.ok(val.includes('--radius-sm') || val.includes('--radius-md'), `Radius var harus sm (4px) atau md (6px): ${val}`);
    } else {
      const pxMatch = val.match(/^(\d+)px$/);
      if (pxMatch) {
        const px = parseInt(pxMatch[1], 10);
        assert.ok(px <= 6, `Radius maksimum adalah 6px, ditemukan ${px}px`);
      }
    }
  }
});

test('app.js: inisialisasi state dan logika interaktif pergantian tab', () => {
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  class ClassList {
    constructor() { this.classes = new Set(); }
    toggle(c, val) { if (val) this.classes.add(c); else this.classes.delete(c); }
    contains(c) { return this.classes.has(c); }
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
    new Element('button', { 'data-tab': 'indeks', class: 'nav-tab-btn active' }),
    new Element('button', { 'data-tab': 'todo', class: 'nav-tab-btn' }),
    new Element('button', { 'data-tab': 'log', class: 'nav-tab-btn' })
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
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(appJs, sandbox);

  const PenandaApp = sandbox.window.PenandaApp;
  assert.ok(PenandaApp, 'window.PenandaApp harus terekspos');
  assert.equal(PenandaApp.getState().activeTab, 'indeks', 'Tab awal harus indeks');

  // Klik Todo
  buttons[1].click();
  assert.equal(PenandaApp.getState().activeTab, 'todo', 'Tab aktif harus menjadi todo setelah diklik');
  assert.ok(panels[1].classList.contains('active'), 'Panel todo harus memiliki class active');
  assert.equal(panels[1].hidden, false, 'Panel todo harus ditampilkan');
  assert.equal(panels[0].classList.contains('active'), false, 'Panel indeks tidak boleh active');
  assert.equal(panels[0].hidden, true, 'Panel indeks harus hidden');

  // Klik Log
  buttons[2].click();
  assert.equal(PenandaApp.getState().activeTab, 'log', 'Tab aktif harus menjadi log setelah diklik');
  assert.ok(panels[2].classList.contains('active'), 'Panel log harus active');
  assert.equal(panels[2].hidden, false, 'Panel log harus ditampilkan');
  assert.equal(panels[1].hidden, true, 'Panel todo harus hidden');

  // Klik kembali Indeks
  buttons[0].click();
  assert.equal(PenandaApp.getState().activeTab, 'indeks', 'Tab aktif kembali ke indeks');
  assert.ok(panels[0].classList.contains('active'), 'Panel indeks active');
  assert.equal(panels[0].hidden, false, 'Panel indeks tampil');
});
