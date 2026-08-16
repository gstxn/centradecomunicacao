import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react';
import { useComunicados, type Comunicado } from '../../context/ComunicadosContext';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { comunicados, unreadCount, markAsRead, markAllAsRead } = useComunicados();
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Click Outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredNotices = useMemo(() => {
    return comunicados.filter((item) => {
      if (filter === 'unread') return !item.read;
      if (filter === 'urgent') return item.type === 'Urgente';
      return true;
    });
  }, [comunicados, filter]);

  if (!isOpen) return null;

  const handleOpenNotice = (noticeId: string) => {
    onClose();
    navigate(`/comunicados/${noticeId}`);
  };

  const handleGoToPendencias = () => {
    onClose();
    navigate('/pendencias');
  };

  const handleGoToLeituras = () => {
    onClose();
    navigate('/leituras');
  };

  const renderTypeBadge = (type: Comunicado['type']) => {
    switch (type) {
      case 'Urgente':
        return (
          <span className={`${styles.typeBadge} ${styles.urgent}`}>
            <AlertTriangle size={10} /> Urgente
          </span>
        );
      case 'Atualização':
        return (
          <span className={`${styles.typeBadge} ${styles.update}`}>
            <Clock size={10} /> Atualização
          </span>
        );
      default:
        return (
          <span className={`${styles.typeBadge} ${styles.informative}`}>
            <MessageSquare size={10} /> Informativo
          </span>
        );
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      role="dialog"
      aria-label="Painel de notificações e comunicados"
    >
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h3>Notificações</h3>
          {unreadCount > 0 && <span className={styles.countBadge}>{unreadCount} novas</span>}
        </div>
        <button
          type="button"
          className={styles.markAllButton}
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0}
          title="Marcar todos os comunicados como lidos"
        >
          <CheckCheck size={14} />
          <span>Marcar todas como lidas</span>
        </button>
      </header>

      <div className={styles.filters}>
        <button
          type="button"
          className={`${styles.filterChip} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({comunicados.length})
        </button>
        <button
          type="button"
          className={`${styles.filterChip} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Não lidas ({unreadCount})
        </button>
        <button
          type="button"
          className={`${styles.filterChip} ${filter === 'urgent' ? styles.active : ''}`}
          onClick={() => setFilter('urgent')}
        >
          Urgentes ({comunicados.filter((c) => c.type === 'Urgente').length})
        </button>
      </div>

      <div className={styles.list}>
        {filteredNotices.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={32} className={styles.emptyIcon} />
            <span className={styles.emptyTitle}>Tudo em dia!</span>
            <p className={styles.emptyDesc}>
              {filter === 'unread'
                ? 'Você já confirmou ciência de todos os comunicados.'
                : 'Nenhum comunicado encontrado nesta categoria.'}
            </p>
          </div>
        ) : (
          filteredNotices.map((item) => (
            <div
              key={item.id}
              className={`${styles.item} ${!item.read ? styles.unread : ''}`}
            >
              {!item.read && <span className={styles.unreadDot} title="Pendente de leitura" />}
              <button
                type="button"
                className={styles.itemMain}
                onClick={() => handleOpenNotice(item.id)}
                aria-label={`Abrir comunicado: ${item.title}`}
              >
                <div className={styles.itemTop}>
                  {renderTypeBadge(item.type)}
                  <span className={styles.dept}>{item.department}</span>
                </div>
                <h4 className={styles.itemTitle}>{item.title}</h4>
                <div className={styles.itemMeta}>
                  <span>{item.date}</span>
                  <span>•</span>
                  <span>{item.author}</span>
                </div>
              </button>

              <div className={styles.itemActions}>
                {!item.read && (
                  <button
                    type="button"
                    className={styles.checkButton}
                    onClick={() => void markAsRead(item.id)}
                    title="Confirmar ciência agora"
                    aria-label="Confirmar ciência deste comunicado"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.footerLink}
          onClick={handleGoToLeituras}
        >
          <BookOpen size={12} /> Minhas leituras
        </button>
        <button
          type="button"
          className={styles.primaryFooterLink}
          onClick={handleGoToPendencias}
        >
          Ver pendências <ArrowRight size={12} />
        </button>
      </footer>
    </div>
  );
};
