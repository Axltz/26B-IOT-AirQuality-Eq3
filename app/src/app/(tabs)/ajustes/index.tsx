import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Etiqueta,
  Icono,
  Interruptor,
  Segmentos,
  Separador,
  T,
  Tarjeta,
  type NombreIcono,
} from '../../../componentes/comunes';
import { CabeceraVista } from '../../../componentes/Encabezado';
import { Pantalla } from '../../../componentes/Pantalla';
import { useAdmin } from '../../../estado/admin';
import { useMonitor } from '../../../estado/monitor';
import { useEstilos, useTema } from '../../../estado/tema';
import { nivel } from '../../../logica/calidadAire';
import { GRUPOS_VULNERABLES, umbralEfectivo } from '../../../logica/gruposVulnerables';
import { fondoPastel, type PaletaTema } from '../../../tema';

/** Ajustes: fondo verde pastel fijo (sin degradado). */
export default function Ajustes() {
  const m = useMonitor();
  const tema = useTema();
  const { esAdmin, adminActual } = useAdmin();
  const fondo = fondoPastel(tema, 'verde');
  const a = m.ajustes;
  // Umbral real de notificación: si marca grupo vulnerable, manda su nivel mínimo.
  const umbralEf = umbralEfectivo(a.umbralNivel, a.usarGrupoVulnerable, a.grupoVulnerable);
  const grupoActivo = GRUPOS_VULNERABLES.find((g) => g.id === a.grupoVulnerable);

  return (
    <Pantalla fondo={fondo}>
      <CabeceraVista titulo="Ajustes" tinta={fondo.tinta} alVolver={() => router.navigate('/')} />

      {/* ═══ MODO DE ENLACE INTELIGENTE (100% AUTOMÁTICO) ═══ */}
      <Seccion tinta={fondo.tintaSuave} titulo="Enlace automático de estación">
        <Tarjeta style={{ gap: 8 }}>
          <Opcion
            icono="crosshairs-gps"
            titulo="Estación más cercana"
            detalle="Enlaza automáticamente al nodo más próximo a tu ubicación real."
            activa={a.modoConexion === 'cercana'}
            alSeleccionar={() => void m.fijarModoConexion('cercana')}
          />
          <Opcion
            icono="alert-decagram-outline"
            titulo="Mayor riesgo ambiental"
            detalle="Modo centinela: se vincula al nodo con peor calidad de aire para prevenirte."
            activa={a.modoConexion === 'peor'}
            alSeleccionar={() => void m.fijarModoConexion('peor')}
          />
          <T t={11} c={tema.textoSuave} style={{ marginTop: 2, lineHeight: 15 }}>
            «Más cercana» requiere ubicación y coordenadas en los nodos. «Mayor riesgo» sondea todos los nodos y tarda
            unos segundos.
          </T>
        </Tarjeta>
      </Seccion>

      {/* ═══ ALERTAS Y NOTIFICACIONES ═══ */}
      <Seccion tinta={fondo.tintaSuave} titulo="Notificaciones y alertas de riesgo">
        <Tarjeta style={{ gap: 12 }}>
          <FilaInterruptor
            titulo="Notificar si el aire empeora"
            detalle="Aviso inmediato cuando la calidad cruza el umbral de riesgo configurado."
            valor={a.alertasActivas}
            alCambiar={(v) => void m.fijarAlertasActivas(v)}
          />
          <FilaInterruptor
            titulo="Avisar cuando mejore"
            detalle="Notificación de alivio cuando los contaminantes desciendan a niveles seguros."
            valor={a.avisarMejora}
            alCambiar={(v) => void m.fijarAvisarMejora(v)}
          />
          <View style={{ gap: 8 }}>
            <T t={12.5} f="negrita">
              Avisar a partir de nivel
            </T>
            <Segmentos
              valor={a.umbralNivel}
              opciones={[
                [1, 'Aceptable'],
                [2, 'Mala'],
                [3, 'Muy mala'],
              ]}
              alElegir={(v) => void m.fijarUmbral(v)}
            />
            <T t={11} c={tema.textoSuave} style={{ lineHeight: 15 }}>
              Se notificará únicamente si el aire alcanza el nivel {nivel(umbralEf).adjetivo} o peor (
              {nivel(umbralEf).riesgo.toLowerCase()}, NOM-172)
              {umbralEf !== a.umbralNivel ? ' con tu grupo vulnerable aplicado.' : '.'}
            </T>
          </View>

          <Separador />

          <FilaInterruptor
            titulo="Resumen diario programado"
            detalle="Reporte condensado (promedio del día) a la hora que tú elijas."
            valor={a.reporteProgramado ?? false}
            alCambiar={(v) => void m.fijarReporteProgramado(v)}
          />
          {a.reporteProgramado ? (
            <View style={{ gap: 6 }}>
              <T t={11.5} f="negrita">
                Hora del reporte diario
              </T>
              <PickerHora valor={a.horaReporte ?? '08:00'} alCambiar={(h) => void m.fijarHoraReporte(h)} />
            </View>
          ) : null}

          <FilaInterruptor
            titulo="Lectura periódica"
            detalle="Envía los datos actuales del nodo cada cierta cantidad de horas."
            valor={a.alertaPeriodica ?? false}
            alCambiar={(v) => void m.fijarAlertaPeriodica(v)}
          />
          {a.alertaPeriodica ? (
            <View style={{ gap: 8 }}>
              <T t={11.5} f="negrita">
                Enviar cada cuántas horas
              </T>
              <Segmentos
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

      {/* ═══ APARIENCIA ═══ */}
      <Seccion tinta={fondo.tintaSuave} titulo="Apariencia">
        <Tarjeta style={{ gap: 12 }}>
          <FilaInterruptor
            titulo="Fondo según la calidad del aire"
            detalle="El fondo de Inicio y Contaminantes toma el color del nivel actual."
            valor={a.fondoPorNivel}
            alCambiar={(v) => void m.fijarFondoPorNivel(v)}
          />
          <Segmentos
            valor={a.apariencia}
            opciones={[
              ['claro', 'Claro'],
              ['oscuro', 'Oscuro'],
              ['sistema', 'Sistema'],
            ]}
            alElegir={(v) => void m.fijarApariencia(v)}
          />
        </Tarjeta>
      </Seccion>

      {/* ═══ GRUPO VULNERABLE (OPCIONAL) ═══ */}
      <Seccion tinta={fondo.tintaSuave} titulo="Población sensible (NOM-172)">
        <Tarjeta style={{ gap: 8 }}>
          <FilaInterruptor
            titulo="Pertenezco a un grupo vulnerable"
            detalle="Habilita umbrales más estrictos según la NOM-172-SEMARNAT-2023."
            valor={a.usarGrupoVulnerable ?? false}
            alCambiar={(v) => void m.fijarUsarGrupoVulnerable(v)}
          />
          {a.usarGrupoVulnerable ? (
            <>
              <T t={11} c={tema.textoSuave} style={{ marginTop: 4 }}>
                Selecciona tu grupo para aplicar los umbrales especiales:
              </T>
              {GRUPOS_VULNERABLES.map((g) => (
                <Opcion
                  key={g.id}
                  icono={g.icono as NombreIcono}
                  titulo={g.nombre}
                  detalle={g.descripcion}
                  activa={a.grupoVulnerable === g.id}
                  alSeleccionar={() => void m.fijarGrupoVulnerable(g.id)}
                />
              ))}
              <Separador style={{ marginVertical: 2 }} />
              <T t={11} c={tema.textoSuave} style={{ lineHeight: 15 }}>
                {grupoActivo
                  ? `Con "${grupoActivo.nombre}" las notificaciones arrancan desde el nivel ${nivel(umbralEf).adjetivo} (${nivel(umbralEf).riesgo.toLowerCase()}).`
                  : 'Elige un grupo para ver desde qué nivel te avisará.'}
              </T>
              {!a.alertasActivas ? (
                <T t={11} c={tema.textoSuave} style={{ lineHeight: 15 }}>
                  Recordatorio: los avisos solo llegan si activas "Notificar si el aire empeora" en la sección de
                  notificaciones.
                </T>
              ) : null}
            </>
          ) : null}
        </Tarjeta>
      </Seccion>

      {/* ═══ ADMINISTRACIÓN DEL SISTEMA ═══ */}
      <Seccion tinta={fondo.tintaSuave} titulo="Administración del sistema">
        <Tarjeta style={{ padding: 0 }}>
          <Pressable
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityHint="Abre la pantalla de Administración"
            onPress={() => router.push('/ajustes/admin')}
          >
            <Icono nombre={esAdmin ? 'shield-check' : 'shield-account'} tam={22} color={tema.accionTexto} />
            <View style={{ flex: 1 }}>
              <T t={13} f="negrita">
                {esAdmin ? 'Panel de Administradores' : 'Acceso de Administrador'}
              </T>
              <T t={11} c={tema.textoSuave} style={{ marginTop: 2 }}>
                {esAdmin
                  ? `Sesión activa (${adminActual?.nombre ?? 'Admin'}) · Estaciones, tópicos MQTT y diagnóstico.`
                  : 'Inicia sesión para registrar estaciones y configurar el sistema.'}
              </T>
            </View>
            <Icono nombre="chevron-right" tam={20} color={tema.textoSuave} />
          </Pressable>
        </Tarjeta>
      </Seccion>

      <T t={10.5} c={fondo.tintaSuave} style={{ textAlign: 'center', marginTop: 12 }}>
        AURA-172 v1.0 · Alerta Urbana de Riesgo Ambiental
      </T>
    </Pantalla>
  );
}

function Seccion({ titulo, tinta, children }: { titulo: string; tinta: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Etiqueta c={tinta} style={{ paddingHorizontal: 4 }}>
        {titulo}
      </Etiqueta>
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
  const tema = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T t={12.5} f="negrita" style={{ lineHeight: 16 }}>
          {titulo}
        </T>
        <T t={11} c={tema.textoSuave} style={{ marginTop: 2, lineHeight: 15 }}>
          {detalle}
        </T>
      </View>
      <Interruptor valor={valor} alCambiar={alCambiar} etiqueta={titulo} />
    </View>
  );
}

/**
 * Selector de hora libre: todos los horarios de media hora (00:00 → 23:30)
 * en un desplazamiento horizontal.
 */
function PickerHora({ valor, alCambiar }: { valor: string; alCambiar: (h: string) => void }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  const horarios: string[] = [];
  for (let h = 0; h < 24; h++) {
    horarios.push(`${String(h).padStart(2, '0')}:00`);
    horarios.push(`${String(h).padStart(2, '0')}:30`);
  }
  const fmt = (s: string) => {
    const [hh, mm] = s.split(':');
    const h = parseInt(hh, 10);
    const sufijo = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mm} ${sufijo}`;
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {horarios.map((s) => {
        const activo = s === valor;
        return (
          <Pressable
            key={s}
            onPress={() => alCambiar(s)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            android_ripple={{ color: 'transparent' }}
            style={[e.hora, activo && { backgroundColor: tema.chipActivoFondo }]}
          >
            <T t={11.5} f="negrita" c={activo ? tema.chipActivoTexto : tema.textoSuave}>
              {fmt(s)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Opción elegible (modo de enlace, grupo vulnerable). */
function Opcion({
  icono,
  titulo,
  detalle,
  activa,
  alSeleccionar,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle: string;
  activa: boolean;
  alSeleccionar: () => void;
}) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={alSeleccionar}
      accessibilityRole="radio"
      accessibilityState={{ selected: activa }}
      android_ripple={{ color: 'transparent' }}
      style={[e.opcion, activa && { backgroundColor: tema.accionSuave, borderColor: tema.opcionActivaBorde }]}
    >
      <Icono nombre={icono} tam={20} color={activa ? tema.accionTexto : tema.textoSuave} />
      <View style={{ flex: 1 }}>
        <T t={12.5} f="negrita">
          {titulo}
        </T>
        <T t={11} c={tema.textoSuave} style={{ marginTop: 2, lineHeight: 15 }}>
          {detalle}
        </T>
      </View>
      {activa ? <Icono nombre="check" tam={18} color={tema.accionTexto} /> : null}
    </Pressable>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    opcion: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: p.borde,
    },
    hora: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 99,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 76,
      backgroundColor: p.superficie2,
    },
  });
