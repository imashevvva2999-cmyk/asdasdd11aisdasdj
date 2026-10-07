import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { resolveFontFamily } from '@/constants/fonts';
import { Colors, Radii, Spacing, TypeScale } from '@/constants/theme';

export type TextFieldProps = TextInputProps & {
  /** Rendered left of the input text (e.g. a search or location Icon). */
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
};

/** Single-line input — 44px, focus-halo border (DESIGN.md "Inputs & Search"). */
export function TextField({ style, leftAccessory, rightAccessory, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const bodyToken = TypeScale['body-md'];

  return (
    <View style={[styles.container, rest.multiline && styles.containerMultiline, focused && styles.focused]}>
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
  },
  inputMultiline: {
    height: undefined,
    textAlignVertical: 'top',
  },
});
