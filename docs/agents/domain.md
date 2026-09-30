# Domain Docs

Bagaimana skill engineering membaca dokumentasi domain repo ini saat menelusuri kode.

## Sebelum menelusuri, baca ini

- `CONTEXT.md` di root repo, atau
- `CONTEXT-MAP.md` di root repo bila ada: file itu menunjuk satu `CONTEXT.md` per konteks. Baca masing-masing yang relevan dengan topik.
- `docs/adr/`: baca ADR yang menyentuh area yang akan Anda kerjakan. Di repo multi-konteks, cek juga `src/<context>/docs/adr/` untuk keputusan berskala konteks.

Bila file-file itu belum ada, **lanjut diam-diam**. Jangan menandai ketiadaannya; jangan menyarankan membuatnya di awal. Skill `/domain-modeling` (diakses lewat `/grill-with-docs` dan `/improve-codebase-architecture`) akan membuatnya secara bertahap saat istilah atau keputusan benar-benar matang.

## Struktur file

Repo ini **single-context**:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-<keputusan>.md
│   └── 0002-<keputusan>.md
└── src/
```

## Pakai kosakata glosarium

Saat output Anda menyebut konsep domain (di judul issue, usulan refactor, hipotesis, nama test), pakai istilah seperti yang didefinisikan di `CONTEXT.md`. Jangan bergeser ke sinonim yang secara eksplisit dihindari glosarium.

Bila konsep yang Anda butuhkan belum ada di glosarium, itu sinyal: entah Anda sedang menciptakan bahasa yang tidak dipakai proyek (pertimbangkan ulang) atau memang ada celah nyata (catat untuk `/domain-modeling`).

## Tandai konflik ADR

Bila output Anda bertentangan dengan ADR yang ada, munculkan secara eksplisit alih-alih menimpanya diam-diam:

> _Bertentangan dengan ADR-0007 (event-sourced orders), tapi layak dibuka ulang karena…_

## Catatan proyek

- Istilah domain proyek ini (item, tag, pinned_tags, todo, log, Lite, Pro) sudah dipakai di `docs/agents/` dan di kode; pertahankan kosakata itu.
- Dokumentasi produk dan keputusan arsitektur tingkat produk dicatat di vault Obsidian, bukan di `docs/adr/` repo ini. Lihat `AGENTS.md` bagian 5.
