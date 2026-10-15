import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Show } from '../../models/show';
import { ApiError } from '../../services/api';
import type { ShowsPage } from '../../services/tvmaze';
import { useInfiniteShows } from '../useInfiniteShows';

function show(id: number): Show {
  return {
    id,
    name: `Serie ${id}`,
    genres: [],
    status: null,
    premiered: null,
    language: null,
    runtime: null,
    rating: null,
    imageMedium: null,
    imageOriginal: null,
    channel: null,
    summary: '',
  };
}

/** Pagina N com 3 series: ids N*3+1 .. N*3+3. */
function page(n: number, isLastPage = false): ShowsPage {
  return { shows: [1, 2, 3].map((i) => show(n * 3 + i)), isLastPage };
}

describe('useInfiniteShows (RF01 - rolagem infinita)', () => {
  it('carrega a primeira pagina ao montar', async () => {
    const fetchPage = jest.fn(async (n: number) => page(n));
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchPage).toHaveBeenCalledWith(0, expect.any(Object));
    expect(result.current.items.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('ANEXA a proxima pagina a lista existente', async () => {
    const fetchPage = jest.fn(async (n: number) => page(n));
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.loadMore());

    await waitFor(() => expect(result.current.items).toHaveLength(6));
    expect(result.current.items.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('onEndReached disparado varias vezes seguidas pede a pagina UMA vez', async () => {
    let release!: (value: ShowsPage) => void;
    const fetchPage = jest.fn((n: number) =>
      n === 0 ? Promise.resolve(page(0)) : new Promise<ShowsPage>((r) => (release = r)),
    );
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
      result.current.loadMore();
    });

    expect(fetchPage).toHaveBeenCalledTimes(2); // pagina 0 + pagina 1, uma vez so
    expect(result.current.loadingMore).toBe(true);

    await act(async () => release(page(1)));
    await waitFor(() => expect(result.current.loadingMore).toBe(false));
  });

  it('descarta ids repetidos entre paginas (keyExtractor unico)', async () => {
    const fetchPage = jest.fn(async (n: number) =>
      n === 0 ? page(0) : { shows: [show(3), show(4)], isLastPage: false },
    );
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.loadMore());

    await waitFor(() => expect(result.current.items.map((s) => s.id)).toEqual([1, 2, 3, 4]));
  });

  it('para de pedir paginas depois da ultima', async () => {
    const fetchPage = jest.fn(async (n: number) => page(n, n === 1));
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.isLastPage).toBe(true));

    await act(async () => result.current.loadMore());
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('RF09 - API cai no meio da rolagem: itens continuam e aparece "tentar novamente"', async () => {
    const fetchPage = jest
      .fn<Promise<ShowsPage>, [number, AbortSignal?]>()
      .mockResolvedValueOnce(page(0))
      .mockRejectedValueOnce(new ApiError('Sem conexão com a internet.', 'network'))
      .mockResolvedValueOnce(page(1));

    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreError).toBe('Sem conexão com a internet.'));
    expect(result.current.items).toHaveLength(3); // nada se perdeu

    // Rolar de novo NAO martela a API: so o botao tenta outra vez.
    await act(async () => result.current.loadMore());
    expect(fetchPage).toHaveBeenCalledTimes(2);

    await act(async () => result.current.retryMore());
    await waitFor(() => expect(result.current.items).toHaveLength(6));
    expect(result.current.loadMoreError).toBeNull();
  });

  it('pull-to-refresh recarrega a primeira pagina', async () => {
    const fetchPage = jest.fn(async (n: number) => page(n));
    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(6));

    await act(async () => result.current.refresh());

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(fetchPage).toHaveBeenLastCalledWith(0, expect.any(Object));
    expect(result.current.refreshing).toBe(false);
  });

  it('erro na primeira pagina vira tela de erro com nova tentativa', async () => {
    const fetchPage = jest
      .fn<Promise<ShowsPage>, [number, AbortSignal?]>()
      .mockRejectedValueOnce(new ApiError('O serviço de séries está fora do ar.', 'server'))
      .mockResolvedValueOnce(page(0));

    const { result } = await renderHook(() => useInfiniteShows(fetchPage));
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
