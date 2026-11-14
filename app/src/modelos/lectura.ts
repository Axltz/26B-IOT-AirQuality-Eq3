/**
 * Una lectura de los sensores del ESP32 en un momento dado.
 *
 * Todos los valores son opcionales: si tu ESP32 no tiene un sensor,
 * simplemente no manda ese campo y la app muestra "—".
 */
export interface Lectura {
  /** milisegundos desde 1970 */
  fecha: number;
  /** °C */
  temperatura?: number;
  /** % de humedad relativa */
  humedad?: number;
  /** Partículas finas PM2.5 en µg/m³ */
  pm25?: number;
  /** Partículas PM10 en µg/m³ */
  pm10?: number;
  /** Dióxido de carbono en ppm */
  co2?: number;
  /** Monóxido de carbono en ppm */
  co?: number;
  /** Compuestos orgánicos volátiles en ppm */
  cov?: number;
  /** Dióxido de nitrógeno en ppb */
  no2?: number;
  /** Nivel NOM-172 del semáforo del ESP32: 0 Buena … 4 Extremadamente mala (opcional) */
  nivelReportado?: number;
}

type Campo = 'temperatura' | 'humedad' | 'pm25' | 'pm10' | 'co2' | 'co' | 'cov' | 'no2' | 'nivel';

/** Nombres de campo aceptados en el JSON del ESP32 (español o inglés). */
const ALIAS: Record<Campo, string[]> = {
  temperatura: ['temperatura', 'temperature', 'temp', 'temp_c'],
  humedad: ['humedad', 'humidity', 'hum', 'rh'],
  pm25: ['pm25', 'pm2_5', 'pm2.5', 'pm_25'],
  pm10: ['pm10', 'pm_10'],
  co2: ['co2', 'eco2'],
  co: ['co'],
  cov: ['cov', 'voc', 'tvoc'],
  no2: ['no2'],
  nivel: ['nivel_nom172', 'nom172'],
};

export function lecturaVacia(l: Lectura): boolean {
  return (
    l.temperatura === undefined &&
    l.humedad === undefined &&
    l.pm25 === undefined &&
    l.pm10 === undefined &&
    l.co2 === undefined &&
    l.co === undefined &&
    l.cov === undefined &&
    l.no2 === undefined &&
    l.nivelReportado === undefined
  );
}

function numero(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function rango(v: number | undefined, min: number, max: number) {
  return v === undefined || v < min || v > max ? undefined : v;
}

/**
 * Convierte el JSON que manda el ESP32 en una Lectura.
 * Acepta objetos anidados (`{"sensores": {...}}`), números como texto y
 * descarta valores fuera de rango físico.
 */
export function lecturaDesdeJson(json: Record<string, unknown>, fecha = Date.now()): Lectura {
  const plano: Record<string, unknown> = {};
  const aplanar = (obj: Record<string, unknown>) => {
    for (const [clave, valor] of Object.entries(obj)) {
      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        aplanar(valor as Record<string, unknown>);
      } else if (!(clave.toLowerCase() in plano)) {
        plano[clave.toLowerCase()] = valor;
      }
    }
  };
  aplanar(json);

  const leer = (campo: Campo) => {
    for (const nombre of ALIAS[campo]) {
      const v = numero(plano[nombre]);
      if (v !== undefined) return v;
    }
    return undefined;
  };

  // COV en ppb (por ejemplo el SGP30) se convierte a ppm.
  let cov = leer('cov');
  if (cov === undefined) {
    const ppb = numero(plano['tvoc_ppb'] ?? plano['cov_ppb']);
    if (ppb !== undefined) cov = ppb / 1000;
  }
  const nivel = rango(leer('nivel'), 0, 4);

  return quitarVacios({
    fecha,
    temperatura: rango(leer('temperatura'), -40, 85),
    humedad: rango(leer('humedad'), 0, 100),
    pm25: rango(leer('pm25'), 0, 1000),
    pm10: rango(leer('pm10'), 0, 2000),
    co2: rango(leer('co2'), 250, 40000),
    co: rango(leer('co'), 0, 1000),
    cov: rango(cov, 0, 100),
    no2: rango(leer('no2'), 0, 10000),
    nivelReportado: nivel === undefined ? undefined : Math.round(nivel),
  });
}

function quitarVacios(l: Lectura): Lectura {
  const r = { ...l } as Record<string, unknown>;
  for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
  return r as unknown as Lectura;
}
