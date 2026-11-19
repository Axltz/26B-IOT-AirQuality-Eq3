import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { QUE_HACER_AHORA, indiceRecomendacion } from '../contenido/recomendaciones';
import { useMonitor } from '../estado/monitor';
import { useEstilos, useTema } from '../estado/tema';
import type { EstadoAlerta } from '../logica/alertas';
import {
  CONTAMINANTES,
  NIVELES,
  concentracion,
  nivel,
  posicionBarra,
  posicionNivel,
  recomendacion,
} from '../logica/calidadAire';
import { GRUPOS_VULNERABLES, grupoPorId, recomendacionDeGrupo, umbralEfectivo } from '../logica/gruposVulnerables';
import { horaCorta } from '../logica/historial';
import type { PaletaTema, TintaFondo } from '../tema';
import {
  BotonIcono,
  BotonPrincipal,
  BotonSecundario,
  ChipIcono,
  Etiqueta,
  Icono,
  Pastilla,
  T,
  Tarjeta,
  numero,
  type NombreIcono,
} from './comunes';
import { Medidor } from './Medidor';
import { MensajeNivel } from './Nivel';

const volverAInicio = () => router.navigate('/');

/** Pestaña Alertas: detalle del aviso de calidad del aire o «Todo en orden». */
export function VistaNotificacion({ fondo }: { fondo: TintaFondo }) {
  const m = useMonitor();
  return m.alerta ? <DetalleAlerta a={m.alerta} fondo={fondo} /> : <SinAvisos fondo={fondo} />;
}

function DetalleAlerta({ a, fondo }: { a: EstadoAlerta; fondo: TintaFondo }) {
  const m = useMonitor();
  const tema = useTema();
  const enCurso = a.enCurso;
  // Mientras dura se muestra el nivel actual; al terminar, el máximo (medidor).
  const cat = nivel(enCurso ? a.nivel : a.nivelMaximo);
  // «El aire mejoró a…»: el nivel de ahora (o Buena si no hay lectura).
  const nivelMensaje = enCurso ? a.nivel : (m.aire?.nivel.indice ?? 0);
  const c = CONTAMINANTES[a.principal] ?? CONTAMINANTES.sensor;
  const esCo = a.principal === 'co';
  const valor = concentracion(a, a.principal);
  const posicion =
    enCurso && valor !== undefined ? posicionBarra(esCo ? 'co' : 'pm25', valor) : posicionNivel(cat.indice);

  const detalle = enCurso
    ? `Detectamos una concentración elevada de ${c.enFrase} ${c.exterior ? 'en tu zona' : `en ${a.dispositivo}`}.`
    : `El aire mejoró a las ${horaCorta(a.fin ?? Date.now())}. El punto más alto fue: ${nivel(a.nivelMaximo).nombre}.`;
  const momento = enCurso
    ? Date.now() - a.inicio < 2 * 60_000
      ? 'ahora'
      : `desde las ${horaCorta(a.inicio)}`
    : `de ${horaCorta(a.inicio)} a ${horaCorta(a.fin ?? Date.now())}`;
  const pie = !enCurso
    ? 'Te avisaremos de nuevo si la calidad del aire vuelve a empeorar.'
    : m.ajustes.alertasActivas && m.ajustes.avisarMejora
      ? 'Recibirás otra notificación cuando la calidad del aire mejore.'
      : 'Activa las alertas para saber cuándo mejore la calidad del aire.';

  // Personalización por grupo vulnerable (NOM-172): el aviso habla de su caso.
  const grupo = m.ajustes.usarGrupoVulnerable ? grupoPorId(m.ajustes.grupoVulnerable) : undefined;
  const nivelAviso = enCurso ? a.nivel : a.nivelMaximo;
  const recomendacionGrupo = grupo ? recomendacionDeGrupo(grupo.id, nivelAviso) : null;
  const umbralGrupo = grupo ? umbralEfectivo(m.ajustes.umbralNivel, true, grupo.id) : m.ajustes.umbralNivel;

  // Tres acciones por nivel (textos de la maqueta). Con CO (interiores) se
  // conserva el consejo de `recomendacion()`, que habla de ventilar y revisar
  // estufas y calentadores.
  const acciones: [NombreIcono, string][] = esCo
    ? [['heart-pulse', recomendacion(enCurso ? cat : NIVELES[0], a.principal)]]
    : QUE_HACER_AHORA[indiceRecomendacion(nivelMensaje)].map(([i, t]) => [i, t]);
  if (grupo) {
    acciones.push([
      grupo.icono as NombreIcono,
      `${grupo.nombre}: ${
        recomendacionGrupo ??
        `con tu grupo las alertas arrancan desde el nivel ${nivel(umbralGrupo).adjetivo} (${nivel(umbralGrupo).riesgo.toLowerCase()}).`
      }`,
    ]);
  }

  return (
    <>
      <View style={{ gap: 18, marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <BotonIcono icono="arrow-left" etiqueta="Volver a Inicio" alPresionar={volverAInicio} />
          <View style={{ flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {a.simulada ? (
              <Pastilla texto="Simulación" fondo={tema.pildoraSobreFondo} color={tema.pildoraSobreFondoTexto} />
            ) : null}
            <Pastilla
              texto={enCurso ? 'Alerta ambiental' : 'Alerta resuelta'}
              icono={enCurso ? 'alert-outline' : 'check'}
              fondo={tema.pildoraSobreFondo}
              color={tema.pildoraSobreFondoTexto}
            />
          </View>
        </View>
        <MensajeNivel
          indice={nivelMensaje}
          eyebrow={enCurso ? 'El aire empeoró a' : 'El aire mejoró a'}
          tinta={fondo.tinta}
          enPastel
        />
        <View style={{ gap: 4 }}>
          <T t={12} f="media" c={fondo.tinta} style={{ opacity: 0.85 }}>
            {a.dispositivo} · {momento}
          </T>
          <T t={12} c={fondo.tintaSuave} style={{ lineHeight: 17 }}>
            {detalle}
          </T>
        </View>
      </View>

      <Tarjeta style={{ alignItems: 'center', gap: 2 }}>
        <Etiqueta style={{ alignSelf: 'flex-start' }}>
          {esCo ? 'CO' : 'PM2.5'} · {enCurso ? 'lectura actual' : 'lectura del aviso'}
        </Etiqueta>
        <Medidor
          posicion={posicion}
          valor={esCo ? numero(a.co, 1) : numero(a.pm25)}
          unidad={esCo ? 'ppm' : 'µg/m³'}
          fin={esCo ? '16+' : '130+'}
        />
        <T t={11.5} c={tema.textoSuave} style={{ textAlign: 'center' }}>
          Contaminante principal:{' '}
          <T t={11.5} f="negrita">
            {c.nombre}
          </T>
        </T>
      </Tarjeta>

      <Tarjeta>
        <T t={15} f="extra">
          Qué hacer ahora
        </T>
        <View style={{ gap: 9 }}>
          {acciones.map(([icono, texto]) => (
            <View key={texto} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <ChipIcono nombre={icono} color={tema.texto} fondo={tema.superficie2} tam={28} tamIcono={15} radio={9} />
              <T t={12} style={{ flex: 1, lineHeight: 17, marginTop: 5 }}>
                {texto}
              </T>
            </View>
          ))}
        </View>
      </Tarjeta>

      <GruposSensibles grupoActivo={grupo?.id} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BotonPrincipal
          texto="Entendido"
          style={{ flex: 1 }}
          alPresionar={async () => {
            await m.marcarAvisoLeido();
            volverAInicio();
          }}
        />
        <BotonSecundario texto="Ver estación" style={{ flex: 1 }} alPresionar={volverAInicio} />
      </View>
      <T t={10.5} c={fondo.tintaSuave} style={{ textAlign: 'center' }}>
        {pie}
      </T>
    </>
  );
}

/** Grupos sensibles de la NOM-172; el grupo marcado en Ajustes va resaltado. */
function GruposSensibles({ grupoActivo }: { grupoActivo?: string }) {
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <Tarjeta>
      <Etiqueta>Grupos sensibles</Etiqueta>
      <View style={e.chips}>
        {GRUPOS_VULNERABLES.map((g) => {
          const activo = g.id === grupoActivo;
          return (
            <View key={g.id} style={[e.chip, activo && { backgroundColor: tema.chipActivoFondo }]}>
              <T t={11} f="negrita" c={activo ? tema.chipActivoTexto : tema.texto}>
                {g.nombre}
              </T>
            </View>
          );
        })}
      </View>
    </Tarjeta>
  );
}

function SinAvisos({ fondo }: { fondo: TintaFondo }) {
  const m = useMonitor();
  const tema = useTema();
  const e = useEstilos(crearEstilos);
  return (
    <>
      <BotonIcono icono="arrow-left" etiqueta="Volver a Inicio" alPresionar={volverAInicio} />
      <View style={{ alignItems: 'center', paddingTop: 24, gap: 10 }}>
        <View style={e.iconoAviso}>
          <Icono nombre="check-circle-outline" tam={28} color={tema.accionTexto} />
        </View>
        <Etiqueta c={fondo.tinta} style={{ opacity: 0.78 }}>
          Sin avisos
        </Etiqueta>
        <T t={28} f="display" c={fondo.tinta} accessibilityRole="header" style={{ letterSpacing: -0.8 }}>
          Todo en orden
        </T>
        <T t={12.5} c={fondo.tintaSuave} style={{ textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 }}>
          {m.ajustes.alertasActivas
            ? `No hay alertas de calidad del aire. Te avisaremos si el aire de ${m.dispositivo.nombre} empeora.`
            : 'Las alertas están desactivadas. Actívalas en Inicio o en Ajustes para recibir avisos.'}
        </T>
      </View>
      <BotonPrincipal texto="Volver a Inicio" alPresionar={volverAInicio} style={{ marginTop: 12 }} />
    </>
  );
}

const crearEstilos = (p: PaletaTema) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, backgroundColor: p.superficie2 },
    iconoAviso: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: p.superficie,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
