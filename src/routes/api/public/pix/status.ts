import { createFileRoute } from "@tanstack/react-router";

import { checkSchema } from "@/lib/pix.schemas";

export const Route = createFileRoute("/api/public/pix/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = checkSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Transação inválida." }, { status: 400 });
          }
          const { checkDeposit } = await import("@/lib/pix.server");
          return Response.json(await checkDeposit(parsed.data.transactionId));
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Não conseguimos consultar o pagamento agora.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
