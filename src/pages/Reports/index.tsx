import React, { useState } from 'react';
import { FileBarChart, Download, FileSpreadsheet, FileText, Users, EyeOff, CheckCircle2 } from 'lucide-react';
import styles from './Reports.module.css';
import { useComunicados } from '../../context/ComunicadosContext';
import { useAuth } from '../../context/AuthContext';

export const Reports: React.FC = () => {
  const { comunicados } = useComunicados();
  const { activeCompany } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback(`Relatório "${filename}" exportado com sucesso!`);
  };

  const handleExportSectorEngagement = () => {
    const categories = Array.from(new Set(comunicados.map((c) => c.category || c.department || 'Geral')));
    let csv = 'Setor;Total Comunicados;Lidos;Pendentes;Taxa de Conformidade\n';
    categories.forEach((cat) => {
      const catNotices = comunicados.filter((c) => (c.category || c.department) === cat);
      const lidos = catNotices.filter((c) => c.read).length;
      const pendentes = catNotices.filter((c) => !c.read).length;
      const rate = catNotices.length === 0 ? '100%' : `${Math.round((lidos / catNotices.length) * 100)}%`;
      csv += `"${cat}";${catNotices.length};${lidos};${pendentes};"${rate}"\n`;
    });
    downloadCsv(`engajamento_por_setor_${activeCompany?.slug ?? 'empresa'}.csv`, csv);
  };

  const handleExportPending = () => {
    const unread = comunicados.filter((c) => !c.read);
    let csv = 'ID;Titulo;Tipo;Categoria;Departamento;Autor;Data Publicacao;Situacao\n';
    unread.forEach((c) => {
      csv += `"${c.id}";"${c.title.replace(/"/g, '""')}";"${c.type}";"${c.category}";"${c.department}";"${c.author}";"${c.date}";"Pendente de Leitura"\n`;
    });
    downloadCsv(`relatorio_pendencias_leitura_${activeCompany?.slug ?? 'empresa'}.csv`, csv);
  };

  const handleExportHistory = () => {
    let csv = 'ID;Titulo;Tipo;Categoria;Departamento;Autor;Data Publicacao;Status Leitura;Data Leitura\n';
    comunicados.forEach((c) => {
      csv += `"${c.id}";"${c.title.replace(/"/g, '""')}";"${c.type}";"${c.category}";"${c.department}";"${c.author}";"${c.date}";"${c.read ? 'Lido' : 'Pendente'}";"${c.readAt ?? '-'}"\n`;
    });
    downloadCsv(`historico_publicacoes_${activeCompany?.slug ?? 'empresa'}.csv`, csv);
  };

  const handleExportFaq = () => {
    const csv = `ID;Pergunta;Departamento;Data Atualizacao
1;"Qual o tempo maximo para transporte de amostras de gasometria?";"Qualidade";"05/05/2025"
2;"Como proceder quando o sistema SHIFT estiver fora do ar?";"Tecnologia da Informacao";"10/05/2025"
3;"Quais os documentos necessarios para admissao de novos colaboradores?";"Recursos Humanos";"15/04/2025"
`;
    downloadCsv(`consultas_portal_conhecimento_${activeCompany?.slug ?? 'empresa'}.csv`, csv);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const reportsList = [
    {
      id: 1,
      title: 'Engajamento por Setor',
      desc: 'Visão consolidada da taxa de leitura de comunicados separada por unidades e departamentos da empresa.',
      icon: <Users size={24} />,
      onExportCsv: handleExportSectorEngagement
    },
    {
      id: 2,
      title: 'Relatório de Inadimplência',
      desc: 'Lista detalhada de comunicados e diretrizes obrigatórias que ainda não foram confirmadas pelos colaboradores.',
      icon: <EyeOff size={24} />,
      onExportCsv: handleExportPending
    },
    {
      id: 3,
      title: 'Histórico de Publicações',
      desc: 'Log completo de todos os comunicados disparados no mural, incluindo autores, tipos, setores e confirmações.',
      icon: <FileText size={24} />,
      onExportCsv: handleExportHistory
    },
    {
      id: 4,
      title: 'Consultas no Portal do Conhecimento',
      desc: 'Relatório estruturado com os tópicos oficiais, FAQs e procedimentos mapeados no portal corporativo.',
      icon: <FileBarChart size={24} />,
      onExportCsv: handleExportFaq
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Relatórios e Exportações</h1>
        <p className={styles.subtitle}>
          Extraia dados consolidados da comunicação de {activeCompany?.name ?? 'sua empresa'} em planilhas ou PDF.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div className={styles.grid}>
        {reportsList.map((report) => (
          <div key={report.id} className={styles.reportCard}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>{report.icon}</div>
              <h3 className={styles.cardTitle}>{report.title}</h3>
            </div>

            <p className={styles.cardDesc}>{report.desc}</p>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.btnExport}
                onClick={report.onExportCsv}
                title="Baixar planilha CSV com os dados atuais"
              >
                <FileSpreadsheet size={18} />
                Exportar CSV
              </button>
              <button
                type="button"
                className={`${styles.btnExport} ${styles.primary}`}
                onClick={handlePrintPdf}
                title="Imprimir ou salvar em PDF"
              >
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
