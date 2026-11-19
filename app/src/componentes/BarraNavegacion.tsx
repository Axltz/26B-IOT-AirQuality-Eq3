import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { sombra, useEstilos, useTema } from '../estado/tema';
import type { PaletaTema } from '../tema';
import { ALTO_BARRA, Icono, MARGEN_BARRA, T, type NombreIcono } from './comunes';

/** Pestañas en el orden de la barra (§0.4). */
const PESTANAS: Record<string, { etiqueta: string; icono: NombreIcono; ancho: number }> = {
  index: { etiqueta: 'Inicio', icono: 'home-outline', ancho: 1 },
  contaminantes: { etiqueta: 'Contaminantes', icono: 'pulse', ancho: 1.55 },
  alertas: { etiqueta: 'Alertas', icono: 'bell-outline', ancho: 1 },
  ajustes: { etiqueta: 'Ajustes', icono: 'cog-outline', ancho: 1 },
};

/**
 * Barra flotante: 10 px sobre el borde inferior (más el área segura), 12 px
 * de margen lateral, radio 24 y padding 6. La pestaña activa es una píldora
 * de radio 18 con los colores del token «pestaña activa». Administración vive
 * dentro de la pila de Ajustes, así que ahí la activa es Ajustes.
 *
 * Fondo: desenfoque de 10 px (expo-blur) bajo el color translúcido del token
 * «barra inferior». En Android el desenfoque requiere envolver toda la escena
 * en un BlurTargetView y la sombra de `elevation` se ve a través de fondos
 * translúcidos, así que ahí se usa el color opaco equivalente (superficie).
 */
const CON_DESENFOQUE = Platform.OS !== 'android';

export function BarraNavegacion({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const m = useMonitor();

  return (
    <View pointerEvents="box-none" style={[e.contenedor, { bottom: MARGEN_BARRA + insets.bottom }]}>
      <View style={e.barra} accessibilityRole="tablist">
        {CON_DESENFOQUE ? (
          <>
            {/* intensidad 50 = blur(10px) en web; en iOS, el material equivalente */}
            <BlurView intensity={50} tint={tema.oscuro ? 'dark' : 'light'} style={e.capa} />
            <View style={[e.capa, { backgroundColor: tema.barraFondo }]} />
          </>
        ) : null}
        {state.routes.map((ruta, i) => {
          const p = PESTANAS[ruta.name];
          if (!p) return null;
          const activa = i === state.index;
          const color = activa ? tema.pestanaActivaTexto : tema.barraInactiva;
          const aviso = ruta.name === 'alertas' && m.hayAvisoSinLeer;
          const alPresionar = () => {
            const evento = emitter.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
            if (!activa && !evento.defaultPrevented) navigateToTab(ruta.key);
          };
          return (
            <Pressable
              key={ruta.key}
              onPress={alPresionar}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: ruta.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              aria-selected={activa}
              accessibilityLabel={
                descriptors[ruta.key]?.options.tabBarAccessibilityLabel ??
                (aviso ? `${p.etiqueta}, 1 aviso sin leer` : p.etiqueta)
              }
              android_ripple={{ color: 'transparent' }}
              style={[e.pestana, { flexGrow: p.ancho }, activa && { backgroundColor: tema.pestanaActivaFondo }]}
            >
              <View>
                <Icono nombre={p.icono} tam={19} color={color} />
                {aviso ? <View style={[e.punto, { borderColor: activa ? tema.pestanaActivaFondo : tema.superficie }]} /> : null}
              </View>
              <T t={9} f="seminegrita" c={color} numberOfLines={1} style={e.etiqueta}>
                {p.etiqueta}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    contenedor: {
      position: 'absolute',
      left: 12,
      right: 12,
      alignItems: 'center',
    },
    barra: {
      width: '100%',
      maxWidth: 436,
      minHeight: ALTO_BARRA,
      flexDirection: 'row',
      gap: 4,
      padding: 6,
      borderRadius: 24,
      backgroundColor: CON_DESENFOQUE ? 'transparent' : p.superficie,
      ...sombra(p.sombraBarra),
    },
    capa: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 24, overflow: 'hidden' },
    pestana: {
      flexBasis: 0,
      flexShrink: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingTop: 8,
      paddingBottom: 7,
      paddingHorizontal: 2,
      borderRadius: 18,
    },
    etiqueta: { lineHeight: 11, textAlign: 'center' },
    punto: {
      position: 'absolute',
      top: -1,
      right: -3,
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1.5,
      backgroundColor: p.peligro,
    },
  });
