import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, type ListRenderItemInfo } from 'react-native';

import { IconButton } from '../components/IconButton';
import { RatingStars } from '../components/RatingStars';
import { ShowRow } from '../components/ShowRow';
import { EmptyView, InlineNotice } from '../components/StateViews';
import { useCollection, useWatched } from '../contexts/CollectionContext';
import { useOpenDetail } from '../hooks/useOpenDetail';
import type { CollectionEntry } from '../models/collection';
import { colors, spacing } from '../theme/colors';

const keyExtractor = (entry: CollectionEntry) => String(entry.show.id);

/** RF07 - itens "consumidos": as series assistidas, com a nota de cada uma. */
export function WatchedScreen() {
  const { watched, unmarkWatched } = useWatched();
  const { syncError, retrySync } = useCollection();
  const openDetail = useOpenDetail();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CollectionEntry>) => {
      const rating = item.personalRating;
      return (
        <ShowRow
          show={item.show}
          onPress={openDetail}
          accessibilityLabel={`${item.show.name}, ${
            rating ? `sua nota ${rating} de 5` : 'sem nota'
          }`}
          detail={
            rating ? (
              <RatingStars value={rating} size={16} />
            ) : (
              <Text style={styles.noRating}>Sem nota</Text>
            )
          }
          accessory={
            <IconButton
              icon="eye-off-outline"
              color={colors.textMuted}
              accessibilityLabel={`Remover ${item.show.name} das assistidas`}
              onPress={() => void unmarkWatched(item.show)}
            />
          }
        />
      );
    },
    [openDetail, unmarkWatched],
  );

  return (
    <FlatList
      data={watched}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        syncError ? <InlineNotice message={syncError} onAction={() => void retrySync()} /> : null
      }
      ListEmptyComponent={
        <EmptyView
          icon="eye-outline"
          title="Nenhuma série assistida"
          description="Na tela da série, toque em Marcar como assistida e dê sua nota de 1 a 5."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  noRating: { color: colors.textMuted, fontSize: 13 },
});
