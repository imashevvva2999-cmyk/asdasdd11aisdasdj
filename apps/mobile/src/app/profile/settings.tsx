import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, IconButton, PressableScale, TextField, ToggleRow, ValueRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';

type SettingsRow = { id: string; label: string; render: () => React.ReactNode };
type SettingsSection = { id: string; title: string; rows: SettingsRow[] };

/**
 * S-24 Settings — Audio & Account (docs/screens.md §3.11). Every toggle/value
 * here is local component state only — no real account, MBANK, or server
 * settings are read or written. Quality/Equalizer sub-screens and "Account &
 * Security" details are undesigned (docs/open-questions.md OQ-42) and are
 * not invented — their rows show the current mock value without a destination.
 */
export default function SettingsScreen() {
  const [query, setQuery] = useState('');
  const [lossless, setLossless] = useState(true);
  const [dolbyAtmos, setDolbyAtmos] = useState(false);
  const [volumeNormalization, setVolumeNormalization] = useState(true);
  const [downloadOverCellular, setDownloadOverCellular] = useState(false);
  const [gapless, setGapless] = useState(true);
  const [crossfadeSec, setCrossfadeSec] = useState(4);
  const [fastPayAuth, setFastPayAuth] = useState(true);
  const [supportReceipts, setSupportReceipts] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);
  const { showToast, toast } = useToast();

  const handleClearCache = useCallback(() => {
    setCacheCleared(true);
    showToast('Cache cleared', 'cleaning-services');
  }, [showToast]);

  const sections: SettingsSection[] = useMemo(
    () => [
      {
        id: 'audio',
        title: 'Audio Streaming & Lossless',
        rows: [
          { id: 'lossless', label: 'Lossless', render: () => <ToggleRow title="Lossless" value={lossless} onValueChange={setLossless} /> },
          { id: 'wifi-quality', label: 'Wi-Fi Quality', render: () => <ValueRow title="Wi-Fi Quality" value="High" /> },
          { id: 'cellular-quality', label: 'Cellular Quality', render: () => <ValueRow title="Cellular Quality" value="Normal" /> },
          { id: 'dolby-atmos', label: 'Dolby Atmos', render: () => <ToggleRow title="Dolby Atmos" value={dolbyAtmos} onValueChange={setDolbyAtmos} /> },
          {
            id: 'volume-normalization',
            label: 'Volume Normalization',
            render: () => <ToggleRow title="Volume Normalization" value={volumeNormalization} onValueChange={setVolumeNormalization} />,
          },
        ],
      },
      {
        id: 'downloads',
        title: 'Downloads & Storage',
        rows: [
          { id: 'download-quality', label: 'Download Quality', render: () => <ValueRow title="Download Quality" value="High" /> },
          {
            id: 'download-cellular',
            label: 'Download over Cellular',
            render: () => <ToggleRow title="Download over Cellular" value={downloadOverCellular} onValueChange={setDownloadOverCellular} />,
          },
          { id: 'storage-used', label: 'Storage Used', render: () => <ValueRow title="Storage Used" value={cacheCleared ? '12.8 GB (Music 12.8 • Cache 0)' : '14.2 GB (Music 12.8 • Cache 1.4)'} /> },
          {
            id: 'clear-cache',
            label: 'Clear Cache',
            render: () => (
              <ValueRow title="Clear Cache" value={cacheCleared ? '0 B' : '1.4 GB'} onPress={handleClearCache} />
            ),
          },
        ],
      },
      {
        id: 'playback',
        title: 'Playback & Sound Engine',
        rows: [
          {
            id: 'crossfade',
            label: 'Crossfade',
            render: () => (
              <View style={styles.crossfadeRow}>
                <ThemedText variant="label-lg" style={styles.crossfadeLabel}>
                  Crossfade
                </ThemedText>
                <View style={styles.stepper}>
                  <IconButton
                    icon="remove"
                    accessibilityLabel="Decrease crossfade"
                    size={32}
                    onPress={() => setCrossfadeSec((sec) => Math.max(0, sec - 1))}
                  />
                  <ThemedText variant="mono-num" style={styles.crossfadeValue}>
                    {crossfadeSec}s
                  </ThemedText>
                  <IconButton
                    icon="add"
                    accessibilityLabel="Increase crossfade"
                    size={32}
                    onPress={() => setCrossfadeSec((sec) => Math.min(12, sec + 1))}
                  />
                </View>
              </View>
            ),
          },
          { id: 'gapless', label: 'Gapless', render: () => <ToggleRow title="Gapless" value={gapless} onValueChange={setGapless} /> },
          { id: 'equalizer', label: 'Equalizer', render: () => <ValueRow title="Equalizer" value="Flat" /> },
        ],
      },
      {
        id: 'account',
        title: 'Account & Payments',
        rows: [
          {
            id: 'fast-pay',
            label: 'MBANK Fast-Pay Authorization',
            render: () => (
              <ToggleRow
                title="MBANK Fast-Pay Authorization"
                subtitle={fastPayAuth ? 'Biometric Active' : 'Disabled'}
                value={fastPayAuth}
                onValueChange={setFastPayAuth}
              />
            ),
          },
          {
            id: 'support-receipts',
            label: 'Artist Support Receipts',
            render: () => (
              <ToggleRow
                title="Artist Support Receipts"
                subtitle="Monthly email"
                value={supportReceipts}
                onValueChange={setSupportReceipts}
              />
            ),
          },
        ],
      },
    ],
    [lossless, dolbyAtmos, volumeNormalization, downloadOverCellular, gapless, crossfadeSec, fastPayAuth, supportReceipts, cacheCleared, handleClearCache],
  );

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sections;
    return sections
      .map((section) => ({ ...section, rows: section.rows.filter((row) => row.label.toLowerCase().includes(normalized)) }))
      .filter((section) => section.rows.length > 0);
  }, [sections, query]);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          placeholder="Search settings"
          value={query}
          onChangeText={setQuery}
          leftAccessory={<Icon name="search" size={18} color={Colors.text.medium} />}
        />

        {filteredSections.length === 0 ? (
          <ThemedText variant="body-md" emphasis="medium" style={styles.noResults}>
            No settings match &quot;{query}&quot;.
          </ThemedText>
        ) : (
          filteredSections.map((section) => (
            <View key={section.id} style={styles.section}>
              <ThemedText variant="label-md" emphasis="medium" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              <View style={styles.sectionRows}>{section.rows.map((row) => <View key={row.id}>{row.render()}</View>)}</View>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <ThemedText variant="body-sm" emphasis="medium" style={styles.centerText}>
            Mmusic v0.1.0 (Фаза 4)
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium" style={styles.centerText}>
            Powered by MBANK Core Architecture
          </ThemedText>
          <View style={styles.footerLinks}>
            {['Terms', 'Privacy', 'Audio Licenses'].map((label) => (
              <PressableScale
                key={label}
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={() => showToast(`The ${label} page isn't available yet`, 'info')}
              >
                <ThemedText variant="body-sm" emphasis="primary">
                  {label}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>

      {toast}
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
  noResults: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionRows: {
    gap: Spacing.xs,
  },
  crossfadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  crossfadeLabel: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  crossfadeValue: {
    minWidth: 28,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});
