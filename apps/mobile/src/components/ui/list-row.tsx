import { Image } from 'expo-image';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { Badge } from './badge';
import { EqualizerIndicator } from './equalizer';
import { Icon } from './icon';
import { IconButton } from './button';
import { PressableScale } from './pressable-scale';
import { Toggle } from './toggle';
import { ThemedText } from '../themed-text';

const ROW_HEIGHT = 56;

function Cover({ uri, size = 40, radius = 8, shape = 'square' }: { uri?: string; size?: number; radius?: number; shape?: 'square' | 'circle' }) {
  return (
    <View
      style={[
        styles.coverPlaceholder,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : radius },
      ]}
    >
      {uri && (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : radius }}
          contentFit="cover"
        />
      )}
    </View>
  );
}

export type TrackRowProps = {
  /** Track position in the list; replaced by an equalizer icon when `isPlaying`. */
  index?: number;
  coverUri?: string;
  title: string;
  artist: string;
  durationLabel?: string;
  explicit?: boolean;
  lossless?: boolean;
  isPlaying?: boolean;
  liked?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onToggleLike?: () => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
};

/** Track row — 56px (DESIGN.md "Track List Rows"; docs/screens.md §3.5). */
export function TrackRow({
  index,
  coverUri,
  title,
  artist,
  durationLabel,
  explicit,
  lossless,
  isPlaying = false,
  liked = false,
  onPress,
  onToggleLike,
  onOptionsPress,
  style,
}: TrackRowProps) {
  return (
    <PressableScale onPress={onPress} style={[styles.row, style]} accessibilityRole="button">
      <View style={styles.leadingSlot}>
        {isPlaying ? (
          <EqualizerIndicator />
        ) : coverUri ? (
          <Cover uri={coverUri} />
        ) : index !== undefined ? (
          <ThemedText variant="mono-num" emphasis="medium">
            {index}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.titleBlock}>
        <ThemedText
          variant="label-lg"
          numberOfLines={1}
          style={isPlaying ? { color: Colors.primary } : undefined}
        >
          {title}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1} style={styles.metaText}>
            {artist}
          </ThemedText>
          {explicit && <Badge label="E" variant="explicit" />}
          {lossless && <Badge label="LOSSLESS" variant="lossless" />}
        </View>
      </View>
      {onToggleLike && (
        <IconButton
          icon={liked ? 'favorite' : 'favorite-border'}
          onPress={onToggleLike}
          color={liked ? Colors.primary : Colors.text.medium}
          size={36}
          style={styles.transparentIconButton}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        />
      )}
      {durationLabel && (
        <ThemedText variant="mono-num" emphasis="medium" style={styles.duration}>
          {durationLabel}
        </ThemedText>
      )}
      {onOptionsPress && (
        <IconButton
          icon="more-vert"
          onPress={onOptionsPress}
          size={36}
          style={styles.transparentIconButton}
          accessibilityLabel="Track options"
        />
      )}
    </PressableScale>
  );
}

export type QueueRowProps = {
  coverUri?: string;
  title: string;
  artist: string;
  durationLabel?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Playback-queue row — cover → title/artist → duration → drag handle. */
export function QueueRow({ coverUri, title, artist, durationLabel, onPress, style }: QueueRowProps) {
  return (
    <PressableScale onPress={onPress} style={[styles.row, style]} accessibilityRole="button">
      <Cover uri={coverUri} />
      <View style={styles.titleBlock}>
        <ThemedText variant="label-lg" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
          {artist}
        </ThemedText>
      </View>
      {durationLabel && (
        <ThemedText variant="mono-num" emphasis="medium" style={styles.duration}>
          {durationLabel}
        </ThemedText>
      )}
      <Icon name="drag-handle" color={Colors.text.low} />
    </PressableScale>
  );
}

export type LibraryRowProps = {
  coverUri?: string;
  coverShape?: 'square' | 'circle';
  title: string;
  subtitle?: string;
  verified?: boolean;
  downloaded?: boolean;
  /** 'chevron' (artists/navigable), 'more' (playlists/albums — "⋮" options), 'none'. */
  trailing?: 'chevron' | 'more' | 'none';
  onPress?: (event: GestureResponderEvent) => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
};

/** Library list row — cover/avatar → title (+verified) → type•meta → downloaded
 * badge → trailing affordance (docs/screens.md §3.10 S-12). */
export function LibraryRow({
  coverUri,
  coverShape = 'square',
  title,
  subtitle,
  verified,
  downloaded,
  trailing = 'chevron',
  onPress,
  onOptionsPress,
  style,
}: LibraryRowProps) {
  return (
    <PressableScale onPress={onPress} style={[styles.row, style]} accessibilityRole="button">
      <Cover uri={coverUri} shape={coverShape} size={56} radius={Radii.md} />
      <View style={styles.titleBlock}>
        <View style={libraryRowStyles.titleRow}>
          <ThemedText variant="body-lg" numberOfLines={1} style={libraryRowStyles.titleText}>
            {title}
          </ThemedText>
          {verified && <Icon name="verified" size={14} color={Colors.primary} />}
        </View>
        {subtitle && (
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {downloaded && <Icon name="download-done" size={18} color={Colors.secondary} />}
      {trailing === 'chevron' && <Icon name="chevron-right" color={Colors.text.medium} />}
      {trailing === 'more' && (
        <IconButton icon="more-vert" accessibilityLabel="Options" size={36} onPress={onOptionsPress} style={styles.transparentIconButton} />
      )}
    </PressableScale>
  );
}

export type PlaylistPickerRowProps = {
  coverUri?: string;
  title: string;
  trackCountLabel: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Add-to-playlist picker row — cover → title/count → + / ✓ (docs/screens.md §3.5). */
export function PlaylistPickerRow({ coverUri, title, trackCountLabel, selected = false, onPress, style }: PlaylistPickerRowProps) {
  return (
    <PressableScale onPress={onPress} style={[styles.row, style]} accessibilityRole="button" accessibilityState={{ selected }}>
      <Cover uri={coverUri} />
      <View style={styles.titleBlock}>
        <ThemedText variant="label-lg" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
          {trackCountLabel}
        </ThemedText>
      </View>
      <View style={[pickerStyles.toggle, selected && pickerStyles.toggleSelected]}>
        <Icon name={selected ? 'check' : 'add'} size={18} color={selected ? Colors.text.high : Colors.text.medium} />
      </View>
    </PressableScale>
  );
}

const pickerStyles = StyleSheet.create({
  toggle: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSelected: {
    backgroundColor: Colors.primary,
  },
});

export type MenuRowProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Settings/profile menu row — icon circle → title/subtitle → chevron (docs/screens.md §3.5;
 * reused by Artist Flow's S-25 feature rows and S-23 "Studio Sanctuary" / "Become an Artist"). */
export function MenuRow({ icon, title, subtitle, onPress, style }: MenuRowProps) {
  return (
    <PressableScale onPress={onPress} style={[menuStyles.row, style]} accessibilityRole="button">
      <View style={menuStyles.iconCircle}>
        <Icon name={icon} color={Colors.primary} />
      </View>
      <View style={styles.titleBlock}>
        <ThemedText variant="label-lg" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <Icon name="chevron-right" color={Colors.text.medium} />
    </PressableScale>
  );
}

export type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Settings-style row — title/subtitle → Toggle (docs/screens.md §3.6 Public/
 * Collaborative on S-14; §3.11 all of S-24's switches). */
export function ToggleRow({ title, subtitle, value, onValueChange, disabled, style }: ToggleRowProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleBlock}>
        <ThemedText variant="label-lg" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <Toggle value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={title} />
    </View>
  );
}

export type ValueRowProps = {
  title: string;
  value: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Settings-style row — title → static value + chevron, for options whose own
 * picker screen is undesigned (docs/screens.md §3.11 S-24 "не задизайнены [Т]":
 * Wi-Fi/Cellular/Download Quality). Tapping is inert unless `onPress` is given. */
export function ValueRow({ title, value, onPress, style }: ValueRowProps) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={[styles.row, style]}>
      <ThemedText variant="label-lg" style={styles.titleBlock} numberOfLines={1}>
        {title}
      </ThemedText>
      <ThemedText variant="body-md" emphasis="medium">
        {value}
      </ThemedText>
      {onPress && <Icon name="chevron-right" color={Colors.text.medium} />}
    </PressableScale>
  );
}

const libraryRowStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    flexShrink: 1,
  },
});

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_HEIGHT,
    gap: Spacing.md,
  },
  leadingSlot: {
    width: 40,
    alignItems: 'center',
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    flexShrink: 1,
  },
  duration: {
    marginLeft: Spacing.xs,
  },
  transparentIconButton: {
    backgroundColor: 'transparent',
  },
});
