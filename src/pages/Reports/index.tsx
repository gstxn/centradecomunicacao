import React from 'react';
import { FileBarChart, Download, FileSpreadsheet, FileText, Users, EyeOff } from 'lucide-react';
import styles from './Reports.module.css';

const reportsList = [
  {
    id: 1,
    title: 'Engajamento por Setor',
    desc: 'Visão consolidada da taxa de leitura de comunicados separada por unidades e departamentos da Central de Exames.',
    icon: <Users size={24} />
  },
  {
    id: 2,
    title: 'Relatório de Inadimplência',
    desc: 'Lista detalhada de colaboradores que possuem comunicados obrigatórios vencidos (não confirmados).',
    icon: <EyeOff size={24} />
  },
  {
    id: 3,
    title: 'Histórico de Publicações',
    desc: 'Log completo de todos os comunicados disparados em um período, incluindo autores e categorias.',
    icon: <FileText size={24} />
  },
  {
    id: 4,
    title: 'Consultas no Portal do Conhecimento',
    desc: 'Relatório mostrando os termos mais pesquisados e cliques nos FAQs, útil para criar novos materiais.',
    icon: <FileBarChart size={24} />
  }
];

export const Reports: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Relatórios e Exportações</h1>
        <p className={styles.subtitle}>Extraia dados consolidados em planilhas ou relatórios em PDF.</p>
      </div>

      <div className={styles.grid}>
        {reportsList.map(report => (
          <div key={report.id} className={styles.reportCard}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                {report.icon}
              </div>
              <h3 className={styles.cardTitle}>{report.title}</h3>
            </div>
            
            <p className={styles.cardDesc}>{report.desc}</p>
            
            <div className={styles.cardActions}>
              <button className={styles.btnExport}>
                <FileSpreadsheet size={18} />
                Exportar CSV
              </button>
              <button className={`${styles.btnExport} ${styles.primary}`}>
                <Download size={18} />
                Gerar PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
