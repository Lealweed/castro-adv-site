import { apiFetch } from '@/lib/apiClient';

export type AsaasStatus = {
  configured: boolean;
  connected: boolean;
  environment: 'production' | 'sandbox';
  apiUrl: string;
  maskedKey: string | null;
  accountName: string | null;
  walletBalance: number | null;
  message: string;
};

export type AsaasSyncResult = {
  ok: boolean;
  syncedAt: string;
  customersProcessed: number;
  clientsCreated: number;
  clientsMatched: number;
  paymentsProcessed: number;
  paymentsCreated: number;
  paymentsUpdated: number;
  statementImported?: number;
};

export type AsaasHistory = {
  account: {
    name: string | null;
    cpfCnpj: string | null;
    email: string | null;
    status: string | null;
    city: string | null;
    state: string | null;
    walletBalance: number | null;
  };
  payments: Array<{
    id: string;
    dateCreated: string;
    customer: string;
    customerName?: string;
    value: number;
    netValue: number;
    billingType: string;
    status: string;
    dueDate: string;
    paymentDate: string | null;
    description: string | null;
    invoiceUrl: string | null;
    bankSlipUrl: string | null;
  }>;
  financialTransactions: Array<{
    id: string;
    value: number;
    balance: number;
    type: string;
    date: string;
    description: string;
  }>;
  transfers: Array<{
    id: string;
    dateCreated: string;
    value: number;
    status: string;
    type: string;
    description: string | null;
  }>;
};

export async function getAsaasStatus(): Promise<AsaasStatus> {
  const res = await apiFetch('/asaas/status');
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Não foi possível verificar o status do Asaas no servidor.');
  }
  return (await res.json()) as AsaasStatus;
}

export async function saveAsaasConfig(
  apiKey: string,
  environment: 'production' | 'sandbox' = 'production',
): Promise<AsaasStatus> {
  const res = await apiFetch('/asaas/config', {
    method: 'POST',
    body: JSON.stringify({ apiKey, environment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Falha ao salvar a chave do Asaas no servidor.');
  }
  return (await res.json()) as AsaasStatus;
}

export async function syncAsaasToCrm(): Promise<AsaasSyncResult> {
  const res = await apiFetch('/asaas/sync', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.message || 'Falha ao sincronizar dados com o Asaas. Verifique se ASAAS_API_KEY está configurada no .env do backend.',
    );
  }
  return (await res.json()) as AsaasSyncResult;
}

export async function getAsaasHistory(): Promise<AsaasHistory> {
  const res = await apiFetch('/asaas/history');
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Falha ao carregar o histórico financeiro do Asaas.');
  }
  return (await res.json()) as AsaasHistory;
}

export type CreateAsaasChargePayload = {
  clientId?: string | null;
  customerName?: string;
  customerCpfCnpj?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  description: string;
  amountCents: number;
  dueDate: string;
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
};

export type CreatedAsaasCharge = {
  ok: boolean;
  asaasPaymentId: string;
  asaasCustomerId: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixCopiaECola: string | null;
  pixEncodedImage: string | null;
  notesTag: string;
};

export async function createAsaasCharge(payload: CreateAsaasChargePayload): Promise<CreatedAsaasCharge> {
  const res = await apiFetch('/asaas/charges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Falha ao emitir cobrança no Asaas.');
  }
  return (await res.json()) as CreatedAsaasCharge;
}

export function extractAsaasInfo(notes: string | null | undefined): {
  isAsaas: boolean;
  asaasId: string | null;
  asaasStatus: string | null;
  invoiceUrl: string | null;
  boletoUrl: string | null;
} {
  if (!notes) {
    return { isAsaas: false, asaasId: null, asaasStatus: null, invoiceUrl: null, boletoUrl: null };
  }

  const idMatch = notes.match(/\[asaas_id:([^\]]+)\]/i);
  const statusMatch = notes.match(/\[asaas_status:([^\]]+)\]/i);
  const invoiceMatch = notes.match(/Fatura:\s*(https?:\/\/[^\s|]+)/i);
  const boletoMatch = notes.match(/Boleto:\s*(https?:\/\/[^\s|]+)/i);

  return {
    isAsaas: Boolean(idMatch),
    asaasId: idMatch?.[1] || null,
    asaasStatus: statusMatch?.[1] || null,
    invoiceUrl: invoiceMatch?.[1] || null,
    boletoUrl: boletoMatch?.[1] || null,
  };
}
