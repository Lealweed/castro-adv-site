import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';

import { useAuth } from '@/auth/authStore';
import { signInWithPassword } from '@/auth/supabaseAuth';
import { env } from '@/env';
import { setRole, setTokens } from '@/lib/apiClient';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  organizations?: Array<{ id: string; name: string; role?: string }>;
};

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Check if URL has hash fragment with access_token (successful recovery)
    // or if the Supabase event fires.
    const checkRecovery = async () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
      }
      
      try {
        const { onAuthStateChange } = await import('@/auth/supabaseAuth');
        onAuthStateChange(() => {
          // You could also check event types here if exported, 
          // but we rely on the URL hash mostly.
        });
      } catch (e) {
        // ignore
      }
    };
    checkRecovery();
  }, [loc]);

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

    const firstRole = String(data.organizations?.[0]?.role || '').toLowerCase();
    if (firstRole) {
      setRole(firstRole === 'owner' ? 'admin' : firstRole);
    }
  }

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      if (!supabase) throw new Error('Supabase Client not found');
      
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      
      alert('Senha atualizada com sucesso! Você já pode entrar.');
      setIsRecoveryMode(false);
      setPassword('');
      nav('/app');
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prefer backend JWT auth when API is configured.
      if (env.apiBaseUrl) {
        try {
          await loginWithBackend(email, password);

          // Keep Supabase session in sync for role-based guards/pages that still depend on it.
          if (env.supabaseUrl && env.supabaseAnonKey) {
            await signInWithPassword(email, password).catch(() => ({ error: null } as any));
          }

          nav('/app');
          return;
        } catch (backendErr: any) {
          // Se der erro de credenciais no backend novo, vamos tentar no Supabase antigo antes de falhar
          if (env.supabaseUrl && env.supabaseAnonKey) {
            const { error: sbError } = await signInWithPassword(email, password);
            if (sbError) {
              // Falhou nos dois
              throw new Error('Falha no login. Verifique seu e-mail e senha.');
            }
            // Funcionou no Supabase, prossegue
            nav('/app');
            return;
          }
          throw backendErr;
        }
      }

      // Fallback: Supabase auth (legacy path).
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('API indisponível e Supabase não configurado.');
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

  if (isRecoveryMode) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950/75 p-7 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <KeyRound className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Criar Nova Senha</div>
              <div className="text-xs text-white/60">Defina sua nova credencial de acesso ao sistema.</div>
            </div>
          </div>

          <form onSubmit={onUpdatePassword} className="mt-6 grid gap-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Nova Senha
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" strokeWidth={1.75} />
                <input
                  className="input !mt-0 w-full pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>
            </label>

            <button disabled={loading} className="btn-primary !py-2.5">
              {loading ? 'Salvando…' : 'Salvar Nova Senha'}
            </button>

            {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div> : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950/75 p-7 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">Acessar Sistema</div>
            <div className="text-xs text-white/60">Autenticação segura para equipe e advogados.</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
            E-mail
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" strokeWidth={1.75} />
              <input
                className="input !mt-0 pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="nome@castrooliveira.adv.br"
                required
              />
            </div>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Senha
            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" strokeWidth={1.75} />
              <input
                className="input !mt-0 w-full pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
              </button>
            </div>
          </label>

          <button disabled={loading} className="btn-primary mt-1 !py-2.5">
            {loading ? 'Entrando…' : 'Entrar no Workspace'}
            {!loading ? <ArrowRight className="h-4 w-4" strokeWidth={1.75} /> : null}
          </button>

          {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div> : null}

          <div className="mt-1 text-center">
            <button
              type="button"
              onClick={async () => {
                if (!email) {
                  setError('Digite seu e-mail acima para receber o link de redefinição.');
                  return;
                }
                setLoading(true);
                setError(null);
                try {
                  const { error: resetErr } = await import('@/auth/supabaseAuth').then(m => m.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/app/login' }));
                  if (resetErr) throw resetErr;
                  alert('Um link seguro para definir sua senha foi enviado para seu e-mail!');
                } catch (e: any) {
                  setError(e?.message || 'Falha ao enviar e-mail de redefinição.');
                } finally {
                  setLoading(false);
                }
              }}
              className="text-xs text-sky-300/80 transition-colors hover:text-sky-200 hover:underline"
            >
              Primeiro Acesso / Esqueci a Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
