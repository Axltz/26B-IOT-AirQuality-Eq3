import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { Fuente, Paleta, alfa } from '../tema';

export type NombreIcono = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const nativo = Platform.OS !== 'web';

/** Texto con la tipografía de la app. */
export function T({
  t = 13,
  f = 'media',
  c = Paleta.texto,
  style,
  ...resto
}: TextProps & { t?: number; f?: keyof typeof Fuente; c?: string }) {
  return <Text {...resto} style={[{ fontSize: t, fontFamily: Fuente[f], color: c }, style]} />;
}

/** Etiqueta pequeña en mayúsculas ("MI ENTORNO", "ÚLTIMAS HORAS"...). */
export function Etiqueta({ children, c = Paleta.textoTenue }: { children: ReactNode; c?: string }) {
  return (
    <T t={9.5} f="negrita" c={c} style={{ letterSpacing: 1.3 }}>
      {children}
    </T>
  );
}

export function Icono({ nombre, tam = 16, color = Paleta.texto }: { nombre: NombreIcono; tam?: number; color?: string }) {
  return <MaterialCommunityIcons name={nombre} size={tam} color={color} />;
}

/** Tarjeta blanca con borde suave. */
export function Tarjeta({
  children,
  style,
  radio = 20,
  fondo = Paleta.superficie,
  borde = Paleta.borde,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radio?: number;
  fondo?: string;
  borde?: string;
}) {
  return (
    <View style={[{ backgroundColor: fondo, borderRadius: radio, borderWidth: 1, borderColor: borde, padding: 16 }, style]}>
      {children}
    </View>
  );
}

/** Punto de color; con `pulso` late suavemente ("EN VIVO"). */
export function PuntoEstado({ color, tam = 6, pulso = false }: { color: string; tam?: number; pulso?: boolean }) {
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
  return (
    <Animated.View
      style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: color, opacity: opacidad }}
    />
  );
}

/** Pastilla con punto de color, p. ej. "● Dentro de rango". */
export function Pastilla({
  texto,
  color = Paleta.textoSuave,
  fondo = Paleta.relleno,
  borde,
  punto,
  pulso,
  mayusculas,
}: {
  texto: string;
  color?: string;
  fondo?: string;
  borde?: string;
  punto?: string;
  pulso?: boolean;
  mayusculas?: boolean;
}) {
  return (
    <View
      style={[
        estilos.pastilla,
        { backgroundColor: fondo },
        borde ? { borderWidth: 1, borderColor: borde } : null,
      ]}
    >
      {punto ? <PuntoEstado color={punto} tam={mayusculas ? 5 : 6} pulso={pulso} /> : null}
      <T
        t={mayusculas ? 8.5 : 10.5}
        f="negrita"
        c={color}
        style={mayusculas ? { letterSpacing: 0.8 } : undefined}
      >
        {mayusculas ? texto.toUpperCase() : texto}
      </T>
    </View>
  );
}

/** Cuadro redondeado con un icono, como el de cada tarjeta de métrica. */
export function ChipIcono({
  nombre,
  color,
  fondo,
  tam = 28,
  tamIcono = 15,
  radio = 8,
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

/** Interruptor con el estilo del diseño (verde, compacto). */
export function Interruptor({
  valor,
  alCambiar,
  etiqueta,
}: {
  valor: boolean;
  alCambiar: (v: boolean) => void;
  etiqueta: string;
}) {
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
    >
      <Animated.View
        style={[
          estilos.pista,
          { backgroundColor: pos.interpolate({ inputRange: [0, 1], outputRange: ['#D3D7D1', Paleta.verde] }) },
        ]}
      >
        <Animated.View
          style={[estilos.perilla, { transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Barra de colores con un marcador (tramos de la NOM-172). */
export function BarraIndice({
  posicion,
  colores,
  etiquetas = [],
}: {
  posicion: number;
  colores: string[];
  etiquetas?: string[];
}) {
  const [ancho, setAncho] = useState(0);
  const x = Math.min(Math.max(ancho * Math.min(Math.max(posicion, 0), 1), 5), Math.max(5, ancho - 5));
  return (
    <View>
      <View style={{ height: 12, justifyContent: 'center' }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        <LinearGradient
          colors={colores as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 6, borderRadius: 3 }}
        />
        {ancho > 0 ? <View style={[estilos.marcador, { left: x - 5 }]} /> : null}
      </View>
      {etiquetas.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {etiquetas.map((e) => (
            <T key={e} t={8.5} f="seminegrita" c={Paleta.textoTenue}>
              {e}
            </T>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Valor grande con unidad pequeña: "12 µg/m³". */
export function ValorConUnidad({ valor, unidad, tam = 20, style }: { valor: string; unidad: string; tam?: number; style?: StyleProp<TextStyle> }) {
  return (
    <T t={tam} f="negrita" numberOfLines={1} style={style}>
      {valor}
      <T t={tam * 0.5} f="seminegrita" c={Paleta.textoSuave}>
        {' '}
        {unidad}
      </T>
    </T>
  );
}

/** Botón principal verde oscuro ("Entendido, volver al resumen"). */
export function BotonPrincipal({ texto, alPresionar, deshabilitado }: { texto: string; alPresionar: () => void; deshabilitado?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      disabled={deshabilitado}
      style={({ pressed }) => [estilos.boton, { opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <T t={13} f="negrita" c="#FFFFFF">
        {texto}
      </T>
    </Pressable>
  );
}

/** Botón blanco con borde. */
export function BotonSecundario({
  texto,
  icono,
  alPresionar,
  color = Paleta.texto,
  deshabilitado,
}: {
  texto: string;
  icono?: NombreIcono;
  alPresionar: () => void;
  color?: string;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      disabled={deshabilitado}
      style={({ pressed }) => [estilos.botonSecundario, { opacity: deshabilitado ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      {icono ? <Icono nombre={icono} tam={17} color={color} /> : null}
      <T t={12.5} f="negrita" c={color}>
        {texto}
      </T>
    </Pressable>
  );
}

/** Formatea un número o devuelve "—". */
export function numero(v: number | undefined, decimales = 0): string {
  return v === undefined ? '—' : v.toFixed(decimales);
}

export function colorConFondo(color: string, a = 0.09) {
  return { color, fondo: alfa(color, a), borde: alfa(color, 0.22) };
}

// --------------------------------------------------------------- avisos breves

const ContextoToast = createContext<(texto: string) => void>(() => {});

export function useToast() {
  return useContext(ContextoToast);
}

/** Mensaje breve en la parte inferior (como un SnackBar). */
export function ProveedorToast({ children }: { children: ReactNode }) {
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
        <Animated.View pointerEvents="none" style={[estilos.toast, { opacity: opacidad }]}>
          <T t={12.5} c="#FFFFFF" style={{ lineHeight: 18 }}>
            {texto}
          </T>
        </Animated.View>
      ) : null}
    </ContextoToast.Provider>
  );
}

export const sombraSuave: ViewStyle = Platform.select({
  web: { boxShadow: '0 4px 14px rgba(27,38,32,0.06)' } as ViewStyle,
  default: {
    shadowColor: '#1B2620',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

const estilos = StyleSheet.create({
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  pista: { width: 40, height: 24, borderRadius: 12, padding: 3 },
  perilla: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    }),
  } as ViewStyle,
  marcador: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Paleta.texto,
  },
  boton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Paleta.verdeOscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundario: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: Paleta.texto,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
