// ─────────────────────────────────────────────────────────────────────────────
// DEMO MULTINODO AURA-172 · ESP32 virtuales publicando por MQTT
// ─────────────────────────────────────────────────────────────────────────────
//
// Publica telemetría real (mismo JSON y cortes NOM-172 que el firmware) en:
//   colectivo/aire/nodo1  → Estación X      (aire estable)
//   colectivo/aire/nodo2  → Estación Norte  (tráfico medio)
//   colectivo/aire/nodo3  → Estación Sur    (episodios de aire malo)
//
// Uso:
//   npm run demo:multinodo
//   node herramientas/demo-multinodo.mjs --once
//   node herramientas/demo-multinodo.mjs --solo nodo2
//   node herramientas/demo-multinodo.mjs --malo
//   node herramientas/demo-multinodo.mjs --broker mqtt://broker.hivemq.com:1883
//
// Después, en la app:
//   Ajustes → Panel de Administración → + Agregar Nodo
//   Tópico: colectivo/aire/nodo2 (o nodo3), Broker: broker.hivemq.com
//
// El script necesita internet porque usa el broker público de HiveMQ.
// Para detenerlo: Ctrl + C.
// ─────────────────────────────────────────────────────────────────────────────

import mqtt from 'mqtt';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const bandera = (nombre) => args.includes(nombre);

const BROKER = opcion('--broker') ?? 'mqtt://broker.hivemq.com:1883';
const PREFIJO = opcion('--prefix') ?? 'colectivo/aire';
const SOLO = opcion('--solo');
const UNA_VEZ = bandera('--once');
const TODO_MALO = bandera('--malo');
const INTERVALO_MS = 2000;

const NODOS = [
  { id: 'nodo1', nombre: 'Estación X', base: 0.55, trafico: 0.35 },
  { id: 'nodo2', nombre: 'Estación Norte', base: 0.9, trafico: 0.75 },
  { id: 'nodo3', nombre: 'Estación Sur', base: 0.7, trafico: 0.5, episodios: true },
].filter((n) => !SOLO || n.id === SOLO);

if (NODOS.length === 0) {
  console.error(`No existe el nodo "${SOLO}". Usa nodo1, nodo2 o nodo3.`);
  process.exit(1);
}

const r = (amplitud) => (Math.random() * 2 - 1) * amplitud;
const fijar = (v, n) => Number(v.toFixed(n));

/** Nivel 0–4 según los cortes oficiales de la NOM-172-SEMARNAT-2023. */
const nivelDe = (valor, cortes) => cortes.filter((c) => valor > c).length;
const NIVELES = ['BUENA', 'ACEPTABLE', 'MALA', 'MUY MALA', 'EXTREMADAMENTE MALA'];

function esEpisodioMalo(nodo, ahora) {
  if (TODO_MALO) return true;
  if (!nodo.episodios && !TODO_MALO) return false;
  // El nodo3 tiene un episodio de 20 s cada 60 s para demostrar las alertas.
  return Math.floor(ahora / 20_000) % 3 === 2;
}

function lecturaDe(nodo, ahora) {
  const fecha = new Date(ahora);
  const hora = fecha.getHours() + fecha.getMinutes() / 60;
  const cicloDia = Math.sin((2 * Math.PI * (hora - 9)) / 24);
  const cicloTrafico = Math.max(0, Math.sin((2 * Math.PI * (hora - 6)) / 12));
  const malo = esEpisodioMalo(nodo, ahora);

  const pm25 = malo
    ? fijar(70 + r(12), 1)
    : fijar(6 + nodo.base * 8 + cicloTrafico * nodo.trafico * 18 + r(1.4), 1);
  const pm10 = malo
    ? fijar(100 + r(18), 1)
    : fijar(14 + nodo.base * 12 + cicloTrafico * nodo.trafico * 28 + r(2.5), 1);
  const pm1 = fijar(pm25 * 0.65 + r(0.8), 1);
  const co = malo
    ? fijar(10.5 + r(1.2), 2)
    : fijar(0.3 + cicloTrafico * nodo.trafico * 2.2 + r(0.08), 2);
  const temperatura = fijar(22.5 + 4.5 * cicloDia + r(0.25), 1);
  const humedad = fijar(58 - 7 * cicloDia + r(1.2), 1);

  const nivelPm25 = nivelDe(pm25, [15, 33, 79, 130]);
  const nivelPm10 = nivelDe(pm10, [50, 75, 155, 235]);
  const nivelCo = nivelDe(co, [5, 9, 12, 16]);
  const nivelGeneral = Math.max(nivelPm25, nivelPm10, nivelCo);

  let dominante = 'PM2.5';
  if (nivelPm10 > nivelPm25 && nivelPm10 >= nivelCo) dominante = 'PM10';
  else if (nivelCo > nivelPm25 && nivelCo > nivelPm10) dominante = 'CO';

  return {
    pm1,
    pm25,
    pm10,
    co,
    temp: temperatura,
    hum: humedad,
    nivel_pm25: nivelPm25,
    nivel_pm10: nivelPm10,
    nivel_co: nivelCo,
    nivel_general: nivelGeneral,
    dominante,
    estado: NIVELES[nivelGeneral],
  };
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        DEMO MULTINODO AURA-172 · MQTT en vivo            ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Broker: ${BROKER}`);
console.log(`Tópicos: ${NODOS.map((n) => `${PREFIJO}/${n.id}`).join(', ')}`);
console.log('Agrega cada nodo en: Ajustes → Panel de Administración → + Agregar Nodo');
if (!TODO_MALO) console.log('El nodo3 simula aire malo durante 20 s cada minuto.');
console.log('');

const cliente = mqtt.connect(BROKER, {
  clientId: `AURA172_Demo_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  connectTimeout: 10_000,
  reconnectPeriod: 3_000,
});

let conectado = false;

cliente.on('connect', () => {
  conectado = true;
  console.log('[MQTT] Conectado al broker. Publicando telemetría…');
  publicar();
  if (UNA_VEZ) {
    setTimeout(() => {
      console.log('[MQTT] Demo --once completada.');
      cliente.end(true);
    }, 900);
  }
});

cliente.on('reconnect', () => console.log('[MQTT] Reconectando…'));
cliente.on('error', (e) => console.error('[MQTT] Error:', e.message));
cliente.on('close', () => {
  if (conectado) console.log('[MQTT] Conexión cerrada.');
});

let temporizador = null;

function publicar() {
  const ahora = Date.now();
  for (const nodo of NODOS) {
    const topico = `${PREFIJO}/${nodo.id}`;
    const payload = JSON.stringify(lecturaDe(nodo, ahora));
    cliente.publish(topico, payload, { qos: 0, retain: false });
    const l = JSON.parse(payload);
    console.log(
      `${new Date(ahora).toLocaleTimeString()} ${topico} · PM2.5 ${l.pm25} · PM10 ${l.pm10} · CO ${l.co} · ${l.estado}`,
    );
  }
  if (!UNA_VEZ) temporizador = setTimeout(publicar, INTERVALO_MS);
}

process.on('SIGINT', () => {
  if (temporizador) clearTimeout(temporizador);
  console.log('\nDeteniendo demo…');
  cliente.end(false, () => process.exit(0));
});

setTimeout(() => {
  if (!conectado) {
    console.error('[MQTT] No se pudo conectar en 15 s. Revisa tu conexión a internet o el broker.');
    process.exit(1);
  }
}, 15_000);
