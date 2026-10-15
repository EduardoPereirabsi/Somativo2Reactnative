import {
  clampRating,
  mergeCollections,
  sortedEntries,
  type Collection,
  type CollectionEntry,
} from '../collection';

function entry(id: number, updatedAt: number, patch: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    show: { id, name: `Serie ${id}`, imageMedium: null, genres: [] },
    favorite: true,
    watched: false,
    personalRating: null,
    updatedAt,
    ...patch,
  };
}

describe('mergeCollections (bonus - local x nuvem)', () => {
  it('vence a versao mais recente de cada serie', () => {
    const local: Collection = { '1': entry(1, 200, { favorite: false, watched: true }) };
    const remote: Collection = { '1': entry(1, 100) };

    const { merged, toUpload } = mergeCollections(local, remote);

    expect(merged['1'].watched).toBe(true);
    expect(toUpload.map((e) => e.show.id)).toEqual([1]);
  });

  it('mantem o que so existe de um lado e envia so o que a nuvem nao tem', () => {
    const local: Collection = { '1': entry(1, 100) };
    const remote: Collection = { '2': entry(2, 100) };

    const { merged, toUpload } = mergeCollections(local, remote);

    expect(Object.keys(merged).sort()).toEqual(['1', '2']);
    expect(toUpload.map((e) => e.show.id)).toEqual([1]);
  });

  it('nao reenvia o que a nuvem ja tem mais novo', () => {
    const local: Collection = { '1': entry(1, 100) };
    const remote: Collection = { '1': entry(1, 300, { watched: true }) };

    const { merged, toUpload } = mergeCollections(local, remote);

    expect(merged['1'].watched).toBe(true);
    expect(toUpload).toEqual([]);
  });
});

describe('utilitarios da colecao', () => {
  it('ordena da mais recente para a mais antiga', () => {
    const collection: Collection = { '1': entry(1, 100), '2': entry(2, 300), '3': entry(3, 200) };
    expect(sortedEntries(collection, (e) => e.favorite).map((e) => e.show.id)).toEqual([2, 3, 1]);
  });

  it('a nota fica sempre entre 1 e 5 (RF07)', () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(9)).toBe(5);
    expect(clampRating(3.6)).toBe(4);
  });
});
