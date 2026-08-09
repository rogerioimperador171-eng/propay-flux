import { json, propay } from "./_propay";

type RawDeposit = {
  transactionId?: string;
  id?: string;
  copyPaste?: string;
  qrcodeUrl?: string;
  qrCodeUrl?: string;
  status?: string;
  data?: RawDeposit;
};

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100000;
}

function str(v: unknown, min: number, max: number) {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max
    ? v.trim()
    : null;
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

  const amount = isNumber(body?.amount) ? body.amount : null;
  const description = str(body?.description, 1, 200);
  const payerName = str(body?.payerName, 2, 120);
  const payerDocument = str(body?.payerDocument, 11, 18);
  const payerPhone = str(body?.payerPhone, 10, 20);
  const payerEmail = str(body?.payerEmail, 5, 160);

  if (!amount || !description || !payerName || !payerDocument) {
    return json({ error: "Dados de pagamento inválidos." }, 400);
  }

  try {
    const raw = await propay<RawDeposit>("/api/v1/deposit", {
      amount,
      description,
      payerName,
      payerDocument,
      // telefone/e-mail seguem para o provedor: usados na recuperação de venda
      ...(payerPhone ? { payerPhone, phone: payerPhone } : {}),
      ...(payerEmail ? { payerEmail, email: payerEmail } : {}),
    });

    const node = raw.data ?? raw;
    const transactionId = node.transactionId ?? node.id ?? "";
    if (!transactionId) {
      return json({ error: "O provedor PIX não retornou a transação. Tente novamente." }, 502);
    }

    return json({
      transactionId,
      copyPaste: node.copyPaste ?? "",
      qrcodeUrl: node.qrcodeUrl ?? node.qrCodeUrl ?? "",
      status: node.status ?? "PENDENTE",
    });
  } catch (error: any) {
    return json({ error: error?.message || "Não conseguimos gerar o Pix agora." }, 502);
  }
};

// Sem `config.path`: a Function responde apenas na URL nativa
// (/.netlify/functions/<nome>), que o Netlify jamais encaminha para o
// handler de SSR. O rewrite de /api/public/pix/create continua declarado no
// netlify.toml como conveniência.
