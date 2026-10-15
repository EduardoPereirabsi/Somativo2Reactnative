import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  clampRating,
  isEmptyEntry,
  mergeCollections,
  sortedEntries,
  toSnapshot,
  type Collection,
  type CollectionEntry,
  type ShowSnapshot,
} from '../models/collection';
import type { Show } from '../models/show';
import type { AppUser } from '../services/auth/types';
import { loadCollection, saveCollection } from '../services/storage';
import { supabaseCollection, type CloudCollection } from '../services/supabase';

type ShowLike = Show | ShowSnapshot;

interface CollectionContextValue {
  /** RF06 - `false` enquanto os dados salvos ainda estao sendo lidos. */
  ready: boolean;
  syncing: boolean;
  syncError: string | null;
  favorites: CollectionEntry[];
  watched: CollectionEntry[];
  favoriteIds: ReadonlySet<number>;
  getEntry(showId: number): CollectionEntry | undefined;
  toggleFavorite(show: ShowLike): Promise<boolean>;
  /** Marca como assistido. A nota (1 a 5) e opcional e pode vir depois. */
  markWatched(show: ShowLike, rating?: number | null): Promise<void>;
  unmarkWatched(show: ShowLike): Promise<void>;
  retrySync(): Promise<void>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

interface CollectionProviderProps {
  children: ReactNode;
  user: AppUser | null;
  /** Injetavel nos testes; em producao vem do .env (ou `null` = so local). */
  cloud?: CloudCollection | null;
}

/**
 * RF04 + RF05 + RF06 + RF07 - a colecao pessoal do usuario.
 *
 * IMPORTANTE: este provider e montado com `key={user.id}` (ver App.tsx).
 * Quando o usuario troca, o React descarta o provider inteiro e cria outro
 * com estado zerado. E a forma recomendada pela documentacao do React para
 * "resetar o estado quando uma prop muda" - sem um useEffect limpando tudo
 * a mao, e sem nenhum risco de os favoritos de uma conta vazarem para outra.
 *
 * Estrategia de gravacao: LOCAL-FIRST. A tela responde na hora (atualizacao
 * otimista), o AsyncStorage grava em seguida, e so depois a nuvem e tentada.
 * Se a nuvem falhar, o dado ja esta salvo no aparelho.
 */
export function CollectionProvider({
  children,
  user,
  cloud = supabaseCollection,
}: CollectionProviderProps) {
  const useCloud = Boolean(user?.isCloud && cloud);

  const [entries, setEntries] = useState<Collection>({});
  // Sem usuario nao ha nada a carregar, entao ja nasce pronto.
  const [ready, setReady] = useState(user === null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Espelho sincrono do estado. Permite calcular a proxima colecao dentro de
  // uma acao sem esperar o React aplicar o setState anterior - dois toques
  // rapidos em sequencia nao se atropelam.
  const entriesRef = useRef<Collection>({});
  const mountedRef = useRef(true);

  const commit = useCallback((next: Collection) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  /** Bonus RF06 - reconcilia o que esta no aparelho com o que esta na nuvem. */
  const syncWithCloud = useCallback(
    async (local: Collection) => {
      if (!user || !cloud || !useCloud) return;
      setSyncing(true);
      setSyncError(null);
      try {
        const remote = await cloud.fetchAll(user.id);
        const { merged, toUpload } = mergeCollections(local, remote);
        if (!mountedRef.current) return;
        commit(merged);
        await saveCollection(user.id, merged);
        await Promise.all(toUpload.map((entry) => cloud.upsert(user.id, entry)));
      } catch {
        if (mountedRef.current) {
          setSyncError(
            'Não foi possível sincronizar com a nuvem. Seus dados continuam salvos neste aparelho.',
          );
        }
      } finally {
        if (mountedRef.current) setSyncing(false);
      }
    },
    [user, cloud, useCloud, commit],
  );

  // RF06 - carga inicial dos dados persistidos, dentro de um useEffect.
  useEffect(() => {
    mountedRef.current = true;
    // Flag local desta execucao do efeito. No StrictMode o React monta,
    // desmonta e monta de novo em desenvolvimento: sem isto, a primeira
    // leitura (ja descartada) ainda aplicaria o resultado dela.
    let active = true;

    if (user) {
      loadCollection(user.id)
        .then((local) => {
          if (!active) return;
          commit(local);
          setReady(true);
          return syncWithCloud(local);
        })
        .catch(() => {
          // Falha de leitura do disco nao pode travar o app no splash.
          if (active) setReady(true);
        });
    }

    // Cleanup: se o provider desmontar (logout, troca de conta) antes da
    // leitura terminar, as respostas atrasadas sao ignoradas.
    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [user, commit, syncWithCloud]);

  /**
   * Ponto UNICO de mutacao: memoria -> tela -> disco -> nuvem, nessa ordem.
   */
  const write = useCallback(
    async (
      show: ShowLike,
      patch: Partial<Pick<CollectionEntry, 'favorite' | 'watched' | 'personalRating'>>,
    ) => {
      if (!user) return;
      const key = String(show.id);
      const current: CollectionEntry = entriesRef.current[key] ?? {
        show: toSnapshot(show),
        favorite: false,
        watched: false,
        personalRating: null,
        updatedAt: 0,
      };

      const updated: CollectionEntry = {
        ...current,
        ...patch,
        // Atualiza o snapshot: se veio da busca, agora temos dados completos.
        show: toSnapshot(show),
        updatedAt: Date.now(),
      };

      const next: Collection = { ...entriesRef.current };
      if (isEmptyEntry(updated)) delete next[key];
      else next[key] = updated;

      commit(next); // a tela responde na hora
      await saveCollection(user.id, next); // garante o dado no aparelho

      if (!useCloud || !cloud) return;
      try {
        if (isEmptyEntry(updated)) await cloud.remove(user.id, show.id);
        else await cloud.upsert(user.id, updated);
        if (mountedRef.current) setSyncError(null);
      } catch {
        if (mountedRef.current) {
          setSyncError('Alteração salva neste aparelho, mas ainda não sincronizada.');
        }
      }
    },
    [user, useCloud, cloud, commit],
  );

  const toggleFavorite = useCallback(
    async (show: ShowLike) => {
      const next = !entriesRef.current[String(show.id)]?.favorite;
      await write(show, { favorite: next });
      return next;
    },
    [write],
  );

  const markWatched = useCallback(
    (show: ShowLike, rating?: number | null) =>
      write(show, {
        watched: true,
        personalRating: rating == null ? null : clampRating(rating),
      }),
    [write],
  );

  const unmarkWatched = useCallback(
    (show: ShowLike) => write(show, { watched: false, personalRating: null }),
    [write],
  );

  const retrySync = useCallback(
    () => syncWithCloud(entriesRef.current),
    [syncWithCloud],
  );

  const favorites = useMemo(() => sortedEntries(entries, (e) => e.favorite), [entries]);
  const watched = useMemo(() => sortedEntries(entries, (e) => e.watched), [entries]);
  const favoriteIds = useMemo(
    () => new Set(favorites.map((entry) => entry.show.id)),
    [favorites],
  );
  const getEntry = useCallback((showId: number) => entries[String(showId)], [entries]);

  const value = useMemo<CollectionContextValue>(
    () => ({
      ready,
      syncing,
      syncError,
      favorites,
      watched,
      favoriteIds,
      getEntry,
      toggleFavorite,
      markWatched,
      unmarkWatched,
      retrySync,
    }),
    [
      ready,
      syncing,
      syncError,
      favorites,
      watched,
      favoriteIds,
      getEntry,
      toggleFavorite,
      markWatched,
      unmarkWatched,
      retrySync,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionContextValue {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection precisa estar dentro de <CollectionProvider>.');
  }
  return context;
}

/** RF04 - hook customizado pedido no enunciado: so o que diz respeito a favoritos. */
export function useFavorites() {
  const { ready, favorites, favoriteIds, toggleFavorite } = useCollection();
  const isFavorite = useCallback((showId: number) => favoriteIds.has(showId), [favoriteIds]);
  return { ready, favorites, favoriteIds, isFavorite, toggleFavorite };
}

/** RF07 - itens assistidos, com a nota pessoal de 1 a 5. */
export function useWatched() {
  const { ready, watched, getEntry, markWatched, unmarkWatched } = useCollection();
  return { ready, watched, getEntry, markWatched, unmarkWatched };
}
