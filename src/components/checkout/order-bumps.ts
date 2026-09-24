import spygram from "@/assets/IMG_0453.png.asset.json";
import vitalicio from "@/assets/IMG_0454.png.asset.json";
import redes from "@/assets/IMG_0455.jpeg.asset.json";
import { BUMP_PRICES } from "@/lib/pricing";

export { BASE_PRICE } from "@/lib/pricing";

export type OrderBump = {
  id: string;
  ctaLabel: string;
  title: string;
  description: string;
  from: number;
  price: number;
  image: string;
  alt: string;
};

export const ORDER_BUMPS: OrderBump[] = [
  {
    id: "spygram",
    ctaLabel: "Adquirir SPYGRAM",
    title: "SPYGRAM - Espião de Instagram",
    description: "Adquirir o Acesso ao Espião de Instagram",
    from: 38.97,
    price: BUMP_PRICES["spygram"]!,
    image: spygram.url,
    alt: "Ícone do SPYGRAM, espião de Instagram",
  },
  {
    id: "vitalicio",
    ctaLabel: "QUERO ACESSO VITALÍCIO",
    title: "ACESSO VITALICIO",
    description: "Adquirir também O ACESSO VITALICIO AO APP",
    from: 39.9,
    price: BUMP_PRICES["vitalicio"]!,
    image: vitalicio.url,
    alt: "Selo de acesso vitalício ao aplicativo",
  },
  {
    id: "redes",
    ctaLabel: "Adquirir",
    title: "Espionar Outras Redes Sociais",
    description:
      "Adquirir também ACESSO A DIVERSAS REDES SOCIAIS (FACEBOOK, TIKTOK, TELEGRAM E MAIS)",
    from: 37.9,
    price: BUMP_PRICES["redes"]!,
    image: redes.url,
    alt: "Ícone de espionagem de outras redes sociais",
  },
];
