import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, Settings, Users, Monitor, TrendingUp, DollarSign, Briefcase, 
  FileText, Calendar, Tag, Info, AlertTriangle, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import styles from './CategoryPage.module.css';
import { useComunicados } from '../../context/ComunicadosContext';

interface Contact {
  name: string;
  role: string;
}

const categoryConfig: Record<string, { title: string; icon: React.ElementType; contacts: Contact[]; links?: Array<{ label: string; url: string }> }> = {
  'qualidade': {
    title: 'Qualidade',
    icon: ShieldCheck,
    contacts: [
      { name: 'Ana Souza', role: 'Gestora da Qualidade' },
      { name: 'Dr. Fernando Dias', role: 'Auditor Líder ONA' }
    ],
    links: [
      { label: 'Manual da Qualidade e Biossegurança', url: '/documentos' },
      { label: 'Formulários e POPs do Setor', url: '/documentos' }
    ]
  },
  'operacoes': {
    title: 'Operações',
    icon: Settings,
    contacts: [
      { name: 'Carlos Mendes', role: 'Diretor Operacional' },
      { name: 'Juliana Prado', role: 'Supervisora de Coleta' }
    ],
    links: [
      { label: 'Rotinas Operacionais e Escalas', url: '/documentos' },
      { label: 'Abertura de Chamado Operacional', url: '/suporte' }
    ]
  },
  'rh': {
    title: 'Recursos Humanos',
    icon: Users,
    contacts: [
      { name: 'Fernanda Lima', role: 'Business Partner' },
      { name: 'Lucas Gabriel', role: 'Gestão de Benefícios' }
    ],
    links: [
      { label: 'Portal do Colaborador (Holerites)', url: '/links' },
      { label: 'Manual de Integração e Benefícios', url: '/documentos' }
    ]
  },
  'ti': {
    title: 'Tecnologia da Informação',
    icon: Monitor,
    contacts: [
      { name: 'Ricardo Alves', role: 'Gerente de TI' },
      { name: 'Suporte Técnico', role: 'Helpdesk N1/N2' }
    ],
    links: [
      { label: 'Abrir Chamado para TI', url: '/suporte' },
      { label: 'Diretrizes de Segurança da Informação', url: '/documentos' }
    ]
  },
  'comercial': {
    title: 'Comercial',
    icon: TrendingUp,
    contacts: [
      { name: 'Juliana Castro', role: 'Head Comercial' }
    ]
  },
  'financeiro': {
    title: 'Financeiro',
    icon: DollarSign,
    contacts: [
      { name: 'Marcos Silva', role: 'CFO' }
    ]
  },
  'diretoria': {
    title: 'Diretoria',
    icon: Briefcase,
    contacts: [
      { name: 'Dr. Roberto', role: 'CEO' }
    ]
  }
};

export const CategoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { comunicados } = useComunicados();
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  
  const currentKey = (id ?? '').toLowerCase();
  const currentCategory = categoryConfig[currentKey] ?? {
    title: id ? id.toUpperCase() : 'Setor',
    icon: FileText,
    contacts: []
  };

  const IconComponent = currentCategory.icon;

  const categoryNotices = useMemo(() => {
    const list = comunicados.filter((c) => {
      const cat = c.category.toLowerCase();
      const dept = c.department.toLowerCase();
      const key = currentKey;

      if (key === 'ti') return cat.includes('ti') || cat.includes('sistema') || cat.includes('tecnologia') || dept.includes('ti') || dept.includes('tecnologia');
      if (key === 'rh') return cat.includes('rh') || cat.includes('recurso') || cat.includes('pessoa') || dept.includes('rh') || dept.includes('recurso');
      if (key === 'qualidade') return cat.includes('qualidade') || dept.includes('qualidade');
      if (key === 'operacoes') return cat.includes('opera') || dept.includes('opera');

      return cat.includes(key) || dept.includes(key);
    });

    return list.sort((a, b) => {
      if (sortOrder === 'recent') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [comunicados, currentKey, sortOrder]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            <IconComponent size={28} className={styles.titleIcon} />
            Setor de {currentCategory.title}
          </h1>
          <p className={styles.subtitle}>Comunicados, diretrizes e contatos oficiais desta área.</p>
        </div>
        
        <div className={styles.filters}>
          <select
            className={styles.selectBox}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest')}
            aria-label="Ordenar publicações"
          >
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>
      </div>

      <div className={styles.contentGrid}>
        
        <div className={styles.list}>
          {categoryNotices.length === 0 ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <Info size={36} color="var(--color-primary-accent)" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-main)' }}>Nenhum comunicado deste setor</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
                Não há comunicados específicos publicados para o setor de {currentCategory.title} no momento.
              </p>
              <Link to="/comunicados" style={{ marginTop: '0.5rem', color: 'var(--color-primary-accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Ver todos os comunicados do mural <ArrowUpRight size={15} />
              </Link>
            </div>
          ) : (
            categoryNotices.map((post) => (
              <Link to={`/comunicados/${post.id}`} key={post.id} className={styles.card}>
                <div className={styles.iconWrapper}>
                  {post.type === 'Urgente' ? (
                    <AlertTriangle size={22} color="var(--color-danger)" />
                  ) : (
                    <Info size={22} color="var(--color-primary-accent)" />
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{post.title}</h3>
                    <span className={`${styles.badge} ${post.read ? styles.readBadge : ''}`}>
                      {post.read ? (
                        <>
                          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '3px' }} />
                          Lido
                        </>
                      ) : (
                        post.type
                      )}
                    </span>
                  </div>
                  
                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <Calendar size={14} /> {post.date}
                    </span>
                    <span className={styles.metaItem}>
                      <Tag size={14} /> {post.department}
                    </span>
                    <span className={styles.metaItem}>
                      Autor: {post.author}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>
              <Users size={18} />
              Contatos do Setor
            </h3>
            
            <div className={styles.contactList}>
              {currentCategory.contacts && currentCategory.contacts.length > 0 ? (
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
              {currentCategory.links ? (
                currentCategory.links.map((link, idx) => (
                  <li key={idx}>
                    <Link to={link.url} style={{color: 'var(--color-primary-accent)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                      {link.label} <ArrowUpRight size={13} />
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/documentos" style={{color: 'var(--color-primary-accent)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px'}}>Normas e POPs do Setor <ArrowUpRight size={13}/></Link></li>
                  <li><Link to="/suporte" style={{color: 'var(--color-primary-accent)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px'}}>Abrir Chamado para {currentCategory.title} <ArrowUpRight size={13}/></Link></li>
                </>
              )}
            </ul>
          </div>
        </aside>

      </div>
    </div>
  );
};
