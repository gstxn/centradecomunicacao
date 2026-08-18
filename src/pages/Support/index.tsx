import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Clock3, Headphones, LifeBuoy, Send, TicketCheck } from 'lucide-react';
import styles from './Support.module.css';
import { useAuth } from '../../context/AuthContext';
import { getTickets, createTicketRequest } from '../../services/api';

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

const loadLocalTickets = (): Ticket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
};

export const Support: React.FC = () => {
  const { session, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(loadLocalTickets);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Acesso e senha');
  const [priority, setPriority] = useState('Normal');
  const [description, setDescription] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getTickets(session)
      .then((res) => {
        if (cancelled) return;
        const apiMapped: Ticket[] = res.data.map((t) => ({
          id: t.ticketCode || t.id,
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status as TicketStatus,
          createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.createdAt)),
          author: t.authorName,
          assignee: t.assigneeName,
          description: t.description
        }));
        setTickets(apiMapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiMapped));
      })
      .catch(() => {
        // Usa tickets do localStorage silenciosamente
      });
    return () => { cancelled = true; };
  }, [session]);

  const openCount = useMemo(() => tickets.filter((ticket) => ticket.status === 'Aberto').length, [tickets]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const codeFallback = `CH-${String(Date.now()).slice(-6)}`;

    try {
      if (session) {
        const res = await createTicketRequest(session, {
          subject: subject.trim(),
          category,
          priority,
          description: description.trim()
        });

        const createdTicket: Ticket = {
          id: res.data.ticketCode || res.data.id,
          subject: res.data.subject,
          category: res.data.category,
          priority: res.data.priority,
          status: res.data.status as TicketStatus,
          createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(res.data.createdAt)),
          author: res.data.authorName || user?.name || 'Você',
          assignee: res.data.assigneeName || 'Não atribuído',
          description: res.data.description
        };

        const nextTickets = [createdTicket, ...tickets];
        setTickets(nextTickets);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
        setCreatedId(createdTicket.id);
      } else {
        const nextTicket: Ticket = {
          id: codeFallback,
          subject: subject.trim(),
          category,
          priority,
          status: 'Aberto',
          createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
          author: user?.name || 'Você',
          assignee: 'Não atribuído',
          description: description.trim()
        };
        const nextTickets = [nextTicket, ...tickets];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
        setTickets(nextTickets);
        setCreatedId(codeFallback);
      }

      setSubject('');
      setDescription('');
      setPriority('Normal');
    } catch {
      // Fallback local se a API estiver offline
      const nextTicket: Ticket = {
        id: codeFallback,
        subject: subject.trim(),
        category,
        priority,
        status: 'Aberto',
        createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
        author: user?.name || 'Você',
        assignee: 'Não atribuído',
        description: description.trim()
      };
      const nextTickets = [nextTicket, ...tickets];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
      setTickets(nextTickets);
      setCreatedId(codeFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}><LifeBuoy size={16} aria-hidden="true" /> Central de suporte</span>
          <h1>Como podemos ajudar?</h1>
          <p>Abra um chamado para dúvidas de sistemas (SHIFT, TI), comunicação ou orientações internas.</p>
        </div>
        <div className={styles.serviceBadge}>
          <Headphones size={24} aria-hidden="true" />
          <div><strong>Atendimento interno</strong><span>Seg–Sex, 8h às 18h</span></div>
        </div>
      </header>

      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 110, 245, 0.08) 0%, rgba(13, 202, 240, 0.04) 100%)',
        border: '1px solid rgba(20, 110, 245, 0.2)',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        color: 'var(--text-main)',
        lineHeight: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <strong>Atenção ao fluxo oficial de solicitações:</strong>
          <div>Para <em>manutenção predial, infraestrutura, registro de ocorrências, não conformidades ou planos de ação</em>, o canal obrigatório permanece sendo o <strong>Acredite.se</strong>.</div>
        </div>
        <a
          href="https://acredite.se"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-primary-accent)',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            whiteSpace: 'nowrap'
          }}
        >
          Acessar Acredite.se →
        </a>
      </div>

      <div className={styles.stats}>
        <div><TicketCheck aria-hidden="true" /><span><strong>{openCount}</strong> chamados abertos</span></div>
        <div><Clock3 aria-hidden="true" /><span><strong>4h úteis</strong> resposta estimada</span></div>
        <div><CheckCircle2 aria-hidden="true" /><span><strong>Protocolo</strong> registrado na empresa</span></div>
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
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            <Send size={17} aria-hidden="true" /> {isSubmitting ? 'Enviando chamado...' : 'Abrir chamado'}
          </button>
        </form>

        <aside className={styles.historyCard}>
          <div className={styles.cardTitle}><TicketCheck size={20} aria-hidden="true" /><div><h2>Meus chamados</h2><p>Protocolos recentes da empresa.</p></div></div>
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

