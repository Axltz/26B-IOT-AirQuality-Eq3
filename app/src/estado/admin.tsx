import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { derivarHash, generarSal, LARGO_MINIMO_CONTRASENA, verificarContrasena } from '../logica/credenciales';

/** Datos visibles de un administrador (sin credenciales). */
export interface Admin {
  email: string;
  nombre: string;
  creadoEn: number;
}

/** Lo que se guarda en el teléfono: nunca la contraseña, solo sal + hash. */
interface AdminGuardado extends Admin {
  sal: string;
  hash: string;
}

type Resultado = { ok: boolean; error?: string };

interface ContextoAdminTipo {
  esAdmin: boolean;
  adminActual: Admin | null;
  admins: Admin[];
  iniciarSesion: (correo: string, contrasena: string) => Promise<Resultado>;
  cerrarSesion: () => Promise<void>;
  crearAdmin: (correo: string, nombre: string, contrasena: string) => Promise<Resultado>;
  eliminarAdmin: (correo: string) => Promise<Resultado>;
}

// v2: las versiones v1 guardaban admins sin contraseña propia y sesiones
// abiertas con el formulario prellenado; se descartan a propósito.
const CLAVE_SESION_ADMIN = 'mientorno.admin.sesion.v2';
const CLAVE_LISTA_ADMINS = 'mientorno.admin.lista.v2';

/**
 * Administrador principal. La sal y el hash se generan con
 * `npm run hash-admin` (la contraseña nunca se escribe en el código).
 */
export const ADMIN_ROOT_EMAIL = 'axelmtz9880@gmail.com';
const ADMIN_ROOT_SAL = '992ced556bcef90938b675f170bbd532';
const ADMIN_ROOT_HASH = 'a7c7c6645fa71a62eb94c74c4e4bab9a46c44b7e75987de5bbe73df04382412d';

const ADMIN_ROOT: AdminGuardado = {
  email: ADMIN_ROOT_EMAIL,
  nombre: 'Axel Mtz (Administrador Principal)',
  creadoEn: 0,
  sal: ADMIN_ROOT_SAL,
  hash: ADMIN_ROOT_HASH,
};

/** Tras estos intentos fallidos seguidos, el login se bloquea un rato. */
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 30_000;

const sinCredenciales = ({ email, nombre, creadoEn }: AdminGuardado): Admin => ({ email, nombre, creadoEn });

const esAdminGuardado = (x: unknown): x is AdminGuardado =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as AdminGuardado).email === 'string' &&
  typeof (x as AdminGuardado).nombre === 'string' &&
  typeof (x as AdminGuardado).sal === 'string' &&
  typeof (x as AdminGuardado).hash === 'string';

/** El principal siempre existe y siempre usa las credenciales del código. */
const conRoot = (lista: AdminGuardado[]): AdminGuardado[] => [
  ADMIN_ROOT,
  ...lista.filter((a) => a.email.toLowerCase() !== ADMIN_ROOT_EMAIL),
];

const ContextoAdmin = createContext<ContextoAdminTipo>({
  esAdmin: false,
  adminActual: null,
  admins: [sinCredenciales(ADMIN_ROOT)],
  iniciarSesion: async () => ({ ok: false }),
  cerrarSesion: async () => {},
  crearAdmin: async () => ({ ok: false }),
  eliminarAdmin: async () => ({ ok: false }),
});

export function ProveedorAdmin({ children }: { children: ReactNode }) {
  const [adminActual, setAdminActual] = useState<Admin | null>(null);
  const [admins, setAdmins] = useState<AdminGuardado[]>([ADMIN_ROOT]);
  const fallos = useRef({ seguidos: 0, bloqueadoHasta: 0 });

  useEffect(() => {
    void (async () => {
      try {
        let lista: AdminGuardado[] = [ADMIN_ROOT];
        const rawLista = await AsyncStorage.getItem(CLAVE_LISTA_ADMINS);
        if (rawLista) {
          const parsed: unknown = JSON.parse(rawLista);
          if (Array.isArray(parsed)) lista = conRoot(parsed.filter(esAdminGuardado));
        }
        setAdmins(lista);

        // La sesión solo vale si ese correo sigue siendo administrador.
        const rawSesion = await AsyncStorage.getItem(CLAVE_SESION_ADMIN);
        if (rawSesion) {
          const parsed = JSON.parse(rawSesion);
          const encontrado = lista.find((a) => a.email === parsed?.email);
          if (encontrado) setAdminActual(sinCredenciales(encontrado));
          else await AsyncStorage.removeItem(CLAVE_SESION_ADMIN);
        }
      } catch (e) {
        console.warn('Error inicializando módulo admin:', e);
      }
    })();
  }, []);

  const guardarLista = async (lista: AdminGuardado[]) => {
    setAdmins(lista);
    // El principal no se guarda: sus credenciales vienen del código.
    await AsyncStorage.setItem(CLAVE_LISTA_ADMINS, JSON.stringify(lista.filter((a) => a !== ADMIN_ROOT)));
  };

  const iniciarSesion = async (correo: string, contrasena: string): Promise<Resultado> => {
    const c = correo.trim().toLowerCase();
    const p = contrasena;

    if (!c || !p) return { ok: false, error: 'Ingresa correo y contraseña' };

    const restante = fallos.current.bloqueadoHasta - Date.now();
    if (restante > 0) {
      return { ok: false, error: `Demasiados intentos. Espera ${Math.ceil(restante / 1000)} s` };
    }

    // Deja que la interfaz pinte "Verificando…" antes de calcular el hash.
    await new Promise((r) => setTimeout(r, 0));

    const encontrado = admins.find((a) => a.email.toLowerCase() === c);
    // Se calcula el hash aunque el correo no exista, para no delatar por el tiempo de respuesta.
    const valida = verificarContrasena(p, encontrado?.sal ?? 'sin-admin', encontrado?.hash ?? '0'.repeat(64));

    if (!encontrado || !valida) {
      fallos.current.seguidos += 1;
      if (fallos.current.seguidos >= MAX_INTENTOS) {
        fallos.current = { seguidos: 0, bloqueadoHasta: Date.now() + BLOQUEO_MS };
        return { ok: false, error: `Demasiados intentos. Espera ${BLOQUEO_MS / 1000} s` };
      }
      return { ok: false, error: 'Correo o contraseña incorrectos' };
    }

    fallos.current = { seguidos: 0, bloqueadoHasta: 0 };
    const admin = sinCredenciales(encontrado);
    setAdminActual(admin);
    await AsyncStorage.setItem(CLAVE_SESION_ADMIN, JSON.stringify(admin));
    return { ok: true };
  };

  const cerrarSesion = async () => {
    setAdminActual(null);
    await AsyncStorage.removeItem(CLAVE_SESION_ADMIN);
  };

  const crearAdmin = async (correo: string, nombre: string, contrasena: string): Promise<Resultado> => {
    if (!adminActual) return { ok: false, error: 'Inicia sesión como administrador' };
    const c = correo.trim().toLowerCase();
    const n = nombre.trim();
    if (!c || !n || !contrasena) return { ok: false, error: 'Completa todos los campos' };
    if (!c.includes('@') || !c.includes('.')) return { ok: false, error: 'Correo inválido' };
    if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
      return { ok: false, error: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres` };
    }
    if (admins.some((a) => a.email.toLowerCase() === c)) {
      return { ok: false, error: 'Este correo ya es administrador' };
    }

    await new Promise((r) => setTimeout(r, 0));
    const sal = generarSal();
    await guardarLista([...admins, { email: c, nombre: n, creadoEn: Date.now(), sal, hash: derivarHash(contrasena, sal) }]);
    return { ok: true };
  };

  const eliminarAdmin = async (correo: string): Promise<Resultado> => {
    if (!adminActual) return { ok: false, error: 'Inicia sesión como administrador' };
    const c = correo.trim().toLowerCase();
    if (c === ADMIN_ROOT_EMAIL) {
      return { ok: false, error: 'No se puede eliminar al administrador principal' };
    }
    await guardarLista(admins.filter((a) => a.email.toLowerCase() !== c));
    // Si se quitó a sí mismo, su sesión termina.
    if (adminActual.email.toLowerCase() === c) await cerrarSesion();
    return { ok: true };
  };

  return (
    <ContextoAdmin.Provider
      value={{
        esAdmin: !!adminActual,
        adminActual,
        admins: admins.map(sinCredenciales),
        iniciarSesion,
        cerrarSesion,
        crearAdmin,
        eliminarAdmin,
      }}
    >
      {children}
    </ContextoAdmin.Provider>
  );
}

export function useAdmin() {
  return useContext(ContextoAdmin);
}
