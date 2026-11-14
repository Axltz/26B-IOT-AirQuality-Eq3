import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificaciones del sistema.
 *
 * - Locales: las lanza la app cuando lee aire malo (app abierta o en segundo
 *   plano). Funcionan en Expo Go.
 * - Push: las manda el propio ESP32 a través del servicio de Expo, así llegan
 *   aunque la app esté cerrada. Requieren la app compilada (no Expo Go en
 *   Android) y el proyecto vinculado a una cuenta de Expo. Ver README.
 */
export const CANAL = 'alertas-aire';
const esWeb = Platform.OS === 'web';

if (!esWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function iniciarNotificaciones(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Alertas de calidad del aire',
      description: 'Avisos cuando la calidad del aire empeora o mejora.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#E0533B',
    });
  } catch (e) {
    console.warn('No se pudo crear el canal de notificaciones:', e);
  }
}

/** Pide permiso para notificar. En el navegador debe llamarse tras un toque. */
export async function pedirPermiso(): Promise<boolean> {
  try {
    if (esWeb) {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      return (await Notification.requestPermission()) === 'granted';
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    console.warn('No se pudo pedir permiso de notificaciones:', e);
    return false;
  }
}

/** Muestra una notificación local. Devuelve false si no se pudo. */
export async function mostrarNotificacion(
  titulo: string,
  cuerpo: string,
  tipo: 'empeoro' | 'mejoro',
): Promise<boolean> {
  try {
    if (esWeb) {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;
      new Notification(titulo, { body: cuerpo, tag: `mientorno-${tipo}` });
      return true;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, sound: 'default', data: { tipo } },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
    return true;
  } catch (e) {
    console.warn('No se pudo mostrar la notificación:', e);
    return false;
  }
}

/** Llama a `alTocar` cuando el usuario toca una notificación. */
export function escucharToques(alTocar: () => void): () => void {
  if (esWeb) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(() => alTocar());
  return () => sub.remove();
}

/** true si la app se abrió tocando una notificación. */
export function abiertaDesdeNotificacion(): boolean {
  if (esWeb) return false;
  try {
    return Notifications.getLastNotificationResponse() !== null;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------- push

function idProyecto(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export type EstadoPush = { disponible: true } | { disponible: false; motivo: string };

/** Si este teléfono puede recibir notificaciones push y, si no, por qué. */
export function estadoPush(): EstadoPush {
  if (esWeb) {
    return { disponible: false, motivo: 'Las notificaciones push solo funcionan en el teléfono.' };
  }
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return {
      disponible: false,
      motivo:
        'Expo Go en Android no recibe notificaciones push. Instala la app compilada (ver README) para recibirlas con la app cerrada.',
    };
  }
  if (!idProyecto()) {
    return {
      disponible: false,
      motivo:
        'Falta vincular el proyecto con tu cuenta gratuita de Expo (npx eas-cli init). Ver README.',
    };
  }
  return { disponible: true };
}

/** Obtiene el token de Expo de este teléfono para dárselo al ESP32. */
export async function obtenerTokenPush(): Promise<string> {
  const e = estadoPush();
  if (!e.disponible) throw new Error(e.motivo);
  if (!(await pedirPermiso())) {
    throw new Error('Permite las notificaciones de la app para activar las alertas push.');
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: idProyecto() });
  return data;
}
