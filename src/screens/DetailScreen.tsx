import { useCallback, useLayoutEffect } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { RatingStars } from '../components/RatingStars';
import { ShowImage } from '../components/ShowImage';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useFavorites, useWatched } from '../contexts/CollectionContext';
import { useFetch } from '../hooks/useFetch';
import type { Show } from '../models/show';
import type { DetailScreenProps } from '../navigation/types';
import { fetchShow } from '../services/tvmaze';
import { colors, spacing } from '../theme/colors';

/**
 * RF02 + RF03 - Tela de Detalhes.
 *
 * Recebe so o `id` por `route.params` e faz a SEGUNDA requisicao (Axios)
 * para buscar os dados completos. O `fetcher` fica num `useCallback` com o
 * id como dependencia: enquanto o id for o mesmo, favoritar e re-renderizar
 * a tela nao dispara nenhuma nova chamada a API.
 */
export function DetailScreen({ route, navigation }: DetailScreenProps) {
  const { id, name } = route.params;

  const fetcher = useCallback((signal: AbortSignal) => fetchShow(id, signal), [id]);
  const result = useFetch(fetcher);
  const loadedName = result.status === 'success' ? result.data.name : undefined;

  // RF02 - titulo do header definido dinamicamente com o nome da serie.
  // `useLayoutEffect` atualiza antes da pintura: o titulo nunca "pisca".
  useLayoutEffect(() => {
    navigation.setOptions({ title: loadedName ?? name ?? 'Detalhes' });
  }, [navigation, loadedName, name]);

  if (result.status === 'loading') return <LoadingView message="Carregando os detalhes..." />;
  if (result.status === 'error') {
    return <ErrorView message={result.error} onRetry={result.reload} />;
  }
  return <DetailBody show={result.data} />;
}

function DetailBody({ show }: { show: Show }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getEntry, markWatched, unmarkWatched } = useWatched();

  const favorite = isFavorite(show.id);
  const entry = getEntry(show.id);
  const watched = entry?.watched ?? false;
  const rating = entry?.personalRating ?? null;

  const onToggleFavorite = async () => {
    const nowFavorite = await toggleFavorite(show);
    AccessibilityInfo.announceForAccessibility(
      nowFavorite ? `${show.name} adicionada aos favoritos` : `${show.name} removida dos favoritos`,
    );
  };

  const onToggleWatched = async () => {
    if (watched) await unmarkWatched(show);
    else await markWatched(show, rating);
    AccessibilityInfo.announceForAccessibility(
      watched ? `${show.name} desmarcada como assistida` : `${show.name} marcada como assistida`,
    );
  };

  // Dar uma nota tambem marca como assistida: nao faz sentido avaliar o que
  // nao foi visto.
  const onRate = (value: number) => {
    void markWatched(show, value);
    AccessibilityInfo.announceForAccessibility(`Nota ${value} de 5 para ${show.name}`);
  };

  // RF03 - capa maior, centralizada, sem passar de 55% da altura da tela.
  const posterHeight = Math.min((width - spacing.lg * 2) * 1.5, height * 0.55);

  const year = show.premiered?.slice(0, 4);
  const meta = [year, show.status && translateStatus(show.status), show.channel]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={styles.screen}
      // O Android desenha o app ate a borda da tela: o fim do conteudo
      // precisa sobrar acima da barra de navegacao do sistema.
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      <ShowImage
        uri={show.imageOriginal}
        name={show.name}
        style={[styles.poster, { height: posterHeight, width: (posterHeight * 2) / 3 }]}
      />

      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {show.name}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {show.genres.length > 0 ? (
          <View style={styles.chips} accessible accessibilityLabel={`Gêneros: ${show.genres.join(', ')}`}>
            {show.genres.map((genre) => (
              <Text key={genre} style={styles.chip}>
                {genre}
              </Text>
            ))}
          </View>
        ) : null}

        {/* RF04 - favoritar. O rotulo E o estado mudam (RF10). */}
        <PrimaryButton
          label={favorite ? 'Favorita' : 'Favoritar'}
          icon={favorite ? 'heart' : 'heart-outline'}
          variant={favorite ? 'filled' : 'outline'}
          selected={favorite}
          accessibilityLabel={
            favorite ? `Remover ${show.name} dos favoritos` : `Adicionar ${show.name} aos favoritos`
          }
          onPress={onToggleFavorite}
        />

        {/* RF07 - marcar como assistida + nota pessoal de 1 a 5. */}
        <View style={styles.section}>
          <PrimaryButton
            label={watched ? 'Assistida' : 'Marcar como assistida'}
            icon={watched ? 'eye' : 'eye-outline'}
            variant={watched ? 'filled' : 'outline'}
            selected={watched}
            accessibilityLabel={
              watched
                ? `Desmarcar ${show.name} como assistida`
                : `Marcar ${show.name} como assistida`
            }
            onPress={onToggleWatched}
          />
          <Text style={styles.label}>Sua nota</Text>
          <RatingStars value={rating} onChange={onRate} />
          <Text style={styles.hint}>
            {rating ? `Você deu ${rating} de 5.` : 'Toque numa estrela para dar uma nota de 1 a 5.'}
          </Text>
        </View>

        {/* RF03 - sinopse ja limpa: a API manda HTML, a tela mostra texto. */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Sinopse
        </Text>
        <Text style={styles.summary}>{show.summary || 'Sinopse não disponível.'}</Text>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Ficha
        </Text>
        <Attribute label="Nota TVMaze" value={show.rating ? `${show.rating} / 10` : null} />
        <Attribute label="Estreia" value={formatDate(show.premiered)} />
        <Attribute label="Situação" value={show.status && translateStatus(show.status)} />
        <Attribute label="Emissora" value={show.channel} />
        <Attribute label="Idioma" value={show.language} />
        <Attribute label="Duração" value={show.runtime ? `${show.runtime} min por episódio` : null} />

        {/* A licenca da API (CC BY-SA) pede o credito a fonte. */}
        <Text style={styles.credit}>Dados e imagens: TVmaze.com (CC BY-SA)</Text>
      </View>
    </ScrollView>
  );
}

/** Linha da ficha. Vira um elemento so para o leitor de tela: "Idioma: English". */
function Attribute({ label, value }: { label: string; value: string | null }) {
  const text = value || 'Não informado';
  return (
    <View style={styles.attribute} accessible accessibilityLabel={`${label}: ${text}`}>
      <Text style={styles.attributeLabel}>{label}</Text>
      <Text style={styles.attributeValue}>{text}</Text>
    </View>
  );
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    Running: 'Em exibição',
    Ended: 'Encerrada',
    'To Be Determined': 'A definir',
    'In Development': 'Em desenvolvimento',
  };
  return map[status] ?? status;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  poster: { alignSelf: 'center', marginTop: spacing.lg, borderRadius: 14 },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    fontSize: 13,
    overflow: 'hidden',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  summary: { color: colors.text, fontSize: 16, lineHeight: 24 },
  attribute: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
  attributeLabel: { color: colors.textMuted, fontSize: 13 },
  attributeValue: { color: colors.text, fontSize: 16 },
  credit: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
});
