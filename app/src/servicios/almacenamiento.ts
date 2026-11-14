import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EstadoAlerta } from '../logica/alertas';
import { ajustesDesdeJson, ajustesPorDefecto, type Ajustes } from '../modelos/ajustes';
import type { Lectura } from '../modelos/lectura';

/** Guarda ajustes, historial y alertas en el teléfono. */
const CLAVE_AJUSTES = 'mientorno.ajustes.v1';
const claveHistorial = (id: string) => `mientorno.historial.v1.${id}`;
const claveAlerta = (id: string) => `mientorno.alerta.v1.${id}`;

async function leerJson(clave: string): Promise<unknown> {
  try {
    const texto = await AsyncStorage.getItem(clave);
    return texto === null ? null : JSON.parse(texto);
  } catch (e) {
    console.warn(`No se pudo leer ${clave}:`, e);
    return null;
  }
}

export async function cargarAjustes(): Promise<Ajustes> {
  const j = await leerJson(CLAVE_AJUSTES);
  return j === null ? ajustesPorDefecto() : ajustesDesdeJson(j);
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await AsyncStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a));
}

export async function cargarHistorial(id: string): Promise<Lectura[]> {
  const j = await leerJson(claveHistorial(id));
  return Array.isArray(j) ? (j.filter((l) => l && typeof l.fecha === 'number') as Lectura[]) : [];
}

export async function guardarHistorial(id: string, historial: Lectura[]): Promise<void> {
  await AsyncStorage.setItem(claveHistorial(id), JSON.stringify(historial));
}

export async function borrarHistorial(id: string): Promise<void> {
  await AsyncStorage.removeItem(claveHistorial(id));
}

export async function cargarAlerta(id: string): Promise<EstadoAlerta | null> {
  const j = await leerJson(claveAlerta(id));
  // Las alertas guardadas con el formato anterior (ICA de la EPA) se descartan.
  return j && typeof j === 'object' && 'enCurso' in j && typeof (j as EstadoAlerta).nivel === 'number'
    ? (j as EstadoAlerta)
    : null;
}

export async function guardarAlerta(id: string, alerta: EstadoAlerta | null): Promise<void> {
  if (alerta === null) await AsyncStorage.removeItem(claveAlerta(id));
  else await AsyncStorage.setItem(claveAlerta(id), JSON.stringify(alerta));
}

export async function olvidarDispositivo(id: string): Promise<void> {
  await AsyncStorage.multiRemove([claveHistorial(id), claveAlerta(id)]);
}
