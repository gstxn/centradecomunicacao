import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loginRequest, logoutRequest, type ApiCompany, type ApiSession } from '../services/api';

interface AuthContextValue {
  session: ApiSession | null;
  user: ApiSession['user'] | null;
  activeCompany: ApiCompany | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  switchCompany: (companyId: string) => void;
  addCompany: (company: ApiCompany, activate?: boolean) => void;
  logout: () => void;
}

const SESSION_KEY = 'central-comunicacao:api-session';
const REMEMBER_KEY = 'central-comunicacao:remember-session';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const loadSession = (): ApiSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiSession;
    if (!parsed || !parsed.user || !Array.isArray(parsed.user.companies) || !parsed.activeCompanyId) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
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
      if (!current?.user?.companies?.some((company) => company.id === companyId)) return current;
      const nextSession = { ...current, activeCompanyId: companyId };
      persistSession(nextSession);
      return nextSession;
    });
  }, []);

  const addCompany = useCallback((newCompany: ApiCompany, activate = true) => {
    setSession((current) => {
      if (!current?.user) return current;
      const existingIndex = current.user.companies.findIndex((c) => c.id === newCompany.id);
      const updatedCompanies = existingIndex >= 0
        ? current.user.companies.map((c) => (c.id === newCompany.id ? newCompany : c))
        : [...current.user.companies, newCompany];
      const nextSession: ApiSession = {
        ...current,
        user: {
          ...current.user,
          companies: updatedCompanies
        },
        activeCompanyId: activate ? newCompany.id : current.activeCompanyId
      };
      persistSession(nextSession);
      return nextSession;
    });
  }, []);

  const logout = useCallback(() => {
    void logoutRequest();
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => {
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [logout]);

  const activeCompany = session?.user?.companies?.find((company) => company.id === session.activeCompanyId) ?? null;
  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    activeCompany,
    login,
    switchCompany,
    addCompany,
    logout
  }), [activeCompany, addCompany, login, logout, session, switchCompany]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components -- hook belongs to this private provider
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
