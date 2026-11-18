import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useMonitor, type Monitor } from '../estado/monitor';
import {
  COLORES_NIVELES,
  nivel,
} from '../logica/calidadAire';
import { etiquetaHumedad, etiquetaTemperatura } from '../logica/confort';
import {
  METRICAS,
  promediosMovilesHoras,
  type Metrica,
  type PuntoGrafica,
  valorMetrica,
} from '../logica/historial';
import type { Lectura } from '../modelos/lectura';
import { Paleta, alfa } from '../tema';
import {
  BarraIndice,
  ChipIcono,
  Etiqueta,
  Icono,
  Interruptor,
  Pastilla,
  T,
  Tarjeta,
  ValorConUnidad,
  colorConFondo,
  numero,
  sombraSuave,
  useToast,
  type NombreIcono,
} from './comunes';
import { Grafica } from './Grafica';

export type SubMetricaParticulas = 'pm25' | 'pm10' | 'pm1';
export type SubMetricaAireTotal = SubMetricaParticulas | 'co';

const COLORES_NIVEL_GENERAL: Record<number, string> = {
  0: Paleta.verde,     // Verde
  1: Paleta.amarillo,  // Amarillo
  2: Paleta.naranja,   // Naranja
  3: Paleta.rojo,      // Rojo
  4: Paleta.morado,    // Morado
};

const ESCALAS_PARTICULAS: Record<
  SubMetricaParticulas,
  {
    nombre: string;
    etiquetaTab: string;
    cortes: number[];
    etiquetas: string[];
    unidad: string;
    calcularIndice: (v: number) => number;
  }
> = {
  pm25: {
    nombre: 'Partículas Finas PM2.5',
    etiquetaTab: 'PM2.5',
    cortes: [15, 33, 79, 130],
    etiquetas: ['0', '15', '33', '79', '130+'],
    unidad: 'µg/m³',
    calcularIndice: (v) => (v <= 15 ? 0 : v <= 33 ? 1 : v <= 79 ? 2 : v <= 130 ? 3 : 4),
  },
  pm10: {
    nombre: 'Partículas Gruesas PM10',
    etiquetaTab: 'PM10',
    cortes: [50, 75, 155, 235],
    etiquetas: ['0', '50', '75', '155', '235+'],
    unidad: 'µg/m³',
    calcularIndice: (v) => (v <= 50 ? 0 : v <= 75 ? 1 : v <= 155 ? 2 : v <= 235 ? 3 : 4),
  },
  pm1: {
    nombre: 'Partículas Ultrafinas PM1',
    etiquetaTab: 'PM1',
    cortes: [],
    etiquetas: [],
    unidad: 'µg/m³',
    calcularIndice: () => 0,
  },
};

const ESCALA_CO = {
  nombre: 'Monóxido de Carbono (CO)',
  cortes: [5, 9, 12, 16],
  etiquetas: ['0', '5', '9', '12', '16+'],
  unidad: 'ppm',
  calcularIndice: (v: number) => (v <= 5 ? 0 : v <= 9 ? 1 : v <= 12 ? 2 : v <= 16 ? 3 : 4),
};

function calcularPosicion(valor: number, cortes: number[]): number {
  if (cortes.length < 4) return 0;
  const tramos = [0, cortes[0], cortes[1], cortes[2], cortes[3], cortes[3] * 1.5];
  for (let i = 0; i < 5; i++) {
    if (valor <= tramos[i + 1]) {
      const f = (valor - tramos[i]) / (tramos[i + 1] - tramos[i]);
      return (i + Math.min(1, Math.max(0, f))) / 5;
    }
  }
  return 1;
}

/** Ventana de los promedios móviles que muestra la app (últimas 12 horas). */
const HORAS_PROMEDIO = 12;

export function Resumen({ alAbrirAjustes }: { alAbrirAjustes: () => void }) {
  const m = useMonitor();
  const [refrescando, setRefrescando] = useState(false);
  const [tabParticulas, setTabParticulas] = useState<SubMetricaParticulas>('pm25');
  const [parametroGraficaAire, setParametroGraficaAire] = useState<SubMetricaAireTotal>('pm25');
  const [historialSesion, setHistorialSesion] = useState<Lectura[]>([]);

  // Mantener historial ligero en memoria de sesión (máximo 30 puntos)
  useEffect(() => {
    if (!m.lectura) return;
    setHistorialSesion((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].fecha === m.lectura!.fecha) {
        return prev;
      }
      const nuevo = [...prev, m.lectura!];
      return nuevo.slice(-30);
    });
  }, [m.lectura]);

  const metricaEfectivaGrafica: Metrica =
    m.metrica === 'aire' ? parametroGraficaAire : m.metrica;

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          tintColor={Paleta.verde}
          colors={[Paleta.verde]}
          onRefresh={async () => {
            setRefrescando(true);
            await m.reintentar();
            setRefrescando(false);
          }}
        />
      }
    >
      {m.conexion === 'sinConexion' ? <AvisoSinConexion /> : null}

      {/* 1. Hero Principal: Calidad del aire y contaminante dominante (sin asunciones en demo/desconectado) */}
      <HeroPrincipal />

      {/* 2. Selector de 3 Categorías Principales (Aire por defecto) */}
      <FilaMetricas />

      {/* 3. Contenido al seleccionar Aire: Separación explícita de Partículas y Gases */}
      {m.metrica === 'aire' ? (
        <AnalisisAire
          tabParticulas={tabParticulas}
          alCambiarTabParticulas={(t) => {
            setTabParticulas(t);
            setParametroGraficaAire(t);
          }}
          alSeleccionarCO={() => {
            setParametroGraficaAire('co');
          }}
          parametroActivoGrafica={parametroGraficaAire}
        />
      ) : null}

      {/* 4. Gráfica en memoria de sesión según métrica o parámetro activo */}
      <TarjetaGrafica
        metrica={metricaEfectivaGrafica}
        historialSesion={historialSesion}
      />

      <TarjetaAlertas />
      <PieEstado alAbrirAjustes={alAbrirAjustes} />
    </ScrollView>
  );
}

function AvisoSinConexion() {
  const m = useMonitor();
  return (
    <Tarjeta radio={16} fondo={Paleta.rojoSuave} borde={alfa(Paleta.rojo, 0.18)} style={estilos.aviso}>
      <Icono nombre="wifi-off" tam={20} color={Paleta.rojo} />
      <View style={{ flex: 1 }}>
        <T t={12.5} f="extra">
          Sin conexión con {m.dispositivo.nombre}
        </T>
        <T t={10.5} c={Paleta.textoSuave} style={{ lineHeight: 15, marginTop: 2 }}>
          {m.error ?? 'Esperando telemetría del nodo ESP32 vía MQTT.'}
        </T>
      </View>
      <Pressable onPress={m.reintentar} hitSlop={8} accessibilityRole="button">
        <T t={11.5} f="extra" c={Paleta.rojo}>
          Reintentar
        </T>
      </Pressable>
    </Tarjeta>
  );
}

/**
 * 1. Hero Principal:
 * - Tipografía limpia, legible y proporcionada (Manrope Bold con tracking espaciado).
 * - No asume "Buena" ni contaminante dominante si no hay conexión o no han llegado datos.
 */
function HeroPrincipal() {
  const m = useMonitor();
  const l = m.lectura;

  // Verificación estricta: ¿Existen datos reales del sensor?
  const hayLecturaReal =
    m.conexion === 'enLinea' &&
    l !== null &&
    (l.pm25 !== undefined || l.co !== undefined || l.estado !== undefined);

  if (!hayLecturaReal) {
    // Estado neutral cuando no hay conexión ni lecturas todavía
    const textoEstadoEspera =
      m.conexion === 'conectando'
        ? 'CONECTANDO...'
        : m.conexion === 'sinConexion'
          ? 'SIN SEÑAL'
          : 'ESPERANDO NODO';

    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ alignSelf: 'center', marginBottom: 2 }}>
          <Pastilla
            texto="CALIDAD DEL AIRE · NOM-172"
            color={Paleta.textoSuave}
            fondo={Paleta.relleno}
            punto={Paleta.textoTenue}
          />
        </View>

        <View style={estilos.heroe}>
          <Svg width={250} height={160} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="haloNeutral" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={Paleta.textoTenue} stopOpacity={0.12} />
                <Stop offset="1" stopColor={Paleta.textoTenue} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={125} cy={80} rx={125} ry={80} fill="url(#haloNeutral)" />
          </Svg>

          <T t={11} f="seminegrita" c={Paleta.textoTenue} style={{ letterSpacing: 1.5, marginBottom: 6 }}>
            ESTADO DE LA RED
          </T>

          <T
            t={30}
            f="negrita"
            c={Paleta.textoSuave}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ letterSpacing: 2, textAlign: 'center', paddingHorizontal: 16 }}
          >
            {textoEstadoEspera}
          </T>

          <T t={11.5} f="media" c={Paleta.textoTenue} style={{ marginTop: 8 }}>
            Esperando telemetría del sensor vía MQTT...
          </T>
        </View>
      </View>
    );
  }

  // Hay datos válidos del sensor
  const nivelGeneral =
    l.nivel_general !== undefined
      ? l.nivel_general
      : l.nivelReportado !== undefined
        ? l.nivelReportado
        : (m.aire?.nivel.indice ?? 0);

  const colorHalo = COLORES_NIVEL_GENERAL[nivelGeneral] ?? Paleta.verde;

  const estadoTexto = l.estado
    ? l.estado.toUpperCase()
    : m.aire
      ? m.aire.nivel.nombre.toUpperCase()
      : 'BUENA';

  const dominante = l.dominante ?? (m.aire?.principal === 'co' ? 'CO' : 'PM2.5');

  let valorDomTexto = '--';
  let unidadDom = 'µg/m³';
  const domUp = dominante.toUpperCase();

  if (domUp.includes('25') || domUp.includes('2.5')) {
    valorDomTexto = l.pm25 !== undefined ? numero(l.pm25, 1) : '--';
    unidadDom = 'µg/m³';
  } else if (domUp.includes('10')) {
    valorDomTexto = l.pm10 !== undefined ? numero(l.pm10, 1) : '--';
    unidadDom = 'µg/m³';
  } else if (domUp.includes('CO')) {
    valorDomTexto = l.co !== undefined ? numero(l.co, 2) : '--';
    unidadDom = 'ppm';
  } else if (domUp.includes('1')) {
    valorDomTexto = l.pm1 !== undefined ? numero(l.pm1, 1) : '--';
    unidadDom = 'µg/m³';
  } else {
    valorDomTexto = l.pm25 !== undefined ? numero(l.pm25, 1) : '--';
  }

  const c = colorConFondo(colorHalo);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ alignSelf: 'center', marginBottom: 2 }}>
        <Pastilla
          texto="CALIDAD DEL AIRE · NOM-172"
          color={c.color}
          fondo={c.fondo}
          borde={c.borde}
          punto={colorHalo}
        />
      </View>

      <View style={estilos.heroe}>
        <Svg width={250} height={160} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="haloAire" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={colorHalo} stopOpacity={0.24} />
              <Stop offset="0.7" stopColor={colorHalo} stopOpacity={0.06} />
              <Stop offset="1" stopColor={colorHalo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={125} cy={80} rx={125} ry={80} fill="url(#haloAire)" />
        </Svg>

        <T t={11} f="seminegrita" c={Paleta.textoSuave} style={{ letterSpacing: 1.5, marginBottom: 4 }}>
          ÍNDICE OFICIAL
        </T>

        {/* Tipografía limpia, balanceada y no abrumadora */}
        <T
          t={32}
          f="negrita"
          c={colorHalo}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{ letterSpacing: 2, textAlign: 'center', paddingHorizontal: 16 }}
        >
          {estadoTexto}
        </T>

        <T t={12} f="seminegrita" c={Paleta.texto} style={{ marginTop: 8 }}>
          Contaminante dominante: <T t={12} f="extra" c={colorHalo}>{dominante}</T> · {valorDomTexto} {unidadDom}
        </T>
      </View>
    </View>
  );
}

/**
 * 2. Selector de 3 Categorías Principales (Aire por defecto, luego Temperatura y Humedad).
 */
function FilaMetricas() {
  const m = useMonitor();
  const l = m.lectura;
  const hayLecturaReal =
    m.conexion === 'enLinea' &&
    l !== null &&
    (l.pm25 !== undefined || l.co !== undefined || l.estado !== undefined);

  const t = l?.temperatura;
  const h = l?.humedad;

  const nivelGeneral =
    l?.nivel_general !== undefined
      ? l.nivel_general
      : l?.nivelReportado !== undefined
        ? l.nivelReportado
        : (m.aire?.nivel.indice ?? 0);

  const colorAire = hayLecturaReal
    ? (COLORES_NIVEL_GENERAL[nivelGeneral] ?? Paleta.verde)
    : Paleta.textoTenue;

  const estadoCorto = hayLecturaReal
    ? (l?.estado ? l.estado : (m.aire?.nivel.corto ?? 'Buena'))
    : '--';

  const eT = t === undefined ? null : etiquetaTemperatura(t);
  const eH = h === undefined ? null : etiquetaHumedad(h);

  const dom = l?.dominante ?? 'PM2.5';
  let detalleAire = hayLecturaReal ? `Dom: ${dom}` : 'Sin datos';
  const domUp = dom.toUpperCase();
  if (hayLecturaReal) {
    if (domUp.includes('25') || domUp.includes('2.5')) {
      detalleAire = l?.pm25 !== undefined ? `PM2.5 ${numero(l.pm25, 1)}` : 'PM2.5 --';
    } else if (domUp.includes('10')) {
      detalleAire = l?.pm10 !== undefined ? `PM10 ${numero(l.pm10, 1)}` : 'PM10 --';
    } else if (domUp.includes('CO')) {
      detalleAire = l?.co !== undefined ? `CO ${numero(l.co, 2)}` : 'CO --';
    }
  }

  return (
    <View style={estilos.filaMetricas}>
      {/* 1. Aire (Primero y activo por defecto) */}
      <TarjetaMetrica
        metrica="aire"
        icono="leaf"
        color={colorAire}
        fondo={alfa(colorAire, 0.12)}
        valor={estadoCorto}
        detalle={detalleAire}
        colorDetalle={colorAire}
      />
      {/* 2. Temperatura */}
      <TarjetaMetrica
        metrica="temperatura"
        icono="thermometer"
        color={Paleta.coral}
        fondo={Paleta.coralSuave}
        valor={t === undefined ? '--' : `${Math.round(t)}°`}
        detalle={eT?.texto ?? 'Sin dato'}
        colorDetalle={eT?.color ?? Paleta.textoTenue}
      />
      {/* 3. Humedad */}
      <TarjetaMetrica
        metrica="humedad"
        icono="water-outline"
        color={Paleta.azul}
        fondo={Paleta.azulSuave}
        valor={h === undefined ? '--' : `${Math.round(h)}%`}
        detalle={eH?.texto ?? 'Sin dato'}
        colorDetalle={eH?.color ?? Paleta.textoTenue}
      />
    </View>
  );
}

function TarjetaMetrica(p: {
  metrica: Metrica;
  icono: NombreIcono;
  color: string;
  fondo: string;
  valor: string;
  detalle: string;
  colorDetalle: string;
}) {
  const m = useMonitor();
  const activa = m.metrica === p.metrica;
  const etiqueta = METRICAS[p.metrica]?.corto ?? p.metrica;
  return (
    <Pressable
      onPress={() => m.seleccionarMetrica(p.metrica)}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`${etiqueta}: ${p.valor}, ${p.detalle}`}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [
        estilos.metrica,
        activa && [
          { borderColor: alfa(p.color, 0.6), borderWidth: 1.3, backgroundColor: alfa(p.color, 0.035) },
          sombraSuave,
        ],
        pressed && { opacity: 0.85 },
      ]}
    >
      <ChipIcono nombre={p.icono} color={p.color} fondo={p.fondo} tam={26} />
      <T t={9.5} f="seminegrita" c={Paleta.textoSuave} style={{ marginTop: 14 }}>
        {etiqueta}
      </T>
      <T t={18} f="extra" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {p.valor}
      </T>
      <T t={9.5} f="negrita" c={p.colorDetalle} numberOfLines={1}>
        {p.detalle}
      </T>
    </Pressable>
  );
}

/**
 * 3. Contenido al seleccionar "Aire":
 * SEPARACIÓN EXPLÍCITA DE PARTÍCULAS SUSPENDIDAS (PMS5003) Y GASES TÓXICOS (MQ-7)
 */
function AnalisisAire({
  tabParticulas,
  alCambiarTabParticulas,
  alSeleccionarCO,
  parametroActivoGrafica,
}: {
  tabParticulas: SubMetricaParticulas;
  alCambiarTabParticulas: (t: SubMetricaParticulas) => void;
  alSeleccionarCO: () => void;
  parametroActivoGrafica: SubMetricaAireTotal;
}) {
  const m = useMonitor();
  const l = m.lectura;

  const hayLecturaReal =
    m.conexion === 'enLinea' &&
    l !== null &&
    (l.pm25 !== undefined || l.co !== undefined || l.estado !== undefined);

  // Dominante
  const domRaw = (l?.dominante ?? 'PM2.5').toUpperCase();
  const esDominanteCO = domRaw.includes('CO');

  let valorDomNum: number | undefined;
  let unidadDom = 'µg/m³';
  let nombreDom = 'Partículas PM2.5';
  let cortesDom: number[] = [15, 33, 79, 130];
  let etiquetasDom: string[] = ['0', '15', '33', '79', '130+'];
  let idxDom = 0;

  if (esDominanteCO) {
    valorDomNum = l?.co;
    unidadDom = ESCALA_CO.unidad;
    nombreDom = ESCALA_CO.nombre;
    cortesDom = ESCALA_CO.cortes;
    etiquetasDom = ESCALA_CO.etiquetas;
    idxDom = valorDomNum !== undefined ? ESCALA_CO.calcularIndice(valorDomNum) : 0;
  } else if (domRaw.includes('10')) {
    valorDomNum = l?.pm10;
    unidadDom = ESCALAS_PARTICULAS.pm10.unidad;
    nombreDom = ESCALAS_PARTICULAS.pm10.nombre;
    cortesDom = ESCALAS_PARTICULAS.pm10.cortes;
    etiquetasDom = ESCALAS_PARTICULAS.pm10.etiquetas;
    idxDom = valorDomNum !== undefined ? ESCALAS_PARTICULAS.pm10.calcularIndice(valorDomNum) : 0;
  } else {
    valorDomNum = l?.pm25;
    unidadDom = ESCALAS_PARTICULAS.pm25.unidad;
    nombreDom = ESCALAS_PARTICULAS.pm25.nombre;
    cortesDom = ESCALAS_PARTICULAS.pm25.cortes;
    etiquetasDom = ESCALAS_PARTICULAS.pm25.etiquetas;
    idxDom = valorDomNum !== undefined ? ESCALAS_PARTICULAS.pm25.calcularIndice(valorDomNum) : 0;
  }

  const nivelObjDom = nivel(idxDom);

  // Datos para la pestaña de partículas seleccionada
  const cfgParticula = ESCALAS_PARTICULAS[tabParticulas];
  let valorParticulaNum: number | undefined;
  if (tabParticulas === 'pm25') valorParticulaNum = l?.pm25;
  else if (tabParticulas === 'pm10') valorParticulaNum = l?.pm10;
  else valorParticulaNum = l?.pm1;

  const idxParticula = valorParticulaNum !== undefined ? cfgParticula.calcularIndice(valorParticulaNum) : 0;
  const nivelObjParticula = nivel(idxParticula);

  // Promedios móviles de las últimas 12 horas (historial persistido del nodo).
  const ahora = Date.now();
  const promParticula = promediosMovilesHoras(
    m.historial,
    l,
    tabParticulas,
    ahora,
    HORAS_PROMEDIO,
  ).promedio;

  // Datos para Gases (CO)
  const valorCoNum = l?.co;
  const idxCo = valorCoNum !== undefined ? ESCALA_CO.calcularIndice(valorCoNum) : 0;
  const nivelObjCo = nivel(idxCo);
  const promCo = promediosMovilesHoras(m.historial, l, 'co', ahora, HORAS_PROMEDIO).promedio;

  const tabsParticulas: SubMetricaParticulas[] = ['pm25', 'pm10', 'pm1'];

  return (
    <View style={{ gap: 12 }}>
      {/* ──────────────────────────────────────────────────────────────
          BLOQUE A: IMPACTO DOMINANTE GENERAL (NOM-172)
      ────────────────────────────────────────────────────────────── */}
      <Tarjeta radio={16}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>NORMA OFICIAL VIGENTE</Etiqueta>
            <T t={16} f="extra" style={{ marginTop: 2 }}>
              Contaminante Crítico
            </T>
          </View>
          {hayLecturaReal ? (
            <Pastilla
              texto={`Dominante: ${esDominanteCO ? 'CO' : domRaw}`}
              color={nivelObjDom.color}
              fondo={nivelObjDom.colorSuave}
            />
          ) : (
            <Pastilla texto="Esperando lectura" color={Paleta.textoSuave} fondo={Paleta.relleno} />
          )}
        </View>

        {hayLecturaReal ? (
          <View style={[estilos.tarjetaDestacada, { borderColor: alfa(nivelObjDom.color, 0.4) }]}>
            <View style={estilos.filaCentro}>
              <ChipIcono
                nombre="alert-circle-outline"
                color={nivelObjDom.color}
                fondo={nivelObjDom.colorSuave}
                tam={34}
                tamIcono={18}
                radio={10}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <T t={10.5} f="seminegrita" c={Paleta.textoSuave}>
                  Mayor riesgo: {nombreDom}
                </T>
                <ValorConUnidad
                  valor={valorDomNum !== undefined ? numero(valorDomNum, esDominanteCO ? 2 : 1) : '--'}
                  unidad={unidadDom}
                  tam={20}
                />
              </View>
              <Pastilla texto={nivelObjDom.nombre} color={nivelObjDom.color} fondo={nivelObjDom.colorSuave} />
            </View>

            {cortesDom.length > 0 && valorDomNum !== undefined ? (
              <View style={{ marginTop: 10 }}>
                <BarraIndice
                  posicion={calcularPosicion(valorDomNum, cortesDom)}
                  colores={COLORES_NIVELES}
                  etiquetas={etiquetasDom}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[estilos.tarjetaDestacada, { borderColor: Paleta.borde }]}>
            <T t={11} c={Paleta.textoSuave} style={{ textAlign: 'center' }}>
              En cuanto el ESP32 transmita datos se evaluará el contaminante determinante.
            </T>
          </View>
        )}
      </Tarjeta>

      {/* ──────────────────────────────────────────────────────────────
          BLOQUE B: PARTÍCULAS SUSPENDIDAS (PMS5003 Láser)
      ────────────────────────────────────────────────────────────── */}
      <Tarjeta radio={16}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>SENSOR LÁSER PMS5003</Etiqueta>
            <T t={16} f="extra" style={{ marginTop: 2 }}>
              Partículas Suspendidas
            </T>
          </View>
          <ChipIcono nombre="dots-grid" color={Paleta.verde} fondo={Paleta.verdeSuave} tam={30} tamIcono={16} />
        </View>

        {/* 3 Tabs exclusivas para Partículas */}
        <View style={[estilos.filaTabs, { marginTop: 14 }]}>
          {tabsParticulas.map((t) => {
            const seleccionada = tabParticulas === t;
            return (
              <Pressable
                key={t}
                onPress={() => alCambiarTabParticulas(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: seleccionada }}
                android_ripple={{ color: 'transparent' }}
                style={[
                  estilos.pillTab,
                  seleccionada && { backgroundColor: Paleta.verdeOscuro, borderColor: Paleta.verdeOscuro },
                ]}
              >
                <T
                  t={11.5}
                  f="extra"
                  c={seleccionada ? '#FFFFFF' : Paleta.textoSuave}
                >
                  {ESCALAS_PARTICULAS[t].etiquetaTab}
                </T>
              </Pressable>
            );
          })}
        </View>

        {/* Detalle de la partícula seleccionada */}
        <View style={[estilos.tarjetaParametro, { marginTop: 12 }]}>
          <View style={estilos.filaCentro}>
            <View style={{ flex: 1 }}>
              <T t={12} f="extra">
                {cfgParticula.nombre}
              </T>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, alignItems: 'baseline' }}>
                <View>
                  <T t={9.5} c={Paleta.textoSuave}>Lectura en vivo</T>
                  <ValorConUnidad
                    valor={valorParticulaNum !== undefined ? numero(valorParticulaNum, 1) : '--'}
                    unidad={cfgParticula.unidad}
                    tam={22}
                    style={{ marginTop: 2 }}
                  />
                </View>
                {promParticula !== undefined && (
                  <View style={{ borderLeftWidth: 1, borderLeftColor: Paleta.borde, paddingLeft: 12 }}>
                    <T t={9.5} c={Paleta.textoSuave}>Promedio 12 h</T>
                    <ValorConUnidad
                      valor={numero(promParticula, 1)}
                      unidad={cfgParticula.unidad}
                      tam={16}
                      style={{ marginTop: 2 }}
                    />
                  </View>
                )}
              </View>
            </View>
            {tabParticulas !== 'pm1' && valorParticulaNum !== undefined ? (
              <Pastilla
                texto={nivelObjParticula.nombre}
                color={nivelObjParticula.color}
                fondo={nivelObjParticula.colorSuave}
              />
            ) : null}
          </View>

          {tabParticulas === 'pm1' ? (
            <View style={estilos.cajaInformativa}>
              <Icono nombre="information-outline" tam={16} color={Paleta.textoSuave} />
              <T t={10.5} c={Paleta.textoSuave} style={{ flex: 1, marginLeft: 6 }}>
                Monitoreo informativo — sin límite en NOM-172
              </T>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <BarraIndice
                posicion={
                  valorParticulaNum !== undefined
                    ? calcularPosicion(valorParticulaNum, cfgParticula.cortes)
                    : 0
                }
                colores={COLORES_NIVELES}
                etiquetas={cfgParticula.etiquetas}
              />
              <T t={9.5} c={Paleta.textoTenue} style={{ marginTop: 6 }}>
                Escala oficial NOM-172 ({cfgParticula.etiquetas.join(' - ')})
              </T>
            </View>
          )}
        </View>
      </Tarjeta>

      {/* ──────────────────────────────────────────────────────────────
          BLOQUE C: GASES TÓXICOS Y COMBUSTIÓN (Sensor MQ-7)
      ────────────────────────────────────────────────────────────── */}
      <Tarjeta radio={16}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>SENSOR ELECTROQUÍMICO MQ-7</Etiqueta>
            <T t={16} f="extra" style={{ marginTop: 2 }}>
              Gases de Combustión
            </T>
          </View>
          <ChipIcono nombre="fire" color={Paleta.naranja} fondo={alfa(Paleta.naranja, 0.12)} tam={30} tamIcono={16} />
        </View>

        <Pressable
          onPress={alSeleccionarCO}
          android_ripple={{ color: 'transparent' }}
          style={[
            estilos.tarjetaParametro,
            { marginTop: 12 },
            parametroActivoGrafica === 'co' && {
              borderColor: Paleta.naranja,
              backgroundColor: alfa(Paleta.naranja, 0.04),
            },
          ]}
        >
          <View style={estilos.filaCentro}>
            <View style={{ flex: 1 }}>
              <T t={12} f="extra">
                Monóxido de Carbono (CO)
              </T>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, alignItems: 'baseline' }}>
                <View>
                  <T t={9.5} c={Paleta.textoSuave}>Lectura en vivo</T>
                  <ValorConUnidad
                    valor={valorCoNum !== undefined ? numero(valorCoNum, 2) : '--'}
                    unidad="ppm"
                    tam={22}
                    style={{ marginTop: 2 }}
                  />
                </View>
                {promCo !== undefined && (
                  <View style={{ borderLeftWidth: 1, borderLeftColor: Paleta.borde, paddingLeft: 12 }}>
                    <T t={9.5} c={Paleta.textoSuave}>Promedio 12 h</T>
                    <ValorConUnidad
                      valor={numero(promCo, 2)}
                      unidad="ppm"
                      tam={16}
                      style={{ marginTop: 2 }}
                    />
                  </View>
                )}
              </View>
            </View>
            {valorCoNum !== undefined ? (
              <Pastilla
                texto={nivelObjCo.nombre}
                color={nivelObjCo.color}
                fondo={nivelObjCo.colorSuave}
              />
            ) : null}
          </View>

          <View style={{ marginTop: 12 }}>
            <BarraIndice
              posicion={
                valorCoNum !== undefined
                  ? calcularPosicion(valorCoNum, ESCALA_CO.cortes)
                  : 0
              }
              colores={COLORES_NIVELES}
              etiquetas={ESCALA_CO.etiquetas}
            />
            <T t={9.5} c={Paleta.textoTenue} style={{ marginTop: 6 }}>
              Escala oficial NOM-172 ({ESCALA_CO.etiquetas.join(' - ')})
            </T>
          </View>
        </Pressable>

        {l?.co2 !== undefined ? (
          <View style={[estilos.tarjetaParametro, { marginTop: 10 }]}>
            <T t={12} f="extra">
              Dióxido de Carbono (CO2)
            </T>
            <ValorConUnidad valor={numero(l.co2)} unidad="ppm" tam={20} style={{ marginTop: 4 }} />
          </View>
        ) : null}
      </Tarjeta>
    </View>
  );
}

/**
 * 4. Gráfica "Últimas horas" dinámica en memoria de sesión (máximo 30 puntos).
 * Se actualiza según la pestaña activa (PM2.5, PM10, CO, PM1, Temperatura o Humedad).
 */
function TarjetaGrafica({
  metrica,
  historialSesion,
}: {
  metrica: Metrica;
  historialSesion: Lectura[];
}) {
  const m = useMonitor();

  // Color de la gráfica según la métrica activa
  const color =
    metrica === 'temperatura'
      ? Paleta.coral
      : metrica === 'humedad'
        ? Paleta.azul
        : metrica === 'pm10'
          ? Paleta.ambar
          : metrica === 'co'
            ? Paleta.naranja
            : metrica === 'pm1'
              ? Paleta.azul
              : Paleta.verde;

  const [textoVivo, colorVivo] =
    m.conexion === 'enLinea'
      ? ['En vivo', color]
      : m.conexion === 'conectando'
        ? ['Conectando', Paleta.amarillo]
        : ['Sin señal', Paleta.textoTenue];

  // Construir puntos ligeros en memoria a partir de las muestras en la sesión actual
  const puntos: PuntoGrafica[] = historialSesion.map((l, i) => {
    const esUltimo = i === historialSesion.length - 1;
    const val = valorMetrica(metrica, l);
    const d = new Date(l.fecha);
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return {
      etiqueta: esUltimo ? 'Ahora' : `${mm}:${ss}`,
      valor: val,
      esAhora: esUltimo,
    };
  });

  if (puntos.length === 0 && m.lectura) {
    puntos.push({
      etiqueta: 'Ahora',
      valor: valorMetrica(metrica, m.lectura),
      esAhora: true,
    });
  }

  const tituloGrafica = METRICAS[metrica]?.titulo ?? metrica;

  return (
    <Tarjeta radio={16} style={{ paddingBottom: 10 }}>
      <View style={estilos.cabecera}>
        <View style={{ flex: 1 }}>
          <Etiqueta>TELEMETRÍA EN TIEMPO REAL</Etiqueta>
          <T t={17} f="extra" style={{ marginTop: 3 }}>
            {tituloGrafica}
          </T>
        </View>
        <Pastilla texto={textoVivo} mayusculas punto={colorVivo} pulso={m.conexion === 'enLinea'} />
      </View>
      <View style={{ marginTop: 10 }}>
        <Grafica puntos={puntos} metrica={metrica} color={color} />
      </View>
    </Tarjeta>
  );
}

function TarjetaAlertas() {
  const m = useMonitor();
  const toast = useToast();
  const activas = m.ajustes.alertasActivas;
  const cambiar = async (v: boolean) => {
    const permiso = await m.fijarAlertasActivas(v);
    if (v && !permiso) {
      toast('Las alertas quedan activas en la app, pero el sistema no dio permiso para mostrar notificaciones.');
    }
  };
  return (
    <View
      style={[
        estilos.alertas,
        {
          backgroundColor: activas ? Paleta.verdeAlerta : Paleta.superficie,
          borderColor: activas ? Paleta.verdeBorde : Paleta.borde,
        },
      ]}
    >
      <View style={[estilos.circuloEscudo, { borderColor: activas ? Paleta.verdeBorde : Paleta.borde }]}>
        <Icono
          nombre={activas ? 'shield-check-outline' : 'shield-outline'}
          tam={18}
          color={activas ? Paleta.verde : Paleta.textoTenue}
        />
      </View>
      <View style={{ flex: 1 }}>
        <T t={12.5} f="extra">
          {activas ? 'Alertas de aire activas' : 'Alertas de aire desactivadas'}
        </T>
        <T t={10} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
          {activas
            ? m.pushActivo
              ? 'Te avisaremos aunque la app esté cerrada.'
              : 'Te avisaremos si la calidad empeora.'
            : 'No recibirás avisos si el aire empeora.'}
        </T>
      </View>
      <Interruptor valor={activas} alCambiar={cambiar} etiqueta="Alertas de aire" />
    </View>
  );
}

/** Línea de estado al pie: origen de los datos y tópico MQTT del nodo activo. */
function PieEstado({ alAbrirAjustes }: { alAbrirAjustes: () => void }) {
  const m = useMonitor();
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const d = m.dispositivo;
  const topico = d.topicoMqtt ?? 'colectivo/aire/nodo1';

  return (
    <Pressable onPress={alAbrirAjustes} style={{ alignSelf: 'center', padding: 6 }} accessibilityRole="button">
      <T t={9.5} f="seminegrita" c={Paleta.textoTenue} style={{ textAlign: 'center' }}>
        {m.conexion === 'enLinea'
          ? `Estación: ${d.nombre} · MQTT: ${topico}`
          : m.conexion === 'conectando'
            ? `Conectando con ${topico}…`
            : `Sin telemetría de ${topico} todavía`}
      </T>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32, gap: 12 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 },
  heroe: { width: 250, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  filaMetricas: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metrica: {
    flex: 1,
    backgroundColor: Paleta.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Paleta.borde,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
  },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start' },
  filaCentro: { flexDirection: 'row', alignItems: 'center' },
  tarjetaDestacada: {
    backgroundColor: Paleta.fondo,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  filaTabs: { flexDirection: 'row', gap: 6 },
  pillTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.relleno,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaParametro: {
    backgroundColor: Paleta.fondo,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Paleta.borde,
    padding: 14,
  },
  cajaInformativa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.superficie,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Paleta.borde,
    padding: 10,
    marginTop: 10,
  },
  alertas: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 12, paddingRight: 14 },
  circuloEscudo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
