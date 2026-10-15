const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/**
 * RF03 - converte o HTML da sinopse da TVMaze em texto puro.
 *
 * A API devolve, por exemplo:
 *   `<p><b>Under the Dome</b> is the story of a small town&nbsp;...</p>`
 *
 * Regras, nesta ordem:
 *   1. `<br>` e fim de paragrafo viram quebra de linha (preserva a leitura);
 *   2. todas as demais tags sao removidas;
 *   3. entidades nomeadas e numericas sao decodificadas (`&amp;`, `&#39;`...);
 *   4. espacos repetidos sao colapsados e as pontas aparadas.
 *
 * Nao usamos uma lib de parsing de HTML de proposito: o conteudo da API e
 * simples (p, b, i, br) e uma dependencia a mais para isso pesaria no bundle.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';

  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n');

  const withoutTags = withBreaks.replace(/<[^>]*>/g, '');

  const decoded = withoutTags
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) =>
      NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );

  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
