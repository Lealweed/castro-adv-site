import { useEffect, useMemo, useState } from 'react';

import type { DocumentRow } from '@/lib/documents';
import { deleteDocument, getDocumentDownloadUrl, listClientDocuments, uploadClientDocument } from '@/lib/documents';

export function DocumentsSection({ clientId, caseId }: { clientId: string; caseId?: string | null }) {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<'all' | 'personal' | 'case' | 'task'>(caseId ? 'case' : 'all');
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'pdf' | 'image' | 'doc' | 'other'>('all');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        if (tab === 'personal') return r.kind === 'personal';
        if (tab === 'case') {
          if (caseId) return r.kind === 'case' && r.case_id === caseId;
          return r.kind === 'case';
        }
        if (tab === 'task') return r.kind === 'task';
        return true;
      })
      .filter((r) => {
        const mt = String(r.mime_type || '').toLowerCase();
        if (type === 'all') return true;
        if (type === 'pdf') return mt.includes('pdf') || r.file_path.toLowerCase().endsWith('.pdf');
        if (type === 'image') return mt.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(r.file_path);
        if (type === 'doc') return /\.(doc|docx)$/i.test(r.file_path) || mt.includes('msword');
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        const hay = [r.title, r.mime_type || '', r.file_path].join(' ').toLowerCase();
        return hay.includes(term);
      });
  }, [rows, tab, caseId, q, type]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listClientDocuments(clientId);
      setRows(data);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar documentos.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function onUpload() {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const kind = tab === 'case' ? 'case' : 'personal';
      await uploadClientDocument({
        clientId,
        kind,
        title: title.trim() || file.name,
        file,
        caseId: kind === 'case' ? caseId || null : null,
      });
      setUploadOpen(false);
      setTitle('');
      setFile(null);
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar documento.');
      setSaving(false);
    }
  }

  async function onDownload(doc: DocumentRow) {
    try {
      const url = await getDocumentDownloadUrl(doc.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar link de download.');
    }
  }

  async function onDelete(doc: DocumentRow) {
    if (!confirm('Excluir este documento?')) return;
    try {
      await deleteDocument({ id: doc.id, file_path: doc.file_path });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir documento.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Documentos</div>
          <div className="text-xs text-white/60">Pasta do cliente (interno).</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'personal', label: 'Pessoais' },
                { id: 'case', label: 'Processos' },
                { id: 'task', label: 'Tarefas' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ' +
                  (tab === t.id ? 'bg-white text-neutral-950' : 'text-white/70 hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              // Upload supports only personal/case.
              if (tab === 'task' || tab === 'all') {
                setTab(caseId ? 'case' : 'personal');
              }
              setUploadOpen(true);
            }}
            className="btn-primary"
          >
            Enviar arquivo
          </button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            className="input w-72 max-w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título/tipo…"
          />
          <select className="input w-44" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="all">Todos os tipos</option>
            <option value="pdf">PDF</option>
            <option value="image">Imagens</option>
            <option value="doc">Word</option>
          </select>
        </div>

        <div className="text-xs text-white/60">{filtered.length} arquivos</div>
      </div>

      {uploadOpen ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Título
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Procuração" />
            </label>
            <label className="text-sm text-white/80">
              Arquivo
              <input
                className="input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="application/pdf,image/*,.doc,.docx"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={saving || !file} onClick={() => void onUpload()} className="btn-primary">
              {saving ? 'Enviando…' : 'Enviar'}
            </button>
            <button disabled={saving} onClick={() => setUploadOpen(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5">
        {loading ? <div className="p-4 text-sm text-white/70">Carregando…</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="p-4 text-sm text-white/60">Nenhum documento neste filtro.</div>
        ) : null}

        {!loading && filtered.length ? (
          <div className="divide-y divide-white/10">
            {filtered.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-semibold text-white">{d.title}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {new Date(d.created_at).toLocaleString()} {d.mime_type ? `· ${d.mime_type}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => void onDownload(d)} className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs">
                    Baixar
                  </button>
                  <button onClick={() => void onDelete(d)} className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs">
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
