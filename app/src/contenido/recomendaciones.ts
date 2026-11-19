/**
 * Textos de recomendación por nivel NOM-172 (0 Buena … 4 Extremadamente mala),
 * tomados de la maqueta aprobada (docs/diseno/propuestas.html: `RECO` y `ACT`).
 *
 * Están pensados para partículas (PM2.5/PM10), que es lo que se mide en
 * exteriores. Cuando el contaminante determinante es el CO (interiores), la
 * interfaz usa `recomendacion()` de src/logica/calidadAire.ts.
 */

/** Ícono de MaterialCommunityIcons equivalente al de la maqueta. */
export type IconoRecomendacion = 'run' | 'window-open-variant' | 'home-outline' | 'alert-outline' | 'heart-pulse';

export interface Recomendacion {
  titulo: string;
  detalle: string;
  icono: IconoRecomendacion;
}

/** Tarjeta «Recomendación de hoy» de Inicio. */
export const RECOMENDACION_DEL_DIA: readonly Recomendacion[] = [
  {
    titulo: 'Disfruta el aire libre',
    detalle: 'Condiciones ideales para correr, andar en bici o ventilar la casa.',
    icono: 'run',
  },
  {
    titulo: 'Puedes salir, con calma',
    detalle:
      'Actividades al aire libre sin problema. Si tienes asma o eres persona mayor, evita el ejercicio intenso entre 2 y 5 p.m.',
    icono: 'run',
  },
  {
    titulo: 'Reduce el esfuerzo afuera',
    detalle: 'Evita el ejercicio vigoroso al aire libre. Niñas, niños y personas mayores: mejor en interiores.',
    icono: 'window-open-variant',
  },
  {
    titulo: 'Quédate en interiores',
    detalle: 'Limita al mínimo el tiempo afuera. Si debes salir, usa cubrebocas N95.',
    icono: 'home-outline',
  },
  {
    titulo: 'Evita salir',
    detalle: 'Riesgo extremadamente alto para toda la población. Mantén ventanas cerradas.',
    icono: 'alert-outline',
  },
];

/** Lista «Qué hacer ahora» de Alertas: tres acciones por nivel. */
export const QUE_HACER_AHORA: readonly (readonly [IconoRecomendacion, string][])[] = [
  [
    ['run', 'Puedes reanudar tus actividades al aire libre.'],
    ['window-open-variant', 'Ventila tu casa en las horas más frescas.'],
    ['heart-pulse', 'Si eres de un grupo sensible, sigue atento a los avisos.'],
  ],
  [
    ['run', 'Puedes salir; modera el ejercicio intenso.'],
    ['window-open-variant', 'Ventila tu casa en las horas más frescas.'],
    ['heart-pulse', 'Si tienes asma o EPOC, ten tu medicamento a la mano.'],
  ],
  [
    ['run', 'Evita actividades físicas vigorosas al aire libre.'],
    ['window-open-variant', 'Cierra ventanas si vives cerca de avenidas con tráfico.'],
    ['heart-pulse', 'Ten a la mano tu medicamento si tienes asma o EPOC.'],
  ],
  [
    ['home-outline', 'Permanece en interiores tanto como puedas.'],
    ['window-open-variant', 'Mantén ventanas y puertas cerradas.'],
    ['heart-pulse', 'Suspende actividades escolares y deportivas al aire libre.'],
  ],
  [
    ['home-outline', 'No salgas salvo que sea indispensable.'],
    ['window-open-variant', 'Sella ventanas y usa purificador si tienes uno.'],
    ['heart-pulse', 'Busca atención médica si te falta el aire o sientes dolor en el pecho.'],
  ],
];

export const indiceRecomendacion = (i: number) => Math.min(4, Math.max(0, Math.round(i)));
