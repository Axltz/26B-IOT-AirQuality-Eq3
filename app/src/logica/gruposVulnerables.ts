/**
 * Definición oficial de Grupos Vulnerables (Población Sensible) y recomendaciones
 * conforme a la NOM-172-SEMARNAT-2023 (Índice AIRE Y SALUD).
 */

export interface GrupoVulnerable {
  id: string;
  nombre: string;
  subtitulo: string;
  icono: string;
  descripcion: string;
  /** Nivel mínimo del índice AIRE Y SALUD donde se activa el riesgo crítico (1: Aceptable, 2: Mala) */
  nivelAlertaMinimo: number;
  recomendacionAceptable: string;
  recomendacionMala: string;
  recomendacionMuyMala: string;
}

export const GRUPOS_VULNERABLES: GrupoVulnerable[] = [
  {
    id: 'ninos',
    nombre: 'Niñas y Niños (< 12 años)',
    subtitulo: 'Escolares y desarrollo pulmonar',
    icono: 'human-child',
    descripcion: 'Mayor tasa de ventilación por minuto y vías respiratorias en pleno desarrollo biológico.',
    nivelAlertaMinimo: 1, // En Aceptable ya se sugiere reducir actividad vigorosa
    recomendacionAceptable: 'Reducir esfuerzos físicos prolongados o intensos al aire libre en recreo.',
    recomendacionMala: 'Evitar actividades cívicas y deportivas en patios escolares al aire libre.',
    recomendacionMuyMala: 'Suspender completamente clases al exterior; cerrar puertas y ventanas de salones.',
  },
  {
    id: 'adultos_mayores',
    nombre: 'Adultos Mayores (60+ años)',
    subtitulo: 'Salud cardiopulmonar',
    icono: 'human-cane',
    descripcion: 'Disminución de capacidad antioxidante e hiperreactividad bronquial.',
    nivelAlertaMinimo: 1,
    recomendacionAceptable: 'Considerar pausas periódicas durante caminatas o ejercicio en exteriores.',
    recomendacionMala: 'Evitar esfuerzos al aire libre y permanecer en espacios interiores ventilados.',
    recomendacionMuyMala: 'Permanecer estrictamente dentro del hogar y evitar exposición ambiental.',
  },
  {
    id: 'respiratorios_cardiacos',
    nombre: 'Personas con Asma / EPOC / Cardiopatías',
    subtitulo: 'Condiciones crónicas preexistentes',
    icono: 'heart-pulse',
    descripcion: 'Vulnerabilidad crítica ante incrementos agudos de partículas PM2.5 y gas CO.',
    nivelAlertaMinimo: 1,
    recomendacionAceptable: 'Llevar inhalador o medicación de rescate; moderar la actividad física.',
    recomendacionMala: 'No realizar actividades fuera; mantener filtros o purificación interior.',
    recomendacionMuyMala: 'Permanecer en interiores herméticos; consultar médico si hay síntomas.',
  },
  {
    id: 'embarazo',
    nombre: 'Personas Gestantes (Embarazo)',
    subtitulo: 'Protección materno-fetal',
    icono: 'human-pregnant',
    descripcion: 'El CO reduce transporte de oxígeno en sangre y el PM2.5 cruza la barrera placentaria.',
    nivelAlertaMinimo: 1,
    recomendacionAceptable: 'Limitar traslados peatonales en avenidas de alto flujo vehicular.',
    recomendacionMala: 'Evitar exposición a humos o tráfico; reposo en ambientes interiores limpios.',
    recomendacionMuyMala: 'Evitar salir de casa bajo contingencia atmosférica severa.',
  },
];
