/**
 * Audio for moderation previews — an explicit table: a submission gets audio only when a legally usable file that
 * already belongs to THAT track exists. Never unrelated audio.
 *
 * Audit (2026-10-21):
 *  - The 9 demo track submissions (sub-t1 … sub-t9) are fictional recordings; no audio file of them exists.
 *  - apps/mobile/assets/audio holds 13 CC BY 4.0 recordings (Kevin MacLeod, see its CREDITS.md). They already stand
 *    in for 13 specific *catalog* tracks of the app; they are not these submissions, so they are not mapped here.
 *  - kyrgyz/oshondo.mp3 belongs to a real artist's catalog track and is development-only; never mapped.
 * Result: none of the 9 has audio; their previews show "Аудиофайл не загружен". A future upload flow (or backend)
 * fills the table with the uploaded file's URL.
 *
 * The one playable entry is the labelled demo submission sub-demo-horizon, built on the catalog track "Horizon": it
 * plays exactly the recording the catalog already plays for that track (core/audio/demo-audio-keys.ts:
 * horizon → floating-cities.mp3, 184 s like the catalog entry). tests/audio.test.ts checks every entry against that
 * table, so a submission can never get a recording its catalog track doesn't have.
 */
export const DEMO_AUDIO: Readonly<Record<string, { file: string; url: string; credit: string }>> = {
  'sub-demo-horizon': {
    file: 'floating-cities.mp3',
    // new URL(…, import.meta.url): Vite ships exactly this file with the build; nothing else from the folder.
    url: new URL('../../../mobile/assets/audio/floating-cities.mp3', import.meta.url).href,
    credit: '“Floating Cities” Kevin MacLeod (incompetech.com) · CC BY 4.0',
  },
};

export const SUBMISSION_AUDIO: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(DEMO_AUDIO).map(([id, a]) => [id, a.url]));

/** Attribution line of a submission's demo recording (license requirement), if it has one. */
export function audioCreditFor(submissionId: string): string | undefined {
  return DEMO_AUDIO[submissionId]?.credit;
}

/** The preview URL of a track submission, or undefined when no audio file exists (playback disabled). */
export function audioForSubmission(submissionId: string, kind: 'track' | 'release'): string | undefined {
  if (kind !== 'track') return undefined;
  return SUBMISSION_AUDIO[submissionId];
}

/** m:ss (or h:mm:ss) for player times; unknown / invalid → "0:00". */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export type PreviewError = 'unsupported' | 'network' | 'decode' | 'blocked' | 'unknown';

/**
 * Maps a media failure to what the UI says. MediaError codes: 1 aborted, 2 network, 3 decode, 4 source not
 * supported; a rejected play() with NotAllowedError means the browser blocked playback.
 */
export function previewErrorKind(input: { mediaErrorCode?: number; playErrorName?: string }): PreviewError {
  if (input.playErrorName === 'NotAllowedError') return 'blocked';
  if (input.playErrorName === 'NotSupportedError') return 'unsupported';
  switch (input.mediaErrorCode) {
    case 2:
      return 'network';
    case 3:
      return 'decode';
    case 4:
      return 'unsupported';
    default:
      return 'unknown';
  }
}

/** Seek target clamped to the media length. */
export function clampSeek(value: number, duration: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(Math.max(value, 0), duration);
}
