import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { Colors, Radii } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';

import { Icon } from './icon';

export type ArtworkProps = {
  uri?: LocalOrRemoteImage;
  size?: number;
  /** Non-square artwork (e.g. a wide hero) — overrides `size` for height. */
  aspectRatio?: number;
  radius?: number;
  shape?: 'square' | 'circle';
  style?: ViewStyle;
};

/**
 * Single reusable artwork/cover renderer (Фаза 4 Batch 2) — the one place that
 * decides what shows when there's no real cover image. Reused by Now Playing's
 * large artwork, Album/Playlist headers, and Artist hero photos so swapping in
 * real asset URIs later is a one-file change, not a screen-by-screen one.
 *
 * No Stitch cover is hot-linked (see docs/screens.md §0 — those are disposable
 * Google preview URLs, not production assets): with no `uri`, this renders a
 * plain surface-colored box with a music-note glyph — a clearly-identified
 * placeholder, not invented artwork.
 */
export function Artwork({ uri, size = 160, aspectRatio, radius = Radii.lg, shape = 'square', style }: ArtworkProps) {
  const height = aspectRatio ? size / aspectRatio : size;
  const hydrated = useHydrated();

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height,
          borderRadius: shape === 'circle' ? height / 2 : radius,
        },
        style,
      ]}
    >
      {uri && hydrated ? (
        <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.placeholderIcon}>
          <Icon name="music-note" size={Math.max(20, Math.min(size, height) * 0.35)} color={Colors.text.low} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
