import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

export type AuditLogRow = {
  id: string;
  office_id: string | null;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  before_data: any | null;
  after_data: any | null;
};

export async function listAuditLogs(args?: { limit?: number; tableName?: string; recordId?: string }) {
  const sb = requireSupabase();
  await getAuthedUser();

  let q = sb
    .from('audit_logs')
    .select('id,office_id,user_id,action,table_name,record_id,created_at,before_data,after_data')
    .order('created_at', { ascending: false })
    .limit(args?.limit ?? 30);

  if (args?.tableName) q = q.eq('table_name', args.tableName);
  if (args?.recordId) q = q.eq('record_id', args.recordId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as AuditLogRow[];
}
