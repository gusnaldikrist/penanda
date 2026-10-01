// storage-adapter.js — Adapter Penyimpanan Penanda V1 (Tiket 11)
//
// Satu frontend, dua jalur (arsitektur bagian 2). Saat halaman siap, adapter
// mencoba GET /api/data:
//   - Sukses  : jalur Pro, semua baca dan tulis lewat API ke penanda.exe
//   - Gagral   : jalur Lite, baca dan tulis lewat localStorage
//
// Bagian ini sengaja tanpa DOM; semua akses DOM tetap di app.js.
// Fungsi murni bisa diuji di Node.js tanpa mock peramban.

(function () {
  'use strict';

  const STORAGE_KEY = 'indeks_v1';
  const API_DATA_PATH = '/api/data';
  const API_OPEN_PATH = '/open';

  const MODE_LITE = 'Lite';
  const MODE_PRO = 'Pro';

  // Batas waktu menunggu backend. Angka pendek supaya halaman yang dibuka
  // dari Explorer (yang tidak punya server) tidak menggantung lama.
  const DETECT_TIMEOUT_MS = 1500;

  function detectModeFromResponse(ok) {
    return ok ? MODE_PRO : MODE_LITE;
  }

  /**
   * Menentukan apakah alamat sebuah path lokal Windows.
   * Memakai tiga awalan yang disebut arsitektur bagian 5:
   * huruf drive (D:\), UNC (\\server), dan skema file:.
   */
  function isLocalPath(address) {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    return /^[a-zA-Z]:[\\/]/.test(trimmed) ||
      trimmed.startsWith('\\\\') ||
      trimmed.toLowerCase().startsWith('file:');
  }

  /** Format area status tiga bagian: jalur, jumlah item, waktu simpan. */
  function formatStatus(mode, itemCount, savedAt, isLoading) {
    const parts = [mode + ' - ' + itemCount + ' item'];
    if (isLoading) {
      parts.push('memuat');
    } else if (savedAt) {
      parts.push('tersimpan ' + savedAt);
    }
    return parts.join(' - ');
  }

  function formatSavedTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  }

  // --------------------------------------------------------------------------
  // Jalur Lite: localStorage
  // --------------------------------------------------------------------------

  /**
   * Baca data dari localStorage. Error TIDAK ditangkap di sini: pemanggil
   * harus bisa membedakan "belum ada data" (null) dari "localStorage
   * diblokir browser" (SecurityError). Menelan error-nya akan membuat
   * aplikasi mengira storage kosong padahal tidak bisa menyimpan.
   */
  function readLocal() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function writeLocal(jsonText) {
    localStorage.setItem(STORAGE_KEY, jsonText);
  }

  // --------------------------------------------------------------------------
  // Jalur Pro: HTTP ke penanda.exe
  // --------------------------------------------------------------------------

  /**
   * Menjalankan fetch dengan batas waktu. Pakai AbortController karena
   * jendela yang dibuka dari Explorer tidak punya server sama sekali, dan
   * permintaan tanpa batas bisa menggantung.
   *
   * Parameter fetchImpl dipakai test; production tinggalkan kosong agar
   * memakai fetch bawaan browser.
   */
  async function fetchWithTimeout(url, options, timeoutMs, fetchImpl) {
    const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) throw new Error('fetch tidak tersedia di lingkungan ini');

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs || DETECT_TIMEOUT_MS);

    try {
      return await doFetch(url, Object.assign({}, options, { signal: controller.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  /** Deteksi jalur: satu percobaan GET /api/data. */
  async function detectMode(fetchImpl) {
    if (!fetchImpl && typeof fetch !== 'function') return MODE_LITE;

    try {
      const response = await fetchWithTimeout(API_DATA_PATH, { method: 'GET' }, DETECT_TIMEOUT_MS, fetchImpl);
      return detectModeFromResponse(response.ok);
    } catch (err) {
      return MODE_LITE;
    }
  }

  /** Baca seluruh isi berkas data dari backend. */
  async function readRemote(fetchImpl) {
    const response = await fetchWithTimeout(API_DATA_PATH, { method: 'GET' }, DETECT_TIMEOUT_MS, fetchImpl);
    if (!response.ok) {
      throw new Error('Backend menjawab ' + response.status);
    }
    return await response.text();
  }

  /** Tulis seluruh isi berkas data ke backend. */
  async function writeRemote(jsonText, fetchImpl) {
    const response = await fetchWithTimeout(API_DATA_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonText
    }, DETECT_TIMEOUT_MS, fetchImpl);
    if (!response.ok) {
      throw new Error('Backend menjawab ' + response.status);
    }
  }

  /**
   * Buka path lokal lewat backend. Hanya mungkin di jalur Pro karena
   * browser memblokir halaman biasa membuka skema berkas (arsitektur bagian 5).
   */
  async function openRemotePath(localPath, fetchImpl) {
    const response = await fetchWithTimeout(API_OPEN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: localPath })
    }, 5000, fetchImpl);
    if (!response.ok) {
      throw new Error('Backend menjawab ' + response.status);
    }
  }

  const api = {
    STORAGE_KEY,
    API_DATA_PATH,
    API_OPEN_PATH,
    MODE_LITE,
    MODE_PRO,
    detectModeFromResponse,
    isLocalPath,
    formatStatus,
    formatSavedTime,
    readLocal,
    writeLocal,
    fetchWithTimeout,
    detectMode,
    readRemote,
    writeRemote,
    openRemotePath
  };

  if (typeof window !== 'undefined') {
    window.PenandaStorage = api;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.PenandaStorage = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();