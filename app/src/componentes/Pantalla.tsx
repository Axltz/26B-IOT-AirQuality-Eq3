import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Fondo } from '../tema';
import { useEspacioInferior } from './comunes';
import { FondoPantalla } from './FondoPantalla';

/**
 * Esqueleto de cada vista: el fondo fijo a pantalla completa y, encima, el
 * contenido desplazable con márgenes de 16 px, 12 px entre bloques y el
 * espacio inferior de la barra de navegación.
 */
export function Pantalla({
  fondo,
  children,
  refreshControl,
  separacion = 12,
}: {
  fondo: Fondo;
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  separacion?: number;
}) {
  const insets = useSafeAreaInsets();
  const abajo = useEspacioInferior();
  return (
    <View style={estilos.pantalla}>
      <FondoPantalla fondo={fondo} />
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={[estilos.contenido, { paddingTop: insets.top + 12, paddingBottom: abajo, gap: separacion }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  contenido: { paddingHorizontal: 16, width: '100%', maxWidth: 460, alignSelf: 'center' },
});
