import { createHash, randomBytes, randomUUID } from 'node:crypto';import { pool, withTenantTransaction } from './db.js';
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

const isDemoMode = () => process.env.REQUIRE_DATABASE !== 'true' || process.env.DEMO_MODE === 'true';

const markDatabaseUnavailable = (error?: unknown) => {
  isDbAvailable = false;
  if (!isDemoMode()) throw new DatabaseUnavailableError(error);
  console.warn('[API Store] PostgreSQL indisponível. Usando armazenamento em memória demonstrativo.');
};

let dbCheckPromise: Promise<boolean> | null = null;

const checkDbConnection = async (): Promise<boolean> => {
  if (isDbAvailable === false && !isDemoMode()) throw new DatabaseUnavailableError();
  if (isDbAvailable !== null) return isDbAvailable;
  if (!dbCheckPromise) {
    dbCheckPromise = (async () => {
      try {
        const client = await pool.connect();
        client.release();
        isDbAvailable = true;
        return true;
      } catch (error) {
        markDatabaseUnavailable(error);
        return false;
      } finally {
        dbCheckPromise = null;
      }
    })();
  }
  return dbCheckPromise;
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

export interface MockNotice {
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
  validFrom?: string;
  validUntil?: string;
  targetAudience?: string;
  attachmentIds?: string[];
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
    targetAudience: 'Toda a empresa',
    validFrom: new Date().toISOString().split('T')[0],
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
    targetAudience: 'Qualidade',
    validFrom: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockSessions = new Map<string, { userId: string; expiresAt: Date }>();
const mockReads = new Map<string, string>(); // key: `${companyId}:${noticeId}:${userId}` -> readAt ISO
const mockAttachments = new Map<string, { id: string; companyId: string; filename: string; mimeType: string; sizeBytes: number; dataBase64: string; createdAt: string }>();

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
        companies: companiesQuery.rows.map((row: any) => ({
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
          n.valid_from AS "validFrom", n.valid_until AS "validUntil",
          COALESCE(n.target_audience, 'Toda a empresa') AS "targetAudience",
          u.name AS author, COALESCE(d.name, 'Toda a empresa') AS department,
          (r.read_at IS NOT NULL) AS read, r.read_at AS "readAt",
          COALESCE(
            (SELECT json_agg(json_build_object('id', a.id, 'filename', a.filename, 'sizeBytes', a.size_bytes, 'mimeType', a.mime_type))
             FROM notice_attachments na JOIN attachments a ON a.id = na.attachment_id
             WHERE na.notice_id = n.id AND na.company_id = n.company_id),
            '[]'::json
          ) AS attachments
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
    const attachments = (n.attachmentIds ?? []).map((id) => {
      const att = mockAttachments.get(id);
      return att ? { id: att.id, filename: att.filename, sizeBytes: att.sizeBytes, mimeType: att.mimeType } : null;
    }).filter(Boolean);

    return {
      id: n.id,
      title: n.title,
      category: n.category,
      type: n.type,
      content: n.content,
      createdAt: n.createdAt,
      validFrom: n.validFrom,
      validUntil: n.validUntil,
      targetAudience: n.targetAudience || 'Toda a empresa',
      author: n.authorName,
      department: n.departmentName,
      read: readAt !== null,
      readAt,
      attachmentIds: n.attachmentIds,
      attachments
    };
  });
};

export const createNotice = async (
  tenant: TenantContext,
  input: {
    title: string;
    category: string;
    type: string;
    content: string;
    attachmentIds?: string[];
    validFrom?: string;
    validUntil?: string;
    targetAudience?: string;
  }
) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const noticeResult = await client.query(`
          INSERT INTO notices(company_id,title,category,type,content,author_id,status,published_at,valid_from,valid_until,target_audience)
          VALUES($1,$2,$3,$4::notice_type,$5,$6,'published',now(),$7,$8,$9) RETURNING id
        `, [
          tenant.companyId,
          input.title,
          input.category,
          input.type,
          input.content,
          tenant.userId,
          input.validFrom ? new Date(input.validFrom) : new Date(),
          input.validUntil ? new Date(input.validUntil) : null,
          input.targetAudience || 'Toda a empresa'
        ]);
        const noticeId = noticeResult.rows[0].id;
        if (input.attachmentIds && input.attachmentIds.length > 0) {
          for (const attId of input.attachmentIds) {
            await client.query(`
              INSERT INTO notice_attachments (company_id, notice_id, attachment_id)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [tenant.companyId, noticeId, attId]);
          }
        }
        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'NOTICE_CREATED', 'notice', noticeId, JSON.stringify({ title: input.title, type: input.type, targetAudience: input.targetAudience })]);
        return { id: noticeId };
      });
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
    createdAt: new Date().toISOString(),
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    targetAudience: input.targetAudience || 'Toda a empresa',
    attachmentIds: input.attachmentIds
  };
  mockNotices.unshift(newNotice);
  return { id: newNotice.id };
};

export const markNoticeRead = async (tenant: TenantContext, noticeId: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = (await client.query(`
          INSERT INTO notice_reads(company_id,notice_id,user_id,notice_version)
          SELECT $1,n.id,$2,n.version FROM notices n WHERE n.id=$3 AND n.company_id=$1
          ON CONFLICT DO NOTHING RETURNING read_at AS "readAt"
        `, [tenant.companyId, tenant.userId, noticeId])).rows[0] ?? null;
        if (result) {
          await client.query(`
            INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [tenant.companyId, tenant.userId, 'NOTICE_READ', 'notice', noticeId, '{}']);
        }
        return result;
      });
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

export interface SaveAttachmentInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
}

export const saveAttachment = async (tenant: TenantContext, input: SaveAttachmentInput) => {
  const attachmentId = randomUUID();
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO attachments (id, company_id, uploaded_by, filename, mime_type, size_bytes, data_base64)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, filename, mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt"
        `, [attachmentId, tenant.companyId, tenant.userId, input.filename, input.mimeType, input.sizeBytes, input.dataBase64]);
        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'ATTACHMENT_UPLOADED', 'attachment', attachmentId, JSON.stringify({ filename: input.filename })]);
        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const createdAtt = {
    id: attachmentId,
    companyId: tenant.companyId,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    dataBase64: input.dataBase64,
    createdAt: new Date().toISOString()
  };
  mockAttachments.set(attachmentId, createdAtt);

  return {
    id: attachmentId,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    createdAt: createdAtt.createdAt
  };
};

export const getAttachment = async (tenant: TenantContext, attachmentId: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, filename, mime_type AS "mimeType", size_bytes AS "sizeBytes", data_base64 AS "dataBase64", created_at AS "createdAt"
          FROM attachments
          WHERE id = $1 AND company_id = $2
        `, [attachmentId, tenant.companyId]);
        return result.rows[0] ?? null;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const att = mockAttachments.get(attachmentId);
  if (!att || att.companyId !== tenant.companyId) return null;
  return {
    id: att.id,
    filename: att.filename,
    mimeType: att.mimeType,
    sizeBytes: att.sizeBytes,
    dataBase64: att.dataBase64,
    createdAt: att.createdAt
  };
};

export const recordAuditLog = async (
  tenant: TenantContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) => {
  if (await checkDbConnection()) {
    try {
      await withTenantTransaction(tenant.companyId, async (client) => {
        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, action, entityType, entityId, JSON.stringify(metadata)]);
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
};

export const listAuditLogs = async (tenant: TenantContext) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT a.id, a.action, a.entity_type AS "entityType", a.entity_id AS "entityId",
                 a.metadata, a.created_at AS "createdAt", u.name AS "userName", u.email AS "userEmail"
          FROM audit_logs a
          JOIN users u ON u.id = a.user_id
          WHERE a.company_id = $1
          ORDER BY a.created_at DESC
          LIMIT 100
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  return [];
};

// ==========================================
// Support Tickets Store
// ==========================================
export interface TicketItem {
  id: string;
  companyId: string;
  userId: string;
  ticketCode: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  authorName: string;
  assigneeName: string;
  createdAt: string;
  updatedAt: string;
}

const mockTickets: TicketItem[] = [];

export const listTickets = async (tenant: TenantContext): Promise<TicketItem[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT t.id, t.company_id AS "companyId", t.user_id AS "userId", t.ticket_code AS "ticketCode",
                 t.subject, t.category, t.priority, t.status, t.description,
                 u.name AS "authorName", COALESCE(t.assignee_name, 'Não atribuído') AS "assigneeName",
                 t.created_at AS "createdAt", t.updated_at AS "updatedAt"
          FROM support_tickets t
          JOIN users u ON u.id = t.user_id
          WHERE t.company_id = $1
          ORDER BY t.created_at DESC
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return mockTickets.filter((t) => t.companyId === tenant.companyId);
};

export const createTicket = async (
  tenant: TenantContext,
  input: { subject: string; category?: string; priority?: string; description: string }
): Promise<TicketItem> => {
  const ticketId = randomUUID();
  const ticketCode = `CH-${Date.now().toString().slice(-6)}`;
  const user = MOCK_USERS.find((u) => u.id === tenant.userId);
  const authorName = user?.name ?? 'Colaborador';
  const category = input.category || 'Geral';
  const priority = input.priority || 'Normal';

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO support_tickets (id, company_id, user_id, ticket_code, subject, category, priority, status, description, assignee_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Aberto', $8, 'Não atribuído')
          RETURNING id, company_id AS "companyId", user_id AS "userId", ticket_code AS "ticketCode",
                    subject, category, priority, status, description, assignee_name AS "assigneeName",
                    created_at AS "createdAt", updated_at AS "updatedAt"
        `, [ticketId, tenant.companyId, tenant.userId, ticketCode, input.subject, category, priority, input.description]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'TICKET_CREATED', 'ticket', ticketId, JSON.stringify({ code: ticketCode, subject: input.subject })]);

        return { ...result.rows[0], authorName };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const newTicket: TicketItem = {
    id: ticketId,
    companyId: tenant.companyId,
    userId: tenant.userId,
    ticketCode,
    subject: input.subject,
    category,
    priority,
    status: 'Aberto',
    description: input.description,
    authorName,
    assigneeName: 'Não atribuído',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockTickets.unshift(newTicket);
  return newTicket;
};

export const updateTicket = async (
  tenant: TenantContext,
  ticketId: string,
  input: { status?: string; assigneeName?: string }
): Promise<TicketItem | null> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          UPDATE support_tickets
          SET status = COALESCE($1, status),
              assignee_name = COALESCE($2, assignee_name),
              updated_at = now()
          WHERE id = $3 AND company_id = $4
          RETURNING id, company_id AS "companyId", user_id AS "userId", ticket_code AS "ticketCode",
                    subject, category, priority, status, description, assignee_name AS "assigneeName",
                    created_at AS "createdAt", updated_at AS "updatedAt"
        `, [input.status ?? null, input.assigneeName ?? null, ticketId, tenant.companyId]);

        if (result.rowCount === 0) return null;
        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'TICKET_UPDATED', 'ticket', ticketId, JSON.stringify(input)]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const index = mockTickets.findIndex((t) => t.id === ticketId && t.companyId === tenant.companyId);
  if (index === -1) return null;

  const current = mockTickets[index];
  if (!current) return null;

  const updated: TicketItem = {
    id: current.id,
    companyId: current.companyId,
    userId: current.userId,
    ticketCode: current.ticketCode,
    subject: current.subject,
    category: current.category,
    priority: current.priority,
    status: input.status ?? current.status,
    description: current.description,
    authorName: current.authorName,
    assigneeName: input.assigneeName ?? current.assigneeName,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  };
  mockTickets[index] = updated;
  return updated;
};

// ==========================================
// Corporate Documents Store
// ==========================================
export interface DocumentItem {
  id: string;
  companyId: string;
  name: string;
  code: string;
  department: string;
  version: string;
  status: 'Vigente' | 'Em revisão' | 'Obsoleto';
  validUntil?: string;
  description: string;
  fileUrl?: string;
  attachmentId?: string;
  createdAt: string;
  updatedAt: string;
}

const mockDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    companyId: '11111111-1111-4111-8111-111111111111',
    name: 'Manual de Boas Práticas Laboratoriais e Biossegurança',
    code: 'POP-QUAL-001',
    department: 'Qualidade',
    version: 'v4.2',
    status: 'Vigente',
    validUntil: '2027-12-31',
    description: 'Diretrizes oficiais para manipulação de amostras, EPIs e descarte de resíduos biológicos.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'doc-2',
    companyId: '11111111-1111-4111-8111-111111111111',
    name: 'Procedimento Operacional Padrão: Triagem e Recepção de Pacientes',
    code: 'POP-OPE-012',
    department: 'Operações',
    version: 'v2.8',
    status: 'Vigente',
    validUntil: '2027-06-30',
    description: 'Fluxograma de acolhimento, conferência de guias de convênio e prioridades de atendimento.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'doc-3',
    companyId: '11111111-1111-4111-8111-111111111111',
    name: 'Política de Segurança da Informação e Gestão de Senhas',
    code: 'POL-TI-005',
    department: 'Tecnologia da Informação',
    version: 'v3.0',
    status: 'Vigente',
    validUntil: '2026-12-31',
    description: 'Regras de acesso a sistemas internos, 2FA, uso aceitável de dispositivos e LGPD.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

export const listDocuments = async (tenant: TenantContext): Promise<DocumentItem[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", name, code, department, version, status,
                 valid_until AS "validUntil", description, file_url AS "fileUrl", attachment_id AS "attachmentId",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM corporate_documents
          WHERE company_id = $1
          ORDER BY code ASC
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return mockDocuments.filter((d) => d.companyId === tenant.companyId);
};

export const createDocument = async (
  tenant: TenantContext,
  input: {
    name: string;
    code: string;
    department: string;
    version: string;
    status?: 'Vigente' | 'Em revisão' | 'Obsoleto';
    validUntil?: string;
    description?: string;
    attachmentId?: string;
  }
): Promise<DocumentItem> => {
  const docId = randomUUID();
  const status = input.status || 'Vigente';

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO corporate_documents (id, company_id, name, code, department, version, status, valid_until, description, attachment_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, company_id AS "companyId", name, code, department, version, status,
                    valid_until AS "validUntil", description, file_url AS "fileUrl", attachment_id AS "attachmentId",
                    created_at AS "createdAt", updated_at AS "updatedAt"
        `, [
          docId,
          tenant.companyId,
          input.name,
          input.code,
          input.department,
          input.version,
          status,
          input.validUntil ? new Date(input.validUntil) : null,
          input.description ?? '',
          input.attachmentId ?? null
        ]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'DOCUMENT_CREATED', 'document', docId, JSON.stringify({ code: input.code, name: input.name })]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const newDoc: DocumentItem = {
    id: docId,
    companyId: tenant.companyId,
    name: input.name,
    code: input.code,
    department: input.department,
    version: input.version,
    status,
    validUntil: input.validUntil,
    description: input.description ?? '',
    attachmentId: input.attachmentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockDocuments.unshift(newDoc);
  return newDoc;
};

// ==========================================
// Knowledge Portal FAQs Store
// ==========================================
export interface FaqItem {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  department: string;
  category: string;
  tags?: string;
  relatedDocCode?: string;
  createdAt: string;
  updatedAt: string;
}

const mockFaqs: FaqItem[] = [
  {
    id: 'faq-1',
    companyId: '11111111-1111-4111-8111-111111111111',
    question: 'Qual o tempo máximo para transporte de amostras de gasometria?',
    answer: 'A amostra de sangue total para gasometria deve ser mantida em temperatura ambiente e analisada em até 30 minutos. Se a análise for demorar mais, deve ser mantida em banho de gelo (0-4°C) e analisada em até 1 hora.',
    department: 'Qualidade',
    category: 'Coleta e Preparo',
    tags: 'gasometria, amostra, tempo, temperatura, gelo',
    relatedDocCode: 'POP-QUAL-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq-2',
    companyId: '11111111-1111-4111-8111-111111111111',
    question: 'Como proceder quando o sistema SHIFT estiver fora do ar?',
    answer: 'Em caso de inoperância do sistema SHIFT, os atendimentos de urgência devem ser registrados no formulário físico PQ-014 (Plano de Contingência). Assim que o sistema retornar, os dados devem ser repassados para a plataforma em até 2 horas.',
    department: 'Tecnologia da Informação',
    category: 'Sistemas (SHIFT)',
    tags: 'shift, contingencia, inoperancia, urgencia, queda',
    relatedDocCode: 'POL-TI-005',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq-3',
    companyId: '11111111-1111-4111-8111-111111111111',
    question: 'Quais os documentos necessários para admissão de novos colaboradores?',
    answer: 'O novo colaborador deve apresentar: RG, CPF, Comprovante de Residência, Carteira de Trabalho, Título de Eleitor, Cartão SUS e Atestado Médico Admissional. A documentação deve ser enviada ao RH via sistema.',
    department: 'Recursos Humanos',
    category: 'Recursos Humanos',
    tags: 'admissao, rh, documentos, onboarding, contrato',
    relatedDocCode: 'POP-OPE-012',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const listFaqs = async (tenant: TenantContext): Promise<FaqItem[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", question, answer, department, category,
                 tags, related_doc_code AS "relatedDocCode",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM knowledge_faqs
          WHERE company_id = $1
          ORDER BY category ASC, created_at DESC
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return mockFaqs.filter((f) => f.companyId === tenant.companyId);
};

export const createFaq = async (
  tenant: TenantContext,
  input: { question: string; answer: string; department: string; category: string; tags?: string; relatedDocCode?: string }
): Promise<FaqItem> => {
  const faqId = randomUUID();

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO knowledge_faqs (id, company_id, question, answer, department, category, tags, related_doc_code)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, company_id AS "companyId", question, answer, department, category,
                    tags, related_doc_code AS "relatedDocCode",
                    created_at AS "createdAt", updated_at AS "updatedAt"
        `, [faqId, tenant.companyId, input.question, input.answer, input.department, input.category, input.tags ?? '', input.relatedDocCode ?? null]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'FAQ_CREATED', 'faq', faqId, JSON.stringify({ question: input.question, category: input.category })]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const newFaq: FaqItem = {
    id: faqId,
    companyId: tenant.companyId,
    question: input.question,
    answer: input.answer,
    department: input.department,
    category: input.category,
    tags: input.tags ?? '',
    relatedDocCode: input.relatedDocCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockFaqs.unshift(newFaq);
  return newFaq;
};

// ==========================================
// Search Queries Store & Analytics
// ==========================================
export interface SearchQueryItem {
  id: string;
  companyId: string;
  queryText: string;
  resultsCount: number;
  createdAt: string;
}

const mockSearchQueries: SearchQueryItem[] = [
  { id: 'sq-1', companyId: '11111111-1111-4111-8111-111111111111', queryText: 'gasometria arterial', resultsCount: 3, createdAt: new Date().toISOString() },
  { id: 'sq-2', companyId: '11111111-1111-4111-8111-111111111111', queryText: 'acesso myPardini', resultsCount: 2, createdAt: new Date().toISOString() },
  { id: 'sq-3', companyId: '11111111-1111-4111-8111-111111111111', queryText: 'exame de curva glicemica gestante', resultsCount: 0, createdAt: new Date().toISOString() }
];

export const recordSearchQuery = async (
  tenant: TenantContext,
  queryText: string,
  resultsCount: number
) => {
  const queryId = randomUUID();
  if (await checkDbConnection()) {
    try {
      await withTenantTransaction(tenant.companyId, async (client) => {
        await client.query(`
          INSERT INTO search_queries (id, company_id, user_id, query_text, results_count)
          VALUES ($1, $2, $3, $4, $5)
        `, [queryId, tenant.companyId, tenant.userId, queryText.slice(0, 255), resultsCount]);
      });
      return { id: queryId };
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  mockSearchQueries.unshift({
    id: queryId,
    companyId: tenant.companyId,
    queryText: queryText.slice(0, 255),
    resultsCount,
    createdAt: new Date().toISOString()
  });
  return { id: queryId };
};

export const listSearchAnalytics = async (tenant: TenantContext) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const topSearches = (await client.query(`
          SELECT query_text AS "queryText", count(*) AS "totalCount", avg(results_count) AS "avgResults"
          FROM search_queries
          WHERE company_id = $1
          GROUP BY query_text
          ORDER BY totalCount DESC
          LIMIT 10
        `, [tenant.companyId])).rows;

        const zeroResultSearches = (await client.query(`
          SELECT query_text AS "queryText", count(*) AS "missCount", max(created_at) AS "lastAttempt"
          FROM search_queries
          WHERE company_id = $1 AND results_count = 0
          GROUP BY query_text
          ORDER BY missCount DESC
          LIMIT 10
        `, [tenant.companyId])).rows;

        return { topSearches, zeroResultSearches };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const companySearches = mockSearchQueries.filter((s) => s.companyId === tenant.companyId);
  const zeroResultSearches = companySearches
    .filter((s) => s.resultsCount === 0)
    .map((s) => ({ queryText: s.queryText, missCount: 1, lastAttempt: s.createdAt }));

  return {
    topSearches: companySearches.slice(0, 10).map((s) => ({ queryText: s.queryText, totalCount: 1, avgResults: s.resultsCount })),
    zeroResultSearches
  };
};

// ==========================================
// Quick Links Store
// ==========================================
export interface QuickLinkItem {
  id: string;
  companyId: string;
  title: string;
  url: string;
  icon: string;
  category: string;
  sortOrder: number;
  createdAt: string;
}

const mockQuickLinks: QuickLinkItem[] = [
  {
    id: 'link-1',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Sistema SHIFT (LIS)',
    url: 'https://shift.exemplo.com.br',
    icon: 'server',
    category: 'Sistemas Clínicos',
    sortOrder: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'link-2',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Portal do Colaborador (Folha e Ponto)',
    url: 'https://folha.exemplo.com.br',
    icon: 'users',
    category: 'Recursos Humanos',
    sortOrder: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'link-3',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Gestão da Qualidade & Não Conformidades',
    url: 'https://qualidade.exemplo.com.br',
    icon: 'shield',
    category: 'Qualidade',
    sortOrder: 3,
    createdAt: new Date().toISOString()
  }
];

export const listQuickLinks = async (tenant: TenantContext): Promise<QuickLinkItem[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", title, url, icon, category,
                 sort_order AS "sortOrder", created_at AS "createdAt"
          FROM quick_links
          WHERE company_id = $1
          ORDER BY sort_order ASC, title ASC
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return mockQuickLinks.filter((l) => l.companyId === tenant.companyId);
};

export const createQuickLink = async (
  tenant: TenantContext,
  input: { title: string; url: string; icon?: string; category?: string; sortOrder?: number }
): Promise<QuickLinkItem> => {
  const linkId = randomUUID();
  const icon = input.icon || 'globe';
  const category = input.category || 'Geral';
  const sortOrder = input.sortOrder || 0;

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO quick_links (id, company_id, title, url, icon, category, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, company_id AS "companyId", title, url, icon, category,
                    sort_order AS "sortOrder", created_at AS "createdAt"
        `, [linkId, tenant.companyId, input.title, input.url, icon, category, sortOrder]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const newLink: QuickLinkItem = {
    id: linkId,
    companyId: tenant.companyId,
    title: input.title,
    url: input.url,
    icon,
    category,
    sortOrder,
    createdAt: new Date().toISOString()
  };
  mockQuickLinks.push(newLink);
  return newLink;
};

// ==========================================
// Calendar Events Store
// ==========================================
export interface CalendarEventItem {
  id: string;
  companyId: string;
  title: string;
  eventDate: string;
  location: string;
  color: string;
  status: 'active' | 'cancelled';
  createdAt: string;
}

const mockCalendarEvents: CalendarEventItem[] = [
  {
    id: 'cal-1',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Auditoria Externa de Acreditação PALC/ONA',
    eventDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    location: 'Unidade Central - Laboratório',
    color: '#8b5cf6',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cal-2',
    companyId: '11111111-1111-4111-8111-111111111111',
    title: 'Treinamento: Atualização de Biossegurança e PGRSS',
    eventDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    location: 'Auditório Principal & Online',
    color: '#3b82f6',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const listCalendarEvents = async (tenant: TenantContext): Promise<CalendarEventItem[]> => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", title, event_date AS "eventDate",
                 location, color, status, created_at AS "createdAt"
          FROM calendar_events
          WHERE company_id = $1 AND status = 'active'
          ORDER BY event_date ASC
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  return mockCalendarEvents.filter((c) => c.companyId === tenant.companyId && c.status === 'active');
};

export const createCalendarEvent = async (
  tenant: TenantContext,
  input: { title: string; eventDate: string; location?: string; color?: string }
): Promise<CalendarEventItem> => {
  const eventId = randomUUID();
  const location = input.location || 'Local a definir';
  const color = input.color || '#3b82f6';

  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          INSERT INTO calendar_events (id, company_id, title, event_date, location, color, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'active')
          RETURNING id, company_id AS "companyId", title, event_date AS "eventDate",
                    location, color, status, created_at AS "createdAt"
        `, [eventId, tenant.companyId, input.title, input.eventDate, location, color]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'CALENDAR_EVENT_CREATED', 'calendar_event', eventId, JSON.stringify({ title: input.title })]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const newEvent: CalendarEventItem = {
    id: eventId,
    companyId: tenant.companyId,
    title: input.title,
    eventDate: input.eventDate,
    location,
    color,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  mockCalendarEvents.push(newEvent);
  return newEvent;
};

// ==========================================
// Notice Edit & Archive Store
// ==========================================
export const updateNotice = async (
  tenant: TenantContext,
  noticeId: string,
  input: { title?: string; content?: string; category?: string; type?: string }
) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          UPDATE notices
          SET title = COALESCE($1, title),
              content = COALESCE($2, content),
              category = COALESCE($3, category),
              type = COALESCE($4::notice_type, type),
              updated_at = now()
          WHERE id = $5 AND company_id = $6
          RETURNING id, title, category, type, content
        `, [input.title ?? null, input.content ?? null, input.category ?? null, input.type ?? null, noticeId, tenant.companyId]);

        if (result.rowCount === 0) return null;

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'NOTICE_UPDATED', 'notice', noticeId, JSON.stringify(input)]);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const notice = mockNotices.find((n) => n.id === noticeId && n.companyId === tenant.companyId);
  if (!notice) return null;

  if (input.title) notice.title = input.title;
  if (input.content) notice.content = input.content;
  if (input.category) notice.category = input.category;
  if (input.type) notice.type = input.type as 'urgent' | 'informative' | 'update';

  return notice;
};

export const archiveNotice = async (tenant: TenantContext, noticeId: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          UPDATE notices
          SET status = 'archived', updated_at = now()
          WHERE id = $1 AND company_id = $2
          RETURNING id
        `, [noticeId, tenant.companyId]);

        if (result.rowCount === 0) return null;

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'NOTICE_ARCHIVED', 'notice', noticeId, '{}']);

        return result.rows[0];
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const idx = mockNotices.findIndex((n) => n.id === noticeId && n.companyId === tenant.companyId);
  if (idx === -1) return null;

  mockNotices.splice(idx, 1);
  return { id: noticeId };
};

// ==========================================
// User Role, Status & Password Management
// ==========================================
export const updateTenantUser = async (
  tenant: TenantContext,
  targetUserId: string,
  input: { role?: SystemRole; departmentIds?: string[] }
) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        if (input.role) {
          await client.query(`
            UPDATE memberships
            SET role = $1
            WHERE user_id = $2 AND company_id = $3
          `, [input.role, targetUserId, tenant.companyId]);
        }

        if (input.departmentIds) {
          const membershipRes = await client.query('SELECT id FROM memberships WHERE user_id = $1 AND company_id = $2', [targetUserId, tenant.companyId]);
          const membershipId = membershipRes.rows[0]?.id;
          if (membershipId) {
            await client.query('DELETE FROM membership_departments WHERE company_id = $1 AND membership_id = $2', [tenant.companyId, membershipId]);
            for (const deptId of input.departmentIds) {
              await client.query('INSERT INTO membership_departments (company_id, membership_id, department_id) VALUES ($1, $2, $3)', [tenant.companyId, membershipId, deptId]);
            }
          }
        }

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'USER_UPDATED', 'user', targetUserId, JSON.stringify(input)]);

        return { id: targetUserId, ...input };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const m = MOCK_MEMBERSHIPS.find((mb) => mb.userId === targetUserId && mb.companyId === tenant.companyId);
  if (m && input.role) {
    m.role = input.role;
  }
  return { id: targetUserId, ...input };
};

export const toggleTenantUserStatus = async (tenant: TenantContext, targetUserId: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const current = await client.query('SELECT status FROM memberships WHERE user_id = $1 AND company_id = $2', [targetUserId, tenant.companyId]);
        if (current.rowCount === 0) return null;

        const nextStatus = current.rows[0].status === 'active' ? 'suspended' : 'active';
        await client.query('UPDATE memberships SET status = $1 WHERE user_id = $2 AND company_id = $3', [nextStatus, targetUserId, tenant.companyId]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'USER_STATUS_TOGGLED', 'user', targetUserId, JSON.stringify({ status: nextStatus })]);

        return { userId: targetUserId, status: nextStatus };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const m = MOCK_MEMBERSHIPS.find((mb) => mb.userId === targetUserId && mb.companyId === tenant.companyId);
  if (!m) return null;
  m.status = m.status === 'active' ? 'suspended' : 'active';
  return { userId: targetUserId, status: m.status };
};

export const resetTenantUserPassword = async (tenant: TenantContext, targetUserId: string, newPassword: string) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        await client.query(`
          UPDATE users
          SET password_hash = crypt($1, gen_salt('bf')), updated_at = now()
          WHERE id = $2
        `, [newPassword, targetUserId]);

        await client.query(`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenant.companyId, tenant.userId, 'USER_PASSWORD_RESET', 'user', targetUserId, '{}']);

        return { success: true };
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }

  const user = MOCK_USERS.find((u) => u.id === targetUserId);
  if (user) {
    user.password = newPassword;
    return { success: true };
  }
  return { success: false };
};

