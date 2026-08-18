import React, { useMemo, useState, useEffect } from 'react';
import { Search, ChevronDown, Stethoscope, Droplet, Database, Users, HelpCircle, Plus, X } from 'lucide-react';
import styles from './KnowledgePortal.module.css';
import { useAuth } from '../../context/AuthContext';
import { getFaqs, createFaqRequest, type ApiFaq } from '../../services/api';

export interface FaqItem {
  id: string | number;
  question: string;
  answer: string;
  department: string;
  category: string;
  tags?: string;
  relatedDocCode?: string;
  updatedAt: string;
}

const initialFaqs: FaqItem[] = [
  {
    id: 1,
    question: 'Qual o tempo máximo para transporte de amostras de gasometria?',
    answer: 'A amostra de sangue total para gasometria deve ser mantida em temperatura ambiente e analisada em até 30 minutos. Se a análise for demorar mais, deve ser mantida em banho de gelo (0-4°C) e analisada em até 1 hora.',
    department: 'Qualidade',
    category: 'Coleta e Preparo',
    tags: 'gasometria, transporte, gelo, estabilidade',
    relatedDocCode: 'POP-QUAL-001',
    updatedAt: '05/08/2026'
  },
  {
    id: 2,
    question: 'Como proceder quando o sistema SHIFT estiver fora do ar?',
    answer: 'Em caso de inoperância do sistema SHIFT, os atendimentos de urgência devem ser registrados no formulário físico PQ-014 (Plano de Contingência). Assim que o sistema retornar, os dados devem ser repassados para a plataforma em até 2 horas.',
    department: 'Tecnologia da Informação',
    category: 'Sistemas (SHIFT)',
    tags: 'shift, contingencia, inoperancia, queda de sistema',
    relatedDocCode: 'POL-TI-005',
    updatedAt: '10/08/2026'
  },
  {
    id: 3,
    question: 'Quais os documentos necessários para admissão de novos colaboradores?',
    answer: 'O novo colaborador deve apresentar: RG, CPF, Comprovante de Residência, Carteira de Trabalho, Título de Eleitor, Cartão SUS e Atestado Médico Admissional. A documentação deve ser enviada ao RH via sistema.',
    department: 'Recursos Humanos',
    category: 'Recursos Humanos',
    tags: 'admissao, rh, documentos, contratacao',
    relatedDocCode: 'POP-OPE-012',
    updatedAt: '15/07/2026'
  },
  {
    id: 4,
    question: 'Como solicitar acesso a novos módulos ou resetar senha de usuário?',
    answer: 'Para solicitação de novos acessos ou redefinição de credenciais de sistemas internos, abra um chamado na Central de Chamados (/suporte) selecionando a categoria "Acesso e senha".',
    department: 'Tecnologia da Informação',
    category: 'Sistemas (SHIFT)',
    tags: 'senha, reset, modulos, permissoes',
    relatedDocCode: 'POL-TI-005',
    updatedAt: '12/08/2026'
  }
];

export const KnowledgePortal: React.FC = () => {
  const { session, user, activeCompany } = useAuth();
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [openFaq, setOpenFaq] = useState<string | number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal de nova FAQ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newDept, setNewDept] = useState('Qualidade');
  const [newCategory, setNewCategory] = useState('Coleta e Preparo');
  const [newTags, setNewTags] = useState('');
  const [newRelatedDoc, setNewRelatedDoc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageKnowledge = user?.isSaaSAdmin || ['owner', 'admin', 'publisher'].includes(activeCompany?.membership?.role || '');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getFaqs(session)
      .then((res) => {
        if (cancelled) return;
        if (res.data && res.data.length > 0) {
          setFaqs(res.data.map((f: ApiFaq) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            department: f.department,
            category: f.category,
            tags: f.tags,
            relatedDocCode: f.relatedDocCode,
            updatedAt: new Intl.DateTimeFormat('pt-BR').format(new Date(f.updatedAt || f.createdAt))
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session, activeCompany?.id]);

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      if (session) {
        const res = await createFaqRequest(session, {
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          department: newDept,
          category: newCategory,
          tags: newTags.trim() || undefined,
          relatedDocCode: newRelatedDoc.trim() || undefined
        });

        const created: FaqItem = {
          id: res.data.id,
          question: res.data.question,
          answer: res.data.answer,
          department: res.data.department,
          category: res.data.category,
          tags: res.data.tags,
          relatedDocCode: res.data.relatedDocCode,
          updatedAt: new Intl.DateTimeFormat('pt-BR').format(new Date())
        };
        setFaqs([created, ...faqs]);
      } else {
        const created: FaqItem = {
          id: `faq-${Date.now()}`,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          department: newDept,
          category: newCategory,
          tags: newTags.trim() || undefined,
          relatedDocCode: newRelatedDoc.trim() || undefined,
          updatedAt: new Intl.DateTimeFormat('pt-BR').format(new Date())
        };
        setFaqs([created, ...faqs]);
      }

      setNewQuestion('');
      setNewAnswer('');
      setNewTags('');
      setNewRelatedDoc('');
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar pergunta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (id: string | number) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(selectedCategory === catName ? null : catName);
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory ? faq.category === selectedCategory : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.department.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q) ||
        (faq.tags && faq.tags.toLowerCase().includes(q)) ||
        (faq.relatedDocCode && faq.relatedDocCode.toLowerCase().includes(q))
      );

      return matchesCategory && matchesSearch;
    });
  }, [faqs, searchQuery, selectedCategory]);

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Portal do Conhecimento</h1>
        <p className={styles.subtitle}>
          Encontre orientações oficiais, FAQs e manuais da {activeCompany?.name ?? 'empresa'}.
        </p>

        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={24} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Como podemos ajudar? Busque por exame, sistema, senha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar orientações"
          />
        </div>
      </div>

      <div className={styles.categoriesGrid}>
        <div
          className={`${styles.categoryCard} ${selectedCategory === 'Atendimento' ? styles.activeCategory : ''}`}
          onClick={() => handleCategoryClick('Atendimento')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.catIcon}>
            <Stethoscope size={24} />
          </div>
          <div className={styles.catTitle}>Atendimento</div>
        </div>

        <div
          className={`${styles.categoryCard} ${selectedCategory === 'Coleta e Preparo' ? styles.activeCategory : ''}`}
          onClick={() => handleCategoryClick('Coleta e Preparo')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.catIcon}>
            <Droplet size={24} />
          </div>
          <div className={styles.catTitle}>Coleta e Preparo</div>
        </div>

        <div
          className={`${styles.categoryCard} ${selectedCategory === 'Sistemas (SHIFT)' ? styles.activeCategory : ''}`}
          onClick={() => handleCategoryClick('Sistemas (SHIFT)')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.catIcon}>
            <Database size={24} />
          </div>
          <div className={styles.catTitle}>Sistemas e Acessos</div>
        </div>

        <div
          className={`${styles.categoryCard} ${selectedCategory === 'Recursos Humanos' ? styles.activeCategory : ''}`}
          onClick={() => handleCategoryClick('Recursos Humanos')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.catIcon}>
            <Users size={24} />
          </div>
          <div className={styles.catTitle}>Recursos Humanos</div>
        </div>
      </div>

      <div className={styles.faqSection}>
        <div className={styles.faqHeader} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <HelpCircle size={24} color="var(--color-primary-accent)" />
          <span>Perguntas Frequentes {selectedCategory && `(${selectedCategory})`}</span>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-primary-accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none'
                }}
              >
                Limpar filtro
              </button>
            )}
            {canManageKnowledge && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  background: 'var(--color-primary-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Nova Orientação
              </button>
            )}
          </div>
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
              maxWidth: '520px',
              width: '100%',
              color: 'var(--text-main, #fff)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cadastrar Nova Orientação / FAQ</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateFaq} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Pergunta ou Dúvida Frequente</label>
                  <input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ex: Como solicitar novos acessos?"
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Resposta ou Procedimento Oficial</label>
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Orientações detalhadas..."
                    rows={4}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Categoria</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                    >
                      <option value="Atendimento">Atendimento</option>
                      <option value="Coleta e Preparo">Coleta e Preparo</option>
                      <option value="Sistemas (SHIFT)">Sistemas (SHIFT)</option>
                      <option value="Recursos Humanos">Recursos Humanos</option>
                      <option value="Qualidade">Qualidade</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Departamento</label>
                    <select
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                    >
                      <option value="Qualidade">Qualidade</option>
                      <option value="Tecnologia da Informação">TI</option>
                      <option value="Recursos Humanos">RH</option>
                      <option value="Atendimento">Atendimento</option>
                      <option value="Operações">Operações</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Palavras-chave (Tags para busca rápida)</label>
                  <input
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Ex: gasometria, estabilidade, transporte, gelo"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Código de Documento / POP Relacionado (Opcional)</label>
                  <input
                    value={newRelatedDoc}
                    onChange={(e) => setNewRelatedDoc(e.target.value)}
                    placeholder="Ex: POP-QUAL-001 ou POL-TI-005"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: 'var(--color-primary-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Orientação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {filteredFaqs.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>Nenhuma resposta encontrada para sua pesquisa.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              style={{
                marginTop: '0.5rem',
                color: 'var(--color-primary-accent)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Ver todas as perguntas frequentes
            </button>
          </div>
        ) : (
          <div className={styles.accordionList}>
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`${styles.accordionItem} ${openFaq === faq.id ? styles.open : ''}`}
              >
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={styles.chevron} size={20} />
                </button>
                <div className={styles.accordionContent}>
                  <p className={styles.answerText}>{faq.answer}</p>
                  
                  {faq.relatedDocCode && (
                    <div style={{
                      marginTop: '0.75rem',
                      marginBottom: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(20, 110, 245, 0.1)',
                      border: '1px solid rgba(20, 110, 245, 0.25)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-primary-accent)'
                    }}>
                      <span>Documento Relacionado:</span>
                      <strong>{faq.relatedDocCode}</strong>
                    </div>
                  )}

                  {faq.tags && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem', marginBottom: '0.5rem' }}>
                      {faq.tags.split(',').map((t, idx) => (
                        <span key={idx} style={{
                          fontSize: '0.75rem',
                          background: 'var(--color-bg-body)',
                          border: '1px solid var(--color-border)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          color: 'var(--color-text-muted)'
                        }}>
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.metaInfo}>
                    <span>Responsável: {faq.department}</span>
                    <span>•</span>
                    <span>Última atualização: {faq.updatedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
