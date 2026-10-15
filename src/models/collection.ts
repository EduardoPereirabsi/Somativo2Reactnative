import type { Show } from './show';

/**
 * Copia reduzida da serie, guardada junto dos marcadores.
 *
 * E o que permite as telas de Favoritos e Assistidos abrirem sem internet:
 * elas leem este snapshot em vez de consultar a API item por item.
 */
export interface ShowSnapshot {
  id: number;
  name: string;
  imageMedium: string | null;
  genres: string[];
}

/**
 * Um item da colecao pessoal (RF04, RF06, RF07).
 *
 * Favorito e assistido ficam no MESMO registro porque descrevem a mesma
 * serie: duas listas separadas poderiam sair de sincronia.
 */
export interface CollectionEntry {
  show: ShowSnapshot;
  favorite: boolean;
  watched: boolean;
  /** Nota pessoal de 1 a 5 (RF07). So faz sentido quando `watched`. */
  personalRating: number | null;
  /** Epoch em ms. Resolve conflito local x nuvem: vence o mais recente. */
  updatedAt: number;
}

/** Colecao indexada pelo id da serie, como string (chave de JSON). */
export type Collection = Record<string, CollectionEntry>;

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export function toSnapshot(show: Show | ShowSnapshot): ShowSnapshot {
  return {
    id: show.id,
    name: show.name,
    imageMedium: show.imageMedium,
    genres: show.genres,
  };
}

/** Um registro sem nenhum marcador nao precisa existir. */
export function isEmptyEntry(entry: CollectionEntry): boolean {
  return !entry.favorite && !entry.watched;
}

export function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value)));
}

/** Lista de entradas filtrada e ordenada da mais recente para a mais antiga. */
export function sortedEntries(
  collection: Collection,
  predicate: (entry: CollectionEntry) => boolean,
): CollectionEntry[] {
  return Object.values(collection)
    .filter(predicate)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Reconciliacao local x nuvem por *last-write-wins* (bonus RF06).
 *
 * Para cada serie presente dos dois lados vence o `updatedAt` mais recente.
 * O que so existe de um lado e mantido. Devolve tambem o que a nuvem ainda
 * nao tem (ou tem desatualizado), para ser enviado em seguida.
 *
 * Funcao pura - sem rede nem disco -, por isso testavel isoladamente.
 */
export function mergeCollections(
  local: Collection,
  remote: Collection,
): { merged: Collection; toUpload: CollectionEntry[] } {
  const merged: Collection = { ...remote };
  const toUpload: CollectionEntry[] = [];

  for (const [id, localEntry] of Object.entries(local)) {
    const remoteEntry = remote[id];
    if (!remoteEntry || localEntry.updatedAt > remoteEntry.updatedAt) {
      merged[id] = localEntry;
      toUpload.push(localEntry);
    }
  }
  return { merged, toUpload };
}
