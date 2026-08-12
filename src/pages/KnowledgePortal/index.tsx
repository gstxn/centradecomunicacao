import React, { useState } from 'react';
import { Search, ChevronDown, Stethoscope, Droplet, Database, Users, HelpCircle } from 'lucide-react';
import styles from './KnowledgePortal.module.css';

const faqs = [
  {
    id: 1,
    question: 'Qual o tempo máximo para transporte de amostras de gasometria?',
    answer: 'A amostra de sangue total para gasometria deve ser mantida em temperatura ambiente e analisada em até 30 minutos. Se a análise for demorar mais, deve ser mantida em banho de gelo (0-4°C) e analisada em até 1 hora.',
    department: 'Qualidade',
    updatedAt: '05/05/2025'
  },
  {
    id: 2,
    question: 'Como proceder quando o sistema SHIFT estiver fora do ar?',
    answer: 'Em caso de inoperância do sistema SHIFT, os atendimentos de urgência devem ser registrados no formulário físico PQ-014 (Plano de Contingência). Assim que o sistema retornar, os dados devem ser repassados para a plataforma em até 2 horas.',
    department: 'Tecnologia da Informação',
    updatedAt: '10/05/2025'
  },
  {
    id: 3,
    question: 'Quais os documentos necessários para admissão de novos colaboradores?',
    answer: 'O novo colaborador deve apresentar: RG, CPF, Comprovante de Residência, Carteira de Trabalho, Título de Eleitor, Cartão SUS e Atestado Médico Admissional. A documentação deve ser enviada ao RH via sistema.',
    department: 'Recursos Humanos',
    updatedAt: '15/04/2025'
  }
];

export const KnowledgePortal: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(1);

  const toggleFaq = (id: number) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Portal do Conhecimento</h1>
        <p className={styles.subtitle}>Encontre orientações oficiais, FAQs e manuais da Central de Exames.</p>
        
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={24} />
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Como podemos ajudar? Busque por exame, sistema..." 
          />
        </div>
      </div>

      <div className={styles.categoriesGrid}>
        <div className={styles.categoryCard}>
          <div className={styles.catIcon}><Stethoscope size={24} /></div>
          <div className={styles.catTitle}>Atendimento</div>
        </div>
        <div className={styles.categoryCard}>
          <div className={styles.catIcon}><Droplet size={24} /></div>
          <div className={styles.catTitle}>Coleta e Preparo</div>
        </div>
        <div className={styles.categoryCard}>
          <div className={styles.catIcon}><Database size={24} /></div>
          <div className={styles.catTitle}>Sistemas (SHIFT)</div>
        </div>
        <div className={styles.categoryCard}>
          <div className={styles.catIcon}><Users size={24} /></div>
          <div className={styles.catTitle}>Recursos Humanos</div>
        </div>
      </div>

      <div className={styles.faqSection}>
        <div className={styles.faqHeader}>
          <HelpCircle size={24} color="var(--color-primary-accent)" />
          Perguntas Frequentes
        </div>

        <div className={styles.accordionList}>
          {faqs.map(faq => (
            <div key={faq.id} className={`${styles.accordionItem} ${openFaq === faq.id ? styles.open : ''}`}>
              <button 
                className={styles.accordionHeader} 
                onClick={() => toggleFaq(faq.id)}
              >
                {faq.question}
                <ChevronDown className={styles.chevron} size={20} />
              </button>
              <div className={styles.accordionContent}>
                <p className={styles.answerText}>{faq.answer}</p>
                <div className={styles.metaInfo}>
                  <span>Responsável: {faq.department}</span>
                  <span>Última atualização: {faq.updatedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
