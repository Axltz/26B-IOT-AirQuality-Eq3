import { Paleta } from '../tema';

/**
 * Sensación térmica en °C.
 * Con calor y humedad usa el índice de calor de la NOAA (Rothfusz); en el
 * resto de los casos, la temperatura aparente de Steadman sin viento.
 */
export function sensacionTermica(t: number, humedad: number): number {
  if (t >= 27 && humedad >= 40) {
    const f = (t * 9) / 5 + 32;
    const r = humedad;
    const hi =
      -42.379 +
      2.04901523 * f +
      10.14333127 * r -
      0.22475541 * f * r -
      0.00683783 * f * f -
      0.05481717 * r * r +
      0.00122874 * f * f * r +
      0.00085282 * f * r * r -
      0.00000199 * f * f * r * r;
    return ((hi - 32) * 5) / 9;
  }
  const e = (humedad / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return t + 0.33 * e - 4.0;
}

export function etiquetaTemperatura(t: number): { texto: string; color: string } {
  if (t < 10) return { texto: 'Frío', color: Paleta.azul };
  if (t < 18) return { texto: 'Fresco', color: Paleta.azul };
  if (t < 26) return { texto: 'Confortable', color: Paleta.coral };
  if (t < 30) return { texto: 'Cálido', color: Paleta.coral };
  return { texto: 'Caluroso', color: Paleta.rojo };
}

export function etiquetaHumedad(h: number): { texto: string; color: string } {
  if (h < 30) return { texto: 'Seca', color: Paleta.naranja };
  if (h <= 60) return { texto: 'Óptima', color: Paleta.azul };
  if (h <= 70) return { texto: 'Elevada', color: Paleta.azul };
  return { texto: 'Muy húmeda', color: Paleta.naranja };
}
