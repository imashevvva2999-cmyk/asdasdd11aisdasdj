import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { LivingMoodScene } from '@/components/living-moods/living-mood-scene';
import { LiquidChromeScene } from '@/components/living-moods/scenes/liquid-chrome-scene';

type CardId = 'liquid-chrome' | 'meta-balls' | 'orb' | 'galaxy';

const CARDS: { id: CardId; title: string; description: string; colors: [string, string] }[] = [
  { id: 'liquid-chrome', title: 'Liquid Chrome', description: 'Fluid metallic reflections', colors: ['#1a1a1f', '#3a3a42'] },
  { id: 'meta-balls', title: 'Meta Balls', description: 'Merging organic spheres', colors: ['#1a1014', '#3a1f28'] },
  { id: 'orb', title: 'Orb', description: 'A cinematic energy core', colors: ['#120a16', '#2a1638'] },
  { id: 'galaxy', title: 'Galaxy', description: 'A deep particle environment', colors: ['#0a0e16', '#162038'] },
];

/**
 * Dev-only prototype — Mood & Vibes: Living Moods (W3 exploration). NOT
 * linked from any production screen; excluded from the web export the same
 * way `dev-ui-kit.tsx` is (see `scripts/web-postexport.mjs`). The Liquid
 * Chrome card is provisionally wired to its real WebGL scene (Task 2) for
 * review; the other three stay inert gradient placeholders until Task 6
 * wires the full grid (including this card's final, non-always-active
 * mounting).
 */
export default function DevLivingMoodsScreen() {
  const [expanded, setExpanded] = useState<CardId | null>(null);
  const expandedCard = CARDS.find((c) => c.id === expanded);

  if (expandedCard) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {expandedCard.id === 'liquid-chrome' ? (
            <LivingMoodScene engine={LiquidChromeScene} active fallbackColors={expandedCard.colors} style={styles.expandedScene} />
          ) : (
            <View style={[styles.expandedScene, { backgroundColor: expandedCard.colors[0] }]} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to overview"
            onPress={() => setExpanded(null)}
            style={styles.backButton}
          >
            <ThemedText variant="label-lg">← Back</ThemedText>
          </Pressable>
          <View style={styles.expandedCaption}>
            <ThemedText variant="headline-md">{expandedCard.title}</ThemedText>
            <ThemedText variant="body-md" emphasis="medium">
              {expandedCard.description}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="display-lg-mobile" style={styles.title}>
            Living Moods
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.subtitle}>
            Four experimental mood animations — prototype only.
          </ThemedText>
          <View style={styles.grid}>
            {CARDS.map((card) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${card.title}`}
                onPress={() => setExpanded(card.id)}
                style={styles.card}
              >
                {card.id === 'liquid-chrome' ? (
                  <LivingMoodScene engine={LiquidChromeScene} active fallbackColors={card.colors} style={styles.cardScene} />
                ) : (
                  <View style={[styles.cardScene, { backgroundColor: card.colors[0] }]} />
                )}
                <View style={styles.cardCaption}>
                  <ThemedText variant="label-lg">{card.title}</ThemedText>
                  <ThemedText variant="body-sm" emphasis="medium">
                    {card.description}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg },
  title: { marginTop: Spacing.md },
  subtitle: { marginTop: -Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { width: '47%', aspectRatio: 1, borderRadius: Radii.lg, overflow: 'hidden', backgroundColor: Colors.surface.l1 },
  cardScene: { flex: 1 },
  cardCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.sm },
  expandedScene: { flex: 1 },
  backButton: { position: 'absolute', top: Spacing.margin, left: Spacing.margin, padding: Spacing.sm },
  expandedCaption: { position: 'absolute', left: Spacing.margin, bottom: Spacing.margin },
});
