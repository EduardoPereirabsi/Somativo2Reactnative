import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShowSnapshot } from '../models/collection';
import { colors, spacing } from '../theme/colors';
import { ShowImage } from './ShowImage';

interface ShowRowProps {
  show: ShowSnapshot;
  onPress: (show: ShowSnapshot) => void;
  /** Linha extra abaixo do titulo (ex.: as estrelas da nota). */
  detail?: ReactNode;
  /** Acao a direita (ex.: remover dos favoritos). Fica FORA do botao da linha. */
  accessory?: ReactNode;
  accessibilityLabel?: string;
}

/**
 * Linha de lista usada na busca, nos favoritos e nos assistidos.
 *
 * RF10 - a linha expoe dois elementos para o leitor de tela, nao um:
 * "abrir detalhes" (imagem + textos) e a acao a direita. Se tudo virasse um
 * unico botao, a acao de remover ficaria inacessivel.
 */
export function ShowRow({ show, onPress, detail, accessory, accessibilityLabel }: ShowRowProps) {
  const genres = show.genres.slice(0, 3).join(' · ') || 'Gênero não informado';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(show)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${show.name}, ${genres}`}
        accessibilityHint="Abre os detalhes da série"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <ShowImage uri={show.imageMedium} name={show.name} style={styles.thumb} compact />
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {show.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {genres}
          </Text>
          {detail}
        </View>
      </Pressable>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingRight: spacing.xs,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.75 },
  thumb: { width: 64, aspectRatio: 2 / 3, borderRadius: 8 },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13 },
});
