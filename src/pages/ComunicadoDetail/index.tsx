import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Users, Paperclip, Download, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './ComunicadoDetail.module.css';
import { useComunicados } from '../../context/ComunicadosContext';
import { useAuth } from '../../context/AuthContext';
import { getAttachmentRequest } from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

export const ComunicadoDetail: React.FC = () => {
  const { id } = useParams();
  const { comunicados, markAsRead } = useComunicados();
  const { session } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Encontra o comunicado pelo ID na URL
  const comunicado = comunicados.find((c) => c.id === id);

  const handleConfirm = () => {
    if (comunicado) {
      markAsRead(comunicado.id);
    }
  };

  const handleDownloadAttachment = async (attach: { id?: string; name: string; size: string; type: string }) => {
    if (!attach.id || !session) {
      const fallbackContent = `Anexo: ${attach.name}\nTamanho: ${attach.size}\nTipo: ${attach.type}\nComunicado: ${comunicado?.title ?? ''}`;
      const blob = new Blob([fallbackContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attach.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    setDownloadingId(attach.id);
    try {
      const res = await getAttachmentRequest(session, attach.id);
      if (res.data?.dataBase64) {
        const byteCharacters = atob(res.data.dataBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename || attach.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Conteúdo do anexo indisponível.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao baixar anexo.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!comunicado) {
    return (
      <div className={styles.container}>
        <h2>Comunicado não encontrado.</h2>
        <Link to="/comunicados">Voltar</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topActions}>
        <Link to="/comunicados" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar para Comunicados
        </Link>
      </div>

      <article className={styles.paper}>
        <header className={styles.header}>
          <div className={styles.tags}>
            <span className={`${styles.tag} ${comunicado.type === 'Urgente' ? styles.urgent : ''}`}>
              {comunicado.type}
            </span>
            <span className={styles.tag}>
              {comunicado.category}
            </span>
          </div>
          
          <h1 className={styles.title}>{comunicado.title}</h1>
          
          <div className={styles.metaBar}>
            <div className={styles.metaItem}>
              <Calendar size={16} />
              Publicado em {comunicado.date}
            </div>
            {comunicado.validUntil && (
              <div className={styles.metaItem} style={{ color: 'var(--color-primary-accent)', fontWeight: 600 }}>
                <Calendar size={16} />
                Vigência até: {new Intl.DateTimeFormat('pt-BR').format(new Date(comunicado.validUntil))}
              </div>
            )}
            <div className={styles.metaItem}>
              <User size={16} />
              {comunicado.author}
            </div>
            <div className={styles.metaItem}>
              <Users size={16} />
              Público: {comunicado.targetAudience || 'Toda a empresa'}
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {comunicado.content ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(comunicado.content) }} />
          ) : (
            <>
              <p>Prezados colaboradores,</p>
              <p>Esta é uma visualização padrão para comunicados do sistema antigo. Informamos que o sistema passará por uma atualização programada.</p>
              <p>O objetivo desta atualização é aplicar patches de segurança recomendados pelo fabricante.</p>
              
              <h3>Impactos esperados:</h3>
              <p>Durante a janela de manutenção, preste atenção aos novos fluxos. Solicitações de urgência que ocorrerem neste horário deverão seguir o plano de contingência manual, conforme POP da Qualidade.</p>

              <h3>Ações necessárias:</h3>
              <p>Pedimos aos gestores de unidade que repassem esta informação para as equipes de plantão.</p>
              
              <p>Em caso de dúvidas, favor abrir chamado.</p>
              <p>Agradecemos a compreensão.</p>
            </>
          )}
        </div>

        {comunicado.attachments && comunicado.attachments.length > 0 && (
          <section className={styles.attachments}>
            <h4 className={styles.attachTitle}>
              <Paperclip size={18} />
              Anexos ({comunicado.attachments.length})
            </h4>
            <div className={styles.attachList}>
              {comunicado.attachments.map((attach, index) => (
                <div
                  key={index}
                  className={styles.attachItem}
                  onClick={() => handleDownloadAttachment(attach)}
                  style={{ cursor: 'pointer' }}
                  title="Clique para baixar o arquivo"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDownloadAttachment(attach); }}
                  aria-label={`Baixar anexo ${attach.name}`}
                >
                  <div className={styles.attachLeft}>
                    <div style={{padding: '0.5rem', backgroundColor: 'var(--color-bg-body)', color: 'var(--color-text-main)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontWeight: 600}}>
                      {attach.type}
                    </div>
                    <div>
                      <div className={styles.attachName}>{attach.name}</div>
                      <div className={styles.attachSize}>{attach.size}</div>
                    </div>
                  </div>
                  {downloadingId === attach.id ? (
                    <Loader2 size={20} className="spin" color="var(--color-primary-accent)" />
                  ) : (
                    <Download size={20} color="var(--color-text-muted)" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`${styles.confirmationSection} ${comunicado.read ? styles.confirmed : ''}`}>
          {comunicado.read ? (
            <>
              <CheckCircle2 size={48} color="var(--color-success)" style={{marginBottom: '1rem'}} />
              <h4 className={styles.confirmTitle}>Leitura confirmada com sucesso!</h4>
              <p className={styles.confirmText}>{comunicado.readAt ? `Registramos sua ciência em ${comunicado.readAt}.` : 'Leitura registrada anteriormente.'}</p>
              <button className={`${styles.confirmButton} ${styles.confirmed}`} disabled>
                Confirmado
              </button>
            </>
          ) : (
            <>
              <h4 className={styles.confirmTitle}>Confirmação de Leitura Obrigatória</h4>
              <p className={styles.confirmText}>Este comunicado exige confirmação de leitura. Ao confirmar, você declara ter lido e compreendido as informações apresentadas acima.</p>
              <button className={styles.confirmButton} onClick={handleConfirm}>
                Confirmo que li e estou ciente
              </button>
            </>
          )}
        </section>

      </article>
    </div>
  );
};
