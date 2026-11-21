import type { Monitor } from '../estado/monitor';
import { CONTAMINANTES } from '../logica/calidadAire';

/**
 * Ayudas de presentación compartidas por Inicio, Contaminantes y el fondo.
 * Repiten exactamente los criterios que ya usaba la pantalla de Resumen; no
 * cambian ningún cálculo del índice NOM-172.
 */

/** ¿Hay datos reales del sensor? (sin conexión o sin lectura no se asume nada) */
export function hayLecturaReal(m: Monitor): boolean {
  const l = m.lectura;
  return (
    m.conexion === 'enLinea' &&
    l !== null &&
    (l.pm25 !== undefined || l.co !== undefined || l.estado !== undefined)
  );
}

/**
 * Nivel general (0–4) que se muestra: el que manda el ESP32 (`nivel_general` o
 * `nivelReportado`) o el calculado con la regla de dominancia. Null si no hay
 * lectura real.
 */
export function nivelGeneral(m: Monitor): number | null {
  if (!hayLecturaReal(m)) return null;
  const l = m.lectura!;
  return l.nivel_general !== undefined
    ? l.nivel_general
    : l.nivelReportado !== undefined
      ? l.nivelReportado
      : (m.aire?.nivel.indice ?? 0);
}

/** Contaminante determinante tal como lo reporta el ESP32 o la dominancia. */
export function dominante(m: Monitor): string {
  const principal = m.aire?.principal;
  return m.lectura?.dominante ?? (principal && principal !== 'sensor' ? CONTAMINANTES[principal].simbolo : 'PM2.5');
}
