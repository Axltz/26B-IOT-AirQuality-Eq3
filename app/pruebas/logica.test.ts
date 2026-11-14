/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ESPERA_MEJORA_MS, evaluarAlerta, type EstadoAlerta, type Evaluacion } from '../src/logica/alertas';
import { evaluarAire } from '../src/logica/calidadAire';
import { sensacionTermica } from '../src/logica/confort';
import { puntosUltimasHoras } from '../src/logica/historial';
import { ajustesDesdeJson, normalizarDireccion } from '../src/modelos/ajustes';
import { lecturaDesdeJson } from '../src/modelos/lectura';

const ahora = new Date(2026, 10, 8, 13, 20).getTime();
const aire = (o: object) => evaluarAire({ fecha: ahora, ...o });
const nivelDe = (o: object) => aire(o)!.nivel.nombre;

describe('NOM-172 (igual que el semáforo del ESP32)', () => {
  test('PM2.5: 15 · 25 · 79 · 130 µg/m³', () => {
    assert.equal(nivelDe({ pm25: 0 }), 'Buena');
    assert.equal(nivelDe({ pm25: 15 }), 'Buena');
    assert.equal(nivelDe({ pm25: 15.1 }), 'Aceptable');
    assert.equal(nivelDe({ pm25: 25 }), 'Aceptable');
    assert.equal(nivelDe({ pm25: 25.1 }), 'Mala');
    assert.equal(nivelDe({ pm25: 79 }), 'Mala');
    assert.equal(nivelDe({ pm25: 79.1 }), 'Muy mala');
    assert.equal(nivelDe({ pm25: 130 }), 'Muy mala');
    assert.equal(nivelDe({ pm25: 131 }), 'Extremadamente mala');
  });

  test('CO: 5 · 9 · 12 · 16 ppm', () => {
    assert.equal(nivelDe({ co: 5 }), 'Buena');
    assert.equal(nivelDe({ co: 5.1 }), 'Aceptable');
    assert.equal(nivelDe({ co: 9.5 }), 'Mala');
    assert.equal(nivelDe({ co: 12.5 }), 'Muy mala');
    assert.equal(nivelDe({ co: 17 }), 'Extremadamente mala');
  });

  test('manda el peor de PM2.5 y CO; los demás gases no cuentan', () => {
    const r = aire({ pm25: 8, co: 10, co2: 3000, no2: 900 })!;
    assert.equal(r.nivel.nombre, 'Mala');
    assert.equal(r.principal, 'co');
    assert.equal(aire({ pm25: 30, co: 2 })!.principal, 'pm25');
  });

  test('sin PM2.5 ni CO no hay nivel; se respeta el nivel del ESP32', () => {
    assert.equal(aire({ temperatura: 24, co2: 900 }), null);
    assert.equal(nivelDe({ nivelReportado: 3 }), 'Muy mala');
    // El semáforo manda: aunque el PM2.5 redondeado diga otra cosa.
    assert.equal(nivelDe({ pm25: 15.0, nivelReportado: 1 }), 'Aceptable');
  });
});

describe('JSON del ESP32', () => {
  test('acepta alias, texto y objetos anidados; descarta absurdos', () => {
    const l = lecturaDesdeJson({
      temperature: '24.5',
      sensores: { humidity: 58, pm2_5: 12.3 },
      tvoc_ppb: 180,
      co2: 50, // fuera de rango físico
    });
    assert.equal(l.temperatura, 24.5);
    assert.equal(l.humedad, 58);
    assert.equal(l.pm25, 12.3);
    assert.ok(Math.abs(l.cov! - 0.18) < 1e-9);
    assert.equal(l.co2, undefined);
  });

  test('lee el nivel del semáforo (nivel_nom172) del programa del ESP32', () => {
    const l = lecturaDesdeJson({
      dispositivo: 'Mi Entorno', temperatura: 24.1, pm1: 9, pm25: 13.6, pm10: 17, co: 2.35,
      nivel_nom172: 2, estado_nom172: 'MALA', pms5003: 'ok',
    });
    assert.equal(l.nivelReportado, 2);
    assert.equal(l.pm25, 13.6);
    assert.equal(lecturaDesdeJson({ nivel_nom172: 9 }).nivelReportado, undefined);
  });

  test('normaliza la dirección', () => {
    assert.equal(normalizarDireccion('192.168.1.50'), 'http://192.168.1.50');
    assert.equal(
      normalizarDireccion('http://192.168.1.50:8080/api/lecturas/'),
      'http://192.168.1.50:8080',
    );
  });
});

test('sensación térmica del diseño (24° y 58 %) ≈ 25.7°', () => {
  assert.ok(Math.abs(sensacionTermica(24, 58) - 25.7) < 0.2);
});

test('puntos de la gráfica: 5 horas completas + Ahora', () => {
  const historial = [];
  for (let m = 6 * 60 - 10; m >= 0; m -= 10) {
    historial.push({ fecha: ahora - m * 60_000, temperatura: 20 });
  }
  const puntos = puntosUltimasHoras(historial, { fecha: ahora, temperatura: 24 }, 'temperatura', ahora);
  assert.deepEqual(
    puntos.map((p) => p.etiqueta),
    ['08:00', '09:00', '10:00', '11:00', '12:00', 'Ahora'],
  );
  assert.equal(puntos.at(-1)!.valor, 24);
  assert.equal(puntos[0].valor, 20);
});

test('alertas: abre, escala, cierra y respeta el enfriamiento', () => {
  let estado: EstadoAlerta | null = null;
  const paso = (pm25: number, cuando = ahora): Evaluacion => {
    const lectura = { fecha: cuando, pm25 };
    const r = evaluarAlerta({
      actual: estado,
      aire: evaluarAire(lectura),
      lectura,
      umbral: 2, // Mala
      dispositivo: 'Casa',
      ahora: cuando,
    });
    estado = r.estado;
    return r;
  };
  assert.equal(paso(8).aviso, null);
  assert.equal(paso(20).aviso, null); // Aceptable: no llega al umbral
  assert.equal(paso(68).aviso, 'empeoro');
  assert.equal(estado!.enCurso, true);
  assert.equal(paso(70).aviso, null); // sigue igual
  assert.equal(paso(100).aviso, 'empeoro'); // sube a Muy mala
  assert.equal(estado!.nivelMaximo, 3);
  // Baja a Aceptable (un nivel abajo del umbral): espera un minuto antes de cerrar.
  assert.equal(paso(20, ahora + 10_000).aviso, null);
  assert.equal(estado!.enCurso, true);
  assert.equal(paso(30, ahora + 20_000).aviso, null); // vuelve a Mala: se reinicia la espera
  assert.equal(paso(20, ahora + 30_000).aviso, null);
  assert.equal(paso(20, ahora + 30_000 + ESPERA_MEJORA_MS).aviso, 'mejoro');
  assert.equal(estado!.enCurso, false);
  // Vuelve a empeorar 5 min después: alerta nueva pero sin notificar.
  assert.equal(paso(68, ahora + 5 * 60_000).aviso, null);
  assert.equal(estado!.enCurso, true);
  // Baja dos niveles (Buena): se cierra de inmediato.
  assert.equal(paso(8, ahora + 6 * 60_000).aviso, 'mejoro');
});

test('el umbral guardado con el ICA anterior se convierte a nivel NOM-172', () => {
  assert.equal(ajustesDesdeJson({ umbralIca: 101 }).umbralNivel, 1);
  assert.equal(ajustesDesdeJson({ umbralIca: 151 }).umbralNivel, 2);
  assert.equal(ajustesDesdeJson({ umbralIca: 201 }).umbralNivel, 3);
  assert.equal(ajustesDesdeJson({ umbralNivel: 3 }).umbralNivel, 3);
  assert.equal(ajustesDesdeJson({}).umbralNivel, 2);
});
