import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Modal, Text } from 'react-native';
import { T, BotonPrincipal, Tarjeta, Pastilla, Icono, useToast } from '../componentes/comunes';
import { useMonitor } from '../estado/monitor';
import { useAuth } from '../context/AuthContext';
import { AdminLoginModal } from '../componentes/AdminLoginModal';
import { AddAdminModal } from '../componentes/AddAdminModal';

export const AdminScreen = () => {
  const monitor = useMonitor();
  const { isAdmin, adminList, logout } = useAuth();
  const toast = useToast();
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  if (!isAdmin) {
    // Show login prompt
    return (
      <View style={styles.center}>
        <T t={14}>Acceso restringido</T>
        <BotonPrincipal texto="Entrar como admin" alPresionar={() => setShowLogin(true)} />
        <AdminLoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
      </View>
    );
  }

  const nodos = monitor.dispositivos || [];

  const eliminarNodo = async (id: string) => {
    try {
      await monitor.eliminarDispositivo(id);
      toast('Nodo eliminado');
    } catch (e) {
      toast('Error al eliminar nodo');
    }
  };

  return (
    <View style={styles.container}>
      <T t={18} f="extra">Panel de administración</T>
      <Tarjeta radio={12} style={styles.section}>
        <T t={14}>Nodos registrados</T>
        <FlatList
          data={nodos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.nodoRow}>
              <Pastilla texto={item.nombre} />
              <Pressable onPress={() => eliminarNodo(item.id)} style={styles.eliminarBtn} accessibilityRole="button">
                <Icono nombre="trash-can-outline" tam={20} color="red" />
              </Pressable>
            </View>
          )}
        />
      </Tarjeta>

      <Tarjeta radio={12} style={styles.section}>
        <T t={14}>Administradores</T>
        {adminList.map(a => (
          <View key={a.email} style={styles.adminRow}>
            <Text>{a.email}</Text>
          </View>
        ))}
        <BotonPrincipal texto="Añadir admin" alPresionar={() => setShowAddAdmin(true)} />
        <AddAdminModal visible={showAddAdmin} onClose={() => setShowAddAdmin(false)} />
        <BotonPrincipal texto="Cerrar sesión" alPresionar={logout} estilo="secundario" />
      </Tarjeta>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginVertical: 12, padding: 12 },
  nodoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  eliminarBtn: { padding: 4 },
  adminRow: { paddingVertical: 4 },
});
