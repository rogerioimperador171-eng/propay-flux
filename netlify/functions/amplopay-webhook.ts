import { json, setOrderStatus, toOrderStatus, verifyOrderSignature } from "./_amplopay";

/**
 * Notificações da AmploPay (callbackUrl). A URL leva o id do pedido e uma
 * assinatura HMAC gerada com a chave secreta, então só aceitamos chamadas
 * para pedidos que nós mesmos criamos.
 */
export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order") ?? "";
  const signature = url.searchParams.get("sig") ?? "";
  if (!orderId || !signature || !verifyOrderSignature(orderId, signature)) {
    return json({ error: "Assinatura inválida." }, 401);
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const tx = body?.transaction ?? body?.data?.transaction ?? body?.data ?? {};
  const status = toOrderStatus([
    tx?.status,
    tx?.transactionStatus,
    body?.transactionStatus,
    body?.status,
    body?.event,
  ]);
  const transactionId = [tx?.id, tx?.transactionId, body?.transactionId].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  console.log(
    "[amplopay-webhook]",
    orderId,
    body?.event ?? "",
    tx?.status ?? body?.status ?? "",
    "=>",
    status,
  );

  const result = await setOrderStatus(orderId, status, transactionId);
  if (result === null) return json({ error: "Pedido não encontrado." }, 404);
  return json({ ok: true });
};
