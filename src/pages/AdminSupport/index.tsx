import React, { useState, useMemo, useEffect } from 'react';
import { Headphones, Search, Filter, AlertTriangle, Clock, CheckCircle2, MoreVertical, TicketCheck, Users } from 'lucide-react';
import styles from './AdminSupport.module.css';
import type { Ticket, TicketStatus } from '../Support';

const STORAGE_KEY = 'central-comunicacao:tickets:v2';

export const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ativos' | 'arquivados'>('ativos');
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTickets(JSON.parse(raw));
    } catch {}
  }, []);

  const saveTickets = (updatedTickets: Ticket[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
  };

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    const updated = tickets.map(t => t.id === id ? { ...t, status: newStatus } : t);
    saveTickets(updated);
  };

  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    
    if (viewMode === 'ativos') {
      filtered = filtered.filter(t => t.status === 'Aberto' || t.status === 'Em andamento');
    } else {
      filtered = filtered.filter(t => t.status === 'Resolvido' || t.status === 'Fechado');
    }
    
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (categoryFilter !== 'Todas') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (query) {
      const normalizedQuery = query.toLowerCase();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(normalizedQuery) ||
        t.subject.toLowerCase().includes(normalizedQuery) ||
        (t.author && t.author.toLowerCase().includes(normalizedQuery))
      );
    }
    
    return filtered;
  }, [tickets, query, statusFilter, categoryFilter, viewMode]);

  const stats = useMemo(() => {
    return {
      open: tickets.filter(t => t.status === 'Aberto').length,
      inProgress: tickets.filter(t => t.status === 'Em andamento').length,
      resolved: tickets.filter(t => t.status === 'Resolvido').length
    };
  }, [tickets]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper}><Headphones size={24} /></div>
          <div>
            <h1>Monitoramento de Chamados</h1>
            <p>Gerencie e acompanhe as solicitações de suporte da sua equipe.</p>
          </div>
        </div>
        
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <AlertTriangle size={16} className={styles.iconAlert} />
            <div className={styles.statInfo}>
              <strong>{stats.open}</strong>
              <span>Aguardando</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Clock size={16} className={styles.iconWarning} />
            <div className={styles.statInfo}>
              <strong>{stats.inProgress}</strong>
              <span>Em andamento</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <CheckCircle2 size={16} className={styles.iconSuccess} />
            <div className={styles.statInfo}>
              <strong>{stats.resolved}</strong>
              <span>Resolvidos</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${viewMode === 'ativos' ? styles.activeTab : ''}`}
            onClick={() => { setViewMode('ativos'); setStatusFilter('Todos'); }}
          >
            Caixa de Entrada
          </button>
          <button 
            className={`${styles.tabBtn} ${viewMode === 'arquivados' ? styles.activeTab : ''}`}
            onClick={() => { setViewMode('arquivados'); setStatusFilter('Todos'); }}
          >
            Arquivados
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar por protocolo, assunto ou autor..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <Filter size={14} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="Todos">Todos os status</option>
              {viewMode === 'ativos' ? (
                <>
                  <option value="Aberto">Abertos</option>
                  <option value="Em andamento">Em andamento</option>
                </>
              ) : (
                <>
                  <option value="Resolvido">Resolvidos</option>
                  <option value="Fechado">Fechados</option>
                </>
              )}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="Todas">Todas as categorias</option>
              <option value="Acesso e senha">Acesso e senha</option>
              <option value="Comunicados">Comunicados</option>
              <option value="Documentos">Documentos</option>
              <option value="Erro no sistema">Erro no sistema</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Assunto / Autor</th>
              <th>Categoria</th>
              <th>Prioridade</th>
              <th>Criado em</th>
              <th>Status</th>
              <th className={styles.alignRight}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <React.Fragment key={ticket.id}>
                <tr>
                  <td><span className={styles.protocol}>{ticket.id}</span></td>
                  <td>
                    <div className={styles.subjectCell}>
                      <strong>{ticket.subject}</strong>
                      <div className={styles.authorInfo}>
                        <Users size={12}/> {ticket.author || 'Desconhecido'}
                      </div>
                    </div>
                  </td>
                  <td><span className={styles.badgeLabel}>{ticket.category}</span></td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[ticket.priority.toLowerCase()]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td><span className={styles.date}>{ticket.createdAt}</span></td>
                  <td>
                    <select 
                      className={`${styles.statusSelect} ${styles[ticket.status.replace(' ', '-').toLowerCase()]}`}
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                    >
                      <option value="Aberto">Aberto</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Resolvido">Resolvido</option>
                      <option value="Fechado">Fechado</option>
                    </select>
                  </td>
                  <td className={styles.alignRight}>
                    <button 
                      className={styles.actionBtn} 
                      aria-label="Ver detalhes do chamado"
                      onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
                {expandedId === ticket.id && (
                  <tr className={styles.expandedRow}>
                    <td colSpan={7}>
                      <div className={styles.expandedContent}>
                        <strong>Descrição do Problema:</strong>
                        <p>{ticket.description || 'Nenhuma descrição fornecida pelo usuário.'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <TicketCheck size={32} />
                  <p>Nenhum chamado encontrado com esses filtros.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
