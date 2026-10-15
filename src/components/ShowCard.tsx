import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Show } from '../models/show';
import { colors, spacing } from '../theme/colors';
import { ShowImage } from './ShowImage';

interface ShowCardProps {
  show: Show;
  width: number;
  /** RF04 - o coracao do card reflete o MESMO estado da tela de detalhes. */
  isFavorite: boolean;
  isWatched: boolean;
  onPress: (show: Show) => void;
}

/**
 * RF01 - celula da grade do catalogo ("ItemCard").
 *
 * Recebe TUDO por props, inclusive `isFavorite` - e nao le o Context
 * direto. Junto com o `memo`, isso faz diferenca: quando o usuario favorita
 * uma serie, o Context muda e a FlatList repassa as props de novo, mas o
 * `memo` compara as props e so o card cuja `isFavorite` mudou renderiza
 * outra vez. Os outros 239 cards da pagina ficam como estao.
 */
function ShowCardComponent({ show, width, isFavorite, isWatched, onPress }: ShowCardProps) {
  const genres = show.genres.slice(0, 2).join(' · ') || 'Gênero não informado';

  // RF10 - o card inteiro e lido como um unico botao, com o estado incluido.
  const label = [
    show.name,
    genres,
    isFavorite ? 'favorita' : null,
    isWatched ? 'já assistida' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => onPress(show)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre os detalhes da série"
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      {/* Proporcao 2:3 de poster, calculada pela largura - nenhuma altura fixa. */}
      <View>
        <ShowImage uri={show.imageMedium} name={show.name} style={styles.image} />
        <View style={styles.badges} importantForAccessibility="no-hide-descendants">
          {isWatched ? (
            <View style={styles.badge}>
              <Ionicons name="eye" size={15} color={colors.text} />
            </View>
          ) : null}
          {isFavorite ? (
            <View style={styles.badge}>
              <Ionicons name="heart" size={15} color={colors.heart} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {show.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {genres}
        </Text>
      </View>
    </Pressable>
  );
}

export const ShowCard = memo(ShowCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.75 },
  image: { width: '100%', aspectRatio: 2 / 3 },
  badges: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(15, 17, 23, 0.85)',
    borderRadius: 14,
    padding: 6,
  },
  info: { padding: spacing.sm, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13 },
});
