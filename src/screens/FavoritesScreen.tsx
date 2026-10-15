import { useCallback } from 'react';
import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';

import { IconButton } from '../components/IconButton';
import { ShowRow } from '../components/ShowRow';
import { EmptyView, InlineNotice } from '../components/StateViews';
import { useCollection, useFavorites } from '../contexts/CollectionContext';
import { useOpenDetail } from '../hooks/useOpenDetail';
import type { CollectionEntry } from '../models/collection';
import { colors, spacing } from '../theme/colors';

const keyExtractor = (entry: CollectionEntry) => String(entry.show.id);

/**
 * RF05 - Tela de Favoritos.
 *
 * Nao guarda estado proprio: so le o Context. Por isso, desfavoritar aqui,
 * na Tela de Detalhes ou de qualquer outro lugar remove a linha sozinho.
 */
export function FavoritesScreen() {
  const { favorites, toggleFavorite } = useFavorites();
  const { syncError, retrySync } = useCollection();
  const openDetail = useOpenDetail();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CollectionEntry>) => (
      <ShowRow
        show={item.show}
        onPress={openDetail}
        accessory={
          <IconButton
            icon="heart"
            color={colors.heart}
            selected
            accessibilityLabel={`Remover ${item.show.name} dos favoritos`}
            onPress={() => void toggleFavorite(item.show)}
          />
        }
      />
    ),
    [openDetail, toggleFavorite],
  );

  return (
    <FlatList
      data={favorites}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        syncError ? <InlineNotice message={syncError} onAction={() => void retrySync()} /> : null
      }
      // RF05 - estado vazio amigavel quando nao ha favoritos.
      ListEmptyComponent={
        <EmptyView
          icon="heart-outline"
          title="Nenhum favorito ainda"
          description="Abra uma série e toque em Favoritar. Ela aparece aqui na hora."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
});
