import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Collection, CollectionEntry, ShowSnapshot } from '../../models/collection';
import type { AppUser } from '../../services/auth/types';
import type { CloudCollection } from '../../services/supabase';
import { CollectionProvider, useCollection } from '../CollectionContext';

const ana: AppUser = { id: 'u-ana', name: 'Ana', email: 'ana@exemplo.com', isCloud: false };
const bia: AppUser = { id: 'u-bia', name: 'Bia', email: 'bia@exemplo.com', isCloud: false };

const office: ShowSnapshot = { id: 526, name: 'The Office', imageMedium: null, genres: ['Comedy'] };
const dark: ShowSnapshot = { id: 17861, name: 'Dark', imageMedium: null, genres: ['Drama'] };

function setup(user: AppUser, cloud: CloudCollection | null = null) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CollectionProvider user={user} cloud={cloud}>
      {children}
    </CollectionProvider>
  );
  return renderHook(() => useCollection(), { wrapper });
}

async function stored(userId: string): Promise<Collection> {
  return JSON.parse((await AsyncStorage.getItem(`@maratona/collection/${userId}`)) ?? '{}');
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CollectionContext', () => {
  it('RF06 - nao fica "pronto" antes de ler o que esta salvo', async () => {
    const { result } = await setup(ana);
    await waitFor(() => expect(result.current.ready).toBe(true));
  });

  it('RF04 - favoritar atualiza o estado global e grava no aparelho', async () => {
    const { result } = await setup(ana);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.toggleFavorite(office);
    });

    expect(result.current.favoriteIds.has(526)).toBe(true);
    expect(result.current.favorites.map((e) => e.show.name)).toEqual(['The Office']);
    expect((await stored('u-ana'))['526'].favorite).toBe(true);
  });

  it('RF07 - assistida com nota, independente do favorito', async () => {
    const { result } = await setup(ana);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.toggleFavorite(office);
      await result.current.markWatched(office, 4);
      await result.current.toggleFavorite(office); // deixa de ser favorita...
    });

    // ...mas continua assistida, com a nota.
    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.watched.map((e) => [e.show.id, e.personalRating])).toEqual([[526, 4]]);
  });

  it('registro sem nenhum marcador e apagado do disco', async () => {
    const { result } = await setup(ana);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.markWatched(office, 5);
      await result.current.unmarkWatched(office);
    });

    expect(await stored('u-ana')).toEqual({});
  });

  it('RF06 - os dados voltam ao "reabrir o app"', async () => {
    const first = await setup(ana);
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => {
      await first.result.current.toggleFavorite(dark);
      await first.result.current.markWatched(office, 3);
    });
    await first.unmount();

    const second = await setup(ana);
    await waitFor(() => expect(second.result.current.ready).toBe(true));
    expect(second.result.current.favoriteIds.has(17861)).toBe(true);
    expect(second.result.current.getEntry(526)?.personalRating).toBe(3);
  });

  it('contas diferentes no mesmo aparelho nao se misturam', async () => {
    const asAna = await setup(ana);
    await waitFor(() => expect(asAna.result.current.ready).toBe(true));
    await act(async () => {
      await asAna.result.current.toggleFavorite(office);
    });
    await asAna.unmount();

    const asBia = await setup(bia);
    await waitFor(() => expect(asBia.result.current.ready).toBe(true));
    expect(asBia.result.current.favorites).toHaveLength(0);
  });

  describe('bonus - nuvem', () => {
    const cloudUser: AppUser = { ...ana, id: 'cloud-ana', isCloud: true };

    function fakeCloud(remote: Collection = {}): CloudCollection & { data: Collection } {
      const data: Collection = { ...remote };
      return {
        data,
        fetchAll: jest.fn(async () => ({ ...data })),
        upsert: jest.fn(async (_userId: string, entry: CollectionEntry) => {
          data[String(entry.show.id)] = entry;
        }),
        remove: jest.fn(async (_userId: string, showId: number) => {
          delete data[String(showId)];
        }),
      };
    }

    it('ao entrar, traz o que estava na nuvem (ex.: de outro aparelho)', async () => {
      const cloud = fakeCloud({
        '17861': { show: dark, favorite: true, watched: false, personalRating: null, updatedAt: 1 },
      });
      const { result } = await setup(cloudUser, cloud);

      await waitFor(() => expect(result.current.favoriteIds.has(17861)).toBe(true));
      expect(cloud.fetchAll).toHaveBeenCalledWith('cloud-ana');
    });

    it('cada alteracao sobe para a nuvem', async () => {
      const cloud = fakeCloud();
      const { result } = await setup(cloudUser, cloud);
      await waitFor(() => expect(result.current.syncing).toBe(false));

      await act(async () => {
        await result.current.markWatched(office, 5);
      });

      expect(cloud.data['526']).toMatchObject({ watched: true, personalRating: 5 });
    });

    it('nuvem fora do ar: avisa, mas o dado ja esta salvo no aparelho', async () => {
      const cloud = fakeCloud();
      cloud.upsert = jest.fn(async () => {
        throw new Error('offline');
      });
      const { result } = await setup(cloudUser, cloud);
      await waitFor(() => expect(result.current.ready).toBe(true));

      await act(async () => {
        await result.current.toggleFavorite(office);
      });

      expect(result.current.syncError).toMatch(/ainda não sincronizada/);
      expect((await stored('cloud-ana'))['526'].favorite).toBe(true);
    });
  });
});
