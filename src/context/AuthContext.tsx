import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loginRequest, type ApiCompany, type ApiSession } from '../services/api';

interface AuthContextValue {
  session: ApiSession | null;
  user: ApiSession['user'] | null;
  activeCompany: ApiCompany | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  switchCompany: (companyId: string) => void;
  logout: () => void;
}

const SESSION_KEY = 'central-comunicacao:api-session';
const REMEMBER_KEY = 'central-comunicacao:remember-session';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const loadSession = (): ApiSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as ApiSession : null;
  } catch {
    return null;
  }
};

const persistSession = (session: ApiSession) => {
  const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ApiSession | null>(loadSession);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const nextSession = await loginRequest(email, password);
    localStorage.setItem(REMEMBER_KEY, String(remember));
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const switchCompany = useCallback((companyId: string) => {
    setSession((current) => {
      if (!current?.user.companies.some((company) => company.id === companyId)) return current;
      const nextSession = { ...current, activeCompanyId: companyId };
      persistSession(nextSession);
      return nextSession;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const activeCompany = session?.user.companies.find((company) => company.id === session.activeCompanyId) ?? null;
  const value = useMemo<AuthContextValue>(() => ({ session, user: session?.user ?? null, activeCompany, login, switchCompany, logout }), [activeCompany, login, logout, session, switchCompany]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components -- hook belongs to this private provider
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
