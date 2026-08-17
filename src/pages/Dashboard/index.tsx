import React from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, FileText, Headphones, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useComunicados } from '../../context/ComunicadosContext';
import styles from './Dashboard.module.css';

const events = [
  { day: '18', title: 'Treinamento 2FA e Segurança', time: '14:00', place: 'Online (Teams)' },
  { day: '21', title: 'Alinhamento de Indicadores Q3', time: '09:00', place: 'Sala 3 (Matriz)' },
  { day: '25', title: 'Manutenção de Infraestrutura', time: '23:00', place: 'Servidores Matriz' }
];

export const Dashboard: React.FC = () => {
  const { user, activeCompany } = useAuth();
  const { comunicados } = useComunicados();
  const unread = comunicados.filter(item => !item.read);
  const urgentUnread = unread.find(c => c.type === 'Urgente');
  
  const totalLeituras = comunicados.length;
  const totalLidos = totalLeituras - unread.length;
  const pulseScore = totalLeituras === 0 ? 100 : Math.round((totalLidos / totalLeituras) * 100);

  const firstName = user?.name?.split(' ')[0] ?? 'Colaborador';
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).toUpperCase();
  const formattedTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);

  return <div className={styles.dashboard}>
    <section className={styles.intro}>
      <div><span className={styles.eyebrow}>{formattedDate} <i/></span><h1>Bom dia, <em>{firstName}.</em></h1><p>O que está acontecendo na {activeCompany?.name ?? 'sua empresa'}, sem ruído.</p></div>
      <div className={styles.status}><span className={styles.liveDot}/><div><strong>Operação normal</strong><small>Todos os sistemas disponíveis</small></div><span>{formattedTime}</span></div>
    </section>

    <section className={styles.bento}>
      {urgentUnread ? (
        <article className={styles.leadStory}>
          <div className={styles.storyMeta}><span><CircleAlert size={13}/> ATENÇÃO</span><small>{urgentUnread.department.toUpperCase()} · {urgentUnread.date}</small></div>
          <div className={styles.storyBody}><span className={styles.storyNumber}>01</span><div><h2>{urgentUnread.title.split(' ').slice(0, 2).join(' ')}<br/><em>{urgentUnread.title.split(' ').slice(2).join(' ')}</em></h2><p>Por favor, acesse para ler e confirmar a ciência obrigatória.</p><Link to={`/comunicados/${urgentUnread.id}`}>Ler comunicado <ArrowUpRight size={16}/></Link></div></div>
          <div className={styles.readers}><span>CIÊNCIA OBRIGATÓRIA</span><div><i/><i/><i/><small>Pendente para você</small></div></div>
        </article>
      ) : (
        <article className={styles.leadStory}>
          <div className={styles.storyMeta}><span><Sparkles size={13}/> TUDO EM DIA</span></div>
          <div className={styles.storyBody}><span className={styles.storyNumber}>00</span><div><h2>Nenhum comunicado<br/><em>urgente.</em></h2><p>Você não tem novas leituras obrigatórias neste momento. Aproveite seu dia!</p></div></div>
          <div className={styles.readers}><span>CIÊNCIA OBRIGATÓRIA</span><div><small>100% lido</small></div></div>
        </article>
      )}

      <div className={styles.rightRail}>
        <article className={styles.pulse}>
          <div className={styles.sectionLabel}><span>PULSO DE LEITURA</span><BookOpen size={14}/></div>
          <div className={styles.pulseScore}><strong>{pulseScore}</strong><span>%<small>{pulseScore === 100 ? 'em dia' : 'lido'}</small></span></div>
          <div className={styles.progress}><i style={{width: `${pulseScore}%`}}/></div>
          <div className={styles.legend}><span>{pulseScore === 100 ? 'Você está em dia' : 'Leituras em andamento'}</span><span>{unread.length} pendentes</span></div>
        </article>
        <article className={styles.quickAction}>
          <div><span>ATALHO</span><h3>Precisa de ajuda<br/>com tecnologia?</h3></div>
          <Link to="/suporte"><Headphones size={18}/><span>Abrir chamado</span><ChevronRight size={15}/></Link>
        </article>
      </div>

      <article className={styles.feed}>
        <div className={styles.sectionHeader}><div><span className={styles.sectionLabel}>AGORA NO MURAL</span><h3>Para você</h3></div><Link to="/comunicados">Ver mural <ArrowUpRight size={14}/></Link></div>
        <div className={styles.feedList}>
          {comunicados.length > 0 ? comunicados.slice(0,4).map((item,index)=><Link to={`/comunicados/${item.id}`} className={styles.feedRow} key={item.id}>
            <span className={styles.feedIndex}>0{index+1}</span><span className={`${styles.feedIcon} ${!item.read ? styles.unread : ''}`}>{item.type === 'Urgente' ? <CircleAlert size={15}/> : <MessageSquare size={15}/>}</span><span className={styles.feedCopy}><strong>{item.title}</strong><small>{item.department} · {item.date}</small></span>{!item.read && <span className={styles.newBadge}>NOVO</span>}<ArrowUpRight className={styles.rowArrow} size={15}/>
          </Link>) : <div style={{padding: '4rem 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '15px'}}>Nenhuma publicação recente.</div>}
        </div>
      </article>

      <article className={styles.agenda}>
        <div className={styles.sectionHeader}><div><span className={styles.sectionLabel}>PRÓXIMOS DIAS</span><h3>Agenda</h3></div><CalendarDays size={18}/></div>
        <div>{events.length > 0 ? events.map(event=><div className={styles.event} key={event.day}><time><strong>{event.day}</strong><small>AGO</small></time><i/><div><strong>{event.title}</strong><small>{event.time} · {event.place}</small></div></div>) : <div style={{padding: '1rem', color: 'var(--color-text-dim)', fontSize: '13px'}}>Sem eventos na agenda.</div>}</div>
        <Link to="/calendario" className={styles.textLink}>Abrir calendário <ChevronRight size={14}/></Link>
      </article>
    </section>

    <section className={styles.utilityStrip}>
      <div className={styles.utilityIntro}><Sparkles size={16}/><span>SEU ESPAÇO DE TRABALHO</span></div>
      <Link to="/pendencias"><Clock3/><span><small>PENDÊNCIAS</small><strong>{unread.length} itens</strong></span></Link>
      <Link to="/documentos"><FileText/><span><small>DOCUMENTOS</small><strong>Biblioteca</strong></span></Link>
      <Link to="/leituras"><Check/><span><small>MINHA CIÊNCIA</small><strong>Histórico</strong></span></Link>
      <Link to="/admin/novo-comunicado" className={styles.compose}><Plus/><span>Nova publicação</span></Link>
    </section>
  </div>;
};
