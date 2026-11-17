import { evaluarAire } from './calidadAire';
import type { Dispositivo } from '../modelos/ajustes';
import type { Lectura } from '../modelos/lectura';

/**
 * Selección automática de estación.
 *
 * Funciones puras: reciben los nodos y, si aplica, sus lecturas, y devuelven
 * el nodo elegido. No tocan estado ni red, así que se pueden probar por
 * separado y el Monitor solo se encarga de ejecutar la decisión.
 */

/** Distancia en km entre dos puntos (haversine). */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Nodo con coordenadas válidas más próximo a la ubicación dada. */
export function estacionMasCercana(
  dispositivos: Dispositivo[],
  lat: number,
  lng: number,
): Dispositivo | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const conCoords = dispositivos.filter(
    (d) => Number.isFinite(d.lat) && Number.isFinite(d.lng),
  );
  if (conCoords.length === 0) return null;
  return conCoords.reduce((mejor, d) =>
    distanciaKm(lat, lng, d.lat!, d.lng!) < distanciaKm(lat, lng, mejor.lat!, mejor.lng!) ? d : mejor,
  );
}

/**
 * Nodo con peor calidad de aire según las lecturas recién sondeadas.
 *
 * `lecturas` se indexa por tópico MQTT. El nivel NOM-172 (0–4) manda; si dos
 * nodos empatan, gana el de mayor PM2.5 y, si aún empatan, el de mayor CO.
 * Los nodos sin lectura válida no compiten: nunca se elige un nodo del que no
 * se supo nada solo por estar al final de la lista.
 */
export function estacionPeorRiesgo(
  dispositivos: Dispositivo[],
  lecturas: Record<string, Lectura>,
): Dispositivo | null {
  let peor: Dispositivo | null = null;
  let peorNivel = -1;
  let peorPm25 = -1;
  let peorCo = -1;

  for (const d of dispositivos) {
    const lectura = lecturas[d.topicoMqtt];
    if (!lectura) continue;
    const calidad = evaluarAire(lectura);
    if (!calidad) continue;
    const nivel = calidad.nivel.indice;
    const pm25 = lectura.pm25 ?? -1;
    const co = lectura.co ?? -1;
    if (
      nivel > peorNivel ||
      (nivel === peorNivel && pm25 > peorPm25) ||
      (nivel === peorNivel && pm25 === peorPm25 && co > peorCo)
    ) {
      peor = d;
      peorNivel = nivel;
      peorPm25 = pm25;
      peorCo = co;
    }
  }
  return peor;
}
