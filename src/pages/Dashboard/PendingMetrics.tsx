import React from 'react';
import { MessageSquare, Lock, Clock } from 'lucide-react';
import styles from './PendingMetrics.module.css';
import { metrics } from '../../data/mockData';
import { Link } from 'react-router-dom';

export const PendingMetrics: React.FC = () => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Pendências de leitura</h3>
      
      <div className={styles.grid}>
        
        {/* Card 1: Não lidos */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={`${styles.iconBox} ${styles.yellow}`}>
              <MessageSquare size={24} />
            </div>
            <div>
              <div className={styles.number}>{metrics.unread}</div>
              <div className={styles.text}>Comunicados<br/>não lidos</div>
            </div>
          </div>
          <div className={styles.cardBottom}>
            <Link to="/comunicados" className={styles.link}>Ver todos</Link>
          </div>
        </div>

        {/* Card 2: Obrigatórios */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={`${styles.iconBox} ${styles.orange}`}>
              <Lock size={24} />
            </div>
            <div>
              <div className={styles.number}>{metrics.mandatory}</div>
              <div className={styles.text}>Comunicados<br/>obrigatórios</div>
            </div>
          </div>
          <div className={styles.cardBottom}>
            <Link to="/pendencias" className={styles.link}>Ver todos</Link>
          </div>
        </div>

        {/* Card 3: Prazos */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={`${styles.iconBox} ${styles.red}`}>
              <Clock size={24} />
            </div>
            <div>
              <div className={styles.number}>{metrics.nearestDeadlineDays} <span style={{fontSize:'1rem'}}>dias</span></div>
              <div className={styles.text}>Prazo mais próximo</div>
              <span className={styles.urgentText}>Urgente: {metrics.nearestDeadlineDate}</span>
            </div>
          </div>
          <div className={styles.cardBottom}>
            <Link to="/pendencias" className={styles.link}>Ver prazos</Link>
          </div>
        </div>

        {/* Card 4: Progress */}
        <div className={`${styles.card} ${styles.progressCard}`}>
          <div className={styles.progressCircle}>
            <svg viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="30" className={styles.progressBg}></circle>
              <circle cx="35" cy="35" r="30" className={styles.progressValue}></circle>
            </svg>
            <div className={styles.progressTextValue}>{metrics.readingProgress}%</div>
          </div>
          <div>
            <div className={styles.progressLabel}>Leituras<br/>em dia</div>
            <Link to="/leituras" className={styles.link} style={{display: 'inline-block', marginTop: '0.5rem'}}>Acompanhar</Link>
          </div>
        </div>

      </div>
    </div>
  );
};
