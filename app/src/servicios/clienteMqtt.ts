import mqtt, { type MqttClient } from 'mqtt';
import { lecturaDesdeJson, lecturaVacia, type Lectura } from '../modelos/lectura';

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
  // La app solo tiene un consumidor activo (el Monitor). Reemplazamos el
  // oyente para no acumular callbacks cada vez que se cambia de estación.
  if (onLectura) oyentes = [onLectura];

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

  // Al cambiar o reconectar no debe reutilizarse una lectura vieja de otro nodo.
  ultimaLecturaMqtt = null;
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

export interface NodoASondear {
  /** URL WebSocket del broker (ver `urlBrokerMqtt`). */
  url: string;
  /** Tópico MQTT del nodo. */
  topico: string;
}

/**
 * Sondea varios nodos a la vez y devuelve la primera lectura válida recibida
 * en cada tópico. Usa clientes temporales (uno por broker) que se cierran al
 * terminar, sin interferir con el cliente principal de la estación activa.
 */
export function sondearNodos(
  nodos: NodoASondear[],
  esperaMs = 4000,
): Promise<Record<string, Lectura>> {
  return new Promise((resolve) => {
    const lecturas: Record<string, Lectura> = {};
    const porBroker = new Map<string, string[]>();
    for (const n of nodos) {
      if (!n.topico) continue;
      const lista = porBroker.get(n.url) ?? [];
      if (!lista.includes(n.topico)) lista.push(n.topico);
      porBroker.set(n.url, lista);
    }
    const total = [...porBroker.values()].reduce((n, lista) => n + lista.length, 0);
    if (total === 0) {
      resolve(lecturas);
      return;
    }

    const clientes: MqttClient[] = [];
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let terminado = false;
    const finalizar = () => {
      if (terminado) return;
      terminado = true;
      if (temporizador) clearTimeout(temporizador);
      for (const c of clientes) {
        try {
          c.end(true);
        } catch {}
      }
      resolve(lecturas);
    };
    temporizador = setTimeout(finalizar, esperaMs);

    for (const [url, topicos] of porBroker) {
      let cliente: MqttClient;
      try {
        cliente = mqtt.connect(url, {
          clientId: `AURA172_Sondeo_${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          // El broker público a veces tarda varios segundos en aceptar la conexión;
          // el temporizador global ya decide cuándo dejar de esperar.
          connectTimeout: esperaMs,
          reconnectPeriod: 0,
        });
      } catch {
        continue;
      }
      clientes.push(cliente);
      cliente.on('connect', () => {
        cliente.subscribe(topicos, (err) => {
          if (err) console.error('[MQTT] Error al sondear tópicos:', err);
        });
      });
      cliente.on('message', (topico, mensaje) => {
        if (terminado || lecturas[topico]) return;
        try {
          const lectura = lecturaDesdeJson(
            JSON.parse(mensaje.toString()) as Record<string, unknown>,
          );
          if (lecturaVacia(lectura)) return;
          lecturas[topico] = lectura;
          if (Object.keys(lecturas).length === total) finalizar();
        } catch {
          // Un payload inválido de un nodo no debe impedir sondear los demás.
        }
      });
      cliente.on('error', () => {
        // El timeout global decide cuándo terminar.
      });
    }
  });
}

