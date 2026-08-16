import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, BookOpen } from 'lucide-react';
import styles from './ReadingHistory.module.css';
import { useComunicados } from '../../context/ComunicadosContext';

export const ReadingHistory: React.FC = () => {
  const { comunicados } = useComunicados();
  const [searchQuery, setSearchQuery] = useState('');

  const readList = useMemo(() => {
    return comunicados.filter((item) => item.read);
  }, [comunicados]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return readList;

    return readList.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [readList, searchQuery]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Minhas Leituras</h1>
          <p className={styles.subtitle}>
            Histórico de comunicados e diretrizes que você já confirmou ciência.
          </p>
        </div>

        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar no histórico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar no histórico de leituras"
          />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Nenhuma leitura registrada</h2>
          <p className={styles.emptyDesc}>
            {readList.length === 0
              ? 'Você ainda não confirmou a leitura de nenhum comunicado.'
              : 'Nenhum item encontrado com o termo pesquisado.'}
          </p>
          <Link to="/pendencias" className={styles.linkButton}>
            Ver comunicados pendentes
          </Link>
        </div>
      ) : (
        <div className={styles.timeline}>
          {filteredHistory.map((item) => (
            <div key={item.id} className={styles.historyItem}>
              <div className={styles.iconWrapper}>
                <CheckCircle2 size={24} />
              </div>

              <Link to={`/comunicados/${item.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <span className={styles.cardAuthor}>
                      {item.department} • Publicado por: {item.author}
                    </span>
                  </div>
                  <div className={styles.readDate}>
                    <CheckCircle2 size={14} />
                    {item.readAt ? `Lido em ${item.readAt}` : `Ciência registrada`}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
