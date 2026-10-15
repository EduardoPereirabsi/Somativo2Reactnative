import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { api, ApiError } from '../api';
import { fetchShow, fetchShowsPage, searchShows, toShow } from '../tvmaze';

function httpError(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, data: null, headers: {}, config, statusText: '' } as AxiosResponse;
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
}

const getSpy = jest.spyOn(api, 'get');

afterEach(() => getSpy.mockReset());

describe('toShow - mapeamento defensivo', () => {
  it('serie sem imagem, nota nem emissora nao quebra (placeholder do RF01)', () => {
    const show = toShow({ id: 7, name: '  Serie  ' });
    expect(show).toMatchObject({
      id: 7,
      name: 'Serie',
      genres: [],
      imageMedium: null,
      imageOriginal: null,
      rating: null,
      channel: null,
      summary: '',
    });
  });

  it('usa o streaming quando nao ha emissora de TV', () => {
    expect(toShow({ id: 1, webChannel: { name: 'Netflix' } }).channel).toBe('Netflix');
  });
});

describe('fetchShowsPage (RF01)', () => {
  it('converte a pagina e indica que ha mais paginas', async () => {
    getSpy.mockResolvedValueOnce({ data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] });

    const page = await fetchShowsPage(0);

    expect(getSpy).toHaveBeenCalledWith('/shows', expect.objectContaining({ params: { page: 0 } }));
    expect(page.shows.map((s) => s.name)).toEqual(['A', 'B']);
    expect(page.isLastPage).toBe(false);
  });

  it('404 depois da ultima pagina e FIM, nao erro', async () => {
    getSpy.mockRejectedValueOnce(httpError(404));
    await expect(fetchShowsPage(999)).resolves.toEqual({ shows: [], isLastPage: true });
  });

  it('erro de servidor vira mensagem amigavel (RF09)', async () => {
    getSpy.mockRejectedValueOnce(httpError(503));
    await expect(fetchShowsPage(1)).rejects.toMatchObject({
      kind: 'server',
      message: expect.stringContaining('fora do ar'),
    });
  });
});

describe('fetchShow (RF03)', () => {
  it('limpa o HTML da sinopse', async () => {
    getSpy.mockResolvedValueOnce({ data: { id: 1, name: 'X', summary: '<p><b>Oi</b> mundo</p>' } });
    const show = await fetchShow(1);
    expect(getSpy).toHaveBeenCalledWith('/shows/1', expect.anything());
    expect(show.summary).toBe('Oi mundo');
  });
});

describe('searchShows (RF08)', () => {
  it('devolve a LISTA de resultados', async () => {
    getSpy.mockResolvedValueOnce({
      data: [
        { score: 0.9, show: { id: 10, name: 'The Office' } },
        { score: 0.5, show: { id: 11, name: 'The Office (BR)' } },
      ],
    });
    const results = await searchShows('office');
    expect(getSpy).toHaveBeenCalledWith(
      '/search/shows',
      expect.objectContaining({ params: { q: 'office' } }),
    );
    expect(results.map((s) => s.id)).toEqual([10, 11]);
  });

  it('busca sem resultados devolve lista vazia', async () => {
    getSpy.mockResolvedValueOnce({ data: [] });
    await expect(searchShows('zzz')).resolves.toEqual([]);
  });

  it('termo vazio nem chega a chamar a API', async () => {
    await expect(searchShows('   ')).rejects.toBeInstanceOf(ApiError);
    expect(getSpy).not.toHaveBeenCalled();
  });
});
