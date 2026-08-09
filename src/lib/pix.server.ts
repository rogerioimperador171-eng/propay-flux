const BASE_URL = "https://api.propixbr.com";

function credentials() {
  const clientId = process.env["PROPAY_CLIENT_ID"];
  const clientSecret = process.env["PROPAY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do provedor PIX não configuradas.");
  }
  return { clientId, clientSecret };
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const { clientId, clientSecret } = credentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message =
        (parsed as { message?: string; error?: string } | null)?.message ??
        (parsed as { error?: string } | null)?.error ??
        `Falha na comunicação com o provedor PIX (${response.status}).`;
      throw new Error(message);
    }

    return (parsed ?? {}) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tempo de resposta esgotado. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type RawDeposit = {
  transactionId?: string;
  id?: string;
  copyPaste?: string;
  qrcodeUrl?: string;
  qrCodeUrl?: string;
  status?: string;
  data?: RawDeposit;
};

export type PixDeposit = {
  transactionId: string;
  copyPaste: string;
  qrcodeUrl: string;
  status: string;
};

export type CreateDepositInput = {
  amount: number;
  description: string;
  payerName: string;
  payerDocument: string;
  /** Telefone do comprador — enviado ao provedor para recuperação de venda. */
  payerPhone?: string | undefined;
  payerEmail?: string | undefined;
};

export async function createDeposit(input: CreateDepositInput): Promise<PixDeposit> {
  const raw = await request<RawDeposit>("/api/v1/deposit", {
    amount: input.amount,
    description: input.description,
    payerName: input.payerName,
    payerDocument: input.payerDocument,
    ...(input.payerPhone ? { payerPhone: input.payerPhone, phone: input.payerPhone } : {}),
    ...(input.payerEmail ? { payerEmail: input.payerEmail, email: input.payerEmail } : {}),
  });
  const node = raw.data ?? raw;
  const transactionId = node.transactionId ?? node.id ?? "";
  if (!transactionId) {
    throw new Error("O provedor PIX não retornou a transação. Tente novamente.");
  }
  return {
    transactionId,
    copyPaste: node.copyPaste ?? "",
    qrcodeUrl: node.qrcodeUrl ?? node.qrCodeUrl ?? "",
    status: node.status ?? "PENDENTE",
  };
}

type RawCheck = {
  transactionState?: string;
  status?: string;
  data?: RawCheck;
};

export async function checkDeposit(transactionId: string): Promise<{ transactionState: string }> {
  const raw = await request<RawCheck>("/api/v1/check", { transactionId });
  const node = raw.data ?? raw;
  return { transactionState: (node.transactionState ?? node.status ?? "PENDENTE").toUpperCase() };
}
