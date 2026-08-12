import React, { createContext, useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';

export interface Comunicado {
  id: number;
  title: string;
  category: string;
  type: string; // Urgente, Informativo, etc
  date: string;
  author: string;
  department: string;
  read: boolean;
  readAt?: string;
  content?: string;
  attachments?: { name: string; size: string; type: string }[];
}

interface ComunicadosContextType {
  comunicados: Comunicado[];
  addComunicado: (comunicado: Omit<Comunicado, 'id' | 'read' | 'date'>) => void;
  markAsRead: (id: number) => void;
  deleteComunicado: (id: number) => void;
}

const initialMockData: Comunicado[] = [];

const ComunicadosContext = createContext<ComunicadosContextType | undefined>(undefined);

const STORAGE_KEY = 'central-comunicacao:comunicados:v2';

const loadComunicados = (): Comunicado[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Comunicado[] : initialMockData;
  } catch {
    return initialMockData;
  }
};

export const ComunicadosProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [comunicados, setComunicados] = useState<Comunicado[]>(loadComunicados);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comunicados));
  }, [comunicados]);

  const addComunicado = (newCom: Omit<Comunicado, 'id' | 'read' | 'date'>) => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    const newEntry: Comunicado = {
      ...newCom,
      id: comunicados.length > 0 ? Math.max(...comunicados.map(c => c.id)) + 1 : 1,
      read: false,
      date: formattedDate
    };
    
    // Adiciona no topo da lista
    setComunicados(prev => [newEntry, ...prev]);
  };

  const markAsRead = (id: number) => {
    setComunicados(prev => prev.map(c => c.id === id ? {
      ...c,
      read: true,
      readAt: c.readAt ?? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
    } : c));
  };

  const deleteComunicado = (id: number) => {
    setComunicados(prev => prev.filter(c => c.id !== id));
  };

  return (
    <ComunicadosContext.Provider value={{ comunicados, addComunicado, markAsRead, deleteComunicado }}>
      {children}
    </ComunicadosContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components -- hook and provider intentionally share the private context
export const useComunicados = () => {
  const context = useContext(ComunicadosContext);
  if (context === undefined) {
    throw new Error('useComunicados must be used within a ComunicadosProvider');
  }
  return context;
};
