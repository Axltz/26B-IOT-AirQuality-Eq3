import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdmin } from '../estado/admin';
import { useMonitor } from '../estado/monitor';
import { estadoMqtt, obtenerUltimaLecturaMqtt } from '../servicios/clienteMqtt';
import { Paleta } from '../tema';
import { BotonPrincipal, BotonSecundario, ChipIcono, Etiqueta, Icono, Pastilla, T, Tarjeta, useToast } from './comunes';

export function PanelAdminModal({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { esAdmin, adminActual, admins, iniciarSesion, cerrarSesion, crearAdmin, eliminarAdmin } = useAdmin();
  const m = useMonitor();

  // Login form
  const [correo, setCorreo] = useState('axelmtz9880@gmail.com');
  const [contrasena, setContrasena] = useState('admin123');
  const [cargandoLogin, setCargandoLogin] = useState(false);

  // Nuevo admin form
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrandoCrearAdmin, setMostrandoCrearAdmin] = useState(false);

  // Nuevo nodo form
  const [mostrandoCrearNodo, setMostrandoCrearNodo] = useState(false);
  const [nombreNodo, setNombreNodo] = useState('');
  const [topicoNodo, setTopicoNodo] = useState('colectivo/aire/nodo2');

  const manejarLogin = async () => {
    setCargandoLogin(true);
    const res = await iniciarSesion(correo, contrasena);
    setCargandoLogin(false);
    if (res.ok) {
      toast('Sesión de administrador iniciada');
    } else {
      toast(res.error ?? 'Error al iniciar sesión');
    }
  };

  const manejarCrearAdmin = async () => {
    const res = await crearAdmin(nuevoCorreo, nuevoNombre);
    if (res.ok) {
      toast('Nuevo administrador agregado');
      setNuevoCorreo('');
      setNuevoNombre('');
      setMostrandoCrearAdmin(false);
    } else {
      toast(res.error ?? 'Error');
    }
  };

  const manejarCrearNodo = async () => {
    if (!nombreNodo.trim()) {
      toast('Ingresa un nombre para el nodo');
      return;
    }
    const id = `nodo-${Date.now()}`;
    await m.guardarDispositivo({
      id,
      nombre: nombreNodo.trim(),
      direccion: 'broker.hivemq.com',
      demo: false,
    });
    toast(`Nodo ${nombreNodo.trim()} registrado exitosamente`);
    setNombreNodo('');
    setMostrandoCrearNodo(false);
  };

  const ultimaMqtt = obtenerUltimaLecturaMqtt();
  const estMqtt = estadoMqtt();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={alCerrar}>
      <View style={[estilos.contenedor, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={estilos.encabezado}>
          <Pressable onPress={alCerrar} style={estilos.botonCerrar} accessibilityRole="button">
            <Icono nombre="arrow-left" tam={22} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Etiqueta>SISTEMA IoT COMUNITARIO</Etiqueta>
            <T t={18} f="extra">
              Panel de Administración
            </T>
          </View>
          {esAdmin ? (
            <Pressable
              onPress={async () => {
                await cerrarSesion();
                toast('Sesión cerrada');
              }}
              style={estilos.botonLogout}
            >
              <Icono nombre="logout" tam={18} color={Paleta.rojo} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={estilos.scroll}>
          {!esAdmin ? (
            /* Vista de Login de Administrador */
            <Tarjeta radio={16} style={{ marginTop: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ChipIcono nombre="shield-lock-outline" color={Paleta.verde} fondo={Paleta.verdeSuave} tam={50} tamIcono={26} />
                <T t={16} f="extra" style={{ marginTop: 10 }}>
                  Acceso Restringido
                </T>
                <T t={11} c={Paleta.textoSuave} style={{ textAlign: 'center', marginTop: 4 }}>
                  Exclusivo para administradores y líderes del colectivo ambiental.
                </T>
              </View>

              <T t={11} f="negrita" c={Paleta.textoSuave} style={{ marginBottom: 4 }}>
                Correo de Administrador
              </T>
              <TextInput
                value={correo}
                onChangeText={setCorreo}
                placeholder="ejemplo@correo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={estilos.input}
              />

              <T t={11} f="negrita" c={Paleta.textoSuave} style={{ marginTop: 12, marginBottom: 4 }}>
                Contraseña
              </T>
              <TextInput
                value={contrasena}
                onChangeText={setContrasena}
                placeholder="Contraseña"
                secureTextEntry
                style={estilos.input}
              />

              <View style={{ marginTop: 18 }}>
                <BotonPrincipal
                  texto={cargandoLogin ? 'Verificando…' : 'Iniciar Sesión'}
                  alPresionar={manejarLogin}
                  deshabilitado={cargandoLogin}
                />
              </View>
            </Tarjeta>
          ) : (
            /* Panel Completo con Diagnóstico de Capas y Gestión */
            <>
              {/* Identidad del Admin Activo */}
              <Tarjeta radio={16} fondo={Paleta.verdeSuave} borde={Paleta.verdeBorde} style={{ marginTop: 12 }}>
                <View style={estilos.fila}>
                  <ChipIcono nombre="shield-check" color={Paleta.verde} fondo="#FFFFFF" tam={36} tamIcono={20} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <T t={13} f="extra">
                      {adminActual?.nombre}
                    </T>
                    <T t={10.5} c={Paleta.textoSuave}>
                      {adminActual?.email}
                    </T>
                  </View>
                  <Pastilla texto="Admin Activo" color={Paleta.verde} fondo="#FFFFFF" />
                </View>
              </Tarjeta>

              {/* 1. Diagnóstico de Salud de las 3 Capas del IoT */}
              <View style={{ marginTop: 18 }}>
                <Etiqueta>DIAGNÓSTICO DEL SISTEMA (3 CAPAS)</Etiqueta>
              </View>

              {/* Capa 1: Percepción */}
              <Tarjeta radio={14} style={{ marginTop: 8 }}>
                <View style={estilos.fila}>
                  <ChipIcono nombre="chip" color={Paleta.azul} fondo={Paleta.azulSuave} tam={32} tamIcono={17} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <T t={12.5} f="extra">
                      1. Capa de Percepción (ESP32)
                    </T>
                    <T t={10} c={Paleta.textoSuave}>
                      PMS5003 (Láser PM2.5), MQ-7 (CO), DHT22 (T/H)
                    </T>
                  </View>
                  <Pastilla
                    texto={m.conexion === 'enLinea' ? 'Operando' : 'Sin Señal'}
                    color={m.conexion === 'enLinea' ? Paleta.verde : Paleta.rojo}
                    fondo={m.conexion === 'enLinea' ? Paleta.verdeSuave : Paleta.rojoSuave}
                  />
                </View>
                <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 8 }}>
                  Última muestra recibida: {m.ultimaActualizacion ? new Date(m.ultimaActualizacion).toLocaleTimeString() : 'Ninguna'}
                </T>
              </Tarjeta>

              {/* Capa 2: Red y Transporte */}
              <Tarjeta radio={14} style={{ marginTop: 8 }}>
                <View style={estilos.fila}>
                  <ChipIcono nombre="router-wireless" color={Paleta.amarillo} fondo="#FBF3DC" tam={32} tamIcono={17} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <T t={12.5} f="extra">
                      2. Capa de Transporte (MQTT)
                    </T>
                    <T t={10} c={Paleta.textoSuave}>
                      HiveMQ Broker · WSS Port 8884
                    </T>
                  </View>
                  <Pastilla
                    texto={estMqtt === 'conectado' ? 'Conectado' : 'Reconectando'}
                    color={estMqtt === 'conectado' ? Paleta.verde : Paleta.amarillo}
                    fondo={estMqtt === 'conectado' ? Paleta.verdeSuave : '#FBF3DC'}
                  />
                </View>
                <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 8 }}>
                  Tópico activo: colectivo/aire/nodo1
                </T>
              </Tarjeta>

              {/* Capa 3: Aplicación */}
              <Tarjeta radio={14} style={{ marginTop: 8 }}>
                <View style={estilos.fila}>
                  <ChipIcono nombre="cellphone" color={Paleta.verde} fondo={Paleta.verdeSuave} tam={32} tamIcono={17} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <T t={12.5} f="extra">
                      3. Capa de Aplicación
                    </T>
                    <T t={10} c={Paleta.textoSuave}>
                      Motor NOM-172 & Notificaciones Escolares
                    </T>
                  </View>
                  <Pastilla texto="Activa" color={Paleta.verde} fondo={Paleta.verdeSuave} />
                </View>
              </Tarjeta>

              {/* 2. Administración de Nodos (Estaciones) */}
              <View style={[estilos.fila, { marginTop: 22, justifyContent: 'space-between' }]}>
                <Etiqueta>GESTIÓN DE ESTACIONES / NODOS</Etiqueta>
                <Pressable onPress={() => setMostrandoCrearNodo(!mostrandoCrearNodo)} accessibilityRole="button">
                  <T t={11} f="extra" c={Paleta.verde}>
                    {mostrandoCrearNodo ? 'Cancelar' : '+ Agregar Nodo'}
                  </T>
                </Pressable>
              </View>

              {mostrandoCrearNodo ? (
                <Tarjeta radio={14} style={{ marginTop: 8 }}>
                  <T t={12} f="extra">
                    Registrar Nueva Estación de Monitoreo
                  </T>
                  <T t={10.5} c={Paleta.textoSuave} style={{ marginBottom: 8 }}>
                    Solo los administradores pueden añadir estaciones a la red comunitaria.
                  </T>
                  <TextInput
                    value={nombreNodo}
                    onChangeText={setNombreNodo}
                    placeholder="Ej. Estación Primaria #12"
                    style={estilos.input}
                  />
                  <View style={{ marginTop: 10 }}>
                    <BotonPrincipal texto="Guardar Nodo" alPresionar={manejarCrearNodo} />
                  </View>
                </Tarjeta>
              ) : null}

              <Tarjeta radio={14} style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
                {m.ajustes.dispositivos.map((d, i) => (
                  <View key={d.id} style={[estilos.fila, { padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderColor: Paleta.borde }]}>
                    <ChipIcono nombre="chip" color={Paleta.verde} fondo={Paleta.verdeSuave} tam={32} tamIcono={16} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <T t={12.5} f="extra">
                        {d.nombre}
                      </T>
                      <T t={10} c={Paleta.textoSuave}>
                        {d.id === m.ajustes.activoId ? 'Transmitiendo en vivo' : 'En espera'}
                      </T>
                    </View>
                    {m.ajustes.dispositivos.length > 1 ? (
                      <Pressable
                        onPress={() => {
                          void m.eliminarDispositivo(d.id);
                          toast(`Nodo ${d.nombre} eliminado`);
                        }}
                        style={{ padding: 6 }}
                        accessibilityRole="button"
                      >
                        <Icono nombre="trash-can-outline" tam={18} color={Paleta.rojo} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Tarjeta>

              {/* 3. Gestión de Otros Administradores */}
              <View style={[estilos.fila, { marginTop: 22, justifyContent: 'space-between' }]}>
                <Etiqueta>ADMINISTRADORES CON ACCESO</Etiqueta>
                <Pressable onPress={() => setMostrandoCrearAdmin(!mostrandoCrearAdmin)} accessibilityRole="button">
                  <T t={11} f="extra" c={Paleta.verde}>
                    {mostrandoCrearAdmin ? 'Cancelar' : '+ Nuevo Admin'}
                  </T>
                </Pressable>
              </View>

              {mostrandoCrearAdmin ? (
                <Tarjeta radio={14} style={{ marginTop: 8 }}>
                  <T t={12} f="extra">
                    Dar de alta a otro Administrador / Director
                  </T>
                  <TextInput
                    value={nuevoNombre}
                    onChangeText={setNuevoNombre}
                    placeholder="Nombre completo o cargo (ej. Directora Primaria)"
                    style={[estilos.input, { marginTop: 6 }]}
                  />
                  <TextInput
                    value={nuevoCorreo}
                    onChangeText={setNuevoCorreo}
                    placeholder="correo@institucion.edu.mx"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[estilos.input, { marginTop: 6 }]}
                  />
                  <View style={{ marginTop: 10 }}>
                    <BotonPrincipal texto="Registrar Administrador" alPresionar={manejarCrearAdmin} />
                  </View>
                </Tarjeta>
              ) : null}

              <Tarjeta radio={14} style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
                {admins.map((adm, i) => (
                  <View key={adm.email} style={[estilos.fila, { padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderColor: Paleta.borde }]}>
                    <ChipIcono nombre="shield-account" color={Paleta.textoSuave} fondo={Paleta.relleno} tam={32} tamIcono={16} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <T t={12.5} f="extra">
                        {adm.nombre}
                      </T>
                      <T t={10} c={Paleta.textoSuave}>
                        {adm.email}
                      </T>
                    </View>
                    {adm.email !== 'axelmtz9880@gmail.com' ? (
                      <Pressable
                        onPress={() => {
                          void eliminarAdmin(adm.email);
                          toast('Administrador removido');
                        }}
                        style={{ padding: 6 }}
                        accessibilityRole="button"
                      >
                        <Icono nombre="trash-can-outline" tam={18} color={Paleta.rojo} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Tarjeta>

              <View style={{ height: 32 }} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: Paleta.fondo },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.superficie,
  },
  botonCerrar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: Paleta.relleno,
  },
  botonLogout: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Paleta.rojoSuave,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: Paleta.relleno,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Paleta.texto,
  },
});
