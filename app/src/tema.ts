/** Colores tomados de las vistas de Figma. */
export const Paleta = {
  fondo: '#F4F5F0',
  superficie: '#FFFFFF',
  borde: '#E6E8E2',
  texto: '#1B2620',
  textoSuave: '#79817B',
  textoTenue: '#A5ABA6',
  relleno: '#ECEEE9',

  coral: '#EE6C4D',
  coralSuave: '#FDECE6',
  azul: '#3E83EE',
  azulSuave: '#E8F0FD',
  verde: '#4E9D66',
  verdeSuave: '#E7F1E5',
  verdeBorde: '#D2E3CE',
  verdeAlerta: '#EAF2E7',
  verdeOscuro: '#2F5A45',
  amarillo: '#E2B33A',
  ambar: '#B8860B',
  naranja: '#EE8A3C',
  rojo: '#E0533B',
  rojoSuave: '#FDE5DE',
  morado: '#8E4A8A',
  vino: '#7A2334',
} as const;

/** Familias de Manrope cargadas en src/app/_layout.tsx. */
export const Fuente = {
  regular: 'Manrope_400Regular',
  media: 'Manrope_500Medium',
  seminegrita: 'Manrope_600SemiBold',
  negrita: 'Manrope_700Bold',
  extra: 'Manrope_800ExtraBold',
} as const;

/** Mezcla un color hexadecimal con transparencia (0–1). */
export function alfa(hex: string, a: number): string {
  const n = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${n}`;
}

/**
 * Mezcla `hex` sobre `fondo` y devuelve un color OPACO equivalente a pintar
 * `hex` con transparencia `a` encima de `fondo`.
 *
 * Úsalo en vez de `alfa()` para fondos y bordes de vistas con `elevation`: en
 * Android la sombra de elevación se dibuja debajo de la vista y se ve a través
 * de cualquier fondo translúcido como un recuadro gris interior.
 */
export function mezclar(hex: string, fondo: string, a: number): string {
  const t = Math.max(0, Math.min(1, a));
  const canal = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(canal(hex, i) * t + canal(fondo, i) * (1 - t)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
