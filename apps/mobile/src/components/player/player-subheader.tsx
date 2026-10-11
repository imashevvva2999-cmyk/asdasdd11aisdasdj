import { router, useNavigation } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, IconButton, PressableScale } from '@/components/ui';
import { Radii, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { subHeaderBackLabel } from '@/lib/stage-rules';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

type PlayerView = 'lyrics' | 'queue';

/**
 * Shared header of Lyrics and Queue (W3 Этап 1, iphone/lyrics.png,
 * iphone/queue.png): the cover folded into a small title row, ⌄ to go back
 * to Now Playing, and a Lyrics / Queue switch. Switching replaces the route,
 * so Back still returns to Now Playing instead of walking every switch.
 */
export function PlayerSubHeader({ active }: { active: PlayerView }) {
  const track = usePlayerStore((s) => s.currentTrack());
  // Opened from Now Playing, ⌄ goes back to it; opened straight from Home, it closes.
  const stack = useNavigation().getState();
  const backLabel = subHeaderBackLabel(stack ? stack.routes[stack.index - 1]?.name : undefined);
  const { t } = useAppStrings();

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {track && <Artwork uri={track.coverUri} size={36} radius={Radii.sm} />}
        <View style={styles.titleText}>
          {track && (
            <>
              <ThemedText variant="label-lg" numberOfLines={1}>
                {track.title}
              </ThemedText>
              <ThemedText variant="body-sm" numberOfLines={1} style={styles.onColorMedium}>
                {track.artistName}
              </ThemedText>
            </>
          )}
        </View>
        <IconButton variant="ghost" icon="keyboard-arrow-down" iconSize={26} accessibilityLabel={backLabel} onPress={() => goBack()} />
      </View>

      <View style={styles.switch} accessibilityRole="tablist">
        <SwitchTab label={t('lyricsTab')} selected={active === 'lyrics'} onPress={() => router.replace('/player/lyrics')} />
        <SwitchTab label={t('queueTab')} selected={active === 'queue'} onPress={() => router.replace('/player/queue')} />
      </View>
    </View>
  );
}

function SwitchTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      disabled={selected}
      onPress={onPress}
      style={[styles.tab, selected && styles.tabSelected]}
    >
      <ThemedText variant="label-lg" style={selected ? styles.tabTextSelected : styles.onColorMedium}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 48,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
  },
  switch: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(10, 10, 12, 0.35)',
  },
  tab: {
    minWidth: 100,
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {
    backgroundColor: '#FFFFFF',
  },
  tabTextSelected: {
    color: '#0A0A0C',
  },
  onColorMedium: {
    color: ON_COLOR_MEDIUM,
  },
});
