import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, Settings, Users, Monitor, TrendingUp, DollarSign, Briefcase, 
  FileText, Calendar, Tag, Info
} from 'lucide-react';
import styles from './CategoryPage.module.css';

const categoryConfig: Record<string, { title: string, icon: any, contacts: any[] }> = {
  'qualidade': {
    title: 'Qualidade',
    icon: ShieldCheck,
    contacts: [{ name: 'Ana Souza', role: 'Gestora da Qualidade' }]
  },
  'operacoes': {
    title: 'Operações',
    icon: Settings,
    contacts: [{ name: 'Carlos Mendes', role: 'Diretor Operacional' }]
  },
  'rh': {
    title: 'Recursos Humanos',
    icon: Users,
    contacts: [{ name: 'Fernanda Lima', role: 'Business Partner' }]
  },
  'ti': {
    title: 'Tecnologia da Informação',
    icon: Monitor,
    contacts: [{ name: 'Ricardo Alves', role: 'Gerente de TI' }]
  },
  'comercial': {
    title: 'Comercial',
    icon: TrendingUp,
    contacts: [{ name: 'Juliana Castro', role: 'Head Comercial' }]
  },
  'financeiro': {
    title: 'Financeiro',
    icon: DollarSign,
    contacts: [{ name: 'Marcos Silva', role: 'CFO' }]
  },
  'diretoria': {
    title: 'Diretoria',
    icon: Briefcase,
    contacts: [{ name: 'Dr. Roberto', role: 'CEO' }]
  }
};

const fakePosts = [
  { id: 10, title: 'Atualização de Políticas Internas', date: '11/05/2025', tag: 'Aviso' },
  { id: 11, title: 'Resultado dos Indicadores - Q1', date: '08/05/2025', tag: 'Resultados' },
  { id: 12, title: 'Novo fluxograma de atendimento aprovado', date: '02/05/2025', tag: 'Normas' }
];

export const CategoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const currentCategory = id && categoryConfig[id] ? categoryConfig[id] : {
    title: id || 'Categoria',
    icon: FileText,
    contacts: []
  };

  const IconComponent = currentCategory.icon;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            <IconComponent size={28} className={styles.titleIcon} />
            Setor de {currentCategory.title}
          </h1>
          <p className={styles.subtitle}>Comunicados e informações exclusivas desta área.</p>
        </div>
        
        <div className={styles.filters}>
          <select className={styles.selectBox}>
            <option>Recentes</option>
            <option>Mais antigos</option>
          </select>
        </div>
      </div>

      <div className={styles.contentGrid}>
        
        <div className={styles.list}>
          {fakePosts.map(post => (
            <Link to={`/comunicados/${post.id}`} key={post.id} className={styles.card}>
              <div className={styles.iconWrapper}>
                <Info size={24} />
              </div>
              
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{post.title}</h3>
                  <span className={styles.badge}>{post.tag}</span>
                </div>
                
                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}><Calendar size={14} /> {post.date}</span>
                  <span className={styles.metaItem}><Tag size={14} /> {currentCategory.title}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>
              <Users size={18} />
              Contatos do Setor
            </h3>
            
            <div className={styles.contactList}>
              {currentCategory.contacts.length > 0 ? (
                currentCategory.contacts.map((contact, idx) => (
                  <div key={idx} className={styles.contactItem}>
                    <div className={styles.avatar}>
                      {contact.name.charAt(0)}
                    </div>
                    <div className={styles.contactInfo}>
                      <span className={styles.contactName}>{contact.name}</span>
                      <span className={styles.contactRole}>{contact.role}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{color: 'var(--color-text-muted)', fontSize: '0.9rem'}}>Nenhum contato cadastrado.</div>
              )}
            </div>
          </div>
          
          <div className={styles.panelCard}>
             <h3 className={styles.panelTitle}>
              <Briefcase size={18} />
              Links Úteis
            </h3>
            <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <li><a href="#" style={{color: 'var(--color-primary-accent)', textDecoration: 'none', fontSize: '0.9rem'}}>Normas do Setor</a></li>
              <li><a href="#" style={{color: 'var(--color-primary-accent)', textDecoration: 'none', fontSize: '0.9rem'}}>Processos da {currentCategory.title}</a></li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
