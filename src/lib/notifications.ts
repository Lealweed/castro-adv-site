import { getMyOfficeId } from '@/lib/officeContext';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

export type SystemNotification = {
  id: string;
  office_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  recent: () => [...notificationKeys.all, 'recent'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const relativeTimeDivisions = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
] as const satisfies ReadonlyArray<{ amount: number; unit: Intl.RelativeTimeFormatUnit }>;

function capitalize(text: string) {
  if (!text) return 'Info';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildRecipientFilter(userId: string) {
  return `user_id.is.null,user_id.eq.${userId}`;
}

async function getNotificationContext() {
  const sb = requireSupabase();
  const user = await getAuthedUser();
  const officeId = await getMyOfficeId().catch(() => null);
  return { sb, userId: user.id, officeId };
}

export function formatNotificationRelativeTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Agora';

  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of relativeTimeDivisions) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return 'Agora';
}

export function formatNotificationDateTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Data indisponivel';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getNotificationTypeMeta(type: string | null | undefined) {
  const normalized = (type || 'system').trim().toLowerCase();

  switch (normalized) {
    case 'birthday':
      return {
        label: 'Aniversario',
        className: 'border-pink-400/25 bg-pink-500/10 text-pink-200',
      };
    case 'task':
      return {
        label: 'Tarefa',
        className: 'border-red-400/25 bg-red-500/10 text-red-200',
      };
    case 'email':
      return {
        label: 'Email',
        className: 'border-sky-400/25 bg-sky-500/10 text-sky-200',
      };
    case 'portal':
      return {
        label: 'Portal',
        className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
      };
    case 'alert':
    case 'system':
      return {
        label: normalized === 'alert' ? 'Alerta' : 'Sistema',
        className: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
      };
    default:
      return {
        label: capitalize(normalized),
        className: 'border-white/15 bg-white/5 text-white/80',
      };
  }
}

export async function listSystemNotifications(limit = 100): Promise<SystemNotification[]> {
  const { sb, userId, officeId } = await getNotificationContext();
  if (!officeId) return [];

  const { data, error } = await sb
    .from('notifications')
    .select('id,office_id,user_id,title,message,type,is_read,created_at')
    .eq('office_id', officeId)
    .or(buildRecipientFilter(userId))
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as SystemNotification[];
}

export async function countUnreadNotifications(): Promise<number> {
  const { sb, userId, officeId } = await getNotificationContext();
  if (!officeId) return 0;

  const { count, error } = await sb
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('office_id', officeId)
    .or(buildRecipientFilter(userId))
    .eq('is_read', false);

  if (error) throw new Error(error.message);
  return count || 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const { sb, userId, officeId } = await getNotificationContext();
  if (!officeId) return;

  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('office_id', officeId)
    .or(buildRecipientFilter(userId));

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsAsRead() {
  const { sb, userId, officeId } = await getNotificationContext();
  if (!officeId) return;

  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('office_id', officeId)
    .eq('is_read', false)
    .or(buildRecipientFilter(userId));

  if (error) throw new Error(error.message);
}
