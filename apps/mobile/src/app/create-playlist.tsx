import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, IconButton, PillButton, TextField, ToggleRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { usePlaylistsStore } from '@/state/playlists-store';

const NAME_MAX_LENGTH = 50;

/**
 * S-14 Create Playlist — shared route (Library "+", or "New Playlist" inside
 * the Add to Playlist sheet — docs/screens.md §2, OQ-19). "Add Cover" /
 * "AI Generate" / "Color Wave" have no real photo picker or generation wired
 * (no new native dependency was approved for this batch) — they are
 * decorative, same as other undesigned actions elsewhere in the app.
 */
export default function CreatePlaylistScreen() {
  const { initialTrackId } = useLocalSearchParams<{ initialTrackId?: string }>();
  const createPlaylist = usePlaylistsStore((s) => s.createPlaylist);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCollaborative, setIsCollaborative] = useState(false);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0;

  function handleCreate() {
    if (!canCreate) return;
    createPlaylist({
      title: trimmedName,
      description: description.trim() || undefined,
      isPublic,
      isCollaborative,
      initialTrackId,
    });
    router.back();
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.header}>
        <ThemedText variant="label-lg" emphasis="primary" onPress={() => router.back()}>
          Cancel
        </ThemedText>
        <ThemedText variant="headline-sm">Create Playlist</ThemedText>
        <ThemedText
          variant="label-lg"
          emphasis={canCreate ? 'primary' : 'medium'}
          onPress={canCreate ? handleCreate : undefined}
        >
          Create
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverBlock}>
          <View style={styles.coverPlaceholder}>
            <Icon name="add-photo-alternate" size={28} color={Colors.text.medium} />
            <ThemedText variant="body-sm" emphasis="medium" style={styles.coverHint}>
              Add Cover
            </ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">
              Custom art or photo
            </ThemedText>
          </View>
          <View style={styles.coverActions}>
            <IconButton icon="auto-awesome" accessibilityLabel="AI Generate cover" onPress={() => {}} />
            <IconButton icon="gradient" accessibilityLabel="Color Wave cover" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            placeholder="Name"
            value={name}
            onChangeText={(text) => setName(text.slice(0, NAME_MAX_LENGTH))}
            maxLength={NAME_MAX_LENGTH}
            rightAccessory={
              <ThemedText variant="mono-num" emphasis="medium">
                {name.length}/{NAME_MAX_LENGTH}
              </ThemedText>
            }
          />
        </View>

        <View style={styles.field}>
          <TextField
            placeholder="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <ToggleRow title="Public Playlist" value={isPublic} onValueChange={setIsPublic} />
        <ToggleRow title="Collaborative" value={isCollaborative} onValueChange={setIsCollaborative} />

        <PillButton label="Create Playlist" disabled={!canCreate} onPress={handleCreate} style={styles.cta} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  coverBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coverPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  coverHint: {
    marginTop: Spacing.xs,
  },
  coverActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
