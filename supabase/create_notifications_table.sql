-- Central de notificacoes do escritorio
-- Notificacoes podem ser pessoais (user_id preenchido) ou do escritorio inteiro (user_id nulo)

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_office_created_at_idx
  on public.notifications (office_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_for_members on public.notifications;
create policy notifications_select_for_members
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.office_members om
    where om.office_id = notifications.office_id
      and om.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
);

drop policy if exists notifications_update_read_for_members on public.notifications;
create policy notifications_update_read_for_members
on public.notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.office_members om
    where om.office_id = notifications.office_id
      and om.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
)
with check (
  exists (
    select 1
    from public.office_members om
    where om.office_id = notifications.office_id
      and om.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
);
