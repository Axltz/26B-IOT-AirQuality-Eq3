import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { useEstilos, useTema } from '../estado/tema';
import { indiceDe, posicionBarra } from '../logica/calidadAire';
import {
  METRICAS,
  promediosMovilesHoras,
  puntosPorMinuto,
  puntosUltimasHoras,
  type Metrica,
  type PuntoGrafica,
} from '../logica/historial';
import type { Lectura } from '../modelos/lectura';
import type { PaletaTema } from '../tema';
import { Cifra, Etiqueta, Icono, Segmentos, T, Tarjeta, ValorConUnidad, numero } from './comunes';
import { Grafica } from './Grafica';
import { HORAS_PROMEDIO, PastillaConexion } from './Inicio';
import { Medidor } from './Medidor';
import { FranjaNeutra, FranjaNivel } from './Nivel';

export type SubMetricaParticulas = 'pm25' | 'pm10' | 'pm1';

/**
 * Escalas de partículas que ya usaba la pantalla de Resumen. PM2.5 usa los
 * cortes y `posicionBarra()` de calidadAire.ts; PM10 conserva sus cortes de
 * presentación (calidadAire.ts no los define) y PM1 no tiene escala NOM-172.
 */
const ESCALAS_PARTICULAS: Record<
  SubMetricaParticulas,
  { etiqueta: string; fin: string; indice: (v: number) => number | null; posicion: (v: number) => number | null }
> = {
  pm25: {
    etiqueta: 'PM2.5',
    fin: '130+',
    indice: (v) => indiceDe('pm25', v),
    posicion: (v) => posicionBarra('pm25', v),
  },
  pm10: {
    etiqueta: 'PM10',
    fin: '235+',
    indice: (v) => (v <= 50 ? 0 : v <= 75 ? 1 : v <= 155 ? 2 : v <= 235 ? 3 : 4),
    posicion: (v) => posicionTramos(v, [50, 75, 155, 235]),
  },
  pm1: { etiqueta: 'PM1', fin: '', indice: () => null, posicion: () => null },
};

function posicionTramos(valor: number, cortes: number[]): number {
  const tramos = [0, ...cortes, cortes[3] * 1.5];
  for (let i = 0; i < 5; i++) {
    if (valor <= tramos[i + 1]) {
      const f = (valor - tramos[i]) / (tramos[i + 1] - tramos[i]);
      return (i + Math.min(1, Math.max(0, f))) / 5;
    }
  }
  return 1;
}

/** Nivel (0–4) de un valor de la métrica, o null si la métrica no tiene escala. */
function indiceMetrica(metrica: Metrica, v: number): number | null {
  if (metrica === 'pm25' || metrica === 'aire') return indiceDe('pm25', v);
  if (metrica === 'co') return indiceDe('co', v);
  if (metrica === 'pm10') return ESCALAS_PARTICULAS.pm10.indice(v);
  return null;
}

const valorParticula = (l: Lectura | null, t: SubMetricaParticulas) =>
  t === 'pm25' ? l?.pm25 : t === 'pm10' ? l?.pm10 : l?.pm1;

/** Partículas suspendidas: selector PM2.5 / PM10 / PM1, franja, medidor y promedio 12 h. */
export function AnalisisAire({
  tab,
  alCambiarTab,
}: {
  tab: SubMetricaParticulas;
  alCambiarTab: (t: SubMetricaParticulas) => void;
}) {
  const m = useMonitor();
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const cfg = ESCALAS_PARTICULAS[tab];
  const v = valorParticula(m.lectura, tab);
  const idx = v !== undefined ? cfg.indice(v) : null;
  const pos = v !== undefined ? cfg.posicion(v) : null;
  const prom = promediosMovilesHoras(m.historial, m.lectura, tab, Date.now(), HORAS_PROMEDIO).promedio;

  return (
    <Tarjeta>
      {idx !== null ? (
        <FranjaNivel indice={idx} />
      ) : (
        <FranjaNeutra texto={tab === 'pm1' ? 'Sin escala NOM-172' : 'Esperando lectura'} />
      )}
      <Segmentos
        rol="tab"
        valor={tab}
        opciones={[
          ['pm25', 'PM2.5'],
          ['pm10', 'PM10'],
          ['pm1', 'PM1'],
        ]}
        alElegir={alCambiarTab}
      />
      {tab === 'pm1' ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <ValorConUnidad valor={v !== undefined ? numero(v, 1) : '--'} unidad="µg/m³ · en vivo" tam={40} />
          <View style={e.caja}>
            <Icono nombre="information-outline" tam={16} color={tema.textoSuave} />
            <T t={11} c={tema.textoSuave} style={{ flex: 1 }}>
              Monitoreo informativo — sin límite en NOM-172
            </T>
          </View>
        </View>
      ) : (
        <Medidor posicion={pos} valor={v !== undefined ? numero(v, 1) : '--'} unidad="µg/m³ · en vivo" fin={cfg.fin} />
      )}
      <FilaPromedio valor={prom} unidad="µg/m³" decimales={1} />
    </Tarjeta>
  );
}

function FilaPromedio({ valor, unidad, decimales }: { valor: number | undefined; unidad: string; decimales: number }) {
  const tema = useTema();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <T t={11.5} c={tema.textoSuave}>
        Promedio 12 h
      </T>
      <Cifra t={11.5} f="negrita">
        {valor !== undefined ? `${numero(valor, decimales)} ${unidad}` : 'Sin datos'}
      </Cifra>
    </View>
  );
}

/**
 * Telemetría de la métrica elegida: «Últimas 12 h» (barras con el color de
 * su nivel) o «En vivo · minuto» (línea por minuto de la sesión).
 */
export function TarjetaGrafica({ metrica, historialSesion }: { metrica: Metrica; historialSesion: Lectura[] }) {
  const m = useMonitor();
  const tema = useTema();
  const [vista, setVista] = useState<'12h' | 'vivo'>('12h');
  const [ahora, setAhora] = useState(Date.now());

  // El reloj refresca las etiquetas para que «Ahora» avance aunque no llegue lectura nueva.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(reloj);
  }, []);

  // Las barras de métricas con escala toman el color de su nivel; el resto y
  // la línea en vivo usan cian (datos) o, para temperatura, el tono de peligro.
  const color = metrica === 'temperatura' ? tema.peligro : tema.sistemaTexto;
  const puntos: PuntoGrafica[] =
    vista === 'vivo'
      ? puntosPorMinuto(historialSesion, m.lectura, metrica, ahora)
      : puntosUltimasHoras(m.historial, m.lectura, metrica, ahora, 12);

  let maximo: PuntoGrafica | null = null;
  for (const p of puntos) if (p.valor !== undefined && (maximo === null || p.valor > maximo.valor!)) maximo = p;
  const fmt = METRICAS[metrica].formato;

  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flexShrink: 1 }}>
          <Etiqueta>Telemetría</Etiqueta>
          <T t={15} f="extra" style={{ marginTop: 3 }}>
            {METRICAS[metrica].titulo}
          </T>
        </View>
        <PastillaConexion />
      </View>
      <Segmentos
        rol="tab"
        valor={vista}
        opciones={[
          ['12h', 'Últimas 12 h'],
          ['vivo', 'En vivo · minuto'],
        ]}
        alElegir={setVista}
      />
      {vista === '12h' ? (
        <GraficaBarras puntos={puntos} metrica={metrica} color={color} />
      ) : (
        <Grafica puntos={puntos} metrica={metrica} color={color} />
      )}
      <T t={11} c={tema.textoSuave}>
        {vista === '12h' ? (
          maximo ? (
            <>
              Máximo registrado{' '}
              <Cifra t={11} f="negrita">
                {fmt(maximo.valor!)}
              </Cifra>{' '}
              {maximo.esAhora ? 'ahora' : `a las ${maximo.etiqueta}`}.
            </>
          ) : (
            'Promedio por hora de las últimas 12 horas (ventana NOM-172).'
          )
        ) : (
          'Cada punto es el promedio del minuto; la línea avanza minuto a minuto.'
        )}
      </T>
    </Tarjeta>
  );
}

/** Barras por hora con el color `lv` de su nivel; la última («ahora») va contorneada. */
function GraficaBarras({ puntos, metrica, color }: { puntos: PuntoGrafica[]; metrica: Metrica; color: string }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const valores = puntos.map((p) => p.valor).filter((v): v is number => v !== undefined);
  const max = valores.length ? Math.max(...valores) * 1.06 : 1;
  const fmt = METRICAS[metrica].formato;
  const resumen = puntos
    .filter((p) => p.valor !== undefined)
    .map((p) => `${p.etiqueta}: ${fmt(p.valor!)}`)
    .join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Gráfica de las últimas 12 horas. ${resumen || 'Sin datos todavía.'}`}>
      <View style={e.barras}>
        {valores.length === 0 ? (
          <T t={11} c={tema.textoSuave} style={{ alignSelf: 'center', flex: 1, textAlign: 'center' }}>
            Reuniendo datos…
          </T>
        ) : (
          puntos.map((p, i) => {
            if (p.valor === undefined) return <View key={i} style={{ flex: 1 }} />;
            const idx = indiceMetrica(metrica, p.valor);
            return (
              <View
                key={i}
                style={[
                  e.barra,
                  {
                    height: `${Math.max(3, (p.valor / max) * 100)}%`,
                    backgroundColor: idx === null ? color : tema.lv[idx],
                  },
                  p.esAhora && { borderWidth: 2, borderColor: tema.texto },
                ]}
              />
            );
          })
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {['−12 h', '−6 h', 'ahora'].map((t) => (
          <Cifra key={t} t={9.5} f="media" c={tema.textoSuave}>
            {t}
          </Cifra>
        ))}
      </View>
    </View>
  );
}

/** Monóxido de carbono (MQ-7): franja, medidor y promedio 12 h. */
export function TarjetaCO({ alVerGrafica }: { alVerGrafica: () => void }) {
  const m = useMonitor();
  const tema = useTema();
  const l = m.lectura;
  const co = l?.co;
  const idx = co !== undefined ? indiceDe('co', co) : null;
  const prom = promediosMovilesHoras(m.historial, l, 'co', Date.now(), HORAS_PROMEDIO).promedio;
  return (
    <Tarjeta>
      {idx !== null ? <FranjaNivel indice={idx} /> : <FranjaNeutra texto="Esperando lectura" />}
      <View>
        <Etiqueta>Sensor electroquímico MQ-7</Etiqueta>
        <T t={15} f="extra" style={{ marginTop: 3 }}>
          Monóxido de carbono
        </T>
      </View>
      <Medidor
        posicion={co !== undefined ? posicionBarra('co', co) : null}
        valor={co !== undefined ? numero(co, 2) : '--'}
        unidad="ppm"
        fin="16+"
      />
      <FilaPromedio valor={prom} unidad="ppm" decimales={2} />
      {l?.co2 !== undefined ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T t={11.5} c={tema.textoSuave}>
            Dióxido de carbono (CO2)
          </T>
          <Cifra t={11.5} f="negrita">
            {numero(l.co2)} ppm
          </Cifra>
        </View>
      ) : null}
      <Pressable onPress={alVerGrafica} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        <T t={12} f="negrita" c={tema.sistemaTexto}>
          Ver CO en la gráfica →
        </T>
      </Pressable>
    </Tarjeta>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    caja: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'stretch',
      backgroundColor: p.superficie2,
      borderRadius: 14,
      padding: 10,
    },
    barras: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 84,
      borderBottomWidth: 1,
      borderBottomColor: p.borde,
      paddingBottom: 2,
    },
    barra: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  });
