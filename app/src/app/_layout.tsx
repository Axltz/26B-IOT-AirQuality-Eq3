import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorToast } from '../componentes/comunes';
import { ProveedorAdmin } from '../estado/admin';
import { ContextoMonitor, Monitor } from '../estado/monitor';
import { Paleta } from '../tema';

export default function Raiz() {
  const [fuentesListas, errorFuentes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [monitor] = useState(() => new Monitor());

  useEffect(() => {
    void monitor.iniciar();
  }, [monitor]);

  if (!fuentesListas && !errorFuentes) return null;

  return (
    <SafeAreaProvider>
      <ProveedorAdmin>
        <ContextoMonitor.Provider value={monitor}>
          <ProveedorToast>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Paleta.fondo } }} />
          </ProveedorToast>
        </ContextoMonitor.Provider>
      </ProveedorAdmin>
    </SafeAreaProvider>
  );
}
