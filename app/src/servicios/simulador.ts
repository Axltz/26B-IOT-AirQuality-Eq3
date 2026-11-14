import type { Lectura } from '../modelos/lectura';

/**
 * Genera datos realistas para probar la app sin ESP32 (modo demostración).
 * La temperatura sigue el ciclo del día (mínima ~18° de madrugada, máxima ~27°
 * a media tarde) y el aire se mantiene limpio.
 */
export function lecturaSimulada(fecha: number, conRuido = true): Lectura {
  const d = new Date(fecha);
  const h = d.getHours() + d.getMinutes() / 60;
  const dia = Math.sin((2 * Math.PI * (h - 9)) / 24);
  const trafico = Math.sin((2 * Math.PI * (h - 6)) / 12);
  const ruido = (a: number) => (conRuido ? (Math.random() * 2 - 1) * a : 0);
  const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return {
    fecha,
    temperatura: 22.5 + 4.5 * dia + ruido(0.15),
    humedad: entre(58 - 7 * dia + ruido(0.8), 20, 95),
    pm25: entre(6.2 + 1.8 * trafico + ruido(0.5), 1, 500),
    pm10: entre(14 + 4 * trafico + ruido(1.2), 1, 900),
    co2: 610 + 70 * dia + ruido(12),
    co: entre(0.3 + 0.08 * trafico + ruido(0.03), 0, 50),
    cov: entre(0.18 + 0.03 * dia + ruido(0.01), 0, 20),
    no2: entre(14 + 4 * trafico + ruido(1), 0, 2000),
  };
}

/** Últimas 24 h con una muestra cada 5 minutos. */
export function historialSimulado(ahora: number): Lectura[] {
  const r: Lectura[] = [];
  for (let i = 288; i >= 1; i--) r.push(lecturaSimulada(ahora - i * 5 * 60_000));
  return r;
}
