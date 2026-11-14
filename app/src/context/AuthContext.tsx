// AuthContext.tsx – manejo de administradores y Secure Store (fallback a AsyncStorage)
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';

// Intentamos cargar expo-secure-store; si falla usamos AsyncStorage
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (_) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = null;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

interface Admin {
  email: string;
  password: string;
}

interface AuthContextProps {
  isAdmin: boolean;
  adminList: Admin[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addAdmin: (email: string, password: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const ADMIN_KEY = 'ADMINS';
const SESSION_KEY = 'CURRENT_ADMIN';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminList, setAdminList] = useState<Admin[]>([]);
  const [current, setCurrent] = useState<Admin | null>(null);

  const storage = SecureStore && SecureStore.isAvailableAsync ? SecureStore : AsyncStorage;

  const loadAdmins = async () => {
    try {
      const json = await storage.getItemAsync ? await storage.getItemAsync(ADMIN_KEY) : await storage.getItem(ADMIN_KEY);
      const list: Admin[] = json ? JSON.parse(json) : [];
      setAdminList(list);
    } catch (e) {
      console.warn('Error loading admins', e);
    }
  };

  const loadSession = async () => {
    try {
      const json = await storage.getItemAsync ? await storage.getItemAsync(SESSION_KEY) : await storage.getItem(SESSION_KEY);
      const admin: Admin | null = json ? JSON.parse(json) : null;
      setCurrent(admin);
    } catch (e) {
      console.warn('Error loading session', e);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadSession();
  }, []);

  const persistAdmins = async (list: Admin[]) => {
    const json = JSON.stringify(list);
    await (storage.setItemAsync ? storage.setItemAsync(ADMIN_KEY, json) : storage.setItem(ADMIN_KEY, json));
  };

  const persistSession = async (admin: Admin | null) => {
    const json = JSON.stringify(admin);
    await (storage.setItemAsync ? storage.setItemAsync(SESSION_KEY, json) : storage.setItem(SESSION_KEY, json));
  };

  const login = async (email: string, password: string) => {
    const found = adminList.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
    if (found) {
      setCurrent(found);
      await persistSession(found);
      return true;
    }
    return false;
  };

  const logout = async () => {
    setCurrent(null);
    await persistSession(null);
  };

  const addAdmin = async (email: string, password: string) => {
    const newAdmin: Admin = { email, password };
    const newList = [...adminList, newAdmin];
    setAdminList(newList);
    await persistAdmins(newList);
  };

  const changePassword = async (newPassword: string) => {
    if (!current) return;
    const updated = adminList.map(a => (a.email === current.email ? { ...a, password: newPassword } : a));
    setAdminList(updated);
    setCurrent({ ...current, password: newPassword });
    await Promise.all([persistAdmins(updated), persistSession({ ...current, password: newPassword })]);
  };

  // Si no hay admins guardados, inicializamos con la cuenta provista
  useEffect(() => {
    if (adminList.length === 0) {
      const defaultAdmin: Admin = { email: 'axelmtz9880@gmail.com', password: 'admin123' };
      setAdminList([defaultAdmin]);
      persistAdmins([defaultAdmin]);
    }
  }, [adminList.length]);

  return (
    <AuthContext.Provider
      value={{
        isAdmin: !!current,
        adminList,
        login,
        logout,
        addAdmin,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext not found');
  return ctx;
};
