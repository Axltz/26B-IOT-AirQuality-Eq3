/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, test } from 'node:test';

import { ESPERA_MEJORA_MS, evaluarAlerta, textoNotificacion, type EstadoAlerta, type Evaluacion } from '../src/logica/alertas';
import { evaluarAire } from '../src/logica/calidadAire';
import { derivarHash, generarSal, nuevaCredencial, sha256, verificarContrasena } from '../src/logica/credenciales';
import { resumirLectura } from '../src/logica/diagnostico';
import { sensacionTermica } from '../src/logica/confort';
import { promediosMovilesHoras, puntosPorMinuto, puntosUltimasHoras } from '../src/logica/historial';
import { grupoPorId, recomendacionDeGrupo, umbralEfectivo } from '../src/logica/gruposVulnerables';
import { estacionMasCercana, estacionPeorRiesgo } from '../src/logica/seleccionEstacion';
import {
  ajustesDesdeJson,
  ajustesPorDefecto,
  esBrokerMqtt,
  normalizarDireccion,
  urlBrokerMqtt,
  type Dispositivo,
} from '../src/modelos/ajustes';
import { lecturaDesdeJson } from '../src/modelos/lectura';
import { filasALecturas, urlConsultaLecturas } from '../src/servicios/historialNube';

const ahora = new Date(2026, 10, 8, 13, 20).getTime();
const aire = (o: object) => evaluarAire({ fecha: ahora, ...o });
const nivelDe = (o: object) => aire(o)!.nivel.nombre;

describe('NOM-172 (igual que el semáforo del ESP32)', () => {
  test('PM2.5: 15 · 33 · 79 · 130 µg/m³', () => {
    assert.equal(nivelDe({ pm25: 0 }), 'Buena');
    assert.equal(nivelDe({ pm25: 15 }), 'Buena');
    assert.equal(nivelDe({ pm25: 15.1 }), 'Aceptable');
    assert.equal(nivelDe({ pm25: 33 }), 'Aceptable');
    assert.equal(nivelDe({ pm25: 33.1 }), 'Mala');
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
      dispositivo: 'AURA-172', temperatura: 24.1, pm1: 9, pm25: 13.6, pm10: 17, co: 2.35,
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

  test('distingue broker MQTT de servidor HTTP local y arma la URL WSS', () => {
    assert.equal(esBrokerMqtt('broker.hivemq.com'), true);
    assert.equal(esBrokerMqtt('wss://mi-broker.com/mqtt'), true);
    assert.equal(esBrokerMqtt('192.168.1.50:8090'), false);

    assert.equal(urlBrokerMqtt('broker.hivemq.com'), 'wss://broker.hivemq.com:8884/mqtt');
    assert.equal(urlBrokerMqtt('wss://mi-broker.com/mqtt'), 'wss://mi-broker.com/mqtt');
    assert.equal(urlBrokerMqtt('mqtt://broker.hivemq.com:1883'), 'wss://broker.hivemq.com:8884/mqtt');
  });
});

test('sensación térmica del diseño (24° y 58 %) ≈ 25.7°', () => {
  assert.ok(Math.abs(sensacionTermica(24, 58) - 25.7) < 0.2);
});

test('puntos de la gráfica: 12 horas completas + Ahora', () => {
  const historial = [];
  for (let m = 12 * 60 - 10; m >= 0; m -= 10) {
    historial.push({ fecha: ahora - m * 60_000, temperatura: 20 });
  }
  const puntos = puntosUltimasHoras(historial, { fecha: ahora, temperatura: 24 }, 'temperatura', ahora);
  assert.deepEqual(
    puntos.map((p) => p.etiqueta),
    [
      '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 'Ahora',
    ],
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
  assert.equal(paso(40, ahora + 20_000).aviso, null); // vuelve a Mala: se reinicia la espera
  assert.equal(paso(20, ahora + 30_000).aviso, null);
  assert.equal(paso(20, ahora + 30_000 + ESPERA_MEJORA_MS).aviso, 'mejoro');
  assert.equal(estado!.enCurso, false);
  // Vuelve a empeorar 5 min después: alerta nueva pero sin notificar.
  assert.equal(paso(68, ahora + 5 * 60_000).aviso, null);
  assert.equal(estado!.enCurso, true);
  // Baja dos niveles (Buena): se cierra de inmediato.
  assert.equal(paso(8, ahora + 6 * 60_000).aviso, 'mejoro');
});

test('el umbral del grupo vulnerable nunca es más laxo que el configurado', () => {
  // Sin grupo marcado manda el umbral tal cual.
  assert.equal(umbralEfectivo(2, false, undefined), 2);
  assert.equal(umbralEfectivo(3, undefined, 'ninos'), 3);
  // Con grupo: toma el mínimo entre su umbral y el del grupo.
  assert.equal(umbralEfectivo(2, true, 'ninos'), 1);
  assert.equal(umbralEfectivo(1, true, 'ninos'), 1);
  // Grupo desconocido: no rompe, se queda con el umbral configurado.
  assert.equal(umbralEfectivo(2, true, 'inventado'), 2);
});

test('la recomendación del grupo habla de su caso y respeta el nivel mínimo', () => {
  const ninos = recomendacionDeGrupo('ninos', 1);
  assert.ok(ninos && ninos.includes('esfuerzos físicos')); // ya en Aceptable
  const adultos = recomendacionDeGrupo('adultos_mayores', 2);
  assert.ok(adultos && adultos.length > 0);
  assert.equal(recomendacionDeGrupo(undefined, 3), null);
  assert.equal(recomendacionDeGrupo('sin_grupo', 3), null);
});

test('con umbral 1 (grupo vulnerable) el aire Aceptable ya abre la alerta', () => {
  let estado: EstadoAlerta | null = null;
  const paso = (pm25: number): Evaluacion => {
    const lectura = { fecha: ahora, pm25 };
    const r = evaluarAlerta({
      actual: estado,
      aire: evaluarAire(lectura),
      lectura,
      umbral: 1, // nivel mínimo de los grupos: Aceptable ya avisa
      dispositivo: 'Casa',
      ahora,
    });
    estado = r.estado;
    return r;
  };
  assert.equal(paso(8).aviso, null); // Buena (nivel 0): aún no
  assert.equal(paso(20).aviso, 'empeoro'); // Aceptable (nivel 1): sí
  assert.equal(estado!.enCurso, true);
  assert.equal(estado!.nivel, 1);
});

test('la notificación dice explícitamente para qué grupo vulnerable es', () => {
  const estado: EstadoAlerta = {
    enCurso: true,
    inicio: ahora,
    nivel: 1,
    nivelMaximo: 1,
    pm25: 20,
    principal: 'pm25',
    dispositivo: 'Casa',
    leida: false,
    simulada: false,
  };
  const sinGrupo = textoNotificacion('empeoro', estado);
  assert.equal(sinGrupo.cuerpo.includes('Reducir esfuerzos'), false);
  assert.equal(sinGrupo.cuerpo.includes('personalizado'), false);

  const g = grupoPorId('ninos')!;
  const conGrupo = textoNotificacion('empeoro', estado, {
    nombre: g.nombre,
    recomendacion: recomendacionDeGrupo('ninos', 1),
  });
  // El nombre del grupo va en el título y en el cuerpo, con su recomendación.
  assert.ok(conGrupo.titulo.includes(g.nombre));
  assert.ok(conGrupo.cuerpo.includes(`personalizado para tu grupo (${g.nombre})`));
  assert.ok(conGrupo.cuerpo.includes('Reducir esfuerzos físicos'));
  // Sin recomendación todavía igual nombra al grupo.
  const sinRec = textoNotificacion('empeoro', estado, { nombre: g.nombre, recomendacion: null });
  assert.ok(sinRec.cuerpo.includes(g.nombre));
});

test('la gráfica en vivo promedia por minuto, no por segundo', () => {
  const base = Math.floor(ahora / 60_000) * 60_000; // inicio del minuto en curso
  const muestras = [
    { fecha: base - 2 * 60_000 + 5_000, pm25: 10 },
    { fecha: base - 2 * 60_000 + 40_000, pm25: 20 }, // mismo minuto → 15
    { fecha: base - 60_000 + 10_000, pm25: 30 },
    { fecha: base + 5_000, pm25: 40 }, // minuto en curso
  ];
  const puntos = puntosPorMinuto(muestras, null, 'pm25', ahora);
  assert.equal(puntos.length, 3);
  assert.equal(puntos[0].valor, 15); // promedio del minuto, no muestras sueltas
  assert.equal(puntos[1].valor, 30);
  assert.equal(puntos[2].valor, 40);
  assert.equal(puntos[2].esAhora, true);
  assert.equal(puntos[2].etiqueta, 'Ahora');
  // Etiquetas en formato de hora (HH:MM), no de segundos.
  assert.match(puntos[0].etiqueta, /^\d{2}:\d{2}$/);
  // Si la lectura actual ya está en el historial no se cuenta dos veces.
  const conActual = puntosPorMinuto(muestras, muestras[3], 'pm25', ahora);
  assert.equal(conActual[2].valor, 40);
});

test('por defecto existe solo el nodo principal colectivo/aire/nodo1', () => {
  const a = ajustesPorDefecto();
  assert.equal(a.dispositivos.length, 1);
  assert.equal(a.dispositivos[0].id, 'nodo1');
  assert.equal(a.dispositivos[0].topicoMqtt, 'colectivo/aire/nodo1');
  assert.equal(a.activoId, 'nodo1');
});

test('el enlace automático empieza en mayor riesgo, sin pedir ubicación', () => {
  assert.equal(ajustesPorDefecto().modoConexion, 'peor');
  assert.equal(ajustesDesdeJson({}).modoConexion, 'peor');
  // Una preferencia explícita de GPS sí se respeta.
  assert.equal(ajustesDesdeJson({ modoConexion: 'cercana' }).modoConexion, 'cercana');
});

test('todas las opciones de notificación empiezan desactivadas (opt-in)', () => {
  for (const a of [ajustesPorDefecto(), ajustesDesdeJson({})]) {
    assert.equal(a.alertasActivas, false);
    assert.equal(a.avisarMejora, false);
    assert.equal(a.reporteProgramado, false);
    assert.equal(a.alertaPeriodica, false);
    assert.equal(a.usarGrupoVulnerable, false);
  }
  // Lo que el usuario guardó explícitamente se respeta.
  assert.equal(ajustesDesdeJson({ alertasActivas: true }).alertasActivas, true);
});

test('el promedio móvil solo considera las últimas 12 horas', () => {
  const muestras = [
    { fecha: ahora - 60_000, co: 3 },
    { fecha: ahora - 6 * 3600_000, co: 5 },
    { fecha: ahora - 13 * 3600_000, co: 200 }, // fuera de la ventana
  ];
  const r = promediosMovilesHoras(muestras, null, 'co', ahora, 12);
  assert.equal(r.muestras, 2);
  assert.equal(r.promedio, 4);
  // Con lectura actual en vivo entra al cálculo.
  const r2 = promediosMovilesHoras(muestras, { fecha: ahora, co: 6 }, 'co', ahora, 12);
  assert.equal(r2.muestras, 3);
});

test('el umbral guardado con el ICA anterior se convierte a nivel NOM-172', () => {
  assert.equal(ajustesDesdeJson({ umbralIca: 101 }).umbralNivel, 1);
  assert.equal(ajustesDesdeJson({ umbralIca: 151 }).umbralNivel, 2);
  assert.equal(ajustesDesdeJson({ umbralIca: 201 }).umbralNivel, 3);
  assert.equal(ajustesDesdeJson({ umbralNivel: 3 }).umbralNivel, 3);
  assert.equal(ajustesDesdeJson({}).umbralNivel, 2);
});

describe('Enlace automático de estación', () => {
  const nodo = (id: string, extra: Partial<Dispositivo> = {}): Dispositivo => ({
    id,
    nombre: id,
    direccion: 'broker.hivemq.com',
    topicoMqtt: `colectivo/aire/${id}`,
    demo: false,
    ...extra,
  });

  test('estación más cercana usa coordenadas reales, no el orden de la lista', () => {
    const nodos = [
      nodo('sur', { lat: 20.5, lng: -103.3 }),
      nodo('centro', { lat: 20.67, lng: -103.34 }),
      nodo('sin-coords'),
    ];
    assert.equal(estacionMasCercana(nodos, 20.67, -103.35)!.id, 'centro');
    assert.equal(estacionMasCercana(nodos, 20.5, -103.3)!.id, 'sur');
    assert.equal(estacionMasCercana([nodo('sin-coords')], 20, -100), null);
  });

  test('mayor riesgo elige el peor nivel, no el último nodo de la lista', () => {
    const nodos = [nodo('bueno'), nodo('malo'), nodo('ultimo')];
    const lecturas = {
      'colectivo/aire/bueno': { fecha: ahora, pm25: 8 },
      'colectivo/aire/malo': { fecha: ahora, pm25: 90 },
      'colectivo/aire/ultimo': { fecha: ahora, pm25: 20 },
    };
    assert.equal(estacionPeorRiesgo(nodos, lecturas)!.id, 'malo');
  });

  test('mayor riesgo respeta el nivel del semáforo y desempata por PM2.5', () => {
    const nodos = [nodo('a'), nodo('b')];
    // 'b' tiene más PM2.5, pero su ESP32 reportó Buena: gana 'a' (Muy mala).
    assert.equal(
      estacionPeorRiesgo(nodos, {
        'colectivo/aire/a': { fecha: ahora, pm25: 40, nivelReportado: 3 },
        'colectivo/aire/b': { fecha: ahora, pm25: 100, nivelReportado: 0 },
      })!.id,
      'a',
    );
    assert.equal(
      estacionPeorRiesgo(nodos, {
        'colectivo/aire/a': { fecha: ahora, pm25: 40 },
        'colectivo/aire/b': { fecha: ahora, pm25: 100 },
      })!.id,
      'b',
    );
  });

  test('mayor riesgo ignora nodos sin lectura y no inventa un ganador', () => {
    const nodos = [nodo('sin-datos'), nodo('ultimo')];
    assert.equal(
      estacionPeorRiesgo(nodos, {
        'colectivo/aire/ultimo': { fecha: ahora, pm25: 5 },
      })!.id,
      'ultimo',
    );
    assert.equal(estacionPeorRiesgo(nodos, {}), null);
  });
});

describe('Histórico en Supabase', () => {
  test('las filas de la tabla lecturas se convierten en lecturas', () => {
    const [l] = filasALecturas([
      {
        creado_en: '2026-11-18T19:20:00+00:00',
        pm1: 6.1, pm25: 12.4, pm10: 20, co: 1.2, temp: 24.5, hum: 58,
        nivel_general: 0, dominante: 'PM2.5',
      },
    ]);
    assert.equal(l.fecha, Date.parse('2026-11-18T19:20:00Z'));
    assert.equal(l.pm25, 12.4);
    assert.equal(l.temperatura, 24.5);
    assert.equal(l.humedad, 58);
    assert.equal(l.nivelReportado, 0);
  });

  test('se descartan filas sin fecha válida o sin datos', () => {
    assert.deepEqual(filasALecturas(null), []);
    assert.deepEqual(filasALecturas({ message: 'error' }), []);
    assert.equal(
      filasALecturas([
        { creado_en: 'no es fecha', pm25: 10 },
        { creado_en: '2026-11-18T19:20:00Z' },
        { creado_en: '2026-11-18T19:21:00Z', temp: null, hum: null, pm25: 9 },
      ]).length,
      1,
    );
  });

  test('la consulta filtra por tópico y fecha, ordenada y paginada', () => {
    const url = urlConsultaLecturas('https://x.supabase.co', 'colectivo/aire/nodo1', Date.UTC(2026, 10, 18, 19), 1000);
    assert.ok(url.startsWith('https://x.supabase.co/rest/v1/lecturas?select='));
    assert.ok(url.includes('topico=eq.colectivo%2Faire%2Fnodo1'));
    assert.ok(url.includes('creado_en=gt.2026-11-18T19%3A00%3A00.000Z'));
    assert.ok(url.includes('order=creado_en.asc'));
    assert.ok(url.includes('limit=1000&offset=1000'));
  });
});

describe('Credenciales de administrador', () => {
  test('sha256 coincide con node:crypto (vacío, UTF-8 y varios bloques)', () => {
    for (const texto of ['', 'abc', 'contraseña ñ 😀', 'a'.repeat(55), 'a'.repeat(56), 'x'.repeat(200)]) {
      assert.equal(sha256(texto), createHash('sha256').update(texto, 'utf8').digest('hex'));
    }
  });

  test('verificarContrasena acepta la correcta y rechaza otra contraseña u otra sal', () => {
    const sal = generarSal();
    const hash = derivarHash('Secreta#2026', sal);
    assert.match(sal, /^[0-9a-f]{32}$/);
    assert.equal(verificarContrasena('Secreta#2026', sal, hash), true);
    assert.equal(verificarContrasena('secreta#2026', sal, hash), false);
    assert.equal(verificarContrasena('Secreta#2026', generarSal(), hash), false);
    assert.equal(verificarContrasena('Secreta#2026', '', ''), false);
  });

  test('nuevaCredencial rechaza contraseñas cortas y genera una verificable', () => {
    assert.deepEqual(nuevaCredencial('corta'), { error: 'La contraseña debe tener al menos 8 caracteres' });
    const c = nuevaCredencial('NuevaClave2026');
    assert.ok(!('error' in c));
    assert.equal(verificarContrasena('NuevaClave2026', c.sal, c.hash), true);
    assert.equal(verificarContrasena('OtraClave2026', c.sal, c.hash), false);
    // Cada credencial lleva su propia sal: la misma contraseña da otro hash.
    const otra = nuevaCredencial('NuevaClave2026');
    assert.ok(!('error' in otra));
    assert.notEqual(otra.hash, c.hash);
  });
});

describe('Diagnóstico del panel de administración', () => {
  test('resumirLectura muestra solo los valores presentes', () => {
    assert.equal(
      resumirLectura({ fecha: ahora, pm25: 12, co: 0.84, temperatura: 24, humedad: 40.25 }),
      'PM2.5 12 µg/m³ · CO 0.8 ppm · 24 °C · 40.3 % HR',
    );
    assert.equal(resumirLectura({ fecha: ahora, pm10: 30 }), 'PM10 30 µg/m³');
    assert.equal(resumirLectura({ fecha: ahora }), 'Lectura sin valores conocidos');
  });
});
