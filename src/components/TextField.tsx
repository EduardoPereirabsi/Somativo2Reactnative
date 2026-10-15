import { useFocusEffect } from '@react-navigation/native';
import { forwardRef, useCallback, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '../theme/colors';
import { rebindKeyboardToAnchor } from './KeyboardAnchor';

interface TextFieldProps extends TextInputProps {
  label: string;
}

/**
 * Campo de texto com rotulo visivel (RF10).
 *
 * O rotulo vira o `accessibilityLabel`, entao o leitor de tela anuncia
 * "E-mail, campo de texto" em vez de ler so o placeholder - que some assim
 * que o usuario comeca a digitar.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, style, onFocus, ...inputProps },
  ref,
) {
  // Se o campo foi usado, ao sair da tela o teclado e religado a raiz do app
  // (contorno do bug do botao voltar no Android 16 - ver KeyboardAnchor).
  const usedRef = useRef(false);
  useFocusEffect(
    useCallback(
      () => () => {
        if (!usedRef.current) return;
        usedRef.current = false;
        rebindKeyboardToAnchor();
      },
      [],
    ),
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...inputProps}
        onFocus={(event) => {
          usedRef.current = true;
          onFocus?.(event);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
});
