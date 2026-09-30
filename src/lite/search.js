// search.js — Logika pencarian Penanda V1 (Tiket 03)
// Fungsi murni tanpa ketergantungan DOM, dapat diuji di Node.js dan dipakai di browser

(function () {
  'use strict';

  function normalizeQuery(kataKunci) {
    if (typeof kataKunci !== 'string') {
      return '';
    }
    return kataKunci.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function sortByUpdatedAtDesc(itemList) {
    return itemList.slice().sort((a, b) => {
      const timeA = a && a.updated_at ? a.updated_at : '';
      const timeB = b && b.updated_at ? b.updated_at : '';
      return timeB.localeCompare(timeA);
    });
  }

  function searchItems(items, kataKunci) {
    if (!Array.isArray(items)) {
      return [];
    }

    const query = normalizeQuery(kataKunci);

    // Aturan 4: Kata kunci kosong mengembalikan seluruh items urut updated_at menurun tanpa penanda lapis
    if (query === '') {
      return sortByUpdatedAtDesc(items);
    }

    const seenIds = new Set();
    const lapis1 = [];

    // Lapis 1: title atau tags memuat kata kunci
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      const title = (item.title || '').toLowerCase();
      const titleMatches = title.includes(query);

      let tagMatches = false;
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          if (tag && String(tag).toLowerCase().includes(query)) {
            tagMatches = true;
            break;
          }
        }
        if (!tagMatches && item.tags.length > 0) {
          const joinedTags = item.tags.filter(Boolean).map(t => String(t).toLowerCase()).join(' ');
          if (joinedTags.includes(query)) {
            tagMatches = true;
          }
        }
      }

      if (titleMatches || tagMatches) {
        lapis1.push(item);
        if (item.id) {
          seenIds.add(item.id);
        }
      }
    }

    // Kumpulkan seluruh tag dari hasil lapis 1 untuk pencocokan lapis 2
    const lapis1Tags = new Set();
    for (const item of lapis1) {
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          if (tag) {
            lapis1Tags.add(String(tag).toLowerCase());
          }
        }
      }
    }

    const lapis2 = [];
    const lapis3 = [];

    // Evaluasi sisa item untuk Lapis 2 dan Lapis 3
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (item.id && seenIds.has(item.id)) continue;

      // Lapis 2: berbagi minimal satu tag dengan hasil lapis 1
      let sharesTagWithLapis1 = false;
      if (lapis1Tags.size > 0 && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          if (tag && lapis1Tags.has(String(tag).toLowerCase())) {
            sharesTagWithLapis1 = true;
            break;
          }
        }
      }

      if (sharesTagWithLapis1) {
        lapis2.push(item);
        if (item.id) {
          seenIds.add(item.id);
        }
        continue;
      }

      // Lapis 3: catatan memuat kata kunci
      const catatan = (item.catatan || '').toLowerCase();
      if (catatan.includes(query)) {
        lapis3.push(item);
        if (item.id) {
          seenIds.add(item.id);
        }
      }
    }

    // Urutkan tiap lapis berdasarkan updated_at menurun
    const sortedLapis1 = sortByUpdatedAtDesc(lapis1).map(item => ({
      ...item,
      lapis: 1
    }));

    const sortedLapis2 = sortByUpdatedAtDesc(lapis2).map(item => ({
      ...item,
      lapis: 2
    }));

    const sortedLapis3 = sortByUpdatedAtDesc(lapis3).map(item => ({
      ...item,
      lapis: 3,
      penanda: 'dari catatan'
    }));

    return [...sortedLapis1, ...sortedLapis2, ...sortedLapis3];
  }

  if (typeof window !== 'undefined') {
    window.searchItems = searchItems;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchItems, normalizeQuery };
  }
})();
