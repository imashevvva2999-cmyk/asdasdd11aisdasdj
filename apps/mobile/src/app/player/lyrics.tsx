import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerBackground } from '@/components/player/player-background';
import { PlayerSubHeader } from '@/components/player/player-subheader';
import { PlayerTransport } from '@/components/player/player-transport';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { LYRICS_EMPTY, SAMPLE_LYRICS_NOTE, activeLineIndex, lyricsStateFor } from '@/lib/lyrics-state';
import type { LyricLine } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** After a manual scroll, follow the current line again after this long. */
const RESUME_FOLLOW_MS = 4000;
/** The current line rests this far down the lyrics area. */
const FOLLOW_ANCHOR = 0.35;

/**
 * S-16 Synchronized Lyrics (docs/screens.md §3.9; W3 Этап 1, iphone/lyrics.png):
 * the text is the hero, on the cover's stage colour, with the shared header and
 * the playback controls always below. Only lyrics from the catalog data are
 * shown (W3 spec §2.4); sample text is labelled, and demo recordings without
 * lyrics say they are instrumental. No swipe-to-close here: dragging scrolls
 * the text, ⌄ and Back return to Now Playing.
 */
export default function LyricsScreen() {
  const track = usePlayerStore((s) => s.currentTrack());
  const progressSec = usePlayerStore((s) => s.progressSec);
  const state = lyricsStateFor(track?.id);

  return (
    <View style={styles.flex}>
      <PlayerBackground />
      <SafeAreaView style={styles.flex}>
        <PlayerSubHeader active="lyrics" />
        {state.kind === 'synced' ? (
          <SyncedLyrics lines={state.lines} sample={state.source === 'sample'} progressMs={progressSec * 1000} />
        ) : (
          <View style={styles.empty}>
            <EmptyState icon="lyrics" title={LYRICS_EMPTY[state.kind].title} hint={LYRICS_EMPTY[state.kind].hint} />
          </View>
        )}
        <PlayerTransport />
      </SafeAreaView>
    </View>
  );
}

function SyncedLyrics({ lines, sample, progressMs }: { lines: LyricLine[]; sample: boolean; progressMs: number }) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const [viewportHeight, setViewportHeight] = useState(0);
  const following = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeIndex = activeLineIndex(lines, progressMs);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  // Keep the current line at the anchor, unless the listener is reading elsewhere.
  useEffect(() => {
    if (!following.current || activeIndex < 0 || viewportHeight === 0) return;
    const y = lineY.current[activeIndex];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewportHeight * FOLLOW_ANCHOR), animated: !reduceMotion });
  }, [activeIndex, viewportHeight, reduceMotion]);

  const pauseFollowing = () => {
    following.current = false;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      following.current = true;
    }, RESUME_FOLLOW_MS);
  };

  return (
    <View style={styles.flex}>
      {sample && (
        <View style={styles.sampleNote}>
          <View style={styles.samplePill}>
            <ThemedText variant="label-sm" style={styles.samplePillText}>
              {SAMPLE_LYRICS_NOTE.label}
            </ThemedText>
          </View>
          <ThemedText variant="body-sm" style={styles.sampleHint} numberOfLines={2}>
            {SAMPLE_LYRICS_NOTE.hint}
          </ThemedText>
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.lyricsContent, { paddingBottom: viewportHeight * (1 - FOLLOW_ANCHOR) }]}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onScrollBeginDrag={pauseFollowing}
        // Web: a mouse wheel or trackpad scroll is a manual scroll too.
        {...({ onWheel: pauseFollowing } as object)}
      >
        {lines.map((line, index) => {
          const distance = Math.abs(index - activeIndex);
          const active = distance === 0;
          return (
            <ThemedText
              key={line.timeMs}
              variant="display-lg-mobile"
              onLayout={(e) => {
                lineY.current[index] = e.nativeEvent.layout.y;
              }}
              style={[styles.line, active ? styles.lineActive : { opacity: distance === 1 ? 0.55 : 0.32 }]}
            >
              {line.text}
            </ThemedText>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  sampleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
  },
  samplePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  samplePillText: {
    color: Colors.text.high,
  },
  sampleHint: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.64)',
  },
  lyricsContent: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  line: {
    fontSize: 28,
    lineHeight: 35,
  },
  lineActive: {
    fontSize: 32,
    lineHeight: 40,
    opacity: 1,
  },
});
