import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Spacing } from '@/constants/theme';

export type ScreenPlaceholderProps = {
  /** Screen ID from docs/screens.md, e.g. "S-08". */
  screenId: string;
  title: string;
  /** One-line pointer to the relevant doc section/flow. */
  note?: string;
  /** Tappable links to other routes — how Фаза 3 navigation is actually exercised/verified. */
  links?: { label: string; href: Href }[];
};

/**
 * DEV-ONLY placeholder for routes that exist for navigation purposes (Фаза 3)
 * but whose real content lands in a later phase. Never used for a finished
 * screen — every real screen replaces this with actual content, not extends it.
 */
export function ScreenPlaceholder({ screenId, title, note, links }: ScreenPlaceholderProps) {
  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="label-sm" emphasis="primary" style={styles.badge}>
          PLACEHOLDER · {screenId}
        </ThemedText>
        <ThemedText variant="headline-lg">{title}</ThemedText>
        {note && (
          <ThemedText variant="body-md" emphasis="medium">
            {note}
          </ThemedText>
        )}
        {links && links.length > 0 && (
          <View style={styles.links}>
            {links.map((link) => (
              <Link key={link.label} href={link.href} asChild>
                <Pressable style={styles.linkRow}>
                  <ThemedText variant="label-lg" emphasis="primary">
                    → {link.label}
                  </ThemedText>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.margin,
    gap: Spacing.sm,
  },
  badge: {
    letterSpacing: 1,
  },
  links: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  linkRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l1,
  },
});
