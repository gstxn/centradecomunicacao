import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Check, CircleAlert, Filter, MessageSquare, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Comunicados.module.css';
import { useComunicados } from '../../context/ComunicadosContext';

export const ComunicadosList: React.FC = () => {
  const { comunicados } = useComunicados();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const categories = useMemo(() => Array.from(new Set(comunicados.map(item => item.category))).sort(), [comunicados]);
  const filtered = useMemo(() => comunicados.filter(item => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return (!normalized || [item.title,item.category,item.author,item.department].some(value => value.toLocaleLowerCase('pt-BR').includes(normalized))) && (category === 'all' || item.category === category) && (status === 'all' || (status === 'read' ? item.read : !item.read));
  }), [category, comunicados, query, status]);
  const featured = filtered[0];
  const reset = () => { setQuery(''); setCategory('all'); setStatus('all'); };

  return <div className={styles.page}>
    <header className={styles.hero}><div><span className={styles.kicker}><MessageSquare size={13}/> MURAL CORPORATIVO</span><h1>O que precisa<br/><em>circular.</em></h1><p>Comunicados, decisões e histórias da organização — organizados para você.</p></div><div className={styles.readingStatus}><strong>{comunicados.filter(item=>item.read).length}/{comunicados.length}</strong><span>LEITURAS EM DIA</span><i><b style={{width:`${(comunicados.filter(item=>item.read).length/comunicados.length)*100}%`}}/></i></div></header>
    <div className={styles.controlBar}><label><Search size={14}/><input aria-label="Buscar comunicados" placeholder="Buscar no mural..." value={query} onChange={event=>setQuery(event.target.value)}/></label><div><Filter size={13}/><select aria-label="Categoria" value={category} onChange={event=>setCategory(event.target.value)}><option value="all">Todas as editorias</option>{categories.map(item=><option key={item}>{item}</option>)}</select><select aria-label="Situação de leitura" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Toda leitura</option><option value="unread">Não lidos</option><option value="read">Lidos</option></select></div></div>

    {featured ? <>
      <section className={styles.featured}><div className={styles.featureVisual}><span>EDIÇÃO<br/>0{featured.id}</span><i/><div><small>{featured.type}</small><strong>{featured.department}</strong></div></div><div className={styles.featureCopy}><span>{featured.category} · {featured.date}</span><h2>{featured.title}</h2><p>Uma atualização importante para manter todas as pessoas informadas, alinhadas e prontas para o próximo movimento.</p><Link to={`/comunicados/${featured.id}`}>Abrir leitura <ArrowUpRight size={16}/></Link></div></section>
      <section className={styles.stream}><div className={styles.streamHeader}><div><span>FLUXO RECENTE</span><h3>Últimas publicações</h3></div><small>{filtered.length} ITENS ENCONTRADOS</small></div><div className={styles.rows}>{filtered.slice(1).map((item,index)=><Link to={`/comunicados/${item.id}`} className={styles.row} key={item.id}><span className={styles.index}>0{index+2}</span><span className={`${styles.state} ${!item.read ? styles.pending : ''}`}>{item.read?<Check size={14}/>:item.type==='Urgente'?<CircleAlert size={14}/>:<MessageSquare size={14}/>}</span><span className={styles.rowCopy}><strong>{item.title}</strong><small>{item.department} · {item.category} · {item.date}</small></span><span className={styles.type}>{item.read?'LIDO':item.type.toUpperCase()}</span><ArrowUpRight className={styles.arrow} size={15}/></Link>)}</div></section>
    </> : <div className={styles.empty}><div className={styles.orbit}><Sparkles/></div><span>NENHUM SINAL POR AQUI</span><h2>O mural está quieto.<br/><em>Talvez quieto demais.</em></h2><p>Não encontramos publicações com esses filtros. Tente abrir um pouco mais o horizonte.</p><button onClick={reset}><SlidersHorizontal size={14}/> Limpar filtros</button></div>}
  </div>;
};
