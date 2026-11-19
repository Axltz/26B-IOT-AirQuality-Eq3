import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sombra, useEstilos, useTema } from '../estado/tema';
import { Fuente, alfa, mezclar, type PaletaTema } from '../tema';

export type NombreIcono = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const nativo = Platform.OS !== 'web';

/** Alto de la barra de navegación inferior y su separación del borde (§0.4). */
export const ALTO_BARRA = 64;
export const MARGEN_BARRA = 10;

/** Espacio que cada ScrollView deja abajo para que la barra no tape contenido. */
export function useEspacioInferior(extra = 16): number {
  const insets = useSafeAreaInsets();
  return ALTO_BARRA + MARGEN_BARRA + insets.bottom + extra;
}

/** Texto con la tipografía de la app (DM Sans por defecto). */
export function T({
  t = 13,
  f = 'media',
  c,
  style,
  ...resto
}: TextProps & { t?: number; f?: keyof typeof Fuente; c?: string }) {
  const tema = useTema();
  return <Text {...resto} style={[{ fontSize: t, fontFamily: Fuente[f], color: c ?? tema.texto }, style]} />;
}

/** Cifra en Sora con números tabulares, para que no «bailen» al actualizarse. */
export function Cifra({ style, f = 'display', ...resto }: React.ComponentProps<typeof T>) {
  return <T f={f} {...resto} style={[{ fontVariant: ['tabular-nums'], letterSpacing: -0.3 }, style]} />;
}

/** Eyebrow: 9.5 px / 700, mayúsculas, espaciado 0.13 em. */
export function Etiqueta({ children, c, style }: { children: ReactNode; c?: string; style?: StyleProp<TextStyle> }) {
  const tema = useTema();
  return (
    <T t={9.5} f="negrita" c={c ?? tema.textoSuave} style={[{ letterSpacing: 1.24, textTransform: 'uppercase' }, style]}>
      {children}
    </T>
  );
}

export function Icono({ nombre, tam = 16, color }: { nombre: NombreIcono; tam?: number; color?: string }) {
  const tema = useTema();
  return <MaterialCommunityIcons name={nombre} size={tam} color={color ?? tema.texto} />;
}

/** Tarjeta: superficie del tema, sin borde, radio 26 y sombra del token. */
export function Tarjeta({
  children,
  style,
  fondo,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  fondo?: string;
}) {
  const e = useEstilos(crearEstilos);
  return <View style={[e.tarjeta, fondo ? { backgroundColor: fondo } : null, style]}>{children}</View>;
}

/** Punto de color; con `pulso` late suavemente. Con `halo` lleva un anillo del 25 %. */
export function PuntoEstado({
  color,
  tam = 7,
  pulso = false,
  halo = false,
}: {
  color: string;
  tam?: number;
  pulso?: boolean;
  halo?: boolean;
}) {
  const opacidad = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulso) {
      opacidad.setValue(1);
      return;
    }
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0.3, duration: 900, useNativeDriver: nativo }),
        Animated.timing(opacidad, { toValue: 1, duration: 900, useNativeDriver: nativo }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [pulso, opacidad]);
  const punto = (
    <Animated.View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: color, opacity: opacidad }} />
  );
  if (!halo) return punto;
  return (
    <View
      style={{
        width: tam + 6,
        height: tam + 6,
        borderRadius: (tam + 6) / 2,
        backgroundColor: alfa(color, 0.25),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {punto}
    </View>
  );
}

/** Píldora con punto opcional («● En vivo»). */
export function Pastilla({
  texto,
  color,
  fondo,
  punto,
  pulso,
  icono,
}: {
  texto: string;
  color?: string;
  fondo?: string;
  punto?: string;
  pulso?: boolean;
  icono?: NombreIcono;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const c = color ?? tema.textoSuave;
  return (
    <View style={[e.pastilla, { backgroundColor: fondo ?? tema.superficie2 }]}>
      {punto ? <PuntoEstado color={punto} tam={7} pulso={pulso} /> : null}
      {icono ? <Icono nombre={icono} tam={13} color={c} /> : null}
      <T t={10.5} f="negrita" c={c} numberOfLines={1}>
        {texto}
      </T>
    </View>
  );
}

/** Píldora de sistema (cian): «En vivo», «Conectado»… */
export function PastillaSistema({ texto, pulso, apagada }: { texto: string; pulso?: boolean; apagada?: boolean }) {
  const tema = useTema();
  if (apagada) return <Pastilla texto={texto} punto={tema.textoSuave} />;
  return <Pastilla texto={texto} color={tema.sistemaTexto} fondo={tema.sistemaSuave} punto={tema.sistema} pulso={pulso} />;
}

/** Píldora con el color del nivel (fondo `lv` al 18 % sobre la superficie). */
export function PastillaNivel({ indice, texto }: { indice: number; texto: string }) {
  const tema = useTema();
  const i = Math.min(4, Math.max(0, indice));
  return <Pastilla texto={texto} color={tema.lt[i]} fondo={mezclar(tema.lv[i], tema.superficie, 0.18)} punto={tema.lv[i]} />;
}

/** Cuadro redondeado con un icono (34 px, radio 11). */
export function ChipIcono({
  nombre,
  color,
  fondo,
  tam = 34,
  tamIcono = 17,
  radio = 11,
}: {
  nombre: NombreIcono;
  color: string;
  fondo: string;
  tam?: number;
  tamIcono?: number;
  radio?: number;
}) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: radio, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Icono nombre={nombre} tam={tamIcono} color={color} />
    </View>
  );
}

/** Botón redondo de 38 px sobre el fondo de pantalla (atrás, engrane, campana…). */
export function BotonIcono({
  icono,
  etiqueta,
  alPresionar,
  peligro,
  children,
}: {
  icono: NombreIcono;
  etiqueta: string;
  alPresionar: () => void;
  peligro?: boolean;
  children?: ReactNode;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={4}
      style={({ pressed }) => [
        e.botonIcono,
        { backgroundColor: peligro ? tema.peligroSuave : tema.iconoSobreFondo, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icono nombre={icono} tam={18} color={peligro ? tema.peligro : tema.iconoSobreFondoTexto} />
      {children}
    </Pressable>
  );
}

/** Interruptor: pista `superficie2` → token «toggle activo». */
export function Interruptor({
  valor,
  alCambiar,
  etiqueta,
}: {
  valor: boolean;
  alCambiar: (v: boolean) => void;
  etiqueta: string;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const pos = useRef(new Animated.Value(valor ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(pos, { toValue: valor ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [valor, pos]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={etiqueta}
      onPress={() => alCambiar(!valor)}
      hitSlop={8}
      android_ripple={{ color: 'transparent' }}
    >
      <Animated.View
        style={[
          e.pista,
          {
            backgroundColor: pos.interpolate({ inputRange: [0, 1], outputRange: [tema.superficie2, tema.togglePista] }),
            borderColor: pos.interpolate({ inputRange: [0, 1], outputRange: [tema.borde, tema.togglePista] }),
          },
        ]}
      >
        <Animated.View
          style={[
            e.perilla,
            {
              backgroundColor: pos.interpolate({
                inputRange: [0, 1],
                outputRange: [tema.togglePerillaInactiva, tema.togglePerilla],
              }),
              transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Selector en píldoras (PM2.5 | PM10 | PM1, Claro | Oscuro | Sistema…). */
export function Segmentos<V extends string | number>({
  valor,
  opciones,
  alElegir,
  rol = 'radio',
}: {
  valor: V;
  opciones: readonly (readonly [V, string])[];
  alElegir: (v: V) => void;
  rol?: 'radio' | 'tab';
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <View style={e.segmentos} accessibilityRole={rol === 'tab' ? 'tablist' : 'radiogroup'}>
      {opciones.map(([v, texto]) => {
        const activo = v === valor;
        return (
          <Pressable
            key={String(v)}
            onPress={() => alElegir(v)}
            accessibilityRole={rol}
            accessibilityState={{ selected: activo }}
            aria-selected={activo}
            android_ripple={{ color: 'transparent' }}
            style={[e.segmento, activo && { backgroundColor: tema.chipActivoFondo }]}
          >
            <T t={11.5} f="negrita" c={activo ? tema.chipActivoTexto : tema.textoSuave} numberOfLines={1}>
              {texto}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Valor con unidad pequeña: "12 µg/m³". */
export function ValorConUnidad({
  valor,
  unidad,
  tam = 20,
  style,
}: {
  valor: string;
  unidad: string;
  tam?: number;
  style?: StyleProp<TextStyle>;
}) {
  const tema = useTema();
  return (
    <Cifra t={tam} numberOfLines={1} style={style}>
      {valor}
      <T t={11} f="negrita" c={tema.textoSuave}>
        {' '}
        {unidad}
      </T>
    </Cifra>
  );
}

/** Botón principal en píldora (token «botón principal»). */
export function BotonPrincipal({
  texto,
  alPresionar,
  deshabilitado,
  icono,
  style,
}: {
  texto: string;
  alPresionar: () => void;
  deshabilitado?: boolean;
  icono?: NombreIcono;
  style?: StyleProp<ViewStyle>;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      disabled={deshabilitado}
      style={({ pressed }) => [e.boton, { opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {icono ? <Icono nombre={icono} tam={16} color={tema.botonTexto} /> : null}
      <T t={13} f="negrita" c={tema.botonTexto}>
        {texto}
      </T>
    </Pressable>
  );
}

/**
 * Botón secundario en píldora. Sobre el fondo de pantalla va en `superficie`;
 * dentro de una tarjeta (`enTarjeta`) va en `superficie2` para distinguirse.
 */
export function BotonSecundario({
  texto,
  icono,
  alPresionar,
  color,
  deshabilitado,
  enTarjeta,
  compacto,
  style,
}: {
  texto: string;
  icono?: NombreIcono;
  alPresionar: () => void;
  color?: string;
  deshabilitado?: boolean;
  enTarjeta?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const c = color ?? tema.texto;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      disabled={deshabilitado}
      style={({ pressed }) => [
        e.botonSecundario,
        enTarjeta ? { backgroundColor: tema.superficie2 } : sombra(tema.sombraTarjeta),
        compacto && e.botonCompacto,
        { opacity: deshabilitado ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {icono ? <Icono nombre={icono} tam={compacto ? 14 : 16} color={c} /> : null}
      <T t={compacto ? 11.5 : 13} f="negrita" c={c} numberOfLines={1}>
        {texto}
      </T>
    </Pressable>
  );
}

/** Línea divisoria de 1 px. */
export function Separador({ style }: { style?: StyleProp<ViewStyle> }) {
  const tema = useTema();
  return <View style={[{ height: 1, backgroundColor: tema.borde }, style]} />;
}

/** Formatea un número o devuelve "—". */
export function numero(v: number | undefined, decimales = 0): string {
  return v === undefined ? '—' : v.toFixed(decimales);
}

// --------------------------------------------------------------- avisos breves

const ContextoToast = createContext<(texto: string) => void>(() => {});

export function useToast() {
  return useContext(ContextoToast);
}

/** Mensaje breve sobre la barra de navegación (como un SnackBar). */
export function ProveedorToast({ children }: { children: ReactNode }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState<string | null>(null);
  const opacidad = useRef(new Animated.Value(0)).current;
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback(
    (t: string) => {
      setTexto(t);
      if (reloj.current) clearTimeout(reloj.current);
      Animated.timing(opacidad, { toValue: 1, duration: 180, useNativeDriver: nativo }).start();
      reloj.current = setTimeout(() => {
        Animated.timing(opacidad, { toValue: 0, duration: 220, useNativeDriver: nativo }).start(() => setTexto(null));
      }, 4200);
    },
    [opacidad],
  );

  return (
    <ContextoToast.Provider value={mostrar}>
      {children}
      {texto ? (
        <Animated.View
          pointerEvents="none"
          style={[e.toast, { opacity: opacidad, bottom: ALTO_BARRA + MARGEN_BARRA + insets.bottom + 12 }]}
        >
          <T t={12.5} c={tema.superficie} style={{ lineHeight: 18 }}>
            {texto}
          </T>
        </Animated.View>
      ) : null}
    </ContextoToast.Provider>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
  tarjeta: {
    backgroundColor: p.superficie,
    borderRadius: 26,
    padding: 14,
    gap: 10,
    ...sombra(p.sombraTarjeta),
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  botonIcono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pista: { width: 40, height: 24, borderRadius: 12, padding: 2, borderWidth: 1 },
  perilla: {
    width: 18,
    height: 18,
    borderRadius: 9,
    ...Platform.select<ViewStyle>({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.25)' } as ViewStyle,
      default: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    }),
  },
  segmentos: { flexDirection: 'row', gap: 6 },
  segmento: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 99,
    backgroundColor: p.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: p.botonFondo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  botonSecundario: {
    minHeight: 46,
    borderRadius: 99,
    backgroundColor: p.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  botonCompacto: { minHeight: 34, paddingHorizontal: 10, gap: 5 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: p.texto,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  });
