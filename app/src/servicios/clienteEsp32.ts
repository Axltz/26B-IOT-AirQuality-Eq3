import { lecturaDesdeJson, lecturaVacia, type Lectura } from '../modelos/lectura';

/**
 * Habla con el servidor HTTP del ESP32 (ver README.md y esp32/).
 *   GET  /api/lecturas  → lectura actual (obligatorio)
 *   GET  /api/historial → muestras guardadas por el ESP32 (opcional)
 *   POST /api/push      → registra el token para notificaciones push (opcional)
 */
export class ErrorEsp32 extends Error {}

const LIMITE_MS = 5000;

async function pedir(url: string, init?: RequestInit): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), LIMITE_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      signal: control.signal,
    });
  } catch (e) {
    if (control.signal.aborted) {
      throw new ErrorEsp32(
        'El ESP32 no respondió a tiempo. Revisa la IP y que el teléfono esté en la misma red Wi-Fi.',
      );
    }
    throw new ErrorEsp32(
      'No se pudo conectar con el ESP32. Revisa la IP y que esté encendido y en la misma red Wi-Fi.',
    );
  } finally {
    clearTimeout(reloj);
  }
}

/** Decodifica JSON tolerando `nan`/`inf`, que a veces imprime Arduino. */
function decodificar(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    const limpio = texto.replace(/([:[,\s])-?(nan|NaN|inf|Infinity)(?=[\s,}\]])/g, '$1null');
    try {
      return JSON.parse(limpio);
    } catch {
      throw new ErrorEsp32('La respuesta del ESP32 no es JSON válido.');
    }
  }
}

export async function leerEsp32(urlBase: string): Promise<Lectura> {
  const r = await pedir(`${urlBase}/api/lecturas`);
  if (!r.ok) throw new ErrorEsp32(`El ESP32 respondió con el código ${r.status}.`);
  const datos = decodificar(await r.text());
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorEsp32('El ESP32 no respondió con un objeto JSON.');
  }
  const l = lecturaDesdeJson(datos as Record<string, unknown>);
  if (lecturaVacia(l)) {
    throw new ErrorEsp32('El JSON no trae ningún campo conocido (temperatura, humedad, pm25...).');
  }
  return l;
}

/** Devuelve null si el ESP32 no implementa /api/historial. */
export async function historialEsp32(urlBase: string): Promise<Lectura[] | null> {
  const r = await pedir(`${urlBase}/api/historial`);
  if (!r.ok) return null;
  const datos = decodificar(await r.text()) as Record<string, unknown> | unknown[];
  const lista = Array.isArray(datos)
    ? datos
    : Array.isArray(datos?.muestras)
      ? datos.muestras
      : Array.isArray(datos?.historial)
        ? datos.historial
        : null;
  if (!lista) return null;

  const ahora = Date.now();
  const resultado: Lectura[] = [];
  for (const m of lista) {
    if (!m || typeof m !== 'object') continue;
    const o = m as Record<string, unknown>;
    const fecha = fechaMuestra(o, ahora);
    if (fecha === null) continue;
    const l = lecturaDesdeJson(o, fecha);
    if (!lecturaVacia(l)) resultado.push(l);
  }
  return resultado.sort((a, b) => a.fecha - b.fecha);
}

/** La fecha puede venir como `hace_s` (segundos atrás), `ts` (época) o `fecha` (ISO). */
function fechaMuestra(m: Record<string, unknown>, ahora: number): number | null {
  const hace = m.hace_s ?? m.edad_s ?? m.ago_s;
  if (typeof hace === 'number') return ahora - Math.round(hace) * 1000;
  const ts = m.ts ?? m.epoch;
  if (typeof ts === 'number' && ts > 1e9) return ts > 1e12 ? ts : ts * 1000;
  const texto = m.fecha ?? m.time;
  if (typeof texto === 'string') {
    const f = Date.parse(texto);
    return Number.isNaN(f) ? null : f;
  }
  return null;
}

/**
 * Registra el token de notificaciones push en el ESP32 para que él mismo
 * avise aunque la app esté cerrada.
 */
export async function registrarPushEsp32(
  urlBase: string,
  datos: { token: string; umbral: number; avisarMejora: boolean; nombre: string },
): Promise<void> {
  const r = await pedir(`${urlBase}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (r.status === 404) {
    throw new ErrorEsp32(
      'Este ESP32 funciona solo en la red local y no manda avisos con la app cerrada. La app te avisa mientras está abierta o en segundo plano.',
    );
  }
  if (!r.ok) throw new ErrorEsp32(`El ESP32 rechazó el registro (código ${r.status}).`);
}

export async function quitarPushEsp32(urlBase: string, token: string): Promise<void> {
  await pedir(`${urlBase}/api/push/borrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export function describirError(e: unknown): string {
  if (e instanceof ErrorEsp32) return e.message;
  if (e instanceof TypeError) return 'La dirección no es válida.';
  return `No se pudo leer el ESP32 (${String(e)}).`;
}
