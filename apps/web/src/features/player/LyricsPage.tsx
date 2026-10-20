// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect, useRef } from 'react';

import { activeLineIndex, lyricsEmptyCopy, lyricsStateFor, sampleLyricsNote } from '@mmusic/core/lib/lyrics-state';
import type { LyricLine } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';

import { useAppStrings } from '@/i18n/locale';
import { EmptyState } from '@/ui';

import { Screen, SubHeader, Transport, useDocumentTitle } from './shared';

/** After a manual scroll, follow the current line again after this long. */
const RESUME_FOLLOW_MS = 4000;
/** The current line rests this far down the lyrics area. */
const FOLLOW_ANCHOR = 0.35;

/**
 * S-16 Synchronized Lyrics (app: app/player/lyrics.tsx + core lib/lyrics-state.ts): only lyrics from the catalog
 * data, sample text always labelled, instrumental demo recordings and tracks without lyrics get the app's honest
 * empty copy. The current line follows playback unless the listener is reading elsewhere.
 */
export function LyricsPage() {
  const { t, locale } = useAppStrings();
  const track = usePlayerStore((s) => s.currentTrack());
  const progressSec = usePlayerStore((s) => s.progressSec);
  const state = lyricsStateFor(track?.id);
  useDocumentTitle(t('lyricsTab'));

  return (
    <Screen cover={track?.coverUri} className="pl-sub">
      <SubHeader active="lyrics" />
      <main className="pl-sub-body ly-body">
        {state.kind === 'synced' ? (
          <SyncedLyrics lines={state.lines} sample={state.source === 'sample'} progressMs={progressSec * 1000} />
        ) : (
          <div className="ly-empty">
            <EmptyState icon="lyrics" title={lyricsEmptyCopy(locale, state.kind).title} body={lyricsEmptyCopy(locale, state.kind).hint} />
          </div>
        )}
      </main>
      <footer className="pl-sub-foot">
        <Transport />
      </footer>
    </Screen>
  );
}

function SyncedLyrics({ lines, sample, progressMs }: { lines: LyricLine[]; sample: boolean; progressMs: number }) {
  const { locale } = useAppStrings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const following = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeIndex = activeLineIndex(lines, progressMs);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    const box = scrollRef.current;
    const line = lineRefs.current[activeIndex];
    if (!following.current || !box || !line) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({ top: Math.max(0, line.offsetTop - box.clientHeight * FOLLOW_ANCHOR), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeIndex]);

  const pauseFollowing = () => {
    following.current = false;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      following.current = true;
    }, RESUME_FOLLOW_MS);
  };

  return (
    <div className="ly-wrap">
      {sample && (
        <div className="ly-sample">
          <span className="ly-sample-pill">{sampleLyricsNote(locale).label}</span>
          <span className="t-body-sm">{sampleLyricsNote(locale).hint}</span>
        </div>
      )}
      <div ref={scrollRef} className="ly-scroll" onWheel={pauseFollowing} onTouchMove={pauseFollowing}>
        {lines.map((line, index) => {
          const distance = Math.abs(index - activeIndex);
          return (
            <p
              key={line.timeMs}
              ref={(el) => {
                lineRefs.current[index] = el;
              }}
              className={distance === 0 ? 'ly-line active' : distance === 1 ? 'ly-line near' : 'ly-line'}
              aria-current={distance === 0 ? 'true' : undefined}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
