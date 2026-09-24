/**
 * Preços do checkout — fonte única usada pelo frontend e pelas Netlify
 * Functions (o servidor recalcula o total; o valor enviado pelo navegador
 * nunca é confiado).
 */
export const BASE_PRICE = 38.97;

export const BUMP_PRICES: Record<string, number> = {
  spygram: 23.9,
  vitalicio: 29.9,
  redes: 17.9,
};

export const PRODUCT_NAME = "Licença de Monitoramento em Tempo Real";

export const BUMP_NAMES: Record<string, string> = {
  spygram: "SPYGRAM - Espião de Instagram",
  vitalicio: "Acesso Vitalício ao App",
  redes: "Espionar Outras Redes Sociais",
};

export function totalFor(bumpIds: string[]) {
  const sum = bumpIds.reduce((acc, id) => acc + (BUMP_PRICES[id] ?? 0), BASE_PRICE);
  return Math.round(sum * 100) / 100;
}
