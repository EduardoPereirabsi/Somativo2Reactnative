import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Show } from '../models/show';
import { isCanceled, toApiError } from '../services/api';
import { searchShows } from '../services/tvmaze';

export type SearchState =
  | { status: 'idle' }
  | { status: 'invalid'; message: string }
  | { status: 'loading'; term: string }
  | { status: 'error'; term: string; error: string }
  | { status: 'empty'; term: string }
  | { status: 'success'; term: string; results: Show[] };

/** Quantos generos aparecem como filtro, no maximo. */
const MAX_GENRE_FILTERS = 6;

/**
 * RF08 - busca com TextInput controlado + filtro por genero.
 *
 * `query` e o que esta digitado (controlado por `value` + `onChangeText`);
 * a requisicao so sai quando o usuario toca em "Buscar". Uma busca nova
 * cancela a anterior, entao uma resposta lenta nunca sobrescreve uma rapida.
 */
export function useShowSearch(
  search: (term: string, signal?: AbortSignal) => Promise<Show[]> = searchShows,
) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [genre, setGenre] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Cleanup ao sair da tela: cancela a busca que estiver no ar.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = useCallback(async () => {
    const term = query.trim();
    if (!term) {
      setState({ status: 'invalid', message: 'Digite o nome de uma série para buscar.' });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setGenre(null);
    setState({ status: 'loading', term });

    try {
      const results = await search(term, controller.signal);
      if (controller.signal.aborted) return;
      setState(
        results.length > 0
          ? { status: 'success', term, results }
          : { status: 'empty', term },
      );
    } catch (error) {
      if (isCanceled(error)) return;
      setState({ status: 'error', term, error: toApiError(error).message });
    }
  }, [query, search]);

  const results = useMemo(
    () => (state.status === 'success' ? state.results : []),
    [state],
  );

  /** Generos mais frequentes entre os resultados - viram os chips de filtro. */
  const genres = useMemo(() => {
    const count = new Map<string, number>();
    for (const show of results) {
      for (const g of show.genres) count.set(g, (count.get(g) ?? 0) + 1);
    }
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_GENRE_FILTERS)
      .map(([name]) => name);
  }, [results]);

  /** Resultados apos o filtro de genero (filtro local, sem nova requisicao). */
  const visibleResults = useMemo(
    () => (genre ? results.filter((show) => show.genres.includes(genre)) : results),
    [results, genre],
  );

  return { query, setQuery, submit, state, genres, genre, setGenre, visibleResults };
}
