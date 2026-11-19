import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { sombra, useEstilos, useReducirMovimiento, useTema } from '../estado/tema';
import { nivel } from '../logica/calidadAire';
import { Fuente, alfa, type PaletaTema } from '../tema';
import { Etiqueta, T } from './comunes';

const nativo = Platform.OS !== 'web';

/** Bocas por nivel (viewBox 48), de sonrisa amplia a ceño fruncido (§0.2). */
const BOCAS = [
  'M14 28 Q24 39 34 28',
  'M16 30 Q24 35 32 30',
  'M16 32 L32 32',
  'M16 34 Q24 27 32 34',
  'M15 36 Q24 25 33 36',
];
const CEJAS = 'M12 13l8 4M36 13l-8 4';

const indiceSeguro = (i: number) => Math.min(4, Math.max(0, Math.round(i)));

/** Texto de riesgo corto: «Riesgo bajo» … «Riesgo extremo». */
export function textoRiesgo(indice: number): string {
  return indiceSeguro(indice) === 4 ? 'Riesgo extremo' : nivel(indice).riesgo;
}

/** Ojos y boca del rostro, en el color de texto del nivel (`lt`). */
function Cara({ indice, tam }: { indice: number; tam: number }) {
  const tema = useTema();
  const i = indiceSeguro(indice);
  const c = tema.lt[i];
  return (
    <Svg width={tam} height={tam} viewBox="0 0 48 48">
      <Circle cx={17} cy={20} r={3.2} fill={c} />
      <Circle cx={31} cy={20} r={3.2} fill={c} />
      {i === 4 ? <Path d={CEJAS} stroke={c} strokeWidth={3} strokeLinecap="round" fill="none" /> : null}
      <Path d={BOCAS[i]} stroke={c} strokeWidth={3.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/**
 * Rostro del nivel: círculo de 54 px (fondo del token «rostro») con anillo de
 * 6 px. En la franja de nivel se usa a 28 px, sin anillo.
 */
export function Rostro({ indice, tam = 54, anillo }: { indice: number; tam?: number; anillo?: string }) {
  const tema = useTema();
  const grande = tam >= 40;
  const circulo = (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: tam / 2,
        backgroundColor: tema.rostro,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Cara indice={indice} tam={grande ? Math.round(tam * (36 / 54)) : Math.round(tam * (22 / 28))} />
    </View>
  );
  if (!grande) return circulo;
  return (
    <View
      style={[
        {
          padding: 6,
          borderRadius: tam / 2 + 6,
          backgroundColor: anillo ?? 'rgba(255,255,255,0.3)',
        },
        sombra({ y: 10, blur: 22, spread: -10, color: anillo ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.35)', elevation: 3 }),
      ]}
    >
      {circulo}
    </View>
  );
}

/** Indicador de 1 a 5: barras de 18 px con alturas de 6 a 14 px. */
function Escalones({ indice, color }: { indice: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{ width: 18, height: 6 + i * 2, borderRadius: 99, backgroundColor: color, opacity: i <= indice ? 1 : 0.28 }}
        />
      ))}
    </View>
  );
}

/**
 * Mensaje de nivel protagonista (§0.2): rostro, eyebrow y riesgo, la palabra
 * del nivel en grande y el indicador de 1 a 5. `tinta` es el color del texto
 * sobre el fondo; `enPastel` (Alertas) pinta la palabra y el indicador con el
 * color `lt` del nivel y el anillo con `lv` al 35 %.
 */
export function MensajeNivel({
  indice,
  eyebrow,
  tinta,
  enPastel = false,
}: {
  indice: number;
  eyebrow: string;
  tinta: string;
  enPastel?: boolean;
}) {
  const tema = useTema();
  const reducir = useReducirMovimiento();
  const i = indiceSeguro(indice);
  const n = nivel(i);
  const escala = useRef(new Animated.Value(1)).current;
  const subida = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducir) {
      escala.setValue(1);
      subida.setValue(0);
      return;
    }
    escala.setValue(0.6);
    subida.setValue(6);
    const a = Animated.parallel([
      Animated.timing(escala, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.3, 1.6, 0.5, 1),
        useNativeDriver: nativo,
      }),
      Animated.timing(subida, { toValue: 0, duration: 450, easing: Easing.ease, useNativeDriver: nativo }),
    ]);
    a.start();
    return () => a.stop();
  }, [i, reducir, escala, subida]);

  const colorNivel = enPastel ? tema.lt[i] : tinta;
  const extrema = i === 4;
  const tam = extrema ? 28 : 46;

  return (
    <View style={{ gap: 10 }} accessible accessibilityLabel={`${eyebrow} ${n.nombre}. ${textoRiesgo(i)}. Nivel ${i + 1} de 5, NOM-172.`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Animated.View style={{ transform: [{ scale: escala }] }}>
          <Rostro indice={i} anillo={enPastel ? alfa(tema.lv[i], 0.35) : undefined} />
        </Animated.View>
        <View style={{ flexShrink: 1 }}>
          <Etiqueta c={tinta} style={{ opacity: 0.78 }}>
            {eyebrow}
          </Etiqueta>
          <T t={13.5} f="negrita" c={tinta} style={{ marginTop: 4 }}>
            {textoRiesgo(i)}
          </T>
        </View>
      </View>
      <Animated.Text
        style={{
          fontFamily: Fuente.display,
          fontSize: tam,
          lineHeight: extrema ? tam : Math.round(tam * 0.92),
          letterSpacing: -0.04 * tam,
          color: colorNivel,
          paddingTop: extrema ? 0 : 4,
          transform: [{ translateY: subida }],
        }}
      >
        {n.nombre}
      </Animated.Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Escalones indice={i} color={colorNivel} />
        <T t={11} f="negrita" c={tinta} style={{ opacity: 0.8 }}>
          Nivel {i + 1} de 5 · NOM-172
        </T>
      </View>
    </View>
  );
}

/**
 * Franja superior de una tarjeta de contaminante (versión compacta del
 * mensaje de nivel): color `lv`, rostro de 28 px, nombre y riesgo.
 * Va como primer hijo de una `Tarjeta` (padding 14).
 */
export function FranjaNivel({ indice }: { indice: number }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const i = indiceSeguro(indice);
  const texto = !tema.oscuro && i >= 3 ? tema.franjaTextoFuerte : tema.franjaTexto;
  return (
    <View style={[e.franja, { backgroundColor: tema.lv[i] }]} accessible accessibilityLabel={`${nivel(i).nombre}, ${textoRiesgo(i)}`}>
      <Rostro indice={i} tam={28} />
      <T t={15} f="display" c={texto}>
        {nivel(i).nombre}
      </T>
      <T t={11} f="negrita" c={texto} numberOfLines={2} style={e.franjaRiesgo}>
        {textoRiesgo(i)}
      </T>
    </View>
  );
}

/** Franja neutra para lecturas sin escala NOM-172 o sin datos. */
export function FranjaNeutra({ texto }: { texto: string }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <View style={[e.franja, { backgroundColor: tema.superficie2 }]}>
      <T t={13} f="negrita" c={tema.textoSuave}>
        {texto}
      </T>
    </View>
  );
}

const crearEstilos = (_p: PaletaTema) =>
  StyleSheet.create({
    franja: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: -14,
      marginHorizontal: -14,
      marginBottom: 2,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      minHeight: 46,
    },
    franjaRiesgo: { marginLeft: 'auto', textAlign: 'right', opacity: 0.85, flexShrink: 1 },
  });
