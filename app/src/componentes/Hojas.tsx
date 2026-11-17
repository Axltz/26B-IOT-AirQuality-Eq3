import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Paleta } from '../tema';

/**
 * Hoja que sube desde abajo.
 *
 * Nota: la selección manual de estación se retiró a propósito. La app enlaza
 * siempre de forma automática (estación más cercana por GPS o modo centinela),
 * y el alta/edición de nodos vive únicamente en el Panel de Administración.
 */
export function Hoja({ visible, alCerrar, children }: { visible: boolean; alCerrar: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCerrar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.fondoHoja}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel="Cerrar" />
        <View style={[estilos.hoja, { paddingBottom: 16 + insets.bottom }]}>
          <View style={estilos.asa} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondoHoja: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,38,32,0.32)' },
  hoja: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    maxHeight: '90%',
    backgroundColor: Paleta.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  asa: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#C9CDC7', alignSelf: 'center', marginBottom: 14 },
});
