import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { pool, withTenantTransaction } from './db.js';
import type {
  AuthenticatedUser,
  CompanySummary,
  DepartmentSummary,
  MembershipSummary,
  PermissionKey,
  SystemRole
} from '../../../packages/contracts/src/index.js';

interface Session {
  userId: string;
  activeCompanyId: string;
  expiresAt: Date;
}

export interface TenantUserView {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  departments: string[];
}

const tenantContextBrand = Symbol('TenantContext');

export interface TenantContext {
  readonly [tenantContextBrand]: true;
  companyId: string;
  userId: string;
  membership: MembershipSummary;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// ==========================================
// In-Memory Fallback Store (when Postgres is offline)
// ==========================================
let isDbAvailable: boolean | null = null;

export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('PostgreSQL indisponível.');
    this.name = 'DatabaseUnavailableError';
    this.cause = cause;
  }
}

const isDemoMode = () => (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE !== 'false') && process.env.NODE_ENV !== 'production' && process.env.REQUIRE_DATABASE !== 'true';

const markDatabaseUnavailable = (error?: unknown) => {
  isDbAvailable = false;
  if (!isDemoMode()) throw new DatabaseUnavailableError(error);
  console.warn('[API Store] PostgreSQL indisponível. Usando armazenamento em memória demonstrativo.');
};

const checkDbConnection = async (): Promise<boolean> => {
  if (isDbAvailable === false && !isDemoMode()) throw new DatabaseUnavailableError();
  if (isDbAvailable !== null) return isDbAvailable;
  try {
    const client = await pool.connect();
    client.release();
    isDbAvailable = true;
    return true;
  } catch (error) {
    markDatabaseUnavailable(error);
    return false;
  }
};

const ALL_PERMISSIONS: PermissionKey[] = [
  'company.manage', 'users.view', 'users.manage', 'departments.manage',
  'notices.create', 'notices.publish', 'reports.view', 'audit.view', 'support.manage'
];

const AUDITOR_PERMISSIONS: PermissionKey[] = ['users.view', 'reports.view', 'audit.view'];
const MANAGER_PERMISSIONS: PermissionKey[] = ['users.view', 'notices.create', 'notices.publish', 'reports.view'];

const MOCK_COMPANIES = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Central de Exames', slug: 'central-exames', status: 'active' as const }
];

const MOCK_USERS = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', name: 'Administrador Geral', email: 'admin@saas.test', password: 'demo123', isSaaSAdmin: true },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', name: 'Admin Central', email: 'admin@central.test', password: 'demo123', isSaaSAdmin: false },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', name: 'Auditor Geral', email: 'auditor@saas.test', password: 'demo123', isSaaSAdmin: false }
];

const MOCK_MEMBERSHIPS: Array<{
  id: string;
  companyId: string;
  userId: string;
  role: SystemRole;
  status: 'active' | 'invited' | 'suspended';
}> = [
  { id: 'm1', companyId: '11111111-1111-4111-8111-111111111111', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', role: 'owner', status: 'active' },
  { id: 'm3', companyId: '11111111-1111-4111-8111-111111111111', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', role: 'admin', status: 'active' },
  { id: 'm5', companyId: '11111111-1111-4111-8111-111111111111', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', role: 'auditor', status: 'active' }
];

const MOCK_DEPARTMENTS: DepartmentSummary[] = [
  { id: 'd1', companyId: '11111111-1111-4111-8111-111111111111', name: 'Tecnologia da Informação', code: 'TI' },
  { id: 'd2', companyId: '11111111-1111-4111-8111-111111111111', name: 'Qualidade', code: 'QUAL' },
  { id: 'd3', companyId: '11111111-1111-4111-8111-111111111111', name: 'Recursos Humanos', code: 'RH' }
];

const getRolePermissions = (role: SystemRole): PermissionKey[] => {
  if (role === 'owner' || role === 'admin') return ALL_PERMISSIONS;
  if (role === 'auditor') return AUDITOR_PERMISSIONS;
  if (role === 'manager') return MANAGER_PERMISSIONS;
  return [];
};

interface MockNotice {
  id: string;
  companyId: string;
  title: string;
  category: string;
  type: 'urgent' | 'informative' | 'update';
  content: string;
  authorId: string;
  authorName: string;
  departmentName: string;
  createdAt: string;
}

const mockNotices: MockNotice[] = [
  {
    id: '33333333-3333-4333-8333-333333333331',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Nova Diretriz de Segurança e Acesso aos Sistemas',
    category: 'TI',
    type: 'urgent',
    content: '<p>Prezados colaboradores,</p><p>Reforçamos a obrigatoriedade da autenticação em duas etapas e da conformidade com as diretrizes de segurança da informação.</p><p>Por favor, confirmem a ciência desta orientação.</p>',
    authorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    authorName: 'Admin Central',
    departmentName: 'Tecnologia da Informação',
    createdAt: new Date().toISOString()
  },
  {
    id: '33333333-3333-4333-8333-333333333332',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Atualização do Procedimento Operacional Padrão',
    category: 'Qualidade',
    type: 'informative',
    content: '<p>O manual de boas práticas foi atualizado e está disponível para consulta na Biblioteca de Documentos.</p>',
    authorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    authorName: 'Admin Central',
    departmentName: 'Qualidade',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockSessions = new Map<string, { userId: string; expiresAt: Date }>();
const mockReads = new Map<string, string>(); // key: `${companyId}:${noticeId}:${userId}` -> readAt ISO

// ==========================================
// Public Store API
// ==========================================

export const authenticate = async (email: string, password: string) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query(`
        SELECT id, name, email, is_saas_admin AS "isSaaSAdmin"
        FROM users
        WHERE email = $1 AND password_hash = crypt($2, password_hash) AND status = 'active'
      `, [email.toLowerCase(), password]);

      if (result.rows.length === 0) return null;
      const user = result.rows[0];

      const companiesQuery = await pool.query('SELECT * FROM list_active_companies_for_user($1)', [user.id]);

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        isSaaSAdmin: user.isSaaSAdmin === true,
        companies: companiesQuery.rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          membership: {
            id: row.membership_id,
            companyId: row.id,
            userId: user.id,
            role: row.role as SystemRole,
            departmentIds: [],
            permissions: row.permission_keys as PermissionKey[],
            status: row.membership_status
          }
        }))
      };

      const activeCompanyId = authenticatedUser.companies[0]?.id;
      if (!activeCompanyId) return null;

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await pool.query('INSERT INTO auth_sessions(user_id, token_hash, expires_at) VALUES($1,$2,$3)', [user.id, hashToken(token), expiresAt]);
      return { accessToken: token, user: authenticatedUser, activeCompanyId };
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  // In-Memory Fallback
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
  if (!user) return null;

  const userMemberships = MOCK_MEMBERSHIPS.filter((m) => m.userId === user.id && m.status === 'active');
  const userCompanies = userMemberships.map((m) => {
    const company = MOCK_COMPANIES.find((c) => c.id === m.companyId)!;
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      status: company.status,
      membership: {
        id: m.id,
        companyId: company.id,
        userId: user.id,
        role: m.role,
        departmentIds: [],
        permissions: getRolePermissions(m.role),
        status: m.status
      }
    };
  });

  const activeCompanyId = userCompanies[0]?.id;
  if (!activeCompanyId) return null;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  mockSessions.set(token, { userId: user.id, expiresAt });

  return {
    accessToken: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isSaaSAdmin: user.isSaaSAdmin,
      companies: userCompanies
    },
    activeCompanyId
  };
};

export const resolveSession = async (token: string): Promise<Session | null> => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query(`UPDATE auth_sessions SET last_seen_at=now()
        WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()
        RETURNING user_id AS "userId", expires_at AS "expiresAt"`, [hashToken(token)]);
      const row = result.rows[0];
      if (row) return { userId: row.userId, activeCompanyId: '', expiresAt: row.expiresAt };
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const session = mockSessions.get(token);
  if (session && session.expiresAt.getTime() >= Date.now()) {
    return { userId: session.userId, activeCompanyId: '', expiresAt: session.expiresAt };
  }

  if (session) mockSessions.delete(token);
  return null;
};

export const revokeSession = async (token: string) => {
  if (await checkDbConnection()) {
    try {
      await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL', [hashToken(token)]);
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  mockSessions.delete(token);
};

export const resolveTenant = async (token: string, requestedCompanyId: string): Promise<TenantContext | null> => {
  const session = await resolveSession(token);
  if (!session) return null;

  const isGlobalAdmin = await isSaaSAdmin(session.userId);

  if (await checkDbConnection()) {
    try {
      const result = await withTenantTransaction(requestedCompanyId, (client) => client.query(`
        SELECT m.id, m.role, m.status,
          ARRAY(SELECT rp.permission_key FROM role_permissions rp
            WHERE rp.company_id = m.company_id AND rp.role = m.role) AS permission_keys
        FROM memberships m
        WHERE m.user_id = $1 AND m.company_id = $2 AND m.status = 'active'
      `, [session.userId, requestedCompanyId]));

      if (result.rows.length > 0) {
        const membership: MembershipSummary = {
          id: result.rows[0].id,
          companyId: requestedCompanyId,
          userId: session.userId,
          role: result.rows[0].role as SystemRole,
          status: result.rows[0].status,
          departmentIds: [],
          permissions: result.rows[0].permission_keys as PermissionKey[]
        };
        return { [tenantContextBrand]: true, companyId: requestedCompanyId, userId: session.userId, membership };
      }

      if (isGlobalAdmin) {
        const compRes = await withTenantTransaction(requestedCompanyId, (client) => client.query('SELECT id, name FROM companies WHERE id = $1', [requestedCompanyId]));
        if (compRes.rows.length > 0) {
          const membership: MembershipSummary = {
            id: `saas_admin_${requestedCompanyId.slice(0, 8)}`,
            companyId: requestedCompanyId,
            userId: session.userId,
            role: 'owner',
            status: 'active',
            departmentIds: [],
            permissions: ALL_PERMISSIONS
          };
          return { [tenantContextBrand]: true, companyId: requestedCompanyId, userId: session.userId, membership };
        }
      }
      return null;
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  // In-Memory Fallback
  const membership = MOCK_MEMBERSHIPS.find((m) => m.userId === session.userId && m.companyId === requestedCompanyId && m.status === 'active');
  if (membership) {
    return {
      [tenantContextBrand]: true,
      companyId: requestedCompanyId,
      userId: session.userId,
      membership: {
        id: membership.id,
        companyId: requestedCompanyId,
        userId: session.userId,
        role: membership.role,
        status: membership.status,
        departmentIds: [],
        permissions: getRolePermissions(membership.role)
      }
    };
  }

  // If SaaS Admin, grant owner access to any requested company
  if (isGlobalAdmin) {
    let company = MOCK_COMPANIES.find((c) => c.id === requestedCompanyId);
    if (!company) {
      company = {
        id: requestedCompanyId,
        name: 'Empresa Ativa',
        slug: `empresa-${requestedCompanyId.slice(0, 6)}`,
        status: 'active'
      };
      MOCK_COMPANIES.push(company);
    }
    return {
      [tenantContextBrand]: true,
      companyId: requestedCompanyId,
      userId: session.userId,
      membership: {
        id: `saas_admin_${requestedCompanyId.slice(0, 8)}`,
        companyId: requestedCompanyId,
        userId: session.userId,
        role: 'owner',
        departmentIds: [],
        permissions: ALL_PERMISSIONS,
        status: 'active'
      }
    };
  }

  return null;
};

export const listCompaniesForUser = async (userId: string) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query('SELECT id, name, slug, status FROM list_active_companies_for_user($1)', [userId]);
      return result.rows as CompanySummary[];
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const memberships = MOCK_MEMBERSHIPS.filter((m) => m.userId === userId && m.status === 'active');
  return memberships.map((m) => {
    const c = MOCK_COMPANIES.find((comp) => comp.id === m.companyId)!;
    return { id: c.id, name: c.name, slug: c.slug, status: c.status };
  });
};

export const isSaaSAdmin = async (userId: string): Promise<boolean> => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query('SELECT is_saas_admin FROM users WHERE id = $1', [userId]);
      return result.rows[0]?.is_saas_admin === true;
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const user = MOCK_USERS.find((u) => u.id === userId);
  return user?.isSaaSAdmin === true;
};

export interface CreateCompanyInput {
  name: string;
  slug?: string;
  departments?: Array<{ name: string; code: string }>;
}

export const createCompany = async (userId: string, input: CreateCompanyInput) => {
  const companyId = crypto.randomUUID();
  const slug = input.slug?.trim() || input.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `empresa-${Date.now()}`;
  const name = input.name.trim();

  const defaultDepts = (input.departments && input.departments.length > 0)
    ? input.departments
    : [
        { name: 'Tecnologia da Informação', code: 'TI' },
        { name: 'Administração', code: 'ADM' },
        { name: 'Recursos Humanos', code: 'RH' }
      ];

  if (await checkDbConnection()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO companies (id, name, slug, status) VALUES ($1, $2, $3, $4)',
        [companyId, name, slug, 'active']
      );
      await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);

      const membershipResult = await client.query(
        'INSERT INTO memberships (company_id, user_id, role, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [companyId, userId, 'owner', 'active']
      );

      for (const dept of defaultDepts) {
        await client.query(
          'INSERT INTO departments (company_id, name, code) VALUES ($1, $2, $3)',
          [companyId, dept.name, dept.code]
        );
      }

      await client.query(`
        INSERT INTO role_permissions (company_id, role, permission_key)
        SELECT $1, role.name::system_role, permission.key
        FROM (VALUES ('owner'), ('admin')) AS role(name)
        CROSS JOIN permissions AS permission
        ON CONFLICT DO NOTHING
      `, [companyId]);
      await client.query('COMMIT');

      return {
        id: companyId,
        name,
        slug,
        status: 'active' as const,
        membership: {
          id: String(membershipResult.rows[0]?.id),
          companyId,
          userId,
          role: 'owner' as SystemRole,
          departmentIds: [],
          permissions: ALL_PERMISSIONS,
          status: 'active' as const
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      markDatabaseUnavailable(error);
    } finally {
      client.release();
    }
  }

  const newCompany = { id: companyId, name, slug, status: 'active' as const };
  MOCK_COMPANIES.push(newCompany);

  const newMembership = {
    id: `m_${companyId.slice(0, 8)}`,
    companyId,
    userId,
    role: 'owner' as SystemRole,
    status: 'active' as const
  };
  MOCK_MEMBERSHIPS.push(newMembership);

  let deptIndex = 1;
  for (const dept of defaultDepts) {
    MOCK_DEPARTMENTS.push({
      id: `d_${companyId.slice(0, 4)}_${deptIndex++}`,
      companyId,
      name: dept.name,
      code: dept.code
    });
  }

  return {
    id: companyId,
    name,
    slug,
    status: 'active' as const,
    membership: {
      id: newMembership.id,
      companyId,
      userId,
      role: newMembership.role,
      departmentIds: [],
      permissions: ALL_PERMISSIONS,
      status: 'active' as const
    }
  };
};

export const listDepartments = async (tenant: TenantContext) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", name, code
          FROM departments
          WHERE company_id = $1 AND status = 'active'
        `, [tenant.companyId]);
        return result.rows as DepartmentSummary[];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return MOCK_DEPARTMENTS.filter((d) => d.companyId === tenant.companyId);
};

export const listTenantUsers = async (tenant: TenantContext): Promise<TenantUserView[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT u.id, u.name, u.email, m.role
          FROM memberships m
          JOIN users u ON u.id = m.user_id
          WHERE m.company_id = $1 AND m.status = 'active' AND u.status = 'active'
        `, [tenant.companyId]);
        return result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role as SystemRole,
          departments: []
        }));
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const tenantMemberships = MOCK_MEMBERSHIPS.filter((m) => m.companyId === tenant.companyId && m.status === 'active');
  return tenantMemberships.map((m) => {
    const user = MOCK_USERS.find((u) => u.id === m.userId)!;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: m.role,
      departments: []
    };
  });
};

export interface CreateTenantUserInput {
  name: string;
  email: string;
  password: string;
  role: SystemRole;
  departmentIds?: string[];
}

export const createTenantUser = async (tenant: TenantContext, input: CreateTenantUserInput): Promise<TenantUserView> => {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  const password = input.password;
  const role = input.role || 'employee';

  let userId: string;

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        let userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rowCount === 0) {
          userId = crypto.randomUUID();
          userResult = await client.query(`
            INSERT INTO users (id, name, email, password_hash, email_verified_at, status)
            VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), now(), 'active')
            RETURNING id
          `, [userId, name, email, password]);
        } else {
          userId = userResult.rows[0].id;
        }

        const membershipResult = await client.query(`
          INSERT INTO memberships (company_id, user_id, role, status, activated_at)
          VALUES ($1, $2, $3, 'active', now())
          ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'
          RETURNING id
        `, [tenant.companyId, userId, role]);
        const membershipId = membershipResult.rows[0]?.id;

        if (input.departmentIds && input.departmentIds.length > 0) {
          for (const deptId of input.departmentIds) {
            await client.query(`
              INSERT INTO membership_departments (company_id, membership_id, department_id)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [tenant.companyId, membershipId, deptId]);
          }
        }

        return {
          id: userId,
          name,
          email,
          role,
          departments: []
        };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  // In-memory fallback
  let existingUser = MOCK_USERS.find((u) => u.email.toLowerCase() === email);
  if (!existingUser) {
    existingUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      isSaaSAdmin: false
    };
    MOCK_USERS.push(existingUser);
  } else {
    existingUser.name = name;
  }
  userId = existingUser.id;

  const existingMembershipIndex = MOCK_MEMBERSHIPS.findIndex((m) => m.companyId === tenant.companyId && m.userId === userId);
  if (existingMembershipIndex >= 0) {
    const existing = MOCK_MEMBERSHIPS[existingMembershipIndex];
    if (existing) {
      existing.role = role;
      existing.status = 'active';
    }
  } else {
    MOCK_MEMBERSHIPS.push({
      id: `m_${tenant.companyId.slice(0, 4)}_${userId.slice(0, 4)}`,
      companyId: tenant.companyId,
      userId,
      role,
      status: 'active'
    });
  }

  const deptNames: string[] = [];
  if (input.departmentIds && input.departmentIds.length > 0) {
    for (const dId of input.departmentIds) {
      const d = MOCK_DEPARTMENTS.find((dept) => dept.id === dId);
      if (d) deptNames.push(d.name);
    }
  }

  return {
    id: userId,
    name,
    email,
    role,
    departments: deptNames
  };
};

export const hasPermission = async (tenant: TenantContext, permission: string): Promise<boolean> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT 1 FROM role_permissions
          WHERE company_id = $1 AND role = $2 AND permission_key = $3
        `, [tenant.companyId, tenant.membership.role, permission]);
        return result.rowCount === 1;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return tenant.membership.permissions.includes(permission as PermissionKey);
};

export const listNotices = async (tenant: TenantContext) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => (await client.query(`
        SELECT n.id, n.title, n.category, n.type, n.content, n.created_at AS "createdAt",
          u.name AS author, COALESCE(d.name, 'Toda a empresa') AS department,
          (r.read_at IS NOT NULL) AS read, r.read_at AS "readAt"
        FROM notices n JOIN users u ON u.id=n.author_id LEFT JOIN departments d ON d.id=n.department_id
        LEFT JOIN notice_reads r ON r.notice_id=n.id AND r.user_id=$2 AND r.notice_version=n.version
        WHERE n.company_id=$1 AND n.status='published' ORDER BY COALESCE(n.published_at,n.created_at) DESC
      `, [tenant.companyId, tenant.userId])).rows);
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const notices = mockNotices.filter((n) => n.companyId === tenant.companyId);
  return notices.map((n) => {
    const readAt = mockReads.get(`${tenant.companyId}:${n.id}:${tenant.userId}`) ?? null;
    return {
      id: n.id,
      title: n.title,
      category: n.category,
      type: n.type,
      content: n.content,
      createdAt: n.createdAt,
      author: n.authorName,
      department: n.departmentName,
      read: readAt !== null,
      readAt
    };
  });
};

export const createNotice = async (tenant: TenantContext, input: { title: string; category: string; type: string; content: string }) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => (await client.query(`
        INSERT INTO notices(company_id,title,category,type,content,author_id,status,published_at)
        VALUES($1,$2,$3,$4::notice_type,$5,$6,'published',now()) RETURNING id
      `, [tenant.companyId, input.title, input.category, input.type, input.content, tenant.userId])).rows[0]);
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const user = MOCK_USERS.find((u) => u.id === tenant.userId);
  const newNotice: MockNotice = {
    id: randomUUID(),
    companyId: tenant.companyId,
    title: input.title,
    category: input.category,
    type: input.type as 'urgent' | 'informative' | 'update',
    content: input.content,
    authorId: tenant.userId,
    authorName: user?.name ?? 'Administrador',
    departmentName: input.category || 'Geral',
    createdAt: new Date().toISOString()
  };
  mockNotices.unshift(newNotice);
  return { id: newNotice.id };
};

export const markNoticeRead = async (tenant: TenantContext, noticeId: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => (await client.query(`
        INSERT INTO notice_reads(company_id,notice_id,user_id,notice_version)
        SELECT $1,n.id,$2,n.version FROM notices n WHERE n.id=$3 AND n.company_id=$1
        ON CONFLICT DO NOTHING RETURNING read_at AS "readAt"
      `, [tenant.companyId, tenant.userId, noticeId])).rows[0] ?? null);
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const notice = mockNotices.find((n) => n.id === noticeId && n.companyId === tenant.companyId);
  if (!notice) return null;

  const key = `${tenant.companyId}:${noticeId}:${tenant.userId}`;
  const existing = mockReads.get(key);
  if (existing) return { readAt: existing };

  const readAt = new Date().toISOString();
  mockReads.set(key, readAt);
  return { readAt };
};
