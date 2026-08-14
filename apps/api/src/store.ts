import { randomBytes } from 'node:crypto';
import { pool } from './db.js';
import type {
  AuthenticatedUser,
  CompanySummary,
  DepartmentSummary,
  MembershipSummary,
  SystemRole
} from '../../../packages/contracts/src/index.js';

interface Session {
  token: string;
  userId: string;
  activeCompanyId: string;
  createdAt: Date;
}

export interface TenantUserView {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  departments: string[];
}

// Em memória temporária (poderíamos migrar para Redis depois)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, Session>();

export const authenticate = async (email: string, password: string) => {
  const result = await pool.query(`
    SELECT id, name, email 
    FROM users 
    WHERE email = $1 AND password_hash = crypt($2, password_hash) AND status = 'active'
  `, [email.toLowerCase(), password]);
  
  if (result.rows.length === 0) return null;
  const user = result.rows[0];

  const companiesQuery = await pool.query(`
    SELECT c.id, c.name, c.slug, c.status, m.id as membership_id, m.role, m.status as membership_status
    FROM companies c
    JOIN memberships m ON m.company_id = c.id
    WHERE m.user_id = $1 AND m.status = 'active' AND c.status = 'active'
  `, [user.id]);

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    companies: companiesQuery.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      membership: {
        id: row.membership_id,
        companyId: row.id,
        userId: user.id,
        role: row.role as SystemRole,
        departmentIds: [], // We could fetch this if needed, but the frontend might not need it for auth
        status: row.membership_status
      }
    }))
  };

  const activeCompanyId = authenticatedUser.companies[0]?.id;
  if (!activeCompanyId) return null;

  const token = randomBytes(32).toString('hex');
  sessions.set(token, { token, userId: user.id, activeCompanyId, createdAt: new Date() });
  return { accessToken: token, user: authenticatedUser, activeCompanyId };
};

export const resolveSession = (token: string) => {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt.getTime() > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
};

export const resolveTenant = async (token: string, requestedCompanyId: string) => {
  const session = resolveSession(token);
  if (!session) return null;

  const result = await pool.query(`
    SELECT id, role, status
    FROM memberships
    WHERE user_id = $1 AND company_id = $2 AND status = 'active'
  `, [session.userId, requestedCompanyId]);

  if (result.rows.length === 0) return null;

  const membership: MembershipSummary = {
    id: result.rows[0].id,
    companyId: requestedCompanyId,
    userId: session.userId,
    role: result.rows[0].role as SystemRole,
    status: result.rows[0].status,
    departmentIds: []
  };

  return { session: { ...session, activeCompanyId: requestedCompanyId }, membership };
};

export const listCompaniesForUser = async (userId: string) => {
  const result = await pool.query(`
    SELECT c.id, c.name, c.slug, c.status
    FROM companies c
    JOIN memberships m ON m.company_id = c.id
    WHERE m.user_id = $1 AND m.status = 'active' AND c.status = 'active'
  `, [userId]);
  return result.rows as CompanySummary[];
};

export const listDepartments = async (companyId: string) => {
  const result = await pool.query(`
    SELECT id, company_id as "companyId", name, code
    FROM departments
    WHERE company_id = $1 AND status = 'active'
  `, [companyId]);
  return result.rows as DepartmentSummary[];
};

export const listTenantUsers = async (companyId: string): Promise<TenantUserView[]> => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, m.role
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.company_id = $1 AND m.status = 'active' AND u.status = 'active'
  `, [companyId]);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as SystemRole,
    departments: [] // Simplification
  }));
};
