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

  function normalizeData(raw) {
    if (!raw || typeof raw !== 'object') {
      return createEmptyData();
    }
    return {
      version: raw.version || 1,
      items: Array.isArray(raw.items) ? raw.items : [],
      todo: Array.isArray(raw.todo) ? raw.todo : [],
      logs: Array.isArray(raw.logs) ? raw.logs : [],
      pinned_tags: Array.isArray(raw.pinned_tags) ? raw.pinned_tags : []
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isLocalPath(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return /^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\') || trimmed.toLowerCase().startsWith('file:');
  }

  function buildRekapText(results) {
    const countLapis1 = results.filter(r => r.lapis === 1).length;
    const countLapis2 = results.filter(r => r.lapis === 2).length;
    const countLapis3 = results.filter(r => r.lapis === 3).length;

    const parts = [];
    if (countLapis1 > 0) parts.push(`${countLapis1} langsung`);
    if (countLapis2 > 0) parts.push(`${countLapis2} terkait`);
    if (countLapis3 > 0) parts.push(`${countLapis3} dari catatan`);

    return parts.join(', ');
  }

  function showToast(message) {
    const existing = document.querySelector('.toast-notice');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2500);
  }

  function showManualCopyModal(text) {
    const existing = document.querySelector('.modal-overlay');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-copy-title">
        <div id="modal-copy-title" class="modal-message">Gagal menyalin - pilih dan salin manual dari kotak di bawah</div>
        <input type="text" class="modal-input" readonly value="${escapeHtml(text)}">
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary btn-close-modal">Tutup</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.modal-input');
    if (input) {
      input.focus();
      input.select();
    }

    const closeBtn = overlay.querySelector('.btn-close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  }

  function copyToClipboard(text, isLocal) {
    if (!text) return;

    function onCopySuccess() {
      if (isLocal) {
        showToast('Path lokal hanya bisa dibuka di jalur Pro; teks sudah disalin');
      } else {
        showToast('Teks sudah disalin');
      }
    }

    function tryExecCommandFallback() {
      let succeeded = false;
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        succeeded = false;
      }

      if (succeeded) {
        onCopySuccess();
      } else {
        showManualCopyModal(text);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(onCopySuccess)
        .catch(tryExecCommandFallback);
    } else {
      tryExecCommandFallback();
    }
  }

  function getSearchFunction() {
    if (typeof searchItems === 'function') {
      return searchItems;
    }
    if (typeof window !== 'undefined' && typeof window.searchItems === 'function') {
      return window.searchItems;
    }
    return function (itemList) {
      return Array.isArray(itemList) ? itemList : [];
    };
  }

  function updateIndeksResults(query) {
    const rekapEl = document.getElementById('search-rekap');
    const resultListEl = document.getElementById('result-list');
    if (!resultListEl) return;

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
    const searchFn = getSearchFunction();
    const cleanQuery = (typeof query === 'string') ? query.trim() : '';

    const results = searchFn(items, query);

    let displayItems = [];
    if (cleanQuery === '') {
      if (rekapEl) {
        rekapEl.style.display = 'none';
        rekapEl.textContent = '';
      }
      displayItems = results.slice(0, 10);
    } else {
      if (rekapEl) {
        const rekapText = buildRekapText(results);
        if (rekapText) {
          rekapEl.textContent = rekapText;
          rekapEl.style.display = 'block';
        } else {
          rekapEl.style.display = 'none';
        }
      }
      displayItems = results;
    }

    if (displayItems.length === 0) {
      resultListEl.innerHTML = `
        <div class="no-results">Tidak ada item cocok. Coba kata lain atau tambahkan item baru</div>
      `;
      return;
    }

    const html = displayItems.map(item => {
      const primaryLink = (Array.isArray(item.links) && item.links.length > 0) ? item.links[0] : null;
      const primaryUrl = primaryLink ? (primaryLink.url || '') : '';
      const local = isLocalPath(primaryUrl);

      const tagsHtml = Array.isArray(item.tags)
        ? item.tags.map(tag => `<span class="chip-tag">${escapeHtml(tag)}</span>`).join('')
        : '';

      const titlePrefix = item.lapis === 3 ? '<span class="badge-catatan">dari catatan:</span> ' : '';

      const actionsHtml = local
        ? `<button type="button" class="btn btn-secondary btn-sm btn-copy" data-url="${escapeHtml(primaryUrl)}" data-local="true">Copy</button>`
        : `<a href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm btn-buka">Buka</a><button type="button" class="btn btn-secondary btn-sm btn-copy" data-url="${escapeHtml(primaryUrl)}" data-local="false">Copy</button>`;

      return `
        <div class="result-item" data-id="${escapeHtml(item.id || '')}">
          <div class="result-header">
            <div class="result-title">${titlePrefix}${escapeHtml(item.title || '')}</div>
            <div class="result-tags">${tagsHtml}</div>
          </div>
          <div class="result-body">
            <div class="result-catatan">${escapeHtml(item.catatan || '')}</div>
            <div class="result-actions">${actionsHtml}</div>
          </div>
        </div>
      `;
    }).join('');

    resultListEl.innerHTML = html;
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
      return;
    }

    const existingInput = document.getElementById('search-input');
    if (!existingInput) {
      container.innerHTML = `
        <div class="search-bar-wrap">
          <input type="text" id="search-input" class="search-input" placeholder="Cari judul, tag, atau isi dokumen..." autocomplete="off">
        </div>
        <div id="search-rekap" class="search-rekap" style="display: none;"></div>
        <div id="result-list" class="result-list"></div>
      `;

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          updateIndeksResults(e.target.value);
        });
      }

      const resultListEl = document.getElementById('result-list');
      if (resultListEl) {
        resultListEl.addEventListener('click', (e) => {
          const copyBtn = e.target.closest('.btn-copy');
          if (copyBtn) {
            e.preventDefault();
            const url = copyBtn.getAttribute('data-url');
            const isLocal = copyBtn.getAttribute('data-local') === 'true';
            copyToClipboard(url, isLocal);
          }
        });
      }

      updateIndeksResults('');
    } else {
      updateIndeksResults(existingInput.value);
    }
  }

  function loadData() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      state.storageBlocked = false;
    } catch (err) {
      state.storageBlocked = true;
      if (!state.data) {
        state.data = createEmptyData();
      }
      updateStatusBar();
      renderIndeksView();
      return state.data;
    }

    if (!raw) {
      state.data = createEmptyData();
    } else {
      try {
        const parsed = JSON.parse(raw);
        state.data = normalizeData(parsed);
      } catch (parseErr) {
        state.data = createEmptyData();
      }
    }

    updateStatusBar();
    renderIndeksView();
    return state.data;
  }

  function saveData(newData) {
    if (!newData || typeof newData !== 'object') return false;

    const normalized = normalizeData(newData);
    state.data = normalized;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      state.storageBlocked = false;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      state.savedAt = `${hours}:${minutes}`;

      updateStatusBar();
      renderIndeksView();
      return true;
    } catch (err) {
      state.storageBlocked = true;
      updateStatusBar();
      // Jangan re-render DOM agar isian atau form yang sedang aktif tidak hilang
      return false;
    }
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

    if (tabName === 'indeks') {
      const searchInput = document.getElementById('search-input');
      if (searchInput && typeof searchInput.focus === 'function') {
        searchInput.focus();
      }
    }
  }

  function init() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          switchTab(targetTab);
        }
      });
    });

    loadData();
    switchTab(state.activeTab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.saveData = saveData;
  window.loadData = loadData;
})();
