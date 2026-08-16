import React, { useMemo, useState } from 'react';
import { Archive, ArrowDownToLine, ArrowUpRight, BookMarked, FileCheck2, FileText, Folder, Search, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './DocumentLibrary.module.css';

export interface CorporateDocument {
  id: string;
  name: string;
  code: string;
  dept: 'Qualidade' | 'Operações' | 'Pessoas' | 'Tecnologia';
  version: string;
  updated: string;
  status: 'Vigente' | 'Em revisão' | 'Obsoleto';
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
    description: 'Fluxograma de acolhimento, conferência de guias de convênio e prioridades de atendimento.'
  },
  {
    id: 'doc-3',
    name: 'Política de Segurança da Informação e Gestão de Senhas',
    code: 'POL-TI-005',
    dept: 'Tecnologia',
    version: 'v3.0',
    updated: '12/08/2026',
    status: 'Vigente',
    description: 'Regras de acesso a sistemas internos, 2FA, uso aceitável de dispositivos e LGPD.'
  },
  {
    id: 'doc-4',
    name: 'Código de Conduta Ética e Regimento Interno',
    code: 'MAN-RH-002',
    dept: 'Pessoas',
    version: 'v2.1',
    updated: '20/07/2026',
    status: 'Vigente',
    description: 'Normas de convivência, canais de ouvidoria, benefícios e políticas de desenvolvimento.'
  },
  {
    id: 'doc-5',
    name: 'Plano de Contingência em Caso de Queda do Sistema SHIFT/LIS',
    code: 'POP-TI-018',
    dept: 'Tecnologia',
    version: 'v1.9',
    updated: '02/08/2026',
    status: 'Vigente',
    description: 'Roteiro manual para lançamento de exames urgentes durante indisponibilidade do banco.'
  },
  {
    id: 'doc-6',
    name: 'Protocolo de Higienização e Calibração de Centrífugas e Equipamentos',
    code: 'POP-QUAL-009',
    dept: 'Qualidade',
    version: 'v3.5',
    updated: '28/07/2026',
    status: 'Vigente',
    description: 'Checklist diário e semanal para conservação e controle de qualidade de equipamentos.'
  },
  {
    id: 'doc-7',
    name: 'Guia de Benefícios, Reembolsos e Auxílio Educação',
    code: 'GUI-RH-008',
    dept: 'Pessoas',
    version: 'v1.4',
    updated: '15/06/2026',
    status: 'Vigente',
    description: 'Critérios para concessão de bolsas de estudo, vale alimentação e plano de saúde.'
  },
  {
    id: 'doc-8',
    name: 'Procedimento Antigo de Liberação Manual de Laudos (Substituído)',
    code: 'POP-OPE-003',
    dept: 'Operações',
    version: 'v1.0',
    updated: '10/01/2024',
    status: 'Obsoleto',
    description: 'Documento revogado pelo POP-OPE-012.'
  }
];

export const DocumentLibrary: React.FC = () => {
  const [documents] = useState<CorporateDocument[]>(initialDocuments);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('Todos');

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
                    <small>
                      {doc.code} · {doc.status.toUpperCase()}
                    </small>
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
