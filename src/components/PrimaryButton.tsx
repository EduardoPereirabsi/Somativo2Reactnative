import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, MIN_TOUCH, spacing } from '../theme/colors';
import type { IconName } from './IconButton';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** RF09 - troca o texto por um ActivityIndicator e bloqueia novos toques. */
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  icon?: IconName;
  /** RF10 - para botoes que representam um estado ligado/desligado. */
  selected?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'filled',
  icon,
  selected,
  accessibilityLabel,
  accessibilityHint,
  style,
}: PrimaryButtonProps) {
  const filled = variant === 'filled';
  const blocked = disabled || loading;
  const foreground = filled ? colors.onPrimary : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading, selected }}
      style={({ pressed }) => [
        styles.base,
        filled ? styles.filled : styles.outline,
        blocked && styles.blocked,
        pressed && !blocked && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} accessibilityLabel="Carregando" />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
          {/* Sem altura fixa: com fonte grande o botao cresce em vez de cortar. */}
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  blocked: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
