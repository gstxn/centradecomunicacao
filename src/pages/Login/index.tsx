import React, { useState } from 'react';
import { BookOpenCheck, Eye, EyeOff, LockKeyhole, Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('admin@central.test');
  const [password, setPassword] = useState('demo123');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 4) {
      setMessage('Informe um usuário e uma senha com pelo menos 4 caracteres.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      await login(email.trim(), password, remember);
      const destination = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar. Verifique se a API está ligada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.brandPanel} aria-label="Apresentação da Central">
        <div className={styles.brandGlow} />
        <div className={styles.brandContent}>
          <div className={styles.brandMark}><span>C</span><div><small>Central de</small><strong>Comunicação Interna</strong></div></div>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Seu canal corporativo oficial</span>
            <h1>Informação que chega.<br /><em>Conhecimento que fica.</em></h1>
            <p>Comunicados, documentos e orientações em um ambiente único, seguro e feito para a rotina das equipes.</p>
          </div>
          <div className={styles.featureGrid}>
            <div><MessageSquareText aria-hidden="true" /><span><strong>Comunicados</strong><small>Atualizações segmentadas</small></span></div>
            <div><BookOpenCheck aria-hidden="true" /><span><strong>Ciência registrada</strong><small>Leituras e pendências</small></span></div>
            <div><ShieldCheck aria-hidden="true" /><span><strong>Fonte confiável</strong><small>Conteúdo oficial</small></span></div>
          </div>
          <p className={styles.copyright}>Central de Comunicação Interna • Ambiente demonstrativo</p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}><span>C</span><strong>Central de Comunicação</strong></div>
        <div className={styles.formCard}>
          <div className={styles.formHeading}>
            <span className={styles.secureIcon}><LockKeyhole size={20} aria-hidden="true" /></span>
            <div><h2>Bem-vindo de volta</h2><p>Entre com suas credenciais corporativas.</p></div>
          </div>

          <div className={styles.demoNotice}><strong>Ambiente Corporativo SaaS</strong><span>Acesso demonstrativo: <strong>admin@saas.test</strong> (Administrador do SaaS — cria empresas) ou <strong>admin@central.test</strong> (Admin Central de Exames). Senha: <code>demo123</code></span></div>

          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="login-user">E-mail ou usuário</label>
              <div className={styles.inputWrapper}><Mail size={19} aria-hidden="true" />
                <input id="login-user" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="login-password">Senha</label>
              <div className={styles.inputWrapper}><LockKeyhole size={19} aria-hidden="true" />
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" className={styles.showPassword} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div className={styles.optionsRow}>
              <label className={styles.checkbox}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Lembrar neste dispositivo</span></label>
              <button type="button" className={styles.forgotLink} onClick={() => setMessage('No produto final, a recuperação será feita pelo diretório corporativo.')}>Esqueci minha senha</button>
            </div>
            {message && <p className={styles.formMessage} role="status">{message}</p>}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>{isSubmitting ? 'Conectando...' : 'Entrar na Central'} <span aria-hidden="true">→</span></button>
          </form>
          <p className={styles.securityNote}><ShieldCheck size={15} aria-hidden="true" /> Sessão armazenada somente neste navegador.</p>
        </div>
      </section>
    </main>
  );
};
