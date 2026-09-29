# AGENTS.md — Konvensi Proyek IndeksKerja

> **Dibaca WAJIB oleh agent sebelum bekerja di proyek ini.**
> Konvensi umum vault (frontmatter, wikilink, tag, PARA) mengikuti **`C:\vault\AGENTS.md`** — baca file itu juga.

---

## 0. Konteks

Proyek `IndeksKerja` berkembang menggunakan **context layer multi-agent**: kode ada di `C:\dev\IndeksKerja`, logging/dokumentasi di `C:\vault\01-Projects\IndeksKerja\`. Keduanya berpasangan.

Hub dokumen: `C:\vault\01-Projects\IndeksKerja\index.md` (BUKAN `spec.md`).

---

## 1. Struktur

- `src/` — Source code aplikasi
- `tests/` — File testing / unit test
- `.agents/` — Aturan & workflow agent proyek ini
- `.agents/rules/` — `vault-logging.md`, `git-convention.md`, `code-style.md`
- `.agents/workflows/` — alur kerja (mis. `new-feature.md`)

---

## 2. Aturan Utama Agent

1. **Logging wajib ke vault** setelah tiap task/sesi — lihat `.agents/rules/vault-logging.md` (format kanonik: `### [date HH:MM]` + Task/Hasil/Files changed/Blocker/Next; changelog 1 baris; decisions Konteks/Keputusan/Alasan).
2. **Frontmatter YAML** wajib di setiap note vault (title/date/tags/status/project).
3. **Wikilink `[[...]]`** untuk tautan antar-note; dilarang path absolut `file:///C:/...`.
4. **Git**: Conventional Commits, branch `feat/x`/`fix/x`, atomic commits, jangan force push ke `main` — lihat `.agents/rules/git-convention.md`.
5. **Code style**: deskriptif, ikuti `.agents/rules/code-style.md`.
6. **Tanpa persetujuan eksplisit pengguna, JANGAN** lakukan commit/push (ADR-005 SUAKA, berlaku umum).

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
| Hub proyek ini (vault) | `C:\vault\01-Projects\IndeksKerja\index.md` |
| Session log proyek | `C:\vault\01-Projects\IndeksKerja\session-log.md` |
| Format logging kanonik | `.agents/rules/vault-logging.md` |
