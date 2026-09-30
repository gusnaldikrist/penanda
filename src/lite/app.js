// app.js — Aplikasi Penanda V1 (Frontend Lite)
// Dimuat sebagai script biasa (bukan ES module) agar bisa berjalan langsung dari file://

(function () {
  'use strict';

  const STORAGE_KEY = 'indeks_v1';

  function createEmptyData() {
    return {
      version: 1,
      items: [],
      todo: [],
      logs: [],
      pinned_tags: []
    };
  }

  const state = {
    activeTab: 'indeks',
    data: createEmptyData(),
    savedAt: null,
    storageBlocked: false
  };

  function updateStatusBar() {
    const statusBar = document.getElementById('status-bar');
    if (!statusBar) return;

    if (state.storageBlocked) {
      statusBar.className = 'status-bar error';
      statusBar.textContent = 'Penyimpanan lokal diblokir browser — beralih ke jalur Pro untuk menyimpan';
      return;
    }

    statusBar.className = 'status-bar';
    const count = (state.data && Array.isArray(state.data.items)) ? state.data.items.length : 0;
    if (state.savedAt) {
      statusBar.textContent = `Lite - ${count} item - tersimpan ${state.savedAt}`;
    } else {
      statusBar.textContent = `Lite - ${count} item`;
    }
  }

  function renderIndeksView() {
    const container = document.getElementById('panel-indeks');
    if (!container) return;

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Belum ada item kerja</div>
          <p class="empty-state-desc">Tambahkan akses dokumen pertama Anda atau muat dari berkas cadangan.</p>
          <div class="empty-state-actions">
            <button id="btn-empty-add" class="btn btn-primary">+ Tambah Item</button>
            <button id="btn-empty-import" class="btn btn-secondary">Import JSON</button>
          </div>
          <p class="path-notice">Path lokal hanya bisa dibuka di jalur Pro</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="placeholder-card">
          <h2>Data Indeks (${items.length} item tersimpan)</h2>
          <p>Pencarian 3 lapis dan kartu tag akan diimplementasikan pada Tiket 03–05.</p>
        </div>
      `;
    }
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.data = createEmptyData();
      } else {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.data = {
            version: parsed.version || 1,
            items: Array.isArray(parsed.items) ? parsed.items : [],
            todo: Array.isArray(parsed.todo) ? parsed.todo : [],
            logs: Array.isArray(parsed.logs) ? parsed.logs : [],
            pinned_tags: Array.isArray(parsed.pinned_tags) ? parsed.pinned_tags : []
          };
        } else {
          state.data = createEmptyData();
        }
      }
      state.storageBlocked = false;
    } catch (err) {
      state.storageBlocked = true;
      if (!state.data) {
        state.data = createEmptyData();
      }
    }

    updateStatusBar();
    renderIndeksView();
    return state.data;
  }

  function saveData(newData) {
    if (!newData || typeof newData !== 'object') return false;

    state.data = {
      version: newData.version || 1,
      items: Array.isArray(newData.items) ? newData.items : [],
      todo: Array.isArray(newData.todo) ? newData.todo : [],
      logs: Array.isArray(newData.logs) ? newData.logs : [],
      pinned_tags: Array.isArray(newData.pinned_tags) ? newData.pinned_tags : []
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      state.storageBlocked = false;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      state.savedAt = `${hh}:${mm}`;
    } catch (err) {
      state.storageBlocked = true;
    }

    updateStatusBar();
    renderIndeksView();
    return !state.storageBlocked;
  }

  function switchTab(tabName) {
    if (!['indeks', 'todo', 'log'].includes(tabName)) return;

    state.activeTab = tabName;

    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      const isTarget = panel.getAttribute('id') === `panel-${tabName}`;
      panel.classList.toggle('active', isTarget);
      if (isTarget) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  function init() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) switchTab(targetTab);
      });
    });

    switchTab(state.activeTab);
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.saveData = saveData;
  window.loadData = loadData;
  window.PenandaState = state;
})();
