import { json, propay } from "./_propay";

type RawCheck = {
  transactionState?: string;
  status?: string;
  data?: RawCheck;
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const transactionId =
    typeof body?.transactionId === "string" && body.transactionId.trim().length > 0
      ? body.transactionId.trim().slice(0, 120)
      : null;

  if (!transactionId) return json({ error: "Transação inválida." }, 400);

  try {
    const raw = await propay<RawCheck>("/api/v1/check", { transactionId });
    const node = raw.data ?? raw;
    return json({
      transactionState: (node.transactionState ?? node.status ?? "PENDENTE").toUpperCase(),
    });
  } catch (error: any) {
    return json({ error: error?.message || "Não conseguimos consultar o pagamento agora." }, 502);
  }
};

// Sem `config.path`: a Function responde apenas na URL nativa
// (/.netlify/functions/<nome>), que o Netlify jamais encaminha para o
// handler de SSR. O rewrite de /api/public/pix/status continua declarado no
// netlify.toml como conveniência.
