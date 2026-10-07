import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, IconButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getLyricsForTrack } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** S-16 Synchronized Lyrics (docs/screens.md §3.9). */
export default function LyricsScreen() {
  const track = usePlayerStore((s) => s.currentTrack());
  const progressSec = usePlayerStore((s) => s.progressSec);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);

  const lines = track ? getLyricsForTrack(track.id) : undefined;

  const activeIndex = useMemo(() => {
    if (!lines) return -1;
    const progressMs = progressSec * 1000;
    let index = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].timeMs <= progressMs) index = i;
    }
    return index;
  }, [lines, progressSec]);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <IconButton icon="keyboard-arrow-down" accessibilityLabel="Collapse" onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            {track && (
              <>
                <ThemedText variant="label-lg" numberOfLines={1}>
                  {track.title}
                </ThemedText>
                <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
                  {track.artistName}
                </ThemedText>
              </>
            )}
          </View>
          <IconButton icon="share" accessibilityLabel="Share" onPress={() => {}} />
        </View>

        {!track || !lines ? (
          <EmptyState icon="lyrics" title="Lyrics unavailable" hint="Synchronized lyrics haven't been added for this track yet." />
        ) : (
          <ScrollView contentContainerStyle={styles.lyricsContent}>
            {lines.map((line, index) => {
              const distance = Math.abs(index - activeIndex);
              const emphasis = distance === 0 ? 'high' : distance === 1 ? 'medium' : 'low';
              return (
                <ThemedText
                  key={line.timeMs}
                  variant={distance === 0 ? 'headline-sm' : 'body-lg'}
                  emphasis={emphasis}
                  style={[styles.line, distance === 0 && styles.activeLine]}
                >
                  {line.text}
                </ThemedText>
              );
            })}
          </ScrollView>
        )}

        {track && (
          <View style={styles.transportRow}>
            <IconButton icon="skip-previous" accessibilityLabel="Previous" onPress={previous} />
            <IconButton
              icon={isPlaying ? 'pause' : 'play-arrow'}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              size={56}
              onPress={togglePlayPause}
            />
            <IconButton icon="skip-next" accessibilityLabel="Next" onPress={next} />
          </View>
        )}

        <View style={styles.tabRow}>
          <ThemedText variant="label-md" emphasis="primary">
            Lyrics
          </ThemedText>
          <TabLink label="Queue" onPress={() => router.push('/player/queue')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function TabLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <ThemedText variant="label-md" emphasis="medium" onPress={onPress}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
  },
  lyricsContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  line: {
    textAlign: 'center',
  },
  activeLine: {
    color: Colors.primary,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingBottom: Spacing.md,
  },
});
