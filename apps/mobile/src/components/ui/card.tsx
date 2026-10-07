import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { getFallbackGradient } from '@/constants/fallback-artwork';
import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from '../themed-text';

/** Shared "no real cover" fallback — a deterministic tinted-glass gradient tile
 * plus a faint music-note glyph, instead of a flat grey box (Фаза 4 visual QA
 * pass). `seed` is usually the card's title so the same entity always renders
 * the same tile. */
function CoverFallback({ seed, iconSize = 28 }: { seed: string; iconSize?: number }) {
  return (
    <>
      <LinearGradient colors={getFallbackGradient(seed) as [string, string]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={cardStyles.fallbackIconWrap} pointerEvents="none">
        <Icon name="music-note" size={iconSize} color="rgba(255,255,255,0.28)" />
      </View>
    </>
  );
}

export type CoverCardProps = {
  coverUri?: LocalOrRemoteImage;
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
  const hydrated = useHydrated();

  const cover = (
    <View style={[cardStyles.coverBase, { width, height: coverHeight }, layout === 'overlay' && cardStyles.justifyEnd]}>
      {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} />}
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
        accessibilityRole={onToggleLike ? undefined : 'button'}
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
  coverUri?: LocalOrRemoteImage;
  title: string;
  subtitle?: string;
  height?: number;
  /** 'overlay' (default) = title/subtitle on a bottom gradient over the image,
   * the whole card is one tap target (Search's Kyrgyz Music banner). 'footer' =
   * fixed-height image on top, title/subtitle + a circular play button in a
   * solid footer below it — the Home hero ("Late Night Flow") treatment, which
   * Stitch renders as two stacked parts rather than text-on-image. */
  layout?: 'overlay' | 'footer';
  /** 'footer' layout only — shows a circular play button, kept outside the
   * outer card's own button role so the two don't nest as DOM buttons. */
  onPlayPress?: () => void;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Hero banner (DESIGN.md "Album & Playlist Cards"; docs/screens.md §3.4). Defaults
 * to 16:9; pass `height` for the fixed-height heroes used on Home/Search/Genre. */
export function FeaturedBanner({ coverUri, title, subtitle, height, layout = 'overlay', onPlayPress, onPress, style }: FeaturedBannerProps) {
  const hydrated = useHydrated();

  if (layout === 'footer') {
    return (
      <PressableScale onPress={onPress} style={[cardStyles.footerBannerWrap, style]} accessibilityRole={onPlayPress ? undefined : 'button'}>
        <View style={[cardStyles.footerBannerImage, { height: height ?? 224 }]}>
          {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} iconSize={40} />}
        </View>
        <View style={cardStyles.footerBannerFooter}>
          <View style={cardStyles.footerBannerText}>
            <ThemedText variant="headline-lg" numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText variant="body-md" emphasis="medium" numberOfLines={1}>
                {subtitle}
              </ThemedText>
            )}
          </View>
          {onPlayPress && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Play ${title}`}
              onPress={onPlayPress}
              style={cardStyles.footerBannerPlayButton}
            >
              <Icon name="play-arrow" size={28} color={Colors.text.high} />
            </PressableScale>
          )}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} style={style} accessibilityRole="button">
      <View style={[cardStyles.banner, height !== undefined && { aspectRatio: undefined, height }]}>
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} iconSize={36} />}
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
  photoUri?: LocalOrRemoteImage;
  name: string;
  verified?: boolean;
  metaLabel?: string;
  size?: number;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Circular artist avatar card with verified mark + fan/meta count (docs/screens.md §3.4). */
export function AvatarCard({ photoUri, name, verified, metaLabel, size = 88, onPress, style }: AvatarCardProps) {
  const hydrated = useHydrated();

  return (
    <PressableScale onPress={onPress} style={[{ width: size }, style]} accessibilityRole="button">
      <View style={[cardStyles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {photoUri && hydrated && (
          <Image
            source={toImageSource(photoUri)}
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
  coverUri?: LocalOrRemoteImage;
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  onPlayPress?: () => void;
  style?: ViewStyle;
};

/** Compact 2-column "For you" quick-access tile — 48px cover + title + reveal
 * play button (docs/screens.md §3.4 "Quick tile"; Home S-01). */
export function QuickTile({ coverUri, title, onPress, onPlayPress, style }: QuickTileProps) {
  const hydrated = useHydrated();

  return (
    <PressableScale onPress={onPress} accessibilityRole={onPlayPress ? undefined : 'button'} style={[quickTileStyles.row, style]}>
      <View style={quickTileStyles.cover}>
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} iconSize={18} />}
      </View>
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
      <View style={[moodStyles.glow, { backgroundColor: tintColor }]} pointerEvents="none" />
      <View style={moodStyles.topRow}>
        <Icon name={icon} size={24} color={tintColor} />
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
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l3,
  },
  justifyEnd: {
    justifyContent: 'flex-end',
  },
  fallbackIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    aspectRatio: 16 / 9,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l3,
    justifyContent: 'flex-end',
  },
  footerBannerWrap: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l1,
  },
  footerBannerImage: {
    width: '100%',
    backgroundColor: Colors.surface.l3,
  },
  footerBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  footerBannerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  footerBannerPlayButton: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    borderRadius: Radii.md,
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
    overflow: 'hidden',
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
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l2,
    padding: Spacing.sm,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    opacity: 0.18,
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
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
});
