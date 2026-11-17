import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdmin } from '../estado/admin';
import { useMonitor } from '../estado/monitor';
import type { Dispositivo } from '../modelos/ajustes';
import { estadoMqtt, obtenerUltimaLecturaMqtt } from '../servicios/clienteMqtt';
import { Paleta } from '../tema';
import { BotonPrincipal, BotonSecundario, ChipIcono, Etiqueta, Icono, Pastilla, T, Tarjeta, useToast } from './comunes';

const BROKER_DEFECTO = 'broker.hivemq.com';
const PREFIJO_TOPICO = 'colectivo/aire/';

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

  // Formulario de estación (crear / editar)
  const [mostrandoFormularioNodo, setMostrandoFormularioNodo] = useState(false);
  const [nodoEditandoId, setNodoEditandoId] = useState<string | null>(null);
  const [nombreNodo, setNombreNodo] = useState('');
  const [topicoNodo, setTopicoNodo] = useState(PREFIJO_TOPICO);
  const [zonaNodo, setZonaNodo] = useState('');
  const [latNodo, setLatNodo] = useState('');
  const [lngNodo, setLngNodo] = useState('');
  const [brokerNodo, setBrokerNodo] = useState(BROKER_DEFECTO);
  const [guardandoNodo, setGuardandoNodo] = useState(false);

  const limpiarFormularioNodo = () => {
    setNodoEditandoId(null);
    setNombreNodo('');
    setTopicoNodo(PREFIJO_TOPICO);
    setZonaNodo('');
    setLatNodo('');
    setLngNodo('');
    setBrokerNodo(BROKER_DEFECTO);
    setMostrandoFormularioNodo(false);
  };

  const abrirNuevoNodo = () => {
    if (mostrandoFormularioNodo && !nodoEditandoId) {
      limpiarFormularioNodo();
      return;
    }
    setNodoEditandoId(null);
    setNombreNodo('');
    setTopicoNodo(PREFIJO_TOPICO);
    setZonaNodo('');
    setLatNodo('');
    setLngNodo('');
    setBrokerNodo(BROKER_DEFECTO);
    setMostrandoFormularioNodo(true);
  };

  const abrirEdicionNodo = (d: Dispositivo) => {
    setNodoEditandoId(d.id);
    setNombreNodo(d.nombre);
    setTopicoNodo(d.topicoMqtt || `${PREFIJO_TOPICO}${d.id}`);
    setZonaNodo(d.zona ?? '');
    setLatNodo(d.lat !== undefined ? String(d.lat) : '');
    setLngNodo(d.lng !== undefined ? String(d.lng) : '');
    setBrokerNodo(d.direccion || BROKER_DEFECTO);
    setMostrandoFormularioNodo(true);
  };

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

  const manejarGuardarNodo = async () => {
    const nombre = nombreNodo.trim();
    const topico = topicoNodo.trim();
    const broker = brokerNodo.trim() || BROKER_DEFECTO;

    if (!nombre) {
      toast('Ingresa un nombre para la estación (ej. Estación X)');
      return;
    }
    if (!topico.startsWith(PREFIJO_TOPICO) || topico === PREFIJO_TOPICO) {
      toast('El tópico debe tener el formato colectivo/aire/nodoX');
      return;
    }
    const duplicado = m.ajustes.dispositivos.some(
      (d) => d.topicoMqtt === topico && d.id !== nodoEditandoId,
    );
    if (duplicado) {
      toast('Ya existe una estación con ese tópico MQTT');
      return;
    }

    const latNum = latNodo.trim() ? parseFloat(latNodo) : undefined;
    const lngNum = lngNodo.trim() ? parseFloat(lngNodo) : undefined;
    if (latNum !== undefined && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      toast('La latitud debe estar entre -90 y 90');
      return;
    }
    if (lngNum !== undefined && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      toast('La longitud debe estar entre -180 y 180');
      return;
    }

    setGuardandoNodo(true);
    try {
      const id = nodoEditandoId ?? (topico.split('/').pop() || `nodo-${Date.now()}`);
      const anterior = m.ajustes.dispositivos.find((d) => d.id === id);
      await m.guardarDispositivo({
        id,
        nombre,
        zona: zonaNodo.trim() || undefined,
        lat: latNum,
        lng: lngNum,
        direccion: broker,
        topicoMqtt: topico,
        demo: false,
        tokenPush: anterior?.tokenPush,
      });
      toast(nodoEditandoId ? `Estación "${nombre}" actualizada` : `Estación "${nombre}" registrada en ${topico}`);
      limpiarFormularioNodo();
    } finally {
      setGuardandoNodo(false);
    }
  };

  const manejarActivarNodo = async (d: Dispositivo) => {
    await m.cambiarDispositivo(d.id);
    toast(`Ahora la app recibe datos de "${d.nombre}"`);
  };

  const manejarEliminarNodo = async (d: Dispositivo) => {
    if (m.ajustes.dispositivos.length <= 1) {
      toast('Debe quedar al menos una estación registrada');
      return;
    }
    await m.eliminarDispositivo(d.id);
    if (nodoEditandoId === d.id) limpiarFormularioNodo();
    toast(`Estación "${d.nombre}" eliminada`);
  };

  const ultimaMqtt = obtenerUltimaLecturaMqtt();
  const estMqtt = estadoMqtt();
  const ultimaMuestra = m.ultimaActualizacion
    ? new Date(m.ultimaActualizacion).toLocaleTimeString()
    : 'Sin datos';

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

        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
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

              {/* Resumen rápido de la red */}
              <View style={[estilos.fila, { marginTop: 18 }]}>
                <Etiqueta>RESUMEN DE LA RED</Etiqueta>
              </View>
              <View style={estilos.filaEstadisticas}>
                <Tarjeta radio={12} style={estilos.estadistica}>
                  <ChipIcono nombre="access-point-network" color={Paleta.azul} fondo={Paleta.azulSuave} tam={28} tamIcono={15} />
                  <T t={20} f="extra" style={{ marginTop: 6 }}>
                    {m.ajustes.dispositivos.length}
                  </T>
                  <T t={9.5} c={Paleta.textoSuave}>
                    Estaciones
                  </T>
                </Tarjeta>
                <Tarjeta radio={12} style={estilos.estadistica}>
                  <ChipIcono nombre="shield-account" color={Paleta.verde} fondo={Paleta.verdeSuave} tam={28} tamIcono={15} />
                  <T t={20} f="extra" style={{ marginTop: 6 }}>
                    {admins.length}
                  </T>
                  <T t={9.5} c={Paleta.textoSuave}>
                    Admins
                  </T>
                </Tarjeta>
                <Tarjeta radio={12} style={estilos.estadistica}>
                  <ChipIcono nombre="clock-outline" color={Paleta.amarillo} fondo="#FBF3DC" tam={28} tamIcono={15} />
                  <T t={13} f="extra" style={{ marginTop: 10 }} numberOfLines={1}>
                    {ultimaMuestra}
                  </T>
                  <T t={9.5} c={Paleta.textoSuave}>
                    Última muestra
                  </T>
                </Tarjeta>
              </View>

              {/* 1. Diagnóstico de Salud de las 3 Capas del IoT */}
              <View style={{ marginTop: 22 }}>
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
                      {m.dispositivo.direccion || BROKER_DEFECTO} · WebSockets
                    </T>
                  </View>
                  <Pastilla
                    texto={estMqtt === 'conectado' ? 'Conectado' : 'Reconectando'}
                    color={estMqtt === 'conectado' ? Paleta.verde : Paleta.amarillo}
                    fondo={estMqtt === 'conectado' ? Paleta.verdeSuave : '#FBF3DC'}
                  />
                </View>
                <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 8 }}>
                  Tópico activo: {m.dispositivo.topicoMqtt ?? `${PREFIJO_TOPICO}nodo1`}
                </T>
                {ultimaMqtt ? (
                  <T t={9.5} c={Paleta.textoTenue} style={{ marginTop: 2 }}>
                    Último paquete: {new Date(ultimaMqtt.fecha).toLocaleTimeString()}
                  </T>
                ) : null}
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
                <Pressable onPress={abrirNuevoNodo} accessibilityRole="button" hitSlop={6}>
                  <T t={11} f="extra" c={Paleta.verde}>
                    {mostrandoFormularioNodo && !nodoEditandoId ? 'Cancelar' : '+ Agregar Nodo'}
                  </T>
                </Pressable>
              </View>

              {mostrandoFormularioNodo ? (
                <Tarjeta radio={14} style={{ marginTop: 8 }}>
                  <View style={estilos.fila}>
                    <ChipIcono
                      nombre={nodoEditandoId ? 'pencil-outline' : 'plus-circle-outline'}
                      color={Paleta.verde}
                      fondo={Paleta.verdeSuave}
                      tam={28}
                      tamIcono={15}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <T t={12.5} f="extra">
                        {nodoEditandoId ? 'Editar estación de monitoreo' : 'Registrar nueva estación'}
                      </T>
                      <T t={9.5} c={Paleta.textoSuave}>
                        Solo administradores pueden modificar la red.
                      </T>
                    </View>
                    {nodoEditandoId ? (
                      <Pressable onPress={limpiarFormularioNodo} accessibilityRole="button">
                        <T t={10.5} f="extra" c={Paleta.rojo}>
                          Cancelar
                        </T>
                      </Pressable>
                    ) : null}
                  </View>

                  <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginTop: 12, marginBottom: 4 }}>Nombre de la estación *</T>
                  <TextInput
                    value={nombreNodo}
                    onChangeText={setNombreNodo}
                    placeholder="Ej. Estación X"
                    style={estilos.input}
                  />

                  <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginTop: 10, marginBottom: 4 }}>Tópico MQTT *</T>
                  <TextInput
                    value={topicoNodo}
                    onChangeText={setTopicoNodo}
                    placeholder={`${PREFIJO_TOPICO}nodo2`}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={estilos.input}
                  />
                  <T t={9} c={Paleta.textoTenue} style={{ marginTop: 3 }}>
                    Debe coincidir con NODO_ID en el firmware del ESP32.
                  </T>

                  <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginTop: 10, marginBottom: 4 }}>Zona / Referencia (opcional)</T>
                  <TextInput
                    value={zonaNodo}
                    onChangeText={setZonaNodo}
                    placeholder="Ej. Zona Norte · Módulo B"
                    style={estilos.input}
                  />

                  <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginTop: 10, marginBottom: 4 }}>Broker MQTT (host o URL WSS)</T>
                  <TextInput
                    value={brokerNodo}
                    onChangeText={setBrokerNodo}
                    placeholder={BROKER_DEFECTO}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={estilos.input}
                  />
                  <T t={9} c={Paleta.textoTenue} style={{ marginTop: 3 }}>
                    Por defecto {BROKER_DEFECTO}. También acepta wss://mi-broker.com/mqtt.
                  </T>

                  <View style={[estilos.fila, { gap: 8, marginTop: 10, alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginBottom: 4 }}>Latitud (opcional)</T>
                      <TextInput
                        value={latNodo}
                        onChangeText={setLatNodo}
                        placeholder="20.6575"
                        keyboardType="numeric"
                        style={estilos.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T t={10.5} f="negrita" c={Paleta.textoSuave} style={{ marginBottom: 4 }}>Longitud (opcional)</T>
                      <TextInput
                        value={lngNodo}
                        onChangeText={setLngNodo}
                        placeholder="-103.3255"
                        keyboardType="numeric"
                        style={estilos.input}
                      />
                    </View>
                  </View>
                  <T t={9} c={Paleta.textoTenue} style={{ marginTop: 3 }}>
                    Coordenadas necesarias para el modo "Estación más cercana" por GPS.
                  </T>

                  <View style={{ marginTop: 14 }}>
                    <BotonPrincipal
                      texto={guardandoNodo ? 'Guardando…' : nodoEditandoId ? 'Guardar Cambios' : 'Guardar Nodo'}
                      alPresionar={manejarGuardarNodo}
                      deshabilitado={guardandoNodo}
                    />
                  </View>
                </Tarjeta>
              ) : null}

              {m.ajustes.dispositivos.map((d, i) => {
                const activo = d.id === m.ajustes.activoId;
                return (
                  <Tarjeta
                    key={d.id}
                    radio={14}
                    style={[estilos.tarjetaNodo, i === 0 ? { marginTop: 8 } : null, activo && { borderColor: Paleta.verdeBorde }]}
                  >
                    <View style={[estilos.fila, { alignItems: 'flex-start' }]}>
                      <ChipIcono
                        nombre={activo ? 'access-point' : 'access-point-network'}
                        color={activo ? Paleta.verde : Paleta.textoSuave}
                        fondo={activo ? Paleta.verdeSuave : Paleta.relleno}
                        tam={34}
                        tamIcono={17}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={[estilos.fila, { gap: 6 }]}>
                          <T t={12.5} f="extra" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {d.nombre}
                          </T>
                          {activo ? <Pastilla texto="En vivo" color={Paleta.verde} fondo={Paleta.verdeSuave} /> : null}
                        </View>
                        <T t={10} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
                          {d.zona ?? 'Sin zona asignada'}
                        </T>
                        <View style={[estilos.fila, { marginTop: 4, gap: 5 }]}>
                          <Icono nombre="broadcast" tam={13} color={Paleta.textoTenue} />
                          <T t={9.5} c={Paleta.textoSuave} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {d.topicoMqtt}
                          </T>
                        </View>
                        <View style={[estilos.fila, { marginTop: 2, gap: 5 }]}>
                          <Icono nombre="server-network" tam={13} color={Paleta.textoTenue} />
                          <T t={9.5} c={Paleta.textoTenue} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {d.direccion}
                            {d.lat !== undefined && d.lng !== undefined
                              ? ` · ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`
                              : ' · Sin coordenadas'}
                          </T>
                        </View>
                      </View>
                    </View>
                    <View style={estilos.accionesNodo}>
                      <View style={{ flex: 1 }}>
                        <BotonSecundario
                          texto={activo ? 'En uso' : 'Activar'}
                          icono={activo ? 'check-circle-outline' : 'play-circle-outline'}
                          color={activo ? Paleta.verde : Paleta.texto}
                          alPresionar={() => void manejarActivarNodo(d)}
                          deshabilitado={activo}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <BotonSecundario
                          texto="Editar"
                          icono="pencil-outline"
                          alPresionar={() => abrirEdicionNodo(d)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <BotonSecundario
                          texto="Eliminar"
                          icono="trash-can-outline"
                          color={m.ajustes.dispositivos.length > 1 ? Paleta.rojo : Paleta.textoTenue}
                          alPresionar={() => void manejarEliminarNodo(d)}
                          deshabilitado={m.ajustes.dispositivos.length <= 1}
                        />
                      </View>
                    </View>
                  </Tarjeta>
                );
              })}

              {/* 3. Gestión de Otros Administradores */}
              <View style={[estilos.fila, { marginTop: 22, justifyContent: 'space-between' }]}>
                <Etiqueta>ADMINISTRADORES CON ACCESO</Etiqueta>
                <Pressable onPress={() => setMostrandoCrearAdmin(!mostrandoCrearAdmin)} accessibilityRole="button" hitSlop={6}>
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
  filaEstadisticas: { flexDirection: 'row', gap: 8, marginTop: 8 },
  estadistica: { flex: 1, padding: 10, alignItems: 'flex-start' },
  tarjetaNodo: { padding: 14, marginTop: 8 },
  accionesNodo: { flexDirection: 'row', gap: 8, marginTop: 12 },
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
