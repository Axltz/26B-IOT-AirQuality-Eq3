import type { Lectura } from '../modelos/lectura';

export type Metrica = 'temperatura' | 'humedad' | 'aire' | 'pm25' | 'pm10' | 'co' | 'pm1';

export const METRICAS: Record<
  Metrica,
  { titulo: string; corto: string; rangoMinimo: number; formato: (v: number) => string }
> = {
  temperatura: { titulo: 'Temperatura', corto: 'Temperatura', rangoMinimo: 6, formato: (v) => `${Math.round(v)}°C` },
  humedad: { titulo: 'Humedad', corto: 'Humedad', rangoMinimo: 16, formato: (v) => `${Math.round(v)}%` },
  aire: { titulo: 'Partículas PM2.5', corto: 'Aire', rangoMinimo: 20, formato: (v) => `${v.toFixed(1)} µg/m³` },
  pm25: { titulo: 'Partículas PM2.5', corto: 'PM2.5', rangoMinimo: 15, formato: (v) => `${v.toFixed(1)} µg/m³` },
  pm10: { titulo: 'Partículas PM10', corto: 'PM10', rangoMinimo: 25, formato: (v) => `${v.toFixed(1)} µg/m³` },
  co: { titulo: 'Monóxido de Carbono (CO)', corto: 'CO', rangoMinimo: 1, formato: (v) => `${v.toFixed(2)} ppm` },
  pm1: { titulo: 'Partículas PM1', corto: 'PM1', rangoMinimo: 10, formato: (v) => `${v.toFixed(1)} µg/m³` },
};

export function valorMetrica(m: Metrica, l: Lectura): number | undefined {
  if (m === 'temperatura') return l.temperatura;
  if (m === 'humedad') return l.humedad;
  if (m === 'pm25') return l.pm25;
  if (m === 'pm10') return l.pm10;
  if (m === 'co') return l.co;
  if (m === 'pm1') return l.pm1;
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
 * Por defecto son 12 horas: si son las 13:20, devuelve 01:00 … 12:00 y Ahora.
 */
export function puntosUltimasHoras(
  historial: Lectura[],
  actual: Lectura | null,
  metrica: Metrica,
  ahora: number,
  horas = 12,
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

/**
 * Calcula el promedio móvil de las últimas N horas (NOM-172: 12h para PM2.5, 8h para CO).
 */
export function promediosMovilesHoras(
  historial: Lectura[],
  actual: Lectura | null,
  metrica: Metrica,
  ahora: number,
  horas: number,
): { promedio?: number; muestras: number } {
  const inicio = ahora - horas * HORA;
  let suma = 0;
  let muestras = 0;

  for (const l of historial) {
    if (l.fecha >= inicio && l.fecha <= ahora) {
      const v = valorMetrica(metrica, l);
      if (v !== undefined) {
        suma += v;
        muestras++;
      }
    }
  }

  if (actual && actual.fecha >= inicio && actual.fecha <= ahora) {
    const v = valorMetrica(metrica, actual);
    if (v !== undefined) {
      suma += v;
      muestras++;
    }
  }

  return {
    promedio: muestras > 0 ? suma / muestras : undefined,
    muestras,
  };
}

/**
 * Puntos de la gráfica en vivo agrupados por minuto: cada punto es el promedio
 * de las muestras de ese minuto. Así la línea va cambiando minuto a minuto en
 * vez de saltar cada segundo, y el eje X se rotula con horas (HH:MM).
 *
 * El punto del minuto en curso se etiqueta "Ahora". Si no hay lecturas se
 * devuelve una lista vacía.
 */
export function puntosPorMinuto(
  historial: Lectura[],
  actual: Lectura | null,
  metrica: Metrica,
  ahora: number,
  maxPuntos = 30,
): PuntoGrafica[] {
  const porMinuto = new Map<number, { suma: number; n: number }>();
  const agregar = (l: Lectura) => {
    const v = valorMetrica(metrica, l);
    if (v === undefined) return;
    const minuto = Math.floor(l.fecha / 60_000);
    const acumulado = porMinuto.get(minuto);
    if (acumulado) {
      acumulado.suma += v;
      acumulado.n += 1;
    } else {
      porMinuto.set(minuto, { suma: v, n: 1 });
    }
  };
  for (const l of historial) agregar(l);
  // La lectura actual solo entra si aún no está en el historial (evita contarla dos veces).
  if (actual && !historial.some((l) => l.fecha === actual.fecha)) agregar(actual);

  const minutos = [...porMinuto.keys()].sort((a, b) => a - b).slice(-maxPuntos);
  const minutoEnCurso = Math.floor(ahora / 60_000);
  return minutos.map((minuto) => {
    const b = porMinuto.get(minuto)!;
    const esAhora = minuto === minutoEnCurso;
    return {
      etiqueta: esAhora ? 'Ahora' : horaCorta(minuto * 60_000),
      valor: b.suma / b.n,
      esAhora,
    };
  });
}

/** "justo ahora", "hace 5 s", "hace 3 min", "a las 13:45". */
export function haceCuanto(fecha: number, ahora: number): string {
  const s = Math.floor((ahora - fecha) / 1000);
  if (s < 5) return 'justo ahora';
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `a las ${horaCorta(fecha)}`;
}
