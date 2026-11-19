import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useMonitor } from '../estado/monitor';
import { useReducirMovimiento, useTema } from '../estado/tema';
import { fondoDeNivel, fondoPastel, type Fondo } from '../tema';
import { nivelGeneral } from './datosAire';

const nativo = Platform.OS !== 'web';
const clave = (f: Fondo) => `${f.angulo}|${f.colores.join(',')}`;

/**
 * Puntos de inicio y fin de un degradado CSS `linear-gradient(<ángulo>deg, …)`
 * en coordenadas relativas (0–1) de una caja de `ancho` × `alto`, para que el
 * resultado coincida con la maqueta.
 */
function puntosDegradado(angulo: number, ancho: number, alto: number) {
  const a = (angulo * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const largo = Math.abs(ancho * dx) + Math.abs(alto * dy);
  const mx = (dx * largo) / 2 / Math.max(1, ancho);
  const my = (dy * largo) / 2 / Math.max(1, alto);
  return { start: { x: 0.5 - mx, y: 0.5 - my }, end: { x: 0.5 + mx, y: 0.5 + my } };
}

function Capa({ fondo }: { fondo: Fondo }) {
  const { width, height } = useWindowDimensions();
  if (fondo.colores.length < 2) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo.colores[0] }]} />;
  }
  const { start, end } = puntosDegradado(fondo.angulo, width, height);
  return (
    <LinearGradient
      colors={fondo.colores as unknown as readonly [string, string, ...string[]]}
      locations={fondo.paradas as unknown as readonly [number, number, ...number[]] | undefined}
      start={start}
      end={end}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * Fondo fijo a pantalla completa, detrás del ScrollView (§0.1). Al cambiar de
 * fondo hace un fundido de ~400 ms (inmediato con «reducir movimiento»).
 */
export function FondoPantalla({ fondo }: { fondo: Fondo }) {
  const reducir = useReducirMovimiento();
  const [capas, setCapas] = useState<{ actual: Fondo; anterior: Fondo | null }>({ actual: fondo, anterior: null });
  const opacidad = useRef(new Animated.Value(1)).current;
  const k = clave(fondo);

  useEffect(() => {
    let vivo = true;
    setCapas((c) => (clave(c.actual) === k ? c : { actual: fondo, anterior: reducir ? null : c.actual }));
    if (reducir) {
      opacidad.setValue(1);
      return;
    }
    opacidad.setValue(0);
    Animated.timing(opacidad, { toValue: 1, duration: 400, useNativeDriver: nativo }).start(({ finished }) => {
      if (finished && vivo) setCapas((c) => ({ ...c, anterior: null }));
    });
    return () => {
      vivo = false;
    };
    // `fondo` cambia de identidad en cada render; basta con su clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, reducir]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {capas.anterior ? <Capa fondo={capas.anterior} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: capas.anterior ? opacidad : 1 }]}>
        <Capa fondo={capas.actual} />
      </Animated.View>
    </View>
  );
}

/**
 * Fondo de Inicio y Contaminantes: el degradado del nivel actual o, si el
 * ajuste «Fondo según la calidad del aire» está apagado o aún no hay lectura,
 * el azul pastel.
 */
export function useFondoDeNivel(): Fondo {
  const m = useMonitor();
  const tema = useTema();
  const n = nivelGeneral(m);
  if (!m.ajustes.fondoPorNivel || n === null) return fondoPastel(tema, 'azul');
  return fondoDeNivel(tema, n);
}
