import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, EmptyState, Icon, IconButton, PressableScale } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { shareEntity } from '@/lib/share';
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
  const { showToast, toast } = useToast();

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

  const durationSec = track?.durationSec ?? 0;
  const progressRatio = durationSec > 0 ? Math.min(1, progressSec / durationSec) : 0;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <IconButton icon="keyboard-arrow-down" accessibilityLabel="Collapse" onPress={() => goBack()} />
          <View style={styles.headerCenter}>
            {track && (
              <>
                <ThemedText variant="headline-sm" numberOfLines={1}>
                  {track.title}
                </ThemedText>
                <ThemedText variant="label-md" emphasis="medium" numberOfLines={1}>
                  {track.artistName}
                </ThemedText>
              </>
            )}
          </View>
          <IconButton
            icon="ios-share"
            accessibilityLabel="Share"
            onPress={async () => {
              if (!track) return;
              const shared = await shareEntity('track', track.id, track.title);
              if (!shared) showToast("Sharing isn't available on this device", 'share');
            }}
          />
        </View>

        {!track || !lines ? (
          <EmptyState icon="lyrics" title="Lyrics unavailable" hint="Synchronized lyrics haven't been added for this track yet." />
        ) : (
          <ScrollView contentContainerStyle={styles.lyricsContent}>
            {lines.map((line, index) => {
              const distance = Math.abs(index - activeIndex);
              if (distance === 0) {
                return (
                  <View key={line.timeMs} style={styles.activeRow}>
                    <View style={styles.activeBar} />
                    <ThemedText variant="display-lg-mobile" style={styles.activeLine}>
                      {line.text}
                    </ThemedText>
                  </View>
                );
              }
              return (
                <ThemedText
                  key={line.timeMs}
                  variant={distance === 1 ? 'headline-lg' : 'headline-md'}
                  style={{ opacity: distance === 1 ? 0.42 : distance === 2 ? 0.24 : 0.14 }}
                >
                  {line.text}
                </ThemedText>
              );
            })}
          </ScrollView>
        )}

        {track && (
          <View style={styles.footer}>
            <View style={styles.progressTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <ThemedText variant="mono-num" emphasis="primary">
                {formatTime(progressSec)}
              </ThemedText>
              <ThemedText variant="mono-num" emphasis="medium">
                -{formatTime(Math.max(0, durationSec - progressSec))}
              </ThemedText>
            </View>
            <View style={styles.transportRow}>
              <IconButton variant="ghost" icon="skip-previous" iconSize={30} size={48} accessibilityLabel="Previous" onPress={previous} />
              <CircleButton
                icon={isPlaying ? 'pause' : 'play-arrow'}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                size={64}
                iconSize={32}
                onPress={togglePlayPause}
              />
              <IconButton variant="ghost" icon="skip-next" iconSize={30} size={48} accessibilityLabel="Next" onPress={next} />
            </View>
          </View>
        )}

        <View style={styles.tabRow}>
          <PlayerTab label="Lyrics" icon="mic-none" active />
          <PlayerTab label="Audio" icon="headphones" onPress={() => router.push('/profile/audio-quality')} />
          <PlayerTab label="Queue" icon="queue-music" onPress={() => router.push('/player/queue')} />
        </View>
      </SafeAreaView>
      {toast}
    </ThemedView>
  );
}

function PlayerTab({ label, icon, active = false, onPress }: { label: string; icon: string; active?: boolean; onPress?: () => void }) {
  const color = active ? Colors.primary : Colors.text.medium;
  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      disabled={active}
      onPress={onPress}
      style={styles.tab}
    >
      <Icon name={icon} size={22} color={color} />
      <ThemedText variant="label-sm" style={{ color }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  lyricsContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.xl,
    gap: Spacing.xl,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  activeBar: {
    width: 6,
    height: 24,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  activeLine: {
    flex: 1,
    fontSize: 34,
    lineHeight: 42,
  },
  footer: {
    paddingHorizontal: Spacing.margin,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: Spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
});
