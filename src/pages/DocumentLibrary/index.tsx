import React, { useMemo, useState, useEffect } from 'react';
import { Archive, ArrowDownToLine, ArrowUpRight, BookMarked, FileCheck2, FileText, Folder, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import styles from './DocumentLibrary.module.css';
import { useAuth } from '../../context/AuthContext';
import { getDocuments, createDocumentRequest, type ApiDocument } from '../../services/api';

export interface CorporateDocument {
  id: string;
  name: string;
  code: string;
  dept: string;
  version: string;
  updated: string;
  status: 'Vigente' | 'Em revisão' | 'Obsoleto';
  validUntil?: string;
  description?: string;
}

const initialDocuments: CorporateDocument[] = [
  {
    id: 'doc-1',
    name: 'Manual de Boas Práticas Laboratoriais e Biossegurança',
    code: 'POP-QUAL-001',
    dept: 'Qualidade',
    version: 'v4.2',
    updated: '10/08/2026',
    status: 'Vigente',
    validUntil: '31/12/2027',
    description: 'Diretrizes oficiais para manipulação de amostras, EPIs e descarte de resíduos biológicos.'
  },
  {
    id: 'doc-2',
    name: 'Procedimento Operacional Padrão: Triagem e Recepção de Pacientes',
    code: 'POP-OPE-012',
    dept: 'Operações',
    version: 'v2.8',
    updated: '05/08/2026',
    status: 'Vigente',
    validUntil: '30/06/2027',
    description: 'Fluxograma de acolhimento, conferência de guias de convênio e prioridades de atendimento.'
  },
  {
    id: 'doc-3',
    name: 'Política de Segurança da Informação e Gestão de Senhas',
    code: 'POL-TI-005',
    dept: 'Tecnologia da Informação',
    version: 'v3.0',
    updated: '12/08/2026',
    status: 'Vigente',
    validUntil: '31/12/2026',
    description: 'Regras de acesso a sistemas internos, 2FA, uso aceitável de dispositivos e LGPD.'
  }
];

export const DocumentLibrary: React.FC = () => {
  const { session, user, activeCompany } = useAuth();
  const [documents, setDocuments] = useState<CorporateDocument[]>(initialDocuments);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('Todos');
  
  // Modal de novo documento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDept, setNewDept] = useState('Qualidade');
  const [newVersion, setNewVersion] = useState('v1.0');
  const [newStatus, setNewStatus] = useState<'Vigente' | 'Em revisão' | 'Obsoleto'>('Vigente');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageDocs = user?.isSaaSAdmin || ['owner', 'admin', 'publisher'].includes(activeCompany?.membership?.role || '');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getDocuments(session)
      .then((res) => {
        if (cancelled) return;
        if (res.data && res.data.length > 0) {
          setDocuments(res.data.map((d: ApiDocument) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            dept: d.department,
            version: d.version,
            updated: new Intl.DateTimeFormat('pt-BR').format(new Date(d.updatedAt || d.createdAt)),
            status: d.status,
            validUntil: d.validUntil ? new Intl.DateTimeFormat('pt-BR').format(new Date(d.validUntil)) : undefined,
            description: d.description
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session, activeCompany?.id]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    setIsSubmitting(true);
    try {
      if (session) {
        const res = await createDocumentRequest(session, {
          name: newName.trim(),
          code: newCode.trim(),
          department: newDept,
          version: newVersion.trim() || 'v1.0',
          status: newStatus,
          validUntil: newValidUntil || undefined,
          description: newDesc.trim() || undefined
        });

        const created: CorporateDocument = {
          id: res.data.id,
          name: res.data.name,
          code: res.data.code,
          dept: res.data.department,
          version: res.data.version,
          updated: new Intl.DateTimeFormat('pt-BR').format(new Date()),
          status: res.data.status,
          validUntil: res.data.validUntil ? new Intl.DateTimeFormat('pt-BR').format(new Date(res.data.validUntil)) : undefined,
          description: res.data.description
        };

        setDocuments([created, ...documents]);
      } else {
        const created: CorporateDocument = {
          id: `doc-${Date.now()}`,
          name: newName.trim(),
          code: newCode.trim(),
          dept: newDept,
          version: newVersion.trim() || 'v1.0',
          updated: new Intl.DateTimeFormat('pt-BR').format(new Date()),
          status: newStatus,
          validUntil: newValidUntil ? new Intl.DateTimeFormat('pt-BR').format(new Date(newValidUntil)) : undefined,
          description: newDesc.trim() || undefined
        };
        setDocuments([created, ...documents]);
      }

      setNewName('');
      setNewCode('');
      setNewVersion('v1.0');
      setNewValidUntil('');
      setNewDesc('');
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCollection = collection === 'Todos' || doc.dept === collection;
      const normalized = query.trim().toLowerCase();
      const matchesQuery =
        !normalized ||
        doc.name.toLowerCase().includes(normalized) ||
        doc.code.toLowerCase().includes(normalized) ||
        doc.dept.toLowerCase().includes(normalized) ||
        (doc.description && doc.description.toLowerCase().includes(normalized));

      return matchesCollection && matchesQuery;
    });
  }, [documents, query, collection]);

  const collections = useMemo(() => {
    return [
      { name: 'Todos', count: documents.length, icon: Folder },
      { name: 'Qualidade', count: documents.filter((d) => d.dept === 'Qualidade').length, icon: ShieldCheck },
      { name: 'Operações', count: documents.filter((d) => d.dept === 'Operações').length, icon: FileCheck2 },
      { name: 'Pessoas', count: documents.filter((d) => d.dept === 'Pessoas').length, icon: BookMarked },
      { name: 'Tecnologia', count: documents.filter((d) => d.dept === 'Tecnologia').length, icon: Archive },
    ];
  }, [documents]);

  const handleDownload = (doc: CorporateDocument) => {
    const fileContent = `=====================================================
CENTRAL DE DOCUMENTOS CORPORATIVOS
Documento: ${doc.name}
Código: ${doc.code}
Setor / Coleção: ${doc.dept}
Versão: ${doc.version}
Status: ${doc.status}
Última Atualização: ${doc.updated}
=====================================================

DESCRIÇÃO / ESCOPO:
${doc.description || 'Documento oficial homologado pela organização.'}

Este arquivo é uma via oficial emitida pelo sistema Central.
Para consultar a versão mais recente, acesse a Biblioteca de Documentos no Workplace OS.
`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.code}_${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeCount = documents.filter((d) => d.status === 'Vigente').length;
  const complianceRate = Math.round((activeCount / documents.length) * 100);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>
            <FileText size={13} /> BIBLIOTECA VIVA
          </span>
          <h1>
            Conhecimento que<br />
            <em>permanece.</em>
          </h1>
          <p>Procedimentos, manuais e diretrizes oficiais. Uma única fonte de verdade.</p>
          {canManageDocs && (
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Cadastrar Documento / POP
            </button>
          )}
        </div>
        <div className={styles.heroStats}>
          <span>
            <strong>{documents.length < 10 ? `0${documents.length}` : documents.length}</strong>
            <small>DOCUMENTOS</small>
          </span>
          <span>
            <strong>04</strong>
            <small>COLEÇÕES</small>
          </span>
          <span>
            <strong>{complianceRate}%</strong>
            <small>ATUALIZADOS</small>
          </span>
        </div>
      </header>

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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cadastrar Novo Documento / POP</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Título do Documento</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Protocolo de Biossegurança"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Código Oficial</label>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex: POP-QUAL-015"
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Versão</label>
                  <input
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="v1.0"
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Departamento</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                >
                  <option value="Qualidade">Qualidade</option>
                  <option value="Operações">Operações</option>
                  <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                  <option value="Pessoas">Pessoas / RH</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Status da Vigência</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="Em revisão">Em revisão</option>
                    <option value="Obsoleto">Obsoleto</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Data Limite de Validade</label>
                  <input
                    type="date"
                    value={newValidUntil}
                    onChange={(e) => setNewValidUntil(e.target.value)}
                    max="9999-12-31"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Descrição do Escopo / Resumo</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Diretrizes gerais sobre o procedimento..."
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.workspace}>
        <aside className={styles.collections}>
          <div className={styles.asideTitle}>
            <span>COLEÇÕES</span>
            <small>01</small>
          </div>
          {collections.map((item) => (
            <button
              key={item.name}
              className={collection === item.name ? styles.active : ''}
              onClick={() => setCollection(item.name)}
            >
              <item.icon size={14} />
              <span>{item.name}</span>
              <small>{item.count < 10 ? `0${item.count}` : item.count}</small>
            </button>
          ))}
          <div className={styles.asideNote}>
            <Sparkles size={15} />
            <p>
              <strong>Não encontrou?</strong> Tente buscar por código (ex: <code>POP-QUAL</code>), título ou área responsável.
            </p>
          </div>
        </aside>

        <main className={styles.library}>
          <div className={styles.toolbar}>
            <label>
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar documento por título, código ou palavra-chave..."
                aria-label="Buscar documento"
              />
            </label>
            <span>{filtered.length} RESULTADO(S) · ORDEM RECENTE</span>
          </div>

          {filtered.length ? (
            <div className={styles.documentList}>
              <div className={styles.tableHead}>
                <span>DOCUMENTO</span>
                <span>ÁREA</span>
                <span>VERSÃO</span>
                <span>ATUALIZADO</span>
                <span />
              </div>
              {filtered.map((doc, index) => (
                <article key={doc.id} className={styles.document}>
                  <span className={styles.docNumber}>
                    {index + 1 < 10 ? `0${index + 1}` : index + 1}
                  </span>
                  <span className={`${styles.docIcon} ${doc.status === 'Obsoleto' ? styles.old : ''}`}>
                    <FileText size={15} />
                  </span>
                  <div className={styles.docCopy}>
                    <strong>{doc.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <small style={{ fontWeight: 600 }}>{doc.code}</small>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: doc.status === 'Vigente' ? 'rgba(34, 197, 94, 0.15)' : doc.status === 'Em revisão' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: doc.status === 'Vigente' ? '#22c55e' : doc.status === 'Em revisão' ? '#eab308' : '#ef4444',
                        border: `1px solid ${doc.status === 'Vigente' ? 'rgba(34, 197, 94, 0.3)' : doc.status === 'Em revisão' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {doc.status.toUpperCase()}
                      </span>
                      {doc.validUntil && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          · Validade: {doc.validUntil}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.dept}>{doc.dept}</span>
                  <span className={styles.version}>{doc.version}</span>
                  <span className={styles.updated}>{doc.updated}</span>
                  <button
                    disabled={doc.status === 'Obsoleto'}
                    onClick={() => handleDownload(doc)}
                    aria-label={`Baixar documento ${doc.name}`}
                    title={doc.status === 'Obsoleto' ? 'Documento revogado' : 'Baixar documento oficial'}
                  >
                    <ArrowDownToLine size={14} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <div>
                <Folder />
              </div>
              <span>ESTA PRATELEIRA ESTÁ VAZIA</span>
              <h2>
                Nada por aqui.<br />
                <em>Ainda.</em>
              </h2>
              <p>Tente outra coleção ou simplifique sua busca.</p>
              <button
                onClick={() => {
                  setQuery('');
                  setCollection('Todos');
                }}
              >
                Voltar para todos <ArrowUpRight size={14} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
