# Kyrgyz track audio credits

Per the handoff checklist in `PENDING.md`, this file records what's known
about each real Kyrgyz audio file added to this app, and its rights status.

## oshondo.mp3 — rights confirmed by the project owner (2026-10-16)

| Field | Value |
|---|---|
| Catalog track | `oshondo` — "Ошондо" by Мирбек Атабеков |
| File | `oshondo.mp3` (4,829,353 bytes) |
| Cover | `../artwork/tracks/mirbek-atabekov-oshondo.png` (2,456,378 bytes) |
| Original filename supplied | `Мирбек Атабеков - Ошондо (Mood Video).mp3` |
| Format | MP3 (MPEG-1 Layer III), 192 kbps CBR, 44.1 kHz stereo |
| Duration | 201.22 s (measured via `ffprobe`) |
| DRM | None detected — plain, unencrypted MP3; decodes cleanly end-to-end |
| Added | 2026-10-13, supplied directly by the user (not downloaded by an agent) |
| **Rightsholder / license reference** | Confirmed by the project owner on 2026-10-16 when approving the push to the private GitHub repository. **No contract / written-permission reference is on file yet** — add it here. |

**Status (2026-10-16):** the project owner confirmed the rights to this
recording and approved committing it to the private GitHub repository.
Production builds still exclude the audio and cover (`__DEV__`-only wiring in
`src/audio/demo-sources.ts`, `demo-audio.ts`, `stitch-artwork.ts`); enabling
it in production / public deployments is a separate decision. Please add the
license reference (contract, written permission) to the table above.
