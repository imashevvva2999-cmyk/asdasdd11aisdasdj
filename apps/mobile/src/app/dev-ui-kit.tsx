import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  AmountChip,
  AppBottomSheet,
  AvatarCard,
  Badge,
  Chip,
  CircleButton,
  CoverCard,
  EmptyState,
  EqualizerIndicator,
  FeaturedBanner,
  IconButton,
  LibraryRow,
  MenuRow,
  PillButton,
  PlaylistPickerRow,
  QueueRow,
  SectionHeader,
  Skeleton,
  StatCard,
  TextField,
  TextLinkButton,
  Toast,
  Toggle,
  TrackRow,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';

/**
 * DEV-ONLY component gallery (Фаза 2 — docs/development-plan.md "Витрина
 * компонентов"). Not linked from any real navigation; exists purely so the
 * Core UI kit can be visually/structurally verified via `expo export`. Remove
 * or gate behind __DEV__ before Фаза 11 release prep.
 */
export default function DevUiKitScreen() {
  const [chipSelected, setChipSelected] = useState(true);
  const [toggleOn, setToggleOn] = useState(true);
  const [liked, setLiked] = useState(false);
  const [amount, setAmount] = useState('100');
  const [toastVisible, setToastVisible] = useState(true);
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="display-lg-mobile" emphasis="primary">
            UI Kit
          </ThemedText>

          <Section title="Buttons">
            <Row>
              <PillButton label="Play All" onPress={() => {}} />
              <PillButton label="Follow" variant="secondary" onPress={() => {}} />
            </Row>
            <Row>
              <PillButton label="Loading" loading onPress={() => {}} />
              <PillButton label="Disabled" disabled onPress={() => {}} />
            </Row>
            <Row>
              <CircleButton icon="play-arrow" accessibilityLabel="Play" onPress={() => {}} />
              <IconButton icon="favorite-border" accessibilityLabel="Like" onPress={() => {}} />
              <TextLinkButton label="See All" onPress={() => {}} />
            </Row>
          </Section>

          <Section title="Chips & toggle">
            <Row>
              <Chip label="All" selected={chipSelected} onPress={() => setChipSelected((v) => !v)} />
              <Chip label="Albums" />
              <Chip label="Editorial" selected selectedStyle="editorial" />
            </Row>
            <Row>
              <AmountChip amount="50" unit="сом" onPress={() => setAmount('50')} selected={amount === '50'} />
              <AmountChip amount="100" unit="сом" onPress={() => setAmount('100')} selected={amount === '100'} />
            </Row>
            <Row>
              <Toggle value={toggleOn} onValueChange={setToggleOn} accessibilityLabel="Public playlist" />
            </Row>
          </Section>

          <Section title="Input">
            <TextField placeholder="What do you want to listen to?" />
          </Section>

          <Section title="Badges & equalizer">
            <Row>
              <Badge label="E" variant="explicit" />
              <Badge label="Editorial" variant="editorial" />
              <EqualizerIndicator />
            </Row>
          </Section>

          <Section title="Cards">
            <SectionHeader title="Trending Now" onActionPress={() => {}} />
            <Row>
              <CoverCard title="Horizon" subtitle="Solaris Echo" />
              <AvatarCard name="Solaris Echo" verified metaLabel="482K fans" />
            </Row>
            <FeaturedBanner title="Late Night Flow" subtitle="Editorial Playlist" />
            <Row>
              <StatCard label="Listeners" value="14.8K" icon="groups" />
              <StatCard label="Streams" value="128.4K" icon="play-circle-outline" />
              <StatCard label="Support" value="4,250 сом" icon="volunteer-activism" />
            </Row>
          </Section>

          <Section title="List rows">
            <TrackRow
              index={1}
              title="Midnight Mirage"
              artist="Solaris Echo"
              durationLabel="4:18"
              liked={liked}
              onToggleLike={() => setLiked((v) => !v)}
              onOptionsPress={() => {}}
            />
            <TrackRow index={2} title="Resonant Field" artist="Solaris Echo" durationLabel="3:24" isPlaying explicit />
            <QueueRow title="Obsidian Frequencies" artist="Solaris Echo" durationLabel="2:58" />
            <LibraryRow title="Late Night Flow" subtitle="Playlist • 28 tracks" />
            <PlaylistPickerRow title="Chill Vibes" trackCountLabel="12 tracks" selected />
            <MenuRow icon="mic" title="Become an Artist" subtitle="Publish and monetize your tracks" />
          </Section>

          <Section title="Loading / empty / error">
            <Row>
              <Skeleton width={120} height={16} />
              <Skeleton width={64} height={64} radius={32} />
            </Row>
            <EmptyState icon="search-off" title="No results" hint="Try a different search" actionLabel="Explore All Genres" onActionPress={() => {}} />
            <EmptyState icon="wifi-off" title="Connection error" hint="Check your network and try again" tone="error" actionLabel="Retry" onActionPress={() => {}} />
          </Section>

          <Section title="Sheet">
            <PillButton label="Open Bottom Sheet" onPress={() => sheetRef.current?.present()} />
          </Section>
        </ScrollView>

        <Toast message="Initializing Artist Studio setup…" visible={toastVisible} />
        <PillButton
          label={toastVisible ? 'Hide toast' : 'Show toast'}
          variant="secondary"
          onPress={() => setToastVisible((v) => !v)}
          style={styles.toastToggle}
        />
      </SafeAreaView>

      <AppBottomSheet ref={sheetRef} snapPoints={['40%']}>
        <View style={styles.sheetContent}>
          <ThemedText variant="headline-sm">Add to Playlist</ThemedText>
          <ThemedText variant="body-md" emphasis="medium">
            Choose one or more destinations
          </ThemedText>
        </View>
      </AppBottomSheet>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.xl,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  sectionBody: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  toastToggle: {
    position: 'absolute',
    top: Spacing.margin,
    right: Spacing.margin,
  },
  sheetContent: {
    padding: Spacing.margin,
    gap: Spacing.xs,
  },
});
