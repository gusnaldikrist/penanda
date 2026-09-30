# Vault Logging Rule

Setiap kali menyelesaikan task atau sesi di proyek Penanda, agent WAJIB mencatat hasilnya ke Obsidian vault di folder:
`C:\vault\01-Projects\Penanda\`

> **Sumber kebenaran format**: file ini. Konvensi umum vault: `C:\vault\AGENTS.md`.

## File Target & Format:

### 1. Session Log (`C:\vault\01-Projects\Penanda\session-log.md`)
Tambahkan entry terbaru di bagian atas file (setelah baris `---`), format:
```markdown
---
title: Session Log — Penanda
date: <YYYY-MM-DD>
tags:
  - session-log
  - project/Penanda
status: active
project: Penanda
---

# Session Log — Penanda

> Kembali ke: [[index|📁 Ringkasan Proyek]]

---

### [YYYY-MM-DD HH:MM] — [Ringkasan 1 Baris Task]

**Task:** [Apa yang diminta user]
**Hasil:** [Apa yang berhasil dikerjakan]
**Files changed:** [Daftar file yang dibuat/diubah]
**Blocker:** [Jika ada kendala / -]
**Next:** [Langkah lanjutan yang disarankan / -]
```

### 2. Changelog (`C:\vault\01-Projects\Penanda\changelog.md`)
Tambahkan 1 baris riwayat perubahan di bagian atas:
```markdown
---
title: Changelog — Penanda
date: <YYYY-MM-DD>
tags:
  - changelog
  - project/Penanda
status: active
project: Penanda
---

# Changelog — Penanda

> Kembali ke: [[index|📁 Ringkasan Proyek]]

---

- [YYYY-MM-DD] `[feat/fix/refactor/docs]` — [Deskripsi ringkas perubahan]
```

### 3. Decisions Log (`C:\vault\01-Projects\Penanda\decisions.md`)
HANYA jika ada keputusan teknis/arsitektur penting:
```markdown
---
title: Decisions Log — Penanda
date: <YYYY-MM-DD>
tags:
  - decision
  - project/Penanda
status: active
project: Penanda
---

# Decisions Log — Penanda

> Kembali ke: [[index|📁 Ringkasan Proyek]]

---

### [YYYY-MM-DD] — [Judul Keputusan]
**Konteks:** [Masalah yang dihadapi]
**Keputusan:** [Solusi yang dipilih]
**Alasan:** [Mengapa memilih opsi ini dibanding alternatif lain]
```

### 4. Index / Hub (`C:\vault\01-Projects\Penanda\index.md`)
Ringkasan proyek menjadi hub (BUKAN `spec.md`). Semua dokumen proyek menunjuk balik ke sana dengan `> Kembali ke: [[index|📁 Ringkasan Proyek]]`. Dibuat otomatis oleh `C:\dev\new-project.ps1`.

## Aturan:
- Jangan pernah lewatkan logging ini setelah menyelesaikan tugas.
- Tulis ringkas, padat, dan jelas (bukan copy-paste full transcript percakapan).
- Gunakan wikilink `[[...]]`, frontmatter YAML wajib, hub = `index.md`.
