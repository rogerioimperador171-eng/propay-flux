import { createFileRoute } from "@tanstack/react-router";

import { depositSchema } from "@/lib/pix.schemas";

export const Route = createFileRoute("/api/public/pix/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = depositSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Dados de pagamento inválidos." }, { status: 400 });
          }
          const { createDeposit } = await import("@/lib/pix.server");
          return Response.json(await createDeposit(parsed.data));
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Não conseguimos gerar o Pix agora. Tente novamente.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
