import { z } from "zod";

/**
 * Contratos compartilhados entre o frontend, as rotas de API do TanStack Start
 * e as Netlify Functions. Nenhuma credencial aqui — apenas validação.
 */

export const depositSchema = z.object({
  amount: z.number().positive().max(100000),
  description: z.string().trim().min(1).max(200),
  payerName: z.string().trim().min(2).max(120),
  payerDocument: z.string().trim().min(11).max(18),
  payerPhone: z.string().trim().min(10).max(20).optional(),
  payerEmail: z.string().trim().email().max(160).optional(),
});

export const checkSchema = z.object({
  transactionId: z.string().trim().min(1).max(120),
});

export type DepositInput = z.infer<typeof depositSchema>;
