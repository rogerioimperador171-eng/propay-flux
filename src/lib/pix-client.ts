import type { PixDeposit } from "./pix.server";
import type { DepositInput } from "./pix.schemas";

/**
 * Cliente HTTP do PIX (navegador).
 *
 * Existem DOIS backends equivalentes, ambos guardando as credenciais no
 * servidor (o x-client-secret nunca chega ao navegador):
 *
 * 1. Netlify Functions em `/.netlify/functions/pix-create` e `pix-status`
 *    -> usado no deploy da Netlify. Esse caminho nativo nunca é capturado
 *       pelo catch-all de SSR (o Netlify reserva `/.netlify/*`), por isso é o
 *       primeiro a ser tentado. Era exatamente aí que aparecia o erro
 *       "Only HTML requests are supported here": o POST caía no handler de
 *       SSR em vez de chegar à Function.
 * 2. Rotas de servidor do app em `/api/public/pix/*`
 *    -> usado no preview/publish da Lovable, onde não existem Functions.
 *
 * O primeiro endpoint que responder JSON válido é memorizado para as
 * chamadas seguintes (inclusive o polling de status).
 */

type Backend = "netlify" | "app";

const PATHS: Record<Backend, { create: string; status: string }> = {
  netlify: {
    create: "/.netlify/functions/pix-create",
    status: "/.netlify/functions/pix-status",
  },
  app: {
    create: "/api/public/pix/create",
    status: "/api/public/pix/status",
  },
};

let resolvedBackend: Backend | null = null;

type Attempt = {
  ok: boolean;
  status: number;
  /** JSON já decodificado, ou null quando a resposta não era JSON. */
  parsed: unknown;
};

async function request(path: string, body: unknown): Promise<Attempt> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Resposta HTML => a requisição não chegou ao endpoint correto.
      parsed = null;
    }
    return { ok: response.ok, status: response.status, parsed };
  } catch {
    // Falha de rede: tratada como endpoint indisponível.
    return { ok: false, status: 0, parsed: null };
  }
}

/** true quando o endpoint respondeu de forma útil (sucesso ou erro de negócio em JSON). */
function isUsable(attempt: Attempt): boolean {
  if (attempt.parsed === null) return false;
  if (attempt.status === 404) return false;
  // As nossas Functions/rotas respondem 200, 400, 405 ou 502 — nunca 500.
  // Um 500 aqui significa que o POST foi atendido por outro handler (por
  // exemplo o SSR, que devolve { error: "Only HTML requests are supported
  // here" }). Nesse caso seguimos para o próximo backend.
  if (attempt.status === 500) return false;
  const message = (attempt.parsed as { error?: string } | null)?.error ?? "";
  if (message.includes("Only HTML requests")) return false;
  return true;
}

function errorMessage(attempt: Attempt): string {
  const fromApi = (attempt.parsed as { error?: string } | null)?.error;
  if (fromApi) return fromApi;
  if (attempt.status === 0) {
    return "Sem conexão com o servidor de pagamento. Verifique sua internet e tente novamente.";
  }
  return "A função de pagamento não respondeu. Confirme as variáveis PROPAY_CLIENT_ID e PROPAY_CLIENT_SECRET na Netlify e publique novamente.";
}

async function post<T>(endpoint: "create" | "status", body: unknown): Promise<T> {
  const order: Array<Backend> =
    resolvedBackend === null
      ? ["netlify", "app"]
      : resolvedBackend === "netlify"
        ? ["netlify", "app"]
        : ["app", "netlify"];

  let last: Attempt = { ok: false, status: 0, parsed: null };

  for (const backend of order) {
    const attempt = await request(PATHS[backend][endpoint], body);
    if (isUsable(attempt)) {
      resolvedBackend = backend;
      if (!attempt.ok) throw new Error(errorMessage(attempt));
      return attempt.parsed as T;
    }
    last = attempt;
  }

  throw new Error(errorMessage(last));
}

export function createPixDeposit(input: DepositInput) {
  return post<PixDeposit>("create", input);
}

export function checkPixDeposit(transactionId: string) {
  return post<{ transactionState: string }>("status", { transactionId });
}
