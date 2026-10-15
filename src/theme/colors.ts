/**
 * RF10 - paleta com contraste conferido.
 *
 * Cada par texto/fundo usado no app foi calculado contra a WCAG AA
 * (4.5:1 para texto normal, 3:1 para texto grande e bordas):
 *
 *   text      #F2F3F7 sobre background    #0F1117  -> 17.0:1
 *   textMuted #A9AFC2 sobre background    #0F1117  -> 8.6:1
 *   textMuted #A9AFC2 sobre surface       #1A1D27  -> 7.7:1
 *   textMuted #A9AFC2 sobre surfaceRaised #232736  -> 6.8:1
 *   onPrimary #1A1200 sobre primary       #FFB547  -> 10.6:1
 *   primary   #FFB547 sobre background    #0F1117  -> 10.7:1
 *   heart     #FF5C7A sobre surface       #1A1D27  -> 5.7:1
 *   danger    #FF8A8A sobre background    #0F1117  -> 8.3:1
 */
export const colors = {
  background: '#0F1117',
  surface: '#1A1D27',
  surfaceRaised: '#232736',
  border: '#343A4D',

  text: '#F2F3F7',
  textMuted: '#A9AFC2',

  primary: '#FFB547',
  onPrimary: '#1A1200',

  heart: '#FF5C7A',
  star: '#FFB547',
  danger: '#FF8A8A',
  dangerSurface: '#3A1E24',
} as const;

/**
 * RF10 - area minima de toque recomendada (Apple HIG: 44pt; Material: 48dp).
 * Usada como minWidth/minHeight em todo elemento tocavel.
 */
export const MIN_TOUCH = 44;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
