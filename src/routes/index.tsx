import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A entrada do funil é a landing page estática em /lp/.
 * Fluxo: /lp → /vsl → /verificacao → /esposa ou /marido → /checkout
 */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/lp/index.html" });
  },
  component: () => null,
});
