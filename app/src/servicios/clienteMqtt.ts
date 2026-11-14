import mqtt, { type MqttClient } from 'mqtt';
import { lecturaDesdeJson, type Lectura } from '../modelos/lectura';

export class ErrorEsp32 extends Error {}

/**
 * Cliente MQTT por WebSockets para conectarse al Broker público HiveMQ
 * y recibir la telemetría del ESP32 en tiempo real.
 */
let clienteMqtt: MqttClient | null = null;
let ultimaLecturaMqtt: Lectura | null = null;
let topicoActual = 'colectivo/aire/nodo1';
let oyentes: ((l: Lectura) => void)[] = [];
let estadoConexionMqtt: 'conectado' | 'desconectado' | 'error' = 'desconectado';

export function iniciarClienteMqtt(
  brokerWsUrl = 'wss://broker.hivemq.com:8884/mqtt',
  topico = 'colectivo/aire/nodo1',
  onLectura?: (l: Lectura) => void,
) {
  if (onLectura && !oyentes.includes(onLectura)) {
    oyentes.push(onLectura);
  }

  if (clienteMqtt && topicoActual === topico && clienteMqtt.connected) {
    if (ultimaLecturaMqtt && onLectura) onLectura(ultimaLecturaMqtt);
    return;
  }

  if (clienteMqtt) {
    try {
      clienteMqtt.end();
    } catch {}
    clienteMqtt = null;
  }

  topicoActual = topico;
  const clientId = 'AppMovil_Eq3_' + Math.random().toString(16).substring(2, 8);

  try {
    clienteMqtt = mqtt.connect(brokerWsUrl, {
      clientId,
      clean: true,
      connectTimeout: 7000,
      reconnectPeriod: 3000,
    });

    clienteMqtt.on('connect', () => {
      estadoConexionMqtt = 'conectado';
      clienteMqtt?.subscribe(topicoActual, (err) => {
        if (err) console.error('[MQTT] Error al suscribirse:', err);
      });
    });

    clienteMqtt.on('message', (_top, mensaje) => {
      try {
        const texto = mensaje.toString();
        const obj = JSON.parse(texto);
        const l = lecturaDesdeJson(obj);
        ultimaLecturaMqtt = l;
        oyentes.forEach((fn) => fn(l));
      } catch (err) {
        console.error('[MQTT] Error decodificando payload:', err);
      }
    });

    clienteMqtt.on('error', () => {
      estadoConexionMqtt = 'error';
    });

    clienteMqtt.on('close', () => {
      estadoConexionMqtt = 'desconectado';
    });
  } catch (err) {
    console.error('[MQTT] Falló conexión con broker:', err);
  }
}

export function detenerClienteMqtt() {
  if (clienteMqtt) {
    try {
      clienteMqtt.end();
    } catch {}
    clienteMqtt = null;
  }
  oyentes = [];
  estadoConexionMqtt = 'desconectado';
}

export function obtenerUltimaLecturaMqtt(): Lectura | null {
  return ultimaLecturaMqtt;
}

export function estadoMqtt(): string {
  return estadoConexionMqtt;
}

