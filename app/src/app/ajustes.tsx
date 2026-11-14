import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BotonPrincipal,
  BotonSecundario,
  Etiqueta,
  Icono,
  Interruptor,
  Pastilla,
  T,
  Tarjeta,
  useToast,
} from '../componentes/comunes';
import { FilaDispositivo, FormularioDispositivo, Hoja } from '../componentes/Hojas';
import { useMonitor } from '../estado/monitor';
import { useAuth } from '../context/AuthContext';
import { nivel } from '../logica/calidadAire';
import type { Dispositivo } from '../modelos/ajustes';
import { estadoPush } from '../servicios/notificaciones';
import { Paleta } from '../tema';

export default function Ajustes() {
  const m = useMonitor();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const a = m.ajustes;
  const [editando, setEditando] = useState<Dispositivo | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [confirmar, setConfirmar] = useState<null | { titulo: string; texto: string; accion: () => Promise<void> }>(null);
  const [activandoPush, setActivandoPush] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const editar = (d: Dispositivo | null) => {
    setEditando(d);
    setFormulario(true);
  };

  const push = estadoPush();
  const activarPush = async () => {
    setActivandoPush(true);
    try {
      await m.activarPush();
      toast(`Listo: ${m.dispositivo.nombre} te avisará aunque la app esté cerrada.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setActivandoPush(false);
    }
  };

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[estilos.contenido, { paddingBottom: 32 + insets.bottom }]}>
        <View style={estilos.fila}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={estilos.atras}
          >
            <Icono nombre="arrow-left" tam={20} />
          </Pressable>
          <T t={20} f="extra">
            Ajustes
          </T>
        </View>

        <Seccion titulo="DISPOSITIVOS">
          <Tarjeta radio={16} style={{ padding: 0, overflow: 'hidden' }}>
            {a.dispositivos.map((d) => (
              <View key={d.id}>
                <FilaDispositivo
                  d={d}
                  activo={d.id === a.activoId}
                  alTocar={() => void m.cambiarDispositivo(d.id)}
                  acciones={
                    <View style={estilos.fila}>
                      {d.id === a.activoId ? (
                        <Pastilla texto="Activo" color={Paleta.verde} fondo={Paleta.verdeSuave} />
                      ) : null}
                      <BotonIcono icono="pencil-outline" etiqueta="Editar" alPresionar={() => editar(d)} />
                      {a.dispositivos.length > 1 ? (
                        <BotonIcono
                          icono="trash-can-outline"
                          etiqueta="Quitar"
                          alPresionar={() =>
                            setConfirmar({
                              titulo: `¿Quitar ${d.nombre}?`,
                              texto: 'Se quitará de la lista junto con su historial guardado en este teléfono.',
                              accion: () => m.eliminarDispositivo(d.id),
                            })
                          }
                        />
                      ) : null}
                    </View>
                  }
                />
                <View style={estilos.linea} />
              </View>
            ))}
            {/* Botón oculto de admin */}
            <Pressable onPress={() => setShowAdminLogin(true)} style={estilos.agregar} accessibilityRole="button">
              <Icono nombre="shield-account" tam={20} color={Paleta.verde} />
              <T t={13} f="extra" c={Paleta.verde}>Panel de admin</T>
            </Pressable>
            {/* Mostrar botón Agregar ESP32 solo si es admin */}
            {useAuth().isAdmin && (
              <Pressable onPress={() => editar(null)} style={estilos.agregar} accessibilityRole="button">
                <Icono nombre="plus" tam={20} color={Paleta.verde} />
                <T t={13} f="extra" c={Paleta.verde}>Agregar ESP32</T>
              </Pressable>
            )}
            <AdminLoginModal visible={showAdminLogin} onClose={() => setShowAdminLogin(false)} />
          </Tarjeta>
        </Seccion>

        <Seccion titulo="AVISOS CON LA APP CERRADA">
          <Tarjeta radio={16}>
            <T t={12.5} f="negrita">
              Notificaciones push desde el ESP32
            </T>
            <T t={10.5} c={Paleta.textoSuave} style={estilos.parrafo}>
              El ESP32 revisa el aire por su cuenta y te manda la notificación por internet, aunque la app esté
              cerrada o estés fuera de casa.
            </T>
            {m.dispositivo.demo ? (
              <Nota>Conecta un ESP32 para activarlas (el modo demostración no manda push).</Nota>
            ) : m.pushActivo ? (
              <>
                <View style={[estilos.fila, { marginTop: 12 }]}>
                  <Icono nombre="check-circle" tam={18} color={Paleta.verde} />
                  <T t={11.5} f="negrita" c={Paleta.verde} style={{ flex: 1 }}>
                    Activas en {m.dispositivo.nombre}
                  </T>
                </View>
                <View style={{ marginTop: 10 }}>
                  <BotonSecundario
                    texto="Desactivar en este ESP32"
                    icono="bell-off-outline"
                    alPresionar={() => void m.desactivarPush()}
                  />
                </View>
              </>
            ) : !push.disponible ? (
              <Nota>{push.motivo}</Nota>
            ) : (
              <View style={{ marginTop: 12 }}>
                <BotonPrincipal
                  texto={activandoPush ? 'Activando…' : `Activar en ${m.dispositivo.nombre}`}
                  alPresionar={activarPush}
                  deshabilitado={activandoPush}
                />
              </View>
            )}
          </Tarjeta>
        </Seccion>

        <Seccion titulo="ALERTAS">
          <Tarjeta radio={16}>
            <FilaInterruptor
              titulo="Alertas de calidad del aire"
              detalle="Notificar cuando el aire empeore."
              valor={a.alertasActivas}
              alCambiar={(v) => void m.fijarAlertasActivas(v)}
            />
            <View style={{ height: 14 }} />
            <FilaInterruptor
              titulo="Avisar cuando mejore"
              detalle="Otra notificación cuando el aire se recupere."
              valor={a.avisarMejora}
              alCambiar={(v) => void m.fijarAvisarMejora(v)}
            />
            <T t={12.5} f="negrita" style={{ marginTop: 16, marginBottom: 8 }}>
              Avisar a partir de
            </T>
            <Opciones
              valor={a.umbralNivel}
              opciones={[
                [1, 'Aceptable'],
                [2, 'Mala'],
                [3, 'Muy mala'],
              ]}
              alElegir={(v) => void m.fijarUmbral(v)}
            />
            <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 8 }}>
              Se avisa cuando la calidad del aire es {nivel(a.umbralNivel).adjetivo} o peor
              ({nivel(a.umbralNivel).riesgo.toLowerCase()}, NOM-172).

            </T>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="TRANSMISIÓN">
          <Tarjeta radio={16}>
            <View style={estilos.fila}>
              <Icono nombre="broadcast" tam={20} color={Paleta.verde} />
              <View style={{ flex: 1 }}>
                <T t={12.5} f="negrita">
                  Telemetría MQTT en Tiempo Real
                </T>
                <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
                  Recepción continua por WebSockets activos (sin retraso de sondeo).
                </T>
              </View>
            </View>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="DATOS">
          <Tarjeta radio={16} style={{ padding: 0 }}>
            <Pressable
              style={estilos.agregar}
              accessibilityRole="button"
              onPress={() =>
                setConfirmar({
                  titulo: '¿Borrar historial?',
                  texto: `Se borrarán las lecturas guardadas de ${m.dispositivo.nombre} en este teléfono. No se puede deshacer.`,
                  accion: m.borrarHistorial,
                })
              }
            >
              <Icono nombre="broom" tam={20} color={Paleta.rojo} />
              <View>
                <T t={13} f="negrita">
                  Borrar historial de {m.dispositivo.nombre}
                </T>
                <T t={10.5} c={Paleta.textoSuave}>
                  {m.historial.length} muestras guardadas
                </T>
              </View>
            </Pressable>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="CONECTAR TU ESP32">
          <GuiaEsp32 />
        </Seccion>

        <T t={10} c={Paleta.textoTenue} style={{ textAlign: 'center', marginTop: 20 }}>
          Mi Entorno 1.0
        </T>
      </ScrollView>

      <FormularioDispositivo visible={formulario} existente={editando} alCerrar={() => setFormulario(false)} />

      <Hoja visible={!!confirmar} alCerrar={() => setConfirmar(null)}>
        <T t={17} f="extra">
          {confirmar?.titulo}
        </T>
        <T t={12} c={Paleta.textoSuave} style={{ marginTop: 6, lineHeight: 18 }}>
          {confirmar?.texto}
        </T>
        <View style={[estilos.fila, { marginTop: 18 }]}>
          <View style={{ flex: 1 }}>
            <BotonSecundario texto="Cancelar" alPresionar={() => setConfirmar(null)} />
          </View>
          <View style={{ flex: 1 }}>
            <BotonSecundario
              texto="Confirmar"
              color={Paleta.rojo}
              alPresionar={async () => {
                const accion = confirmar?.accion;
                setConfirmar(null);
                if (accion) await accion();
              }}
            />
          </View>
        </View>
      </Hoja>
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View>
      <View style={{ paddingHorizontal: 4, paddingTop: 22, paddingBottom: 8 }}>
        <Etiqueta>{titulo}</Etiqueta>
      </View>
      {children}
    </View>
  );
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <View style={estilos.nota}>
      <Icono nombre="information-outline" tam={16} color={Paleta.textoSuave} />
      <T t={10.5} c={Paleta.textoSuave} style={{ flex: 1, lineHeight: 15 }}>
        {children}
      </T>
    </View>
  );
}

function BotonIcono({ icono, etiqueta, alPresionar }: { icono: 'pencil-outline' | 'trash-can-outline'; etiqueta: string; alPresionar: () => void }) {
  return (
    <Pressable onPress={alPresionar} accessibilityRole="button" accessibilityLabel={etiqueta} hitSlop={6} style={{ padding: 6 }}>
      <Icono nombre={icono} tam={19} color={Paleta.textoSuave} />
    </Pressable>
  );
}

function FilaInterruptor({
  titulo,
  detalle,
  valor,
  alCambiar,
}: {
  titulo: string;
  detalle: string;
  valor: boolean;
  alCambiar: (v: boolean) => void;
}) {
  return (
    <View style={estilos.fila}>
      <View style={{ flex: 1 }}>
        <T t={12.5} f="negrita">
          {titulo}
        </T>
        <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
          {detalle}
        </T>
      </View>
      <Interruptor valor={valor} alCambiar={alCambiar} etiqueta={titulo} />
    </View>
  );
}

function Opciones({
  valor,
  opciones,
  alElegir,
}: {
  valor: number;
  opciones: [number, string][];
  alElegir: (v: number) => void;
}) {
  return (
    <View style={[estilos.fila, { gap: 6 }]}>
      {opciones.map(([v, texto]) => {
        const activa = v === valor;
        return (
          <Pressable
            key={v}
            onPress={() => alElegir(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            style={[estilos.opcion, { backgroundColor: activa ? Paleta.verdeOscuro : Paleta.relleno }]}
          >
            <T t={11.5} f="negrita" c={activa ? '#FFFFFF' : Paleta.textoSuave}>
              {texto}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const EJEMPLO_MQTT = `{
  "pm25": 12.0,
  "co": 0.35,
  "temp": 24.5,
  "hum": 52.0,
  "estado": "BUENA"
}`;

function GuiaEsp32() {
  const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
  return (
    <Tarjeta radio={16}>
      <T t={11} c={Paleta.textoSuave} style={{ lineHeight: 17 }}>
        1. El ESP32 se conecta a Wi-Fi mediante WiFiManager.{'\n'}
        2. Transmite en tiempo real al Broker MQTT público (broker.hivemq.com:1883).{'\n'}
        3. Esta App se suscribe al tópico mediante WebSockets (puerto 8884).
      </T>
      <T t={11} f="negrita" style={{ marginTop: 12, marginBottom: 6 }}>
        Tópico MQTT de Telemetría:
      </T>
      <View style={estilos.codigo}>
        <T selectable t={11} style={{ fontFamily: mono }}>
          colectivo/aire/nodo1
        </T>
      </View>
      <T t={11} c={Paleta.textoSuave} style={{ marginTop: 8, marginBottom: 6, lineHeight: 17 }}>
        Payload JSON recibido en vivo:
      </T>
      <View style={estilos.codigo}>
        <T selectable t={11} style={{ fontFamily: mono, lineHeight: 16 }}>
          {EJEMPLO_MQTT}
        </T>
      </View>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  contenido: { paddingHorizontal: 20, paddingTop: 10, width: '100%', maxWidth: 460, alignSelf: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atras: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  linea: { height: 1, backgroundColor: Paleta.borde },
  agregar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  parrafo: { marginTop: 4, lineHeight: 15 },
  nota: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Paleta.relleno,
  },
  opcion: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  codigo: { backgroundColor: Paleta.relleno, borderRadius: 10, padding: 10 },
});
