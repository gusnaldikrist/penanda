# AGENTS.md — Konvensi Proyek Penanda

> **Dibaca WAJIB oleh agent sebelum bekerja di proyek ini.**
> Konvensi umum vault (frontmatter, wikilink, tag, PARA) mengikuti **`C:\vault\AGENTS.md`** — baca file itu juga.

---

## 0. Konteks

Proyek `Penanda` berkembang menggunakan **context layer multi-agent**: kode ada di `C:\dev\IndeksKerja`, logging/dokumentasi di `C:\vault\01-Projects\Penanda\`. Keduanya berpasangan.

Hub dokumen: `C:\vault\01-Projects\Penanda\index.md` (BUKAN `spec.md`).

---

## 1. Struktur

- `src/frontend/` — Frontend aplikasi: `index.html`, `app.js`, `search.js`, `style.css` (disajikan `penanda.exe`)
- `src/pro/` — Backend: `main.go`, `go.mod` (stdlib saja)
- `src/shared/` — `data.example.json`, `local-path-cases.json`
- `tests/` — File testing / unit test
- `build.ps1` — Sinkronisasi paket rilis `dist/v1/` dari `src/frontend/` (wajib, lihat aturan 11)
- `dist/v1/` — Paket rilis: apa yang benar-benar dilihat user
- `.agents/` — Aturan & workflow agent proyek ini
- `.agents/rules/` — `vault-logging.md`, `git-convention.md`, `code-style.md`
- `.agents/workflows/` — alur kerja (mis. `new-feature.md`)
- `docs/agents/` — Konfigurasi skill agent (issue tracker, label triage, domain docs)
- `.scratch/<feature-slug>/` — Spec dan tiket lokal (lihat bagian 6)

---

## 2. Aturan Utama Agent

1. **Logging wajib ke vault** setelah tiap task/sesi — lihat `.agents/rules/vault-logging.md` (format kanonik: `### [date HH:MM]` + Task/Hasil/Files changed/Blocker/Next; changelog 1 baris; decisions Konteks/Keputusan/Alasan).
2. **Frontmatter YAML** wajib di setiap note vault (title/date/tags/status/project).
3. **Wikilink `[[...]]`** untuk tautan antar-note; dilarang path absolut `file:///C:/...`.
4. **Git**: Conventional Commits, branch `feat/x`/`fix/x`, atomic commits, jangan force push ke `main` — lihat `.agents/rules/git-convention.md`.
5. **Code style**: deskriptif, ikuti `.agents/rules/code-style.md`.
6. **Tanpa persetujuan eksplisit pengguna, JANGAN** lakukan commit/push (ADR-005 SUAKA, berlaku umum).
7. **Larangan V1**: tanpa framework CSS/JS, tanpa CDN, tanpa build step; frontend wajib jalan dari `file://` dan dimuat sebagai script biasa, bukan ES module. Rincian: `prd.md` bagian 3.
8. **Aturan tag**: huruf kecil tanpa spasi; tag bermakna sama dipasang berdampingan pada item yang sama, bukan item baru; nilai kartu awal `ta`, `wisuda`, `magang`. Rincian: `prd-skema.md` bagian 5.
9. **Isolasi modul**: pencarian hanya membaca `items`; todo dan log tidak menambah field wajib di form item dan tidak menambah zona di layar Indeks. Rincian: `prd.md` bagian 6.2.
10. **Peta dokumen**: sebelum mengubah dokumen produk atau tiket — termasuk menambah tiket dan menutup celah spec — ikuti pemilik topik dan urutan perubahan di `.agents/doc-map.md`.
11. **Sinkronisasi paket rilis wajib**: setiap selesai mengubah `src/frontend/` atau `src/shared/`, jalankan `.\build.ps1`. `penanda.exe` menyajikan frontend dari folder binary-nya sendiri, jadi `dist/v1/` adalah yang benar-benar dilihat user — perubahan yang tidak disalin tidak akan pernah terlihat. Jangan menyalin manual; `build.ps1` memverifikasi dengan hash SHA256.

---

## 3. Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 3.1 Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 3.2 Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3.3 Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 3.4 Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 4. Workflow Standar (new-feature)

Lihat `.agents/workflows/new-feature.md` — ringkas: brainstorm/klarifikasi → implementation plan → eksekusi bertahap (guardrail anti-over-engineering) → review → log ke vault.

---

## 5. Rujukan

| Tujuan | Lokasi |
|:---|:---|
| Konvensi umum vault | `C:\vault\AGENTS.md` |
| Home & status vault | `C:\vault\Welcome.md`, `C:\vault\dashboard.md` |
| Hub proyek dan peta dokumen V1 (PRD, skema data, arsitektur, tech stack, wireframe, token desain) | `C:\vault\01-Projects\Penanda\index.md` |
| Spec eksekusi dan 12 tiket V1 | `.scratch\penanda-v1\spec.md` dan `.scratch\penanda-v1\issues\` |
| Keputusan dan ADR | `C:\vault\01-Projects\Penanda\decisions.md` |
| Session log proyek | `C:\vault\01-Projects\Penanda\session-log.md` |
| Format logging kanonik | `.agents/rules/vault-logging.md` |

---

## 6. Agent skills

### Issue tracker

Issue dan spec repo ini dilacak sebagai markdown di `.scratch/<feature-slug>/` (lokal, tanpa remote). Lihat `docs/agents/issue-tracker.md`.

### Triage labels

Label triage memakai default kanonik: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`; ditulis sebagai baris `Status:` di file issue. Lihat `docs/agents/triage-labels.md`.

### Domain docs

Dokumen domain **belum ada** di repo ini: tidak ada `CONTEXT.md`, tidak ada glosarium, dan tidak ada `docs/adr/`. Keputusan arsitektur dan istilah produk dicatat di vault Obsidian (`C:\vault\01-Projects\Penanda\`), sesuai keputusan tanggal 2026-09-30 bahwa dokumen produk tetap di vault dan dokumen petunjuk agent tetap di repo. Lihat `docs/agents/domain.md` untuk cara membacanya, dan `.agents/doc-map.md` untuk peta pemilik topik.

