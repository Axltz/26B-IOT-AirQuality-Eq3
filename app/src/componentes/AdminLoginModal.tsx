import React, { useState } from 'react';
import { Modal, View, TextInput, Pressable, StyleSheet } from 'react-native';
import { T, BotonPrincipal } from '../componentes/comunes';
import { useAuth } from '../context/AuthContext';

export const AdminLoginModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const ok = await login(email.trim(), password);
    if (ok) {
      onClose();
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <T t={14} f="extra" style={styles.title}>Acceso administrador</T>
          <TextInput placeholder="Email" autoCapitalize="none" style={styles.input} value={email} onChangeText={setEmail} />
          <TextInput placeholder="Contraseña" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
          {error && <T t={12} c="#D8000C">{error}</T>}
          <BotonPrincipal texto="Entrar" alPresionar={handleLogin} />
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <T t={12}>Cancelar</T>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#FFF', padding: 20, borderRadius: 8, width: '80%' },
  title: { textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 4, padding: 8, marginBottom: 12 },
  cancel: { marginTop: 12, alignSelf: 'center' },
});
