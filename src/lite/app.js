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
    activeTag: null,
    focusedItemId: null,
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
    let countLapis1 = 0;
    let countLapis2 = 0;
    let countLapis3 = 0;

    for (const r of results) {
      if (r.lapis === 1) countLapis1++;
      else if (r.lapis === 2) countLapis2++;
      else if (r.lapis === 3) countLapis3++;
    }

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
  }

  function copyToClipboard(text, isLocal) {
    if (!text) return;

    function onCopySuccess() {
      if (isLocal) {
        showToast('Path lokal hanya bisa dibuka di jalur Pro; teks sudah disalin');
      }
    }

    function tryClipboardApi() {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
          .then(onCopySuccess)
          .catch(() => {
            showManualCopyModal(text);
          });
      } else {
        showManualCopyModal(text);
      }
    }

    // Cara 1: Coba cara sinkron execCommand (mempertahankan user activation di file://)
    let syncSuccess = false;
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      syncSuccess = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (err) {
      syncSuccess = false;
    }

    if (syncSuccess) {
      onCopySuccess();
      return;
    }

    // Cara 2: Navigator clipboard API bila cara sinkron ditolak / gagal
    tryClipboardApi();
  }

  function formatTagLabel(tag) {
    if (!tag) return '';
    const str = String(tag).trim();
    if (str.length <= 3) return str.toUpperCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function computeRelatedItems(focusedItem, allItems) {
    if (!focusedItem || !Array.isArray(allItems)) return [];

    const focusedTags = (Array.isArray(focusedItem.tags) ? focusedItem.tags : [])
      .map(t => String(t).trim().toLowerCase())
      .filter(Boolean);

    if (focusedTags.length === 0) return [];

    const candidates = [];
    for (const item of allItems) {
      if (item.id === focusedItem.id) continue;

      const itemTags = (Array.isArray(item.tags) ? item.tags : [])
        .map(t => String(t).trim().toLowerCase())
        .filter(Boolean);

      const intersection = itemTags.filter(t => focusedTags.includes(t)).length;
      if (intersection > 0) {
        candidates.push({ item, score: intersection });
      }
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.item.updated_at || '').localeCompare(a.item.updated_at || '');
    });

    return candidates.slice(0, 3).map(c => c.item);
  }

  function renderHarianZone() {
    const zoneHarianEl = document.getElementById('zone-harian');
    if (!zoneHarianEl) return;

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
    const harianItems = items.filter(it => Array.isArray(it.tags) && it.tags.some(t => String(t).toLowerCase() === 'harian'));

    if (harianItems.length === 0) {
      zoneHarianEl.style.display = 'none';
      zoneHarianEl.innerHTML = '';
      return;
    }

    zoneHarianEl.style.display = 'flex';
    zoneHarianEl.innerHTML = `
      <div class="zone-label">HARIAN</div>
      <div class="harian-scroll">
        ${harianItems.map(item => {
          const primaryLink = (Array.isArray(item.links) && item.links.length > 0) ? item.links[0] : null;
          const primaryUrl = primaryLink ? (primaryLink.url || '') : '';
          const local = isLocalPath(primaryUrl);
          return `<a href="${escapeHtml(primaryUrl)}" class="chip-harian" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(primaryUrl)}" data-local="${local}">${escapeHtml(item.title || '')}</a>`;
        }).join('')}
      </div>
    `;
  }

  function renderKartuZone() {
    const zoneKartuEl = document.getElementById('zone-kartu');
    if (!zoneKartuEl) return;

    const pinnedTags = (state.data && Array.isArray(state.data.pinned_tags)) ? state.data.pinned_tags : [];
    if (pinnedTags.length === 0) {
      zoneKartuEl.style.display = 'none';
      zoneKartuEl.innerHTML = '';
      return;
    }

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];

    zoneKartuEl.style.display = 'flex';
    zoneKartuEl.innerHTML = `
      <div class="zone-label">KARTU</div>
      <div class="kartu-scroll">
        ${pinnedTags.map(tag => {
          const tagLower = String(tag).toLowerCase();
          const count = items.filter(it => Array.isArray(it.tags) && it.tags.some(t => String(t).toLowerCase() === tagLower)).length;
          const isActive = state.activeTag === tagLower;
          return `<button type="button" class="btn-card-tag ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tagLower)}"><span class="tag-title">${escapeHtml(formatTagLabel(tag))}</span> <span class="tag-count">${count}</span></button>`;
        }).join('')}
      </div>
    `;
  }

  function renderTerkaitZone(items) {
    const zoneTerkaitEl = document.getElementById('zone-terkait');
    if (!zoneTerkaitEl) return;

    if (!state.focusedItemId) {
      zoneTerkaitEl.style.display = 'none';
      zoneTerkaitEl.innerHTML = '';
      return;
    }

    const focusedItem = items.find(it => it.id === state.focusedItemId);
    if (!focusedItem) {
      zoneTerkaitEl.style.display = 'none';
      zoneTerkaitEl.innerHTML = '';
      return;
    }

    const related = computeRelatedItems(focusedItem, items);
    if (related.length === 0) {
      zoneTerkaitEl.style.display = 'none';
      zoneTerkaitEl.innerHTML = '';
      return;
    }

    zoneTerkaitEl.style.display = 'flex';
    zoneTerkaitEl.innerHTML = `
      <div class="terkait-header">TERKAIT "Biasanya bareng ini":</div>
      <div class="terkait-items">
        ${related.map(item => {
          const primaryLink = (Array.isArray(item.links) && item.links.length > 0) ? item.links[0] : null;
          const primaryUrl = primaryLink ? (primaryLink.url || '') : '';
          const local = isLocalPath(primaryUrl);
          return `<a href="${escapeHtml(primaryUrl)}" class="terkait-item" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(primaryUrl)}" data-local="${local}">${escapeHtml(item.title || '')}</a>`;
        }).join('<span class="terkait-sep"> - </span>')}
      </div>
    `;
  }

  function updateIndeksResults(query) {
    const rekapEl = document.getElementById('search-rekap');
    const resultListEl = document.getElementById('result-list');
    if (!resultListEl) return;

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
    const searchFn = (typeof searchItems === 'function')
      ? searchItems
      : (typeof window !== 'undefined' ? window.searchItems : null);

    if (typeof searchFn !== 'function') return;

    let results = searchFn(items, query);

    // Bila ada filter kartu tag aktif (Tiket 05), saring hasil berdasarkan tag tersebut
    if (state.activeTag) {
      results = results.filter(item => Array.isArray(item.tags) && item.tags.some(t => String(t).toLowerCase() === state.activeTag.toLowerCase()));
    }

    // Jika baris yang sedang difokuskan keluar dari hasil saringan, lepas fokusnya
    if (state.focusedItemId && !results.some(r => r.id === state.focusedItemId)) {
      state.focusedItemId = null;
    }

    const cleanQuery = (typeof query === 'string') ? query.trim() : '';

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
      renderTerkaitZone(items);
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

      const isFocused = state.focusedItemId === item.id;

      return `
        <div class="result-item ${isFocused ? 'focused' : ''}" data-id="${escapeHtml(item.id || '')}">
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
    renderTerkaitZone(items);
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
        <div id="zone-harian" class="zone-harian"></div>
        <div id="zone-kartu" class="zone-kartu"></div>
        <div id="search-rekap" class="search-rekap" style="display: none;"></div>
        <div id="result-list" class="result-list"></div>
        <div id="zone-terkait" class="zone-terkait" style="display: none;"></div>
      `;

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          state.focusedItemId = null;
          updateIndeksResults(e.target.value);
        });
      }

      const zoneHarianEl = document.getElementById('zone-harian');
      if (zoneHarianEl) {
        zoneHarianEl.addEventListener('click', (e) => {
          const chip = e.target.closest('.chip-harian');
          if (chip) {
            const isLocal = chip.getAttribute('data-local') === 'true';
            if (isLocal) {
              e.preventDefault();
              const url = chip.getAttribute('data-url');
              copyToClipboard(url, true);
            }
          }
        });
      }

      const zoneKartuEl = document.getElementById('zone-kartu');
      if (zoneKartuEl) {
        zoneKartuEl.addEventListener('click', (e) => {
          const cardBtn = e.target.closest('.btn-card-tag');
          if (cardBtn) {
            const tag = cardBtn.getAttribute('data-tag');
            if (state.activeTag === tag) {
              state.activeTag = null;
            } else {
              state.activeTag = tag;
            }
            state.focusedItemId = null;
            renderKartuZone();
            const input = document.getElementById('search-input');
            updateIndeksResults(input ? input.value : '');
          }
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
            return;
          }

          const bukaBtn = e.target.closest('.btn-buka');
          if (bukaBtn) {
            return;
          }

          const itemRow = e.target.closest('.result-item');
          if (itemRow) {
            const id = itemRow.getAttribute('data-id');
            state.focusedItemId = (state.focusedItemId === id) ? null : id;
            const input = document.getElementById('search-input');
            updateIndeksResults(input ? input.value : '');
          }
        });
      }

      const zoneTerkaitEl = document.getElementById('zone-terkait');
      if (zoneTerkaitEl) {
        zoneTerkaitEl.addEventListener('click', (e) => {
          const terkaitLink = e.target.closest('.terkait-item');
          if (terkaitLink) {
            const isLocal = terkaitLink.getAttribute('data-local') === 'true';
            if (isLocal) {
              e.preventDefault();
              const url = terkaitLink.getAttribute('data-url');
              copyToClipboard(url, true);
            }
          }
        });
      }

      renderHarianZone();
      renderKartuZone();
      updateIndeksResults('');
    } else {
      renderHarianZone();
      renderKartuZone();
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

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.focusedItemId) {
          state.focusedItemId = null;
          const searchInput = document.getElementById('search-input');
          updateIndeksResults(searchInput ? searchInput.value : '');
        }
      });

      document.addEventListener('click', (e) => {
        if (state.focusedItemId) {
          if (!e.target.closest || (!e.target.closest('.result-item') && !e.target.closest('#zone-terkait'))) {
            state.focusedItemId = null;
            const searchInput = document.getElementById('search-input');
            updateIndeksResults(searchInput ? searchInput.value : '');
          }
        }
      });
    }

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
