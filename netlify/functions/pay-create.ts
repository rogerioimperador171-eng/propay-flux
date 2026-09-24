import { randomUUID } from "node:crypto";

import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import {
  BASE_PRICE,
  BUMP_NAMES,
  BUMP_PRICES,
  PRODUCT_NAME,
  totalFor,
} from "../../src/lib/pricing.js";
import { amplopay, json, setOrderStatus, signOrder, toOrderStatus } from "./_amplopay";

type AmploResponse = {
  transactionId?: string;
  status?: string;
  transactionStatus?: string;
  details?: string;
  errorDescription?: string;
  pix?: { code?: string; image?: string; expiresAt?: string };
};

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");

function str(v: unknown, min: number, max: number) {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max
    ? v.trim()
    : null;
}

function generateCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calc = (d: number[]) => {
    let sum = 0;
    for (let i = 0; i < d.length; i += 1) sum += (d[i] ?? 0) * (d.length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(base);
  return [...base, d1, calc([...base, d1])].join("");
}

function clientIp(request: Request) {
  const candidates = [
    request.headers.get("x-nf-client-connection-ip"),
    ...(request.headers.get("x-forwarded-for") ?? "").split(","),
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return (
    candidates.find((ip) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) ?? candidates[0] ?? "127.0.0.1"
  );
}

/** Contexto do Safyro enviado pelo navegador — só campos conhecidos e curtos. */
function sanitizeTracking(raw: unknown) {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  const keys = [
    "userId",
    "url",
    "page",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "src",
    "fbc",
    "fbp",
  ];
  for (const key of keys) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length <= 1000) out[key] = value;
  }
  return out;
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const method = body?.method === "card" ? "card" : body?.method === "pix" ? "pix" : null;
  const name = str(body?.name, 3, 120);
  const email = str(body?.email, 5, 160);
  const phone = digits(body?.phone);
  if (!method || !name || !email || phone.length < 10 || phone.length > 11) {
    return json({ error: "Dados do comprador inválidos." }, 400);
  }

  const bumpIds: string[] = Array.isArray(body?.bumps)
    ? [
        ...new Set<string>(
          body.bumps.filter((id: unknown) => typeof id === "string" && id in BUMP_PRICES),
        ),
      ]
    : [];
  const amount = totalFor(bumpIds);
  const products = [
    { id: "licenca", name: PRODUCT_NAME, quantity: 1, price: BASE_PRICE },
    ...bumpIds.map((id) => ({
      id,
      name: BUMP_NAMES[id] ?? id,
      quantity: 1,
      price: BUMP_PRICES[id]!,
    })),
  ];

  const orderId = `sz_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/.netlify/functions/amplopay-webhook?order=${orderId}&sig=${signOrder(orderId)}`;
  const formattedPhone = `(${phone.slice(0, 2)}) ${phone.slice(2, -4)}-${phone.slice(-4)}`;

  const tracking = {
    ...sanitizeTracking(body?.tracking),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  const common = {
    identifier: orderId,
    amount,
    products,
    metadata: { provider: "SpyZap Checkout", orderId },
    callbackUrl,
  };

  let payload: Record<string, unknown>;

  if (method === "pix") {
    payload = {
      ...common,
      client: { name, email, phone: formattedPhone, document: generateCpf() },
    };
  } else {
    const card = body?.card ?? {};
    const address = body?.address ?? {};
    const cardNumber = digits(card.number);
    const owner = str(card.owner, 3, 120);
    const expMonth = digits(card.expMonth);
    const expYear = digits(card.expYear);
    const cvv = digits(card.cvv);
    const document = digits(body?.document);
    const zipCode = digits(address.zipCode);
    const street = str(address.street, 2, 160);
    const number = str(address.number, 1, 20);
    const neighborhood = str(address.neighborhood, 2, 120);
    const city = str(address.city, 2, 120);
    const state = typeof address.state === "string" ? address.state.trim().toUpperCase() : "";

    if (
      cardNumber.length < 13 ||
      cardNumber.length > 19 ||
      !owner ||
      cvv.length < 3 ||
      cvv.length > 4
    ) {
      return json({ error: "Dados do cartão inválidos." }, 400);
    }
    const month = Number(expMonth);
    if (expMonth.length !== 2 || month < 1 || month > 12 || expYear.length !== 2) {
      return json({ error: "Validade do cartão inválida." }, 400);
    }
    if (document.length !== 11 && document.length !== 14) {
      return json({ error: "Informe um CPF válido." }, 400);
    }
    if (
      zipCode.length !== 8 ||
      !street ||
      !number ||
      !neighborhood ||
      !city ||
      !/^[A-Z]{2}$/.test(state)
    ) {
      return json({ error: "Endereço de cobrança incompleto." }, 400);
    }

    const installments = Math.min(Math.max(Number(body?.installments) || 1, 1), 12);

    payload = {
      ...common,
      client: {
        name,
        email,
        phone: formattedPhone,
        document,
        address: {
          country: "BR",
          zipCode: `${zipCode.slice(0, 5)}-${zipCode.slice(5)}`,
          state,
          city,
          street,
          neighborhood,
          number,
          ...(str(address.complement, 1, 120)
            ? { complement: str(address.complement, 1, 120) }
            : {}),
        },
      },
      clientIp: tracking.ip,
      card: {
        number: cardNumber,
        owner,
        expiresAt: `20${expYear}-${expMonth}`,
        cvv,
      },
      installments,
    };
  }

  try {
    await db.insert(orders).values({
      id: orderId,
      method,
      status: "PENDING",
      amountCents: Math.round(amount * 100),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      items: products,
      tracking,
    });
  } catch (error) {
    console.error("[pay-create] falha ao salvar pedido", error);
    return json({ error: "Não conseguimos registrar o pedido. Tente novamente." }, 502);
  }

  try {
    const result = await amplopay<AmploResponse>(
      method === "pix" ? "/pix/receive" : "/card/receive",
      payload,
    );

    const transactionId = result.transactionId ?? "";
    let status = toOrderStatus([result.transactionStatus]);
    // Cartão aprovado na hora: status OK sem transactionStatus explícito
    if (
      method === "card" &&
      result.status === "OK" &&
      !result.transactionStatus &&
      !result.details
    ) {
      status = "PAID";
    }
    // Cartão barrado no antifraude/adquirente volta como PENDING + details
    if (method === "card" && status === "PENDING" && (result.details || result.errorDescription)) {
      status = "FAILED";
    }
    if (["FAILED", "REJECTED", "CANCELED"].includes((result.status ?? "").toUpperCase())) {
      status = "FAILED";
    }

    await setOrderStatus(orderId, status, transactionId || undefined);

    if (method === "pix") {
      if (!result.pix?.code) {
        return json({ error: "O provedor não retornou o código Pix. Tente novamente." }, 502);
      }
      return json({
        orderId,
        status,
        amount,
        pix: {
          code: result.pix.code,
          image: result.pix.image ?? "",
          expiresAt: result.pix.expiresAt ?? "",
        },
      });
    }

    if (status === "FAILED") {
      return json({
        orderId,
        status,
        amount,
        error: "Pagamento recusado pela operadora do cartão. Verifique os dados ou pague com Pix.",
      });
    }
    return json({ orderId, status, amount });
  } catch (error: any) {
    await setOrderStatus(orderId, "FAILED").catch(() => null);
    return json({ error: error?.message || "Não conseguimos processar o pagamento agora." }, 502);
  }
};
