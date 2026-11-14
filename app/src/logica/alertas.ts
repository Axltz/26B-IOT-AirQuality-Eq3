import type { Lectura } from '../modelos/lectura';
import { CONTAMINANTES, nivel as nivelDe, type CalidadAire, type Contaminante } from './calidadAire';

/** Estado de la alerta de calidad del aire de un dispositivo. */
export interface EstadoAlerta {
  /** true mientras el aire siga en el umbral o peor */
  enCurso: boolean;
  inicio: number;
  fin?: number;
  /** Nivel NOM-172 más reciente (0 Buena … 4 Extremadamente mala) */
  nivel: number;
  nivelMaximo: number;
  pm25?: number;
  co?: number;
  principal: Contaminante;
  /** Desde cuándo el aire está por debajo del umbral sin haber cerrado la alerta */
  mejorandoDesde?: number;
  dispositivo: string;
  leida: boolean;
  simulada: boolean;
}

export type TipoAviso = 'empeoro' | 'mejoro';

export interface Evaluacion {
  estado: EstadoAlerta | null;
  aviso: TipoAviso | null;
}

/**
 * Para dar la alerta por terminada el aire debe bajar dos niveles del umbral,
 * o quedarse por debajo del umbral durante este tiempo. Así no llegan avisos
 * de "mejoró" seguidos cuando el aire ronda el límite.
 */
export const ESPERA_MEJORA_MS = 60_000;

/** Si una alerta terminó hace menos de esto, una nueva no vuelve a notificar. */
export const ENFRIAMIENTO_MS = 15 * 60_000;

/**
 * Decide si hay que abrir, actualizar o cerrar la alerta con la nueva
 * lectura. Es una función pura: no guarda ni notifica nada.
 * `umbral` es el índice de nivel a partir del cual se avisa (2 = Mala).
 */
export function evaluarAlerta(p: {
  actual: EstadoAlerta | null;
  aire: CalidadAire | null;
  lectura: Lectura;
  umbral: number;
  dispositivo: string;
  ahora: number;
  simulada?: boolean;
}): Evaluacion {
  const { actual, aire, lectura, umbral, dispositivo, ahora, simulada = false } = p;
  if (!aire) return { estado: actual, aviso: null };
  const n = aire.nivel.indice;

  if (!actual?.enCurso) {
    if (n < umbral) return { estado: actual, aviso: null };
    const reciente =
      !simulada && actual?.fin !== undefined && ahora - actual.fin < ENFRIAMIENTO_MS;
    return {
      estado: {
        enCurso: true,
        inicio: ahora,
        nivel: n,
        nivelMaximo: n,
        pm25: lectura.pm25,
        co: lectura.co,
        principal: aire.principal,
        dispositivo,
        leida: false,
        simulada,
      },
      aviso: reciente ? null : 'empeoro',
    };
  }

  if (n < umbral) {
    const desde = actual.mejorandoDesde ?? ahora;
    const termina = actual.simulada || n <= umbral - 2 || ahora - desde >= ESPERA_MEJORA_MS;
    if (termina) {
      return {
        estado: { ...actual, enCurso: false, fin: ahora, nivel: n, mejorandoDesde: undefined },
        aviso: 'mejoro',
      };
    }
    return { estado: { ...actual, nivel: n, mejorandoDesde: desde }, aviso: null };
  }

  // Sigue en curso: si sube de nivel (p. ej. de Mala a Muy mala), se avisa de nuevo.
  const escalo = n > actual.nivelMaximo;
  return {
    estado: {
      ...actual,
      nivel: n,
      nivelMaximo: Math.max(actual.nivelMaximo, n),
      pm25: lectura.pm25 ?? actual.pm25,
      co: lectura.co ?? actual.co,
      principal: aire.principal,
      mejorandoDesde: undefined,
      leida: escalo ? false : actual.leida,
      simulada: actual.simulada || simulada,
    },
    aviso: escalo ? 'empeoro' : null,
  };
}

/** Textos de la notificación del sistema. */
export function textoNotificacion(aviso: TipoAviso, a: EstadoAlerta): { titulo: string; cuerpo: string } {
  if (aviso === 'mejoro') {
    return {
      titulo: 'La calidad del aire mejoró',
      cuerpo: `La calidad del aire en ${a.dispositivo} ahora es ${nivelDe(a.nivel).adjetivo}.`,
    };
  }
  const c = CONTAMINANTES[a.principal] ?? CONTAMINANTES.sensor;
  if (c.exterior) {
    return {
      titulo: 'MALA CALIDAD DEL AIRE',
      cuerpo:
        'Se ha detectado una mala calidad del aire en su zona, favor de tomar precaución al salir de casa.',
    };
  }
  return {
    titulo: 'MALA CALIDAD DEL AIRE',
    cuerpo: `Se detectó una concentración elevada de ${c.enFrase} en ${a.dispositivo}. Ventila el espacio cuanto antes.`,
  };
}
