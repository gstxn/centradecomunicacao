import React, { useState, useRef, useEffect } from 'react';
import { 
  FileEdit, 
  Settings2, 
  Paperclip, 
  File,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import styles from './NewPublication.module.css';
import { useComunicados } from '../../context/ComunicadosContext';

export const NewPublication: React.FC = () => {
  const navigate = useNavigate();
  const { addComunicado } = useComunicados();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sistemas');
  const [type, setType] = useState('Informativo');
  const [formError, setFormError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null);

  useEffect(() => {
    if (quillRef.current && !quillInstance.current) {
      quillInstance.current = new Quill(quillRef.current, {
        theme: 'snow',
        placeholder: 'Escreva o conteúdo do comunicado aqui...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });

      quillInstance.current.on('text-change', () => {
        setContent(quillInstance.current.root.innerHTML);
      });
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) => file.size <= 10 * 1024 * 1024);
      if (newFiles.length !== e.target.files.length) {
        setFormError('Arquivos com mais de 10 MB não foram adicionados.');
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Preencha o título do comunicado.');
      return;
    }
    if (!quillInstance.current || quillInstance.current.getText().trim().length === 0) {
      setFormError('Escreva o conteúdo do comunicado.');
      return;
    }
    setFormError('');
    
    addComunicado({
      title,
      category,
      type,
      author: 'Matheus Alves (Admin)',
      department: 'Administração',
      content,
      attachments: files.map(f => ({
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        type: f.name.split('.').pop()?.toUpperCase() || 'ARQUIVO'
      }))
    });
    
    navigate('/comunicados');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nova Publicação</h1>
        <p className={styles.subtitle}>Crie um novo comunicado para a Central de Comunicação Interna</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {formError && <div id="publication-error" className={styles.formError} role="alert">{formError}</div>}
        
        {/* Informações Básicas */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <FileEdit size={20} color="var(--color-primary-accent)" />
            Informações Básicas
          </div>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-title">Título do Comunicado</label>
              <input 
                id="publication-title"
                type="text" 
                className={styles.input} 
                placeholder="Ex: Nova política de horários..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-describedby={formError ? 'publication-error' : undefined}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-category">Categoria</label>
              <select id="publication-category" className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Sistemas">Sistemas</option>
                <option value="RH">Recursos Humanos</option>
                <option value="Qualidade">Qualidade</option>
                <option value="Infraestrutura">Infraestrutura e Obras</option>
                <option value="Operação">Operação</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-type">Tipo de Aviso</label>
              <select id="publication-type" className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Informativo">Informativo</option>
                <option value="Urgente">Urgente</option>
                <option value="Normativo">Normativo (Compliance)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-department">Setor Responsável</label>
              <select id="publication-department" className={styles.select} defaultValue="ti">
                <option value="ti">Tecnologia da Informação</option>
                <option value="qualidade">Qualidade</option>
                <option value="rh">Recursos Humanos</option>
                <option value="operacoes">Operações</option>
              </select>
            </div>
          </div>
        </div>

        {/* Configurações de Publicação */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Settings2 size={20} color="var(--color-primary-accent)" />
            Configurações e Público
          </div>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-audience">Público Destinatário</label>
              <select id="publication-audience" className={styles.select}>
                <option value="todos">Toda a empresa</option>
                <option value="gestores">Apenas gestores</option>
                <option value="operacao">Setor de Operações</option>
                <option value="matriz">Apenas Matriz</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="publication-expiration">Data de Fim de Vigência</label>
              <input id="publication-expiration" type="date" className={styles.input} max="9999-12-31" />
            </div>

            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.checkboxGroup}>
                <input type="checkbox" defaultChecked />
                <div>
                  <span className={styles.checkboxText}>Exigir confirmação de leitura obrigatória</span>
                  <span className={styles.checkboxDesc}>Os colaboradores selecionados no público alvo precisarão marcar "ciente" para que a pendência seja removida de seus painéis.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <FileEdit size={20} color="var(--color-primary-accent)" />
            Conteúdo
          </div>
          
          <div className={styles.formGroup}>
            <span id="publication-content-label" className={styles.label}>Conteúdo do comunicado</span>
            <div className={styles.quillWrapper}>
              <div ref={quillRef} role="textbox" aria-multiline="true" aria-labelledby="publication-content-label" />
            </div>
          </div>
        </div>

        {/* Anexos */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Paperclip size={20} color="var(--color-primary-accent)" />
            Anexos
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            onChange={handleFileChange}
          />

          <button type="button" className={styles.dragDropArea} onClick={triggerFileInput}>
            <Paperclip size={32} />
            <div style={{textAlign: 'center'}}>
              <div style={{fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '0.25rem'}}>
                Clique ou arraste arquivos para esta área
              </div>
              <div style={{fontSize: '0.85rem'}}>PDF, Word, Excel ou Imagens (Máx 10MB)</div>
            </div>
          </button>

          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <File size={20} color="var(--color-text-muted)" />
                    <div>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className={styles.removeFileBtn}
                    onClick={() => removeFile(index)}
                    aria-label={`Remover ${file.name}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          <button type="button" className={styles.btnCancel} onClick={() => navigate('/comunicados')}>Cancelar</button>
          <button type="submit" className={styles.btnSubmit}>Publicar Comunicado</button>
        </div>

      </form>
    </div>
  );
};
