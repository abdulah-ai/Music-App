import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = TextInputProps & { label?: string; error?: string };

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.cyan}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  labelFocused: { color: colors.cyan },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: 'rgba(16,11,24,0.55)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderWidth: 1,
    borderColor: 'rgba(174,165,192,0.12)',
  },
  inputFocused: {
    borderColor: 'rgba(255,138,92,0.55)',
    backgroundColor: 'rgba(16,11,24,0.8)',
  },
  inputError: { backgroundColor: 'rgba(232,80,110,0.10)', borderColor: 'rgba(232,80,110,0.4)' },
  error: { ...typography.caption, color: colors.danger },
});
