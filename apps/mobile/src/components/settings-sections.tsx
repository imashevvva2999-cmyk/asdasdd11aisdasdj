import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, IconButton, ToggleRow, ValueRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useSettingsStore, type QualitySettingKey } from '@/state/settings-store';
import { useAppStrings } from '@/state/locale-store';

export type SettingsRow = { id: string; label: string; render: () => React.ReactNode };
export type SettingsSection = { id: SettingsSectionId; title: string; icon: string; rows: SettingsRow[] };
export type SettingsSectionId = 'general' | 'audio' | 'playback' | 'downloads' | 'account';

type ShowToast = (message: string, icon?: string) => void;

/**
 * The S-24 Settings sections (docs/screens.md §3.11), defined once and shared
 * by the full Settings screen and the Profile Hub destinations that show a
 * subset of them (Audio Quality & Playback, Downloads & Offline, Account &
 * Security). Values come from the session-local settings store, so every
 * screen shows the same state. All controls are frontend/mock only.
 */
export function useSettingsSections(showToast: ShowToast): Record<SettingsSectionId, SettingsSection> {
  const s = useSettingsStore();
  const { t, locale, setLocale } = useAppStrings();

  const qualityRow = (id: QualitySettingKey, title: string): SettingsRow => ({
    id,
    label: title,
    render: () => (
      <ValueRow
        title={title}
        value={s[id]}
        onPress={() => {
          const next = s.cycleQuality(id);
          showToast(`${title}: ${next} (preview — playback is unchanged)`, 'tune');
        }}
      />
    ),
  });

  return {
    general: {
      id: 'general',
      title: t('sectionGeneral'),
      icon: 'language',
      rows: [
        {
          id: 'app-language',
          label: t('appLanguage'),
          render: () => (
            <ValueRow
              title={t('appLanguage')}
              value={locale === 'ru' ? t('appLanguageRussian') : t('appLanguageEnglish')}
              onPress={() => setLocale(locale === 'en' ? 'ru' : 'en')}
            />
          ),
        },
      ],
    },
    audio: {
      id: 'audio',
      title: t('sectionAudio'),
      icon: 'graphic-eq',
      rows: [
        {
          id: 'lossless',
          label: t('rowLossless'),
          render: () => (
            <ToggleRow
              title={t('rowLossless')}
              subtitle={t('losslessSubtitle')}
              value={s.lossless}
              onValueChange={(v) => s.setFlag('lossless', v)}
            />
          ),
        },
        qualityRow('wifiQuality', t('rowWifiQuality')),
        qualityRow('cellularQuality', t('rowCellularQuality')),
        {
          id: 'dolby-atmos',
          label: t('rowDolbyAtmos'),
          render: () => (
            <ToggleRow
              title={t('rowDolbyAtmos')}
              subtitle={t('dolbyAtmosSubtitle')}
              value={s.dolbyAtmos}
              onValueChange={(v) => s.setFlag('dolbyAtmos', v)}
            />
          ),
        },
        {
          id: 'volume-normalization',
          label: t('rowVolumeNorm'),
          render: () => (
            <ToggleRow
              title={t('rowVolumeNorm')}
              subtitle={t('volumeNormSubtitle')}
              value={s.volumeNormalization}
              onValueChange={(v) => s.setFlag('volumeNormalization', v)}
            />
          ),
        },
      ],
    },
    playback: {
      id: 'playback',
      title: t('sectionPlayback'),
      icon: 'tune',
      rows: [
        {
          id: 'crossfade',
          label: t('rowCrossfade'),
          render: () => (
            <View style={styles.crossfadeRow}>
              <ThemedText variant="label-lg" style={styles.crossfadeLabel}>
                {t('rowCrossfade')}
              </ThemedText>
              <View style={styles.stepper}>
                <IconButton icon="remove" accessibilityLabel="Decrease crossfade" size={32} onPress={() => s.setCrossfade(s.crossfadeSec - 1)} />
                <ThemedText variant="mono-num" style={styles.crossfadeValue}>
                  {s.crossfadeSec}s
                </ThemedText>
                <IconButton icon="add" accessibilityLabel="Increase crossfade" size={32} onPress={() => s.setCrossfade(s.crossfadeSec + 1)} />
              </View>
            </View>
          ),
        },
        {
          id: 'gapless',
          label: t('rowGapless'),
          render: () => (
            <ToggleRow title={t('rowGapless')} subtitle={t('gaplessSubtitle')} value={s.gapless} onValueChange={(v) => s.setFlag('gapless', v)} />
          ),
        },
        { id: 'equalizer', label: t('rowEqualizer'), render: () => <ValueRow title={t('rowEqualizer')} value="Flat" /> },
      ],
    },
    downloads: {
      id: 'downloads',
      title: t('sectionDownloads'),
      icon: 'download',
      rows: [
        qualityRow('downloadQuality', t('rowDownloadQuality')),
        {
          id: 'download-cellular',
          label: t('rowDownloadCellular'),
          render: () => (
            <ToggleRow
              title={t('rowDownloadCellular')}
              subtitle={t('downloadCellularSubtitle')}
              value={s.downloadOverCellular}
              onValueChange={(v) => s.setFlag('downloadOverCellular', v)}
            />
          ),
        },
        {
          id: 'storage-used',
          label: t('rowStorageUsed'),
          render: () => (
            <ValueRow
              title={t('rowStorageUsed')}
              value={`${formatGb(s.musicStorageGb + s.cacheGb)} • cache ${formatGb(s.cacheGb)}`}
            />
          ),
        },
        {
          id: 'clear-cache',
          label: t('rowClearCache'),
          render: () => (
            <ValueRow
              title={t('rowClearCache')}
              value={s.cacheGb > 0 ? formatGb(s.cacheGb) : '0 B'}
              onPress={() => {
                s.clearCache();
                showToast('Cache cleared', 'cleaning-services');
              }}
            />
          ),
        },
      ],
    },
    account: {
      id: 'account',
      title: t('sectionAccount'),
      icon: 'account-balance',
      rows: [
        {
          id: 'fast-pay',
          label: t('rowFastPay'),
          render: () => (
            <ToggleRow
              title={t('rowFastPay')}
              subtitle={s.fastPayAuth ? 'Biometric Active (demo)' : 'Disabled'}
              value={s.fastPayAuth}
              onValueChange={(v) => s.setFlag('fastPayAuth', v)}
            />
          ),
        },
        {
          id: 'support-receipts',
          label: t('rowSupportReceipts'),
          render: () => (
            <ToggleRow
              title={t('rowSupportReceipts')}
              subtitle={t('supportReceiptsSubtitle')}
              value={s.supportReceipts}
              onValueChange={(v) => s.setFlag('supportReceipts', v)}
            />
          ),
        },
      ],
    },
  };
}

/** One titled section card, styled like the Stitch S-24 groups. */
export function SettingsSectionCard({ section }: { section: SettingsSection }) {
  return (
    <SettingsCard title={section.title} icon={section.icon}>
      {section.rows.map((row) => (
        <View key={row.id}>{row.render()}</View>
      ))}
    </SettingsCard>
  );
}

/** Titled card for screen-specific content beside the shared sections. */
export function SettingsCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Icon name={icon} size={18} color={Colors.primary} />
        <ThemedText variant="label-sm" emphasis="primary" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function formatGb(gb: number): string {
  return `${gb.toFixed(1)} GB`;
}

export const settingsScreenStyles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
});

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
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
});
