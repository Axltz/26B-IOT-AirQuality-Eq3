import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMonitor } from '../estado/monitor';
import { evaluarAire } from '../logica/calidadAire';
import { descripcion, direccionValida, type Dispositivo } from '../modelos/ajustes';
import type { Lectura } from '../modelos/lectura';
import { describirError } from '../servicios/clienteEsp32';
import { Fuente, Paleta, alfa } from '../tema';
import { BotonPrincipal, BotonSecundario, ChipIcono, Etiqueta, Icono, Interruptor, T, Tarjeta } from './comunes';

/** Hoja que sube desde abajo. */
export function Hoja({ visible, alCerrar, children }: { visible: boolean; alCerrar: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCerrar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.fondoHoja}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alCerrar} accessibilityLabel="Cerrar" />
        <View style={[estilos.hoja, { paddingBottom: 16 + insets.bottom }]}>
          <View style={estilos.asa} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FilaDispositivo({
  d,
  activo,
  alTocar,
  acciones,
}: {
  d: Dispositivo;
  activo: boolean;
  alTocar?: () => void;
  acciones?: ReactNode;
}) {
  return (
    <Pressable onPress={alTocar} style={({ pressed }) => [estilos.filaDispositivo, pressed && { backgroundColor: Paleta.relleno }]}>
      <ChipIcono
        nombre={d.demo ? 'flask-outline' : 'chip'}
        color={activo ? Paleta.verde : Paleta.textoSuave}
        fondo={activo ? Paleta.verdeSuave : Paleta.relleno}
        tam={34}
        tamIcono={18}
        radio={10}
      />
      <View style={{ flex: 1 }}>
        <T t={13.5} f="extra">
          {d.nombre}
        </T>
        <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 1 }}>
          {descripcion(d)}
          {d.tokenPush ? '  ·  push activo' : ''}
        </T>
      </View>
      {acciones ?? (activo ? <Icono nombre="check-circle" tam={20} color={Paleta.verde} /> : null)}
    </Pressable>
  );
}

/** Se abre al tocar "Casa ▾": cambiar de dispositivo, agregar uno o ir a Ajustes. */
export function SelectorDispositivo({
  visible,
  alCerrar,
  alAgregar,
  alAbrirAjustes,
}: {
  visible: boolean;
  alCerrar: () => void;
  alAgregar: () => void;
  alAbrirAjustes: () => void;
}) {
  const m = useMonitor();
  return (
    <Hoja visible={visible} alCerrar={alCerrar}>
      <Etiqueta>MI ENTORNO</Etiqueta>
      <T t={18} f="extra" style={{ marginTop: 3, marginBottom: 14 }}>
        Mis dispositivos
      </T>
      <Tarjeta radio={16} style={{ padding: 0, overflow: 'hidden' }}>
        {m.ajustes.dispositivos.map((d, i) => (
          <View key={d.id}>
            {i > 0 ? <View style={estilos.linea} /> : null}
            <FilaDispositivo
              d={d}
              activo={d.id === m.ajustes.activoId}
              alTocar={() => {
                alCerrar();
                void m.cambiarDispositivo(d.id);
              }}
            />
          </View>
        ))}
      </Tarjeta>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <BotonSecundario texto="Agregar ESP32" icono="plus" alPresionar={alAgregar} />
        </View>
        <View style={{ flex: 1 }}>
          <BotonSecundario texto="Ajustes" icono="tune-variant" alPresionar={alAbrirAjustes} />
        </View>
      </View>
    </Hoja>
  );
}

/** Agregar o editar un ESP32. */
export function FormularioDispositivo({
  visible,
  existente,
  alCerrar,
}: {
  visible: boolean;
  existente: Dispositivo | null;
  alCerrar: () => void;
}) {
  const m = useMonitor();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [demo, setDemo] = useState(false);
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<Lectura | null>(null);
  const [errorPrueba, setErrorPrueba] = useState<string | null>(null);
  const [errores, setErrores] = useState<{ nombre?: string; direccion?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setNombre(existente?.nombre ?? '');
    setDireccion(existente?.direccion ?? '');
    setDemo(existente?.demo ?? false);
    setPrueba(null);
    setErrorPrueba(null);
    setErrores({});
  }, [visible, existente]);

  const errorDireccion = () =>
    !direccion.trim()
      ? 'Escribe la IP del ESP32, por ejemplo 192.168.1.50'
      : direccionValida(direccion)
        ? undefined
        : 'Dirección no válida';

  const probar = async () => {
    const e = errorDireccion();
    setErrores((x) => ({ ...x, direccion: e }));
    setPrueba(null);
    setErrorPrueba(null);
    if (e) return;
    setProbando(true);
    try {
      setPrueba(await m.probarConexion(direccion));
    } catch (err) {
      setErrorPrueba(describirError(err));
    } finally {
      setProbando(false);
    }
  };

  const guardar = async () => {
    const eNombre = nombre.trim() ? undefined : 'Ponle un nombre, por ejemplo Casa';
    const eDireccion = demo ? undefined : errorDireccion();
    setErrores({ nombre: eNombre, direccion: eDireccion });
    if (eNombre || eDireccion) return;
    const cambioDireccion = existente && existente.direccion.trim() !== direccion.trim();
    const d: Dispositivo = {
      id: existente?.id ?? `esp32-${Date.now()}`,
      nombre: nombre.trim(),
      direccion: demo ? '' : direccion.trim(),
      demo,
      // Si cambia la dirección, el token registrado ya no aplica.
      tokenPush: demo || cambioDireccion ? undefined : existente?.tokenPush,
    };
    alCerrar();
    await m.guardarDispositivo(d);
  };

  const partes = prueba
    ? [
        prueba.temperatura !== undefined && `${prueba.temperatura.toFixed(1)} °C`,
        prueba.humedad !== undefined && `${Math.round(prueba.humedad)} % HR`,
        prueba.pm25 !== undefined && `PM2.5 ${prueba.pm25.toFixed(1)}`,
        prueba.co !== undefined && `CO ${prueba.co.toFixed(1)} ppm`,
        prueba.co2 !== undefined && `CO2 ${Math.round(prueba.co2)} ppm`,
        evaluarAire(prueba) && `Aire ${evaluarAire(prueba)!.nivel.nombre.toLowerCase()}`,
      ].filter(Boolean)
    : [];

  return (
    <Hoja visible={visible} alCerrar={alCerrar}>
      <T t={18} f="extra" style={{ marginBottom: 16 }}>
        {existente ? 'Editar dispositivo' : 'Agregar ESP32'}
      </T>
      <Campo etiqueta="Nombre" valor={nombre} alCambiar={setNombre} pista="Casa, Recámara, Oficina…" error={errores.nombre} />
      <View style={[estilos.filaInterruptor, { marginTop: 14 }]}>
        <View style={{ flex: 1 }}>
          <T t={12.5} f="negrita">
            Usar datos de demostración
          </T>
          <T t={10.5} c={Paleta.textoSuave}>
            Para probar la app sin ESP32.
          </T>
        </View>
        <Interruptor
          valor={demo}
          etiqueta="Usar datos de demostración"
          alCambiar={(v) => {
            setDemo(v);
            setPrueba(null);
            setErrorPrueba(null);
          }}
        />
      </View>
      {!demo ? (
        <>
          <View style={{ marginTop: 14 }}>
            <Campo
              etiqueta="Dirección IP o URL del ESP32"
              valor={direccion}
              alCambiar={setDireccion}
              pista="192.168.1.50"
              error={errores.direccion}
              url
            />
          </View>
          <View style={{ marginTop: 10 }}>
            <BotonSecundario
              texto={probando ? 'Probando…' : 'Probar conexión'}
              icono="access-point"
              alPresionar={probar}
              deshabilitado={probando}
            />
          </View>
          {probando ? <ActivityIndicator style={{ marginTop: 10 }} color={Paleta.verde} /> : null}
          {prueba ? (
            <Tarjeta radio={12} fondo={Paleta.verdeSuave} borde={Paleta.verdeBorde} style={estilos.resultado}>
              <Icono nombre="check-circle" tam={20} color={Paleta.verde} />
              <View style={{ flex: 1 }}>
                <T t={12} f="extra" c={Paleta.verde}>
                  Conectado
                </T>
                <T t={10.5} c={Paleta.textoSuave}>
                  {partes.join('  ·  ')}
                </T>
              </View>
            </Tarjeta>
          ) : null}
          {errorPrueba ? (
            <Tarjeta radio={12} fondo={Paleta.rojoSuave} borde={alfa(Paleta.rojo, 0.2)} style={{ marginTop: 10, padding: 12 }}>
              <T t={11} c={Paleta.rojo} style={{ lineHeight: 16 }}>
                {errorPrueba}
              </T>
            </Tarjeta>
          ) : null}
        </>
      ) : null}
      <View style={{ marginTop: 18 }}>
        <BotonPrincipal texto="Guardar" alPresionar={guardar} />
      </View>
    </Hoja>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  pista,
  error,
  url,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  pista: string;
  error?: string;
  url?: boolean;
}) {
  const [foco, setFoco] = useState(false);
  return (
    <View>
      <T t={11.5} f="negrita" style={{ marginBottom: 6 }}>
        {etiqueta}
      </T>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        placeholder={pista}
        placeholderTextColor={Paleta.textoTenue}
        autoCapitalize={url ? 'none' : 'sentences'}
        autoCorrect={false}
        keyboardType={url ? 'url' : 'default'}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        accessibilityLabel={etiqueta}
        style={[
          estilos.campo,
          { borderColor: error ? Paleta.rojo : foco ? Paleta.verde : Paleta.borde },
        ]}
      />
      {error ? (
        <T t={10.5} c={Paleta.rojo} style={{ marginTop: 4 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fondoHoja: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,38,32,0.32)' },
  hoja: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    maxHeight: '90%',
    backgroundColor: Paleta.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  asa: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#C9CDC7', alignSelf: 'center', marginBottom: 14 },
  linea: { height: 1, backgroundColor: Paleta.borde },
  filaDispositivo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 },
  filaInterruptor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12 },
  campo: {
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: Fuente.media,
    color: Paleta.texto,
  },
});
