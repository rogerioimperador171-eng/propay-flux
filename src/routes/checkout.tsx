import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import banner from "@/assets/IMG_0456.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountdownBar } from "@/components/checkout/CountdownBar";
import { OrderBumpList } from "@/components/checkout/OrderBumpList";
import { PixPanel } from "@/components/checkout/PixPanel";
import { SecureFooter } from "@/components/checkout/SecureFooter";
import { BASE_PRICE, ORDER_BUMPS } from "@/components/checkout/order-bumps";
import { createPixDeposit } from "@/lib/pix-client";
import type { PixDeposit } from "@/lib/pix.server";
import {
  formatBRL,
  generateCpf,
  isValidEmail,
  maskCardNumber,
  maskCvv,
  maskExpiry,
  maskPhone,
  onlyDigits,
} from "@/lib/masks";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout Seguro — Licença de Monitoramento em Tempo Real" },
      {
        name: "description",
        content:
          "Finalize o pagamento da sua licença de monitoramento em tempo real com 11,5% de desconto no Pix. Ambiente seguro com SSL 128 bits.",
      },
      { property: "og:title", content: "Checkout Seguro — Monitoramento em Tempo Real" },
      {
        property: "og:description",
        content: "Pague com Pix e garanta 11,5% de desconto na sua licença de monitoramento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

type Method = "pix" | "card";

const fieldClass = "h-11 rounded-lg text-sm";
const labelClass = "text-xs font-normal text-muted-foreground";

function CheckoutPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<Method>("pix");
  const [bumps, setBumps] = useState<string[]>([]);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardError, setCardError] = useState("");

  const [loading, setLoading] = useState(false);
  const [deposit, setDeposit] = useState<PixDeposit | null>(null);
  const [approved, setApproved] = useState(false);
  const [pixError, setPixError] = useState("");

  const total = useMemo(
    () =>
      BASE_PRICE +
      ORDER_BUMPS.filter((b) => bumps.includes(b.id)).reduce((sum, b) => sum + b.price, 0),
    [bumps],
  );

  const toggleBump = (id: string) =>
    setBumps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const validateBuyer = () => {
    if (name.trim().length < 3) return "Informe seu nome completo.";
    if (onlyDigits(phone).length !== 11) return "Informe um telefone válido com DDD.";
    if (!isValidEmail(email)) return "Informe um e-mail válido.";
    return "";
  };

  const handleSubmit = async () => {
    const invalid = validateBuyer();
    if (invalid) {
      toast.error(invalid);
      return;
    }

    if (method === "card") {
      if (onlyDigits(cardNumber).length !== 16) {
        setCardError("Informe os 16 dígitos do cartão.");
        return;
      }
      if (onlyDigits(expiry).length !== 4) {
        setCardError("Informe a validade no formato MM/AA.");
        return;
      }
      if (cvv.length !== 3) {
        setCardError("O CVV deve ter 3 dígitos.");
        return;
      }
      setCardError("");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setCardError("Pagamento RECUSADO pela operadora do cartão. Pague com Pix para aprovar.");
        toast.error("Cartão recusado. Tente pagar com Pix.");
      }, 2000);
      return;
    }

    setLoading(true);
    setPixError("");
    try {
      const result = await createPixDeposit({
        amount: Number(total.toFixed(2)),
        description: "Licença de Monitoramento em Tempo Real",
        payerName: name.trim(),
        payerDocument: generateCpf(),
        // telefone e e-mail do comprador: usados na recuperação de venda
        payerPhone: onlyDigits(phone),
        payerEmail: email.trim(),
      });
      setDeposit(result);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não conseguimos gerar o Pix agora. Tente novamente.";
      setPixError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (approved) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-price" />
        <h1 className="mt-3 text-lg font-bold text-foreground">Pagamento aprovado!</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Recebemos o seu pagamento de {formatBRL(total)}. O acesso à sua licença foi enviado para{" "}
          <strong className="text-foreground">{email}</strong>.
        </p>
        <SecureFooter />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-3 py-4 sm:max-w-md sm:px-4">
      <h1 className="sr-only">Checkout da licença de monitoramento em tempo real</h1>

      <CountdownBar />

      <img
        src={banner.url}
        alt="Monitoramento em tempo real: modo invisível, alertas e acesso remoto por apenas R$ 38,97"
        className="mt-3 w-full rounded-lg"
      />

      {deposit ? (
        <div className="mt-5">
          <PixPanel deposit={deposit} amount={total} onApproved={() => setApproved(true)} />
        </div>
      ) : (
        <>
          <section className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className={labelClass}>
                Nome completo
              </Label>
              <Input
                id="name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome completo"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className={labelClass}>
                Telefone
              </Label>
              <Input
                id="phone"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 0 0000-0000"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className={labelClass}>
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                maxLength={160}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className={fieldClass}
              />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setMethod("pix")}
              aria-pressed={method === "pix"}
              className={`w-full overflow-hidden rounded-lg border-2 text-left transition-colors ${
                method === "pix" ? "border-brand" : "border-border"
              }`}
            >
              <span className="block bg-brand px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-brand-foreground">
                Desconto 11.5%
              </span>
              <span className="flex flex-col items-center gap-0.5 bg-card px-3 py-4">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PixIcon />
                  Pix
                </span>
                {method === "pix" ? (
                  <span className="text-base font-bold text-price">{formatBRL(BASE_PRICE)}</span>
                ) : null}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMethod("card")}
              aria-pressed={method === "card"}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 bg-card px-3 py-4 text-sm text-muted-foreground transition-colors ${
                method === "card" ? "border-warn" : "border-border"
              }`}
            >
              <CreditCard className="h-4 w-4 text-warn" />
              Cartão
            </button>
          </section>

          {method === "card" ? (
            <section className="mt-4 space-y-3 rounded-lg border border-border bg-card p-3">
              <div className="space-y-1.5">
                <Label htmlFor="cardNumber" className={labelClass}>
                  Número do cartão
                </Label>
                <Input
                  id="cardNumber"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cardName" className={labelClass}>
                  Nome impresso no cartão
                </Label>
                <Input
                  id="cardName"
                  value={cardName}
                  maxLength={120}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry" className={labelClass}>
                    Validade
                  </Label>
                  <Input
                    id="expiry"
                    inputMode="numeric"
                    value={expiry}
                    onChange={(e) => setExpiry(maskExpiry(e.target.value))}
                    placeholder="MM/AA"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv" className={labelClass}>
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(maskCvv(e.target.value))}
                    placeholder="000"
                    className={fieldClass}
                  />
                </div>
              </div>
              {cardError ? (
                <p className="text-center text-xs font-semibold text-danger">{cardError}</p>
              ) : null}
            </section>
          ) : null}

          <section className="mt-6">
            <OrderBumpList selected={bumps} onToggle={toggleBump} />
          </section>

          {pixError ? (
            <p className="mt-3 text-center text-xs font-semibold text-danger">{pixError}</p>
          ) : null}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Total: <strong className="text-price">{formatBRL(total)}</strong>
          </p>

          <Button
            variant="brand"
            size="lg"
            className="mt-2 w-full text-sm"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            {method === "pix" ? "Pagar com Pix" : "Pagar com Cartão de Crédito"}
          </Button>
        </>
      )}

      <SecureFooter />
    </main>
  );
}

function PixIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current text-foreground/70">
      <path d="M12 2.2 7.4 6.8a1 1 0 0 0 0 1.4L12 12.8l4.6-4.6a1 1 0 0 0 0-1.4L12 2.2Zm-6 6-3.8 3.1a1 1 0 0 0 0 1.4L6 15.8l3.5-3.5L6 8.2Zm12 0-3.5 4.1 3.5 3.5 3.8-3.1a1 1 0 0 0 0-1.4L18 8.2ZM12 13.2l-4.6 4.6a1 1 0 0 0 0 1.4L12 21.8l4.6-4.6a1 1 0 0 0 0-1.4L12 13.2Z" />
    </svg>
  );
}
