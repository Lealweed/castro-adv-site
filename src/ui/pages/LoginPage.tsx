import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/authStore';
import { signInWithPassword } from '@/auth/supabaseAuth';
import { env } from '@/env';

export function LoginPage() {
  const nav = useNavigate();
  // Auth state is handled by Supabase session listener (AuthProvider)
  useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setError('Supabase não configurado (env vars).');
      setLoading(false);
      return;
    }

    const { error } = await signInWithPassword(email, password);
    if (error) {
      setError(error.message || 'Falha no login.');
      setLoading(false);
      return;
    }

    nav('/app');
    setLoading(false);
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
