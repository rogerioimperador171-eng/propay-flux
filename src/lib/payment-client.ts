/**
 * Cliente HTTP do pagamento (navegador) — fala com as Netlify Functions que
 * integram a AmploPay. As chaves da AmploPay ficam só no servidor.
 */

export type OrderStatus = "PENDING" | "PAID" | "FAILED";

export type PaymentResult = {
  orderId: string;
  status: OrderStatus;
  amount: number;
  error?: string;
  pix?: { code: string; image: string; expiresAt: string };
};

export type PaymentInput = {
  method: "pix" | "card";
  name: string;
  email: string;
  phone: string;
  bumps: string[];
  document?: string;
  installments?: number;
  card?: { number: string; owner: string; expMonth: string; expYear: string; cvv: string };
  address?: {
    zipCode: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
};

type SafyroWindow = Window & {
  safyroTrack?: (event: string, data?: Record<string, unknown>) => void;
  safyroContext?: () => Record<string, unknown>;
};

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: (T & { error?: string }) | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed) {
    throw new Error(
      parsed?.error ||
        (response.status === 0
          ? "Sem conexão com o servidor de pagamento. Verifique sua internet."
          : "Não conseguimos processar o pagamento agora. Tente novamente."),
    );
  }
  return parsed as T;
}

export async function createPayment(input: PaymentInput): Promise<PaymentResult> {
  const w = window as SafyroWindow;
  const tracking = typeof w.safyroContext === "function" ? w.safyroContext() : {};
  const response = await fetch("/.netlify/functions/pay-create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...input, tracking }),
  });
  return parse<PaymentResult>(response);
}

export async function checkPayment(orderId: string): Promise<{ status: OrderStatus }> {
  const response = await fetch(`/.netlify/functions/pay-status?id=${encodeURIComponent(orderId)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parse<{ status: OrderStatus }>(response);
}

/** Purchase no Pixel/CAPI (Safyro). eventId = pedido, deduplicado com o envio do servidor. */
export function trackPurchase(orderId: string, value: number) {
  try {
    const key = `safyro:purchase:${orderId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    (window as SafyroWindow).safyroTrack?.("Purchase", {
      eventId: orderId,
      value: Number(value.toFixed(2)),
      currency: "BRL",
    });
  } catch {
    // rastreamento nunca pode quebrar o checkout
  }
}
