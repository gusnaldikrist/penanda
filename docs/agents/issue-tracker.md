# Issue tracker: Local Markdown

Issue dan spec untuk repo ini hidup sebagai file markdown di `.scratch/`.

## Konvensi

- Satu fitur satu direktori: `.scratch/<feature-slug>/`
- Spec ada di `.scratch/<feature-slug>/spec.md`
- Issue implementasi satu file per tiket di `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, bernomor dari `01`, tidak pernah digabung jadi satu file tiket
- Status triage dicatat sebagai baris `Status:` di dekat atas tiap file issue (lihat `triage-labels.md` untuk string peran)
- Komentar dan riwayat percakapan ditambahkan di bawah file pada heading `## Comments`

## Saat skill berkata "publish ke issue tracker"

Buat file baru di `.scratch/<feature-slug>/` (buat direktorinya bila perlu).

## Saat skill berkata "fetch tiket terkait"

Baca file pada path yang dirujuk. User biasanya memberi path atau nomor issue langsung.

## Operasi wayfinding

Dipakai oleh `/wayfinder`. **Map** adalah file dengan satu file **child** per tiket.

- **Map**: `.scratch/<effort>/map.md` (isi Notes / Decisions-so-far / Fog).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, bernomor dari `01`, pertanyaan ada di body. Baris `Type:` mencatat tipe tiket (`research`/`prototype`/`grilling`/`task`); baris `Status:` mencatat `claimed`/`resolved`.
- **Blocking**: baris `Blocked by: NN, NN` di dekat atas. Tiket unblocked bila semua file yang disebut berstatus `resolved`.
- **Frontier**: pindai `.scratch/<effort>/issues/` untuk file yang terbuka, unblocked, dan belum diklaim; nomor terkecil menang.
- **Claim**: set `Status: claimed` dan simpan sebelum kerja apa pun.
- **Resolve**: tambahkan jawaban di bawah heading `## Answer`, set `Status: resolved`, lalu tambahkan penunjuk konteks (inti + tautan) ke Decisions-so-far di `map.md`.

## Catatan proyek

Dokumentasi produk (PRD, tech stack, design tokens) tidak disimpan di repo ini melainkan di vault Obsidian. Lihat `AGENTS.md` bagian 5.
