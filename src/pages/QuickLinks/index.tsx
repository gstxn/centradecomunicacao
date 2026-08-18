import React, { useState, useEffect } from 'react';
import { ExternalLink, Monitor, Globe, Plus, X } from 'lucide-react';
import styles from './QuickLinks.module.css';
import { useAuth } from '../../context/AuthContext';
import { getQuickLinks, createQuickLinkRequest, type ApiQuickLink } from '../../services/api';

interface LinkItem {
  id: string | number;
  title: string;
  desc: string;
  url: string;
  category: string;
  logo?: string;
}

const defaultLinks: LinkItem[] = [
  {
    id: 'acredite-se',
    title: 'Acredite.se',
    desc: 'Manutenção, infraestrutura, registro de ocorrências, não conformidades e treinamentos',
    url: 'https://acredite.se',
    category: 'Sistemas Homologados (Oficiais)',
    logo: '/images/acreditese.png'
  },
  {
    id: 'shift-lis',
    title: 'SHIFT - Sistema LIS',
    desc: 'Gestão laboratorial, recepção de pacientes, mapa de bancada e laudos',
    url: 'https://shift.centraldeexames.com.br',
    category: 'Sistemas Homologados (Oficiais)',
    logo: '/images/shift.png'
  },
  {
    id: 'iblood',
    title: 'iBlood - Banco de Sangue',
    desc: 'Hemoterapia, triagem de doadores e controle transfusional',
    url: 'https://iblood.centraldeexames.com.br',
    category: 'Sistemas Homologados (Oficiais)',
    logo: '/images/myblood.png'
  },
  {
    id: 'mypardini',
    title: 'myPardini - Laboratório de Apoio',
    desc: 'Consulta de exames de apoio especializado, prazos e orientações técnicas',
    url: 'https://mypardini.com.br',
    category: 'Sistemas Homologados (Oficiais)',
    logo: '/images/pardini.png'
  },
  {
    id: 'portal-colab',
    title: 'Portal do Colaborador',
    desc: 'Holerites, ponto eletrônico e solicitações de RH',
    url: 'https://folha.exemplo.com.br',
    category: 'Recursos Humanos & Adm'
  },
  {
    id: 'docusign',
    title: 'DocuSign',
    desc: 'Assinatura digital e formalização de contratos',
    url: 'https://docusign.com',
    category: 'Recursos Humanos & Adm'
  }
];

export const QuickLinks: React.FC = () => {
  const { session, user, activeCompany } = useAuth();
  const [links, setLinks] = useState<LinkItem[]>(defaultLinks);

  // Modal de novo link
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('Sistemas Operacionais');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageLinks = user?.isSaaSAdmin || ['owner', 'admin', 'publisher'].includes(activeCompany?.membership?.role || '');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getQuickLinks(session)
      .then((res) => {
        if (cancelled) return;
        if (res.data && res.data.length > 0) {
          setLinks(res.data.map((l: ApiQuickLink) => ({
            id: l.id,
            title: l.title,
            desc: 'Atalho corporativo verificado',
            url: l.url,
            category: l.category || 'Sistemas Operacionais'
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session, activeCompany?.id]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      if (session) {
        const res = await createQuickLinkRequest(session, {
          title: newTitle.trim(),
          url: newUrl.trim(),
          category: newCategory
        });

        const created: LinkItem = {
          id: res.data.id,
          title: res.data.title,
          desc: newDesc.trim() || 'Atalho corporativo verificado',
          url: res.data.url,
          category: res.data.category
        };
        setLinks([...links, created]);
      } else {
        const created: LinkItem = {
          id: `link-${Date.now()}`,
          title: newTitle.trim(),
          desc: newDesc.trim() || 'Atalho corporativo verificado',
          url: newUrl.trim(),
          category: newCategory
        };
        setLinks([...links, created]);
      }

      setNewTitle('');
      setNewUrl('');
      setNewDesc('');
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar atalho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(links.map((l) => l.category)));

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.title}>Links Rápidos</h1>
          <p className={styles.subtitle}>Acesso direto aos principais sistemas e plataformas utilizados na {activeCompany?.name ?? 'empresa'}.</p>
        </div>
        {canManageLinks && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.2rem',
              background: 'var(--color-primary-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Adicionar Link
          </button>
        )}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 110, 245, 0.08) 0%, rgba(13, 202, 240, 0.04) 100%)',
        border: '1px solid rgba(20, 110, 245, 0.2)',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        fontSize: '0.9rem',
        color: 'var(--text-main)',
        lineHeight: 1.5
      }}>
        <strong>Diretriz Oficial:</strong> A Central de Comunicação é o canal para <em>comunicar, consultar e confirmar ciência</em>. Para abertura e acompanhamento formal de <strong>solicitações de manutenção, infraestrutura, registro de ocorrências, não conformidades e planos de ação</strong>, utilize o atalho oficial do <strong>Acredite.se</strong> abaixo.
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
            maxWidth: '500px',
            width: '100%',
            color: 'var(--text-main, #fff)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Adicionar Novo Link Rápido</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Título do Sistema / Atalho</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Portal de Exames"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>URL do Link</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://sistema.exemplo.com.br"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                >
                  <option value="Sistemas Operacionais">Sistemas Operacionais</option>
                  <option value="Recursos Humanos & Adm">Recursos Humanos & Adm</option>
                  <option value="Qualidade & Auditoria">Qualidade & Auditoria</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: 'var(--color-primary-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Atalho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categories.map((cat, index) => {
        const catLinks = links.filter((l) => l.category === cat);
        return (
          <div key={index} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Monitor size={20} color="var(--color-primary-accent)" />
              {cat}
            </h2>
            
            <div className={styles.linksGrid}>
              {catLinks.map((link) => (
                <a href={link.url} key={link.id} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                  <div className={styles.iconWrapper} style={{ background: link.logo ? '#fff' : undefined, padding: link.logo ? '4px' : undefined }}>
                    {link.logo ? (
                      <img src={link.logo} alt={link.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Globe size={24} color="var(--color-primary-accent)" />
                    )}
                  </div>
                  <div className={styles.linkContent}>
                    <div className={styles.linkTitle}>{link.title}</div>
                    <div className={styles.linkDesc}>{link.desc}</div>
                  </div>
                  <ExternalLink size={18} className={styles.externalIcon} />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

