import { Pressable, StyleSheet, View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { Paleta } from '../tema';
import { Etiqueta, Icono, PuntoEstado, T, sombraSuave } from './comunes';

/** "MI ENTORNO / Casa ▾" y la campana. */
export function Encabezado({ alAbrirSelector }: { alAbrirSelector: () => void }) {
  const m = useMonitor();
  const colorConexion =
    m.conexion === 'enLinea' ? Paleta.verde : m.conexion === 'conectando' ? Paleta.amarillo : Paleta.rojo;
  return (
    <View style={estilos.fila}>
      <Pressable
        onPress={alAbrirSelector}
        accessibilityRole="button"
        accessibilityLabel={`Dispositivo ${m.dispositivo.nombre}. Cambiar dispositivo`}
        style={({ pressed }) => [{ flexShrink: 1, paddingVertical: 4, opacity: pressed ? 0.6 : 1 }]}
      >
        <Etiqueta>MI ENTORNO</Etiqueta>
        <View style={estilos.nombre}>
          <Icono nombre="map-marker-outline" tam={16} color={Paleta.verde} />
          <T t={17} f="extra" numberOfLines={1} style={{ flexShrink: 1 }}>
            {m.dispositivo.nombre}
          </T>
          <Icono nombre="chevron-down" tam={18} color={Paleta.textoTenue} />
          <PuntoEstado color={colorConexion} pulso={m.conexion === 'conectando'} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => m.mostrarVista(m.vista === 'notificacion' ? 'resumen' : 'notificacion')}
        accessibilityRole="button"
        accessibilityLabel={m.hayAvisoSinLeer ? 'Avisos, 1 sin leer' : 'Avisos'}
        style={({ pressed }) => [estilos.campana, sombraSuave, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Icono nombre="bell-outline" tam={19} />
        {m.hayAvisoSinLeer ? <View style={estilos.puntoCampana} /> : null}
      </Pressable>
    </View>
  );
}

/** Pestañas "Resumen | Notificación (1)". */
export function Pestanas() {
  const m = useMonitor();
  const pestana = (texto: string, v: 'resumen' | 'notificacion', aviso = false) => {
    const activa = m.vista === v;
    return (
      <Pressable
        key={v}
        onPress={() => m.mostrarVista(v)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activa }}
        style={[estilos.pestana, activa && [estilos.pestanaActiva, sombraSuave]]}
      >
        <T t={11.5} f="negrita" c={activa ? Paleta.texto : Paleta.textoSuave}>
          {texto}
        </T>
        {aviso ? (
          <View style={estilos.insignia}>
            <T t={8.5} f="extra" c="#FFFFFF">
              1
            </T>
          </View>
        ) : null}
      </Pressable>
    );
  };
  return (
    <View style={estilos.pestanas} accessibilityRole="tablist">
      {pestana('Resumen', 'resumen')}
      {pestana('Notificación', 'notificacion', m.hayAvisoSinLeer)}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nombre: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  campana: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntoCampana: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Paleta.coral,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pestanas: {
    flexDirection: 'row',
    backgroundColor: Paleta.relleno,
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
  },
  pestana: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pestanaActiva: { backgroundColor: Paleta.superficie },
  insignia: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Paleta.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
