/**
 * Tokens del diseño «Atmósfera» (docs/diseno/SISTEMA_DE_DISENO.md, sección 0).
 *
 * Este archivo no importa React ni React Native: también lo usan la lógica y
 * las pruebas (que corren en Node). Los hooks `useTema()` y `useEstilos()`
 * viven en src/estado/tema.tsx.
 */

export type NombreTema = 'claro' | 'oscuro';
export type Apariencia = NombreTema | 'sistema';

/** Sombra de CSS `x y blur spread color`, para convertirla a cada plataforma. */
export interface Sombra {
  y: number;
  blur: number;
  spread: number;
  color: string;
  /** Equivalente aproximado en Android. */
  elevation: number;
}

export interface PaletaTema {
  nombre: NombreTema;
  oscuro: boolean;

  /** Tarjetas */
  superficie: string;
  /** Relleno de chips, segmentos inactivos y campos */
  superficie2: string;
  texto: string;
  textoSuave: string;
  borde: string;

  /** Botón principal (lima = acción) */
  botonFondo: string;
  botonTexto: string;
  /** Chip / segmento activo */
  chipActivoFondo: string;
  chipActivoTexto: string;
  /** Interruptor */
  togglePista: string;
  togglePerilla: string;
  togglePerillaInactiva: string;
  /** Opción elegida (lista de opciones) */
  opcionActivaBorde: string;

  /** Lima legible (texto de acción) */
  accionTexto: string;
  accionSuave: string;
  /** Cian (sistema y datos) */
  sistema: string;
  sistemaTexto: string;
  sistemaSuave: string;

  peligro: string;
  peligroSuave: string;

  /** Fondo del círculo del rostro */
  rostro: string;
  /** Texto de la franja de nivel (niveles 0–2 / niveles 3–4) */
  franjaTexto: string;
  franjaTextoFuerte: string;

  /** Barra de navegación inferior */
  barraFondo: string;
  barraInactiva: string;
  pestanaActivaFondo: string;
  pestanaActivaTexto: string;

  /** Botón redondo sobre el fondo de pantalla */
  iconoSobreFondo: string;
  iconoSobreFondoTexto: string;
  /** Píldora sobre el fondo de pantalla ("Alerta ambiental") */
  pildoraSobreFondo: string;
  pildoraSobreFondoTexto: string;

  sombraTarjeta: Sombra;
  sombraBarra: Sombra;

  /** Semáforo NOM-172: relleno (`lv`) y texto (`lt`), de Buena a Extremadamente mala */
  lv: readonly string[];
  lt: readonly string[];

  /** Fondos pastel sólidos */
  fondoAzul: string;
  fondoVerde: string;
}

/** Semáforo claro (SISTEMA_DE_DISENO.md §2, tabla «Semáforo NOM-172»). */
const LV_CLARO = ['#34B45A', '#F2C230', '#F28A2E', '#E04A3A', '#8E3B8C'] as const;
const LT_CLARO = ['#1F7A39', '#8A6A00', '#B4520C', '#B32A1D', '#7A2F78'] as const;
/** Semáforo oscuro (§0.5). */
const LV_OSCURO = ['#4ED07A', '#F5CF3A', '#FF9A3D', '#FF5C4D', '#C77DCA'] as const;
const LT_OSCURO = ['#4ED07A', '#F5CF3A', '#FF9A3D', '#FF5C4D', '#D79BDA'] as const;

const claro: PaletaTema = {
  nombre: 'claro',
  oscuro: false,
  superficie: '#FFFFFF',
  superficie2: '#EEF3E7',
  texto: '#0F2A2F',
  textoSuave: '#58706F',
  borde: '#E1E9DA',
  botonFondo: '#0F2A2F',
  botonTexto: '#BCE954',
  chipActivoFondo: '#0F2A2F',
  chipActivoTexto: '#FFFFFF',
  togglePista: '#0F2A2F',
  togglePerilla: '#BCE954',
  togglePerillaInactiva: '#FFFFFF',
  opcionActivaBorde: '#9CC63A',
  accionTexto: '#4E6B0F',
  accionSuave: '#EEF9D2',
  sistema: '#00D0F0',
  sistemaTexto: '#00748A',
  sistemaSuave: '#DDF7FC',
  peligro: '#B32A1D',
  peligroSuave: '#FCE6E2',
  rostro: '#FFFFFF',
  franjaTexto: '#0F2A2F',
  franjaTextoFuerte: '#FFFFFF',
  barraFondo: 'rgba(255,255,255,0.94)',
  barraInactiva: '#58706F',
  pestanaActivaFondo: '#0F2A2F',
  pestanaActivaTexto: '#BCE954',
  iconoSobreFondo: 'rgba(255,255,255,0.55)',
  iconoSobreFondoTexto: '#0F2A2F',
  pildoraSobreFondo: '#FFFFFF',
  pildoraSobreFondoTexto: '#0F2A2F',
  sombraTarjeta: { y: 12, blur: 26, spread: -18, color: 'rgba(0,0,0,0.45)', elevation: 4 },
  sombraBarra: { y: 14, blur: 30, spread: -14, color: 'rgba(0,0,0,0.45)', elevation: 8 },
  lv: LV_CLARO,
  lt: LT_CLARO,
  fondoAzul: '#CFF5FA',
  fondoVerde: '#EEF9D4',
};

const oscuro: PaletaTema = {
  nombre: 'oscuro',
  oscuro: true,
  superficie: '#13292F',
  superficie2: '#1B353C',
  texto: '#E8F3F1',
  textoSuave: '#8FA4AA',
  borde: '#22414A',
  botonFondo: '#BCE954',
  botonTexto: '#0C1E24',
  chipActivoFondo: '#BCE954',
  chipActivoTexto: '#0C1E24',
  togglePista: '#BCE954',
  togglePerilla: '#0C1E24',
  togglePerillaInactiva: '#8FA4AA',
  opcionActivaBorde: '#BCE954',
  accionTexto: '#BCE954',
  accionSuave: '#1F3A2A',
  sistema: '#00D0F0',
  sistemaTexto: '#3FDDF5',
  sistemaSuave: '#0E3A45',
  peligro: '#FF7A6B',
  peligroSuave: '#3A1F22',
  rostro: '#13292F',
  franjaTexto: '#0C1E24',
  franjaTextoFuerte: '#0C1E24',
  barraFondo: 'rgba(19,41,47,0.92)',
  barraInactiva: '#8FA4AA',
  pestanaActivaFondo: '#BCE954',
  pestanaActivaTexto: '#0C1E24',
  iconoSobreFondo: 'rgba(255,255,255,0.1)',
  iconoSobreFondoTexto: '#E8F3F1',
  pildoraSobreFondo: '#13292F',
  pildoraSobreFondoTexto: '#E8F3F1',
  sombraTarjeta: { y: 14, blur: 30, spread: -16, color: 'rgba(0,0,0,0.75)', elevation: 4 },
  sombraBarra: { y: 14, blur: 30, spread: -14, color: 'rgba(0,0,0,0.45)', elevation: 8 },
  lv: LV_OSCURO,
  lt: LT_OSCURO,
  fondoAzul: '#0B323B',
  fondoVerde: '#213625',
};

export const Temas: Record<NombreTema, PaletaTema> = { claro, oscuro };

// ------------------------------------------------------------------ fondos

/** Tinta sobre el fondo de pantalla (degradado o pastel). */
export interface TintaFondo {
  /** Texto principal (`topInk`) */
  tinta: string;
  /** Texto secundario (`topMut`) */
  tintaSuave: string;
  /** true si el fondo pide iconos claros en la barra de estado */
  barraEstadoClara: boolean;
}

export interface Fondo extends TintaFondo {
  /** Uno o más colores; si hay uno solo el fondo es sólido. */
  colores: readonly string[];
  paradas?: readonly number[];
  /** Ángulo CSS del degradado (0° = hacia arriba, 180° = hacia abajo). */
  angulo: number;
}

/** Degradados de nivel en claro, 155° (§0.1). */
const DEGRADADOS_CLARO: { colores: string[]; paradas?: number[] }[] = [
  { colores: ['#7FD98F', '#BCE954', '#00D0F0'], paradas: [0, 0.45, 1] },
  { colores: ['#FBE27A', '#F2C230'] },
  { colores: ['#F9C35A', '#F28A2E'] },
  { colores: ['#A3261A', '#E04A3A'] },
  { colores: ['#55215A', '#8E3B8C'] },
];

const BASE_OSCURO = '#0B1A1F';

const TINTA_CLARA_SOBRE_NIVEL: TintaFondo = {
  tinta: '#0F2A2F',
  tintaSuave: 'rgba(15,42,47,0.72)',
  barraEstadoClara: false,
};
const TINTA_BLANCA_SOBRE_NIVEL: TintaFondo = {
  tinta: '#FFFFFF',
  tintaSuave: 'rgba(255,255,255,0.82)',
  barraEstadoClara: true,
};
const TINTA_PASTEL_CLARO: TintaFondo = {
  tinta: '#0F2A2F',
  tintaSuave: 'rgba(15,42,47,0.68)',
  barraEstadoClara: false,
};
const TINTA_OSCURO: TintaFondo = {
  tinta: '#EAF4F2',
  tintaSuave: 'rgba(234,244,242,0.72)',
  barraEstadoClara: true,
};

/** Degradado de Inicio y Contaminantes según el nivel (0–4). */
export function fondoDeNivel(tema: PaletaTema, nivel: number): Fondo {
  const i = Math.min(4, Math.max(0, Math.round(nivel)));
  if (!tema.oscuro) {
    const d = DEGRADADOS_CLARO[i];
    return { ...d, angulo: 155, ...(i >= 3 ? TINTA_BLANCA_SOBRE_NIVEL : TINTA_CLARA_SOBRE_NIVEL) };
  }
  const colores =
    i === 0
      ? [mezclar('#BCE954', BASE_OSCURO, 0.34), mezclar('#00D0F0', BASE_OSCURO, 0.2)]
      : [mezclar(tema.lv[i], BASE_OSCURO, 0.4), mezclar(tema.lv[i], BASE_OSCURO, 0.1)];
  return { colores, angulo: 160, ...TINTA_OSCURO };
}

/** Fondo pastel sólido: azul (Alertas, Administración) o verde (Ajustes). */
export function fondoPastel(tema: PaletaTema, tono: 'azul' | 'verde'): Fondo {
  return {
    colores: [tono === 'azul' ? tema.fondoAzul : tema.fondoVerde],
    angulo: 180,
    ...(tema.oscuro ? TINTA_OSCURO : TINTA_PASTEL_CLARO),
  };
}

// ----------------------------------------------------------- tipografía

/**
 * Sora (títulos, palabra del nivel y cifras) + DM Sans (texto, etiquetas y
 * barra inferior). Cargadas en src/app/_layout.tsx.
 */
export const Fuente = {
  regular: 'DMSans_400Regular',
  media: 'DMSans_500Medium',
  /** DM Sans 600 no se carga: las etiquetas «semibold» usan 700. */
  seminegrita: 'DMSans_700Bold',
  negrita: 'DMSans_700Bold',
  /** Títulos de tarjeta y de pantalla */
  extra: 'Sora_700Bold',
  /** Palabra del nivel y títulos grandes */
  display: 'Sora_800ExtraBold',
  /** Cifras (medidor) */
  cifra: 'Sora_600SemiBold',
} as const;

// --------------------------------------------------------------- colores

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

/**
 * @deprecated Colores del diseño anterior. Solo los conserva la lógica
 * (src/logica/calidadAire.ts y confort.ts), que no debe cambiar; la interfaz
 * usa `useTema()`.
 */
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
