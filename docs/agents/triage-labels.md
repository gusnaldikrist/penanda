# Triage Labels

Skill berbicara dalam lima peran triage kanonik. File ini memetakan peran tersebut ke string label yang benar-benar dipakai di issue tracker repo ini.

| Label di mattpocock/skills | Label di tracker kami | Arti                                     |
| -------------------------- | --------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`        | Maintainer perlu menilai issue ini       |
| `needs-info`               | `needs-info`          | Menunggu pelapor memberi info tambahan   |
| `ready-for-agent`          | `ready-for-agent`     | Sudah spesifik, siap untuk agent AFK     |
| `ready-for-human`          | `ready-for-human`     | Butuh implementasi manusia               |
| `wontfix`                  | `wontfix`             | Tidak akan dikerjakan                    |

Saat skill menyebut sebuah peran (mis. "apply the AFK-ready triage label"), pakai string label yang sesuai dari tabel ini.

Karena tracker memakai local markdown, label ini ditulis sebagai baris `Status:` di dekat atas file issue di `.scratch/<feature-slug>/issues/`.

Ubah kolom kanan bila nanti kosakata tracker Anda berbeda.
