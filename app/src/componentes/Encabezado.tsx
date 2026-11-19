import { router } from 'expo-router';
import { View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { useTema } from '../estado/tema';
import { BotonIcono, Etiqueta, Icono, PuntoEstado, T } from './comunes';

/**
 * Cabecera de Inicio: «Mi entorno», la estación activa con su punto de estado
 * (cian = sistema; rojo si no hay conexión), y accesos a Ajustes y Alertas.
 */
export function Encabezado({ tinta }: { tinta: string }) {
  const m = useMonitor();
  const tema = useTema();
  const colorConexion = m.conexion === 'sinConexion' ? tema.peligro : tema.sistema;
  const estado =
    m.conexion === 'enLinea' ? 'en vivo' : m.conexion === 'conectando' ? 'conectando' : 'sin conexión';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexShrink: 1 }} accessible accessibilityLabel={`Mi entorno: ${m.dispositivo.nombre}, ${estado}`}>
        <Etiqueta c={tinta} style={{ opacity: 0.78 }}>
          Mi entorno
        </Etiqueta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Icono nombre="map-marker-outline" tam={16} color={tinta} />
          <T t={20} f="display" c={tinta} numberOfLines={1} style={{ flexShrink: 1, letterSpacing: -0.2 }}>
            {m.dispositivo.nombre}
          </T>
          <PuntoEstado color={colorConexion} pulso={m.conexion === 'conectando'} halo />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BotonIcono icono="cog-outline" etiqueta="Ajustes" alPresionar={() => router.navigate('/ajustes')} />
        <BotonIcono
          icono="bell-outline"
          etiqueta={m.hayAvisoSinLeer ? 'Alertas, 1 sin leer' : 'Alertas'}
          alPresionar={() => router.navigate('/alertas')}
        >
          {m.hayAvisoSinLeer ? (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 9,
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: tema.peligro,
                borderWidth: 1.5,
                borderColor: tema.superficie,
              }}
            />
          ) : null}
        </BotonIcono>
      </View>
    </View>
  );
}

/** Cabecera de las demás vistas: botón «atrás», eyebrow y título. */
export function CabeceraVista({
  titulo,
  eyebrow,
  tinta,
  tintaSuave,
  alVolver,
  derecha,
}: {
  titulo: string;
  eyebrow?: string;
  tinta: string;
  tintaSuave?: string;
  alVolver?: () => void;
  derecha?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        {alVolver ? <BotonIcono icono="arrow-left" etiqueta="Volver" alPresionar={alVolver} /> : null}
        <View style={{ flexShrink: 1 }}>
          {eyebrow ? (
            <Etiqueta c={tintaSuave ?? tinta} style={{ opacity: tintaSuave ? 1 : 0.78 }}>
              {eyebrow}
            </Etiqueta>
          ) : null}
          <T t={20} f="display" c={tinta} accessibilityRole="header" style={{ letterSpacing: -0.2, marginTop: eyebrow ? 2 : 0 }}>
            {titulo}
          </T>
        </View>
      </View>
      {derecha}
    </View>
  );
}
