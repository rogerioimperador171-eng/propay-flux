import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Pedidos do checkout (Pix e cartão) processados pela AmploPay. */
export const orders = pgTable("orders", {
  /** Identificador gerado por nós e enviado à AmploPay como `identifier`. */
  id: text().primaryKey(),
  transactionId: text("transaction_id"),
  method: text().notNull(),
  /** PENDING | PAID | FAILED */
  status: text().notNull().default("PENDING"),
  amountCents: integer("amount_cents").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  items: jsonb().notNull(),
  /** Contexto do Safyro (userId, fbc, fbp, UTMs) para o Purchase via servidor. */
  tracking: jsonb(),
  purchaseTrackedAt: timestamp("purchase_tracked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
