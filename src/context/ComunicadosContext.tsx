import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createNoticeRequest, getNotices, markNoticeReadRequest, type ApiNotice } from '../services/api';
import { useAuth } from './AuthContext';

export interface Comunicado {
  id: string;
  title: string;
  category: string;
  type: 'Urgente' | 'Atualização' | 'Informativo';
  date: string;
  author: string;
  department: string;
  read: boolean;
  readAt?: string;
  content?: string;
  attachments?: { name: string; size: string; type: string }[];
}

type NewNotice = Omit<Comunicado, 'id' | 'read' | 'date' | 'author' | 'department'>;

interface ComunicadosContextValue {
  comunicados: Comunicado[];
  unreadCount: number;
  urgentCount: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  addComunicado: (notice: NewNotice) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const Context = createContext<ComunicadosContextValue | undefined>(undefined);

const mapNotice = (n: ApiNotice): Comunicado => ({
  ...n,
  type: n.type === 'urgent' ? 'Urgente' : n.type === 'update' ? 'Atualização' : 'Informativo',
  date: new Intl.DateTimeFormat('pt-BR').format(new Date(n.createdAt)),
  readAt: n.readAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(n.readAt)) : undefined
});

export const ComunicadosProvider = ({ children }: { children: ReactNode }) => {
  const { session, activeCompany } = useAuth();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!session || !session.activeCompanyId) {
      setComunicados([]);
      return;
    }
    setLoading(true);
    try {
      const response = await getNotices(session);
      setComunicados(response.data.map(mapNotice));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar comunicados.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial fetch and fetch when active company changes
  useEffect(() => {
    void refresh();
  }, [refresh, activeCompany?.id]);

  // Periodic refresh (every 30s) and on window focus for live notification synchronization
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      void refresh();
    }, 30000);

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, session]);

  const addComunicado = useCallback(
    async (n: NewNotice) => {
      if (!session) throw new Error('Sessão ausente.');
      await createNoticeRequest(session, {
        title: n.title,
        category: n.category,
        type: n.type === 'Urgente' ? 'urgent' : n.type === 'Atualização' ? 'update' : 'informative',
        content: n.content ?? ''
      });
      await refresh();
    },
    [refresh, session]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (!session) return;
      // Optimistic update for immediate UI reactivity
      setComunicados((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                read: true,
                readAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
              }
            : c
        )
      );
      try {
        await markNoticeReadRequest(session, id);
      } catch {
        // Rollback or refresh on failure
        await refresh();
      }
    },
    [refresh, session]
  );

  const markAllAsRead = useCallback(async () => {
    if (!session) return;
    const unread = comunicados.filter((c) => !c.read);
    if (unread.length === 0) return;

    const nowFormatted = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    // Optimistic update
    setComunicados((prev) => prev.map((c) => ({ ...c, read: true, readAt: c.readAt ?? nowFormatted })));

    try {
      await Promise.all(unread.map((item) => markNoticeReadRequest(session, item.id)));
    } catch {
      await refresh();
    }
  }, [comunicados, refresh, session]);

  const unreadCount = useMemo(() => comunicados.filter((c) => !c.read).length, [comunicados]);
  const urgentCount = useMemo(() => comunicados.filter((c) => !c.read && c.type === 'Urgente').length, [comunicados]);

  const value = useMemo<ComunicadosContextValue>(
    () => ({
      comunicados,
      unreadCount,
      urgentCount,
      loading,
      error,
      refresh,
      addComunicado,
      markAsRead,
      markAllAsRead
    }),
    [comunicados, unreadCount, urgentCount, loading, error, refresh, addComunicado, markAsRead, markAllAsRead]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

// oxlint-disable-next-line react/only-export-components -- private provider hook
export const useComunicados = () => {
  const value = useContext(Context);
  if (!value) throw new Error('useComunicados must be used within ComunicadosProvider');
  return value;
};
