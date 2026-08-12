import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Users, Paperclip, Download, CheckCircle2, Trash2 } from 'lucide-react';
import styles from './ComunicadoDetail.module.css';
import { useComunicados } from '../../context/ComunicadosContext';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

export const ComunicadoDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { comunicados, markAsRead, deleteComunicado } = useComunicados();

  // Encontra o comunicado pelo ID na URL
  const comunicado = comunicados.find(c => c.id === Number(id));

  const handleConfirm = () => {
    if (comunicado) {
      markAsRead(comunicado.id);
    }
  };

  const handleDelete = () => {
    if (comunicado && window.confirm('Tem certeza que deseja excluir este comunicado? Esta ação não pode ser desfeita.')) {
      deleteComunicado(comunicado.id);
      navigate('/comunicados');
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
        <button onClick={handleDelete} className={styles.deleteButton}>
          <Trash2 size={16} />
          Excluir Comunicado
        </button>
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
            <div className={styles.metaItem}>
              <User size={16} />
              {comunicado.author}
            </div>
            <div className={styles.metaItem}>
              <Users size={16} />
              Público: Toda a empresa
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
                <div key={index} className={styles.attachItem} aria-label={`Anexo ${attach.name}`}>
                  <div className={styles.attachLeft}>
                    <div style={{padding: '0.5rem', backgroundColor: 'var(--color-bg-body)', color: 'var(--color-text-main)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontWeight: 600}}>
                      {attach.type}
                    </div>
                    <div>
                      <div className={styles.attachName}>{attach.name}</div>
                      <div className={styles.attachSize}>{attach.size}</div>
                    </div>
                  </div>
                  <Download size={20} color="var(--color-text-muted)" aria-hidden="true" />
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
