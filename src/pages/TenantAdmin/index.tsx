import React, { useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, ShieldCheck, Users, CheckCircle2, ArrowRight, X, UserPlus, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDepartments, getTenantUsers, createCompanyRequest, createTenantUserRequest, type Department, type TenantUser, type SystemRole } from '../../services/api';
import styles from './TenantAdmin.module.css';

export const TenantAdmin: React.FC = () => {
  const { activeCompany, session, user, switchCompany, addCompany } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [message, setMessage] = useState('Carregando dados da empresa...');
  
  // Modal de criação de empresa (apenas SaaS admin)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de criação de usuário (SaaS admin ou Admin da empresa ativa)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('employee');
  const [newUserDepts, setNewUserDepts] = useState<string[]>([]);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSaaSAdmin = user?.isSaaSAdmin === true;
  const canManageUsers = isSaaSAdmin || activeCompany?.membership?.role === 'owner' || activeCompany?.membership?.role === 'admin';

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setMessage('Carregando dados da empresa...');
    Promise.all([getDepartments(session), getTenantUsers(session)])
      .then(([departmentResponse, userResponse]) => {
        if (cancelled) return;
        setDepartments(departmentResponse.data);
        setUsers(userResponse.data);
        setMessage('');
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Erro ao carregar a empresa.');
      });
    return () => { cancelled = true; };
  }, [session, activeCompany?.id]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewCompanyName(val);
    const autoSlug = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setNewCompanySlug(autoSlug);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newCompanyName.trim()) return;

    setIsSubmitting(true);
    setCreateFeedback(null);

    try {
      const response = await createCompanyRequest(session, {
        name: newCompanyName.trim(),
        slug: newCompanySlug.trim() || undefined
      });

      addCompany(response.data, true);
      setCreateFeedback({ type: 'success', text: `Empresa "${response.data.name}" criada com sucesso! Você foi alternado para ela.` });
      setNewCompanyName('');
      setNewCompanySlug('');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateFeedback(null);
      }, 1500);
    } catch (err) {
      setCreateFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível criar a empresa.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 12) return;

    setIsSubmittingUser(true);
    setUserFeedback(null);

    try {
      const response = await createTenantUserRequest(session, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        departmentIds: newUserDepts
      });

      setUsers((prev) => {
        const existingIdx = prev.findIndex((u) => u.id === response.data.id || u.email === response.data.email);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = response.data;
          return updated;
        }
        return [response.data, ...prev];
      });

      setUserFeedback({ type: 'success', text: `Usuário "${response.data.name}" cadastrado com sucesso!` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('employee');
      setNewUserDepts([]);
      setTimeout(() => {
        setIsUserModalOpen(false);
        setUserFeedback(null);
      }, 1500);
    } catch (err) {
      setUserFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível cadastrar o usuário.'
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const toggleDeptSelection = (deptId: string) => {
    setNewUserDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span><Building2 size={16} aria-hidden="true" /> Gestão Corporativa</span>
          <h1>{activeCompany?.name}</h1>
          <p>Painel de controle corporativo e gestão de membros da empresa.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.tenantId}>
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <small>Tenant ID</small>
              <code>{activeCompany?.id}</code>
            </div>
          </div>
          {isSaaSAdmin && (
            <button
              type="button"
              className={styles.createCompanyBtn}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Criar Nova Empresa
            </button>
          )}
        </div>
      </header>

      {message && <div className={styles.message} role="status"><RefreshCw size={18} aria-hidden="true" />{message}</div>}

      <div className={styles.stats}>
        <article><Users aria-hidden="true" /><div><strong>{users.length}</strong><span>usuários ativos</span></div></article>
        <article><Building2 aria-hidden="true" /><div><strong>{departments.length}</strong><span>departamentos</span></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><strong>{activeCompany?.membership?.role ?? 'N/A'}</strong><span>seu papel</span></div></article>
      </div>

      {/* Seção com Empresas Vinculadas */}
      {user?.companies && user.companies.length > 1 && (
        <section className={styles.companiesCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Suas Empresas ({user.companies.length})</h2>
              <p>Alterne entre as empresas que você administra ou faz parte.</p>
            </div>
          </div>
          <div className={styles.companiesList}>
            {user.companies.map((company) => (
              <div key={company.id} className={`${styles.companyItem} ${company.id === activeCompany?.id ? styles.activeCompanyItem : ''}`}>
                <div className={styles.companyInfo}>
                  <Building2 size={18} aria-hidden="true" />
                  <div>
                    <strong>{company.name}</strong>
                    <small>Papel: {company.membership.role}</small>
                  </div>
                </div>
                {company.id === activeCompany?.id ? (
                  <span className={styles.activeTag}>Ativa</span>
                ) : (
                  <button
                    type="button"
                    className={styles.switchBtn}
                    onClick={() => switchCompany(company.id)}
                  >
                    Acessar <ArrowRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWithAction}>
              <div>
                <h2>Usuários ({users.length})</h2>
                <p>Membros vinculados a {activeCompany?.name}.</p>
              </div>
              {canManageUsers && (
                <button
                  type="button"
                  className={styles.addUserBtn}
                  onClick={() => setIsUserModalOpen(true)}
                >
                  <UserPlus size={15} aria-hidden="true" />
                  Novo Usuário
                </button>
              )}
            </div>
          </div>
          <div className={styles.list}>
            {users.map((u) => (
              <article key={u.id} className={styles.listItem}>
                <div className={styles.avatar}>{u.name.charAt(0)}</div>
                <div className={styles.itemContent}>
                  <strong>{u.name}</strong>
                  <span>{u.email}</span>
                  <small>{u.departments.join(', ') || 'Sem departamento'}</small>
                </div>
                <span className={styles.role}>{u.role}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Departamentos ({departments.length})</h2>
              <p>Estrutura organizacional desta empresa.</p>
            </div>
          </div>
          <div className={styles.departmentList}>
            {departments.map((dept) => (
              <article key={dept.id}>
                <span>{dept.code}</span>
                <div>
                  <strong>{dept.name}</strong>
                  <small>{dept.id}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Modal de Cadastro de Usuário na Empresa */}
      {isUserModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalKicker}><Building2 size={15} /> {activeCompany?.name}</span>
                <h2 id="user-modal-title">Cadastrar Novo Usuário</h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsUserModalOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {userFeedback && (
              <div className={`${styles.feedbackAlert} ${userFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                {userFeedback.type === 'success' && <CheckCircle2 size={16} />}
                {userFeedback.text}
              </div>
            )}

            <form onSubmit={handleCreateUser} className={styles.createForm}>
              <div className={styles.formGroup}>
                <label htmlFor="user-name">Nome Completo *</label>
                <div className={styles.inputWithIcon}>
                  <User size={17} aria-hidden="true" />
                  <input
                    id="user-name"
                    type="text"
                    placeholder="Ex: Dra. Mariana Costa"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="user-email">E-mail Corporativo *</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id="user-email"
                    type="email"
                    placeholder="Ex: mariana.costa@empresa.com.br"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="user-password">Senha Provisória *</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={17} aria-hidden="true" />
                  <input
                    id="user-password"
                    type="password"
                    placeholder="Mínimo de 12 caracteres"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <small className={styles.helperText}>Use pelo menos 12 caracteres. Não existe mais senha padrão.</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="user-role">Papel / Nível de Acesso *</label>
                <select
                  id="user-role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as SystemRole)}
                  className={styles.roleSelect}
                >
                  <option value="employee">Colaborador (Visualização e Leitura)</option>
                  <option value="publisher">Publicador (Criação de Comunicados)</option>
                  <option value="manager">Gestor (Acesso a relatórios e comunicados)</option>
                  <option value="admin">Administrador da Empresa (Acesso Total à Empresa)</option>
                  <option value="auditor">Auditor (Acesso Somente Leitura)</option>
                </select>
              </div>

              {departments.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Departamentos Vinculados</label>
                  <div className={styles.deptCheckboxGroup}>
                    {departments.map((dept) => (
                      <label key={dept.id} className={styles.deptCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={newUserDepts.includes(dept.id)}
                          onChange={() => toggleDeptSelection(dept.id)}
                        />
                        <span>{dept.code} - {dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsUserModalOpen(false)}
                  disabled={isSubmittingUser}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmittingUser || !newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 12}
                >
                  {isSubmittingUser ? 'Cadastrando...' : 'Cadastrar Usuário →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criação de Empresa (SaaS Admin) */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalKicker}><Building2 size={15} /> SaaS Multiempresa</span>
                <h2 id="modal-title">Cadastrar Nova Empresa</h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {createFeedback && (
              <div className={`${styles.feedbackAlert} ${createFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                {createFeedback.type === 'success' && <CheckCircle2 size={16} />}
                {createFeedback.text}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className={styles.createForm}>
              <div className={styles.formGroup}>
                <label htmlFor="company-name">Nome da Empresa *</label>
                <input
                  id="company-name"
                  type="text"
                  placeholder="Ex: Laboratório Vital, Hospital São Lucas"
                  value={newCompanyName}
                  onChange={handleNameChange}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="company-slug">Identificador / Slug (opcional)</label>
                <input
                  id="company-slug"
                  type="text"
                  placeholder="Ex: laboratorio-vital"
                  value={newCompanySlug}
                  onChange={(e) => setNewCompanySlug(e.target.value)}
                />
                <small className={styles.helperText}>Usado para URL e identificação de subdomínio.</small>
              </div>

              <div className={styles.defaultDeptsNotice}>
                <strong>Departamentos padrão criados automaticamente:</strong>
                <span>TI (Tecnologia da Informação), ADM (Administração) e RH (Recursos Humanos).</span>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting || !newCompanyName.trim()}
                >
                  {isSubmitting ? 'Cadastrando...' : 'Criar Empresa →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
