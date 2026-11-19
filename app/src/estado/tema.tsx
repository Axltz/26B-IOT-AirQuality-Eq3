import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type ViewStyle } from 'react-native';

import { Temas, type Apariencia, type PaletaTema, type Sombra } from '../tema';

const ContextoTema = createContext<PaletaTema>(Temas.claro);

/**
 * Elige la paleta según el ajuste `apariencia` ('claro' | 'oscuro' | 'sistema')
 * y el esquema del sistema (`useColorScheme`).
 */
export function ProveedorTema({ apariencia, children }: { apariencia: Apariencia; children: ReactNode }) {
  const sistema = useColorScheme();
  const nombre = apariencia === 'sistema' ? (sistema === 'dark' ? 'oscuro' : 'claro') : apariencia;
  return <ContextoTema.Provider value={Temas[nombre]}>{children}</ContextoTema.Provider>;
}

/** Paleta del tema activo. */
export function useTema(): PaletaTema {
  return useContext(ContextoTema);
}

const cache = new WeakMap<(p: PaletaTema) => unknown, Map<string, unknown>>();

/**
 * Estilos que dependen del tema: `crear(paleta)` (que devuelve
 * `StyleSheet.create({...})`) se ejecuta una vez por tema y se reutiliza:
 * `const estilos = useEstilos(crearEstilos)`.
 */
export function useEstilos<E>(crear: (p: PaletaTema) => E): E {
  const tema = useTema();
  return useMemo(() => {
    let porTema = cache.get(crear);
    if (!porTema) {
      porTema = new Map();
      cache.set(crear, porTema);
    }
    let e = porTema.get(tema.nombre);
    if (!e) {
      e = crear(tema);
      porTema.set(tema.nombre, e);
    }
    return e as E;
  }, [crear, tema]);
}

/** Convierte una sombra CSS del diseño en el estilo de cada plataforma. */
export function sombra(s: Sombra): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0 ${s.y}px ${s.blur}px ${s.spread}px ${s.color}` } as ViewStyle;
  }
  if (Platform.OS === 'android') return { elevation: s.elevation, shadowColor: '#000000' };
  // iOS no tiene «spread»: se compensa reduciendo el radio y el desplazamiento.
  const radio = Math.max(2, (s.blur + s.spread) / 2);
  const opacidad = Number(/,\s*([\d.]+)\)$/.exec(s.color)?.[1] ?? 0.4);
  return {
    shadowColor: '#000000',
    shadowOpacity: opacidad,
    shadowRadius: radio,
    shadowOffset: { width: 0, height: Math.max(1, s.y + s.spread / 2) },
  };
}

/** true si el sistema pide reducir el movimiento. */
export function useReducirMovimiento(): boolean {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (vivo) setReducir(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducir);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return reducir;
}
