import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/auth/authStore';
import { getStoredTheme, setTheme, type AppTheme } from '@/lib/theme';

export function Topbar() {
  const auth = useAuth();
  const [theme, setThemeState] = useState<AppTheme>('dark');

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  function onToggleTheme() {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Bem-vindo de volta</div>
          <div className="text-xs text-white/60">Visão geral do escritório</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 sm:flex">
            <Search className="h-4 w-4" />
            <input
              className="w-64 bg-transparent text-sm outline-none placeholder:text-white/40"
              placeholder="Buscar cliente, processo, tarefa..."
              disabled
            />
          </div>
          <button
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
            aria-label="Alternar tema claro/escuro"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>

          {auth.isAuthenticated ? (
            <button
              onClick={() => void auth.signOut()}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Sair
            </button>
          ) : null}

          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300/30 to-white/5" />
        </div>
      </div>
    </header>
  );
}
