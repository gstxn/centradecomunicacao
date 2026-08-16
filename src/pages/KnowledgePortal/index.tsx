import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, Stethoscope, Droplet, Database, Users, HelpCircle } from 'lucide-react';
import styles from './KnowledgePortal.module.css';
import { useAuth } from '../../context/AuthContext';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  department: string;
  category: string;
  updatedAt: string;
}

const faqs: FaqItem[] = [
  {
    id: 1,
    question: 'Qual o tempo máximo para transporte de amostras de gasometria?',
    answer: 'A amostra de sangue total para gasometria deve ser mantida em temperatura ambiente e analisada em até 30 minutos. Se a análise for demorar mais, deve ser mantida em banho de gelo (0-4°C) e analisada em até 1 hora.',
    department: 'Qualidade',
    category: 'Coleta e Preparo',
    updatedAt: '05/08/2026'
  },
  {
    id: 2,
    question: 'Como proceder quando o sistema SHIFT estiver fora do ar?',
    answer: 'Em caso de inoperância do sistema SHIFT, os atendimentos de urgência devem ser registrados no formulário físico PQ-014 (Plano de Contingência). Assim que o sistema retornar, os dados devem ser repassados para a plataforma em até 2 horas.',
    department: 'Tecnologia da Informação',
    category: 'Sistemas (SHIFT)',
    updatedAt: '10/08/2026'
  },
  {
    id: 3,
    question: 'Quais os documentos necessários para admissão de novos colaboradores?',
    answer: 'O novo colaborador deve apresentar: RG, CPF, Comprovante de Residência, Carteira de Trabalho, Título de Eleitor, Cartão SUS e Atestado Médico Admissional. A documentação deve ser enviada ao RH via sistema.',
    department: 'Recursos Humanos',
    category: 'Recursos Humanos',
    updatedAt: '15/07/2026'
  },
  {
    id: 4,
    question: 'Como solicitar acesso a novos módulos ou resetar senha de usuário?',
    answer: 'Para solicitação de novos acessos ou redefinição de credenciais de sistemas internos, abra um chamado na Central de Chamados (/suporte) selecionando a categoria "Acesso e senha".',
    department: 'Tecnologia da Informação',
    category: 'Sistemas (SHIFT)',
    updatedAt: '12/08/2026'
  },
  {
    id: 5,
    question: 'Qual o protocolo de prioridade para atendimento de pacientes especiais?',
    answer: 'Pacientes com mais de 80 anos possuem prioridade absoluta, seguidos por gestantes, lactantes, pessoas com deficiência e idosos acima de 60 anos, conforme POP de Atendimento.',
    department: 'Atendimento',
    category: 'Atendimento',
    updatedAt: '01/08/2026'
  }
];

export const KnowledgePortal: React.FC = () => {
  const { activeCompany } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleFaq = (id: number) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(selectedCategory === catName ? null : catName);
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = !selectedCategory || faq.category === selectedCategory;
      const normalized = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        faq.question.toLowerCase().includes(normalized) ||
        faq.answer.toLowerCase().includes(normalized) ||
        faq.department.toLowerCase().includes(normalized) ||
        faq.category.toLowerCase().includes(normalized);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

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
        <div className={styles.faqHeader}>
          <HelpCircle size={24} color="var(--color-primary-accent)" />
          <span>Perguntas Frequentes {selectedCategory && `(${selectedCategory})`}</span>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              style={{
                marginLeft: 'auto',
                fontSize: '0.8rem',
                color: 'var(--color-primary-accent)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Limpar filtro de categoria
            </button>
          )}
        </div>

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
