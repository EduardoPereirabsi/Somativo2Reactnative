import type { ApiSearchResult, ApiShow, Show } from '../models/show';
import { stripHtml } from '../utils/stripHtml';
import { api, ApiError, toApiError } from './api';

export interface ShowsPage {
  shows: Show[];
  /** `true` quando a API sinaliza que nao ha mais paginas (HTTP 404). */
  isLastPage: boolean;
}

/** Converte o JSON da API no modelo de dominio, resolvendo os ausentes. */
export function toShow(raw: ApiShow): Show {
  return {
    id: raw.id,
    name: raw.name?.trim() || 'Sem título',
    genres: raw.genres ?? [],
    status: raw.status ?? null,
    premiered: raw.premiered ?? null,
    language: raw.language ?? null,
    runtime: raw.runtime ?? null,
    rating: raw.rating?.average ?? null,
    imageMedium: raw.image?.medium ?? null,
    imageOriginal: raw.image?.original ?? raw.image?.medium ?? null,
    channel: raw.network?.name ?? raw.webChannel?.name ?? null,
    summary: stripHtml(raw.summary),
  };
}

/**
 * RF01 - uma pagina do indice de series.
 *
 * Na TVMaze cada pagina corresponde a uma faixa de 250 ids; series apagadas
 * deixam buracos, por isso chegam em torno de 240 por pagina. Quando a pagina
 * pedida passa do fim, a API responde 404 - que aqui NAO e erro: e o sinal de
 * que a rolagem infinita chegou ao fim.
 */
export async function fetchShowsPage(
  page: number,
  signal?: AbortSignal,
): Promise<ShowsPage> {
  try {
    const { data } = await api.get<ApiShow[]>('/shows', {
      params: { page },
      signal,
    });
    return { shows: data.map(toShow), isLastPage: data.length === 0 };
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.kind === 'notFound') return { shows: [], isLastPage: true };
    throw apiError;
  }
}

/** RF03 - segunda requisicao: dados completos de uma serie pelo id. */
export async function fetchShow(id: number, signal?: AbortSignal): Promise<Show> {
  try {
    const { data } = await api.get<ApiShow>(`/shows/${id}`, { signal });
    return toShow(data);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * RF08 - busca pelo nome. Devolve a LISTA de resultados (diferente do
 * somativo de Flutter, que navegava direto para o primeiro).
 *
 * Uma busca sem resultados devolve `[]` com HTTP 200 - quem decide a mensagem
 * de "nada encontrado" e a tela.
 */
export async function searchShows(
  query: string,
  signal?: AbortSignal,
): Promise<Show[]> {
  const term = query.trim();
  if (!term) throw new ApiError('Digite o nome de uma série para buscar.', 'unknown');

  try {
    const { data } = await api.get<ApiSearchResult[]>('/search/shows', {
      params: { q: term },
      signal,
    });
    return data.map((result) => toShow(result.show));
  } catch (error) {
    throw toApiError(error);
  }
}
