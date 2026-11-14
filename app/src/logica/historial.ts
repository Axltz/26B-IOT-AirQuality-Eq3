import type { Lectura } from '../modelos/lectura';

export type Metrica = 'temperatura' | 'humedad' | 'aire';

export const METRICAS: Record<
  Metrica,
  { titulo: string; corto: string; rangoMinimo: number; formato: (v: number) => string }
> = {
  temperatura: { titulo: 'Temperatura', corto: 'Temperatura', rangoMinimo: 6, formato: (v) => `${Math.round(v)}°` },
  humedad: { titulo: 'Humedad', corto: 'Humedad', rangoMinimo: 16, formato: (v) => `${Math.round(v)}%` },
  aire: { titulo: 'Partículas PM2.5', corto: 'Aire', rangoMinimo: 20, formato: (v) => `${Math.round(v)}` },
};

export function valorMetrica(m: Metrica, l: Lectura): number | undefined {
  if (m === 'temperatura') return l.temperatura;
  if (m === 'humedad') return l.humedad;
  return l.pm25;
}

export interface PuntoGrafica {
  etiqueta: string;
  valor?: number;
  esAhora?: boolean;
}

const HORA = 3600_000;
const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Promedios por hora de las últimas `horas` horas completas más "Ahora".
 * Si son las 13:20, devuelve 08:00, 09:00, 10:00, 11:00, 12:00 y Ahora.
 */
export function puntosUltimasHoras(
  historial: Lectura[],
  actual: Lectura | null,
  metrica: Metrica,
  ahora: number,
  horas = 5,
): PuntoGrafica[] {
  const d = new Date(ahora);
  const horaActual = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
  const puntos: PuntoGrafica[] = [];
  for (let i = horas; i >= 1; i--) {
    const inicio = horaActual - i * HORA;
    const fin = inicio + HORA;
    let suma = 0;
    let n = 0;
    for (const l of historial) {
      if (l.fecha >= inicio && l.fecha < fin) {
        const v = valorMetrica(metrica, l);
        if (v !== undefined) {
          suma += v;
          n++;
        }
      }
    }
    puntos.push({ etiqueta: `${dos(new Date(inicio).getHours())}:00`, valor: n ? suma / n : undefined });
  }

  let valorAhora = actual ? valorMetrica(metrica, actual) : undefined;
  if (valorAhora === undefined && historial.length) {
    const ultimo = historial[historial.length - 1];
    if (ultimo.fecha >= horaActual) valorAhora = valorMetrica(metrica, ultimo);
  }
  puntos.push({ etiqueta: 'Ahora', valor: valorAhora, esAhora: true });
  return puntos;
}

/** Temperatura máxima y mínima registradas hoy. */
export function extremosDeHoy(historial: Lectura[], actual: Lectura | null, ahora: number) {
  const d = new Date(ahora);
  const medianoche = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let maxima: number | undefined;
  let minima: number | undefined;
  const considerar = (l: Lectura) => {
    const t = l.temperatura;
    if (t === undefined || l.fecha < medianoche) return;
    if (maxima === undefined || t > maxima) maxima = t;
    if (minima === undefined || t < minima) minima = t;
  };
  historial.forEach(considerar);
  if (actual) considerar(actual);
  return { maxima, minima };
}

export function horaCorta(fecha: number): string {
  const d = new Date(fecha);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** "justo ahora", "hace 5 s", "hace 3 min", "a las 13:45". */
export function haceCuanto(fecha: number, ahora: number): string {
  const s = Math.floor((ahora - fecha) / 1000);
  if (s < 5) return 'justo ahora';
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `a las ${horaCorta(fecha)}`;
}
