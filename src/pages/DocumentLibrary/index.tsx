import React, { useMemo, useState } from 'react';
import { Archive, ArrowDownToLine, ArrowUpRight, BookMarked, FileCheck2, FileText, Folder, Search, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './DocumentLibrary.module.css';

const documents: any[] = [];

export const DocumentLibrary: React.FC = () => {
  const [query,setQuery]=useState('');
  const [collection,setCollection]=useState('Todos');
  const filtered=useMemo(()=>documents.filter(doc=>(collection==='Todos'||doc.dept===collection)&&doc.name.toLowerCase().includes(query.toLowerCase())),[query,collection]);
  const collections=[{name:'Todos',count:0,icon:Folder},{name:'Qualidade',count:0,icon:ShieldCheck},{name:'Operações',count:0,icon:FileCheck2},{name:'Pessoas',count:0,icon:BookMarked},{name:'Tecnologia',count:0,icon:Archive}];
  return <div className={styles.page}>
    <header className={styles.hero}><div><span><FileText size={13}/> BIBLIOTECA VIVA</span><h1>Conhecimento que<br/><em>permanece.</em></h1><p>Procedimentos, manuais e diretrizes oficiais. Uma única fonte de verdade.</p></div><div className={styles.heroStats}><span><strong>05</strong><small>DOCUMENTOS</small></span><span><strong>04</strong><small>COLEÇÕES</small></span><span><strong>98%</strong><small>ATUALIZADOS</small></span></div></header>
    <div className={styles.workspace}>
      <aside className={styles.collections}><div className={styles.asideTitle}><span>COLEÇÕES</span><small>01</small></div>{collections.map(item=><button key={item.name} className={collection===item.name?styles.active:''} onClick={()=>setCollection(item.name)}><item.icon size={14}/><span>{item.name}</span><small>0{item.count}</small></button>)}<div className={styles.asideNote}><Sparkles size={15}/><p><strong>Não encontrou?</strong> Tente buscar por código, título ou área responsável.</p></div></aside>
      <main className={styles.library}><div className={styles.toolbar}><label><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar documento ou código..."/></label><span>{filtered.length} RESULTADOS · ORDEM RECENTE</span></div>
        {filtered.length ? <div className={styles.documentList}><div className={styles.tableHead}><span>DOCUMENTO</span><span>ÁREA</span><span>VERSÃO</span><span>ATUALIZADO</span><span/></div>{filtered.map((doc,index)=><article key={doc.id} className={styles.document}><span className={styles.docNumber}>0{index+1}</span><span className={`${styles.docIcon} ${doc.status==='Obsoleto'?styles.old:''}`}><FileText size={15}/></span><div className={styles.docCopy}><strong>{doc.name}</strong><small>{doc.code} · {doc.status.toUpperCase()}</small></div><span className={styles.dept}>{doc.dept}</span><span className={styles.version}>{doc.version}</span><span className={styles.updated}>{doc.updated}</span><button disabled={doc.status==='Obsoleto'} aria-label={`Baixar ${doc.name}`}><ArrowDownToLine size={14}/></button></article>)}</div> : <div className={styles.empty}><div><Folder/></div><span>ESTA PRATELEIRA ESTÁ VAZIA</span><h2>Nada por aqui.<br/><em>Ainda.</em></h2><p>Tente outra coleção ou simplifique sua busca.</p><button onClick={()=>{setQuery('');setCollection('Todos')}}>Voltar para todos <ArrowUpRight size={14}/></button></div>}
      </main>
    </div>
  </div>;
};
