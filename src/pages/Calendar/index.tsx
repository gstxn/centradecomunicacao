import React, { useMemo, useState, useEffect } from 'react';
import { Clock, MapPin, Users, Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import styles from './Calendar.module.css';
import { useAuth } from '../../context/AuthContext';
import { getCalendarEvents, createCalendarEventRequest, type ApiCalendarEvent } from '../../services/api';

interface CalendarEvent {
  id: string | number;
  title: string;
  type: string;
  month: string;
  day: string;
  weekday: string;
  time: string;
  location: string;
  audience: string;
  description: string;
  color: string;
}

const initialEvents: CalendarEvent[] = [
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
  }
];

export const CalendarPage: React.FC = () => {
  const { session, user, activeCompany } = useAuth();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedMonth, setSelectedMonth] = useState('Todos os meses');
  const [selectedType, setSelectedType] = useState('Todos');

  // Modal de novo evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState('Treinamentos');
  const [newAudience, setNewAudience] = useState('Geral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageEvents = user?.isSaaSAdmin || ['owner', 'admin', 'publisher'].includes(activeCompany?.membership?.role || '');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getCalendarEvents(session)
      .then((res) => {
        if (cancelled) return;
        if (res.data && res.data.length > 0) {
          setAllEvents(res.data.map((e: ApiCalendarEvent) => {
            const dateObj = new Date(e.eventDate);
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return {
              id: e.id,
              title: e.title,
              type: 'Eventos',
              month: `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
              day: String(dateObj.getDate()).padStart(2, '0'),
              weekday: weekdays[dateObj.getDay()],
              time: '09:00 - 18:00',
              location: e.location || 'Local a definir',
              audience: 'Toda a empresa',
              description: 'Evento corporativo oficial programado.',
              color: e.color || '#3b82f6'
            };
          }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session, activeCompany?.id]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    setIsSubmitting(true);
    try {
      if (session) {
        const res = await createCalendarEventRequest(session, {
          title: newTitle.trim(),
          eventDate: new Date(newDate).toISOString(),
          location: newLocation.trim() || 'Online / Matriz',
          color: '#3b82f6'
        });

        const dateObj = new Date(res.data.eventDate);
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const created: CalendarEvent = {
          id: res.data.id,
          title: res.data.title,
          type: newType,
          month: `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
          day: String(dateObj.getDate()).padStart(2, '0'),
          weekday: weekdays[dateObj.getDay()],
          time: 'Horário comercial',
          location: res.data.location || 'Local a definir',
          audience: newAudience,
          description: 'Evento corporativo registrado no sistema.',
          color: res.data.color || '#3b82f6'
        };
        setAllEvents([...allEvents, created]);
      } else {
        const dateObj = new Date(newDate);
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const created: CalendarEvent = {
          id: `cal-${Date.now()}`,
          title: newTitle.trim(),
          type: newType,
          month: `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
          day: String(dateObj.getDate()).padStart(2, '0'),
          weekday: weekdays[dateObj.getDay()],
          time: 'Horário comercial',
          location: newLocation.trim() || 'Online / Matriz',
          audience: newAudience,
          description: 'Evento corporativo registrado no sistema.',
          color: '#3b82f6'
        };
        setAllEvents([...allEvents, created]);
      }

      setNewTitle('');
      setNewDate('');
      setNewLocation('');
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao agendar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesMonth = selectedMonth === 'Todos os meses' || event.month === selectedMonth;
      const matchesType = selectedType === 'Todos' || event.type === selectedType;
      return matchesMonth && matchesType;
    });
  }, [allEvents, selectedMonth, selectedType]);

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
          {canManageEvents && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                background: 'var(--color-primary-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Agendar Evento
            </button>
          )}
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

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1e29)',
            border: '1px solid var(--border-color, #2d3345)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%',
            color: 'var(--text-main, #fff)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Agendar Novo Evento Corporativo</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Título do Evento / Reunião</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Treinamento de Biossegurança"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Data do Evento</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Tipo</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  >
                    <option value="Treinamentos">Treinamentos</option>
                    <option value="Reuniões">Reuniões</option>
                    <option value="Manutenções">Manutenções</option>
                    <option value="Auditorias">Auditorias</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Local / Plataforma</label>
                <input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Auditório Principal ou Online (Teams)"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Público-Alvo</label>
                <input
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  placeholder="Ex: Toda a empresa, TI, Recepção"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: 'var(--color-primary-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {isSubmitting ? 'Salvando...' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
