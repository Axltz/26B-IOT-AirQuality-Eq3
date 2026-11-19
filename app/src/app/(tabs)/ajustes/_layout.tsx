import { Stack } from 'expo-router';

import { useTema } from '../../../estado/tema';

/** Ajustes y Administración comparten la pestaña Ajustes. */
export default function LayoutAjustes() {
  const tema = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.fondoVerde } }} />;
}
