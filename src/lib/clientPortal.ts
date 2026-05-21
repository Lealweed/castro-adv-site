import type { DocumentRow } from '@/lib/documents';
import type { FinanceTx } from '@/lib/finance';
import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

export type PortalClient = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  avatar_path?: string | null;
  notes?: string | null;
};

export type PortalMeeting = {
  id: string;
  title: string;
  starts_at: string;
};

export type PortalMessage = {
  id: string;
  sender: string;
  content: string;
  created_at: string;
};

export type PortalSession = {
  sessionToken: string;
  client: PortalClient;
};

export type PortalContext = {
  client: PortalClient;
  nextMeeting: PortalMeeting | null;
};

export type PortalCase = {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  process_number?: string | null;
  area?: string | null;
  created_at: string;
};

export type PortalChecklistItem = {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'under_analysis' | 'approved' | 'rejected' | string;
  rejection_reason: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  document_id: string | null;
  document_title: string | null;
  document_file_path: string | null;
  document_status: string | null;
};

type PortalLoginRpcResponse = {
  session_token: string;
  client: PortalClient;
};

type PortalContextRpcResponse = {
  client: PortalClient;
  next_meeting: PortalMeeting | null;
};

function requirePortalSupabase() {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error('Portal indisponivel no momento.');
  }
  return supabase;
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export async function loginClientPortal(cpf: string, pin: string): Promise<PortalSession> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_login_client', {
    p_cpf: cpf,
    p_pin: pin,
  });

  if (error) throw new Error(error.message);

  const payload = data as PortalLoginRpcResponse | null;
  if (!payload?.session_token || !payload.client?.id) {
    throw new Error('Falha ao autenticar no portal.');
  }

  return {
    sessionToken: payload.session_token,
    client: payload.client,
  };
}

export async function getPortalClientContext(sessionToken: string): Promise<PortalContext> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_get_client_context', {
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);

  const payload = data as PortalContextRpcResponse | null;
  if (!payload?.client?.id) {
    throw new Error('Falha ao carregar os dados do portal.');
  }

  return {
    client: payload.client,
    nextMeeting: payload.next_meeting,
  };
}

export async function listPortalClientMessages(sessionToken: string): Promise<PortalMessage[]> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_list_client_messages', {
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);
  return (data || []) as PortalMessage[];
}

export async function sendPortalClientMessage(sessionToken: string, content: string): Promise<PortalMessage> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_send_client_message', {
    p_session_token: sessionToken,
    p_content: content,
  });

  if (error) throw new Error(error.message);
  const rows = (data || []) as PortalMessage[];
  if (!rows[0]) throw new Error('Falha ao enviar mensagem.');
  return rows[0];
}

export async function listPortalClientDocuments(sessionToken: string): Promise<DocumentRow[]> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_list_client_documents', {
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);
  return (data || []) as DocumentRow[];
}

export async function listPortalClientTransactions(sessionToken: string): Promise<FinanceTx[]> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_list_client_transactions', {
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);
  return (data || []) as FinanceTx[];
}

export async function listPortalClientCases(sessionToken: string): Promise<PortalCase[]> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_list_client_cases', {
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);
  return (data || []) as PortalCase[];
}

export async function listPortalCaseChecklists(sessionToken: string, caseId: string): Promise<PortalChecklistItem[]> {
  const sb = requirePortalSupabase();
  const { data, error } = await sb.rpc('portal_list_case_checklists', {
    p_session_token: sessionToken,
    p_case_id: caseId,
  });

  if (error) throw new Error(error.message);
  return (data || []) as PortalChecklistItem[];
}

export async function portalUploadChecklistDocument(args: {
  sessionToken: string;
  clientId: string;
  caseId: string;
  checklistItemId: string;
  title: string;
  file: File | Blob;
  fileName?: string;
}) {
  const sb = requirePortalSupabase();

  const docId = crypto.randomUUID();
  const originalName = args.fileName || (args.file instanceof File ? args.file.name : 'documento.pdf');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const path = `clients/${args.clientId}/cases/${args.caseId}/${docId}_${safeName}`;

  // 1) Upload the file to storage
  const { error: upErr } = await sb.storage.from('documents').upload(path, args.file, {
    upsert: false,
    contentType: args.file.type || undefined,
  });
  if (upErr) throw new Error(upErr.message);

  // 2) Link via database function
  const { data: docUuid, error: linkErr } = await sb.rpc('portal_link_uploaded_document', {
    p_session_token: args.sessionToken,
    p_case_id: args.caseId,
    p_checklist_item_id: args.checklistItemId,
    p_title: args.title.trim() || originalName,
    p_file_path: path,
    p_mime_type: args.file.type || null,
    p_size_bytes: args.file.size || null,
  });

  if (linkErr) {
    // clean up
    await sb.storage.from('documents').remove([path]).catch(() => null);
    throw new Error(linkErr.message);
  }

  return { id: docUuid, file_path: path };
}

export function getPortalRpcError(error: unknown, fallback: string) {
  return extractErrorMessage(error, fallback);
}
