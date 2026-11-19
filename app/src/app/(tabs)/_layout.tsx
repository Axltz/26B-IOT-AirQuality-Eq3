import { Tabs, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { BarraNavegacion } from '../../componentes/BarraNavegacion';
import { useFondoDeNivel } from '../../componentes/FondoPantalla';
import { useMonitor } from '../../estado/monitor';
import { useTema } from '../../estado/tema';

/** Pestañas Inicio · Contaminantes · Alertas · Ajustes con la barra flotante. */
export default function LayoutPestanas() {
  const m = useMonitor();
  const tema = useTema();
  const ruta = usePathname();
  const fondoNivel = useFondoDeNivel();

  // El monitor pide abrir Alertas al tocar una notificación (o al simular una
  // alerta); aquí se atiende cada solicitud una sola vez.
  const atendidas = useRef(0);
  useEffect(() => {
    if (m.solicitudesAlertas > atendidas.current) {
      atendidas.current = m.solicitudesAlertas;
      router.navigate('/alertas');
    }
  }, [m.solicitudesAlertas]);

  // Barra de estado: texto claro en oscuro y sobre los degradados de Muy mala
  // y Extremadamente mala (texto blanco).
  const conFondoDeNivel = ruta === '/' || ruta === '/contaminantes';
  const barraClara = conFondoDeNivel ? fondoNivel.barraEstadoClara : tema.oscuro;

  return (
    <>
      <StatusBar style={barraClara ? 'light' : 'dark'} />
      <Tabs
        tabBar={(props) => <BarraNavegacion {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tema.fondoAzul } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="contaminantes" options={{ title: 'Contaminantes', lazy: false }} />
        <Tabs.Screen name="alertas" options={{ title: 'Alertas' }} />
        <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
      </Tabs>
    </>
  );
}
