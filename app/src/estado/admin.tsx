import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface Admin {
  email: string;
  nombre: string;
  creadoEn: number;
}

interface ContextoAdminTipo {
  esAdmin: boolean;
  adminActual: Admin | null;
  admins: Admin[];
  iniciarSesion: (correo: string, contrasena: string) => Promise<{ ok: boolean; error?: string }>;
  cerrarSesion: () => Promise<void>;
  crearAdmin: (correo: string, nombre: string) => Promise<{ ok: boolean; error?: string }>;
  eliminarAdmin: (correo: string) => Promise<{ ok: boolean; error?: string }>;
}

const CLAVE_SESION_ADMIN = 'mientorno.admin.sesion.v1';
const CLAVE_LISTA_ADMINS = 'mientorno.admin.lista.v1';

// Admin root inicial de fábrica
const ADMIN_ROOT_EMAIL = 'axelmtz9880@gmail.com';
const ADMIN_PASS_DEFECTO = 'admin123';

const ADMINS_INICIALES: Admin[] = [
  {
    email: ADMIN_ROOT_EMAIL,
    nombre: 'Axel Mtz (Administrador Principal)',
    creadoEn: Date.now(),
  },
];

const ContextoAdmin = createContext<ContextoAdminTipo>({
  esAdmin: false,
  adminActual: null,
  admins: ADMINS_INICIALES,
  iniciarSesion: async () => ({ ok: false }),
  cerrarSesion: async () => {},
  crearAdmin: async () => ({ ok: false }),
  eliminarAdmin: async () => ({ ok: false }),
});

export function ProveedorAdmin({ children }: { children: ReactNode }) {
  const [adminActual, setAdminActual] = useState<Admin | null>(null);
  const [admins, setAdmins] = useState<Admin[]>(ADMINS_INICIALES);

  useEffect(() => {
    void (async () => {
      try {
        const rawLista = await AsyncStorage.getItem(CLAVE_LISTA_ADMINS);
        if (rawLista) {
          const parsed = JSON.parse(rawLista);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdmins(parsed);
          }
        }
        const rawSesion = await AsyncStorage.getItem(CLAVE_SESION_ADMIN);
        if (rawSesion) {
          const parsed = JSON.parse(rawSesion);
          if (parsed && typeof parsed.email === 'string') {
            setAdminActual(parsed);
          }
        }
      } catch (e) {
        console.warn('Error inicializando módulo admin:', e);
      }
    })();
  }, []);

  const iniciarSesion = async (correo: string, contrasena: string) => {
    const c = correo.trim().toLowerCase();
    const p = contrasena.trim();

    if (!c || !p) {
      return { ok: false, error: 'Ingresa correo y contraseña' };
    }

    // Valida admin en lista
    const encontrado = admins.find((a) => a.email.toLowerCase() === c);
    if (!encontrado) {
      return { ok: false, error: 'Usuario no registrado como administrador' };
    }

    if (p !== ADMIN_PASS_DEFECTO) {
      return { ok: false, error: 'Contraseña incorrecta' };
    }

    setAdminActual(encontrado);
    await AsyncStorage.setItem(CLAVE_SESION_ADMIN, JSON.stringify(encontrado));
    return { ok: true };
  };

  const cerrarSesion = async () => {
    setAdminActual(null);
    await AsyncStorage.removeItem(CLAVE_SESION_ADMIN);
  };

  const crearAdmin = async (correo: string, nombre: string) => {
    const c = correo.trim().toLowerCase();
    const n = nombre.trim();
    if (!c || !n) return { ok: false, error: 'Completa todos los campos' };
    if (!c.includes('@') || !c.includes('.')) return { ok: false, error: 'Correo inválido' };

    if (admins.some((a) => a.email.toLowerCase() === c)) {
      return { ok: false, error: 'Este correo ya es administrador' };
    }

    const nuevaLista = [...admins, { email: c, nombre: n, creadoEn: Date.now() }];
    setAdmins(nuevaLista);
    await AsyncStorage.setItem(CLAVE_LISTA_ADMINS, JSON.stringify(nuevaLista));
    return { ok: true };
  };

  const eliminarAdmin = async (correo: string) => {
    const c = correo.trim().toLowerCase();
    if (c === ADMIN_ROOT_EMAIL.toLowerCase()) {
      return { ok: false, error: 'No se puede eliminar al administrador principal' };
    }
    const nuevaLista = admins.filter((a) => a.email.toLowerCase() !== c);
    setAdmins(nuevaLista);
    await AsyncStorage.setItem(CLAVE_LISTA_ADMINS, JSON.stringify(nuevaLista));
    return { ok: true };
  };

  return (
    <ContextoAdmin.Provider
      value={{
        esAdmin: !!adminActual,
        adminActual,
        admins,
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
