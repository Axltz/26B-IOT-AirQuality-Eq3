import { lecturaDesdeJson, lecturaVacia, type Lectura } from '../modelos/lectura';

/**
 * Histórico en Supabase. Cada ESP32 inserta una fila por minuto en la tabla
 * `lecturas` (ver supabase/migrations/). La app la lee con la clave publicable
 * para llenar la gráfica con lo que pasó mientras estaba cerrada.
 *
 * Se configura con EXPO_PUBLIC_SUPABASE_URL y
 * EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (app/.env.local o variables de EAS).
 * Sin ellas la app funciona igual, solo con el historial local.
 */

// Acceso estático a process.env.EXPO_PUBLIC_*: Expo solo sustituye esta forma.
const URL_CRUDA = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLAVE_CRUDA = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const URL_BASE = (URL_CRUDA ?? '').trim().replace(/\/+$/, '');
const CLAVE = (CLAVE_CRUDA ?? '').trim();

const COLUMNAS = 'creado_en,pm1,pm25,pm10,co,temp,hum,nivel_general,dominante';
/** Tope de filas por respuesta de la Data API de Supabase (valor por defecto). */
const POR_PAGINA = 1000;
/** 26 h de una muestra por minuto caben en 2 páginas; esto es solo un freno. */
const MAX_PAGINAS = 5;
const LIMITE_MS = 10_000;

export function historialNubeConfigurado(): boolean {
  return URL_BASE !== '' && CLAVE !== '';
}

/** URL de PostgREST con las lecturas de un tópico posteriores a `desde` (ms). */
export function urlConsultaLecturas(base: string, topico: string, desde: number, offset = 0): string {
  const parametros: [string, string][] = [
    ['select', COLUMNAS],
    ['topico', `eq.${topico}`],
    ['creado_en', `gt.${new Date(desde).toISOString()}`],
    ['order', 'creado_en.asc'],
    ['limit', String(POR_PAGINA)],
    ['offset', String(offset)],
  ];
  const consulta = parametros.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${base}/rest/v1/lecturas?${consulta}`;
}

/** Convierte las filas de la tabla `lecturas` en lecturas de la app. */
export function filasALecturas(filas: unknown): Lectura[] {
  if (!Array.isArray(filas)) return [];
  const lecturas: Lectura[] = [];
  for (const f of filas) {
    if (!f || typeof f !== 'object') continue;
    const fecha = Date.parse(String((f as Record<string, unknown>).creado_en));
    if (!Number.isFinite(fecha)) continue;
    const l = lecturaDesdeJson(f as Record<string, unknown>, fecha);
    if (!lecturaVacia(l)) lecturas.push(l);
  }
  return lecturas;
}

async function pedirPagina(url: string): Promise<unknown> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), LIMITE_MS);
  try {
    // Solo `apikey`: las claves sb_publishable_ no van en Authorization.
    const r = await fetch(url, {
      headers: { apikey: CLAVE, Accept: 'application/json' },
      signal: control.signal,
    });
    if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return await r.json();
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Lecturas guardadas en Supabase para un tópico desde `desde` (ms), de la más
 * vieja a la más nueva. Devuelve [] si Supabase no está configurado.
 */
export async function traerHistorialNube(topico: string, desde: number): Promise<Lectura[]> {
  if (!historialNubeConfigurado()) return [];
  const todas: Lectura[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const filas = await pedirPagina(urlConsultaLecturas(URL_BASE, topico, desde, pagina * POR_PAGINA));
    todas.push(...filasALecturas(filas));
    if (!Array.isArray(filas) || filas.length < POR_PAGINA) break;
  }
  return todas;
}
