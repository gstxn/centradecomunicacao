import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import styles from './Calendar.module.css';

const agendaData = [
  {
    date: { day: '12', weekday: 'Terça', month: 'Maio' },
    events: [
      {
        id: 1,
        title: 'Treinamento: Nova rotina de cadastro',
        time: '14:00 - 16:00',
        location: 'Online (Teams)',
        audience: 'Recepção',
        description: 'Treinamento obrigatório para todas as recepcionistas sobre as mudanças no cadastro de convênios.',
        color: '#8B5CF6' // Purple
      }
    ]
  },
  {
    date: { day: '15', weekday: 'Sexta', month: 'Maio' },
    events: [
      {
        id: 2,
        title: 'Reunião de alinhamento operacional',
        time: '09:00 - 10:30',
        location: 'Sala 3 (Matriz)',
        audience: 'Gestores',
        description: 'Alinhamento mensal de metas e indicadores.',
        color: '#F59E0B' // Orange
      },
      {
        id: 3,
        title: 'Manutenção de Infraestrutura',
        time: '23:00 - 04:00',
        location: 'Servidores Matriz',
        audience: 'Tecnologia',
        description: 'Parada programada para troca de switches core.',
        color: '#6B7280' // Gray
      }
    ]
  },
  {
    date: { day: '20', weekday: 'Quarta', month: 'Maio' },
    events: [
      {
        id: 4,
        title: 'Auditoria Interna de Qualidade',
        time: '08:00 - 18:00',
        location: 'Unidade SP - Centro',
        audience: 'Toda a unidade',
        description: 'Preparação para recertificação ONA.',
        color: '#10B981' // Green
      }
    ]
  }
];

export const CalendarPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Calendário Corporativo</h1>
        <div className={styles.controls}>
          <select className={styles.selectBox}>
            <option>Maio 2025</option>
            <option>Junho 2025</option>
            <option>Julho 2025</option>
          </select>
          <select className={styles.selectBox}>
            <option>Todos os tipos</option>
            <option>Treinamentos</option>
            <option>Manutenções</option>
            <option>Reuniões</option>
          </select>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.agendaList}>
          {agendaData.map((group, index) => (
            <div key={index} className={styles.agendaGroup}>
              
              <div className={styles.dateCol}>
                <span className={styles.day}>{group.date.day}</span>
                <span className={styles.monthDay}>{group.date.weekday}</span>
              </div>
              
              <div className={styles.eventsCol}>
                {group.events.map(event => (
                  <div key={event.id} className={styles.eventCard}>
                    <div className={styles.eventColor} style={{backgroundColor: event.color}}></div>
                    <div className={styles.eventContent}>
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      <div className={styles.eventMeta}>
                        <span className={styles.metaItem}><Clock size={14} /> {event.time}</span>
                        <span className={styles.metaItem}><MapPin size={14} /> {event.location}</span>
                        <span className={styles.metaItem}><Users size={14} /> {event.audience}</span>
                      </div>
                      <p className={styles.eventDesc}>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
