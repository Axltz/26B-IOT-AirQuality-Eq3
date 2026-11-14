import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useMonitor } from '../estado/monitor';
import { T } from './comunes';

export const MapaNodo = () => {
  const m = useMonitor();
  const lectura = m.lectura;
  if (!lectura?.lat || !lectura?.lon) {
    return <T t={12}>Ubicación no disponible</T>;
  }
  const lat = parseFloat(lectura.lat);
  const lon = parseFloat(lectura.lon);
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}>
        <Marker coordinate={{ latitude: lat, longitude: lon }} title={m.dispositivo?.nombre || 'Nodo'} />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: Dimensions.get('window').height * 0.3, marginVertical: 12 },
  map: { ...StyleSheet.absoluteFillObject },
});
