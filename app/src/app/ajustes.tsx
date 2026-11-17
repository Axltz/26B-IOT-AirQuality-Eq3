import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Etiqueta,
  Icono,
  Interruptor,
  T,
  Tarjeta,
} from '../componentes/comunes';
import { PanelAdminModal } from '../componentes/PanelAdminModal';
import { useAdmin } from '../estado/admin';
import { useMonitor } from '../estado/monitor';
import { GRUPOS_VULNERABLES } from '../logica/gruposVulnerables';
import { nivel } from '../logica/calidadAire';
import { Paleta } from '../tema';

export default function Ajustes() {
  const m = useMonitor();
  const { esAdmin, adminActual } = useAdmin();
  const insets = useSafeAreaInsets();
  const a = m.ajustes;
  const [panelAdminVisible, setPanelAdminVisible] = useState(false);

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

        {/* ═══ MODO DE ENLACE INTELIGENTE (100% AUTOMÁTICO) ═══ */}
        <Seccion titulo="ENLACE AUTOMÁTICO DE ESTACIÓN">
          <Tarjeta radio={16}>
            <View style={{ gap: 8 }}>
              {/* Modo 1: Más cercana — GPS automático */}
              <OpcionModoConexion
                icono="crosshairs-gps"
                titulo="Estación más cercana"
                detalle="Enlaza automáticamente al nodo más próximo a tu ubicación real."
                activa={a.modoConexion === 'cercana'}
                alSeleccionar={() => void m.fijarModoConexion('cercana')}
              />

              {/* Modo 2: Peor calidad */}
              <OpcionModoConexion
                icono="alert-decagram-outline"
                titulo="Mayor riesgo ambiental"
                detalle="Modo Centinela: se vincula al nodo con peor calidad de aire para prevenirte."
                activa={a.modoConexion === 'peor'}
                alSeleccionar={() => void m.fijarModoConexion('peor')}
              />
              <T t={10} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
                «Más cercana» requiere ubicación y coordenadas en los nodos. «Mayor riesgo» sondea
                todos los nodos y tarda unos segundos.
              </T>
            </View>
          </Tarjeta>
        </Seccion>

        {/* ═══ ALERTAS Y NOTIFICACIONES INTELIGENTES ═══ */}
        <Seccion titulo="NOTIFICACIONES Y ALERTAS DE RIESGO">
          <Tarjeta radio={16}>
            {/* — Si empeora — */}
            <FilaInterruptor
              titulo="Notificar si el aire empeora"
              detalle="Aviso inmediato cuando la calidad cruza el umbral de riesgo configurado."
              valor={a.alertasActivas}
              alCambiar={(v) => void m.fijarAlertasActivas(v)}
            />
            <View style={{ height: 14 }} />

            {/* — Si mejora — */}
            <FilaInterruptor
              titulo="Avisar cuando mejore"
              detalle="Notificación de alivio cuando los contaminantes desciendan a niveles seguros."
              valor={a.avisarMejora}
              alCambiar={(v) => void m.fijarAvisarMejora(v)}
            />

            <T t={12.5} f="negrita" style={{ marginTop: 16, marginBottom: 8 }}>
              Avisar a partir de nivel
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
            <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 6, marginBottom: 14 }}>
              Se notificará únicamente si el aire alcanza el nivel {nivel(a.umbralNivel).adjetivo} o peor ({nivel(a.umbralNivel).riesgo.toLowerCase()}, NOM-172).
            </T>

            <View style={{ height: 1, backgroundColor: Paleta.borde, marginVertical: 6 }} />

            {/* — Resumen diario a hora libre — */}
            <FilaInterruptor
              titulo="Resumen diario programado"
              detalle="Reporte condensado (promedio del día) a la hora que tú elijas."
              valor={a.reporteProgramado ?? false}
              alCambiar={(v) => void m.fijarReporteProgramado(v)}
            />

            {a.reporteProgramado ? (
              <View style={{ marginTop: 12 }}>
                <T t={11.5} f="negrita" style={{ marginBottom: 6 }}>
                  Hora del reporte diario
                </T>
                <PickerHora
                  valor={a.horaReporte ?? '08:00'}
                  alCambiar={(h) => void m.fijarHoraReporte(h)}
                />
              </View>
            ) : null}

            <View style={{ height: 1, backgroundColor: Paleta.borde, marginVertical: 14 }} />

            {/* — Alerta periódica — */}
            <FilaInterruptor
              titulo="Lectura periódica"
              detalle="Envía los datos actuales del nodo cada cierta cantidad de horas."
              valor={a.alertaPeriodica ?? false}
              alCambiar={(v) => void m.fijarAlertaPeriodica(v)}
            />

            {a.alertaPeriodica ? (
              <View style={{ marginTop: 12 }}>
                <T t={11.5} f="negrita" style={{ marginBottom: 8 }}>
                  Enviar cada cuántas horas
                </T>
                <Opciones
                  valor={a.intervaloAlertaHoras ?? 3}
                  opciones={[
                    [1, '1 h'],
                    [2, '2 h'],
                    [3, '3 h'],
                    [6, '6 h'],
                    [12, '12 h'],
                  ]}
                  alElegir={(v) => void m.fijarIntervaloAlertaHoras(v)}
                />
              </View>
            ) : null}
          </Tarjeta>
        </Seccion>

        {/* ═══ GRUPO VULNERABLE (OPCIONAL) ═══ */}
        <Seccion titulo="POBLACIÓN SENSIBLE (NOM-172)">
          <Tarjeta radio={16}>
            <FilaInterruptor
              titulo="Pertenezco a un grupo vulnerable"
              detalle="Habilita umbrales más estrictos según la NOM-172-SEMARNAT-2023."
              valor={a.usarGrupoVulnerable ?? false}
              alCambiar={(v) => void m.fijarUsarGrupoVulnerable(v)}
            />
            {a.usarGrupoVulnerable ? (
              <>
                <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 10, marginBottom: 10 }}>
                  Selecciona tu grupo para aplicar los umbrales especiales:
                </T>
                {GRUPOS_VULNERABLES.map((g) => {
                  const seleccionado = a.grupoVulnerable === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => void m.fijarGrupoVulnerable(g.id)}
                      style={[
                        estilos.tarjetaGrupo,
                        seleccionado && { borderColor: Paleta.verde, backgroundColor: Paleta.verdeSuave },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: seleccionado }}
                    >
                      <View style={estilos.fila}>
                        <Icono
                          nombre={g.icono as any}
                          tam={22}
                          color={seleccionado ? Paleta.verde : Paleta.textoSuave}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <T t={12} f="extra" c={seleccionado ? Paleta.verdeOscuro : Paleta.texto}>
                            {g.nombre}
                          </T>
                          <T t={10} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
                            {g.descripcion}
                          </T>
                        </View>
                        {seleccionado ? (
                          <Icono nombre="check-circle" tam={18} color={Paleta.verde} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </Tarjeta>
        </Seccion>

        {/* ═══ ADMINISTRACIÓN DEL SISTEMA ═══ */}
        <Seccion titulo="ADMINISTRACIÓN DEL SISTEMA">
          <Tarjeta radio={16} style={{ padding: 0 }}>
            <Pressable
              style={estilos.agregar}
              accessibilityRole="button"
              onPress={() => setPanelAdminVisible(true)}
            >
              <Icono
                nombre={esAdmin ? 'shield-check' : 'shield-account'}
                tam={22}
                color={Paleta.verde}
              />
              <View style={{ flex: 1 }}>
                <T t={13} f="extra">
                  {esAdmin ? 'Panel de Administradores' : 'Acceso de Administrador'}
                </T>
                <T t={10.5} c={Paleta.textoSuave}>
                  {esAdmin
                    ? `Sesión activa (${adminActual?.nombre ?? 'Admin'}) · Estaciones, tópicos MQTT y diagnóstico.`
                    : 'Inicia sesión para registrar estaciones y configurar el sistema.'}
                </T>
              </View>
              <Icono nombre="chevron-right" tam={20} color={Paleta.textoTenue} />
            </Pressable>
          </Tarjeta>
        </Seccion>

        <T t={10} c={Paleta.textoTenue} style={{ textAlign: 'center', marginTop: 20 }}>
          AURA-172 v1.0 · Alerta Urbana de Riesgo Ambiental
        </T>
      </ScrollView>

      <PanelAdminModal
        visible={panelAdminVisible}
        alCerrar={() => setPanelAdminVisible(false)}
      />
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

/**
 * Selector de hora libre: muestra todos los slots de media hora (00:00 → 23:30)
 * en un scroll horizontal. El usuario elige la que quiera, sin opciones predefinidas.
 */
function PickerHora({ valor, alCambiar }: { valor: string; alCambiar: (h: string) => void }) {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  const fmt = (s: string) => {
    const [hh, mm] = s.split(':');
    const h = parseInt(hh, 10);
    const sufijo = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mm} ${sufijo}`;
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingRight: 4 }}
      style={{ marginHorizontal: -4 }}
    >
      {slots.map((s) => {
        const activo = s === valor;
        return (
          <Pressable
            key={s}
            onPress={() => alCambiar(s)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            style={[
              estilos.opcionHora,
              { backgroundColor: activo ? Paleta.verdeOscuro : Paleta.relleno },
            ]}
          >
            <T t={11} f="negrita" c={activo ? '#FFFFFF' : Paleta.textoSuave}>
              {fmt(s)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Opciones<T extends string | number>({
  valor,
  opciones,
  alElegir,
}: {
  valor: T;
  opciones: [T, string][];
  alElegir: (v: T) => void;
}) {
  return (
    <View style={[estilos.fila, { gap: 6 }]}>
      {opciones.map(([v, texto]) => {
        const activa = v === valor;
        return (
          <Pressable
            key={String(v)}
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

function OpcionModoConexion({
  icono,
  titulo,
  detalle,
  activa,
  alSeleccionar,
}: {
  icono: any;
  titulo: string;
  detalle: string;
  activa: boolean;
  alSeleccionar: () => void;
}) {
  return (
    <Pressable
      onPress={alSeleccionar}
      accessibilityRole="radio"
      accessibilityState={{ selected: activa }}
      style={[
        estilos.tarjetaOpcionModo,
        activa && { borderColor: Paleta.verde, backgroundColor: Paleta.verdeSuave },
      ]}
    >
      <View style={estilos.fila}>
        <Icono nombre={icono} tam={22} color={activa ? Paleta.verde : Paleta.textoSuave} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <T t={12.5} f="extra" c={activa ? Paleta.verdeOscuro : Paleta.texto}>
            {titulo}
          </T>
          <T t={10.5} c={Paleta.textoSuave} style={{ marginTop: 2 }}>
            {detalle}
          </T>
        </View>
        {activa ? <Icono nombre="check-circle" tam={18} color={Paleta.verde} /> : null}
      </View>
    </Pressable>
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
  opcion: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  opcionHora: { height: 36, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  codigo: { backgroundColor: Paleta.relleno, borderRadius: 10, padding: 10 },
  tarjetaGrupo: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.superficie,
    marginBottom: 8,
  },
  tarjetaOpcionModo: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.superficie,
  },
  filaEstacionLimpia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
