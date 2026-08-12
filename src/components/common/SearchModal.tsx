import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, HelpCircle, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComunicados } from '../../context/ComunicadosContext';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { comunicados } = useComunicados();

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return comunicados.filter((item) => !normalized || [item.title, item.category, item.author, item.department]
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalized))).slice(0, 6);
  }, [comunicados, query]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="search-title">
        <h2 id="search-title" className="sr-only">Busca global</h2>
        <div className={styles.searchHeader}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <label htmlFor="global-search" className="sr-only">Buscar comunicados</label>
          <input id="global-search" ref={inputRef} type="search" className={styles.searchInput}
            placeholder="Pesquise por título, categoria ou setor..." value={query}
            onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar busca">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.resultsArea} aria-live="polite">
          <div className={styles.sectionTitle}>{query ? `${results.length} resultado(s)` : 'Comunicados recentes'}</div>
          <div className={styles.resultList}>
            {results.map((item) => (
              <button key={item.id} type="button" className={styles.resultItem} onClick={() => handleNavigate(`/comunicados/${item.id}`)}>
                <div className={styles.resultIcon}><FileText size={16} aria-hidden="true" /></div>
                <div className={styles.resultContent}>
                  <div className={styles.resultTitle}>{item.title}</div>
                  <div className={styles.resultMeta}>{item.category} • {item.department}</div>
                </div>
              </button>
            ))}
            {results.length === 0 && <p className={styles.emptyState}>Nenhum comunicado encontrado.</p>}
            <button type="button" className={styles.resultItem} onClick={() => handleNavigate('/conhecimento')}>
              <div className={styles.resultIcon}><HelpCircle size={16} aria-hidden="true" /></div>
              <div className={styles.resultContent}>
                <div className={styles.resultTitle}>Consultar o Portal do Conhecimento</div>
                <div className={styles.resultMeta}>Perguntas frequentes e orientações</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
