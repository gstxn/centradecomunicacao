import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Headphones, LifeBuoy, Send, TicketCheck } from 'lucide-react';
import styles from './Support.module.css';

export type TicketStatus = 'Aberto' | 'Em andamento' | 'Resolvido' | 'Fechado';

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  createdAt: string;
  status: TicketStatus;
  author?: string;
  assignee?: string;
  description?: string;
}

const STORAGE_KEY = 'central-comunicacao:tickets:v2';

const loadTickets = (): Ticket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Ticket[] : [];
  } catch {
    return [];
  }
};

export const Support: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Acesso e senha');
  const [priority, setPriority] = useState('Normal');
  const [description, setDescription] = useState('');
  const [createdId, setCreatedId] = useState('');

  const openCount = useMemo(() => tickets.filter((ticket) => ticket.status === 'Aberto').length, [tickets]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const id = `CH-${String(Date.now()).slice(-6)}`;
    const nextTicket: Ticket = {
      id,
      subject: subject.trim(),
      category,
      priority,
      status: 'Aberto',
      createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      author: 'Você', // default author since we don't have auth injected here directly
      assignee: 'Não atribuído',
      description: description.trim()
    };
    const nextTickets = [nextTicket, ...tickets];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
    setTickets(nextTickets);
    setSubject('');
    setDescription('');
    setPriority('Normal');
    setCreatedId(id);
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}><LifeBuoy size={16} aria-hidden="true" /> Central de suporte</span>
          <h1>Como podemos ajudar?</h1>
          <p>Abra um chamado para a equipe responsável e acompanhe o protocolo por aqui.</p>
        </div>
        <div className={styles.serviceBadge}>
          <Headphones size={24} aria-hidden="true" />
          <div><strong>Atendimento interno</strong><span>Seg–Sex, 8h às 18h</span></div>
        </div>
      </header>

      <div className={styles.stats}>
        <div><TicketCheck aria-hidden="true" /><span><strong>{openCount}</strong> chamados abertos</span></div>
        <div><Clock3 aria-hidden="true" /><span><strong>4h úteis</strong> resposta estimada</span></div>
        <div><CheckCircle2 aria-hidden="true" /><span><strong>Protocolo</strong> salvo neste dispositivo</span></div>
      </div>

      {createdId && (
        <div className={styles.success} role="status">
          <CheckCircle2 aria-hidden="true" />
          <div><strong>Chamado {createdId} aberto com sucesso.</strong><span>A equipe responsável recebeu sua solicitação.</span></div>
          <button type="button" onClick={() => setCreatedId('')} aria-label="Fechar confirmação">×</button>
        </div>
      )}

      <div className={styles.contentGrid}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.cardTitle}><Send size={20} aria-hidden="true" /><div><h2>Novo chamado</h2><p>Descreva o problema com o máximo de contexto.</p></div></div>
          <div className={styles.formGroup}>
            <label htmlFor="ticket-subject">Assunto</label>
            <input id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: Não consigo acessar um documento" required minLength={5} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ticket-category">Categoria</label>
              <select id="ticket-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Acesso e senha</option><option>Comunicados</option><option>Documentos</option><option>Erro no sistema</option><option>Outros</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="ticket-priority">Prioridade</label>
              <select id="ticket-priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option>Normal</option><option>Alta</option><option>Crítica</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="ticket-description">Descrição</label>
            <textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Informe o que aconteceu, em qual tela e o que você já tentou." required minLength={15} rows={7} />
          </div>
          <button className={styles.submitButton} type="submit"><Send size={17} aria-hidden="true" /> Abrir chamado</button>
        </form>

        <aside className={styles.historyCard}>
          <div className={styles.cardTitle}><TicketCheck size={20} aria-hidden="true" /><div><h2>Meus chamados</h2><p>Protocolos recentes neste dispositivo.</p></div></div>
          {tickets.length === 0 ? <div className={styles.empty}><LifeBuoy size={32} aria-hidden="true" /><p>Nenhum chamado aberto ainda.</p></div> : (
            <div className={styles.ticketList}>{tickets.slice(0, 5).map((ticket) => (
              <article key={ticket.id} className={styles.ticketItem}>
                <div className={styles.ticketTop}><strong>{ticket.id}</strong><span>{ticket.status}</span></div>
                <h3>{ticket.subject}</h3>
                <p>{ticket.category} • {ticket.priority}</p><small>{ticket.createdAt}</small>
              </article>
            ))}</div>
          )}
        </aside>
      </div>
    </div>
  );
};
