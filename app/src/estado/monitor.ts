import { createContext, useContext, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { evaluarAlerta, textoNotificacion, type EstadoAlerta, type TipoAviso } from '../logica/alertas';
import { evaluarAire, type CalidadAire } from '../logica/calidadAire';
import type { Metrica } from '../logica/historial';
import {
  ajustesPorDefecto,
  dispositivoActivo,
  normalizarDireccion,
  type Ajustes,
  type Dispositivo,
} from '../modelos/ajustes';
import type { Lectura } from '../modelos/lectura';
import * as almacen from '../servicios/almacenamiento';
import {
  describirError,
  historialEsp32,
  leerEsp32,
  quitarPushEsp32,
  registrarPushEsp32,
} from '../servicios/clienteEsp32';
import {
  abiertaDesdeNotificacion,
  escucharToques,
  iniciarNotificaciones,
  mostrarNotificacion,
  obtenerTokenPush,
  pedirPermiso,
} from '../servicios/notificaciones';
import { historialSimulado, lecturaSimulada } from '../servicios/simulador';

export type EstadoConexion = 'conectando' | 'enLinea' | 'sinConexion';
export type Vista = 'resumen' | 'notificacion';

/** Cada cuánto se guarda una muestra en el historial. */
const INTERVALO_MUESTRA = 60_000;
/** Cuánto historial se conserva. */
const RETENCION = 26 * 3600_000;
/** Duración de "Simular alerta de aire". */
export const DURACION_SIMULACION = 60_000;

/**
 * Estado central de la app: consulta al ESP32 cada pocos segundos, guarda el
 * historial, evalúa la calidad del aire y lanza las notificaciones.
 */
export class Monitor {
  ajustes: Ajustes = ajustesPorDefecto();
  cargado = false;
  conexion: EstadoConexion = 'conectando';
  error: string | null = null;
  ultimaActualizacion: number | null = null;
  historial: Lectura[] = [];
  alerta: EstadoAlerta | null = null;
  vista: Vista = 'resumen';
  metrica: Metrica = 'temperatura';

  private lecturaReal: Lectura | null = null;
  private lecturaSim: Lectura | null = null;
  private simulacionHasta = 0;
  private sondeo: ReturnType<typeof setInterval> | null = null;
  private finSimulacion: ReturnType<typeof setTimeout> | null = null;
  private consultando = false;
  private historialPendiente = false;
  private ultimoGuardado = Date.now();
  private limpiezas: (() => void)[] = [];
  private oyentes = new Set<() => void>();
  private version = 0;

  // ------------------------------------------------------------ suscripción

  suscribir = (fn: () => void) => {
    this.oyentes.add(fn);
    return () => {
      this.oyentes.delete(fn);
    };
  };

  obtenerVersion = () => this.version;

  private avisarCambios() {
    this.version++;
    this.oyentes.forEach((fn) => fn());
  }

  // ----------------------------------------------------------------- lectura

  get dispositivo(): Dispositivo {
    return dispositivoActivo(this.ajustes);
  }

  get simulando(): boolean {
    return Date.now() < this.simulacionHasta;
  }

  /** Lectura que se muestra (la real o, durante la simulación, la simulada). */
  get lectura(): Lectura | null {
    return this.simulando ? this.lecturaSim : this.lecturaReal;
  }

  /** Calidad del aire según la NOM-172 (igual que el semáforo del ESP32). */
  get aire(): CalidadAire | null {
    const l = this.lectura;
    return l ? evaluarAire(l) : null;
  }

  get hayAvisoSinLeer(): boolean {
    return !!this.alerta && !this.alerta.leida;
  }

  get mostrarPestanas(): boolean {
    return (
      this.vista === 'notificacion' ||
      (!!this.alerta && (this.alerta.enCurso || !this.alerta.leida))
    );
  }

  /** El ESP32 activo manda las alertas por push (llegan con la app cerrada). */
  get pushActivo(): boolean {
    return !this.dispositivo.demo && !!this.dispositivo.tokenPush;
  }

  // ----------------------------------------------------------- ciclo de vida

  private iniciado = false;

  async iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    await iniciarNotificaciones();
    this.limpiezas.push(escucharToques(() => this.mostrarVista('notificacion')));
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void this.actualizar(true);
      else if (estado === 'background') void this.guardarHistorial();
    });
    this.limpiezas.push(() => sub.remove());

    this.ajustes = await almacen.cargarAjustes();
    await this.prepararDispositivo();
    if (abiertaDesdeNotificacion() && this.alerta) this.vista = 'notificacion';
    this.cargado = true;
    this.avisarCambios();
    this.programarSondeo();
    await this.actualizar(true);
  }

  detener() {
    if (this.sondeo) clearInterval(this.sondeo);
    if (this.finSimulacion) clearTimeout(this.finSimulacion);
    this.limpiezas.forEach((fn) => fn());
    this.limpiezas = [];
  }

  private programarSondeo() {
    if (this.sondeo) clearInterval(this.sondeo);
    this.sondeo = setInterval(() => void this.actualizar(), this.ajustes.intervaloSeg * 1000);
  }

  private async prepararDispositivo() {
    this.lecturaReal = null;
    this.error = null;
    this.ultimaActualizacion = null;
    this.conexion = 'conectando';
    this.cancelarSimulacion();
    const d = this.dispositivo;
    this.alerta = await almacen.cargarAlerta(d.id);
    this.historial = d.demo ? historialSimulado(Date.now()) : await almacen.cargarHistorial(d.id);
    this.depurarHistorial();
  }

  // ------------------------------------------------------------------ sondeo

  /** Pide una lectura nueva al ESP32 (o al simulador) y evalúa las alertas. */
  async actualizar(traerHistorial = false) {
    if (this.consultando || !this.cargado) return;
    this.consultando = true;
    const d = this.dispositivo;
    try {
      let nueva: Lectura;
      if (d.demo) {
        nueva = lecturaSimulada(Date.now());
      } else {
        const url = normalizarDireccion(d.direccion);
        if (traerHistorial) await this.traerHistorialEsp32(d, url);
        nueva = await leerEsp32(url);
      }
      if (d.id !== this.dispositivo.id) return; // cambió de dispositivo a medio camino
      this.lecturaReal = nueva;
      this.conexion = 'enLinea';
      this.error = null;
      this.ultimaActualizacion = nueva.fecha;
      this.registrar(nueva);
    } catch (e) {
      if (d.id !== this.dispositivo.id) return;
      this.conexion = 'sinConexion';
      this.error = describirError(e);
    } finally {
      this.consultando = false;
    }
    await this.evaluar();
    this.avisarCambios();
  }

  reintentar = () => this.actualizar(true);

  private async traerHistorialEsp32(d: Dispositivo, url: string) {
    try {
      const externas = await historialEsp32(url);
      if (externas?.length && d.id === this.dispositivo.id) this.fusionar(externas);
    } catch {
      // /api/historial es opcional.
    }
  }

  private registrar(l: Lectura) {
    const ultimo = this.historial[this.historial.length - 1];
    if (ultimo && l.fecha - ultimo.fecha < INTERVALO_MUESTRA) return;
    this.historial = [...this.historial, l];
    this.depurarHistorial();
    this.historialPendiente = true;
    if (Date.now() - this.ultimoGuardado > 2 * 60_000) void this.guardarHistorial();
  }

  private fusionar(externas: Lectura[]) {
    const combinado = [...this.historial];
    for (const e of externas) {
      if (!combinado.some((l) => Math.abs(l.fecha - e.fecha) < 45_000)) combinado.push(e);
    }
    combinado.sort((a, b) => a.fecha - b.fecha);
    this.historial = combinado;
    this.depurarHistorial();
    this.historialPendiente = true;
  }

  private depurarHistorial() {
    const limite = Date.now() - RETENCION;
    if (this.historial.length && this.historial[0].fecha < limite) {
      this.historial = this.historial.filter((l) => l.fecha > limite);
    }
  }

  private async guardarHistorial() {
    const d = this.dispositivo;
    if (d.demo || !this.historialPendiente) return;
    this.historialPendiente = false;
    this.ultimoGuardado = Date.now();
    await almacen.guardarHistorial(d.id, this.historial);
  }

  // ----------------------------------------------------------------- alertas

  private async evaluar(notificar = true) {
    const l = this.lectura;
    if (!l) return;
    const r = evaluarAlerta({
      actual: this.alerta,
      aire: evaluarAire(l),
      lectura: l,
      umbral: this.ajustes.umbralNivel,
      dispositivo: this.dispositivo.nombre,
      ahora: Date.now(),
      simulada: this.simulando,
    });
    await this.fijarAlerta(r.estado);
    if (notificar && r.aviso && r.estado) await this.notificar(r.aviso, r.estado);
  }

  private async fijarAlerta(nueva: EstadoAlerta | null) {
    const cambio = JSON.stringify(nueva) !== JSON.stringify(this.alerta);
    this.alerta = nueva;
    if (cambio) await almacen.guardarAlerta(this.dispositivo.id, nueva);
  }

  private async notificar(aviso: TipoAviso, a: EstadoAlerta, forzar = false) {
    // Con push activo el ESP32 ya manda el aviso: no se repite (salvo simulación).
    if (this.pushActivo && !a.simulada && !forzar) return;
    const permitido =
      aviso === 'empeoro'
        ? this.ajustes.alertasActivas || forzar
        : (this.ajustes.alertasActivas || a.simulada) && this.ajustes.avisarMejora;
    if (!permitido) return;
    const t = textoNotificacion(aviso, a);
    await mostrarNotificacion(t.titulo, t.cuerpo, aviso);
  }

  /**
   * "Simular alerta de aire": durante 60 s la app ve el aire como malo, manda
   * la notificación y abre la vista de alerta. Al terminar vuelve la lectura
   * real y llega el aviso de mejora. Devuelve si hay permiso de notificar.
   */
  async simularAlerta(): Promise<boolean> {
    // El permiso se pide de inmediato (el navegador lo exige tras el toque),
    // pero la vista no espera la respuesta.
    const permisoFuturo = pedirPermiso();
    const ahora = Date.now();
    const base = this.lecturaReal ?? lecturaSimulada(ahora, false);
    const umbral = this.ajustes.umbralNivel;
    // PM2.5 suficiente para llegar al nivel elegido en Ajustes (cortes NOM-172).
    const [pm25, pm10] = umbral <= 1 ? [20, 35] : umbral === 2 ? [68, 96] : umbral === 3 ? [100, 140] : [150, 200];
    // Sin el nivel del semáforo del ESP32, que si no le ganaría al valor simulado.
    this.lecturaSim = { ...base, fecha: ahora, pm25, pm10, nivelReportado: undefined };
    this.simulacionHasta = ahora + DURACION_SIMULACION;
    if (this.finSimulacion) clearTimeout(this.finSimulacion);
    this.finSimulacion = setTimeout(() => void this.terminarSimulacion(), DURACION_SIMULACION);

    const yaEnCurso = this.alerta?.enCurso ?? false;
    await this.evaluar(false);
    if (yaEnCurso && this.alerta) {
      await this.fijarAlerta({ ...this.alerta, leida: false, simulada: true });
    }
    this.vista = 'notificacion';
    this.avisarCambios();

    const permiso = await permisoFuturo;
    if (this.alerta?.enCurso) await this.notificar('empeoro', this.alerta, true);
    return permiso;
  }

  private async terminarSimulacion() {
    this.cancelarSimulacion();
    const a = this.alerta;
    if (!this.lecturaReal && a?.enCurso && a.simulada) {
      // Sin lectura real no hay con qué comparar: se cierra sin aviso.
      await this.fijarAlerta({ ...a, enCurso: false, fin: Date.now() });
    } else {
      await this.evaluar();
    }
    this.avisarCambios();
  }

  private cancelarSimulacion() {
    if (this.finSimulacion) clearTimeout(this.finSimulacion);
    this.finSimulacion = null;
    this.simulacionHasta = 0;
    this.lecturaSim = null;
  }

  // --------------------------------------------------------------- interfaz

  mostrarVista = (v: Vista) => {
    if (this.vista === v) return;
    this.vista = v;
    this.avisarCambios();
  };

  seleccionarMetrica = (m: Metrica) => {
    if (this.metrica === m) return;
    this.metrica = m;
    this.avisarCambios();
  };

  /** "Entendido, volver al resumen". */
  marcarAvisoLeido = async () => {
    if (this.alerta && !this.alerta.leida) await this.fijarAlerta({ ...this.alerta, leida: true });
    this.vista = 'resumen';
    this.avisarCambios();
  };

  // ----------------------------------------------------------------- ajustes

  private async guardarAjustes(nuevos: Ajustes) {
    this.ajustes = nuevos;
    this.avisarCambios();
    await almacen.guardarAjustes(nuevos);
  }

  fijarAlertasActivas = async (activas: boolean): Promise<boolean> => {
    const permiso = activas ? await pedirPermiso() : true;
    await this.guardarAjustes({ ...this.ajustes, alertasActivas: activas });
    return permiso;
  };

  fijarUmbral = async (umbral: number) => {
    await this.guardarAjustes({ ...this.ajustes, umbralNivel: umbral });
    await this.evaluar();
    this.avisarCambios();
    await this.reenviarConfigPush();
  };

  fijarAvisarMejora = async (v: boolean) => {
    await this.guardarAjustes({ ...this.ajustes, avisarMejora: v });
    await this.reenviarConfigPush();
  };

  fijarIntervalo = async (segundos: number) => {
    await this.guardarAjustes({ ...this.ajustes, intervaloSeg: segundos });
    this.programarSondeo();
  };

  cambiarDispositivo = async (id: string) => {
    if (id === this.ajustes.activoId) return;
    await this.guardarHistorial();
    await this.guardarAjustes({ ...this.ajustes, activoId: id });
    this.vista = 'resumen';
    await this.prepararDispositivo();
    this.avisarCambios();
    await this.actualizar(true);
  };

  /** Agrega o edita un dispositivo. Los nuevos quedan como activos. */
  guardarDispositivo = async (d: Dispositivo) => {
    const existe = this.ajustes.dispositivos.some((x) => x.id === d.id);
    const lista = existe
      ? this.ajustes.dispositivos.map((x) => (x.id === d.id ? d : x))
      : [...this.ajustes.dispositivos, d];
    const eraActivo = d.id === this.ajustes.activoId;
    await this.guardarAjustes({ ...this.ajustes, dispositivos: lista });
    if (!existe) {
      await this.cambiarDispositivo(d.id);
    } else if (eraActivo) {
      await this.prepararDispositivo();
      this.avisarCambios();
      await this.actualizar(true);
    }
  };

  eliminarDispositivo = async (id: string) => {
    if (this.ajustes.dispositivos.length <= 1) return;
    const lista = this.ajustes.dispositivos.filter((d) => d.id !== id);
    const eraActivo = id === this.ajustes.activoId;
    await this.guardarAjustes({
      ...this.ajustes,
      dispositivos: lista,
      activoId: eraActivo ? lista[0].id : this.ajustes.activoId,
    });
    await almacen.olvidarDispositivo(id);
    if (eraActivo) {
      await this.prepararDispositivo();
      this.avisarCambios();
      await this.actualizar(true);
    }
  };

  borrarHistorial = async () => {
    const d = this.dispositivo;
    this.historial = d.demo ? historialSimulado(Date.now()) : [];
    await almacen.borrarHistorial(d.id);
    this.avisarCambios();
  };

  /** Para el botón "Probar conexión". */
  probarConexion = (direccion: string) => leerEsp32(normalizarDireccion(direccion));

  // -------------------------------------------------------------------- push

  /** Registra este teléfono en el ESP32 para recibir alertas con la app cerrada. */
  activarPush = async () => {
    const d = this.dispositivo;
    if (d.demo) throw new Error('Primero conecta un ESP32 (el modo demostración no manda push).');
    const token = await obtenerTokenPush();
    await registrarPushEsp32(normalizarDireccion(d.direccion), {
      token,
      umbral: this.ajustes.umbralNivel,
      avisarMejora: this.ajustes.avisarMejora,
      nombre: d.nombre,
    });
    await this.reemplazarDispositivo({ ...d, tokenPush: token });
  };

  desactivarPush = async () => {
    const d = this.dispositivo;
    if (d.tokenPush) {
      try {
        await quitarPushEsp32(normalizarDireccion(d.direccion), d.tokenPush);
      } catch {
        // Si el ESP32 no responde se olvida igual en el teléfono.
      }
    }
    await this.reemplazarDispositivo({ ...d, tokenPush: undefined });
  };

  private async reemplazarDispositivo(d: Dispositivo) {
    await this.guardarAjustes({
      ...this.ajustes,
      dispositivos: this.ajustes.dispositivos.map((x) => (x.id === d.id ? d : x)),
    });
  }

  /** Si cambian umbral o "avisar cuando mejore", se le dice al ESP32. */
  private async reenviarConfigPush() {
    const d = this.dispositivo;
    if (!this.pushActivo || !d.tokenPush) return;
    try {
      await registrarPushEsp32(normalizarDireccion(d.direccion), {
        token: d.tokenPush,
        umbral: this.ajustes.umbralNivel,
        avisarMejora: this.ajustes.avisarMejora,
        nombre: d.nombre,
      });
    } catch (e) {
      console.warn('No se pudo actualizar el ESP32:', e);
    }
  }
}

export const ContextoMonitor = createContext<Monitor | null>(null);

/** Devuelve el monitor y vuelve a dibujar el componente cuando cambia. */
export function useMonitor(): Monitor {
  const m = useContext(ContextoMonitor);
  if (!m) throw new Error('useMonitor fuera de ContextoMonitor');
  useSyncExternalStore(m.suscribir, m.obtenerVersion, m.obtenerVersion);
  return m;
}
