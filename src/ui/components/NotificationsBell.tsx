import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/authStore';
import {
  countUnreadNotifications,
  formatNotificationRelativeTime,
  getNotificationTypeMeta,
  listSystemNotifications,
  markNotificationAsRead,
  notificationKeys,
  type SystemNotification,
} from '@/lib/notifications';
import { cn } from '@/ui/utils/cn';

export function NotificationsBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: countUnreadNotifications,
    enabled: auth.isAuthenticated,
    staleTime: 15_000,
    refetchInterval: auth.isAuthenticated ? 60_000 : false,
    refetchOnWindowFocus: true,
  });

  const recentNotificationsQuery = useQuery({
    queryKey: notificationKeys.recent(),
    queryFn: () => listSystemNotifications(8),
    enabled: auth.isAuthenticated && open,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async (_result, notificationId) => {
      const markLocalRead = (current?: SystemNotification[]) =>
        current?.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification,
        );

      queryClient.setQueryData<SystemNotification[] | undefined>(notificationKeys.list(), markLocalRead);
      queryClient.setQueryData<SystemNotification[] | undefined>(notificationKeys.recent(), markLocalRead);
      queryClient.setQueryData<number | undefined>(notificationKeys.unreadCount(), (current) =>
        Math.max(0, Number(current || 0) - 1),
      );

      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const unreadCount = unreadCountQuery.data || 0;
  const hasUnread = unreadCount > 0;
  const notificationsLabel = hasUnread ? `Notificacoes, ${unreadCount} nao lidas` : 'Notificacoes';
  const notifications = recentNotificationsQuery.data || [];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition-colors hover:bg-white/10"
        aria-label={notificationsLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Central de notificacoes</div>
                <div className="text-xs text-white/55">Automacoes, tarefas e alertas recentes do escritorio.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/app/notificacoes');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                Ver todas
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3">
            {recentNotificationsQuery.isPending ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-white/65">
                Carregando notificacoes...
              </div>
            ) : null}

            {!recentNotificationsQuery.isPending && notifications.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-white/65">
                Nenhuma notificacao recente no momento.
              </div>
            ) : null}

            {!recentNotificationsQuery.isPending && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const typeMeta = getNotificationTypeMeta(notification.type);
                  const markingThisOne = markReadMutation.isPending && markReadMutation.variables === notification.id;

                  return (
                    <article
                      key={notification.id}
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        notification.is_read
                          ? 'border-white/10 bg-white/5'
                          : 'border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]', typeMeta.className)}>
                              {typeMeta.label}
                            </span>
                            {!notification.is_read ? (
                              <span className="inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-200">
                                Nova
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm font-semibold text-white">{notification.title}</div>
                          <p className="mt-1 whitespace-pre-line text-xs leading-5 text-white/70">{notification.message}</p>
                          <div className="mt-2 text-[11px] text-white/45">{formatNotificationRelativeTime(notification.created_at)}</div>
                        </div>

                        {notification.is_read ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                            Lida
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={markingThisOne}
                            onClick={() => markReadMutation.mutate(notification.id)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {markingThisOne ? 'Marcando...' : 'Ler'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
