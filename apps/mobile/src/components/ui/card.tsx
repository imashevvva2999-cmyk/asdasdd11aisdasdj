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
  /** 1:1 for releases/moods/genres/compilations; 16:9 reserved for FeaturedBanner. */
  width?: number;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/**
 * Square (1:1) cover card — covers the Release / Trending / Mood / Genre / Realm /
 * Compilation / Quick-tile card family from docs/screens.md §3.4, which all share
 * the same structure (cover + bottom gradient + title/subtitle) and differ only in
 * caller-supplied content, not layout.
 */
export function CoverCard({ coverUri, title, subtitle, width = 140, onPress, style }: CoverCardProps) {
  return (
    <PressableScale onPress={onPress} style={[{ width }, style]} accessibilityRole="button">
      <View style={[cardStyles.coverSquare, { width, height: width }]}>
        {coverUri && <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
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
      </View>
    </PressableScale>
  );
}

export type FeaturedBannerProps = {
  coverUri?: string;
  title: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** 16:9 hero banner (DESIGN.md "Album & Playlist Cards"; docs/screens.md §3.4). */
export function FeaturedBanner({ coverUri, title, subtitle, onPress, style }: FeaturedBannerProps) {
  return (
    <PressableScale onPress={onPress} style={style} accessibilityRole="button">
      <View style={cardStyles.banner}>
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

const cardStyles = StyleSheet.create({
  coverSquare: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.l3,
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
