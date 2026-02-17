import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/authStore';
import { signInWithPassword } from '@/auth/supabaseAuth';
import { env } from '@/env';
import { setTokens } from '@/lib/apiClient';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  organizations?: Array<{ id: string; name: string; role?: string }>;
};

export function LoginPage() {
  const nav = useNavigate();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginWithBackend(emailValue: string, passwordValue: string) {
    const res = await fetch(`${env.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    });

    const json = (await res.json().catch(() => null)) as LoginResponse | { message?: string } | null;

    if (!res.ok) {
      const msg = (json as any)?.message || 'Falha no login.';
      throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
    }

    const data = json as LoginResponse;
    if (!data?.accessToken || !data?.refreshToken) {
      throw new Error('Resposta de login inválida (tokens ausentes).');
    }

    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

    const firstOrg = data.organizations?.[0]?.id;
    if (firstOrg) auth.setOrgId(firstOrg);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prefer backend JWT auth when API is configured.
      if (env.apiBaseUrl) {
        await loginWithBackend(email, password);
        nav('/app');
        return;
      }

      // Fallback: Supabase auth (legacy path).
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('Nenhum provedor de autenticação configurado.');
      }

      const { error } = await signInWithPassword(email, password);
      if (error) throw new Error(error.message || 'Falha no login.');

      nav('/app');
    } catch (err: any) {
      setError(err?.message || 'Falha no login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur">
        <div className="text-xl font-semibold text-white">Entrar</div>
        <div className="mt-1 text-sm text-white/60">Acesse a área do advogado.</div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-white/80">
            E-mail
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="text-sm text-white/80">
            Senha
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button disabled={loading} className="btn-primary">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          {error ? <div className="text-sm text-red-200">{error}</div> : null}
        </form>
      </div>
    </div>
  );
}
