import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';

import { SText } from './s-text';
import { S, SS, alpha } from './theme';

export type StitchHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel: string;
  /** Replaces the default trailing avatar circle when given. */
  trailing?: ReactNode;
};

/** The wizard top bar shared by Stitch screens 2/3/5/6/8: back arrow, title,
 * and the primary-colored avatar circle (`h-16 px-margin bg-surface/85`). */
export function StitchHeader({ title, onBack, backLabel, trailing }: StitchHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.back}>
            <Icon name="arrow-back" size={24} color={S.onSurface} />
          </Pressable>
          <SText v="headline-sm" numberOfLines={1} style={styles.title}>
            {title}
          </SText>
        </View>
        {trailing ?? (
          <View style={styles.avatar}>
            <Icon name="person" size={18} color={S.onPrimary} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: alpha(S.surface, 0.85),
    zIndex: 50,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    shadowOpacity: 0.45,
    elevation: 8,
  },
  row: { height: 64, paddingHorizontal: SS.margin, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: SS.sm, flex: 1, minWidth: 0 },
  back: { width: 44, height: 44, marginLeft: -8, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flexShrink: 1, letterSpacing: -0.025 * 18 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: S.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.25,
  },
});
