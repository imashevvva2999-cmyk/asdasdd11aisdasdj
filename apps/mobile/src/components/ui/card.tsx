import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from '../themed-text';

export type CoverCardProps = {
  coverUri?: string;
  title: string;
  subtitle?: string;
  /** Extra line under subtitle, secondary-colored (e.g. "Single • Out Today" — New Releases). */
  meta?: string;
  width?: number;
  /** Defaults to a 1:1 square (`width`). Set for non-square overlay tiles (genre grid ≈ 84px tall). */
  height?: number;
  /** 'overlay' = text on a bottom gradient over the image (genre/realm tiles — DESIGN.md
   * "Album & Playlist Cards"). 'below' = text below a plain cover, no gradient (Trending
   * Now / New Releases / Album / Search-result cards — matches the actual Stitch exports
   * for those, which render text under the cover rather than overlaid). */
  layout?: 'overlay' | 'below';
  /** Wrap in a padded surface-container-low card (New Releases style). Only meaningful with layout="below". */
  surfaced?: boolean;
  /** Numbered badge, top-left (Curated Realms grid). */
  number?: number;
  /** Heart overlay button, bottom-right of the cover (Trending Now style). */
  liked?: boolean;
  onToggleLike?: () => void;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/**
 * Cover card — covers the Release / Trending / Genre / Realm / Compilation /
 * Quick-tile / Album / Search-result card family from docs/screens.md §3.4 via
 * the `layout`/`surfaced`/`number`/`liked` props, instead of one component per
 * named card type.
 */
export function CoverCard({
  coverUri,
  title,
  subtitle,
  meta,
  width = 140,
  height,
  layout = 'overlay',
  surfaced = false,
  number,
  liked,
  onToggleLike,
  onPress,
  style,
}: CoverCardProps) {
  const coverHeight = height ?? width;

  const cover = (
    <View style={[cardStyles.coverBase, { width, height: coverHeight }, layout === 'overlay' && cardStyles.justifyEnd]}>
      {coverUri && <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {layout === 'overlay' && (
        <>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
          {number !== undefined && (
            <View style={cardStyles.numberBadge}>
              <ThemedText variant="label-sm" emphasis="primary">
                {String(number).padStart(2, '0')}
              </ThemedText>
            </View>
          )}
          <View style={cardStyles.coverTextOverlay}>
            <ThemedText variant="label-lg" numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </>
      )}
      {layout === 'below' && onToggleLike && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          onPress={onToggleLike}
          style={cardStyles.likeButton}
        >
          <Icon name={liked ? 'favorite' : 'favorite-border'} size={16} color={liked ? Colors.primary : Colors.text.high} />
        </PressableScale>
      )}
    </View>
  );

  if (layout === 'below') {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        style={[{ width }, surfaced && cardStyles.surfacedWrapper, style]}
      >
        {cover}
        <View style={surfaced ? cardStyles.belowTextSurfaced : cardStyles.belowText}>
          <ThemedText variant="label-lg" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          )}
          {meta && (
            <ThemedText variant="body-sm" style={cardStyles.metaText} numberOfLines={1}>
              {meta}
            </ThemedText>
          )}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} style={[{ width }, style]} accessibilityRole="button">
      {cover}
    </PressableScale>
  );
}

export type FeaturedBannerProps = {
  coverUri?: string;
  title: string;
  subtitle?: string;
  height?: number;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Hero banner (DESIGN.md "Album & Playlist Cards"; docs/screens.md §3.4). Defaults
 * to 16:9; pass `height` for the fixed-height heroes used on Home/Search/Genre. */
export function FeaturedBanner({ coverUri, title, subtitle, height, onPress, style }: FeaturedBannerProps) {
  return (
    <PressableScale onPress={onPress} style={style} accessibilityRole="button">
      <View style={[cardStyles.banner, height !== undefined && { aspectRatio: undefined, height }]}>
        {coverUri && <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
        <View style={cardStyles.coverTextOverlay}>
          <ThemedText variant="headline-md" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="body-md" emphasis="medium" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

export type AvatarCardProps = {
  photoUri?: string;
  name: string;
  verified?: boolean;
  metaLabel?: string;
  size?: number;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Circular artist avatar card with verified mark + fan/meta count (docs/screens.md §3.4). */
export function AvatarCard({ photoUri, name, verified, metaLabel, size = 88, onPress, style }: AvatarCardProps) {
  return (
    <PressableScale onPress={onPress} style={[{ width: size }, style]} accessibilityRole="button">
      <View style={[cardStyles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
          />
        )}
      </View>
      <View style={cardStyles.avatarNameRow}>
        <ThemedText variant="label-md" numberOfLines={1} style={cardStyles.avatarName}>
          {name}
        </ThemedText>
        {verified && <Icon name="verified" size={14} color={Colors.secondary} />}
      </View>
      {metaLabel && (
        <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
          {metaLabel}
        </ThemedText>
      )}
    </PressableScale>
  );
}

export type StatCardProps = {
  label: string;
  value: string;
  icon?: string;
  style?: ViewStyle;
};

/** Stat tile — big number + label (Saved/Playlists/Supported, Listening Pulse,
 * Artist Dashboard Listeners/Streams/Support — docs/screens.md §3.4). */
export function StatCard({ label, value, icon, style }: StatCardProps) {
  return (
    <View style={[cardStyles.stat, style]}>
      <View style={cardStyles.statLabelRow}>
        {icon && <Icon name={icon} size={14} color={Colors.primary} />}
        <ThemedText variant="label-sm" emphasis="medium">
          {label}
        </ThemedText>
      </View>
      <ThemedText variant="headline-sm" numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

export type QuickTileProps = {
  coverUri?: string;
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  onPlayPress?: () => void;
  style?: ViewStyle;
};

/** Compact 2-column "For you" quick-access tile — 48px cover + title + reveal
 * play button (docs/screens.md §3.4 "Quick tile"; Home S-01). */
export function QuickTile({ coverUri, title, onPress, onPlayPress, style }: QuickTileProps) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={[quickTileStyles.row, style]}>
      <View style={quickTileStyles.cover}>{coverUri && <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
      <ThemedText variant="label-md" numberOfLines={1} style={quickTileStyles.title}>
        {title}
      </ThemedText>
      {onPlayPress && (
        <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${title}`} onPress={onPlayPress} style={quickTileStyles.playButton}>
          <Icon name="play-arrow" size={16} color={Colors.text.high} />
        </PressableScale>
      )}
    </PressableScale>
  );
}

export type MoodCardProps = {
  title: string;
  subtitle: string;
  trackCountLabel: string;
  icon: string;
  tint?: 'primary' | 'secondary' | 'tertiary';
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Mood & Vibe Mixes 2×2 grid card (docs/screens.md §3.1 S-01, §3.4 "Mood card"). */
export function MoodCard({ title, subtitle, trackCountLabel, icon, tint = 'primary', onPress, style }: MoodCardProps) {
  const tintColor = tint === 'primary' ? Colors.primary : tint === 'secondary' ? Colors.secondary : Colors.tertiary;

  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={[moodStyles.card, style]}>
      <View style={moodStyles.topRow}>
        <Icon name={icon} size={22} color={tintColor} />
        <ThemedText variant="mono-num" emphasis="medium">
          {trackCountLabel}
        </ThemedText>
      </View>
      <View>
        <ThemedText variant="label-lg">{title}</ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {subtitle}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

export type RankedTileProps = {
  rank: number;
  title: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Numbered trending-search result tile, 2-column grid (docs/screens.md §3.2 S-03). */
export function RankedTile({ rank, title, subtitle, onPress, style }: RankedTileProps) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={[rankedStyles.card, style]}>
      <ThemedText variant="mono-num" emphasis="primary">
        {String(rank).padStart(2, '0')}
      </ThemedText>
      <View style={rankedStyles.textBlock}>
        <ThemedText variant="label-md" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>
    </PressableScale>
  );
}

const cardStyles = StyleSheet.create({
  coverBase: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l3,
  },
  justifyEnd: {
    justifyContent: 'flex-end',
  },
  banner: {
    aspectRatio: 16 / 9,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l3,
    justifyContent: 'flex-end',
  },
  coverTextOverlay: {
    padding: Spacing.sm,
  },
  numberBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
  },
  likeButton: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(14, 14, 16, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfacedWrapper: {
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  belowText: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  belowTextSurfaced: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  metaText: {
    color: Colors.secondary,
    marginTop: 2,
  },
  avatar: {
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  avatarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  avatarName: {
    textAlign: 'center',
  },
  stat: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    gap: Spacing.xs,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const quickTileStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.DEFAULT,
    overflow: 'hidden',
    height: 48,
  },
  cover: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.l3,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    marginLeft: Spacing.xs,
    marginRight: Spacing.xs,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
});

const moodStyles = StyleSheet.create({
  card: {
    flex: 1,
    height: 96,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l2,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

const rankedStyles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
});
