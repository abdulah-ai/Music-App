import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** Muted helper line under the field — shown when there is no error. */
  hint?: string;
};

export function TextField({ label, error, hint, style, onFocus, onBlur, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  // Secure fields get a built-in show/hide toggle — typos in a masked field
  // are the top cause of "wrong password" frustration on first sign-up.
  const [revealed, setRevealed] = useState(false);
  const isSecure = !!secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.cyan}
          secureTextEntry={isSecure && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            isSecure && styles.inputSecure,
            style,
          ]}
          {...rest}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.eye}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={revealed ? colors.cyan : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
  inputSecure: {
    paddingRight: spacing.md + 26,
  },
  inputError: { backgroundColor: 'rgba(232,80,110,0.10)', borderColor: 'rgba(232,80,110,0.4)' },
  eye: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
});
