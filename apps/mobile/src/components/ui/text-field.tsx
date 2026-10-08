import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { resolveFontFamily } from '@/constants/fonts';
import { Colors, Radii, Spacing, TypeScale } from '@/constants/theme';

import { ThemedText } from '../themed-text';

export type TextFieldProps = TextInputProps & {
  /** Rendered left of the input text (e.g. a search or location Icon). */
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  /** Coral field label rendered above the input (Stitch Artist Setup / Upload
   * Track forms). When set it also becomes the accessibility label. */
  label?: string;
  /** Use the Surface Level 2 fill — for fields placed inside a Surface Level 1
   * card, where the default L1 fill would disappear (DESIGN.md: L2 is the
   * "input text backgrounds" layer). */
  raised?: boolean;
  /** 'search' = full pill, 48px (Stitch Search / Search Results fields). */
  variant?: 'default' | 'search';
};

/** Single-line input — 44px, focus-halo border (DESIGN.md "Inputs & Search"). */
export function TextField({ style, leftAccessory, rightAccessory, label, raised = false, variant = 'default', onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const bodyToken = TypeScale['body-md'];

  const field = (
    <View style={[styles.container, variant === 'search' && styles.search, raised && styles.raised, rest.multiline && styles.containerMultiline, focused && styles.focused]}>
      {leftAccessory}
      <TextInput
        style={[
          styles.input,
          {
            fontFamily: resolveFontFamily(bodyToken.fontFamily, bodyToken.fontWeight),
            fontSize: bodyToken.fontSize,
          },
          rest.multiline && styles.inputMultiline,
          style,
        ]}
        placeholderTextColor={Colors.text.low}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {rightAccessory}
    </View>
  );

  if (!label) return field;
  return (
    <View style={styles.labelled}>
      <ThemedText variant="label-md" emphasis="primary">
        {label}
      </ThemedText>
      {field}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  search: {
    height: 48,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
  },
  raised: {
    backgroundColor: Colors.surface.l2,
    borderColor: 'transparent',
  },
  labelled: {
    gap: 6,
  },
  containerMultiline: {
    height: undefined,
    minHeight: 88,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  focused: {
    borderColor: 'rgba(255, 75, 75, 0.5)',
  },
  input: {
    flex: 1,
    color: Colors.text.high,
    height: '100%',
    // Web: the container's coral focus border is the focus indicator; drop the
    // browser's second (blue) outline drawn inside the pill.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
  },
  inputMultiline: {
    height: undefined,
    textAlignVertical: 'top',
  },
});
