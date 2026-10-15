import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MAX_RATING } from '../models/collection';
import { colors, MIN_TOUCH } from '../theme/colors';

interface RatingStarsProps {
  value: number | null;
  /** Sem `onChange`, as estrelas sao so leitura (lista de assistidos). */
  onChange?: (rating: number) => void;
  size?: number;
}

const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

/**
 * RF07 - nota pessoal de 1 a 5 estrelas.
 *
 * Interativo: cada estrela e um botao de 44x44 com rotulo proprio
 * ("Dar nota 3 de 5") e `accessibilityState.selected` na estrela escolhida -
 * o leitor de tela anuncia qual nota esta marcada.
 *
 * Somente leitura: o conjunto vira UM elemento ("Nota 4 de 5"), em vez de
 * cinco icones soltos sem significado para quem nao enxerga.
 */
export function RatingStars({ value, onChange, size = 26 }: RatingStarsProps) {
  const current = value ?? 0;

  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="text"
        accessibilityLabel={value ? `Nota ${value} de ${MAX_RATING}` : 'Sem nota'}
      >
        {STARS.map((star) => (
          <Ionicons
            key={star}
            name={star <= current ? 'star' : 'star-outline'}
            size={size}
            color={star <= current ? colors.star : colors.textMuted}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Sua nota">
      {STARS.map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={4}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Dar nota ${star} de ${MAX_RATING}`}
          accessibilityState={{ selected: star === value }}
          style={({ pressed }) => [styles.star, pressed && styles.pressed]}
        >
          <Ionicons
            name={star <= current ? 'star' : 'star-outline'}
            size={size}
            color={star <= current ? colors.star : colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
