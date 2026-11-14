import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useMonitor, type Monitor } from '../estado/monitor';
import {
  COLORES_NIVELES,
  concentracion,
  etiquetasBarra,
  indiceDe,
  nivel,
  posicionBarra,
} from '../logica/calidadAire';
import { etiquetaHumedad, etiquetaTemperatura, sensacionTermica } from '../logica/confort';
import { METRICAS, extremosDeHoy, haceCuanto, puntosUltimasHoras, type Metrica } from '../logica/historial';
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

export function Resumen({ alAbrirAjustes }: { alAbrirAjustes: () => void }) {
  const m = useMonitor();
  const [refrescando, setRefrescando] = useState(false);
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
      <Principal />
      <FilaMetricas />
      {m.metrica === 'aire' ? <AnalisisAire /> : null}
      <TarjetaGrafica />
      <TarjetaAlertas />
      <BotonSimular />
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
          {m.error ?? 'No se pudo leer el ESP32.'}
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

/** Mensaje general del ambiente para la pastilla superior. */
function estadoGeneral(m: Monitor): { texto: string; color: string } {
  const l = m.lectura;
  if (!l) {
    return m.conexion === 'sinConexion'
      ? { texto: 'Sin conexión con el sensor', color: Paleta.textoSuave }
      : { texto: 'Conectando con el sensor…', color: Paleta.textoSuave };
  }
  const aire = m.aire;
  const { temperatura: t, humedad: h } = l;
  if (aire && aire.nivel.indice >= 2) {
    return { texto: `La calidad del aire es ${aire.nivel.adjetivo}`, color: aire.nivel.color };
  }
  if (t !== undefined && t >= 30) return { texto: 'Hace mucho calor', color: Paleta.rojo };
  if (t !== undefined && t < 16) return { texto: 'Hace frío', color: Paleta.azul };
  if (h !== undefined && h < 30) return { texto: 'El ambiente está seco', color: Paleta.naranja };
  if (h !== undefined && h > 70) return { texto: 'El ambiente está muy húmedo', color: Paleta.azul };
  if (aire && aire.nivel.indice === 1) return { texto: 'Calidad del aire aceptable', color: Paleta.ambar };
  if (m.conexion === 'sinConexion') return { texto: 'Mostrando la última lectura', color: Paleta.textoSuave };
  return { texto: 'Todo se siente bien', color: Paleta.verde };
}

function Principal() {
  const m = useMonitor();
  const l = m.lectura;
  const t = l?.temperatura;
  const h = l?.humedad;
  const estado = estadoGeneral(m);
  const c = colorConFondo(estado.color);
  const extremos = extremosDeHoy(m.historial, l, Date.now());
  const brillo = t === undefined ? Paleta.coral : etiquetaTemperatura(t).color;
  const grados = (v?: number) => (v === undefined ? '--' : `${Math.round(v)}°`);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ alignSelf: 'center' }}>
        <Pastilla texto={estado.texto} color={c.color} fondo={c.fondo} borde={c.borde} punto={estado.color} />
      </View>
      <View style={estilos.heroe}>
        <Svg width={230} height={170} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="brillo" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={brillo} stopOpacity={0.17} />
              <Stop offset="1" stopColor={brillo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={115} cy={85} rx={115} ry={85} fill="url(#brillo)" />
        </Svg>
        <T t={11.5} f="seminegrita" c={Paleta.textoSuave}>
          Temperatura actual
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <T t={90} f="media" style={{ letterSpacing: -4, lineHeight: 100 }}>
            {t === undefined ? '--' : Math.round(t)}
          </T>
          <View style={[estilos.gradoAnillo, { borderColor: brillo }]} />
        </View>
        <T t={11.5} c={Paleta.textoSuave}>
          {t !== undefined && h !== undefined
            ? `Sensación térmica ${Math.round(sensacionTermica(t, h))}°`
            : 'Sensación térmica --'}
        </T>
      </View>
      <T t={10.5} f="seminegrita" c={Paleta.textoTenue} style={{ marginTop: 6 }}>
        Máx. {grados(extremos.maxima)}   ·   Mín. {grados(extremos.minima)}
      </T>
    </View>
  );
}

function FilaMetricas() {
  const m = useMonitor();
  const l = m.lectura;
  const t = l?.temperatura;
  const h = l?.humedad;
  const aire = m.aire;
  const eT = t === undefined ? null : etiquetaTemperatura(t);
  const eH = h === undefined ? null : etiquetaHumedad(h);
  const cat = aire?.nivel ?? null;
  const valorPrincipal = aire && l ? concentracion(l, aire.principal) : undefined;
  const detalleAire = !aire
    ? 'Sin dato'
    : valorPrincipal === undefined
      ? 'NOM-172'
      : aire.principal === 'co'
        ? `CO ${numero(valorPrincipal, 1)} ppm`
        : `PM2.5 ${numero(valorPrincipal)}`;
  return (
    <View style={estilos.filaMetricas}>
      <TarjetaMetrica
        metrica="temperatura"
        icono="thermometer"
        color={Paleta.coral}
        fondo={Paleta.coralSuave}
        valor={t === undefined ? '--' : `${Math.round(t)}°`}
        detalle={eT?.texto ?? 'Sin dato'}
        colorDetalle={eT?.color ?? Paleta.textoTenue}
      />
      <TarjetaMetrica
        metrica="humedad"
        icono="water-outline"
        color={Paleta.azul}
        fondo={Paleta.azulSuave}
        valor={h === undefined ? '--' : `${Math.round(h)}%`}
        detalle={eH?.texto ?? 'Sin dato'}
        colorDetalle={eH?.color ?? Paleta.textoTenue}
      />
      <TarjetaMetrica
        metrica="aire"
        icono="leaf"
        color={cat?.color ?? Paleta.verde}
        fondo={cat?.colorSuave ?? Paleta.verdeSuave}
        valor={cat?.corto ?? '--'}
        detalle={detalleAire}
        colorDetalle={cat?.color ?? Paleta.textoTenue}
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
  const etiqueta = METRICAS[p.metrica].corto;
  return (
    <Pressable
      onPress={() => m.seleccionarMetrica(p.metrica)}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`${etiqueta}: ${p.valor}, ${p.detalle}`}
      style={[
        estilos.metrica,
        activa && [
          { borderColor: alfa(p.color, 0.6), borderWidth: 1.3, backgroundColor: alfa(p.color, 0.035) },
          sombraSuave,
        ],
      ]}
    >
      <ChipIcono nombre={p.icono} color={p.color} fondo={p.fondo} tam={26} />
      <T t={9.5} f="seminegrita" c={Paleta.textoSuave} style={{ marginTop: 14 }}>
        {etiqueta}
      </T>
      <T t={19} f="extra" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {p.valor}
      </T>
      <T t={9.5} f="negrita" c={p.colorDetalle} numberOfLines={1}>
        {p.detalle}
      </T>
    </Pressable>
  );
}

function AnalisisAire() {
  const m = useMonitor();
  const l = m.lectura;
  const aire = m.aire;
  const pm25 = l?.pm25;
  const nivelPm = pm25 === undefined ? null : nivel(indiceDe('pm25', pm25));
  // Dentro de rango: Buena o Aceptable (NOM-172).
  const dentro = !aire || aire.nivel.indice <= 1;
  const colorRango = dentro ? Paleta.verde : aire.nivel.color;
  const cr = colorConFondo(colorRango, 0.08);
  const colorCo = aire?.niveles.co === undefined ? undefined : nivel(aire.niveles.co).color;

  return (
    <Tarjeta>
      <View style={estilos.cabecera}>
        <View style={{ flex: 1 }}>
          <Etiqueta>ANÁLISIS DEL AMBIENTE</Etiqueta>
          <T t={17} f="extra" style={{ marginTop: 3 }}>
            Partículas y gases
          </T>
        </View>
        <Pastilla
          texto={!aire ? 'Sin datos' : dentro ? 'Dentro de rango' : 'Fuera de rango'}
          color={cr.color}
          fondo={cr.fondo}
          borde={cr.borde}
          punto={colorRango}
        />
      </View>

      <View style={[estilos.filaCentro, { marginTop: 16 }]}>
        <ChipIcono
          nombre="dots-grid"
          color={nivelPm?.color ?? Paleta.verde}
          fondo={nivelPm?.colorSuave ?? Paleta.verdeSuave}
          tam={40}
          tamIcono={20}
          radio={12}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <T t={10.5} c={Paleta.textoSuave}>
            Partículas PM2.5
          </T>
          <ValorConUnidad valor={numero(pm25)} unidad="µg/m³" tam={22} />
        </View>
        {nivelPm ? <Pastilla texto={nivelPm.nombre} color={nivelPm.color} fondo={nivelPm.colorSuave} /> : null}
      </View>

      <View style={{ marginTop: 12 }}>
        <BarraIndice
          posicion={posicionBarra('pm25', pm25 ?? 0)}
          colores={COLORES_NIVELES}
          etiquetas={etiquetasBarra('pm25')}
        />
      </View>
      <T t={9.5} c={Paleta.textoTenue} style={{ marginTop: 6 }}>
        Índice AIRE Y SALUD · NOM-172-SEMARNAT-2023
      </T>
      {l?.pm10 !== undefined ? (
        <T t={10} c={Paleta.textoSuave} style={{ marginTop: 8 }}>
          PM10: {numero(l.pm10)} µg/m³
        </T>
      ) : null}

      <View style={estilos.separador} />
      <View style={estilos.filaCentro}>
        <T t={12} f="negrita" style={{ flex: 1 }}>
          Gases y sensores
        </T>
        <T t={10} c={Paleta.textoTenue}>
          {m.simulando ? 'Simulación' : 'MQ-7 Electroquímico'}
        </T>
      </View>
      <View style={[estilos.filaMetricas, { gap: 10, marginTop: 10 }]}>
        <Gas nombre="Monóxido de Carbono (CO)" valor={numero(l?.co, 2)} unidad="ppm" color={colorCo} />
        {l?.co2 !== undefined ? <Gas nombre="CO2" valor={numero(l?.co2)} unidad="ppm" /> : null}
      </View>
    </Tarjeta>
  );
}

function Gas({ nombre, valor, unidad, color }: { nombre: string; valor: string; unidad: string; color?: string }) {
  return (
    <View style={estilos.gas}>
      <View style={estilos.filaCentro}>
        <T t={9} f="negrita" c={Paleta.textoSuave} style={{ flex: 1 }}>
          {nombre}
        </T>
        {color ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} /> : null}
      </View>
      <ValorConUnidad valor={valor} unidad={unidad} tam={15} style={{ marginTop: 4 }} />
    </View>
  );
}

function TarjetaGrafica() {
  const m = useMonitor();
  const metrica = m.metrica;
  const aire = m.aire;
  const color =
    metrica === 'temperatura'
      ? Paleta.coral
      : metrica === 'humedad'
        ? Paleta.azul
        : (aire?.nivel.color ?? Paleta.verde);
  const [textoVivo, colorVivo] =
    m.conexion === 'enLinea'
      ? ['En vivo', color]
      : m.conexion === 'conectando'
        ? ['Conectando', Paleta.amarillo]
        : ['Sin señal', Paleta.textoTenue];
  const puntos = puntosUltimasHoras(m.historial, m.lectura, metrica, Date.now());
  return (
    <Tarjeta style={{ paddingBottom: 10 }}>
      <View style={estilos.cabecera}>
        <View style={{ flex: 1 }}>
          <Etiqueta>ÚLTIMAS HORAS</Etiqueta>
          <T t={17} f="extra" style={{ marginTop: 3 }}>
            {METRICAS[metrica].titulo}
          </T>
        </View>
        <Pastilla texto={textoVivo} mayusculas punto={colorVivo} pulso={m.conexion === 'enLinea'} />
      </View>
      <View style={{ marginTop: 8 }}>
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

function BotonSimular() {
  const m = useMonitor();
  const toast = useToast();
  return (
    <Pressable
      disabled={m.simulando}
      accessibilityRole="button"
      onPress={async () => {
        const permiso = await m.simularAlerta();
        if (!permiso) {
          toast('Alerta simulada. Para verla también como notificación, permite las notificaciones de la app.');
        }
      }}
      style={({ pressed }) => [estilos.simular, { opacity: pressed ? 0.6 : 1 }]}
    >
      <T t={11} f="negrita" c={Paleta.textoSuave}>
        {m.simulando ? 'Simulación en curso…' : 'Simular alerta de aire'}
      </T>
    </Pressable>
  );
}

/** Línea de estado al pie: origen de los datos y antigüedad de la lectura. */
function PieEstado({ alAbrirAjustes }: { alAbrirAjustes: () => void }) {
  const m = useMonitor();
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const d = m.dispositivo;
  const cuando = m.ultimaActualizacion === null ? null : haceCuanto(m.ultimaActualizacion, ahora);
  const texto = d.demo
    ? 'Modo demostración · toca aquí para conectar tu ESP32'
    : m.conexion === 'enLinea'
      ? `ESP32 · ${d.direccion} · actualizado ${cuando}`
      : m.conexion === 'conectando'
        ? `Conectando con ${d.direccion}…`
        : cuando === null
          ? `Sin lecturas de ${d.direccion} todavía`
          : `Sin señal · última lectura ${cuando}`;
  return (
    <Pressable onPress={alAbrirAjustes} style={{ alignSelf: 'center', padding: 6 }} accessibilityRole="button">
      <T t={9.5} f="seminegrita" c={Paleta.textoTenue} style={{ textAlign: 'center' }}>
        {texto}
      </T>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32, gap: 12 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 },
  heroe: { width: 230, height: 170, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  gradoAnillo: { width: 13, height: 13, borderRadius: 7, borderWidth: 3, marginTop: 20, marginLeft: 2 },
  filaMetricas: { flexDirection: 'row', gap: 8, marginTop: 6 },
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
  separador: { height: 1, backgroundColor: Paleta.borde, marginVertical: 13 },
  gas: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: Paleta.borde, paddingTop: 7, paddingBottom: 8, paddingHorizontal: 7 },
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
  simular: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
});
