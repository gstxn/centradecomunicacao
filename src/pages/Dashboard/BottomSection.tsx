import React from 'react';
import { ChevronRight, FileText, Server, Shield, FileBarChart } from 'lucide-react';
import styles from './BottomSection.module.css';
import { latestUpdates, calendarEvents } from '../../data/mockData';
import { Link } from 'react-router-dom';

export const BottomSection: React.FC = () => {

  const getUpdateIcon = (type: string, colorClass: string) => {
    let Icon = FileText;
    if (type === 'server') Icon = Server;
    if (type === 'shield') Icon = Shield;
    if (type === 'report') Icon = FileBarChart;

    return (
      <div className={`${styles.iconWrapper} ${styles[`bg-${colorClass}`]}`}>
        <Icon size={18} />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      
      {/* Latest Updates */}
      <section className={styles.updatesSection}>
        <div className={styles.header}>
          <h3 className={styles.title}>Últimas atualizações</h3>
          <Link to="/comunicados" className={styles.link}>Ver todas</Link>
        </div>
        
        <div className={styles.list}>
          {latestUpdates.map(update => (
            <Link to="/comunicados" key={update.id} className={styles.item}>
              {getUpdateIcon(update.iconType, update.tagColor)}
              
              <div className={styles.itemContent}>
                <div className={styles.itemTitleWrapper}>
                  <span className={styles.itemTitle}>{update.title}</span>
                  <span className={`${styles.badge} ${styles[`bg-${update.tagColor}`]}`}>
                    {update.category}
                  </span>
                </div>
                <div className={styles.itemMeta}>
                  {update.department} • {update.date} • {update.target}
                </div>
              </div>
              
              <ChevronRight size={18} color="#9CA3AF" />
            </Link>
          ))}
        </div>
      </section>

      {/* Calendar */}
      <section className={styles.calendarSection}>
        <div className={styles.header}>
          <h3 className={styles.title}>Calendário</h3>
          <Link to="/calendario" className={styles.link}>Ver agenda</Link>
        </div>
        
        <div className={styles.calendarCard}>
          {calendarEvents.map(event => (
            <div key={event.id} className={styles.calItem}>
              <div className={styles.calDate}>
                <span className={styles.calDay}>{event.day}</span>
                <span className={styles.calMonth}>{event.month}</span>
              </div>
              
              <div className={styles.calContent}>
                <div className={styles.calTitle}>{event.title}</div>
                <div className={styles.calMeta}>{event.time} • {event.location}</div>
              </div>
              
              <div className={styles.calDot} style={{ backgroundColor: event.color }}></div>
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
};
