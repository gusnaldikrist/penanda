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
    todoFilterStatus: 'semua',
    todoSearchQuery: '',
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

  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateItemId(title, existingItems) {
    if (!title) return 'item';
    let slug = String(title)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) slug = 'item';

    const existingIds = new Set(
      (Array.isArray(existingItems) ? existingItems : [])
        .map(item => item.id)
        .filter(id => Boolean(id))
    );

    if (!existingIds.has(slug)) {
      return slug;
    }

    let counter = 2;
    while (existingIds.has(`${slug}-${counter}`)) {
      counter++;
    }
    return `${slug}-${counter}`;
  }

  function validateTags(tagsInput) {
    if (typeof tagsInput !== 'string' || tagsInput.trim() === '') {
      return { valid: false, tags: [], error: 'Tag minimal 1 dan tidak boleh kosong' };
    }

    const rawTokens = tagsInput.split(',');
    const parsedTags = [];

    for (const token of rawTokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      if (/[A-Z]/.test(token)) {
        return { valid: false, tags: [], error: `Tag tidak boleh memuat huruf besar ("${trimmed}"). Gunakan huruf kecil tanpa spasi.` };
      }

      if (token.endsWith(' ') || /\s/.test(trimmed)) {
        return { valid: false, tags: [], error: `Tag tidak boleh memuat spasi ("${trimmed}"). Gunakan huruf kecil tanpa spasi.` };
      }

      if (!/^[a-z0-9-]+$/.test(trimmed)) {
        return { valid: false, tags: [], error: `Tag hanya boleh memuat huruf kecil, angka, dan tanda hubung ("${trimmed}").` };
      }

      if (!parsedTags.includes(trimmed)) {
        parsedTags.push(trimmed);
      }
    }

    if (parsedTags.length === 0) {
      return { valid: false, tags: [], error: 'Tag minimal 1 dan tidak boleh kosong' };
    }

    return { valid: true, tags: parsedTags, error: '' };
  }

  function closeActiveModal() {
    const existing = document.querySelector('.modal-overlay');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  function showDeleteConfirmation(item) {
    const modalBox = document.getElementById('modal-item-box');
    if (!modalBox) return;

    modalBox.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">Hapus Item</div>
        <button type="button" class="btn-close" id="btn-close-delete-modal" aria-label="Tutup">&times;</button>
      </div>
      <div class="modal-body delete-confirm-box">
        <div class="delete-warning">
          Menghapus <strong>${escapeHtml(item.title || '')}</strong> akan melepas tautan di todo dan log sekaligus. Aksi ini tidak dapat dibatalkan.
        </div>
        <div class="form-group">
          <label class="form-label" for="input-confirm-delete">Ketik judul item persis untuk konfirmasi:</label>
          <input type="text" id="input-confirm-delete" class="form-input" placeholder="${escapeHtml(item.title || '')}" autocomplete="off">
          <div class="form-hint">Huruf besar-kecil diabaikan</div>
        </div>
      </div>
      <div class="modal-footer">
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary btn-cancel-delete">Batal</button>
          <button type="button" id="btn-confirm-delete" class="btn-text-danger" disabled style="font-weight: 600; padding: 6px 12px;">Hapus Permanen</button>
        </div>
      </div>
    `;

    const inputConfirm = document.getElementById('input-confirm-delete');
    const confirmBtn = document.getElementById('btn-confirm-delete');
    const cancelBtn = modalBox.querySelector('.btn-cancel-delete');
    const closeBtn = document.getElementById('btn-close-delete-modal');

    if (inputConfirm && confirmBtn) {
      inputConfirm.addEventListener('input', (e) => {
        const typed = e.target.value.trim().toLowerCase();
        const target = String(item.title || '').trim().toLowerCase();
        confirmBtn.disabled = (typed !== target);
      });
      inputConfirm.focus();
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        openItemModal(item);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeActiveModal);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const typed = inputConfirm ? inputConfirm.value.trim().toLowerCase() : '';
        const target = String(item.title || '').trim().toLowerCase();
        if (typed !== target) return;

        if (state.data && Array.isArray(state.data.items)) {
          state.data.items = state.data.items.filter(it => it.id !== item.id);
        }

        if (state.data && Array.isArray(state.data.todo)) {
          state.data.todo.forEach(todo => {
            if (todo.item_id === item.id) {
              todo.item_id = null;
            }
          });
        }

        if (state.data && Array.isArray(state.data.logs)) {
          state.data.logs.forEach(logEntry => {
            if (logEntry.item_id === item.id) {
              logEntry.item_id = null;
            }
          });
        }

        if (state.focusedItemId === item.id) {
          state.focusedItemId = null;
        }

        const saveSuccess = saveData(state.data);
        if (!saveSuccess) {
          return;
        }

        closeActiveModal();
        renderIndeksView();
      });
    }
  }

  function openItemModal(itemToEdit = null) {
    closeActiveModal();

    const isEdit = Boolean(itemToEdit && itemToEdit.id);
    const initialTitle = isEdit ? (itemToEdit.title || '') : '';
    const initialTags = isEdit && Array.isArray(itemToEdit.tags) ? itemToEdit.tags.join(', ') : '';
    const initialCatatan = isEdit ? (itemToEdit.catatan || '') : '';
    let links = isEdit && Array.isArray(itemToEdit.links) && itemToEdit.links.length > 0
      ? itemToEdit.links.map(l => ({ label: l.label || '', url: l.url || '' }))
      : [{ label: '', url: '' }];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="modal-box" id="modal-item-box">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? 'Ubah Item' : 'Tambah Item'}</div>
          <button type="button" class="btn-close" id="btn-close-item-modal" aria-label="Tutup">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="item-title">Judul <span class="req">*</span></label>
            <input type="text" id="item-title" class="form-input" maxlength="120" placeholder="Judul item (1-120 karakter)" value="${escapeHtml(initialTitle)}">
            <div id="item-title-error" class="form-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="item-tags">Tag <span class="req">*</span></label>
            <input type="text" id="item-tags" class="form-input" placeholder="ta, sheet, admin (dipisah koma)" value="${escapeHtml(initialTags)}">
            <div class="form-hint">Huruf kecil tanpa spasi, dipisah koma</div>
            <div id="item-tags-error" class="form-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Link <span class="req">*</span></label>
            <div id="modal-link-rows" class="links-container"></div>
            <div>
              <button type="button" id="btn-add-link" class="btn btn-secondary btn-sm" style="margin-top: 4px;">+ Link lain</button>
            </div>
            <div id="item-links-error" class="form-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="item-catatan">Catatan</label>
            <textarea id="item-catatan" class="form-textarea" maxlength="200" placeholder="Catatan alur kerja / pemicu (opsional, maks 200 karakter)">${escapeHtml(initialCatatan)}</textarea>
            <div class="form-hint">Maksimal 200 karakter</div>
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? '<button type="button" id="btn-item-delete" class="btn-text-danger">Hapus item</button>' : '<div></div>'}
          <div class="modal-footer-actions">
            <button type="button" class="btn btn-secondary btn-cancel-modal">Batal</button>
            <button type="button" id="btn-item-save" class="btn btn-primary" disabled>Simpan</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const titleInput = document.getElementById('item-title');
    const tagsInput = document.getElementById('item-tags');
    const catatanInput = document.getElementById('item-catatan');
    const saveBtn = document.getElementById('btn-item-save');
    const linkRowsContainer = document.getElementById('modal-link-rows');
    const addLinkBtn = document.getElementById('btn-add-link');
    const closeBtn = document.getElementById('btn-close-item-modal');
    const cancelBtn = overlay.querySelector('.btn-cancel-modal');
    const deleteBtn = document.getElementById('btn-item-delete');

    function getFormLinks() {
      if (!linkRowsContainer) return [];
      const parsedLinks = [];
      links.forEach((link, idx) => {
        const labelInput = document.getElementById(`link-label-${idx}`);
        const urlInput = document.getElementById(`link-url-${idx}`);
        const labelValue = labelInput ? labelInput.value.trim() : (link.label || '').trim();
        const urlValue = urlInput ? urlInput.value.trim() : (link.url || '').trim();
        parsedLinks.push({ label: labelValue, url: urlValue });
      });
      return parsedLinks;
    }

    function renderLinkRows() {
      if (!linkRowsContainer) return;
      linkRowsContainer.innerHTML = links.map((link, idx) => `
        <div class="link-row" data-index="${idx}">
          <input type="text" id="link-label-${idx}" class="form-input link-label-input" placeholder="Label (mis. Buka Sheet)" maxlength="40" value="${escapeHtml(link.label || '')}">
          <input type="text" id="link-url-${idx}" class="form-input link-url-input" placeholder="URL atau path lokal" value="${escapeHtml(link.url || '')}">
          ${links.length > 1 ? `<button type="button" class="btn btn-secondary btn-sm btn-del-link" data-index="${idx}" title="Hapus link">&times;</button>` : ''}
        </div>
      `).join('');

      links.forEach((link, idx) => {
        const labelInput = document.getElementById(`link-label-${idx}`);
        const urlInput = document.getElementById(`link-url-${idx}`);
        if (labelInput) {
          labelInput.addEventListener('input', (e) => {
            link.label = e.target.value;
            validateForm();
          });
        }
        if (urlInput) {
          urlInput.addEventListener('input', (e) => {
            link.url = e.target.value;
            validateForm();
          });
        }
      });

      const delBtns = linkRowsContainer.querySelectorAll('.btn-del-link');
      delBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && links.length > 1) {
            links.splice(idx, 1);
            renderLinkRows();
            validateForm();
          }
        });
      });
    }

    function validateForm() {
      const titleValue = titleInput ? titleInput.value.trim() : '';
      const tagsValue = tagsInput ? tagsInput.value : '';
      const tagValidationResult = validateTags(tagsValue);
      const formLinks = getFormLinks();

      let linksValid = formLinks.length > 0;
      let hasAnyLinkInput = false;

      for (const formLink of formLinks) {
        if (formLink.label || formLink.url) {
          hasAnyLinkInput = true;
        }
        if (!formLink.label || !formLink.url || formLink.label.length > 40) {
          linksValid = false;
        }
      }

      const isTitleValid = titleValue.length >= 1 && titleValue.length <= 120;
      const isFormValid = isTitleValid && tagValidationResult.valid && linksValid;

      if (saveBtn) {
        saveBtn.disabled = !isFormValid;
      }

      const titleErrEl = document.getElementById('item-title-error');
      if (titleErrEl) {
        if (titleInput && titleInput.value.length > 120) {
          titleErrEl.textContent = 'Judul maksimal 120 karakter';
          titleErrEl.style.display = 'block';
        } else {
          titleErrEl.textContent = '';
          titleErrEl.style.display = 'none';
        }
      }

      const tagsErrEl = document.getElementById('item-tags-error');
      if (tagsErrEl) {
        if (!tagValidationResult.valid && tagsValue.trim() !== '') {
          tagsErrEl.textContent = tagValidationResult.error;
          tagsErrEl.style.display = 'block';
        } else {
          tagsErrEl.textContent = '';
          tagsErrEl.style.display = 'none';
        }
      }

      const linksErrEl = document.getElementById('item-links-error');
      if (linksErrEl) {
        if (hasAnyLinkInput && !linksValid) {
          linksErrEl.textContent = 'Setiap link wajib memiliki label (maks 40 karakter) dan URL/path';
          linksErrEl.style.display = 'block';
        } else {
          linksErrEl.textContent = '';
          linksErrEl.style.display = 'none';
        }
      }

      return isFormValid;
    }

    renderLinkRows();
    validateForm();

    if (titleInput) {
      titleInput.addEventListener('input', validateForm);
      titleInput.focus();
    }
    if (tagsInput) {
      tagsInput.addEventListener('input', validateForm);
    }
    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', () => {
        links.push({ label: '', url: '' });
        renderLinkRows();
        validateForm();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeActiveModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeActiveModal);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!validateForm()) return;

        const title = titleInput.value.trim();
        const tagValidationResult = validateTags(tagsInput.value);
        const cleanCatatan = catatanInput ? catatanInput.value.trim() : '';
        const cleanLinks = getFormLinks().filter(itemLink => itemLink.label && itemLink.url);
        const today = getTodayDateString();

        const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];

        if (isEdit) {
          const itemIndex = items.findIndex(candidate => candidate.id === itemToEdit.id);
          if (itemIndex >= 0) {
            items[itemIndex].title = title;
            items[itemIndex].tags = tagValidationResult.tags;
            items[itemIndex].links = cleanLinks;
            items[itemIndex].catatan = cleanCatatan;
            items[itemIndex].updated_at = today;
          }
        } else {
          const newId = generateItemId(title, items);
          items.unshift({
            id: newId,
            title,
            tags: tagValidationResult.tags,
            links: cleanLinks,
            catatan: cleanCatatan,
            updated_at: today
          });
        }

        state.data.items = items;
        const saveSuccess = saveData(state.data);
        if (!saveSuccess) {
          return;
        }

        closeActiveModal();
        renderIndeksView();
      });
    }

    if (deleteBtn && isEdit) {
      deleteBtn.addEventListener('click', () => {
        showDeleteConfirmation(itemToEdit);
      });
    }
  }

  function getPrimaryLinkInfo(item) {
    const primaryLink = (item && Array.isArray(item.links) && item.links.length > 0) ? item.links[0] : null;
    const url = primaryLink ? (primaryLink.url || '') : '';
    const label = primaryLink ? (primaryLink.label || 'Buka Link') : 'Buka Link';
    const isLocal = isLocalPath(url);
    return { link: primaryLink, url, label, isLocal };
  }

  function formatTagLabel(tag) {
    if (!tag) return '';
    const str = String(tag).trim();
    if (str.toLowerCase() === 'ta') return 'TA';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function computeRelatedItems(focusedItem, allItems) {
    if (!focusedItem || !Array.isArray(allItems)) return [];

    const focusedTags = (Array.isArray(focusedItem.tags) ? focusedItem.tags : [])
      .map(tag => String(tag).trim().toLowerCase())
      .filter(Boolean);

    if (focusedTags.length === 0) return [];

    const candidates = [];
    for (const item of allItems) {
      if (item.id === focusedItem.id) continue;

      const itemTags = (Array.isArray(item.tags) ? item.tags : [])
        .map(tag => String(tag).trim().toLowerCase())
        .filter(Boolean);

      const intersection = itemTags.filter(tag => focusedTags.includes(tag)).length;
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

    return candidates.slice(0, 3).map(candidate => candidate.item);
  }

  function renderHarianZone() {
    const zoneHarianEl = document.getElementById('zone-harian');
    if (!zoneHarianEl) return;

    const items = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
    const harianItems = items.filter(item => Array.isArray(item.tags) && item.tags.some(tag => String(tag).toLowerCase() === 'harian'));

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
          const { url, isLocal } = getPrimaryLinkInfo(item);
          return `<a href="${escapeHtml(url)}" class="chip-harian" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(url)}" data-local="${isLocal}">${escapeHtml(item.title || '')}</a>`;
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
          const count = items.filter(item => Array.isArray(item.tags) && item.tags.some(t => String(t).toLowerCase() === tagLower)).length;
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

    const focusedItem = items.find(item => item.id === state.focusedItemId);
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
          const { url, isLocal } = getPrimaryLinkInfo(item);
          return `<a href="${escapeHtml(url)}" class="terkait-item" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(url)}" data-local="${isLocal}">${escapeHtml(item.title || '')}</a>`;
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
      results = results.filter(item => Array.isArray(item.tags) && item.tags.some(tag => String(tag).toLowerCase() === state.activeTag.toLowerCase()));
    }

    // Jika baris yang sedang difokuskan keluar dari hasil saringan, lepas fokusnya
    if (state.focusedItemId && !results.some(r => r.id === state.focusedItemId)) {
      state.focusedItemId = null;
    }

    const cleanQuery = (typeof query === 'string') ? query.trim() : '';

    let displayItems = [];
    if (cleanQuery === '' && !state.activeTag) {
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
      const { url: primaryUrl, isLocal: local } = getPrimaryLinkInfo(item);

      const tagsHtml = Array.isArray(item.tags)
        ? item.tags.map(tag => `<span class="chip-tag">${escapeHtml(tag)}</span>`).join('')
        : '';

      const titlePrefix = item.lapis === 3 ? '<span class="badge-catatan">dari catatan:</span> ' : '';

      const actionsHtml = local
        ? `<button type="button" class="btn btn-secondary btn-sm btn-copy" data-url="${escapeHtml(primaryUrl)}" data-local="true">Copy</button><button type="button" class="btn btn-secondary btn-sm btn-ubah" data-id="${escapeHtml(item.id)}">Ubah</button>`
        : `<a href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm btn-buka">Buka</a><button type="button" class="btn btn-secondary btn-sm btn-copy" data-url="${escapeHtml(primaryUrl)}" data-local="false">Copy</button><button type="button" class="btn btn-secondary btn-sm btn-ubah" data-id="${escapeHtml(item.id)}">Ubah</button>`;

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
      const btnEmptyAdd = document.getElementById('btn-empty-add');
      if (btnEmptyAdd) {
        btnEmptyAdd.addEventListener('click', () => openItemModal());
      }
      return;
    }

    const existingInput = document.getElementById('search-input');
    if (!existingInput) {
      container.innerHTML = `
        <div class="search-bar-row">
          <div class="search-bar-wrap">
            <input type="text" id="search-input" class="search-input" placeholder="Cari judul, tag, atau isi dokumen..." autocomplete="off">
          </div>
          <button type="button" id="btn-tambah-item" class="btn btn-primary btn-tambah">+ Tambah</button>
        </div>
        <div id="zone-harian" class="zone-harian"></div>
        <div id="zone-kartu" class="zone-kartu"></div>
        <div id="search-rekap" class="search-rekap" style="display: none;"></div>
        <div id="result-list" class="result-list"></div>
        <div id="zone-terkait" class="zone-terkait" style="display: none;"></div>
      `;

      const btnTambah = document.getElementById('btn-tambah-item');
      if (btnTambah) {
        btnTambah.addEventListener('click', () => openItemModal());
      }

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

          const ubahBtn = e.target.closest('.btn-ubah');
          if (ubahBtn) {
            const id = typeof ubahBtn.getAttribute === 'function' ? ubahBtn.getAttribute('data-id') : null;
            const currentItems = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
            const targetItem = currentItems.find(candidate => candidate.id === id);
            if (targetItem) {
              openItemModal(targetItem);
            }
            return;
          }

          const itemRow = e.target.closest('.result-item');
          if (itemRow) {
            const id = itemRow.getAttribute('data-id');
            state.focusedItemId = id;
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

  /* ==========================================================================
     Modul Tab Todo (Tiket 07)
     ========================================================================== */

  function generateTodoId(existingTodos) {
    const todos = Array.isArray(existingTodos) ? existingTodos : [];
    const existingIds = new Set(todos.map(todo => todo.id).filter(Boolean));
    let counter = 1;
    while (existingIds.has(`t${counter}`)) {
      counter++;
    }
    return `t${counter}`;
  }

  function getTodoStatus(todo, todayString = getTodayDateString()) {
    if (!todo) return { type: 'none', label: '' };
    if (todo.done) {
      return { type: 'selesai', label: 'selesai' };
    }
    if (!todo.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(String(todo.deadline))) {
      return { type: 'none', label: '' };
    }
    const deadlineParts = String(todo.deadline).split('-').map(Number);
    const todayParts = String(todayString).split('-').map(Number);
    if (deadlineParts.length !== 3 || todayParts.length !== 3 || deadlineParts.some(isNaN) || todayParts.some(isNaN)) {
      return { type: 'none', label: '' };
    }
    const deadlineUtc = Date.UTC(deadlineParts[0], deadlineParts[1] - 1, deadlineParts[2]);
    const todayUtc = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const diffDays = Math.round((deadlineUtc - todayUtc) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: 'lewat', label: 'lewat' };
    } else if (diffDays >= 0 && diffDays <= 3) {
      return { type: 'mepet', label: 'mepet' };
    } else {
      return { type: 'none', label: '' };
    }
  }

  function renderTodoStatusBadge(status) {
    if (!status || status.type === 'none' || !status.label) return '';
    let badgeClass = 'badge-status';
    if (status.type === 'selesai') badgeClass += ' badge-ok';
    else if (status.type === 'mepet') badgeClass += ' badge-warn';
    else if (status.type === 'lewat') badgeClass += ' badge-bad';
    return `<span class="${badgeClass}">${escapeHtml(status.label)}</span>`;
  }

  function normalizeTodoQuery(queryString) {
    if (typeof normalizeQuery === 'function') {
      return normalizeQuery(queryString);
    }
    return String(queryString || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function filterTodos(todos, items, query, filterStatus) {
    const normalizedQuery = normalizeTodoQuery(query);
    const itemsMap = new Map((Array.isArray(items) ? items : []).map(item => [item.id, item]));

    const filtered = (Array.isArray(todos) ? todos : []).filter(todo => {
      if (filterStatus === 'belum' && todo.done) return false;
      if (filterStatus === 'selesai' && !todo.done) return false;

      if (!normalizedQuery) return true;

      const todoText = normalizeTodoQuery(todo.teks);
      const linkedItem = todo.item_id ? itemsMap.get(todo.item_id) : null;
      const linkedItemTitle = linkedItem ? normalizeTodoQuery(linkedItem.title) : '';

      return todoText.includes(normalizedQuery) || linkedItemTitle.includes(normalizedQuery);
    });

    return filtered.sort((todoA, todoB) => {
      if (todoA.done !== todoB.done) {
        return todoA.done ? 1 : -1;
      }
      const dateA = todoA.updated_at || '';
      const dateB = todoB.updated_at || '';
      return dateB.localeCompare(dateA);
    });
  }

  function renderTodoView() {
    const todoListContainer = document.getElementById('todo-list');
    if (!todoListContainer) return;

    const allTodos = (state.data && Array.isArray(state.data.todo)) ? state.data.todo : [];
    const allItems = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];
    const itemsMap = new Map(allItems.map(item => [item.id, item]));

    const filteredTodos = filterTodos(allTodos, allItems, state.todoSearchQuery, state.todoFilterStatus);

    if (filteredTodos.length === 0) {
      let emptyMessage = 'Belum ada todo. Tambahkan todo baru.';
      if (state.todoSearchQuery || state.todoFilterStatus !== 'semua') {
        emptyMessage = 'Tidak ada todo cocok. Coba kata lain atau tambahkan todo baru.';
      }
      todoListContainer.innerHTML = `
        <div class="result-empty" style="padding: 24px 0; text-align: center; color: var(--muted); font-size: var(--font-small);">
          ${emptyMessage}
        </div>
      `;
    } else {
      todoListContainer.innerHTML = filteredTodos.map(todo => {
        const status = getTodoStatus(todo);
        const statusBadgeHtml = renderTodoStatusBadge(status);
        const linkedItem = todo.item_id ? itemsMap.get(todo.item_id) : null;
        let linkedItemText = '';
        if (linkedItem) {
          linkedItemText = escapeHtml(linkedItem.title);
        } else {
          linkedItemText = 'tanpa tautan';
        }

        return `
          <div class="todo-item ${todo.done ? 'is-done' : ''}" data-id="${escapeHtml(todo.id)}">
            <div class="todo-item-left">
              <input type="checkbox" class="todo-checkbox" data-id="${escapeHtml(todo.id)}" ${todo.done ? 'checked' : ''} aria-label="Tandai selesai">
              <span class="todo-text ${todo.done ? 'is-done' : ''}">${escapeHtml(todo.teks)}</span>
              ${statusBadgeHtml}
              ${linkedItemText ? `<span class="todo-linked-item">${linkedItemText}</span>` : ''}
            </div>
            <div class="todo-item-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-ubah-todo" data-id="${escapeHtml(todo.id)}">Ubah</button>
              <button type="button" class="btn-text-danger btn-hapus-todo" data-id="${escapeHtml(todo.id)}">Hapus</button>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!todoListContainer.dataset.boundClick) {
      todoListContainer.dataset.boundClick = 'true';
      todoListContainer.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.todo-checkbox');
        const ubahBtn = e.target.closest('.btn-ubah-todo');
        const hapusBtn = e.target.closest('.btn-hapus-todo');
        const actionEl = checkbox || ubahBtn || hapusBtn;
        if (!actionEl) return;

        const id = actionEl.getAttribute('data-id');
        const currentTodos = (state.data && Array.isArray(state.data.todo)) ? state.data.todo : [];
        const targetTodo = currentTodos.find(candidate => candidate.id === id);
        if (!targetTodo) return;

        if (checkbox) {
          targetTodo.done = !targetTodo.done;
          targetTodo.updated_at = getTodayDateString();
          saveData(state.data);
          return;
        }

        if (ubahBtn) {
          openTodoModal(targetTodo);
          return;
        }

        if (hapusBtn) {
          showDeleteTodoConfirmation(targetTodo);
          return;
        }
      });
    }
  }

  function initTodoListeners() {
    const todoSearchInput = document.getElementById('todo-search-input');
    if (todoSearchInput && !todoSearchInput.dataset.boundInput) {
      todoSearchInput.dataset.boundInput = 'true';
      todoSearchInput.addEventListener('input', (e) => {
        state.todoSearchQuery = e.target.value;
        renderTodoView();
      });
    }

    const filterBtns = document.querySelectorAll('.btn-todo-filter');
    filterBtns.forEach(btn => {
      if (!btn.dataset.boundClick) {
        btn.dataset.boundClick = 'true';
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-filter') || 'semua';
          state.todoFilterStatus = filter;
          filterBtns.forEach(otherBtn => otherBtn.classList.toggle('active', otherBtn === btn));
          renderTodoView();
        });
      }
    });

    const addBtn = document.getElementById('btn-tambah-todo');
    if (addBtn && !addBtn.dataset.boundClick) {
      addBtn.dataset.boundClick = 'true';
      addBtn.addEventListener('click', () => {
        openTodoModal(null);
      });
    }
  }

  function openTodoModal(todoToEdit = null) {
    closeActiveModal();

    const isEdit = Boolean(todoToEdit && todoToEdit.id);
    const initialText = isEdit ? (todoToEdit.teks || '') : '';
    const initialDeadline = isEdit ? (todoToEdit.deadline || '') : '';
    const initialItemId = isEdit ? (todoToEdit.item_id || '') : '';

    const allItems = (state.data && Array.isArray(state.data.items)) ? state.data.items : [];

    const itemOptionsHtml = allItems.map(item => {
      const isSelected = item.id === initialItemId ? 'selected' : '';
      return `<option value="${escapeHtml(item.id)}" ${isSelected}>${escapeHtml(item.title)}</option>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-box" id="modal-todo-box">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? 'Ubah Todo' : 'Tambah Todo'}</div>
          <button type="button" class="btn-close" id="btn-close-todo-modal" aria-label="Tutup">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="todo-text">Teks Todo <span class="req">*</span></label>
            <textarea id="todo-text" class="form-textarea" maxlength="200" placeholder="Teks todo (1-200 karakter)">${escapeHtml(initialText)}</textarea>
            <div id="todo-text-error" class="form-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="todo-deadline">Deadline</label>
            <input type="date" id="todo-deadline" class="form-input" value="${escapeHtml(initialDeadline)}">
            <div class="form-hint">Format YYYY-MM-DD (opsional)</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="todo-item-id">Item Tertaut</label>
            <select id="todo-item-id" class="form-select">
              <option value="">Tanpa tautan</option>
              ${itemOptionsHtml}
            </select>
            <div class="form-hint">Hubungkan dengan item di Indeks (opsional)</div>
          </div>
        </div>
        <div class="modal-footer">
          <div></div>
          <div class="modal-footer-actions">
            <button type="button" class="btn btn-secondary btn-cancel-todo-modal">Batal</button>
            <button type="button" id="btn-todo-save" class="btn btn-primary" disabled>Simpan</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textArea = document.getElementById('todo-text');
    if (textArea && initialText) {
      textArea.value = initialText;
    }
    const deadlineInput = document.getElementById('todo-deadline');
    const itemSelect = document.getElementById('todo-item-id');
    const saveBtn = document.getElementById('btn-todo-save');
    const closeBtn = document.getElementById('btn-close-todo-modal');
    const cancelBtn = overlay.querySelector('.btn-cancel-todo-modal');

    function validateTodoForm() {
      const textValue = textArea ? textArea.value.trim() : '';
      const isValid = textValue.length >= 1 && textValue.length <= 200;
      if (saveBtn) {
        saveBtn.disabled = !isValid;
      }
      const errorEl = document.getElementById('todo-text-error');
      if (errorEl) {
        if (textArea && textArea.value.length > 200) {
          errorEl.textContent = 'Teks todo maksimal 200 karakter';
          errorEl.style.display = 'block';
        } else {
          errorEl.textContent = '';
          errorEl.style.display = 'none';
        }
      }
      return isValid;
    }

    validateTodoForm();

    if (textArea) {
      textArea.addEventListener('input', validateTodoForm);
      textArea.focus();
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeActiveModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeActiveModal);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!validateTodoForm()) return;

        const textValue = textArea.value.trim();
        const deadlineValue = deadlineInput && deadlineInput.value ? deadlineInput.value : null;
        const selectedItemId = itemSelect && itemSelect.value ? itemSelect.value : null;
        const today = getTodayDateString();

        const todos = (state.data && Array.isArray(state.data.todo)) ? state.data.todo : [];

        if (isEdit) {
          const todoIdx = todos.findIndex(item => item.id === todoToEdit.id);
          if (todoIdx >= 0) {
            todos[todoIdx].teks = textValue;
            todos[todoIdx].deadline = deadlineValue;
            todos[todoIdx].item_id = selectedItemId;
            todos[todoIdx].updated_at = today;
          }
        } else {
          const newId = generateTodoId(todos);
          todos.unshift({
            id: newId,
            teks: textValue,
            item_id: selectedItemId,
            deadline: deadlineValue,
            done: false,
            updated_at: today
          });
        }

        state.data.todo = todos;
        const saveSuccess = saveData(state.data);
        if (!saveSuccess) {
          return;
        }

        closeActiveModal();
      });
    }
  }

  function showDeleteTodoConfirmation(todo) {
    closeActiveModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-box" id="modal-delete-todo-box">
        <div class="modal-header">
          <div class="modal-title">Hapus Todo</div>
          <button type="button" class="btn-close" id="btn-close-delete-todo-modal" aria-label="Tutup">&times;</button>
        </div>
        <div class="modal-body delete-confirm-box">
          <div class="delete-warning">
            Menghapus todo ini tidak akan menghapus item dokumen yang ditautkan.
          </div>
          <div class="form-group">
            <label class="form-label" for="input-confirm-delete-todo">Ketik <strong>hapus</strong> untuk mengonfirmasi:</label>
            <input type="text" id="input-confirm-delete-todo" class="form-input" placeholder="hapus" autocomplete="off">
            <div class="form-hint">Huruf besar-kecil diabaikan</div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="modal-footer-actions">
            <button type="button" class="btn btn-secondary btn-cancel-delete-todo">Batal</button>
            <button type="button" id="btn-confirm-delete-todo" class="btn-text-danger" disabled style="font-weight: 600; padding: 6px 12px;">Hapus Permanen</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const inputConfirm = document.getElementById('input-confirm-delete-todo');
    const confirmBtn = document.getElementById('btn-confirm-delete-todo');
    const cancelBtn = overlay.querySelector('.btn-cancel-delete-todo');
    const closeBtn = document.getElementById('btn-close-delete-todo-modal');

    if (inputConfirm && confirmBtn) {
      inputConfirm.addEventListener('input', (e) => {
        const typed = e.target.value.trim().toLowerCase();
        confirmBtn.disabled = (typed !== 'hapus');
      });
      inputConfirm.focus();
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeActiveModal);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeActiveModal);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const typed = inputConfirm ? inputConfirm.value.trim().toLowerCase() : '';
        if (typed !== 'hapus') return;

        if (state.data && Array.isArray(state.data.todo)) {
          state.data.todo = state.data.todo.filter(todoItem => todoItem.id !== todo.id);
        }

        const saveSuccess = saveData(state.data);
        if (!saveSuccess) {
          return;
        }

        closeActiveModal();
      });
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
      renderTodoView();
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
    } else if (tabName === 'todo') {
      renderTodoView();
      const todoInput = document.getElementById('todo-search-input');
      if (todoInput && typeof todoInput.focus === 'function') {
        todoInput.focus();
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
        if (e.key === 'Escape') {
          const modal = document.querySelector('.modal-overlay');
          if (modal) return;

          if (state.focusedItemId) {
            state.focusedItemId = null;
            const searchInput = document.getElementById('search-input');
            updateIndeksResults(searchInput ? searchInput.value : '');
          }
        }
      });

      document.addEventListener('click', (e) => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) return;

        if (state.focusedItemId) {
          if (!e.target.closest || (!e.target.closest('.result-item') && !e.target.closest('#zone-terkait'))) {
            state.focusedItemId = null;
            const searchInput = document.getElementById('search-input');
            updateIndeksResults(searchInput ? searchInput.value : '');
          }
        }
      });
    }

    initTodoListeners();
    loadData();
    switchTab(state.activeTab);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof window !== 'undefined') {
    window.saveData = saveData;
    window.loadData = loadData;
    window.switchTab = switchTab;
    window.generateItemId = generateItemId;
    window.validateTags = validateTags;
    window.openItemModal = openItemModal;
    window.generateTodoId = generateTodoId;
    window.getTodoStatus = getTodoStatus;
    window.filterTodos = filterTodos;
    window.renderTodoView = renderTodoView;
    window.openTodoModal = openTodoModal;
    window.showDeleteTodoConfirmation = showDeleteTodoConfirmation;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.saveData = saveData;
    globalThis.loadData = loadData;
    globalThis.switchTab = switchTab;
    globalThis.generateItemId = generateItemId;
    globalThis.validateTags = validateTags;
    globalThis.openItemModal = openItemModal;
    globalThis.generateTodoId = generateTodoId;
    globalThis.getTodoStatus = getTodoStatus;
    globalThis.filterTodos = filterTodos;
    globalThis.renderTodoView = renderTodoView;
    globalThis.openTodoModal = openTodoModal;
    globalThis.showDeleteTodoConfirmation = showDeleteTodoConfirmation;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      state,
      loadData,
      saveData,
      switchTab,
      isLocalPath,
      generateItemId,
      validateTags,
      openItemModal,
      generateTodoId,
      getTodoStatus,
      filterTodos,
      renderTodoView,
      openTodoModal,
      showDeleteTodoConfirmation
    };
  }
})();
