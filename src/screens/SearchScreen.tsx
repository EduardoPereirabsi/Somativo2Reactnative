import { useCallback, type ReactElement } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ShowRow } from '../components/ShowRow';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { TextField } from '../components/TextField';
import { useOpenDetail } from '../hooks/useOpenDetail';
import { useShowSearch } from '../hooks/useShowSearch';
import type { Show } from '../models/show';
import { colors, MIN_TOUCH, spacing } from '../theme/colors';

const keyExtractor = (show: Show) => String(show.id);

/**
 * RF08 - Busca.
 *
 * Diferente do somativo de Flutter: os resultados aparecem numa LISTA, e e
 * tocando num deles que se abre a Tela de Detalhes.
 */
export function SearchScreen() {
  const search = useShowSearch();
  const openDetail = useOpenDetail();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Show>) => <ShowRow show={item} onPress={openDetail} />,
    [openDetail],
  );

  // Buscar fecha o teclado: a lista de resultados aparece inteira.
  const runSearch = () => {
    Keyboard.dismiss();
    void search.submit();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        {/* TextInput CONTROLADO: o valor vem do estado (value + onChangeText). */}
        <TextField
          label="Nome da série"
          placeholder="Ex.: The Office"
          value={search.query}
          onChangeText={search.setQuery}
          onSubmitEditing={runSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton
          label="Buscar"
          icon="search"
          onPress={runSearch}
          loading={search.state.status === 'loading'}
        />
      </View>

      {search.state.status === 'success' && search.genres.length > 1 ? (
        <GenreFilter genres={search.genres} selected={search.genre} onSelect={search.setGenre} />
      ) : null}

      <SearchContent search={search} renderItem={renderItem} />
    </View>
  );
}

type SearchHook = ReturnType<typeof useShowSearch>;

function SearchContent({
  search,
  renderItem,
}: {
  search: SearchHook;
  renderItem: (info: ListRenderItemInfo<Show>) => ReactElement;
}) {
  const { state } = search;

  switch (state.status) {
    case 'idle':
      return (
        <EmptyView
          icon="search-outline"
          title="Encontre uma série"
          description="Digite um nome e toque em Buscar."
        />
      );
    case 'invalid':
      return <EmptyView icon="create-outline" title="Faltou o nome" description={state.message} />;
    case 'loading':
      return <LoadingView message={`Buscando “${state.term}”...`} />;
    case 'error':
      return <ErrorView message={state.error} onRetry={() => void search.submit()} />;
    case 'empty':
      // RF08 - mensagem clara quando a busca nao retorna nada.
      return (
        <EmptyView
          icon="sad-outline"
          title="Nenhuma série encontrada"
          description={`Não achamos nada para “${state.term}”. Confira a grafia ou tente outro nome.`}
        />
      );
    case 'success':
      return (
        <FlatList
          data={search.visibleResults}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.results}
          ListHeaderComponent={
            <Text style={styles.count} accessibilityLiveRegion="polite">
              {`${search.visibleResults.length} de ${state.results.length} resultados para “${state.term}”`}
            </Text>
          }
          ListEmptyComponent={
            <EmptyView
              icon="filter-outline"
              title="Nada neste gênero"
              description="Nenhum resultado tem esse gênero. Escolha outro filtro."
            />
          }
        />
      );
  }
}

interface GenreFilterProps {
  genres: string[];
  selected: string | null;
  onSelect: (genre: string | null) => void;
}

/** Filtro local por genero sobre os resultados (sem nova requisicao). */
function GenreFilter({ genres, selected, onSelect }: GenreFilterProps) {
  const options: (string | null)[] = [null, ...genres];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Todo ScrollView nasce com flexGrow/flexShrink 1: sem isso a faixa de
      // filtros divide a altura com a lista e os chips saem cortados.
      style={styles.filterBar}
      contentContainerStyle={styles.filters}
      accessibilityLabel="Filtrar resultados por gênero"
    >
      {options.map((genre) => {
        const active = genre === selected;
        const label = genre ?? 'Todos';
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(genre)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Filtro ${label}`}
            accessibilityState={{ selected: active }}
            style={[styles.filter, active && styles.filterActive]}
          >
            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.md, gap: spacing.sm },
  filterBar: { flexGrow: 0, flexShrink: 0 },
  filters: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  filter: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: colors.onPrimary },
  results: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  count: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.xs },
});
