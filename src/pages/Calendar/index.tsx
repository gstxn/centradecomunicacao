import React, { useMemo, useState } from 'react';
import { Clock, MapPin, Users, Calendar as CalendarIcon } from 'lucide-react';
import styles from './Calendar.module.css';

interface CalendarEvent {
  id: number;
  title: string;
  type: 'Treinamentos' | 'Manutenções' | 'Reuniões' | 'Auditorias';
  month: string;
  day: string;
  weekday: string;
  time: string;
  location: string;
  audience: string;
  description: string;
  color: string;
}

const allEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'Treinamento: Nova rotina de cadastro e segurança 2FA',
    type: 'Treinamentos',
    month: 'Agosto 2026',
    day: '18',
    weekday: 'Terça',
    time: '14:00 - 16:00',
    location: 'Online (Teams)',
    audience: 'Recepção e TI',
    description: 'Treinamento obrigatório para todas as recepcionistas e operadores sobre as novas diretrizes de autenticação.',
    color: 'var(--color-purple)'
  },
  {
    id: 2,
    title: 'Reunião de Alinhamento de Indicadores - Q3',
    type: 'Reuniões',
    month: 'Agosto 2026',
    day: '21',
    weekday: 'Sexta',
    time: '09:00 - 10:30',
    location: 'Sala 3 (Matriz)',
    audience: 'Gestores e Coordenadores',
    description: 'Alinhamento mensal de metas, taxas de leitura de comunicados e índices de conformidade.',
    color: 'var(--color-warning)'
  },
  {
    id: 3,
    title: 'Manutenção Programada de Infraestrutura e Banco de Dados',
    type: 'Manutenções',
    month: 'Agosto 2026',
    day: '25',
    weekday: 'Terça',
    time: '23:00 - 04:00',
    location: 'Servidores Matriz',
    audience: 'Toda a empresa',
    description: 'Parada programada para aplicação de patches de segurança e backup geral dos sistemas.',
    color: 'var(--color-primary-accent)'
  },
  {
    id: 4,
    title: 'Auditoria Interna de Qualidade e Biossegurança',
    type: 'Auditorias',
    month: 'Agosto 2026',
    day: '28',
    weekday: 'Sexta',
    time: '08:00 - 18:00',
    location: 'Unidade Central',
    audience: 'Equipe de Qualidade e Laboratório',
    description: 'Preparação para renovação da certificação e verificação dos novos POPs cadastrados.',
    color: 'var(--color-success)'
  },
  {
    id: 5,
    title: 'Workshop de Boas Práticas no Atendimento Humanizado',
    type: 'Treinamentos',
    month: 'Setembro 2026',
    day: '04',
    weekday: 'Sexta',
    time: '10:00 - 12:00',
    location: 'Auditório Matriz',
    audience: 'Atendimento e Coleta',
    description: 'Aprimoramento de técnicas de acolhimento e comunicação não violenta no atendimento ao paciente.',
    color: 'var(--color-purple)'
  },
  {
    id: 6,
    title: 'Comitê Executivo de Gestão e Planejamento 2027',
    type: 'Reuniões',
    month: 'Setembro 2026',
    day: '15',
    weekday: 'Terça',
    time: '14:30 - 17:00',
    location: 'Sala da Diretoria',
    audience: 'Diretoria e Sócios',
    description: 'Apresentação de balanço e metas de expansão para as novas unidades.',
    color: 'var(--color-warning)'
  }
];

export const CalendarPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('Agosto 2026');
  const [selectedType, setSelectedType] = useState('Todos');

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesMonth = selectedMonth === 'Todos os meses' || event.month === selectedMonth;
      const matchesType = selectedType === 'Todos' || event.type === selectedType;
      return matchesMonth && matchesType;
    });
  }, [selectedMonth, selectedType]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const map = new Map<string, { day: string; weekday: string; events: CalendarEvent[] }>();
    filteredEvents.forEach((ev) => {
      const key = `${ev.month}-${ev.day}`;
      if (!map.has(key)) {
        map.set(key, { day: ev.day, weekday: ev.weekday, events: [] });
      }
      map.get(key)!.events.push(ev);
    });
    return Array.from(map.values());
  }, [filteredEvents]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendário Corporativo</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Acompanhe treinamentos, manutenções, reuniões e eventos oficiais.
          </p>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.selectBox}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filtrar por mês"
          >
            <option value="Agosto 2026">Agosto 2026</option>
            <option value="Setembro 2026">Setembro 2026</option>
            <option value="Todos os meses">Todos os meses</option>
          </select>
          <select
            className={styles.selectBox}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filtrar por tipo de evento"
          >
            <option value="Todos">Todos os tipos</option>
            <option value="Treinamentos">Treinamentos</option>
            <option value="Manutenções">Manutenções</option>
            <option value="Reuniões">Reuniões</option>
            <option value="Auditorias">Auditorias</option>
          </select>
        </div>
      </div>

      <div className={styles.contentCard}>
        {groupedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
            <CalendarIcon size={40} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>Nenhum evento encontrado</h3>
            <p style={{ fontSize: '0.9rem' }}>Tente selecionar outro mês ou categoria de evento.</p>
          </div>
        ) : (
          <div className={styles.agendaList}>
            {groupedEvents.map((group, index) => (
              <div key={index} className={styles.agendaGroup}>
                <div className={styles.dateCol}>
                  <span className={styles.day}>{group.day}</span>
                  <span className={styles.monthDay}>{group.weekday}</span>
                </div>

                <div className={styles.eventsCol}>
                  {group.events.map((event) => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventColor} style={{ backgroundColor: event.color }} />
                      <div className={styles.eventContent}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '0.25rem' }}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {event.type}
                          </span>
                        </div>
                        <div className={styles.eventMeta}>
                          <span className={styles.metaItem}>
                            <Clock size={14} /> {event.time}
                          </span>
                          <span className={styles.metaItem}>
                            <MapPin size={14} /> {event.location}
                          </span>
                          <span className={styles.metaItem}>
                            <Users size={14} /> {event.audience}
                          </span>
                        </div>
                        <p className={styles.eventDesc}>{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
