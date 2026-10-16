import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { isValidStartDate, parseIsoDay, toIsoDay } from '@/state/campaign-store';

import { SText } from './s-text';
import { S, SR, alpha } from './theme';

export type StartDatePopoverLabels = {
  title: string;
  ends: string;
  cancel: string;
  apply: string;
  prevMonth: string;
  nextMonth: string;
  prevYear: string;
  nextYear: string;
  weekdays: string; // comma-separated, Monday first
};

type Props = {
  visible: boolean;
  /** Current start day (YYYY-MM-DD). */
  value: string;
  durationDays: number;
  locale: 'en' | 'ru';
  labels: StartDatePopoverLabels;
  onApply: (iso: string) => void;
  onClose: () => void;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Compact campaign start-date calendar (Review & Pay). Day grid with month and
 * year steps; days before today or more than a year ahead are disabled. The
 * end date is derived from the package duration and shown live.
 */
export function StartDatePopover({ visible, value, durationDays, locale, labels, onApply, onClose }: Props) {
  const today = startOfDay(new Date());
  const maxDay = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const [selected, setSelected] = useState(value);
  const initial = parseIsoDay(value) ?? today;
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  useEffect(() => {
    if (!visible) return;
    setSelected(value);
    const d = parseIsoDay(value) ?? startOfDay(new Date());
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [visible, value]);

  const dateLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  const monthTitle = month.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  const selectedDay = parseIsoDay(selected) ?? today;
  const endDay = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + durationDays);

  // Monday-first grid.
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | undefined)[] = [
    ...Array.from({ length: lead }, () => undefined),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(maxDay.getFullYear(), maxDay.getMonth(), 1);
  const shift = (months: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + months, 1);
    setMonth(next < firstMonth ? firstMonth : next > lastMonth ? lastMonth : next);
  };
  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={labels.cancel} />
        <View style={styles.card} accessibilityViewIsModal>
          <SText v="label-sm" color={S.outline} style={styles.upper}>
            {labels.title}
          </SText>
          <View style={styles.header}>
            <View style={styles.navGroup}>
              <NavButton icon="keyboard-double-arrow-left" label={labels.prevYear} disabled={!canPrev} onPress={() => shift(-12)} />
              <NavButton icon="chevron-left" label={labels.prevMonth} disabled={!canPrev} onPress={() => shift(-1)} />
            </View>
            <SText v="label-lg" style={styles.monthTitle}>
              {monthTitle}
            </SText>
            <View style={styles.navGroup}>
              <NavButton icon="chevron-right" label={labels.nextMonth} disabled={!canNext} onPress={() => shift(1)} />
              <NavButton icon="keyboard-double-arrow-right" label={labels.nextYear} disabled={!canNext} onPress={() => shift(12)} />
            </View>
          </View>
          <View style={styles.grid}>
            {labels.weekdays.split(',').map((w) => (
              <View key={w} style={styles.cell}>
                <SText v="label-sm" color={S.outline}>
                  {w}
                </SText>
              </View>
            ))}
            {cells.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={styles.cell} />;
              const iso = toIsoDay(d);
              const valid = isValidStartDate(iso, today);
              const isSelected = iso === selected;
              const isToday = iso === toIsoDay(today);
              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityLabel={fmt(d)}
                  accessibilityState={{ selected: isSelected, disabled: !valid }}
                  disabled={!valid}
                  onPress={() => setSelected(iso)}
                  style={styles.cell}
                >
                  <View style={[styles.day, isSelected && styles.daySelected, isToday && !isSelected && styles.dayToday]}>
                    <SText v="label-md" color={isSelected ? S.onPrimaryContainer : valid ? S.onSurface : alpha(S.outline, 0.4)}>
                      {d.getDate()}
                    </SText>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <SText v="body-sm" color={S.outline}>
            {fmt(selectedDay)} — {labels.ends} {fmt(endDay)}
          </SText>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <SText v="label-lg" color={S.onSurfaceVariant}>
                {labels.cancel}
              </SText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isValidStartDate(selected, today)) onApply(selected);
                onClose();
              }}
              style={[styles.btn, styles.btnPrimary]}
            >
              <SText v="label-lg" color={S.onPrimaryContainer}>
                {labels.apply}
              </SText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NavButton({ icon, label, disabled, onPress }: { icon: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6} style={styles.nav}>
      <Icon name={icon} size={20} color={disabled ? alpha(S.outline, 0.35) : S.onSurface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: alpha(S.black, 0.55), alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, backgroundColor: S.surfaceContainer, borderRadius: SR['2xl'], padding: 16, gap: 10, borderWidth: 1, borderColor: alpha(S.outlineVariant, 0.3) },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navGroup: { flexDirection: 'row', gap: 2 },
  nav: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: SR.full },
  monthTitle: { textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: SR.full, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: S.primaryContainer },
  dayToday: { borderWidth: 1, borderColor: alpha(S.primary, 0.6) },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, height: 40, borderRadius: SR.full, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: S.surfaceContainerHigh },
  btnPrimary: { backgroundColor: S.primaryContainer },
});
