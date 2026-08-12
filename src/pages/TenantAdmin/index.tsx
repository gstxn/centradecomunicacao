import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDepartments, getTenantUsers, type Department, type TenantUser } from '../../services/api';
import styles from './TenantAdmin.module.css';

export const TenantAdmin: React.FC = () => {
  const { activeCompany, session } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [message, setMessage] = useState('Carregando dados da empresa...');

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
  }, [session]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div><span><Building2 size={16} aria-hidden="true" /> Administração multiempresa</span><h1>{activeCompany?.name}</h1><p>Dados carregados pela API com isolamento do tenant ativo.</p></div>
        <div className={styles.tenantId}><ShieldCheck size={18} aria-hidden="true" /><div><small>Tenant ID</small><code>{activeCompany?.id}</code></div></div>
      </header>

      {message && <div className={styles.message} role="status"><RefreshCw size={18} aria-hidden="true" />{message}</div>}

      <div className={styles.stats}>
        <article><Users aria-hidden="true" /><div><strong>{users.length}</strong><span>usuários ativos</span></div></article>
        <article><Building2 aria-hidden="true" /><div><strong>{departments.length}</strong><span>departamentos</span></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><strong>{activeCompany?.membership.role}</strong><span>seu papel</span></div></article>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}><div className={styles.cardHeader}><div><h2>Usuários</h2><p>Somente membros de {activeCompany?.name}.</p></div></div>
          <div className={styles.list}>{users.map((user) => <article key={user.id} className={styles.listItem}><div className={styles.avatar}>{user.name.charAt(0)}</div><div className={styles.itemContent}><strong>{user.name}</strong><span>{user.email}</span><small>{user.departments.join(', ') || 'Sem departamento'}</small></div><span className={styles.role}>{user.role}</span></article>)}</div>
        </section>
        <section className={styles.card}><div className={styles.cardHeader}><div><h2>Departamentos</h2><p>Estrutura exclusiva desta empresa.</p></div></div>
          <div className={styles.departmentList}>{departments.map((department) => <article key={department.id}><span>{department.code}</span><div><strong>{department.name}</strong><small>{department.id}</small></div></article>)}</div>
        </section>
      </div>
    </div>
  );
};
