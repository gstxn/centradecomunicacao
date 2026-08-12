import React from 'react';
import { ChevronRight, ShieldCheck, Database, Droplet, LayoutDashboard, LayoutGrid } from 'lucide-react';
import styles from './TopSection.module.css';
import { urgentNotice, quickAccess } from '../../data/mockData';
import { Link } from 'react-router-dom';

export const TopSection: React.FC = () => {
  // Map icons helper
  const getIcon = (name: string) => {
    switch (name) {
      case 'shield': return <ShieldCheck size={20} color="#2563EB" />;
      case 'shift': return <Database size={20} color="#10B981" />;
      case 'drop': return <Droplet size={20} color="#EF4444" />;
      case 'my': return <LayoutDashboard size={20} color="#8B5CF6" />;
      default: return <LayoutGrid size={20} color="#6B7280" />;
    }
  };

  return (
    <div className={styles.container}>
      
      {/* Hero Banner */}
      {urgentNotice && (
        <section className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <span className={styles.heroTag}>{urgentNotice.tag}</span>
            <h2 className={styles.heroTitle}>{urgentNotice.title}</h2>
            <p className={styles.heroDesc}>{urgentNotice.description}</p>
            
            <Link to="/comunicados/1" className={styles.heroButton}>
              <span>Ver comunicado</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
          
          <img src={urgentNotice.imageUrl} alt="Edifícios corporativos vistos de baixo" className={styles.heroImage} />
          
          <div className={styles.dots}>
            <div className={`${styles.dot} ${styles.active}`}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        </section>
      )}

      {/* Quick Access */}
      <section className={styles.quickAccess}>
        <div className={styles.qaHeader}>
          <h3 className={styles.qaTitle}>Acesso rápido</h3>
          <Link to="/links" className={styles.qaEdit}>Gerenciar</Link>
        </div>
        
        <div className={styles.qaGrid}>
          {quickAccess.map((item) => (
            <Link key={item.id} to={item.url} className={styles.qaItem}>
              <div className={styles.iconWrapper}>
                {getIcon(item.icon)}
              </div>
              <span>{item.name}</span>
            </Link>
          ))}
          
          <Link to="/links" className={`${styles.qaItem} ${styles.all}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutGrid size={20} color="#6B7280" />
              <span>Todos os sistemas</span>
            </div>
            <ChevronRight size={16} color="#6B7280" />
          </Link>
        </div>
      </section>

    </div>
  );
};
