import { requireSupabase } from '@/lib/supabaseDb';

export type OfficeRole = 'admin' | 'finance' | 'member' | 'staff';

export type UnlinkedAuthUser = {
  id: string;
  email: string;
  fullName: string;
  lastSignInAt: string | null;
  createdAt: string | null;
};

export type OfficeAuthStatusMap = Record<
  string,
  {
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
  }
>;

export type OfficeUsersStatusResponse = {
  ok: boolean;
  officeId: string;
  authStatusByUserId: OfficeAuthStatusMap;
  unlinkedUsers: UnlinkedAuthUser[];
};

export type CreateOfficeUserInput = {
  email: string;
  fullName: string;
  role: OfficeRole;
  password?: string;
  sendRecoveryEmail?: boolean;
  oabNumber?: string;
  oabUf?: string;
  phone?: string;
  whatsapp?: string;
};

export type CreateOfficeUserResult = {
  ok: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: OfficeRole;
  };
  createdInAuth: boolean;
  alreadyLinked: boolean;
  recoveryEmailSent: boolean;
  recoveryWarning?: string | null;
};

export type ResetPasswordResult = {
  ok: boolean;
  mode: 'direct' | 'email';
  email?: string;
};

export const OFFICE_ROLE_OPTIONS: Array<{ value: OfficeRole; label: string; description: string }> = [
  { value: 'member', label: 'Advogado / Membro', description: 'Casos, clientes, agenda e tarefas' },
  { value: 'staff', label: 'Operacional / Secretaria', description: 'Atendimento, agenda e demandas' },
  { value: 'finance', label: 'Financeiro', description: 'Asaas, lançamentos e relatórios' },
  { value: 'admin', label: 'Sócio / Admin', description: 'Acesso total, equipe e configurações' },
];

export function getOfficeRoleLabel(role: string): string {
  switch (String(role || '').trim().toLowerCase()) {
    case 'admin':
      return 'Sócio / Admin';
    case 'finance':
      return 'Financeiro';
    case 'staff':
      return 'Operacional / Secretaria';
    default:
      return 'Advogado / Membro';
  }
}

export function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%!';
  const all = upper + lower + digits + symbols;

  const pick = (pool: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  };

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < Math.max(8, length)) {
    chars.push(pick(all));
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function getBearerToken(): Promise<string> {
  const sb = requireSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente no sistema.');
  }
  return token;
}

async function callOfficeUsersApi<T>(init: RequestInit): Promise<T> {
  const token = await getBearerToken();
  const res = await fetch('/api/office-users', {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const text = await res.text().catch(() => '');
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    throw new Error(
      'Endpoint /api/office-users indisponível neste ambiente. Utilize o painel publicado na Vercel ou rode com vercel dev.',
    );
  }

  if (!res.ok) {
    throw new Error(parsed?.error || 'Falha ao processar operação de usuário.');
  }

  return parsed as T;
}

export async function fetchOfficeUsersStatus(): Promise<OfficeUsersStatusResponse> {
  return callOfficeUsersApi<OfficeUsersStatusResponse>({ method: 'GET' });
}

export async function createOfficeUser(input: CreateOfficeUserInput): Promise<CreateOfficeUserResult> {
  return callOfficeUsersApi<CreateOfficeUserResult>({
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      ...input,
    }),
  });
}

export async function resetOfficeUserPassword(input: {
  userId: string;
  email?: string;
  newPassword?: string;
}): Promise<ResetPasswordResult> {
  return callOfficeUsersApi<ResetPasswordResult>({
    method: 'POST',
    body: JSON.stringify({
      action: 'reset_password',
      ...input,
    }),
  });
}
