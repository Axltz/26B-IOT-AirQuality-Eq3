import type { Lectura } from '../modelos/lectura';

const valor = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const hay = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Resumen corto de una lectura para "Probar conexión":
 * «PM2.5 12 µg/m³ · CO 0.8 ppm · 24 °C · 40 % HR». Solo incluye lo que trae.
 */
export function resumirLectura(l: Lectura): string {
  const partes: string[] = [];
  if (hay(l.pm25)) partes.push(`PM2.5 ${valor(l.pm25)} µg/m³`);
  if (hay(l.pm10)) partes.push(`PM10 ${valor(l.pm10)} µg/m³`);
  if (hay(l.co)) partes.push(`CO ${valor(l.co)} ppm`);
  if (hay(l.temperatura)) partes.push(`${valor(l.temperatura)} °C`);
  if (hay(l.humedad)) partes.push(`${valor(l.humedad)} % HR`);
  return partes.length ? partes.join(' · ') : 'Lectura sin valores conocidos';
}
