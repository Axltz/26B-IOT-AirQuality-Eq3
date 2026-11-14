// ESP32 de mentiras para probar la app sin hardware.
//
//   npm run esp32-simulado            (puerto 8090)
//   node herramientas/esp32-simulado.mjs 8091
//
// Responde igual que esp32/MiEntorno_ESP32:
//   GET  /api/lecturas        lectura actual
//   GET  /api/historial       muestras de las últimas 24 h
//   POST /api/push            registra un teléfono para notificaciones push
//   POST /api/push/borrar     lo quita
//   GET  /simular/malo        el aire se vuelve malo (PM2.5 = 68 µg/m³)
//   GET  /simular/normal      el aire vuelve a la normalidad
//
// Si hay teléfonos registrados, al pasar a "malo" manda una notificación push
// real a través del servicio de Expo (igual que el ESP32).
//
// En la app: Agregar ESP32 > "localhost:8090" (navegador) o
// "<IP de tu PC>:8090" (teléfono en la misma red Wi-Fi).

import http from 'node:http';
import os from 'node:os';

const puerto = Number(process.argv[2] ?? 8090);
let aireMalo = false;
const tokens = new Set();
let umbral = 2; // nivel NOM-172 a partir del cual avisar (2 = Mala)
let avisarMejora = true;
let alertaEnCurso = false;

function lectura(fecha, ruido = true) {
  const d = new Date(fecha);
  const h = d.getHours() + d.getMinutes() / 60;
  const dia = Math.sin((2 * Math.PI * (h - 9)) / 24);
  const trafico = Math.sin((2 * Math.PI * (h - 6)) / 12);
  const r = (a) => (ruido ? (Math.random() * 2 - 1) * a : 0);
  const d1 = (v, n) => Number(v.toFixed(n));
  return {
    temperatura: d1(22.5 + 4.5 * dia + r(0.15), 2),
    humedad: d1(58 - 7 * dia + r(0.8), 1),
    pm25: aireMalo ? 68 : d1(6.2 + 1.8 * trafico + r(0.5), 1),
    pm10: aireMalo ? 96 : d1(14 + 4 * trafico + r(1.2), 1),
    co2: Math.round(610 + 70 * dia + r(12)),
    co: d1(0.3 + 0.08 * trafico + r(0.03), 2),
    cov: d1(0.18 + 0.03 * dia + r(0.01), 3),
    no2: d1(14 + 4 * trafico + r(1), 1),
  };
}

// Nivel NOM-172 igual que el semáforo del ESP32: PM2.5 y CO, manda el peor.
const NIVELES = ['BUENA', 'ACEPTABLE', 'MALA', 'MUY MALA', 'EXTREMADAMENTE MALA'];
const nivelDe = (valor, cortes) => cortes.filter((c) => valor > c).length;
const nivelNom172 = (l) => Math.max(nivelDe(l.pm25, [15, 25, 79, 130]), nivelDe(l.co, [5, 9, 12, 16]));

async function enviarPush(titulo, cuerpo) {
  if (!tokens.size) return;
  const mensajes = [...tokens].map((to) => ({
    to, title: titulo, body: cuerpo, sound: 'default', priority: 'high', channelId: 'alertas-aire', data: { tipo: 'alerta' },
  }));
  try {
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes),
    });
    console.log(`Push enviado (${r.status}):`, await r.text());
  } catch (e) {
    console.log('No se pudo enviar el push:', e.message);
  }
}

function revisarAlerta() {
  const nivel = nivelNom172(lectura(Date.now(), false));
  if (!alertaEnCurso && nivel >= umbral) {
    alertaEnCurso = true;
    void enviarPush(
      'MALA CALIDAD DEL AIRE',
      'Se ha detectado una mala calidad del aire en su zona, favor de tomar precaución al salir de casa.',
    );
  } else if (alertaEnCurso && nivel < umbral) {
    alertaEnCurso = false;
    if (avisarMejora) void enviarPush('La calidad del aire mejoró', `La calidad del aire ahora es ${NIVELES[nivel].toLowerCase()}.`);
  }
}
setInterval(revisarAlerta, 5000);

function leerCuerpo(req) {
  return new Promise((resolver) => {
    let datos = '';
    req.on('data', (c) => (datos += c));
    req.on('end', () => {
      try {
        resolver(JSON.parse(datos || '{}'));
      } catch {
        resolver({});
      }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  const ruta = new URL(req.url, 'http://x').pathname;
  let codigo = 200;
  let cuerpo;
  if (ruta === '/api/lecturas') {
    const l = lectura(Date.now());
    const nivel = nivelNom172(l);
    cuerpo = { dispositivo: 'ESP32 simulado', ...l, nivel_nom172: nivel, estado_nom172: NIVELES[nivel], push: tokens.size };
  } else if (ruta === '/api/historial') {
    const ahora = Date.now();
    const muestras = [];
    for (let i = 288; i >= 1; i--) muestras.push({ hace_s: i * 300, ...lectura(ahora - i * 300_000) });
    cuerpo = { intervalo_s: 300, muestras };
  } else if (ruta === '/api/push' && req.method === 'POST') {
    const d = await leerCuerpo(req);
    if (typeof d.token !== 'string' || !/^Expo(nent)?PushToken\[/.test(d.token)) {
      codigo = 400;
      cuerpo = { error: 'token no valido' };
    } else {
      tokens.add(d.token);
      if (typeof d.umbral === 'number') umbral = Math.min(4, Math.max(1, Math.round(d.umbral)));
      if (typeof d.avisarMejora === 'boolean') avisarMejora = d.avisarMejora;
      cuerpo = { ok: true, telefonos: tokens.size };
    }
  } else if (ruta === '/api/push/borrar' && req.method === 'POST') {
    tokens.delete((await leerCuerpo(req)).token);
    cuerpo = { ok: true };
  } else if (ruta === '/simular/malo') {
    aireMalo = true;
    cuerpo = { aire: 'malo' };
  } else if (ruta === '/simular/normal') {
    aireMalo = false;
    cuerpo = { aire: 'normal' };
  } else {
    codigo = 404;
    cuerpo = { error: 'no encontrado' };
  }
  console.log(`${new Date().toTimeString().slice(0, 8)} ${req.method} ${ruta} -> ${codigo}`);
  res.writeHead(codigo, { 'Content-Type': 'application/json' }).end(JSON.stringify(cuerpo));
});

servidor.listen(puerto, '0.0.0.0', () => {
  console.log(`ESP32 simulado escuchando en el puerto ${puerto}`);
  console.log(`  http://localhost:${puerto}/api/lecturas`);
  for (const [nombre, dirs] of Object.entries(os.networkInterfaces())) {
    for (const d of dirs ?? []) if (d.family === 'IPv4' && !d.internal) console.log(`  http://${d.address}:${puerto}   (${nombre})`);
  }
  console.log('Aire malo: /simular/malo   ·   normal: /simular/normal');
});
