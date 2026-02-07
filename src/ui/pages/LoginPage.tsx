import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/auth/authStore';

export function LoginPage() {
  const nav = useNavigate();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      setError(json?.message || json?.error || 'Falha no login.');
      setLoading(false);
      return;
    }

    if (!json?.accessToken || !json?.refreshToken) {
      setError('Resposta inválida do servidor.');
      setLoading(false);
      return;
    }

    auth.signIn({ accessToken: json.accessToken, refreshToken: json.refreshToken });
    nav('/app/selecionar-organizacao');
    setLoading(false);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-semibold">Entrar</div>
        <div className="mt-1 text-sm text-white/60">Acesse a área do advogado.</div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-white/80">
            E-mail
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 focus:border-white/20"
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
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 focus:border-white/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            disabled={loading}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          {error ? <div className="text-sm text-red-200">{error}</div> : null}
        </form>
      </div>
    </div>
  );
}
