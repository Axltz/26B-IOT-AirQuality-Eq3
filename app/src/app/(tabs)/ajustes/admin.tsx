import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  BotonIcono,
  BotonPrincipal,
  BotonSecundario,
  ChipIcono,
  Cifra,
  Etiqueta,
  Icono,
  Pastilla,
  PastillaNivel,
  PastillaSistema,
  Separador,
  T,
  Tarjeta,
  useToast,
  type NombreIcono,
} from '../../../componentes/comunes';
import { nivelGeneral } from '../../../componentes/datosAire';
import { CabeceraVista } from '../../../componentes/Encabezado';
import { Pantalla } from '../../../componentes/Pantalla';
import { useAdmin } from '../../../estado/admin';
import { useMonitor } from '../../../estado/monitor';
import { sombra, useEstilos, useTema } from '../../../estado/tema';
import { nivel } from '../../../logica/calidadAire';
import type { Dispositivo } from '../../../modelos/ajustes';
import { estadoMqtt, obtenerUltimaLecturaMqtt } from '../../../servicios/clienteMqtt';
import { Fuente, fondoPastel, type PaletaTema } from '../../../tema';

const BROKER_DEFECTO = 'broker.hivemq.com';
const PREFIJO_TOPICO = 'colectivo/aire/';

/**
 * Administración (antes PanelAdminModal): sesión de administrador,
 * diagnóstico de las 3 capas, estaciones y administradores. Se abre desde
 * Ajustes; fondo azul pastel fijo. La lógica de sesión, nodos y diagnóstico
 * es la misma del panel anterior.
 */
export default function Administracion() {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const fondo = fondoPastel(tema, 'azul');
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

  const ip = () => e.input;
  const nivelActivo = nivelGeneral(m);

  return (
    <Pantalla fondo={fondo}>
      <CabeceraVista
        eyebrow="Sistema IoT comunitario"
        titulo="Administración"
        tinta={fondo.tinta}
        alVolver={() => (router.canGoBack() ? router.back() : router.navigate('/ajustes'))}
        derecha={
          esAdmin ? (
            <BotonIcono
              icono="logout"
              etiqueta="Cerrar sesión"
              peligro
              alPresionar={async () => {
                await cerrarSesion();
                toast('Sesión cerrada');
              }}
            />
          ) : null
        }
      />

      {!esAdmin ? (
        /* Inicio de sesión de administrador */
        <Tarjeta style={{ gap: 4 }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <ChipIcono nombre="shield-lock-outline" color={tema.accionTexto} fondo={tema.accionSuave} tam={50} tamIcono={26} radio={25} />
            <T t={16} f="extra" style={{ marginTop: 10 }}>
              Acceso restringido
            </T>
            <T t={11.5} c={tema.textoSuave} style={{ textAlign: 'center', marginTop: 4 }}>
              Exclusivo para administradores y líderes del colectivo ambiental.
            </T>
          </View>

          <Rotulo>Correo de administrador</Rotulo>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            placeholder="ejemplo@correo.com"
            placeholderTextColor={tema.textoSuave}
            autoCapitalize="none"
            keyboardType="email-address"
            style={ip()}
          />
          <Rotulo arriba={10}>Contraseña</Rotulo>
          <TextInput
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Contraseña"
            placeholderTextColor={tema.textoSuave}
            secureTextEntry
            style={ip()}
          />
          <BotonPrincipal
            texto={cargandoLogin ? 'Verificando…' : 'Iniciar sesión'}
            alPresionar={manejarLogin}
            deshabilitado={cargandoLogin}
            style={{ marginTop: 14 }}
          />
        </Tarjeta>
      ) : (
        /* Panel completo: diagnóstico de capas y gestión */
        <>
          {/* Identidad del administrador activo */}
          <Tarjeta
            fondo={tema.accionSuave}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: tema.opcionActivaBorde }}
          >
            <ChipIcono nombre="shield-check" color={tema.accionTexto} fondo={tema.superficie} />
            <View style={{ flex: 1 }}>
              <T t={13} f="negrita">
                {adminActual?.nombre}
              </T>
              <T t={11} c={tema.textoSuave}>
                {adminActual?.email}
              </T>
            </View>
            <Pastilla texto="Sesión activa" color={tema.accionTexto} fondo={tema.superficie} />
          </Tarjeta>

          {/* Resumen rápido de la red */}
          <Etiqueta c={fondo.tintaSuave} style={e.seccion}>
            Resumen de la red
          </Etiqueta>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Estadistica icono="access-point-network" valor={String(m.ajustes.dispositivos.length)} etiqueta="Estaciones" />
            <Estadistica icono="shield-account" valor={String(admins.length)} etiqueta="Admins" />
            <Estadistica icono="clock-outline" valor={ultimaMuestra} etiqueta="Última muestra" pequeno />
          </View>

          {/* 1. Diagnóstico de las 3 capas del IoT */}
          <Etiqueta c={fondo.tintaSuave} style={e.seccion}>
            Diagnóstico del sistema (3 capas)
          </Etiqueta>
          <Tarjeta style={{ gap: 14 }}>
            <Capa
              icono="chip"
              titulo="1. Percepción · ESP32"
              detalle="PMS5003 (láser PM2.5) · MQ-7 (CO) · DHT22 (T/H)"
              estado={m.conexion === 'enLinea' ? 'Operando' : 'Sin señal'}
              ok={m.conexion === 'enLinea'}
              notas={[
                `Última muestra recibida: ${m.ultimaActualizacion ? new Date(m.ultimaActualizacion).toLocaleTimeString() : 'Ninguna'}`,
              ]}
            />
            <Separador />
            <Capa
              icono="router-wireless"
              titulo="2. Transporte · MQTT"
              detalle={`${m.dispositivo.direccion || BROKER_DEFECTO} · WebSockets`}
              estado={estMqtt === 'conectado' ? 'Conectado' : 'Reconectando'}
              ok={estMqtt === 'conectado'}
              notas={[
                `Tópico activo: ${m.dispositivo.topicoMqtt ?? `${PREFIJO_TOPICO}nodo1`}`,
                ...(ultimaMqtt ? [`Último paquete: ${new Date(ultimaMqtt.fecha).toLocaleTimeString()}`] : []),
              ]}
            />
            <Separador />
            <Capa icono="cellphone" titulo="3. Aplicación" detalle="Motor NOM-172 y notificaciones escolares" estado="Activa" ok />
          </Tarjeta>

          {/* 2. Administración de nodos (estaciones) */}
          <View style={[e.filaSeccion, e.seccion]}>
            <Etiqueta c={fondo.tintaSuave}>Gestión de estaciones / nodos</Etiqueta>
            <Pressable onPress={abrirNuevoNodo} accessibilityRole="button" hitSlop={6}>
              <T t={12} f="negrita" c={fondo.tinta}>
                {mostrandoFormularioNodo && !nodoEditandoId ? 'Cancelar' : '+ Agregar nodo'}
              </T>
            </Pressable>
          </View>

          {mostrandoFormularioNodo ? (
            <Tarjeta style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ChipIcono
                  nombre={nodoEditandoId ? 'pencil-outline' : 'plus-circle-outline'}
                  color={tema.accionTexto}
                  fondo={tema.accionSuave}
                  tam={30}
                  tamIcono={16}
                />
                <View style={{ flex: 1 }}>
                  <T t={12.5} f="negrita">
                    {nodoEditandoId ? 'Editar estación de monitoreo' : 'Registrar nueva estación'}
                  </T>
                  <T t={10.5} c={tema.textoSuave}>
                    Solo administradores pueden modificar la red.
                  </T>
                </View>
                {nodoEditandoId ? (
                  <Pressable onPress={limpiarFormularioNodo} accessibilityRole="button">
                    <T t={11} f="negrita" c={tema.peligro}>
                      Cancelar
                    </T>
                  </Pressable>
                ) : null}
              </View>

              <Rotulo arriba={10}>Nombre de la estación *</Rotulo>
              <TextInput value={nombreNodo} onChangeText={setNombreNodo} placeholder="Ej. Estación X" placeholderTextColor={tema.textoSuave} style={ip()} />

              <Rotulo arriba={10}>Tópico MQTT *</Rotulo>
              <TextInput
                value={topicoNodo}
                onChangeText={setTopicoNodo}
                placeholder={`${PREFIJO_TOPICO}nodo2`}
                placeholderTextColor={tema.textoSuave}
                autoCapitalize="none"
                autoCorrect={false}
                style={ip()}
              />
              <Ayuda>Debe coincidir con NODO_ID en el firmware del ESP32.</Ayuda>

              <Rotulo arriba={10}>Zona / referencia (opcional)</Rotulo>
              <TextInput value={zonaNodo} onChangeText={setZonaNodo} placeholder="Ej. Zona Norte · Módulo B" placeholderTextColor={tema.textoSuave} style={ip()} />

              <Rotulo arriba={10}>Broker MQTT (host o URL WSS)</Rotulo>
              <TextInput
                value={brokerNodo}
                onChangeText={setBrokerNodo}
                placeholder={BROKER_DEFECTO}
                placeholderTextColor={tema.textoSuave}
                autoCapitalize="none"
                autoCorrect={false}
                style={ip()}
              />
              <Ayuda>Por defecto {BROKER_DEFECTO}. También acepta wss://mi-broker.com/mqtt.</Ayuda>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Rotulo>Latitud (opcional)</Rotulo>
                  <TextInput value={latNodo} onChangeText={setLatNodo} placeholder="20.6575" placeholderTextColor={tema.textoSuave} keyboardType="numeric" style={ip()} />
                </View>
                <View style={{ flex: 1 }}>
                  <Rotulo>Longitud (opcional)</Rotulo>
                  <TextInput value={lngNodo} onChangeText={setLngNodo} placeholder="-103.3255" placeholderTextColor={tema.textoSuave} keyboardType="numeric" style={ip()} />
                </View>
              </View>
              <Ayuda>Coordenadas necesarias para el modo "Estación más cercana" por GPS.</Ayuda>

              <BotonPrincipal
                texto={guardandoNodo ? 'Guardando…' : nodoEditandoId ? 'Guardar cambios' : 'Guardar nodo'}
                alPresionar={manejarGuardarNodo}
                deshabilitado={guardandoNodo}
                style={{ marginTop: 12 }}
              />
            </Tarjeta>
          ) : null}

          {m.ajustes.dispositivos.map((d) => {
            const activo = d.id === m.ajustes.activoId;
            return (
              <Tarjeta key={d.id} style={activo ? { borderWidth: 1, borderColor: tema.opcionActivaBorde } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <ChipIcono
                    nombre={activo ? 'access-point' : 'access-point-network'}
                    color={activo ? tema.sistemaTexto : tema.textoSuave}
                    fondo={activo ? tema.sistemaSuave : tema.superficie2}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <T t={13} f="negrita" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {d.nombre}
                      </T>
                      {activo ? <PastillaSistema texto="En vivo" apagada={m.conexion !== 'enLinea'} /> : null}
                    </View>
                    <T t={11} c={tema.textoSuave}>
                      {d.zona ?? 'Sin zona asignada'}
                    </T>
                  </View>
                  {activo && nivelActivo !== null ? <PastillaNivel indice={nivelActivo} texto={nivel(nivelActivo).corto} /> : null}
                </View>
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icono nombre="broadcast" tam={13} color={tema.textoSuave} />
                    <Cifra t={10.5} f="media" c={tema.textoSuave} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {d.topicoMqtt}
                    </Cifra>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icono nombre="server-network" tam={13} color={tema.textoSuave} />
                    <Cifra t={10.5} f="media" c={tema.textoSuave} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {d.direccion}
                      {d.lat !== undefined && d.lng !== undefined ? ` · ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}` : ' · Sin coordenadas'}
                    </Cifra>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <BotonSecundario
                    enTarjeta
                    compacto
                    style={{ flex: 1 }}
                    texto={activo ? 'En uso' : 'Activar'}
                    icono={activo ? 'check-circle-outline' : 'play-circle-outline'}
                    color={activo ? tema.accionTexto : tema.texto}
                    alPresionar={() => void manejarActivarNodo(d)}
                    deshabilitado={activo}
                  />
                  <BotonSecundario
                    enTarjeta
                    compacto
                    style={{ flex: 1 }}
                    texto="Editar"
                    icono="pencil-outline"
                    alPresionar={() => abrirEdicionNodo(d)}
                  />
                  <BotonSecundario
                    enTarjeta
                    compacto
                    style={{ flex: 1 }}
                    texto="Eliminar"
                    icono="trash-can-outline"
                    color={m.ajustes.dispositivos.length > 1 ? tema.peligro : tema.textoSuave}
                    alPresionar={() => void manejarEliminarNodo(d)}
                    deshabilitado={m.ajustes.dispositivos.length <= 1}
                  />
                </View>
              </Tarjeta>
            );
          })}

          {/* 3. Gestión de otros administradores */}
          <View style={[e.filaSeccion, e.seccion]}>
            <Etiqueta c={fondo.tintaSuave}>Administradores con acceso</Etiqueta>
            <Pressable onPress={() => setMostrandoCrearAdmin(!mostrandoCrearAdmin)} accessibilityRole="button" hitSlop={6}>
              <T t={12} f="negrita" c={fondo.tinta}>
                {mostrandoCrearAdmin ? 'Cancelar' : '+ Nuevo admin'}
              </T>
            </Pressable>
          </View>

          {mostrandoCrearAdmin ? (
            <Tarjeta style={{ gap: 6 }}>
              <T t={12.5} f="negrita">
                Dar de alta a otro administrador / director
              </T>
              <TextInput
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholder="Nombre completo o cargo (ej. Directora Primaria)"
                placeholderTextColor={tema.textoSuave}
                style={ip()}
              />
              <TextInput
                value={nuevoCorreo}
                onChangeText={setNuevoCorreo}
                placeholder="correo@institucion.edu.mx"
                placeholderTextColor={tema.textoSuave}
                autoCapitalize="none"
                keyboardType="email-address"
                style={ip()}
              />
              <BotonPrincipal texto="Registrar administrador" alPresionar={manejarCrearAdmin} style={{ marginTop: 4 }} />
            </Tarjeta>
          ) : null}

          <Tarjeta style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {admins.map((adm, i) => (
              <View
                key={adm.email}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderColor: tema.borde }}
              >
                <ChipIcono nombre="shield-account" color={tema.textoSuave} fondo={tema.superficie2} tam={32} tamIcono={16} />
                <View style={{ flex: 1 }}>
                  <T t={12.5} f="negrita">
                    {adm.nombre}
                  </T>
                  <T t={11} c={tema.textoSuave}>
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
                    accessibilityLabel={`Quitar a ${adm.nombre}`}
                  >
                    <Icono nombre="trash-can-outline" tam={18} color={tema.peligro} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Tarjeta>
        </>
      )}
    </Pantalla>
  );
}

function Rotulo({ children, arriba = 0 }: { children: ReactNode; arriba?: number }) {
  const tema = useTema();
  return (
    <T t={11} f="negrita" c={tema.textoSuave} style={{ marginTop: arriba, marginBottom: 4 }}>
      {children}
    </T>
  );
}

function Ayuda({ children }: { children: ReactNode }) {
  const tema = useTema();
  return (
    <T t={10} c={tema.textoSuave} style={{ marginTop: 3 }}>
      {children}
    </T>
  );
}

function Estadistica({ icono, valor, etiqueta, pequeno }: { icono: NombreIcono; valor: string; etiqueta: string; pequeno?: boolean }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <View style={e.estadistica}>
      <Icono nombre={icono} tam={18} />
      <Cifra t={pequeno ? 14 : 18} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {valor}
      </Cifra>
      <T t={10.5} c={tema.textoSuave}>
        {etiqueta}
      </T>
    </View>
  );
}

function Capa({
  icono,
  titulo,
  detalle,
  estado,
  ok,
  notas = [],
}: {
  icono: NombreIcono;
  titulo: string;
  detalle: string;
  estado: string;
  ok: boolean;
  notas?: string[];
}) {
  const tema = useTema();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <ChipIcono nombre={icono} color={tema.sistemaTexto} fondo={tema.sistemaSuave} />
        <View style={{ flex: 1 }}>
          <T t={12.5} f="negrita">
            {titulo}
          </T>
          <T t={10.5} c={tema.textoSuave} style={{ marginTop: 2 }}>
            {detalle}
          </T>
        </View>
        {ok ? (
          <PastillaSistema texto={estado} />
        ) : (
          <Pastilla texto={estado} color={tema.peligro} fondo={tema.peligroSuave} punto={tema.peligro} />
        )}
      </View>
      {notas.map((n) => (
        <T key={n} t={10.5} c={tema.textoSuave} style={{ marginLeft: 44 }}>
          {n}
        </T>
      ))}
    </View>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    seccion: { marginTop: 8, paddingHorizontal: 4 },
    filaSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    estadistica: {
      flex: 1,
      minWidth: 0,
      backgroundColor: p.superficie,
      borderRadius: 20,
      paddingVertical: 11,
      paddingHorizontal: 10,
      gap: 6,
      ...sombra(p.sombraTarjeta),
    },
    input: {
      backgroundColor: p.superficie2,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontFamily: Fuente.media,
      color: p.texto,
    },
  });
