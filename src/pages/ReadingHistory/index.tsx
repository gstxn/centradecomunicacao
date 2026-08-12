import React from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2 } from 'lucide-react';
import styles from './ReadingHistory.module.css';

const historyList = [
  {
    id: 1,
    title: 'Campanha de vacinação 2025',
    author: 'Recursos Humanos',
    readAt: '10/05/2025 às 14:30',
    link: '/comunicados/3'
  },
  {
    id: 2,
    title: 'Manutenção programada no sistema iBlood',
    author: 'Tecnologia da Informação',
    readAt: '08/05/2025 às 09:15',
    link: '/comunicados/4'
  },
  {
    id: 3,
    title: 'Protocolo de higienização de bancadas',
    author: 'Qualidade',
    readAt: '05/05/2025 às 16:45',
    link: '/comunicados'
  }
];

export const ReadingHistory: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Minhas Leituras</h1>
          <p className={styles.subtitle}>Histórico de comunicados que você já confirmou ciência.</p>
        </div>
        
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={18} />
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Buscar no histórico..." 
          />
        </div>
      </div>

      <div className={styles.timeline}>
        {historyList.map(item => (
          <div key={item.id} className={styles.historyItem}>
            <div className={styles.iconWrapper}>
              <CheckCircle2 size={24} />
            </div>
            
            <Link to={item.link} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <span className={styles.cardAuthor}>Publicado por: {item.author}</span>
                </div>
                <div className={styles.readDate}>
                  <CheckCircle2 size={14} />
                  Lido em {item.readAt}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
