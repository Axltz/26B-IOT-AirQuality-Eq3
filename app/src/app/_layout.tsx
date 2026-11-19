import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorToast } from '../componentes/comunes';
import { ProveedorAdmin } from '../estado/admin';
import { ContextoMonitor, Monitor, useMonitor } from '../estado/monitor';
import { ProveedorTema, useTema } from '../estado/tema';

export default function Raiz() {
  const [fuentesListas, errorFuentes] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
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
          <TemaSegunAjustes>
            <ProveedorToast>
              <Navegacion />
            </ProveedorToast>
          </TemaSegunAjustes>
        </ContextoMonitor.Provider>
      </ProveedorAdmin>
    </SafeAreaProvider>
  );
}

/** Aplica el ajuste «Apariencia» (claro / oscuro / sistema). */
function TemaSegunAjustes({ children }: { children: ReactNode }) {
  const m = useMonitor();
  return <ProveedorTema apariencia={m.ajustes.apariencia}>{children}</ProveedorTema>;
}

function Navegacion() {
  const tema = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.fondoAzul } }} />;
}
