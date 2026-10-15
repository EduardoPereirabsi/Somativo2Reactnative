import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { Show } from '../models/show';
import { isCanceled, toApiError } from '../services/api';
import { fetchShowsPage, type ShowsPage } from '../services/tvmaze';

type Mode = 'initial' | 'retry' | 'more' | 'refresh';

export interface InfiniteShowsState {
  items: Show[];
  /** Estado da PRIMEIRA pagina - decide se a tela inteira e spinner/erro. */
  status: 'loading' | 'error' | 'ready';
  error: string | null;
  /** Proxima pagina em andamento: spinner no rodape da lista. */
  loadingMore: boolean;
  /** Falha na proxima pagina: os itens ja carregados CONTINUAM na tela. */
  loadMoreError: string | null;
  refreshing: boolean;
  refreshError: string | null;
  isLastPage: boolean;
}

type Action =
  | { type: 'start'; mode: Mode }
  | { type: 'success'; mode: Mode; page: ShowsPage }
  | { type: 'failure'; mode: Mode; error: string };

export const initialInfiniteState: InfiniteShowsState = {
  items: [],
  status: 'loading',
  error: null,
  loadingMore: false,
  loadMoreError: null,
  refreshing: false,
  refreshError: null,
  isLastPage: false,
};

/** Remove ids repetidos - o `keyExtractor` da FlatList exige chaves unicas. */
function uniqueById(shows: Show[], alreadySeen = new Set<number>()): Show[] {
  const seen = new Set(alreadySeen);
  return shows.filter((show) => {
    if (seen.has(show.id)) return false;
    seen.add(show.id);
    return true;
  });
}

/**
 * Todas as transicoes de estado do catalogo num lugar so. Cada combinacao
 * de (acao, modo) tem uma resposta explicita - nada fica implicito.
 */
export function infiniteReducer(
  state: InfiniteShowsState,
  action: Action,
): InfiniteShowsState {
  switch (action.type) {
    case 'start':
      if (action.mode === 'more') return { ...state, loadingMore: true, loadMoreError: null };
      if (action.mode === 'refresh') return { ...state, refreshing: true, refreshError: null };
      return { ...state, status: 'loading', error: null };

    case 'success':
      if (action.mode === 'more') {
        const known = new Set(state.items.map((show) => show.id));
        return {
          ...state,
          // ANEXA a proxima pagina a lista existente (RF01).
          items: [...state.items, ...uniqueById(action.page.shows, known)],
          loadingMore: false,
          isLastPage: action.page.isLastPage,
        };
      }
      // Primeira pagina, nova tentativa ou pull-to-refresh: recomeca do zero.
      return {
        ...initialInfiniteState,
        status: 'ready',
        items: uniqueById(action.page.shows),
        isLastPage: action.page.isLastPage,
      };

    case 'failure':
      if (action.mode === 'more') {
        return { ...state, loadingMore: false, loadMoreError: action.error };
      }
      if (action.mode === 'refresh') {
        // O refresh falhou, mas a lista antiga continua valida e visivel.
        return { ...state, refreshing: false, refreshError: action.error };
      }
      return { ...state, status: 'error', error: action.error };
  }
}

/**
 * RF01 - catalogo com rolagem infinita e pull-to-refresh.
 *
 * Por que `useReducer` + refs, e nao so `useState`:
 *
 *  - O `onEndReached` da FlatList costuma disparar varias vezes seguidas
 *    perto do fim. O estado do React so atualiza no proximo render, entao
 *    uma flag em `useState` nao trava a segunda chamada a tempo. O
 *    `inFlightRef` e lido e escrito na hora - ele e a trava.
 *  - Cada requisicao recebe um numero. Se um pull-to-refresh comecar enquanto
 *    uma pagina ainda chega, a resposta antiga e descartada pelo numero.
 */
export function useInfiniteShows(
  fetchPage: (page: number, signal?: AbortSignal) => Promise<ShowsPage> = fetchShowsPage,
) {
  const [state, dispatch] = useReducer(infiniteReducer, initialInfiniteState);

  const nextPageRef = useRef(0);
  const lastPageRef = useRef(false);
  const inFlightRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  // Depois de um erro no rodape, NAO tentamos de novo sozinhos a cada
  // rolagem: so quando o usuario toca em "Tentar novamente".
  const pausedRef = useRef(false);

  const load = useCallback(
    async (mode: Mode) => {
      if (mode === 'more') {
        if (inFlightRef.current || lastPageRef.current || pausedRef.current) return;
      } else {
        // Primeira carga, nova tentativa e refresh substituem o que estiver
        // em andamento.
        inFlightRef.current?.abort();
      }

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      inFlightRef.current = controller;
      const page = mode === 'more' ? nextPageRef.current : 0;

      // A primeira carga ja nasce em 'loading' no estado inicial.
      if (mode !== 'initial') dispatch({ type: 'start', mode });

      try {
        const result = await fetchPage(page, controller.signal);
        if (requestId !== requestIdRef.current) return;
        nextPageRef.current = page + 1;
        lastPageRef.current = result.isLastPage;
        dispatch({ type: 'success', mode, page: result });
      } catch (error) {
        if (requestId !== requestIdRef.current || isCanceled(error)) return;
        if (mode === 'more') pausedRef.current = true;
        dispatch({ type: 'failure', mode, error: toApiError(error).message });
      } finally {
        if (requestId === requestIdRef.current) inFlightRef.current = null;
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void load('initial');
    // Cleanup: sair da tela cancela a requisicao que estiver no ar.
    return () => inFlightRef.current?.abort();
  }, [load]);

  /** Ligado ao `onEndReached` da FlatList. */
  const loadMore = useCallback(() => void load('more'), [load]);

  /** Botao "Tentar novamente" do rodape. */
  const retryMore = useCallback(() => {
    pausedRef.current = false;
    void load('more');
  }, [load]);

  /** Ligado ao `onRefresh` da FlatList (pull-to-refresh). */
  const refresh = useCallback(() => {
    pausedRef.current = false;
    void load('refresh');
  }, [load]);

  /** Botao "Tentar novamente" da tela de erro inteira. */
  const retry = useCallback(() => void load('retry'), [load]);

  return { ...state, loadMore, retryMore, refresh, retry };
}
