import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { sombra, useEstilos, useTema } from '../estado/tema';
import { RECOMENDACION_DEL_DIA, indiceRecomendacion } from '../contenido/recomendaciones';
import { indiceDe, nivel, posicionBarra, recomendacion } from '../logica/calidadAire';
import { etiquetaHumedad, etiquetaTemperatura } from '../logica/confort';
import { promediosMovilesHoras, type Metrica } from '../logica/historial';
import { mezclar, type PaletaTema, type TintaFondo } from '../tema';
import {
  ChipIcono,
  Cifra,
  Etiqueta,
  Icono,
  Interruptor,
  PastillaSistema,
  T,
  Tarjeta,
  numero,
  useToast,
  type NombreIcono,
} from './comunes';
import { dominante, hayLecturaReal, nivelGeneral } from './datosAire';
import { Medidor } from './Medidor';
import { MensajeNivel } from './Nivel';

/** Ventana de los promedios móviles que muestra la app (últimas 12 horas). */
export const HORAS_PROMEDIO = 12;

/** «Calidad del aire ahora»: mensaje de nivel o, sin lectura, el estado de la red. */
export function MensajeInicio({ tinta }: TintaFondo) {
  const m = useMonitor();
  const n = nivelGeneral(m);
  if (n !== null) return <MensajeNivel indice={n} eyebrow="Calidad del aire ahora" tinta={tinta} />;
  const espera =
    m.conexion === 'conectando' ? 'Conectando…' : m.conexion === 'sinConexion' ? 'Sin señal' : 'Esperando nodo';
  return (
    <View style={{ gap: 8 }}>
      <Etiqueta c={tinta} style={{ opacity: 0.78 }}>
        Calidad del aire ahora
      </Etiqueta>
      <T t={34} f="display" c={tinta} style={{ letterSpacing: -1.2, lineHeight: 36 }}>
        {espera}
      </T>
      <T t={12.5} f="media" c={tinta} style={{ opacity: 0.8 }}>
        Esperando telemetría del sensor vía MQTT…
      </T>
    </View>
  );
}

/** Píldora de estado de la conexión (cian = sistema). */
export function PastillaConexion() {
  const m = useMonitor();
  if (m.conexion === 'enLinea') return <PastillaSistema texto="En vivo" pulso />;
  if (m.conexion === 'conectando') return <PastillaSistema texto="Conectando" pulso />;
  return <PastillaSistema texto="Sin señal" apagada />;
}

/** Tarjeta del índice: medidor de PM2.5, «En vivo» y promedio de 12 h. */
export function TarjetaIndice() {
  const m = useMonitor();
  const tema = useTema();
  const l = m.lectura;
  const real = hayLecturaReal(m);
  const pm25 = real ? l?.pm25 : undefined;
  const prom = promediosMovilesHoras(m.historial, l, 'pm25', Date.now(), HORAS_PROMEDIO).promedio;
  return (
    <Tarjeta style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' }}>
        <Etiqueta>Índice Aire y Salud</Etiqueta>
        <PastillaConexion />
      </View>
      <Medidor
        posicion={pm25 !== undefined ? posicionBarra('pm25', pm25) : null}
        valor={pm25 !== undefined ? numero(pm25, 1) : '--'}
        unidad="PM2.5 · µg/m³"
      />
      <T t={11.5} c={tema.textoSuave} style={{ textAlign: 'center', marginTop: 4 }}>
        {real ? (
          <>
            Contaminante determinante{' '}
            <T t={11.5} f="negrita">
              {dominante(m)}
            </T>
            {prom !== undefined ? (
              <>
                {' '}· promedio 12 h{' '}
                <Cifra t={11.5} f="cifra" c={tema.textoSuave}>
                  {numero(prom, 1)}
                </Cifra>
              </>
            ) : null}
          </>
        ) : (
          'En cuanto el ESP32 transmita datos se evaluará el contaminante determinante.'
        )}
      </T>
    </Tarjeta>
  );
}

/**
 * Temperatura, humedad y CO. Al tocar una, la gráfica de Contaminantes pasa a
 * esa métrica y se abre esa pestaña.
 */
export function FilaMetricas() {
  const m = useMonitor();
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const real = hayLecturaReal(m);
  const l = m.lectura;
  const t = l?.temperatura;
  const h = l?.humedad;
  const co = real ? l?.co : undefined;
  const iCo = co !== undefined ? indiceDe('co', co) : null;
  const eT = t === undefined ? null : etiquetaTemperatura(t);
  const eH = h === undefined ? null : etiquetaHumedad(h);

  const abrir = (metrica: Metrica) => {
    m.seleccionarMetrica(metrica);
    router.navigate('/contaminantes');
  };

  return (
    <View style={e.fila}>
      <Mosaico
        icono="thermometer"
        etiqueta="Temperatura"
        valor={t === undefined ? '--' : `${Math.round(t)}°`}
        estado={eT?.texto ?? 'Sin dato'}
        color={eT ? tema.peligro : tema.textoSuave}
        fondoIcono={tema.peligroSuave}
        colorIcono={tema.peligro}
        alPresionar={() => abrir('temperatura')}
      />
      <Mosaico
        icono="water-outline"
        etiqueta="Humedad"
        valor={h === undefined ? '--' : `${Math.round(h)}%`}
        estado={eH?.texto ?? 'Sin dato'}
        color={eH ? tema.sistemaTexto : tema.textoSuave}
        fondoIcono={tema.sistemaSuave}
        colorIcono={tema.sistemaTexto}
        alPresionar={() => abrir('humedad')}
      />
      <Mosaico
        icono="pulse"
        etiqueta="CO"
        valor={co === undefined ? '--' : numero(co, 1)}
        unidad={co === undefined ? undefined : 'ppm'}
        estado={iCo === null ? 'Sin dato' : nivel(iCo).corto}
        color={iCo === null ? tema.textoSuave : tema.lt[iCo]}
        fondoIcono={iCo === null ? tema.superficie2 : mezclar(tema.lv[iCo], tema.superficie, 0.16)}
        colorIcono={iCo === null ? tema.textoSuave : tema.lt[iCo]}
        alPresionar={() => abrir('co')}
      />
    </View>
  );
}

function Mosaico(p: {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  unidad?: string;
  estado: string;
  color: string;
  fondoIcono: string;
  colorIcono: string;
  alPresionar: () => void;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={p.alPresionar}
      accessibilityRole="button"
      accessibilityLabel={`${p.etiqueta}: ${p.valor}${p.unidad ? ` ${p.unidad}` : ''}, ${p.estado}`}
      accessibilityHint="Abre su gráfica en Contaminantes"
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [e.mosaico, pressed && { backgroundColor: tema.superficie2 }]}
    >
      <ChipIcono nombre={p.icono} color={p.colorIcono} fondo={p.fondoIcono} />
      <T t={10.5} c={tema.textoSuave} numberOfLines={1}>
        {p.etiqueta}
      </T>
      <Cifra t={20} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {p.valor}
        {p.unidad ? (
          <T t={11} f="negrita" c={tema.textoSuave}>
            {' '}
            {p.unidad}
          </T>
        ) : null}
      </Cifra>
      <T t={10.5} f="negrita" c={p.color} numberOfLines={1}>
        {p.estado}
      </T>
    </Pressable>
  );
}

/**
 * «Recomendación de hoy» según el nivel actual (textos de la maqueta). Si el
 * contaminante determinante es el CO, el consejo viene de `recomendacion()`,
 * porque los textos de la maqueta hablan de partículas en exteriores.
 */
export function RecomendacionDelDia() {
  const m = useMonitor();
  const tema = useTema();
  const n = nivelGeneral(m);
  if (n === null) return null;
  const i = indiceRecomendacion(n);
  const porCo = i > 0 && dominante(m).toUpperCase().includes('CO');
  const r = RECOMENDACION_DEL_DIA[i];
  const titulo = porCo ? 'Cuida tu salud' : r.titulo;
  const detalle = porCo ? recomendacion(nivel(i), 'co') : r.detalle;
  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flexShrink: 1 }}>
          <Etiqueta>Recomendación de hoy</Etiqueta>
          <T t={15} f="extra" style={{ marginTop: 4 }} accessibilityRole="header">
            {titulo}
          </T>
        </View>
        <ChipIcono
          nombre={porCo ? 'heart-pulse' : r.icono}
          color={tema.lt[i]}
          fondo={mezclar(tema.lv[i], tema.superficie, 0.2)}
        />
      </View>
      <T t={12} c={tema.textoSuave} style={{ lineHeight: 17 }}>
        {detalle}
      </T>
    </Tarjeta>
  );
}

export function AvisoSinConexion() {
  const m = useMonitor();
  const tema = useTema();
  return (
    <Tarjeta fondo={tema.peligroSuave} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icono nombre="wifi-off" tam={20} color={tema.peligro} />
      <View style={{ flex: 1 }}>
        <T t={12.5} f="negrita">
          Sin conexión con {m.dispositivo.nombre}
        </T>
        <T t={11} c={tema.textoSuave} style={{ lineHeight: 15, marginTop: 2 }}>
          {m.error ?? 'Esperando telemetría del nodo ESP32 vía MQTT.'}
        </T>
      </View>
      <Pressable onPress={m.reintentar} hitSlop={8} accessibilityRole="button">
        <T t={12} f="negrita" c={tema.peligro}>
          Reintentar
        </T>
      </Pressable>
    </Tarjeta>
  );
}

/** Interruptor rápido de las alertas de aire. */
export function TarjetaAlertas() {
  const m = useMonitor();
  const tema = useTema();
  const toast = useToast();
  const activas = m.ajustes.alertasActivas;
  const cambiar = async (v: boolean) => {
    const permiso = await m.fijarAlertasActivas(v);
    if (v && !permiso) {
      toast('Las alertas quedan activas en la app, pero el sistema no dio permiso para mostrar notificaciones.');
    }
  };
  return (
    <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ChipIcono
        nombre={activas ? 'shield-check-outline' : 'shield-outline'}
        color={activas ? tema.accionTexto : tema.textoSuave}
        fondo={activas ? tema.accionSuave : tema.superficie2}
        radio={17}
      />
      <View style={{ flex: 1 }}>
        <T t={12.5} f="negrita">
          {activas ? 'Alertas de aire activas' : 'Alertas de aire desactivadas'}
        </T>
        <T t={11} c={tema.textoSuave} style={{ marginTop: 2 }}>
          {activas
            ? m.pushActivo
              ? 'Te avisaremos aunque la app esté cerrada.'
              : 'Te avisaremos si la calidad empeora.'
            : 'No recibirás avisos si el aire empeora.'}
        </T>
      </View>
      <Interruptor valor={activas} alCambiar={cambiar} etiqueta="Alertas de aire" />
    </Tarjeta>
  );
}

/** Línea de estado al pie: origen de los datos y tópico MQTT del nodo activo. */
export function PieEstado({ tintaSuave }: { tintaSuave: string }) {
  const m = useMonitor();
  const [, setAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const d = m.dispositivo;
  const topico = d.topicoMqtt ?? 'colectivo/aire/nodo1';
  return (
    <Pressable onPress={() => router.navigate('/ajustes')} style={{ alignSelf: 'center', padding: 6 }} accessibilityRole="button">
      <T t={10.5} f="negrita" c={tintaSuave} style={{ textAlign: 'center' }}>
        {m.conexion === 'enLinea'
          ? `Estación: ${d.nombre} · MQTT: ${topico}`
          : m.conexion === 'conectando'
            ? `Conectando con ${topico}…`
            : `Sin telemetría de ${topico} todavía`}
      </T>
    </Pressable>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    fila: { flexDirection: 'row', gap: 8 },
    mosaico: {
      flex: 1,
      minWidth: 0,
      backgroundColor: p.superficie,
      borderRadius: 20,
      paddingVertical: 11,
      paddingHorizontal: 10,
      gap: 6,
      ...sombra(p.sombraTarjeta),
    },
  });
