/**
 * Núcleo compartilhado das Netlify Functions do PIX.
 *
 * As credenciais são lidas SOMENTE aqui, no servidor (variáveis de ambiente da
 * Netlify). O x-client-secret nunca é enviado ao navegador.
 */

const BASE_URL = process.env.PROPAY_BASE_URL || "https://api.propixbr.com";

export const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function propay<T>(path: string, body: unknown): Promise<T> {
  const clientId = process.env.PROPAY_CLIENT_ID;
  const clientSecret = process.env.PROPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do provedor PIX não configuradas.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const providerMessage =
        typeof parsed?.message === "string"
          ? parsed.message
          : typeof parsed?.error === "string"
            ? parsed.error
            : null;
      throw new Error(
        providerMessage || `O provedor PIX recusou a solicitação (${response.status}). Tente novamente.`,
      );
    }

    return (parsed ?? {}) as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Tempo de resposta esgotado. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
