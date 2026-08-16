import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Tag,
  User,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Search,
  Check,
  CheckCheck,
  BookOpen
} from 'lucide-react';
import styles from './Pendencias.module.css';
import { useComunicados, type Comunicado } from '../../context/ComunicadosContext';

export const Pendencias: React.FC = () => {
  const { comunicados, markAsRead, markAllAsRead } = useComunicados();
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadList = useMemo(() => {
    return comunicados.filter((item) => !item.read);
  }, [comunicados]);

  const filteredPendencias = useMemo(() => {
    return unreadList.filter((item) => {
      const matchesFilter =
        filterType === 'all'
          ? true
          : filterType === 'urgent'
          ? item.type === 'Urgente'
          : item.type !== 'Urgente';

      const normalized = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.department.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized) ||
        item.author.toLowerCase().includes(normalized);

      return matchesFilter && matchesSearch;
    });
  }, [unreadList, filterType, searchQuery]);

  const getStatusClass = (type: Comunicado['type']) => {
    if (type === 'Urgente') return styles.danger;
    if (type === 'Atualização') return styles.warning;
    return styles.info;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Minhas Pendências</h1>
          <p className={styles.subtitle}>
            {unreadList.length === 0
              ? 'Você está em dia com todas as confirmações de leitura obrigatórias.'
              : `${unreadList.length} ${
                  unreadList.length === 1 ? 'comunicado aguarda' : 'comunicados aguardam'
                } sua confirmação de leitura.`}
          </p>
        </div>

        {unreadList.length > 0 && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.bulkButton}
              onClick={() => void markAllAsRead()}
              title="Confirmar ciência de todas as pendências de uma só vez"
            >
              <CheckCheck size={16} />
              <span>Confirmar ciência de todas</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar nas pendências..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar pendências"
          />
        </div>

        <div className={styles.filters}>
          <select
            className={styles.selectBox}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filtrar tipo de pendência"
          >
            <option value="all">Todas ({unreadList.length})</option>
            <option value="urgent">
              Urgentes ({unreadList.filter((c) => c.type === 'Urgente').length})
            </option>
            <option value="standard">
              Informativos / Atualizações ({unreadList.filter((c) => c.type !== 'Urgente').length})
            </option>
          </select>
        </div>
      </div>

      {filteredPendencias.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Tudo em dia!</h2>
          <p className={styles.emptyDesc}>
            {unreadList.length === 0
              ? 'Você não possui nenhuma pendência de leitura no momento.'
              : 'Nenhuma pendência encontrada para o filtro selecionado.'}
          </p>
          <div className={styles.emptyActions}>
            <Link to="/comunicados" className={styles.linkButton}>
              Ver mural de comunicados
            </Link>
            <Link to="/leituras" className={styles.linkButton}>
              <BookOpen size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Ver histórico de leituras
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredPendencias.map((item) => {
            const statusClass = getStatusClass(item.type);
            return (
              <div key={item.id} className={`${styles.card} ${statusClass}`}>
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <span className={`${styles.badge} ${statusClass}`}>
                      {item.type === 'Urgente' && <AlertTriangle size={12} />}
                      {item.type === 'Atualização' && <Clock size={12} />}
                      {item.type}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <Tag size={14} /> {item.category} • {item.department}
                    </span>
                    <span className={styles.metaItem}>
                      <User size={14} /> {item.author}
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={14} /> Publicado em {item.date}
                    </span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.quickCheckButton}
                    onClick={() => void markAsRead(item.id)}
                    title="Confirmar ciência diretamente"
                  >
                    <Check size={15} />
                    <span>Confirmar ciência</span>
                  </button>

                  <Link to={`/comunicados/${item.id}`} className={styles.actionButton}>
                    <span>Ler e confirmar</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
