import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AmountChip, Icon, IconButton, PillButton, SheetScreen, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useHydratedSearchParams } from '@/hooks/use-hydrated-search-params';
import { formatKgsAmount } from '@/lib/format-currency';
import { artistPatronageSubtitle, supportWithAmountLabel } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { getArtistById, quickDonationAmountsKgs } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { useSupportStore } from '@/state/support-store';

/**
 * S-19 Support Artist — quick donation sheet (docs/screens.md §3.12). UI/state
 * only: no real MBANK payment, balance check, or bank auth (OQ-10 unresolved).
 */
export default function SupportSheet() {
  const params = useHydratedSearchParams<{ artistId: string }>();
  // Static HTML / hydration: the artist is not known yet — an empty sheet, not "Artist not found." (#418).
  if (!params) return <SheetScreen>{null}</SheetScreen>;
  return <SupportSheetContent artistId={params.artistId} />;
}

function SupportSheetContent({ artistId }: { artistId: string | undefined }) {
  const artist = getArtistById(artistId ?? '');
  const { locale, t } = useAppStrings();

  const storeArtistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const startSupport = useSupportStore((s) => s.startSupport);
  const selectAmount = useSupportStore((s) => s.selectAmount);
  const goToConfirm = useSupportStore((s) => s.goToConfirm);

  const [customAmountText, setCustomAmountText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (artistId && artistId !== storeArtistId) {
      startSupport(artistId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  if (!artist) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('artistNotFoundLabel')}
        </ThemedText>
      </SheetScreen>
    );
  }

  const customAmount = Number(customAmountText);
  const isCustomValid = customAmountText.trim().length > 0 && Number.isFinite(customAmount) && customAmount > 0;

  function handleSelectPreset(preset: number) {
    setShowCustomInput(false);
    selectAmount(preset);
  }

  function handleMorePress() {
    setShowCustomInput(true);
    if (isCustomValid) {
      selectAmount(Math.round(customAmount));
    } else {
      selectAmount(undefined as unknown as number);
    }
  }

  function handleCustomAmountChange(text: string) {
    setCustomAmountText(text);
    const parsed = Number(text);
    if (text.trim().length > 0 && Number.isFinite(parsed) && parsed > 0) {
      selectAmount(Math.round(parsed));
    }
  }

  function handleContinue() {
    if (!amount) return;
    goToConfirm();
    router.replace('/sheets/support-confirm');
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-sm">{t('supportArtistTitle')}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {artistPatronageSubtitle(locale, artist.name)}
          </ThemedText>
        </View>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountGrid}>
          {quickDonationAmountsKgs.map((preset) => (
            <AmountChip
              key={preset}
              amount={String(preset)}
              unit="сом"
              selected={!showCustomInput && amount === preset}
              onPress={() => handleSelectPreset(preset)}
              style={styles.amountItem}
            />
          ))}
          <AmountChip icon="favorite" label={t('moreAmountLabel')} selected={showCustomInput} onPress={handleMorePress} style={styles.amountItem} />
        </View>

        {showCustomInput && (
          <View style={styles.customAmountBlock}>
            <TextField
              placeholder={t('customAmountPlaceholder')}
              keyboardType="number-pad"
              value={customAmountText}
              onChangeText={handleCustomAmountChange}
              rightAccessory={
                <ThemedText variant="label-md" emphasis="medium">
                  сом
                </ThemedText>
              }
            />
            {!isCustomValid && customAmountText.trim().length > 0 && (
              <ThemedText variant="body-sm" style={styles.validationError}>
                {t('amountValidationError')}
              </ThemedText>
            )}
          </View>
        )}

        <PillButton
          label={amount ? supportWithAmountLabel(locale, formatKgsAmount(amount)) : t('selectAnAmount')}
          leadingIcon="bolt"
          disabled={!amount}
          onPress={handleContinue}
          style={styles.cta}
        />

        <View style={styles.footerNote}>
          <Icon name="lock" size={14} color={Colors.text.low} />
          <ThemedText variant="body-sm" emphasis="medium">
            {t('directPayoutToArtistLabel')}
          </ThemedText>
        </View>
      </ScrollView>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
  },
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    flex: 1,
  },
  customAmountBlock: {
    gap: Spacing.xs,
  },
  validationError: {
    color: Colors.error,
  },
  cta: {
    marginTop: Spacing.sm,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
});
