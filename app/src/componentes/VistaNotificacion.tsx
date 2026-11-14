import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import type { EstadoAlerta } from '../logica/alertas';
import {
  COLORES_NIVELES,
  CONTAMINANTES,
  NIVELES,
  concentracion,
  nivel,
  posicionBarra,
  posicionNivel,
  recomendacion,
} from '../logica/calidadAire';
import { horaCorta } from '../logica/historial';
import { Paleta, alfa } from '../tema';
import { BarraIndice, BotonPrincipal, ChipIcono, Etiqueta, Icono, Pastilla, T, Tarjeta, ValorConUnidad, numero } from './comunes';

/** Pestaña "Notificación": detalle de la alerta de calidad del aire. */
export function VistaNotificacion() {
  const m = useMonitor();
  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      {m.alerta ? <DetalleAlerta a={m.alerta} /> : <SinAvisos />}
    </ScrollView>
  );
}

function DetalleAlerta({ a }: { a: EstadoAlerta }) {
  const m = useMonitor();
  const enCurso = a.enCurso;
  // Mientras dura se muestra el nivel actual; al terminar, el máximo.
  const cat = nivel(enCurso ? a.nivel : a.nivelMaximo);
  const c = CONTAMINANTES[a.principal] ?? CONTAMINANTES.sensor;
  const esCo = a.principal === 'co';
  const valor = concentracion(a, a.principal);
  const posicion =
    enCurso && valor !== undefined ? posicionBarra(esCo ? 'co' : 'pm25', valor) : posicionNivel(cat.indice);
  const color = enCurso ? cat.color : Paleta.verde;
  const fondo = enCurso ? cat.colorSuave : Paleta.verdeSuave;

  const titulo = enCurso ? `La calidad del aire es ${cat.adjetivo}` : 'La calidad del aire mejoró';
  const subtitulo = enCurso
    ? `Detectamos una concentración elevada de ${c.enFrase} ${c.exterior ? 'en tu zona' : `en ${a.dispositivo}`}.`
    : `El aire mejoró a las ${horaCorta(a.fin ?? Date.now())}. El punto más alto fue: ${nivel(a.nivelMaximo).nombre}.`;
  const momento = enCurso
    ? Date.now() - a.inicio < 2 * 60_000
      ? 'Ahora'
      : `Desde las ${horaCorta(a.inicio)}`
    : `De ${horaCorta(a.inicio)} a ${horaCorta(a.fin ?? Date.now())}`;
  const pie = !enCurso
    ? 'Te avisaremos de nuevo si la calidad del aire vuelve a empeorar.'
    : m.ajustes.alertasActivas && m.ajustes.avisarMejora
      ? 'Recibirás otra notificación cuando la calidad del aire mejore.'
      : 'Activa las alertas para saber cuándo mejore la calidad del aire.';

  return (
    <View style={{ alignItems: 'center' }}>
      <IconoAviso color={color} fondo={fondo} resuelta={!enCurso} />
      <View style={{ marginTop: 12 }}>
        <Etiqueta c={Paleta.textoSuave}>{enCurso ? 'ALERTA AMBIENTAL' : 'ALERTA RESUELTA'}</Etiqueta>
      </View>
      <T t={23} f="extra" style={estilos.titulo}>
        {titulo}
      </T>
      <T t={11.5} c={Paleta.textoSuave} style={estilos.subtitulo}>
        {subtitulo}
      </T>

      <LinearGradient
        colors={[alfa(cat.colorSuave, 0.55), cat.colorSuave]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[estilos.tarjetaAlerta, { borderColor: alfa(cat.color, 0.28) }]}
      >
        <View style={estilos.fila}>
          <T t={10.5} f="negrita" style={{ flex: 1 }}>
            {momento}
          </T>
          {a.simulada ? <Pastilla texto="Simulación" fondo="#FFFFFFB3" /> : null}
          <Pastilla texto={a.dispositivo} fondo="#FFFFFF" />
        </View>
        <View style={[estilos.fila, { marginTop: 12, gap: 10 }]}>
          <View style={[estilos.exclamacion, { backgroundColor: cat.color }]}>
            <Icono nombre="exclamation-thick" tam={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <T t={10} c={Paleta.textoSuave}>
              {enCurso ? 'Índice AIRE Y SALUD (NOM-172)' : 'Máximo registrado'}
            </T>
            <T t={19} f="extra">
              {cat.nombre}
            </T>
            <T t={10} f="seminegrita" c={Paleta.textoSuave}>
              {cat.riesgo}
            </T>
          </View>
        </View>
        <View style={[estilos.fila, { marginTop: 12, gap: 8, alignItems: 'stretch' }]}>
          <View style={[estilos.dato, { flex: 1 }]}>
            <T t={9.5} c={Paleta.textoSuave}>
              {esCo ? 'CO' : 'PM2.5'}
            </T>
            <ValorConUnidad
              valor={esCo ? numero(a.co, 1) : numero(a.pm25)}
              unidad={esCo ? 'ppm' : 'µg/m³'}
              tam={16}
              style={{ marginTop: 4 }}
            />
          </View>
          <View style={[estilos.dato, { flex: 2 }]}>
            <T t={9.5} c={Paleta.textoSuave}>
              Contaminante principal
            </T>
            <T t={14} f="extra" numberOfLines={2} style={{ marginTop: 4 }}>
              {c.nombre}
            </T>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <BarraIndice posicion={posicion} colores={COLORES_NIVELES} />
        </View>
      </LinearGradient>

      <Tarjeta radio={16} style={estilos.salud}>
        <ChipIcono nombre="heart-pulse" color={Paleta.textoSuave} fondo={Paleta.relleno} tam={32} tamIcono={17} radio={10} />
        <View style={{ flex: 1 }}>
          <T t={13} f="extra">
            Cuida tu salud
          </T>
          <T t={11} c={Paleta.textoSuave} style={{ marginTop: 3, lineHeight: 16 }}>
            {recomendacion(enCurso ? cat : NIVELES[0], a.principal)}
          </T>
        </View>
      </Tarjeta>

      <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <BotonPrincipal texto="Entendido, volver al resumen" alPresionar={m.marcarAvisoLeido} />
      </View>
      <T t={9.5} c={Paleta.textoTenue} style={{ marginTop: 12, textAlign: 'center' }}>
        {pie}
      </T>
    </View>
  );
}

function IconoAviso({ color, fondo, resuelta }: { color: string; fondo: string; resuelta: boolean }) {
  return (
    <View style={[estilos.iconoAviso, { backgroundColor: fondo }]}>
      <Icono nombre={resuelta ? 'check-circle-outline' : 'bell-outline'} tam={26} color={color} />
      {!resuelta ? <View style={[estilos.puntoAviso, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function SinAvisos() {
  const m = useMonitor();
  return (
    <View style={{ alignItems: 'center', paddingTop: 30 }}>
      <IconoAviso color={Paleta.verde} fondo={Paleta.verdeSuave} resuelta />
      <View style={{ marginTop: 12 }}>
        <Etiqueta c={Paleta.textoSuave}>SIN AVISOS</Etiqueta>
      </View>
      <T t={23} f="extra" style={estilos.titulo}>
        Todo en orden
      </T>
      <T t={11.5} c={Paleta.textoSuave} style={estilos.subtitulo}>
        {m.ajustes.alertasActivas
          ? `No hay alertas de calidad del aire. Te avisaremos si el aire de ${m.dispositivo.nombre} empeora.`
          : 'Las alertas están desactivadas. Actívalas en el resumen para recibir avisos.'}
      </T>
      <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
        <BotonPrincipal texto="Volver al resumen" alPresionar={() => m.mostrarVista('resumen')} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 32 },
  titulo: { marginTop: 8, textAlign: 'center', letterSpacing: -0.3, lineHeight: 28 },
  subtitulo: { marginTop: 8, textAlign: 'center', lineHeight: 17, paddingHorizontal: 16 },
  tarjetaAlerta: { alignSelf: 'stretch', borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 20 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exclamacion: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dato: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  salud: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 12, padding: 14 },
  iconoAviso: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  puntoAviso: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: Paleta.fondo,
  },
});
