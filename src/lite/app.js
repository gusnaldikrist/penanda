// app.js — Aplikasi Penanda V1 (Frontend Lite)
// Dimuat sebagai script biasa (bukan ES module) agar bisa berjalan langsung dari file://

(function () {
  'use strict';

  // Kerangka state dasar (tab aktif disimpan di memori saja)
  const state = {
    activeTab: 'indeks', // 'indeks' | 'todo' | 'log'
    status: {
      mode: 'Lite',
      itemCount: 0,
      savedAt: null
    }
  };

  /**
   * Beralih tab aktif
   * @param {string} tabName - 'indeks' | 'todo' | 'log'
   */
  function switchTab(tabName) {
    if (!['indeks', 'todo', 'log'].includes(tabName)) return;

    state.activeTab = tabName;

    // Perbarui status tombol tab
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Perbarui panel tab
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

  /**
   * Perbarui tampilan bar status kanan atas
   * Format: Jalur - X item - tersimpan HH:MM (atau status awal)
   */
  function updateStatusBar() {
    const statusBar = document.getElementById('status-bar');
    if (!statusBar) return;

    if (state.status.savedAt) {
      statusBar.textContent = `${state.status.mode} - ${state.status.itemCount} item - tersimpan ${state.status.savedAt}`;
    } else {
      statusBar.textContent = `${state.status.mode} - ${state.status.itemCount} item - siap`;
    }
  }

  /**
   * Inisialisasi event listener dan state awal
   */
  function init() {
    // Event listener ganti tab
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          switchTab(targetTab);
        }
      });
    });

    // Inisialisasi tampilan awal
    switchTab(state.activeTab);
    updateStatusBar();
  }

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Ekspos helper ke window untuk keperluan pengujian
  window.PenandaApp = {
    getState: () => ({ ...state }),
    switchTab
  };
})();
