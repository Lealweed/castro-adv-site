import { randomBytes } from 'node:crypto';

interface ApiReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiRes {
  status: (code: number) => ApiRes;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

type OfficeRole = 'admin' | 'finance' | 'staff' | 'member';

interface AuthUserRecord {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

const VALID_ROLES = new Set<OfficeRole>(['admin', 'finance', 'staff', 'member']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCorsHeaders(res: ApiRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function getHeaderValue(headers: Record<string, string | string[] | undefined>, key: string): string {
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] || '');
  return typeof raw === 'string' ? raw : '';
}

function isServiceRoleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function resolveOrigin(req: ApiReq): string {
  const origin = getHeaderValue(req.headers, 'origin').trim();
  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return origin.replace(/\/+$/, '');
  }
  const forwardedHost = getHeaderValue(req.headers, 'x-forwarded-host').trim();
  const host = forwardedHost || getHeaderValue(req.headers, 'host').trim();
  if (host) {
    const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'https://www.castrodeoliveiraadv.org';
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const obj = payload as Record<string, unknown>;
  const raw = obj.msg || obj.message || obj.error_description || obj.error;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
}

async function readJsonSafe(resp: Response): Promise<unknown> {
  const text = await resp.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function requireOfficeAdmin(
  req: ApiReq,
  supabaseUrl: string,
  serviceKey: string,
): Promise<
  | { ok: true; callerId: string; callerEmail: string; officeId: string }
  | { ok: false; status: number; error: string }
> {
  const authHeader = getHeaderValue(req.headers, 'authorization');
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Token de autenticação ausente.' };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Token de autenticação ausente.' };
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const caller = (await readJsonSafe(userResp)) as { id?: string; email?: string } | null;
  if (!userResp.ok || !caller?.id) {
    return { ok: false, status: 401, error: 'Sessão inválida ou expirada. Faça login novamente.' };
  }

  const memberResp = await fetch(
    `${supabaseUrl}/rest/v1/office_members?user_id=eq.${encodeURIComponent(caller.id)}&role=eq.admin&select=office_id,role&order=created_at.asc&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  const memberRows = (await readJsonSafe(memberResp)) as Array<{ office_id?: string; role?: string }> | null;
  if (!memberResp.ok || !Array.isArray(memberRows) || !memberRows[0]?.office_id) {
    return {
      ok: false,
      status: 403,
      error: 'Apenas administradores do escritório podem criar ou gerenciar usuários.',
    };
  }

  return {
    ok: true,
    callerId: caller.id,
    callerEmail: String(caller.email || ''),
    officeId: memberRows[0].office_id,
  };
}

async function listAllAuthUsers(supabaseUrl: string, serviceKey: string): Promise<AuthUserRecord[]> {
  const allUsers: AuthUserRecord[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200&page=${page}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!resp.ok) {
      const errBody = await readJsonSafe(resp);
      throw new Error(extractErrorMessage(errBody, 'Falha ao consultar usuários no Supabase Auth.'));
    }
    const data = (await readJsonSafe(resp)) as { users?: AuthUserRecord[] } | null;
    const batch = Array.isArray(data?.users) ? data.users : [];
    allUsers.push(...batch);
    if (batch.length < 200) break;
  }
  return allUsers;
}

function getDisplayName(user: AuthUserRecord): string {
  const meta = user.user_metadata;
  const full = meta && typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const disp = meta && typeof meta.display_name === 'string' ? meta.display_name.trim() : '';
  if (full) return full;
  if (disp) return disp;
  const email = String(user.email || '');
  return email.includes('@') ? email.split('@')[0] : 'Usuário';
}

export default async function handler(req: ApiReq, res: ApiRes) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !serviceKey || !isServiceRoleJwt(serviceKey)) {
    res.status(500).json({
      error: 'Configure SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel para habilitar a criação de usuários.',
    });
    return;
  }

  try {
    const authCheck = await requireOfficeAdmin(req, supabaseUrl, serviceKey);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }

    const { officeId } = authCheck;

    if (req.method === 'GET') {
      const [authUsers, membersResp] = await Promise.all([
        listAllAuthUsers(supabaseUrl, serviceKey),
        fetch(
          `${supabaseUrl}/rest/v1/office_members?office_id=eq.${encodeURIComponent(officeId)}&select=user_id,role`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          },
        ),
      ]);

      const membersData = (await readJsonSafe(membersResp)) as Array<{ user_id?: string; role?: string }> | null;
      if (!membersResp.ok || !Array.isArray(membersData)) {
        res.status(500).json({ error: 'Falha ao consultar membros do escritório.' });
        return;
      }

      const memberSet = new Set(membersData.map((m) => m.user_id).filter(Boolean));
      const authStatusByUserId: Record<string, { lastSignInAt: string | null; emailConfirmedAt: string | null }> = {};
      const unlinkedUsers: Array<{
        id: string;
        email: string;
        fullName: string;
        lastSignInAt: string | null;
        createdAt: string | null;
      }> = [];

      for (const u of authUsers) {
        authStatusByUserId[u.id] = {
          lastSignInAt: u.last_sign_in_at || null,
          emailConfirmedAt: u.email_confirmed_at || null,
        };
        if (!memberSet.has(u.id) && u.email) {
          unlinkedUsers.push({
            id: u.id,
            email: u.email,
            fullName: getDisplayName(u),
            lastSignInAt: u.last_sign_in_at || null,
            createdAt: u.created_at || null,
          });
        }
      }

      res.status(200).json({
        ok: true,
        officeId,
        authStatusByUserId,
        unlinkedUsers,
      });
      return;
    }

    const body = parseBody(req.body);
    const action = String(body.action || 'create').trim();

    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase();
      const roleRaw = String(body.role || 'member').trim().toLowerCase() as OfficeRole;
      let fullName = String(body.fullName || '').trim();
      const password = String(body.password || '').trim();
      const sendRecoveryEmail = Boolean(body.sendRecoveryEmail);
      const oabNumber = String(body.oabNumber || '').trim();
      const oabUf = String(body.oabUf || '').trim().toUpperCase().slice(0, 2);
      const phone = String(body.phone || '').trim();
      const whatsapp = String(body.whatsapp || '').trim();

      if (!EMAIL_REGEX.test(email)) {
        res.status(400).json({ error: 'Informe um e-mail válido.' });
        return;
      }
      if (!VALID_ROLES.has(roleRaw)) {
        res.status(400).json({ error: 'Cargo inválido. Utilize admin, member, staff ou finance.' });
        return;
      }
      if (password && password.length < 6) {
        res.status(400).json({ error: 'A senha inicial deve ter no mínimo 6 caracteres.' });
        return;
      }

      const authUsers = await listAllAuthUsers(supabaseUrl, serviceKey);
      const existing = authUsers.find((u) => String(u.email || '').trim().toLowerCase() === email);

      let userId: string;
      let createdInAuth = false;

      if (!existing) {
        if (fullName.length < 2) {
          res.status(400).json({ error: 'Informe o nome completo do colaborador (mínimo 2 caracteres).' });
          return;
        }
        const effectivePassword = password || `${randomBytes(18).toString('base64url')}A1!`;
        const createAuthResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password: effectivePassword,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              display_name: fullName,
            },
          }),
        });
        const createdPayload = (await readJsonSafe(createAuthResp)) as { id?: string } | null;
        if (!createAuthResp.ok || !createdPayload?.id) {
          res.status(400).json({
            error: extractErrorMessage(createdPayload, 'Falha ao criar conta no Supabase Auth.'),
          });
          return;
        }
        userId = createdPayload.id;
        createdInAuth = true;
      } else {
        userId = existing.id;
        if (!fullName) {
          fullName = getDisplayName(existing);
        }
      }

      const profileRow: Record<string, unknown> = {
        user_id: userId,
        office_id: officeId,
        email,
        updated_at: new Date().toISOString(),
      };
      if (fullName) profileRow.display_name = fullName;
      if (oabNumber) profileRow.oab_number = oabNumber;
      if (oabUf) profileRow.oab_uf = oabUf;
      if (phone) profileRow.phone = phone;
      if (whatsapp) profileRow.whatsapp = whatsapp;

      const profileResp = await fetch(`${supabaseUrl}/rest/v1/user_profiles?on_conflict=user_id`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(profileRow),
      });
      if (!profileResp.ok) {
        const errBody = await readJsonSafe(profileResp);
        res.status(500).json({
          error: extractErrorMessage(errBody, 'Conta criada, mas falhou ao atualizar perfil em user_profiles.'),
        });
        return;
      }

      const existingMemberResp = await fetch(
        `${supabaseUrl}/rest/v1/office_members?office_id=eq.${encodeURIComponent(officeId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,role&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      const existingMemberRows = (await readJsonSafe(existingMemberResp)) as Array<{ id?: string; role?: string }> | null;
      const existingMember = Array.isArray(existingMemberRows) ? existingMemberRows[0] : undefined;

      let alreadyLinked = false;
      if (existingMember?.id) {
        alreadyLinked = true;
        const patchResp = await fetch(
          `${supabaseUrl}/rest/v1/office_members?id=eq.${encodeURIComponent(existingMember.id)}`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ role: roleRaw }),
          },
        );
        if (!patchResp.ok) {
          const errBody = await readJsonSafe(patchResp);
          res.status(500).json({ error: extractErrorMessage(errBody, 'Falha ao atualizar cargo do membro.') });
          return;
        }
      } else {
        const insertResp = await fetch(`${supabaseUrl}/rest/v1/office_members`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            office_id: officeId,
            user_id: userId,
            role: roleRaw,
          }),
        });
        if (!insertResp.ok) {
          const errBody = await readJsonSafe(insertResp);
          res.status(500).json({ error: extractErrorMessage(errBody, 'Falha ao vincular membro ao escritório.') });
          return;
        }
      }

      // Auto-accept any open invite for this email in the same office
      await fetch(
        `${supabaseUrl}/rest/v1/office_invites?office_id=eq.${encodeURIComponent(officeId)}&email=ilike.${encodeURIComponent(email)}&accepted_at=is.null&revoked_at=is.null`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            accepted_at: new Date().toISOString(),
            accepted_by_user_id: userId,
          }),
        },
      ).catch(() => null);

      let recoveryEmailSent = false;
      let recoveryWarning: string | null = null;
      if ((!password && createdInAuth) || sendRecoveryEmail) {
        const redirectTo = `${resolveOrigin(req)}/app/login`;
        const recResp = await fetch(
          `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          },
        );
        if (recResp.ok) {
          recoveryEmailSent = true;
        } else {
          const errBody = await readJsonSafe(recResp);
          recoveryWarning = extractErrorMessage(
            errBody,
            'Não foi possível enviar o e-mail de definição de senha automaticamente.',
          );
        }
      }

      res.status(createdInAuth ? 201 : 200).json({
        ok: true,
        user: {
          id: userId,
          email,
          fullName,
          role: roleRaw,
        },
        createdInAuth,
        alreadyLinked,
        recoveryEmailSent,
        recoveryWarning,
      });
      return;
    }

    if (action === 'reset_password') {
      const userId = String(body.userId || '').trim();
      const newPassword = String(body.newPassword || '').trim();
      let email = String(body.email || '').trim().toLowerCase();

      if (!userId) {
        res.status(400).json({ error: 'Identificador do usuário é obrigatório.' });
        return;
      }

      const memberResp = await fetch(
        `${supabaseUrl}/rest/v1/office_members?office_id=eq.${encodeURIComponent(officeId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      const memberRows = (await readJsonSafe(memberResp)) as Array<{ id?: string }> | null;
      if (!memberResp.ok || !Array.isArray(memberRows) || !memberRows[0]?.id) {
        res.status(404).json({ error: 'Usuário não encontrado neste escritório.' });
        return;
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
          return;
        }
        const updateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: newPassword,
            email_confirm: true,
          }),
        });
        if (!updateResp.ok) {
          const errBody = await readJsonSafe(updateResp);
          res.status(400).json({ error: extractErrorMessage(errBody, 'Falha ao atualizar a senha do usuário.') });
          return;
        }
        res.status(200).json({ ok: true, mode: 'direct' });
        return;
      }

      if (!email) {
        const authUserResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        });
        const authUser = (await readJsonSafe(authUserResp)) as { email?: string } | null;
        email = String(authUser?.email || '').trim().toLowerCase();
      }

      if (!EMAIL_REGEX.test(email)) {
        res.status(400).json({ error: 'E-mail do usuário não localizado para envio do link.' });
        return;
      }

      const redirectTo = `${resolveOrigin(req)}/app/login`;
      const recResp = await fetch(
        `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        },
      );
      if (!recResp.ok) {
        const errBody = await readJsonSafe(recResp);
        res.status(400).json({ error: extractErrorMessage(errBody, 'Falha ao enviar link de redefinição de senha.') });
        return;
      }

      res.status(200).json({ ok: true, mode: 'email', email });
      return;
    }

    res.status(400).json({ error: 'Ação inválida.' });
  } catch (err: unknown) {
    const message = err instanceof Error && err.message ? err.message : 'Erro interno ao processar usuário.';
    res.status(500).json({ error: message });
  }
}
