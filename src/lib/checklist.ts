import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { CHECKLIST_TEMPLATES } from './checklistTemplates';

export type ChecklistItemRow = {
  id: string;
  office_id: string | null;
  case_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'under_analysis' | 'approved' | 'rejected' | string;
  rejection_reason: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCaseChecklistItems(caseId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { data, error } = await sb
    .from('checklist_items')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ChecklistItemRow[];
}

export async function createChecklistItem(args: {
  caseId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { data, error } = await sb
    .from('checklist_items')
    .insert({
      case_id: args.caseId,
      title: args.title.trim(),
      description: args.description || null,
      due_date: args.dueDate || null,
      status: 'pending',
    } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChecklistItemRow;
}

export async function applyChecklistTemplate(caseId: string, templateKey: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const template = CHECKLIST_TEMPLATES[templateKey];
  if (!template) throw new Error('Modelo de checklist não encontrado.');

  const itemsToInsert = template.items.map((item) => ({
    case_id: caseId,
    title: item.title,
    description: item.description,
    status: 'pending',
  }));

  const { error } = await sb.from('checklist_items').insert(itemsToInsert as any);
  if (error) throw new Error(error.message);
}

export async function updateChecklistItem(
  itemId: string,
  args: Partial<Pick<ChecklistItemRow, 'title' | 'description' | 'due_date' | 'status'>>
) {
  const sb = requireSupabase();
  await getAuthedUser();

  const payload: any = {};
  if (args.title !== undefined) payload.title = args.title.trim();
  if (args.description !== undefined) payload.description = args.description;
  if (args.due_date !== undefined) payload.due_date = args.due_date;
  if (args.status !== undefined) payload.status = args.status;

  const { error } = await sb.from('checklist_items').update(payload).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function deleteChecklistItem(itemId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { error } = await sb.from('checklist_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function reviewChecklistItem(
  itemId: string,
  status: 'approved' | 'rejected',
  comment?: string | null,
  internalComments?: string | null
) {
  const sb = requireSupabase();
  await getAuthedUser();

  // 1) Update checklist item status
  const { error: itemErr } = await sb
    .from('checklist_items')
    .update({
      status,
      rejection_reason: status === 'rejected' ? comment || null : null,
    } as any)
    .eq('id', itemId);

  if (itemErr) throw new Error(itemErr.message);

  // 2) Find the active document linked to this checklist item
  const { data: doc, error: docSearchErr } = await sb
    .from('documents')
    .select('id')
    .eq('checklist_item_id', itemId)
    .eq('is_active', true)
    .maybeSingle();

  if (docSearchErr) throw new Error(docSearchErr.message);

  // 3) Update the document status to match
  if (doc?.id) {
    const { error: docErr } = await sb
      .from('documents')
      .update({
        status: status === 'approved' ? 'approved' : 'rejected',
        rejection_reason: status === 'rejected' ? comment || null : null,
        internal_comments: internalComments || null,
      } as any)
      .eq('id', doc.id);

    if (docErr) throw new Error(docErr.message);
  }
}
