import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, IconButton, PillButton, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useArtistStore } from '@/state/artist-store';

const BIO_MAX_LENGTH = 300;

/** Real musical genre labels (matching the ones already used across
 * mocks/artists.ts), not the Browse-All mood/category tiles from
 * mocks/genres.ts — those describe discovery shelves, not an artist's own
 * primary genre. */
const GENRE_OPTIONS = [
  'Electronic',
  'Ambient',
  'Synthwave',
  'Indie',
  'Dream Pop',
  'Neo-Classical',
  'Hip-Hop',
  'Pop',
  'Rock',
  'Jazz',
  'Lo-Fi',
];

/**
 * S-26 Artist Setup — UF-14 step 2 (docs/screens.md). Frontend/local state
 * only. The only documented validation is a non-empty stage name — genre,
 * bio, and location are optional (docs/screens.md notes no other validation
 * is designed). No payout account binding (OQ-48) or verification/moderation
 * step (OQ-49) is implemented.
 */
export default function ArtistSetupScreen() {
  const createArtistProfile = useArtistStore((s) => s.createArtistProfile);

  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  const trimmedName = stageName.trim();
  const canCreate = trimmedName.length > 0;

  function handleCreate() {
    if (!canCreate) return;
    createArtistProfile({
      stageName: trimmedName,
      genre,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
    });
    router.replace('/profile/artist/dashboard');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatarWrap}>
            <Artwork shape="circle" size={112} radius={56} />
            <IconButton icon="photo-camera" accessibilityLabel="Add artist photo" size={32} style={styles.cameraButton} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.field}>
          <TextField placeholder="Artist / Stage Name" value={stageName} onChangeText={setStageName} />
        </View>

        <View style={styles.field}>
          <ThemedText variant="label-md" emphasis="medium">
            Primary Genre
          </ThemedText>
          <View style={styles.chipGrid}>
            {GENRE_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={genre === option}
                onPress={() => setGenre((current) => (current === option ? undefined : option))}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            placeholder="Short Bio"
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_MAX_LENGTH))}
            maxLength={BIO_MAX_LENGTH}
            multiline
            numberOfLines={4}
          />
          <ThemedText variant="mono-num" emphasis="medium" style={styles.counter}>
            {bio.length}/{BIO_MAX_LENGTH}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <TextField placeholder="Location / Base City" value={location} onChangeText={setLocation} />
        </View>

        <PillButton label="Create Artist Profile" trailingIcon="arrow-forward" disabled={!canCreate} onPress={handleCreate} style={styles.cta} />

        <ThemedText variant="body-sm" emphasis="medium" style={styles.disclaimer}>
          By continuing you agree to Mmusic&apos;s Artist Terms. This is a local preview — no account or payout information is created or verified.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  avatarBlock: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
  },
  field: {
    gap: Spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  cta: {
    marginTop: Spacing.sm,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
