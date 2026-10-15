/**
 * Formato bruto devolvido pela TVMaze API.
 *
 * Mantemos so os campos que o app usa e marcamos como opcionais/anulaveis
 * tudo o que a API pode omitir: varias series antigas vem sem imagem, sem
 * nota ou sem emissora.
 */
export interface ApiShow {
  id: number;
  name?: string | null;
  genres?: string[] | null;
  status?: string | null;
  premiered?: string | null;
  language?: string | null;
  runtime?: number | null;
  rating?: { average?: number | null } | null;
  image?: { medium?: string | null; original?: string | null } | null;
  network?: { name?: string | null } | null;
  webChannel?: { name?: string | null } | null;
  summary?: string | null;
}

export interface ApiSearchResult {
  score: number;
  show: ApiShow;
}

/**
 * Modelo de dominio usado pelas telas (RF01/RF03).
 *
 * Diferente do `ApiShow`, aqui nada e opcional: o mapeamento em
 * `services/tvmaze.ts` resolve todos os valores ausentes uma unica vez, e as
 * telas nunca precisam se defender de `undefined`.
 */
export interface Show {
  id: number;
  name: string;
  genres: string[];
  status: string | null;
  premiered: string | null;
  language: string | null;
  runtime: number | null;
  /** Nota media da comunidade TVMaze (0-10), quando existir. */
  rating: number | null;
  imageMedium: string | null;
  imageOriginal: string | null;
  /** Emissora de TV ou plataforma de streaming. */
  channel: string | null;
  /** Sinopse ja limpa: sem tags HTML (RF03). */
  summary: string;
}
