import { stripHtml } from '../stripHtml';

describe('stripHtml (RF03 - sinopse sem tags)', () => {
  it('remove as tags da sinopse real da TVMaze', () => {
    const html =
      '<p><b>Under the Dome</b> is the story of a small town that is suddenly sealed off.</p>';
    expect(stripHtml(html)).toBe(
      'Under the Dome is the story of a small town that is suddenly sealed off.',
    );
  });

  it('decodifica entidades nomeadas e numericas', () => {
    expect(stripHtml('<p>Tom &amp; Jerry&#39;s &quot;show&quot;&nbsp;&hellip;</p>')).toBe(
      'Tom & Jerry\'s "show" …',
    );
  });

  it('transforma <br> e fim de paragrafo em quebra de linha', () => {
    expect(stripHtml('<p>Linha um<br/>linha dois</p><p>Paragrafo dois</p>')).toBe(
      'Linha um\nlinha dois\n\nParagrafo dois',
    );
  });

  it('devolve texto vazio para sinopse ausente', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml('')).toBe('');
  });
});
