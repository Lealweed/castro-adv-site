import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { getMyOfficeRole } from '@/lib/roles';

export type DocumentRow = {
  id: string;
  user_id: string | null;
  client_id: string;
  case_id: string | null;
  task_id: string | null;
  kind: 'personal' | 'case' | 'template' | string;
  title: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  is_public?: boolean;
  
  // Extended fields
  category?: string | null;
  status?: 'received' | 'under_analysis' | 'approved' | 'rejected' | string | null;
  rejection_reason?: string | null;
  internal_comments?: string | null;
  parent_id?: string | null;
  root_id?: string | null;
  version_number?: number;
  replacement_reason?: string | null;
  is_active?: boolean;
  checklist_item_id?: string | null;
  uploader_name?: string | null;
};

export async function listClientDocuments(clientId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { data, error } = await sb
    .from('documents')
    .select('id,user_id,client_id,case_id,task_id,kind,title,file_path,mime_type,size_bytes,created_at,is_public,category,status,rejection_reason,internal_comments,parent_id,root_id,version_number,replacement_reason,is_active,checklist_item_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as DocumentRow[];
}

export async function listDocumentVersions(parentId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { data, error } = await sb
    .from('documents')
    .select('id,user_id,client_id,case_id,task_id,kind,title,file_path,mime_type,size_bytes,created_at,is_public,category,status,rejection_reason,internal_comments,parent_id,root_id,version_number,replacement_reason,is_active,checklist_item_id')
    .or(`parent_id.eq.${parentId},id.eq.${parentId},root_id.eq.${parentId}`)
    .order('version_number', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as DocumentRow[];
}

export async function uploadClientDocument(args: {
  clientId: string;
  kind: 'personal' | 'case' | 'template';
  title: string;
  file: File | Blob;
  fileName?: string;
  caseId?: string | null;
  isPublic?: boolean;
  category?: string | null;
  status?: string | null;
  checklistItemId?: string | null;
  parentId?: string | null;
  rootId?: string | null;
  versionNumber?: number;
  replacementReason?: string | null;
}) {
  const sb = requireSupabase();
  const user = await getAuthedUser();

  const docId = crypto.randomUUID();
  const originalName = args.fileName || (args.file instanceof File ? args.file.name : 'documento.docx');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = args.kind === 'case' ? 'cases' : args.kind === 'template' ? 'templates' : 'personal';
  const casePart = args.kind === 'case' && args.caseId ? `/${args.caseId}` : '';

  const path = `clients/${args.clientId}/${prefix}${casePart}/${docId}_${safeName}`;

  const { error: upErr } = await sb.storage.from('documents').upload(path, args.file, {
    upsert: false,
    contentType: args.file.type || undefined,
  });
  if (upErr) throw new Error(upErr.message);

  let finalVersionNumber = args.versionNumber || 1;
  let finalRootId = args.rootId || null;

  if (args.parentId) {
    const targetRoot = finalRootId || args.parentId;
    const { data: nextVer, error: rpcErr } = await sb.rpc('prepare_new_document_version', {
      p_root_id: targetRoot
    });
    if (rpcErr) throw new Error(rpcErr.message);
    finalVersionNumber = nextVer || 2;
    if (!finalRootId) {
      finalRootId = args.parentId;
    }
  }

  // Lawyers default uploads to 'approved'. Client portal uploads default to 'under_analysis'
  const finalStatus = args.status || (args.kind === 'personal' && !args.checklistItemId ? 'received' : 'approved');

  const { error: insErr } = await sb.from('documents').insert({
    id: docId,
    user_id: user.id,
    client_id: args.clientId,
    case_id: args.kind === 'case' ? args.caseId || null : null,
    kind: args.kind,
    title: args.title.trim() || originalName,
    file_path: path,
    mime_type: args.file.type || null,
    size_bytes: args.file.size || null,
    is_public: args.isPublic || false,
    category: args.category || null,
    status: finalStatus,
    checklist_item_id: args.checklistItemId || null,
    parent_id: args.parentId || null,
    root_id: finalRootId,
    version_number: finalVersionNumber,
    replacement_reason: args.replacementReason || null,
    is_active: true,
  } as any);

  if (insErr) {
    // best-effort cleanup
    await sb.storage.from('documents').remove([path]).catch(() => null);
    throw new Error(insErr.message);
  }

  return { id: docId, file_path: path };
}

export async function updateDocumentStatus(
  docId: string,
  status: string,
  rejectionReason: string | null = null,
  internalComments: string | null = null
) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { error } = await sb
    .from('documents')
    .update({
      status,
      rejection_reason: rejectionReason,
      internal_comments: internalComments,
    } as any)
    .eq('id', docId);

  if (error) throw new Error(error.message);
}

export async function toggleDocumentVisibility(docId: string, isPublic: boolean) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { error } = await sb
    .from('documents')
    .update({ is_public: isPublic } as any)
    .eq('id', docId);

  if (error) throw new Error(error.message);
}

export async function getDocumentDownloadUrl(filePath: string, documentId?: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  if (documentId) {
    // Audit download in security logs (non-blocking, best-effort)
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      await sb.rpc('log_document_download', { p_document_id: documentId, p_user_agent: userAgent });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to audit document download:', err);
    }
  }

  const { data, error } = await sb.storage.from('documents').createSignedUrl(filePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function listTaskDocuments(taskId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  const { data, error } = await sb
    .from('documents')
    .select('id,user_id,client_id,case_id,task_id,kind,title,file_path,mime_type,size_bytes,created_at,category,status,rejection_reason,parent_id,version_number,is_active')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as DocumentRow[];
}

export async function uploadTaskDocument(args: {
  taskId: string;
  clientId: string;
  caseId?: string | null;
  title: string;
  file: File;
}) {
  const sb = requireSupabase();
  const user = await getAuthedUser();

  const docId = crypto.randomUUID();
  const safeName = (args.file.name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_');
  const casePart = args.caseId ? `/${args.caseId}` : '';

  const path = `clients/${args.clientId}/tasks/${args.taskId}${casePart}/${docId}_${safeName}`;

  const { error: upErr } = await sb.storage.from('documents').upload(path, args.file, {
    upsert: false,
    contentType: args.file.type || undefined,
  });
  if (upErr) throw new Error(upErr.message);

  const { error: insErr } = await sb.from('documents').insert({
    id: docId,
    user_id: user.id,
    client_id: args.clientId,
    case_id: args.caseId || null,
    task_id: args.taskId,
    kind: 'task',
    title: args.title.trim() || args.file.name,
    file_path: path,
    mime_type: args.file.type || null,
    size_bytes: args.file.size || null,
    status: 'approved',
    is_active: true,
  } as any);

  if (insErr) {
    await sb.storage.from('documents').remove([path]).catch(() => null);
    throw new Error(insErr.message);
  }

  return { id: docId, file_path: path };
}

export async function deleteDocument(doc: { id: string; file_path: string }) {
  const sb = requireSupabase();
  await getAuthedUser();

  const role = await getMyOfficeRole();
  if (role !== 'admin') {
    throw new Error('Apenas administradores podem excluir documentos.');
  }

  const { error: delDbErr } = await sb.from('documents').delete().eq('id', doc.id);
  if (delDbErr) throw new Error(delDbErr.message);

  const { error: delFileErr } = await sb.storage.from('documents').remove([doc.file_path]);
  if (delFileErr) {
    // Not fatal; file might already be gone.
    // eslint-disable-next-line no-console
    console.warn('Failed to delete file from storage:', delFileErr.message);
  }
}

export async function restoreDocumentVersion(versionId: string, rootId: string) {
  const sb = requireSupabase();
  await getAuthedUser();

  // 1. Deactivate all versions under this root (both root doc and version docs)
  const { error: deactErr } = await sb
    .from('documents')
    .update({ is_active: false } as any)
    .or(`root_id.eq.${rootId},id.eq.${rootId}`);
  if (deactErr) throw new Error(deactErr.message);

  // 2. Activate the selected version
  const { error: actErr } = await sb
    .from('documents')
    .update({ is_active: true } as any)
    .eq('id', versionId);
  if (actErr) throw new Error(actErr.message);
}
