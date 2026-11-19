import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { AnalisisAire, TarjetaCO, TarjetaGrafica, type SubMetricaParticulas } from '../../componentes/Contaminantes';
import { CabeceraVista } from '../../componentes/Encabezado';
import { useFondoDeNivel } from '../../componentes/FondoPantalla';
import { Pantalla } from '../../componentes/Pantalla';
import { useMonitor } from '../../estado/monitor';
import type { Metrica } from '../../logica/historial';
import type { Lectura } from '../../modelos/lectura';

const PARTICULAS: Metrica[] = ['pm25', 'pm10', 'pm1'];

/** Contaminantes: partículas (PMS5003), telemetría de 12 h y CO (MQ-7). */
export default function Contaminantes() {
  const m = useMonitor();
  const fondo = useFondoDeNivel();
  const [tab, setTab] = useState<SubMetricaParticulas>('pm25');
  const [historialSesion, setHistorialSesion] = useState<Lectura[]>([]);

  // Historial ligero de la sesión (máximo 600 muestras) para la vista «En vivo».
  // Esta pestaña se monta al iniciar (lazy: false) para no perder muestras.
  useEffect(() => {
    const l = m.lectura;
    if (!l) return;
    setHistorialSesion((prev) => (prev.length && prev[prev.length - 1].fecha === l.fecha ? prev : [...prev, l].slice(-600)));
  }, [m.lectura]);

  // La métrica de la gráfica la comparten Inicio (temperatura, humedad, CO) y
  // el selector de partículas.
  useEffect(() => {
    if (PARTICULAS.includes(m.metrica)) setTab(m.metrica as SubMetricaParticulas);
  }, [m.metrica]);
  const metrica: Metrica = m.metrica === 'aire' ? 'pm25' : m.metrica;

  return (
    <Pantalla fondo={fondo}>
      <CabeceraVista
        eyebrow="Sensor láser PMS5003"
        titulo="Partículas suspendidas"
        tinta={fondo.tinta}
        alVolver={() => router.navigate('/')}
      />
      <AnalisisAire
        tab={tab}
        alCambiarTab={(t) => {
          setTab(t);
          m.seleccionarMetrica(t);
        }}
      />
      <TarjetaGrafica metrica={metrica} historialSesion={historialSesion} />
      <TarjetaCO alVerGrafica={() => m.seleccionarMetrica('co')} />
    </Pantalla>
  );
}
