import { useScrollToTop } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { ShowCard } from '../components/ShowCard';
import { EmptyView, ErrorView, InlineNotice, LoadingView } from '../components/StateViews';
import { useFavorites, useWatched } from '../contexts/CollectionContext';
import { useInfiniteShows } from '../hooks/useInfiniteShows';
import { useOpenDetail } from '../hooks/useOpenDetail';
import type { Show } from '../models/show';
import { colors, spacing } from '../theme/colors';

const PADDING = spacing.md;
const GAP = spacing.md;

/**
 * Chave unica e estavel (RF01): o id da serie nunca muda e nunca se repete
 * - o hook ja descarta ids duplicados ao anexar paginas.
 */
const keyExtractor = (show: Show) => String(show.id);

/** Colunas pela largura: 2 no celular, mais em tablets. */
function columnsFor(width: number): number {
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

/** RF01 - Tela Principal: grade com rolagem infinita e pull-to-refresh. */
export function CatalogScreen() {
  const { width } = useWindowDimensions();
  const columns = columnsFor(width);
  const itemWidth = (width - PADDING * 2 - GAP * (columns - 1)) / columns;

  const catalog = useInfiniteShows();
  const { favoriteIds } = useFavorites();
  const { watched } = useWatched();
  const openDetail = useOpenDetail();

  // Tocar de novo na aba "Catalogo" volta ao topo da lista.
  const listRef = useRef<FlatList<Show>>(null);
  useScrollToTop(listRef);

  const watchedIds = useMemo(() => new Set(watched.map((entry) => entry.show.id)), [watched]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Show>) => (
      <ShowCard
        show={item}
        width={itemWidth}
        isFavorite={favoriteIds.has(item.id)}
        isWatched={watchedIds.has(item.id)}
        onPress={openDetail}
      />
    ),
    [itemWidth, favoriteIds, watchedIds, openDetail],
  );

  // RF09 - a primeira pagina decide a tela inteira.
  if (catalog.status === 'loading') {
    return <LoadingView message="Carregando o catálogo..." />;
  }
  if (catalog.status === 'error') {
    return <ErrorView message={catalog.error ?? ''} onRetry={catalog.retry} />;
  }

  return (
    <FlatList
      ref={listRef}
      testID="catalog-list"
      data={catalog.items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // `numColumns` nao pode mudar com a lista montada: a `key` remonta a
      // FlatList quando a tela gira e o numero de colunas muda.
      key={columns}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.content}
      style={styles.list}
      // RF01 - rolagem infinita: quando faltar meia tela para o fim, pede
      // a proxima pagina e ANEXA a lista existente.
      onEndReached={catalog.loadMore}
      onEndReachedThreshold={0.5}
      // RF01 - pull-to-refresh: puxar para baixo recarrega a primeira pagina.
      refreshing={catalog.refreshing}
      onRefresh={catalog.refresh}
      // Recalcula as celulas quando um favorito muda; o memo do ShowCard
      // garante que so o card afetado renderiza de novo.
      extraData={favoriteIds}
      initialNumToRender={10}
      ListHeaderComponent={
        catalog.refreshError ? (
          <InlineNotice message={catalog.refreshError} onAction={catalog.refresh} />
        ) : null
      }
      ListFooterComponent={
        <CatalogFooter
          count={catalog.items.length}
          loadingMore={catalog.loadingMore}
          loadMoreError={catalog.loadMoreError}
          isLastPage={catalog.isLastPage}
          onRetry={catalog.retryMore}
        />
      }
      ListEmptyComponent={
        <EmptyView
          icon="tv-outline"
          title="Nenhuma série por aqui"
          description="O catálogo voltou vazio. Puxe a lista para baixo para recarregar."
        />
      }
    />
  );
}

interface CatalogFooterProps {
  count: number;
  loadingMore: boolean;
  loadMoreError: string | null;
  isLastPage: boolean;
  onRetry: () => void;
}

/**
 * RF09 - rodape da lista (ListFooterComponent).
 *
 * Proxima pagina carregando: ActivityIndicator. Falhou: aviso com
 * "Tentar novamente" - os itens ja carregados continuam todos na tela.
 */
function CatalogFooter({ count, loadingMore, loadMoreError, isLastPage, onRetry }: CatalogFooterProps) {
  if (loadingMore) {
    return (
      <View
        style={styles.footer}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando mais séries"
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.footerText}>Carregando mais séries...</Text>
      </View>
    );
  }

  if (loadMoreError) {
    return <InlineNotice message={loadMoreError} onAction={onRetry} />;
  }

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText} accessibilityLiveRegion="polite">
        {isLastPage
          ? `Fim do catálogo · ${count} séries`
          : `${count} séries carregadas · role para ver mais`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  content: { padding: PADDING, gap: GAP, flexGrow: 1 },
  row: { gap: GAP },
  footer: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  footerText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
