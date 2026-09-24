import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { json } from "./_amplopay";

export default async (request: Request) => {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!/^sz_[a-z0-9]{10,40}$/.test(id)) return json({ error: "Pedido inválido." }, 400);

  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id));
  if (!order) return json({ error: "Pedido não encontrado." }, 404);

  return json({ status: order.status });
};
