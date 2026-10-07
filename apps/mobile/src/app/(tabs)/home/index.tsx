import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, IconButton, MoodCard, QuickTile, SectionHeader, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import {
  forYouTiles,
  getAlbumById,
  getPlaylistById,
  getTrackById,
  heroPlaylistId,
  jumpBackInTrackIds,
  moodMixes,
  newReleases,
  trendingNowAlbumIds,
} from '@/mocks';

/** S-01 Home — tab root (docs/screens.md §3.1). */
export default function HomeScreen() {
  const hero = getPlaylistById(heroPlaylistId);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="For you">
          <View style={styles.forYouGrid}>
            {forYouTiles.map((tile) => (
              <QuickTile
                key={tile.id}
                title={tile.title}
                onPress={() => {}}
                onPlayPress={() => {}}
                style={styles.forYouItem}
              />
            ))}
          </View>
        </Section>

        {hero && (
          <View style={styles.section}>
            <FeaturedBanner
              title={hero.title}
              subtitle={hero.curator}
              height={224}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: hero.id } })}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Trending Now" actionLabel="See All" onActionPress={() => router.push('/home/see-all')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {trendingNowAlbumIds.map((albumId) => {
              const album = getAlbumById(albumId);
              if (!album) return null;
              return (
                <CoverCard
                  key={album.id}
                  layout="below"
                  width={160}
                  title={album.title}
                  subtitle={album.artistName}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                  onToggleLike={() => {}}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="New Releases" actionLabel="Explore" onActionPress={() => router.push('/home/see-all')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {newReleases.map(({ albumId, label }) => {
              const album = getAlbumById(albumId);
              if (!album) return null;
              return (
                <CoverCard
                  key={album.id}
                  layout="below"
                  surfaced
                  width={192}
                  height={176}
                  title={album.title}
                  subtitle={album.artistName}
                  meta={label}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Jump Back In" actionLabel="History" onActionPress={() => {}} />
          <View style={styles.trackList}>
            {jumpBackInTrackIds.map((trackId, index) => {
              const track = getTrackById(trackId);
              if (!track) return null;
              return (
                <TrackRow
                  key={track.id}
                  title={track.title}
                  artist={track.artistName}
                  lossless={index === 0 ? track.lossless : undefined}
                  explicit={track.explicit}
                  isPlaying={index === 0}
                  onPress={() => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } })}
                  onOptionsPress={() => {}}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sectionLast}>
          <View style={styles.moodHeader}>
            <ThemedText variant="headline-md">Mood & Vibe Mixes</ThemedText>
            <ThemedText variant="label-sm" emphasis="medium" style={styles.tunedLabel}>
              TUNED TO YOU
            </ThemedText>
          </View>
          <View style={styles.moodGrid}>
            {moodMixes.map((mix) => (
              <MoodCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                trackCountLabel={`${mix.trackCount} Tracks`}
                icon={mix.icon}
                tint={mix.tint}
                onPress={() => {}}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Header() {
  return (
    <ThemedView surface="canvas" style={headerStyles.header}>
      <SafeAreaView edges={['top']}>
        <View style={headerStyles.row}>
          <View style={headerStyles.brand}>
            <View style={headerStyles.logo} />
            <ThemedText variant="headline-md">Mmusic</ThemedText>
          </View>
          <IconButton
            icon="person"
            accessibilityLabel="Profile"
            onPress={() => router.push('/profile')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <ThemedText variant="headline-md">{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: Spacing.xl * 3,
  },
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.margin,
  },
  sectionLast: {
    paddingHorizontal: Spacing.margin,
  },
  sectionTitleRow: {
    marginBottom: Spacing.sm,
  },
  forYouGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  forYouItem: {
    width: '48.5%',
  },
  carousel: {
    gap: Spacing.md,
    paddingRight: Spacing.margin,
  },
  trackList: {
    gap: 2,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tunedLabel: {
    letterSpacing: 1,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});

const headerStyles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    height: 56,
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
});
