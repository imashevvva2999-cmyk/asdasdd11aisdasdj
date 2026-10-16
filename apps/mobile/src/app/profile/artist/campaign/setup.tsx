import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork, Icon } from '@/components/ui';
import { S, SR, SS, SText, StitchHeader, alpha, sf, usePromoStrings } from '@/components/promotion-stitch';
import { STITCH_DEFAULT_GENRE_IDS, STITCH_GENRES } from '@/components/promotion-stitch/data/genres';
import { SetupPromoStrings } from '@/components/promotion-stitch/strings/setup';
import { KG_REGIONS, SetupFormPromoStrings, UPLOAD_GENRE_TO_TARGET } from '@/components/promotion-stitch/strings/setup-form';
import { goBack } from '@/lib/navigation';
import { formatKgsAmount } from '@/lib/format-currency';
import { PROMO_PACKAGES } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { DESCRIPTION_MAX, setupIssues, useCampaignStore, type AgeGroup, type GeoScope } from '@/state/campaign-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useAppStrings } from '@/state/locale-store';

const AGE_CHIPS: AgeGroup[] = ['all', '18-24', '25-34', '35-44', '45+'];

/** Web-only CSS blur for the Stitch ambient glow blobs (`blur-2xl/3xl`). */
const blur = (px: number): ViewStyle => (Platform.OS === 'web' ? ({ filter: `blur(${px}px)` } as ViewStyle) : {});

/** Campaign wizard step 3/4 — Stitch "Campaign Setup" (screen 5), 1:1.
 * Redirects to step 1 if entered mid-flow with no track selected. */
export default function CampaignSetupScreen() {
  const { locale } = useDashboardStrings();
  const { t: tApp } = useAppStrings();
  const s = usePromoStrings(SetupPromoStrings);
  const insets = useSafeAreaInsets();
  const entries = useArtistStore((st) => st.entries);
  const trackId = useCampaignStore((st) => st.trackId);
  const packageId = useCampaignStore((st) => st.packageId);
  const targetGenreIds = useCampaignStore((st) => st.targetGenreIds);
  const geoScope = useCampaignStore((st) => st.geoScope);
  const toggleGenre = useCampaignStore((st) => st.toggleGenre);
  const setGeoScope = useCampaignStore((st) => st.setGeoScope);
  const goToConfirm = useCampaignStore((st) => st.goToConfirm);
  const f = usePromoStrings(SetupFormPromoStrings);
  const customRegionIds = useCampaignStore((st) => st.customRegionIds);
  const toggleRegion = useCampaignStore((st) => st.toggleRegion);
  const description = useCampaignStore((st) => st.description);
  const setDescription = useCampaignStore((st) => st.setDescription);
  const [attempted, setAttempted] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const ages = useCampaignStore((st) => st.ageGroups);
  const toggleAge = useCampaignStore((st) => st.toggleAgeGroup);
  const prechecked = useRef(false);

  useEffect(() => {
    if (!trackId) router.replace('/profile/artist/campaign/select-track');
  }, [trackId]);

  useEffect(() => {
    if (prechecked.current) return;
    prechecked.current = true;
    // First visit: Stitch's default genres plus the track's own upload genre.
    if (useCampaignStore.getState().targetGenreIds.length === 0) {
      const own = UPLOAD_GENRE_TO_TARGET[entries.find((e) => e.track.id === trackId)?.genre ?? ''];
      new Set([...STITCH_DEFAULT_GENRE_IDS, ...(own ? [own] : [])]).forEach((id) => toggleGenre(id));
    }
  }, [toggleGenre, entries, trackId]);

  const entry = entries.find((e) => e.track.id === trackId);
  const track = entry?.track;
  const issues = setupIssues({ targetGenreIds, geoScope, customRegionIds });
  const showGenreError = issues.includes('noGenres');
  const showRegionError = attempted && issues.includes('noRegions');
  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);

  if (!trackId || !track || !pkg) {
    return <View style={styles.screen} />;
  }

  const numLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const price = `${formatKgsAmount(pkg.priceKgs)} ${s.currency}`;
  const perImpression = pkg.forecastHigh > 0 ? (pkg.priceKgs / pkg.forecastHigh).toFixed(2) : '0.00';

  const geoOptions: { scope: GeoScope; title: string; hint: string; idleIcon: string }[] = [
    { scope: 'all', title: s.geoAll, hint: s.geoAllHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'bishkek', title: s.geoBishkek, hint: s.geoBishkekHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'bishkek-osh', title: s.geoBishkekOsh, hint: s.geoBishkekOshHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'custom', title: s.geoManual, hint: s.geoManualHint, idleIcon: 'tune' },
  ];
  const included: Record<GeoScope, string> = {
    all: s.includedAll,
    bishkek: s.includedBishkek,
    'bishkek-osh': s.includedBishkekOsh,
    custom: s.includedManual,
  };

  return (
    <View style={styles.screen}>
      <StitchHeader title={s.title} onBack={() => goBack('/profile/artist/campaign/select-package')} backLabel={tApp('backLabel')} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress & editorial subtitle */}
        <View style={styles.intro}>
          <View style={styles.stepRow}>
            <SText v="label-md" color={S.primary} style={styles.upperWider}>
              {s.step}
            </SText>
            <SText v="mono-num" color={S.outline}>
              {s.stepCaption}
            </SText>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <SText color={S.onSurfaceVariant} style={styles.relaxed}>
            {s.intro}
          </SText>
        </View>

        <View style={styles.sections}>
          {/* 1. Target track & selected package */}
          <View style={[styles.summaryCard, styles.shadowXl]}>
            <View style={[styles.summaryGlow, blur(64)]} pointerEvents="none" />
            <View style={styles.summaryTop}>
              <View style={styles.cover}>
                <Artwork uri={track.coverUri} size={56} radius={SR.lg} />
                <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
              </View>
              <View style={styles.flexShrink}>
                <SText v="headline-sm" numberOfLines={1}>
                  {track.title}
                </SText>
                <SText v="body-sm" color={S.outline} numberOfLines={1} style={styles.mt2}>
                  {track.artistName}
                  {entry?.genre ? ` • ${f.genreFromTrack}: ${entry.genre}` : ''}
                </SText>
                <View style={styles.readyRow}>
                  <View style={styles.readyDot} />
                  <SText v="label-sm" color={S.primary} style={styles.upper}>
                    {s.readyToLaunch}
                  </SText>
                </View>
              </View>
            </View>
            <View style={styles.packageRow}>
              <View style={styles.packageLeft}>
                <Icon name="stars" size={20} color={S.secondary} />
                <SText v="label-md" style={styles.flexShrink} numberOfLines={1}>
                  {s.tariff} {pkg.name}
                  <SText v="body-sm" color={S.outline}>
                    {'   '}
                    {pkg.durationDays} {s.days} • {price}
                  </SText>
                </SText>
              </View>
              <Pressable accessibilityRole="button" onPress={() => goBack('/profile/artist/campaign/select-package')} style={styles.changeBtn}>
                <SText v="label-md" color={S.primary}>
                  {s.change}
                </SText>
              </Pressable>
            </View>
          </View>

          {/* 2. Location targeting */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.headTitle}>
                <Icon name="public" size={20} color={S.primary} />
                <SText v="headline-sm">{s.geoTitle}</SText>
                <FieldTag text={f.required} required />
              </View>
              <SText v="label-sm" color={S.outline} style={styles.upperWider}>
                {s.geoCountry}
              </SText>
            </View>
            <View style={styles.geoGrid}>
              {geoOptions.map((opt) => {
                const active = geoScope === opt.scope;
                return (
                  <Pressable
                    key={opt.scope}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setGeoScope(opt.scope)}
                    style={[styles.geoPill, { backgroundColor: active ? S.surfaceContainerHigh : S.surfaceContainerLow }]}
                  >
                    <View style={styles.flexShrink}>
                      <SText v="label-lg">{opt.title}</SText>
                      <SText v="body-sm" color={S.outline}>
                        {opt.hint}
                      </SText>
                    </View>
                    {active ? (
                      <Icon name="check-circle" size={20} color={S.primary} />
                    ) : (
                      <Icon name={opt.idleIcon} size={20} color={alpha(S.outline, 0.4)} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {geoScope === 'custom' && (
              <View style={styles.regionBlock}>
                <SText v="label-md">{f.regionsTitle}</SText>
                <SText v="body-sm" color={S.outline}>
                  {f.regionsHint}
                </SText>
                <View style={styles.regionWrap}>
                  {KG_REGIONS.map((r) => {
                    const active = customRegionIds.includes(r.id);
                    return (
                      <Pressable
                        key={r.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        onPress={() => toggleRegion(r.id)}
                        style={[styles.ageChip, active ? styles.ageChipActive : styles.ageChipIdle]}
                      >
                        {active && <View style={styles.whiteDot} />}
                        <SText v="label-md" color={active ? S.onPrimaryContainer : S.outline}>
                          {r.label[locale]}
                        </SText>
                      </Pressable>
                    );
                  })}
                </View>
                {showRegionError && <FieldError text={f.errNoRegions} />}
              </View>
            )}
            <View style={styles.includedBox}>
              <View style={styles.mt2}>
                <Icon name="explore" size={18} color={S.outline} />
              </View>
              <View style={styles.includedText}>
                <SText v="label-sm" color={S.outline} style={styles.upper}>
                  {s.includedTitle}
                </SText>
                <SText v="body-sm" color={S.onSurfaceVariant} style={styles.tight}>
                  {included[geoScope]}
                </SText>
              </View>
            </View>
          </View>

          {/* 3. Age range */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.headTitle, styles.flexShrink]}>
                <Icon name="group" size={20} color={S.primary} />
                <SText v="headline-sm" style={styles.flexShrink}>
                  {s.ageTitle}
                </SText>
              </View>
              <View style={styles.ageBadge}>
                <SText v="label-md" color={S.primary}>
                  {s.ageBadge}
                </SText>
              </View>
            </View>
            <View style={styles.tagLine}>
              <FieldTag text={f.optional} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ageChips}>
              {AGE_CHIPS.map((chip) => {
                const active = ages.includes(chip);
                const label = chip === 'all' ? s.ageAll : chip.replace('-', ' — ');
                return (
                  <Pressable
                    key={chip}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleAge(chip)}
                    style={[styles.ageChip, active ? styles.ageChipActive : styles.ageChipIdle]}
                  >
                    {active && chip !== 'all' && <View style={styles.whiteDot} />}
                    <SText v="label-md" color={active ? S.onPrimaryContainer : S.outline}>
                      {label}
                    </SText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.rangeBox}>
              <View style={styles.rangeLabels}>
                <SText v="mono-num" color={S.outline}>
                  {s.ageMin}
                </SText>
                <SText v="mono-num" weight="600">
                  {s.ageRange}
                </SText>
                <SText v="mono-num" color={S.outline}>
                  {s.ageMax}
                </SText>
              </View>
              <View style={styles.rangeTrack}>
                <LinearGradient
                  colors={[S.primary, S.tertiaryContainer, S.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.rangeFill}
                />
              </View>
              <SText v="body-sm" color={S.outline} style={styles.mt4}>
                {s.ageNote}
              </SText>
            </View>
          </View>

          {/* 4. Genres */}
          <View style={styles.section}>
            <View>
              <View style={styles.headTitle}>
                <Icon name="equalizer" size={20} color={S.primary} />
                <SText v="headline-sm">{s.genresTitle}</SText>
                <FieldTag text={f.required} required />
              </View>
              <SText v="body-sm" color={S.onSurfaceVariant} style={styles.mt4}>
                {s.genresIntro}
              </SText>
            </View>
            <View style={styles.genreList}>
              {STITCH_GENRES.map((g) => {
                const checked = targetGenreIds.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggleGenre(g.id)}
                    style={[styles.genreRow, { backgroundColor: checked ? S.surfaceContainerHigh : S.surfaceContainerLow }]}
                  >
                    <View style={styles.genreLeft}>
                      <View style={[styles.checkbox, checked ? styles.checkboxOn : styles.checkboxOff]}>
                        {checked && <Icon name="check" size={18} color={S.onPrimaryContainer} />}
                      </View>
                      <View style={styles.flexShrink}>
                        <SText v="label-lg">{g.label[locale]}</SText>
                        <SText v="body-sm" color={g.delta === 'bolt' ? S.primary : S.outline}>
                          {g.hint[locale]}
                        </SText>
                      </View>
                    </View>
                    {g.delta === 'bolt' ? (
                      <Icon name="bolt" size={20} color={S.secondary} />
                    ) : (
                      <SText v="mono-num" color={checked ? S.outline : alpha(S.outline, 0.5)}>
                        {g.delta}
                      </SText>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {showGenreError && <FieldError text={f.errNoGenres} />}
          </View>

          {/* Optional promotion description */}
          <View style={styles.section}>
            <View>
              <View style={styles.headTitle}>
                <Icon name="edit-note" size={20} color={S.primary} />
                <SText v="headline-sm">{f.descriptionTitle}</SText>
                <FieldTag text={f.optional} />
              </View>
              <SText v="body-sm" color={S.onSurfaceVariant} style={styles.mt4}>
                {f.descriptionHint}
              </SText>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              multiline
              maxLength={DESCRIPTION_MAX}
              placeholder={f.descriptionPlaceholder}
              placeholderTextColor={S.outline}
              accessibilityLabel={f.descriptionTitle}
              style={[styles.descInput, descFocused && styles.descInputFocused]}
            />
            <SText v="mono-num" color={S.outline} style={styles.counter}>
              {description.length}/{DESCRIPTION_MAX}
            </SText>
          </View>

          {/* 5. Dynamic reach forecast */}
          <LinearGradient
            colors={[S.surfaceContainerHigh, S.surfaceContainer, S.surfaceContainerLow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.forecastCard, styles.shadowXl]}
          >
            <View style={[styles.forecastGlow, blur(40)]} pointerEvents="none" />
            <View style={styles.forecastHead}>
              <View style={styles.headTitle}>
                <Icon name="auto-graph" size={22} color={S.secondary} />
                <SText v="headline-sm">{s.forecastTitle}</SText>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <SText v="label-sm" color={S.primary} weight="700" style={styles.upper}>
                  {s.liveAi}
                </SText>
              </View>
            </View>
            <View style={styles.meter}>
              <View style={styles.meterRow}>
                <SText v="display-lg-mobile" weight="800" style={styles.tracking}>
                  {pkg.forecastLow.toLocaleString(numLocale)}
                </SText>
                <SText v="display-lg-mobile" weight="400" color={S.primary} size={22}>
                  –
                </SText>
                <SText v="display-lg-mobile" weight="800" style={styles.tracking}>
                  {pkg.forecastHigh.toLocaleString(numLocale)}
                </SText>
              </View>
              <SText v="body-sm" color={S.outline} style={styles.mt2}>
                {s.forecastCaption}
              </SText>
            </View>
            <View style={styles.matchBar}>
              <View style={styles.matchLeft}>
                <View style={styles.matchIcon}>
                  <Icon name="verified" size={18} color={S.secondary} />
                </View>
                <View style={styles.flexShrink}>
                  <SText v="label-md">{s.relevance}</SText>
                  <SText v="body-sm" color={S.outline}>
                    {s.relevanceHint}
                  </SText>
                </View>
              </View>
              <SText v="mono-num" color={S.secondary} weight="700">
                {s.excellent}
              </SText>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Sticky bottom checkout bar */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SS.md) }]}>
        <View style={styles.footerRow}>
          <View style={styles.flexShrink}>
            <SText v="label-sm" color={S.outline} style={styles.upperWider}>
              {s.total}
            </SText>
            <View style={styles.totalRow}>
              <SText v="headline-md" weight="700">
                {price}
              </SText>
              <SText v="body-sm" color={S.outline}>
                • {pkg.durationDays} {s.showDays}
              </SText>
            </View>
          </View>
          <View style={styles.perChip}>
            <Icon name="bolt" size={14} color={S.primary} />
            <SText v="mono-num">
              ~{perImpression} {s.perImpression}
            </SText>
          </View>
        </View>
        {attempted && issues.length > 0 && <FieldError text={f.fixErrors} center />}
        <View style={styles.footerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={f.back} onPress={() => goBack('/profile/artist/campaign/select-package')} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Icon name="arrow-back" size={20} color={S.onSurface} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAttempted(true);
              if (issues.length > 0) return;
              goToConfirm();
              router.push('/profile/artist/campaign/confirm');
            }}
            style={({ pressed }) => [styles.cta, styles.ctaFlex, pressed && styles.pressed]}
          >
            <SText v="headline-sm" color={S.white}>
              {s.cta}
            </SText>
            <Icon name="arrow-forward" size={20} color={S.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Required / optional marker next to a field title. */
function FieldTag({ text, required }: { text: string; required?: boolean }) {
  return (
    <SText v="label-sm" color={required ? S.primary : S.outline} style={styles.upper}>
      {text}
    </SText>
  );
}

/** Inline validation message under a field. */
function FieldError({ text, center }: { text: string; center?: boolean }) {
  return (
    <View style={[styles.errorRow, center && styles.errorCenter]} accessibilityRole="alert">
      <Icon name="error-outline" size={16} color={S.error} />
      <SText v="body-sm" color={S.error}>
        {text}
      </SText>
    </View>
  );
}

const styles = StyleSheet.create({
  regionBlock: { gap: 6 },
  tagLine: { marginTop: -6 },
  regionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorCenter: { justifyContent: 'center', marginBottom: 8 },
  descInput: {
    minHeight: 88,
    padding: 14,
    borderRadius: SR.xl,
    backgroundColor: S.surfaceContainerLow,
    color: S.onSurface,
    fontFamily: sf('body', '400'),
    fontSize: 14,
    textAlignVertical: 'top',
  },
  descInputFocused: { backgroundColor: S.surfaceContainer },
  counter: { alignSelf: 'flex-end', marginTop: -6 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 52, height: 52, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  ctaFlex: { flex: 1, width: undefined },
  screen: { flex: 1, backgroundColor: S.surface },
  scroll: { paddingBottom: 200 },
  intro: { paddingHorizontal: SS.margin, paddingTop: 16, paddingBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SS.sm, marginBottom: 8 },
  upper: { textTransform: 'uppercase' },
  upperWider: { textTransform: 'uppercase', letterSpacing: 0.6 },
  progressTrack: { width: '100%', height: 6, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh, overflow: 'hidden', marginBottom: 16 },
  progressFill: {
    width: '75%',
    height: '100%',
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    shadowColor: 'rgb(255, 83, 81)',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  relaxed: { lineHeight: 23 },
  tight: { lineHeight: 15 },
  sections: { paddingHorizontal: SS.margin, gap: SS.lg, marginTop: 8 },
  shadowXl: {
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 25,
    shadowOpacity: 0.25,
    elevation: 10,
  },
  summaryCard: { position: 'relative', overflow: 'hidden', borderRadius: SR.xl, backgroundColor: S.surfaceContainerLow, padding: 16 },
  summaryGlow: { position: 'absolute', top: -48, left: -48, width: 128, height: 128, borderRadius: 64, backgroundColor: alpha(S.primaryContainer, 0.2) },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 56, height: 56, borderRadius: SR.lg, overflow: 'hidden', backgroundColor: S.surfaceContainerHighest },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  readyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S.primary },
  packageRow: {
    marginTop: 14,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: alpha(S.surfaceContainer, 0.6),
    borderRadius: SR.lg,
  },
  packageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  changeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  geoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  geoPill: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: SR.xl,
    overflow: 'hidden',
  },
  includedBox: { backgroundColor: alpha(S.surfaceContainerLow, 0.6), borderRadius: SR.xl, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  includedText: { flex: 1, gap: 4 },
  ageBadge: { backgroundColor: alpha(S.primaryContainer, 0.2), paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, flexShrink: 1 },
  ageChips: { gap: 8, paddingBottom: 4 },
  ageChip: { height: 36, paddingHorizontal: 16, borderRadius: SR.full, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ageChipIdle: { backgroundColor: S.surfaceContainerLow },
  ageChipActive: {
    backgroundColor: S.primaryContainer,
    shadowColor: 'rgb(255, 83, 81)',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  whiteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S.white },
  rangeBox: { padding: 14, borderRadius: SR.xl, backgroundColor: S.surfaceContainerLow, gap: 8 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeTrack: { width: '100%', height: 8, borderRadius: SR.full, backgroundColor: S.surfaceContainerHighest, overflow: 'hidden' },
  rangeFill: {
    position: 'absolute',
    left: '12%',
    right: '32%',
    top: 0,
    bottom: 0,
    borderRadius: SR.full,
  },
  genreList: { gap: 8 },
  genreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: SR.xl },
  genreLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  checkbox: { width: 24, height: 24, borderRadius: SR.md, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: {
    backgroundColor: S.primaryContainer,
    shadowColor: 'rgb(255, 83, 81)',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  checkboxOff: { backgroundColor: S.surfaceContainerHighest },
  forecastCard: { position: 'relative', overflow: 'hidden', borderRadius: SR['2xl'], padding: 16 },
  forecastGlow: { position: 'absolute', right: -32, bottom: -32, width: 144, height: 144, borderRadius: 72, backgroundColor: alpha(S.secondaryContainer, 0.2) },
  forecastHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: SR.full, backgroundColor: alpha(S.primary, 0.1) },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S.primary },
  meter: { marginVertical: 8 },
  meterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  tracking: { letterSpacing: -0.025 * 28 },
  matchBar: {
    marginTop: 16,
    padding: 12,
    borderRadius: SR.xl,
    backgroundColor: alpha(S.surfaceContainerLowest, 0.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  matchIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: alpha(S.secondaryFixedDim, 0.2), alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: alpha(S.surface, 0.9),
    paddingHorizontal: SS.margin,
    paddingTop: 12,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 32,
    shadowOpacity: 0.65,
    elevation: 16,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2, gap: 8 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  perChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S.surfaceContainerHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: SR.full },
  cta: {
    width: '100%',
    height: 52,
    paddingHorizontal: 24,
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgb(255, 83, 81)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    shadowOpacity: 0.45,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.98 }] },
});
