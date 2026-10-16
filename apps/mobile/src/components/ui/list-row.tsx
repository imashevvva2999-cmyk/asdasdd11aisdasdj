import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { getFallbackGradient } from '@/constants/fallback-artwork';
import { resolveFontFamily } from '@/constants/fonts';
import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { useAppStrings } from '@/state/locale-store';

import { Badge } from './badge';
import { EqualizerIndicator } from './equalizer';
import { Icon } from './icon';
import { IconButton } from './button';
import { PressableScale } from './pressable-scale';
import { Toggle } from './toggle';
import { ThemedText } from '../themed-text';

const ROW_HEIGHT = 56;

/** `seed` (usually the row's title) picks a deterministic fallback gradient
 * instead of a flat grey box when there's no real cover (Фаза 4 visual QA
 * pass — see src/constants/fallback-artwork.ts). */
function Cover({ uri, seed, size = 40, radius = 8, shape = 'square' }: { uri?: LocalOrRemoteImage; seed?: string; size?: number; radius?: number; shape?: 'square' | 'circle' }) {
  const borderRadius = shape === 'circle' ? size / 2 : radius;
  const hydrated = useHydrated();
  return (
    <View style={[styles.coverPlaceholder, { width: size, height: size, borderRadius }]}>
      {uri && hydrated ? (
        <Image source={toImageSource(uri)} style={{ width: size, height: size, borderRadius }} contentFit="cover" />
      ) : (
        <>
          <LinearGradient colors={getFallbackGradient(seed ?? '') as [string, string]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.coverFallbackIcon} pointerEvents="none">
            <Icon name="music-note" size={Math.max(12, size * 0.4)} color="rgba(255,255,255,0.28)" />
          </View>
        </>
      )}
    </View>
  );
}

export type TrackRowProps = {
  /** Track position in the list; replaced by an equalizer icon when `isPlaying`. */
  index?: number;
  coverUri?: LocalOrRemoteImage;
  title: string;
  artist: string;
  explicit?: boolean;
  lossless?: boolean;
  isPlaying?: boolean;
  /** Current track (playing or paused): raised row + coral title, as every
   * Stitch track list highlights it. */
  active?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
};

/** Track row — 56px (DESIGN.md "Track List Rows"; docs/screens.md §3.5). */
export function TrackRow({
  index,
  coverUri,
  title,
  artist,
  explicit,
  lossless,
  isPlaying = false,
  active = false,
  onPress,
  onOptionsPress,
  style,
}: TrackRowProps) {
  // Index and cover can both show (Stitch Artist "Popular", Playlist, Liked
  // Songs); while playing, the equalizer replaces the index, or overlays the
  // cover when there is no index.
  const showCover = coverUri !== undefined || index === undefined;
  const { t } = useAppStrings();
  // The options button sits beside (not inside) the row's pressable, overlaid
  // on a same-size spacer: the row keeps its real button role and web never
  // nests a <button> inside another <button>. Same layout as before.
  const row = (
    <PressableScale onPress={onPress} style={[styles.row, active && styles.activeRow, style]} accessibilityRole="button">
      {index !== undefined && (
        <View style={showCover ? styles.indexSlot : styles.leadingSlot}>
          {isPlaying ? (
            <EqualizerIndicator />
          ) : (
            <ThemedText variant="mono-num" emphasis={active ? 'primary' : 'medium'}>
              {index}
            </ThemedText>
          )}
        </View>
      )}
      {showCover && (
        <View>
          <Cover uri={coverUri} seed={title} />
          {isPlaying && index === undefined && (
            <View style={styles.coverEqualizer} pointerEvents="none">
              <EqualizerIndicator size={14} />
            </View>
          )}
        </View>
      )}
      <View style={styles.titleBlock}>
        <ThemedText
          variant="label-lg"
          numberOfLines={1}
          style={isPlaying || active ? { color: Colors.primary } : undefined}
        >
          {title}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1} style={styles.metaText}>
            {artist}
          </ThemedText>
          {explicit && <Badge label="E" variant="explicit" />}
        </View>
      </View>
      {onOptionsPress && <View style={styles.optionsSpacer} />}
    </PressableScale>
  );
  if (!onOptionsPress) return row;
  return (
    <View style={styles.rowWrap}>
      {row}
      <View style={[styles.optionsSlot, active && styles.optionsSlotActive]} pointerEvents="box-none">
        <IconButton
          icon="more-vert"
          onPress={onOptionsPress}
          size={36}
          style={styles.transparentIconButton}
          accessibilityLabel={t('trackOptionsLabel')}
        />
      </View>
    </View>
  );
}

export type QueueRowProps = {
  coverUri?: LocalOrRemoteImage;
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
      <Cover uri={coverUri} seed={title} />
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
      <Icon name="drag-handle" color={Colors.text.medium} />
    </PressableScale>
  );
}

export type LibraryRowProps = {
  coverUri?: LocalOrRemoteImage;
  coverShape?: 'square' | 'circle';
  /** Shows a solid tile with this coral glyph instead of artwork (e.g. Liked Songs' heart). */
  coverIcon?: string;
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

/** Library list row — cover/avatar → title (+verified) → type•meta →
 * trailing affordance (docs/screens.md §3.10 S-12). */
export function LibraryRow({
  coverUri,
  coverShape = 'square',
  coverIcon,
  title,
  subtitle,
  verified,
  trailing = 'chevron',
  onPress,
  onOptionsPress,
  style,
}: LibraryRowProps) {
  const { t } = useAppStrings();
  return (
    <PressableScale onPress={onPress} style={[styles.row, libraryRowStyles.row, style]} accessibilityRole={trailing === 'more' ? undefined : 'button'}>
      {coverIcon ? (
        <View style={libraryRowStyles.iconCover}>
          <Icon name={coverIcon} size={26} color={Colors.primary} />
        </View>
      ) : (
        <Cover uri={coverUri} seed={title} shape={coverShape} size={56} radius={Radii.DEFAULT} />
      )}
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
      {trailing === 'chevron' && <Icon name="chevron-right" color={Colors.text.medium} />}
      {trailing === 'more' && (
        <IconButton icon="more-vert" accessibilityLabel={t('optionsLabel')} size={36} onPress={onOptionsPress} style={styles.transparentIconButton} />
      )}
    </PressableScale>
  );
}

export type PlaylistPickerRowProps = {
  coverUri?: LocalOrRemoteImage;
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
      <Cover uri={coverUri} seed={title} size={48} radius={Radii.md} />
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
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l3,
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
  /** 'feature' = Stitch S-25 benefit card: rounded-square icon tile, 18px
   * headline title and a wrapping subtitle. */
  variant?: 'default' | 'feature' | 'flat';
  /** Icon accent: coral (default), gold, or neutral grey — Stitch Profile
   * tints each menu row's icon circle. */
  tone?: 'primary' | 'secondary' | 'neutral';
  style?: ViewStyle;
};

/** Settings/profile menu row — icon circle → title/subtitle → chevron (docs/screens.md §3.5;
 * reused by Artist Flow's S-25 feature rows and S-23 "Studio Sanctuary" / "Become an Artist"). */
export function MenuRow({ icon, title, subtitle, onPress, variant = 'default', tone = 'primary', style }: MenuRowProps) {
  const feature = variant === 'feature';
  // 'flat' = action-sheet row (Stitch track-menu overlay): no card, icon tile, no chevron.
  const flat = variant === 'flat';
  const toneColor = tone === 'secondary' ? Colors.secondary : tone === 'neutral' ? Colors.text.medium : Colors.primary;
  const toneBackground =
    feature || tone === 'neutral' ? undefined : tone === 'secondary' ? 'rgba(245, 166, 35, 0.14)' : 'rgba(255, 75, 75, 0.14)';
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      style={[menuStyles.row, feature && menuStyles.featureRow, flat && menuStyles.flatRow, style]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[menuStyles.iconCircle, (feature || flat) && menuStyles.iconTile, toneBackground ? { backgroundColor: toneBackground } : null]}>
        <Icon name={icon} color={toneColor} />
      </View>
      <View style={styles.titleBlock}>
        <ThemedText variant={feature ? 'headline-sm' : 'label-lg'} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant={feature ? 'body-md' : 'body-sm'} emphasis="medium" numberOfLines={feature ? 2 : 1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onPress && !flat && <Icon name="chevron-right" color={Colors.text.medium} />}
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
  // Stitch S-12 rows: 8px inset with a 12px radius (76px pitch with a 56px cover).
  row: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  // Same treatment as the Liked Songs page badge (S-13), at row size.
  iconCover: {
    width: 56,
    height: 56,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l2,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    flexShrink: 1,
    // Semibold 16px (Stitch S-12): select the 600 face explicitly — custom
    // fonts don't synthesize weight on native.
    fontFamily: resolveFontFamily('Inter', '600'),
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
  featureRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  iconTile: {
    borderRadius: Radii.DEFAULT,
  },
  flatRow: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.DEFAULT,
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
  indexSlot: {
    width: 20,
    alignItems: 'center',
  },
  activeRow: {
    backgroundColor: 'rgba(40, 40, 52, 0.6)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
  },
  rowWrap: { position: 'relative' },
  optionsSpacer: { width: 36, height: 36 },
  optionsSlot: { position: 'absolute', top: 0, bottom: 0, right: 0, justifyContent: 'center' },
  optionsSlotActive: { right: Spacing.sm },
  coverEqualizer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  coverFallbackIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
