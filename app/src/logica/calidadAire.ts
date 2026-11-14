import type { Lectura } from '../modelos/lectura';
import { Paleta } from '../tema';

/**
 * Calidad del aire según la NOM-172-SEMARNAT-2023 (Índice AIRE Y SALUD),
 * igual que el semáforo del ESP32: se califican PM2.5 y CO con los mismos
 * cortes que el programa del ESP32 y manda el peor de los dos (regla de
 * dominancia). Si el ESP32 manda su propio nivel (`nivel_nom172`), se usa ese.
 */
export type Contaminante = 'pm25' | 'pm10' | 'co' | 'no2' | 'co2' | 'cov' | 'sensor';

export const CONTAMINANTES: Record<
  Contaminante,
  { nombre: string; simbolo: string; enFrase: string; exterior: boolean }
> = {
  pm25: { nombre: 'Partículas finas', simbolo: 'PM2.5', enFrase: 'partículas finas', exterior: true },
  pm10: { nombre: 'Partículas gruesas', simbolo: 'PM10', enFrase: 'partículas', exterior: true },
  co: { nombre: 'Monóxido de carbono', simbolo: 'CO', enFrase: 'monóxido de carbono', exterior: false },
  no2: { nombre: 'Dióxido de nitrógeno', simbolo: 'NO2', enFrase: 'dióxido de nitrógeno', exterior: true },
  co2: { nombre: 'Dióxido de carbono', simbolo: 'CO2', enFrase: 'dióxido de carbono', exterior: false },
  cov: {
    nombre: 'Compuestos orgánicos volátiles',
    simbolo: 'COV',
    enFrase: 'compuestos orgánicos volátiles',
    exterior: false,
  },
  sensor: { nombre: 'Reportado por el sensor', simbolo: 'NOM-172', enFrase: 'contaminantes', exterior: true },
};

export type IdNivel = 'buena' | 'aceptable' | 'mala' | 'muyMala' | 'extremadamenteMala';

export interface Nivel {
  id: IdNivel;
  /** 0 Buena … 4 Extremadamente mala (igual que nivel_nom172 del ESP32) */
  indice: number;
  nombre: string;
  /** Para tarjetas pequeñas */
  corto: string;
  /** Para "La calidad del aire es ..." */
  adjetivo: string;
  /** Nivel de riesgo asociado según la norma */
  riesgo: string;
  color: string;
  colorSuave: string;
}

export const NIVELES: Nivel[] = [
  { id: 'buena', indice: 0, nombre: 'Buena', corto: 'Buena', adjetivo: 'buena', riesgo: 'Riesgo bajo', color: Paleta.verde, colorSuave: '#E7F1E5' },
  { id: 'aceptable', indice: 1, nombre: 'Aceptable', corto: 'Aceptable', adjetivo: 'aceptable', riesgo: 'Riesgo moderado', color: Paleta.amarillo, colorSuave: '#FBF3DC' },
  { id: 'mala', indice: 2, nombre: 'Mala', corto: 'Mala', adjetivo: 'mala', riesgo: 'Riesgo alto', color: Paleta.naranja, colorSuave: '#FDEEDF' },
  { id: 'muyMala', indice: 3, nombre: 'Muy mala', corto: 'Muy mala', adjetivo: 'muy mala', riesgo: 'Riesgo muy alto', color: Paleta.rojo, colorSuave: Paleta.rojoSuave },
  { id: 'extremadamenteMala', indice: 4, nombre: 'Extremadamente mala', corto: 'Extrema', adjetivo: 'extremadamente mala', riesgo: 'Riesgo extremadamente alto', color: Paleta.morado, colorSuave: '#F5E6F4' },
];

/** Colores de la barra de 5 tramos (Buena → Extremadamente mala). */
export const COLORES_NIVELES = NIVELES.map((n) => n.color);

export function nivel(indice: number): Nivel {
  return NIVELES[Math.min(4, Math.max(0, Math.round(indice)))];
}

/** Límite superior de Buena, Aceptable, Mala y Muy mala (igual que el ESP32). */
export const CORTES = {
  pm25: [15, 25, 79, 130], // µg/m³
  co: [5, 9, 12, 16], // ppm
} as const;

type Calificable = keyof typeof CORTES;

/** Índice de nivel (0–4) de una concentración. */
export function indiceDe(c: Calificable, valor: number): number {
  let n = 0;
  for (const limite of CORTES[c]) if (valor > limite) n++;
  return n;
}

export interface CalidadAire {
  nivel: Nivel;
  principal: Contaminante;
  /** Nivel (0–4) de cada contaminante calificado */
  niveles: Partial<Record<Calificable, number>>;
}

/** Califica una lectura. Devuelve null si no hay PM2.5, CO ni nivel del ESP32. */
export function evaluarAire(l: Lectura): CalidadAire | null {
  const niveles: Partial<Record<Calificable, number>> = {};
  if (l.pm25 !== undefined) niveles.pm25 = indiceDe('pm25', l.pm25);
  if (l.co !== undefined) niveles.co = indiceDe('co', l.co);

  let principal: Contaminante = 'sensor';
  let mayor = -1;
  for (const [c, n] of Object.entries(niveles) as [Calificable, number][]) {
    if (n > mayor) {
      mayor = n;
      principal = c;
    }
  }
  if (mayor < 0 && l.nivelReportado === undefined) return null;
  // Si el ESP32 manda el nivel de su semáforo, se respeta para que coincidan.
  return { nivel: nivel(l.nivelReportado ?? mayor), principal, niveles };
}

/** Concentración del contaminante principal (para mostrar y para la barra). */
export function concentracion(l: { pm25?: number; co?: number }, c: Contaminante): number | undefined {
  return c === 'co' ? l.co : c === 'pm25' ? l.pm25 : undefined;
}

/** Posición (0–1) de una concentración en la barra de 5 tramos de su contaminante. */
export function posicionBarra(c: Calificable, valor: number): number {
  const lim = CORTES[c];
  const cortes = [0, ...lim, lim[3] * 1.5];
  for (let i = 0; i < 5; i++) {
    if (valor <= cortes[i + 1]) {
      const f = (valor - cortes[i]) / (cortes[i + 1] - cortes[i]);
      return (i + Math.min(1, Math.max(0, f))) / 5;
    }
  }
  return 1;
}

/** Posición en la barra para un nivel sin concentración conocida (mitad del tramo). */
export function posicionNivel(indice: number): number {
  return (nivel(indice).indice + 0.5) / 5;
}

/** Etiquetas de la barra de un contaminante: 0 · 15 · 25 · 79 · 130+ */
export function etiquetasBarra(c: Calificable): string[] {
  const lim = CORTES[c];
  return ['0', String(lim[0]), String(lim[1]), String(lim[2]), `${lim[3]}+`];
}

/** Recomendación para la tarjeta "Cuida tu salud". */
export function recomendacion(n: Nivel, principal: Contaminante): string {
  if (n.id === 'buena') {
    return 'El aire está limpio. Puedes ventilar y hacer actividades al aire libre con normalidad.';
  }
  if (principal === 'co') {
    if (n.id === 'aceptable') return 'Abre una ventana y revisa que estufas y calentadores funcionen bien.';
    return 'Ventila de inmediato y revisa estufas, calentadores y boilers. Si sientes mareo o dolor de cabeza, sal del lugar.';
  }
  switch (n.id) {
    case 'aceptable':
      return 'Si eres sensible (niños, adultos mayores, personas con asma), reduce los esfuerzos intensos al aire libre.';
    case 'mala':
      return 'Evita actividades físicas vigorosas al aire libre. Grupos sensibles: mejor quédate en interiores.';
    case 'muyMala':
      return 'Evita las actividades al aire libre, cierra las ventanas y usa cubrebocas si necesitas salir.';
    default:
      return 'Permanece en interiores con puertas y ventanas cerradas y sigue las indicaciones de protección civil.';
  }
}
