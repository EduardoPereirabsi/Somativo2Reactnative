import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH } from '../theme/colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  icon: IconName;
  /** RF10 - o leitor de tela le isto, ja que o botao nao tem texto visivel. */
  accessibilityLabel: string;
  onPress: () => void;
  /** RF10 - para botoes de estado (favoritar): anuncia "selecionado". */
  selected?: boolean;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botao so com icone (RF10).
 *
 * O icone visivel e pequeno (22pt), mas a area de toque tem no minimo 44x44
 * - e o `hitSlop` ainda estende o toque 8pt para cada lado, sem mudar o
 * layout. Errar o dedo por pouco ainda conta como toque.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  selected,
  color = colors.text,
  size = 22,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIN_TOUCH / 2,
  },
  pressed: { opacity: 0.6 },
});
