/**
 * Núcleo compartilhado das Netlify Functions de pagamento (AmploPay).
 *
 * As credenciais são lidas SOMENTE aqui, no servidor (variáveis de ambiente
 * AMPLOPAY_PUBLIC_KEY e AMPLOPAY_SECRET_KEY na Netlify). Nada disso chega ao
 * navegador.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";

const BASE_URL = "https://app.amplopay.com/api/v1/gateway";

export type OrderStatus = "PENDING" | "PAID" | "FAILED";

export const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function credentials() {
  const publicKey = process.env.AMPLOPAY_PUBLIC_KEY;
  const secretKey = process.env.AMPLOPAY_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error("Credenciais da AmploPay não configuradas.");
  }
  return { publicKey, secretKey };
}

/** Assinatura do callbackUrl: só a AmploPay (que recebeu a URL) conhece o valor. */
export function signOrder(orderId: string) {
  return createHmac("sha256", credentials().secretKey).update(orderId).digest("hex");
}

export function verifyOrderSignature(orderId: string, signature: string) {
  const expected = Buffer.from(signOrder(orderId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function amplopay<T>(
  path: "/pix/receive" | "/card/receive",
  body: unknown,
): Promise<T> {
  const { publicKey, secretKey } = credentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-public-key": publicKey,
        "x-secret-key": secretKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const detail = Array.isArray(parsed?.details)
        ? parsed.details
            .map((d: any) => [d?.path, d?.error?.message].filter(Boolean).join(": "))
            .filter(Boolean)
            .join("; ")
        : "";
      console.error("[amplopay] erro", response.status, parsed?.errorCode, parsed?.message, detail);
      const message = typeof parsed?.message === "string" ? parsed.message : null;
      throw new Error(
        message
          ? `${message}${detail ? ` (${detail})` : ""}`
          : `O provedor de pagamento recusou a solicitação (${response.status}). Tente novamente.`,
      );
    }

    return (parsed ?? {}) as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Tempo de resposta esgotado. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const PAID = new Set(["COMPLETED", "PAID", "APPROVED", "CONFIRMED", "TRANSACTION_PAID"]);
const FAILED = new Set([
  "FAILED",
  "REJECTED",
  "CANCELED",
  "CANCELLED",
  "REFUNDED",
  "CHARGED_BACK",
  "CHARGEBACK",
  "EXPIRED",
  "TRANSACTION_CANCELED",
  "TRANSACTION_REFUNDED",
]);

/** Converte os status da AmploPay (resposta ou webhook) no status do pedido. */
export function toOrderStatus(values: unknown[]): OrderStatus {
  const list = values
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => v.toUpperCase());
  if (list.some((v) => PAID.has(v))) return "PAID";
  if (list.some((v) => FAILED.has(v))) return "FAILED";
  return "PENDING";
}

/* ------------------------------------------------------------------ */
/* Safyro — Purchase via servidor (garante a venda mesmo se o cliente  */
/* fechar a aba). eventId = id do pedido, o mesmo usado pelo navegador, */
/* então o Meta deduplica os dois envios.                               */
/* ------------------------------------------------------------------ */
const SAFYRO = {
  AFFILIATE_KEY: "ak_cqvhfjax1pnewgi3",
  PIXEL_IDS: ["4731800873811477"],
  API_URL: "https://pmidkvqstpjvjkmbehvf.supabase.co/functions/v1/tracker-events-send",
};

export async function trackPurchaseOnce(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.status !== "PAID" || order.purchaseTrackedAt) return;

  // Marca antes de enviar para não duplicar em webhooks repetidos
  const updated = await db
    .update(orders)
    .set({ purchaseTrackedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });
  if (!updated.length) return;

  const tracking = (order.tracking ?? {}) as Record<string, unknown>;
  try {
    await fetch(SAFYRO.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tracking,
        affiliateKey: SAFYRO.AFFILIATE_KEY,
        pixelIds: SAFYRO.PIXEL_IDS,
        eventType: "Purchase",
        eventId: order.id,
        value: order.amountCents / 100,
        currency: "BRL",
        email: order.customerEmail,
        phone: order.customerPhone,
        name: order.customerName,
        paymentMethod: order.method,
      }),
    });
  } catch (error) {
    console.error("[safyro] falha ao enviar Purchase", error);
  }
}

export async function setOrderStatus(orderId: string, status: OrderStatus, transactionId?: string) {
  const [current] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!current) return null;
  // Venda aprovada não volta para pendente (webhooks podem chegar fora de ordem)
  if (current.status === "PAID" && status === "PENDING") return current.status;

  await db
    .update(orders)
    .set({ status, updatedAt: new Date(), ...(transactionId ? { transactionId } : {}) })
    .where(eq(orders.id, orderId));

  if (status === "PAID") await trackPurchaseOnce(orderId);
  return status;
}
