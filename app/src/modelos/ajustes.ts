export type ModoConexion = 'cercana' | 'peor';

/** Una estación de monitoreo de calidad del aire. */
export interface Dispositivo {
  id: string;
  /** Nombre amigable de la estación, p. ej. "Estación 1" */
  nombre: string;
  /** Zona o referencia comunitaria, p. ej. "Zona 1 · Sector Metropolitano" */
  zona?: string;
  /** Latitud geográfica aproximada */
  lat?: number;
  /** Longitud geográfica aproximada */
  lng?: number;
  /** Dirección del broker MQTT (p. ej. broker.hivemq.com) */
  direccion: string;
  /**
   * Tópico MQTT de telemetría al que se suscribe la app para recibir lecturas
   * en tiempo real desde el broker.
   * Ejemplo: `colectivo/aire/nodo1`
   */
  topicoMqtt: string;
  /** true = datos de demostración generados por la app (sin ESP32) */
  demo: boolean;
  /**
   * Token de notificaciones push registrado en este ESP32. Si existe, el
   * ESP32 manda las alertas aunque la app esté cerrada.
   */
  tokenPush?: string;
}

export interface Ajustes {
  dispositivos: Dispositivo[];
  activoId: string;
  /** Modo de selección de estación: más cercana (GPS/proximidad) o peor calidad (centinela). */
  modoConexion: ModoConexion;
  /** Mandar notificación cuando el aire empeore. */
  alertasActivas: boolean;
  /** Nivel NOM-172 a partir del cual se avisa (1 Aceptable, 2 Mala, 3 Muy mala). */
  umbralNivel: number;
  /** Otra notificación cuando el aire vuelva a niveles aceptables. */
  avisarMejora: boolean;
  /** Cada cuántos segundos se consulta al ESP32 (tiempo real). */
  intervaloSeg: number;
  /** true = el usuario pertenece a un grupo vulnerable y quiere umbrales especiales. */
  usarGrupoVulnerable: boolean;
  /** ID del grupo vulnerable (ej. 'ninos', 'adultos_mayores'). Solo aplica si usarGrupoVulnerable=true. */
  grupoVulnerable?: string;
  /** Activar resumen programado a una hora fija */
  reporteProgramado: boolean;
  /** Hora específica para recibir el reporte diario (HH:MM, 24 h, libre) */
  horaReporte: string;
  /** Enviar datos actuales cada X horas independientemente del estado */
  alertaPeriodica: boolean;
  /** Cada cuántas horas se manda la alerta periódica (1-12) */
  intervaloAlertaHoras: number;
}

export const DISPOSITIVO_DEMO: Dispositivo = {
  id: 'nodo1',
  nombre: 'Estación X',
  zona: 'Zona 1 · Sector Metropolitano',
  lat: 20.6575,
  lng: -103.3255,
  direccion: 'broker.hivemq.com',
  topicoMqtt: 'colectivo/aire/nodo1',
  demo: false,
};

export function ajustesPorDefecto(): Ajustes {
  return {
    dispositivos: [DISPOSITIVO_DEMO],
    activoId: 'nodo1',
    modoConexion: 'cercana',
    alertasActivas: false,
    umbralNivel: 2,
    avisarMejora: false,
    intervaloSeg: 5,
    usarGrupoVulnerable: false,
    grupoVulnerable: undefined,
    reporteProgramado: false,
    horaReporte: '08:00',
    alertaPeriodica: false,
    intervaloAlertaHoras: 3,
  };
}

export function dispositivoActivo(a: Ajustes): Dispositivo {
  return a.dispositivos.find((d) => d.id === a.activoId) ?? a.dispositivos[0];
}

export function descripcion(d: Dispositivo): string {
  return d.zona ?? 'Estación de Monitoreo Comunitario';
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

/**
 * ¿La dirección del nodo es un broker MQTT (en vez de la IP de un ESP32 con
 * servidor HTTP local)? Acepta el host de HiveMQ, una URL ws:// o wss://, o
 * cualquier host que mencione "broker"/"mqtt".
 */
export function esBrokerMqtt(direccion: string): boolean {
  const v = direccion.trim().toLowerCase();
  if (!v) return true;
  return (
    v === 'broker.hivemq.com' ||
    /^wss?:\/\//i.test(v) ||
    v.includes('broker') ||
    v.includes('mqtt') ||
    v.includes('hivemq')
  );
}

/**
 * Convierte la dirección guardada en una URL WebSocket utilizable por la app.
 *   `broker.hivemq.com`            → `wss://broker.hivemq.com:8884/mqtt`
 *   `wss://mi-broker.com/mqtt`     → se respeta tal cual
 *   `http://mi-broker.com:8084`    → `ws://mi-broker.com:8084`
 */
export function urlBrokerMqtt(direccion: string): string {
  const v = direccion.trim();
  if (!v) return 'wss://broker.hivemq.com:8884/mqtt';
  if (/^wss?:\/\//i.test(v)) return v;
  if (/^https?:\/\//i.test(v)) return v.replace(/^http/i, 'ws');
  // Acepta también la forma usada por el firmware/simulador: mqtt://host:1883
  const mqttUrl = v.match(/^mqtts?:\/\/([^/]+)/i);
  if (mqttUrl) return `wss://${mqttUrl[1].replace(/:\d+$/, '')}:8884/mqtt`;
  const host = v.replace(/\/.*$/, '');
  if (host.includes(':')) return `wss://${host}/mqtt`;
  return `wss://${host}:8884/mqtt`;
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
            nombre: typeof d.nombre === 'string' && d.nombre.trim() ? d.nombre : 'Estación X',
            zona: typeof d.zona === 'string' ? d.zona : undefined,
            lat: typeof d.lat === 'number' ? d.lat : undefined,
            lng: typeof d.lng === 'number' ? d.lng : undefined,
            direccion: typeof d.direccion === 'string' ? d.direccion : 'broker.hivemq.com',
            topicoMqtt:
              typeof d.topicoMqtt === 'string' && d.topicoMqtt
                ? d.topicoMqtt
                : `colectivo/aire/${d.id as string}`,
            demo: d.demo === true,
            tokenPush: typeof d.tokenPush === 'string' ? d.tokenPush : undefined,
          }),
        )
    : [];
  const dispositivos = lista.length ? lista : base.dispositivos;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  const modoRaw = o.modoConexion;
  const modoConexion: ModoConexion = modoRaw === 'peor' ? 'peor' : 'cercana';

  return {
    dispositivos,
    activoId: typeof o.activoId === 'string' ? o.activoId : dispositivos[0].id,
    modoConexion,
    alertasActivas: typeof o.alertasActivas === 'boolean' ? o.alertasActivas : false,
    umbralNivel: umbralDesdeJson(o),
    avisarMejora: typeof o.avisarMejora === 'boolean' ? o.avisarMejora : false,
    intervaloSeg: Math.min(300, Math.max(1, num(o.intervaloSeg, 5))),
    usarGrupoVulnerable: o.usarGrupoVulnerable === true,
    grupoVulnerable: typeof o.grupoVulnerable === 'string' && o.grupoVulnerable ? o.grupoVulnerable : undefined,
    reporteProgramado: typeof o.reporteProgramado === 'boolean' ? o.reporteProgramado : false,
    horaReporte: typeof o.horaReporte === 'string' && o.horaReporte ? o.horaReporte : '08:00',
    alertaPeriodica: typeof o.alertaPeriodica === 'boolean' ? o.alertaPeriodica : false,
    intervaloAlertaHoras: typeof o.intervaloAlertaHoras === 'number' && o.intervaloAlertaHoras >= 1 ? Math.min(12, o.intervaloAlertaHoras) : 3,
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
