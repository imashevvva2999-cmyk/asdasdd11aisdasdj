import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, FormCard, Icon, PillButton, PressableScale, SegmentedControl, TextField, TextLinkButton, Toast, ToggleRow } from '@/components/ui';
import { sampleImageChoices } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { trackPublishedMessage } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { pickCoverImage } from '@/lib/pick-cover-image';
import { useToast } from '@/hooks/use-toast';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { useArtistStore } from '@/state/artist-store';
import { useAppStrings } from '@/state/locale-store';

const GENRE_OPTIONS = ['Electronic', 'Ambient', 'Synthwave', 'Indie', 'Dream Pop', 'Neo-Classical', 'Hip-Hop', 'Pop', 'Rock', 'Jazz', 'Lo-Fi'];

/** A fixed mock duration standing in for real file metadata — no audio is
 * decoded in this preview (see the "simulated file selection" note below). */
const MOCK_FILE_DURATION_SEC = 204;


/** Static decorative waveform for the selected file (Stitch S-28) — no audio
 * is decoded, so this is an illustration, not a real waveform. */
const WAVEFORM_BARS = [8, 14, 10, 20, 12, 26, 16, 22, 10, 28, 18, 24, 12, 20, 26, 14, 18, 10, 22, 12, 16, 8];

/**
 * S-28 Upload Track — UF-14 step 4 (docs/screens.md, incomplete design —
 * publishing states beyond the input form are undesigned, OQ-50). Frontend
 * state only: no real upload, transcoding, moderation, or catalog ingestion.
 *
 * Audio file: SIMULATED selection (no real upload/decoding).
 * Cover artwork: the browser's native image picker on web (JPG/PNG/WebP,
 * preview + replace, kept on the device — src/lib/pick-cover-image.ts). Native
 * builds have no image-picker dependency yet and keep the sample-cover cycle.
 */
export default function UploadTrackScreen() {
  const saveDraft = useArtistStore((s) => s.saveDraft);
  const publishTrack = useArtistStore((s) => s.publishTrack);
  const simulateError = useArtistStore((s) => s.simulateError);
  const retryPublish = useArtistStore((s) => s.retryPublish);
  const entries = useArtistStore((s) => s.entries);
  const { t, locale } = useAppStrings();
  const RELEASE_OPTIONS = [
    { value: 'now' as const, label: t('releaseNowOptionLabel') },
    { value: 'schedule' as const, label: t('scheduleOptionLabel') },
  ];

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<LocalOrRemoteImage | undefined>(undefined);
  const [sampleIndex, setSampleIndex] = useState(-1);
  const { showToast, toast } = useToast();
  const [title, setTitle] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [explicit, setExplicit] = useState(false);
  const [releaseMode, setReleaseMode] = useState<'now' | 'schedule'>('now');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [draftSavedToastVisible, setDraftSavedToastVisible] = useState(false);

  const activeEntry = useMemo(() => entries.find((e) => e.track.id === activeTrackId), [entries, activeTrackId]);

  const canPublish = title.trim().length > 0 && selectedFileName !== null;
  const isBusy = activeEntry?.status === 'uploading' || activeEntry?.status === 'processing';

  async function handleChooseCover() {
    const result = await pickCoverImage();
    if (result.kind === 'picked') setCoverUri(result.uri);
    else if (result.kind === 'invalid-type') showToast(t('coverInvalidType'), 'error-outline');
    else if (result.kind === 'too-large') showToast(t('coverTooLarge'), 'error-outline');
    else if (result.kind === 'unreadable') showToast(t('coverUnreadable'), 'error-outline');
    else if (result.kind === 'unsupported' && sampleImageChoices.length > 0) {
      // Native build without an image picker: previous sample-cover fallback.
      const next = (sampleIndex + 1) % sampleImageChoices.length;
      setSampleIndex(next);
      setCoverUri(sampleImageChoices[next]);
    }
    // 'cancelled': keep the current cover untouched.
  }

  function handleBrowseFile() {
    setSelectedFileName('midnight-session-master.wav');
  }

  function buildDraft() {
    return saveDraft({
      title: title.trim(),
      genre,
      explicit,
      durationSec: MOCK_FILE_DURATION_SEC,
      coverUri,
    });
  }

  async function handlePublish() {
    if (!canPublish) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    await publishTrack(entry.track.id);
  }

  function handleSaveAsDraft() {
    if (title.trim().length === 0) return;
    buildDraft();
    setDraftSavedToastVisible(true);
    setTimeout(() => {
      setDraftSavedToastVisible(false);
      goBack('/profile/artist/dashboard');
    }, 900);
  }

  function handleSimulateError() {
    if (!canPublish) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    simulateError(entry.track.id);
  }

  if (activeEntry?.status === 'published') {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <View style={styles.resultContainer}>
          <View style={styles.resultIconHalo}>
            <Icon name="check-circle" size={40} color={Colors.secondary} />
          </View>
          <ThemedText variant="headline-md" style={styles.centerText}>
            {t('trackPublishedTitle')}
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.centerText}>
            {trackPublishedMessage(locale, activeEntry.track.title)}
          </ThemedText>
          <PillButton
            label={t('viewPublicProfileLabel')}
            onPress={() => {
              // Leave Upload Track first so Back from the public profile lands on the Dashboard.
              router.dismissTo('/profile/artist/dashboard');
              router.push({ pathname: '/artist/[id]', params: { id: activeEntry.track.artistId } });
            }}
            style={styles.resultButton}
          />
          <PillButton label={t('backToDashboardLabel')} variant="secondary" onPress={() => goBack('/profile/artist/dashboard')} style={styles.resultButtonSecondary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headline-md">{t('uploadAudioLabel')}</ThemedText>
            <ThemedText variant="label-sm" emphasis="primary">
              {t('highQualityAudioFileHint')}
            </ThemedText>
          </View>
          {selectedFileName ? (
            <FormCard>
              <View style={styles.fileRow}>
                <View style={styles.fileIconTile}>
                  <Icon name="music-note" size={24} color={Colors.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <ThemedText variant="label-lg" numberOfLines={1}>
                    {selectedFileName}
                  </ThemedText>
                  <ThemedText variant="mono-num" emphasis="medium">
                    {formatDuration(MOCK_FILE_DURATION_SEC)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.waveform} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {WAVEFORM_BARS.map((height, index) => (
                  <View key={index} style={[styles.waveBar, { height }]} />
                ))}
              </View>
              <PressableScale accessibilityRole="button" onPress={handleBrowseFile} disabled={isBusy} style={styles.inlineAction}>
                <Icon name="upload-file" size={18} color={Colors.primary} />
                <ThemedText variant="label-lg" emphasis="primary">
                  {t('browseFileLabel')}
                </ThemedText>
              </PressableScale>
            </FormCard>
          ) : (
            <PillButton label={t('browseFileLabel')} variant="secondary" leadingIcon="folder-open" onPress={handleBrowseFile} />
          )}
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('trackDetailsLabel')}</ThemedText>
          <TextField raised label={t('trackTitleFieldLabel')} placeholder={t('titleLabel')} value={title} onChangeText={setTitle} editable={!isBusy} />
          <TextField
            raised
            label={t('artistCollaboratorsLabel')}
            placeholder={t('optionalPlaceholder')}
            value={collaborators}
            onChangeText={setCollaborators}
            editable={!isBusy}
          />
          <View style={styles.field}>
            <ThemedText variant="label-md" emphasis="primary">
              {t('genreFieldLabel')}
            </ThemedText>
            <View style={styles.chipGrid}>
              {GENRE_OPTIONS.map((option) => (
                <Chip key={option} label={option} selected={genre === option} disabled={isBusy} onPress={() => setGenre((g) => (g === option ? undefined : option))} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('coverArtworkLabel')}</ThemedText>
          <FormCard style={styles.coverCard}>
            <Artwork size={112} radius={Radii.md} uri={coverUri} placeholderIcon="add-photo-alternate" />
            <View style={styles.coverText}>
              <ThemedText variant="body-md" emphasis="medium">
                {t('addHighQualityArtworkHint')}
              </ThemedText>
              <PressableScale
                accessibilityRole="button"
                onPress={() => void handleChooseCover()}
                disabled={isBusy}
                style={styles.compactButton}
              >
                <Icon name="image" size={18} color={Colors.text.high} />
                <ThemedText variant="label-lg">{coverUri ? t('changeCoverLabel') : t('chooseCoverLabel')}</ThemedText>
              </PressableScale>
            </View>
          </FormCard>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('releaseSettingsLabel')}</ThemedText>
          <View style={styles.field}>
            <ThemedText variant="label-md" emphasis="primary">
              {t('scheduleReleaseLabel')}
            </ThemedText>
            <SegmentedControl
              accessibilityLabel={t('scheduleReleaseLabel')}
              options={RELEASE_OPTIONS}
              value={releaseMode}
              onChange={(mode) => {
                if (!isBusy) setReleaseMode(mode);
              }}
            />
          </View>
          {releaseMode === 'schedule' && (
            <ThemedText variant="body-sm" emphasis="medium">
              {t('scheduleHintText')}
            </ThemedText>
          )}
          <ToggleRow title={t('explicitContentLabel')} value={explicit} onValueChange={setExplicit} disabled={isBusy} style={styles.explicitRow} />
        </View>

        {activeEntry && (activeEntry.status === 'uploading' || activeEntry.status === 'processing') && (
          <FormCard>
            <View style={styles.statusRow}>
              <Icon name="sync" size={20} color={Colors.secondary} />
              <ThemedText variant="label-lg" style={styles.statusText}>
                {activeEntry.status === 'uploading' ? t('uploadingStatusLabel') : t('transcodingStatusLabel')}
              </ThemedText>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, activeEntry.status === 'processing' && styles.progressFillAdvanced]} />
            </View>
          </FormCard>
        )}

        {activeEntry?.status === 'error' && (
          <View style={styles.errorBanner}>
            <Icon name="error-outline" size={18} color={Colors.error} />
            <ThemedText variant="label-md" style={styles.errorText}>
              {t('publishErrorMessage')}
            </ThemedText>
            <TextLinkButton label={t('retryLabel')} onPress={() => activeTrackId && retryPublish(activeTrackId)} />
          </View>
        )}

        <PillButton
          label={t('publishTrackLabel')}
          trailingIcon="arrow-forward"
          disabled={!canPublish || isBusy}
          loading={isBusy}
          onPress={handlePublish}
          style={styles.cta}
        />
        <PressableScale accessibilityRole="button" onPress={handleSaveAsDraft} disabled={isBusy} style={styles.quietAction}>
          <ThemedText variant="label-lg" emphasis="medium">
            {t('saveAsDraftLabel')}
          </ThemedText>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={handleSimulateError}
          disabled={isBusy || !canPublish}
          style={[styles.quietAction, (isBusy || !canPublish) && styles.quietDisabled]}
        >
          <ThemedText variant="body-sm" emphasis="low">
            {t('simulatePublishErrorLabel')}
          </ThemedText>
        </PressableScale>
      </ScrollView>

      <Toast message={t('toastSavedAsDraft')} icon="save" visible={draftSavedToastVisible} />
      {toast}
    </ThemedView>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.xl,
    paddingBottom: Spacing.xl * 3,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    gap: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  fileIconTile: {
    width: 44,
    height: 44,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  waveform: {
    height: 36,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 0.7,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-end',
  },
  coverCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverText: {
    flex: 1,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l3,
  },
  explicitRow: {
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    color: Colors.secondary,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '35%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.secondary,
  },
  progressFillAdvanced: {
    width: '70%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  cta: {
    height: 56,
  },
  quietAction: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    marginTop: -Spacing.md,
  },
  quietDisabled: {
    opacity: 0.4,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.margin,
    gap: Spacing.sm,
  },
  resultIconHalo: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  resultButton: {
    width: '100%',
    marginTop: Spacing.md,
  },
  resultButtonSecondary: {
    width: '100%',
  },
});
