import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado, Pestanas } from '../componentes/Encabezado';
import { Resumen } from '../componentes/Resumen';
import { VistaNotificacion } from '../componentes/VistaNotificacion';
import { useMonitor } from '../estado/monitor';
import { Paleta } from '../tema';

export default function Inicio() {
  const m = useMonitor();
  const insets = useSafeAreaInsets();

  const abrirAjustes = () => {
    router.push('/ajustes');
  };

  const fondoDinamico = m.aire?.nivel?.colorSuave ?? Paleta.fondo;

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top, backgroundColor: fondoDinamico }]}>
      <View style={estilos.marco}>
        {!m.cargado ? (
          <ActivityIndicator style={{ flex: 1 }} color={Paleta.verde} />
        ) : (
          <>
            <View style={estilos.cabecera}>
              <Encabezado alAbrirAjustes={abrirAjustes} />
              {m.mostrarPestanas ? <Pestanas /> : null}
            </View>
            {m.vista === 'resumen' ? <Resumen alAbrirAjustes={abrirAjustes} /> : <VistaNotificacion />}
          </>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  marco: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
  cabecera: { paddingHorizontal: 20, paddingTop: 10 },
});
