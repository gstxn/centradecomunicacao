import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Tag, User, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import styles from './Pendencias.module.css';

const pendenciasList: Array<any> = [];

export const Pendencias: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Minhas Pendências</h1>
          <p className={styles.subtitle}>Ações obrigatórias e comunicados que aguardam sua leitura.</p>
        </div>
        <div className={styles.filters}>
          <select className={styles.selectBox}>
            <option>Todas as Pendências</option>
            <option>Atrasadas</option>
            <option>No prazo</option>
          </select>
        </div>
      </div>

      {pendenciasList.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h2>Tudo em dia!</h2>
          <p>Você não possui nenhuma pendência de leitura no momento.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {pendenciasList.map(item => (
            <div key={item.id} className={`${styles.card} ${styles[item.status]}`}>
              
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <span className={`${styles.badge} ${styles[item.status]}`}>
                    {item.status === 'danger' && <AlertTriangle size={12} />}
                    {item.status === 'warning' && <Clock size={12} />}
                    {item.dueDate}
                  </span>
                </div>
                
                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}><Tag size={14} /> {item.type}</span>
                  <span className={styles.metaItem}><User size={14} /> {item.author}</span>
                </div>
              </div>

              <Link to={item.link} className={styles.actionButton}>
                {item.actionText}
                <ArrowRight size={18} />
              </Link>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
