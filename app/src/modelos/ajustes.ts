/** Un ESP32 (o el modo de demostración) que la app puede leer. */
export interface Dispositivo {
  id: string;
  nombre: string;
  /** IP o URL del ESP32, por ejemplo `192.168.1.50` o `http://mientorno.local` */
  direccion: string;
  /** true = datos de demostración generados por la app (sin ESP32) */
  demo: boolean;
  /**
   * Token de notificaciones push registrado en este ESP32. Si existe, el
   * ESP32 manda las alertas aunque la app esté cerrada y la app no repite el
   * aviso local.
   */
  tokenPush?: string;
}

export interface Ajustes {
  dispositivos: Dispositivo[];
  activoId: string;
  /** Mandar notificación cuando el aire empeore. */
  alertasActivas: boolean;
  /** Nivel NOM-172 a partir del cual se avisa (1 Aceptable, 2 Mala, 3 Muy mala). */
  umbralNivel: number;
  /** Otra notificación cuando el aire vuelva a niveles aceptables. */
  avisarMejora: boolean;
  /** Cada cuántos segundos se consulta al ESP32. */
  intervaloSeg: number;
}

export const DISPOSITIVO_DEMO: Dispositivo = {
  id: 'nodo1',
  nombre: 'ESP32 Comunitario (Nodo 1)',
  direccion: 'broker.hivemq.com',
  demo: false,
};

export function ajustesPorDefecto(): Ajustes {
  return {
    dispositivos: [DISPOSITIVO_DEMO],
    activoId: 'nodo1',
    alertasActivas: true,
    umbralNivel: 2,
    avisarMejora: true,
    intervaloSeg: 5,
  };
}

export function dispositivoActivo(a: Ajustes): Dispositivo {
  return a.dispositivos.find((d) => d.id === a.activoId) ?? a.dispositivos[0];
}

export function descripcion(d: Dispositivo): string {
  return d.demo ? 'Datos de demostración' : d.direccion;
}

/**
 * Convierte lo que escriba el usuario en una URL base válida.
 *   `192.168.1.50` → `http://192.168.1.50`
 *   `http://192.168.1.50/api/lecturas/` → `http://192.168.1.50`
 */
export function normalizarDireccion(texto: string): string {
  let s = texto.trim();
  if (!s) return s;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  s = s.replace(/\/+$/, '');
  for (const sufijo of ['/api/lecturas', '/api/historial', '/api']) {
    if (s.toLowerCase().endsWith(sufijo)) s = s.slice(0, -sufijo.length);
  }
  return s;
}

export function direccionValida(texto: string): boolean {
  if (!texto.trim() || /\s/.test(texto.trim())) return false;
  try {
    return new URL(normalizarDireccion(texto)).hostname.length > 0;
  } catch {
    return false;
  }
}

/** Lee ajustes guardados tolerando versiones anteriores o datos dañados. */
export function ajustesDesdeJson(j: unknown): Ajustes {
  const base = ajustesPorDefecto();
  if (!j || typeof j !== 'object') return base;
  const o = j as Record<string, unknown>;
  const lista = Array.isArray(o.dispositivos)
    ? o.dispositivos
        .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        .filter((d) => typeof d.id === 'string')
        .map(
          (d): Dispositivo => ({
            id: d.id as string,
            nombre: typeof d.nombre === 'string' ? d.nombre : 'ESP32',
            direccion: typeof d.direccion === 'string' ? d.direccion : '',
            demo: d.demo === true,
            tokenPush: typeof d.tokenPush === 'string' ? d.tokenPush : undefined,
          }),
        )
    : [];
  const dispositivos = lista.length ? lista : base.dispositivos;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return {
    dispositivos,
    activoId: typeof o.activoId === 'string' ? o.activoId : dispositivos[0].id,
    alertasActivas: typeof o.alertasActivas === 'boolean' ? o.alertasActivas : true,
    umbralNivel: umbralDesdeJson(o),
    avisarMejora: typeof o.avisarMejora === 'boolean' ? o.avisarMejora : true,
    intervaloSeg: Math.min(300, Math.max(1, num(o.intervaloSeg, 5))),
  };
}

/** Umbral guardado; convierte el formato anterior (ICA 101/151/201) al nivel NOM-172. */
function umbralDesdeJson(o: Record<string, unknown>): number {
  if (typeof o.umbralNivel === 'number' && Number.isFinite(o.umbralNivel)) {
    return Math.min(4, Math.max(1, Math.round(o.umbralNivel)));
  }
  if (typeof o.umbralIca === 'number') return o.umbralIca <= 101 ? 1 : o.umbralIca <= 151 ? 2 : 3;
  return 2;
}
