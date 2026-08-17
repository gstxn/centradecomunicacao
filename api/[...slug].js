// apps/api/src/server.ts
import { createServer } from "node:http";

// apps/api/src/store.ts
import { createHash, randomBytes, randomUUID } from "node:crypto";

// apps/api/src/db.ts
import pkg from "pg";
var { Pool } = pkg;
var connectionString = process.env.DATABASE_URL ?? "postgresql://central_runtime:central_runtime_local_2026@localhost:5432/central_comunicacao";
var isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
var pool = new Pool({
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});
var withTenantTransaction = async (companyId, operation) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// apps/api/src/store.ts
var tenantContextBrand = /* @__PURE__ */ Symbol("TenantContext");
var SESSION_TTL_MS = 8 * 60 * 60 * 1e3;
var hashToken = (token) => createHash("sha256").update(token).digest("hex");
var isDbAvailable = null;
var DatabaseUnavailableError = class extends Error {
  constructor(cause) {
    super("PostgreSQL indispon\xEDvel.");
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
};
var isDemoMode = () => (process.env.DEMO_MODE === "true" || process.env.DEMO_MODE !== "false") && process.env.NODE_ENV !== "production" && process.env.REQUIRE_DATABASE !== "true";
var markDatabaseUnavailable = (error) => {
  isDbAvailable = false;
  if (!isDemoMode()) throw new DatabaseUnavailableError(error);
  console.warn("[API Store] PostgreSQL indispon\xEDvel. Usando armazenamento em mem\xF3ria demonstrativo.");
};
var checkDbConnection = async () => {
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
var ALL_PERMISSIONS = [
  "company.manage",
  "users.view",
  "users.manage",
  "departments.manage",
  "notices.create",
  "notices.publish",
  "reports.view",
  "audit.view",
  "support.manage"
];
var AUDITOR_PERMISSIONS = ["users.view", "reports.view", "audit.view"];
var MANAGER_PERMISSIONS = ["users.view", "notices.create", "notices.publish", "reports.view"];
var MOCK_COMPANIES = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Central de Exames", slug: "central-exames", status: "active" }
];
var MOCK_USERS = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", name: "Administrador Geral", email: "admin@saas.test", password: "demo123", isSaaSAdmin: true },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", name: "Admin Central", email: "admin@central.test", password: "demo123", isSaaSAdmin: false },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", name: "Auditor Geral", email: "auditor@saas.test", password: "demo123", isSaaSAdmin: false }
];
var MOCK_MEMBERSHIPS = [
  { id: "m1", companyId: "11111111-1111-4111-8111-111111111111", userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", role: "owner", status: "active" },
  { id: "m3", companyId: "11111111-1111-4111-8111-111111111111", userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", role: "admin", status: "active" },
  { id: "m5", companyId: "11111111-1111-4111-8111-111111111111", userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", role: "auditor", status: "active" }
];
var MOCK_DEPARTMENTS = [
  { id: "d1", companyId: "11111111-1111-4111-8111-111111111111", name: "Tecnologia da Informa\xE7\xE3o", code: "TI" },
  { id: "d2", companyId: "11111111-1111-4111-8111-111111111111", name: "Qualidade", code: "QUAL" },
  { id: "d3", companyId: "11111111-1111-4111-8111-111111111111", name: "Recursos Humanos", code: "RH" }
];
var getRolePermissions = (role) => {
  if (role === "owner" || role === "admin") return ALL_PERMISSIONS;
  if (role === "auditor") return AUDITOR_PERMISSIONS;
  if (role === "manager") return MANAGER_PERMISSIONS;
  return [];
};
var mockNotices = [
  {
    id: "33333333-3333-4333-8333-333333333331",
    companyId: "11111111-1111-4111-8111-111111111111",
    title: "Nova Diretriz de Seguran\xE7a e Acesso aos Sistemas",
    category: "TI",
    type: "urgent",
    content: "<p>Prezados colaboradores,</p><p>Refor\xE7amos a obrigatoriedade da autentica\xE7\xE3o em duas etapas e da conformidade com as diretrizes de seguran\xE7a da informa\xE7\xE3o.</p><p>Por favor, confirmem a ci\xEAncia desta orienta\xE7\xE3o.</p>",
    authorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    authorName: "Admin Central",
    departmentName: "Tecnologia da Informa\xE7\xE3o",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "33333333-3333-4333-8333-333333333332",
    companyId: "11111111-1111-4111-8111-111111111111",
    title: "Atualiza\xE7\xE3o do Procedimento Operacional Padr\xE3o",
    category: "Qualidade",
    type: "informative",
    content: "<p>O manual de boas pr\xE1ticas foi atualizado e est\xE1 dispon\xEDvel para consulta na Biblioteca de Documentos.</p>",
    authorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    authorName: "Admin Central",
    departmentName: "Qualidade",
    createdAt: new Date(Date.now() - 864e5).toISOString()
  }
];
var mockSessions = /* @__PURE__ */ new Map();
var mockReads = /* @__PURE__ */ new Map();
var authenticate = async (email, password) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query(`
        SELECT id, name, email, is_saas_admin AS "isSaaSAdmin"
        FROM users
        WHERE email = $1 AND password_hash = crypt($2, password_hash) AND status = 'active'
      `, [email.toLowerCase(), password]);
      if (result.rows.length === 0) return null;
      const user2 = result.rows[0];
      const companiesQuery = await pool.query("SELECT * FROM list_active_companies_for_user($1)", [user2.id]);
      const authenticatedUser = {
        id: user2.id,
        name: user2.name,
        email: user2.email,
        isSaaSAdmin: user2.isSaaSAdmin === true,
        companies: companiesQuery.rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          membership: {
            id: row.membership_id,
            companyId: row.id,
            userId: user2.id,
            role: row.role,
            departmentIds: [],
            permissions: row.permission_keys,
            status: row.membership_status
          }
        }))
      };
      const activeCompanyId2 = authenticatedUser.companies[0]?.id;
      if (!activeCompanyId2) return null;
      const token2 = randomBytes(32).toString("hex");
      const expiresAt2 = new Date(Date.now() + SESSION_TTL_MS);
      await pool.query("INSERT INTO auth_sessions(user_id, token_hash, expires_at) VALUES($1,$2,$3)", [user2.id, hashToken(token2), expiresAt2]);
      return { accessToken: token2, user: authenticatedUser, activeCompanyId: activeCompanyId2 };
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
  if (!user) return null;
  const userMemberships = MOCK_MEMBERSHIPS.filter((m) => m.userId === user.id && m.status === "active");
  const userCompanies = userMemberships.map((m) => {
    const company = MOCK_COMPANIES.find((c) => c.id === m.companyId);
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
  const token = randomBytes(32).toString("hex");
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
var resolveSession = async (token) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query(`UPDATE auth_sessions SET last_seen_at=now()
        WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()
        RETURNING user_id AS "userId", expires_at AS "expiresAt"`, [hashToken(token)]);
      const row = result.rows[0];
      if (row) return { userId: row.userId, activeCompanyId: "", expiresAt: row.expiresAt };
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const session = mockSessions.get(token);
  if (session && session.expiresAt.getTime() >= Date.now()) {
    return { userId: session.userId, activeCompanyId: "", expiresAt: session.expiresAt };
  }
  if (session) mockSessions.delete(token);
  return null;
};
var revokeSession = async (token) => {
  if (await checkDbConnection()) {
    try {
      await pool.query("UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [hashToken(token)]);
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  mockSessions.delete(token);
};
var resolveTenant = async (token, requestedCompanyId) => {
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
        const membership2 = {
          id: result.rows[0].id,
          companyId: requestedCompanyId,
          userId: session.userId,
          role: result.rows[0].role,
          status: result.rows[0].status,
          departmentIds: [],
          permissions: result.rows[0].permission_keys
        };
        return { [tenantContextBrand]: true, companyId: requestedCompanyId, userId: session.userId, membership: membership2 };
      }
      if (isGlobalAdmin) {
        const compRes = await withTenantTransaction(requestedCompanyId, (client) => client.query("SELECT id, name FROM companies WHERE id = $1", [requestedCompanyId]));
        if (compRes.rows.length > 0) {
          const membership2 = {
            id: `saas_admin_${requestedCompanyId.slice(0, 8)}`,
            companyId: requestedCompanyId,
            userId: session.userId,
            role: "owner",
            status: "active",
            departmentIds: [],
            permissions: ALL_PERMISSIONS
          };
          return { [tenantContextBrand]: true, companyId: requestedCompanyId, userId: session.userId, membership: membership2 };
        }
      }
      return null;
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const membership = MOCK_MEMBERSHIPS.find((m) => m.userId === session.userId && m.companyId === requestedCompanyId && m.status === "active");
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
  if (isGlobalAdmin) {
    let company = MOCK_COMPANIES.find((c) => c.id === requestedCompanyId);
    if (!company) {
      company = {
        id: requestedCompanyId,
        name: "Empresa Ativa",
        slug: `empresa-${requestedCompanyId.slice(0, 6)}`,
        status: "active"
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
        role: "owner",
        departmentIds: [],
        permissions: ALL_PERMISSIONS,
        status: "active"
      }
    };
  }
  return null;
};
var listCompaniesForUser = async (userId) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query("SELECT id, name, slug, status FROM list_active_companies_for_user($1)", [userId]);
      return result.rows;
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const memberships = MOCK_MEMBERSHIPS.filter((m) => m.userId === userId && m.status === "active");
  return memberships.map((m) => {
    const c = MOCK_COMPANIES.find((comp) => comp.id === m.companyId);
    return { id: c.id, name: c.name, slug: c.slug, status: c.status };
  });
};
var isSaaSAdmin = async (userId) => {
  if (await checkDbConnection()) {
    try {
      const result = await pool.query("SELECT is_saas_admin FROM users WHERE id = $1", [userId]);
      return result.rows[0]?.is_saas_admin === true;
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const user = MOCK_USERS.find((u) => u.id === userId);
  return user?.isSaaSAdmin === true;
};
var createCompany = async (userId, input) => {
  const companyId = crypto.randomUUID();
  const slug = input.slug?.trim() || input.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `empresa-${Date.now()}`;
  const name = input.name.trim();
  const defaultDepts = input.departments && input.departments.length > 0 ? input.departments : [
    { name: "Tecnologia da Informa\xE7\xE3o", code: "TI" },
    { name: "Administra\xE7\xE3o", code: "ADM" },
    { name: "Recursos Humanos", code: "RH" }
  ];
  if (await checkDbConnection()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO companies (id, name, slug, status) VALUES ($1, $2, $3, $4)",
        [companyId, name, slug, "active"]
      );
      await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
      const membershipResult = await client.query(
        "INSERT INTO memberships (company_id, user_id, role, status) VALUES ($1, $2, $3, $4) RETURNING id",
        [companyId, userId, "owner", "active"]
      );
      for (const dept of defaultDepts) {
        await client.query(
          "INSERT INTO departments (company_id, name, code) VALUES ($1, $2, $3)",
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
      await client.query("COMMIT");
      return {
        id: companyId,
        name,
        slug,
        status: "active",
        membership: {
          id: String(membershipResult.rows[0]?.id),
          companyId,
          userId,
          role: "owner",
          departmentIds: [],
          permissions: ALL_PERMISSIONS,
          status: "active"
        }
      };
    } catch (error) {
      await client.query("ROLLBACK");
      markDatabaseUnavailable(error);
    } finally {
      client.release();
    }
  }
  const newCompany = { id: companyId, name, slug, status: "active" };
  MOCK_COMPANIES.push(newCompany);
  const newMembership = {
    id: `m_${companyId.slice(0, 8)}`,
    companyId,
    userId,
    role: "owner",
    status: "active"
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
    status: "active",
    membership: {
      id: newMembership.id,
      companyId,
      userId,
      role: newMembership.role,
      departmentIds: [],
      permissions: ALL_PERMISSIONS,
      status: "active"
    }
  };
};
var listDepartments = async (tenant) => {
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        const result = await client.query(`
          SELECT id, company_id AS "companyId", name, code
          FROM departments
          WHERE company_id = $1 AND status = 'active'
        `, [tenant.companyId]);
        return result.rows;
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  return MOCK_DEPARTMENTS.filter((d) => d.companyId === tenant.companyId);
};
var listTenantUsers = async (tenant) => {
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
          role: row.role,
          departments: []
        }));
      });
    } catch (error) {
      markDatabaseUnavailable(error);
    }
  }
  const tenantMemberships = MOCK_MEMBERSHIPS.filter((m) => m.companyId === tenant.companyId && m.status === "active");
  return tenantMemberships.map((m) => {
    const user = MOCK_USERS.find((u) => u.id === m.userId);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: m.role,
      departments: []
    };
  });
};
var createTenantUser = async (tenant, input) => {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  const password = input.password;
  const role = input.role || "employee";
  let userId;
  if (await checkDbConnection()) {
    try {
      return await withTenantTransaction(tenant.companyId, async (client) => {
        let userResult = await client.query("SELECT id FROM users WHERE email = $1", [email]);
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
      existing.status = "active";
    }
  } else {
    MOCK_MEMBERSHIPS.push({
      id: `m_${tenant.companyId.slice(0, 4)}_${userId.slice(0, 4)}`,
      companyId: tenant.companyId,
      userId,
      role,
      status: "active"
    });
  }
  const deptNames = [];
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
var hasPermission = async (tenant, permission) => {
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
  return tenant.membership.permissions.includes(permission);
};
var listNotices = async (tenant) => {
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
var createNotice = async (tenant, input) => {
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
  const newNotice = {
    id: randomUUID(),
    companyId: tenant.companyId,
    title: input.title,
    category: input.category,
    type: input.type,
    content: input.content,
    authorId: tenant.userId,
    authorName: user?.name ?? "Administrador",
    departmentName: input.category || "Geral",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  mockNotices.unshift(newNotice);
  return { id: newNotice.id };
};
var markNoticeRead = async (tenant, noticeId) => {
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
  const readAt = (/* @__PURE__ */ new Date()).toISOString();
  mockReads.set(key, readAt);
  return { readAt };
};

// apps/api/src/sanitize.ts
import sanitizeHtml from "sanitize-html";
var sanitizeNoticeHtml = (html) => sanitizeHtml(html, {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) }
});

// apps/api/src/server.ts
var PORT = Number(process.env.API_PORT ?? 3333);
var WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
var MAX_BODY_BYTES = 64 * 1024;
var LOGIN_WINDOW_MS = 15 * 60 * 1e3;
var LOGIN_MAX_FAILURES = 5;
var loginAttempts = /* @__PURE__ */ new Map();
var loginAttemptKey = (request, email) => `${request.socket.remoteAddress ?? "unknown"}:${email.toLowerCase().trim()}`;
var loginRetryAfter = (key, now = Date.now()) => {
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1e3));
};
var registerLoginFailure = (key, now = Date.now()) => {
  const current = loginAttempts.get(key);
  const attempt = !current || now - current.windowStartedAt >= LOGIN_WINDOW_MS ? { failures: 0, windowStartedAt: now, blockedUntil: 0 } : current;
  attempt.failures += 1;
  if (attempt.failures >= LOGIN_MAX_FAILURES) attempt.blockedUntil = now + LOGIN_WINDOW_MS;
  loginAttempts.set(key, attempt);
};
var HttpError = class extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
  statusCode;
  code;
};
var sendJson = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": WEB_ORIGIN,
    "access-control-allow-headers": "authorization, content-type, x-company-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-credentials": "true",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...headers
  });
  response.end(JSON.stringify(body));
};
var readJson = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "O corpo da requisi\xE7\xE3o excede o limite permitido.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "O corpo da requisi\xE7\xE3o deve conter JSON v\xE1lido.");
  }
};
var bearerToken = (request) => {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return request.headers.cookie?.split(";").map((v) => v.trim()).find((v) => v.startsWith("session="))?.slice(8) ?? "";
};
var requireSession = async (request, response) => {
  const token = bearerToken(request);
  const session = token ? await resolveSession(token) : null;
  if (!session) {
    sendJson(response, 401, { error: "UNAUTHORIZED", message: "Sess\xE3o inv\xE1lida ou expirada.", statusCode: 401 });
    return null;
  }
  return { token, session };
};
var requireTenant = async (request, response) => {
  const auth = await requireSession(request, response);
  if (!auth) return null;
  const companyIdHeader = request.headers["x-company-id"];
  const companyId = Array.isArray(companyIdHeader) ? companyIdHeader[0] : companyIdHeader;
  if (!companyId) {
    sendJson(response, 400, { error: "COMPANY_REQUIRED", message: "Informe a empresa ativa no cabe\xE7alho X-Company-ID.", statusCode: 400 });
    return null;
  }
  const tenant = await resolveTenant(auth.token, companyId);
  if (!tenant) {
    sendJson(response, 403, { error: "TENANT_ACCESS_DENIED", message: "O usu\xE1rio n\xE3o pertence \xE0 empresa solicitada.", statusCode: 403 });
    return null;
  }
  return tenant;
};
var handleRequest = async (request, response) => {
  try {
    if (request.method === "OPTIONS") return sendJson(response, 204, null);
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    let pathname = url.pathname;
    if (pathname.startsWith("/api")) {
      pathname = pathname.slice(4) || "/";
    }
    if (request.method === "GET" && pathname === "/health") {
      return sendJson(response, 200, { status: "ok", service: "central-comunicacao-api" });
    }
    if (request.method === "POST" && pathname === "/auth/login") {
      const body = await readJson(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const key = loginAttemptKey(request, email);
      const retryAfter = loginRetryAfter(key);
      if (retryAfter > 0) {
        return sendJson(response, 429, {
          error: "TOO_MANY_LOGIN_ATTEMPTS",
          message: "Muitas tentativas de acesso. Tente novamente mais tarde.",
          statusCode: 429
        }, { "retry-after": String(retryAfter) });
      }
      const result = await authenticate(email, String(body.password ?? ""));
      if (!result) {
        registerLoginFailure(key);
        return sendJson(response, 401, { error: "INVALID_CREDENTIALS", message: "E-mail ou senha inv\xE1lidos.", statusCode: 401 });
      }
      loginAttempts.delete(key);
      return sendJson(response, 200, { user: result.user, activeCompanyId: result.activeCompanyId }, { "set-cookie": `session=${result.accessToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}` });
    }
    if (request.method === "GET" && pathname === "/companies") {
      const auth = await requireSession(request, response);
      if (!auth) return;
      return sendJson(response, 200, { data: await listCompaniesForUser(auth.session.userId) });
    }
    if (request.method === "POST" && pathname === "/companies") {
      const auth = await requireSession(request, response);
      if (!auth) return;
      if (!await isSaaSAdmin(auth.session.userId)) {
        return sendJson(response, 403, {
          error: "PERMISSION_DENIED",
          message: "Apenas o Administrador do SaaS possui permiss\xE3o para criar novas empresas.",
          statusCode: 403
        });
      }
      const body = await readJson(request);
      const name = String(body.name ?? "").trim();
      const slug = body.slug ? String(body.slug).trim() : void 0;
      if (!name || name.length < 2 || name.length > 120) {
        throw new HttpError(400, "INVALID_COMPANY_NAME", "O nome da empresa deve ter entre 2 e 120 caracteres.");
      }
      const newCompany = await createCompany(auth.session.userId, {
        name,
        slug,
        departments: Array.isArray(body.departments) ? body.departments : void 0
      });
      return sendJson(response, 201, { data: newCompany });
    }
    if (request.method === "GET" && pathname === "/departments") {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listDepartments(tenant) });
    }
    if (request.method === "GET" && pathname === "/users") {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, "users.view")) {
        return sendJson(response, 403, { error: "PERMISSION_DENIED", message: "Permiss\xE3o users.view necess\xE1ria.", statusCode: 403 });
      }
      return sendJson(response, 200, { data: await listTenantUsers(tenant) });
    }
    if (request.method === "POST" && pathname === "/users") {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, "users.manage") && !await isSaaSAdmin(tenant.userId)) {
        return sendJson(response, 403, { error: "PERMISSION_DENIED", message: "Permiss\xE3o users.manage necess\xE1ria.", statusCode: 403 });
      }
      const body = await readJson(request);
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = body.password ? String(body.password) : void 0;
      const role = String(body.role ?? "employee");
      if (!name || name.length < 2 || name.length > 100) {
        throw new HttpError(400, "INVALID_USER_NAME", "O nome do usu\xE1rio deve ter entre 2 e 100 caracteres.");
      }
      if (!email || !email.includes("@") || email.length > 120) {
        throw new HttpError(400, "INVALID_USER_EMAIL", "E-mail inv\xE1lido.");
      }
      if (!password || password.length < 12 || password.length > 128) {
        throw new HttpError(400, "INVALID_USER_PASSWORD", "A senha provis\xF3ria deve ter entre 12 e 128 caracteres.");
      }
      const allowedRoles = ["owner", "admin", "publisher", "manager", "employee", "auditor", "support"];
      if (!allowedRoles.includes(role)) {
        throw new HttpError(400, "INVALID_ROLE", "Papel de usu\xE1rio inv\xE1lido.");
      }
      const createdUser = await createTenantUser(tenant, {
        name,
        email,
        password,
        role,
        departmentIds: Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : void 0
      });
      return sendJson(response, 201, { data: createdUser });
    }
    if (request.method === "POST" && pathname === "/auth/logout") {
      const token = bearerToken(request);
      if (token) await revokeSession(token);
      return sendJson(response, 204, null, { "set-cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
    }
    if (request.method === "GET" && pathname === "/notices") {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listNotices(tenant) });
    }
    if (request.method === "POST" && pathname === "/notices") {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, "notices.create")) return sendJson(response, 403, { error: "PERMISSION_DENIED", message: "Permiss\xE3o notices.create necess\xE1ria.", statusCode: 403 });
      const body = await readJson(request);
      const title = String(body.title ?? "").trim();
      const rawContent = String(body.content ?? "").trim();
      const content = sanitizeNoticeHtml(rawContent);
      if (title.length < 3 || title.length > 180 || !content || content.length > 1e5) throw new HttpError(400, "INVALID_NOTICE", "T\xEDtulo ou conte\xFAdo inv\xE1lido.");
      const type = String(body.type ?? "informative");
      if (!["urgent", "informative", "update"].includes(type)) throw new HttpError(400, "INVALID_NOTICE_TYPE", "Tipo inv\xE1lido.");
      return sendJson(response, 201, await createNotice(tenant, { title, content, type, category: String(body.category ?? "Geral").slice(0, 80) }));
    }
    const readMatch = pathname.match(/^\/notices\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/read$/i);
    if (request.method === "POST" && readMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const result = await markNoticeRead(tenant, readMatch[1]);
      return result ? sendJson(response, 200, result) : sendJson(response, 404, { error: "NOT_FOUND", message: "Comunicado n\xE3o encontrado.", statusCode: 404 });
    }
    return sendJson(response, 404, { error: "NOT_FOUND", message: "Rota n\xE3o encontrada.", statusCode: 404 });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return sendJson(response, 503, {
        error: "DATABASE_UNAVAILABLE",
        message: "Servi\xE7o temporariamente indispon\xEDvel.",
        statusCode: 503
      }, { "retry-after": "30" });
    }
    if (error instanceof HttpError) {
      return sendJson(response, error.statusCode, { error: error.code, message: error.message, statusCode: error.statusCode });
    }
    console.error(error);
    const detail = error instanceof Error ? error.message : "Erro interno da API.";
    return sendJson(response, 500, { error: "INTERNAL_ERROR", message: detail, statusCode: 500 });
  }
};
var app = createServer(handleRequest);
var isMain = Boolean(process.argv[1] && (process.argv[1].endsWith("server.js") || process.argv[1].endsWith("server.ts")) && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.NODE_ENV !== "test");
if (isMain) {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`API multiempresa dispon\xEDvel em http://127.0.0.1:${PORT}`);
  });
}

// api/serverless.ts
async function handler(req, res) {
  try {
    await handleRequest(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Serverless Error";
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "SERVERLESS_CRASH", message }));
  }
}
export {
  handler as default
};
