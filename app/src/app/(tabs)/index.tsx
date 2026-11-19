import { useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { Encabezado } from '../../componentes/Encabezado';
import { useFondoDeNivel } from '../../componentes/FondoPantalla';
import {
  AvisoSinConexion,
  FilaMetricas,
  MensajeInicio,
  PieEstado,
  RecomendacionDelDia,
  TarjetaAlertas,
  TarjetaIndice,
} from '../../componentes/Inicio';
import { Pantalla } from '../../componentes/Pantalla';
import { useMonitor } from '../../estado/monitor';

/** Inicio: nivel del aire protagonista, medidor de PM2.5 y métricas del nodo. */
export default function Inicio() {
  const m = useMonitor();
  const fondo = useFondoDeNivel();
  const [refrescando, setRefrescando] = useState(false);

  return (
    <Pantalla
      fondo={fondo}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          tintColor={fondo.tinta}
          colors={[fondo.tinta]}
          onRefresh={async () => {
            setRefrescando(true);
            await m.reintentar();
            setRefrescando(false);
          }}
        />
      }
    >
      <Encabezado tinta={fondo.tinta} />
      {!m.cargado ? (
        <ActivityIndicator style={{ marginTop: 80 }} color={fondo.tinta} />
      ) : (
        <>
          <View style={{ marginTop: 10, marginBottom: 10 }}>
            <MensajeInicio {...fondo} />
          </View>
          <TarjetaIndice />
          <FilaMetricas />
          <RecomendacionDelDia />
          {m.conexion === 'sinConexion' ? <AvisoSinConexion /> : null}
          <TarjetaAlertas />
          <PieEstado tintaSuave={fondo.tintaSuave} />
        </>
      )}
    </Pantalla>
  );
}
