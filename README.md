# Penanda

Proyek dikembangkan menggunakan Antigravity dengan integrasi context multi-agent ke Obsidian.

## Struktur
- `src/frontend/` — Frontend aplikasi (disajikan `penanda.exe`)
- `src/pro/` — Backend Go (stdlib saja)
- `src/shared/` — `data.example.json`, `local-path-cases.json`
- `tests/` — File testing / unit test
- `.agents/` — Konfigurasi aturan dan workflow agent
- `docs/agents/` — Konfigurasi skill agent
- `.scratch/penanda-v1/` — Spec dan 12 tiket eksekusi V1
- `build.ps1` — Sinkronisasi paket rilis `dist/v1/` dari `src/frontend/`
- `dist/v1/` — Paket rilis: apa yang benar-benar dilihat user
- `AGENTS.md` — Konvensi & instruksi proyek untuk AI agent

## Context & Log
Dokumentasi PRD, Session Log, Decisions, dan Changelog tersimpan di Obsidian Vault:
`C:\vault\01-Projects\Penanda\`

- **Hub proyek**: `index.md` (BUKAN `spec.md`)
- **Format logging kanonik**: `.agents/rules/vault-logging.md`
- **Konvensi umum vault**: `C:\vault\AGENTS.md`

## Memulai
1. Buka folder ini di IDE/agent.
2. Baca `AGENTS.md` di repo ini dan `C:\vault\AGENTS.md`.
3. Lihat hub proyek di vault untuk spesifikasi & status.

## Build
Setiap selesai mengubah `src/frontend/` atau `src/shared/`, jalankan:

    .\build.ps1

Ini membangun `penanda.exe` dan menyalin frontend ke `dist/v1/`. Cek saja
tanpa mengubah apa pun: `.\build.ps1 -CheckOnly`.
